import { safe, cssEscape } from './util.js'
import { offsetRange, pathFromPreviewUrl, lineRangeWithin } from './source-locate.js'

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
      return {
        kind: 'reply',
        batchAt: Number(replyItem.getAttribute('data-sa-batch-at')) || 0,
        index,
        field,
        charStart: chars.start,
        charEnd: chars.end,
        textOrigin: 'rendered',
      }
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
        return {
          kind: 'sent',
          anchorKey: sentCard.getAttribute('data-anchor') ?? '',
          index,
          field,
          charStart: chars.start,
          charEnd: chars.end,
          textOrigin: 'rendered',
        }
      }
    }

    const row = startEl.closest('[data-chat-anchor-key]')
    if (row !== null) {
      const chars = offsetRange(row, range)
      return {
        kind: 'message',
        role: (row.getAttribute('data-chat-flow-kind') ?? '') === 'user' ? 'user' : 'assistant',
        anchorKey: row.getAttribute('data-chat-anchor-key') ?? '',
        flowKind: row.getAttribute('data-chat-flow-kind') ?? '',
        charStart: chars.start,
        charEnd: chars.end,
      }
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

  function rangeFromOffsets(root, start, length) {
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
