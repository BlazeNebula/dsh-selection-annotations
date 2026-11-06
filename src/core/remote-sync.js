/**
 * 会话落盘同步：把草稿与已提交台账 PUT 到宿主路由，再 GET 回来。
 * 连不上（离线 / 旧宿主）时只调用一次即失败，不影响本地功能。
 */
export function createRemoteSync(getSnapshot) {
  let state
  const queue = new Set()
  let timer = null

  const storeUrl = (sessionId) => `/selection-annotations/session/${encodeURIComponent(sessionId)}`

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

  async function push(sessionId) {
    if (typeof fetch !== 'function') return
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

  /** 合并 600ms 内的写入，避免每敲一个字就发一次请求。 */
  function schedule(sessionId) {
    if (typeof sessionId !== 'string' || sessionId === '') return
    queue.add(sessionId)
    if (timer !== null) return
    timer = window.setTimeout(() => {
      timer = null
      const ids = [...queue]
      queue.clear()
      for (const id of ids) void push(id)
    }, 600)
  }

  return { pull, push, schedule, storeUrl }
}
