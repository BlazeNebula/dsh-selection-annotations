import { PAYLOAD_KIND } from './config.js'

/** 分段白名单：只抄这些字段，别让段上的临时缓存混进负载。*/
const MAX_PAYLOAD_SEGMENTS = 8

function finiteSpan(segment) {
  if (segment === null || typeof segment !== 'object' || Array.isArray(segment)) return false
  const { charStart, charEnd, quoteStart, quoteEnd } = segment
  if (![charStart, charEnd, quoteStart, quoteEnd].every(Number.isFinite)) return false
  if (charStart < 0 || charEnd <= charStart) return false
  if (quoteStart < 0 || quoteEnd <= quoteStart) return false
  return charEnd - charStart === quoteEnd - quoteStart
}

function payloadSegments(list) {
  if (!Array.isArray(list)) return undefined
  const out = []
  for (const segment of list) {
    if (out.length >= MAX_PAYLOAD_SEGMENTS) break
    if (!finiteSpan(segment)) continue
    const entry = {}
    if (typeof segment.anchorKey === 'string') entry.anchorKey = segment.anchorKey
    entry.textOrigin = segment.textOrigin === 'source' ? 'source' : 'rendered'
    entry.charStart = segment.charStart
    entry.charEnd = segment.charEnd
    entry.quoteStart = segment.quoteStart
    entry.quoteEnd = segment.quoteEnd
    if (typeof segment.fingerprintBefore === 'string') entry.fingerprintBefore = segment.fingerprintBefore
    if (typeof segment.fingerprintAfter === 'string') entry.fingerprintAfter = segment.fingerprintAfter
    out.push(entry)
  }
  return out.length > 0 ? out : undefined
}

/**
 * 批注负载与出处文案。
 * 负载是一个自描述的 JSON 数据块：位置要能被程序化使用，所以用字段而不是自然语言描述。
 */
export function createPayload({ t, instructionOf, uuidOfSent }) {
  /** 已发送条目的 uuid 由调用方按台账解析；没解析到或解析出错都不写这个字段。 */
  function sentUuidOf(source) {
    if (typeof uuidOfSent !== 'function') return undefined
    try {
      const uuid = uuidOfSent(source)
      return typeof uuid === 'string' && uuid !== '' ? uuid : undefined
    } catch {
      return undefined
    }
  }

  function describeSource(source) {
    if (source === null || source === undefined) return t('source.unknown')
    if (source.kind === 'message') {
      const role =
        source.flowKind === 'user' || source.flowKind === 'steering' ? t('source.user') : t('source.assistant')
      return t('source.message', { role, anchor: source.anchorKey || '-' })
    }
    if (source.kind === 'file') {
      const path = source.path ?? t('source.pathUnknown')
      let where = ''
      if (Number.isFinite(source.lineStart)) {
        where =
          Number.isFinite(source.lineEnd) && source.lineEnd !== source.lineStart
            ? t('source.lineRange', { a: source.lineStart, b: source.lineEnd })
            : t('source.lineSingle', { n: source.lineStart })
      }
      return t('source.file', { path, where })
    }
    if (source.kind === 'web') {
      return t('source.web', {
        url: typeof source.path === 'string' && source.path !== '' ? source.path : t('source.pathUnknown'),
        selector: typeof source.anchorKey === 'string' && source.anchorKey !== '' ? source.anchorKey : '-',
      })
    }
    if (source.kind === 'reply') {
      const fieldLabel =
        { quote: t('label.quote'), note: t('label.note'), reason: t('label.reason'), next: t('label.next') }[
          source.field
        ] ?? t('source.replyField')
      const anchor = `reply:${Number.isFinite(source.batchAt) ? source.batchAt : '-'}:${
        Number.isFinite(source.index) ? source.index : '-'
      }:${source.field || 'item'}`
      const span =
        Number.isFinite(source.charStart) && Number.isFinite(source.charEnd)
          ? t('source.span', { a: source.charStart, b: source.charEnd })
          : ''
      return t('source.reply', {
        index: Number.isFinite(source.index) ? source.index : '-',
        field: fieldLabel,
        anchor,
        span,
      })
    }
    if (source.kind === 'sent') {
      const fieldLabel = { quote: t('label.quote'), note: t('label.note') }[source.field] ?? t('source.sentField')
      const anchor = `sent:${source.anchorKey || '-'}:${Number.isFinite(source.index) ? source.index : '-'}:${
        source.field || 'item'
      }`
      const span =
        Number.isFinite(source.charStart) && Number.isFinite(source.charEnd)
          ? t('source.span', { a: source.charStart, b: source.charEnd })
          : ''
      return t('source.sent', {
        index: Number.isFinite(source.index) ? source.index : '-',
        field: fieldLabel,
        anchor,
        span,
      })
    }
    return t('source.selection')
  }

  function payloadSource(source) {
    const out = { kind: source?.kind ?? 'dom' }
    if (source?.kind === 'message') {
      out.role = source.role ?? (source.flowKind === 'user' || source.flowKind === 'steering' ? 'user' : 'assistant')
      if (typeof source.anchorKey === 'string' && source.anchorKey !== '') out.anchorKey = source.anchorKey
      if (typeof source.flowKind === 'string' && source.flowKind !== '') out.flowKind = source.flowKind
      // 轮次跟着条目走：宿主把那一轮卸下后，「跳到出处」还能拿它去点轮次导航。
      if (Number.isFinite(source.turn)) out.turn = source.turn
    } else if (source?.kind === 'file') {
      if (typeof source.path === 'string' && source.path !== '') out.path = source.path
      if (Number.isFinite(source.lineStart)) out.lineStart = source.lineStart
      if (Number.isFinite(source.lineEnd)) out.lineEnd = source.lineEnd
    } else if (source?.kind === 'reply') {
      if (Number.isFinite(source.batchAt)) out.batchAt = source.batchAt
      if (Number.isFinite(source.index)) out.index = source.index
      if (typeof source.field === 'string' && source.field !== '') out.field = source.field
    } else if (source?.kind === 'sent') {
      if (typeof source.anchorKey === 'string' && source.anchorKey !== '') out.anchorKey = source.anchorKey
      if (Number.isFinite(source.index)) out.index = source.index
      if (typeof source.field === 'string' && source.field !== '') out.field = source.field
      // 条目 uuid 只在知道时带上，让模型能定向答复那一条；不知道就不出现这个字段。
      const uuid = typeof source.uuid === 'string' && source.uuid !== '' ? source.uuid : sentUuidOf(source)
      if (typeof uuid === 'string' && uuid !== '') out.uuid = uuid
    } else if (source?.kind === 'web') {
      if (typeof source.anchorKey === 'string' && source.anchorKey !== '') out.anchorKey = source.anchorKey
      if (typeof source.path === 'string' && source.path !== '') out.path = source.path
    }
    if (out.kind === 'file' || out.kind === 'message' || out.kind === 'reply' || out.kind === 'sent' || out.kind === 'web') {
      out.textOrigin = source?.textOrigin === 'source' ? 'source' : 'rendered'
    }
    if (Number.isFinite(source?.charStart)) out.charStart = source.charStart
    if (Number.isFinite(source?.charEnd)) out.charEnd = source.charEnd
    // 分段是选中区间的按块切片：markConsumed 会把 payload 原样抄进台账，
    // 白名单漏掉它，发送后这条批注就永久退回整段定位。
    const segments = payloadSegments(source?.segments)
    if (segments !== undefined) {
      out.segments = segments
      if (source?.segmentsTruncated === true) out.segmentsTruncated = true
    }
    return out
  }

  function buildPayload(items) {
    let imageOrder = 0
    const annotations = items.map((item) => {
      const entry = {
        index: item.number,
        quote: item.quote,
        note: item.note,
        source: payloadSource(item.source),
      }
      // 条目 uuid 在捕获时生成，随批注一路带进数据块；旧数据没有就不写这个字段，
      // 绝不输出 null 或空串。
      const uuid = typeof item.uuid === 'string' && item.uuid !== '' ? item.uuid : undefined
      if (uuid !== undefined) entry.uuid = uuid
      const images = Array.isArray(item.images) ? item.images : []
      if (images.length > 0) {
        entry.images = images.map((image) => {
          imageOrder += 1
          return { order: imageOrder, name: image.name }
        })
      }
      return entry
    })
    return JSON.stringify(
      {
        kind: PAYLOAD_KIND,
        version: 1,
        instruction: instructionOf(),
        count: annotations.length,
        annotations,
      },
      null,
      2,
    )
  }

  return { describeSource, payloadSource, buildPayload }
}
