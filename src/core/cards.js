import { truncateQuote } from './util.js'
import { mergeReplyBatches } from './annotation-utils.js'

const VERDICT_LABELS = {
  accepted: ['verdict.accepted', 'accepted'],
  partial: ['verdict.partial', 'partial'],
  rejected: ['verdict.rejected', 'rejected'],
  needs_info: ['verdict.needs_info', 'needs_info'],
}

/**
 * 两个区域共用的收展头、矢量箭头与可折展容器，以及已提交批注的卡片。
 */
export function createCards({ t, openImageViewer, markdown, isAdopt = () => false }) {
  function sectionChevron() {
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('class', 'sa-section-chevron')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('aria-hidden', 'true')
    const path = document.createElementNS(ns, 'path')
    path.setAttribute('d', 'M6.2 3.6 10.7 8l-4.5 4.4')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', 'currentColor')
    path.setAttribute('stroke-width', '1.8')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    svg.appendChild(path)
    return svg
  }

  /** 两个区域共用的收展入口：同一套结构、尺寸与留白。 */
  function buildSectionHead(label, meta) {
    const head = document.createElement('button')
    head.type = 'button'
    head.className = 'sa-section-head'
    head.appendChild(sectionChevron())
    const title = document.createElement('span')
    title.className = 'sa-section-title'
    title.textContent = label
    head.appendChild(title)
    if (typeof meta === 'string' && meta !== '') {
      const metaEl = document.createElement('span')
      metaEl.className = 'sa-section-meta'
      metaEl.textContent = meta
      head.appendChild(metaEl)
    }
    return head
  }

  /** 可折展容器：0fr↔1fr 撑开内容，收起时不占高度。 */
  function collapsible(body, open) {
    const wrap = document.createElement('div')
    wrap.className = 'sa-collapse'
    // 行内样式优先于样式表，并且用同一个「标题 + 内容」的纵向间隔来表达，
    // 这样两处区域无论内部结构怎样嵌套，视觉间距都完全一致。
    wrap.style.marginTop = '0px'
    wrap.dataset.open = open ? '1' : '0'
    const inner = document.createElement('div')
    inner.className = 'sa-collapse-inner'
    inner.appendChild(body)
    wrap.appendChild(inner)
    return wrap
  }

  function applyCollapsed(head, wrap, open) {
    wrap.dataset.open = open ? '1' : '0'
    head.dataset.open = open ? '1' : '0'
    head.setAttribute('aria-expanded', String(open))
  }

  /** 一条已提交批注在历史里的卡片：默认收起，点开看引文与批注文字。 */
  function buildSentCard(record, anchorKey) {
    const card = document.createElement('div')
    card.className = 'sa-sent'
    card.setAttribute('data-sa-ui', 'sent')
    // 记下锚点键：卡片现在插在消息行外，判重要靠它而不是「行内有没有卡片」。
    if (typeof anchorKey === 'string' && anchorKey !== '') card.setAttribute('data-anchor', anchorKey)
    const head = buildSectionHead(t('sent.title', { n: record.items.length }))
    head.style.marginBottom = '0'
    card.style.display = 'flex'
    card.style.flexDirection = 'column'
    card.style.rowGap = '12px'
    const body = document.createElement('div')
    body.className = 'sa-sent-body'
    body.style.paddingTop = '0px'
    const wrap = collapsible(body, true)
    applyCollapsed(head, wrap, true)
    for (const item of record.items) {
      const line = document.createElement('div')
      line.className = 'sa-sent-item'
      line.setAttribute('data-sa-sent-index', Number.isFinite(item.index) ? String(item.index) : '')
      const num = document.createElement('span')
      num.className = 'sa-sent-num'
      num.textContent = Number.isFinite(item.index) ? String(item.index) : ''
      const text = document.createElement('div')
      text.className = 'sa-sent-text'
      const quote = document.createElement('div')
      quote.className = 'sa-sent-quote'
      quote.setAttribute('data-sa-field', 'quote')
      quote.textContent = truncateQuote(item.quote)
      text.appendChild(quote)
      if (typeof item.note === 'string' && item.note.trim() !== '') {
        const note = document.createElement('div')
        note.className = 'sa-sent-note'
        if (isAdopt(item.note)) note.dataset.adopt = '1'
        note.setAttribute('data-sa-field', 'note')
        note.textContent = item.note
        text.appendChild(note)
      }
      const thumbs = Array.isArray(item.thumbs) ? item.thumbs : []
      if (thumbs.length > 0) {
        const gallery = document.createElement('div')
        gallery.className = 'sa-sent-thumbs'
        for (const thumb of thumbs) {
          if (typeof thumb?.dataUrl !== 'string' || thumb.dataUrl === '') continue
          const img = document.createElement('img')
          img.className = 'sa-sent-thumb'
          img.src = thumb.dataUrl
          img.alt = typeof thumb.name === 'string' ? thumb.name : t('image.alt')
          img.title = t('image.open')
          img.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()
            openImageViewer(typeof thumb.preview === 'string' && thumb.preview !== '' ? thumb.preview : thumb.dataUrl, thumb.name)
          })
          gallery.appendChild(img)
        }
        if (gallery.childNodes.length > 0) text.appendChild(gallery)
      }
      line.append(num, text)
      body.appendChild(line)
    }
    head.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      applyCollapsed(head, wrap, wrap.dataset.open !== '1')
    })
    card.append(head, wrap)
    return card
  }

  function buildReplySection(batches, items = []) {
    const replies = mergeReplyBatches(batches)
    const byIndex = new Map()
    for (const item of Array.isArray(items) ? items : []) {
      if (Number.isFinite(item?.index)) byIndex.set(item.index, item)
    }
    const card = document.createElement('div')
    card.className = 'sa-replies'
    card.setAttribute('data-sa-ui', 'replies')

    const counts = { accepted: 0, partial: 0, rejected: 0, needs_info: 0 }
    for (const reply of replies) {
      if (Object.hasOwn(counts, reply.verdict)) counts[reply.verdict] += 1
    }
    const parts = []
    if (counts.accepted) parts.push(t('summary.accepted', { n: counts.accepted }))
    if (counts.partial) parts.push(t('summary.partial', { n: counts.partial }))
    if (counts.rejected) parts.push(t('summary.rejected', { n: counts.rejected }))
    if (counts.needs_info) parts.push(t('summary.needsInfo', { n: counts.needs_info }))
    const head = buildSectionHead(t('replies.title', { n: replies.length }), parts.join(' · '))
    card.style.display = 'flex'
    card.style.flexDirection = 'column'
    card.style.rowGap = '12px'
    card.appendChild(head)

    const body = document.createElement('div')
    body.className = 'sa-replies-body'
    body.style.paddingTop = '0px'
    for (const reply of replies) {
      const item = byIndex.get(reply.index)
      const [labelKey, tone] = VERDICT_LABELS[reply.verdict] ?? ['verdict.fallback', 'accepted']
      const group = document.createElement('div')
      group.className = `sa-reply-item sa-tone-${tone}`
      group.setAttribute('data-sa-batch-at', String(Number.isFinite(reply.at) ? reply.at : 0))
      group.setAttribute('data-sa-reply-index', String(reply.index))

      const cardHead = document.createElement('div')
      cardHead.className = 'sa-reply-head'
      const index = document.createElement('span')
      index.className = 'sa-reply-index'
      index.textContent = t('reply.index', { n: reply.index })
      const verdict = document.createElement('span')
      verdict.className = `sa-a-verdict sa-reply-${tone}`
      verdict.textContent = t(labelKey)
      cardHead.append(index, verdict)
      group.appendChild(cardHead)

      const content = document.createElement('div')
      content.className = 'sa-reply-body'

      if (item !== undefined) {
        const q = document.createElement('div')
        q.className = 'sa-q'
        const quoteText = typeof item.quote === 'string' ? item.quote.trim() : ''
        if (quoteText !== '') {
          const qLabel = document.createElement('div')
          qLabel.className = 'sa-q-label'
          qLabel.textContent = t('label.quote')
          q.appendChild(qLabel)
          const quote = document.createElement('div')
          quote.className = 'sa-q-quote'
          if (isAdopt(item.note)) quote.dataset.adopt = '1'
          quote.setAttribute('data-sa-field', 'quote')
          quote.textContent = quoteText
          quote.title = t('expand')
          // 超过三行时折叠；点一下展开，再点收回。
          quote.addEventListener('click', () => {
            quote.className = quote.className.includes('sa-q-open') ? 'sa-q-quote' : 'sa-q-quote sa-q-open'
          })
          q.appendChild(quote)
        }
        if (typeof item.note === 'string' && item.note.trim() !== '') {
          const noteLabel = document.createElement('div')
          noteLabel.className = 'sa-q-label'
          noteLabel.textContent = t('label.note')
          q.appendChild(noteLabel)
          const note = document.createElement('div')
          note.className = 'sa-q-note'
          note.setAttribute('data-sa-field', 'note')
          if (isAdopt(item.note)) note.dataset.adopt = '1'
          note.textContent = item.note
          q.appendChild(note)
        }
        content.appendChild(q)
      }

      const a = document.createElement('div')
      a.className = 'sa-a'
      const aHead = document.createElement('div')
      aHead.className = 'sa-a-head'
      const aLabel = document.createElement('span')
      aLabel.className = 'sa-a-label'
      aLabel.textContent = item !== undefined ? t('label.answer') : t('reply.fallbackLabel', { n: reply.index })
      aHead.appendChild(aLabel)
      a.appendChild(aHead)
      const reason = document.createElement('div')
      reason.className = 'sa-a-reason'
      reason.setAttribute('data-sa-field', 'reason')
      if (markdown !== undefined && typeof markdown.mount === 'function') {
        markdown.mount(reason, typeof reply.reason === 'string' ? reply.reason : '')
      } else {
        reason.textContent = typeof reply.reason === 'string' ? reply.reason : ''
      }
      a.appendChild(reason)
      if (typeof reply.next === 'string' && reply.next.trim() !== '') {
        const next = document.createElement('div')
        next.className = 'sa-a-next'
        next.setAttribute('data-sa-field', 'next')
        const label = document.createElement('span')
        label.className = 'sa-a-next-label'
        label.textContent = t('next.label')
        const body = document.createElement('span')
        body.className = 'sa-a-next-text'
        body.textContent = reply.next
        next.append(label, body)
        a.appendChild(next)
      }
      content.appendChild(a)
      group.appendChild(content)
      body.appendChild(group)
    }
    const wrap = collapsible(body, true)
    applyCollapsed(head, wrap, true)
    card.dataset.open = '1'
    head.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      applyCollapsed(head, wrap, wrap.dataset.open !== '1')
      card.dataset.open = wrap.dataset.open
    })
    card.append(wrap)
    return card
  }

  return { sectionChevron, buildSectionHead, collapsible, applyCollapsed, buildSentCard, buildReplySection }
}
