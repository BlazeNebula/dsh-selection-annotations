/** 一批答复里的每条答复按 index 去重：同一 index 以最后一批为准。 */
export function mergeReplyBatches(batches) {
  const byIndex = new Map()
  for (const batch of batches) {
    for (const reply of batch.replies) {
      if (reply === null || typeof reply !== 'object') continue
      const index = Number(reply.index)
      if (!Number.isFinite(index)) continue
      byIndex.set(index, { ...reply, index, at: Number(batch.at) || 0 })
    }
  }
  return [...byIndex.values()].sort((a, b) => a.index - b.index)
}

/** 新划出来但既没写文字也没加图：被动确认（点框外、悬停收起）时应当丢弃。 */
export function shouldDiscardEmpty(mode, note, images) {
  if (mode === 'edit') return false
  if (typeof note === 'string' && note.trim() !== '') return false
  return !Array.isArray(images) || images.length === 0
}
