import { dataUrlToFile } from './image-codec.js'
import { log } from './log.js'

/**
 * 草稿的序列化与恢复。
 * 只保留可序列化字段：liveRange 是活 DOM 对象，恢复时按锚点与引文重建。
 */
export function createDraftCodec({ t, prefix, maxBytes }) {
  const draftKey = (sessionId) => `${prefix}${sessionId}`

  function draftItems(items) {
    return items.map((item) => ({
      id: item.id,
      number: item.number,
      quote: item.quote,
      note: item.note,
      source: item.source,
      createdAt: item.createdAt,
      // 图片只存压缩后的 data URL：File 与对象 URL 都带不过本地存储。
      images: (Array.isArray(item.images) ? item.images : [])
        .filter((image) => typeof image?.dataUrl === 'string' && image.dataUrl !== '')
        .map((image) => ({ id: image.id, name: image.name, dataUrl: image.dataUrl, bytes: image.bytes })),
    }))
  }

  function isDraftItem(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
    return typeof value.quote === 'string' || typeof value.note === 'string'
  }

  function restoreDraftItem(item) {
    const images = (Array.isArray(item.images) ? item.images : [])
      .filter((image) => typeof image?.dataUrl === 'string' && image.dataUrl !== '')
      .map((image) => {
        const file = dataUrlToFile(image)
        return {
          id: typeof image.id === 'string' ? image.id : `img-${Math.random().toString(36).slice(2, 8)}`,
          name: typeof image.name === 'string' ? image.name : t('image.alt'),
          dataUrl: image.dataUrl,
          bytes: Number(image.bytes) || 0,
          file,
          // 恢复后没有对象 URL：直接用 data URL 当缩略图来源。
          url: image.dataUrl,
        }
      })
    return {
      id: typeof item.id === 'string' && item.id !== '' ? item.id : `sa-restored-${Math.random().toString(36).slice(2, 10)}`,
      number: Number.isFinite(item.number) ? item.number : 0,
      quote: typeof item.quote === 'string' ? item.quote : '',
      note: typeof item.note === 'string' ? item.note : '',
      source: item.source ?? { kind: 'dom' },
      createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
      images,
    }
  }

  /** 超出体积上限时，从最旧的批注开始丢图片（文字永远保留）。 */
  function fitDraftSize(items) {
    let text = JSON.stringify({ version: 1, items })
    if (text.length <= maxBytes) return items
    const next = items.map((item) => ({ ...item, images: Array.isArray(item.images) ? item.images.slice() : [] }))
    for (let i = 0; i < next.length && text.length > maxBytes; i += 1) {
      if (next[i].images.length === 0) continue
      next[i] = { ...next[i], images: [] }
      text = JSON.stringify({ version: 1, items: next })
    }
    if (text.length > maxBytes) log('[selection-annotations] 草稿超出本地存储预算，图片已丢弃、文字保留')
    return next
  }

  return { draftKey, draftItems, isDraftItem, restoreDraftItem, fitDraftSize }
}
