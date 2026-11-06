import { PAYLOAD_KIND } from './config.js'

/**
 * 批注负载与出处文案。
 * 负载是一个自描述的 JSON 数据块：位置要能被程序化使用，所以用字段而不是自然语言描述。
 */
export function createPayload({ t, instructionOf }) {
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
    }
    if (out.kind === 'file' || out.kind === 'message' || out.kind === 'reply' || out.kind === 'sent') {
      out.textOrigin = source?.textOrigin === 'source' ? 'source' : 'rendered'
    }
    if (Number.isFinite(source?.charStart)) out.charStart = source.charStart
    if (Number.isFinite(source?.charEnd)) out.charEnd = source.charEnd
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
