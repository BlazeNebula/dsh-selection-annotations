/**
 * 会话落盘同步：把草稿与已提交台账 PUT 到宿主路由，再 GET 回来。
 * 连不上（离线 / 旧宿主）时只调用一次即失败，不影响本地功能。
 * 新宿主另有「一批一建」的 POST 与按条 PATCH/DELETE；旧宿主没有这些接口时安静退回整份快照。
 */
export function createRemoteSync(getSnapshot) {
  let state
  const queue = new Set()
  let timer = null

  const storeUrl = (sessionId) => `/selection-annotations/session/${encodeURIComponent(sessionId)}`
  const entryUrl = (uuid) => `/selection-annotations/entry/${encodeURIComponent(uuid)}`
  const batchUrl = (batchUuid) => `/selection-annotations/batch/${encodeURIComponent(batchUuid)}`

  // 新接口可用性：undefined=还没试过，false=确认是旧宿主（之后不再尝试），true=可用。
  let batchSupported
  // 同一会话的整份快照要等这批 POST 落库后再推：同锚点键先推快照、后建批会造出重复批次。
  const batchInflight = new Map()

  /** 读一个会话的落盘记录；连不上或格式不对都返回 undefined（调用方退回本地）。 */
  async function pull(sessionId) {
    if (typeof fetch !== 'function') {
      state = false
      return undefined
    }
    try {
      const response = await fetch(storeUrl(sessionId), { method: 'GET', headers: { accept: 'application/json' } })
      if (response.status === 204) {
        state = true
        return null
      }
      if (!response.ok) {
        state = false
        return undefined
      }
      const data = await response.json()
      state = true
      return data !== null && typeof data === 'object' && !Array.isArray(data) ? data : null
    } catch {
      state = false
      return undefined
    }
  }

  const pending = new Set()
  const inflight = new Map()

  async function pushOnce(sessionId) {
    if (typeof fetch !== 'function') return
    const hold = batchInflight.get(sessionId)
    if (hold !== undefined) {
      try {
        await hold
      } catch {
        /* 新接口失败也照常推整份快照。 */
      }
    }
    try {
      const response = await fetch(storeUrl(sessionId), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(getSnapshot(sessionId)),
      })
      state = response.ok
    } catch {
      state = false
    }
  }

  /** 每个会话串行推送：同一时间只允许一个 PUT 在飞，期间的新快照合并成一次补发。 */
  function enqueue(sessionId) {
    if (typeof sessionId !== 'string' || sessionId === '') return
    pending.add(sessionId)
    if (inflight.has(sessionId)) return
    const task = (async () => {
      while (pending.has(sessionId)) {
        pending.delete(sessionId)
        await pushOnce(sessionId)
      }
    })()
    inflight.set(sessionId, task)
    void task.finally(() => {
      inflight.delete(sessionId)
      if (pending.has(sessionId)) enqueue(sessionId)
    })
  }

  /** 合并 600ms 内的写入，避免每敲一个字就发一次请求。 */
  function schedule(sessionId) {
    if (typeof sessionId !== 'string' || sessionId === '') return
    queue.add(sessionId)
    if (timer !== null) return
    timer = window.setTimeout(() => {
      timer = null
      const ids = [...queue]
      queue.clear()
      for (const id of ids) enqueue(id)
    }, 600)
  }

  async function readObject(response) {
    const data = await response.json()
    return data !== null && typeof data === 'object' && !Array.isArray(data) ? data : undefined
  }

  /**
   * 新建一批已提交批注。旧宿主（404/405）只判一次，之后直接走整份快照。
   * 连不上、接口报错都返回 undefined，调用方保持本地记录原样。
   */
  async function createBatch(sessionId, body) {
    if (typeof sessionId !== 'string' || sessionId === '' || batchSupported === false) return undefined
    if (typeof fetch !== 'function') {
      batchSupported = false
      return undefined
    }
    // 同会话的批次按发送顺序串行：既保证 batch_seq 与页面顺序一致，也让整份快照排在所有 POST 之后。
    const previous = batchInflight.get(sessionId)
    const task = (previous ?? Promise.resolve()).then(async () => {
      try {
        const response = await fetch(`${storeUrl(sessionId)}/batch`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(body),
        })
        if (response.status === 404 || response.status === 405) {
          batchSupported = false
          return undefined
        }
        if (!response.ok) return undefined
        const data = await readObject(response)
        if (data !== undefined) batchSupported = true
        return data
      } catch {
        return undefined
      }
    })
    batchInflight.set(sessionId, task)
    void task.finally(() => {
      if (batchInflight.get(sessionId) === task) batchInflight.delete(sessionId)
    })
    return task
  }

  /**
   * 回填批次字段：消息真正入库后才知道 turn 与可信锚点。
   * 宿主只补空值，重复调用结果一致；失败就保持现状，整份快照推送照旧兜底。
   */
  async function patchBatch(batchUuid, body) {
    if (typeof batchUuid !== 'string' || batchUuid === '') return undefined
    if (typeof fetch !== 'function') return undefined
    try {
      const response = await fetch(batchUrl(batchUuid), {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) return undefined
      return await readObject(response)
    } catch {
      return undefined
    }
  }

  /** 按条目 uuid 写一条答复；旧宿主没有该接口时返回 undefined。 */
  async function patchEntry(uuid, reply) {
    if (typeof uuid !== 'string' || uuid === '') return undefined
    if (typeof fetch !== 'function') return undefined
    try {
      const response = await fetch(entryUrl(uuid), {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(reply),
      })
      if (!response.ok) return undefined
      return await readObject(response)
    } catch {
      return undefined
    }
  }

  /** 删除一条已提交批注；成功返回宿主响应（`{ok,uuid}`），失败返回 undefined。 */
  async function deleteEntry(uuid) {
    if (typeof uuid !== 'string' || uuid === '') return undefined
    if (typeof fetch !== 'function') return undefined
    try {
      const response = await fetch(entryUrl(uuid), { method: 'DELETE', headers: { accept: 'application/json' } })
      if (!response.ok) return undefined
      return await readObject(response)
    } catch {
      return undefined
    }
  }

  return { pull, push: pushOnce, schedule, storeUrl, createBatch, patchBatch, patchEntry, deleteEntry }
}
