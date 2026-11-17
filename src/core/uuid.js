/**
 * 批注条目 uuid：捕获那一刻就生成，随条目带进数据块、批次创建与答复。
 * 优先用浏览器原生实现；不可用时（非安全上下文等）回退到时间戳 + 随机数，
 * 形状仍符合 UUID v4，宿主与数据库都只把它当不透明主键。
 */
export function uuidV4() {
  try {
    const native = globalThis.crypto?.randomUUID
    if (typeof native === 'function') {
      const value = native.call(globalThis.crypto)
      if (typeof value === 'string' && value !== '') return value
    }
  } catch {
    // randomUUID 在部分环境里会抛错，继续走回退。
  }
  const hex = (length) => {
    let out = ''
    while (out.length < length) out += Math.floor(Math.random() * 16).toString(16)
    return out.slice(0, length)
  }
  const time = Date.now().toString(16).slice(-12).padStart(12, '0')
  return `${time.slice(0, 8)}-${time.slice(8, 12)}-4${hex(3)}-${'89ab'[Math.floor(Math.random() * 4)]}${hex(3)}-${hex(12)}`
}
