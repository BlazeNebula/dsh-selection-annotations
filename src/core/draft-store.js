/**
 * 草稿的本地存储：保存当前会话的批注、读回历史草稿、限制会话数量。
 * 所有"当前批注"通过 getAnnotations() 读取，不持有可变引用。
 */
export function createDraftStore({ getStorage, codec, getAnnotations, drafts, onSaved, maxSessions, maxItems }) {
  const draftStorage = () => getStorage()

  /** 只保留最近 maxSessions 个会话的草稿。 */
  function prune(storage) {
    const keys = []
    for (let i = 0; i < storage.length; i += 1) {
      const key = safeStorageKey(storage, i)
      if (typeof key === 'string' && key.startsWith(codec.prefix)) keys.push(key)
    }
    if (keys.length <= maxSessions) return
    const dated = keys.map((key) => ({
      key,
      savedAt: Number(JSON.parse(storage.getItem(key) ?? '{}')?.savedAt) || 0,
    }))
    dated.sort((a, b) => a.savedAt - b.savedAt)
    for (const entry of dated.slice(0, dated.length - maxSessions)) {
      try {
        storage.removeItem(entry.key)
      } catch {
        /* 忽略单条删除失败 */
      }
    }
  }

  /** 存一份草稿；批注被清空时把这一键一起删掉。 */
  function saveDraft(sessionId) {
    if (typeof sessionId !== 'string' || sessionId === '') return
    const full = codec.draftItems(getAnnotations())
    const items = codec.fitDraftSize(full)
    if (full.length === 0) drafts.delete(sessionId)
    else drafts.set(sessionId, full)
    onSaved(sessionId)
    const storage = draftStorage()
    if (storage === undefined) return
    try {
      if (items.length === 0) {
        storage.removeItem(codec.draftKey(sessionId))
        return
      }
      storage.setItem(codec.draftKey(sessionId), JSON.stringify({ version: 1, savedAt: Date.now(), items }))
      prune(storage)
    } catch {
      /* 配额满或写入被禁：降级为仅内存保存 */
    }
  }

  /** 读一份草稿：内存优先，其次本地存储；读坏了当没有。 */
  function loadDraft(sessionId) {
    const memory = drafts.get(sessionId)
    if (memory !== undefined) return memory.map(codec.restoreDraftItem)
    const storage = draftStorage()
    if (storage === undefined) return []
    const items = safeParse(storage, codec, sessionId, maxItems)
    if (items === undefined || items.length === 0) return []
    drafts.set(sessionId, codec.draftItems(items))
    return items
  }

  return { draftStorage, saveDraft, loadDraft }
}

function safeStorageKey(storage, index) {
  try {
    return storage.key(index)
  } catch {
    return undefined
  }
}

function safeParse(storage, codec, sessionId, maxItems) {
  try {
    const raw = storage.getItem(codec.draftKey(sessionId))
    if (raw === null) return []
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || !Array.isArray(parsed.items)) return []
    return parsed.items.filter(codec.isDraftItem).slice(0, maxItems).map(codec.restoreDraftItem)
  } catch {
    return undefined
  }
}
