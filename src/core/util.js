/** 不在主流程里抛错的调用。 */
export const safe = (fn) => {
  try {
    return fn()
  } catch {
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
