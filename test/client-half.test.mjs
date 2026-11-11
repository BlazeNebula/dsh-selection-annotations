/**
 * 客户端半边测试台：在 Node 里给 client.js 造一个够用的最小 DOM / React / Cordis 环境，
 * 把「批注集合 → 批注报告 → 运行时草稿附件 → 挂进输入态 → 发送后被消费清空」整条数据通路跑通。
 *
 * 它验证的是**逻辑**，不是渲染：真实的选区几何、高亮位置需要在浏览器里看。
 * 运行：node --import ./test/loader.mjs --test test/*.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const SOURCE = readFileSync(process.env.CLIENT_FILE ?? new URL('../client.js', import.meta.url), 'utf8')

/** 测试用的「源文件」：第 3 行有引文，且引文外面包着 Markdown 强调标记。 */
const SOURCE_TEXT = [
  '# 标题',
  '',
  '聊天界面里做「选中 → 批注」最直觉的**做法是：提交**时把批注块拼进草稿。',
  '',
].join('\n')

/* ------------------------------------------------------------------ 最小 DOM */

const node = (text) => ({ nodeType: 3, nodeValue: text, parentElement: null, isConnected: true })

function element(tag, attrs = {}, children = []) {
  const el = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    childNodes: [],
    parentElement: null,
    isConnected: true,
    style: {},
    dataset: {},
    attributes: new Map(Object.entries(attrs)),
    className: '',
    value: '',
    type: '',
    offsetWidth: 120,
    offsetHeight: 30,
    appendChild(child) {
      el.childNodes.push(child)
      child.parentElement = el
      return child
    },
    insertBefore(child, before) {
      if (child.parentElement !== null) child.remove()
      const index = before === null || before === undefined ? -1 : el.childNodes.indexOf(before)
      if (index === -1) el.childNodes.push(child)
      else el.childNodes.splice(index, 0, child)
      child.parentElement = el
      return child
    },
    append(...items) {
      for (const item of items) el.appendChild(item)
    },
    get previousElementSibling() {
      const siblings = el.parentElement === null ? [] : el.parentElement.childNodes
      for (let index = siblings.indexOf(el) - 1; index >= 0; index -= 1) {
        if (siblings[index].nodeType === 1) return siblings[index]
      }
      return null
    },
    get nextElementSibling() {
      const siblings = el.parentElement === null ? [] : el.parentElement.childNodes
      for (let index = siblings.indexOf(el) + 1; index < siblings.length; index += 1) {
        if (siblings[index].nodeType === 1) return siblings[index]
      }
      return null
    },
    remove() {
      const parent = el.parentElement
      if (parent !== null) parent.childNodes = parent.childNodes.filter((candidate) => candidate !== el)
    },
    setAttribute(key, value) {
      el.attributes.set(key, String(value))
    },
    getAttribute(key) {
      return el.attributes.has(key) ? el.attributes.get(key) : null
    },
    addEventListener() {},
    removeEventListener() {},
    focus() {},
    contains(other) {
      if (other === el) return true
      return flatten(el).includes(other)
    },
    closest(selector) {
      let current = el
      while (current !== null && current !== undefined) {
        if (matches(current, selector)) return current
        current = current.parentElement
      }
      return null
    },
    querySelector(selector) {
      return el.querySelectorAll(selector)[0] ?? null
    },
    querySelectorAll(selector) {
      const found = []
      const visit = (node) => {
        for (const child of node.childNodes ?? []) {
          if (child.nodeType !== 1) continue
          if (matches(child, selector)) found.push(child)
          visit(child)
        }
      }
      visit(el)
      return found
    },
  }
  for (const child of children) el.appendChild(child)
  // textContent 必须是真的读写器：插件用读它做锚点匹配，用写它清空/填入节点。
  Object.defineProperty(el, 'textContent', {
    get: () => textOf(el),
    set: (value) => {
      el.childNodes = []
      const text = String(value)
      if (text !== '') el.appendChild({ nodeType: 3, nodeValue: text, parentElement: el, isConnected: true })
    },
  })
  return el
}

/** 只支持本插件实际用到的那几个选择器形状。 */
function matches(el, selector) {
  if (el === null || el.nodeType !== 1) return false
  for (const part of selector.split(',')) {
    const candidate = part.trim()
    const attrMatch = /^\[([a-zA-Z-]+)(?:="([^"]*)")?\]$/.exec(candidate)
    if (attrMatch !== null) {
      const value = el.getAttribute(attrMatch[1])
      if (value === null) continue
      if (attrMatch[2] === undefined || value === attrMatch[2]) return true
      continue
    }
    if (/^\.[A-Za-z0-9_-]+$/.test(candidate)) {
      const classes = `${el.className} ${el.getAttribute('class') ?? ''}`.split(/\s+/).filter(Boolean)
      if (classes.includes(candidate.slice(1))) return true
      continue
    }
    if (/^(input|textarea)$/i.test(candidate) && el.tagName === candidate.toUpperCase()) return true
    if (/^[a-z]+$/i.test(candidate) && el.tagName === candidate.toUpperCase()) return true
  }
  return false
}

const flatten = (root, out = []) => {
  if (root.nodeType === 3) {
    out.push(root)
    return out
  }
  for (const child of root.childNodes ?? []) flatten(child, out)
  return out
}
const textOf = (root) => flatten(root).map((n) => n.nodeValue ?? '').join('')

/** 把 (node, offset) 折算成根内的一维字符位置。 */
function positionOf(root, target, offset) {
  if (target === null) return -1
  if (target.nodeType === 1) {
    const inner = flatten(target)
    return inner.length === 0 ? 0 : positionOf(root, inner[0], 0)
  }
  let position = 0
  for (const candidate of flatten(root)) {
    if (candidate === target) return position + offset
    position += (candidate.nodeValue ?? '').length
  }
  return -1
}

/** 轮询定时器不能撑住测试进程：unref 后仍会触发，但不阻止 node --test 退出。 */
const nodeSetInterval = setInterval

/** 内存版的 localStorage：形状与浏览器一致，用来验证草稿能跨实例恢复。 */
function makeMemoryStorage() {
  const entries = new Map()
  return {
    getItem: (key) => (entries.has(key) ? entries.get(key) : null),
    setItem: (key, value) => {
      entries.set(String(key), String(value))
    },
    removeItem: (key) => {
      entries.delete(key)
    },
    key: (index) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size
    },
  }
}

function makeEnvironment(options = {}) {
  let rangeRoot = null

  class FakeRange {
    constructor() {
      this.startContainer = null
      this.endContainer = null
      this.startOffset = 0
      this.endOffset = 0
    }
    setStart(target, offset) {
      this.startContainer = target
      this.startOffset = offset
      return this
    }
    setEnd(target, offset) {
      this.endContainer = target
      this.endOffset = offset
      return this
    }
    cloneRange() {
      const copy = new FakeRange()
      return copy.setStart(this.startContainer, this.startOffset).setEnd(this.endContainer, this.endOffset)
    }
    toString() {
      if (rangeRoot === null) return ''
      const from = positionOf(rangeRoot, this.startContainer, this.startOffset)
      const to = positionOf(rangeRoot, this.endContainer, this.endOffset)
      if (from < 0 || to < 0 || to < from) return ''
      return textOf(rangeRoot).slice(from, to)
    }
    getClientRects() {
      return []
    }
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 0, height: 0, bottom: 0, right: 0 }
    }
  }

  const head = element('head')
  const body = element('body')
  const listeners = new Map()

  const document = {
    head,
    body,
    createElement: (tag) => element(tag),
    createElementNS: (_namespace, tag) => element(tag),
    addEventListener: (type, handler) => listeners.set(type, handler),
    removeEventListener: (type) => listeners.delete(type),
    createRange: () => new FakeRange(),
    createTreeWalker: (root) => {
      const nodes = flatten(root).filter((candidate) => candidate.nodeType === 3)
      let index = -1
      return {
        nextNode() {
          index += 1
          return index < nodes.length ? nodes[index] : null
        },
      }
    },
    querySelector: (selector) => body.querySelector(selector),
    querySelectorAll: (selector) => body.querySelectorAll(selector),
  }

  const loaded = []
  const window = {
    __ModuleLoader__: { load: (mod) => loaded.push(mod) },
    setTimeout,
    clearTimeout,
    setInterval: (...args) => {
      const timer = nodeSetInterval(...args)
      if (typeof timer?.unref === 'function') timer.unref()
      return timer
    },
    clearInterval,
    addEventListener() {},
    removeEventListener() {},
    innerWidth: 1200,
    innerHeight: 800,
    // 草稿持久化走真实形状的 storage；测试可传入共享实例模拟「刷新页面」。
    localStorage: options.localStorage ?? makeMemoryStorage(),
    getSelection: () => ({ rangeCount: 0, isCollapsed: true, getRangeAt: () => null, removeAllRanges() {} }),
    requestAnimationFrame: (callback) => {
      const timer = setTimeout(callback, 0)
      if (typeof timer?.unref === 'function') timer.unref()
      return timer
    },
    cancelAnimationFrame: (timer) => clearTimeout(timer),
  }

  const require = (name) => {
    if (name === 'react') {
      return {
        createElement: (type, props, ...children) => ({ type, props, children }),
        useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
        useEffect: () => {},
        Fragment: 'Fragment',
      }
    }
    throw new Error(`unexpected require: ${name}`)
  }

  return {
    document,
    window,
    require,
    loaded,
    listeners,
    element,
    node,
    setRangeRoot(root) {
      rangeRoot = root
    },
  }
}

/** 载入 client.js（它只调用 window.__ModuleLoader__.load，不会立刻执行副作用）。 */
function loadBundle(env) {
  const factory = new Function(
    'window',
    'document',
    'MutationObserver',
    'ResizeObserver',
    'TextEncoder',
    'btoa',
    'console',
    'AbortController',
    'NodeFilter',
    SOURCE,
  )
  factory(
    env.window,
    env.document,
    class {
      observe() {}
      disconnect() {}
    },
    class {
      observe() {}
      disconnect() {}
    },
    TextEncoder,
    btoa,
    { log() {}, warn() {}, error() {} },
    AbortController,
    { SHOW_TEXT: 4 },
  )
  assert.equal(env.loaded.length, 1, 'bundle 必须注册恰好一个模块')
  assert.equal(env.loaded[0].id, '@u2a5f/dsh-selection-annotations', 'bundle id 必须与包名逐字一致')
  return env.loaded[0].factory(env.require)
}

/** 极简 snapshot store，形状与 dsh-client-store 的 createSnapshotStore 一致。 */
function createStore(initial) {
  let value = initial
  const subscribers = new Set()
  return {
    getSnapshot: () => value,
    subscribe(fn) {
      subscribers.add(fn)
      return () => subscribers.delete(fn)
    },
    set(next) {
      value = next
      for (const fn of [...subscribers]) fn()
    },
  }
}

/**
 * 组装最小 ctx + 可观测的 conversation 运行时。
 *
 * 关键：`createDrafts` / `addFiles` / `releaseDraftAttachment` / `fileUploads` 就是
 * dsh-client-ui-conversation 官方附件链路的形状（拖拽/粘贴附件走的那条）。
 */
function makeHarness(options = {}) {
  const env = makeEnvironment(options)
  const mod = loadBundle(env)

  const uploads = []
  const sourceReads = []
  const released = []
  const registrations = []
  const draftAttachments = new Map()
  let draftSeq = 0

  // 语言服务：形状与 dsh-client-locale 一致（register / bind / subscribe / getSnapshot）。
  const localeDictionaries = []
  const localeListeners = new Set()
  let localeActive = options.localeActive ?? 'zh'
  const localeService = {
    getSnapshot: () => ({ active: localeActive, revision: 0 }),
    register(namespace, dictionaries) {
      localeDictionaries.push({ namespace, dictionaries })
      return () => {}
    },
    bind(namespace) {
      return (key, params) => {
        const entry = localeDictionaries.find((item) => item.namespace === namespace)
        const template = entry?.dictionaries?.[localeActive]?.[key] ?? key
        if (params === undefined || params === null) return template
        return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match))
      }
    },
    subscribe(fn) {
      localeListeners.add(fn)
      return () => localeListeners.delete(fn)
    },
    setActive(next) {
      localeActive = next
      for (const fn of [...localeListeners]) fn()
    },
  }

  const fileUploads = createStore({})
  // 运行时外壳的「实时字段」：插件据此判断附件是否还在。
  let liveIds = []
  // 「已发布快照」：只有 publish() 之后才与实时字段一致（真实运行时也会滞后）。
  let inputSnapshot = { draft: '', attachmentIds: [] }
  const inputSubscribers = new Set()
  const publish = () => {
    for (const fn of [...inputSubscribers]) fn()
  }
  const syncSnapshot = () => {
    inputSnapshot = { ...inputSnapshot, attachmentIds: liveIds }
  }

  const shell = {
    get attachmentIds() {
      return liveIds
    },
    state: {
      getSnapshot: () => inputSnapshot,
      subscribe(fn) {
        inputSubscribers.add(fn)
        return () => inputSubscribers.delete(fn)
      },
    },
    addFiles(references, ids) {
      liveIds = [...liveIds, ...ids]
      syncSnapshot()
      publish()
      return true
    },
    removeAttachment(id) {
      const next = liveIds.filter((x) => x !== id)
      if (next.length === liveIds.length) return false
      liveIds = next
      syncSnapshot()
      publish()
      return true
    },
  }

  const conversation = {
    input: { for: () => (options.noScope === true ? undefined : shell) },
    fileUploads,
    createDrafts(sessionId, files) {
      return files.map((file) => {
        draftSeq += 1
        const id = `d${draftSeq}`
        const isImage = typeof file?.type === 'string' && file.type.startsWith('image/')
        draftAttachments.set(id, { kind: isImage ? 'image' : 'file', id, file })
        uploads.push({ sessionId, file })
        // 图片草稿是运行时直发（对象 URL + 随 prompt 发送字节），没有后台上传状态。
        if (isImage) return { kind: 'image', id }
        fileUploads.set({ ...fileUploads.getSnapshot(), [id]: { status: 'uploading' } })
        setTimeout(() => {
          if (options.uploadFails === true) {
            fileUploads.set({ ...fileUploads.getSnapshot(), [id]: { status: 'error', message: '上传失败' } })
            return
          }
          fileUploads.set({
            ...fileUploads.getSnapshot(),
            [id]: { status: 'ready', receiptId: `r-${id}`, file: { attachmentId: `a-${id}`, name: file.name, bytes: file.size } },
          })
        }, options.uploadDelayMs ?? 0)
        return { kind: 'file', id }
      })
    },
    /** 运行时真正持有的草稿表 —— 拉取式消费检测读的就是它。 */
    resolveDraftAttachments(ids) {
      return ids.filter((id) => draftAttachments.has(id)).map((id) => draftAttachments.get(id))
    },
    releaseDraftAttachment(id) {
      released.push(id)
      draftAttachments.delete(id)
      const next = { ...fileUploads.getSnapshot() }
      delete next[id]
      fileUploads.set(next)
    },
  }

  if (options.noRuntime === true) delete conversation.createDrafts

  const releaseAllDrafts = () => {
    for (const id of [...draftAttachments.keys()]) conversation.releaseDraftAttachment(id)
  }

  /** 正常发送：输入态交出附件，运行时也退休它们。 */
  const send = () => {
    liveIds = []
    syncSnapshot()
    publish()
    releaseAllDrafts()
  }

  /**
   * 只发附件（无正文）：输入态交出附件，但运行时的草稿表**仍持有**条目
   * 直到 admission 结算 —— 这是实测到的真实行为。
   */
  const sendAttachmentOnly = () => {
    liveIds = []
    syncSnapshot()
    publish()
  }

  /** 实时字段变了，但一次通知都没发布（已发布快照滞后）。 */
  const sendWithoutPublish = () => {
    liveIds = []
  }

  /** 模拟「上一轮遗留」：输入态里挂着一个插件不认识的 批注.json。 */
  const plantOrphan = (id, name = '批注.json') => {
    draftAttachments.set(id, { kind: 'file', id, file: { name } })
    liveIds = [...liveIds, id]
    syncSnapshot()
    publish()
  }

  /** 模拟运行时的 settleDetachedFailure：把已发出的附件 restore 回输入态。 */
  const restoreStray = () => {
    liveIds = [...draftAttachments.keys(), ...liveIds]
    syncSnapshot()
    publish()
  }

  /** 模拟提交先移走附件、随后失败 restore 回来（运行时并未释放它们）。 */
  const sendThenRestore = async (delayMs = 100) => {
    const ids = [...liveIds]
    liveIds = []
    syncSnapshot()
    publish()
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    liveIds = ids
    syncSnapshot()
    publish()
  }

  const ctx = {
    get(name) {
      if (name === 'uiSession' && options.noSession !== true) {
        return { adapter: { current: { getSnapshot: () => ({ key: options.sessionId ?? 's1' }) } } }
      }
      if (name === 'remote') {
        if (options.remoteThrows === true) throw new Error('remote 不可用')
        return {
          workspaceFiles: {
            async read(sessionId, path, range) {
              sourceReads.push({ sessionId, path, range })
              if (options.sourceUnavailable === true) throw new Error('读不到源文件')
              const text = options.sourceText ?? SOURCE_TEXT
              return { offset: 0, text, lines: text.split('\n').length, eof: true, absolutePath: path, version: 'v1' }
            },
          },
        }
      }
      if (name === 'locale' && options.locale !== false) return localeService
      return undefined
    },
    effect(callback) {
      callback()
      return () => {}
    },
    on() {
      return () => {}
    },
    slots: {
      inject(key, callback) {
        callback()
        return () => {}
      },
      register(opts, Component) {
        registrations.push({ opts, Component })
        return () => {}
      },
    },
    sessions: {
      scope: () => (options.noScope === true ? undefined : {}),
      list: { getSnapshot: () => ({ current: options.sessionId ?? 's1' }) },
    },
    conversation,
    locale: options.locale === false ? undefined : localeService,
  }

  mod.apply(ctx)

  return {
    env,
    mod,
    ctx,
    uploads,
    sourceReads,
    released,
    registrations,
    locale: localeService,
    localeDictionaries,
    shell,
    conversation,
    fileUploads,
    inputState: () => inputSnapshot,
    send,
    sendAttachmentOnly,
    sendWithoutPublish,
    restoreStray,
    plantOrphan,
    sendThenRestore,
    debug: env.window.__dshSelectionAnnotations,
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const settle = () => wait(700)
const payloadTextOf = (upload) => upload.file.text()
const payloadOf = async (upload) => JSON.parse(await payloadTextOf(upload))

/* ------------------------------------------------------------------ 用例 */

test('apply 之后：悬挂 UI 建成、批注按钮注册进发送按钮旁的槽位', () => {
  const harness = makeHarness()
  assert.equal(harness.registrations.length, 4)
  const byName = Object.fromEntries(harness.registrations.map((registration) => [registration.opts.name, registration]))
  assert.equal(byName['conversation.chat.turnTail'].opts.id, 'selection-annotations-turn-anchor', '每轮尾部要有锚点，卡片才能按轮次精确落位')
  assert.equal(byName['conversation.input.right'].opts.name, 'conversation.input.right', '必须在发送按钮旁的紧凑控件槽位')
  assert.equal(byName['conversation.input.right'].opts.id, 'selection-annotations')
  assert.equal(typeof byName['conversation.input.right'].Component, 'function')
  assert.equal(byName['tool.call.toolview'].opts.key, 'annotation_replies', '逐条答复走工具调用卡片位')
  assert.equal(byName['plugins.bundle.config'].opts.key, '@u2a5f/dsh-selection-annotations', '插件详情页设置区按包名接管')
  assert.ok(harness.mod.inject.includes('remote'), '声明 remote 才能拿到 ctx.remote 读工作区原文')
  assert.equal(harness.env.document.body.childNodes.length, 8, '覆盖层 / 工具条 / 右键菜单 / 批注弹层 / 补全提示 / 虚影补全 / 悬浮面板 / 图片查看层都要挂上')

  const ui = harness.env.document.head.childNodes[0]
  assert.equal(ui.tagName, 'STYLE')
  assert.ok(ui.textContent.includes('--dsw-alias-brand-primary'), '样式必须使用主题 token')
  assert.ok(ui.textContent.includes('--dsw-alias-state-warn-primary'), '高亮底色必须来自主题 warn 变量')
  assert.ok(ui.textContent.includes('color-mix(in srgb, var(--dsw-alias-state-warn-primary'), '高亮是 warn 色的半透明叠加')
  assert.ok(ui.textContent.includes('oklch(from var(--dsw-alias-label-primary'), '批注文字墨色按主题前景色派生')
})

test('批注负载是自描述的 JSON 数据块，位置用行号 + 字符区间表达', () => {
  const harness = makeHarness()
  const { buildPayload } = harness.debug._internals

  const payload = JSON.parse(
    buildPayload([
      {
        number: 1,
        quote: '这里为什么用 `Arc`？',
        note: '觉得可以省掉',
        source: { kind: 'message', role: 'assistant', anchorKey: 'k1', flowKind: 'assistant-step', charStart: 40, charEnd: 52 },
      },
      {
        number: 2,
        quote: 'let x = 1;',
        note: '',
        source: { kind: 'file', path: 'src/a.ts', lineStart: 12, lineEnd: 18, charStart: 100, charEnd: 110 },
      },
    ]),
  )

  assert.equal(payload.kind, 'dsh-selection-annotations', 'kind 是宿主认领的依据')
  assert.equal(payload.version, 1)
  assert.equal(payload.count, 2)
  assert.equal(typeof payload.instruction, 'string', '数据块要自描述')
  assert.equal(payload.annotations.length, 2)

  const [first, second] = payload.annotations
  assert.equal(first.index, 1)
  assert.equal(first.quote, '这里为什么用 `Arc`？')
  assert.equal(first.note, '觉得可以省掉')
  assert.deepEqual(first.source, {
    kind: 'message',
    role: 'assistant',
    anchorKey: 'k1',
    flowKind: 'assistant-step',
    charStart: 40,
    charEnd: 52,
    textOrigin: 'rendered',
  })

  assert.equal(second.index, 2)
  assert.deepEqual(second.source, { kind: 'file', path: 'src/a.ts', lineStart: 12, lineEnd: 18, charStart: 100, charEnd: 110, textOrigin: 'rendered' })
})

test('位置字段缺省时不会往 JSON 里塞 null 噪声', () => {
  const harness = makeHarness()
  const { payloadSource } = harness.debug._internals
  assert.deepEqual(payloadSource({ kind: 'file', path: 'a.ts' }), { kind: 'file', path: 'a.ts', textOrigin: 'rendered' })
  assert.deepEqual(payloadSource({ kind: 'message', flowKind: 'user', charStart: 0, charEnd: 3 }), {
    kind: 'message',
    role: 'user',
    flowKind: 'user',
    charStart: 0,
    charEnd: 3,
    textOrigin: 'rendered',
  })
  assert.deepEqual(payloadSource(undefined), { kind: 'dom' })
})

test('批注集合 → 运行时草稿附件 → 挂进输入态（官方 createDrafts/addFiles 链路）', async () => {
  const harness = makeHarness()
  harness.debug.add({ quote: '被引用的原文', note: '这条有问题', source: { kind: 'message', anchorKey: 'k1', flowKind: 'assistant-step' } })

  await settle()

  assert.equal(harness.uploads.length, 1, '应当只登记一次草稿附件')
  assert.equal(harness.uploads[0].sessionId, 's1')
  assert.equal(harness.uploads[0].file.name, '批注.json', '负载以 JSON 文件形式随消息提交')
  const payload = await payloadOf(harness.uploads[0])
  assert.equal(payload.annotations[0].quote, '被引用的原文')
  assert.equal(payload.annotations[0].note, '这条有问题')

  const drafts = harness.debug.drafts()
  assert.equal(drafts.length, 1, '必须让运行时登记草稿附件，而不是只塞 id')
  assert.deepEqual(harness.inputState().attachmentIds, drafts, '附件必须挂进输入态')
})

test('不在上传就绪前挂载：否则 sendSession 会整条消息抛错', async () => {
  const harness = makeHarness({ uploadDelayMs: 150 })
  harness.debug.add({ quote: 'q', note: 'n', source: { kind: 'message', anchorKey: 'k1' } })

  // 防抖 450ms 之后才开始登记；上传还要 150ms 才 ready。
  await wait(520)
  assert.equal(harness.uploads.length, 1, '草稿附件应当已登记')
  assert.equal(harness.debug.drafts().length, 0, '还没 ready 就不该挂进输入态')

  await wait(400)
  assert.equal(harness.debug.drafts().length, 1, 'ready 之后才挂上')
})

test('上传失败时不挂载，也不留下半截状态', async () => {
  const harness = makeHarness({ uploadFails: true })
  harness.debug.add({ quote: 'q', note: 'n', source: { kind: 'message', anchorKey: 'k1' } })

  await settle()

  assert.equal(harness.debug.drafts().length, 0)
  assert.deepEqual(harness.inputState().attachmentIds, [])
  assert.deepEqual(harness.released, ['d1'], '失败的草稿附件必须释放掉')
  assert.equal(harness.debug.list().length, 1, '批注本身仍留在插件里')
})

test('消息发出（附件被消费）后自动清空，不会黏到下一条消息', async () => {
  const harness = makeHarness()
  harness.debug.add({ quote: 'q', note: 'n', source: { kind: 'message', anchorKey: 'k1', flowKind: 'assistant-step' } })
  await settle()
  assert.equal(harness.debug.list().length, 1)

  harness.send()
  await wait(700)
  assert.equal(harness.debug.list().length, 0, '附件被消费后批注应视为已送达')
  assert.deepEqual(harness.debug.drafts(), [])
})

test('提交失败把附件 restore 回来时不得清空批注（否则批注与附件状态会对不上）', async () => {
  const harness = makeHarness()
  harness.debug.add({ quote: 'q', note: 'n', source: { kind: 'message', anchorKey: 'k1' } })
  await settle()
  assert.equal(harness.debug.list().length, 1)

  await harness.sendThenRestore(100)
  await wait(700)

  assert.equal(harness.debug.list().length, 1, '附件还在，批注就不该被清掉')
  assert.equal(harness.debug.drafts().length, 1, '附件仍在草稿里')
})

test('插件重载后，输入框里遗留的孤儿批注附件会被认领摘掉', async () => {
  const harness = makeHarness()
  // 上一轮把 `批注.json` 留在了输入态，而这次插件是全新加载的（内存守卫为空）。
  harness.plantOrphan('d-orphan')
  assert.deepEqual(harness.inputState().attachmentIds, ['d-orphan'])

  await wait(2000)

  assert.deepEqual(harness.inputState().attachmentIds, [], '孤儿附件必须被摘掉')
})

test('发出后被运行时 restore 回来的孤儿附件会被摘掉，不在输入框里赖着', async () => {
  const harness = makeHarness()
  harness.debug.add({ quote: 'q', note: 'n', source: { kind: 'message', anchorKey: 'k1' } })
  await settle()

  harness.sendAttachmentOnly()
  await wait(700)
  assert.equal(harness.debug.list().length, 0, '批注先清空')

  // 回合结束之后，运行时才把它 restore 回来（settleDetachedFailure）。
  harness.restoreStray()
  await wait(300)

  assert.deepEqual(harness.inputState().attachmentIds, [], '孤儿附件必须被摘掉')
})

test('还没确认挂上之前，输入态抖动不会误清批注', async () => {
  const harness = makeHarness({ uploadDelayMs: 200 })
  harness.debug.add({ quote: 'q', note: 'n', source: { kind: 'message', anchorKey: 'k1' } })

  harness.send() // 此时附件还没挂上
  await settle()

  assert.equal(harness.debug.list().length, 1, '批注必须还在')
  assert.equal(harness.debug.drafts().length, 1, '随后仍应正常挂上')
})

test('只发附件（无正文）时也要清空：输入态交出附件，运行时仍持有草稿', async () => {
  const harness = makeHarness()
  harness.debug.add({ quote: 'q', note: 'n', source: { kind: 'message', anchorKey: 'k1' } })
  await settle()
  assert.equal(harness.debug.list().length, 1)

  harness.sendAttachmentOnly()
  await wait(700)

  assert.equal(harness.debug.list().length, 0, '只发附件也必须清空')
  assert.deepEqual(harness.debug.drafts(), [])
})

test('输入态快照没发布时，轮询实时字段仍能清空', async () => {
  const harness = makeHarness()
  harness.debug.add({ quote: 'q', note: 'n', source: { kind: 'message', anchorKey: 'k1' } })
  await settle()

  // 实时字段变了，但一次通知都没发布 —— 只有轮询实时字段才抓得到。
  harness.sendWithoutPublish()
  assert.equal(harness.debug.list().length, 1)

  await wait(1800)
  assert.equal(harness.debug.list().length, 0, '轮询实时字段应当兜住')
})

test('追加减批注只保留一个附件：旧的会被摘掉', async () => {
  const harness = makeHarness()
  harness.debug.add({ quote: 'a', note: '', source: { kind: 'message', anchorKey: 'k1' } })
  await settle()
  harness.debug.add({ quote: 'b', note: '', source: { kind: 'message', anchorKey: 'k1' } })
  await settle()

  assert.equal(harness.uploads.length, 2)
  assert.deepEqual(harness.released, ['d1'], '旧附件必须摘掉，避免一条消息挂两份批注块')
  assert.deepEqual(harness.inputState().attachmentIds, ['d2'])
  const second = await payloadOf(harness.uploads[1])
  assert.equal(second.count, 2, '第二版负载应含两条批注')
  assert.equal(second.annotations[1].quote, 'b')
})

test('清空批注会把附件摘下来', async () => {
  const harness = makeHarness()
  harness.debug.add({ quote: 'a', note: '', source: { kind: 'message', anchorKey: 'k1' } })
  await settle()
  harness.debug.clear()
  await settle()

  assert.deepEqual(harness.inputState().attachmentIds, [])
  assert.deepEqual(harness.released, ['d1'])
  assert.deepEqual(harness.debug.drafts(), [])
})

test('空选区空批注不会产生批注条目', () => {
  const harness = makeHarness()
  assert.equal(harness.debug.add({ quote: '', note: '', source: { kind: 'message' } }), undefined)
  assert.equal(harness.debug.add({ quote: '   ', note: '   ', source: { kind: 'dom' } }), undefined)
  assert.equal(harness.debug.list().length, 0)
})

test('删除批注后编号重新连续', async () => {
  const harness = makeHarness()
  harness.debug.add({ quote: 'a', note: '', source: { kind: 'message', anchorKey: 'k1' } })
  harness.debug.add({ quote: 'b', note: '', source: { kind: 'message', anchorKey: 'k1' } })
  harness.debug.add({ quote: 'c', note: '', source: { kind: 'message', anchorKey: 'k1' } })

  harness.debug.remove(harness.debug.list()[1].id)
  await settle()

  assert.deepEqual(
    harness.debug.list().map((item) => [item.number, item.quote]),
    [
      [1, 'a'],
      [2, 'c'],
    ],
    '编号必须跟着顺序重排',
  )
})

test('修改批注：只改批注文字，原文与出处不变，并重新生成附件', async () => {
  const harness = makeHarness()
  harness.debug.add({ quote: '原文', note: '初稿', source: { kind: 'message', anchorKey: 'k1', flowKind: 'assistant-step' } })
  await settle()

  const id = harness.debug.list()[0].id
  harness.debug.update(id, '改过的批注')
  await settle()

  const item = harness.debug.list()[0]
  assert.equal(item.note, '改过的批注')
  assert.equal(item.quote, '原文', '原文不得被编辑改变')
  assert.equal(item.source.anchorKey, 'k1', '出处不得被编辑改变')
  assert.equal(harness.uploads.length, 2, '修改后必须重新生成附件')
  assert.equal((await payloadOf(harness.uploads[1])).annotations[0].note, '改过的批注')
  assert.deepEqual(harness.released, ['d1'], '旧附件要摘掉')
})

test('拿不到会话 scope 时安静降级，不登记也不抛错', async () => {
  const harness = makeHarness({ noScope: true })
  harness.debug.add({ quote: 'q', note: 'n', source: { kind: 'message', anchorKey: 'k1' } })
  await settle()
  assert.equal(harness.uploads.length, 0, '没有输入外壳就不该登记草稿附件')
  assert.equal(harness.debug.list().length, 1, '批注本身仍要留在插件里')
})

test('运行时没有 createDrafts 时只告警、不抛错', async () => {
  const harness = makeHarness({ noRuntime: true })
  harness.debug.add({ quote: 'q', note: 'n', source: { kind: 'message', anchorKey: 'k1' } })
  await settle()
  assert.equal(harness.uploads.length, 0)
  assert.deepEqual(harness.debug.drafts(), [])
  assert.equal(harness.debug.list().length, 1)
})

test('锚点重建：按字符偏移在文本节点间切出准确的 Range', () => {
  const harness = makeHarness()
  const { rangeFromOffsets } = harness.debug._internals

  const first = harness.env.node('前缀 ')
  const middle = harness.env.node('目标原文')
  const last = harness.env.node(' 后缀')
  const root = harness.env.element('div', {}, [first, middle, last])
  harness.env.setRangeRoot(root)

  const range = rangeFromOffsets(root, 3, 4)
  assert.ok(range !== undefined, '应当能按偏移重建 Range')
  assert.equal(range.toString(), '目标原文')
})

test('锚点重建：重复片段按保存时的偏移择优', () => {
  const harness = makeHarness()
  const { rangeFromOffsets, matchInRoot } = harness.debug._internals

  const root = harness.env.element('div', {}, [harness.env.node('foo bar foo baz foo')])
  harness.env.setRangeRoot(root)

  assert.equal(matchInRoot(root, 'foo', 0).toString(), 'foo')
  assert.equal(matchInRoot(root, 'foo', 8).toString(), 'foo')
  assert.equal(rangeFromOffsets(root, 8, 3).toString(), 'foo')
  assert.equal(matchInRoot(root, '不存在的片段', 0), undefined)
})

test('出处捕获：代码预览没有行号属性，按 .line 序号推算行号', () => {
  const harness = makeHarness()
  const { captureSource } = harness.debug._internals

  const makeLine = (text) => {
    const line = harness.env.element('div', {}, [harness.env.node(text)])
    line.className = 'line'
    return line
  }
  const first = makeLine('line one')
  const second = makeLine('line two')
  const third = makeLine('line three')
  const pre = harness.env.element('pre', {}, [first, second, third])
  const code = harness.env.element('div', { 'data-code-preview': '' }, [pre])
  const text = third.childNodes[0]
  harness.env.setRangeRoot(code)
  const range = harness.env.document.createRange().setStart(text, 5).setEnd(text, 8)

  const source = captureSource(range)
  assert.equal(source.kind, 'file')
  assert.equal(source.lineStart, 3, '应当是第三条 .line')
  assert.equal(source.lineEnd, 3)
  assert.equal(source.charStart, 'line one'.length + 'line two'.length + 5)
  assert.equal(source.charEnd, 'line one'.length + 'line two'.length + 8)
})

test('源文件定位：空白折叠后仍能命中，并把区间折算回原文坐标', () => {
  const harness = makeHarness()
  const { locateInSource, lineOfOffset } = harness.debug._internals

  const hit = locateInSource(SOURCE_TEXT, '做法是：提交')
  assert.ok(hit !== undefined, '应当能在源文里找到引文')
  assert.equal(SOURCE_TEXT.slice(hit.start, hit.end), '做法是：提交', '区间必须落在原文上（标记在引文之外）')
  assert.equal(lineOfOffset(SOURCE_TEXT, hit.start), 3, '引文在第 3 行')
  assert.equal(lineOfOffset(SOURCE_TEXT, hit.end - 1), 3)

  // 引文里的换行/多余空白会被折叠掉
  assert.ok(locateInSource('alpha   beta\ngamma', 'alpha beta gamma') !== undefined)
  assert.equal(locateInSource(SOURCE_TEXT, '完全不在原文里的句子'), undefined)
  assert.equal(locateInSource(SOURCE_TEXT, '   '), undefined)
})

test('定位到源文件时给出行号与原文坐标，拿不到就退回渲染坐标', async () => {
  const harness = makeHarness()
  const { resolveSourcePosition } = harness.debug._internals

  const precise = await resolveSourcePosition({ kind: 'file', path: 'a.md' }, '做法是：提交')
  assert.equal(precise.textOrigin, 'source')
  assert.equal(precise.lineStart, 3)
  assert.equal(precise.lineEnd, 3)
  assert.equal(SOURCE_TEXT.slice(precise.charStart, precise.charEnd), '做法是：提交')
  assert.equal(harness.sourceReads.length, 1, '应当读了一次源文件')

  assert.equal(await resolveSourcePosition({ kind: 'message' }, 'x'), undefined, '只有文件来源才查原文')
  assert.equal(await resolveSourcePosition({ kind: 'file' }, 'x'), undefined, '没有路径就不查')
  assert.equal(await resolveSourcePosition({ kind: 'file', path: 'a.md' }, '不在原文里'), undefined)
})

test('remote 拿不到时，位置精修安静失败而不是把异常抛给创建流程', async () => {
  const harness = makeHarness({ remoteThrows: true })
  const { resolveSourcePosition } = harness.debug._internals
  assert.equal(await resolveSourcePosition({ kind: 'file', path: 'a.md' }, '做法是：提交'), undefined)
})

test('位置精修只补位置：原文与批注文字不变，负载随之更新', async () => {
  const harness = makeHarness()
  const created = harness.debug.add({
    quote: '做法是：提交',
    note: '原批注',
    source: { kind: 'file', path: 'README.zh-CN.md', charStart: 1, charEnd: 7, textOrigin: 'rendered' },
  })
  await settle()
  const before = await payloadOf(harness.uploads[0])
  assert.equal(before.annotations[0].source.textOrigin, 'rendered', '创建瞬间还是渲染坐标')

  await harness.debug._internals.refineSourcePosition(created.id, created.source, created.quote)
  await settle()

  const item = harness.debug.list()[0]
  assert.equal(item.quote, '做法是：提交', '原文不变')
  assert.equal(item.note, '原批注', '批注文字不变')
  assert.equal(item.source.textOrigin, 'source')
  assert.equal(item.source.lineStart, 3)

  const after = await payloadOf(harness.uploads[harness.uploads.length - 1])
  assert.equal(after.annotations[0].source.textOrigin, 'source', '精修后的负载要跟着更新')
  assert.equal(after.annotations[0].source.lineStart, 3)
  assert.equal(item.source.renderedCharStart, 1, '页面定位用的渲染坐标要留下')
  assert.equal(item.source.renderedCharEnd, 7)
  assert.equal('renderedCharStart' in after.annotations[0].source, false, '渲染坐标不进负载')
})

test('页面高亮用渲染坐标：精修成原文坐标后仍挑对重复片段', () => {
  const harness = makeHarness()
  const root = harness.env.element('div', { 'data-code-preview': '' }, [
    harness.env.node('foo bar foo baz foo'),
  ])
  harness.env.document.body.appendChild(root)
  harness.env.setRangeRoot(root)
  const { locateRange } = harness.debug._internals

  const second = locateRange({
    quote: 'foo',
    source: {
      kind: 'file',
      path: 'a.md',
      textOrigin: 'source',
      charStart: 0,
      charEnd: 3,
      renderedCharStart: 8,
      renderedCharEnd: 11,
    },
  })
  assert.equal(second.startOffset, 8, '按保存时的渲染偏移挑第二处')

  const fallback = locateRange({
    quote: 'foo',
    source: { kind: 'file', path: 'a.md', textOrigin: 'source', charStart: 0, charEnd: 3 },
  })
  assert.equal(fallback.startOffset, 0, '没有渲染坐标时退回第一处，不拿原文偏移硬比')
})

test('读不到源文件时安静退回渲染坐标', async () => {
  const harness = makeHarness({ sourceUnavailable: true })
  const { resolveSourcePosition } = harness.debug._internals
  assert.equal(await resolveSourcePosition({ kind: 'file', path: 'a.md' }, '做法是：提交'), undefined)
})

test('负载里带上坐标口径：能读到原文用 source，否则 rendered', () => {
  const harness = makeHarness()
  const { payloadSource } = harness.debug._internals
  assert.equal(payloadSource({ kind: 'file', path: 'a.md', textOrigin: 'source' }).textOrigin, 'source')
  assert.equal(payloadSource({ kind: 'file', path: 'a.md' }).textOrigin, 'rendered')
  assert.equal(payloadSource({ kind: 'message', role: 'assistant' }).textOrigin, 'rendered')
  assert.deepEqual(
    payloadSource({ kind: 'reply', batchAt: 1700000000, index: 3, field: 'reason', charStart: 2, charEnd: 6 }),
    { kind: 'reply', batchAt: 1700000000, index: 3, field: 'reason', textOrigin: 'rendered', charStart: 2, charEnd: 6 },
  )
  assert.equal(payloadSource({ kind: 'dom' }).textOrigin, undefined, '非文件/消息来源不带口径')
})

test('出处捕获：逐条答复卡片里划线时锚到批次、批注编号与字段偏移', () => {
  const harness = makeHarness()
  const { captureSource } = harness.debug._internals

  const text = harness.env.node('答复理由正文')
  const reason = harness.env.element('div', { 'data-sa-field': 'reason' }, [text])
  reason.className = 'sa-a-reason'
  const group = harness.env.element('div', { 'data-sa-batch-at': '1700000000', 'data-sa-reply-index': '3' }, [reason])
  group.className = 'sa-reply-item'
  const card = harness.env.element('div', { 'data-sa-ui': 'replies' }, [group])
  harness.env.setRangeRoot(card)

  const range = harness.env.document.createRange().setStart(text, 2).setEnd(text, 6)
  const source = captureSource(range)
  assert.equal(source.kind, 'reply')
  assert.equal(source.batchAt, 1700000000)
  assert.equal(source.index, 3)
  assert.equal(source.field, 'reason')
  assert.equal(source.charStart, 2)
  assert.equal(source.charEnd, 6)
  assert.equal(source.textOrigin, 'rendered')
})

test('出处文案：逐条答复写出明确锚点与字符区间', () => {
  const harness = makeHarness()
  const { describeSource } = harness.debug._internals
  assert.equal(
    describeSource({ kind: 'reply', batchAt: 1700000000, index: 3, field: 'reason', charStart: 2, charEnd: 6 }),
    '逐条答复 · 批注 3 · 答复理由（锚点 reply:1700000000:3:reason，字符 2–6）',
  )
  assert.equal(
    describeSource({ kind: 'reply', index: 2, field: 'item', charStart: 0, charEnd: 5 }),
    '逐条答复 · 批注 2 · 整条答复（锚点 reply:-:2:item，字符 0–5）',
  )
  assert.equal(
    describeSource({ kind: 'sent', anchorKey: '14:user-step3:9', index: 2, field: 'quote', charStart: 3, charEnd: 7 }),
    '已发送批注 · 批注 2 · 引用原文（锚点 sent:14:user-step3:9:2:quote，字符 3–7）',
  )
})

test('出处捕获：旧答复卡片没有 data 属性时按类名与标题兜底', () => {
  const harness = makeHarness()
  const { captureSource } = harness.debug._internals

  const head = harness.env.element('div', {}, [])
  head.className = 'sa-reply-head'
  const indexLabel = harness.env.element('span', {}, [harness.env.node('批注 4')])
  indexLabel.className = 'sa-reply-index'
  head.appendChild(indexLabel)
  const text = harness.env.node('旧卡片里的答复理由')
  const reason = harness.env.element('div', {}, [text])
  reason.className = 'sa-a-reason'
  const group = harness.env.element('div', {}, [head, reason])
  group.className = 'sa-reply-item'
  const card = harness.env.element('div', { 'data-sa-ui': 'replies' }, [group])
  harness.env.setRangeRoot(card)

  const range = harness.env.document.createRange().setStart(text, 1).setEnd(text, 5)
  const source = captureSource(range)
  assert.equal(source.kind, 'reply')
  assert.equal(source.index, 4, '编号要从「批注 4」标题里读回来')
  assert.equal(source.field, 'reason', '字段要从类名推断')
  assert.equal(source.charStart, 1)
  assert.equal(source.charEnd, 5)
})

test('出处捕获：已发送批注卡片里划线时锚到消息键、编号与字段', () => {
  const harness = makeHarness()
  const { captureSource } = harness.debug._internals

  const text = harness.env.node('已发送的批注原文')
  const quote = harness.env.element('div', { 'data-sa-field': 'quote' }, [text])
  quote.className = 'sa-sent-quote'
  const item = harness.env.element('div', { 'data-sa-sent-index': '2' }, [quote])
  item.className = 'sa-sent-item'
  const card = harness.env.element('div', { 'data-sa-ui': 'sent', 'data-anchor': '14:user-step3:9' }, [item])
  harness.env.setRangeRoot(card)

  const range = harness.env.document.createRange().setStart(text, 3).setEnd(text, 7)
  const source = captureSource(range)
  assert.equal(source.kind, 'sent')
  assert.equal(source.anchorKey, '14:user-step3:9')
  assert.equal(source.index, 2)
  assert.equal(source.field, 'quote')
  assert.equal(source.charStart, 3)
  assert.equal(source.charEnd, 7)
  assert.equal(source.textOrigin, 'rendered')
})

test('出处捕获：助手消息锚点 + 文件路径与行号', () => {
  const harness = makeHarness()
  const { captureSource } = harness.debug._internals

  const text = harness.env.node('hello world')
  const row = harness.env.element('div', { 'data-chat-anchor-key': 'k7', 'data-chat-flow-kind': 'assistant-step' }, [text])
  harness.env.setRangeRoot(row)
  const range = harness.env.document.createRange().setStart(text, 0).setEnd(text, 5)

  const source = captureSource(range)
  assert.equal(source.kind, 'message')
  assert.equal(source.anchorKey, 'k7')
  assert.equal(source.flowKind, 'assistant-step')
  assert.equal(source.charStart, 0)
  assert.equal(source.charEnd, 5)

  const line = harness.env.element('div', { 'data-textpreview-line': '12' }, [harness.env.node('let x = 1;')])
  const pre = harness.env.element('div', { 'data-textpreview-url': 'dsh-resource://file/session/s1/src%2Fa.ts' }, [line])
  const lineText = line.childNodes[0]
  harness.env.setRangeRoot(pre)
  const fileRange = harness.env.document.createRange().setStart(lineText, 4).setEnd(lineText, 9)

  const fileSource = captureSource(fileRange)
  assert.equal(fileSource.kind, 'file')
  assert.equal(fileSource.path, 'src/a.ts', '路径必须从 data-textpreview-url 解出来')
  assert.equal(fileSource.lineStart, 12)
  assert.equal(fileSource.charStart, 4)
  assert.equal(fileSource.charEnd, 9)
})

test('未提交批注按会话暂存：切走再切回仍在，附件重新挂上', async () => {
  const harness = makeHarness()
  const internals = harness.debug._internals
  internals.adoptSession('s1')
  harness.debug.add({ quote: '第一句', note: '草稿一', source: { kind: 'dom' } })
  assert.equal(harness.debug.list().length, 1)

  internals.adoptSession('s2')
  assert.equal(harness.debug.list().length, 0, '别的会话不该看到上一会话的草稿')

  internals.adoptSession('s1')
  const items = harness.debug.list()
  assert.equal(items.length, 1, '切回来要恢复草稿')
  assert.equal(items[0].quote, '第一句')
  assert.equal(items[0].note, '草稿一')
  await settle()
  assert.ok(harness.uploads.length >= 1, '恢复后的批注要重新挂上附件')
})

test('草稿落进本地存储：新实例（模拟刷新）也能恢复', () => {
  const storage = makeMemoryStorage()
  const first = makeHarness({ localStorage: storage })
  first.debug._internals.adoptSession('s1')
  first.debug.add({ quote: '刷新前', note: '要留住', source: { kind: 'dom' } })
  assert.ok(storage.length >= 1, '保存草稿必须落进 localStorage')

  const second = makeHarness({ localStorage: storage })
  second.debug._internals.adoptSession('s1')
  const items = second.debug.list()
  assert.equal(items.length, 1, '新实例要读到同一份草稿')
  assert.equal(items[0].quote, '刷新前')
})

test('清空批注后存储里不留草稿', () => {
  const storage = makeMemoryStorage()
  const harness = makeHarness({ localStorage: storage })
  harness.debug._internals.adoptSession('s1')
  harness.debug.add({ quote: 'x', note: '', source: { kind: 'dom' } })
  assert.ok(storage.length >= 1)
  harness.debug.clear()
  assert.equal(harness.debug.list().length, 0)
  assert.equal(storage.length, 0, '清空后不该留下存储键')
})

test('已提交批注按消息锚点落台账，可从历史消息行查回', () => {
  const storage = makeMemoryStorage()
  const harness = makeHarness({ localStorage: storage })
  const internals = harness.debug._internals
  internals.adoptSession('s1')
  internals.recordSent('s1', '3:user', [{ index: 1, quote: '原文', note: '批注' }])
  const table = internals.loadSent('s1')
  assert.equal(table.size, 1)
  assert.equal(table.get('3:user').items[0].note, '批注')
  assert.ok(storage.length >= 1, '已提交台账要落进 localStorage')
})

test('台账记录轮次号：读取时保留，渲染按轮次定位', () => {
  const harness = makeHarness()
  const internals = harness.debug._internals
  internals.adoptSession('s1')
  internals.recordSent('s1', '3:user', [{ index: 1, quote: '原文', note: '批注' }], 57)
  assert.equal(internals.loadSent('s1').get('3:user').turn, 57)
})

test('轮次进行中：已发送卡紧跟批注消息，落在过程区块上方', () => {
  const harness = makeHarness()
  const internals = harness.debug._internals
  internals.adoptSession('s1')
  const column = harness.env.element('div')
  harness.env.document.body.appendChild(column)
  const userRow = harness.env.element('div')
  userRow.setAttribute('data-chat-flow-kind', 'user')
  userRow.setAttribute('data-chat-anchor-key', '4:user')
  const process = harness.env.element('div')
  process.setAttribute('data-chat-flow-kind', 'turn-process')
  const running = harness.env.element('div')
  running.setAttribute('data-chat-running', 'true')
  column.append(userRow, process, running)
  // 轮次进行中还没有「已完成」尾行：位置只由消息行决定。
  const anchor = internals.sentCardAnchor(userRow)
  assert.equal(anchor.parent, column, '卡片挂到消息所在列')
  assert.equal(anchor.before, process, '插在过程区块之前')
  assert.equal(userRow.nextElementSibling, process, '未插入前消息紧接着过程区块')
})

test('轮次进行中（还没有已完成按钮）：卡片仍落在过程区块上方', () => {
  const harness = makeHarness()
  const internals = harness.debug._internals
  const column = harness.env.element('div')
  harness.env.document.body.appendChild(column)
  const user = harness.env.element('div')
  user.setAttribute('data-chat-turn', '9')
  user.setAttribute('data-chat-flow-kind', 'user')
  const process = harness.env.element('div')
  process.setAttribute('data-chat-turn', '9')
  process.setAttribute('data-chat-flow-kind', 'assistant-step')
  const inner = harness.env.element('div')
  inner.setAttribute('data-chat-anchor-key', '9:assistant-step1:4')
  process.appendChild(inner)
  column.append(user, process)
  const anchor = internals.sentCardAnchor(inner)
  assert.equal(anchor.parent, column, '卡片挂到列上')
  assert.equal(anchor.before, process, '卡片在过程区块上方，不在它下面')
  assert.equal(internals.turnOfRow(inner), 9, '进行中的轮次也能读到轮次号')
})

test('0.2.2 结构：按钮内联在消息体里，卡片仍插到该轮上方', () => {
  const harness = makeHarness()
  const internals = harness.debug._internals
  const column = harness.env.element('div')
  harness.env.document.body.appendChild(column)
  const item = harness.env.element('div')
  item.setAttribute('data-chat-turn', '7')
  item.setAttribute('data-chat-flow-kind', 'assistant-step')
  const button = harness.env.element('button')
  button.setAttribute('data-turn-process', '7')
  const inner = harness.env.element('div')
  inner.setAttribute('data-chat-anchor-key', '9:assistant-step2:4')
  item.append(button, inner)
  column.appendChild(item)
  const anchor = internals.sentCardAnchor(inner)
  assert.equal(anchor.parent, column, '卡片挂到列上')
  assert.equal(anchor.before, item, '卡片插在整条消息之前，不会落进消息体内')
  assert.equal(internals.turnOfRow(inner), 7, '轮次直接读 data-chat-turn')
})

test('批注落在过程块内部：卡片仍贴在该轮上方，并记下轮次', () => {
  const harness = makeHarness()
  const internals = harness.debug._internals
  const column = harness.env.element('div')
  harness.env.document.body.appendChild(column)
  const block = harness.env.element('div')
  block.setAttribute('data-chat-flow-kind', 'turn-process')
  const button = harness.env.element('button')
  button.setAttribute('data-turn-process', '7')
  const inner = harness.env.element('div')
  inner.setAttribute('data-chat-anchor-key', '9:assistant-step2:4')
  block.append(button, inner)
  column.appendChild(block)
  const anchor = internals.sentCardAnchor(inner)
  assert.equal(anchor.parent, column, '卡片挂到轮次块所在的列')
  assert.equal(anchor.before, block, '卡片贴在整轮的上方，不会落进过程块里')
  assert.equal(internals.turnOfRow(inner), 7, '过程块内部的批注也要记下轮次')
})

test('已发送卡按轮次固定：消息行没加载也能放到「已完成」之前', () => {
  const harness = makeHarness()
  const internals = harness.debug._internals
  internals.adoptSession('s1')
  const column = harness.env.element('div')
  harness.env.document.body.appendChild(column)
  const footer = harness.env.element('div')
  footer.setAttribute('data-chat-flow-kind', 'turn-process')
  const button = harness.env.element('button')
  button.setAttribute('data-turn-process', '57')
  footer.appendChild(button)
  column.appendChild(footer)
  // 消息行故意不在 DOM 里：位置只由轮次号决定。
  internals.recordSent('s1', '12:turn-process57', [{ index: 1, quote: '原文', note: '批注' }], 57)
  internals.renderSentCards()
  const card = harness.env.document.querySelector('[data-sa-ui="sent"]')
  assert.ok(card !== null, '消息行不在时也要出卡片')
  assert.equal(card.getAttribute('data-sa-key'), '12:turn-process57')
  assert.equal(footer.previousElementSibling, card, '卡片固定在「已完成」之前')
})

test('逐条答复卡片：同一批注以最后一批为准，判定与理由都进卡片', () => {
  const harness = makeHarness()
  const { buildReplySection, mergeReplyBatches } = harness.debug._internals
  const merged = mergeReplyBatches([
    { at: 1, replies: [{ index: 1, verdict: 'accepted', reason: '已改' }] },
    {
      at: 2,
      replies: [
        { index: 1, verdict: 'partial', reason: '改了一半' },
        { index: 2, verdict: 'needs_info', reason: '要确认', next: '下一轮确认' },
      ],
    },
  ])
  assert.equal(merged.length, 2, '同一 index 只保留一条')
  assert.equal(merged[0].verdict, 'partial', '同一 index 以最后一批为准')
  const card = buildReplySection([{ at: 2, replies: merged }])
  assert.equal(card.getAttribute('data-sa-ui'), 'replies')
  assert.equal(card.dataset.open, '1', '答复区默认展开，点标题才收起')
  const head = card.querySelector('.sa-section-head')
  assert.ok(head !== null, '答复区用与已发送区同一个收展头')
  assert.equal(head.tagName, 'BUTTON')
  assert.equal(head.getAttribute('aria-expanded'), 'true')
  const chevron = head.querySelector('.sa-section-chevron')
  assert.equal(chevron.tagName, 'SVG', '收展图标是矢量图形')
  assert.ok(chevron.querySelector('path') !== null, '箭头由 path 画出')
  const collapse = card.querySelector('.sa-collapse')
  assert.equal(collapse.dataset.open, '1', '开合容器与收展头同步')
  const text = card.textContent
  assert.match(text, /批注答复 ×2/)
  assert.match(text, /部分采纳/)
  assert.match(text, /需要澄清/)
  assert.match(text, /改了一半/)
  assert.match(text, /下一步下一轮确认/)
  assert.ok(card.querySelector('.sa-a-next-label') !== null, '「下一步」应是标签，不是裸文本')

  // 带批注引文时，每条先给批注块（引文＋批注文字），再给答复块。
  const withContext = buildReplySection([{ at: 2, replies: merged }], [
    { index: 1, quote: '原文第一句', note: '我的批注' },
  ])
  assert.ok(withContext.querySelector('.sa-q') !== null, '引文应该渲染成批注块')
  assert.ok(withContext.querySelector('.sa-a') !== null, '判定与理由应该渲染成答复块')
  assert.match(withContext.textContent, /原文第一句/)
  assert.match(withContext.textContent, /我的批注/)
  assert.match(withContext.textContent, /批注 1/)
  assert.match(withContext.textContent, /批注 2 · 答复/)
})

test('已发送区与答复区共用同一套收展头、箭头与开合容器', () => {
  const harness = makeHarness()
  const { buildSentCard, buildReplySection } = harness.debug._internals
  const sent = buildSentCard({ items: [{ index: 1, quote: '原文', note: '批注' }] }, '3:user')
  const sentHead = sent.querySelector('.sa-section-head')
  assert.equal(sentHead.tagName, 'BUTTON', '已发送区也是整行按钮，不再是胶囊')
  assert.equal(sentHead.getAttribute('aria-expanded'), 'true', '已发送区默认展开')
  assert.equal(sent.querySelector('.sa-collapse').dataset.open, '1')
  assert.equal(sentHead.querySelector('.sa-section-chevron').tagName, 'SVG')

  const replies = buildReplySection([{ at: 1, replies: [{ index: 1, verdict: 'accepted', reason: '已改' }] }])
  const replyHead = replies.querySelector('.sa-section-head')
  assert.equal(replyHead.className, sentHead.className, '两处收展头用的是同一个类')
  assert.equal(replyHead.getAttribute('aria-expanded'), 'true', '答复区默认展开')
  assert.equal(replies.querySelector('.sa-collapse').dataset.open, '1')
  assert.equal(replies.querySelector('.sa-section-title').textContent, '批注答复 ×1')
})

test('收展同步：收「已完成」只收起答复内容，卡片与标题仍留在外面', () => {
  const harness = makeHarness()
  const { buildReplySection, syncReplyCollapse } = harness.debug._internals
  const footer = harness.env.element('div')
  footer.setAttribute('data-chat-flow-kind', 'turn-process')
  const button = harness.env.element('button')
  button.setAttribute('data-turn-process', '1')
  button.setAttribute('aria-expanded', 'false')
  footer.appendChild(button)
  harness.env.document.body.appendChild(footer)
  const card = buildReplySection([{ at: 2, replies: [{ index: 1, verdict: 'accepted', reason: '已改' }] }])
  harness.env.document.body.appendChild(card)

  syncReplyCollapse()
  assert.equal(card.querySelector('.sa-collapse').dataset.open, '0', '答复内容跟着「已完成」收起')
  assert.equal(card.querySelector('.sa-section-head').getAttribute('aria-expanded'), 'false')
  assert.equal(card.getAttribute('data-sa-ui'), 'replies', '卡片本身没有被隐藏')

  button.setAttribute('aria-expanded', 'true')
  syncReplyCollapse()
  assert.equal(card.querySelector('.sa-collapse').dataset.open, '1', '「已完成」展开后答复内容跟着展开')
  assert.equal(card.querySelector('.sa-section-head').getAttribute('aria-expanded'), 'true')

  // 用户手动收起答复区之后，同一次「已完成」状态的重绘不应把它改回去
  const manualHead = card.querySelector('.sa-section-head')
  const manualWrap = card.querySelector('.sa-collapse')
  manualHead.setAttribute('aria-expanded', 'false')
  manualWrap.dataset.open = '0'
  syncReplyCollapse()
  assert.equal(manualWrap.dataset.open, '0', '同一状态不重复套用，答复区可以自己收')
})

test('批注可以带图片：图片草稿与 JSON 一起挂上，只等 JSON 的上传', async () => {  const harness = makeHarness()
  const image = new File([new Uint8Array([1, 2, 3])], 'shot.png', { type: 'image/png' })
  harness.debug.add({
    quote: '选中的原文',
    note: '看这张图',
    images: [{ id: 'i1', file: image, name: 'shot.png' }],
    source: { kind: 'dom' },
  })
  await settle()

  assert.equal(harness.uploads.length, 2, '批注 JSON 与图片各一个草稿')
  assert.equal(harness.uploads[0].file.name, '批注.json')
  assert.equal(harness.uploads[1].file.name, 'shot.png')

  const payload = await payloadOf(harness.uploads[0])
  assert.deepEqual(payload.annotations[0].images, [{ order: 1, name: 'shot.png' }], '图片要带 1 基顺序')
})

test('多条批注的图片顺序按批注顺序连续编号', () => {
  const harness = makeHarness()
  const { buildPayload } = harness.debug._internals
  const image = (name) => ({ id: name, file: { size: 1 }, name })
  const payload = JSON.parse(
    buildPayload([
      { number: 1, quote: 'a', note: '', images: [image('one.png')], source: { kind: 'dom' } },
      { number: 2, quote: 'b', note: '', source: { kind: 'dom' } },
      { number: 3, quote: 'c', note: '', images: [image('two.png'), image('three.png')], source: { kind: 'dom' } },
    ]),
  )
  assert.deepEqual(payload.annotations[0].images, [{ order: 1, name: 'one.png' }])
  assert.equal(payload.annotations[1].images, undefined, '没有图片的批注不带 images 字段')
  assert.deepEqual(payload.annotations[2].images, [
    { order: 2, name: 'two.png' },
    { order: 3, name: 'three.png' },
  ])
})

test('图片以 data URL 落进本地存储，恢复后仍是可发送的文件', () => {  const storage = makeMemoryStorage()
  const dataUrl = `data:image/jpeg;base64,${Buffer.from('fake-jpeg-bytes').toString('base64')}`

  const first = makeHarness({ localStorage: storage })
  first.debug._internals.adoptSession('s1')
  first.debug.add({
    quote: '带图的一条',
    note: '说明',
    images: [{ id: 'i1', name: 'shot.jpg', dataUrl, url: dataUrl, bytes: 15 }],
    source: { kind: 'dom' },
  })
  assert.ok(storage.length >= 1, '带图的草稿也要落进本地存储')

  const second = makeHarness({ localStorage: storage })
  second.debug._internals.adoptSession('s1')
  const restored = second.debug._internals.loadDraft('s1')
  assert.equal(restored.length, 1)
  assert.equal(restored[0].images.length, 1, '恢复后图片还在')
  assert.equal(restored[0].images[0].name, 'shot.jpg')
  assert.ok(restored[0].images[0].file instanceof File, '恢复的图片要重新构造成文件，才能随消息发出')
  assert.equal(restored[0].images[0].file.type, 'image/jpeg')
})

test('点框外丢弃空批注：只有新划且没有文字、没有图片才丢', () => {
  const harness = makeHarness()
  const { shouldDiscardEmpty } = harness.debug._internals
  assert.equal(shouldDiscardEmpty('create', '', []), true, '什么都没写的新批注应当丢弃')
  assert.equal(shouldDiscardEmpty('create', '   ', []), true, '只有空白也算没写')
  assert.equal(shouldDiscardEmpty('create', '有内容', []), false)
  assert.equal(shouldDiscardEmpty('create', '', [{ id: 'i1' }]), false, '只加了图也算有内容')
  assert.equal(shouldDiscardEmpty('edit', '', []), false, '编辑既有批注时清空文字属于合法修改')
})

test('图片设置默认开启压缩：JPEG 80%、最短边超过 100 像素才压', () => {
  const harness = makeHarness()
  const settings = harness.debug._internals.loadImageSettings()
  assert.equal(settings.compress, true)
  assert.equal(settings.quality, 0.8)
  assert.equal(settings.minSize, 100)
})

test('正文选区上右键：接管系统菜单，弹出「批注 / 复制」', () => {
  const harness = makeHarness()
  const root = harness.env.element('p')
  harness.env.document.body.appendChild(root)
  const text = harness.env.node('右键点在这段文字上')
  root.appendChild(text)
  harness.env.setRangeRoot(root)
  const range = harness.env.document.createRange()
  range.setStart(text, 2)
  range.setEnd(text, 6)
  harness.env.window.getSelection = () => ({
    rangeCount: 1,
    isCollapsed: false,
    getRangeAt: () => range,
    removeAllRanges() {},
  })
  const menu = harness.env.document.body.querySelector('[data-sa-ui="menu"]')
  assert.ok(menu !== null, '右键菜单节点要挂在 body 上')
  assert.equal(menu.dataset.open, '0', '初始不显示')

  let prevented = false
  harness.env.listeners.get('contextmenu')({
    target: text,
    clientX: 120,
    clientY: 240,
    preventDefault() {
      prevented = true
    },
    stopPropagation() {},
  })

  assert.equal(prevented, true, '选区上的右键应由插件接管')
  assert.equal(menu.dataset.open, '1', '菜单要打开')
  assert.deepEqual(
    menu.childNodes.map((child) => child.textContent),
    ['为划选部分批注反馈', '为划选部分批注采纳', '复制'],
  )
  assert.equal(menu.style.left, '120px', '菜单贴着右键位置出现')
})

test('工具条放在选区下方，与上方的原生「引用文本」按钮错开', (t) => {
  const harness = makeHarness()
  const internals = harness.debug._internals
  if (typeof internals.placeToolbar !== 'function') {
    t.skip('旧构建没有这个内部函数')
    return
  }
  const toolbar = harness.env.document.body.querySelector('.sa-toolbar')
  assert.ok(toolbar !== null, '工具条要挂在 body 上')
  assert.deepEqual(
    toolbar.childNodes.map((child) => child.textContent),
    ['批注采纳', '批注反馈'],
    '选区上的两个按钮：左边采纳，右边反馈',
  )
  toolbar.offsetWidth = 80
  toolbar.offsetHeight = 30

  const rect = { left: 600, top: 400, right: 700, bottom: 420, width: 100, height: 20 }
  internals.placeToolbar(toolbar, rect)
  assert.equal(toolbar.style.left, '610px', '水平居中在选区')
  assert.equal(toolbar.style.top, '428px', '落在选区下方 8px（420 + 8）')

  // 贴到视口底部时仍留在下方，只做边界收拢，不翻回上方去压原生按钮。
  internals.placeToolbar(toolbar, { left: 600, top: 740, right: 700, bottom: 760, width: 100, height: 20 })
  assert.equal(toolbar.style.top, '762px', '收拢到视口内（800 - 30 - 8）')
})

test('没有选区时右键：不接管，系统菜单原样出现', () => {
  const harness = makeHarness()
  let prevented = false
  harness.env.listeners.get('contextmenu')({
    target: harness.env.element('div'),
    clientX: 10,
    clientY: 10,
    preventDefault() {
      prevented = true
    },
    stopPropagation() {},
  })
  assert.equal(prevented, false)
  const menu = harness.env.document.body.querySelector('[data-sa-ui="menu"]')
  assert.equal(menu.dataset.open, '0')
})

test('locale：中英词典注册给 DSH 语言服务，默认仍按中文出文案', () => {
  const harness = makeHarness()
  assert.ok(harness.mod.inject.includes('locale'), '声明 locale 才能拿到 ctx.locale')
  assert.equal(harness.localeDictionaries.length, 1, '只注册一个命名空间')
  const { namespace, dictionaries } = harness.localeDictionaries[0]
  assert.equal(namespace, 'selection-annotations')
  assert.equal(dictionaries.zh.annotate, '批注反馈')
  assert.equal(dictionaries.zh['annotate.adopt'], '批注采纳')
  assert.equal(dictionaries.zh['replies.title'], '批注答复 ×{n}')
  assert.equal(dictionaries.en.annotate, 'Feedback')
  assert.equal(dictionaries.en['annotate.adopt'], 'Adopt')
  assert.equal(dictionaries.en['replies.title'], 'Annotation replies ×{n}')
  const payload = JSON.parse(harness.debug.payload())
  assert.ok(payload.instruction.startsWith('这是用户发来的批注数据块'), '默认语言下指令仍是中文')
})

test('locale：切到英文后按钮与指令一起换，切回中文恢复', () => {
  const harness = makeHarness()
  const component = harness.registrations.find((registration) => registration.opts.name === 'conversation.input.right').Component
  assert.equal(component({ sessionId: 's1' }).children[0], '批注')

  harness.locale.setActive('en')
  const english = JSON.parse(harness.debug.payload())
  assert.ok(english.instruction.startsWith('This is an annotation payload sent by the user'), '指令跟着切成英文')
  assert.equal(component({ sessionId: 's1' }).children[0], 'Annotate', '按钮文案跟着切成英文')

  harness.locale.setActive('zh')
  const chinese = JSON.parse(harness.debug.payload())
  assert.ok(chinese.instruction.startsWith('这是用户发来的批注数据块'), '切回中文后指令恢复')
  assert.equal(component({ sessionId: 's1' }).children[0], '批注')
})
