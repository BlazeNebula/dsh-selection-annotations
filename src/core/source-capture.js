import { safe, cssEscape } from './util.js'
import { offsetRange, pathFromPreviewUrl, lineRangeWithin, rangeFromOffsets } from './source-locate.js'

/** 一条批注最多存几段；超出的先并段，仍超就保留首末段并标 segmentsTruncated。*/
const MAX_SEGMENTS = 8

/**
 * 会打断阅读顺序的块级标签：跨过它们就是另一段。
 * 行内元素（strong/em/code/a/span）不在这里 —— 一句话被加粗、链接或行内代码切开时仍算一段，
 * 否则同一行会被切成好几段，反而更难定位。
 */
const BLOCK_TAGS = new Set([
  'p', 'li', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'td', 'th', 'dd', 'dt', 'figcaption', 'div', 'section', 'article', 'tr',
])

/**
 * 行内标签：永不作为切段边界，哪怕它自身带样式（DSH 正文里的行内代码就是
 * `<code>`，display:inline-flex，左右各 5px padding）。清单与 BLOCK_TAGS 互斥；
 * 两处都显式检查，以后增删任一侧都不会把行内元素误判成块。
 */
const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'code', 'em', 'i', 'kbd', 'mark', 'q', 's', 'samp',
  'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var',
])

/**
 * 文本节点所属的块：从元素自身向上找第一个块级标签，最多找到 root（含 root）。
 * 只有真的落到块元素才切段；行内元素与自定义标签都跳过，也不允许越过 root
 * 去认外面更大的块 —— 那会把相邻字段甚至别的消息行并进同一段。
 * 在 root 内找不到块元素时返回 null：整根按同一段处理，只会少切、不会多切。
 * @param element - 文本节点的父元素。
 * @param root - 本次遍历的根，切段边界必须落在它里面。
 */
function blockOf(element, root) {
  if (element === null || element === undefined) return null
  const limit = root ?? null
  let node = element
  while (node !== null && node !== undefined) {
    if (node.nodeType === 1) {
      const tag = String(node.tagName ?? '').toLowerCase()
      if (BLOCK_TAGS.has(tag) && !INLINE_TAGS.has(tag)) return node
    }
    if (node === limit) return null
    node = node.parentElement
  }
  return null
}

function anchorKeyOfNode(node) {
  const element = node === null || node === undefined ? null : node.parentElement
  if (element === null || element === undefined) return ''
  return safe(() => element.closest('[data-chat-anchor-key]')?.getAttribute('data-chat-anchor-key')) ?? ''
}

function rowOfNode(node) {
  const element = node === null || node === undefined ? null : node.parentElement
  if (element === null || element === undefined) return null
  return safe(() => element.closest('[data-chat-anchor-key]')) ?? null
}

/**
 * 把一次选区拆成「按块分段的引文区间」。
 *
 * 只存每段的 `quoteStart/quoteEnd`（引文里的位置）与 `charStart/charEnd`（所属根元素里的偏移），
 * 不存文本：引文本身已经在条目上，段只是它的一段切片。不变量：
 * `charEnd - charStart === quoteEnd - quoteStart`，且每一段都能单独定位。
 *
 * 空白段丢弃，但游标照常前进 —— 这样后一段的 `quoteStart` 仍然对得上原引文。
 * 超过 MAX_SEGMENTS 时先并同根相邻段（中间只有空白或行内元素），仍超就取前 7 段加末段。
 * @param root - 遍历范围的根（消息行、答复字段或已发送条目）。
 * @param range - 用户选区。
 * @param source - 已捕获的来源，`anchorKey` 在文本节点不在锚点行内时兜底。
 * @returns `{ segments, coverage, truncated }`；coverage 是走到的原文长度，用来校验是否覆盖整段选区。
 */
export function buildSegments(root, range, source) {
  if (root === null || root === undefined || range === null || range === undefined) {
    return { segments: [], coverage: 0, truncated: false }
  }
  const quoteLength = safe(() => range.toString().length) ?? 0
  if (quoteLength <= 0) return { segments: [], coverage: 0, truncated: false }
  // 只有消息行有锚点键可兜底：答复卡与已发送卡的根就是字段元素本身，
  // 段上留空锚点键，定位时才会回退到 anchorRoot，而不是去翻同名的消息行。
  const fallbackAnchorKey =
    source?.kind === 'message' && typeof source?.anchorKey === 'string' ? source.anchorKey : ''
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const blocks = []
  let cursor = 0
  let node = walker.nextNode()
  while (node !== null) {
    const inside = safe(() => range.intersectsNode(node)) === true
    if (inside) {
      const value = node.nodeValue ?? ''
      const start = node === range.startContainer ? range.startOffset : 0
      const end = node === range.endContainer ? range.endOffset : value.length
      if (end > start) {
        const anchorKey = anchorKeyOfNode(node) || fallbackAnchorKey
        const block = blockOf(node.parentElement, root)
        const quoteStart = cursor
        const quoteEnd = cursor + (end - start)
        cursor = quoteEnd
        if (value.slice(start, end).trim() !== '') {
          const last = blocks[blocks.length - 1]
          const mergeable = last !== undefined && last.anchorKey === anchorKey && last.block === block
          if (mergeable) {
            // 同块内相邻文本节点（中间只隔行内元素或空白）并成一段，段数才不会被加粗、链接撑爆。
            last.endNode = node
            last.endOffset = end
            last.quoteEnd = quoteEnd
          } else {
            blocks.push({
              anchorKey,
              block,
              startNode: node,
              startOffset: start,
              endNode: node,
              endOffset: end,
              quoteStart,
              quoteEnd,
            })
          }
        }
      }
    }
    node = walker.nextNode()
  }
  const coverage = cursor
  let picked = blocks
  let truncated = false
  if (picked.length > MAX_SEGMENTS) {
    picked = mergeAdjacentSameRoot(picked)
    if (picked.length > MAX_SEGMENTS) {
      // 优先保首末段：首段代表「从哪开始」，末段保证选区末尾也被标记到。
      picked = [...picked.slice(0, MAX_SEGMENTS - 1), picked[picked.length - 1]]
      truncated = true
    }
  }
  const segments = []
  for (const block of picked) {
    const measureRoot = rowOfNode(block.startNode) ?? root
    const segmentRange = safe(() => {
      const probe = document.createRange()
      probe.setStart(block.startNode, block.startOffset)
      probe.setEnd(block.endNode, block.endOffset)
      return probe
    })
    if (segmentRange === undefined) continue
    const chars = offsetRange(measureRoot, segmentRange)
    if (!Number.isFinite(chars.start)) continue
    // 保持不变式：字符长度只按引文切片长度算，量出来的 charEnd 只当交叉校验。
    const charStart = chars.start
    const charEnd = charStart + (block.quoteEnd - block.quoteStart)
    if (charEnd <= charStart) continue
    segments.push({
      anchorKey: block.anchorKey,
      textOrigin: 'rendered',
      charStart,
      charEnd,
      quoteStart: block.quoteStart,
      quoteEnd: block.quoteEnd,
    })
  }
  return { segments, coverage, truncated }
}

/** 同根相邻段并成一段：段数超限时的第一道收缩。*/
function mergeAdjacentSameRoot(blocks) {
  const out = []
  for (const block of blocks) {
    const last = out[out.length - 1]
    if (last !== undefined && last.anchorKey === block.anchorKey && last.block === block.block) {
      last.endNode = block.endNode
      last.endOffset = block.endOffset
      last.quoteEnd = block.quoteEnd
      continue
    }
    out.push({ ...block })
  }
  return out
}

/**
 * 读回判据：只有「每段四个数字都有限、区间合法、且字符长度等于引文切片长度」才算可用。
 * 顶层字段若存在，必须与首段同义 —— 否则是坏数据，宁可不分段。
 * @param source - 条目上的来源。
 * @param quote - 条目上的引文（用来限定 quoteEnd 上界）。
 * @returns 规范化后的段数组；不可用返回 null。
 */
export function segmentsOf(source, quote) {
  const list = source?.segments
  if (!Array.isArray(list) || list.length === 0) return null
  const length = typeof quote === 'string' ? quote.length : 0
  if (length <= 0) return null
  const out = []
  for (const segment of list) {
    if (out.length >= MAX_SEGMENTS) break
    if (segment === null || typeof segment !== 'object' || Array.isArray(segment)) return null
    const { charStart, charEnd, quoteStart, quoteEnd } = segment
    if (!Number.isFinite(charStart) || !Number.isFinite(charEnd)) return null
    if (!Number.isFinite(quoteStart) || !Number.isFinite(quoteEnd)) return null
    if (charStart < 0 || charEnd <= charStart) return null
    if (charEnd - charStart !== quoteEnd - quoteStart) return null
    if (quoteStart < 0 || quoteEnd <= quoteStart || quoteEnd > length) return null
    out.push({
      anchorKey: typeof segment.anchorKey === 'string' ? segment.anchorKey : '',
      textOrigin: segment.textOrigin === 'source' ? 'source' : 'rendered',
      charStart,
      charEnd,
      quoteStart,
      quoteEnd,
      ...(typeof segment.fingerprintBefore === 'string' ? { fingerprintBefore: segment.fingerprintBefore } : {}),
      ...(typeof segment.fingerprintAfter === 'string' ? { fingerprintAfter: segment.fingerprintAfter } : {}),
    })
  }
  if (out.length === 0) return null
  if (Number.isFinite(source?.charStart) && source.charStart !== out[0].charStart) return null
  if (Number.isFinite(source?.charEnd) && source.charEnd !== out[0].charEnd) return null
  return out
}

/** 选段覆盖的原文区间（跨段选区时范围可以很大；这里只判断交集）。*/
function spanOfSegment(segment) {
  const start = Math.max(0, segment.quoteStart)
  const end = Math.max(start, segment.quoteEnd)
  return { start, end }
}

/**
 * 把分段收紧到最终保存的引文上。
 *
 * `addAnnotation` 会 `trim()` 再 `slice(0, MAX_QUOTE)`：前者让所有偏移整体左移，
 * 后者让末段越界。这里按「原始引文 → 最终引文」的偏移差逐段裁剪、平移，
 * 被裁空的段直接丢弃，并让顶层字段重新等于首段。
 * @param source - 刚捕获的来源。
 * @param rawQuote - 捕获时的原始引文（range.toString()）。
 * @param quote - 最终保存的引文。
 * @returns 收紧后的来源；没有可用段时移除 segments。
 */
export function fitSegmentsToQuote(source, rawQuote, quote) {
  if (source === null || typeof source !== 'object') return source
  const list = source.segments
  if (!Array.isArray(list) || list.length === 0) return source
  const raw = typeof rawQuote === 'string' ? rawQuote : ''
  const kept = typeof quote === 'string' ? quote : ''
  const lead = Math.max(0, raw.length - raw.trimStart().length)
  const keptEnd = lead + kept.length
  const next = []
  for (const segment of list) {
    if (segment === null || typeof segment !== 'object') continue
    if (![segment.charStart, segment.charEnd, segment.quoteStart, segment.quoteEnd].every(Number.isFinite)) continue
    const span = spanOfSegment(segment)
    const start = Math.max(span.start, lead)
    const end = Math.min(span.end, keptEnd)
    if (end <= start) continue
    const shift = start - segment.quoteStart
    const charStart = segment.charStart + shift
    next.push({
      ...segment,
      charStart,
      charEnd: charStart + (end - start),
      quoteStart: start - lead,
      quoteEnd: end - lead,
    })
  }
  if (next.length === 0) {
    const cleaned = { ...source }
    delete cleaned.segments
    delete cleaned.segmentsTruncated
    return cleaned
  }
  const first = next[0]
  return { ...source, charStart: first.charStart, charEnd: first.charEnd, segments: next }
}

const elementOf = (node) => {
  if (node === null || node === undefined) return null
  if (node.nodeType === 1) return node
  return node.parentElement ?? null
}

const REPLY_FIELD_BY_CLASS = {
  'sa-q-quote': 'quote',
  'sa-q-note': 'note',
  'sa-a-reason': 'reason',
  'sa-a-next': 'next',
}
const REPLY_CLASS_BY_FIELD = { quote: 'sa-q-quote', note: 'sa-q-note', reason: 'sa-a-reason', next: 'sa-a-next' }

/**
 * 把一次选区翻译成可持久化的出处：
 * 消息（role + anchorKey + 字符区间）、工作区文件（path + 行号 + 字符区间）、
 * 答复卡（批次 + 批注编号 + 字段）与已发送卡（消息键 + 编号 + 字段）。
 */
export function createSourceCapture() {
  /**
   * 给来源挂上分段；选区没被完整覆盖（端点跨出 root）时保持旧的单段字段。
   * 顶层 charStart/charEnd 恒等于首段，只有一段时与旧数据完全同形。
   */
  function withSegments(source, root, range) {
    const quoteLength = safe(() => range.toString().length) ?? 0
    if (quoteLength <= 0) return source
    const built = safe(() => buildSegments(root, range, source))
    if (built === undefined || built.segments.length === 0) return source
    // 只覆盖到一部分时不能挂：段里的 quoteEnd 会与整段引文对不上，定位会错位。
    if (built.coverage !== quoteLength) return source
    const first = built.segments[0]
    return {
      ...source,
      charStart: first.charStart,
      charEnd: first.charEnd,
      segments: built.segments,
      ...(built.truncated === true ? { segmentsTruncated: true } : {}),
    }
  }

  function captureSource(range) {
    const startEl = elementOf(range.startContainer)
    const endEl = elementOf(range.endContainer)
    if (startEl === null) return { kind: 'dom' }

    const replyItem = startEl.closest('.sa-reply-item')
    if (replyItem !== null && replyItem.closest('[data-sa-ui="replies"]') !== null) {
      // 老卡片（本次改动之前渲染的 DOM）没有 data-sa-field，按类名兜底；
      // 批注编号也能从「批注 N」标题里读回来，免得整条只剩一个模糊的“整条答复”。
      const fieldOf = (element) => {
        if (element === null) return null
        const marked = element.closest('[data-sa-field]')
        if (marked !== null) return marked.getAttribute('data-sa-field') ?? 'item'
        for (const name of Object.keys(REPLY_FIELD_BY_CLASS)) {
          if (element.closest(`.${name}`) !== null) return REPLY_FIELD_BY_CLASS[name]
        }
        return null
      }
      const startField = fieldOf(startEl)
      const endField = fieldOf(endEl)
      const field = startField !== null && (endField === null || startField === endField) ? startField : 'item'
      let fieldElement = replyItem
      if (field !== 'item') {
        fieldElement =
          startEl.closest(`[data-sa-field="${cssEscape(field)}"]`) ??
          startEl.closest(`.${REPLY_CLASS_BY_FIELD[field]}`) ??
          replyItem
      }
      const chars = offsetRange(fieldElement, range)
      let index = Number(replyItem.getAttribute('data-sa-reply-index'))
      if (!Number.isFinite(index) || index === 0) {
        const digits = (replyItem.querySelector('.sa-reply-index')?.textContent ?? '').match(/(\d+)/)
        index = digits === null ? 0 : Number(digits[1])
      }
      return withSegments(
        {
          kind: 'reply',
          batchAt: Number(replyItem.getAttribute('data-sa-batch-at')) || 0,
          index,
          field,
          charStart: chars.start,
          charEnd: chars.end,
          textOrigin: 'rendered',
        },
        fieldElement,
        range,
      )
    }

    const sentItem = startEl.closest('.sa-sent-item')
    if (sentItem !== null) {
      const sentCard = sentItem.closest('[data-sa-ui="sent"]')
      if (sentCard !== null) {
        const fieldOf = (element) => {
          if (element === null) return null
          const note = element.closest('.sa-sent-note')
          if (note !== null) return { key: 'note', el: note }
          const quote = element.closest('.sa-sent-quote')
          if (quote !== null) return { key: 'quote', el: quote }
          return null
        }
        const startField = fieldOf(startEl)
        const endField = fieldOf(endEl)
        const field =
          startField !== null && (endField === null || endField.key === startField.key) ? startField.key : 'item'
        const fieldEl = field === 'item' ? sentItem : startField.el
        const chars = offsetRange(fieldEl, range)
        let index = Number(sentItem.getAttribute('data-sa-sent-index'))
        if (!Number.isFinite(index) || index === 0) {
          const digits = (sentItem.querySelector('.sa-sent-num')?.textContent ?? '').match(/(\d+)/)
          index = digits === null ? 0 : Number(digits[1])
        }
        return withSegments(
          {
            kind: 'sent',
            anchorKey: sentCard.getAttribute('data-anchor') ?? '',
            index,
            field,
            charStart: chars.start,
            charEnd: chars.end,
            textOrigin: 'rendered',
          },
          fieldEl,
          range,
        )
      }
    }

    const row = startEl.closest('[data-chat-anchor-key]')
    if (row !== null) {
      const chars = offsetRange(row, range)
      // 记下所属轮次：之后那一行可能被宿主卸载，靠轮次号才能让导航按钮把它加载回来。
      const turnText = row.closest('[data-chat-turn]')?.getAttribute('data-chat-turn') ?? ''
      const turn = turnText === '' ? null : Number(turnText)
      const source = {
        kind: 'message',
        role: (row.getAttribute('data-chat-flow-kind') ?? '') === 'user' ? 'user' : 'assistant',
        anchorKey: row.getAttribute('data-chat-anchor-key') ?? '',
        flowKind: row.getAttribute('data-chat-flow-kind') ?? '',
        charStart: chars.start,
        charEnd: chars.end,
        ...(Number.isFinite(turn) ? { turn } : {}),
      }
      // 选区跨出这一行时，从共同祖先里走，段内偏移仍按各自所属的消息行量。
      const walkRoot = row.contains(range.endContainer) ? row : safe(() => {
        const common = range.commonAncestorContainer
        if (common === null || common === undefined) return row
        return common.nodeType === 1 ? common : common.parentElement ?? row
      }) ?? row
      return withSegments(source, walkRoot, range)
    }

    const doc = startEl.closest('[data-textpreview-url]')
    if (doc !== null) {
      const url = doc.getAttribute('data-textpreview-url') ?? ''
      const lines = lineRangeWithin(doc, startEl, endEl)
      const chars = offsetRange(doc, range)
      return {
        kind: 'file',
        path: pathFromPreviewUrl(url),
        sourceUrl: url,
        lineStart: lines.start,
        lineEnd: lines.end,
        charStart: chars.start,
        charEnd: chars.end,
        // 默认口径是渲染后的正文；保存时会再试着读源文件改成 source。
        textOrigin: 'rendered',
      }
    }

    const code = startEl.closest('[data-code-preview]')
    if (code !== null) {
      const lines = lineRangeWithin(code, startEl, endEl)
      const chars = offsetRange(code, range)
      return { kind: 'file', lineStart: lines.start, lineEnd: lines.end, charStart: chars.start, charEnd: chars.end, textOrigin: 'rendered' }
    }

    return { kind: 'dom' }
  }

  /** 锚点根元素：消息行、文件预览外壳、已发送卡或答复卡。 */
  function anchorRoot(source) {
    if (source === null || source === undefined) return null
    if (source.kind === 'message' && source.anchorKey) {
      return (
        document.querySelector(`[data-chat-anchor-key="${cssEscape(source.anchorKey)}"]`) ??
        document.querySelector(`[data-chat-flow-key="${cssEscape(source.anchorKey)}"]`)
      )
    }
    if (source.kind === 'file' && source.sourceUrl) {
      return document.querySelector(`[data-textpreview-url="${cssEscape(source.sourceUrl)}"]`)
    }
    if (source.kind === 'file') return document.querySelector('[data-code-preview]')
    if (source.kind === 'sent' && source.anchorKey) {
      const card = document.querySelector(`[data-sa-ui="sent"][data-anchor="${cssEscape(source.anchorKey)}"]`)
      if (card !== null) {
        const wanted = Number(source.index)
        for (const item of card.querySelectorAll('.sa-sent-item')) {
          const digits = (item.querySelector('.sa-sent-num')?.textContent ?? '').match(/(\d+)/)
          const index = Number(item.getAttribute('data-sa-sent-index')) || (digits === null ? 0 : Number(digits[1]))
          if (index !== wanted) continue
          if (typeof source.field === 'string' && source.field !== '' && source.field !== 'item') {
            const field = item.querySelector(`[data-sa-field="${cssEscape(source.field)}"]`)
            return field ?? item
          }
          return item
        }
      }
    }
    if (source.kind === 'reply') {
      const batchAt = Number(source.batchAt)
      const replyIndex = Number(source.index)
      for (const item of document.querySelectorAll('.sa-reply-item')) {
        if (item.closest('[data-sa-ui="replies"]') === null) continue
        if (Number(item.getAttribute('data-sa-batch-at')) !== batchAt) continue
        if (Number(item.getAttribute('data-sa-reply-index')) !== replyIndex) continue
        if (typeof source.field === 'string' && source.field !== '' && source.field !== 'item') {
          const field = item.querySelector(`[data-sa-field="${cssEscape(source.field)}"]`)
          return field ?? item
        }
        return item
      }
    }
    return null
  }

  /** 在根元素里定位原文；重复片段用保存时的偏移择优。 */
  function matchInRoot(root, quote, savedOffset) {
    if (typeof quote !== 'string' || quote === '') return undefined
    const text = root.textContent ?? ''
    const positions = []
    let from = 0
    for (;;) {
      const at = text.indexOf(quote, from)
      if (at === -1 || positions.length >= 64) break
      positions.push(at)
      from = at + 1
    }
    if (positions.length === 0) return undefined
    let best = positions[0]
    if (positions.length > 1 && Number.isFinite(savedOffset)) {
      best = positions.reduce((a, b) => (Math.abs(b - savedOffset) < Math.abs(a - savedOffset) ? b : a))
    }
    return rangeFromOffsets(root, best, quote.length)
  }

  function rangeMatchesQuote(range, quote) {
    const current = safe(() => range.toString())
    if (typeof current !== 'string') return false
    const normalize = (value) => value.replace(/\s+/g, ' ').trim()
    return normalize(current) === normalize(quote)
  }

  return { captureSource, anchorRoot, rangeFromOffsets, matchInRoot, rangeMatchesQuote }
}
