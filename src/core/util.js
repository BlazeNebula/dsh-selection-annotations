/** 不在主流程里抛错的调用。onError 用于把异常交回调用方记录，避免「吞掉」。*/
export const safe = (fn, onError) => {
  try {
    return fn()
  } catch (error) {
    if (typeof onError === 'function') {
      try {
        onError(error)
      } catch {
        // 记录失败不能再制造新的异常。
      }
    }
    return undefined
  }
}

export function toBase64(bytes) {
  let binary = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step))
  }
  return btoa(binary)
}

export function cssEscape(value) {
  return String(value).replace(/["\\]/g, '\\$&')
}

export function truncateQuote(value) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  return text.length > 140 ? `${text.slice(0, 140)}…` : text
}

export function el(tag, className, text) {
  const created = document.createElement(tag)
  if (className !== undefined) created.className = className
  if (text !== undefined) created.textContent = text
  return created
}

export function button(className, text, onClick) {
  const created = el('button', className, text)
  created.type = 'button'
  created.addEventListener('click', onClick)
  return created
}

/** 稳定的内容指纹：用于判断卡片是否需要按最新数据重建，替代手写的版本号。 */
export function hashString(input) {
  const text = typeof input === 'string' ? input : JSON.stringify(input ?? null)
  let hash = 5381
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0
  return (hash >>> 0).toString(36)
}
