/**
 * 宿主半边冒烟测试：验证「摘掉批注 JSON 块 + 追加独立 JSON 消息」的确切行为。
 * 运行：node --import ./test/loader.mjs --test test/*.test.mjs
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { apply } from '../lib/index.js'

const FILE_NAME = '批注.json'

const PAYLOAD = {
  kind: 'dsh-selection-annotations',
  version: 1,
  instruction: '这是用户随上一条消息附加的批注数据块……',
  count: 1,
  annotations: [
    {
      index: 1,
      quote: '设计要点',
      note: '这里有歧义',
      source: { kind: 'file', path: 'a.ts', lineStart: 3, lineEnd: 4, charStart: 10, charEnd: 14 },
    },
  ],
}
const REPORT = JSON.stringify(PAYLOAD, null, 2)

/** 组装一个只提供 pre-step 事件与假附件服务的 ctx。 */
function makeCtx(files, config, { tools = true } = {}) {
  let preStep
  const ctx = {
    on(name, handler) {
      if (name === 'agent/pre-step') preStep = handler
    },
    get(key) {
      if (key !== 'attachments') return undefined
      return {
        async *readFileStream(ref) {
          const text = files[ref.attachmentId]
          if (text === undefined) throw new Error(`no such attachment: ${ref.attachmentId}`)
          yield new TextEncoder().encode(text)
        },
      }
    },
  }
  // 真实宿主一定提供 tools；给夹具补一个最小实现，避免「未注册」告警污染其它用例的输出。
  if (tools) ctx.tools = { register: () => () => {} }
  apply(ctx, config)
  assert.ok(typeof preStep === 'function', 'apply 必须注册 agent/pre-step')
  return preStep
}

/** 用给定的 messages 跑一次 pre-step。 */
async function run(messages, files = {}, config = undefined) {
  const preStep = makeCtx(files, config)
  const next = async () => ({ kind: 'enter', messages })
  return preStep({ signal: undefined }, next)
}

const fileBlock = (attachmentId, name = FILE_NAME) => ({ type: 'file', attachment: { attachmentId, name, bytes: 100 } })
const userMessage = (content) => ({ id: 'm1', role: 'user', content, source: { kind: 'user', rpcId: 'r1' } })

test('正文 + 批注 JSON 块 → 正文单独一条，批注另起一条独立消息', async () => {
  const decision = await run([userMessage([{ type: 'text', text: '这段为什么这么写？' }, fileBlock('a1')])], { a1: REPORT })

  assert.equal(decision.kind, 'enter')
  assert.equal(decision.messages.length, 2)

  const [direct, sidecar] = decision.messages
  assert.deepEqual(direct.content, [{ type: 'text', text: '这段为什么这么写？' }])
  assert.equal(direct.source.kind, 'user')

  assert.equal(sidecar.role, 'user')
  assert.equal(sidecar.source.kind, 'annotation')
  assert.equal(sidecar.source.count, 1)
  assert.equal(sidecar.content.length, 1)
  assert.notEqual(sidecar.id, direct.id, '独立消息必须有自己的 id')

  // 独立消息的正文必须就是那份 JSON 数据块本身。
  const forwarded = JSON.parse(sidecar.content[0].text)
  assert.equal(forwarded.kind, 'dsh-selection-annotations')
  assert.equal(forwarded.annotations[0].quote, '设计要点')
  assert.equal(forwarded.annotations[0].source.lineStart, 3)
  assert.equal(forwarded.annotations[0].source.charStart, 10)
  assert.equal(forwarded.annotations[0].source.charEnd, 14)
})

test('没有批注附件时原样放行（同一个对象，不做无谓复制）', async () => {
  const message = userMessage([{ type: 'text', text: '你好' }])
  const decision = await run([message])
  assert.equal(decision.messages.length, 1)
  assert.equal(decision.messages[0], message)
})

test('同名但不是批注负载的文件不得被误摘', async () => {
  const message = userMessage([{ type: 'text', text: '看下附件' }, fileBlock('a2')])
  const decision = await run([message], { a2: '{"hello":"world"}' })

  assert.equal(decision.messages.length, 1)
  assert.equal(decision.messages[0], message, '整条消息应原样保留')
  assert.equal(decision.messages[0].content.length, 2, '文件块必须还在')
})

test('非 JSON 内容（哪怕扩展名是 .json）不得被误摘', async () => {
  const message = userMessage([{ type: 'text', text: 'q' }, fileBlock('a3')])
  const decision = await run([message], { a3: '{"kind":"something-else","annotations":[]}' })
  assert.equal(decision.messages.length, 1)
  assert.equal(decision.messages[0], message)
})

test('文件名被改过也能按内容认领（认领依据是 JSON，不是文件名）', async () => {
  const decision = await run(
    [userMessage([{ type: 'text', text: 'q' }, fileBlock('a4', 'renamed-payload.json')])],
    { a4: REPORT },
  )
  assert.equal(decision.messages.length, 2)
  assert.equal(decision.messages[1].source.kind, 'annotation')
})

test('扩展名不是 .json 时不做候选，不读取也不认领', async () => {
  const message = userMessage([{ type: 'text', text: 'q' }, fileBlock('a5', '批注.txt')])
  const decision = await run([message], { a5: REPORT })
  assert.equal(decision.messages.length, 1)
  assert.equal(decision.messages[0], message)
})

test('附件读取失败时降级为不认领，不抛错', async () => {
  const message = userMessage([{ type: 'text', text: '你好' }, fileBlock('missing')])
  const decision = await run([message], {})
  assert.equal(decision.messages.length, 1)
  assert.equal(decision.messages[0], message)
})

test('只有批注附件、没有正文时，丢弃空壳消息只留批注消息', async () => {
  const decision = await run([userMessage([fileBlock('a6')])], { a6: REPORT })
  assert.equal(decision.messages.length, 1)
  assert.equal(decision.messages[0].source.kind, 'annotation')
})

test('非 user 来源的消息不被处理（防止处理我们自己追加的批注消息）', async () => {
  const message = { id: 'x', role: 'user', content: [{ type: 'text', text: 'r' }, fileBlock('a1')], source: { kind: 'annotation' } }
  const decision = await run([message], { a1: REPORT })
  assert.equal(decision.messages.length, 1)
  assert.equal(decision.messages[0], message)
})

test('同一份批注块被挂了两遍时只算一份（附件被 restore 回去又挂一次）', async () => {
  const decision = await run(
    [userMessage([{ type: 'text', text: 'q' }, fileBlock('a1'), fileBlock('a2')])],
    { a1: REPORT, a2: REPORT },
  )
  assert.equal(decision.messages.length, 2, '正文一条 + 批注一条，不该多出第二条批注')
  const forwarded = JSON.parse(decision.messages[1].content[0].text)
  assert.equal(forwarded.count, 1, '两份一模一样的内容只保留一份')
})

test('多个批注附件会被合并成一份数据块，index 重新连续', async () => {
  const second = JSON.stringify({ ...PAYLOAD, count: 1, annotations: [{ ...PAYLOAD.annotations[0], index: 1, quote: '第二处' }] })
  const decision = await run(
    [userMessage([{ type: 'text', text: 'q' }, fileBlock('a1'), fileBlock('a2')])],
    { a1: REPORT, a2: second },
  )
  assert.equal(decision.messages.length, 2)
  const forwarded = JSON.parse(decision.messages[1].content[0].text)
  assert.equal(forwarded.count, 2)
  assert.deepEqual(
    forwarded.annotations.map((item) => item.index),
    [1, 2],
  )
  assert.equal(forwarded.annotations[1].quote, '第二处')
})

test('下游 reject 决策原样透传', async () => {
  const preStep = makeCtx({})
  const decision = await preStep({ signal: undefined }, async () => ({ kind: 'reject' }))
  assert.deepEqual(decision, { kind: 'reject' })
})

test('Config：超过 maxPayloadBytes 的负载视为无效，整条消息原样放行', async () => {
  const big = JSON.stringify({ ...PAYLOAD, annotations: [{ ...PAYLOAD.annotations[0], note: 'x'.repeat(4000) }] })
  const message = userMessage([{ type: 'text', text: 'q' }, fileBlock('a1')])
  const decision = await run([message], { a1: big }, { maxPayloadBytes: 1024 })
  assert.equal(decision.messages.length, 1, '超限不该伪造出批注消息')
  assert.equal(decision.messages[0], message, '文件块也不该被摘掉')
})

test('Config：非法 maxPayloadBytes 回落到默认值而不是报错', async () => {
  const message = userMessage([{ type: 'text', text: 'q' }, fileBlock('a1')])
  const decision = await run([message], { a1: REPORT }, { maxPayloadBytes: -5 })
  assert.equal(decision.messages.length, 2, '回落默认上限后应当正常认领')
})

let reminderSessionSeq = 0

/** 组装一个带 systemPrompt、会话事件与 turn-stopping 的 ctx。 */
function makeReminderCtx(options = {}) {
  const handlers = new Map()
  const sections = []
  const steered = []
  const agent = {
    session: { id: `session-reminder-${++reminderSessionSeq}`, header: {}, ...(options.log === undefined ? {} : { log: options.log }) },
    steer(message) {
      steered.push(message)
    },
  }
  const ctx = {
    on(name, handler) {
      handlers.set(name, handler)
    },
    get() {
      return undefined
    },
    inject() {
      throw new Error('no async services in this fake ctx')
    },
    systemPrompt: {
      getSectionOrder(name) {
        assert.equal(name, 'STRUCTURED_OUTPUT')
        return 9900
      },
      section(section) {
        sections.push(section)
        return () => {}
      },
    },
    // 真实宿主一定有 tools；补个最小实现，免得「未注册」告警混进这些用例的输出。
    tools: { register: () => () => {} },
  }
  apply(ctx, undefined)
  return {
    sections,
    steered,
    emit(type, data) {
      handlers.get('session/event')(agent.session, { type, data })
    },
    stop(turn) {
      handlers.get('agent/turn-stopping')({ agent, turn, signal: { aborted: false } })
    },
  }
}

test('常驻系统说明：注册到 STRUCTURED_OUTPUT 序位，要求调用 annotation_replies', () => {
  const { sections } = makeReminderCtx()
  assert.equal(sections.length, 1)
  assert.equal(sections[0].name, 'selection-annotations:replies')
  assert.equal(sections[0].order, 9900)
  assert.match(sections[0].text, /annotation_replies/)
})

test('回合结束检查：收到批注却没调用工具时补一条提醒，同一回合只提醒一次', () => {
  const { steered, emit, stop } = makeReminderCtx()
  emit('turn/start', { turn: 3 })
  emit('user/message', { source: { kind: 'annotation' } })
  stop(3)
  assert.equal(steered.length, 1)
  assert.equal(steered[0].role, 'user')
  assert.match(steered[0].content[0].text, /annotation_replies/)
  assert.equal(steered[0].source.kind, 'plugin:dsh-selection-annotations')
  assert.equal(steered[0].source.form, 'notice')
  stop(3)
  assert.equal(steered.length, 1)
})

test('回合结束检查：调用了 annotation_replies 就不再提醒', () => {
  const { steered, emit, stop } = makeReminderCtx()
  emit('turn/start', { turn: 4 })
  emit('user/message', { source: { kind: 'annotation' } })
  emit('tool/call', { name: 'annotation_replies', turn: 4 })
  stop(4)
  assert.equal(steered.length, 0)
})

test('回合结束检查：这一轮没有批注时不提醒', () => {
  const { steered, emit, stop } = makeReminderCtx()
  emit('turn/start', { turn: 5 })
  stop(5)
  assert.equal(steered.length, 0)
})

test('回合结束检查：DS Bot 会话不补提醒（避免并进 Bot 的答复）', () => {
  const botPrompt = {
    type: 'system/message',
    data: { message: { source: { kind: 'system-prompt' }, content: [{ type: 'text', text: '## How your Bot team works\n…' }] } },
  }
  const { steered, emit, stop } = makeReminderCtx({ log: [botPrompt] })
  emit('turn/start', { turn: 9 })
  emit('user/message', { source: { kind: 'annotation' } })
  stop(9)
  assert.equal(steered.length, 0)
})

test('annotation_replies 执行后把逐条答复写进会话落盘文件', async () => {
  const { mkdtemp, readFile: readStoreFile, rm: removeDir } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const home = await mkdtemp(join(tmpdir(), 'sa-replies-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    let definition
    const ctx = {
      on() {},
      get() {
        return undefined
      },
      inject() {
        throw new Error('no async services in this fake ctx')
      },
      tools: {
        register(value) {
          definition = value
          return () => {}
        },
      },
    }
    apply(ctx, undefined)
    assert.ok(definition, '必须注册 annotation_replies')
    const sessionId = 'session-11111111-2222-3333-4444-555555555555'
    const value = await definition.execute(
      {
        replies: [
          { index: 1, verdict: 'accepted', reason: '已改' },
          { index: 2, verdict: 'needs_info', reason: '要确认' },
        ],
      },
      { agent: { session: { id: sessionId } } },
    )
    assert.equal(value.accepted, 1)
    assert.equal(value.needsInfo, 1)
    const file = join(home, 'selection-annotations', 'sessions', `${sessionId}.json`)
    const stored = JSON.parse(await readStoreFile(file, 'utf8'))
    assert.equal(Array.isArray(stored.replies), true)
    assert.equal(stored.replies.length, 1)
    assert.equal(stored.replies[0].replies.length, 2)
    assert.equal(stored.replies[0].accepted, 1)
    assert.equal(stored.replies[0].needsInfo, 1)
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    await removeDir(home, { recursive: true, force: true })
  }
})

test('缺少 tools 服务时给出告警，其它接缝照常注册', (t) => {
  const warn = t.mock.method(console, 'warn', () => {})
  let preStep
  const ctx = {
    on(name, handler) {
      if (name === 'agent/pre-step') preStep = handler
    },
    get() {
      return undefined
    },
  }

  assert.doesNotThrow(() => apply(ctx, undefined))
  assert.equal(warn.mock.callCount(), 1, '缺 tools 必须恰好告警一次')
  assert.match(String(warn.mock.calls[0].arguments[0]), /annotation_replies 未注册/u)
  assert.equal(typeof preStep, 'function', 'pre-step 仍要注册：缺工具不该让插件整体失效')
})
