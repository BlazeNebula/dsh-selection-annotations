/**
 * 给 dsh-better-sidebar 的 HTML 预览补上批注拾取。
 *
 * 它的预览是一个带 sandbox 的 iframe，父页面读不到里面的 DOM；但它会把 HTML
 * 读成文本、用 URL.createObjectURL 生成 blob 再挂到 iframe 上。我们在同页劫持
 * 这一次调用，把拾取脚本追加进 HTML，等 iframe 挂上后再把地址换成注入过的 blob。
 * 只替换文件名带 editorHtml 的那类预览，mermaid、变更预览等其它 iframe 不动。
 *
 * 这是对它的私有实现做兼容：类名或生成方式变了会失效，届时按它的新实现调整。
 */

import { PICK_SCRIPT } from './web-picker.js'

const BRIDGE = String.raw`(function () {
  try {
    Object.defineProperty(window, '__saPicked', {
      configurable: true,
      get: function () { return null },
      set: function (value) {
        if (value && window.parent !== window) window.parent.postMessage({ __saPreviewPick: value }, '*')
      },
    })
  } catch (error) {}
  window.addEventListener('message', function (event) {
    var data = event.data
    if (!data || !Array.isArray(data.__saPreviewNotes)) return
    window.__saWebNotes = data.__saPreviewNotes
    try { window.__saWebRender && window.__saWebRender() } catch (error) {}
  })
})();`

const INJECTED_MARK = 'data-sa-preview-picker'

function injectIntoHtml(html) {
  if (typeof html !== 'string' || html.includes(INJECTED_MARK)) return undefined
  const script = `<script ${INJECTED_MARK}="1">${BRIDGE}\n${PICK_SCRIPT}</script>`
  // 追加到文档最末尾：页面里可能在脚本字符串或模板中出现 </body>，
  // 按第一个 </body> 插入会把脚本塞进字符串里，永远不执行。
  return `${html}${script}`
}

export function createPreviewBridge({ onPick, getNotes }) {
  let installed = false
  let swapTimer = 0
  let syncTimer = 0
  let observer = null
  const pending = new Map()
  const originalCreate = URL.createObjectURL.bind(URL)

  function swapPreviews() {
    for (const frame of document.querySelectorAll('iframe')) {
      const src = frame.getAttribute('src') ?? ''
      const next = pending.get(src)
      if (next === undefined) continue
      const className = typeof frame.className === 'string' ? frame.className : ''
      const host = frame.closest('[class*="editorHtml" i]') !== null
      if (!className.toLowerCase().includes('editorhtml') && !host) continue
      pending.delete(src)
      frame.setAttribute('src', next)
    }
  }

  function installCreateObjectUrl() {
    if (installed) return
    installed = true
    URL.createObjectURL = function patchedCreateObjectURL(blob) {
      const url = originalCreate(blob)
      try {
        const type = blob !== null && blob !== undefined && typeof blob.type === 'string' ? blob.type : ''
        if (type.startsWith('text/html') && typeof blob.text === 'function') {
          blob
            .text()
            .then((text) => {
              const injected = injectIntoHtml(text)
              if (injected === undefined) return
              const next = originalCreate(new Blob([injected], { type: 'text/html;charset=utf-8' }))
              pending.set(url, next)
              swapPreviews()
            })
            .catch(() => {})
        }
      } catch {}
      return url
    }
  }

  function onMessage(event) {
    const data = event.data
    if (data === null || typeof data !== 'object') return
    const picked = data.__saPreviewPick
    if (picked === null || picked === undefined) return
    let frame = null
    for (const candidate of document.querySelectorAll('iframe')) {
      if (candidate.contentWindow === event.source) {
        frame = candidate
        break
      }
    }
    if (frame === null) return
    const className = typeof frame.className === 'string' ? frame.className : ''
    const host = frame.closest('[class*="editorHtml" i]') !== null
    if (!className.toLowerCase().includes('editorhtml') && !host) return
    const base = frame.getBoundingClientRect()
    const inner = picked.rect ?? {}
    const rect = {
      left: Number(inner.left ?? 0),
      top: Number(inner.top ?? 0),
      width: Number(inner.width ?? 0),
      height: Number(inner.height ?? 0),
    }
    const anchor = {
      getBoundingClientRect: () => ({
        left: base.left + rect.left,
        top: base.top + rect.top,
        width: rect.width,
        height: rect.height,
        right: base.left + rect.left + rect.width,
        bottom: base.top + rect.top + rect.height,
      }),
    }
    try {
      onPick({
        action: picked.action,
        id: picked.id,
        quote: typeof picked.label === 'string' ? picked.label : '',
        selector: typeof picked.selector === 'string' ? picked.selector : '',
        text: typeof picked.text === 'string' ? picked.text : '',
        url: frame.title !== '' ? frame.title : (typeof picked.url === 'string' ? picked.url : ''),
        rect,
        anchor,
        fromPreview: true,
      })
    } catch {}
  }

  function syncNotes() {
    const notes = typeof getNotes === 'function' ? getNotes() : []
    for (const frame of document.querySelectorAll('iframe')) {
      const className = typeof frame.className === 'string' ? frame.className : ''
      const host = frame.closest('[class*="editorHtml" i]') !== null
      if (!className.toLowerCase().includes('editorhtml') && !host) continue
      const path = frame.title
      const list = notes
        .filter((note) => note.path === path)
        .map((note) => ({ id: note.id, selector: note.selector, adopt: note.adopt }))
      try {
        frame.contentWindow?.postMessage({ __saPreviewNotes: list }, '*')
      } catch {}
    }
  }

  function start() {
    installCreateObjectUrl()
    window.addEventListener('message', onMessage)
    observer = new MutationObserver(() => swapPreviews())
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'class'],
    })
    swapTimer = window.setInterval(swapPreviews, 500)
    syncTimer = window.setInterval(syncNotes, 800)
  }

  function dispose() {
    if (!installed) return
    window.removeEventListener('message', onMessage)
    if (observer !== null) observer.disconnect()
    observer = null
    if (swapTimer !== 0) window.clearInterval(swapTimer)
    if (syncTimer !== 0) window.clearInterval(syncTimer)
    swapTimer = 0
    syncTimer = 0
  }

  return { start, dispose }
}
