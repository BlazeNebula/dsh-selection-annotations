/**
 * 网页元素拾取与常驻标记。
 *
 * 常驻部分：宿主把「网页来源的批注」同步进页面，脚本按选择器解析出元素，
 * 已批注的元素保留矩形框（边框更粗、与划线同色系，80% 不透明），左上角给白色控制柄，
 * 点控制柄交回 action=open 与批注 id，由宿主打开修改面板。
 *
 * 拾取部分：鼠标经过元素时画无填充、无圆角的框，并给一组按钮：
 * 没有批注的元素给「批注采纳 / 批注反馈」，已有批注的元素给「修改批注 / 删除批注」。
 * 按钮静止时底色 25%、文字隐藏；指针进入按钮组才变成底色 50%、文字 80%。
 * 框太小放不下按钮组时，按钮组贴到框外侧上方或下方，中间不留空隙。
 */

const PICK_SCRIPT = String.raw`(function () {
  if (window.__saPicker) { try { window.__saWebRender && window.__saWebRender() } catch (e) {} return 'already' }
  var state = { el: null, note: null }
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

  var ICONS = {
    adopt: 'M2.5 6.2 5 8.7 9.5 3.6',
    feedback: 'M2.2 9.8 1.6 11.4l1.7-.5 4.5-4.5-1.1-1.1zM7.6 4.4l1.1 1.1',
    modify: 'M2.2 9.8 1.6 11.4l1.7-.5 4.5-4.5-1.1-1.1zM7.6 4.4l1.1 1.1',
    delete: 'M2.5 3.5h7M4.5 3.5V2.2h3v1.3M3.4 3.5l.4 7h4.4l.4-7',
  }

  function setGroupTone(inside) {
    var buttons = actions.querySelectorAll('button')
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].style.background = inside ? 'rgba(0,0,0,.5)' : 'rgba(0,0,0,.25)'
      buttons[i].style.color = inside ? 'rgba(255,255,255,.8)' : 'transparent'
    }
  }
  actions.addEventListener('pointerenter', function () { setGroupTone(true) })
  actions.addEventListener('pointerleave', function () { setGroupTone(false) })

  function makeButton(action, label, id) {
    var button = document.createElement('button')
    button.type = 'button'
    button.dataset.action = action
    button.style.cssText = 'pointer-events:auto;display:inline-flex;align-items:center;gap:4px;padding:3px 7px;border:0;border-radius:4px;background:rgba(0,0,0,.25);color:transparent;font:12px/1.4 system-ui,sans-serif;cursor:pointer;text-shadow:0 1px 3px rgba(0,0,0,.85);'
    var svgNS = 'http://www.w3.org/2000/svg'
    var svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('viewBox', '0 0 14 14')
    svg.setAttribute('width', '12')
    svg.setAttribute('height', '12')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '1.4')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    var path = document.createElementNS(svgNS, 'path')
    path.setAttribute('d', ICONS[action] || ICONS.feedback)
    svg.appendChild(path)
    button.appendChild(svg)
    button.appendChild(document.createTextNode(label))
    button.addEventListener('click', function (event) { onClick(event, action, id) })
    return button
  }

  function setActionsFor(el) {
    var note = findNote(el)
    state.note = note
    var signature = note ? 'note:' + note.id : 'empty'
    if (actions.dataset.signature === signature) return note
    actions.dataset.signature = signature
    actions.textContent = ''
    if (note) {
      actions.appendChild(makeButton('modify', '修改批注', note.id))
      actions.appendChild(makeButton('delete', '删除批注', note.id))
    } else {
      actions.appendChild(makeButton('adopt', '批注采纳', ''))
      actions.appendChild(makeButton('feedback', '批注反馈', ''))
    }
    setGroupTone(false)
    return note
  }

  function findNote(el) {
    var notes = Array.isArray(window.__saWebNotes) ? window.__saWebNotes : []
    for (var i = 0; i < notes.length; i += 1) {
      if (!notes[i] || !notes[i].selector) continue
      var target = null
      try { target = document.querySelector(notes[i].selector) } catch (e) { target = null }
      if (target && target === el) return notes[i]
    }
    return null
  }

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
    setActionsFor(el)
    box.style.display = 'block'
    box.style.left = rect.left + 'px'
    box.style.top = rect.top + 'px'
    box.style.width = rect.width + 'px'
    box.style.height = rect.height + 'px'
    actions.style.display = 'flex'
    var width = actions.offsetWidth || 180
    var height = actions.offsetHeight || 24
    var fitsInside = rect.width >= width + 16 && rect.height >= height + 12
    var top
    var left
    if (fitsInside) {
      top = rect.top + 4
      left = rect.right - width - 4
    } else {
      // 框太小：贴到框外侧，上方优先，其次下方，中间不留空隙。
      top = rect.top - height
      if (top < 4) top = rect.bottom
      left = rect.left
    }
    left = Math.max(4, Math.min(left, window.innerWidth - width - 4))
    actions.style.left = left + 'px'
    actions.style.top = Math.max(4, top) + 'px'
  }

  function inActions(x, y) {
    var rect = actions.getBoundingClientRect()
    return x >= rect.left - 6 && x <= rect.right + 6 && y >= rect.top - 6 && y <= rect.bottom + 6
  }

  function onMove(event) {
    if (actions.style.display !== 'none' && inActions(event.clientX, event.clientY)) return
    var el = document.elementFromPoint(event.clientX, event.clientY)
    if (el && el.closest && el.closest('[data-sa-web-picker]')) return
    place(el)
  }

  function onClick(event, action, id) {
    event.preventDefault()
    event.stopPropagation()
    var el = state.el
    if (!el) return
    window.__saPicked = {
      action: action,
      id: id || '',
      selector: selectorOf(el),
      label: labelOf(el),
      url: location.href,
      title: document.title,
      text: el.innerText || el.textContent || '',
      rect: rectOf(el),
    }
  }

  function onKey(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      actions.style.display = 'none'
      box.style.display = 'none'
      state.el = null
      state.note = null
    }
  }

  function renderNotes() {
    var notes = Array.isArray(window.__saWebNotes) ? window.__saWebNotes : []
    layers.textContent = ''
    notes.forEach(function (note) {
      if (!note || !note.selector) return
      if (note.url && note.url !== location.href) return
      var el = null
      try { el = document.querySelector(note.selector) } catch (e) { el = null }
      if (!el) return
      var rect = el.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return
      var color = note.adopt ? 'rgba(52,199,89,.8)' : 'rgba(245,158,11,.8)'
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
  let lastNotes = []

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

  /** 把网页来源的批注同步给页面：{id, selector, url, adopt}。 */
  function sync(notes) {
    lastNotes = Array.isArray(notes) ? notes : []
    const webview = view()
    if (webview === null || typeof webview.executeJavaScript !== 'function') return
    const json = JSON.stringify(lastNotes)
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
          if (state.live !== true) {
            safeCall(() => webview.executeJavaScript(PICK_SCRIPT))
            // 页面重新注入时把已有的批注一并推回去，换页或首次打开浏览器都能立刻恢复常驻框。
            if (lastNotes.length > 0) sync(lastNotes)
          }
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
