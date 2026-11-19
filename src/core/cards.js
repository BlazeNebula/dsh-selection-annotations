import { truncateQuote } from './util.js'
import { mergeReplyBatches } from './annotation-utils.js'
import { jumpIcon } from './jump-icon.js'
import { paintNote } from './note-tone.js'

export const VERDICT_LABELS = {
  accepted: ['verdict.accepted', 'accepted'],
  partial: ['verdict.partial', 'partial'],
  rejected: ['verdict.rejected', 'rejected'],
  needs_info: ['verdict.needs_info', 'needs_info'],
}

/**
 * 两个区域共用的收展头、矢量箭头与可折展容器，以及已提交批注的卡片。
 */
export function createCards({ t, openImageViewer, markdown, isAdopt = () => false, noteView = () => null }) {
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
  function buildSectionHead(label, meta, action) {
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
    if (action !== undefined && action !== null) head.appendChild(action)
    return head
  }

  /** 回放按钮的图标：两张叠起来的纸，表示「放回复用」。*/
  function replayIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '13')
    svg.setAttribute('height', '13')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('aria-hidden', 'true')
    for (const d of ['M5.6 5.6H12.4V12.4H5.6V5.6Z', 'M3.6 3.6H9.4V5.6']) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', d)
      path.setAttribute('stroke', 'currentColor')
      path.setAttribute('stroke-width', '1.2')
      svg.appendChild(path)
    }
    return svg
  }

  /**
   * 「图标常驻、文字悬停出现」的小按钮：回放与查看出处共用这一套观感与交互。
   * 文字节点始终占位，只切换透明度，悬停命中区域不会长大；.sa-reuse 自带 margin-left:auto，
   * 放进 flex 行里就贴最右，不需要额外的定位或包裹层。
   */
  function hoverTextButton(label, onClick, hint, icon) {
    const button = document.createElement('span')
    button.className = 'sa-reuse'
    button.setAttribute('role', 'button')
    button.setAttribute('tabindex', '0')
    button.setAttribute('aria-label', label)
    if (typeof hint === 'string' && hint !== '') button.title = hint
    const text = document.createElement('span')
    text.className = 'sa-reuse-text'
    text.textContent = label
    // 文字在前、图标贴右：与「回放」的语义一致。
    button.append(text, icon)
    const run = (event) => {
      event.preventDefault()
      event.stopPropagation()
      onClick()
    }
    button.addEventListener('click', run)
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') run(event)
    })
    return button
  }

  /** 已发送区右上角的「复用」图标：把这些批注重新放回待发送列表。*/
  function reuseButton(label, onClick, hint) {
    return hoverTextButton(label, onClick, hint, replayIcon())
  }

  /**
   * 「查看出处」按钮：与回放按钮同一套观感（图标常驻、文字悬停出现），
   * 作为「引用原文」那一行的普通子元素贴右，不绝对定位、不覆盖引文。
   */
  function jumpButton(item, onClick, hint) {
    const button = hoverTextButton(
      t('jump.label'),
      () => onClick(item, button),
      typeof hint === 'string' && hint !== '' ? hint : t('jump.hint'),
      jumpIcon(),
    )
    button.classList.add('sa-jump')
    // 工作区文件这版不打开，置灰；点了仍走一次提示，避免静默。
    if (item?.source?.kind === 'file') button.setAttribute('data-disabled', '1')
    return button
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
  function buildSentCard(record, anchorKey, options = {}) {
    const card = document.createElement('div')
    card.className = 'sa-sent'
    card.setAttribute('data-sa-ui', 'sent')
    // 记下锚点键：卡片现在插在消息行外，判重要靠它而不是「行内有没有卡片」。
    if (typeof anchorKey === 'string' && anchorKey !== '') card.setAttribute('data-anchor', anchorKey)
    const action = typeof options.onReuse === 'function'
      ? reuseButton(t('sent.reuse'), options.onReuse, t('reuse.hint'))
      : undefined
    const head = buildSectionHead(t('sent.title', { n: record.items.length }), undefined, action)
    head.style.marginBottom = '0'
    card.style.display = 'flex'
    card.style.flexDirection = 'column'
    card.style.rowGap = '8px'
    const body = document.createElement('div')
    body.className = 'sa-sent-body'
    // 卡片内部的呼吸感：首行文字离边框 8px，和标题到卡片的 8px 分开控制。
    body.style.padding = '8px'
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
      const quoteRow = document.createElement('div')
      quoteRow.className = 'sa-sent-quote-row'
      const quote = document.createElement('div')
      quote.className = 'sa-sent-quote'
      quote.setAttribute('data-sa-field', 'quote')
      quote.textContent = truncateQuote(item.quote)
      if (typeof options.onJumpQuote === 'function') {
        // 引文块整块可点：跳转入口只保留这一处。悬停变正文色由 .sa-quote-jump 负责。
        quote.classList.add('sa-quote-jump')
        quote.setAttribute('role', 'button')
        quote.setAttribute('tabindex', '0')
        quote.title = t('jump.hint')
        const runJump = (event) => {
          event.preventDefault()
          event.stopPropagation()
          options.onJumpQuote(item, quote)
        }
        quote.addEventListener('click', runJump)
        quote.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') runJump(event)
        })
      }
      quoteRow.appendChild(quote)
      // 引文块整块可点后不再重复放按钮，这一行只保留引文本身。
      text.appendChild(quoteRow)
      if (typeof item.note === 'string' && item.note.trim() !== '') {
        const note = document.createElement('div')
        note.className = 'sa-sent-note'
        note.setAttribute('data-sa-field', 'note')
        paintNote(note, item.note, noteView(item.note))
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
      if (typeof options.onReplayItem === 'function') {
        line.appendChild(reuseButton(t('sent.replayItem'), () => options.onReplayItem(item), t('reuse.hint')))
      }
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

  function buildReplySection(batches, items = [], options = {}) {
    const replies = mergeReplyBatches(batches)
    const byIndex = new Map()
    const byUuid = new Map()
    for (const item of Array.isArray(items) ? items : []) {
      if (typeof item?.uuid === 'string' && item.uuid !== '') byUuid.set(item.uuid, item)
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
    const headAction = typeof options.onReuseAll === 'function'
      ? reuseButton(t('sent.reuse'), options.onReuseAll, t('reuse.hint'))
      : undefined
    const head = buildSectionHead(t('replies.title', { n: replies.length }), parts.join(' · '), headAction)
    card.style.display = 'flex'
    card.style.flexDirection = 'column'
    card.style.rowGap = '8px'
    card.appendChild(head)

    const body = document.createElement('div')
    body.className = 'sa-replies-body'
    body.style.paddingTop = '0px'
    // 卡片之间也用同一档 8px，标题到首卡、卡到卡完全一致。
    body.style.rowGap = '8px'
    for (const reply of replies) {
      // uuid 是唯一依据；老答复没有 uuid 时才退回按序号配对。
      const item =
        typeof reply.uuid === 'string' && reply.uuid !== ''
          ? byUuid.get(reply.uuid)
          : byIndex.get(reply.index)
      // 跨会话答复时本地没有原条目，就显示服务端随答复带回的引文与批注内容。
      const displayItem =
        item ??
        (typeof reply.quote === 'string' || typeof reply.note === 'string'
          ? { quote: reply.quote, note: reply.note }
          : undefined)
      const [labelKey, tone] = VERDICT_LABELS[reply.verdict] ?? ['verdict.fallback', 'accepted']
      const group = document.createElement('div')
      group.className = `sa-reply-item sa-tone-${tone}`
      group.setAttribute('data-sa-batch-at', String(Number.isFinite(reply.at) ? reply.at : 0))
      group.setAttribute('data-sa-reply-index', String(reply.index))
      if (typeof reply.uuid === 'string' && reply.uuid !== '') group.setAttribute('data-sa-reply-uuid', reply.uuid)

      const cardHead = document.createElement('div')
      cardHead.className = 'sa-reply-head'
      const index = document.createElement('span')
      index.className = 'sa-reply-index'
      index.textContent = t('reply.index', { n: reply.index })
      const verdict = document.createElement('span')
      verdict.className = `sa-a-verdict sa-reply-${tone}`
      verdict.textContent = t(labelKey)
      cardHead.append(index, verdict)
      const replayItem = displayItem ?? { quote: reply.quote, note: reply.note }
      if (typeof options.onReplayItem === 'function') {
        cardHead.appendChild(reuseButton(t('replies.replay'), () => options.onReplayItem(replayItem), t('reuse.hint')))
      }
      group.appendChild(cardHead)

      const content = document.createElement('div')
      content.className = 'sa-reply-body'

      if (displayItem !== undefined) {
        const q = document.createElement('div')
        q.className = 'sa-q'
        const quoteText = typeof displayItem.quote === 'string' ? displayItem.quote.trim() : ''
        if (quoteText !== '') {
          const qLabel = document.createElement('div')
          qLabel.className = 'sa-q-label'
          qLabel.textContent = t('label.quote')
          const qHead = document.createElement('div')
          qHead.className = 'sa-q-head'
          qHead.appendChild(qLabel)
          // 跳转按钮放在「引用原文」标题行末尾、作为普通子元素；引文块自己的点击仍只管展开。
          if (typeof options.onJumpQuote === 'function') {
            qHead.appendChild(jumpButton(displayItem, options.onJumpQuote))
          }
          q.appendChild(qHead)
          const quote = document.createElement('div')
          quote.className = 'sa-q-quote'
          if (isAdopt(displayItem.note)) quote.dataset.adopt = '1'
          quote.setAttribute('data-sa-field', 'quote')
          quote.textContent = quoteText
          quote.title = t('expand')
          // 超过三行时折叠；点一下展开，再点收回。
          quote.addEventListener('click', () => {
            quote.classList.toggle('sa-q-open')
          })
          q.appendChild(quote)
        }
        if (typeof displayItem.note === 'string' && displayItem.note.trim() !== '') {
          const noteLabel = document.createElement('div')
          noteLabel.className = 'sa-q-label'
          noteLabel.textContent = t('label.note')
          q.appendChild(noteLabel)
          const note = document.createElement('div')
          note.className = 'sa-q-note'
          note.setAttribute('data-sa-field', 'note')
          paintNote(note, displayItem.note, noteView(displayItem.note))
          q.appendChild(note)
        }
        // 原批注带的附图属于「批注」内容，跟在批注正文后面、同一层级里。
        const replyThumbs = Array.isArray(displayItem.thumbs) ? displayItem.thumbs : []
        if (replyThumbs.length > 0) {
          const gallery = document.createElement('div')
          gallery.className = 'sa-sent-thumbs'
          for (const thumb of replyThumbs) {
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
          if (gallery.childNodes.length > 0) q.appendChild(gallery)
        }
        content.appendChild(q)
      }

      const a = document.createElement('div')
      a.className = 'sa-a'
      const aHead = document.createElement('div')
      aHead.className = 'sa-a-head'
      const aLabel = document.createElement('span')
      aLabel.className = 'sa-a-label'
      aLabel.textContent = displayItem !== undefined ? t('label.answer') : t('reply.fallbackLabel', { n: reply.index })
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
        const body = document.createElement('div')
        body.className = 'sa-a-next-text'
        if (markdown !== undefined && typeof markdown.mount === 'function') {
          markdown.mount(body, reply.next)
        } else {
          body.textContent = reply.next
        }
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
