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
  removeAnnotation,
  sourceSummary,
  openImageViewer,
  imageSettingsRow,
  instructionSettingsRow,
  fallbackSettingsRow,
  closePanel = () => {},
  openSideTab = () => {},
  isAdopt = () => false,
  sentStats = () => null,
}) {
  /** 只在需要排查时展开的调试区，避免挤占底边栏。 */
  function debugSection() {
    const wrap = el('div', 'sa-settings')
    const head = button('sa-settings-head', '调试')
    head.setAttribute('aria-expanded', 'false')
    const body = el('div', 'sa-settings-body')
    const inner = el('div', 'sa-settings-inner')
    const stats = sentStats()
    const rows = stats !== null && typeof stats === 'object'
      ? [
          ['会话', stats.sessionId ?? '?'],
          ['已发送', String(stats.size ?? 0)],
          ['卡片', String(stats.cards ?? 0)],
          ['跳过', String(stats.skipped ?? 0)],
          ['轮次', stats.turnMin === null || stats.turnMin === undefined ? '无' : `第 ${stats.turnMin}–${stats.turnMax} 轮`],
          ['错误', String(stats.errors ?? 0)],
        ]
      : [['状态', '尚未渲染']]
    for (const [key, value] of rows) {
      const row = el('div', 'sa-debug-row')
      row.append(el('span', 'sa-debug-key', key), el('span', 'sa-debug-value', value))
      inner.appendChild(row)
    }
    body.appendChild(inner)
    body.style.display = 'none'
    head.addEventListener('click', (event) => {
      event.preventDefault()
      const open = body.style.display === 'none'
      body.style.display = open ? '' : 'none'
      head.setAttribute('aria-expanded', open ? 'true' : 'false')
    })
    wrap.append(head, body)
    return wrap
  }

  function render(panelEl) {
    paint(panelEl, { surface: 'panel' })
  }

  /**
   * 右侧标签页的渲染：与总览面板共用同一套 DOM 与事件，只去掉浮层的关闭按钮与
   * 「在侧栏打开」按钮（它自己就在侧栏里），宽度与高度交给侧栏容器。
   * host 是 React 渲染的容器，不能再被 paint 覆盖 className，所以面板另建一层。
   */
  function renderSide(host) {
    host.textContent = ''
    const panel = document.createElement('div')
    host.appendChild(panel)
    paint(panel, { surface: 'side' })
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
    const hint = el('span', 'sa-panel-hint', t('panel.foot'))
    hint.title = t('panel.foot')
    meta.appendChild(hint)
    meta.appendChild(el('span', 'sa-panel-count', t('panel.count', { n: annotations.length })))
    if (annotations.length > 0) {
      meta.appendChild(button('sa-foot-action', t('panel.copyAll'), () => copyAll()))
    }
    meta.appendChild(button('sa-foot-action', t('panel.paste'), () => pasteAnnotations()))
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

    for (const item of annotations) {
      const row = el('div', 'sa-item')
      row.draggable = true
      row.dataset.id = item.id
      row.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', item.id)
        event.dataTransfer.effectAllowed = 'move'
        row.className = 'sa-item sa-dragging'
      })
      row.addEventListener('dragend', () => {
        for (const node of panelEl.querySelectorAll('.sa-item')) {
          node.className = node.className.replace(' sa-drop-before', '').replace(' sa-dragging', '')
        }
      })
      row.addEventListener('dragover', (event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        row.className = 'sa-item sa-drop-before'
      })
      row.addEventListener('dragleave', () => {
        row.className = 'sa-item'
      })
      row.addEventListener('drop', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const draggedId = event.dataTransfer.getData('text/plain')
        if (draggedId !== '') moveAnnotation(draggedId, item.id)
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
      actions.appendChild(button('sa-item-action', t('panel.copy'), () => copyItem(item)))
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
    panelBody.appendChild(debugSection())
    panelEl.appendChild(panelBody)

    const panelFoot = el('div', 'sa-panel-foot')
    const build = el('span', 'sa-build', `@u2a5f/dsh-selection-annotations build.${PLUGIN_BUILD}`)
    build.title = `@u2a5f/dsh-selection-annotations build.${PLUGIN_BUILD}`
    panelFoot.appendChild(build)
    if (!side) {
      const sideTab = button('sa-panel-side', '', openSideTab)
      sideTab.title = t('panel.sideTab')
      sideTab.setAttribute('aria-label', t('panel.sideTab'))
      const sideIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      sideIcon.setAttribute('viewBox', '0 0 16 16')
      sideIcon.setAttribute('width', '14')
      sideIcon.setAttribute('height', '14')
      sideIcon.setAttribute('fill', 'none')
      sideIcon.setAttribute('stroke', 'currentColor')
      sideIcon.setAttribute('stroke-width', '1.2')
      for (const d of ['M2.2 3.2h11.6v9.6H2.2z', 'M10.2 3.2v9.6']) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', d)
        sideIcon.appendChild(path)
      }
      sideTab.appendChild(sideIcon)
      panelFoot.appendChild(sideTab)
    }
    panelEl.appendChild(panelFoot)
  }

  return { render, renderSide }
}
