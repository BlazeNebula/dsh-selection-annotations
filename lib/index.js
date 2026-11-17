/**
 * dsh-selection-annotations — 宿主半边（Node / Cordis）。
 *
 * 职责只有一件事：让「批注数据块」作为**用户指令**进入模型请求，同时留一条可回看的记录。
 *
 * 客户端半边把批注集合包成一份 JSON 附件随用户消息提交，于是那条用户消息的 content
 * 形如 `[{type:'text'}, {type:'file'}]` —— 正文与批注块本来就是两个独立 content 块。
 *
 * 但 `file` 块进入模型时只会被投影成一行路径句柄（`dsh-llm` 的 `fileHandleText`），模型
 * 得自己 `read` 一次才看得到内容。所以这里在 `agent/pre-step`（官方 waterfall seam，
 * `dsh-session-reference` 的 recall 用的就是它）做三件事：
 *
 *   1. 把该 `file` 块从消息里摘掉（附件本身不再进入请求）；
 *   2. 把批注 JSON 作为额外的 text 块追加到原用户消息末尾，并保留 `source.kind: 'user'`；
 *   3. 另发一条 `source.kind: 'annotation'` 的独立消息，正文是同一份 JSON，只作记录。
 *
 * 两条通道各管一头：自动审查（@deepseek-ai/dsh-experimental-auto-review）只把
 * `source.kind === 'user'` 的文本认作 user-instruction，其余 source 一律按 fact 处理；
 * fact 只能确认事实，不能授权中等风险操作 —— 并入正文的那份负责授权。独立那条让上下文
 * 里始终留着一份可回看的批注记录，不参与授权。两条消息共用同一次认领：附件只读一次，
 * 同一条用户消息也只合并出一条，记录不会因为重复的 pre-step 再多出一份。
 *
 * 为让回合结束检查认得出这两条消息，并入的那条在 source 上写 `annotation: { version, count }`
 * 标记，独立那条的 source.kind 本身就是 'annotation'；v4 会话格式只要求 source.kind
 * 非空且不是 'plugin'，额外字段原样保留。
 *
 * 认领依据是**内容**而不是文件名：读出来的 JSON 必须带 `kind: 'dsh-selection-annotations'`。
 * 文件名只用于快速预筛，`name` 变了也能正常工作。
 *
 * 本文件刻意不 import 任何 `@deepseek-ai/*` 包：请求期消息只需要 role/content/source，
 * 自带等价实现即可，避免跨版本包解析问题。
 */
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { URL } from 'node:url'

/** 客户端给批注负载起的文件名 —— 只是预筛，不参与认领判定。 */
const ANNOTATION_FILE = '批注.json'

/** 与客户端半边共用的负载类型标记（写进 JSON 的 `kind` 字段）。 */
const PAYLOAD_KIND = 'dsh-selection-annotations'

/** 单个附件读取上限的默认值，避免异常大文件拖垮这一步。 */
const DEFAULT_MAX_PAYLOAD_BYTES = 512 * 1024

/** 合并进用户消息的批注负载版本与文本边界；边界同时给客户端规则做隐藏锚点。 */
const ANNOTATION_SOURCE_VERSION = 1
const ANNOTATION_TEXT_PREFIX = '\n\n'

/** 常驻系统说明的段名与正文：让「必须逐条提交」跟着每一轮请求，而不是只藏在批注 JSON 里。 */
const REPLY_SECTION_NAME = 'selection-annotations:replies'
const REPLY_SECTION_TEXT =
  '收到批注数据块（kind 为 dsh-selection-annotations 的消息）时，必须逐条答复：' +
  '在结束这一轮之前调用 annotation_replies 工具，replies 的每一项对应 annotations[].index，' +
  'verdict 取 accepted / partial / rejected / needs_info，reason 写清判定理由。' +
  '正文只写整体说明或需要澄清的问题，不要只在正文里复述逐条内容。' +
  '当前环境没有 annotation_replies 工具时，在正文里说明原因，不要静默跳过。'

/** 回合结束检查保留多少个会话的瞬时状态。 */
const TURN_STATE_LIMIT = 100

/** 会话记录的落盘路由前缀；后面接会话 id。 */
const STORE_ROUTE = '/selection-annotations/session'

/** 会话 id 白名单：只允许规范形状，避免路径穿越。 */
const STORE_SAFE_ID = /^session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** 单个会话记录的上限；客户端已经按 3.5 MB 裁剪，这里留出余量。 */
const STORE_MAX_BYTES = 8 * 1024 * 1024

/** 保留多少个会话的记录文件；超出按修改时间淘汰最旧的。 */
const STORE_MAX_SESSIONS = 30

/** 单个会话保留多少批逐条答复；每批都带完整理由，控制上限避免文件无限增长。 */
const STORE_MAX_REPLY_BATCHES = 200

/** 记录根目录：与 DSH 的会话目录平级，一个插件一个目录。 */
function storeRoot() {
  const home = process.env.DSH_HOME
  const base = typeof home === 'string' && home !== '' ? home : join(homedir(), '.dsh')
  return join(base, 'selection-annotations', 'sessions')
}

export const name = 'selection-annotations'

// 这里刻意**不**声明 `export const Config`：schema 需要 `@deepseek-ai/schemastery`，
// 而本插件是以 `link:` 装进 profile 的 —— 模块解析按插件的真实路径（工作区）进行，
// 工作区没有 node_modules，`@deepseek-ai/*` 一律解析不到，静态导入会让整个宿主半边
// 加载失败（fiberPhase 停在 null，功能静默消失）。
// `apply(ctx, config)` 仍然照常收到 entry 的 config，所以需要在 profile patch 里写
// `config: { maxPayloadBytes: … }` 依然生效，只是没有可投影的 JSON Schema。

/** 不声明 inject：缺少附件服务时本插件仍应加载，只是退化为不做任何改写。 */
export function apply(ctx, config) {
  const maxPayloadBytes = normalizeMaxBytes(config?.maxPayloadBytes)

  // 会话记录的落盘通道：只有带 Web 服务器的宿主才注册；其它宿主安静跳过。
  registerSessionStore(ctx)

  // 逐条答复工具：模型用工具调用提交结构化答复，事件本身随会话持久化。
  registerReplyTool(ctx)

  // 规则不能只随批注数据进来：常驻说明负责「每轮都在」，回合结束检查负责「漏了有人管」。
  registerReplyInstruction(ctx)
  registerReplyWatchdog(ctx)

  ctx.on(
    'agent/pre-step',
    async ({ signal }, next) => {
      const decision = await next()
      if (decision === undefined || decision === null || decision.kind !== 'enter') return decision
      if (!Array.isArray(decision.messages)) return decision

      const messages = []
      // 本次认领到的负载，等批注正文合并完再统一补独立记录：两条通道共用这一次认领。
      const produced = []
      let changed = false

      for (const message of decision.messages) {
        const content = Array.isArray(message?.content) ? message.content : []
        const candidates = content.filter(isAnnotationBlock)

        // 只处理用户自己提交的消息；合并后的消息仍带 source.kind 'user'，不会被再次处理
        // （附件块已经被摘掉，第二轮也不再有候选）。
        if (candidates.length === 0 || message?.source?.kind !== 'user') {
          messages.push(message)
          continue
        }

        const { claimed, payloads } = await collectAnnotationBlocks(ctx, candidates, signal, maxPayloadBytes)
        if (claimed.length === 0) {
          messages.push(message)
          continue
        }

        const kept = content.filter((block) => !claimed.includes(block))
        changed = true

        const payload = mergePayloads(payloads)
        if (payload === undefined) {
          // 认领了却合并不出负载：至少把附件块摘掉，避免模型只看到一行路径句柄。
          if (kept.length > 0) messages.push({ ...message, content: kept })
          continue
        }

        // 批注 JSON 以 text 块并入原消息，source 保持 kind:'user'，自动审查因此把整段
        // 文本当作本轮用户指令；模型收到的仍然只有这一条消息。
        messages.push({
          ...message,
          content: [
            ...kept,
            { type: 'text', text: ANNOTATION_TEXT_PREFIX + JSON.stringify(payload, null, 2) },
          ],
          source: {
            ...message.source,
            annotation: {
              version: ANNOTATION_SOURCE_VERSION,
              count: payload.annotations.length,
            },
          },
        })

        // 第二条通道：同一份负载另发一条独立记录，只作上下文里的回看。
        produced.push(payload)
      }

      if (!changed) return decision

      for (const payload of produced) {
        // 上一轮的输出如果又被送回这一步（请求重试、宿主回放），记录已经在批里，不再补第二条。
        if (hasAnnotationRecord(messages, annotationRecordText(payload))) continue
        messages.push(createAnnotationRecord(payload))
      }

      return { ...decision, messages }
    },
    { prepend: true },
  )
}

/* --------------------------------------------------------- 独立批注记录通道 */

/**
 * 独立记录那条消息的正文。
 *
 * 与并入原消息的那份是同一份 JSON，只是不带 ANNOTATION_TEXT_PREFIX 的前导空行 ——
 * 旧实现（014316c^）就是这么写的，保持形状不变，客户端按 `kind` 认它并折叠成占位符。
 */
function annotationRecordText(payload) {
  return JSON.stringify(payload, null, 2)
}

/**
 * 合成「独立批注记录」消息：只作上下文记录，不参与授权。
 *
 * source.kind 固定为 'annotation'，自动审查据此按 fact 处理，不会把它当成用户指令；
 * version/count 沿用旧实现的字段形状，不额外添加字段。
 */
function createAnnotationRecord(payload) {
  return {
    id: randomUUID(),
    role: 'user',
    content: [{ type: 'text', text: annotationRecordText(payload) }],
    source: {
      kind: 'annotation',
      version: ANNOTATION_SOURCE_VERSION,
      count: payload.annotations.length,
    },
  }
}

/**
 * 批里是否已经有一条内容相同的独立记录。
 *
 * pre-step 的输出会以 user/message 落进会话日志；同一批消息若被重复送进这一步，
 * 上一轮的记录会原样出现在 decision.messages 里。按正文比对即可认出它，不必再合成一条。
 */
function hasAnnotationRecord(messages, text) {
  return messages.some(
    (message) =>
      message?.source?.kind === 'annotation' &&
      Array.isArray(message.content) &&
      message.content.length === 1 &&
      message.content[0]?.type === 'text' &&
      message.content[0].text === text,
  )
}

/**
 * 注册常驻系统说明。
 *
 * 批注的处置规则此前只写在批注 JSON 的 `instruction` 字段里，而它是一条普通的用户消息：
 * 长对话被压缩后可能消失，模型也容易把「数据里的要求」当成数据。这里把它提升为系统提示段，
 * 每轮请求都会带上；没有 systemPrompt 服务的宿主安静跳过。
 */
function registerReplyInstruction(ctx) {
  const mount = (scope) => {
    let prompt
    try {
      prompt = scope.systemPrompt ?? (typeof scope.get === 'function' ? scope.get('systemPrompt') : undefined)
    } catch {
      prompt = undefined
    }
    if (prompt === undefined || prompt === null || typeof prompt.section !== 'function') return

    let order = 9900
    try {
      if (typeof prompt.getSectionOrder === 'function') order = prompt.getSectionOrder('STRUCTURED_OUTPUT')
    } catch {
      /* 旧宿主没有命名序位：退回 STRUCTURED_OUTPUT 的数值 */
    }
    if (!Number.isFinite(order)) order = 9900

    try {
      // section 返回的清理函数绑定在注入作用域上，作用域销毁时自动移除。
      prompt.section({ name: REPLY_SECTION_NAME, order, text: REPLY_SECTION_TEXT })
    } catch (error) {
      console.error('[selection-annotations] 注册常驻批注说明失败：', error)
    }
  }

  try {
    if (typeof ctx.inject === 'function') {
      ctx.inject(['systemPrompt'], mount)
      return
    }
  } catch {
    /* 落到直接注册 */
  }
  mount(ctx)
}

/** 每个会话的回合状态：批注在哪一轮送达、哪一轮提交了答复、哪一轮已提醒过。 */
const turnStates = new Map()

function stateForSession(sessionId) {
  let state = turnStates.get(sessionId)
  if (state !== undefined) return state
  state = { turn: 0, annotationTurn: 0, repliedTurn: 0, steeredTurn: 0 }
  turnStates.set(sessionId, state)
  if (turnStates.size > TURN_STATE_LIMIT) {
    const oldest = turnStates.keys().next().value
    if (oldest !== undefined) turnStates.delete(oldest)
  }
  return state
}

/**
 * 这条消息是不是「带着批注进来」的用户消息。
 *
 * 两条通道各有一种认法：并入正文的那条 source.kind 仍是 'user'，靠 source.annotation
 * 标记区分；独立记录那条 source.kind 直接是 'annotation'。标记在会话格式 v4 里只是额外
 * 字段，会被原样保留。
 */
function isAnnotationCarryingMessage(message) {
  const source = message?.source
  if (source === null || typeof source !== 'object') return false
  if (source.kind === 'annotation') return true
  const annotation = source.annotation
  return (
    source.kind === 'user' &&
    annotation !== null &&
    typeof annotation === 'object' &&
    annotation.version === ANNOTATION_SOURCE_VERSION
  )
}

/**
 * 回合结束检查：这一轮收到了批注、却没有调用 annotation_replies，就在同一轮补一条提醒。
 *
 * 与 genui 的围栏纠正使用同一个接缝：在 agent/turn-stopping 里调 agent.steer，消息进入
 * 下一步的收件箱，回合不会就此结束。每个回合最多提醒一次，避免模型持续不调用时反复追问。
 */
function registerReplyWatchdog(ctx) {
  ctx.on('session/event', (session, event) => {
    const sessionId = session?.id
    if (typeof sessionId !== 'string' || sessionId === '') return
    const state = stateForSession(sessionId)
    const type = event?.type
    const data = event?.data
    if (type === 'turn/start' && Number.isSafeInteger(data?.turn)) state.turn = data.turn
    if (type === 'user/message' && isAnnotationCarryingMessage(data)) state.annotationTurn = state.turn
    if (type === 'tool/call' && data?.name === 'annotation_replies') {
      state.repliedTurn = Number.isSafeInteger(data?.turn) ? data.turn : state.turn
    }
    if (type === 'user/message' && data?.source?.kind === 'dsh-rewind') {
      recordRewind(sessionId, data?.turn).catch(() => {})
    }
    if (isBotPromptEvent(event)) rememberBotSession(sessionId)
  })

  ctx.on('agent/turn-stopping', ({ agent, turn, signal }) => {
    if (signal?.aborted === true) return
    // 子代理不处理用户批注，避免为内部回合补提醒。
    if (agent?.session?.header?.parentSession !== undefined) return
    // DS Bot 的会话在回合收尾时要交付这条回复；此时 steer 会把提醒并进同一条答复，
    // 让 Bot 多出一段不该出现的正文，所以 Bot 会话不补提醒（系统说明仍然生效）。
    if (isBotSession(agent?.session)) return
    const sessionId = agent?.session?.id
    if (typeof sessionId !== 'string' || sessionId === '') return
    const state = turnStates.get(sessionId)
    if (state === undefined) return
    if (state.annotationTurn !== turn || state.repliedTurn === turn || state.steeredTurn === turn) return
    state.steeredTurn = turn
    try {
      agent.steer(createReminderMessage())
    } catch (error) {
      console.error('[selection-annotations] 批注答复提醒发送失败：', error)
    }
  })
}

/** DS Bot 的系统说明里才有的固定标记；只用来识别会话归属，不读取用户的聊天内容。 */
const BOT_PROMPT_MARKERS = ['How your Bot team works', 'Group chat']

/** 会话 id -> 是否 DS Bot 会话。会话的 system/message 不变，识别一次即可。 */
const botSessions = new Map()

function rememberBotSession(sessionId) {
  if (botSessions.has(sessionId)) return
  botSessions.set(sessionId, true)
  if (botSessions.size > TURN_STATE_LIMIT) {
    const oldest = botSessions.keys().next().value
    if (oldest !== undefined) botSessions.delete(oldest)
  }
}

function textOfContent(content) {
  if (!Array.isArray(content)) return ''
  let text = ''
  for (const block of content) {
    if (block?.type === 'text' && typeof block.text === 'string') text += block.text
  }
  return text
}

function isBotPromptEvent(event) {
  if (event?.type !== 'system/message') return false
  if (event?.data?.message?.source?.kind !== 'system-prompt') return false
  const text = textOfContent(event.data.message.content)
  return BOT_PROMPT_MARKERS.some((marker) => text.includes(marker))
}

/** 会话日志里有过 DS Bot 的系统说明，就认作 Bot 会话；日志不可读时按普通会话处理。 */
function isBotSession(session) {
  const sessionId = session?.id
  if (typeof sessionId !== 'string' || sessionId === '') return false
  if (botSessions.has(sessionId)) return true
  const log = session?.log
  if (!Array.isArray(log)) return false
  for (const event of log) {
    if (isBotPromptEvent(event)) {
      rememberBotSession(sessionId)
      return true
    }
  }
  return false
}

/** 提醒消息：以插件通知的身份插入，不伪装成用户原话。 */
function createReminderMessage() {
  return {
    id: randomUUID(),
    role: 'user',
    content: [
      {
        type: 'text',
        text:
          '你还没有提交这批批注的逐条答复。请先调用 annotation_replies 工具提交 replies' +
          '（index 与批注编号一一对应），再结束这一轮；正文不必重复逐条内容。',
      },
    ],
    // v4 会话格式只接受「生产者自己的」source kind：v3 的 kind:'plugin' 会被拒绝，
    // 插件消息必须写成 plugin:<插件名>（与 genui 的围栏纠正消息同一个形状）。
    source: { kind: 'plugin:dsh-selection-annotations', form: 'notice', summary: '批注答复提醒' },
  }
}

/**
 * 该 content 块是不是候选批注负载。
 * 只做便宜的预筛（类型 + 文件名后缀），真正的认领在 {@link parsePayload} 里按内容判定。
 */
function isAnnotationBlock(block) {
  if (block === null || typeof block !== 'object' || block.type !== 'file') return false
  const attachment = block.attachment
  if (attachment === null || typeof attachment !== 'object') return false
  if (typeof attachment.name !== 'string') return false
  return attachment.name === ANNOTATION_FILE || attachment.name.toLowerCase().endsWith('.json')
}

/**
 * 逐个读取候选附件，只认领内容确实是本插件负载的那些。
 * 任何读取或解析失败都降级为「不认领」，绝不中断这一轮。
 * @returns 认领的块（按原顺序）与解析出来的负载。
 */
async function collectAnnotationBlocks(ctx, blocks, signal, maxPayloadBytes) {
  const claimed = []
  const payloads = []
  for (const block of blocks) {
    if (signal?.aborted === true) break
    const text = await readAttachmentText(ctx, block.attachment, maxPayloadBytes)
    const payload = parsePayload(text)
    if (payload === undefined) continue
    claimed.push(block)
    payloads.push(payload)
  }
  return { claimed, payloads }
}

/** 认领的唯一依据：能解析成对象、`kind` 对得上、`annotations` 是数组。 */
function parsePayload(text) {
  if (typeof text !== 'string' || text.trim() === '') return undefined
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return undefined
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
  if (parsed.kind !== PAYLOAD_KIND) return undefined
  if (!Array.isArray(parsed.annotations)) return undefined
  return parsed
}

/**
 * 合并多份负载为一份数据块，并把 `index` 重新编号成 1..N。
 * 单份时原样返回，保留客户端写好的 `instruction` 等字段。
 */
function mergePayloads(payloads) {
  if (payloads.length === 0) return undefined
  if (payloads.length === 1) return payloads[0]
  // 先把内容完全相同的副本去掉：运行时可能把已经发出的附件 restore 回输入态，
  // 于是同一条消息上会挂两份一模一样的批注块 —— 那会让模型把同一批批注回复两遍。
  const seen = new Set()
  const unique = []
  for (const payload of payloads) {
    const key = JSON.stringify(payload.annotations ?? [])
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(payload)
  }
  if (unique.length === 1) return unique[0]
  const annotations = unique
    .flatMap((payload) => payload.annotations)
    .map((item, index) => ({ ...item, index: index + 1 }))
  return { ...unique[0], count: annotations.length, annotations }
}

/** 配置兜底：非法值回落到默认上限，而不是让这一步失败。 */
function normalizeMaxBytes(value) {
  return Number.isSafeInteger(value) && value >= 1024 ? value : DEFAULT_MAX_PAYLOAD_BYTES
}

/** 优先走附件服务的流式读取，退化到宿主路径直接读文件。 */
async function readAttachmentText(ctx, ref, maxPayloadBytes = DEFAULT_MAX_PAYLOAD_BYTES) {
  let attachments
  try {
    attachments = ctx.get('attachments')
  } catch {
    attachments = undefined
  }
  if (attachments === undefined || attachments === null) return undefined

  if (typeof attachments.readFileStream === 'function') {
    try {
      const chunks = []
      let total = 0
      for await (const chunk of attachments.readFileStream(ref)) {
        const bytes = Buffer.from(chunk)
        // 超限视为无效负载（不认领），而不是截断半份数据丢给模型。
        if (total + bytes.length > maxPayloadBytes) return undefined
        total += bytes.length
        chunks.push(bytes)
      }
      return Buffer.concat(chunks).toString('utf8')
    } catch {
      /* 落到宿主路径读取 */
    }
  }

  if (typeof attachments.fileHostPath === 'function') {
    try {
      return await readFile(attachments.fileHostPath(ref), 'utf8')
    } catch {
      return undefined
    }
  }

  return undefined
}

/* ------------------------------------------------------- 会话记录的落盘通道 */

/**
 * 把批注草稿与已提交台账写到 `$DSH_HOME/selection-annotations/sessions/<会话 id>.json`。
 *
 * 为什么要落盘：客户端的 localStorage 只在这一个客户端里有效，换到 web 端或清掉站点数据
 * 就什么都没有。批注和会话一样属于「本机数据」，应该跟着 DSH_HOME 走。
 *
 * 只注册一个前缀路由，读写都在插件自己的目录里；没有 Web 服务器的宿主安静跳过。
 */
function registerSessionStore(ctx) {
  /** 在拿到 webServer 的作用域里注册路由。 */
  const mount = (scope) => {
    let server
    try {
      server = scope.webServer ?? (typeof scope.get === 'function' ? scope.get('webServer') : undefined)
    } catch {
      server = undefined
    }
    if (server === undefined || server === null || typeof server.register !== 'function') return
    const route = {
      kind: 'prefix',
      path: STORE_ROUTE,
      handler: (req, res) => handleSessionStore(req, res),
    }
    const dispose = () => {
      try {
        return server.register(route)
      } catch {
        return () => {}
      }
    }
    try {
      scope.effect(dispose, 'selection-annotations: session store route')
    } catch {
      /* effect 不可用的宿主：直接注册，生命周期交给进程 */
      dispose()
    }
  }

  // webServer 是异步服务：apply 执行时通常还没就绪，必须等注入。
  try {
    if (typeof ctx.inject === 'function') {
      ctx.inject(['webServer'], mount)
      return
    }
  } catch {
    /* 落到直接注册 */
  }
  mount(ctx)
}

/**
 * 注册逐条答复工具。
 *
 * 模型的输出只有 text / reasoning / tool-call 三种块，想要「按对象逐条答复」只能走工具调用：
 * 这个工具不产生副作用，只把结构化答复作为参数记录下来。工具调用事件本身会进入会话日志，
 * 所以答复天然随 session 持久化，客户端以后可以直接从事件或投影读取并渲染。
 */
function registerReplyTool(ctx) {
  const mount = (scope) => {
    let tools
    let lookupError
    try {
      tools = scope.tools ?? (typeof scope.get === 'function' ? scope.get('tools') : undefined)
    } catch (error) {
      lookupError = error
      tools = undefined
    }
    if (tools === undefined || tools === null || typeof tools.register !== 'function') {
      // 与 webServer / systemPrompt 不同：缺了 tools 等于整条答复链路不存在。
      // 这里必须出声，否则「系统提示要求调用一个不存在的工具」只能靠翻源码才能定位。
      if (lookupError !== undefined) {
        console.warn('[selection-annotations] annotation_replies 未注册：读取 tools 服务失败', lookupError)
      } else {
        console.warn('[selection-annotations] annotation_replies 未注册：当前宿主没有可用的 tools 服务')
      }
      return
    }

    const definition = {
      name: 'annotation_replies',
      description:
        '提交对用户批注的逐条答复。处理完批注后必须调用：replies 里每一项对应一条批注，index 与批注编号一致。',
      parameters: parameterSpecToJsonSchema({
        replies: {
          type: 'array',
          required: true,
          description: '逐条答复，必须覆盖本次所有批注；同一轮有多张已发送卡时每项要带 cardKey',
          items: replySchema(),
        },
      }),
      output: {
        schema: valueSpecToJsonSchema({
          type: 'object',
          additionalProperties: false,
          properties: {
            replies: { type: 'array', required: true, items: replySchema() },
            accepted: { type: 'integer', required: true },
            partial: { type: 'integer', required: true },
            rejected: { type: 'integer', required: true },
            needsInfo: { type: 'integer', required: true },
          },
        }),
        render: (_args, value) => [
          {
            type: 'text',
            text: `已记录 ${value.replies.length} 条批注答复（采纳 ${value.accepted}、部分 ${value.partial}、不采纳 ${value.rejected}、需澄清 ${value.needsInfo}）。`,
          },
        ],
      },
      async execute(args, exec) {
        const replies = Array.isArray(args?.replies) ? args.replies : []
        const counts = { accepted: 0, partial: 0, rejected: 0, needs_info: 0 }
        for (const reply of replies) {
          if (reply !== null && typeof reply === 'object' && typeof reply.verdict === 'string') {
            if (Object.hasOwn(counts, reply.verdict)) counts[reply.verdict] += 1
          }
        }
        const value = {
          replies,
          accepted: counts.accepted,
          partial: counts.partial,
          rejected: counts.rejected,
          needsInfo: counts.needs_info,
        }
        // 工具调用只在展开的步骤里可见，客户端要一张始终可见的卡片，就得有独立的落盘数据。
        // 会话 id 从执行上下文取：有 agent 的宿主一定能拿到，拿不到就只做返回值，不落盘。
        const sessionId = sessionIdOf(exec)
        if (sessionId !== undefined) {
          try {
            await appendReplyBatch(sessionId, value)
          } catch (error) {
            console.error('[selection-annotations] 批注答复落盘失败：', error)
          }
        }
        return value
      },
    }

    let dispose
    try {
      dispose = tools.register(definition)
    } catch (error) {
      console.error('[selection-annotations] 注册 annotation_replies 工具失败：', error)
      return
    }
    if (typeof dispose === 'function') {
      try {
        // effect 的回调会被立即执行，返回的才是清理函数；直接传 dispose 会当场注销注册。
        scope.effect(() => dispose, 'selection-annotations: annotation replies tool')
        return
      } catch {
        /* effect 不可用的宿主：保留注册，生命周期交给进程 */
      }
    }
  }

  // tools 在多数宿主上是同步服务；异步宿主用注入等待就绪。
  try {
    if (typeof ctx.inject === 'function') {
      ctx.inject(['tools'], mount)
      return
    }
  } catch {
    /* 落到直接注册 */
  }
  mount(ctx)
}

/** 单条答复的 schema；parameters 与 output 各用一份，避免共享对象被编译修改。 */
function replySchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      index: { type: 'integer', required: true, description: '对应 annotations[].index' },
      cardKey: {
        type: 'string',
        description:
          '该答复所属已发送卡的键，取 payload 里 kind:"sent" 条目的 anchorKey。同一轮有多张已发送卡时必须带；不带会把答复归到该轮最后一张卡。',
      },
      verdict: {
        type: 'string',
        required: true,
        enum: ['accepted', 'partial', 'rejected', 'needs_info'],
        description: 'accepted 采纳 / partial 部分采纳 / rejected 不采纳 / needs_info 需要澄清',
      },
      reason: { type: 'string', required: true, description: '判定理由' },
      next: { type: 'string', description: '下一步打算，可省略' },
    },
  }
}

/**
 * ParameterSchemaSpec（根是隐式开放对象）转成 tools.register 要求的 JSON Schema。
 * 注册接口不接受 spec 形态：`required` 必须提升为父级的字符串数组，否则会被拒绝。
 */
function parameterSpecToJsonSchema(parameters) {
  const properties = {}
  const required = []
  for (const [name, spec] of Object.entries(parameters ?? {})) {
    properties[name] = valueSpecToJsonSchema(spec)
    if (spec?.required === true) required.push(name)
  }
  const schema = { type: 'object', properties }
  if (required.length > 0) schema.required = required
  return schema
}

/** ValueSchemaSpec 转 JSON Schema，规则与 parameterSpecToJsonSchema 相同。 */
function valueSpecToJsonSchema(spec) {
  const schema = { type: spec?.type }
  if (spec?.description !== undefined) schema.description = spec.description
  if (spec?.enum !== undefined) schema.enum = spec.enum
  if (spec?.type === 'array') schema.items = valueSpecToJsonSchema(spec.items ?? { type: 'string' })
  if (spec?.type === 'object') {
    const properties = {}
    const required = []
    for (const [name, child] of Object.entries(spec.properties ?? {})) {
      properties[name] = valueSpecToJsonSchema(child)
      if (child?.required === true) required.push(name)
    }
    schema.properties = properties
    if (required.length > 0) schema.required = required
    if (spec.additionalProperties !== undefined) schema.additionalProperties = spec.additionalProperties
  }
  return schema
}

/* ------------------------------------------------- 逐条答复的落盘与保存 */

/** 执行上下文里的会话 id；拿不到或形状不合法都返回 undefined。 */
function sessionIdOf(exec) {
  try {
    const id = exec?.agent?.session?.id
    return typeof id === 'string' && STORE_SAFE_ID.test(id) ? id : undefined
  } catch {
    return undefined
  }
}

/** 读一个会话的落盘记录；文件不存在或内容坏掉都返回 undefined。 */
async function readStore(sessionId) {
  try {
    const text = await readFile(join(storeRoot(), `${sessionId}.json`), 'utf8')
    const parsed = JSON.parse(text)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
    return parsed
  } catch {
    return undefined
  }
}

/** 原子写一个会话记录：先写临时文件再改名，避免客户端读到半份 JSON。 */
async function writeStore(sessionId, data) {
  await mkdir(storeRoot(), { recursive: true })
  const file = join(storeRoot(), `${sessionId}.json`)
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, JSON.stringify(data), 'utf8')
  await rename(temp, file)
}

/**
 * 记下一次回退：客户端轮询会话记录时据此清掉被撤回轮次的卡片，并把批注回放到待发送。
 * 回退由 dsh-rewind-plugin 执行，它追加一条 source.kind='dsh-rewind' 的用户消息；
 * 该消息的 turn 就是被撤回的起点（目标消息本身也一并撤回）。
 */
async function recordRewind(sessionId, turn) {
  const existing = (await readStore(sessionId)) ?? {}
  const previousAt = Number.isFinite(existing.rewind?.at) ? Number(existing.rewind.at) : 0
  await writeStore(sessionId, {
    ...existing,
    rewind: { at: Math.max(Date.now(), previousAt + 1), turn: Number.isSafeInteger(turn) ? turn : null },
  })
}

/** 把一批逐条答复追加到会话记录里。 */
async function appendReplyBatch(sessionId, value) {
  const existing = (await readStore(sessionId)) ?? {}
  const batches = Array.isArray(existing.replies) ? existing.replies.slice() : []
  batches.push({
    at: Date.now(),
    replies: value.replies,
    accepted: value.accepted,
    partial: value.partial,
    rejected: value.rejected,
    needsInfo: value.needsInfo,
  })
  const kept = batches.slice(Math.max(0, batches.length - STORE_MAX_REPLY_BATCHES))
  await writeStore(sessionId, {
    ...existing,
    schemaVersion: 1,
    sessionId,
    updatedAt: new Date().toISOString(),
    replies: kept,
  })
}

async function handleSessionStore(req, res) {
  const reply = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(body === undefined ? '' : JSON.stringify(body))
  }

  // 只服务本机页面：拒绝任何非回环 Host 的请求。
  const host = String(req.headers.host ?? '').toLowerCase()
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)) {
    reply(403, { error: 'forbidden' })
    return
  }

  let url
  try {
    url = new URL(req.url ?? '/', 'http://127.0.0.1')
  } catch {
    reply(400, { error: 'bad url' })
    return
  }

  const raw = url.pathname.slice(STORE_ROUTE.length).replace(/^\//, '')
  const sessionId = safeDecode(raw)
  if (sessionId === undefined || !STORE_SAFE_ID.test(sessionId)) {
    reply(400, { error: 'bad session id' })
    return
  }

  const file = join(storeRoot(), `${sessionId}.json`)

  if (req.method === 'GET' || req.method === 'HEAD') {
    let text
    try {
      text = await readFile(file, 'utf8')
    } catch {
      reply(204)
      return
    }
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(req.method === 'HEAD' ? undefined : text)
    return
  }

  if (req.method !== 'PUT' && req.method !== 'POST') {
    reply(405, { error: 'method not allowed' })
    return
  }

  let body
  try {
    body = await readBody(req, STORE_MAX_BYTES)
  } catch (error) {
    reply(error?.code === 'STORE_TOO_LARGE' ? 413 : 400, { error: String(error?.message ?? error) })
    return
  }

  let parsed
  try {
    parsed = JSON.parse(body.toString('utf8'))
  } catch {
    reply(400, { error: 'invalid json' })
    return
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    reply(400, { error: 'invalid payload' })
    return
  }

  // 客户端只写草稿与已提交台账，不写逐条答复：保留宿主写进去的 replies，别被覆盖掉。
  const previous = await readStore(sessionId)
  const merged = Array.isArray(previous?.replies) ? previous.replies.slice() : []
  if (Array.isArray(parsed.replies)) {
    for (const batch of parsed.replies) {
      if (batch === null || typeof batch !== 'object') continue
      if (!merged.some((entry) => entry?.at === batch.at)) merged.push(batch)
    }
  }
  parsed.replies = merged.slice(Math.max(0, merged.length - STORE_MAX_REPLY_BATCHES))
  // 已发送台账只增不减：客户端可能带着过期（更少）的内存表推送，整表覆盖会把历史记录冲掉。
  // 回退要删除的键由客户端显式列在 sentRemoved 里，这里按名单删，其余保留。
  if (parsed.sent !== null && typeof parsed.sent === 'object' && !Array.isArray(parsed.sent)) {
    const union = {}
    const oldSent = previous?.sent
    if (oldSent !== null && typeof oldSent === 'object' && !Array.isArray(oldSent)) {
      for (const [key, value] of Object.entries(oldSent)) union[key] = value
    }
    for (const [key, value] of Object.entries(parsed.sent)) union[key] = value
    if (Array.isArray(parsed.sentRemoved)) {
      for (const key of parsed.sentRemoved) {
        if (typeof key === 'string') delete union[key]
      }
    }
    parsed.sent = union
  }
  delete parsed.sentRemoved
  // rewind 由宿主写入，客户端不认这个字段，写回时保留宿主的那一份。
  if (previous !== undefined && previous !== null && previous.rewind !== undefined) {
    parsed.rewind = previous.rewind
  } else {
    delete parsed.rewind
  }

  try {
    await writeStore(sessionId, parsed)
  } catch (error) {
    reply(500, { error: String(error?.message ?? error) })
    return
  }

  pruneStore().catch(() => {})
  reply(200, { ok: true, sessionId })
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return undefined
  }
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    req.on('data', (chunk) => {
      total += chunk.length
      if (total > limit) {
        const error = new Error('payload too large')
        error.code = 'STORE_TOO_LARGE'
        reject(error)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/** 只保留最近 STORE_MAX_SESSIONS 个会话文件。 */
async function pruneStore() {
  const root = storeRoot()
  let names
  try {
    names = await readdir(root)
  } catch {
    return
  }
  const files = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const full = join(root, name)
    try {
      const info = await stat(full)
      files.push({ full, mtime: info.mtimeMs })
    } catch {
      /* 刚刚被删掉的文件：忽略 */
    }
  }
  if (files.length <= STORE_MAX_SESSIONS) return
  files.sort((a, b) => a.mtime - b.mtime)
  for (const entry of files.slice(0, files.length - STORE_MAX_SESSIONS)) {
    try {
      await rm(entry.full, { force: true })
    } catch {
      /* 清理失败不影响写入 */
    }
  }
}
