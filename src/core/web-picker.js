/**
 * 网页元素拾取：把一小段脚本注入内嵌浏览器页面，在元素上画无填充、无圆角的框，
 * 框内右上角给一组与划线工具条同形的按钮（批注采纳 / 批注反馈 / 复制）。
 *
 * 不接管页面点击：框是 pointer-events: none，按钮背景透明，不遮页面内容；
 * 只有按钮本身可点。结果放在页面的 window.__saPicked 上，宿主轮询取回。
 */

const PICK_SCRIPT = String.raw`(function () {
  if (window.__saPicker) return 'already'
  var state = { el: null }
  var host = document.createElement('div')
  host.setAttribute('data-sa-web-picker', '')
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;contains:layout style;'
  var box = document.createElement('div')
  box.style.cssText = 'position:fixed;border:2px solid rgba(36,123,191,.95);border-radius:0;background:transparent;display:none;pointer-events:none;box-sizing:border-box;'
  var actions = document.createElement('div')
  actions.style.cssText = 'position:fixed;display:none;pointer-events:auto;z-index:2147483001;display:none;gap:2px;'
  var labels = [
    ['adopt', '批注采纳'],
    ['feedback', '批注反馈'],
    ['copy', '复制'],
  ]
  var buttons = labels.map(function (entry) {
    var button = document.createElement('button')
    button.type = 'button'
    button.textContent = entry[1]
    button.dataset.action = entry[0]
    button.style.cssText = 'pointer-events:auto;padding:3px 7px;border:0;border-radius:4px;background:rgba(20,20,24,.55);color:#fff;font:12px/1.4 system-ui,sans-serif;cursor:pointer;text-shadow:0 1px 2px rgba(0,0,0,.7);'
    button.addEventListener('pointerenter', function () { button.style.background = 'rgba(36,123,191,.75)' })
    button.addEventListener('pointerleave', function () { button.style.background = 'rgba(20,20,24,.55)' })
    button.addEventListener('click', function (event) { onClick(event, entry[0]) })
    actions.appendChild(button)
    return button
  })
  host.appendChild(box)
  host.appendChild(actions)
  document.documentElement.appendChild(host)

  function selectorOf(el) {
    if (!el || el.nodeType !== 1) return ''
    if (el.id) return '#' + CSS.escape(el.id)
    for (var attr of ['data-testid', 'data-test', 'name', 'aria-label']) {
      var value = el.getAttribute(attr)
      if (value) return el.tagName.toLowerCase() + '[' + attr + '="' + value.replace(/"/g, '\\"') + '"]'
    }
    var parts = []
    var node = el
    while (node && node.nodeType === 1 && parts.length < 8) {
      var tag = node.tagName.toLowerCase()
      var index = 1
      var prev = node.previousElementSibling
      while (prev) { if (prev.tagName === node.tagName) index += 1; prev = prev.previousElementSibling }
      parts.unshift(tag + ':nth-of-type(' + index + ')')
      node = node.parentElement
      if (node === document.body || node === document.documentElement) break
    }
    return parts.join(' > ')
  }

  function labelOf(el) {
    var text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)
    return el.tagName.toLowerCase() + (text ? ' · ' + text : '')
  }

  function place(el) {
    if (!el || el.closest('[data-sa-web-picker]')) return
    var rect = el.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return
    state.el = el
    box.style.display = 'block'
    box.style.left = rect.left + 'px'
    box.style.top = rect.top + 'px'
    box.style.width = rect.width + 'px'
    box.style.height = rect.height + 'px'
    actions.style.display = 'flex'
    var width = actions.offsetWidth || 150
    actions.style.left = Math.max(4, Math.min(rect.right - width - 4, window.innerWidth - width - 4)) + 'px'
    actions.style.top = Math.max(4, rect.top + 4) + 'px'
  }

  function inActions(x, y) {
    var rect = actions.getBoundingClientRect()
    return x >= rect.left - 10 && x <= rect.right + 10 && y >= rect.top - 10 && y <= rect.bottom + 10
  }

  function onMove(event) {
    if (actions.style.display !== 'none' && inActions(event.clientX, event.clientY)) return
    var el = document.elementFromPoint(event.clientX, event.clientY)
    if (el && el.closest && el.closest('[data-sa-web-picker]')) return
    place(el)
  }

  function cleanup() {
    window.removeEventListener('mousemove', onMove, true)
    window.removeEventListener('keydown', onKey, true)
    host.remove()
    window.__saPicker = null
  }

  function onClick(event, action) {
    event.preventDefault()
    event.stopPropagation()
    var el = state.el
    if (!el) return
    window.__saPicked = {
      action: action,
      selector: selectorOf(el),
      label: labelOf(el),
      url: location.href,
      title: document.title,
      text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    }
    cleanup()
  }

  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); cleanup() }
  }

  window.addEventListener('mousemove', onMove, true)
  window.addEventListener('keydown', onKey, true)
  window.__saPicker = { stop: cleanup }
  return 'ok'
})()`

const POLL_MS = 400

export function createWebPicker({ onPick }) {
  let timer = 0

  function view() {
    return (
      document.querySelector('webview[data-sidebar-browser-frame="webview"]') ?? document.querySelector('webview')
    )
  }

  function stop() {
    if (timer !== 0) {
      window.clearInterval(timer)
      timer = 0
    }
  }

  function start() {
    if (timer !== 0) return
    timer = window.setInterval(() => {
      const webview = view()
      if (webview === null || typeof webview.executeJavaScript !== 'function') return
      let raw
      try {
        raw = webview.executeJavaScript('({ live: !!window.__saPicker, picked: window.__saPicked || null })')
      } catch {
        return
      }
      Promise.resolve(raw)
        .then((state) => {
          if (state === null || typeof state !== 'object') return
          if (state.picked !== null && typeof state.picked === 'object') {
            safeCall(() => webview.executeJavaScript('window.__saPicked = null'))
            onPick({
              action: typeof state.picked.action === 'string' ? state.picked.action : 'feedback',
              quote: typeof state.picked.label === 'string' ? state.picked.label : '',
              selector: typeof state.picked.selector === 'string' ? state.picked.selector : '',
              url: typeof state.picked.url === 'string' ? state.picked.url : '',
              text: typeof state.picked.text === 'string' ? state.picked.text : '',
            })
            safeCall(() => webview.executeJavaScript(PICK_SCRIPT))
            return
          }
          if (state.live !== true) safeCall(() => webview.executeJavaScript(PICK_SCRIPT))
        })
        .catch(() => {})
    }, POLL_MS)
  }

  function dispose() {
    const webview = view()
    if (webview !== null && typeof webview.executeJavaScript === 'function') {
      safeCall(() => webview.executeJavaScript('window.__saPicker && window.__saPicker.stop()'))
    }
    stop()
  }

  return { start, dispose, available: () => view() !== null }
}

function safeCall(fn) {
  try {
    return fn()
  } catch {
    return undefined
  }
}
