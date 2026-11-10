import { safe } from './util.js'

/**
 * 已提交批注的本地台账（内存 + localStorage），按会话分表，键是消息锚点键。
 * 记录形如 { savedAt, items, turn? }；turn 用来把卡片固定在所属轮次的「已完成」前后。
 */
export function createSentStore({ getStorage, tableFor, prefix, maxEntries, maxBytes, maxItems, onChanged }) {
  const isSentItem = (value) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
    return typeof value.quote === 'string' || typeof value.note === 'string'
  }

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
          table.set(key, { savedAt: Number(value.savedAt) || 0, items, ...(turn !== undefined ? { turn } : {}) })
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

  function recordSent(sessionId, anchorKey, items, turn) {
    const table = loadSent(sessionId)
    table.set(anchorKey, {
      savedAt: Date.now(),
      items,
      ...(Number.isFinite(turn) ? { turn } : {}),
    })
    saveSent(sessionId, table)
  }

  return { loadSent, saveSent, recordSent }
}
