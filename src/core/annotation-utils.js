/**
 * 一批答复里的每条答复按 uuid 去重：同一条以最后一批为准。
 * 老数据没有 uuid 时才退回按 index 去重，避免同轮不同批同序号互相覆盖。
 */
export function mergeReplyBatches(batches) {
  const byKey = new Map()
  for (const batch of batches) {
    for (const reply of batch.replies) {
      if (reply === null || typeof reply !== 'object') continue
      const index = Number(reply.index)
      if (!Number.isFinite(index)) continue
      const uuid = typeof reply.uuid === 'string' && reply.uuid !== '' ? reply.uuid : undefined
      const key = uuid !== undefined ? `uuid:${uuid}` : `index:${index}`
      byKey.set(key, { ...reply, index, ...(uuid !== undefined ? { uuid } : {}), at: Number(batch.at) || 0 })
    }
  }
  return [...byKey.values()].sort(
    (a, b) => a.index - b.index || a.at - b.at || String(a.uuid ?? '').localeCompare(String(b.uuid ?? '')),
  )
}

/** 新划出来但既没写文字也没加图：被动确认（点框外、悬停收起）时应当丢弃。 */
export function shouldDiscardEmpty(mode, note, images) {
  if (mode === 'edit') return false
  if (typeof note === 'string' && note.trim() !== '') return false
  return !Array.isArray(images) || images.length === 0
}
