/**
 * 底栏「在右侧边栏打开批注」按钮的图标不随开合变化，title / aria-label / aria-pressed 仍随状态走。
 * 只搭一个够用的假 DOM，不打真实浏览器；运行：node --import ./test/loader.mjs --test test/*.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'

function classTokens(node) {
  return node.className.split(/\s+/).filter(Boolean)
}

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase()
    this.children = []
    this.parentNode = null
    this.className = ''
    this.attributes = new Map()
    this.style = {}
    this.dataset = {}
    this.title = ''
    this.textContent = ''
    const self = this
    this.classList = {
      contains: (token) => classTokens(self).includes(token),
      add: (...tokens) => {
        const next = new Set(classTokens(self))
        for (const token of tokens) next.add(token)
        self.className = [...next].join(' ')
      },
      remove: (...tokens) => {
        const next = new Set(classTokens(self))
        for (const token of tokens) next.delete(token)
        self.className = [...next].join(' ')
      },
    }
  }

  get textContent() {
    if (this.children.length > 0) return this.children.map((child) => child.textContent).join('')
    return this._text ?? ''
  }

  set textContent(value) {
    this.children = []
    this._text = String(value)
  }

  appendChild(child) {
    child.parentNode = this
    this.children.push(child)
    return child
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value))
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null
  }

  addEventListener() {}

  matches(selector) {
    if (selector.startsWith('.')) return classTokens(this).includes(selector.slice(1))
    return this.tagName === selector.toUpperCase()
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null
  }

  querySelectorAll(selector) {
    const found = []
    const walk = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) found.push(child)
        walk(child)
      }
    }
    walk(this)
    return found
  }
}

globalThis.document = {
  createElement: (tag) => new FakeElement(tag),
  createElementNS: (_namespace, tag) => new FakeElement(tag),
}

const { createPanelRenderer } = await import('../src/core/panel-render.js')

const SIDE_PATHS = ['M2.2 3.2h11.6v9.6H2.2z', 'M10.2 3.2v9.6']
const CROSS_PATHS = ['M4.4 4.4l7.2 7.2', 'M11.6 4.4l-7.2 7.2']

const TEXT = {
  'panel.sideTab': '在右侧边栏打开批注',
  'panel.sideTabClose': '关闭右侧批注标签页',
}

const t = (key, params) => {
  if (TEXT[key] !== undefined) return TEXT[key]
  return params !== undefined && 'n' in params ? `${key}:${params.n}` : key
}

function renderPanel(sideOpen) {
  const renderer = createPanelRenderer({
    t,
    getAnnotations: () => [],
    clearAnnotations: () => {},
    moveAnnotation: () => {},
    openEditPopover: () => {},
    removeAnnotation: () => {},
    sourceSummary: () => '',
    openImageViewer: () => {},
    imageSettingsRow: () => new FakeElement('div'),
    instructionSettingsRow: () => new FakeElement('div'),
    fallbackSettingsRow: () => new FakeElement('div'),
    openSideTab: () => {},
    isSideTabOpen: () => sideOpen,
  })
  const panel = new FakeElement('div')
  renderer.render(panel)
  return panel
}

function readSideButton(panel) {
  const sideButton = panel.querySelector('.sa-panel-side')
  assert.ok(sideButton !== null, '底栏应当有侧栏按钮')
  return sideButton
}

test('未打开：侧栏图标 + 「在右侧边栏打开批注」', () => {
  const sideButton = readSideButton(renderPanel(false))
  const paths = sideButton.querySelectorAll('path').map((path) => path.getAttribute('d'))
  assert.deepEqual(paths, SIDE_PATHS)
  assert.equal(sideButton.title, '在右侧边栏打开批注')
  assert.equal(sideButton.getAttribute('aria-label'), '在右侧边栏打开批注')
  assert.equal(sideButton.getAttribute('aria-pressed'), 'false')
})

test('已打开：仍画侧栏图标，文案换成关闭', () => {
  const sideButton = readSideButton(renderPanel(true))
  const paths = sideButton.querySelectorAll('path').map((path) => path.getAttribute('d'))
  assert.deepEqual(paths, SIDE_PATHS)
  assert.equal(sideButton.title, '关闭右侧批注标签页')
  assert.equal(sideButton.getAttribute('aria-label'), '关闭右侧批注标签页')
  assert.equal(sideButton.getAttribute('aria-pressed'), 'true')
})

test('开合两态的图标逐条相同，且不再出现叉号路径', () => {
  const closed = readSideButton(renderPanel(false)).querySelectorAll('path').map((path) => path.getAttribute('d'))
  const opened = readSideButton(renderPanel(true)).querySelectorAll('path').map((path) => path.getAttribute('d'))
  assert.deepEqual(opened, closed)
  for (const d of opened) assert.ok(!CROSS_PATHS.includes(d), `不应再画叉号：${d}`)
})
