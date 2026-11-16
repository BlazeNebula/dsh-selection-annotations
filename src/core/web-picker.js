/**
 * 网页元素拾取与常驻标记。
 *
 * 常驻部分：宿主把「网页来源的批注」同步进页面，脚本按选择器解析出元素，
 * 已批注的元素保留矩形框（3px、采纳绿其余橙、80% 不透明），左上角白色控制柄点开修改。
 *
 * 拾取部分：鼠标经过元素时画无填充、无圆角的框，并给一组合并的按钮：
 * 没有批注给「批注反馈 / 批注采纳」，已有批注给「修改批注 / 删除批注」。
 * 按钮文字始终可见；指针进入具体按钮时该按钮底色加深到 80%。
 * 按钮组默认放在框外，按鼠标靠近的一侧放上方或下方；框外确实没空间才放进框内。
 */

export const PICK_SCRIPT = String.raw`(function () {
  if (window.__saPicker) { try { window.__saWebRender && window.__saWebRender() } catch (e) {} return 'already' }
  var state = { el: null, note: null }
  var host = document.createElement('div')
  host.setAttribute('data-sa-web-picker', '')
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;contain:layout style;'
  // 页面自己的 button/svg 样式会污染按钮组（圆角、隐藏图标、字号），整组放进
  // Shadow DOM 隔离；宿主要 pointer-events:none，内部按钮再单独打开命中。
  var root = typeof host.attachShadow === 'function' ? host.attachShadow({ mode: 'open' }) : host
  var box = document.createElement('div')
  box.style.cssText = 'position:fixed;border:2px solid rgba(36,123,191,.95);border-radius:0;background:transparent;display:none;pointer-events:none;box-sizing:border-box;'
  var actions = document.createElement('div')
  actions.style.cssText = 'position:fixed;display:none;pointer-events:auto;z-index:2147483001;align-items:center;gap:0;padding:0;border-radius:8px;overflow:hidden;background:rgba(0,0,0,.15);-webkit-mask-image:linear-gradient(to right,transparent,#000 6px,#000 calc(100% - 6px),transparent);mask-image:linear-gradient(to right,transparent,#000 6px,#000 calc(100% - 6px),transparent);transition:background .12s;'
  var layers = document.createElement('div')
  layers.setAttribute('data-sa-web-notes', '')
  root.appendChild(layers)
  root.appendChild(box)
  root.appendChild(actions)
  document.documentElement.appendChild(host)

  var ICONS = {
    adopt: ['M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4'],
    feedback: [
      'M8.85596 2.69971H4.19971C3.37141 2.69971 2.69992 3.37146 2.69971 4.19971V11.8003C2.69992 12.6285 3.37141 13.3003 4.19971 13.3003H11.8003C12.6283 13.2999 13.3001 12.6283 13.3003 11.8003V7.89893H14.3003V11.8003C14.3001 13.1806 13.1806 14.2999 11.8003 14.3003H4.19971C2.81913 14.3003 1.69992 13.1808 1.69971 11.8003V4.19971C1.69992 2.81918 2.81913 1.69971 4.19971 1.69971H8.85596V2.69971Z|fill',
      'M7.7849 8.23878L13.888 2.13574',
    ],
  }

  var FEATHER = 'linear-gradient(to right,transparent,#000 6px,#000 calc(100% - 6px),transparent)'

  function buttonsOf() {
    return actions.querySelectorAll('button')
  }

  /** 未进入按钮组：整组 15% 底、文字 50%，两侧羽化（羽化宽度为字号的一半）。 */
  function resetTone() {
    actions.style.background = 'rgba(0,0,0,.15)'
    actions.style.webkitMaskImage = FEATHER
    actions.style.maskImage = FEATHER
    var buttons = buttonsOf()
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].style.background = 'transparent'
      buttons[i].style.color = 'rgba(255,255,255,.5)'
    }
  }

  /** 已进入按钮组：取消羽化，未悬停的按钮背景 33%、文字 67%；指针下的按钮背景 67%、文字不透明。 */
  function toneOnEnter() {
    actions.style.background = 'transparent'
    actions.style.webkitMaskImage = 'none'
    actions.style.maskImage = 'none'
    var buttons = buttonsOf()
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].style.background = 'rgba(0,0,0,.33)'
      buttons[i].style.color = 'rgba(255,255,255,.67)'
    }
  }

  actions.addEventListener('pointerenter', toneOnEnter)
  actions.addEventListener('pointerleave', resetTone)

  function iconFor(action) {
    var svgNS = 'http://www.w3.org/2000/svg'
    var svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '14')
    svg.setAttribute('height', '14')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke-width', '1')
    svg.style.cssText = 'flex:0 0 auto;display:block;'
    var paths = action === 'delete'
      ? ['M3 4.2h10', 'M6 4.2V2.8h4v1.4', 'M4.4 4.2l.5 8h6.2l.5-8']
      : (ICONS[action] || ICONS.feedback)
    for (var i = 0; i < paths.length; i += 1) {
      var spec = paths[i]
      var fill = spec.indexOf('|fill') > -1
      var path = document.createElementNS(svgNS, 'path')
      path.setAttribute('d', fill ? spec.slice(0, -5) : spec)
      if (fill) {
        path.setAttribute('fill', 'currentColor')
        path.setAttribute('stroke', 'none')
      } else {
        path.setAttribute('stroke', 'currentColor')
      }
      svg.appendChild(path)
    }
    return svg
  }

  function makeButton(action, label, id, last) {
    var button = document.createElement('button')
    button.type = 'button'
    button.dataset.action = action
    button.style.cssText = 'pointer-events:auto;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:24px;padding:0 9px;border:0;border-radius:0;border-right:' + (last ? '0' : '1px solid rgba(255,255,255,.16)') + ';background:transparent;color:rgba(255,255,255,.8);font:12px/1 system-ui,sans-serif;cursor:pointer;text-shadow:0 1px 3px rgba(0,0,0,.85);transition:background .12s;'
    button.appendChild(iconFor(action))
    button.appendChild(document.createTextNode(label))
    button.addEventListener('pointerenter', function () {
      button.style.background = 'rgba(0,0,0,.67)'
      button.style.color = '#fff'
    })
    button.addEventListener('pointerleave', function () {
      button.style.background = 'rgba(0,0,0,.33)'
      button.style.color = 'rgba(255,255,255,.67)'
    })
    button.addEventListener('click', function (event) { onClick(event, action, id) })
    return button
  }

  function setActionsFor(el) {
    var note = findNote(el)
    state.note = note
    var signature = note ? 'note:' + note.id : 'empty'
    if (actions.dataset.signature !== signature) {
      actions.dataset.signature = signature
      actions.textContent = ''
      if (note) {
        actions.appendChild(makeButton('modify', '修改批注', note.id, false))
        actions.appendChild(makeButton('delete', '删除批注', note.id, true))
      } else {
        actions.appendChild(makeButton('feedback', '批注反馈', '', false))
        actions.appendChild(makeButton('adopt', '批注采纳', '', true))
      }
      resetTone()
    }
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
    var attrs = ['data-testid', 'data-test', 'name', 'aria-label']
    for (var i = 0; i < attrs.length; i += 1) {
      var value = el.getAttribute(attrs[i])
      if (value) return el.tagName.toLowerCase() + '[' + attrs[i] + '="' + value.replace(/"/g, '\\"') + '"]'
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

  function place(el, mouseX, mouseY) {
    if (!el || el.closest('[data-sa-web-picker]')) return
    var rect = el.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return
    state.el = el
    var note = setActionsFor(el)
    // 已经有批注的元素不再叠拾取框，只保留常驻框与按钮组。
    box.style.display = note ? 'none' : 'block'
    if (!note) {
      box.style.left = rect.left + 'px'
      box.style.top = rect.top + 'px'
      box.style.width = rect.width + 'px'
      box.style.height = rect.height + 'px'
    }
    actions.style.display = 'flex'
    var width = actions.offsetWidth || 180
    var height = actions.offsetHeight || 24
    var marginX = 4
    var top
    // 默认放框外：鼠标在元素上半部分就放上方，下半部分放下方；那一侧没空间才换另一侧。
    var preferAbove = mouseY === undefined ? true : mouseY < rect.top + rect.height / 2
    var above = rect.top - height
    var below = rect.bottom
    if (above >= 4 || below + height > window.innerHeight - 4) {
      top = preferAbove ? above : below
      if (top < 4) top = below
      if (top + height > window.innerHeight - 4) top = above >= 4 ? above : Math.max(4, window.innerHeight - height - 4)
    } else {
      top = below
    }
    var outsideOk = top < rect.top || top >= rect.bottom
    if (!outsideOk) {
      // 框外上下都没有空间：放进框内，居中偏上。
      top = rect.top + Math.max(4, Math.min((rect.height - height) / 2, 4))
    }
    var left = Math.max(marginX, Math.min((mouseX === undefined ? rect.left + width / 2 : mouseX) - width / 2, window.innerWidth - width - marginX))
    if (!outsideOk) {
      left = Math.max(rect.left + 2, Math.min(left, rect.right - width - 2))
    }
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
    place(el, event.clientX, event.clientY)
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
    // 刚新增/删除批注时，正悬停的元素要立刻换成对应的按钮组。
    if (state.el) setActionsFor(state.el)
    if (state.el && state.note) box.style.display = 'none'
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

  function execute(script) {
    const webview = view()
    if (webview === null || typeof webview.executeJavaScript !== 'function') return undefined
    try {
      return webview.executeJavaScript(script)
    } catch {
      return undefined
    }
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
    const json = JSON.stringify(lastNotes)
    execute(`window.__saWebNotes = ${json}; window.__saWebRender && window.__saWebRender()`)
  }

  /**
   * 按设置截当前页：scope 为 'page' 截整页，'element' 截目标元素区域，'off' 不截。
   * 失败返回 undefined，批注仍可正常创建。
   */
  async function capture(scope, rect) {
    if (scope !== 'page' && scope !== 'element') return undefined
    const webview = view()
    if (webview === null || typeof webview.capturePage !== 'function') return undefined
    try {
      const area =
        scope === 'element' && rect !== null && typeof rect === 'object'
          ? {
              x: Math.max(0, Math.round(rect.left)),
              y: Math.max(0, Math.round(rect.top)),
              width: Math.max(1, Math.round(rect.width)),
              height: Math.max(1, Math.round(rect.height)),
            }
          : undefined
      const image = await webview.capturePage(area)
      if (image === null || image === undefined || typeof image.toDataURL !== 'function') return undefined
      const dataUrl = image.toDataURL()
      return typeof dataUrl === 'string' && dataUrl.startsWith('data:image/') ? dataUrl : undefined
    } catch {
      return undefined
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
    execute('window.__saPicker && window.__saPicker.stop()')
    stop()
  }

  return { start, sync, capture, dispose, available: () => view() !== null }
}

function safeCall(fn) {
  try {
    return fn()
  } catch {
    return undefined
  }
}
