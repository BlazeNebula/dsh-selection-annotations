import { truncateQuote } from './util.js'

/**
 * 两个区域共用的收展头、矢量箭头与可折展容器，以及已提交批注的卡片。
 */
export function createCards({ t, openImageViewer }) {
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
    const body = document.createElement('div')
    body.className = 'sa-sent-body'
    const wrap = collapsible(body, false)
    applyCollapsed(head, wrap, false)
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
            openImageViewer(thumb.dataUrl, thumb.name)
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

  return { sectionChevron, buildSectionHead, collapsible, applyCollapsed, buildSentCard }
}
