/**
 * 网页元素拾取：把一小段脚本注入内嵌浏览器页面，在元素上画无填充、无圆角的框，
 * 点旁边的「批注」按钮后把选择器与可见文字交回宿主。
 *
 * 不接管页面点击：框与提示层都是 pointer-events: none，只有按钮本身可点；
 * 页面原本的交互不受影响。结果放在页面的 window.__saPicked 上，宿主轮询取回，
 * 不依赖 preload 或额外通信通道。
 */

const PICK_SCRIPT = String.raw`(function () {
  if (window.__saPicker) return 'already'
  var state = { el: null, box: null, action: null }
  var host = document.createElement('div')
  host.setAttribute('data-sa-web-picker', '')
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;contains:layout style;'
  var box = document.createElement('div')
  box.style.cssText = 'position:fixed;border:2px solid rgba(36,123,191,.95);border-radius:0;background:transparent;display:none;pointer-events:none;box-sizing:border-box;'
  var action = document.createElement('button')
  action.type = 'button'
  action.textContent = '批注'
  action.style.cssText = 'position:fixed;display:none;pointer-events:auto;z-index:2147483001;padding:4px 10px;border-radius:6px;border:1px solid rgba(36,123,191,.7);background:#1b1b1f;color:#e8e8ea;font:12px/1.4 system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);'
  host.appendChild(box)
  host.appendChild(action)
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
    if (!el || el === host || el === box || el === action) return
    var rect = el.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return
    state.el = el
    box.style.display = 'block'
    box.style.left = rect.left + 'px'
    box.style.top = rect.top + 'px'
    box.style.width = rect.width + 'px'
    box.style.height = rect.height + 'px'
    var top = rect.top - 32
    if (top < 4) top = Math.min(rect.bottom + 6, window.innerHeight - 30)
    action.style.display = 'block'
    action.style.left = Math.max(4, Math.min(rect.left, window.innerWidth - 72)) + 'px'
    action.style.top = top + 'px'
  }

  function onMove(event) {
    var el = document.elementFromPoint(event.clientX, event.clientY)
    if (el && el.closest && el.closest('[data-sa-web-picker]')) return
    place(el)
  }

  function cleanup() {
    window.removeEventListener('mousemove', onMove, true)
    window.removeEventListener('keydown', onKey, true)
    action.removeEventListener('click', onClick)
    host.remove()
    window.__saPicker = null
  }

  function onClick(event) {
    event.preventDefault()
    event.stopPropagation()
    var el = state.el
    if (!el) return
    window.__saPicked = {
      selector: selectorOf(el),
      label: labelOf(el),
      url: location.href,
      title: document.title,
      text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      frame: window === window.top ? '' : location.href,
    }
    cleanup()
  }

  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); cleanup() }
  }

  action.addEventListener('click', onClick)
  window.addEventListener('mousemove', onMove, true)
  window.addEventListener('keydown', onKey, true)
  window.__saPicker = { stop: cleanup }
  return 'ok'
})()`

const POLL_MS = 400

export function createWebPicker({ t, onPick }) {
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

  function pick() {
    const webview = view()
    if (webview === null || typeof webview.executeJavaScript !== 'function') {
      return false
    }
    safeCall(() => webview.executeJavaScript('window.__saPicked = null'))
    safeCall(() => webview.executeJavaScript(PICK_SCRIPT))
    stop()
    timer = window.setInterval(() => {
      let raw
      try {
        raw = webview.executeJavaScript('window.__saPicked || null')
      } catch {
        stop()
        return
      }
      Promise.resolve(raw)
        .then((picked) => {
          if (picked === null || typeof picked !== 'object') return
          stop()
          safeCall(() => webview.executeJavaScript('window.__saPicked = null'))
          onPick({
            quote: typeof picked.label === 'string' ? picked.label : '',
            selector: typeof picked.selector === 'string' ? picked.selector : '',
            url: typeof picked.url === 'string' ? picked.url : '',
          })
        })
        .catch(() => stop())
    }, POLL_MS)
    return true
  }

  function dispose() {
    stop()
  }

  return { pick, dispose, available: () => view() !== null }
}

function safeCall(fn) {
  try {
    return fn()
  } catch {
    return undefined
  }
}
