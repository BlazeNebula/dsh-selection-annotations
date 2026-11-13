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
  moveAnnotation,
  openEditPopover,
  removeAnnotation,
  sourceSummary,
  openImageViewer,
  imageSettingsRow,
  instructionSettingsRow,
  fallbackSettingsRow,
  isAdopt = () => false,
}) {
  function render(panelEl) {
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
      meta.appendChild(button('sa-foot-action', t('panel.clear'), () => clearAnnotations()))
    }
    panelHead.appendChild(meta)
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
        a.appendChild(noteEl)
        row.appendChild(a)
      }
      if (Array.isArray(item.images) && item.images.length > 0) {
        const gallery = el('div', 'sa-item-images')
        for (const image of item.images) {
          if (typeof image?.url !== 'string' || image.url === '') continue
          const thumb = document.createElement('img')
          thumb.className = 'sa-item-thumb'
          thumb.src = image.url
          thumb.alt = typeof image.name === 'string' ? image.name : t('image.alt')
          thumb.title = t('image.open')
          thumb.style.cursor = 'zoom-in'
          thumb.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()
            openImageViewer(image.url, image.name)
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
    panelEl.appendChild(panelFoot)
  }

  return { render }
}
