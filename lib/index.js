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
import { readFile } from 'node:fs/promises'
import { URL } from 'node:url'
import { REPLY_VERDICTS, createAnnotationsDb } from './annotations-db.js'

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
  '在结束这一轮之前调用 annotation_replies 工具，replies 的每一项用 annotations[].uuid 指定要答复的批注；' +
  'uuid 是唯一定位依据，不要用序号或轮次代替。' +
  'verdict 取 accepted / partial / rejected / needs_info，reason 写清判定理由。' +
  '正文只写整体说明或需要澄清的问题，不要只在正文里复述逐条内容。' +
  '当前环境没有 annotation_replies 工具时，在正文里说明原因，不要静默跳过。'

/** 回合结束检查保留多少个会话的瞬时状态。 */
const TURN_STATE_LIMIT = 100

/** 会话记录的落盘路由前缀；后面接会话 id。老接口，返回整份老形状快照。 */
const STORE_ROUTE = '/selection-annotations/session'

/** 单条批注的路由前缀；后面接条目 uuid（PATCH 写答复、DELETE 删除）。 */
const ENTRY_ROUTE = '/selection-annotations/entry'

/** 批次的路由前缀；后面接 batch_uuid（PATCH 回填 turn / anchor_key）。 */
const BATCH_ROUTE = '/selection-annotations/batch'

/** 会话 id 白名单：只允许规范形状，避免路径穿越。 */
const STORE_SAFE_ID = /^session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** 单个会话记录的上限；客户端已经按 3.5 MB 裁剪，这里留出余量。 */
const STORE_MAX_BYTES = 8 * 1024 * 1024

/** 台账库：懒打开的进程内单例（首次访问时才建目录、开库）。 */
let annotationsDb
function annotationStore() {
  if (annotationsDb === undefined) annotationsDb = createAnnotationsDb()
  return annotationsDb
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
      try {
        recordRewind(sessionId, data?.turn)
      } catch (error) {
        console.error('[selection-annotations] 回退标记写入失败：', error)
      }
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
          '（用数据块里每条批注的 uuid 对应要答复的条目），再结束这一轮；正文不必重复逐条内容。',
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
 * 批注台账的路由：数据落在一个 SQLite 库里（`$DSH_HOME/selection-annotations/annotations.db`）。
 *
 * 为什么要落盘：客户端的 localStorage 只在这一个客户端里有效，换到 web 端或清掉站点数据
 * 就什么都没有。批注和会话一样属于「本机数据」，应该跟着 DSH_HOME 走。
 *
 * 两个前缀路由：
 *   `STORE_ROUTE` 老接口，整份快照读写（客户端现在仍按老形状用）；
 *   `ENTRY_ROUTE` 按条写入，PATCH 写答复、DELETE 删一条。
 * 同一个会话下还有 `POST /session/<id>/batch` 新建一批。没有 Web 服务器的宿主安静跳过。
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
    const routes = [
      {
        kind: 'prefix',
        path: STORE_ROUTE,
        handler: (req, res) => handleSessionStore(req, res),
      },
      {
        kind: 'prefix',
        path: ENTRY_ROUTE,
        handler: (req, res) => handleEntryStore(req, res),
      },
      {
        kind: 'prefix',
        path: BATCH_ROUTE,
        handler: (req, res) => handleBatchStore(req, res),
      },
    ]
    const dispose = () => {
      const disposals = []
      for (const route of routes) {
        try {
          disposals.push(server.register(route))
        } catch (error) {
          console.error('[selection-annotations] 注册批注台账路由失败：', route.path, error)
        }
      }
      return () => {
        for (const disposal of disposals) {
          if (typeof disposal !== 'function') continue
          try {
            disposal()
          } catch {
            /* 卸载失败不影响进程退出 */
          }
        }
      }
    }
    try {
      scope.effect(dispose, 'selection-annotations: annotation store routes')
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
        '提交对用户批注的逐条答复。处理完批注后必须调用：replies 里每一项用批注数据块里的 uuid 指明要答复的那一条，不要传序号、轮次。',
      parameters: parameterSpecToJsonSchema({
        replies: {
          type: 'array',
          required: true,
          description: '逐条答复，必须覆盖本次所有批注；每项用 uuid 指定批注，不要传序号、轮次。',
          items: replySchema({ requireUuid: true }),
        },
      }),
      output: {
        schema: valueSpecToJsonSchema({
          type: 'object',
          additionalProperties: false,
          properties: {
            replies: { type: 'array', required: true, items: replySchema({ requireUuid: false }) },
            accepted: { type: 'integer', required: true },
            partial: { type: 'integer', required: true },
            rejected: { type: 'integer', required: true },
            needsInfo: { type: 'integer', required: true },
            saved: { type: 'boolean', required: true },
            written: { type: 'integer', required: true },
            skipped: {
              type: 'array',
              required: true,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  uuid: { type: 'string' },
                  index: { type: 'integer' },
                  reason: { type: 'string', required: true },
                },
              },
            },
          },
        }),
        render: (_args, value) => {
          if (value?.saved === false) {
            return [
              {
                type: 'text',
                text: `已收到 ${value.replies.length} 条批注答复，但未能写入台账。`,
              },
            ]
          }
          const counts = `采纳 ${value.accepted}、部分 ${value.partial}、不采纳 ${value.rejected}、需澄清 ${value.needsInfo}`
          let text = value.written > 0 ? `已写 ${value.written} 条批注答复（${counts}）` : '已写 0 条批注答复'
          if (Array.isArray(value.skipped) && value.skipped.length > 0) {
            text += `；跳过 ${value.skipped.length} 条：${formatSkipReasons(value.skipped)}`
          }
          return [{ type: 'text', text: `${text}。` }]
        },
      },
      async execute(args, exec) {
        const replies = Array.isArray(args?.replies) ? args.replies : []
        const sessionId = sessionIdOf(exec)
        let result
        if (sessionId !== undefined) {
          try {
            result = await appendReplyBatch(sessionId, { replies })
          } catch (error) {
            console.error('[selection-annotations] 批注答复落盘失败：', error)
          }
        }
        // 计数按真实写入的答复算：被跳过的条目不计入采纳/部分/不采纳/需澄清。
        const written = Array.isArray(result?.written) ? result.written : []
        const skipped = Array.isArray(result?.skipped) ? result.skipped : []
        const counts = { accepted: 0, partial: 0, rejected: 0, needs_info: 0 }
        for (const entry of written) {
          if (typeof entry?.verdict === 'string' && Object.hasOwn(counts, entry.verdict)) {
            counts[entry.verdict] += 1
          }
        }
        return {
          replies,
          accepted: counts.accepted,
          partial: counts.partial,
          rejected: counts.rejected,
          needsInfo: counts.needs_info,
          saved: result !== undefined,
          written: written.length,
          skipped,
        }
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

/**
 * 单条答复的 schema；parameters 与 output 各用一份，避免共享对象被编译修改。
 * 工具参数只暴露 uuid：index / cardKey 只留在 output 的兼容分支里，不写进工具说明。
 */
function replySchema({ requireUuid = true } = {}) {
  const properties = {
    uuid: {
      type: 'string',
      required: requireUuid,
      description: '批注数据块里该条批注的 uuid；答复的唯一依据。',
    },
    verdict: {
      type: 'string',
      required: true,
      enum: ['accepted', 'partial', 'rejected', 'needs_info'],
      description: 'accepted 采纳 / partial 部分采纳 / rejected 不采纳 / needs_info 需要澄清',
    },
    reason: { type: 'string', required: true, description: '判定理由' },
    next: { type: 'string', description: '下一步打算，可省略' },
  }
  if (!requireUuid) {
    // 仅 output 回显老调用时保留；工具参数里没有这两个字段。
    properties.index = { type: 'integer', description: '已弃用：仅用于兼容老调用。' }
    properties.cardKey = { type: 'string', description: '已弃用：仅用于兼容老调用。' }
  }
  return { type: 'object', additionalProperties: false, properties }
}

/** 把跳过原因翻译成回执里的一句话。 */
function formatSkipReasons(skipped) {
  const labels = {
    uuid_not_found: 'uuid 不存在',
    already_replied: '已答复过',
    invalid_reply: '答复格式不合法',
    uuid_required: '缺少 uuid',
    batch_not_found: '找不到所属批次',
    index_not_found: '找不到对应批注',
  }
  const counts = new Map()
  for (const entry of Array.isArray(skipped) ? skipped : []) {
    const label = labels[entry?.reason] ?? '其他原因'
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts].map(([label, count]) => `${label} ${count} 条`).join('、')
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

/**
 * 记下一次回退：客户端轮询会话记录时据此清掉被撤回轮次的卡片，并把批注回放到待发送。
 * 回退由 dsh-rewind-plugin 执行，它追加一条 source.kind='dsh-rewind' 的用户消息；
 * 该消息的 turn 就是被撤回的起点（目标消息本身也一并撤回）。
 */
function recordRewind(sessionId, turn) {
  return annotationStore().recordRewind(sessionId, turn)
}

/** 把一批逐条答复写进会话记录：有 uuid 按 uuid，没有就退回「最近一批 + index」。 */
function appendReplyBatch(sessionId, value) {
  return annotationStore().writeReplyBatch(sessionId, value)
}

/* ------------------------------------------------------------ 台账路由 */

/** 只服务本机页面：拒绝任何非回环 Host 的请求。 */
function isLoopbackRequest(req) {
  const host = String(req.headers.host ?? '').toLowerCase()
  return /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)
}

function parseRequestUrl(req) {
  try {
    return new URL(req.url ?? '/', 'http://127.0.0.1')
  } catch {
    return undefined
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body === undefined ? '' : JSON.stringify(body))
}

/** 读一个 JSON 请求体；失败时已经回过响应，返回 undefined。 */
async function readJsonBody(req, res) {
  let body
  try {
    body = await readBody(req, STORE_MAX_BYTES)
  } catch (error) {
    sendJson(res, error?.code === 'STORE_TOO_LARGE' ? 413 : 400, { error: String(error?.message ?? error) })
    return undefined
  }
  try {
    return JSON.parse(body.toString('utf8'))
  } catch {
    sendJson(res, 400, { error: 'invalid json' })
    return undefined
  }
}

/**
 * 老接口：`GET /selection-annotations/session/<id>` 返回老形状快照（由库拼出来），
 * `PUT|POST` 接受整份快照落库。客户端仍按这个形状读写，先不改。
 */
async function handleSessionStore(req, res) {
  if (!isLoopbackRequest(req)) return sendJson(res, 403, { error: 'forbidden' })
  const url = parseRequestUrl(req)
  if (url === undefined) return sendJson(res, 400, { error: 'bad url' })

  const raw = url.pathname.slice(STORE_ROUTE.length).replace(/^\//, '')
  const parts = raw.split('/').filter((part) => part !== '')
  const sessionId = safeDecode(parts[0] ?? '')
  if (sessionId === undefined || !STORE_SAFE_ID.test(sessionId)) {
    return sendJson(res, 400, { error: 'bad session id' })
  }

  try {
    if (parts.length === 2 && parts[1] === 'batch') return await handleBatchCreate(req, res, sessionId)
    if (parts.length !== 1) return sendJson(res, 404, { error: 'not found' })
    if (req.method === 'GET' || req.method === 'HEAD') return handleSessionRead(req, res, sessionId)
    if (req.method === 'PUT' || req.method === 'POST') return await handleSessionWrite(req, res, sessionId)
    return sendJson(res, 405, { error: 'method not allowed' })
  } catch (error) {
    console.error('[selection-annotations] 会话记录读写失败：', error)
    if (!res.headersSent) sendJson(res, 500, { error: String(error?.message ?? error) })
    else res.end()
  }
}

/** 老形状快照读回；库里没有这个会话就 204（与「文件不存在」时的旧行为一致）。 */
function handleSessionRead(req, res, sessionId) {
  const snapshot = annotationStore().readSession(sessionId)
  if (snapshot === undefined) {
    sendJson(res, 204)
    return
  }
  const text = JSON.stringify(snapshot)
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(req.method === 'HEAD' ? undefined : text)
}

/** 整份快照落库：合并规则（sent 只增、replies 按 at 去重、rewind 保留）都在存储层。 */
async function handleSessionWrite(req, res, sessionId) {
  const parsed = await readJsonBody(req, res)
  if (parsed === undefined) return
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    sendJson(res, 400, { error: 'invalid payload' })
    return
  }
  annotationStore().saveSession(sessionId, parsed)
  sendJson(res, 200, { ok: true, sessionId })
}

/** 新接口：`POST /session/<id>/batch` 新建一批批注，返回 batch_uuid / batch_seq。 */
async function handleBatchCreate(req, res, sessionId) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' })
  const parsed = await readJsonBody(req, res)
  if (parsed === undefined) return
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return sendJson(res, 400, { error: 'invalid payload' })
  }
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    return sendJson(res, 400, { error: 'items required' })
  }
  const result = annotationStore().createBatch(sessionId, {
    turn: Number.isSafeInteger(parsed.turn) ? parsed.turn : undefined,
    anchorKey: typeof parsed.anchor_key === 'string' ? parsed.anchor_key : undefined,
    batchAt: Number.isFinite(parsed.batch_at) ? Number(parsed.batch_at) : undefined,
    items: parsed.items,
  })
  sendJson(res, 200, result)
}

/**
 * 新接口：`PATCH /selection-annotations/entry/<uuid>` 写答复，
 * `DELETE` 同地址删一条。条目首次答复后不可再改（409），要走改判用工具那条路。
 */
async function handleEntryStore(req, res) {
  if (!isLoopbackRequest(req)) return sendJson(res, 403, { error: 'forbidden' })
  const url = parseRequestUrl(req)
  if (url === undefined) return sendJson(res, 400, { error: 'bad url' })

  const raw = url.pathname.slice(ENTRY_ROUTE.length).replace(/^\//, '')
  if (raw === '' || raw.includes('/')) return sendJson(res, 400, { error: 'bad entry id' })
  const uuid = safeDecode(raw)
  if (uuid === undefined || uuid === '') return sendJson(res, 400, { error: 'bad entry id' })

  try {
    if (req.method === 'DELETE') {
      const deleted = annotationStore().deleteEntry(uuid)
      return deleted ? sendJson(res, 200, { ok: true, uuid }) : sendJson(res, 404, { error: 'not found' })
    }
    if (req.method !== 'PATCH') return sendJson(res, 405, { error: 'method not allowed' })

    const parsed = await readJsonBody(req, res)
    if (parsed === undefined) return
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return sendJson(res, 400, { error: 'invalid payload' })
    }
    if (typeof parsed.verdict !== 'string' || !REPLY_VERDICTS.includes(parsed.verdict)) {
      return sendJson(res, 400, { error: 'bad verdict' })
    }
    const reason = typeof parsed.reason === 'string' ? parsed.reason : ''
    if (reason.trim() === '') return sendJson(res, 400, { error: 'reason required' })
    const result = annotationStore().patchEntry(uuid, {
      verdict: parsed.verdict,
      reason,
      next: typeof parsed.next === 'string' ? parsed.next : undefined,
      repliedSessionId: typeof parsed.session_id === 'string' ? parsed.session_id : undefined,
    })
    if (result.status === 'not_found') return sendJson(res, 404, { error: 'not found' })
    if (result.status === 'conflict') {
      return sendJson(res, 409, {
        error: 'already replied',
        message: '该批注已答复过，不能重复写入',
      })
    }
    return sendJson(res, 200, {
      ok: true,
      uuid,
      replied_at: result.replied_at,
      replied_session_id: result.replied_session_id,
    })
  } catch (error) {
    console.error('[selection-annotations] 单条批注读写失败：', error)
    if (!res.headersSent) sendJson(res, 500, { error: String(error?.message ?? error) })
    else res.end()
  }
}

/**
 * `PATCH /selection-annotations/batch/<batch_uuid>`：消息真正入库后回填 turn 与 anchor_key。
 * 只补空值、不覆盖已写内容，重复调用结果一致（客户端可能重试）。
 */
async function handleBatchStore(req, res) {
  if (!isLoopbackRequest(req)) return sendJson(res, 403, { error: 'forbidden' })
  const url = parseRequestUrl(req)
  if (url === undefined) return sendJson(res, 400, { error: 'bad url' })

  const raw = url.pathname.slice(BATCH_ROUTE.length).replace(/^\//, '')
  if (raw === '' || raw.includes('/')) return sendJson(res, 400, { error: 'bad batch id' })
  const batchUuid = safeDecode(raw)
  if (batchUuid === undefined || batchUuid === '') return sendJson(res, 400, { error: 'bad batch id' })
  if (req.method !== 'PATCH') return sendJson(res, 405, { error: 'method not allowed' })

  try {
    const parsed = await readJsonBody(req, res)
    if (parsed === undefined) return
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return sendJson(res, 400, { error: 'invalid payload' })
    }
    const result = annotationStore().patchBatch(batchUuid, {
      turn: Number.isSafeInteger(parsed.turn) ? parsed.turn : undefined,
      anchorKey: typeof parsed.anchor_key === 'string' ? parsed.anchor_key : undefined,
    })
    if (result.status === 'not_found') return sendJson(res, 404, { error: 'not found' })
    return sendJson(res, 200, {
      ok: true,
      batch_uuid: result.batch_uuid,
      turn: result.turn,
      anchor_key: result.anchor_key,
    })
  } catch (error) {
    console.error('[selection-annotations] 批次回填失败：', error)
    if (!res.headersSent) sendJson(res, 500, { error: String(error?.message ?? error) })
    else res.end()
  }
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
