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

/**
 * 按「根元素文本里的字符偏移」重建一个 Range。
 * 从 source-capture 挪到这里，让分段捕获、分段定位共用同一份测量口径。
 */
export function rangeFromOffsets(root, start, length) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let offset = 0
  let startNode
  let startOffset = 0
  let endNode
  let endOffset = 0
  let node = walker.nextNode()
  while (node !== null) {
    const size = node.nodeValue === null ? 0 : node.nodeValue.length
    if (startNode === undefined && offset + size >= start) {
      startNode = node
      startOffset = start - offset
    }
    if (startNode !== undefined && offset + size >= start + length) {
      endNode = node
      endOffset = start + length - offset
      break
    }
    offset += size
    node = walker.nextNode()
  }
  if (startNode === undefined || endNode === undefined) return undefined
  return safe(() => {
    const range = document.createRange()
    range.setStart(startNode, Math.max(0, Math.min(startOffset, startNode.nodeValue.length)))
    range.setEnd(endNode, Math.max(0, Math.min(endOffset, endNode.nodeValue.length)))
    return range
  })
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

/**
 * 在根元素里按「空白折叠后」的文本定位一段引文。
 *
 * 渲染后的正文会被换行、缩进重排：`p` 与 `p` 之间的换行、`li` 的缩进都不在文本节点里，
 * 但 `textContent` 会原样拼出空白序列，于是同一个选区在窄屏/宽屏下空白数量可能不同，
 * 精确 `indexOf` 就会落空。两边都折叠空白再比，命中后把规范化下标映射回源文本下标：
 * 末端取 `map[pos + len]`（命中后的第一个规范化字符），越界时取文本长度 ——
 * 用 `map[pos + len - 1] + 1` 会在末字符后紧跟空白时把结尾的空白吞掉。
 * 重复片段按保存时的偏移取最近的一处。
 * @param root - 搜索范围（元素）。
 * @param needle - 要定位的引文（原始空白即可，函数内部折叠）。
 * @param savedOffset - 保存时的根内字符偏移，用于在多处命中里选最近的一处。
 * @returns 命中的 Range；找不到返回 undefined。
 */
export function matchInRootNormalized(root, needle, savedOffset) {
  if (root === null || root === undefined) return undefined
  if (typeof needle !== 'string' || needle === '') return undefined
  const target = needle.replace(/\s+/g, ' ').trim()
  if (target === '') return undefined
  const raw = safe(() => root.textContent) ?? ''
  if (raw === '') return undefined
  const hay = normalizeWithMap(raw)
  if (hay.text === '') return undefined
  const positions = []
  let from = 0
  for (;;) {
    const at = hay.text.indexOf(target, from)
    if (at === -1 || positions.length >= 64) break
    positions.push(at)
    from = at + 1
  }
  if (positions.length === 0) return undefined
  let best = positions[0]
  if (positions.length > 1 && Number.isFinite(savedOffset)) {
    best = positions.reduce((a, b) => {
      const nearA = Math.abs((hay.map[a] ?? a) - savedOffset)
      const nearB = Math.abs((hay.map[b] ?? b) - savedOffset)
      return nearB < nearA ? b : a
    })
  }
  const start = hay.map[best]
  if (start === undefined) return undefined
  const rawEnd = hay.map[best + target.length]
  // 命中顶到规范化文本末尾时，末端取原文长度：map 存的是原文下标，
  // 用规范化文本长度当原文下标会把折叠掉的空白算进来、把最后几个字符截掉。
  const end = rawEnd === undefined ? raw.length : rawEnd
  const length = Math.max(0, Math.min(end, raw.length) - start)
  if (length <= 0) return undefined
  return rangeFromOffsets(root, start, length)
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
