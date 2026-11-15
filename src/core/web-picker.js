/**
 * 网页元素拾取与常驻标记。
 *
 * 常驻部分：宿主把「网页来源的批注」同步进页面，脚本按选择器解析出元素，
 * 已批注的元素保留矩形框（边框更粗、与划线同色系），左上角给白色控制柄，
 * 点控制柄把 action=open 与批注 id 交回宿主，由宿主打开修改面板。
 *
 * 拾取部分：鼠标经过元素时画无填充、无圆角的框，框内右上角给按钮组
 * （批注采纳 / 批注反馈 / 复制）。按钮底色与文字都半透明，减少遮挡。
 */

const PICK_SCRIPT = String.raw`(function () {
  if (window.__saPicker) { try { window.__saWebRender && window.__saWebRender() } catch (e) {} return 'already' }
  var state = { el: null }
  var host = document.createElement('div')
  host.setAttribute('data-sa-web-picker', '')
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;contains:layout style;'
  var box = document.createElement('div')
  box.style.cssText = 'position:fixed;border:2px solid rgba(36,123,191,.95);border-radius:0;background:transparent;display:none;pointer-events:none;box-sizing:border-box;'
  var actions = document.createElement('div')
  actions.style.cssText = 'position:fixed;display:none;pointer-events:auto;z-index:2147483001;gap:2px;'
  var layers = document.createElement('div')
  layers.setAttribute('data-sa-web-notes', '')
  host.appendChild(layers)
  host.appendChild(box)
  host.appendChild(actions)
  document.documentElement.appendChild(host)

  var labels = [
    ['adopt', '批注采纳'],
    ['feedback', '批注反馈'],
    ['copy', '复制'],
  ]
  labels.forEach(function (entry) {
    var button = document.createElement('button')
    button.type = 'button'
    button.textContent = entry[1]
    button.dataset.action = entry[0]
    button.style.cssText = 'pointer-events:auto;padding:3px 7px;border:0;border-radius:4px;background:rgba(0,0,0,.3);color:rgba(255,255,255,.5);font:12px/1.4 system-ui,sans-serif;cursor:pointer;text-shadow:0 1px 3px rgba(0,0,0,.85);'
    button.addEventListener('pointerenter', function () {
      button.style.background = 'rgba(36,123,191,.5)'
      button.style.color = 'rgba(255,255,255,.9)'
    })
    button.addEventListener('pointerleave', function () {
      button.style.background = 'rgba(0,0,0,.3)'
      button.style.color = 'rgba(255,255,255,.5)'
    })
    button.addEventListener('click', function (event) { onClick(event, entry[0]) })
    actions.appendChild(button)
  })

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

  function rectOf(el) {
    var rect = el.getBoundingClientRect()
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
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
      rect: rectOf(el),
    }
  }

  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); actions.style.display = 'none'; box.style.display = 'none'; state.el = null }
  }

  function renderNotes() {
    var notes = Array.isArray(window.__saWebNotes) ? window.__saWebNotes : []
    layers.textContent = ''
    notes.forEach(function (note) {
      if (!note || !note.selector) return
      var el = null
      try { el = document.querySelector(note.selector) } catch (e) { el = null }
      if (!el) return
      var rect = el.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return
      var color = note.adopt ? 'rgba(52,199,89,.95)' : 'rgba(245,158,11,.95)'
      var frame = document.createElement('div')
      frame.style.cssText = 'position:fixed;border:3px solid ' + color + ';border-radius:0;background:transparent;pointer-events:none;box-sizing:border-box;'
      frame.style.left = rect.left + 'px'
      frame.style.top = rect.top + 'px'
      frame.style.width = rect.width + 'px'
      frame.style.height = rect.height + 'px'
      layers.appendChild(frame)
      var handle = document.createElement('button')
      handle.type = 'button'
      handle.setAttribute('aria-label', '修改这条网页批注')
      handle.style.cssText = 'position:fixed;width:14px;height:14px;padding:0;border-radius:50%;border:1px solid rgba(0,0,0,.35);background:#fff;pointer-events:auto;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.4);'
      handle.style.left = (rect.left - 5) + 'px'
      handle.style.top = (rect.top - 5) + 'px'
      handle.addEventListener('click', function (event) {
        event.preventDefault()
        event.stopPropagation()
        window.__saPicked = { action: 'open', id: note.id, selector: note.selector, rect: rectOf(el) }
      })
      layers.appendChild(handle)
    })
  }
  window.__saWebRender = renderNotes
  renderNotes()
  window.addEventListener('scroll', renderNotes, true)
  window.addEventListener('resize', renderNotes)

  window.addEventListener('mousemove', onMove, true)
  window.addEventListener('keydown', onKey, true)
  window.__saPicker = { stop: function () { window.removeEventListener('mousemove', onMove, true) } }
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

  /** 把网页来源的批注同步给页面：{id, selector, adopt}。 */
  function sync(notes) {
    const webview = view()
    if (webview === null || typeof webview.executeJavaScript !== 'function') return
    const json = JSON.stringify(Array.isArray(notes) ? notes : [])
    safeCall(() => webview.executeJavaScript(`window.__saWebNotes = ${json}; window.__saWebRender && window.__saWebRender()`))
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
              id: typeof state.picked.id === 'string' ? state.picked.id : '',
              quote: typeof state.picked.label === 'string' ? state.picked.label : '',
              selector: typeof state.picked.selector === 'string' ? state.picked.selector : '',
              url: typeof state.picked.url === 'string' ? state.picked.url : '',
              text: typeof state.picked.text === 'string' ? state.picked.text : '',
              rect: state.picked.rect ?? null,
            })
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

  return { start, sync, dispose, available: () => view() !== null }
}

function safeCall(fn) {
  try {
    return fn()
  } catch {
    return undefined
  }
}
