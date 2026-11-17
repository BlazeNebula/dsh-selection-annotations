import { safe } from './util.js'

/** 已提交记录的条目形状：引文或批注文字至少有一个是字符串。本地台账与远端合并共用这一条判据。 */
export function isSentItem(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  return typeof value.quote === 'string' || typeof value.note === 'string'
}

/**
 * 已提交批注的本地台账（内存 + localStorage），按会话分表，键是消息锚点键。
 * 记录形如 { savedAt, items, turn?, anchorKey?, batchUuid?, batchSeq? }；turn 用来把卡片固定在所属轮次的「已完成」前后，
 * anchorKey 在没有轮次号（旧记录、跨端合并）时用来回到消息行。
 * batchUuid / batchSeq 与条目上的 uuid 只在宿主新接口可用时才有，随记录一起持久化。
 */
export function createSentStore({ getStorage, tableFor, prefix, maxEntries, maxBytes, maxItems, onChanged }) {

  function loadSent(sessionId) {
    const memory = tableFor.get(sessionId)
    if (memory !== undefined) return memory
    const table = new Map()
    const storage = getStorage()
    if (storage !== undefined) {
      const parsed = safe(() => JSON.parse(storage.getItem(`${prefix}${sessionId}`) ?? 'null'))
      if (parsed !== null && typeof parsed === 'object' && parsed.entries !== null && typeof parsed.entries === 'object') {
        for (const [key, value] of Object.entries(parsed.entries)) {
          if (typeof key !== 'string' || key === '') continue
          if (value === null || typeof value !== 'object' || !Array.isArray(value.items)) continue
          const items = value.items.filter(isSentItem).slice(0, maxItems)
          if (items.length === 0) continue
          const turn = Number.isFinite(value.turn) ? Number(value.turn) : undefined
          const anchorKey = typeof value.anchorKey === 'string' && value.anchorKey !== '' ? value.anchorKey : undefined
          const batchUuid =
            typeof value.batchUuid === 'string' && value.batchUuid !== '' ? value.batchUuid : undefined
          const batchSeq = Number.isSafeInteger(value.batchSeq) ? value.batchSeq : undefined
          table.set(key, {
            savedAt: Number(value.savedAt) || 0,
            items,
            ...(turn !== undefined ? { turn } : {}),
            ...(anchorKey !== undefined ? { anchorKey } : {}),
            ...(batchUuid !== undefined ? { batchUuid } : {}),
            ...(batchSeq !== undefined ? { batchSeq } : {}),
          })
        }
      }
    }
    tableFor.set(sessionId, table)
    return table
  }

  function saveSent(sessionId, table) {
    const storage = getStorage()
    const ordered = [...table.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt)
    // 内存与落盘都保留完整记录；只有 localStorage 受配额限制，写进去时按预算裁剪。
    const kept = ordered.slice(Math.max(0, ordered.length - maxEntries))
    tableFor.set(sessionId, new Map(kept))
    onChanged(sessionId)
    if (storage === undefined) return
    let stored = kept
    if (JSON.stringify(Object.fromEntries(kept)).length > maxBytes) {
      stored = kept.map(([key, value]) => [
        key,
        {
          ...value,
          items: value.items.map((item) => ({
            ...item,
            thumbs: (item.thumbs ?? []).map((thumb) => ({ name: thumb.name, dataUrl: thumb.dataUrl })),
          })),
        },
      ])
      if (JSON.stringify(Object.fromEntries(stored)).length > maxBytes) {
        stored = stored.slice(Math.max(0, stored.length - 40))
      }
    }
    const entries = {}
    for (const [key, value] of stored) entries[key] = value
    try {
      storage.setItem(`${prefix}${sessionId}`, JSON.stringify({ version: 1, entries }))
    } catch {
      /* 配额满：本地缓存放弃写入，落盘通道仍有完整记录 */
    }
  }

  /** 宿主返回的条目 uuid 与 items 按序对应；个数对不上或有空项就整批不记，宁缺勿错。 */
  function withItemUuids(items, uuids) {
    if (!Array.isArray(uuids) || uuids.length !== items.length) return items
    if (!uuids.every((uuid) => typeof uuid === 'string' && uuid !== '')) return items
    return items.map((item, index) => ({ ...item, uuid: uuids[index] }))
  }

  function batchFields(value) {
    return {
      batchUuid: typeof value?.batchUuid === 'string' && value.batchUuid !== '' ? value.batchUuid : undefined,
      batchSeq: Number.isSafeInteger(value?.batchSeq) ? value.batchSeq : undefined,
    }
  }

  function recordSent(sessionId, anchorKey, items, turn, options) {
    const extra = options ?? {}
    const batch = batchFields(extra)
    const table = loadSent(sessionId)
    table.set(anchorKey, {
      savedAt: Date.now(),
      items: withItemUuids(items, extra.uuids),
      ...(Number.isFinite(turn) ? { turn } : {}),
      // 键本身就是锚点；值里再存一份，跨端合并或旧键（time:/turn-process）时才有地方取。
      anchorKey,
      ...(batch.batchUuid !== undefined ? { batchUuid: batch.batchUuid } : {}),
      ...(batch.batchSeq !== undefined ? { batchSeq: batch.batchSeq } : {}),
    })
    saveSent(sessionId, table)
  }

  /**
   * 异步补登宿主返回的批次信息：只补字段、不动 savedAt，
   * 免得台账排序和已经在页面上的卡片位置跳一下。记录已被覆盖或删掉时返回 false。
   */
  function updateSentBatch(sessionId, anchorKey, options) {
    const extra = options ?? {}
    const table = loadSent(sessionId)
    const record = table.get(anchorKey)
    if (record === undefined) return false
    const batch = batchFields(extra)
    const items = Array.isArray(extra.uuids) ? withItemUuids(record.items, extra.uuids) : record.items
    if (batch.batchUuid === undefined && batch.batchSeq === undefined && items === record.items) return false
    table.set(anchorKey, {
      ...record,
      items,
      ...(batch.batchUuid !== undefined ? { batchUuid: batch.batchUuid } : {}),
      ...(batch.batchSeq !== undefined ? { batchSeq: batch.batchSeq } : {}),
    })
    saveSent(sessionId, table)
    return true
  }

  return { loadSent, saveSent, recordSent, updateSentBatch }
}
