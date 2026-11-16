/**
 * 批注的剪贴板格式：总览右上角「拷贝」把全部批注序列化成一段 JSON，单条「拷贝」
 * 用同一结构只放一条；「粘贴」与输入区的大段粘贴都按这个结构识别。
 * 只保留可迁移的内容（原文、批注、图片、出处），不带本地 id/编号/时间戳。
 */

export const ANNOTATION_CLIPBOARD_KIND = 'dsh-selection-annotations/clipboard'
const PAYLOAD_KIND = 'dsh-selection-annotations'

function clipboardImage(image) {
  if (image === null || typeof image !== 'object') return undefined
  const dataUrl = typeof image.dataUrl === 'string' && image.dataUrl !== '' ? image.dataUrl : undefined
  if (dataUrl === undefined) return undefined
  const entry = { name: typeof image.name === 'string' ? image.name : 'image', dataUrl }
  if (typeof image.thumb === 'string' && image.thumb !== '') entry.thumb = image.thumb
  if (typeof image.preview === 'string' && image.preview !== '') entry.preview = image.preview
  return entry
}

function clipboardItem(item) {
  const images = (Array.isArray(item?.images) ? item.images : []).map(clipboardImage).filter(Boolean)
  return {
    quote: typeof item?.quote === 'string' ? item.quote : '',
    note: typeof item?.note === 'string' ? item.note : '',
    ...(images.length > 0 ? { images } : {}),
    ...(item?.source !== null && typeof item?.source === 'object' ? { source: item.source } : {}),
  }
}

/** 把一批批注序列化成可放进剪贴板的字符串。 */
export function serializeAnnotations(items) {
  const list = Array.isArray(items) ? items : []
  return JSON.stringify({
    kind: ANNOTATION_CLIPBOARD_KIND,
    version: 1,
    count: list.length,
    annotations: list.map(clipboardItem),
  })
}

function normalizeItem(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const quote = typeof value.quote === 'string' ? value.quote : ''
  const note = typeof value.note === 'string' ? value.note : ''
  if (quote.trim() === '' && note.trim() === '') return undefined
  const images = (Array.isArray(value.images) ? value.images : [])
    .map((image) => {
      const dataUrl = typeof image?.dataUrl === 'string' ? image.dataUrl : ''
      if (dataUrl === '') return undefined
      return {
        id: `img-paste-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        name: typeof image.name === 'string' ? image.name : 'image',
        dataUrl,
        thumb: typeof image.thumb === 'string' && image.thumb !== '' ? image.thumb : dataUrl,
        preview: typeof image.preview === 'string' && image.preview !== '' ? image.preview : dataUrl,
        bytes: Math.round((dataUrl.length * 3) / 4),
      }
    })
    .filter(Boolean)
  return {
    quote,
    note,
    images,
    source: value.source !== null && typeof value.source === 'object' ? value.source : undefined,
  }
}

/**
 * 解析剪贴板文本。只认我们导出的结构（或发送负载同构的结构），其它文本返回
 * undefined，让调用方照常把文字贴进输入框。
 */
export function parseAnnotations(text) {
  if (typeof text !== 'string' || text.trim() === '') return undefined
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return undefined
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
  if (parsed.kind !== ANNOTATION_CLIPBOARD_KIND && parsed.kind !== PAYLOAD_KIND) return undefined
  if (!Array.isArray(parsed.annotations)) return undefined
  const items = parsed.annotations.map(normalizeItem).filter(Boolean)
  return items.length > 0 ? items : undefined
}

/** 去重用的内容指纹：原文 + 批注 + 图片名，顺序一致才算同一条。 */
export function annotationSignature(item) {
  const names = (Array.isArray(item?.images) ? item.images : [])
    .map((image) => (typeof image?.name === 'string' ? image.name : ''))
    .join(',')
  return `${typeof item?.quote === 'string' ? item.quote : ''}\u0000${typeof item?.note === 'string' ? item.note : ''}\u0000${names}`
}
