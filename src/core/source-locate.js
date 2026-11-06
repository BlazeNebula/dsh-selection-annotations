import { safe } from './util.js'

export function offsetRange(root, range) {
  const measure = (node, offset) =>
    safe(() => {
      const probe = range.cloneRange()
      probe.setStart(root, 0)
      probe.setEnd(node, offset)
      return probe.toString().length
    })
  const start = measure(range.startContainer, range.startOffset)
  const end = measure(range.endContainer, range.endOffset)
  if (start === undefined) return { start: undefined, end: undefined }
  return { start, end: end === undefined || end < start ? start : end }
}

export function pathFromPreviewUrl(url) {
  // dsh-resource://file/session/<sessionId>/<encoded path>
  const marker = '/session/'
  const at = url.indexOf(marker)
  if (at === -1) return undefined
  const rest = url.slice(at + marker.length)
  const slash = rest.indexOf('/')
  if (slash === -1) return undefined
  const raw = rest.slice(slash + 1)
  return safe(() => decodeURIComponent(raw)) ?? raw
}

export function lineNumberOf(element) {
  if (element === null) return undefined
  const holder = element.closest('[data-textpreview-line]')
  if (holder === null) return undefined
  const value = Number(holder.getAttribute('data-textpreview-line'))
  return Number.isFinite(value) ? value : undefined
}

/**
 * 代码预览没有行号属性，只能按 `.line` 的序号推算。
 * 先看选区端点能不能向上找到最近的 `.line`；找不到再退回「第几个 .line 包含它」。
 */
export function codeLineNumberOf(scope, element) {
  if (element === null || scope === null || scope === undefined) return undefined
  const lines = [...scope.querySelectorAll('.line')]
  const own = typeof element.closest === 'function' ? element.closest('.line') : null
  const target = own !== null ? own : lines.find((line) => line.contains(element))
  if (target === null || target === undefined) return undefined
  const index = lines.indexOf(target)
  return index === -1 ? undefined : index + 1
}

/** 空白折叠成单个空格，并记下每个规范化字符对应的源文本下标。 */
export function normalizeWithMap(value) {
  const chars = []
  const map = []
  let spaceAt = -1
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      if (spaceAt === -1) spaceAt = i
      continue
    }
    if (spaceAt !== -1) {
      if (chars.length > 0) {
        chars.push(' ')
        map.push(spaceAt)
      }
      spaceAt = -1
    }
    chars.push(ch)
    map.push(i)
  }
  return { text: chars.join(''), map }
}

/**
 * 在源文件文本里定位引文。
 *
 * 渲染后的正文与原文并不一样（标题丢了 `#`、强调丢了 `**`、链接只剩文字），而且换行、
 * 缩进也会被重排，所以不能直接 `indexOf`：先把两边都做空白折叠再比，命中后把区间映射回
 * 源文本下标。找不到就返回 undefined —— 那时宁可不要行号，也不要给一个错的。
 * @returns { start, end } 源文本里的半开区间。
 */
export function locateInSource(source, quote) {
  const needle = quote.replace(/\s+/g, ' ').trim()
  if (needle === '') return undefined
  const hay = normalizeWithMap(source)
  const at = hay.text.indexOf(needle)
  if (at === -1) return undefined
  const start = hay.map[at]
  const end = hay.map[at + needle.length - 1]
  if (start === undefined || end === undefined) return undefined
  return { start, end: end + 1 }
}

/** 源文本里某个下标所处的 1 基行号。 */
export function lineOfOffset(text, offset) {
  let line = 1
  const limit = Math.max(0, Math.min(offset, text.length))
  for (let i = 0; i < limit; i += 1) if (text.charCodeAt(i) === 10) line += 1
  return line
}

/**
 * 给一次远端调用套上超时，并且不吞掉失败原因 ——
 * 返回 `{ ok: true, value }` 或 `{ ok: false, reason }`，便于把「超时」与「抛错」分开。
 */
export function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    let settled = false
    const settle = (outcome) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(outcome)
    }
    const timer = window.setTimeout(() => settle({ ok: false, reason: `${ms}ms 内没有返回` }), ms)
    Promise.resolve(promise).then(
      (value) => settle({ ok: true, value }),
      (error) => settle({ ok: false, reason: error instanceof Error ? error.message : String(error) }),
    )
  })
}

/**
 * 行号区间：优先用行自带的 `data-textpreview-line`（纯文本预览有）；
 * 代码预览没有这个属性，退回按 `.line` 序号推算。两者都拿不到就不写行号。
 */
export function lineRangeWithin(root, startEl, endEl) {
  const marked = lineNumberOf(startEl) ?? lineNumberOf(endEl)
  if (marked !== undefined) return { start: marked, end: lineNumberOf(endEl) ?? marked }
  const start = codeLineNumberOf(root, startEl)
  if (start === undefined) return { start: undefined, end: undefined }
  return { start, end: codeLineNumberOf(root, endEl) ?? start }
}
