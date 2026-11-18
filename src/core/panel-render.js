import { el, button } from './util.js'
import { PLUGIN_BUILD } from './config.js'

/**
 * 批注总览面板：固定头（标题、说明、条数、清空）、可在其中拖拽排序的列表、
 * 图片与指令设置区、末尾一行的构建号。所有批注数据通过 getAnnotations() 读取，不持有引用。
 */
export function createPanelRenderer({
  t,
  getAnnotations,
  clearAnnotations,
  copyAll = () => {},
  pasteAnnotations = () => {},
  copyItem = () => {},
  moveAnnotation,
  openEditPopover,
  jumpToQuote = () => {},
  jumpButton = null,
  removeAnnotation,
  sourceSummary,
  openImageViewer,
  imageSettingsRow,
  instructionSettingsRow,
  fallbackSettingsRow,
  closePanel = () => {},
  openSideTab = () => {},
  isSideTabOpen = () => false, // true 时按钮变成「关闭」，图标与提示同步切换
  isAdopt = () => false,
  getHintText = () => '',
}) {
  function render(panelEl) {
    // 重绘会重建列表；保留滚动位置，拖拽补间时才不会因为整列表回顶而错位。
    const body = panelEl.querySelector('.sa-panel-body')
    const scrollTop = body === null ? 0 : body.scrollTop
    paint(panelEl, { surface: 'panel' })
    const nextBody = panelEl.querySelector('.sa-panel-body')
    if (nextBody !== null) nextBody.scrollTop = scrollTop
  }

  /**
   * 右侧标签页的渲染：与总览面板共用同一套 DOM 与事件，只去掉浮层的关闭按钮与
   * 「在侧栏打开」按钮（它自己就在侧栏里），宽度与高度交给侧栏容器。
   * host 是 React 渲染的容器，不能再被 paint 覆盖 className，所以面板另建一层。
   */
  function renderSide(host) {
    // 侧栏靠定时轮询重绘，复用同一块面板节点：拖动结束后的重绘不会换掉闭包里的 panelEl。
    let panel = host.firstElementChild
    if (!(panel instanceof HTMLElement) || !panel.classList.contains('sa-panel')) {
      host.textContent = ''
      panel = document.createElement('div')
      host.appendChild(panel)
    }
    const body = panel.querySelector('.sa-panel-body')
    const scrollTop = body === null ? 0 : body.scrollTop
    paint(panel, { surface: 'side' })
    const nextBody = panel.querySelector('.sa-panel-body')
    if (nextBody !== null) nextBody.scrollTop = scrollTop
  }

  /**
   * 拖拽重排后的位移动画（FLIP）：先按旧的屏幕位置把条目反向平移，再放开过渡让它回到新位置，
   * 其余条目因此是滑过去而不是瞬间跳过去。动画结束后清掉内联样式，不留下过渡态。
   */
  function flipRows(panelEl, before) {
    for (const row of panelEl.querySelectorAll('.sa-item')) {
      const prev = before.get(row.dataset.id)
      if (prev === undefined) continue
      const next = row.getBoundingClientRect()
      const dx = prev.left - next.left
      const dy = prev.top - next.top
      if (dx === 0 && dy === 0) continue
      row.style.transition = 'none'
      row.style.transform = `translate(${dx}px, ${dy}px)`
      // 读一次布局，让反向平移先落地，再开始过渡。
      void row.offsetWidth
      const token = (row.__saFlipToken || 0) + 1
      row.__saFlipToken = token
      row.style.transition = 'transform 180ms cubic-bezier(.22,.61,.36,1)'
      row.style.transform = ''
      const finish = () => {
        // 同一行再次参与拖动时 token 会变，旧动画的收尾不能清掉新动画。
        if (row.__saFlipToken !== token) return
        row.style.transition = ''
        row.style.transform = ''
      }
      row.addEventListener('transitionend', finish, { once: true })
      // 行被隐藏等情况下 transitionend 不触发，兜底清一次。
      setTimeout(finish, 260)
    }
  }

  function paint(panelEl, options) {
    const side = options !== undefined && options.surface === 'side'
    if (!side) panelEl.className = 'sa-panel'
    else panelEl.className = 'sa-panel sa-panel-in-side'
    const annotations = getAnnotations()
    panelEl.textContent = ''

    const panelHead = el('div', 'sa-panel-head')
    panelHead.appendChild(el('span', 'sa-panel-title', t('panel.title')))
    const meta = el('div', 'sa-panel-meta')
    // 提示位始终带一个文本层：首次反馈也能播放淡入动画，重绘后当前反馈由状态回填。
    const hintText = getHintText(side ? 'side' : 'panel') || t('panel.foot')
    const hint = el('span', 'sa-panel-hint')
    hint.appendChild(el('span', 'sa-hint-layer', hintText))
    hint.title = hintText
    meta.appendChild(hint)
    meta.appendChild(el('span', 'sa-panel-count', t('panel.count', { n: annotations.length })))
    if (annotations.length > 0) {
      meta.appendChild(button('sa-foot-action', t('panel.copyAll'), () => copyAll(panelEl)))
    }
    meta.appendChild(button('sa-foot-action', t('panel.paste'), () => pasteAnnotations(panelEl)))
    if (annotations.length > 0) {
      meta.appendChild(button('sa-foot-action', t('panel.clear'), () => clearAnnotations()))
    }
    panelHead.appendChild(meta)
    if (!side) {
      const close = button('sa-panel-close', '×', () => closePanel())
      close.setAttribute('aria-label', t('panel.close'))
      close.title = t('panel.close')
      panelHead.appendChild(close)
    }
    panelEl.appendChild(panelHead)
    const panelBody = el('div', 'sa-panel-body')

    if (annotations.length === 0) {
      panelBody.appendChild(el('div', 'sa-panel-empty', t('panel.empty')))
    }

    let draggingId = null
    for (const item of annotations) {
      const row = el('div', 'sa-item')
      row.draggable = true
      row.dataset.id = item.id
      row.addEventListener('dragstart', (event) => {
        draggingId = item.id
        event.dataTransfer.setData('text/plain', item.id)
        event.dataTransfer.effectAllowed = 'move'
        row.classList.add('sa-dragging')
      })
      row.addEventListener('dragend', () => {
        draggingId = null
        // 只摘掉拖拽态，别的 class 一律保留，避免重绘或动画期间把行样式整个覆盖掉。
        for (const node of panelEl.querySelectorAll('.sa-item')) {
          node.classList.remove('sa-dragging', 'sa-drop-before')
        }
      })
      row.addEventListener('dragover', (event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        // 拖动源自己身上不画插入线。
        if (item.id === draggingId) return
        // 快速划过时上一行可能来不及收到 dragleave，这里统一只保留当前插入线。
        for (const node of panelEl.querySelectorAll('.sa-item')) {
          if (node !== row) node.classList.remove('sa-drop-before')
        }
        row.classList.add('sa-drop-before')
      })
      row.addEventListener('dragleave', (event) => {
        // 指针在行内子元素之间移动也会触发 dragleave，此时插入线应当保留。
        if (event.relatedTarget instanceof Node && row.contains(event.relatedTarget)) return
        row.classList.remove('sa-drop-before')
      })
      row.addEventListener('drop', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const draggedId = event.dataTransfer.getData('text/plain')
        if (draggedId === '' || draggedId === item.id) return
        // 先记下每行此刻的屏幕位置，重排后再按新位置做 FLIP 补间。
        const before = new Map()
        for (const node of panelEl.querySelectorAll('.sa-item')) {
          before.set(node.dataset.id, node.getBoundingClientRect())
        }
        moveAnnotation(draggedId, item.id)
        flipRows(panelEl, before)
      })
      const head = el('div', 'sa-item-head')
      const grip = el('span', 'sa-drag-handle', '⠿')
      grip.title = t('panel.drag')
      grip.setAttribute('aria-label', t('panel.drag'))
      head.appendChild(grip)
      head.appendChild(el('span', 'sa-item-num', String(item.number)))
      const summary = el('span', 'sa-item-src', sourceSummary(item))
      summary.title = summary.textContent
      head.appendChild(summary)
      const actions = el('div', 'sa-item-actions')
      // 「查看出处」并入右上角这一排：同样只在悬停条目时随整排出现。
      if (typeof jumpButton === 'function') {
        actions.appendChild(jumpButton(item, (it, root) => jumpToQuote(it, root)))
      }
      actions.appendChild(button('sa-item-action', t('panel.copy'), () => copyItem(item, panelEl)))
      actions.appendChild(button('sa-item-action', t('panel.edit'), () => openEditPopover(item.id, head)))
      actions.appendChild(button('sa-item-action sa-danger', t('panel.delete'), () => removeAnnotation(item.id)))
      head.appendChild(actions)
      row.appendChild(head)
      if (item.quote !== '') {
        const q = el('div', 'sa-item-q')
        q.appendChild(el('div', 'sa-item-label', t('panel.quote')))
        const quote = el('div', 'sa-item-quote', item.quote)
        quote.title = t('expand')
        quote.addEventListener('click', () => {
          quote.className = quote.className.includes('sa-q-open') ? 'sa-item-quote' : 'sa-item-quote sa-q-open'
        })
        q.appendChild(quote)
        row.appendChild(q)
      }
      if (item.note !== '') {
        const a = el('div', 'sa-item-a')
        a.appendChild(el('div', 'sa-item-label', t('panel.note')))
        const noteEl = el('div', 'sa-item-note', item.note)
        if (isAdopt(item.note)) noteEl.dataset.adopt = '1'
        // 单击批注正文等同「编辑」按钮：打开同一条批注的编辑弹层。
        noteEl.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          openEditPopover(item.id, head)
        })
        a.appendChild(noteEl)
        row.appendChild(a)
      }
      if (Array.isArray(item.images) && item.images.length > 0) {
        const gallery = el('div', 'sa-item-images')
        for (const image of item.images) {
          const src =
            typeof image?.url === 'string' && image.url !== ''
              ? image.url
              : typeof image?.preview === 'string' && image.preview !== ''
                ? image.preview
                : typeof image?.thumb === 'string' && image.thumb !== ''
                  ? image.thumb
                  : typeof image?.dataUrl === 'string' && image.dataUrl !== ''
                    ? image.dataUrl
                    : ''
          if (src === '') continue
          const thumb = document.createElement('img')
          thumb.className = 'sa-item-thumb'
          thumb.src = src
          thumb.alt = typeof image.name === 'string' ? image.name : t('image.alt')
          thumb.title = t('image.open')
          thumb.style.cursor = 'zoom-in'
          thumb.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()
            openImageViewer(src, image.name)
          })
          gallery.appendChild(thumb)
        }
        if (gallery.childNodes.length > 0) row.appendChild(gallery)
      }
      if (typeof item.refineReason === 'string' && item.refineReason !== '') {
        const why = el('div', 'sa-item-why', t('panel.refineFailed', { reason: item.refineReason }))
        why.style.fontSize = '11px'
        why.style.lineHeight = '1.5'
        why.style.opacity = '0.8'
        why.style.color = 'var(--dsw-alias-text-tertiary, GrayText)'
        why.style.marginTop = '2px'
        row.appendChild(why)
      }
      panelBody.appendChild(row)
    }

    panelBody.appendChild(imageSettingsRow())
    panelBody.appendChild(instructionSettingsRow())
    panelBody.appendChild(fallbackSettingsRow())
    panelEl.appendChild(panelBody)

    const panelFoot = el('div', 'sa-panel-foot')
    const build = el('span', 'sa-build', `@u2a5f/dsh-selection-annotations build.${PLUGIN_BUILD}`)
    build.title = `@u2a5f/dsh-selection-annotations build.${PLUGIN_BUILD}`
    panelFoot.appendChild(build)
    if (!side) {
      // 同一个按钮两种动作：侧栏里已经有批注页签时是「关闭」，否则是「打开」。
      const sideOpen = isSideTabOpen() === true
      const sideAction = t(sideOpen ? 'panel.sideTabClose' : 'panel.sideTab')
      const sideTab = button('sa-panel-side', '', openSideTab)
      sideTab.title = sideAction
      sideTab.setAttribute('aria-label', sideAction)
      sideTab.setAttribute('aria-pressed', sideOpen ? 'true' : 'false')
      const sideIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      sideIcon.setAttribute('viewBox', '0 0 16 16')
      sideIcon.setAttribute('width', '14')
      sideIcon.setAttribute('height', '14')
      sideIcon.setAttribute('fill', 'none')
      sideIcon.setAttribute('stroke', 'currentColor')
      sideIcon.setAttribute('stroke-width', '1.2')
      // 开合都用侧栏图标：右上角已有收起面板的叉号，这里再画叉号会重复；
      // 是否已打开由 title、aria-label 与 aria-pressed 表达。
      const sideIconPaths = ['M2.2 3.2h11.6v9.6H2.2z', 'M10.2 3.2v9.6']
      for (const d of sideIconPaths) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', d)
        sideIcon.appendChild(path)
      }
      sideTab.appendChild(sideIcon)
      panelFoot.appendChild(sideTab)
    }
    panelEl.appendChild(panelFoot)
  }

  /** 拖到列表空白处（移到末尾）也走同一套位移动画：重排前先记下每一行的屏幕位置。 */
  function snapshotRows(panelEl) {
    const rects = new Map()
    for (const row of panelEl.querySelectorAll('.sa-item')) rects.set(row.dataset.id, row.getBoundingClientRect())
    return rects
  }

  return { render, renderSide, snapshotRows, animateRows: flipRows }
}
