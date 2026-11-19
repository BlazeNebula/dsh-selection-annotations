import { CSS } from './core/styles.js'
import { sideTabAction } from './core/side-tab-state.js'
import {
  ANNOTATION_FILE,
  DEFAULT_ADOPT_TEXT,
  DEFAULT_FALLBACK_TEXT,
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_INSTRUCTION,
  DEFAULT_REJECT_TEXT,
  IMAGE_SETTINGS_KEY,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_ANNOTATION,
  MAX_NOTE,
  MAX_QUOTE,
  PAYLOAD_KIND,
  POPOVER_SIZE_KEY,
  DRAFT_STORAGE_PREFIX,
  DRAFT_MAX_SESSIONS,
  DRAFT_MAX_ITEMS,
  SENT_STORAGE_PREFIX,
  SENT_MAX_ENTRIES,
  SENT_MAX_BYTES,
  REPLY_POLL_MS,
  SENT_PENDING_TTL_MS,
  LOCALE_NS,
  PLUGIN_BUILD,
} from './core/config.js'
import {
  CONSUME_CONFIRM_MS,
  CONSUME_POLL_MS,
  DRAFT_MAX_BYTES,
  HOVER_OPEN_DELAY_MS,
  JUMP_NAV_POLL_MS,
  JUMP_NAV_TIMEOUT_MS,
  JUMP_SCROLL_GRACE_MS,
  ORPHAN_SWEEP_MS,
  POP_AUTO_SAVE_MS,
  REFINE_WAIT_MS,
  REPAINT_MS,
  SETTLE_MS,
  SOURCE_LOOKUP_TIMEOUT_MS,
  STRAY_GUARD_MS,
  UPLOAD_DEBOUNCE_MS,
  UPLOAD_READY_TIMEOUT_MS,
} from './core/constants.js'
import { log, warn } from './core/log.js'
import { createLocale } from './core/locale.js'
import { mergeReplyBatches, shouldDiscardEmpty } from './core/annotation-utils.js'
import { createSessionApi } from './core/session.js'
import { createSettings } from './core/settings.js'
import { createPayload } from './core/payload.js'
import { createSourceCapture, buildSegments, segmentsOf, fitSegmentsToQuote } from './core/source-capture.js'
import { createSourceResolver } from './core/source-resolve.js'
import { createCards, VERDICT_LABELS } from './core/cards.js'
import { jumpIcon } from './core/jump-icon.js'
import { createMarkdown } from './core/markdown.js'
import { createPanelRenderer } from './core/panel-render.js'
import { noteFlags, noteSegments, noteView, paintNote } from './core/note-tone.js'
import {
  serializeAnnotations,
  parseAnnotations,
  annotationSignature,
} from './core/annotation-clipboard.js'
import { createWebPicker, PICK_SCRIPT } from './core/web-picker.js'
import { createPreviewBridge } from './core/preview-bridge.js'
import { createSentStore, isSentItem } from './core/sent-store.js'
import { createPayloadHidingRule } from './core/hidden-payload.js'
import { createRemoteSync } from './core/remote-sync.js'
import { createScrollTrace } from './core/scroll-trace.js'
import { createDraftCodec } from './core/draft-codec.js'
import { createDraftStore } from './core/draft-store.js'
import { compressImage, downscaleDataUrl, fileToDataUrl } from './core/image-codec.js'
import {
  offsetRange,
  lineNumberOf,
  locateInSource,
  lineOfOffset,
  withTimeout,
  matchInRootNormalized,
} from './core/source-locate.js'
import { safe, cssEscape, el, button, hashString } from './core/util.js'
import { uuidV4 } from './core/uuid.js'
import { registerTurnAnchor, findTurnAnchor } from './core/turn-anchor.js'

/**
 * 组合根：装配 src/core/ 下的模块并驱动界面。
 *
 * 已拆出：locale、settings、payload、sent-store、remote-sync、draft-*、source-*、cards、util、image-codec。
 * 仍在此处：批注状态、会话切换、选区与弹层、总览面板、React 组件。
 * 迁移原则：行为不变，一次一个模块，npm test 全绿后提交。
 */
function reportLoadError(error) {
  try {
    if (document.getElementById('sa-load-error') !== null) return
    const box = document.createElement('pre')
    box.id = 'sa-load-error'
    box.textContent = `批注插件加载失败：${error !== null && error !== undefined && error.stack !== undefined ? error.stack : String(error)}`
    box.style.cssText =
      'position:fixed;left:12px;top:12px;right:12px;max-height:50vh;overflow:auto;z-index:2147483647;margin:0;padding:10px 12px;border:1px solid #f85149;border-radius:8px;background:rgba(30,10,10,.96);color:#ffb3b3;font:12px/1.5 ui-monospace,monospace;white-space:pre-wrap;'
    document.body.appendChild(box)
  } catch {
    // 连报错容器都建不起来时只能放弃展示。
  }
}

export function createPlugin(React, extras = {}) {
  const h = React.createElement

  const plugin = {
    name: 'dsh-selection-annotations',
    inject: [
      'slots',
      'sessions',
      'conversation',
      'remote',
      'remote.workspaceFiles',
      'locale',
      'uiConversation',
      'sidebarRight',
      'sidebarRightTabs',
      'documentPreviews',
    ],
    apply(ctx) {
      try {
        return plugin.activate(ctx)
      } catch (error) {
        reportLoadError(error)
        throw error
      }
    },
    activate(ctx) {
    const locale = createLocale(ctx)

    const t = (key, params) => locale.t(key, params)
    const defaultInstruction = () => locale.defaultInstruction()
    const isDefaultInstruction = (text) => locale.isDefaultInstruction(text)
    registerTurnAnchor(ctx, h)

    // 宿主半边已把批注 JSON 并进用户消息正文（source 仍是 user）；这条规则只把 JSON 段
    // 在气泡里显示为空，模型请求与会话记录都不变。没有 uiConversation 服务的宿主安静跳过。
    ctx.effect(() => {
      const ui = safe(() => ctx.uiConversation)
      if (ui === undefined || ui === null || typeof ui.userText?.register !== 'function') return
      return ui.userText.register(createPayloadHidingRule())
    }, 'selection-annotations: hide payload in user bubble')

    /** 草稿在本地存储里的体积上限；超了先丢最旧批注的图片。*/
        /* ------------------------------------------------------------------ 状态*/

        /** 当前会话的批注集合；编号与顺序就是发给模型时的编号。*/
        let annotations = []
        /** 当前挂在草稿上的批注附件 receipt；发送后被 composer 消费。 */
        let draftIds = []
        let syncing = false
        let syncTimer = null
        let repaintTimer = null
        /** 上一遍重绘因为有选区或拖选被推迟；选区一收就补一次。*/
        let repaintPending = false
        /** 第一次因选区被挡住的时间；一直挡着超过 REPAINT_DEFER_MAX_MS 就不再等，只渲染内容不动位置。*/
        let repaintDeferredAt = null
        /** 允许被选区推迟多久（毫秒）：超过就放弃位置保护、照常更新内容，避免画面一直是旧的。*/
        const REPAINT_DEFER_MAX_MS = 1500
        /** 会话区节点被重绘改写的次数：渲染函数拿它回答「这一遍到底动没动过 DOM」。*/
        let conversationChanges = 0
        /**
         * 台账或答复的数据真的变了：只有为真才重建会话区（卡片与答复区）。
         * 宿主自己的重排、流式输出、时间刷新都只改它自己的 DOM，不再驱动我们重建。
         * 初值为真：第一遍总要把页面上的卡片与答复区建出来。
         */
        let conversationDirty = true
        /** 上一遍有卡片/答复因为锚点还没进 DOM 而没落位：为真时继续重试，否则新卡永远出不来。*/
        let placementPending = false
        /**
         * 高亮层需要重算：批注数据变了、滚动或窗口尺寸变了、换会话、松手补绘。
         * 只是「有人排了一次重绘」不足以重建整层覆盖物——关闭编辑弹层就属于这种，改的只有弹层自己。
         */
        let highlightDirty = true
        /** 非空表示正在受保护的这一遍重绘里：渲染函数在真要摘挂节点前调它记下滚动位置。*/
        let scrollGuardCapture = null
        /**
         * 跳转滚动的保护截止时间：在此之前重绘不做位置补偿，
         * 否则 scrollRowToCenter 刚滚到的目标会被同一拍的重绘保护改写回去。
         * 只按时间窗生效，不手动清零。
         */
        let jumpScrollUntil = 0
        let settleTimer = null
        let pendingSelection = null
        /** 划线结束（pointerup）的位置：工具条贴着它出现，而不是跟着 range 的末尾矩形。*/
        let lastPointerUp = null
        /** 指针按住拖选期间不显示工具条，避免选区每变一次就重排一次。*/
        let pointerSelecting = false
        /** 最近一次指针位置：悬停打开的弹层用它做横向锚点。*/
        let lastPointerMove = null
        /** 选区落定时的鼠标位置：批注弹层的横向锚点。*/
        let selectionPointer = null
        /** 由槽位标准 props 注入的 composer 动作与当前会话 id —— 比自行解析 scope 更稳。 */
        let latestInputActions = undefined
        let latestSessionId = undefined
        /** 批注集合归属的会话；切换会话时按会话换入换出草稿，避免批注跑到别的会话里。*/
        let annotationsSession = undefined
        /** 已载入会话的草稿（sessionId → 可序列化条目），切换会话时先在内存里换入换出。 */
        const draftSessions = new Map()
        /** 已提交批注台账（sessionId → Map(anchorKey → 记录)）。 */
        const sentBySession = new Map()
        /** 回退删除过的台账键：宿主按名单删，避免下一次整表合并把删掉的记录带回来。 */
        const sentRemovals = new Map()
        /** 刚随消息发出、还在等对应消息行出现的负载。*/
        let pendingSent = []
        /** 上一批已清空但还没记账的批注；扫描超时后放回界面，避免用户什么都看不到。*/
        let consumedSnapshot = null
        /** 附件实际挂到哪个会话的输入外壳：记账沿用它，避免发送后重算会话 id 时串到别的会话。*/
        let attachedSessionId = undefined
        /** 最后一次成功挂附件时页面上已有的批注消息锚点键；发送后据此区分新消息与旧历史。*/
        let lastAnnotatedKeys = new Set()
        /** 批注附件是否已被 composer 确认挂上（用来区分「还没同步」与「已被发送消费」）。*/
        let draftSeen = false
        /** 这一批附件挂上输入框的时刻；用来和「用户点发送」的时刻比较。*/
        let stagedAt = 0
        /** 用户最近一次点发送/按 Enter 提交的时刻；排队发送时输入态可能还没被观察到「在场」。*/
        let sendGestureAt = 0
        /** 本插件正在自己摘/挂附件时为真：这段发布不能被当成「消息已发送」。*/
        let maintaining = false
        let watchUnsub = undefined
        let watchTimer = null
        let consumeTimer = null
        /** 在途的位置精修；上传前会等它，让首次上传就带上最终结果。*/
        let pendingRefine = undefined
        /** 定期认领孤儿附件的计时器。*/
        let orphanTimer = null
        /** 只打一次「经哪条路读到原文」，避免刷屏。*/
        /** 已随消息发出、但运行时可能稍后 restore 回来的草稿附件 id → 守卫截止时间。 */
        const strayIds = new Map()

        const listeners = new Set()
        const subscribe = (fn) => {
          listeners.add(fn)
          return () => {
            listeners.delete(fn)
          }
        }
        const snapshot = () => annotations
        let webPickerHandle = null
/** 每个会话最近一次已处理的回退时间戳，避免轮询重复回放。 */
const rewindHandled = new Map()
        function emit() {
          // 批注集合变了：编号、引文都画在高亮层上，下一遍重绘必须重算。
          highlightDirty = true
          for (const fn of [...listeners]) {
            try {
              fn()
            } catch (err) {
              warn('[selection-annotations] 订阅回调失败：', err)
            }
          }
          syncWebAnnotations()
        }

        /** 把网页来源的批注同步给页面，用来在元素上保留常驻框与控制柄。 */
        function syncWebAnnotations() {
          if (webPickerHandle === null) return
          const notes = annotations
            .filter((item) => item.source !== null && item.source !== undefined && item.source.kind === 'web')
            .map((item) => ({
              id: item.id,
              selector: item.source.anchorKey ?? '',
              url: item.source.path ?? '',
              adopt: hasAdoptNote(item.note),
            }))
          webPickerHandle.sync(notes)
        }

        /* ------------------------------------------------------------------ 基础工具 */

        function elementOf(node) {
          if (node === null || node === undefined) return null
          if (node.nodeType === 1) return node
          return node.parentElement ?? null
        }

/** 会话定位：优先槽位 props，其次 uiSession 的 current 绑定，最后退回会话列表。 */
        const sessionApi = createSessionApi(ctx, () => latestSessionId)
        const currentSessionId = () => sessionApi.currentSessionId()
        const inputShell = () => sessionApi.inputShell()
        const liveAttachmentIds = (shell) => sessionApi.liveAttachmentIds(shell)

        /**
         * 清空之后仍要盯一会儿：提交*结算失败**时运行时会调 restoreAttachments 把附件塞图
         * 输入态（`settleDetachedFailure`），而这可能发生在回合结束很久之后。批注此刻其实已经
         * 发出，留下那张没有内容的卡片只会误导人，所以见到就摘。
         * @param shell - 当前输入外壳。
         */
        /**
         * 认领「上一轮遗留下来的孤儿批注附件」。
         *
         * 运行时在提交结算失败时会把已发出的附件 restore 回输入态；若那件事发生在插件重载之前
         * （或插件当时没在跑），内存里的守卫表就随重载一起没了，那份 `批注.json` 会一直赖在输入框里，
         * 盯着批注附件何时被消费（消息发出）或被用户摘掉。
         *
         * 所以判据不放在内存里，而放在*文件后*上：凡是我们没在跟踪的批注附件，一律摘掉。
         * @param shell - 当前输入外壳。
         */
        /**
         * 只在本插件刚加载的一小段时间里做孤儿清扫：运行时把附件还回输入框的竞态
         * 只会发生在重载前后；一直扫会误删其他标签页或用户自己挂的同名附件。
         */
        const orphanSweepUntil = Date.now() + 15000

        function sweepOrphans(shell) {
          if (Date.now() > orphanSweepUntil) return
          if (maintaining || syncing) return
          const ids = liveAttachmentIds(shell)
          if (ids === undefined || ids.length === 0) return
          const foreign = ids.filter((id) => !draftIds.includes(id))
          if (foreign.length === 0) return
          const resolved = safe(() => ctx.conversation?.resolveDraftAttachments?.(foreign))
          if (!Array.isArray(resolved)) return
          for (const attachment of resolved) {
            if (attachment?.file?.name !== ANNOTATION_FILE) continue
            releaseDrafts([attachment.id], shell)
            log(`[selection-annotations] 摘掉一个上一轮遗留的孤儿批注附件（${attachment.id}）`)
          }
        }

        function sweepStrays(shell) {
          if (strayIds.size === 0 || shell === undefined) return
          const now = Date.now()
          const ids = liveAttachmentIds(shell)
          if (ids === undefined) return
          for (const [id, until] of [...strayIds]) {
            if (until <= now) {
              strayIds.delete(id)
              continue
            }
            if (!ids.includes(id)) continue
            strayIds.delete(id)
            releaseDrafts([id], shell)
            log(`[selection-annotations] 摘掉一个被恢复回来的孤儿批注附件（${id}）`)
          }
        }

        /**
         * 判定「这批批注已经被消息消费掉」并清空 ——带一次性保护。
         * @param reason - 触发原因，仅用于日志。
         */
        function markConsumed(reason) {
          if (draftIds.length === 0) return
          const ids = draftIds
          draftIds = []
          draftSeen = false
          const until = Date.now() + STRAY_GUARD_MS
          for (const id of ids) strayIds.set(id, until)
          if (annotations.length === 0) return
          // 发送前留一份负载与「挂附件时页面上已有的批注消息行」：新消息行出现后再按锚点键落台账。
          // 图片只带缩略图（dataUrl），原图不进台账 —— 清单里要的是「看得出是哪张」。
          const payload = safe(() => JSON.parse(buildPayload(annotations)))
          if (payload !== null && typeof payload === 'object' && Array.isArray(payload.annotations)) {
            const items = payload.annotations.map((annotation, index) => {
              const origin = annotations[index]
              const images = Array.isArray(origin?.images) ? origin.images : []
              const thumbs = []
              for (const image of images) {
                if (typeof image?.thumb !== 'string' || image.thumb === '') continue
                thumbs.push({
                  name: typeof image.name === 'string' ? image.name : t('image.alt'),
                  dataUrl: image.thumb,
                  preview: typeof image.preview === 'string' && image.preview !== '' ? image.preview : image.dataUrl,
                })
              }
              // 指纹跟着台账条目走：payloadSource 只保留白名单字段，留在 source 上的指纹到不了这里。
              // 台账条目会原样落盘，之后即使消息行换了锚点键，也能靠它把划线找回来。
              const fingerprint = {}
              if (typeof origin?.source?.contextBefore === 'string') fingerprint.contextBefore = origin.source.contextBefore
              if (typeof origin?.source?.contextAfter === 'string') fingerprint.contextAfter = origin.source.contextAfter
              const sentItem = { ...annotation, ...fingerprint }
              return thumbs.length > 0 ? { ...sentItem, thumbs } : sentItem
            })
            pendingSent.push({
              items,
              known: lastAnnotatedKeys,
              at: Date.now(),
              // 发送这一刻的会话就是消息真正去的那一个：记账沿用它，
              // 避免稍后重算时切到别的会话，把记录写进别人的台账。
              sessionId: attachedSessionId ?? currentSessionId(),
              // 把「这一屏会话」的范围也记下来：别的会话还挂在页面里时，只在这块范围内找新消息。
              scope: chatScopeOfInput(),
              turnHint: turnHintForScope(chatScopeOfInput()),
            })
            lastAnnotatedKeys = new Set()
          }
          // 界面上按发送成功清空，但留一份快照：若一直没能记账，扫描超时后把快照放回来。
          consumedSnapshot = { items: annotations.slice(), at: Date.now() }
          annotations = []
          emit()
          scheduleRepaint('emit')
          // 草稿存储也要跟着清掉：否则刷新后这批已发出的批注会「复活」。
          saveDraft(annotationsSession)
          log(`[selection-annotations] 批注已随消息发出（${reason}）`)
          // 立刻试一次记账：多数时候消息行已经在 DOM 里，不用等到下一次重绘。
          safe(() => scanSentMessages())
        }

        /**
         * 先看到「输入态不再持有附件」之后，隔一拍再确认一次：提交失败会调 restoreAttachments
         * 把附件还回来，那时就不该清空（否则批注清了、附件还在，两边对不上）。
         */
        function scheduleConsumeCheck() {
          if (consumeTimer !== null) return
          consumeTimer = window.setTimeout(() => {
            consumeTimer = null
            if (maintaining || draftIds.length === 0) return
            const shell = inputShell()
            if (shell === undefined) return
            const ids = liveAttachmentIds(shell)
            if (ids === undefined) return
            if (draftIds.some((id) => ids.includes(id))) return
            markConsumed('输入态已不再持有附件')
          }, CONSUME_CONFIRM_MS)
        }

        /**
         * 盯着批注附件何时被消费（消息发出）或被用户摘掉。
         *
         * 两条互补的信号，都归到同一个判据「输入态不再持有附件」：
         *   ①输入态的**推送*通知 ——快，但不能假定发送路径一定会发布通知，
         *   ①直接轮询输入外壳的*实时字段** ——慢一秒，但不依赖任何通知。
         * 确认窗口用来过滤「提交先移走、失败又还回来」的假信号。
         */
        function watchDraft() {
          const shell = inputShell()
          const state = shell?.state
          if (
            watchUnsub === undefined &&
            state !== undefined &&
            typeof state.subscribe === 'function' &&
            typeof state.getSnapshot === 'function'
          ) {
            watchUnsub = state.subscribe(() => {
              const current = inputShell()
              if (current !== undefined) sweepStrays(current)
              if (maintaining || draftIds.length === 0) return
              const snapshot = safe(() => state.getSnapshot())
              if (snapshot === undefined || snapshot === null) return
              const ids = Array.isArray(snapshot.attachmentIds) ? snapshot.attachmentIds : []
              if (draftIds.some((id) => ids.includes(id))) {
                draftSeen = true
                return
              }
            // 首次「在场」没被看到之前不敢下结论：那可能只是还没挂上去。
            // 例外：用户已经点过发送/按过 Enter。排队发送时回合还没结束，输入态可能从未被观察到
            // 「在场」就被搬进队列，附件此后也不会回到输入框；只认 draftSeen 会让这批批注永远挂在界面上。
            if (!draftSeen && sendGestureAt < stagedAt) return
              scheduleConsumeCheck()
            })
          }
          if (watchTimer === null) {
            watchTimer = window.setInterval(() => {
              const current = inputShell()
              if (current === undefined) return
              sweepStrays(current)
              sweepOrphans(current)
              if (maintaining || draftIds.length === 0) return
              const ids = liveAttachmentIds(current)
              if (ids === undefined) return
              if (draftIds.some((id) => ids.includes(id))) return
              scheduleConsumeCheck()
            }, CONSUME_POLL_MS)
          }
        }

        /* --------------------------------------------------------- 未提交批注的会话草稿 */

        const settings = createSettings(() => draftStorage(), locale)
        const loadImageSettings = () => settings.loadImageSettings()
        const imageSettingsOf = () => settings.imageSettingsOf()
        const persistImageSettings = () => settings.persistImageSettings()
        const loadInstructionSettings = () => settings.loadInstructionSettings()
        const instructionOf = () => settings.instructionOf()
        const persistInstructionSettings = (text) => settings.persistInstructionSettings(text)
        const adoptTextOf = () => settings.adoptTextOf()
        const persistAdoptText = (text) => settings.persistAdoptText(text)
        const rejectTextOf = () => settings.rejectTextOf()
        const persistRejectText = (text) => settings.persistRejectText(text)
        const fallbackTextOf = () => settings.fallbackTextOf()
        const persistFallbackText = (text) => settings.persistFallbackText(text)
        /** 批注正文里出现「采纳」预填文本时，整条批注改用绿色标识。 */
        const hasAdoptNote = (note) => typeof note === 'string' && note.includes(adoptTextOf())
        /** 批注正文里出现「否决」预填文本时，整条批注改用红色标识。 */
        const hasRejectNote = (note) => typeof note === 'string' && note.includes(rejectTextOf())
        /** 备注的采纳/否决判定与逐句着色数据；两个布尔互相独立，一条备注可以同时命中。 */
        const noteViewOf = (note) => noteView(note, adoptTextOf(), rejectTextOf())

        /** 已载入会话的草稿（sessionId → 可序列化条目），切换会话时先在内存里换入换出。 */
        const remoteReplyCache = new Map()

        /** 记住宿主写入的答复批次；有变化时返回 true。*/
        function absorbRemoteReplies(sessionId, remote) {
          if (!Array.isArray(remote?.replies)) return false
          const batches = remote.replies.filter(
            (batch) => batch !== null && typeof batch === 'object' && Array.isArray(batch.replies),
          )
          if (batches.length === 0) return false
          const previous = remoteReplyCache.get(sessionId) ?? []
          const signature = (list) => list.map((batch) => `${batch.at}:${batch.replies.length}`).join('|')
          if (signature(previous) === signature(batches)) return false
          remoteReplyCache.set(sessionId, batches)
          return true
        }

        // 滚动追踪：谁改了会话区 scrollTop、谁触发了重绘，落盘给人事后看。
        // 每条行都带上当前会话 id 与构建号：能按会话对时间窗，也能确认页面加载的是哪一版。
        const scrollTrace = createScrollTrace()
        scrollTrace.setContext(() => ({ session: currentSessionId() ?? null, build: PLUGIN_BUILD }))
        // 整份快照的构造点就是 remoteSync 发 PUT 前取数据的地方，在这里留一条 snapshot-push：
        // 记录这次推送带了多少条已提交记录与草稿，用来查「谁把批次覆盖掉」。
        const remoteSync = createRemoteSync((sessionId) => {
          const snapshot = sessionSnapshot(sessionId)
          scrollTrace.push({
            t: Date.now(),
            kind: 'snapshot-push',
            session: sessionId,
            sent: Object.keys(snapshot.sent).length,
            drafts: Array.isArray(snapshot.drafts) ? snapshot.drafts.length : 0,
          })
          return snapshot
        })
        const storeUrl = (sessionId) => remoteSync.storeUrl(sessionId)
        const pullRemoteSession = (sessionId) => remoteSync.pull(sessionId)

        /** 当前会话的可落盘快照：草稿与已提交台账（落盘不做体积裁剪）。*/
        function sessionSnapshot(sessionId) {
          const drafts =
            annotationsSession === sessionId ? draftItems(annotations) : draftSessions.get(sessionId) ?? []
          const sent = {}
          for (const [key, value] of sentBySession.get(sessionId) ?? []) sent[key] = value
          const sentRemoved = [...(sentRemovals.get(sessionId) ?? [])]
          return { schemaVersion: 1, sessionId, updatedAt: new Date().toISOString(), drafts, sent, sentRemoved }
        }

        const pushRemoteSession = (sessionId) => remoteSync.push(sessionId)
        const scheduleRemotePush = (sessionId) => remoteSync.schedule(sessionId)

        // 会话首次落盘前必须先合并远端台账：否则本地空表一旦先推送，会把宿主里的历史记录冲掉。
        const hydratedSessions = new Set()
        const pendingRemotePush = new Set()
        const flushPendingRemotePush = (sessionId) => {
          if (!pendingRemotePush.delete(sessionId)) return
          scheduleRemotePush(sessionId)
        }

        /** 把落盘记录并入内存：本地为空时用远端，本地有内容时保留本地并推上去。*/
        async function hydrateRemoteSession(sessionId) {
          const remote = await pullRemoteSession(sessionId)
          if (remote === null || remote === undefined) {
            hydratedSessions.add(sessionId)
            flushPendingRemotePush(sessionId)
            return
          }
          let touched = absorbRemoteReplies(sessionId, remote)
          if (Array.isArray(remote.drafts) && remote.drafts.length > 0) {
            const items = remote.drafts.filter(isDraftItem).slice(0, DRAFT_MAX_ITEMS).map(restoreDraftItem)
            if (annotationsSession === sessionId && annotations.length === 0 && items.length > 0) {
              annotations = items
              emit()
              scheduleRepaint('emit')
              scheduleSync()
            }
            if ((draftSessions.get(sessionId) ?? []).length === 0) draftSessions.set(sessionId, remote.drafts)
            touched = true
          }
          if (remote.sent !== null && typeof remote.sent === 'object') {
            const table = new Map()
            for (const [key, value] of Object.entries(remote.sent)) {
              if (typeof key !== 'string' || key === '') continue
              if (value === null || typeof value !== 'object' || !Array.isArray(value.items)) continue
              const items = value.items.filter(isSentItem).slice(0, DRAFT_MAX_ITEMS)
              if (items.length === 0) continue
              const turn = Number.isFinite(value.turn) ? Number(value.turn) : undefined
              // 宿主里的旧记录可能用 time:/turn-process 当键；值里的 anchorKey 才是消息行锚点，必须留住。
              const anchorKey =
                typeof value.anchorKey === 'string' && value.anchorKey !== '' ? value.anchorKey : undefined
              const batchUuid =
                typeof value.batchUuid === 'string' && value.batchUuid !== '' ? value.batchUuid : undefined
              const batchSeq = Number.isSafeInteger(value.batchSeq) ? value.batchSeq : undefined
              table.set(key, {
                savedAt: Number(value.savedAt) || 0,
                items,
                ...(turn !== undefined ? { turn } : {}),
                ...(anchorKey !== undefined ? { anchorKey } : {}),
                ...(batchUuid !== undefined ? { batchUuid } : {}),
                ...(batchSeq !== undefined ? { batchSeq } : {}),
                ...(value.unsynced === true ? { unsynced: true } : {}),
              })
            }
            if (table.size > 0) {
              const localTable = sentBySession.get(sessionId) ?? new Map()
              let merged = false
              for (const [key, value] of table) {
                const current = localTable.get(key)
                if (current === undefined || value.savedAt > current.savedAt) {
                  localTable.set(key, value)
                  merged = true
                }
              }
              if (merged) {
                sentBySession.set(sessionId, localTable)
                // 合并结果写回本地并重新推送，避免下一次推送把远端补回来的记录冲掉。
                saveSent(sessionId, localTable)
                touched = true
              }
            }
          }
          if (touched) {
            // 远端带回来的草稿/台账/答复都算数据变化：会话区要按新的表重建一次。
            markConversationDirty()
            scheduleRepaint('session')
          }
          hydratedSessions.add(sessionId)
          flushPendingRemotePush(sessionId)
        }

        const draftCodec = createDraftCodec({ t, prefix: DRAFT_STORAGE_PREFIX, maxBytes: DRAFT_MAX_BYTES })
        const draftKey = (sessionId) => draftCodec.draftKey(sessionId)
        const draftItems = (items) => draftCodec.draftItems(items)
        const isDraftItem = (value) => draftCodec.isDraftItem(value)
        const restoreDraftItem = (item) => draftCodec.restoreDraftItem(item)
        const fitDraftSize = (items) => draftCodec.fitDraftSize(items)
        const draftStore = createDraftStore({
          getStorage: () =>
            safe(() => {
              const storage = window.localStorage
              return storage !== null && storage !== undefined && typeof storage.getItem === 'function' ? storage : undefined
            }),
          codec: draftCodec,
          getAnnotations: () => annotations,
          drafts: draftSessions,
          onSaved: (sessionId) => scheduleRemotePush(sessionId),
          maxSessions: DRAFT_MAX_SESSIONS,
          maxItems: DRAFT_MAX_ITEMS,
        })
        const draftStorage = () => draftStore.draftStorage()
        const saveDraft = (sessionId) => draftStore.saveDraft(sessionId)
        const loadDraft = (sessionId) => draftStore.loadDraft(sessionId)

        /**
         * 会话切换：先把上一会话的草稿存起来，再换入这一会话的草稿。
         * 结果是批注根本进不了消息（或直接抛错）。必须让运行时自己登记草稿附件。
         */
        function adoptSession(sessionId) {
          if (typeof sessionId !== 'string' || sessionId === '') return
          const first = annotationsSession === undefined
          if (!first && annotationsSession === sessionId) return
          if (!first) {
            // 切会话算「保存」侧：先把还在去抖窗口里的编辑写进旧会话的条目，再存旧草稿。
            flushPopAutoSave()
            saveDraft(annotationsSession)
          }
          annotationsSession = sessionId
          // 首次挂载时内存里可能已有批注（测试台或热换前注入的），直接归到这个会话。
          if (first && annotations.length > 0) {
            saveDraft(sessionId)
            // 这条支路也要让会话区重建一次：本地台账里的卡片还没画过。
            markConversationDirty()
            scheduleRepaint('session')
            return
          }
          annotations = loadDraft(sessionId)
          draftIds = []
          draftSeen = false
          // 换会话时把上一会话的答复卡片清掉；新会话的数据用hydrate 补回来。
          for (const stale of document.querySelectorAll('[data-sa-ui="replies"]')) stale.remove()
          emit()
          // 换会话就是换了整套数据：会话区必须重建，不能等宿主下一次 DOM 变化。
          markConversationDirty()
          scheduleRepaint('session')
          if (annotations.length > 0) scheduleSync()
          // 本地是空的就当远端有数据：跨端切换会话时靠这一步把记录带回来。
          // 合并失败只影响远端补齐，不能变成未处理的拒绝把后续重绘一起带走。
          void hydrateRemoteSession(sessionId).catch((error) => {
            warn('[selection-annotations] 远端台账合并失败:', sessionId, error)
          })
        }

        const sourceResolver = createSourceResolver({
          ctx,
          getSessionId: () => currentSessionId(),
          log,
          timeoutMs: SOURCE_LOOKUP_TIMEOUT_MS,
        })
        const resolveSourcePosition = (source, quote, onSkip) => sourceResolver.resolve(source, quote, onSkip)

        const sourceCapture = createSourceCapture()
        /** 文本指纹半径：选中文字前后各 40 字；比对时去掉所有空白，免得换行/缩进差异干扰。*/
        const FINGERPRINT_RADIUS = 40
        const flatText = (value) => String(value ?? '').replace(/\s+/g, '')
        /** 按锚点键找回那一行；分段指纹要按段各自的行量。*/
        function rootByAnchorKey(anchorKey) {
          if (typeof anchorKey !== 'string' || anchorKey === '') return null
          const escaped = cssEscape(anchorKey)
          return (
            safe(() => document.querySelector(`[data-chat-anchor-key="${escaped}"]`)) ??
            safe(() => document.querySelector(`[data-chat-flow-key="${escaped}"]`)) ??
            null
          )
        }
        /** 给每一段量一份前后文指纹：锚点键丢了还能靠它在已加载的行里认回这一段。*/
        function stampSegmentFingerprints(segments) {
          return segments.map((segment) => {
            const row = rootByAnchorKey(segment.anchorKey)
            if (row === null) return segment
            const text = row.textContent ?? ''
            if (text === '') return segment
            const start = Number.isFinite(segment.charStart) ? segment.charStart : -1
            const end = Number.isFinite(segment.charEnd) ? segment.charEnd : -1
            if (start < 0 || end < start) return segment
            return {
              ...segment,
              fingerprintBefore: flatText(text.slice(0, start)).slice(-FINGERPRINT_RADIUS),
              fingerprintAfter: flatText(text.slice(end)).slice(0, FINGERPRINT_RADIUS),
            }
          })
        }
        /**
         * 给消息来源补一份文本指纹：锚点行重渲染后 data-chat-anchor-key 可能对不上，
         * 「轮次 + 前后文」是最后一条能在已加载行里认出同一段的线索。
         * 指纹存在 source 上，随草稿落盘；发送时再抄到台账条目上（payloadSource 只留白名单字段）。
         * 有分段时逐段量，顶层指纹恒等于首段 —— 与分段不变量一致。
         */
        function withSourceFingerprint(range, source) {
          if (source === null || typeof source !== 'object') return source
          const list = Array.isArray(source.segments) ? source.segments : []
          if (list.length > 0) {
            const stamped = stampSegmentFingerprints(list)
            const first = stamped[0]
            const next = { ...source, segments: stamped }
            if (typeof first?.fingerprintBefore === 'string') next.contextBefore = first.fingerprintBefore
            if (typeof first?.fingerprintAfter === 'string') next.contextAfter = first.fingerprintAfter
            return next
          }
          if (source.kind !== 'message') return source
          if (typeof source.anchorKey !== 'string' || source.anchorKey === '') return source
          const start = Number.isFinite(source.charStart) ? source.charStart : -1
          const end = Number.isFinite(source.charEnd) ? source.charEnd : -1
          if (start < 0 || end < start) return source
          const node = range.startContainer
          const element = node === null || node === undefined ? null : node.nodeType === 1 ? node : node.parentElement
          const row = element === null ? null : element.closest('[data-chat-anchor-key]')
          if (row === null) return source
          const text = row.textContent ?? ''
          if (text === '') return source
          const before = flatText(text.slice(0, start)).slice(-FINGERPRINT_RADIUS)
          const after = flatText(text.slice(end)).slice(0, FINGERPRINT_RADIUS)
          if (before === '' && after === '') return source
          return { ...source, contextBefore: before, contextAfter: after }
        }
        const captureSource = (range) => withSourceFingerprint(range, sourceCapture.captureSource(range))
        const anchorRoot = (source) => sourceCapture.anchorRoot(source)
        const rangeFromOffsets = (root, start, length) => sourceCapture.rangeFromOffsets(root, start, length)
        const matchInRoot = (root, quote, savedOffset) => sourceCapture.matchInRoot(root, quote, savedOffset)
        const rangeMatchesQuote = (range, quote) => sourceCapture.rangeMatchesQuote(range, quote)

        /** 定位一条批注的当前 Range：活的 Range 优先，失效就按锚点 + 偏移重建。 */
        function locateRange(item) {
          if (item.liveRange !== undefined) {
            const live = item.liveRange
            const usable =
              safe(() => live.startContainer.isConnected === true && live.endContainer.isConnected === true) === true
            if (usable && rangeMatchesQuote(live, item.quote)) return live
            item.liveRange = undefined
          }
          const root = anchorRoot(item.source)
          if (root === null || root === undefined) return undefined
          // 精修后 source 里的 charStart/charEnd 是原文坐标，不能拿来在渲染后的正文里比远近。
          // 页面定位只认保存的渲染坐标；没有就交给 quote 自己找（重复片段取第一处）。
          const savedOffset =
            item.source.textOrigin === 'source'
              ? Number.isFinite(item.source.renderedCharStart)
                ? item.source.renderedCharStart
                : undefined
              : item.source.charStart
          const range = matchInRoot(root, item.quote, savedOffset)
          if (range !== undefined) item.liveRange = range
          return range
        }

        /* ------------------------------------------------------------------ 批注集合 */

        let sequence = 0

        function renumber() {
          annotations = annotations.map((item, index) => (item.number === index + 1 ? item : { ...item, number: index + 1 }))
        }

        function addAnnotation(input) {
          const rawQuote = typeof input.quote === 'string' ? input.quote : ''
          const quote = typeof input.quote === 'string' ? input.quote.trim().slice(0, MAX_QUOTE) : ''
          const note = typeof input.note === 'string' ? input.note.trim().slice(0, MAX_NOTE) : ''
          // trim 与 MAX_QUOTE 截断会让分段的偏移越界：按最终引文收紧末段，保持不变式。
          const source = fitSegmentsToQuote(input.source ?? { kind: 'dom' }, rawQuote, quote)
          // 空选区空批注没有意义。
          if (quote === '' && note === '') return undefined
          sequence += 1
          const item = {
            id: `sa-${Date.now().toString(36)}-${sequence}`,
            uuid: uuidV4(),
            number: annotations.length + 1,
            quote,
            note,
            images: Array.isArray(input.images) ? input.images.slice() : [],
            source,
            liveRange: input.liveRange,
            createdAt: Date.now(),
          }
          annotations = [...annotations, item]
          emit()
          scheduleSync()
          scheduleRepaint('emit')
          saveDraft(annotationsSession)
          return item
        }

        /**
         * 提示位换文案：旧文案原地淡出，新文案同时从右侧滑入（两段动画并行，不串行等待）；
         * 文本层被提示位容器裁切，不会盖到右侧按钮上。
         */
        function swapHintText(hint, text, animate) {
          hint.title = text
          const current = hint.querySelector('.sa-hint-layer')
          const next = document.createElement('span')
          next.className = 'sa-hint-layer'
          next.textContent = text
          if (!animate || current === null) {
            hint.textContent = ''
            hint.appendChild(next)
            return
          }
          next.classList.add('sa-hint-in')
          current.classList.add('sa-hint-out')
          hint.appendChild(next)
          window.setTimeout(() => {
            if (!hint.isConnected) return
            current.remove()
            next.classList.remove('sa-hint-in')
            hint.textContent = ''
            hint.appendChild(next)
          }, 320)
        }

        /**
         * 反馈文案按所在的表面分开记：浮层总览与右侧标签页可能同时挂载，反馈只落在
         * 用户点的那个界面上，互不覆盖；面板重绘时也由这份状态回填。
         */
        const panelHintMessages = { panel: '', side: '' }
        const panelHintTimers = { panel: 0, side: 0 }

        /** 从被点击的元素判断它属于浮层还是右侧标签页；没有来源时按浮层处理。 */
        function hintSurfaceOf(root) {
          return root instanceof Element && root.closest('[data-sa-ui="side"]') !== null ? 'side' : 'panel'
        }

        /** 取某个表面上当前挂载的提示位；两块都挂载时优先取可见的一块。 */
        function livePanelHint(surface) {
          const selector = surface === 'side' ? '[data-sa-ui="side"] .sa-panel-hint' : '[data-sa-ui="panel"] .sa-panel-hint'
          const hints = Array.from(document.querySelectorAll(selector))
          return hints.find((hint) => hint.getClientRects().length > 0) || hints[0] || null
        }

        function panelHintTextOf(surface) {
          return panelHintMessages[surface] || ''
        }

        /** 总览右上角的提示位：换一条反馈，1.6 秒后换回默认说明。 */
        function flashPanelHint(message, root) {
          const surface = hintSurfaceOf(root)
          panelHintMessages[surface] = message
          const hint = livePanelHint(surface)
          if (hint !== null) {
            if (hint.querySelector('.sa-hint-layer') === null) {
              hint.textContent = ''
              const layer = document.createElement('span')
              layer.className = 'sa-hint-layer'
              layer.textContent = t('panel.foot')
              hint.appendChild(layer)
            }
            swapHintText(hint, message, true)
          }
          if (panelHintTimers[surface] !== 0) window.clearTimeout(panelHintTimers[surface])
          panelHintTimers[surface] = window.setTimeout(() => {
            panelHintTimers[surface] = 0
            panelHintMessages[surface] = ''
            const live = livePanelHint(surface)
            if (live !== null) swapHintText(live, t('panel.foot'), true)
          }, 1600)
        }

        /**
         * 拷贝批注：等剪贴板写入有真实结果再给提示，成功与失败各一条文案。
         * @param doneMessage - 成功提示；不给时用默认的「已拷贝 n 条」。
         */
        async function copyAnnotationsToClipboard(items, root, doneMessage) {
          const list = Array.isArray(items) ? items : []
          if (list.length === 0) return false
          const copied = await writeClipboardText(serializeAnnotations(list))
          const done =
            typeof doneMessage === 'string' && doneMessage !== ''
              ? doneMessage
              : t('panel.copyDone', { n: list.length })
          const message = copied ? done : t('panel.copyFailed')
          const surface = hintSurfaceOf(root)
          flashPanelHint(message, root)
          // 面板没挂载或不可见时提示位看不见：回放这类从会话里发起的拷贝改用页面提示兜底。
          const hint = livePanelHint(surface)
          if (hint === null || hint.getClientRects().length === 0) flashJumpToast(message)
          return copied
        }

        /** 追加批注并去重：粘贴导入与「回放」共用同一套内容指纹判重。 */
        function addUniqueAnnotations(list) {
          let added = 0
          const seen = new Set(annotations.map((item) => annotationSignature(item)))
          for (const item of list) {
            const signature = annotationSignature(item)
            if (seen.has(signature)) continue
            seen.add(signature)
            const created = addAnnotation({
              quote: item.quote,
              note: item.note,
              images: item.images,
              source: item.source,
            })
            if (created !== undefined) added += 1
          }
          return added
        }

        /** 粘贴导入：与回放同义，追加成新批注，已存在的同一条跳过（不覆盖、不重复）。 */
        function importAnnotations(items, root) {
          const list = Array.isArray(items) ? items : []
          if (list.length === 0) return 0
          const added = addUniqueAnnotations(list)
          if (added === 0) {
            // 列表解析成功但每一条都已存在：说清没有新内容，不冒充导入成功。
            flashPanelHint(t('panel.pasteNothing'), root)
            return 0
          }
          flashPanelHint(t('panel.pasteDone', { n: added }), root)
          scheduleRepaint('emit')
          return added
        }

        function pasteAnnotationsFromClipboard(root) {
          const read = safe(() => navigator.clipboard?.readText)
          if (typeof read !== 'function') {
            flashPanelHint(t('panel.pasteFailed'), root)
            return
          }
          read
            .call(navigator.clipboard)
            .then((text) => {
              const items = parseAnnotations(text)
              if (items === undefined) {
                flashPanelHint(t('panel.pasteFailed'), root)
                return
              }
              importAnnotations(items, root)
            })
            .catch(() => flashPanelHint(t('panel.pasteFailed'), root))
        }

        /** 改写一条既有批注的批注文字与图片；原文与出处不变。*/
        function updateAnnotation(id, note, images) {
          const next = typeof note === 'string' ? note.trim().slice(0, MAX_NOTE) : ''
          const nextImages = Array.isArray(images) ? images.slice() : undefined
          let hit = false
          annotations = annotations.map((item) => {
            if (item.id !== id) return item
            hit = true
            return { ...item, note: next, ...(nextImages === undefined ? {} : { images: nextImages }) }
          })
          if (!hit) return
          emit()
          scheduleSync()
          saveDraft(annotationsSession)
        }

        /** 只改写一条批注的出处（懒迁移用）：正文、图片与编号都不动。*/
        function updateAnnotationSource(id, source) {
          if (typeof id !== 'string' || id === '' || source === null || typeof source !== 'object') return false
          let hit = false
          annotations = annotations.map((item) => {
            if (item.id !== id) return item
            hit = true
            return { ...item, source }
          })
          if (!hit) return false
          emit()
          // 出处只在本地用：草稿落盘即可，不需要为它重传附件。
          saveDraft(annotationsSession)
          return true
        }

        function removeAnnotation(id) {
          annotations = annotations.filter((item) => item.id !== id)
          renumber()
          emit()
          scheduleSync()
          scheduleRepaint('emit')
          saveDraft(annotationsSession)
        }

        /** 把一条批注移到另一条之前；beforeId 为 null 表示移到末尾。*/
        function moveAnnotation(id, beforeId) {
          if (id === beforeId) return
          const moving = annotations.find((item) => item.id === id)
          if (moving === undefined) return
          const rest = annotations.filter((item) => item.id !== id)
          const target = beforeId === null ? rest.length : rest.findIndex((item) => item.id === beforeId)
          rest.splice(target < 0 ? rest.length : target, 0, moving)
          annotations = rest
          renumber()
          emit()
          scheduleSync()
          scheduleRepaint('emit')
          saveDraft(annotationsSession)
          refreshPanel()
        }

        function clearAnnotations() {
          annotations = []
          // 注意：不要在这里清 draftIds —— 交给 syncAttachment 才能把已挂上的附件摘掉。
          emit()
          scheduleSync()
          scheduleRepaint('emit')
          saveDraft(annotationsSession)
        }

        /** 刚发出的负载在页面上等多久；超时就放弃关联（用户可能只是移除了附件）。*/

        /* ------------------------------------------------- 已提交批注的历史回看 */

        const sentStore = createSentStore({
          getStorage: () => draftStorage(),
          tableFor: sentBySession,
          prefix: SENT_STORAGE_PREFIX,
          maxEntries: SENT_MAX_ENTRIES,
          maxBytes: SENT_MAX_BYTES,
          maxItems: DRAFT_MAX_ITEMS,
          onChanged: (sessionId) => {
            if (!hydratedSessions.has(sessionId)) {
              pendingRemotePush.add(sessionId)
              return
            }
            scheduleRemotePush(sessionId)
          },
        })
        const loadSent = (sessionId) => sentStore.loadSent(sessionId)
        const saveSent = (sessionId, table) => sentStore.saveSent(sessionId, table)
        const recordSent = (sessionId, anchorKey, items, turn, options) => {
          const extra = options ?? {}
          // 批次编号在这一批第一次进台账时生成，之后重发/刷新都从台账读回同一个值；
          // 老记录（刷新时从宿主并进来、当初没有编号）保持没有，首次提交先走旧路径，等宿主返回再回填。
          const existing = sentStore.loadSent(sessionId).get(anchorKey)
          const storedUuid =
            typeof existing?.batchUuid === 'string' && existing.batchUuid !== '' ? existing.batchUuid : undefined
          const givenUuid =
            typeof extra.batchUuid === 'string' && extra.batchUuid !== '' ? extra.batchUuid : undefined
          const batchUuid = givenUuid ?? storedUuid ?? (existing === undefined ? uuidV4() : undefined)
          sentStore.recordSent(sessionId, anchorKey, items, turn, {
            ...extra,
            ...(batchUuid !== undefined ? { batchUuid } : {}),
          })
          consumedSnapshot = null
          // 台账多了一条：会话区必须重建一次，否则新卡要等下一次无关的变化才肯出现。
          markConversationDirty()
        }
        const updateSentBatch = (sessionId, anchorKey, options) => {
          sentStore.updateSentBatch(sessionId, anchorKey, options)
          // 批次号与条目 uuid 回填后，答复才认得出自己属于哪张卡，得再归位一遍。
          markConversationDirty()
        }

        /** 宿主返回的条目 uuid 与请求里的 items 按序对应；缺列表或长度对不上就整批不记。 */
        function batchItemUuids(result, count) {
          const list = Array.isArray(result?.items)
            ? result.items
            : Array.isArray(result?.entries)
              ? result.entries
              : Array.isArray(result?.uuids)
                ? result.uuids
                : undefined
          if (list === undefined || list.length !== count) return undefined
          const uuids = list.map((entry) =>
            typeof entry === 'string' ? entry : typeof entry?.uuid === 'string' ? entry.uuid : '',
          )
          return uuids.every((uuid) => uuid !== '') ? uuids : undefined
        }

        /** 本次页面生命周期内每条记录最多自动重试 3 次；键带会话，避免同锚点跨会话互相计数。*/
        const sentBatchRetries = new Map()
        /** 同一记录同一时间只允许一个 POST 在飞：重绘可能连续排几遍，避免把重试次数一次烧光。*/
        const sentBatchInflight = new Set()
        const SENT_BATCH_RETRY_MAX = 3

        function sentRetryKey(sessionId, storedKey) {
          return `${sessionId}\u0000${storedKey}`
        }

        /** 只改台账记录里的 unsynced 标记；返回是否真的写回了一次。*/
        function setSentUnsynced(sessionId, storedKey, unsynced) {
          const table = sentStore.loadSent(sessionId)
          const record = table.get(storedKey)
          if (record === undefined) return false
          if ((record.unsynced === true) === unsynced) return false
          const next = { ...record }
          if (unsynced) next.unsynced = true
          else delete next.unsynced
          table.set(storedKey, next)
          sentStore.saveSent(sessionId, table)
          return true
        }

        /** 卡片标题旁的小标记：只加在已发送卡片的标题行，不参与布局计算。*/
        function paintUnsyncedBadge(card, unsynced) {
          if (card === null || typeof card?.querySelector !== 'function') return
          const existing = card.querySelector('.sa-sent-unsynced')
          if (!unsynced) {
            if (existing !== null) existing.remove()
            return
          }
          if (existing !== null) return
          const title = card.querySelector('.sa-section-title')
          if (title === null || title.parentElement === null) return
          const badge = el('span', 'sa-sent-unsynced', t('sent.unsynced'))
          badge.setAttribute('data-sa-field', 'unsynced')
          title.parentElement.insertBefore(badge, title.nextSibling)
        }

        /** 批次失败：留一条 trace、把台账标成未同步，并让卡片重画一次把标记露出来。*/
        function markSentUnsynced(sessionId, storedKey, count, status, reason) {
          const record = sentStore.loadSent(sessionId).get(storedKey)
          const anchorKey =
            typeof record?.anchorKey === 'string' && record.anchorKey !== '' ? record.anchorKey : storedKey
          scrollTrace.push({
            t: Date.now(),
            kind: 'batch-fail',
            status: Number.isFinite(status) ? status : 0,
            sessionId,
            anchorKey,
            items: count,
            reason: String(reason ?? ''),
          })
          // 旧宿主没有批次接口（404/405）：整份快照仍会落库，标未同步是误报，只留 trace。
          if (reason === 'unsupported') return
          setSentUnsynced(sessionId, storedKey, true)
          if (currentSessionId() === sessionId) {
            const card = document.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`)
            paintUnsyncedBadge(card, true)
            markConversationDirty()
            scheduleRepaint('batch-fail')
          }
        }

        /** 发送请求体：锚点优先用台账里解析后的消息行锚点，旧键（time:/turn-process）不会写进宿主。*/
        function sentBatchBody(sessionId, storedKey, items, turn, batchAt, bodyAnchorKey) {
          // thumbs 是本地缩略图，不进宿主请求：宿主只认 uuid/index/quote/note/source/images。
          const wireItems = items.map((item) => ({
            ...(typeof item.uuid === 'string' && item.uuid !== '' ? { uuid: item.uuid } : {}),
            index: item.index,
            quote: item.quote,
            note: item.note,
            source: item.source,
            ...(Array.isArray(item.images) ? { images: item.images } : {}),
          }))
          // 批号随台账走：同批重发时重复发送同一个值，宿主才能认成同一批而不是新批次。
          // 老记录没有编号时不发该字段，等宿主返回后再由 updateSentBatch 回填。
          const storedRecord = sentStore.loadSent(sessionId).get(storedKey)
          const batchUuid =
            typeof storedRecord?.batchUuid === 'string' && storedRecord.batchUuid !== ''
              ? storedRecord.batchUuid
              : undefined
          return {
            ...(Number.isFinite(turn) ? { turn } : {}),
            anchor_key: bodyAnchorKey,
            ...(Number.isFinite(batchAt) ? { batch_at: batchAt } : {}),
            ...(batchUuid !== undefined ? { batch_uuid: batchUuid } : {}),
            items: wireItems,
          }
        }

        /**
         * 新宿主落账：本地卡片已经出来，这里只补批号与条目 uuid。
         * 失败时不再静默：把记录标成未同步并留一条 batch-fail trace，卡片标题旁会显示「未同步」。
         */
        function syncSentBatch(sessionId, storedKey, items, turn, batchAt) {
          if (typeof sessionId !== 'string' || sessionId === '' || !Array.isArray(items) || items.length === 0) return
          const flightKey = sentRetryKey(sessionId, storedKey)
          if (sentBatchInflight.has(flightKey)) return
          sentBatchInflight.add(flightKey)
          const settle = () => sentBatchInflight.delete(flightKey)
          const storedRecord = sentStore.loadSent(sessionId).get(storedKey)
          const bodyAnchorKey =
            typeof storedRecord?.anchorKey === 'string' && storedRecord.anchorKey !== ''
              ? storedRecord.anchorKey
              : storedKey
          const body = sentBatchBody(sessionId, storedKey, items, turn, batchAt, bodyAnchorKey)
          // 发 POST 之前先留一条：日志里能看到「这一批发过请求」，与后面的 batch-done 配对看。
          scrollTrace.push({
            t: Date.now(),
            kind: 'batch-post',
            session: sessionId,
            anchorKey: bodyAnchorKey,
            items: items.length,
            hasBatchUuid: typeof body.batch_uuid === 'string' && body.batch_uuid !== '',
          })
          void remoteSync
            .createBatch(sessionId, body)
            .then((result) => {
              settle()
              if (result === undefined || result?.ok !== true) {
                const status = Number.isFinite(result?.status) ? result.status : 0
                const reason =
                  typeof result?.reason === 'string' && result.reason !== '' ? result.reason : 'unknown'
                // 结果与 batch-fail 用同一个 reason，两条能对上；batch-fail 仍保留。
                scrollTrace.push({
                  t: Date.now(),
                  kind: 'batch-done',
                  session: sessionId,
                  ok: false,
                  status,
                  reason,
                })
                markSentUnsynced(sessionId, storedKey, items.length, status, reason)
                return
              }
              scrollTrace.push({
                t: Date.now(),
                kind: 'batch-done',
                session: sessionId,
                ok: true,
                status: Number.isFinite(result.status) ? result.status : 0,
                reason: '',
              })
              sentBatchRetries.delete(sentRetryKey(sessionId, storedKey))
              // 成功落库：先摘掉未同步标记，再回填批号与条目 uuid。
              setSentUnsynced(sessionId, storedKey, false)
              const batchUuid =
                typeof result.batch_uuid === 'string' && result.batch_uuid !== '' ? result.batch_uuid : undefined
              const batchSeq = Number.isSafeInteger(result.batch_seq) ? result.batch_seq : undefined
              if (batchUuid !== undefined) {
                // 创建批次时可能还不知道 turn / 真实锚点：消息行出现后回填，只补空值。
                void remoteSync
                  .patchBatch(batchUuid, {
                    ...(Number.isFinite(turn) ? { turn } : {}),
                    ...(typeof bodyAnchorKey === 'string' && bodyAnchorKey !== ''
                      ? { anchor_key: bodyAnchorKey }
                      : {}),
                  })
                  .catch(() => {})
              }
              if (batchUuid !== undefined || batchSeq !== undefined) {
                updateSentBatch(sessionId, storedKey, {
                  batchUuid,
                  batchSeq,
                  uuids: batchItemUuids(result, items.length),
                })
              }
              if (currentSessionId() === sessionId) {
                const card = document.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`)
                paintUnsyncedBadge(card, false)
              }
              // 回填只发生一次：这时才需要重建一遍会话区，让答复按 uuid 归到这张卡上。
              scheduleRepaint('emit')
            })
            .catch((error) => {
              settle()
              const reason = error instanceof Error && error.message !== '' ? error.message : 'network'
              scrollTrace.push({
                t: Date.now(),
                kind: 'batch-done',
                session: sessionId,
                ok: false,
                status: 0,
                reason,
              })
              markSentUnsynced(sessionId, storedKey, items.length, 0, reason)
            })
        }

        /** 重绘时补一次失败批次；同一条记录最多 3 次，成功在 syncSentBatch 里清计数。*/
        function retryUnsyncedSentBatch(sessionId, storedKey, record) {
          if (record?.unsynced !== true) return
          const retryKey = sentRetryKey(sessionId, storedKey)
          if (sentBatchInflight.has(retryKey)) return
          const used = sentBatchRetries.get(retryKey) ?? 0
          if (used >= SENT_BATCH_RETRY_MAX) return
          sentBatchRetries.set(retryKey, used + 1)
          syncSentBatch(sessionId, storedKey, record.items, turnOfRecord(record, storedKey), record.savedAt)
        }

        /**
         * 页面上所有用户消息行（锚点键）。
         *
         * 不能等附件卡片做锚点：实测会话日志里用户消息**不含 file 块*，页面上也就没有
         * 「批注json」卡片。所以锚点直接取消息行本身。
         */
        /**
         * 页面上可能承载「本次批注」的行，按可信度从高到低：
         *   1. 带批注附件的行（最精确，但纯批注消息在部分视图里不渲染附件行）；
         *   2. 用户消息行；
         *   3. 折叠组 / 过程行 —— 纯批注消息常被收进 `turn-process` 组，只有组行可锚定。
         * 三者取并集、按锚点键去重，避免同一行被重复插入卡片。
         *
         * 工具调用行也带 `data-chat-anchor-key`（`call:*`），但它不是消息：没有
         * `data-chat-flow-kind`，却被上面的第三类当成「过程行」收进来。拿它当锚点会把
         * 已发送卡挂到一次工具调用上，台账里也就写进了工具调用 id 而不是消息键。
         */
        function collectAnchorRows() {
          const rows = []
          const seen = new Set()
          const push = (element, anchorKey) => {
            if (anchorKey === '' || seen.has(anchorKey)) return
            seen.add(anchorKey)
            rows.push({ row: element, anchorKey })
          }

          for (const attachmentRow of document.querySelectorAll('[data-message-attachments]')) {
            if (!/批注\.json/.test(attachmentRow.textContent ?? '')) continue
            const row = attachmentRow.closest('[data-chat-anchor-key]')
            if (row === null) continue
            push(row, row.getAttribute('data-chat-anchor-key') ?? '')
          }

          for (const element of document.querySelectorAll('[data-chat-anchor-key]')) {
            const kind = element.getAttribute('data-chat-flow-kind') ?? ''
            if (kind !== 'user' && kind !== 'steering') continue
            push(element, element.getAttribute('data-chat-anchor-key') ?? '')
          }

          for (const element of document.querySelectorAll('[data-chat-anchor-key]')) {
            const kind = element.getAttribute('data-chat-flow-kind') ?? ''
            const anchorKey = element.getAttribute('data-chat-anchor-key') ?? ''
            // 分组外壳也带 data-chat-turn，但它不是消息：把它当锚点会写出 group:* 这类键。
            if (anchorKey.startsWith('group:')) continue
            // 工具调用行只有 data-chat-anchor-key 与 data-chat-call-id，没有 data-chat-flow-kind；
            // 它同样不是消息，不能当锚点（曾把 call_* 记成已发送批注的锚点）。
            if (anchorKey.startsWith('call:')) continue
            if (element.hasAttribute?.('data-chat-group-key')) continue
            if (kind === '') push(element, anchorKey)
          }
          return rows
        }

        /** 当前页面上已有的候选锚点键；排队气泡还不是「已发出」，不能进发送前快照。*/
        function captureAnchorKeys() {
          return new Set(
            collectAnchorRows()
              .filter((entry) => !isPendingEchoRow(entry.row))
              .map((entry) => entry.anchorKey),
          )
        }

        /** 还没真正发出的消息：DSH 先渲染带等待态属性的裸 userRow，admission 后才换成入库消息行。*/
        const PENDING_ECHO_SELECTOR = '[data-pending-steering], [data-submission-echo]'

        /** 这一行是否还带等待态属性。只认真正的属性，方法缺失时按「不是等待态」处理。*/
        function isPendingEchoRow(row) {
          if (row === null || row === undefined || typeof row.getAttribute !== 'function') return false
          return (
            row.getAttribute('data-pending-steering') !== null ||
            row.getAttribute('data-submission-echo') !== null
          )
        }

        /**
         * 收集「还没真正发出」的排队气泡。这类节点没有锚点键，混不进 collectAnchorRows；
         * 它们带 data-pending-steering（主机待确认的插队消息）或 data-submission-echo（本地提交回声），
         * 真正发出后会被不带这两个属性的消息行替换。
         */
        function pendingEchoes(scope) {
          const root = scope !== null && scope !== undefined && scope.isConnected ? scope : document
          const echoes = []
          for (const element of root.querySelectorAll(PENDING_ECHO_SELECTOR)) {
            if (typeof element.getClientRects === 'function' && element.getClientRects().length === 0) continue
            echoes.push(element)
          }
          return echoes
        }

        /** 把新出现的候选行与刚发出的批注负载按出现顺序配对。*/
        /** 当前输入框所在那一屏会话：从可见输入框往上找同时含消息行的祖先。*/
        function chatScopeOfInput() {
          const inputs = [...document.querySelectorAll('textarea, [contenteditable="true"]')].filter((input) => {
            const rect = safe(() => input.getBoundingClientRect())
            return rect !== undefined && rect.width > 0 && rect.height > 0
          })
          for (const input of inputs.reverse()) {
            let node = input.parentElement
            for (let i = 0; i < 12 && node !== null && node !== undefined; i += 1) {
              if (typeof node.querySelector === 'function' && node.querySelector('[data-chat-turn]') !== null) return node
              node = node.parentElement
            }
          }
          return null
        }

        /** 发送时就在输入框那一屏里数出轮次：最大轮次，若该轮还没有「已完成」就仍算进行中。*/
        function turnHintForScope(scope) {
          const root = scope ?? document
          let max = 0
          for (const item of root.querySelectorAll('[data-chat-turn]')) {
            const turn = Number(item.getAttribute('data-chat-turn'))
            if (Number.isFinite(turn) && turn > max) max = turn
          }
          if (max === 0) return null
          const settled = root.querySelector(`[data-turn-process="${max}"]`) !== null
          return settled ? max + 1 : max
        }

        /** 记账一直没成功：把快照放回界面，至少让用户看到自己写了什么（台账里没有，卡片也不会出现）。*/
        function restoreConsumedSnapshot() {
          if (consumedSnapshot === null) return
          const known = new Set(annotations.map((item) => item.id))
          const restored = consumedSnapshot.items.filter((item) => !known.has(item.id))
          consumedSnapshot = null
          if (restored.length === 0) return
          annotations = [...restored, ...annotations]
          emit()
          scheduleRepaint('emit')
          saveDraft(annotationsSession)
          warn('[selection-annotations] 这批批注没能记进已发送台账，已放回界面。')
        }

        function scanSentMessages() {
          if (pendingSent.length === 0) return
          const now = Date.now()
          const expired = []
          const stillPending = []
          for (const entry of pendingSent) {
            if (now - entry.at < SENT_PENDING_TTL_MS) {
              stillPending.push(entry)
              continue
            }
            // 排队中的消息还没真正发出：TTL 只能兜底「发出后一直找不到锚点」，
            // 不能把还在队列里的卡片提前放出来，所以继续留在待记账队列里等。
            if (pendingEchoes(entry.scope).length > 0) {
              stillPending.push(entry)
              continue
            }
            expired.push(entry)
          }
          pendingSent = stillPending
          let expiredRecorded = false
          for (const entry of expired) {
            const entrySession =
              typeof entry.sessionId === 'string' && entry.sessionId !== '' ? entry.sessionId : currentSessionId()
            if (entrySession === undefined) continue
            let hint = entry.turnHint
            if (!Number.isFinite(hint) && entry.scope !== null && entry.scope !== undefined && entry.scope.isConnected) {
              hint = turnHintForScope(entry.scope)
            }
            if (!Number.isFinite(hint)) continue
            recordSent(entrySession, `turn:${hint}:${entry.at}`, entry.items, hint)
            expiredRecorded = true
          }
          if (expiredRecorded) scheduleRepaint('mutation')
          if (expired.length > 0 && !expiredRecorded && pendingSent.length === 0) restoreConsumedSnapshot()
          if (pendingSent.length === 0) return
          const pending = pendingSent[0]
          const sessionId =
            typeof pending.sessionId === 'string' && pending.sessionId !== '' ? pending.sessionId : currentSessionId()
          if (sessionId === undefined) return
          // 宿主已把批注附件并进用户正文：这条消息不再「新出现」，附件文件也不会渲染，
          // 按新行找锚点会一直落空。先按正文找回真正承载这条批注的用户消息行，锚点与轮次
          // 都取该行自己的；找不到才退回发送时数出的轮次，卡片仍按轮次显示。
          const recordWithHint = () => {
            const known = new Set(pending.known)
            for (const [key, other] of loadSent(sessionId)) {
              known.add(key)
              if (typeof other.anchorKey === 'string' && other.anchorKey !== '') known.add(other.anchorKey)
            }
            // 发送时记下的那一屏可能已经切走：退回当前可见的会话，避免认到别的会话的行上。
            let scope = pending.scope
            if (scope === null || scope === undefined || !scope.isConnected) {
              scope = visibleConversationScopes()[0] ?? null
            }
            const sentRow = scope === null ? null : findSentAnnotationRow(scope, known, pending.items)
            if (sentRow !== null) {
              pendingSent.shift()
              recordSent(sessionId, sentRow.anchorKey, pending.items, sentRow.turn)
              syncSentBatch(sessionId, sentRow.anchorKey, pending.items, sentRow.turn, pending.at)
              scheduleRepaint('emit')
              return true
            }
            let hint = pending.turnHint
            if (!Number.isFinite(hint) && pending.scope !== null && pending.scope !== undefined && pending.scope.isConnected) {
              hint = turnHintForScope(pending.scope)
            }
            if (!Number.isFinite(hint)) return false
            pendingSent.shift()
            recordSent(sessionId, `turn:${hint}:${pending.at}`, pending.items, hint)
            syncSentBatch(sessionId, `turn:${hint}:${pending.at}`, pending.items, hint, pending.at)
            scheduleRepaint('emit')
            return true
          }
          const rows = collectAnchorRows()
          // 这一批可能还排在队列里：等待态气泡已经出现，但还没 admission。
          const queued = pendingEchoes(pending.scope)
          if (rows.length === 0) {
            if (queued.length > 0) return
            recordWithHint()
            return
          }
          // 候选：不在「发送前快照」里、也还没落台账的行；「已完成」尾行不是消息，别拿它当锚点。
          const fresh = rows.filter((entry) => {
            if (pending.known.has(entry.anchorKey)) return false
            if (loadSent(sessionId).has(entry.anchorKey)) return false
            const kind = entry.row.getAttribute('data-chat-flow-kind') ?? ''
            if (kind === 'turn-process') return false
            // 还带等待态属性的行不是「真的发出了」：既不能当锚点，也不该让卡片提前出现。
            if (isPendingEchoRow(entry.row)) return false
            // 发送时记下的那一屏会话范围：别的会话的行即使可见，也不参与这一批的记账。
            if (pending.scope !== null && pending.scope !== undefined && pending.scope.isConnected && !pending.scope.contains(entry.row)) return false
            // 别的会话留在页面里、已切走但未卸载时也会被扫到；只认真正看得见的行。
            if (typeof entry.row.getClientRects === 'function' && entry.row.getClientRects().length === 0) return false
            return true
          })
          // 只认两类：带 批注.json 附件的气泡（插队消息也能认出来），或 user/steering 气泡。
          // 过程里的推理行、工具调用行不参与，否则会把记账锚点挂到 call:* 上（历史事故）。
          const attached = fresh.filter((entry) => /批注\.json/.test(entry.row.textContent ?? ''))
          const bubbles = fresh.filter((entry) => {
            const kind = entry.row.getAttribute('data-chat-flow-kind') ?? ''
            return kind === 'user' || kind === 'steering'
          })
          // 最后兜底：既没有附件文字、也不是 user/steering 的行，只在 kind 为空/分组行里挑，
          // 仍排除过程块里的推理行与工具调用行。
          const loose = fresh.filter((entry) => {
            const kind = entry.row.getAttribute('data-chat-flow-kind') ?? ''
            return kind === ''
          })
          const pool = attached.length > 0 ? attached : bubbles.length > 0 ? bubbles : loose
          // 等气泡最多 1.2 秒：消息气泡有时要等回合开始才挂出来，但「已发送」不该因此迟到太久。
          const wait = Date.now() - pending.at
          const fallback = pool.length === 0 && queued.length === 0 && wait > 1200 ? fresh.slice(-1) : []
          const usable = pool.length > 0 ? pool : fallback
          // 同一时间可能有多个会话的 DOM 留在页面里；取轮次最大的那一条，避免挂到旧会话的气泡上。
          let target = usable[0]
          let bestTurn = -1
          for (const entry of usable) {
            const turn = turnOfRow(entry.row)
            const score = Number.isFinite(turn) ? turn : 0
            if (score >= bestTurn) {
              bestTurn = score
              target = entry
            }
          }
          if (target === undefined) {
            // 还排在队列里就先不记账：等它真正发出、等待态气泡被消息行替换后再认领。
            if (queued.length > 0) return
            // 消息行还没出现也不用干等：发送时数出的轮次已经能定位，先用它落台账。
            recordWithHint()
            return
          }
          pendingSent.shift()
          const turn = turnOfRow(target.row)
          recordSent(sessionId, target.anchorKey, pending.items, turn)
          syncSentBatch(sessionId, target.anchorKey, pending.items, turn, pending.at)
          scheduleRepaint('emit')
        }

        const markdown = createMarkdown({
          h,
          MarkdownText: extras.MarkdownText,
          createRoot: extras.createRoot,
          labels: () => ({
            code: { copyLabel: t('markdown.copy'), copiedLabel: t('markdown.copied') },
            footnotes: t('markdown.footnotes'),
          }),
        })
        const cards = createCards({ t, openImageViewer, markdown, isAdopt: hasAdoptNote, noteView: noteViewOf })
        const sectionChevron = () => cards.sectionChevron()
        const buildSectionHead = (label, meta) => cards.buildSectionHead(label, meta)
        const collapsible = (body, open) => cards.collapsible(body, open)
        const applyCollapsed = (head, wrap, open) => cards.applyCollapsed(head, wrap, open)
        const buildSentCard = (record, anchorKey, options) => cards.buildSentCard(record, anchorKey, options)

        /** 批注行所属的轮次块：行可能就在过程块内部（指向助手的答复或过程文字）。*/
        function turnBlockOf(row) {
          // 只认「行本身就在轮次块里」这一种情况。以前还会退到「行之后最近的已完成按钮」，
          // 但历史轮次的 DOM 被裁掉时，那个按钮可能属于后面某一轮，会把轮次学错（曾把第 101 轮记成第 112 轮）。
          return typeof row.closest === 'function' ? row.closest('[data-chat-flow-kind="turn-process"]') : null
        }

        /** 0.2.2 起每个 flow 项都带 data-chat-turn；老结构再退回过程块/尾行推断。*/
        function turnOfRow(row) {
          const holder = typeof row.closest === 'function' ? row.closest('[data-chat-turn]') : null
          if (holder !== null && holder !== undefined) {
            const raw = holder.getAttribute('data-chat-turn')
            const turn = Number(raw)
            if (Number.isFinite(turn) && turn > 0) return turn
          }
          const block = turnBlockOf(row)
          if (block === null) return undefined
          const button = typeof block.querySelector === 'function' ? block.querySelector('[data-turn-process]') : null
          const raw = button === null ? null : button.getAttribute('data-turn-process')
          const turn = Number(raw)
          return Number.isFinite(turn) && turn > 0 ? turn : undefined
        }

        /** 这一轮里第一条内容项（跳过用户消息）：轮次进行中还没有「已完成」按钮时用它当锚点。*/
        function turnContentItem(turn) {
          if (!Number.isFinite(turn)) return null
          for (const item of document.querySelectorAll(`[data-chat-turn="${turn}"]`)) {
            const kind = item.getAttribute('data-chat-flow-kind') ?? ''
            if (kind === 'user' || kind === 'steering') continue
            if (item.parentElement === null) continue
            return item
          }
          return null
        }

        /** 「已完成」按钮所在的整条 flow 项：0.2.2 里按钮内联在消息体，插到项前才是轮次上方。*/
        function turnDisclosureItem(turn) {
          if (!Number.isFinite(turn)) return null
          const button = document.querySelector(`[data-turn-process="${turn}"]`)
          if (button === null) return null
          const flow = typeof button.closest === 'function' ? button.closest('[data-chat-flow-kind]') : null
          return flow ?? button
        }

        /** 卡片固定贴在所属轮次内容的上方；轮次进行中或已结束都按轮次标记定位。*/
        function sentCardAnchor(row) {
          const turn = turnOfRow(row)
          const item = turnContentItem(turn) ?? turnDisclosureItem(turn)
          if (item !== null && item.parentElement !== null && item.parentElement !== document.body) {
            return { parent: item.parentElement, before: item }
          }
          const block = turnBlockOf(row)
          if (block !== null) {
            const parent = block.parentElement
            if (parent !== null && parent !== document.body) return { parent, before: block }
          }
          const flow =
            row.getAttribute?.('data-chat-flow-kind') !== null
              ? row
              : (typeof row.closest === 'function' ? (row.closest('[data-chat-flow-kind]') ?? row) : row)
          const parent = flow.parentElement
          if (parent === null || parent === document.body) return { parent: row.parentElement, before: row.nextSibling }
          return { parent, before: flow.nextElementSibling }
        }

        /** 旧台账可能把「已完成」尾行当锚点，渲染时改认这一轮里真正的批注消息行。*/
        function isTurnProcessAnchor(anchorKey) {
          return typeof anchorKey === 'string' && /:turn-process\d+$/.test(anchorKey)
        }

        function annotationRowBefore(footerRow) {
          let best = null
          for (const element of document.querySelectorAll('[data-chat-anchor-key]')) {
            const kind = element.getAttribute('data-chat-flow-kind') ?? ''
            if (kind === 'turn-process') continue
            if ((element.compareDocumentPosition(footerRow) & 4) === 0) continue
            const selfAttach = element.getAttribute('data-message-attachments')
            const nested = typeof element.querySelector === 'function' ? element.querySelector('[data-message-attachments]') : null
            if (selfAttach === null && nested === null) continue
            const text = (selfAttach !== null ? element.textContent : nested.textContent) ?? ''
            if (!/批注\.json/.test(text)) continue
            best = element
          }
          return best
        }

        function resolveLegacyAnchor(anchorKey) {
          if (!isTurnProcessAnchor(anchorKey)) return anchorKey
          const footerRow = document.querySelector(`[data-chat-anchor-key="${cssEscape(anchorKey)}"]`)
          if (footerRow === null) return anchorKey
          const resolved = annotationRowBefore(footerRow)
          return resolved?.getAttribute('data-chat-anchor-key') ?? anchorKey
        }

        /** 记录里记下的轮次号：新记录直接存；旧记录从 turn-process 锚点里取。*/
        function turnOfRecord(record, storedKey) {
          if (Number.isFinite(record.turn)) return record.turn
          const legacy = /:turn-process(\d+)$/.exec(storedKey)
          return legacy === null ? null : Number(legacy[1])
        }

        /** 「已完成」所在的 flow 项；还没出现按钮（轮次进行中）时退回这一轮的第一条内容项。*/
        function footerBlockForTurn(turn) {
          const item = turnDisclosureItem(turn)
          if (item !== null) return item
          const content = turnContentItem(turn)
          if (content !== null) return content
          if (!Number.isFinite(turn)) return null
          const button = document.querySelector(`[data-turn-process="${turn}"]`)
          if (button === null) return null
          return button.closest('[data-chat-flow-kind="turn-process"]') ?? button
        }

        /**
         * 节点所在的会话容器：往上找、取最外层仍含消息行的祖先。
         * body 与 documentElement 不算——覆盖层都挂在 body 上，算进来就等于全页面。
         */
        function conversationScopeOf(node) {
          let scope = null
          let current = node.parentElement ?? null
          for (let i = 0; i < 32 && current !== null && current !== undefined; i += 1) {
            if (current === document.body || current === document.documentElement) break
            if (typeof current.querySelector === 'function' && current.querySelector('[data-chat-turn]') !== null) scope = current
            current = current.parentElement ?? null
          }
          return scope
        }

        /**
         * 活动会话的那一屏：只认真正长在会话里的输入框，覆盖层挂在 body 上，
         * 经 conversationScopeOf 上溯会被 body 边界挡住，拿不到会话容器。
         */
        function visibleConversationScopes() {
          const scopes = []
          for (const input of document.querySelectorAll('textarea, [contenteditable="true"]')) {
            const rect = safe(() => input.getBoundingClientRect())
            if (rect === undefined || rect.width <= 0 || rect.height <= 0) continue
            const scope = conversationScopeOf(input)
            if (scope !== null) scopes.push(scope)
          }
          return scopes
        }

        /** 正文里是否带着这条批注负载：类型标记 + 某条批注的引文（或备注）前缀。*/
        function rowCarriesSentAnnotations(row, items) {
          // 正文里的 JSON 缩进过，先归一空白；引文里的换行在 JSON 里是转义形态，两种都比一次。
          const text = (row.textContent ?? '').replace(/\s+/g, ' ')
          if (!text.includes(PAYLOAD_KIND)) return false
          for (const item of items) {
            // 引文是主判据；笔记只在引文为空/过短时兜底，阈值放低一档。
            for (const [raw, minLength] of [[item?.quote, 4], [item?.note, 2]]) {
              if (typeof raw !== 'string') continue
              const prefix = raw.trim().slice(0, 24)
              if (prefix.length < minLength) continue
              if (text.includes(prefix.replace(/\s+/g, ' '))) return true
              const escaped = JSON.stringify(prefix).slice(1, -1)
              if (escaped !== prefix && text.includes(escaped)) return true
            }
          }
          return false
        }

        /**
         * 在会话范围里找真正承载已发批注的**用户消息行**：宿主把批注附件并进正文后，
         * 这条消息不会再作为「新出现的行」被认领，附件行也可能不渲染，只能靠正文识别。
         */
        function findSentAnnotationRow(scope, known, items) {
          const root = scope !== null && scope !== undefined && scope.isConnected ? scope : document
          let best = null
          let bestTurn = -1
          for (const row of root.querySelectorAll('[data-chat-anchor-key][data-chat-flow-kind="user"]')) {
            const anchorKey = row.getAttribute('data-chat-anchor-key') ?? ''
            // 台账里已有的锚点不能再认领：同一行会被两条记录同时挂上卡。
            if (anchorKey === '' || known.has(anchorKey)) continue
            if (isPendingEchoRow(row)) continue
            if (typeof row.getClientRects === 'function' && row.getClientRects().length === 0) continue
            if (!rowCarriesSentAnnotations(row, items)) continue
            const turn = turnOfRow(row)
            const score = Number.isFinite(turn) ? turn : 0
            if (score >= bestTurn) {
              bestTurn = score
              best = { row, anchorKey, turn }
            }
          }
          return best
        }

        /** 老台账里不是「消息锚点」的合成键：工具调用行、发送时刻。*/
        function isSyntheticSentAnchor(anchorKey, storedKey) {
          for (const key of [anchorKey, storedKey]) {
            if (typeof key !== 'string' || key === '') continue
            if (key.startsWith('call:') || key.startsWith('turn:')) return true
          }
          return false
        }

        /** 老台账重新认领消息行：每条记录只补一次库，远端失败也不重试，避免每遍重绘都发请求。*/
        const reclaimAttempts = new Set()

        /**
         * 老记录把工具调用行/发送时刻记成了锚点、轮次也跟着错时，DOM 里既没有那条行也没有那一轮。
         * 按正文重新认领真正的用户消息行，写回台账，并给已有批次补一次 turn/anchor_key。
         */
        function reclaimSentRecord(record, storedKey, sessionId, table) {
          const batchId =
            typeof record.batchUuid === 'string' && record.batchUuid !== '' ? record.batchUuid : storedKey
          const attemptKey = `${sessionId}\u0000${batchId}`
          if (reclaimAttempts.has(attemptKey)) return null
          // 其他记录已经占用的锚点不再认领：同一行不能挂两张卡。
          const taken = new Set()
          for (const [key, other] of table) {
            taken.add(key)
            if (typeof other.anchorKey === 'string' && other.anchorKey !== '') taken.add(other.anchorKey)
          }
          let best = null
          let bestTurn = -1
          for (const scope of visibleConversationScopes()) {
            const found = findSentAnnotationRow(scope, taken, record.items)
            if (found === null) continue
            const score = Number.isFinite(found.turn) ? found.turn : 0
            if (score >= bestTurn) {
              bestTurn = score
              best = found
            }
          }
          if (best === null) return null
          reclaimAttempts.add(attemptKey)
          record.anchorKey = best.anchorKey
          if (Number.isFinite(best.turn)) record.turn = best.turn
          saveSent(sessionId, table)
          if (typeof record.batchUuid === 'string' && record.batchUuid !== '') {
            void remoteSync
              .patchBatch(record.batchUuid, {
                ...(Number.isFinite(best.turn) ? { turn: best.turn } : {}),
                anchor_key: best.anchorKey,
              })
              .catch(() => {})
          }
          return best
        }

        /**
         * 清扫旧卡的作用范围：只取本次台账里的卡片和锚点行所在的会话容器。
         * 页面同时留着另一个会话的 DOM 时，按全页面扫会把那边的卡一起删掉。
         */
        function sentSweepScopes(table) {
          const scopes = new Set()
          const collect = (node) => {
            const scope = conversationScopeOf(node)
            if (scope !== null) scopes.add(scope)
          }
          // 台账记录可能暂时既没有卡片也没有锚点行（轮次还没渲染），
          // 但这一屏此前留下的旧卡仍应清掉，所以把活动会话也算一份。
          for (const scope of visibleConversationScopes()) scopes.add(scope)
          for (const [storedKey, record] of table) {
            const card = document.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`)
            if (card !== null) collect(card)
            const anchorKey = typeof record.anchorKey === 'string' && record.anchorKey !== ''
              ? record.anchorKey
              : resolveLegacyAnchor(storedKey)
            const row = document.querySelector(`[data-chat-anchor-key="${cssEscape(anchorKey)}"]`)
            if (row !== null) collect(row)
          }
          return scopes
        }

        /** 把新卡的子节点搬进旧卡里，根节点与它在父级里的位置都不动。*/
        function replaceCardChildren(target, fresh) {
          const children = []
          for (const child of fresh.childNodes ?? []) children.push(child)
          if (typeof target.replaceChildren === 'function') {
            target.replaceChildren(...children)
            return
          }
          target.textContent = ''
          for (const child of children) target.appendChild(child)
        }

        /** 已发送卡片的最近一次渲染统计，给面板底部诊断行用。 */
        let sentRenderStats = null

        /** 在所属轮次的「已完成」之前补出已提交批注卡片；按轮次定位，不依赖消息行是否已加载。*/
        function renderSentCards() {
          // 返回「这一遍有没有真的插入/删除/移动/替换过会话区节点」：只设属性不算。
          const changesAtStart = conversationChanges
          const touched = () => conversationChanges !== changesAtStart
          const sessionId = currentSessionId()
          // 统计对象先建好：早退也要落盘，否则面板诊断看不到「为什么一张卡都没有」。
          const stats = {
            sessionId,
            size: 0,
            cards: 0,
            skipped: 0,
            errors: 0,
            lastError: '',
            anchorMiss: 0,
            reasons: { noSession: 0, emptyTable: 0, emptyItems: 0, noTurn: 0, turnNotInDom: 0 },
          }
          sentRenderStats = stats
          if (sessionId === undefined) {
            stats.reasons.noSession += 1
            return touched()
          }
          const table = loadSent(sessionId)
          stats.size = table.size
          if (table.size === 0) {
            stats.reasons.emptyTable += 1
            return touched()
          }
          // 卡片身份取台账键；锚点只用来挂答复卡。
          // 清扫按会话容器分组做：全页面扫会把另一个会话的 DOM 里渲染出的卡一起删掉。
          for (const scope of sentSweepScopes(table)) {
            for (const stale of scope.querySelectorAll('[data-sa-ui="sent"]')) {
              const key = stale.getAttribute('data-sa-key')
              if (key === null || !table.has(key)) {
                markConversationChanged()
                stale.remove()
              }
            }
          }
          let learnedTurn = false
          for (const [storedKey, record] of table) {
            if (record.items.length === 0) {
              stats.skipped += 1
              stats.reasons.emptyItems += 1
              continue
            }
            // 上次没落库的批次：借这次重绘补一次，最多 3 次，成功会在 syncSentBatch 里清标记与计数。
            if (record.unsynced === true) retryUnsyncedSentBatch(sessionId, storedKey, record)
            let anchorKey = typeof record.anchorKey === 'string' && record.anchorKey !== ''
              ? record.anchorKey
              : resolveLegacyAnchor(storedKey)
            let row = document.querySelector(`[data-chat-anchor-key="${cssEscape(anchorKey)}"]`)
            let turn = turnOfRecord(record, storedKey)
            // 旧记录第一次看到「已完成」时把轮次记下来，之后即使消息行没加载也能定位。
            if (!Number.isFinite(turn) && row !== null) {
              const found = turnOfRow(row)
              if (Number.isFinite(found)) {
                turn = found
                record.turn = turn
                learnedTurn = true
              }
            }
            let footer = footerBlockForTurn(turn)
            // 老台账：锚点记成了工具调用行/发送时刻，轮次也跟着错，DOM 里既没有那条行也没有那一轮。
            // 按正文里的批注 JSON 与引文前缀重新认领真正的用户消息行；认到后锚点与轮次一起写回，
            // 答复区在同一次重绘里就能跟上（renderSentCards 先于 renderReplySections 跑）。
            if (footer === null && Number.isFinite(turn) && isSyntheticSentAnchor(anchorKey, storedKey)) {
              const claimed = reclaimSentRecord(record, storedKey, sessionId, table)
              if (claimed !== null) {
                anchorKey = claimed.anchorKey
                row = claimed.row
                turn = Number.isFinite(claimed.turn) ? claimed.turn : turn
                footer = footerBlockForTurn(turn)
              }
            }
            if (row === null && footer === null) {
              stats.skipped += 1
              if (!Number.isFinite(turn)) stats.reasons.noTurn += 1
              else stats.reasons.turnNotInDom += 1
              // 消息行与「已完成」都还没进 DOM：这条卡不是不存在，是暂时无处可放。
              // 置上标记，下一遍重绘继续试着落位，否则这张卡要等到用户再发消息才出现。
              placementPending = true
              continue
            }
            // 锚点没查到、靠轮次落位：面板里单独计数，用来区分「锚点丢了」和「轮次根本没渲染」。
            if (row === null) stats.anchorMiss += 1
            // 排队中的消息还没真正发出：卡片不提前挂到等待态气泡下面，
            // 已经残留的旧卡也先收起来，等真正发出后的那一遍再补。
            if (row !== null && isPendingEchoRow(row)) {
              const queuedCard = document.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`)
              if (queuedCard !== null) {
                markConversationChanged()
                queuedCard.remove()
              }
              stats.skipped += 1
              continue
            }
            const existing = document.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`)
            const cardOptions = {
              onReuse: () => reuseSentItems(record.items, record),
              onReplayItem: (item) => reuseSentItems([item], record),
              onJumpQuote: (item, root) => jumpToQuote(item, turn, root),
            }
            let card = existing
            const sentSignature = hashString({
              anchorKey,
              items: record.items.map((item) => ({
                quote: item.quote,
                note: item.note,
                images: (item.thumbs ?? []).map((thumb) => thumb.name),
              })),
            })
            if (card !== null && card.getAttribute('data-sa-sig') !== sentSignature) {
              // 内容变了只换子节点，不 replaceWith 整卡：整卡摘挂会让浏览器重算滚动锚定，
              // 会话区在卡出现/变化时自己跳一下。
              markConversationChanged()
              replaceCardChildren(existing, buildSentCard(record, anchorKey, cardOptions))
              // 原来换的是新节点，答复收起标记自然没了；就地更新要手动清掉才与旧行为一致。
              if (typeof existing.removeAttribute === 'function') existing.removeAttribute('data-sa-reply-sig')
              card = existing
            }
            if (card === null) card = buildSentCard(record, anchorKey, cardOptions)
            card.setAttribute('data-sa-sig', sentSignature)
            card.setAttribute('data-sa-key', storedKey)
            card.setAttribute('data-anchor', anchorKey)
            if (Number.isFinite(turn)) card.setAttribute('data-sa-turn', String(turn))
            else if (typeof card.removeAttribute === 'function') card.removeAttribute('data-sa-turn')
            paintUnsyncedBadge(card, record.unsynced === true)
            // 批注优先挂在用户消息气泡下方：插队（steering）消息还没有轮次尾行时也能出现，
            // 位置也贴着「自己这一条」，不必等整轮结束。等待态气泡在上面已跳过。
            const bubbleKind = row === null ? '' : (row.getAttribute('data-chat-flow-kind') ?? '')
            // 有轮次就按轮次定位，不再看锚点键指向哪条消息：即使锚点记错（曾抓到别的会话的消息），
            // 卡片也只会落在正确的那一轮，不会漂到看不见的节点上。锚点仍保留给答复卡配对。
            const onBubble =
              !Number.isFinite(turn) &&
              row !== null &&
              (bubbleKind === 'user' || bubbleKind === 'steering')
            if (onBubble && row.parentElement !== null && row.parentElement !== document.body) {
              if (card.parentElement !== row.parentElement || card.previousSibling !== row) {
                markConversationChanged()
                row.parentElement.insertBefore(card, row.nextSibling)
              }
              continue
            }
            // 已发送卡仍贴在「已完成」上方：先按该轮的已完成按钮定位；
            // 槽位锚点只在没有按钮（进行中/无过程说明）时兜底，保证不会丢卡。
            const disclosure = Number.isFinite(turn) ? turnDisclosureItem(turn) : null
            if (disclosure !== null && disclosure.parentElement !== null) {
              if (card.parentElement !== disclosure.parentElement || card.nextSibling !== disclosure) {
                markConversationChanged()
                disclosure.parentElement.insertBefore(card, disclosure)
              }
              continue
            }
            const anchorEl = Number.isFinite(turn) ? findTurnAnchor(turn, sessionId) : null
            if (anchorEl !== null && anchorEl.parentElement !== null) {
              if (card.parentElement !== anchorEl.parentElement || card.nextSibling !== anchorEl) {
                markConversationChanged()
                anchorEl.parentElement.insertBefore(card, anchorEl)
              }
              continue
            }
            // 位置固定在轮次尾行之前；与消息在折叠组里、是否懒加载无关。
            // 已经在位就不要重复 insertBefore：把节点反复摘下再插回会打断正在进行的点击，
            // 表现为「偶尔点一下没反应，要多点几次才收展」。
            if (footer !== null) {
              if (
                footer.parentElement !== null &&
                (card.parentElement !== footer.parentElement || card.nextSibling !== footer)
              ) {
                markConversationChanged()
                footer.parentElement.insertBefore(card, footer)
              }
              continue
            }
            const target = sentCardAnchor(row)
            if (target.parent !== null) {
              if (card.parentElement !== target.parent || card.nextSibling !== target.before) {
                markConversationChanged()
                target.parent.insertBefore(card, target.before)
              }
            } else if (existing === null) {
              markConversationChanged()
              row.appendChild(card)
            }
          }
          if (learnedTurn) saveSent(sessionId, table)
          stats.cards = document.querySelectorAll('[data-sa-ui="sent"]').length
          const turnsOfTable = [...table.values()].map((record) => record.turn).filter((value) => Number.isFinite(value))
          stats.turnMin = turnsOfTable.length > 0 ? Math.min(...turnsOfTable) : null
          stats.turnMax = turnsOfTable.length > 0 ? Math.max(...turnsOfTable) : null
          sentRenderStats = stats
          return touched()
        }

        const buildReplySection = (batches, items, options) => cards.buildReplySection(batches, items, options)

        /** 跟着「已完成」一起收展：只同步答复卡片里的内容，卡片本身与标题始终留在外面。*/
        function syncReplyCollapse(origin) {
          for (const section of document.querySelectorAll('[data-sa-ui="replies"]')) {
            // 优先用挂载时记下的轮次找「已完成」按钮，避免结构变化后靠相邻节点猜错。
            const known = section.dataset.saTurn
            let button = typeof known === 'string' && known !== ''
              ? document.querySelector(`[data-turn-process="${known}"]`)
              : null
            if (button === null) {
              let node = section.previousElementSibling ?? null
              let footer = null
              while (node !== null) {
                if (node.getAttribute?.('data-sa-ui') === 'replies') {
                  node = node.previousElementSibling ?? null
                  continue
                }
                if (node.getAttribute?.('data-chat-flow-kind') === 'turn-process' || node.matches?.('[data-turn-process]')) footer = node
                break
              }
              button = footer === null ? null : footer.matches?.('[data-turn-process]') ? footer : footer.querySelector?.('[data-turn-process]')
            }
            // 只响应用户亲手点开/收起的那一下：同一状态不重复套用，之后答复区可以自己开合。
            if (button !== null && origin !== undefined && button !== origin) continue
            const head = typeof section.querySelector === 'function' ? section.querySelector('.sa-section-head') : null
            const wrap = typeof section.querySelector === 'function' ? section.querySelector('.sa-collapse') : null
            if (head === null || wrap === null) continue
            const open = button === null || button.getAttribute('aria-expanded') !== 'false'
            const seen = section.dataset.saFooterOpen
            if (seen !== undefined && seen === (open ? '1' : '0')) continue
            section.dataset.saFooterOpen = open ? '1' : '0'
            applyCollapsed(head, wrap, open)
            section.dataset.open = wrap.dataset.open
          }
        }

        /** 只在位置真的不同时才移动，避免每次重绘都摘挂节点打断选区。*/
        function moveSection(section, container, before) {
          if (container === null || container === undefined) return
          // before 就是自己时说明位置已经对：再 insertBefore 会把节点摘下来重插，选区会被重置。
          if (before === section) return
          if (section.parentElement === container && section.nextSibling === before) return false
          markConversationChanged()
          container.insertBefore(section, before)
          return true
        }

        /** 答复卡留在「已完成」之下：有轮次号时按轮次尾行定位，否则退回相邻节点查找。*/
        function placeReplyAfterTurnProcess(section, turn) {
          const parent = section.parentElement
          if (parent === null) return
          // 正在拖选时不挪卡片：节点一摘一挂，选区起点就会被重置。
          if (pointerSelecting === true) return
          if (Number.isFinite(turn)) section.dataset.saTurn = String(turn)
          // 回合还在跑（还没有「已完成」）：此时最后一个助手内容块其实是工具链，
          // 插在它前面就会被折进过程区。先跟着「已发送」卡放在过程区外面，
          // 等 final output 出现后，再按正常规则挪到最终输出之前。
          if (Number.isFinite(turn) && document.querySelector(`[data-turn-process="${turn}"]`) === null) {
            // 回合还在跑：跟着「已发送」卡放在过程区外面；moveSection 在位置未变时不移动节点。
            const sent = document.querySelector(`[data-sa-ui="sent"][data-sa-turn="${turn}"]`)
            if (sent !== null && sent.parentElement !== null) {
              let cursor = sent
              while (cursor.nextElementSibling !== null
                && cursor.nextElementSibling.getAttribute?.('data-sa-ui') === 'replies') {
                cursor = cursor.nextElementSibling
              }
              moveSection(section, sent.parentElement, cursor.nextSibling)
              return
            }
          }
          // 答复卡要放在「工具链之后、整段最终正文之前」。
          // 最终正文常由多行 assistant-step 组成，只取最后一行会把卡片塞进正文中间；
          // 所以先定位该轮最后一个过程行，再取它之后的第一个正文行作为参照。
          if (Number.isFinite(turn)) {
            const items = [...document.querySelectorAll(`[data-chat-turn="${turn}"]`)]
            const key = String(turn)
            const inProcess = (el) =>
              typeof el.closest === 'function'
              && el.closest('[data-step-process-body],[data-turn-process-inline]') !== null
            const isProcessRow = (el) => {
              const kind = el.getAttribute?.('data-chat-flow-kind') ?? ''
              return (
                kind === 'turn-process'
                || el.hasAttribute?.('data-turn-process-member')
                || el.hasAttribute?.('data-turn-process-inline')
              )
            }
            const isAnswerRow = (el) => {
              const kind = el.getAttribute?.('data-chat-flow-kind') ?? ''
              if (kind !== 'assistant' && kind !== 'assistant-step') return false
              const part = el.getAttribute?.('data-chat-group-part')
              return part === null || part === 'response'
            }
            const rows = [...document.querySelectorAll(`[data-chat-turn="${key}"][data-chat-flow-kind]`)]
              .filter((el) => !inProcess(el))
            let lastProcess = -1
            rows.forEach((el, index) => {
              if (isProcessRow(el)) lastProcess = index
            })
            let target = rows.find((el, index) => index > lastProcess && isAnswerRow(el)) ?? null
            if (target === null) target = [...rows].reverse().find(isAnswerRow) ?? null
            if (target !== null) {
              // 正文行可能被组行（同样带 data-chat-turn 的外壳）包住：上溯到组行，
              // 让卡片与过程链、整段正文同级，不会落进正文中间或被折叠带走。
              let top = target
              while (top.parentElement !== null && top.parentElement.getAttribute?.('data-chat-turn') === key) {
                top = top.parentElement
              }
              const container = top.parentElement
              if (container !== null && container !== section) {
                moveSection(section, container, top)
                return
              }
            }
            // 旧结构：过程成员嵌在过程容器里。答复卡要挂在过程块外面、与折叠块同级，
            // 否则会被带进「已调用工具」折叠区。先按最后一个成员定位，再上溯到最外层过程块。
            let lastMember = null
            for (const item of items) {
              if (item.hasAttribute?.('data-turn-process-member')) {
                lastMember = item
              }
            }
            const isProcessContainer = (el) =>
              el !== null
              && el !== undefined
              && typeof el.matches === 'function'
              && el.matches(
                '[data-step-process-body],[data-turn-process-inline],[data-chat-flow-kind="turn-process"],[data-turn-process-member]',
              )
            if (lastMember !== null) {
              let processBlock = lastMember
              let host = processBlock.parentElement ?? null
              while (host !== null && isProcessContainer(host)) {
                processBlock = host
                host = processBlock.parentElement ?? null
              }
              if (host !== null) {
                moveSection(section, host, processBlock.nextSibling)
                return
              }
            }
          }
          // 槽位锚点在轮次尾部：没有「已完成」时贴在它后面。
          const anchorEl = Number.isFinite(turn) ? findTurnAnchor(turn, currentSessionId()) : null
          if (anchorEl !== null && anchorEl.parentElement !== null) {
            let cursor = anchorEl
            while (cursor.nextElementSibling !== null && cursor.nextElementSibling.getAttribute?.('data-sa-ui') === 'replies') {
              cursor = cursor.nextElementSibling
            }
            moveSection(section, anchorEl.parentElement, cursor.nextSibling)
            return
          }
          const block = footerBlockForTurn(turn)
          if (block !== null && block.parentElement !== null) {
            let cursor = block
            while (cursor.nextElementSibling !== null && cursor.nextElementSibling.getAttribute?.('data-sa-ui') === 'replies') {
              cursor = cursor.nextElementSibling
            }
            moveSection(section, block.parentElement, cursor.nextSibling)
            return
          }
          let sibling = typeof section.nextElementSibling === 'undefined' ? null : section.nextElementSibling
          while (sibling !== null && (typeof sibling.getAttribute !== 'function' || sibling.getAttribute('data-chat-flow-kind') !== 'turn-process')) {
            sibling = sibling.nextElementSibling ?? null
          }
          if (sibling === null) return
          let cursor = sibling
          while (cursor.nextElementSibling !== null && (cursor.nextElementSibling.getAttribute?.('data-sa-ui') === 'replies')) {
            cursor = cursor.nextElementSibling
          }
          moveSection(section, parent, cursor.nextSibling)
        }

        /**
         * 界面语言切换后：静态控件换文案，已提交卡片与面板按新语言重建。
         * 正在编辑的草稿仍留在输入框里，不会因为换语言丢掉。
         */
        function applyLocale() {
          safe(() => {
            annotateLabel.textContent = t('annotate')
            adoptLabel.textContent = t('annotate.adopt')
            rejectLabel.textContent = t('annotate.reject')
            copyLabel.textContent = t('annotate.copy')
          })
          safe(() => {
            menuAnnotate.textContent = t('menu.annotate')
            menuAdopt.textContent = t('menu.adopt')
            menuReject.textContent = t('menu.reject')
            menuCopy.textContent = t('menu.copy')
          })
          safe(() => {
            popInput.setAttribute('aria-label', t('pop.placeholder'))
            popInput.dataset.placeholder = t('pop.placeholder')
          })
          safe(() => {
            popQuoteLabel.textContent = t('label.quote')
            popNoteLabel.textContent = t('pop.noteLabel')
            for (const node of jumpButtonNodes) {
              node.firstElementChild.textContent = t('jump.label')
              node.setAttribute('aria-label', t('jump.label'))
              node.title = t('jump.hint')
            }
          })
          safe(() => {
            popImagesHint.textContent = t('pop.imagesHint')
          })
          safe(() => {
            popDelete.textContent = t('pop.delete')
            popCancel.textContent = t('pop.cancel')
            popSave.textContent = t('pop.save')
          })
          for (const node of document.querySelectorAll('[data-sa-ui="sent"]')) node.remove()
          for (const node of document.querySelectorAll('[data-sa-ui="replies"]')) node.remove()
          safe(() => renderSentCards())
          safe(() => renderReplySections())
          if (panelOpen) refreshPanel()
        }

        /** 答复齐了就把同一条消息的「已发送」收起来；只在新答复到达时做一次，不覆盖用户手动展开。*/
        function collapseSentForReplies(sentCard, signature) {
          if (sentCard.dataset.saReplySig === signature) return
          sentCard.dataset.saReplySig = signature
          const head = sentCard.querySelector('.sa-section-head')
          const wrap = sentCard.querySelector('.sa-collapse')
          if (head !== null && wrap !== null) applyCollapsed(head, wrap, false)
        }

        /**
         * 把答复挂到对应的「已发送的批注」卡片后面。
         *
         * 台账按「批注消息行」的锚点存；旧版本还可能把「已完成」尾行写进台账，
         * 渲染时先用 resolveLegacyAnchor 改认那一轮的批注消息行。
         * 归位优先看每条答复自带的 cardKey：同一轮发出多张卡时，单看批次时间只能
         * 把整批挂到最近的一张卡，前面几张的答复会缺；没有 cardKey 才回落到批次时间。
         */
        function renderReplySections() {
          // 返回「这一遍有没有真的插入/删除/移动/替换过会话区节点」：只设属性不算。
          const changesAtStart = conversationChanges
          const touched = () => conversationChanges !== changesAtStart
          const sessionId = currentSessionId()
          if (sessionId === undefined) return touched()
          const table = loadSent(sessionId)
          if (table.size === 0) return touched()
          const batches = remoteReplyCache.get(sessionId) ?? []
          if (batches.length === 0) return touched()
          const byAnchor = new Map()
          const anchorOfCardKey = new Map()
          const anchorOfUuid = new Map()
          for (const [storedKey, record] of table) {
            const anchorKey = typeof record.anchorKey === 'string' && record.anchorKey !== ''
              ? record.anchorKey
              : resolveLegacyAnchor(storedKey)
            const current = byAnchor.get(anchorKey)
            if (current === undefined || current.record.savedAt < record.savedAt) {
              byAnchor.set(anchorKey, { record, turn: turnOfRecord(record, storedKey) })
            }
            // 条目 uuid 是答复的唯一依据：先按 uuid 找它属于哪张卡，找不到再退回 cardKey / 批次时间。
            for (const item of Array.isArray(record.items) ? record.items : []) {
              if (typeof item?.uuid !== 'string' || item.uuid === '') continue
              if (!anchorOfUuid.has(item.uuid)) anchorOfUuid.set(item.uuid, anchorKey)
            }
            // cardKey 说到底是 payload 里那张卡的 anchorKey；本地台账键与值里的锚点都认，
            // 模型照抄 anchorKey、或者拿到的是台账键，都能对上同一张卡。
            if (!anchorOfCardKey.has(storedKey)) anchorOfCardKey.set(storedKey, anchorKey)
            if (!anchorOfCardKey.has(anchorKey)) anchorOfCardKey.set(anchorKey, anchorKey)
          }
          // 哪张卡的本地条目已经有 uuid：老卡（升级前发出、本地没记 uuid）仍按 index 兜底。
          const hasUuidByAnchor = new Map()
          for (const [anchorKey, entry] of byAnchor) {
            hasUuidByAnchor.set(
              anchorKey,
              (Array.isArray(entry.record.items) ? entry.record.items : []).some(
                (item) => typeof item?.uuid === 'string' && item.uuid !== '',
              ),
            )
          }
          const anchors = [...byAnchor.entries()]
            .map(([anchorKey, entry]) => ({ anchorKey, savedAt: entry.record.savedAt }))
            .sort((a, b) => a.savedAt - b.savedAt)
          // 归位落到「条目」一级：同一张卡下仍按原批次时间分组，渲染结构不变。
          const grouped = new Map()
          for (const batch of batches) {
            const at = Number(batch.at) || 0
            let fallback
            for (const anchor of anchors) {
              if (anchor.savedAt <= at) fallback = anchor.anchorKey
            }
            for (const reply of Array.isArray(batch.replies) ? batch.replies : []) {
              const cardKey = typeof reply?.cardKey === 'string' ? reply.cardKey.trim() : ''
              const uuid = typeof reply?.uuid === 'string' && reply.uuid !== '' ? reply.uuid : undefined
              // uuid 优先找条目归属；本地台账已经有 uuid、这条却对不上，说明是别的会话的
              // 批注（跨会话答复），不在这一轮里硬塞，避免挂到不相干的卡上。
              let target = uuid === undefined ? undefined : anchorOfUuid.get(uuid)
              if (target === undefined && uuid === undefined) {
                target = (cardKey === '' ? undefined : anchorOfCardKey.get(cardKey)) ?? fallback
              }
              // 老卡（升级前发出、本地条目没记 uuid）仍按 cardKey / 批次时间归位，保证旧答复照常显示；
              // 只对「这张卡本来就没有 uuid」生效，别把别的会话的 uuid 答复塞过来。
              if (target === undefined && uuid !== undefined) {
                const candidate = (cardKey === '' ? undefined : anchorOfCardKey.get(cardKey)) ?? fallback
                if (candidate !== undefined && hasUuidByAnchor.get(candidate) !== true) target = candidate
              }
              if (target === undefined) continue
              let buckets = grouped.get(target)
              if (buckets === undefined) {
                buckets = new Map()
                grouped.set(target, buckets)
              }
              let bucket = buckets.get(at)
              if (bucket === undefined) {
                bucket = []
                buckets.set(at, bucket)
              }
              bucket.push(reply)
            }
          }
          for (const stale of document.querySelectorAll('[data-sa-ui="replies"]')) {
            const anchorKey = stale.getAttribute('data-anchor')
            // 台账里认不出的锚点要清；卡还在但一条答复都没归到它，也要清 ——
            // 否则答复改挂别处后，上一版留下的内容会赖在这张卡上。
            if (anchorKey === null || !byAnchor.has(anchorKey) || !grouped.has(anchorKey)) {
              markConversationChanged()
              stale.remove()
            }
          }
          for (const [anchorKey, buckets] of grouped) {
            const list = [...buckets.entries()].map(([at, replies]) => ({ at, replies }))
            const escaped = cssEscape(anchorKey)
            const sentCards = document.querySelectorAll(`[data-sa-ui="sent"][data-anchor="${escaped}"]`)
            const sentCard = sentCards[sentCards.length - 1]
            const items = byAnchor.get(anchorKey)?.record.items ?? []
            const record = byAnchor.get(anchorKey)?.record ?? null
            const turn = byAnchor.get(anchorKey)?.turn ?? null
            const signature = hashString({
              v: 4,
              batches: list.map((batch) => ({ at: batch.at, replies: batch.replies })),
              items: items.map((item) => ({ uuid: item.uuid, quote: item.quote, note: item.note })),
            })
            const existing = document.querySelector(`[data-sa-ui="replies"][data-anchor="${escaped}"]`)
            if (existing !== null) {
              if (existing.dataset.signature === signature) {
                // 内容没变也要重新落位：回合从「进行中」变成有 final output 时，
                // 答复卡要从「已发送」后面挪到最终输出之前。
                placeReplyAfterTurnProcess(existing, turn)
                continue
              }
              const fresh = buildReplySection(list, items, {
                onReuseAll: () => reuseSentItems(items, record),
                onReplayItem: (item) => reuseSentItems([item], record),
                onJumpQuote: (item, root) => jumpToQuote(item, turn, root),
              })
              fresh.setAttribute('data-anchor', anchorKey)
              fresh.dataset.signature = signature
              markConversationChanged()
              existing.replaceWith(fresh)
              placeReplyAfterTurnProcess(fresh, turn)
              if (sentCard !== undefined) collapseSentForReplies(sentCard, signature)
              continue
            }
            // 宿主节点：优先跟已发送卡；已发送卡没渲染出来时退到该轮的尾行/内容项，
            // 否则答复卡会跟着整批消失（这正是「两块一起不见」的直接原因）。
            const host = sentCard !== undefined ? sentCard : Number.isFinite(turn) ? footerBlockForTurn(turn) : null
            const parent = host?.parentElement ?? null
            if (parent === null) {
              // 已发送卡与「已完成」都还不在页面上：答复区等下一遍重绘再落位。
              placementPending = true
              continue
            }
            const section = buildReplySection(list, items, {
              onReuseAll: () => reuseSentItems(items, record),
              onReplayItem: (item) => reuseSentItems([item], record),
              onJumpQuote: (item, root) => jumpToQuote(item, turn, root),
            })
            section.setAttribute('data-anchor', anchorKey)
            section.dataset.signature = signature
            markConversationChanged()
            parent.insertBefore(section, sentCard !== undefined ? sentCard.nextSibling : host)
            placeReplyAfterTurnProcess(section, turn)
            if (sentCard !== undefined) collapseSentForReplies(sentCard, signature)
          }
          return touched()
        }

        /* ------------------------------------------------------- 原生附件块（随消息发送） */

        /**
         * 已发送卡片上条目的 uuid：按卡片锚点与条目编号，在台账里找最近一条有 uuid 的记录。
         * 老宿主、还没回填 uuid 时返回 undefined，payload 就不写这个字段。
         */
        function sentUuidOf(source) {
          if (source?.kind !== 'sent') return undefined
          const sessionId = annotationsSession ?? currentSessionId()
          if (sessionId === undefined) return undefined
          if (typeof source.anchorKey !== 'string' || source.anchorKey === '') return undefined
          if (!Number.isFinite(source.index)) return undefined
          let found
          for (const [storedKey, record] of loadSent(sessionId)) {
            const anchorKey =
              typeof record.anchorKey === 'string' && record.anchorKey !== ''
                ? record.anchorKey
                : resolveLegacyAnchor(storedKey)
            if (anchorKey !== source.anchorKey) continue
            if (found !== undefined && found.savedAt >= record.savedAt) continue
            const item = record.items.find((entry) => Number(entry.index) === source.index)
            if (typeof item?.uuid === 'string' && item.uuid !== '') found = { savedAt: record.savedAt, uuid: item.uuid }
          }
          return found?.uuid
        }

        const payloadApi = createPayload({ t, instructionOf, uuidOfSent: sentUuidOf })
        const describeSource = (source) => payloadApi.describeSource(source)
        const payloadSource = (source) => payloadApi.payloadSource(source)
        const buildPayload = (items) => payloadApi.buildPayload(items)

        function scheduleSync() {
          if (syncTimer !== null) window.clearTimeout(syncTimer)
          syncTimer = window.setTimeout(() => {
            syncTimer = null
            void syncAttachment()
          }, UPLOAD_DEBOUNCE_MS)
        }

        /** 摘掉一批草稿附件：既要从输入态移除，也要让运行时释放（否则会漏掉后台任务）。*/
        function releaseDrafts(ids, shell) {
          if (ids.length === 0) return
          const previousGuard = maintaining
          maintaining = true
          try {
            for (const id of ids) safe(() => shell.removeAttachment(id))
            const conversation = ctx.conversation
            for (const id of ids) safe(() => conversation?.releaseDraftAttachment?.(id))
          } finally {
            maintaining = previousGuard
          }
        }

        /**
         * 等运行时把草稿附件传完。
         *
         * 这一步不能省：`sendSession` 在 `fileUploads[id].status !== 'ready'` 时直接抛
         * 「one or more files have not finished uploading」，会让整条消息发送失败。
         * 所以只在 ready 之后才把附件挂进输入态 —— 宁可晚几百毫秒，也绝不制造发送失败。
         * @returns 是否全部就绪。
         */
        function waitForUploads(conversation, ids, timeoutMs) {
          const store = conversation?.fileUploads
          if (store === undefined || typeof store.subscribe !== 'function' || typeof store.getSnapshot !== 'function') {
            return Promise.resolve(true)
          }
          return new Promise((resolve) => {
            let settled = false
            let unsubscribe
            let timer = null
            const finish = (value) => {
              if (settled) return
              settled = true
              if (typeof unsubscribe === 'function') safe(unsubscribe)
              if (timer !== null) window.clearTimeout(timer)
              resolve(value)
            }
            const check = () => {
              if (settled) return
              const snapshot = safe(() => store.getSnapshot())
              if (snapshot === undefined || snapshot === null) return
              let pending = 0
              for (const id of ids) {
                const entry = snapshot[id]
                if (entry === undefined) {
                  pending += 1
                  continue
                }
                if (entry.status === 'error') {
                  finish(false)
                  return
                }
                if (entry.status !== 'ready') pending += 1
              }
              if (pending === 0) finish(true)
            }
            const result = safe(() => store.subscribe(() => check()))
            unsubscribe = typeof result === 'function' ? result : undefined
            timer = window.setTimeout(() => finish(false), timeoutMs)
            if (settled) {
              if (typeof unsubscribe === 'function') safe(unsubscribe)
              window.clearTimeout(timer)
            }
            check()
          })
        }

        /** 运行时是否提供了这条官方附件链路（拖拖粘贴附件走的就是它）。*/
        function draftAttachmentSupported(conversation, shell) {
          return (
            typeof conversation?.createDrafts === 'function' &&
            typeof shell?.addFiles === 'function' &&
            typeof shell?.removeAttachment === 'function'
          )
        }

        /**
         * 把批注集合变成一不*原生草稿附件**随消息提交。
         *
         * 走运行时自己的`createDrafts` + 输入外壳的`addFiles` ——与拖拖粘贴附件完全同一条
         * 链路（`dsh-client-ui-conversation` 的 drop 处理器就是这么用的）。这样得到的那条用户
         * 消息 content 天然是 `[{type:'text'}, {type:'file'}]` 两个独立块，而不是把批注文本拼进正文。
         *
         * 反例（曾经踩过）：只调 `addAttachments(ids)` 是不够的 —— 那只往输入态塞 id，运行时
         * 私有的 `draftAttachments` 里没有对应条目，发送时 `resolveDraftAttachments` 解析不到，
         * 结果是批注根本进不了消息（或直接抛错）。必须让运行时自己登记草稿附件。
         */
        async function syncAttachment() {
          if (syncing) {
            scheduleSync()
            return
          }
          syncing = true
          const previous = draftIds
          try {
            // 等一次在途的位置精修：它通常几十毫秒就结束，这样**首次**上传就带上原文坐标与
            // 诊断；否则手快的用户发出的会是精修之前那一份（实测踩过）。
            if (pendingRefine !== undefined) {
              await Promise.race([
                pendingRefine,
                new Promise((resolve) => {
                  window.setTimeout(resolve, REFINE_WAIT_MS)
                }),
              ])
            }
            const shell = inputShell()
            const conversation = ctx.conversation
            const sessionId = currentSessionId()

            if (shell === undefined || sessionId === undefined) {
              draftIds = []
              return
            }
            if (!draftAttachmentSupported(conversation, shell)) {
              warn('[selection-annotations] 运行时未提供 createDrafts/addFiles，批注不会随消息发送')
              draftIds = []
              return
            }

            // 先摘旧的，避免一条消息上挂两份批注块。
            releaseDrafts(previous, shell)
            draftIds = []
            draftSeen = false

            if (annotations.length === 0) return

            const file = new File([buildPayload(annotations)], ANNOTATION_FILE, { type: 'application/json' })
            // 图片草稿与批注 JSON 一起挂到同一条消息：消息里图片是独立 image 块，宿主只摘 JSON 文件块。
            const imageFiles = []
            for (const item of annotations) {
              for (const image of Array.isArray(item.images) ? item.images : []) {
                if (image !== null && typeof image === 'object' && image.file !== null && typeof image.file === 'object') {
                  imageFiles.push(image.file)
                }
              }
            }
            const drafts = conversation.createDrafts(sessionId, [file, ...imageFiles])
            const ids = Array.isArray(drafts) ? drafts.map((draft) => draft.id).filter((id) => typeof id === 'string') : []
            if (ids.length === 0) return

            // 只等批注 JSON 的上传：图片草稿是运行时直发的，没有后台上传状态，等它只会等到超时。
            if (!(await waitForUploads(conversation, [ids[0]], UPLOAD_READY_TIMEOUT_MS))) {
              warn('[selection-annotations] 批注附件上传失败，本次不随消息发送')
              releaseDrafts(ids, shell)
              return
            }

            draftIds = ids
            draftSeen = false
            // 先订阅再挂载：挂载本身会发布一次输入态，那次「在场」必须被看到，
            // 否则发送导致的「离场」会被误判成「还没挂上」而拒绝清空。
            // 发出去之前页面上已有的批注消息行：发送后据此区分「新消息」与「旧历史」。
            // 但若让它把异常抛出去，就会连带 addFiles 一起跳过，批注根本发不出去。
            try {
              watchDraft()
            } catch (err) {
              warn('[selection-annotations] 消费检测挂载失败（不影响本次发送）：', err)
            }
            if (safe(() => shell.addFiles([], ids)) === false) {
              draftIds = []
              releaseDrafts(ids, shell)
              return
            }
            // 发出去之前页面上已有的批注消息行：发送后据此区分「新消息」与「旧历史」。
            lastAnnotatedKeys = captureAnchorKeys()
            attachedSessionId = sessionId
            log(`[selection-annotations] 批注块已挂到本条消息（${annotations.length} 条）`)
          } catch (err) {
            warn('[selection-annotations] 批注附件同步失败：', err)
          } finally {
            syncing = false
            maintaining = false
          }
        }

        /* ------------------------------------------------------------------ 覆盖层绘到*/

        /** 只带批注、正文为空时补一句正文：有的插件会拦截空正文的发送。 */
        function ensureFallbackPrompt(shell) {          let text = fallbackTextOf()
          if (typeof text !== 'string' || text.trim() === '') return
          const now = new Date()
          const stamp = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
          ].join('-') + ' ' + [
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0'),
            String(now.getSeconds()).padStart(2, '0'),
          ].join(':')
          text = text
            .replace(/\{count\}/g, String(annotations.length))
            .replace(/\{time\}/g, stamp)
          const snapshot = safe(() => shell?.state?.getSnapshot())
          const draft = typeof snapshot?.draft === 'string' ? snapshot.draft : ''
          if (draft.trim() !== '') return
          const apply = typeof shell?.setDraft === 'function' ? shell.setDraft.bind(shell) : shell?.actions?.setDraft
          if (typeof apply !== 'function') return
          safe(() => apply(text))
        }

        /**
         * 用户按下发送后补一道兜底：排队发送时消息还没进入会话，输入框里的附件会先离开，
         * 而那个瞬间的「在场→离场」不一定被轮询看到；只靠 watchDraft 时这批批注会一直挂在界面上。
         * 这里在发送手势后等两秒：附件确实不在输入框里而批注还在，就按已发送处理。
         */
        function armSendConsumeCheck() {
          const at = Date.now()
          sendGestureAt = at
          window.setTimeout(() => {
            // 期间又按了一次或已经被正常消费，交给原路径处理。
            if (sendGestureAt !== at) return
            if (draftIds.length === 0 || annotations.length === 0) return
            const shell = inputShell()
            if (shell === undefined) return
            const live = liveAttachmentIds(shell)
            const held = live === undefined ? true : draftIds.some((id) => live.includes(id))
            if (held) return
            markConsumed('发送手势后附件已离开输入框')
          }, 2000)
        }

        const overlay = document.createElement('div')
        overlay.className = 'sa-overlay'
        overlay.setAttribute('data-sa-ui', 'overlay')

        /**
         * 渲染函数在真的要插入/删除/移动/替换会话区节点之前调用一次。
         * 只有这一下才会记滚动位置：空闲重绘（没有新卡、没有新答复）整段跳过，不读也不写 scrollTop。
         */
        function markConversationChanged() {
          conversationChanges += 1
          if (scrollGuardCapture !== null) scrollGuardCapture()
        }

        /**
         * 数据真的变了（台账写了、答复变了、换了会话）：下一遍重绘必须重建会话区。
         * 只置标记，不排定时器 —— 排重绘仍由调用方的 scheduleRepaint 负责，
         * 避免「渲染里落账 → 又排一遍重绘」这种自激。
         */
        function markConversationDirty() {
          conversationDirty = true
          // 卡片与答复区的插入/摘除会顶动正文，高亮的视口坐标随之失效。
          highlightDirty = true
        }

        /** 高亮层需要重算：会移动正文或改批注集合的动作都要调它。*/
        function markHighlightsDirty() {
          highlightDirty = true
        }

        /** 有没有必须重建会话区的理由：数据变了，或者还有卡片/答复在等锚点进 DOM。*/
        function conversationNeedsRender() {
          return conversationDirty === true || placementPending === true
        }

        function scheduleRepaint(source = 'timer') {
          if (repaintTimer !== null) return
          // 记下这次重绘是谁排进来的：mutation / viewport / poll / emit / session / timer。
          scrollTrace.repaint(source)
          repaintTimer = window.setTimeout(() => {
            repaintTimer = null
            repaint()
          }, REPAINT_MS)
        }

        /**
         * 从节点上溯找会话区的滚动祖先：内容高度超出、且 overflowY 为 auto/scroll 的容器。
         * 位置保护与滚动追踪共用这一套查找，避免两边各写一份选择器。
         */
        function scrollAncestorsOf(start) {
          const found = []
          let current = start
          for (let i = 0; i < 32 && current !== null && current !== undefined; i += 1) {
            if (current === document.body || current === document.documentElement) break
            const scrollable =
              typeof current.scrollHeight === 'number' &&
              typeof current.clientHeight === 'number' &&
              current.scrollHeight > current.clientHeight + 1
            if (scrollable) {
              const overflowY =
                typeof window.getComputedStyle === 'function'
                  ? safe(() => window.getComputedStyle(current).overflowY) ?? ''
                  : ''
              if (overflowY === 'auto' || overflowY === 'scroll') found.push(current)
            }
            current = current.parentElement ?? null
          }
          return found
        }

        /** 给当前会话的滚动容器挂追踪监听；容器没变时重复调用是空操作。 */
        function watchConversationScroll() {
          const roots = [...visibleConversationScopes()]
          for (const node of document.querySelectorAll('[data-sa-ui="sent"], [data-sa-ui="replies"]')) roots.push(node)
          for (const root of roots) {
            for (const container of scrollAncestorsOf(root)) scrollTrace.watch(container)
          }
        }

        /**
         * 重绘会在视口上方摘挂节点，浏览器为了保住可见内容会改写滚动位置，表现为会话区自己跳。
         * 位置保护改成「就地锚定」，不回写旧数值：
         * - 已经贴底的容器，重绘后保持贴底；
         * - 其余容器记住「视口顶部那条消息行」和它相对容器顶部的偏移，重绘后按这条行的实际位移
         *   把 scrollTop 加回去（只加差值）；修完复核一次，残差超过 4px 再补一次，之后放弃，
         *   免得反复修把视野抖成来回跳；
         * - 找不到可锚定的行时，退回按 scrollHeight 的差值补偿，同样只加差。
         * 回写绝对数值会把浏览器为保住可见内容所做的锚定、以及 dsh 自己滚到最新一轮的结果一并撤销，
         * 表现就是进入会话约两秒后视野从最后一轮跳回更早的位置。
         *
         * 位置只在真的改写了会话区节点时才记、才修：渲染函数动手前调 markConversationChanged()，
         * 这里收到回调才量一遍。空闲重绘（没有新卡、没有新答复）不读也不写 scrollTop。
         */
        function keepScrollStable(mutate) {
          // 跳转刚把视口滚到目标：窗口内照常渲染，但不采集锚点、不读也不写 scrollTop，
          // 也不排下一帧的补写，避免同一拍就把刚滚到的目标拽回去。
          if (performance.now() < jumpScrollUntil) {
            const previousCapture = scrollGuardCapture
            scrollGuardCapture = null
            try {
              return safe(mutate) === true
            } finally {
              scrollGuardCapture = previousCapture
            }
          }
          const saved = []
          const seen = new Set()
          /** 视口顶部那条消息行：消息行按文档顺序排列，取第一条底边越过容器顶边的。*/
          const anchorRowOf = (container) => {
            const box = safe(() => container.getBoundingClientRect())
            if (box === undefined) return undefined
            // 优先用 dsh 自己的消息行：它们不会被重绘重建，重绘前后是同一个节点。
            const turns = safe(() => container.querySelectorAll('[data-chat-turn]')) ?? []
            const rows = turns.length > 0
              ? turns
              : safe(() => container.querySelectorAll('[data-chat-anchor-key]')) ?? []
            let measured = 0
            for (const row of rows) {
              // 一次上溯封顶 32 层，这里同样给行数封顶，避免超大会话上每次重绘都量一遍全表。
              if (measured >= 400) return undefined
              // 插件自己插进去的卡片会被重绘替换，不能拿来当锚点。
              if (safe(() => row.closest('[data-sa-ui]') !== null) === true) continue
              const rect = safe(() => row.getBoundingClientRect())
              if (rect === undefined) continue
              measured += 1
              if (rect.bottom <= box.top) continue
              return { row, offset: rect.top - box.top }
            }
            return undefined
          }
          const capture = (container) => {
            // 追踪监听与位置保护同时挂上：滚动事件里靠写前标记区分是谁改的。
            scrollTrace.watch(container)
            const top = container.scrollTop
            const sticky = top + container.clientHeight >= container.scrollHeight - 2
            const entry = { el: container, top, scrollHeight: container.scrollHeight, sticky }
            if (!sticky) {
              const anchor = anchorRowOf(container)
              if (anchor !== undefined) {
                entry.row = anchor.row
                entry.offset = anchor.offset
              }
            }
            saved.push(entry)
          }
          /** 走与滚动追踪共用的祖先查找：顺序、停止条件、overflow 判据都保持一致。 */
          const remember = (start) => {
            for (const current of scrollAncestorsOf(start)) {
              if (seen.has(current)) continue
              seen.add(current)
              capture(current)
            }
          }
          let captured = false
          /** 第一次真要动会话区节点时才量：量的是这一下改写之前的位置。*/
          const captureAll = () => {
            if (captured) return
            captured = true
            const roots = []
            // 输入框与已有卡片都在会话区里，从它们上溯就能找到承载消息的滚动层。
            for (const scope of visibleConversationScopes()) roots.push(scope)
            for (const node of document.querySelectorAll('[data-sa-ui="sent"], [data-sa-ui="replies"]')) roots.push(node)
            for (const root of roots) remember(root)
          }
          /** 量一行相对容器顶边的偏移；行或容器已经量不到时返回 undefined。*/
          const rowOffsetOf = (container, row) => {
            const box = safe(() => container.getBoundingClientRect())
            const rect = safe(() => row.getBoundingClientRect())
            if (box === undefined || rect === undefined) return undefined
            return rect.top - box.top
          }
          /**
           * 按锚点行的实际位移修正 scrollTop：只加差值，不写绝对位置。
           * 写完复核一次：一次补不齐（浏览器另有锚定、内容还在长）时残差超过 4px 再补一次；
           * 第二遍之后不再量也不再写，避免反复修把视野抖成来回跳。
           * 返回 false 表示这一行量不到，交给调用方按内容高度兜底。
           */
          const restoreAnchor = (container, row, target) => {
            const offset = rowOffsetOf(container, row)
            if (offset === undefined) return false
            const delta = offset - target
            if (delta !== 0) {
              scrollTrace.markWrite(container, 'repaint-anchor', container.scrollTop + delta)
              container.scrollTop += delta
              const settled = rowOffsetOf(container, row)
              if (settled !== undefined) {
                const residual = settled - target
                if (Math.abs(residual) > 4) {
                  scrollTrace.markWrite(container, 'repaint-anchor', container.scrollTop + residual)
                  container.scrollTop += residual
                }
              }
            }
            return true
          }
          const restore = (late) => {
            for (const entry of saved) {
              const container = entry.el
              if (entry.sticky) {
                // 贴底：内容变高就跟着到底，内容变矮就自然夹回。
                // 已经在底部（差 1px 以内）就不写：流式输出期间反复写同一个值会打断宿主的滚动。
                const bottom = container.scrollHeight - container.clientHeight
                if (container.scrollTop < bottom - 1) {
                  scrollTrace.markWrite(container, late === true ? 'rAF' : 'restore', bottom)
                  container.scrollTop = bottom
                }
                continue
              }
              if (entry.row !== undefined && entry.row.isConnected === true) {
                // 同一元素还在文档里：按它的实际位移补偿，rAF 那一遍也走这套差值逻辑。
                if (restoreAnchor(container, entry.row, entry.offset) === true) continue
              }
              // 拿不到锚点行：按内容高度的差值补偿，同样只加差，不回写记录下来的绝对位置。
              // 下一帧不再做这一步，避免两遍补偿叠加。
              if (late === true) continue
              const grown = container.scrollHeight - entry.scrollHeight
              if (grown !== 0) {
                scrollTrace.markWrite(container, 'restore', container.scrollTop + grown)
                container.scrollTop += grown
              }
            }
          }
          const previousCapture = scrollGuardCapture
          scrollGuardCapture = captureAll
          let changed = false
          try {
            changed = mutate() === true
          } finally {
            scrollGuardCapture = previousCapture
          }
          // 三步都没动过会话区节点：整段跳过，不读也不写 scrollTop，也不排下一帧的补正。
          if (!changed || captured !== true || saved.length === 0) return changed
          restore()
          // 下一帧再补一次：抵掉浏览器在同一帧里按新布局重新做的锚定。
          if (typeof window.requestAnimationFrame === 'function') {
            safe(() => window.requestAnimationFrame(() => restore(true)))
          }
          return changed
        }

        const repaintFailures = new Set()
        /** 同一处失败只报一次：重绘每 120ms 一轮，逐轮打会把日志刷满，反而看不出真正的那条。*/
        function reportRepaintFailure(key, step, error) {
          if (repaintFailures.has(key)) return
          repaintFailures.add(key)
          warn('[selection-annotations] 重绘步骤失败:', step, error)
        }

        const hoverMisses = new Set()
        /** 悬停命中的划线在批注里找不到：说明这条划线是上一轮重绘的残留，报一次好定位。*/
        function reportHoverMiss(id) {
          if (hoverMisses.has(id)) return
          hoverMisses.add(id)
          warn('[selection-annotations] 悬停命中找不到对应批注:', id)
        }

        /**
         * 高亮条目的身份：草稿按条目 id，已发送按 uuid（没有 uuid 时退回锚点键 + 序号）。
         * 台账 item 没有 id；绘制副本把 key 写进 id 并置 sentHighlight，闪烁与常驻都按同一个 key 配对。
         */
        function highlightKeyOf(item) {
          if (item === null || item === undefined) return null
          if (item.sentHighlight === true) return typeof item.id === 'string' ? item.id : null
          if (typeof item.id === 'string' && item.id !== '') return `draft:${item.id}`
          const uuid = typeof item.uuid === 'string' && item.uuid !== '' ? item.uuid : ''
          if (uuid !== '') return `sent:${uuid}`
          const anchorKey =
            typeof item.source?.anchorKey === 'string' && item.source.anchorKey !== ''
              ? item.source.anchorKey
              : typeof item.anchorKey === 'string' && item.anchorKey !== ''
                ? item.anchorKey
                : ''
          if (anchorKey === '') return null
          const index = Number.isFinite(item.index)
            ? item.index
            : Number.isFinite(item.source?.index)
              ? item.source.index
              : ''
          return `sent:${anchorKey}#${index}`
        }

        /** 台账条目的 key；与 jumpToQuote 拿到的台账 item 用同一套算法。*/
        function sentHighlightKey(anchorKey, item) {
          const uuid = typeof item?.uuid === 'string' && item.uuid !== '' ? item.uuid : ''
          if (uuid !== '') return `sent:${uuid}`
          const index = Number.isFinite(item?.index) ? item.index : ''
          return `sent:${anchorKey}#${index}`
        }

        /** 页面定位用的偏移：精修后 charStart 是原文坐标，只认保存的渲染坐标。*/
        function savedOffsetOf(source) {
          if (source === null || source === undefined) return undefined
          if (source.textOrigin === 'source') {
            return Number.isFinite(source.renderedCharStart) ? source.renderedCharStart : undefined
          }
          return source.charStart
        }

        /**
         * 已发送批注的划线来源：sent 台账里的每一批。
         * annotations 只装未发送草稿，发送成功时草稿被清空、条目落进台账，两者互斥 ——
         * 「已发送」的判据就是台账里存在的条目，不需要再猜状态字段。
         * 画的是台账条目的副本：locateRange 会把 liveRange 写回条目，DOM 对象不能进台账。
         */
        function collectSentHighlightItems() {
          const sessionId = currentSessionId()
          if (sessionId === undefined) return []
          const table = safe(() => loadSent(sessionId)) ?? null
          if (table === null) return []
          const items = []
          const alive = new Set()
          for (const [storedKey, record] of table) {
            if (record === null || typeof record !== 'object' || Array.isArray(record.items) === false) continue
            const anchorKey =
              typeof record.anchorKey === 'string' && record.anchorKey !== '' ? record.anchorKey : storedKey
            for (const item of record.items) {
              if (item === null || typeof item !== 'object') continue
              if (typeof item.quote !== 'string' || item.quote === '') continue
              // 与 jumpToQuote 拿到的台账条目走完全相同的算法：条目自带 source 时优先用它，
              // 老记录/turn 记账换了锚点键时 source 与 record 可能不同，这里不能各算各的。
              const key = highlightKeyOf(item) ?? sentHighlightKey(anchorKey, item)
              alive.add(key)
              // 轮次属于整批记录：条目自己的 source 可能没带 turn，不能只从 item 上找。
              const turn = Number.isFinite(record.turn)
                ? record.turn
                : Number.isFinite(item.source?.turn)
                  ? item.source.turn
                  : null
              const cached = sentHighlightCache.get(key)
              if (cached !== undefined && cached.savedAt === record.savedAt) {
                // 轮次可能是后来从行上补学的（savedAt 不变），缓存也要跟着补，否则悬停拿到的副本永远没轮次。
                if (cached.entry.turn !== turn) {
                  const entry = { ...cached.entry, turn }
                  sentHighlightCache.set(key, { savedAt: record.savedAt, entry })
                  items.push(entry)
                } else {
                  items.push(cached.entry)
                }
                continue
              }
              const entry = { ...item, id: key, sentHighlight: true, turn }
              sentHighlightCache.set(key, { savedAt: record.savedAt, entry })
              items.push(entry)
            }
          }
          for (const key of [...sentHighlightCache.keys()]) {
            if (!alive.has(key)) sentHighlightCache.delete(key)
          }
          return items
        }

        /**
         * 由绘制副本找回它所属的台账记录：轮次与锚点都记在批次记录上，条目自己不一定会带。
         * 返回值补上计算用的 anchorKey 与 storedKey（卡片 data-sa-key 存的是后者），供「查看出处」定位卡片。
         * @param item - collectSentHighlightItems 产出的绘制副本（id 为高亮键）。
         */
        function sentRecordOf(item) {
          if (item === null || item === undefined) return null
          const sessionId = currentSessionId()
          if (sessionId === undefined) return null
          const table = safe(() => loadSent(sessionId)) ?? null
          if (table === null) return null
          for (const [storedKey, record] of table) {
            if (record === null || typeof record !== 'object' || Array.isArray(record.items) === false) continue
            // 高亮键按绘制时的原始批次锚点算；落到页面上的锚点则用与渲染一致的解析结果。
            const keyAnchor =
              typeof record.anchorKey === 'string' && record.anchorKey !== '' ? record.anchorKey : storedKey
            const anchorKey =
              typeof record.anchorKey === 'string' && record.anchorKey !== ''
                ? record.anchorKey
                : resolveLegacyAnchor(storedKey)
            for (const candidate of record.items) {
              if (candidate === null || typeof candidate !== 'object') continue
              // 与绘制时完全相同的算法：条目自带 uuid 时优先，否则按所属批次的锚点与序号拼键。
              const key = highlightKeyOf(candidate) ?? sentHighlightKey(keyAnchor, candidate)
              if (key !== item.id) continue
              return { ...record, anchorKey, storedKey }
            }
          }
          return null
        }

        /** 先按锚点重建，锚点键对不上时退到文本指纹；找到的 Range 写回条目缓存。*/
        function locateHighlightRange(item) {
          const range = locateRange(item)
          if (range !== undefined) return range
          const fingerprint = fingerprintOf(item)
          if (fingerprint === null) return undefined
          const source = item?.source
          const turn = Number.isFinite(source?.turn) ? source.turn : null
          let row = null
          for (const holder of turnHolders(turn)) {
            row = rowByFingerprint(holder, fingerprint)
            if (row !== null) break
          }
          if (row === null) row = rowByFingerprint(document, fingerprint)
          if (row === null) return undefined
          const found = safe(() => matchInRoot(row, item.quote, savedOffsetOf(source))) ?? undefined
          if (found !== undefined) item.liveRange = found
          return found
        }

        /**
         * 同一视觉行上可合并的几何容差。DSH 正文里的行内代码是 display:inline-flex，
         * 左右各 5px padding 加 .5px 边框，Range.getClientRects() 会在它两侧各断一次，
         * 留下 2-6px 的顶边/高度差与 4-8px 的水平间隙；旧容差 2/4/4 吃不掉，
         * 代码后面的文字就被画成好几截。
         */
        const RUN_TOP_TOLERANCE = 6
        const RUN_HEIGHT_TOLERANCE = 6
        const RUN_GAP_TOLERANCE = 12

        /** 两块矩形是不是同一条视觉行：顶边与高度都落在容差内。*/
        function sameRunLine(a, b) {
          return Math.abs(a.top - b.top) <= RUN_TOP_TOLERANCE && Math.abs(a.height - b.height) <= RUN_HEIGHT_TOLERANCE
        }

        /** 水平间隙：相交时为负数。按左右外包算，不看两块谁先出现。*/
        function runGap(a, b) {
          const aRight = a.left + a.width
          const bRight = b.left + b.width
          return Math.max(a.left, b.left) - Math.min(aRight, bRight)
        }

        /**
         * 并集：四边都取两块的外包，而不是沿用先出现那块的顶边；right/bottom 一并给出，
         * 命中表里的 unionRects 读这两个值算整段外框（DOMRect 自带这两个字段，合并出来的普通对象也要有）。
         */
        function unionRunRect(a, b) {
          const left = Math.min(a.left, b.left)
          const right = Math.max(a.left + a.width, b.left + b.width)
          const top = Math.min(a.top, b.top)
          const bottom = Math.max(a.top + a.height, b.top + b.height)
          return { left, top, width: right - left, height: bottom - top, right, bottom }
        }

        /** 没合上的同一行碎片按「间隙 x 高度差」只报一次：重绘每 120ms 一轮，逐轮打会刷屏。*/
        const unmergedRunNotes = new Set()

        /**
         * 诊断只报「差一点就该并上」的情况：差值超过容差两倍的，多半是图、大块空白这类
         * 本来就不该盖住的东西，报出来只会把真正的问题淹掉。
         */
        const UNMERGED_GAP_LIMIT = RUN_GAP_TOLERANCE * 2
        const UNMERGED_HEIGHT_LIMIT = RUN_HEIGHT_TOLERANCE * 2

        /**
         * 合并后仍落在同一视觉行上的碎片，说明偏差超出了上面的容差，报一行供实测定位。
         * 同一行按垂直中心判断，不要求顶边对齐 —— 顶边对不上正是走到这里的原因；
         * 不同行之间的碎片不算，没有成对碎片时不打任何东西。
         */
        function reportUnmergedRun(rects) {
          let gap = 0
          let height = 0
          let found = false
          for (let i = 0; i < rects.length; i += 1) {
            for (let j = i + 1; j < rects.length; j += 1) {
              const a = rects[i]
              const b = rects[j]
              const aCenter = a.top + a.height / 2
              const bCenter = b.top + b.height / 2
              const sameLine = Math.abs(aCenter - bCenter) <= Math.max(RUN_TOP_TOLERANCE, Math.min(a.height, b.height) / 2)
              if (!sameLine) continue
              const pairGap = Math.max(0, runGap(a, b))
              const pairHeight = Math.abs(a.height - b.height)
              if (pairGap > UNMERGED_GAP_LIMIT || pairHeight > UNMERGED_HEIGHT_LIMIT) continue
              found = true
              gap = Math.max(gap, Math.round(pairGap))
              height = Math.max(height, Math.round(pairHeight))
            }
          }
          if (!found) return
          const note = `${gap}x${height}`
          if (unmergedRunNotes.has(note)) return
          if (unmergedRunNotes.size >= 32) return
          unmergedRunNotes.add(note)
          warn(`[selection-annotations] 同行高亮未合并: 间隙 ${gap}px 高度差 ${height}px`)
        }

        /**
         * 分段命中的矩形合并：同一视觉行、水平间隙不超过 12px 的碎片并成一块。
         * 逐段画框时，一段文字被加粗、链接、行内代码切成多个矩形，不合并会留下断断续续的缝。
         * 合并按「任意两块」反复进行，不依赖 getClientRects 的返回顺序；并集会让矩形继续
         * 长大，并可能和更靠前的矩形接上，所以每并一次都从头再扫一遍，直到没有可并项。
         */
        function mergeRunRects(rects) {
          const out = rects.map((rect) => ({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            right: rect.left + rect.width,
            bottom: rect.top + rect.height,
          }))
          let joined = true
          scan: while (joined) {
            joined = false
            for (let i = 0; i < out.length; i += 1) {
              for (let j = i + 1; j < out.length; j += 1) {
                const a = out[i]
                const b = out[j]
                if (!sameRunLine(a, b) || runGap(a, b) > RUN_GAP_TOLERANCE) continue
                out[i] = unionRunRect(a, b)
                out.splice(j, 1)
                joined = true
                continue scan
              }
            }
          }
          reportUnmergedRun(out)
          return out
        }

        /**
         * 按段定位：每段回自己的锚点行（没有锚点时退到这条批注的根），
         * 用空白折叠后的匹配找那一小截。命中一段就算定位成功：跨多段的选区
         * 只有部分段落还能在 DOM 里找到是常态，不能因为比例不够把整条放弃。
         * 绘制范围取首命中段到末命中段；命中段带色块，区间内未命中的段只用
         * 保存的偏移量画下划线，不填底色。
         * @returns 带 hit 标记的矩形；没有可用段或全部失配时返回 null。
         */
        function locateSegmentsOf(item) {
          const segments = segmentsFor(item)
          if (segments === null) return null
          const quote = typeof item?.quote === 'string' ? item.quote : ''
          const source = item?.source ?? {}
          // 段在保存时本来有序，这里再按引文偏移排一次：首末命中段决定绘制区间。
          const ordered = segments
            .map((segment, index) => ({ segment, index }))
            .sort((a, b) => a.segment.quoteStart - b.segment.quoteStart || a.index - b.index)
          const located = []
          for (const { segment } of ordered) {
            const root = rootByAnchorKey(segment.anchorKey) ?? anchorRoot(source)
            if (root === null || root === undefined) continue
            const slice = quote.slice(segment.quoteStart, segment.quoteEnd)
            const found =
              flatText(slice).length < 2
                ? undefined
                : (safe(() => matchInRootNormalized(root, slice, savedOffsetOf(segment))) ?? undefined)
            const boxes = found === undefined ? [] : (safe(() => [...found.getClientRects()]) ?? [])
            located.push({
              segment,
              root,
              slice,
              hit: found !== undefined,
              boxes: boxes.filter((box) => box.width > 0 && box.height > 0),
            })
          }
          const firstHit = located.findIndex((entry) => entry.hit)
          if (firstHit < 0) return null
          let lastHit = located.length - 1
          while (lastHit > firstHit && !located[lastHit].hit) lastHit -= 1
          const hitRects = []
          const partRects = []
          for (let i = firstHit; i <= lastHit; i += 1) {
            const entry = located[i]
            if (entry.hit) {
              for (const box of entry.boxes) hitRects.push(box)
              continue
            }
            const start = savedOffsetOf(entry.segment)
            if (!Number.isFinite(start)) continue
            const length = entry.segment.quoteEnd - entry.segment.quoteStart
            const range = safe(() => rangeFromOffsets(entry.root, start, length))
            if (range === undefined || range === null) continue
            const boxes = safe(() => [...range.getClientRects()]) ?? []
            for (const box of boxes) {
              if (box.width > 0 && box.height > 0) partRects.push(box)
            }
          }
          // 记下这条划线画在哪一行：跳转时优先滚回这一行，不再靠轮次/锚点另找一遍。
          const paintRow = located[firstHit].root
          return [
            ...mergeRunRects(hitRects).map((rect) => ({ ...rect, hit: true, row: paintRow })),
            ...mergeRunRects(partRects).map((rect) => ({ ...rect, hit: false, row: paintRow })),
          ]
        }

        /** 读回段；旧条目先试一次懒迁移（每会话每条最多一次）。*/
        function segmentsFor(item) {
          const valid = segmentsOf(item?.source, item?.quote)
          if (valid !== null) return valid
          return maybeMigrateSegments(item)
        }

        /** 懒迁移已尝试过的条目（会话 → 身份键）；失败也记，避免每次重绘都去翻一遍 DOM。*/
        const migratedKeys = new Map()

        function migrationKeyOf(item) {
          if (typeof item?.uuid === 'string' && item.uuid !== '') return `u:${item.uuid}`
          if (typeof item?.id === 'string' && item.id !== '') return `i:${item.id}`
          return null
        }

        /**
         * 旧条目的懒迁移：只有 kind 是 message/reply/sent、且还没有合法 segments 时才试。
         * 行找不到就放弃（不点导航、不拉远端）；找到后由整段 Range 重建分段，
         * 文本逐字对得上才写回 —— 迁移错位的代价比不迁移大得多。
         * @returns 新的段数组；跳过或失败返回 null。
         */
        function maybeMigrateSegments(item) {
          const source = item?.source
          const kind = source?.kind
          if (kind !== 'message' && kind !== 'reply' && kind !== 'sent') return null
          if (segmentsOf(source, item.quote) !== null) return null
          const sessionId = currentSessionId()
          if (sessionId === undefined) return null
          const key = migrationKeyOf(item)
          if (key === null) return null
          let tried = migratedKeys.get(sessionId)
          if (tried === undefined) {
            tried = new Set()
            migratedKeys.set(sessionId, tried)
          }
          if (tried.has(key)) return null
          tried.add(key)
          const turn = Number.isFinite(source?.turn) ? source.turn : null
          const row = safe(() => findSourceRow(source, item, turn)) ?? null
          if (row === null || row === undefined) return null
          const range = safe(() => matchInRoot(row, item.quote, savedOffsetOf(source))) ?? undefined
          if (range === undefined) return null
          // 子串匹配可能只命中引文的一部分：文本对不上就不能拿来建段。
          if (flatText(safe(() => range.toString())) !== flatText(item.quote)) return null
          const built = safe(() => buildSegments(row, range, source))
          if (built === undefined || built.segments.length === 0) return null
          const segments = stampSegmentFingerprints(built.segments)
          const first = segments[0]
          const nextSource = {
            ...source,
            charStart: first.charStart,
            charEnd: first.charEnd,
            segments,
            ...(built.truncated === true ? { segmentsTruncated: true } : {}),
          }
          if (typeof first.fingerprintBefore === 'string') nextSource.contextBefore = first.fingerprintBefore
          if (typeof first.fingerprintAfter === 'string') nextSource.contextAfter = first.fingerprintAfter
          // 字面完全一样就不写：省掉一次草稿落盘与远端整快照 PUT。
          if (JSON.stringify(nextSource) === JSON.stringify(source)) return null
          const isDraft = typeof item.id === 'string' && annotations.some((entry) => entry.id === item.id)
          let written = false
          if (isDraft) {
            written = updateAnnotationSource(item.id, nextSource)
          } else if (item.sentHighlight === true || typeof item.uuid === 'string') {
            written = writeSentSource(item, nextSource)
          }
          if (!written) return null
          // 旧对象可能还在这一遍重绘的调用栈里（跳转闪烁、命中表）：就地换掉它的来源。
          item.source = nextSource
          return segmentsOf(nextSource, item.quote)
        }

        /**
         * 已发送条目的写回：按 uuid 在台账里找到那一条，替换 source、保留 savedAt。
         * 走 saveSent 才能触发远端整快照 PUT（宿主会 UPDATE source_json）；
         * 不能走 batch 合并接口 —— 那边只补空值，改不了已有字段。
         */
        function writeSentSource(item, source) {
          const sessionId = currentSessionId()
          if (sessionId === undefined) return false
          const uuid = typeof item?.uuid === 'string' && item.uuid !== '' ? item.uuid : ''
          if (uuid === '') return false
          const table = safe(() => loadSent(sessionId)) ?? null
          if (table === null || table === undefined) return false
          const key = typeof item.id === 'string' ? item.id : null
          for (const [storedKey, record] of table) {
            if (record === null || typeof record !== 'object' || !Array.isArray(record.items)) continue
            const index = record.items.findIndex(
              (entry) => entry !== null && typeof entry === 'object' && entry.uuid === uuid,
            )
            if (index === -1) continue
            const items = record.items.slice()
            items[index] = { ...items[index], source }
            // savedAt 不变：它在台账里代表「最后一次内容写入」，迁移出处不该刷新它。
            table.set(storedKey, { ...record, items })
            saveSent(sessionId, table)
            if (key !== null) sentHighlightCache.delete(key)
            return true
          }
          return false
        }

        /** 这一相位是否要把划线换回旧底色：闪烁三下，每下 250ms 由 flashQuote 排下一拍。*/
        function flashPhaseOn(item) {
          return flashPhase === 1 && flashKey !== null && highlightKeyOf(item) === flashKey
        }
        /**
         * 高亮层节点与命中矩形：位置要在会话区回到原位之后量，
         * 所以从 keepScrollStable 的保护段里挪到这里，由 repaint 在滚动回正之后单独调用。
         */
        function collectHighlightNodes(nodes, hits, rows) {
          const target = Array.isArray(hits) ? hits : highlightHits
          for (const item of annotations) {
            // 一条批注定位失败不该拖掉整层高亮：逐条兜住，失败的那条只少一条划线。
            safe(
              () => collectHighlightOf(item, nodes, target, rows),
              (error) => reportRepaintFailure(`collectHighlightNodes:${item?.id}`, 'collectHighlightNodes', error),
            )
          }
          // 已发送条目也进命中表：悬停到它们的划线时弹只读面板；不挂角标（它们没有可编辑的条目 id）。
          for (const item of collectSentHighlightItems()) {
            safe(
              () => collectHighlightOf(item, nodes, target, rows),
              (error) => reportRepaintFailure(`collectHighlightNodes:${item?.id}`, 'collectHighlightNodes', error),
            )
          }
        }

        /** 元素此刻是否真的可见：脱离文档、hidden 属性、折叠动画或零尺寸都算不可见。*/
        function elementVisibleNow(element) {
          if (element === null || element === undefined || element.isConnected !== true) return false
          if (safe(() => element.closest('[hidden]')) !== null) return false
          if (safe(() => element.closest('[data-chat-motion="collapse"]')) !== null) return false
          const rects = safe(() => element.getClientRects()) ?? []
          return rects.length > 0
        }

        /** 折叠标题行里承载文字的那一段：轮次标题取 span.label，分组标题取 leading 之后的标签。*/
        function foldHeaderLabelOf(button) {
          const first = button.firstElementChild
          if (first !== null && first.tagName === 'SPAN' && first.getAttribute('aria-hidden') !== 'true') return first
          const last = button.lastElementChild
          if (last !== null && last.tagName === 'SPAN' && last.getAttribute('aria-hidden') !== 'true') return last
          return button
        }

        /** 量标题文字本身的范围，不铺满整行，避免盖住展开箭头与计数。*/
        function foldHeaderRectsOfButton(button) {
          if (button === null || button === undefined) return null
          if (!elementVisibleNow(button)) return null
          const rects =
            safe(() => {
              const range = document.createRange()
              range.selectNodeContents(foldHeaderLabelOf(button))
              return [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0)
            }) ?? []
          return rects.length > 0 ? rects : null
        }

        /** 分组头按钮：根的第一个子 div 里那把 aria-expanded 按钮。*/
        function processGroupHeaderButton(group) {
          const header = group.firstElementChild
          if (header === null) return null
          return header.querySelector('button[aria-expanded]') ?? header.querySelector('button')
        }

        /**
         * 找到最近的「可见」折叠标题：从目标行向上找分组头（可能多级嵌套），
         * 分组都在整轮里折叠时再退到这一轮的 turn-process 标题；标题自己也不可见就继续向上。
         * 一个可见标题都没有时返回 null —— 宁可不画，也不画到错误位置。
         */
        function foldHeaderRectsOfRow(row, turn) {
          let group = row.closest('[data-step-process]')
          while (group !== null) {
            const rects = foldHeaderRectsOfButton(processGroupHeaderButton(group))
            if (rects !== null) return rects
            group = group.parentElement === null ? null : group.parentElement.closest('[data-step-process]')
          }
          if (!Number.isFinite(turn)) return null
          let button = document.querySelector(`[data-turn-process="${turn}"]`)
          while (button !== null) {
            const rects = foldHeaderRectsOfButton(button)
            if (rects !== null) return rects
            const outer = button.parentElement === null ? null : button.parentElement.closest('[data-step-process]')
            button = outer === null ? null : processGroupHeaderButton(outer)
          }
          return null
        }

        /**
         * 目标行已经被折叠时，把高亮落到它最近的可见折叠标题上。
         * 行还能看见却定位不到文字时不冒名顶替：那说明引文对不上，画标题反而是错的位置。
         */
        function foldedHeaderRectsOfItem(item) {
          const source = item?.source
          if (source === null || typeof source !== 'object' || source.kind !== 'message') return null
          let turn = Number.isFinite(source.turn) ? source.turn : null
          const row = safe(() => findSourceRow(source, item, turn)) ?? null
          if (row === null || row === undefined) return null
          if (elementVisibleNow(row)) return null
          // 条目没带轮次时用行自己的 data-chat-turn 定位整轮标题，避免退不到那一轮。
          if (turn === null) {
            const holder = safe(() => row.closest('[data-chat-turn]')) ?? null
            const fromRow = holder === null ? NaN : Number(holder.getAttribute('data-chat-turn'))
            if (Number.isFinite(fromRow)) turn = fromRow
          }
          return foldHeaderRectsOfRow(row, turn)
        }

        function collectHighlightOf(item, nodes, target, rows) {
          const sent = item.sentHighlight === true
          const blinking = flashPhaseOn(item)
          // 分段命中优先：一段对不上不影响其他段，也不再用整段引文冒一次误配的风险。
          // 分段画框时闪烁照样走统一的相位类，闪烁控制流不用改。
          let rects = locateSegmentsOf(item)
          let fallbackRange = null
          if (rects === null) {
            const range =
              blinking && flashRange !== null && (safe(() => flashRange.startContainer.isConnected === true) === true)
                ? flashRange
                : locateHighlightRange(item)
            fallbackRange = range ?? null
            if (range === undefined || range === null) {
              // 正文被卸载（不只是被 hidden 收起）时连 Range 都建不出来：目标行不可见就退到折叠标题。
              const foldedRects = foldedHeaderRectsOfItem(item)
              if (foldedRects === null) return
              rects = foldedRects
            } else {
              rects = safe(() => [...range.getClientRects()]) ?? []
            }
          }
          // 折叠的正文可能仍返回 0×0 的矩形：先滤掉不可画的，再决定是否退到折叠标题行。
          rects = rects.filter((rect) => rect.width > 0 && rect.height > 0)
          // 目标行被折叠（可能多级）时 rects 为空：改画在最近的可见折叠标题行文字上。
          if (rects.length === 0) {
            const foldedRects = foldedHeaderRectsOfItem(item)
            if (foldedRects === null) return
            rects = foldedRects
          }
          // 命中表带上条目本身：已发送条目不在 annotations 里，悬停时只能靠它找到对应记录。
          if (rects.length > 0 && Array.isArray(target)) target.push({ id: item.id, rects, item })
          // 采纳与否决判定各读一次设置项：草稿据此选常驻色、已发送据此选闪烁时的旧底色，读不到也必须照常画。
          const adopt = safe(() => hasAdoptNote(item.note)) === true
          const reject = safe(() => hasRejectNote(item.note)) === true
          let badged = false
          for (const rect of rects) {
            if (rect.width <= 0 || rect.height <= 0) continue
            const box = document.createElement('div')
            // 草稿用改版前的成功/警告底色；已发送用主题前景色。闪烁时两边都换成对方那一套。
            const base = sent ? 'sa-hl sa-hl-sent' : 'sa-hl'
            // 区间内未命中的段只保留下划线，不填色；闪烁也只闪命中段。
            const part = rect.hit === false
            let className = base
            if (part) className = `${base} sa-hl-part`
            else if (blinking) className = `${base}${sent ? ' sa-hl-blink-sent' : ' sa-hl-blink'}`
            box.className = className
            box.dataset.saHit = part ? '0' : '1'
            if (adopt) box.dataset.adopt = '1'
            if (reject) box.dataset.reject = '1'
            box.style.left = `${rect.left}px`
            box.style.top = `${rect.top}px`
            box.style.width = `${rect.width}px`
            box.style.height = `${rect.height}px`
            nodes.push(box)
            // 角标只挂草稿：已发送条目没有可编辑的条目 id，那会让用户以为这儿多了一条批注。
            if (!badged && item.sentHighlight !== true) {
              badged = true
              // 角标是唯一的「从正文直接回到这条批注」的入口，必须可点击。
              const badge = document.createElement('button')
              badge.type = 'button'
              badge.className = 'sa-badge'
              badge.textContent = String(item.number)
              badge.style.left = `${rect.left - 11}px`
              badge.style.top = `${rect.top - 8}px`
              badge.title = item.note === '' ? item.quote : `${item.quote}\n\n批注：${item.note}`
              badge.addEventListener('click', (event) => {
                event.preventDefault()
                event.stopPropagation()
                openEditPopover(item.id, badge)
              })
              nodes.push(badge)
            }
          }
          // 记下「这条划线画在哪一行」：跳转优先滚回这一行，绕开轮次/锚点在已发送与
          // 答复来源上对不上的判据。表由 paintHighlightLayer 整份替换，不长期持有旧节点。
          const row = highlightedRowOf(rects, fallbackRange)
          const key = highlightKeyOf(item)
          if (rows instanceof Map && key !== null && row !== null) rows.set(key, row)
        }

        /**
         * 这条划线画在哪一行：分段定位时用首命中段的根，整段兜底时从 Range 起点上溯到
         * 最近的消息行。找不到返回 null，调用方会退回原来的轮次/锚点查找。
         */
        function highlightedRowOf(rects, range) {
          if (Array.isArray(rects)) {
            for (const rect of rects) {
              const row = rect?.row
              if (row !== null && row !== undefined && safe(() => row.isConnected === true) === true) return row
            }
          }
          const start = range?.startContainer ?? null
          if (start === null || start === undefined) return null
          const element = start.nodeType === 1 ? start : start.parentElement
          if (element === null || element === undefined) return null
          // 消息行走聊天锚点；已发送卡与答复卡没有聊天锚点，退到它们自己的卡片项。
          const selector =
            '[data-chat-anchor-key], [data-chat-flow-key], [data-chat-turn], .sa-sent-item, .sa-reply-item, [data-sa-field]'
          const row = safe(() => element.closest(selector)) ?? null
          return row !== null && safe(() => row.isConnected === true) === true ? row : null
        }

        /** 高亮键 → 画出来的那一行；每次重建整份替换，旧表里的节点引用随旧表一起释放。*/
        let paintedRows = new Map()

        /**
         * 只重建高亮层：不碰会话区 DOM、不看选区、也不经过 120ms 的通用重绘节流。
         * 跳转闪烁每 250ms 要换一次相位，走 scheduleRepaint 会被滚动/宿主重绘合并掉；
         * 这里直接换整层，失败时保留上一份，一次定位异常不会让悬停与划线整片消失。
         */
        function paintHighlightLayer() {
          const nodes = []
          // 命中表整份替换：中途失败时保留上一份，一次重绘失败不会让悬停整片失效。
          const hits = []
          // 绘制行同理整份重建：条目删除或 DOM 重排后，旧行自动从表里消失。
          const rows = new Map()
          const ok =
            safe(() => {
              collectHighlightNodes(nodes, hits, rows)
              return true
            }) === true
          if (!ok) return false
          highlightHits = hits
          paintedRows = rows
          // 一次性换掉整层：先清空再逐个插入会在帧间露出空白，看起来像界面闪了一下。
          if (typeof overlay.replaceChildren === 'function') {
            overlay.replaceChildren(...nodes)
          } else {
            overlay.textContent = ''
            for (const node of nodes) overlay.appendChild(node)
          }
          return true
        }

        /**
         * 当前是否有会被重绘打断的非折叠选区。
         * 弹层/面板里的选区是我们自己的编辑区，重绘不会换掉它的端点，不算。
         */
        function selectionAtRisk() {
          const selection = safe(() => window.getSelection()) ?? null
          if (selection === null || selection.rangeCount === 0 || selection.isCollapsed !== false) return false
          const anchor = selection.anchorNode
          const element = anchor === null || anchor === undefined
            ? null
            : anchor.nodeType === 1 ? anchor : anchor.parentElement
          if (element === null || element === undefined) return true
          // 只有我们自己的输入区不算风险：弹层与面板里的编辑框，重绘不会换掉它的端点。
          // 已发送卡和答复区也带 data-sa-ui，但它们的正文是用户可以划选的，必须算风险。
          const safeHost = safe(() => element.closest(
            '[data-sa-ui="popover"], [data-sa-ui="panel"], input, textarea, [contenteditable="true"]',
          )) ?? null
          return safeHost === null
        }

        /** 上一遍重绘被选区挡住时，选区一收就补一次。*/
        function flushPendingRepaint() {
          if (repaintPending !== true || pointerSelecting === true) return
          if (selectionAtRisk() === true) return
          repaintPending = false
          // 松手补绘：这一遍本来就该把挡住期间错开的高亮重新量一次。
          highlightDirty = true
          scheduleRepaint('timer')
        }

        function repaint() {
          // 有非折叠选区或正在拖选时先不动会话区：摘挂卡片、回写滚动位都会换掉选区端点，
          // 用户看到的就是「选中的文字变成 0 个字符」。记下来，等选区收了再补一次。
          const blocked = pointerSelecting === true || selectionAtRisk() === true
          const now = Date.now()
          if (blocked) {
            repaintPending = true
            if (repaintDeferredAt === null) repaintDeferredAt = now
            // 选区一直不收（选完就不动、或一直按着键保持选中）时不能无限推迟，否则卡片与答复区
            // 永远是旧的。超过上限就照常渲染内容，只是不进 keepScrollStable 那一层位置保护。
            if (now - repaintDeferredAt < REPAINT_DEFER_MAX_MS) return
          } else {
            repaintPending = false
            repaintDeferredAt = null
          }
          // 每一步单独兜住异常并留日志：任何一步失败都不能挡住后面的高亮重建。
          const step = (name, run) => safe(run, (error) => reportRepaintFailure(name, name, error))
          // 三步渲染：这一步只动内容，位置保护由外面决定要不要套。
          const renderConversation = () => {
            // 历史回看先于高亮：新消息行刚出现时在这里完成配对，卡片随即补上。
            const scanned = step('scanSentMessages', scanSentMessages) === true
            const sent = step('renderSentCards', renderSentCards) === true
            const replies = step('renderReplySections', renderReplySections) === true
            // 三步都没插入/删除/移动/替换会话区节点时，keepScrollStable 不读也不写 scrollTop。
            return scanned || sent || replies
          }
          // 会话区只在数据真的变了、或还有卡片/答复在等锚点进 DOM 时才重建。
          // 宿主自己的重排、流式增量、时间刷新都不再触发这里，滚动与窗口尺寸变化只更新高亮。
          const rebuild = conversationNeedsRender()
          // 高亮只在「批注集合变了、正文被顶动过、视口变了」时才重算。会话区重建一定会动正文，
          // 所以它也连带要重算高亮；单纯排了一次重绘（例如关掉编辑弹层）不该重建整层覆盖物。
          const rebuildHighlights = rebuild === true || highlightDirty === true
          // 两样都不需要：这一遍什么都不做，不读也不写滚动位置，不碰 overlay。
          if (!rebuild && !rebuildHighlights) return
          // 真要动手之前先把这一屏的滚动容器挂上追踪监听，下面自己写 scrollTop 时才分得清来源。
          step('watchConversationScroll', watchConversationScroll)
          // 先清标记再跑：这一遍渲染过程中新落账的记录会把标记重新置上，留到下一遍再补。
          conversationDirty = false
          placementPending = false
          highlightDirty = false
          if (rebuild) {
            // 被选区挡住且已经超时：直接渲染，跳过 keepScrollStable——不加位置锚点、不读不写 scrollTop。
            // 只包住会动会话区 DOM 的几步；overlay 是 fixed 层，不在滚动流里，不必包。
            if (blocked) renderConversation()
            else keepScrollStable(renderConversation)
          }
          if (!rebuildHighlights) return
          // 高亮最后量：放在位置保护之后，量到的视口坐标才与最终的滚动位置一致。
          // 与跳转闪烁共用同一个入口，overlay 的替换只留一处。
          step('collectHighlightNodes', paintHighlightLayer)
        }

        /* ------------------------------------------------------------------ 选区工具条*/

        const toolbar = document.createElement('div')
        toolbar.className = 'sa-toolbar'
        toolbar.setAttribute('data-sa-ui', 'toolbar')
        /** 与 DSH 图标同源：路径数据取自 @deepseek-ai/dsh-client-ui-primitives 的 IconCheckOutline / IconEdit。*/
        function dshIconSvg(kind) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.setAttribute('viewBox', '0 0 16 16')
          svg.setAttribute('width', '14')
          svg.setAttribute('height', '14')
          svg.setAttribute('fill', 'none')
          svg.setAttribute('aria-hidden', 'true')
          svg.setAttribute('stroke-width', '1')
          const path = (d, extra) => {
            const node = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            node.setAttribute('d', d)
            node.setAttribute('stroke', 'currentColor')
            if (extra !== undefined) for (const key of Object.keys(extra)) node.setAttribute(key, extra[key])
            svg.appendChild(node)
          }
          if (kind === 'check') {
            path('M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4')
          } else if (kind === 'reject') {
            path('M3.75 3.75 12.25 12.25')
            path('M12.25 3.75 3.75 12.25')
          } else if (kind === 'copy') {
            path('M5.6 5.6H12.4V12.4H5.6V5.6Z')
            path('M3.6 3.6H9.4V5.6')
          } else {
            path('M8.85596 2.69971H4.19971C3.37141 2.69971 2.69992 3.37146 2.69971 4.19971V11.8003C2.69992 12.6285 3.37141 13.3003 4.19971 13.3003H11.8003C12.6283 13.2999 13.3001 12.6283 13.3003 11.8003V7.89893H14.3003V11.8003C14.3001 13.1806 13.1806 14.2999 11.8003 14.3003H4.19971C2.81913 14.3003 1.69992 13.1808 1.69971 11.8003V4.19971C1.69992 2.81918 2.81913 1.69971 4.19971 1.69971H8.85596V2.69971Z', { fill: 'currentColor', stroke: 'none' })
            path('M7.7849 8.23878L13.888 2.13574')
          }
          return svg
        }

        const annotateButton = document.createElement('button')
        annotateButton.type = 'button'
        annotateButton.className = 'sa-btn'
        const annotateLabel = document.createElement('span')
        annotateLabel.textContent = t('annotate')
        annotateButton.append(dshIconSvg('edit'), annotateLabel)
        // 「批注否决」与采纳对称：复用同一条落条目事务，只在正文里预填「否决」，随后打开编辑面板。
        const rejectButton = document.createElement('button')
        rejectButton.type = 'button'
        rejectButton.className = 'sa-btn sa-btn-reject'
        const rejectLabel = document.createElement('span')
        rejectLabel.textContent = t('annotate.reject')
        rejectButton.append(dshIconSvg('reject'), rejectLabel)
        // 「批注采纳」复用同一个创建流程，只在批注正文里预填「采纳」。
        const adoptButton = document.createElement('button')
        adoptButton.type = 'button'
        adoptButton.className = 'sa-btn sa-btn-adopt'
        const adoptLabel = document.createElement('span')
        adoptLabel.textContent = t('annotate.adopt')
        adoptButton.append(dshIconSvg('check'), adoptLabel)
        // 「复制」放在最右，先复制再决定批注、采纳与否决。
        const copyButton = document.createElement('button')
        copyButton.type = 'button'
        copyButton.className = 'sa-btn'
        const copyLabel = document.createElement('span')
        copyLabel.textContent = t('annotate.copy')
        copyButton.append(dshIconSvg('copy'), copyLabel)
        // 左边否决、采纳、中间反馈、右边复制。
        toolbar.append(rejectButton, adoptButton, annotateButton, copyButton)

        /* ------------------------------------------------------------------ 右键菜单*/

        // DSH 的右键菜单由 Electron 主进程用原生菜单构建，渲染层插件加不进去；
        // 这里在选区上自建一个同形菜单，把「批注」和「复制」放在右键位置。
        const contextMenu = document.createElement('div')
        contextMenu.className = 'sa-menu'
        contextMenu.setAttribute('data-sa-ui', 'menu')
        contextMenu.dataset.open = '0'
        const menuAnnotate = document.createElement('button')
        menuAnnotate.type = 'button'
        menuAnnotate.className = 'sa-menu-item'
        menuAnnotate.textContent = t('menu.annotate')
        const menuAdopt = document.createElement('button')
        menuAdopt.type = 'button'
        menuAdopt.className = 'sa-menu-item'
        menuAdopt.textContent = t('menu.adopt')
        const menuReject = document.createElement('button')
        menuReject.type = 'button'
        menuReject.className = 'sa-menu-item'
        menuReject.textContent = t('menu.reject')
        const menuCopy = document.createElement('button')
        menuCopy.type = 'button'
        menuCopy.className = 'sa-menu-item'
        menuCopy.textContent = t('menu.copy')
        contextMenu.append(menuAnnotate, menuAdopt, menuReject, menuCopy)
        /** 打开菜单时的那份选区：菜单点下去时 document 的选区可能已经变了。*/
        let contextMenuSelection = null

        const popover = document.createElement('div')
        popover.className = 'sa-popover'
        popover.setAttribute('data-sa-ui', 'popover')
        const popHead = document.createElement('div')
        popHead.className = 'sa-pop-head'
        const popBody = document.createElement('div')
        popBody.className = 'sa-pop-body'
        const popTitle = document.createElement('div')
        popTitle.className = 'sa-pop-title'
        const popClose = document.createElement('button')
        popClose.type = 'button'
        popClose.className = 'sa-pop-close'
        popClose.textContent = '×'
        popClose.setAttribute('aria-label', t('pop.cancel'))
        popHead.append(popTitle, popClose)
        // 抬升只在编辑时生效：只跟与弹层实际重叠的浮层比层级，取它们的最大值加一，
        // 但不越过 DSH 菜单与图片放大查看层（950 上限）。
        const lowerPopover = () => {
          popover.classList.remove('sa-front')
          popover.style.zIndex = ''
        }
        const raisePopover = () => {
          const rect = popover.getBoundingClientRect()
          let max = 0
          if (rect.width > 0 && rect.height > 0) {
            const points = [
              [rect.left + 4, rect.top + 4],
              [rect.right - 4, rect.top + 4],
              [rect.left + 4, rect.bottom - 4],
              [rect.right - 4, rect.bottom - 4],
              [rect.left + rect.width / 2, rect.top + rect.height / 2],
            ]
            for (const [x, y] of points) {
              const stack = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : []
              for (const node of stack) {
                if (node === popover || popover.contains(node)) continue
                if (node === document.body || node === document.documentElement) continue
                const z = Number(window.getComputedStyle(node).zIndex)
                if (Number.isFinite(z) && z > max) max = z
              }
            }
          }
          popover.style.zIndex = String(Math.min(950, Math.max(70, max + 1)))
          popover.classList.add('sa-front')
        }
        popover.addEventListener('pointerdown', raisePopover, true)
        popover.addEventListener('focusin', raisePopover, true)
        popover.addEventListener('keydown', raisePopover, true)
        popover.addEventListener('focusout', (event) => {
          const next = elementOf(event.relatedTarget)
          if (next !== null && popover.contains(next)) return
          window.setTimeout(() => {
            if (!popover.contains(document.activeElement)) lowerPopover()
          }, 0)
        })
        popover.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            event.stopPropagation()
            commitPopover()
          }
        }, true)
        // 按住标题区可以挪动整个弹层，避免它挡住正在看的原文。
        let popDrag = null
        popHead.addEventListener('pointerdown', (event) => {
          if (event.button !== 0) return
          if (elementOf(event.target)?.closest('.sa-pop-close') !== null) return
          const rect = popover.getBoundingClientRect()
          popDrag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top, width: rect.width, height: rect.height }
          popover.dataset.dragged = '1'
          popover.classList.add('sa-pop-dragging')
          event.preventDefault()
          if (typeof popHead.setPointerCapture === 'function') safe(() => popHead.setPointerCapture(event.pointerId))
        })
        const popQuoteLabel = document.createElement('div')
        popQuoteLabel.className = 'sa-pop-label'
        popQuoteLabel.textContent = t('label.quote')
        /** 「引用原文」标题行：右侧的跳转按钮与它自己的失败提示。*/
        const popJumpHint = document.createElement('span')
        popJumpHint.className = 'sa-pop-jump-hint'
        popJumpHint.dataset.on = '0'
        /** 与「回放」同一套：图标常驻、文字悬停出现，作为标题行的普通子元素贴右。*/
        const jumpButtonNodes = []
        const createJumpButton = (action) => {
          const node = document.createElement('span')
          node.className = 'sa-reuse sa-jump'
          node.setAttribute('role', 'button')
          node.setAttribute('tabindex', '0')
          node.setAttribute('aria-label', t('jump.label'))
          node.title = t('jump.hint')
          node.style.display = 'none'
          const text = document.createElement('span')
          text.className = 'sa-reuse-text'
          text.textContent = t('jump.label')
          node.append(text, jumpIcon())
          const run = (event) => {
            event.preventDefault()
            event.stopPropagation()
            if (popoverItem === null) return
            // 备注行的按钮回到这条批注的答复卡；引用原文行没有回调，仍按正文位置跳。
            if (typeof action === 'function') {
              action(node)
              return
            }
            // 只读面板用台账里的批次轮次；编辑/新建态没有轮次，仍让 jumpToQuote 自己从 source 里找。
            jumpToQuote(popoverItem, popoverTurn === null ? undefined : popoverTurn, node)
          }
          node.addEventListener('click', run)
          node.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') run(event)
          })
          jumpButtonNodes.push(node)
          return node
        }
        const popJump = createJumpButton()
        const popQuoteHead = document.createElement('div')
        popQuoteHead.className = 'sa-pop-quote-head'
        popQuoteHead.append(popQuoteLabel, popJumpHint, popJump)
        const popQuote = document.createElement('div')
        popQuote.className = 'sa-pop-quote'
        /** 已发送批注的只读正文：同一个弹层底座，只是把输入框换成这一段文字。*/
        const popReadNote = document.createElement('div')
        popReadNote.className = 'sa-pop-read'
        popReadNote.style.display = 'none'
        const popDivider = document.createElement('div')
        popDivider.className = 'sa-pop-divider'
        const popSource = document.createElement('div')
        popSource.className = 'sa-pop-src'
        const popNoteLabel = document.createElement('div')
        popNoteLabel.className = 'sa-pop-label'
        popNoteLabel.textContent = t('pop.noteLabel')
        // 只读态在「批注」标题行右侧再放一个「查看出处」，与「引用原文」行上下对称。
        // 这一行走答复卡：引用原文行仍由 createJumpButton 的默认分支回到正文。
        const popNoteJump = createJumpButton((node) => jumpToReply(popoverRecord, popoverItem, node))
        const popNoteHead = document.createElement('div')
        popNoteHead.className = 'sa-pop-note-head'
        popNoteHead.append(popNoteLabel, popNoteJump)
        /** 输入前缀时的补全提示：回车/Tab 换成采纳 token。*/
        const popSuggest = document.createElement('button')
        popSuggest.type = 'button'
        popSuggest.className = 'sa-suggest'
        popSuggest.setAttribute('data-sa-ui', 'suggest')
        popSuggest.style.display = 'none'
        // 现代编辑器式 ghost 补全：在光标后显示斜体虚影，Tab 接受。
        const ghostTip = document.createElement('span')
        ghostTip.className = 'sa-ghost'
        ghostTip.setAttribute('data-sa-ui', 'ghost')
        ghostTip.setAttribute('aria-hidden', 'true')
        ghostTip.style.display = 'none'
        const popInput = document.createElement('div')
        popInput.className = 'sa-pop-input'
        popInput.setAttribute('contenteditable', 'true')
        popInput.setAttribute('role', 'textbox')
        popInput.setAttribute('aria-multiline', 'true')
        popInput.setAttribute('tabindex', '0')
        popInput.setAttribute('aria-label', t('pop.placeholder'))
        popInput.dataset.placeholder = t('pop.placeholder')
        popInput.dataset.empty = '1'
        /** 已批注原文的高亮矩形缓存，供鼠标悬停命中检测。*/
        let highlightHits = []
        /**
         * 「查看出处」的闪烁状态：按高亮 key + 相位驱动，不靠一次性 CSS 动画。
         * 覆盖层每轮重绘都会整层重建，相位只有放在状态里，重建后才不会跳回起点。
         */
        let flashKey = null
        let flashPhase = 0
        let flashTimers = []
        /** 闪烁目标在跳转时命中的 Range：锚点键对不上时也能在找到的那一行上闪。*/
        let flashRange = null
        /** 已发送批注的绘制副本：按 key 缓存，台账 savedAt 变了就重建，避免重绘丢 liveRange。*/
        const sentHighlightCache = new Map()
        /** 悬停打开编辑框的定时器与目标。*/
        let hoverOpenTimer = null
        let hoverTargetId = null
        /** 悬停关闭的定时器。*/
        let hoverCloseTimer = null
        /** 鼠标是否停在弹层上。*/
        let popoverHovered = false
        /** 用户是否已经在这条弹层里动过手（点击或输入）——动过就不再自动关。*/
        let popoverTouched = false
        /** 弹层是谁打开的：主动点开，还是悬停预览。只有悬停的会被自动关。*/
        let popoverSource = 'manual'
        let popoverRect = null
        /** 备注编辑器：采纳句是可整体删除的 token，其余仍是普通文本。*/
        function caretToEnd() {
          const selection = window.getSelection()
          if (selection === null || typeof document.createRange !== 'function') return
          const range = document.createRange()
          range.selectNodeContents(popInput)
          range.collapse(false)
          selection.removeAllRanges()
          selection.addRange(range)
        }

        function noteValue() {
          return typeof popInput.textContent === 'string' ? popInput.textContent : ''
        }

        function refreshNoteState() {
          popInput.dataset.empty = noteValue() === '' ? '1' : '0'
          syncNoteTone()
          // 文字变了：编辑态按去抖自动存写；新建态由 schedulePopAutoSave 自己跳过。
          schedulePopAutoSave()
        }

        function appendNoteText(text) {
          if (text === '') return
          if (typeof document.createTextNode === 'function') {
            popInput.appendChild(document.createTextNode(text))
          } else {
            const span = document.createElement('span')
            span.textContent = text
            popInput.appendChild(span)
          }
        }

        function noteTokenNode(phrase, tone) {
          const token = document.createElement('span')
          token.className = tone === 'reject' ? 'sa-token sa-token-reject' : 'sa-token'
          token.setAttribute('contenteditable', 'false')
          token.textContent = phrase
          return token
        }

        /** 参与备注着色的关键句：采纳句与否决句，设置成空串的那一条不参与。*/
        function notePhrases() {
          return [adoptTextOf(), rejectTextOf()].filter((phrase) => typeof phrase === 'string' && phrase !== '')
        }

        /** 用编辑器内容重建备注：采纳句与否决句各自换成不可编辑 token，按出现顺序排列。*/
        function setNoteContent(value) {
          popInput.textContent = ''
          if (value === '') {
            refreshNoteState()
            return
          }
          for (const segment of noteSegments(value, adoptTextOf(), rejectTextOf())) {
            if (segment.tone === '') appendNoteText(segment.text)
            else popInput.appendChild(noteTokenNode(segment.text, segment.tone))
          }
          refreshNoteState()
        }

        const insertNoteText = (text) => {
          const selection = window.getSelection()
          const range = selection !== null && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
          if (range !== null && popInput.contains(range.startContainer)) {
            range.deleteContents()
            const node = typeof document.createTextNode === 'function' ? document.createTextNode(text) : null
            if (node !== null) {
              range.insertNode(node)
              range.setStartAfter(node)
              range.collapse(true)
              selection.removeAllRanges()
              selection.addRange(range)
              return
            }
          }
          appendNoteText(text)
          caretToEnd()
        }
        /** 行内补全：光标所在行若正好是采纳句的前缀，就在光标下方列出补全项。*/
        let suggested = null
        function hideSuggestion() {
          suggested = null
          ghostTip.style.display = 'none'
          popSuggest.style.display = 'none'
        }

        function caretLine() {
          const selection = window.getSelection()
          if (selection === null || selection.rangeCount === 0) return null
          const range = selection.getRangeAt(0)
          if (!range.collapsed) return null
          const node = range.startContainer
          if (node === null || node.nodeType !== 3 || typeof node.data !== 'string') return null
          const before = node.data.slice(0, range.startOffset)
          const line = before.slice(before.lastIndexOf('\n') + 1)
          const rect = range.getBoundingClientRect()
          return { node, offset: range.startOffset, line, rect }
        }

        function updateSuggestion() {
          const phrases = notePhrases()
          const ctx = caretLine()
          if (ctx === null) {
            hideSuggestion()
            return
          }
          // 两个关键句各自参与补全；同一行只可能是一个前缀，取第一个匹配的。
          const phrase = phrases.find(
            (candidate) => candidate !== '' && ctx.line !== '' && ctx.line !== candidate && candidate.includes(ctx.line),
          )
          if (phrase === undefined) {
            hideSuggestion()
            return
          }
          suggested = { phrase, prefix: ctx.line, node: ctx.node, offset: ctx.offset }
          ghostTip.textContent = phrase
          const left = Math.min(ctx.rect.right + 1, window.innerWidth - 40)
          ghostTip.style.left = `${Math.max(8, left)}px`
          ghostTip.style.top = `${ctx.rect.top}px`
          ghostTip.style.display = ''
        }

        function acceptSuggestion() {
          if (suggested === null) return false
          const phrase = suggested.phrase
          const { prefix, node, offset } = suggested
          if (typeof node.data !== 'string' || node.data.slice(offset - prefix.length, offset) !== prefix) {
            hideSuggestion()
            return false
          }
          const selection = window.getSelection()
          if (selection === null || typeof document.createRange !== 'function') return false
          const range = document.createRange()
          range.setStart(node, offset - prefix.length)
          range.setEnd(node, offset)
          range.deleteContents()
          const token = noteTokenNode(phrase, phrase === adoptTextOf() ? 'adopt' : 'reject')
          range.insertNode(token)
          const after = document.createRange()
          after.setStartAfter(token)
          after.collapse(true)
          selection.removeAllRanges()
          selection.addRange(after)
          hideSuggestion()
          refreshNoteState()
          syncPopInputHeight()
          ensureCaretVisible()
          return true
        }
        const popActions = document.createElement('div')
        popActions.className = 'sa-pop-actions'
        /** 当前正在编辑的这条批注挂的图片；只在内存里（二进制进不了 localStorage）。*/
        let popInputImages = []
        const popImages = document.createElement('div')
        popImages.className = 'sa-pop-images'
        const popImagesHint = document.createElement('div')
        popImagesHint.className = 'sa-pop-images-hint'
        popImagesHint.textContent = t('pop.imagesHint')

        /** 全屏查看批注图片：点缩略图放大，点任意处或 Esc 关闭。 */
        const imageViewer = document.createElement('div')
        imageViewer.className = 'sa-viewer'
        imageViewer.setAttribute('data-sa-ui', 'viewer')
        imageViewer.dataset.open = '0'
        const imageViewerImg = document.createElement('img')
        imageViewerImg.className = 'sa-viewer-img'
        imageViewerImg.alt = t('viewer.alt')
        imageViewer.appendChild(imageViewerImg)

        function openImageViewer(url, name) {
          if (typeof url !== 'string' || url === '') return
          imageViewerImg.src = url
          imageViewerImg.alt = typeof name === 'string' && name !== '' ? name : t('viewer.alt')
          imageViewer.dataset.open = '1'
        }

        function closeImageViewer() {
          if (imageViewer.dataset.open !== '1') return
          imageViewer.dataset.open = '0'
          imageViewerImg.removeAttribute('src')
        }

        imageViewer.addEventListener('click', () => closeImageViewer())
        const popDelete = document.createElement('button')
        popDelete.type = 'button'
        popDelete.className = 'sa-link sa-pop-delete'
        popDelete.textContent = t('pop.delete')
        const popSpacer = document.createElement('span')
        popSpacer.className = 'sa-pop-spacer'
        const popCancel = document.createElement('button')
        popCancel.type = 'button'
        popCancel.className = 'sa-link'
        popCancel.textContent = t('pop.cancel')
        const popSave = document.createElement('button')
        popSave.type = 'button'
        popSave.className = 'sa-btn sa-pop-primary'
        popSave.textContent = t('pop.save')
        popActions.append(popDelete, popSpacer, popCancel, popSave)
        // 只有标题固定在顶部；来源、引用原文、备注、图片、按钮行同住正文区一起滚。
        popBody.append(popSource, popQuoteHead, popQuote, popDivider, popNoteHead, popReadNote, popInput, popImages, popActions)
        popover.append(popHead, popBody)

        /* ------------------------------------------------------------------ 弹层尺寸调整*/
        const POPOVER_MIN_WIDTH = 260
        const POPOVER_MIN_HEIGHT = 160
        const POPOVER_MARGIN = 8
        /** CSS 里 `.sa-popover` 的宽度；实测拿不到 offsetWidth 时用它兜底。 */
        const POPOVER_DEFAULT_WIDTH = 340
        /** 用户定过尺寸后，宽高由 inline style 固定，不再随内容或锚点空间自适应。*/
        let popoverSized = false
        /** 正在拖拽的边缘与起始几何。*/
        let popResize = null

        const popoverSizeBounds = () => ({
          maxWidth: Math.max(POPOVER_MIN_WIDTH, window.innerWidth - POPOVER_MARGIN * 2),
          maxHeight: Math.max(POPOVER_MIN_HEIGHT, window.innerHeight - POPOVER_MARGIN * 2),
        })

        function clampPopoverSize(width, height) {
          const bounds = popoverSizeBounds()
          const w = Number.isFinite(width) ? width : POPOVER_MIN_WIDTH
          const h = Number.isFinite(height) ? height : POPOVER_MIN_HEIGHT
          return {
            width: Math.round(Math.max(POPOVER_MIN_WIDTH, Math.min(w, bounds.maxWidth))),
            height: Math.round(Math.max(POPOVER_MIN_HEIGHT, Math.min(h, bounds.maxHeight))),
          }
        }

        function applyPopoverSize(width, height) {
          const next = clampPopoverSize(width, height)
          popover.style.width = `${next.width}px`
          popover.style.height = `${next.height}px`
          popoverSized = true
          return next
        }

        function readPopoverSize() {
          const storage = draftStorage()
          if (storage === undefined) return null
          const raw = safe(() => storage.getItem(POPOVER_SIZE_KEY))
          if (typeof raw !== 'string' || raw === '') return null
          const parsed = safe(() => JSON.parse(raw))
          if (parsed === undefined || parsed === null || typeof parsed !== 'object') return null
          const width = Number(parsed.width)
          const height = Number(parsed.height)
          if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
          return { width, height }
        }

        function savePopoverSize(width, height) {
          const storage = draftStorage()
          if (storage === undefined) return
          const next = clampPopoverSize(width, height)
          safe(() => storage.setItem(POPOVER_SIZE_KEY, JSON.stringify(next)))
        }

        /**
         * 打开时沿用上次尺寸：只有存下的那一维比默认大才采用，否则该维回落默认。
         * 宽高各自判断——宽度够大不代表高度也该套上。
         * 默认宽度取 `.sa-popover` 的 CSS 宽度（量 offsetWidth，拿不到时用常量 340）；
         * 默认高度是「不设尺寸」时面板的自然高度，先清掉 inline 宽高再量一次
         * getBoundingClientRect().height。调用点在 dataset.open='1' 之后、placePopover 之前。
         */
        function restorePopoverSize() {
          const saved = readPopoverSize()
          // 量默认尺寸前先回到未定尺寸状态：清 inline 宽高，以及上一轮留下的 maxHeight。
          const previousMaxHeight = popover.style.maxHeight
          popoverSized = false
          popover.style.width = ''
          popover.style.height = ''
          popover.style.maxHeight = ''
          const defaultWidth = popover.offsetWidth || POPOVER_DEFAULT_WIDTH
          const defaultHeight = popover.getBoundingClientRect().height
          popover.style.maxHeight = previousMaxHeight
          if (saved === null) return
          const width = saved.width > defaultWidth ? saved.width : undefined
          const height = saved.height > defaultHeight ? saved.height : undefined
          if (width === undefined && height === undefined) return
          const bounds = popoverSizeBounds()
          if (width !== undefined) popover.style.width = `${Math.round(Math.max(POPOVER_MIN_WIDTH, Math.min(width, bounds.maxWidth)))}px`
          if (height !== undefined) popover.style.height = `${Math.round(Math.max(POPOVER_MIN_HEIGHT, Math.min(height, bounds.maxHeight)))}px`
          popoverSized = true
        }

        /**
         * 只读面板的尺寸边界：宽 280–420（视口更窄时让步），高最多视口 70%。
         * 规则只写在这一处，打开、窗口缩放与拖拽都从这里取。
         */
        function sentPopoverBounds() {
          return {
            minWidth: 280,
            maxWidth: Math.max(280, Math.min(420, window.innerWidth - POPOVER_MARGIN * 2)),
            maxHeight: Math.floor(window.innerHeight * 0.7),
          }
        }

        /**
         * 只读面板按内容定尺寸，不沿用会话里记住的编辑尺寸：
         * 宽度取自然宽夹在 280–420，高度由内容决定、最多到视口 70%；定位仍交给 placePopover。
         */
        function sizeSentPopover() {
          const bounds = sentPopoverBounds()
          popoverSized = false
          popover.style.height = ''
          popover.style.width = 'auto'
          popover.style.maxWidth = `${bounds.maxWidth}px`
          // 量自然宽时把 left 归零：上一轮弹层停在屏幕右侧会把可用宽压小，量出来偏窄。
          const previousLeft = popover.style.left
          popover.style.left = '0px'
          const naturalWidth = popover.offsetWidth
          popover.style.left = previousLeft
          const width = Math.round(
            Math.min(bounds.maxWidth, Math.max(bounds.minWidth, naturalWidth || 0)),
          )
          popover.style.width = `${width}px`
          // 清掉 inline max-width，回到 CSS 的 calc(100vw - 16px)，窗口很窄时仍能收住。
          popover.style.maxWidth = ''
          popover.style.maxHeight = `${bounds.maxHeight}px`
        }

        /** 只读面板的高度上限：视口 70%。*/
        function sentPopoverHeightLimit() {
          return sentPopoverBounds().maxHeight
        }

        /** 窗口缩小时把已定尺寸的浮层夹回视口；夹取结果不写回存储，放大窗口后还能恢复原尺寸。*/
        function clampSizedPopoverToViewport() {
          if (!popoverSized || popover.dataset.open !== '1') return
          const bounds = popoverSizeBounds()
          // 只读面板没拖过时按 70% 上限夹；拖过之后以用户拖出的尺寸为准，只夹回视口。
          const limit =
            popoverMode === 'sent' && popover.dataset.dragged !== '1'
              ? Math.min(bounds.maxHeight, sentPopoverHeightLimit())
              : bounds.maxHeight
          applyPopoverSize(popover.offsetWidth, Math.min(popover.offsetHeight, limit))
          popover.style.maxHeight = `${limit}px`
          const width = popover.offsetWidth
          const height = popover.offsetHeight
          const rect = popover.getBoundingClientRect()
          const left = Math.max(POPOVER_MARGIN, Math.min(rect.left, window.innerWidth - width - POPOVER_MARGIN))
          const top = Math.max(POPOVER_MARGIN, Math.min(rect.top, window.innerHeight - height - POPOVER_MARGIN))
          popover.style.left = `${Math.round(left)}px`
          popover.style.top = `${Math.round(top)}px`
        }

        /** 按拖拽位移算新几何：被拖的那条边跟着指针走，对边不动，并夹在视口内。*/
        function resizePopoverFromPointer(clientX, clientY) {
          const start = popResize
          if (start === null) return
          const dx = clientX - start.x
          const dy = clientY - start.y
          const bounds = popoverSizeBounds()
          let left = start.left
          let top = start.top
          let width = start.width
          let height = start.height
          if (start.edge === 'left' || start.edge === 'topLeft') {
            const right = start.left + start.width
            left = Math.max(POPOVER_MARGIN, Math.min(start.left + dx, right - POPOVER_MIN_WIDTH))
            left = Math.max(left, right - bounds.maxWidth)
            width = right - left
          } else if (start.edge === 'right' || start.edge === 'topRight' || start.edge === 'bottomRight') {
            width = Math.max(POPOVER_MIN_WIDTH, Math.min(start.width + dx, bounds.maxWidth))
            width = Math.min(width, window.innerWidth - POPOVER_MARGIN - start.left)
          }
          if (start.edge === 'top' || start.edge === 'topLeft' || start.edge === 'topRight') {
            const bottom = start.top + start.height
            top = Math.max(POPOVER_MARGIN, Math.min(start.top + dy, bottom - POPOVER_MIN_HEIGHT))
            top = Math.max(top, bottom - bounds.maxHeight)
            height = bottom - top
          } else if (start.edge === 'bottom' || start.edge === 'bottomRight') {
            height = Math.max(POPOVER_MIN_HEIGHT, Math.min(start.height + dy, bounds.maxHeight))
            height = Math.min(height, window.innerHeight - POPOVER_MARGIN - start.top)
          }
          popover.style.width = `${Math.round(Math.max(POPOVER_MIN_WIDTH, width))}px`
          popover.style.height = `${Math.round(Math.max(POPOVER_MIN_HEIGHT, height))}px`
          popover.style.left = `${Math.round(left)}px`
          popover.style.top = `${Math.round(top)}px`
          popoverSized = true
        }

        /**
         * 开始拖某一条边。右下角把手与四条边共用这套起点数据：
         * 先把当前实际尺寸固化成 inline 尺寸，避免从「自动高度」开始拖时基准漂移。
         */
        function beginPopoverResize(edge, event) {
          if (event.button !== 0) return
          if (popover.dataset.open !== '1') return
          const rect = popover.getBoundingClientRect()
          if (rect.width <= 0 || rect.height <= 0) return
          popResize = {
            edge,
            x: event.clientX,
            y: event.clientY,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }
          popover.style.width = `${Math.round(rect.width)}px`
          popover.style.height = `${Math.round(rect.height)}px`
          popover.style.maxHeight = `${Math.max(POPOVER_MIN_HEIGHT, window.innerHeight - POPOVER_MARGIN * 2)}px`
          popoverSized = true
          popover.dataset.dragged = '1'
          popover.classList.add('sa-pop-resizing')
          event.preventDefault()
          event.stopPropagation()
        }

        /** 方向键微调：右下角把手聚焦后可用，Shift 加大步长。*/
        function nudgePopoverSize(deltaWidth, deltaHeight) {
          if (popover.dataset.open !== '1') return
          const rect = popover.getBoundingClientRect()
          if (rect.width <= 0 || rect.height <= 0) return
          const width = Math.max(
            POPOVER_MIN_WIDTH,
            Math.min(rect.width + deltaWidth, window.innerWidth - POPOVER_MARGIN - rect.left),
          )
          const height = Math.max(
            POPOVER_MIN_HEIGHT,
            Math.min(rect.height + deltaHeight, window.innerHeight - POPOVER_MARGIN - rect.top),
          )
          applyPopoverSize(width, height)
          popover.style.maxHeight = `${Math.max(POPOVER_MIN_HEIGHT, window.innerHeight - POPOVER_MARGIN * 2)}px`
          popover.dataset.dragged = '1'
          // 只读面板的拖拽尺寸只在本会话内存里生效，不写编辑面板记住的那一份。
          if (popoverMode !== 'sent') savePopoverSize(width, height)
        }

        /** 边缘与把手：四条边只吃指针，右下角把手额外可键盘聚焦。*/
        function createPopoverResizer(edge, extraClass, label) {
          const handle = document.createElement('div')
          handle.className = extraClass === undefined ? 'sa-pop-resizer' : `sa-pop-resizer ${extraClass}`
          handle.dataset.edge = edge
          if (label === undefined) {
            handle.setAttribute('aria-hidden', 'true')
          } else {
            handle.setAttribute('role', 'separator')
            handle.setAttribute('aria-label', label)
            handle.setAttribute('tabindex', '0')
          }
          handle.addEventListener('pointerdown', (event) => {
            beginPopoverResize(edge, event)
            if (label !== undefined) safe(() => handle.focus({ preventScroll: true }))
            if (typeof handle.setPointerCapture === 'function') safe(() => handle.setPointerCapture(event.pointerId))
          })
          handle.addEventListener('keydown', (event) => {
            const step = event.shiftKey ? 32 : 8
            let dw = 0
            let dh = 0
            if (event.key === 'ArrowRight') dw = step
            else if (event.key === 'ArrowLeft') dw = -step
            else if (event.key === 'ArrowDown') dh = step
            else if (event.key === 'ArrowUp') dh = -step
            else return
            event.preventDefault()
            event.stopPropagation()
            nudgePopoverSize(dw, dh)
          })
          return handle
        }

        const popEdgeHandles = [
          createPopoverResizer('left', 'sa-pop-edge'),
          createPopoverResizer('right', 'sa-pop-edge'),
          createPopoverResizer('top', 'sa-pop-edge'),
          createPopoverResizer('bottom', 'sa-pop-edge'),
        ]
        const popGrip = createPopoverResizer('bottomRight', 'sa-pop-grip', t('pop.resize'))
        popover.append(...popEdgeHandles, popGrip)

        function isExcluded(node) {
          const element = elementOf(node)
          if (element === null) return true
          if (element.closest('[data-sa-ui]') !== null && element.closest('[data-sa-ui="replies"]') === null && element.closest('[data-sa-ui="sent"]') === null) return true
          if (element.closest('[data-composer-card],[data-composer-input],[data-input-scroll]') !== null) return true
          if (element.closest('input,textarea,[contenteditable="true"]') !== null) return true
          return false
        }

        function readSelection() {
          const selection = window.getSelection()
          if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) return null
          const range = selection.getRangeAt(0)
          const quote = range.toString()
          if (quote.trim() === '') return null
          if (isExcluded(range.startContainer) || isExcluded(range.endContainer)) return null
          return { range, quote }
        }

        function hideToolbar() {
          toolbar.dataset.open = '0'
        }

        function closeContextMenu() {
          if (contextMenu.dataset.open !== '1') return
          contextMenu.dataset.open = '0'
          contextMenuSelection = null
        }

        function openContextMenu(selection, x, y) {
          contextMenuSelection = selection
          contextMenu.dataset.open = '1'
          const width = contextMenu.offsetWidth || 132
          const height = contextMenu.offsetHeight || 64
          contextMenu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - width - 8))}px`
          contextMenu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - height - 8))}px`
        }

        /** textarea + execCommand 兜底；返回浏览器是否接受这次拷贝。*/
        function copyWithTextarea(text) {
          return safe(() => {
            const area = document.createElement('textarea')
            area.value = text
            area.style.position = 'fixed'
            area.style.opacity = '0'
            document.body.appendChild(area)
            try {
              area.select()
              return document.execCommand('copy') === true
            } finally {
              area.remove()
            }
          }) === true
        }

        function copyPlainText(text) {
          if (typeof text !== 'string' || text === '') return
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(text).catch(() => {})
              return
            }
          } catch {
            /* 剪贴板接口不可用时走下面的兜底*/
          }
          copyWithTextarea(text)
        }

        /**
         * 拷贝批注要等真实结果：异步接口写入成功才算成功，被拒或接口缺失时走同一个 textarea 兜底。
         * 与 copyPlainText 分开，工具条 / 右键菜单「复制选中文字」原有的行为不受影响。
         */
        async function writeClipboardText(text) {
          if (typeof text !== 'string' || text === '') return false
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(text)
              return true
            }
          } catch {
            /* 剪贴板接口不可用或被拒时走下面的兜底*/
          }
          return copyWithTextarea(text)
        }

        /** 只在正文里已选中文字时接管右键；其余位置保持系统原样。*/
        function onContextMenu(event) {
          const target = elementOf(event.target)
          if (target !== null && target.closest('[data-sa-ui]') !== null && target.closest('[data-sa-ui="replies"]') === null && target.closest('[data-sa-ui="sent"]') === null) return
          const selection = readSelection()
          if (selection === null) return
          event.preventDefault()
          event.stopPropagation()
          pendingSelection = selection
          hideToolbar()
          closeContextMenu()
          openContextMenu(selection, event.clientX, event.clientY)
        }

        function placeAt(element, rect, gap) {
          const width = element.offsetWidth || 80
          const height = element.offsetHeight || 32
          const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8))
          const above = rect.top - height - gap
          const top = above < 8 ? Math.min(rect.bottom + gap, window.innerHeight - height - 8) : above
          element.style.left = `${left}px`
          element.style.top = `${Math.max(8, top)}px`
        }

        /** 浮层横向锚点：有指针就用指针，没有就用选区中心；两边浮层共用这一条。*/
        function anchoredLeft(point, rect, width) {
          const anchorX = point !== null && point !== undefined ? point.x : rect.left + rect.width / 2
          return Math.max(8, Math.min(anchorX - width / 2, window.innerWidth - width - 8))
        }

        /** 批注弹层：横向跟随鼠标/选区落点；编辑区在弹层下半部，所以优先放到选区上方。*/
        /** 把一条批注的多行高亮合成一个整体矩形，弹层按整段避让，而不是只避开第一行。 */
        function unionRects(rects) {
          if (rects.length === 0) return null
          let top = rects[0].top
          let left = rects[0].left
          let bottom = rects[0].bottom
          let right = rects[0].right
          for (const rect of rects) {
            if (rect.top < top) top = rect.top
            if (rect.left < left) left = rect.left
            if (rect.bottom > bottom) bottom = rect.bottom
            if (rect.right > right) right = rect.right
          }
          return { top, left, bottom, right, width: right - left, height: bottom - top }
        }

        function placePopover(rect) {
          if (rect === undefined || rect === null) return
          popoverRect = rect
          // 只读面板保留 70% 视口的高度上限，量自然高度时就不会越过它；其余模式先清掉上一轮的临时上限。
          popover.style.maxHeight = popoverMode === 'sent' ? `${sentPopoverHeightLimit()}px` : ''
          const width = popover.offsetWidth || 340
          const height = popover.offsetHeight || 240
          // 悬停跟鼠标；手动打开（总览编辑、角标编辑）跟被点的元素，
          // 不能再沿用上一次划线的落点，否则弹层会被推到屏幕左边的旧位置。
          const point =
            popoverSource === 'hover'
              ? lastPointerMove
              : popoverSource === 'manual'
                ? null
                : (selectionPointer ?? lastPointerMove)
          let left = anchoredLeft(point, rect, width)
          let top = 0
          const margin = 8
          const gap = 10
          const spaceAbove = rect.top - gap - margin
          const spaceBelow = window.innerHeight - rect.bottom - gap - margin
          // 上方放得下就放上方；否则下方；无论哪种，高度都夹进可用空间，超出时在面板内滚动。
          const preferAbove = spaceAbove >= Math.min(height, spaceBelow)
          const available = Math.max(160, preferAbove ? spaceAbove : spaceBelow)
          // 用户定过尺寸就按他定的来，只保证整块留在视口内；没定过才把高度夹进锚点周围的空间。
          const sizeCap = Math.max(160, window.innerHeight - margin * 2)
          const heightLimit =
            popoverMode === 'sent' ? Math.min(sizeCap, sentPopoverHeightLimit()) : sizeCap
          popover.style.maxHeight = popoverSized
            ? `${Math.floor(heightLimit)}px`
            : `${Math.floor(Math.min(available, heightLimit))}px`
          const effectiveHeight = popoverSized ? Math.min(height, sizeCap) : Math.min(height, available)
          top = preferAbove ? rect.top - effectiveHeight - gap : rect.bottom + gap
          // 从总览里点开时，弹层不能压住总览：先找左右视野的空位，
          // 只有左右都放不下时才退回到条目的上方/下方。
          const surface =
            popoverSource === 'manual'
              ? (document.querySelector('[data-sa-ui="panel"]')
                ?? document.querySelector('[data-sa-ui="side"]'))
              : null
          const surfaceRect = surface === null ? null : safe(() => surface.getBoundingClientRect())
          if (surfaceRect !== undefined && surfaceRect !== null && surfaceRect.width > 0) {
            if (surface.getAttribute('data-sa-ui') === 'side') {
              // 侧栏在窗口最右边：优先放到整块侧栏的左侧（对话区），左边不够再试右侧。
              const leftOfSide = surfaceRect.left - width - gap
              left =
                leftOfSide >= margin
                  ? leftOfSide
                  : Math.min(window.innerWidth - width - margin, surfaceRect.right + gap)
            } else {
              // 悬浮总览：先放面板右侧；右边放不下再放左侧。
              const rightOfPanel = surfaceRect.right + gap
              left =
                rightOfPanel + width <= window.innerWidth - margin
                  ? rightOfPanel
                  : Math.max(margin, surfaceRect.left - width - gap)
            }
            const maxHeight = window.innerHeight - margin * 2
            const shownHeight = Math.min(height, maxHeight)
            top = Math.max(margin, Math.min(rect.top, window.innerHeight - shownHeight - margin))
            const heightLimit =
              popoverMode === 'sent' ? Math.min(maxHeight, sentPopoverHeightLimit()) : maxHeight
            popover.style.maxHeight = `${Math.floor(heightLimit)}px`
          }
          popover.style.left = `${Math.max(margin, Math.min(left, Math.max(margin, window.innerWidth - width - margin)))}px`
          // 用户定过尺寸时高度是固定的，可能被推到视口外：往上/往下夹回来。
          const boundedTop = popoverSized
            ? Math.max(margin, Math.min(top, Math.max(margin, window.innerHeight - effectiveHeight - margin)))
            : Math.max(margin, top)
          popover.style.top = `${boundedTop}px`
        }

        /** 工具条：横向跟随划线结束的位置，纵向仍贴着选区下沿，避免盖住刚划的那行字。*/
        function placeToolbar(element, rect, point) {
          const width = element.offsetWidth || 80
          const height = element.offsetHeight || 32
          const left = anchoredLeft(point, rect, width)
          const top = Math.min(rect.bottom + 8, window.innerHeight - height - 8)
          element.style.left = `${left}px`
          element.style.top = `${Math.max(8, top)}px`
        }

        /** 按当前选区把工具条摆出来；松手时会直接调它，不再等去抖计时。*/
        function showSelectionToolbar() {
          const selection = readSelection()
          if (selection === null) {
            hideToolbar()
            return
          }
          const rect = safe(() => selection.range.getBoundingClientRect())
          if (rect === undefined || (rect.width === 0 && rect.height === 0)) {
            hideToolbar()
            return
          }
          pendingSelection = selection
          toolbar.dataset.open = '1'
          const fresh = lastPointerUp !== null && Date.now() - lastPointerUp.at < 1500
          selectionPointer = fresh ? lastPointerUp : null
          placeToolbar(toolbar, rect, fresh ? lastPointerUp : null)
        }

        function onSelectionChange() {
          // 选区收了就把刚才被挡住的重绘补上（拖选期间 pointerSelecting 还为真，这里不会放行）。
          flushPendingRepaint()
          window.clearTimeout(settleTimer)
          settleTimer = window.setTimeout(() => {
            settleTimer = null
            if (pointerSelecting) {
              hideToolbar()
              return
            }
            showSelectionToolbar()
            flushPendingRepaint()
          }, SETTLE_MS)
        }

        /** 弹层两种用途：新建（来自当前选区）与修改（某一条既有批注）。*/
        let popoverMode = 'create'
        let popoverAnchor = null
        let popoverTargetId = null
        /** 打开编辑弹层那一刻的条目内容；「取消」用它把自动存写的改动回滚掉。*/
        let popoverSnapshot = null
        /** 当前弹层对应的条目：编辑态才有，「跳到出处」据此拿锚点。*/
        let popoverItem = null
        /** 只读面板对应的已发送批次轮次：条目自己的 source 不一定带 turn，导航时要用台账记下的轮次。*/
        let popoverTurn = null
        /** 只读面板对应的台账记录：备注行的「查看出处」要按它找卡片与锚点。*/
        let popoverRecord = null
        /** 编辑中自动存写的去抖计时器：停手一小段再落盘，崩溃时最多丢这一段。*/
        let popAutoSaveTimer = null

        /** 编辑与新建都自动存写：新建在第一次有内容前还不是一条批注。*/
        function schedulePopAutoSave() {
          if (popoverMode !== 'edit' && popoverMode !== 'create') return
          if (popover.dataset.open !== '1') return
          if (popAutoSaveTimer !== null) window.clearTimeout(popAutoSaveTimer)
          popAutoSaveTimer = window.setTimeout(() => {
            popAutoSaveTimer = null
            autoSavePopover()
          }, POP_AUTO_SAVE_MS)
        }

        /** 新建态第一次有内容：把选区里的引文与来源一起落成条目，之后都写同一条。*/
        function createAnnotationFromPopover() {
          const anchor = popoverAnchor
          if (anchor === null) return
          const created = addAnnotation({
            quote: anchor.quote,
            note: noteValue(),
            images: popInputImages,
            source: anchor.source,
            liveRange: anchor.range,
          })
          if (created === undefined) return
          popoverTargetId = created.id
          popoverItem = created
          // 条目已经建出来：后续保存与取消都按「这一条」处理，不再重复创建。
          popoverAnchor = null
          popDelete.style.display = ''
          popTitle.textContent = t('pop.editTitle', { n: created.number })
          if (anchor.quote !== '') popJump.style.display = ''
          popJump.dataset.disabled = created.source?.kind === 'file' ? '1' : '0'
          // 位置精修失败只记日志，不影响这条批注（与保存路径一致）。
          refineSourcePosition(created.id, anchor.source, anchor.quote).catch((err) => {
            warn('[selection-annotations] 位置精修失败（不影响这条批注）：', err)
          })
        }

        /**
         * 把弹层当前内容写进条目，让本地草稿与宿主都跟上。
         *
         * 新建态：空输入什么都不做；第一次有文字或图片才创建条目，之后继续写同一条。
         * 编辑态：清空文字只是存成空字符串，**不删条目**；删除只有显式点删除与网页来源空正文两条路径。
         *
         * 稳定性：这里只调 addAnnotation/updateAnnotation（emit + 排同步 + 写草稿），不排重绘。
         * emit 的通知只重渲染盘点面板与高亮，弹层是挂在 body 上的常驻节点、不参与重建，
         * 所以去抖保存期间输入框不会失焦、光标不会回到开头，弹层也不会移动。
         */
        function autoSavePopover() {
          if (popover.dataset.open !== '1') return
          const note = noteValue()
          const images = popInputImages
          if (popoverMode === 'create' && popoverTargetId === null) {
            if (note.trim() === '' && images.length === 0) return
            createAnnotationFromPopover()
            return
          }
          if (popoverTargetId === null) return
          const target = popoverTargetId
          const item = annotations.find((candidate) => candidate.id === target)
          if (item === undefined) return
          // 按 updateAnnotation 的归一化结果比较：内容没变就不重复 emit、不重复写盘。
          const nextNote = note.trim().slice(0, MAX_NOTE)
          if (item.note === nextNote && JSON.stringify(item.images ?? []) === JSON.stringify(images)) return
          updateAnnotation(target, note, images)
        }

        /** 丢掉等在去抖窗口里的自动存写（取消、切会话前由调用方决定先 flush 还是丢弃）。*/
        function cancelPopAutoSave() {
          if (popAutoSaveTimer === null) return
          window.clearTimeout(popAutoSaveTimer)
          popAutoSaveTimer = null
        }

        /** 关闭前补一次：最后几百毫秒的键入也算「保存」这一侧，不能随计时器一起丢。*/
        function flushPopAutoSave() {
          if (popAutoSaveTimer === null) return
          window.clearTimeout(popAutoSaveTimer)
          popAutoSaveTimer = null
          autoSavePopover()
        }

        /** 把当前图片列表画出来：缩略图 + 删除按钮，空列表时只留一行提示。 */
        function renderPopImages() {
          popImages.textContent = ''
          for (const image of popInputImages) {
            const box = document.createElement('div')
            box.className = 'sa-pop-image'
            const src =
              typeof image.url === 'string' && image.url !== ''
                ? image.url
                : typeof image.preview === 'string' && image.preview !== ''
                  ? image.preview
                  : typeof image.thumb === 'string' && image.thumb !== ''
                    ? image.thumb
                    : typeof image.dataUrl === 'string' && image.dataUrl !== ''
                      ? image.dataUrl
                      : ''
            if (src !== '') {
              const thumb = document.createElement('img')
              thumb.className = 'sa-pop-thumb'
              thumb.src = src
              thumb.alt = image.name
              thumb.title = t('image.open')
              thumb.style.cursor = 'zoom-in'
              thumb.addEventListener('click', (event) => {
                event.preventDefault()
                event.stopPropagation()
                openImageViewer(src, image.name)
              })
              box.appendChild(thumb)
            } else {
              const fallback = document.createElement('span')
              fallback.className = 'sa-pop-thumb-fallback'
              fallback.textContent = image.name
              box.appendChild(fallback)
            }
            const remove = document.createElement('button')
            remove.type = 'button'
            remove.className = 'sa-pop-image-remove'
            remove.title = t('image.remove')
            remove.textContent = '×'
            remove.addEventListener('click', (event) => {
              event.preventDefault()
              event.stopPropagation()
              removePopImage(image.id)
            })
            box.appendChild(remove)
            popImages.appendChild(box)
          }
          popImages.appendChild(popImagesHint)
          // 图片区也能改（删除/粘贴/拖入）：同样按去抖把最新图片列表写进条目。
          schedulePopAutoSave()
        }

        function removePopImage(id) {
          popInputImages = popInputImages.filter((image) => image.id !== id)
          renderPopImages()
        }

        /** 接收一批浏览器文件：压缩、取 data URL、限制条数与体积。 */
        async function addPopImages(files) {
          const picked = []
          for (const file of files) {
            if (file === null || typeof file !== 'object') continue
            if (typeof file.type !== 'string' || !file.type.startsWith('image/')) continue
            if (popInputImages.length + picked.length >= MAX_IMAGES_PER_ANNOTATION) continue
            if (Number(file.size) > MAX_IMAGE_BYTES) continue
            picked.push(file)
          }
          const rejected = files.length > 0 ? files.length - picked.length : 0
          for (const file of picked) {
            const processed = await compressImage(file, imageSettingsOf())
            const dataUrl = await fileToDataUrl(processed)
            const url = safe(() => URL.createObjectURL(processed))
            // 台账里留缩略图给清单，另留发送出去的那张图本身：点开看的是原尺寸，不再二次缩。
            const thumb = await downscaleDataUrl(processed, 480, 0.65)
            popInputImages.push({
              id: `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
              file: processed,
              name: typeof processed.name === 'string' && processed.name !== '' ? processed.name : t('image.alt'),
              url: typeof url === 'string' ? url : undefined,
              dataUrl,
              thumb,
              bytes: Number(processed.size) || 0,
            })
            renderPopImages()
          }
          if (rejected > 0) log(`[selection-annotations] 已忽略 ${rejected} 张图片（每图最多 ${MAX_IMAGES_PER_ANNOTATION} 张、单张不超过 ${MAX_IMAGE_BYTES} 字节）`)
          return picked.length
        }

        /** 换一条批注编辑时重置图片列表；对象 URL 交给浏览器回收，不主动 revoke 免伤已保存的引用。 */
        function resetPopImages(images) {
          popInputImages = Array.isArray(images) ? images.slice() : []
          renderPopImages()
        }

        /** 每次打开弹层都清掉上一次按内容量出来的最小高度。*/
        function resetPopInputHeight() {
          popInput.style.minHeight = ''
        }

        /**
         * 按内容给输入框定最小高度：先临时拿掉 flex 与 min-height 量自然高度，再写回 min-height。
         * 面板多出来的高度由输入框按 flex 吃掉；内容超出时滚的是正文区，输入框自己不出滚动条。
         */
        function syncPopInputHeight() {
          const keepTop = popBody.scrollTop
          const previousFlex = popInput.style.flex
          const previousHeight = popInput.style.height
          const previousMin = popInput.style.minHeight
          popInput.style.flex = '0 0 auto'
          popInput.style.height = 'auto'
          popInput.style.minHeight = '0'
          const measured = Number(popInput.scrollHeight)
          popInput.style.flex = previousFlex
          popInput.style.height = previousHeight
          popInput.style.minHeight = previousMin
          if (!Number.isFinite(measured) || measured <= 0) return
          popInput.style.minHeight = `${Math.max(62, Math.round(measured))}px`
          popBody.scrollTop = keepTop
        }

        /** 键入后让插入点留在可视区：滚的是正文区，输入框自己通常不再滚。*/
        function ensureCaretVisible() {
          const selection = window.getSelection()
          if (selection === null || selection.rangeCount === 0) return
          const range = selection.getRangeAt(0).cloneRange()
          const rect = range.getBoundingClientRect()
          const box = popBody.getBoundingClientRect()
          if (rect.bottom > box.bottom - 4) {
            popBody.scrollTop += rect.bottom - box.bottom + 12
          } else if (rect.top < box.top + 4) {
            popBody.scrollTop -= box.top - rect.top + 12
          }
        }

        /** 采纳与否决是两条独立标记：备注可以同时含两句，颜色由这两个布尔推导。 */
        function syncNoteTone() {
          const flags = noteFlags(noteValue(), adoptTextOf(), rejectTextOf())
          popInput.dataset.adopt = flags.adopt ? '1' : '0'
          popInput.dataset.reject = flags.reject ? '1' : '0'
        }

        function showPopover(options) {
          popTitle.textContent = options.title
          // 引文框自己会滚（max-height 120px + overflow auto），不再截断原文。
          popQuote.textContent = options.quote
          popQuote.style.display = options.quote === '' ? 'none' : ''
          popQuoteHead.style.display = options.quote === '' ? 'none' : ''
          resetPopoverJumpHints()
          // 跳转对编辑与只读都有意义：新建时引文还在选区里，没有可回访的条目。
          const canJump = options.mode === 'sent' || (options.mode === 'edit' && options.quote !== '')
          popJump.style.display = canJump ? '' : 'none'
          popJump.dataset.disabled = options.item?.source?.kind === 'file' ? '1' : '0'
          popSource.textContent = options.sourceText
          // 只读与编辑共用同一套底座：只把备注输入框换成只读文本，操作行整行收起。
          const readonly = options.mode === 'sent'
          popoverMode = options.mode
          if (readonly) {
            const noteText =
              typeof options.note === 'string' && options.note !== '' ? options.note : t('pop.noNote')
            paintNote(popReadNote, noteText, noteViewOf(options.note))
          }
          popReadNote.style.display = readonly ? '' : 'none'
          popSource.style.display = ''
          popDivider.style.display = ''
          popNoteLabel.style.display = ''
          // 只读态在「批注」行右侧补一个「查看出处」，与「引用原文」行上下对称。
          popNoteJump.style.display = readonly && canJump ? '' : 'none'
          popNoteJump.dataset.disabled = popJump.dataset.disabled
          popInput.style.display = readonly ? 'none' : ''
          popImages.style.display = ''
          popActions.style.display = readonly ? 'none' : ''
          setNoteContent(readonly ? '' : options.note)
          updateSuggestion()
          // 图片区照常渲染；只读态只藏掉每张图上的移除按钮，不允许删改。
          popImages.dataset.readonly = readonly ? '1' : '0'
          popImagesHint.style.display = readonly ? 'none' : ''
          resetPopImages(Array.isArray(options.images) ? options.images : [])
          // 只读态没有可粘贴的入口：没有图片时整块收起，免得留一段空白。
          if (readonly && popInputImages.length === 0) popImages.style.display = 'none'
          popoverTargetId = options.targetId ?? null
          popoverItem = options.item ?? null
          // 只读面板的轮次取自台账：collectSentHighlightItems 已把 record.turn 抄到条目上。
          popoverTurn =
            options.mode === 'sent'
              ? Number.isFinite(options.item?.turn)
                ? options.item.turn
                : Number.isFinite(options.item?.source?.turn)
                  ? options.item.source.turn
                  : null
              : null
          // 备注行的「查看出处」要回到这条批注的答复卡：批次锚点与轮次都从台账里捞出来备用。
          popoverRecord = options.mode === 'sent' && popoverItem !== null ? sentRecordOf(popoverItem) : null
          // 编辑态先留一份快照：之后每敲一下都即时写进条目，只有「取消」才回到这一份。
          popoverSnapshot =
            options.mode === 'edit' && popoverTargetId !== null
              ? {
                  id: popoverTargetId,
                  note: typeof options.note === 'string' ? options.note : '',
                  images: Array.isArray(options.images) ? options.images.slice() : [],
                }
              : null
          popDelete.style.display = options.mode === 'edit' ? '' : 'none'
          // 两种模式共用尺寸把手；只读面板拖出来的尺寸只留在内存里，不写编辑面板的偏好。
          for (const handle of popEdgeHandles) handle.style.display = ''
          popGrip.style.display = ''
          hideToolbar()
          resetPopInputHeight()
          popoverTouched = false
          popoverHovered = false
          popoverSource = options.source === 'hover' ? 'hover' : 'manual'
          cancelHoverOpen()
          cancelHoverClose()
          // 每次打开都从「自动贴靠」开始；用户手动拖过之后，滚动与窗口变化不再把它挪回去。
          delete popover.dataset.dragged
          popover.dataset.open = '1'
          // 只读面板按内容自动定尺寸；编辑/新建仍沿用会话里记住的尺寸。
          if (readonly) sizeSentPopover()
          else restorePopoverSize()
          popBody.scrollTop = 0
          if (options.rect !== undefined && options.rect !== null) placePopover(options.rect)
          if (!readonly) syncPopInputHeight()
          const focusEditor = () => {
            if (readonly) return
            if (popover.dataset.open !== '1') return
            safe(() => popInput.focus({ preventScroll: true }))
            safe(() => caretToEnd())
          }
          // 悬停预览不抢焦点：鼠标只是经过划线区域，用户还在原处阅读或选择；
          // 手动打开（点角标、改备注、新建批注）才把光标送进编辑器。
          if (popoverSource !== 'hover') {
            focusEditor()
            safe(() => window.requestAnimationFrame(focusEditor))
            safe(() => window.setTimeout(focusEditor, 60))
            safe(() => window.setTimeout(focusEditor, 180))
          }
        }

        function openCreatePopover(options = {}) {
          const selection = pendingSelection
          if (selection === null) return
          popoverAnchor = { range: selection.range, quote: selection.quote, source: captureSource(selection.range) }
          showPopover({
            title: t('pop.createTitle'),
            quote: selection.quote,
            sourceText: describeSource(popoverAnchor.source),
            note: options.adopt === true ? adoptTextOf() : typeof options.note === 'string' ? options.note : '',
            images: [],
            rect: safe(() => selection.range.getBoundingClientRect()),
            mode: 'create',
            targetId: null,
          })
        }

        /** 弹层定位用的矩形：优先量给定元素；量不到或量到 0×0 时退回总览面板，再退回窗口中心。*/
        function popoverAnchorRect(anchor) {
          const measured = safe(() => anchor?.getBoundingClientRect())
          // 总览重绘后原节点可能已被替换，量到 0×0：退回面板本身的位置，别让弹层飘到左上角。
          const panelRect =
            measured === undefined || measured === null || (measured.width === 0 && measured.height === 0)
              ? safe(() => document.querySelector('[data-sa-ui="panel"]')?.getBoundingClientRect())
              : measured
          return (
            (panelRect !== undefined && panelRect !== null ? panelRect : null) ?? {
              left: window.innerWidth / 2 - 40,
              top: window.innerHeight / 2,
              width: 80,
              height: 0,
              right: window.innerWidth / 2 + 40,
              bottom: window.innerHeight / 2,
            }
          )
        }

        /**
         * 修改一条既有批注。
         * 这是编号角标点击后的默认行为 ——点它是要改这一条，不是打开列表。
         * @param id - 目标批注 id。
         * @param anchor - 用来定位弹层的元素（角标或列表里的「编辑」按钮）。
         */
        function openEditPopover(id, anchor, source = 'manual') {
          const item = annotations.find((candidate) => candidate.id === id)
          if (item === undefined) return
          popoverAnchor = null
          showPopover({
            title: t('pop.editTitle', { n: item.number }),
            quote: item.quote,
            sourceText: describeSource(item.source),
            note: item.note,
            images: Array.isArray(item.images) ? item.images : [],
            rect: popoverAnchorRect(anchor),
            mode: 'edit',
            targetId: id,
            source,
            item,
          })
        }

        /**
         * 已发送批注的只读弹层：与编辑弹层同一套底座（标题、来源、引用、备注、图片），
         * 只把备注输入框换成只读正文，并去掉保存与删除按钮。
         * @param item - collectSentHighlightItems 产出的绘制副本（带 sentHighlight 与 id）。
         * @param anchor - 定位元素或矩形提供者。
         * @param source - 'hover' 表示悬停预览，其它值表示手动打开。
         */
        function openSentPopover(item, anchor, source = 'manual') {
          if (item === null || item === undefined || item.sentHighlight !== true) return
          popoverAnchor = null
          showPopover({
            title: t('pop.sentTitle'),
            quote: typeof item.quote === 'string' ? item.quote : '',
            sourceText: describeSource(item.source),
            note: typeof item.note === 'string' ? item.note : '',
            images: sentImagesOf(item),
            rect: popoverAnchorRect(anchor),
            mode: 'sent',
            // 悬停命中用它判断「指针还停在这条上」，避免同一条划线上反复收起重开。
            targetId: item.id,
            source,
            item,
          })
        }

        /** 只读面板的图片：优先用台账里的原图，老记录只有缩略图时退回缩略图。*/
        function sentImagesOf(item) {
          if (Array.isArray(item.images) && item.images.length > 0) return item.images
          const thumbs = Array.isArray(item.thumbs) ? item.thumbs : []
          return thumbs.map((thumb, index) => ({
            id: `img-sent-${item.id ?? index}-${index}`,
            name: typeof thumb?.name === 'string' ? thumb.name : '',
            dataUrl: thumb?.dataUrl ?? thumb?.preview ?? thumb?.thumb ?? '',
          }))
        }

        function closePopover(options = {}) {
          // 关闭（关闭按钮、Esc、点遮罩、切目标、卸载）都算「保存」这一侧：把还在去抖窗口里的
          // 最后一段键入补写进条目。只有「取消」传 autoSave:false —— 它会先把内容回滚成快照。
          if (options.autoSave === false) cancelPopAutoSave()
          else flushPopAutoSave()
          popover.dataset.open = '0'
          // 关掉时顺手结束可能还挂着的尺寸拖拽，避免下一次打开带着旧的起始几何。
          popResize = null
          popover.classList.remove('sa-pop-resizing')
          // 悬停预览收起后不能留下「刚才瞄的就是这条」的记忆：指针再回到同一条划线上时，
          // onHoverMove 会因为 hoverTargetId 相同直接返回，这条就再也弹不出来了。
          if (popoverSource === 'hover') cancelHoverOpen()
          lowerPopover()
          // 页面刷新、关闭或插件卸载前再存一次：只靠状态变更时保存会丢掉最后几秒的编辑。
          safe(() => popInput.blur())
          // 网页来源的批注在拾取时就先落了条目；取消时正文仍为空，就把它当作没创建过。
          // 明确保存（Ctrl+Enter、保存按钮）时不能走这条清理：保存顺序是先关弹层再写内容，
          // 这里删掉会让刚写下的批注一起消失。
          if (options.discardWebEmpty !== false && popoverMode === 'edit' && popoverTargetId !== null) {
            const item = annotations.find((candidate) => candidate.id === popoverTargetId)
            if (
              item !== undefined &&
              item.source !== null &&
              item.source !== undefined &&
              item.source.kind === 'web' &&
              String(item.note ?? '').trim() === ''
            ) {
              removeAnnotation(popoverTargetId)
            }
          }
          popoverAnchor = null
          popoverTargetId = null
          popoverSnapshot = null
          popoverItem = null
          popoverTurn = null
          popoverRecord = null
          clearReplyFlash()
          popoverMode = 'create'
          hideSuggestion()
        }

        /** 跳转失败提示的计时器与浮条：同一行只留一条提示，不同行各自计时。*/
        const jumpHintTimers = new WeakMap()
        let jumpToast = null
        let jumpToastTimer = 0

        /**
         * 触发按钮所在行的提示节点：有就复用，没有就插在标签与按钮之间。
         * 找不到父元素时退回「引用原文」行那个单例，保证提示总有地方落。
         */
        function jumpHintFor(button) {
          const parent = button?.parentElement ?? null
          if (parent === null) return popJumpHint
          const existing = safe(() => parent.querySelector(':scope > .sa-pop-jump-hint')) ?? null
          if (existing !== null) return existing
          const hint = document.createElement('span')
          hint.className = 'sa-pop-jump-hint'
          hint.dataset.on = '0'
          parent.insertBefore(hint, button)
          return hint
        }

        function flashPopoverJumpHint(message, button) {
          const hint = jumpHintFor(button)
          hint.textContent = message
          hint.dataset.on = '1'
          const timer = jumpHintTimers.get(hint)
          if (timer !== undefined) window.clearTimeout(timer)
          jumpHintTimers.set(
            hint,
            window.setTimeout(() => {
              jumpHintTimers.delete(hint)
              hint.dataset.on = '0'
              hint.textContent = ''
            }, 2400),
          )
        }

        /** 打开弹层时清掉上一次残留的提示（只清位置，不重建节点）。*/
        function resetPopoverJumpHints() {
          const hints = safe(() => [...popover.querySelectorAll('.sa-pop-jump-hint')]) ?? []
          for (const hint of hints) {
            const timer = jumpHintTimers.get(hint)
            if (timer !== undefined) window.clearTimeout(timer)
            jumpHintTimers.delete(hint)
            hint.textContent = ''
            hint.dataset.on = '0'
          }
        }

        function flashJumpToast(message) {
          if (jumpToast !== null) jumpToast.remove()
          if (jumpToastTimer !== 0) window.clearTimeout(jumpToastTimer)
          const toast = document.createElement('div')
          toast.className = 'sa-toast'
          toast.setAttribute('role', 'status')
          toast.textContent = message
          document.body.appendChild(toast)
          jumpToast = toast
          jumpToastTimer = window.setTimeout(() => {
            jumpToastTimer = 0
            if (jumpToast === toast) jumpToast = null
            toast.remove()
          }, 2200)
        }

        function jumpFailure(message, root) {
          const host = root === undefined || root === null
            ? null
            : (safe(() => root.closest('[data-sa-ui]')) ?? null)
          if (host !== null && host.getAttribute('data-sa-ui') === 'popover') {
            flashPopoverJumpHint(message, root)
            return
          }
          if (host !== null && (host.getAttribute('data-sa-ui') === 'panel' || host.getAttribute('data-sa-ui') === 'side')) {
            flashPanelHint(message, host)
            return
          }
          flashJumpToast(message)
        }

        /** 把目标行滚到会话区中间；用 scrollTrace 记一笔，重绘保护不会把它当用户滚动。*/
        function scrollRowToCenter(row) {
          const box = safe(() => row.getBoundingClientRect()) ?? null
          if (box === null) return
          const containers = scrollAncestorsOf(row)
          const container = containers.length > 0 ? containers[0] : null
          if (container === null) {
            safe(() => row.scrollIntoView({ block: 'center', behavior: 'smooth' }))
            jumpScrollUntil = performance.now() + JUMP_SCROLL_GRACE_MS
            return
          }
          const frame = safe(() => container.getBoundingClientRect()) ?? null
          if (frame === null) return
          const top = container.scrollTop + (box.top - frame.top) - (container.clientHeight - box.height) / 2
          scrollTrace.watch(container)
          scrollTrace.markWrite(container, 'jump-quote', top)
          safe(() => container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }))
          jumpScrollUntil = performance.now() + JUMP_SCROLL_GRACE_MS
        }

        /**
         * 官方轮次导航里对应轮次的按钮。按钮是虚拟化的，只能遍历当前在 DOM 里的
         * `button[data-index]`，用 aria-label 里的独立数字匹配；data-index 是列表下标，不能用。
         */
        function findTurnNavButton(turn) {
          const digit = new RegExp(`(^|[^0-9])${turn}([^0-9]|$)`)
          for (const rail of document.querySelectorAll('nav[aria-label]')) {
            const marks = rail.querySelectorAll('button[data-index]')
            if (marks.length < 2) continue
            for (const mark of marks) {
              const label = mark.getAttribute('aria-label') ?? ''
              if (!/轮|turn|ターン|tour|turno/i.test(label)) continue
              if (digit.test(label)) return mark
            }
          }
          return null
        }

        /** 一轮在 DOM 里可能由分组外壳与多个 flow 项共同带 data-chat-turn，全部收进来。*/
        function turnHolders(turn) {
          if (!Number.isFinite(turn)) return []
          return safe(() => [...document.querySelectorAll(`[data-chat-turn="${turn}"]`)]) ?? []
        }

        function rowOwnAnchorKey(element) {
          if (element === null || element === undefined) return null
          const own = safe(() => element.getAttribute('data-chat-anchor-key')) ?? null
          if (typeof own === 'string' && own !== '') return own
          const flow = safe(() => element.getAttribute('data-chat-flow-key')) ?? null
          return typeof flow === 'string' && flow !== '' ? flow : null
        }

        /** 在给定范围里按锚点键找行；范围自身就是行时也算命中。*/
        function rowByAnchor(scope, source) {
          const key = typeof source?.anchorKey === 'string' ? source.anchorKey : ''
          if (key === '' || scope === null || scope === undefined) return null
          if (rowOwnAnchorKey(scope) === key) return scope
          const direct = safe(() => scope.querySelector(`[data-chat-anchor-key="${cssEscape(key)}"]`)) ?? null
          if (direct !== null) return direct
          return safe(() => scope.querySelector(`[data-chat-flow-key="${cssEscape(key)}"]`)) ?? null
        }

        /** 指纹：选中文字前后各 40 个非空白字符；草稿存在 source 上，台账条目存在条目前两层字段上。*/
        function fingerprintOf(item) {
          const source = item?.source
          const before =
            typeof item?.contextBefore === 'string'
              ? item.contextBefore
              : typeof source?.contextBefore === 'string'
                ? source.contextBefore
                : ''
          const after =
            typeof item?.contextAfter === 'string'
              ? item.contextAfter
              : typeof source?.contextAfter === 'string'
                ? source.contextAfter
                : ''
          const quote = flatText(item?.quote)
          if (quote === '' || (before === '' && after === '')) return null
          return { quote, before, after }
        }

        /** 在范围内的已加载行里按「引文 + 前后文」找行；范围可以是一轮，也可以是 document。*/
        function rowByFingerprint(scope, fingerprint) {
          if (scope === null || scope === undefined || fingerprint === null) return null
          const rows = safe(() => document.querySelectorAll('[data-chat-anchor-key]')) ?? []
          for (const row of rows) {
            if (scope !== document && row !== scope && scope.contains(row) !== true) continue
            const text = flatText(row.textContent)
            if (text === '') continue
            let at = text.indexOf(fingerprint.quote)
            while (at !== -1) {
              const head = text.slice(Math.max(0, at - fingerprint.before.length), at)
              const tailAt = at + fingerprint.quote.length
              const tail = text.slice(tailAt, tailAt + fingerprint.after.length)
              const headOk = fingerprint.before === '' || head === fingerprint.before
              const tailOk = fingerprint.after === '' || tail === fingerprint.after
              if (headOk && tailOk) return row
              at = text.indexOf(fingerprint.quote, at + 1)
            }
          }
          return null
        }

        /**
         * 「查看出处」的查找顺序：轮次内锚点 → 轮次内指纹 → 全页锚点 → 全页指纹。
         * 轮次是宿主自己的 data-chat-turn；行被卸载时返回 null，由调用方去点轮次导航。
         */
        function findSourceRow(source, item, turn) {
          const holders = turnHolders(turn)
          for (const holder of holders) {
            const row = rowByAnchor(holder, source)
            if (row !== null) return row
          }
          const fingerprint = fingerprintOf(item)
          if (fingerprint !== null) {
            for (const holder of holders) {
              const row = rowByFingerprint(holder, fingerprint)
              if (row !== null) return row
            }
          }
          const anchored = safe(() => anchorRoot(source)) ?? null
          if (anchored !== null) return anchored
          if (fingerprint !== null) return rowByFingerprint(document, fingerprint)
          return null
        }

        /** 用目标行与引文算一个 Range，闪烁就闪这一段；算不出来就让 collectHighlightOf 自己定位。*/
        function locateRangeInRow(item, row) {
          if (item === undefined || item === null || row === null || row === undefined) return null
          const source = item.source
          if (source === undefined || source === null) return null
          // 分段命中时只按段画框：返回 null 让 flashQuote 不把整段 Range 当成闪烁目标，
          // 闪烁控制流仍按 item.id 加类，由 collectHighlightOf 的分段矩形呈现。
          if (locateSegmentsOf(item) !== null) return null
          return safe(() => matchInRoot(row, item.quote, savedOffsetOf(source))) ?? null
        }

        const FLASH_STEP_MS = 250
        const FLASH_STEPS = 6 // 亮/灭各三次，总计 1.5s

        function clearFlashTimers() {
          for (const timer of flashTimers) window.clearTimeout(timer)
          flashTimers = []
        }

        function resetFlashState() {
          clearFlashTimers()
          flashKey = null
          flashPhase = 0
          flashRange = null
        }

        /**
         * 闪烁：让目标那条批注的常驻划线按相位换到另一套底色，不再另画一个临时框。
         * 亮/灭各三次、每次 250ms，之后回到常驻色。
         * 相位切换直接重画高亮层：通用 repaint 有 120ms 节流，还会被选区/滚动合并，
         * 250ms 的节拍落到画面上常常只剩一次。
         * 这里不按 prefers-reduced-motion 降级：本机系统关了「动画效果」时 Chromium 会
         * 一直报 reduce，降级成单次闪烁会让「查看出处」完全失去定位提示。
         * @param item - 跳转目标（草稿条目或台账条目）。
         * @param range - 跳转时命中的 Range；锚点键对不上时也保证闪在刚找到的那一行。
         */
        function flashQuote(item, range = null) {
          const key = highlightKeyOf(item)
          if (key === null) return
          resetFlashState()
          flashKey = key
          flashRange = range !== null && range !== undefined ? range : null
          flashPhase = 1
          paintHighlightLayer()
          for (let step = 1; step < FLASH_STEPS; step += 1) {
            flashTimers.push(window.setTimeout(() => {
              flashPhase = step % 2 === 0 ? 1 : 0
              paintHighlightLayer()
            }, step * FLASH_STEP_MS))
          }
          flashTimers.push(window.setTimeout(() => {
            flashTimers = []
            flashKey = null
            flashPhase = 0
            flashRange = null
            paintHighlightLayer()
            // 收尾再排一次常规重绘：闪烁期间会话区可能滚动/换行，下一轮按常驻色补齐。
            scheduleRepaint('jump-quote')
          }, FLASH_STEPS * FLASH_STEP_MS))
        }

        /** 答复卡/答复行的闪烁计时器与当前节点：同一时刻只闪一处，新的跳转先收掉旧的。*/
        let replyFlashTimers = []
        let replyFlashTarget = null

        /** 停掉答复闪烁并摘掉类：弹层关闭或下一次跳转都从这里收尾。*/
        function clearReplyFlash() {
          for (const timer of replyFlashTimers) window.clearTimeout(timer)
          replyFlashTimers = []
          if (replyFlashTarget !== null) safe(() => replyFlashTarget.classList.remove('sa-reply-flash'))
          replyFlashTarget = null
        }

        /**
         * 答复卡闪三下：与划线同一套节拍，只切换节点上的 class，不另画框、不改布局与配色。
         * @param target - 答复卡根节点（[data-sa-ui="replies"]），或退而求其次的该轮正文行。
         */
        function flashReplyTarget(target) {
          if (target === null || target === undefined) return
          clearReplyFlash()
          replyFlashTarget = target
          safe(() => target.classList.add('sa-reply-flash'))
          for (let step = 1; step < FLASH_STEPS; step += 1) {
            replyFlashTimers.push(window.setTimeout(() => {
              if (replyFlashTarget !== target) return
              if (step % 2 === 0) safe(() => target.classList.add('sa-reply-flash'))
              else safe(() => target.classList.remove('sa-reply-flash'))
            }, step * FLASH_STEP_MS))
          }
          replyFlashTimers.push(window.setTimeout(() => {
            if (replyFlashTarget !== target) return
            safe(() => target.classList.remove('sa-reply-flash'))
            replyFlashTarget = null
            replyFlashTimers = []
          }, FLASH_STEPS * FLASH_STEP_MS))
        }

        /** 答复卡由 renderReplySections 按台账批次锚点挂；取最后一个还挂在页面上的。*/
        function replyCardOf(anchorKey) {
          if (typeof anchorKey !== 'string' || anchorKey === '') return null
          const cards =
            safe(() => document.querySelectorAll(`[data-sa-ui="replies"][data-anchor="${cssEscape(anchorKey)}"]`)) ?? []
          for (let index = cards.length - 1; index >= 0; index -= 1) {
            if (safe(() => cards[index].isConnected === true) === true) return cards[index]
          }
          return null
        }

        /**
         * 答复卡缺席时退到的该轮正文：先认最后一条 assistant 行，旧结构再认 assistant-step，
         * 两者都没有才退回这一轮的内容项。
         */
        function replyFallbackRow(turn) {
          if (!Number.isFinite(turn)) return null
          // 轮次标记可能落在分组外壳上，正文行是它的后代，两种都收进来。
          const rows = safe(() => {
            const found = []
            for (const holder of document.querySelectorAll(`[data-chat-turn="${turn}"]`)) {
              if ((holder.getAttribute?.('data-chat-flow-kind') ?? '') !== '') found.push(holder)
              found.push(...holder.querySelectorAll('[data-chat-flow-kind]'))
            }
            return found
          }) ?? []
          const lastOf = (kind) => {
            let found = null
            for (const row of rows) {
              if ((row.getAttribute?.('data-chat-flow-kind') ?? '') === kind) found = row
            }
            return found !== null && safe(() => found.isConnected === true) === true ? found : null
          }
          return lastOf('assistant') ?? lastOf('assistant-step') ?? turnContentItem(turn)
        }

        /**
         * 官方轮次导航的共用分支：点对应轮次，按固定间隔重试落点查找，超时统一报「还没加载」。
         * @param turn - 轮次号。
         * @param locate - 每次重试调用的落点查找；成功返回 true。
         * @param fail - 超时或按钮缺失时的失败回调。
         */
        function navigateToTurn(turn, locate, fail) {
          const mark = findTurnNavButton(turn)
          if (mark === null) {
            fail(t('jump.notLoaded', { n: turn }))
            return
          }
          mark.click()
          const deadline = Date.now() + JUMP_NAV_TIMEOUT_MS
          const retry = () => {
            if (locate()) return
            if (Date.now() < deadline) {
              window.setTimeout(retry, JUMP_NAV_POLL_MS)
              return
            }
            fail(t('jump.notLoaded', { n: turn }))
          }
          window.setTimeout(retry, JUMP_NAV_POLL_MS)
        }

        /**
         * 「批注备注」行右侧的「查看出处」：回到这条批注的答复卡。
         * 与「引用原文」同一套流程：先在当前 DOM 里按批次锚点找答复卡；找不到就用台账轮次
         * 点官方轮次导航加载，回来再找一次；答复卡始终没有时退到该轮最后一条正文行。
         * 落点闪三下但不画引文划线；失败提示落在触发按钮所在行，并记一条带 stage 的日志。
         * @param record - sentRecordOf 找到的台账记录（含 anchorKey/turn）。
         * @param item - 当前只读面板的条目。
         * @param root - 触发按钮，用来把提示落在备注行里。
         */
        function jumpToReply(record, item, root) {
          // 答复卡挂在「这批批注」的批次锚点上；item.source.anchorKey 指向被引正文，不能混用。
          const anchorKey =
            typeof record?.anchorKey === 'string' && record.anchorKey !== '' ? record.anchorKey : null
          const turn = Number.isFinite(record?.turn)
            ? record.turn
            : Number.isFinite(item?.turn)
              ? item.turn
              : null
          const fail = (message, stage) => {
            warn('[selection-annotations] 答复跳转失败:', { turn, anchorKey, reason: message, stage })
            jumpFailure(message, root)
          }
          const landCard = (card) => {
            scrollRowToCenter(card)
            // 卡刚挂上时下一帧再量外圈，避免量到 0×0。
            window.requestAnimationFrame(() => flashReplyTarget(card))
            return true
          }
          const landRow = (row) => {
            scrollRowToCenter(row)
            window.requestAnimationFrame(() => flashReplyTarget(row))
            return true
          }
          const card = replyCardOf(anchorKey)
          if (card !== null) {
            landCard(card)
            return
          }
          // 数据在台账里但卡还没渲染时，补一遍会话区重建，等下一条消息再查。
          markConversationDirty()
          scheduleRepaint('jump-reply')
          if (turn === null) {
            window.setTimeout(() => {
              const late = replyCardOf(anchorKey)
              if (late !== null) {
                landCard(late)
                return
              }
              fail(t('jump.noReply'), 'reply-card')
            }, REPAINT_MS + 60)
            return
          }
          // 这一轮的内容已经在 DOM 里：没有答复卡就是一拍重绘后直接退正文，不再空等导航轮询。
          const loadedRow = replyFallbackRow(turn)
          if (loadedRow !== null) {
            window.setTimeout(() => {
              const late = replyCardOf(anchorKey)
              if (late !== null) {
                landCard(late)
                return
              }
              landRow(replyFallbackRow(turn) ?? loadedRow)
            }, REPAINT_MS + 60)
            return
          }
          if (findTurnNavButton(turn) === null) {
            const row = replyFallbackRow(turn)
            if (row !== null) {
              landRow(row)
              return
            }
            fail(t('jump.noReply'), 'reply-after-nav')
            return
          }
          // 轮次还没加载：与「引用原文」一致，代点官方导航后轮询 DOM，超时再退正文。
          navigateToTurn(turn, () => {
            const late = replyCardOf(anchorKey)
            if (late === null) {
              // 轮次刚落地时答复卡可能还没重建：催一次重绘，等下一拍再查。
              markConversationDirty()
              scheduleRepaint('jump-reply')
              return false
            }
            return landCard(late)
          }, () => {
            const row = replyFallbackRow(turn)
            if (row !== null) {
              landRow(row)
              return
            }
            fail(t('jump.noReply'), 'assistant-row')
          })
        }

        /**
         * 「跳到出处」的落点：按轮次与锚点/指纹在已加载的行里找；行被宿主卸下时，拿轮次号
         * 点官方轮次导航把它加载回来，落地后重新走同一套查找。找不到就明确提示，不静默无反应。
         * @param item - 带 source 的批注条目。
         * @param turnHint - 已知的轮次号（已发送卡/答复区手里有）。
         * @param root - 触发按钮，用来把提示落在对应的界面层里。
         */
        function jumpToQuote(item, turnHint, root) {
          const source = item === undefined || item === null ? null : item.source
          // 轮次提前算：失败日志要区分「没轮次」与「轮次不在导航里」，早退分支也要能记。
          const turn = Number.isFinite(turnHint) ? turnHint : Number.isFinite(source?.turn) ? source.turn : null
          // 画得出来就该跳得回去：高亮层刚画过的那一行最可靠，优先于轮次/锚点/导航。
          const key = highlightKeyOf(item)
          const painted = key === null ? null : (paintedRows.get(key) ?? null)
          const drawn = painted !== null
          const drawnRow = drawn && safe(() => painted.isConnected === true) === true ? painted : null
          const fail = (message) => {
            warn('[selection-annotations] 跳转失败:', {
              turn,
              kind: source?.kind,
              anchorKey: source?.anchorKey,
              drawn,
              reason: message,
            })
            jumpFailure(message, root)
          }
          if (drawnRow !== null) {
            scrollRowToCenter(drawnRow)
            const range = safe(() => locateRangeInRow(item, drawnRow)) ?? null
            window.requestAnimationFrame(() => flashQuote(item, range))
            return
          }
          if (source === undefined || source === null) {
            fail(t('jump.noAnchor'))
            return
          }
          if (source.kind === 'file') {
            fail(t('jump.file'))
            return
          }
          // 已发送/答复来源也有自己的落点（卡片项、答复项），行与指纹都可能找得到，不能一上来就判死。
          if (source.kind !== 'message' && source.kind !== 'sent' && source.kind !== 'reply') {
            fail(t('jump.noAnchor'))
            return
          }
          const land = () => {
            const row = safe(() => findSourceRow(source, item, turn)) ?? null
            if (row === null) return false
            scrollRowToCenter(row)
            const range = locateRangeInRow(item, row)
            // 行刚挂载时正文可能还在排版，下一帧再量矩形，免得量到 0×0。
            window.requestAnimationFrame(() => flashQuote(item, range))
            return true
          }
          if (land()) return
          if (turn === null) {
            fail(t('jump.noAnchor'))
            return
          }
          navigateToTurn(turn, land, fail)
        }

        /**
         * 位置精修：把渲染坐标升级成文件原文坐标。
         *
         * 刻意与「创建批注」解而——批注先落地，精修只是事后补的。这样任何读取或定位失败都
         * 只会让这条批注停在渲染坐标，而*不会让它根本建不出来**。（教训：上一版把精修放在
         * 创建之前，一次 remote 获取抛错就把整条创建跳过了。）
         * @param id - 要精修的批注 id。
         * @param source - 捕获时的来源（渲染坐标）。
         * @param quote - 引文。
         */
        /** 把精修失败的原因挂到那条批注上，面板会显示出来。*/
        function markRefineReason(id, reason) {
          let hit = false
          annotations = annotations.map((item) => {
            if (item.id !== id) return item
            hit = true
            return { ...item, refineReason: reason }
          })
          if (!hit) return
          emit()
          // 原因只显示在面板里、不进载荷，所以不需要为此重传附件。
          scheduleRepaint('emit')
        }

        function refineSourcePosition(id, source, quote) {
          const task = (async () => {
            const precise = await safe(() =>
              resolveSourcePosition(source, quote, (reason) => markRefineReason(id, reason)),
            )
            if (precise === undefined) return
            let hit = false
            annotations = annotations.map((item) => {
              if (item.id !== id) return item
              hit = true
              // 先留一份渲染坐标给页面高亮用：精修后 charStart/charEnd 换成原文坐标，
              // 再拿它去渲染后的正文里找重复片段会挑错位置。渲染坐标不进负载。
              const rendered =
                item.source.textOrigin === 'source' && Number.isFinite(item.source.renderedCharStart)
                  ? {}
                  : { renderedCharStart: item.source.charStart, renderedCharEnd: item.source.charEnd }
              return { ...item, source: { ...item.source, ...rendered, ...precise } }
            })
            if (!hit) return
            emit()
            // 上传正在等我们时不必再排一次（它会拿到最新结果）；否则补一次。
            if (!syncing) scheduleSync()
            scheduleRepaint('emit')
          })()
          const guarded = task.catch((err) => {
            warn('[selection-annotations] 位置精修失败（不影响这条批注）：', err)
          })
          pendingRefine = guarded
          void guarded.then(() => {
            if (pendingRefine === guarded) pendingRefine = undefined
          })
          return guarded
        }

        /**
         * 保存并关闭弹层。
         * @param discardEmpty - 「被动确认」传 true（点框外、悬停收起）：新划出来但既没写文字也没加图的批注直接丢弃，
         *   避免每次误点都留下一条空批注。显式点「保存」时仍然允许空批注（只标记原文）。
         */
        function commitPopover(discardEmpty = false) {
          if (popoverMode === 'edit') {
            // 编辑中的改动已在输入/改图时按去抖写进条目，写入逻辑只保留在 autoSavePopover 一处：
            // 这里不再比较内容、也不再调 updateAnnotation，只借 closePopover 补上最后一段
            // 还在去抖窗口里的改动，然后照原路关闭（不触发「空正文即删除」）。
            closePopover({ discardWebEmpty: false })
            return
          }
          const anchor = popoverAnchor
          // 自动存写可能已经替这次新建建好了条目：内容此时就是最新的，直接关。
          if (popoverTargetId !== null) {
            closePopover({ discardWebEmpty: false })
            return
          }
          if (anchor === null) return
          const note = noteValue()
          const images = popInputImages
          if (discardEmpty && shouldDiscardEmpty(popoverMode, note, images)) {
            cancelPopAutoSave()
            closePopover()
            return
          }
          // 下面自己创建这一条：先取消去抖窗口里那次「自动新建」，
          // 避免 closePopover 的 flush 先建一条、这里再建一条。
          cancelPopAutoSave()
          closePopover()
          // 先创建：这一段绝不能依赖任何可能失败的东西。
          const created = addAnnotation({
            quote: anchor.quote,
            note,
            images,
            source: anchor.source,
            liveRange: anchor.range,
          })
          safe(() => window.getSelection()?.removeAllRanges())
          // 再异步把位置精修到原文坐标；失败只记日志。
          if (created !== undefined) {
            refineSourcePosition(created.id, anchor.source, anchor.quote).catch((err) => {
              warn('[selection-annotations] 位置精修失败（不影响这条批注）：', err)
            })
          }
        }

        /**
         * 取消编辑：把条目内容回滚成打开弹层时的快照（正文与图片一起），再按原有取消路径关闭。
         * 自动存写会把每次键入立刻写进条目，所以回滚必须显式做；快照缺失时不动条目。
         */
        function cancelPopoverEdit() {
          cancelPopAutoSave()
          if (popoverMode === 'create') {
            // 新建期间自动存下的草稿，在「取消」时整体丢弃：等同于从未创建过。
            if (popoverTargetId !== null) removeAnnotation(popoverTargetId)
            closePopover({ autoSave: false })
            return
          }
          const snapshot = popoverSnapshot
          if (popoverMode === 'edit' && popoverTargetId !== null && snapshot !== null && snapshot.id === popoverTargetId) {
            const current = annotations.find((item) => item.id === popoverTargetId)
            const changed =
              current !== undefined &&
              (current.note !== snapshot.note ||
                JSON.stringify(current.images ?? []) !== JSON.stringify(snapshot.images))
            // 没改动就不用再写一次：避免取消一个没动过的编辑惊动面板、存储与远端。
            if (changed) updateAnnotation(snapshot.id, snapshot.note, snapshot.images)
          }
          closePopover({ autoSave: false })
        }

        /**
         * 采纳与否决共用这一条落条目事务：不走弹层，直接按当前选区落一条带关键句的批注。
         * 差异只有正文预填的字面，所以调用方传进来，别在这里分叉。
         * @param noteText - 预填到批注正文的关键句。
         * @returns 新建的批注对象；没有落成时为 undefined。
         */
        function adoptSelectionDirectly(noteText = adoptTextOf()) {
          const selection = pendingSelection
          if (selection === null) return undefined
          hideToolbar()
          closeContextMenu()
          const source = captureSource(selection.range)
          const created = addAnnotation({
            quote: selection.quote,
            note: noteText,
            images: [],
            source,
            liveRange: selection.range,
          })
          safe(() => window.getSelection()?.removeAllRanges())
          if (created !== undefined) {
            refineSourcePosition(created.id, source, selection.quote).catch((err) => {
              warn('[selection-annotations] 位置精修失败（不影响这条批注）：', err)
            })
          }
          return created
        }

        /** 否决：落条目时预填「否决」字样，紧接着打开编辑面板让人补理由。*/
        function rejectSelectionDirectly() {
          const selection = pendingSelection
          const created = adoptSelectionDirectly(rejectTextOf())
          if (created === undefined || created === null) return
          const anchor =
            selection === null
              ? undefined
              : { getBoundingClientRect: () => selection.range.getBoundingClientRect() }
          openEditPopover(created.id, anchor)
        }

        /** 当前会话里所有答复的 uuid 与老数据的「序号 + 引文」签名：回放时判断条目是否已经答过。*/
        function repliedMarksOf(sessionId) {
          const uuids = new Set()
          const legacy = new Set()
          for (const batch of remoteReplyCache.get(sessionId) ?? []) {
            for (const reply of Array.isArray(batch?.replies) ? batch.replies : []) {
              if (typeof reply?.uuid === 'string' && reply.uuid !== '') uuids.add(reply.uuid)
              if (Number.isFinite(reply?.index)) {
                legacy.add(`${reply.index}\u0000${typeof reply.quote === 'string' ? reply.quote : ''}`)
              }
            }
          }
          return { uuids, legacy }
        }

        /** 台账记录自带的答复标记（宿主新版本可能写入，老数据没有）。*/
        function recordHasReplyMark(record) {
          if (record === null || record === undefined || typeof record !== 'object') return false
          return record.replied === true || Number.isFinite(record.repliedAt) || Number.isFinite(record.replyAt)
        }

        /** 条目自带的答复标记：直接写回在条目上的 verdict / repliedAt 也算已答。*/
        function itemHasReplyMark(item) {
          if (item === null || item === undefined || typeof item !== 'object') return false
          return (
            item.replied === true ||
            Number.isFinite(item.repliedAt) ||
            Number.isFinite(item.replyAt) ||
            (typeof item.verdict === 'string' && item.verdict !== '')
          )
        }

        /**
         * 一条台账条目是否已经被答复：记录/条目标记优先，其后按 uuid 查答复；
         * 答复卡回放的是答复自身的副本（没有 uuid），按引文在同一批条目里找回原条目再查。
         * 老数据没有 uuid 时退回「序号 + 引文」。
         */
        function itemWasAnswered(item, record, replied) {
          if (recordHasReplyMark(record) || itemHasReplyMark(item)) return true
          const uuidOf = (candidate) =>
            typeof candidate?.uuid === 'string' && candidate.uuid !== '' ? candidate.uuid : ''
          if (replied.uuids.has(uuidOf(item))) return true
          if (uuidOf(item) === '') {
            const items = Array.isArray(record?.items) ? record.items : []
            for (const candidate of items) {
              // 引文是答复与原条目之间最稳的对应关系；备注可能被服务端整理过，不能要求逐字相等。
              if (candidate?.quote !== item?.quote) continue
              if (replied.uuids.has(uuidOf(candidate))) return true
              if (
                Number.isFinite(candidate?.index) &&
                typeof item?.quote === 'string' &&
                replied.legacy.has(`${candidate.index}\u0000${item.quote}`)
              ) {
                return true
              }
            }
          }
          if (Number.isFinite(item?.index)) {
            return replied.legacy.has(`${item.index}\u0000${typeof item.quote === 'string' ? item.quote : ''}`)
          }
          return false
        }

        /**
         * 把一条已发送记录里的批注原样追加回待发送列表（图片也带上）。
         * 已经被答复过的条目不进队列，只把重放数据写进剪贴板，避免重复提交。
         * @param record - 这批条目所属的台账记录；用来读批次级答复标记。
         * @param force - 会话回退恢复等场景强制入列，不再判断答复。
         */
        function reuseSentItems(items, record = null, force = false) {
          const list = Array.isArray(items) ? items : []
          const sessionId = currentSessionId()
          const replied = force || sessionId === undefined ? null : repliedMarksOf(sessionId)
          const keep = []
          const answered = []
          for (const item of list) {
            if (typeof item?.quote !== 'string' && typeof item?.note !== 'string') continue
            const images = (Array.isArray(item.thumbs) ? item.thumbs : [])
              .filter((thumb) => typeof thumb?.dataUrl === 'string' && thumb.dataUrl !== '')
              .map((thumb, index) => {
                const full = typeof thumb.preview === 'string' && thumb.preview !== '' ? thumb.preview : thumb.dataUrl
                return {
                  id: `img-reuse-${Date.now().toString(36)}-${index}`,
                  name: typeof thumb.name === 'string' ? thumb.name : t('image.alt'),
                  dataUrl: full,
                  thumb: thumb.dataUrl,
                  preview: full,
                  bytes: Math.round((full.length * 3) / 4),
                }
              })
            const entry = {
              quote: typeof item.quote === 'string' ? item.quote : '',
              note: typeof item.note === 'string' ? item.note : '',
              images,
              source: item.source,
            }
            if (replied !== null && itemWasAnswered(item, record, replied)) answered.push(entry)
            else keep.push(entry)
          }
          if (answered.length > 0) {
            // 不 await：回放本身是同步动作，剪贴板提示由 copyAnnotationsToClipboard 自己收尾。
            void copyAnnotationsToClipboard(answered, undefined, t('sent.replayCopied'))
          }
          return keep.length === 0 ? 0 : addUniqueAnnotations(keep)
        }

        function deleteFromPopover() {
          const target = popoverTargetId
          closePopover()
          if (target !== null) removeAnnotation(target)
        }

        annotateButton.addEventListener('mousedown', (event) => {
          // 保住选区：点按钮不应清掉它。
          event.preventDefault()
        })
        annotateButton.addEventListener('click', (event) => {
          event.preventDefault()
          openCreatePopover()
        })
        rejectButton.addEventListener('mousedown', (event) => {
          event.preventDefault()
        })
        rejectButton.addEventListener('click', (event) => {
          event.preventDefault()
          rejectSelectionDirectly()
        })
        adoptButton.addEventListener('mousedown', (event) => {
          event.preventDefault()
        })
        adoptButton.addEventListener('click', (event) => {
          event.preventDefault()
          adoptSelectionDirectly()
        })
        copyButton.addEventListener('mousedown', (event) => {
          // 保住选区，复制到的就是当前划选内容。
          event.preventDefault()
        })
        copyButton.addEventListener('click', (event) => {
          event.preventDefault()
          const selection = pendingSelection
          if (selection === null) return
          copyPlainText(selection.quote)
          hideToolbar()
        })
        menuAnnotate.addEventListener('mousedown', (event) => {
          // 和上方按钮一样保住选区。
          event.preventDefault()
        })
        menuAnnotate.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          const selection = contextMenuSelection ?? pendingSelection
          closeContextMenu()
          if (selection === null) return
          pendingSelection = selection
          openCreatePopover()
        })
        menuAdopt.addEventListener('mousedown', (event) => {
          event.preventDefault()
        })
        menuAdopt.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          if (contextMenuSelection !== null) pendingSelection = contextMenuSelection
          closeContextMenu()
          adoptSelectionDirectly()
        })
        menuReject.addEventListener('mousedown', (event) => {
          event.preventDefault()
        })
        menuReject.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()
          if (contextMenuSelection !== null) pendingSelection = contextMenuSelection
          closeContextMenu()
          rejectSelectionDirectly()
        })
        menuCopy.addEventListener('mousedown', (event) => {
          event.preventDefault()
        })
        menuCopy.addEventListener('click', (event) => {
          event.preventDefault()
          const selection = contextMenuSelection ?? pendingSelection
          closeContextMenu()
          if (selection !== null) copyPlainText(selection.quote)
        })
        popCancel.addEventListener('click', () => cancelPopoverEdit())
        popSave.addEventListener('click', () => {
          commitPopover()
        })
        popDelete.addEventListener('click', () => deleteFromPopover())
        popClose.addEventListener('click', () => closePopover())
        popInput.addEventListener('keydown', (event) => {
          // 关键句 token 是 contenteditable=false，退格与选中由浏览器按整块处理；
          // 手打前几个字时，Tab 把当前内容换成完整的关键句 token（采纳、否决都认）。
          if (event.key === 'Tab' && !event.shiftKey) {
            if (acceptSuggestion()) {
              event.preventDefault()
              return
            }
            const value = noteValue()
            const phrase = notePhrases().find(
              (candidate) => value !== '' && value !== candidate && candidate.startsWith(value),
            )
            if (phrase !== undefined) {
              event.preventDefault()
              setNoteContent(phrase)
              safe(() => caretToEnd())
              syncPopInputHeight()
              return
            }
          }
          if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            event.preventDefault()
            insertNoteText('\n')
            refreshNoteState()
            syncPopInputHeight()
            return
          }
          if (event.key === 'Escape') closePopover()
        })
        popInput.addEventListener('input', () => {
          const value = noteValue()
          // 手打完整关键句时直接转成 token，避免留下可拆开的纯文本。
          const hit = notePhrases().find((phrase) => value.endsWith(phrase))
          if (hit !== undefined) {
            const last = popInput.lastElementChild
            const already = last !== null && last !== undefined && typeof last.className === 'string' && last.className.includes('sa-token')
            if (!already) {
              setNoteContent(value)
              safe(() => caretToEnd())
            }
          }
          updateSuggestion()
          refreshNoteState()
          syncPopInputHeight()
          ensureCaretVisible()
        })
        popSuggest.addEventListener('mousedown', (event) => {
          // 保住编辑器焦点，点提示不会先触发失焦。
          event.preventDefault()
        })
        popSuggest.addEventListener('click', (event) => {
          event.preventDefault()
          acceptSuggestion()
        })
        // 粘贴图片：截图直接进批注，不用先存成文件再拖进来。
        popInput.addEventListener('paste', (event) => {
          const data = event.clipboardData
          if (data === null || data === undefined) return
          const files = [...(data.files ?? [])]
          if (files.length === 0) {
            for (const entry of data.items ?? []) {
              if (entry.kind !== 'file') continue
              const file = safe(() => entry.getAsFile())
              if (file !== null && file !== undefined) files.push(file)
            }
          }
          const images = files.filter((file) => typeof file?.type === 'string' && file.type.startsWith('image/'))
          if (images.length === 0) {
            // 普通文本粘贴走纯文本，避免把外部富文本结构带进备注。
            const plain = safe(() => data.getData('text/plain'))
            if (typeof plain !== 'string' || plain === '') return
            event.preventDefault()
            insertNoteText(plain)
            refreshNoteState()
            syncPopInputHeight()
            return
          }
          event.preventDefault()
          void addPopImages(images)
        })
        popover.addEventListener('dragover', (event) => {
          if (event.dataTransfer === null || event.dataTransfer === undefined) return
          event.preventDefault()
        })
        popover.addEventListener('drop', (event) => {
          const files = [...(event.dataTransfer?.files ?? [])]
          if (files.length === 0) return
          event.preventDefault()
          void addPopImages(files)
        })

        /* --------------------------------------------------------------- 悬停预览 */

        function cancelHoverOpen() {
          if (hoverOpenTimer !== null) window.clearTimeout(hoverOpenTimer)
          hoverOpenTimer = null
          hoverTargetId = null
        }

        function cancelHoverClose() {
          if (hoverCloseTimer !== null) window.clearTimeout(hoverCloseTimer)
          hoverCloseTimer = null
        }

        /** 没进入交互就自动收起；收起前按确认保存，已输入的内容不会丢。*/
        function scheduleHoverClose() {
          if (popoverSource !== 'hover') return
          if (hoverCloseTimer !== null) return
          if (popoverTouched || popoverHovered) return
          hoverCloseTimer = window.setTimeout(() => {
            hoverCloseTimer = null
            if (popover.dataset.open !== '1') return
            if (popoverSource !== 'hover') return
            if (popoverTouched || popoverHovered) return
            commitPopover(true)
          }, 250)
        }

        /**
         * 命中取「画在最上面的那条」：几条划线重叠时后建的压在上面，与眼睛看到的一致。
         * 顺着数组取第一条会让被压住的旧批注抢走命中——鼠标停在新的（例如采纳）划线上，
         * 弹出来的却是压在下面的那条；那条若正开着，计时器里的「已开就别再开」会直接吞掉这次悬停。
         */
        function hitHighlight(x, y) {
          for (let index = highlightHits.length - 1; index >= 0; index -= 1) {
            const entry = highlightHits[index]
            for (const rect of entry.rects) {
              if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return entry
            }
          }
          return undefined
        }

        /**
         * 悬停只在鼠标真正落在高亮文字上时才算命中。
         * 高亮层本身 pointer-events:none，纯几何判断会让它穿过盖在上面的面板、菜单继续命中，
         * 表现为鼠标停在浮层上、文字却弹出预览。这里看该点最上层的实际元素。
         */
        function hoverPointExposed(x, y) {
          if (typeof document.elementsFromPoint !== 'function') return true
          for (const node of document.elementsFromPoint(x, y)) {
            if (node === document.body || node === document.documentElement) break
            const className = typeof node.className === 'string' ? node.className : ''
            // 高亮框画的就是被批注的文字本身，角标也挂在同一层上，都不能算遮挡。
            if (className.includes('sa-hl') || className.includes('sa-badge')) continue
            // 弹层正文里的采纳 token 是插件自己画的字，替它遮挡没有意义。
            if (className.includes('sa-token')) continue
            // 弹层就贴在划线旁边，常常压住半行字：它挡住自己这块区域时仍按「看得见文字」处理，
            // 否则预览一弹出就把自己判成遮挡，接着被 250ms 的收起逻辑关掉，看起来像弹不出来。
            if (popover.contains(node)) continue
            const host = node.closest?.('[data-sa-ui]')
            if (host !== null && host !== undefined) {
              const kind = host.getAttribute('data-sa-ui')
              // 角标的祖先就是高亮层：它盖住文字时仍按文字处理。
              // 已发送卡与答复区不是浮层：它们的正文可以划选，高亮框也画在它们的文字上，
              // 判成遮挡的话在批注区里悬停永远弹不出预览。其余 data-sa-ui（面板、菜单、弹层、
              // 建议、ghost、viewer）仍是遮挡。
              if (kind === 'overlay' || kind === 'sent' || kind === 'replies') continue
              return false
            }
            const style = window.getComputedStyle(node)
            const z = Number(style.zIndex)
            if ((style.position === 'fixed' || style.position === 'sticky') && Number.isFinite(z) && z >= 10) return false
            return true
          }
          return true
        }

        function onHoverMove(event) {
          const open = popover.dataset.open === '1'
          const raw = highlightHits.length === 0 ? undefined : hitHighlight(event.clientX, event.clientY)
          const hit = raw !== undefined && hoverPointExposed(event.clientX, event.clientY) ? raw : undefined
          if (open) {
            // 主动点开的弹层不会被悬停逻辑关掉；只有悬停预览才自动收。
            if (popoverSource !== 'hover') return
            if (popoverTouched || popoverHovered) return
            if (hit === undefined) {
              scheduleHoverClose()
              return
            }
            // 指针仍在某条划线上：撤销已经排上的收起，别让它到点把预览关掉。
            cancelHoverClose()
            // 指针落在弹层自己身上时什么都不做：弹层常压在别的划线上，照几何判断会误判成「换目标」。
            const popoverBox = safe(() => popover.getBoundingClientRect())
            if (
              popoverBox !== undefined &&
              popoverBox !== null &&
              event.clientX >= popoverBox.left &&
              event.clientX <= popoverBox.right &&
              event.clientY >= popoverBox.top &&
              event.clientY <= popoverBox.bottom
            ) {
              return
            }
            // 预览开着时又扫到另一条批注：换过去。不换的话只有最先扫到的那条能弹，
            // 后面的（常常是后加的采纳批注）看起来永远弹不出来。
            if (popoverTargetId === hit.id) return
            const nextRect = unionRects(hit.rects)
            if (nextRect === null) return
            // 收掉旧预览再开新的：编辑态走保存式收起，其它态（含只读的已发送面板）直接关。
            if (popoverMode === 'edit') commitPopover(true)
            else closePopover()
            if (popover.dataset.open === '1') return
            // 已发送条目没有编辑弹层：换成同一底座的只读面板。
            const nextSent = hit.item?.sentHighlight === true ? hit.item : undefined
            if (nextSent !== undefined) {
              openSentPopover(nextSent, { getBoundingClientRect: () => nextRect }, 'hover')
              return
            }
            openEditPopover(hit.id, { getBoundingClientRect: () => nextRect }, 'hover')
            return
          }
          if (hit === undefined) {
            cancelHoverOpen()
            return
          }
          if (hoverTargetId === hit.id) return
          cancelHoverOpen()
          hoverTargetId = hit.id
          hoverOpenTimer = window.setTimeout(() => {
            hoverOpenTimer = null
            hoverTargetId = null
            if (popover.dataset.open === '1') return
            const rect = unionRects(hit.rects)
            if (rect === null) return
            // 已发送条目不进 annotations：命中里带的副本已经够画只读面板，先去这一支。
            const sent = hit.item?.sentHighlight === true ? hit.item : undefined
            if (sent !== undefined) {
              openSentPopover(sent, { getBoundingClientRect: () => rect }, 'hover')
              return
            }
            const target = annotations.find((item) => item.id === hit.id)
            if (target === undefined) {
              reportHoverMiss(hit.id)
              return
            }
            openEditPopover(target.id, { getBoundingClientRect: () => rect }, 'hover')
          }, HOVER_OPEN_DELAY_MS)
        }

        popover.addEventListener('mouseenter', () => {
          popoverHovered = true
          cancelHoverClose()
        })
        popover.addEventListener('mouseleave', () => {
          popoverHovered = false
          scheduleHoverClose()
        })
        popover.addEventListener(
          'pointerdown',
          () => {
            // 只读面板没有需要保在手边的输入：点它不算「用户已接手」，移开划线与面板仍然自动收起。
            if (popoverMode !== 'sent') popoverTouched = true
            cancelHoverClose()
          },
          true,
        )
        popInput.addEventListener('input', () => {
          popoverTouched = true
        })
        popInput.addEventListener('click', () => safe(() => updateSuggestion()))
        popInput.addEventListener('keyup', () => safe(() => updateSuggestion()))
        let hoverMoveAt = 0
        const onHoverMoveDocument = (event) => {
          const now = Date.now()
          if (now - hoverMoveAt < 60) return
          hoverMoveAt = now
          onHoverMove(event)
        }
        document.addEventListener('mousemove', onHoverMoveDocument, true)
        const onPopoverOutsidePointerDown = (event) => {
          if (popover.dataset.open !== '1') return
          const target = elementOf(event.target)
          if (target !== null && target.closest('[data-sa-ui="popover"]') !== null) return
          // 大图查看层是弹层的「子视图」：关它不该连带收起批注框。
          if (target !== null && target.closest('[data-sa-ui="viewer"]') !== null) return
          // 点框外算确认这次编辑：已经写下的内容不能因为一次误点就丢掉，
          // 但一个字都没写、也没加图的新批注属于「划完就反悔」，直接丢掉。
          commitPopover(true)
        }
        document.addEventListener('pointerdown', onPopoverOutsidePointerDown, true)
        const onPopoverEscapeKeyDown = (event) => {
          if (event.key !== 'Escape') return
          // 大图开着时 Esc 只收大图，弹层留在原地。
          if (imageViewer.dataset.open === '1') {
            closeImageViewer()
            return
          }
          hideToolbar()
          closePopover()
        }
        document.addEventListener('keydown', onPopoverEscapeKeyDown)
        /* ------------------------------------------- 批注按钮 + 悬浮批注面板 */

        function sourceSummary(item) {
          const source = item.source
          if (source?.kind === 'message') return source.flowKind === 'user' ? t('source.user') : t('source.assistant')
          if (source?.kind === 'reply') return t('source.replyShort', { n: Number.isFinite(source.index) ? source.index : '-' })
          if (source?.kind === 'sent') return t('source.sentShort', { n: Number.isFinite(source.index) ? source.index : '-' })
          if (source?.kind === 'web') return t('source.webShort', { url: source.path ?? '' })
          if (source?.kind === 'file') {
            const path = source.path ?? t('source.fileFallback')
            const where = Number.isFinite(source.lineStart) ? `${path}:${source.lineStart}` : path
            // 行号是渲染坐标推出来的，未必等于文件真行发——这一点要让用户看见。
            return source.textOrigin === 'source' ? where : `${where}${t('source.rendered')}`
          }
          return t('source.selection')
        }

        // 面板是挂在 body 上的原生 DOM（position: fixed），**完全不参与布局**：
        // 既不会把输入框顶上去，也不受 composer 行内样式/滚动容器影响。
        // 触发按钮则在 composer 的 input.right 槽位里，紧挨发送按钮。
        const panelRoot = document.createElement('div')
        panelRoot.className = 'sa-float'
        panelRoot.setAttribute('data-sa-ui', 'panel')
        panelRoot.style.display = 'none'
        const panelEl = document.createElement('div')
        panelEl.className = 'sa-panel'
        panelEl.setAttribute('data-sa-ui', 'panel')
        panelRoot.appendChild(panelEl)
        // 拖到列表末尾的空白处时，把批注移到末尾。
        panelEl.addEventListener('dragover', (event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
        })
        panelEl.addEventListener('drop', (event) => {
          if (event.defaultPrevented) return
          const draggedId = event.dataTransfer.getData('text/plain')
          if (draggedId === '') return
          // 与行内交换共用同一套 FLIP：先记旧位置，重排后再补间到新位置。
          const before = panelRenderer.snapshotRows(panelEl)
          moveAnnotation(draggedId, null)
          panelRenderer.animateRows(panelEl, before)
        })
        /** 面板尺寸变化时（例如手动拖高设置输入框）重新贴底。*/
        let panelRaf = 0
        let panelObserver = null
        /** 上一次定位时面板的尺寸：只有内容尺寸真的变了才重排。*/
        let panelWidthSeen = -1
        let panelHeightSeen = -1
        /** 窗口尺寸变化期间，面板被 CSS 带着改尺寸不算内容变化。*/
        let viewportResizing = false
        let viewportResizeTimer = 0
        // 输入框被手动拖高、或内容增减导致面板尺寸变化时，重新计算位置让底边不动。
        if (typeof ResizeObserver === 'function') {
          panelObserver = new ResizeObserver(() => {
            if (!panelOpen || panelRaf !== 0 || viewportResizing) return
            // 只是重画一遍（例如侧栏开合刷新按钮状态）不重排：内容尺寸没变就保持原位。
            const width = panelEl.offsetWidth
            const height = panelEl.offsetHeight
            if (width === panelWidthSeen && height === panelHeightSeen) return
            panelRaf = window.requestAnimationFrame(() => {
              panelRaf = 0
              positionPanel()
            })
          })
          panelObserver.observe(panelEl)
        }

        let panelOpen = false
        let panelAnchor = null
        /** 打开面板时量到的按钮位置：之后侧栏开合把按钮挪走，面板也不跟着跑。*/
        let panelAnchorRect = null
        /** 关闭动画结束后再隐藏面板，避免过渡被 display:none 打断。*/
        let panelHideTimer = 0
        /** 悬停入口临时展开：指针移开就收起；点击则固定。*/
        let panelOpenedByHover = false
        let panelHovered = false
        let chipHoverOpenTimer = 0
        let chipHoverCloseTimer = 0

        function cancelChipTimers() {
          if (chipHoverOpenTimer !== 0) {
            window.clearTimeout(chipHoverOpenTimer)
            chipHoverOpenTimer = 0
          }
          if (chipHoverCloseTimer !== 0) {
            window.clearTimeout(chipHoverCloseTimer)
            chipHoverCloseTimer = 0
          }
        }

        function scheduleHoverOpen(anchor) {
          if (panelOpen || panelOpenedByHover) return
          if (chipHoverCloseTimer !== 0) {
            window.clearTimeout(chipHoverCloseTimer)
            chipHoverCloseTimer = 0
          }
          chipHoverOpenTimer = window.setTimeout(() => {
            chipHoverOpenTimer = 0
            if (panelOpen) return
            panelOpenedByHover = true
            openPanel(anchor)
          }, 140)
        }

        /** composer 上批注按钮的悬停面板：指针移开就收起（与弹层的 scheduleHoverClose 是两套状态）。*/
        function scheduleChipHoverClose() {
          if (!panelOpen || !panelOpenedByHover) return
          if (chipHoverCloseTimer !== 0) return
          chipHoverCloseTimer = window.setTimeout(() => {
            chipHoverCloseTimer = 0
            if (panelOpenedByHover && !panelHovered) closePanel()
          }, 220)
        }

        /** 面板底部的图片设置是否展开。*/
        let imageSettingsOpen = false
        /** 面板底部的批注指令设置是否展开。*/
        let instructionSettingsOpen = false
        let fallbackSettingsOpen = false

        function button(className, text, onClick) {
          const created = el('button', className, text)
          created.type = 'button'
          created.addEventListener('click', onClick)
          return created
        }

        /**
         * 面板贴着按钮放，优先在按钮上方；高度按上下可用空间自适应。
         * 按钮位置只在打开时量一次：侧栏开合会让按钮挪动，面板留在原地。
         */
        function positionPanel() {
          if (!panelOpen || panelAnchor === null) return
          if (panelAnchorRect === null) {
            const measured = safe(() => panelAnchor.getBoundingClientRect())
            if (measured === undefined) return
            panelAnchorRect = { top: measured.top, bottom: measured.bottom, right: measured.right }
          }
          const rect = panelAnchorRect
          const width = panelEl.offsetWidth || 360
          const viewport = window.innerHeight
          const spaceAbove = rect.top - 16
          const spaceBelow = viewport - rect.bottom - 16
          // 上方放得下就优先上方；上方太窄时改用下方，两者都窄就取更高的一侧并封顶到 72vh。
          const preferAbove = spaceAbove >= 260 || spaceBelow < 260
          const available = Math.max(200, Math.min(preferAbove ? spaceAbove : spaceBelow, viewport * 0.72))
          panelEl.style.maxHeight = `${Math.round(available)}px`
          const height = panelEl.offsetHeight || 240
          const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
          const above = rect.top - height - 8
          const top = above >= 8 ? above : Math.min(rect.bottom + 8, viewport - height - 8)
          panelRoot.style.left = `${left}px`
          panelRoot.style.top = `${Math.max(8, Math.min(top, viewport - height - 8))}px`
          panelWidthSeen = width
          panelHeightSeen = height
        }

        /**
         * 窗口尺寸变化后的兜底：面板已经定格，只在它被挤出视口时夹回来，
         * 不按按钮的新位置重新排版。
         */
        function clampPanelToViewport() {
          if (!panelOpen) return
          const left = Number.parseFloat(panelRoot.style.left)
          const top = Number.parseFloat(panelRoot.style.top)
          if (!Number.isFinite(left) || !Number.isFinite(top)) return
          const width = panelEl.offsetWidth || 360
          const height = panelEl.offsetHeight || 240
          const maxLeft = Math.max(8, window.innerWidth - width - 8)
          const maxTop = Math.max(8, window.innerHeight - height - 8)
          const nextLeft = Math.min(Math.max(left, 8), maxLeft)
          const nextTop = Math.min(Math.max(top, 8), maxTop)
          if (nextLeft !== left) panelRoot.style.left = `${nextLeft}px`
          if (nextTop !== top) panelRoot.style.top = `${nextTop}px`
        }

        /** 记下「正在改窗口尺寸」：这段时间里 ResizeObserver 报的尺寸变化不算内容变化。*/
        function markViewportResize() {
          viewportResizing = true
          if (viewportResizeTimer !== 0) window.clearTimeout(viewportResizeTimer)
          viewportResizeTimer = window.setTimeout(() => {
            viewportResizeTimer = 0
            viewportResizing = false
          }, 160)
        }

        /**
         * 统一的网页元素处理：浏览器标签页的拾取与 HTML 文件预览的拾取都走这里。
         * picked.anchor 是已换算好的窗口坐标；picked.fromPreview 表示来自文件预览，
         * 此时无法用 webview 截图，跳过截图即可。
         */
        async function acceptWebPick(picked) {
          const anchor = picked.anchor !== undefined && picked.anchor !== null ? picked.anchor : webAnchor(picked.rect)
          const existing = annotations.find(
            (candidate) =>
              candidate.source !== null &&
              candidate.source !== undefined &&
              candidate.source.kind === 'web' &&
              candidate.source.anchorKey === picked.selector,
          )
          if (picked.action === 'delete') {
            const target = annotations.find((candidate) => candidate.id === picked.id)
            if (target !== undefined) removeAnnotation(target.id)
            return
          }
          if (picked.action === 'modify' || picked.action === 'open') {
            const target = annotations.find((candidate) => candidate.id === picked.id)
            if (target !== undefined) openEditPopover(target.id, anchor, 'manual')
            return
          }
          // 同一元素只保留一条网页批注：已有就直接打开那一条，不再新建。
          if (existing !== undefined) {
            openEditPopover(existing.id, anchor, 'manual')
            return
          }
          const adopt = picked.action === 'adopt'
          const shot =
            picked.fromPreview === true ? undefined : await webPicker.capture(imageSettingsOf().webShot ?? 'element', picked.rect)
          const images =
            shot === undefined
              ? []
              : [
                  {
                    id: `img-web-${Date.now().toString(36)}`,
                    name: `网页截图-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.png`,
                    dataUrl: shot,
                    thumb: shot,
                    preview: shot,
                    bytes: Math.round((shot.length * 3) / 4),
                  },
                ]
          const item = addAnnotation({
            quote: picked.quote !== '' ? picked.quote : picked.selector,
            note: adopt ? adoptTextOf() : '',
            images,
            source: {
              kind: 'web',
              anchorKey: picked.selector,
              path: picked.url,
              textOrigin: 'rendered',
            },
          })
          if (item === undefined) return
          if (!adopt) openEditPopover(item.id, anchor, 'manual')
        }

        const webPicker = createWebPicker({
          onPick: acceptWebPick,
        })
        webPickerHandle = webPicker
        webPicker.start()

        // 装了 dsh-better-sidebar 时，文件预览走它自己的沙箱 iframe；这里在它生成
        // HTML blob 时补一份拾取脚本，让它的预览也能批注。没有该类预览时它不生效。
        const previewBridge = createPreviewBridge({
          onPick: acceptWebPick,
          getNotes: () =>
            annotations
              .filter((item) => item.source !== null && item.source !== undefined && item.source.kind === 'web')
              .map((item) => ({
                id: item.id,
                path: item.source.path,
                selector: item.source.anchorKey,
                adopt: hasAdoptNote(item.note),
              })),
        })
        previewBridge.start()

        /**
         * HTML 文件预览：DSH 内置预览用 sandbox iframe，父页面读不到里面的 DOM。
         * 我们注册一个更高优先级的 HTML 预览实现，自己生成同源受限的 iframe，
         * 在文档里注入同一套拾取脚本，拾取结果经 postMessage 回传。
         */
        const HTML_PREVIEW_ID = 'dsh-selection-annotations/html-preview'
        const HTML_PREVIEW_BRIDGE = String.raw`(function () {
  try {
    Object.defineProperty(window, '__saPicked', {
      configurable: true,
      get: function () { return null },
      set: function (value) {
        if (value && window.parent !== window) window.parent.postMessage({ __saPreviewPick: value }, '*')
      },
    })
  } catch (error) {}
  window.addEventListener('message', function (event) {
    var data = event.data
    if (!data || !Array.isArray(data.__saPreviewNotes)) return
    window.__saWebNotes = data.__saPreviewNotes
    try { window.__saWebRender && window.__saWebRender() } catch (error) {}
  })
})();`

        function decodePreviewText(data) {
          if (typeof data === 'string') return data
          try {
            return new TextDecoder('utf-8').decode(data)
          } catch {
            return ''
          }
        }

        function buildHtmlPreviewDocument(data) {
          let text = decodePreviewText(data)
          // 开发者模式打开时 DSH 传的是打包后的 HTML，数据是 { html, assets }。
          try {
            const bundle = JSON.parse(text)
            if (bundle !== null && typeof bundle === 'object' && typeof bundle.html === 'string') text = bundle.html
          } catch {}
          let doc
          try {
            doc = new DOMParser().parseFromString(text, 'text/html')
          } catch {
            return ''
          }
          if (doc === null || doc.documentElement === null) return ''
          for (const node of Array.from(doc.querySelectorAll('script,iframe,object,embed,base,frame'))) node.remove()
          for (const node of Array.from(doc.querySelectorAll('*'))) {
            for (const attr of Array.from(node.attributes ?? [])) {
              if (/^on/iu.test(attr.name) || attr.name === 'srcdoc') node.removeAttribute(attr.name)
            }
          }
          const head = doc.head ?? doc.documentElement
          const csp = doc.createElement('meta')
          csp.setAttribute('http-equiv', 'Content-Security-Policy')
          csp.setAttribute(
            'content',
            "default-src 'none'; script-src 'nonce-sa-preview'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'",
          )
          head.prepend(csp)
          const script = doc.createElement('script')
          script.setAttribute('nonce', 'sa-preview')
          script.textContent = `${HTML_PREVIEW_BRIDGE}\n${PICK_SCRIPT}`
          ;(doc.body ?? doc.documentElement).appendChild(script)
          return `<!doctype html>${doc.documentElement.outerHTML}`
        }

        function HtmlPreviewBody(props) {
          const frameRef = React.useRef(null)
          const content = props !== null && props !== undefined ? props.content : undefined
          const data = content !== null && content !== undefined ? content.data : undefined
          const tabInfo = safe(() => (typeof props.useTabInfo === 'function' ? props.useTabInfo() : undefined))
          const tab = tabInfo !== null && tabInfo !== undefined && tabInfo.tab !== undefined ? tabInfo.tab : tabInfo
          const filePath = String(
            (props !== null && props !== undefined && props.resourceAddress) ?? (tab !== undefined ? tab.title : '') ?? 'HTML',
          )
          const source = React.useMemo(() => buildHtmlPreviewDocument(data), [data])
          const frameUrl = React.useMemo(() => {
            if (source === '') return ''
            try {
              return URL.createObjectURL(new Blob([source], { type: 'text/html' }))
            } catch {
              return ''
            }
          }, [source])
          React.useEffect(
            () => () => {
              if (frameUrl !== '') URL.revokeObjectURL(frameUrl)
            },
            [frameUrl],
          )

          React.useEffect(() => {
            const frame = frameRef.current
            if (frame === null || frame === undefined) return undefined
            const onMessage = (event) => {
              if (event.source !== frame.contentWindow) return
              const picked = event.data !== null && typeof event.data === 'object' ? event.data.__saPreviewPick : undefined
              if (picked === null || picked === undefined) return
              const base = frame.getBoundingClientRect()
              const inner = picked.rect ?? {}
              const rect = {
                left: Number(inner.left ?? 0),
                top: Number(inner.top ?? 0),
                width: Number(inner.width ?? 0),
                height: Number(inner.height ?? 0),
              }
              const anchor = {
                getBoundingClientRect: () => ({
                  left: base.left + rect.left,
                  top: base.top + rect.top,
                  width: rect.width,
                  height: rect.height,
                  right: base.left + rect.left + rect.width,
                  bottom: base.top + rect.top + rect.height,
                }),
              }
              try {
                acceptWebPick({
                  action: picked.action,
                  id: picked.id,
                  quote: typeof picked.label === 'string' ? picked.label : '',
                  selector: typeof picked.selector === 'string' ? picked.selector : '',
                  text: typeof picked.text === 'string' ? picked.text : '',
                  url: filePath,
                  rect,
                  anchor,
                  fromPreview: true,
                })
              } catch (error) {
                warn('[selection-annotations] 处理 HTML 预览批注失败：', error)
              }
            }
            const sync = () => {
              const notes = annotations
                .filter((item) => item.source !== null && item.source !== undefined && item.source.kind === 'web' && item.source.path === filePath)
                .map((item) => ({ id: item.id, selector: item.source.anchorKey, adopt: hasAdoptNote(item.note) }))
              try {
                if (frame.contentWindow !== null) frame.contentWindow.postMessage({ __saPreviewNotes: notes }, '*')
              } catch {}
            }
            window.addEventListener('message', onMessage)
            frame.addEventListener('load', sync)
            const timer = window.setInterval(sync, 800)
            sync()
            return () => {
              window.removeEventListener('message', onMessage)
              frame.removeEventListener('load', sync)
              window.clearInterval(timer)
            }
          }, [filePath, source])

          return h('iframe', {
            ref: frameRef,
            src: frameUrl,
            sandbox: 'allow-scripts',
            title: 'HTML 批注预览',
            'data-sa-html-preview': '1',
            style: {
              width: '100%',
              height: '100%',
              minHeight: '240px',
              border: '0',
              display: 'block',
              background: 'var(--dsw-alias-bg-base, Canvas)',
            },
          })
        }

        ctx.effect(() => {
          const previews = safe(() => ctx.documentPreviews)
          if (previews === undefined || previews === null || typeof previews.register !== 'function') return undefined
          try {
            return previews.register({
              id: HTML_PREVIEW_ID,
              extensions: ['html', 'htm'],
              priority: 'extension',
              title: () => 'HTML',
              loading: 'bytes-complete',
              wrap: false,
            })
          } catch (error) {
            // 热加载时旧实例可能还没释放，重复注册同一 id 会抛错。
            warn('[selection-annotations] HTML 预览注册失败：', error)
            return undefined
          }
        }, 'selection-annotations: html preview definition')
        ctx.effect(() => {
          if (ctx.slots === undefined) return undefined
          try {
            return ctx.slots.inject('sidebar.right.tab.document', () =>
              ctx.slots.register(
                { name: 'sidebar.right.tab.document', key: HTML_PREVIEW_ID, locale: LOCALE_NS, inject: () => ({}) },
                HtmlPreviewBody,
              ),
            )
          } catch (error) {
            warn('[selection-annotations] HTML 预览槽位注册失败：', error)
            return undefined
          }
        }, 'selection-annotations: html preview body')

        const SIDE_TAB_ID = 'dsh-selection-annotations'
        const SIDE_TAB_KIND = 'selection-annotations'
        /** 按钮状态采样间隔：页签增删靠订阅，切换页签/收起侧栏没有公开事件，才退化到定时采样。 */
        const SIDE_TAB_SYNC_MS = 800

        /** 当前会话里的批注页签记录；侧栏服务、会话或页签任一缺失时返回 undefined。 */
        function findSideAnnotationsTab() {
          const service = safe(() => ctx.sidebarRight)
          if (service === undefined || service === null || typeof service.tabsIn !== 'function') return undefined
          const sessionId = currentSessionId()
          if (typeof sessionId !== 'string' || sessionId === '') return undefined
          const tabs = safe(() => service.tabsIn(sessionId))
          if (!Array.isArray(tabs)) return undefined
          return tabs.find((tab) => tab !== null && tab !== undefined && tab.kind === SIDE_TAB_KIND)
        }

        /** 按钮决策要看的三份事实：页签记录、侧栏是否展开、该页签是否当前激活。 */
        function sideTabState() {
          const tab = findSideAnnotationsTab()
          const service = safe(() => ctx.sidebarRight)
          const usable = tab !== undefined && service !== undefined && service !== null
          const expanded = usable ? safe(() => service.isExpanded()) === true : false
          const active = usable
            ? safe(() => {
              const current = service.active()
              return current !== undefined && current !== null && current.id === tab.id
            }) === true
            : false
          return { tab, hasTab: tab !== undefined, expanded, active }
        }

        /**
         * 按钮此刻是否显示「关闭」：只有「页签开着、侧栏展开、且这个页签是活动页签」这一种。
         * 侧栏收成窄条时正文看不见，按钮的动作是展开而不是关闭；用户切到别的页签也回「未打开」，
         * 再点一下会把批注页签重新聚焦，而不是什么都不发生。
         */
        function sideAnnotationsTabOpen() {
          return sideTabAction(sideTabState()) === 'close'
        }

        let sideTabSyncTimer = 0
        /** 侧栏快照的退订函数：页签增删、在屏会话切换时立刻重画按钮。 */
        let sideTabUnsubscribers = []
        /** 上一次画到按钮上的开合状态；null 表示还没有画过。 */
        let sideTabPaintedOpen = null

        /** 把按钮状态对齐到侧栏的真实状态；状态没变就不重画，避免打断面板里的操作。 */
        function syncSideTabButton() {
          const open = sideAnnotationsTabOpen()
          if (open === sideTabPaintedOpen) return
          sideTabPaintedOpen = open
          // 侧栏开合会让按钮挪位，但面板位置在打开时已经定格，这里不重排。
          renderPanel()
        }

        /** 订阅侧栏公开的快照；拿不到的入口跳过，后面的采样负责兜底。 */
        function subscribeSideTabSources() {
          const service = safe(() => ctx.sidebarRight)
          if (service === undefined || service === null) return
          for (const source of [safe(() => service.openTabs), safe(() => service.mounted)]) {
            if (source === undefined || source === null || typeof source.subscribe !== 'function') continue
            const unsubscribe = safe(() => source.subscribe(syncSideTabButton))
            if (typeof unsubscribe === 'function') sideTabUnsubscribers.push(unsubscribe)
          }
        }

        function startSideTabSync() {
          if (sideTabSyncTimer !== 0) return
          // 事件优先：openTabs 覆盖页签增删（含用户从侧栏关掉页签），mounted 覆盖在屏会话切换。
          subscribeSideTabSources()
          // 退化轮询：active() 与 isExpanded() 没有公开的订阅入口，openTabs 也只在增删时发布，
          // 用户切换页签或把侧栏收成窄条时只能定时采样；面板关闭即 stop，不会常驻。
          sideTabSyncTimer = window.setInterval(syncSideTabButton, SIDE_TAB_SYNC_MS)
        }

        function stopSideTabSync() {
          if (sideTabSyncTimer !== 0) {
            window.clearInterval(sideTabSyncTimer)
            sideTabSyncTimer = 0
          }
          for (const unsubscribe of sideTabUnsubscribers) safe(() => unsubscribe())
          sideTabUnsubscribers = []
        }

        /** 关闭当前会话里的批注页签；服务缺失或页签已不存在时保持原状。 */
        function closeSideAnnotationsTab() {
          const service = safe(() => ctx.sidebarRight)
          const tab = findSideAnnotationsTab()
          const sessionId = currentSessionId()
          if (service === undefined || service === null || tab === undefined) {
            warn('[selection-annotations] 右侧边栏没有可关闭的批注标签页')
            return
          }
          try {
            if (typeof service.closeIn === 'function' && typeof sessionId === 'string' && sessionId !== '') {
              service.closeIn(sessionId, tab.id)
              return
            }
            if (typeof service.close === 'function') {
              service.close(tab.id)
              return
            }
            warn('[selection-annotations] 右侧边栏没有可用的关闭方法')
          } catch (error) {
            warn('[selection-annotations] 关闭右侧批注标签页失败：', error)
          }
        }

        /** 聚焦已有页签；侧栏收起时先展开再聚焦，避免用户看不见被聚焦的页签。 */
        function focusSideAnnotationsTab(tab, expand) {
          const service = safe(() => ctx.sidebarRight)
          if (service === undefined || service === null || tab === undefined) return
          try {
            if (expand === true && typeof service.toggleExpanded === 'function') service.toggleExpanded()
            if (typeof service.focus === 'function') {
              service.focus(tab.id)
              return
            }
            // 没有 focus 时退回 openTabIn：已存在的页签会被聚焦并展开，不会重复开。
            openSideAnnotationsTab()
          } catch (error) {
            warn('[selection-annotations] 聚焦右侧批注标签页失败：', error)
          }
        }

        /** 总览右下角按钮：按页签当前状态打开、聚焦、展开或关闭。 */
        function toggleSideAnnotationsTab() {
          const state = sideTabState()
          const action = sideTabAction(state)
          if (action === 'close') closeSideAnnotationsTab()
          else if (action === 'focus') focusSideAnnotationsTab(state.tab, false)
          else if (action === 'reveal') focusSideAnnotationsTab(state.tab, true)
          else openSideAnnotationsTab()
          // 动作会同步提交，立刻重画；侧栏异步渲染的结果由订阅和采样补齐。
          syncSideTabButton()
        }

        function openSideAnnotationsTab() {
          const service = safe(() => ctx.sidebarRight)
          if (service === undefined || service === null) {
            warn('[selection-annotations] 当前环境没有右侧边栏，无法打开批注标签页')
            return
          }
          const sessionId = currentSessionId()
          try {
            // 与 TODO 便签同一套调用：必须带会话 id，否则不知道开在哪个会话的侧栏里。
            if (typeof service.openTabIn === 'function' && typeof sessionId === 'string' && sessionId !== '') {
              service.openTabIn(sessionId, SIDE_TAB_KIND, {})
              return
            }
            if (typeof service.openTab === 'function') {
              service.openTab(SIDE_TAB_KIND)
              return
            }
            warn('[selection-annotations] 右侧边栏没有可用的打开方法')
          } catch (error) {
            warn('[selection-annotations] 打开右侧批注标签页失败：', error)
          }
        }

        /** 右侧标签页的正文：复用批注总览的渲染，保证结构、图片、拖动与设置区一致。 */
        function SideTabBody() {
          const hostRef = React.useRef(null)
          React.useEffect(() => {
            const host = hostRef.current
            if (host === null) return undefined
            const paint = () => renderSideTabInto(host)
            paint()
            const timer = window.setInterval(paint, 800)
            return () => window.clearInterval(timer)
          }, [])
          return h('div', { className: 'sa-side-host', 'data-sa-ui': 'side', ref: hostRef })
        }

        /** 延迟到面板渲染器初始化之后再取；SideTabBody 真正挂载时一定已经初始化。 */
        function renderSideTabInto(host) {
          // 内容没变就不重建：侧栏每 0.8 秒重画一次会制造大量 DOM 变动，
          // 既打断侧栏里的选择，也让会话页的观察器误以为有新消息。
          const signature = annotations
            .map((item) => `${item.id}:${item.number}:${item.note}:${(item.images ?? []).length}`)
            .join('|')
          if (host.dataset.saSignature === signature && host.childNodes.length > 0) return
          host.dataset.saSignature = signature
          try {
            panelRenderer.renderSide(host)
          } catch (error) {
            host.textContent = `批注面板渲染失败：${error !== null && error !== undefined && error.stack !== undefined ? error.stack : String(error)}`
            host.style.whiteSpace = 'pre-wrap'
            host.style.padding = '10px 12px'
            host.style.color = '#ffb3b3'
            host.style.font = '12px/1.5 ui-monospace,monospace'
          }
        }

        function SideTabTitle() {
          return h('span', null, t('sideTab.title'))
        }

        ctx.effect(() => {
          const tabs = safe(() => ctx.sidebarRightTabs)
          if (tabs === undefined || tabs === null || typeof tabs.register !== 'function') return
          try {
            return tabs.register({
              id: SIDE_TAB_ID,
              kind: SIDE_TAB_KIND,
              multiple: false,
              priority: 'builtin',
              title: () => t('sideTab.title'),
              guide: [],
            })
          } catch (error) {
            // 热加载时旧实例可能尚未释放，重复注册同一 id 会抛错；不能让它带崩整个插件。
            warn('[selection-annotations] 右侧批注标签页注册失败：', error)
            return undefined
          }
        }, 'selection-annotations: side tab type')
        ctx.effect(() => {
          if (ctx.slots === undefined) return
          try {
            return ctx.slots.inject('sidebar.right.pane.tab', () =>
              ctx.slots.register(
                { name: 'sidebar.right.pane.tab', key: SIDE_TAB_ID, locale: LOCALE_NS, inject: () => ({}) },
                SideTabBody,
              ),
            )
          } catch (error) {
            warn('[selection-annotations] 右侧批注标签页正文注册失败：', error)
            return undefined
          }
        }, 'selection-annotations: side tab body')
        ctx.effect(() => {
          if (ctx.slots === undefined) return
          try {
            return ctx.slots.inject('sidebar.right.pane.tab.title', () =>
              ctx.slots.register(
                { name: 'sidebar.right.pane.tab.title', key: SIDE_TAB_ID, locale: LOCALE_NS, inject: () => ({}) },
                SideTabTitle,
              ),
            )
          } catch (error) {
            warn('[selection-annotations] 右侧批注标签页标题注册失败：', error)
            return undefined
          }
        }, 'selection-annotations: side tab title')

        /**
         * 把网页内部元素的矩形换算成 DSH 窗口坐标，供批注弹层贴在该元素旁。
         * 页面里的坐标以 webview 左上角为原点。
         */
        function webAnchor(rect) {
          if (rect === null || rect === undefined) return null
          const webview =
            document.querySelector('webview[data-sidebar-browser-frame="webview"]') ??
            document.querySelector('webview')
          const offset = safe(() => webview?.getBoundingClientRect()) ?? { left: 0, top: 0 }
          const left = offset.left + Number(rect.left ?? 0)
          const top = offset.top + Number(rect.top ?? 0)
          const width = Number(rect.width ?? 0)
          const height = Number(rect.height ?? 0)
          return {
            getBoundingClientRect: () => ({
              left,
              top,
              width,
              height,
              right: left + width,
              bottom: top + height,
            }),
          }
        }

        const panelRenderer = createPanelRenderer({
          t,
          closePanel: () => closePanel(),
          getAnnotations: () => annotations,
          clearAnnotations: () => clearAnnotations(),
          copyAll: (root) => copyAnnotationsToClipboard(annotations, root),
          pasteAnnotations: (root) => pasteAnnotationsFromClipboard(root),
          copyItem: (item, root) => copyAnnotationsToClipboard([item], root),
          moveAnnotation: (from, to) => moveAnnotation(from, to),
          openEditPopover: (id, head) => openEditPopover(id, head),
          jumpToQuote: (item, root) => jumpToQuote(item, undefined, root),
          removeAnnotation: (id) => removeAnnotation(id),
          sourceSummary: (item) => sourceSummary(item),
          openImageViewer: (url, name) => openImageViewer(url, name),
          imageSettingsRow: () => imageSettingsRow(),
          instructionSettingsRow: () => instructionSettingsRow(),
          fallbackSettingsRow: () => fallbackSettingsRow(),
          openSideTab: () => toggleSideAnnotationsTab(),
          isSideTabOpen: () => sideAnnotationsTabOpen(),
          noteView: noteViewOf,
          getHintText: (surface) => panelHintTextOf(surface),
        })
        const renderPanel = () => panelRenderer.render(panelEl)

        /** 统一的小箭头：与「已发送/批注答复」同一套矢量路径。 */
        function settingsChevron() {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.setAttribute('viewBox', '0 0 16 16')
          svg.setAttribute('width', '12')
          svg.setAttribute('height', '12')
          svg.setAttribute('aria-hidden', 'true')
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          path.setAttribute('d', 'M6.2 3.6 10.7 8l-4.5 4.4')
          path.setAttribute('fill', 'none')
          path.setAttribute('stroke', 'currentColor')
          path.setAttribute('stroke-width', '1.8')
          path.setAttribute('stroke-linecap', 'round')
          path.setAttribute('stroke-linejoin', 'round')
          svg.appendChild(path)
          return svg
        }

        /** 面板设置块的统一外壳：同一条折叠动画，恢复默认放在标题行右侧、仅在展开时出现。 */
        function settingsSection(options) {
          let open = options.open === true
          const box = el('div', 'sa-settings')
          const head = el('div', 'sa-settings-head')
          const toggle = button('sa-link sa-settings-toggle', '', () => {
            open = !open
            apply()
            if (typeof options.onOpenChange === 'function') options.onOpenChange(open)
          })
          toggle.appendChild(settingsChevron())
          toggle.appendChild(el('span', 'sa-settings-toggle-label', options.label))
          const status = el('span', 'sa-hint', typeof options.getStatus === 'function' ? options.getStatus() : '')
          head.appendChild(toggle)
          head.appendChild(status)
          let restore = null
          if (typeof options.onRestore === 'function') {
            restore = button('sa-link sa-settings-restore', t('settings.restore'), () => {
              options.onRestore()
              status.textContent = typeof options.getStatus === 'function' ? options.getStatus() : ''
            })
            if (options.restoreTitle !== undefined) restore.title = options.restoreTitle
            head.appendChild(restore)
          }
          const wrap = el('div', 'sa-settings-body')
          const inner = el('div', 'sa-settings-inner')
          inner.append(...options.body)
          wrap.appendChild(inner)
          box.appendChild(head)
          box.appendChild(wrap)
          const apply = () => {
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
            wrap.dataset.open = open ? '1' : '0'
            if (restore !== null) restore.hidden = !open
          }
          apply()
          return {
            box,
            refreshStatus() {
              status.textContent = typeof options.getStatus === 'function' ? options.getStatus() : ''
            },
          }
        }

        /** 面板底部的图片设置：压缩开关、JPEG 质量、触发压缩的最短边。 */
        function imageSettingsRow() {
          const settings = imageSettingsOf()
          const compressRow = el('label', 'sa-setting')
          const compress = document.createElement('input')
          compress.type = 'checkbox'
          compress.checked = settings.compress
          compress.addEventListener('change', () => {
            imageSettingsOf().compress = compress.checked
            persistImageSettings()
            section.refreshStatus()
          })
          compressRow.append(compress, document.createTextNode(t('settings.compress')))

          const qualityRow = el('label', 'sa-setting')
          const quality = document.createElement('input')
          quality.type = 'range'
          quality.min = '0.5'
          quality.max = '1'
          quality.step = '0.05'
          quality.value = String(settings.quality)
          const qualityText = el('span', 'sa-setting-value', `${Math.round(settings.quality * 100)}%`)
          quality.addEventListener('input', () => {
            imageSettingsOf().quality = Number(quality.value)
            qualityText.textContent = `${Math.round(Number(quality.value) * 100)}%`
            persistImageSettings()
            section.refreshStatus()
          })
          qualityRow.append(document.createTextNode(t('settings.quality')), quality, qualityText)

          const sizeRow = el('label', 'sa-setting')
          const size = document.createElement('input')
          size.type = 'number'
          size.className = 'sa-setting-number'
          size.min = '0'
          size.max = '4096'
          size.step = '10'
          size.value = String(settings.minSize)
          size.addEventListener('change', () => {
            const next = Number(size.value)
            imageSettingsOf().minSize = Number.isFinite(next)
              ? Math.min(4096, Math.max(0, Math.round(next)))
              : DEFAULT_IMAGE_SETTINGS.minSize
            persistImageSettings()
          })
          sizeRow.append(document.createTextNode(t('settings.minSizeBefore')), size, document.createTextNode(t('settings.minSizeAfter')))

          const shotRow = el('label', 'sa-setting')
          const shot = document.createElement('select')
          shot.className = 'sa-setting-select'
          for (const [value, label] of [
            ['off', t('settings.webShotOff')],
            ['element', t('settings.webShotElement')],
            ['page', t('settings.webShotPage')],
          ]) {
            const option = document.createElement('option')
            option.value = value
            option.textContent = label
            shot.appendChild(option)
          }
          shot.value = settings.webShot ?? 'element'
          shot.addEventListener('change', () => {
            const next = shot.value === 'off' || shot.value === 'page' ? shot.value : 'element'
            imageSettingsOf().webShot = next
            persistImageSettings()
            section.refreshStatus()
          })
          shotRow.append(document.createTextNode(t('settings.webShot')), shot)

          const section = settingsSection({
            open: imageSettingsOpen,
            label: t('settings.imagesClosed'),
            getStatus: () =>
              imageSettingsOf().compress
                ? t('settings.imagesOn', { n: Math.round(imageSettingsOf().quality * 100) })
                : t('settings.imagesOff'),
            body: [compressRow, qualityRow, sizeRow, shotRow],
            onRestore: () => {
              const next = { ...DEFAULT_IMAGE_SETTINGS }
              const current = imageSettingsOf()
              current.compress = next.compress
              current.quality = next.quality
              current.minSize = next.minSize
              current.webShot = next.webShot
              persistImageSettings()
              shot.value = next.webShot
              compress.checked = next.compress
              quality.value = String(next.quality)
              qualityText.textContent = `${Math.round(next.quality * 100)}%`
              size.value = String(next.minSize)
            },
            onOpenChange: (open) => {
              imageSettingsOpen = open
            },
          })
          return section.box
        }

        /** 面板底部的批注指令设置：可编辑，一键恢复默认。*/
        function instructionSettingsRow() {
          const area = document.createElement('textarea')
          area.className = 'sa-setting-textarea'
          area.rows = 6
          area.value = instructionOf()
          area.addEventListener('input', () => {
            persistInstructionSettings(area.value)
            section.refreshStatus()
          })
          area.addEventListener('blur', () => {
            if (area.value.trim() !== '') return
            area.value = defaultInstruction()
            persistInstructionSettings(defaultInstruction())
            section.refreshStatus()
          })

          const section = settingsSection({
            open: instructionSettingsOpen,
            label: t('settings.instructionClosed'),
            getStatus: () => (isDefaultInstruction(instructionOf()) ? t('settings.default') : t('settings.customized')),            body: [area],
            restoreTitle: t('settings.instrHint'),
            onRestore: () => {
              persistInstructionSettings(defaultInstruction())
              area.value = instructionOf()
            },
            onOpenChange: (open) => {
              instructionSettingsOpen = open
            },
          })
          return section.box
        }

        /** 面板里的空提示词填充设置：和批注指令同一套折叠头、状态与恢复默认。 */
        function fallbackSettingsRow() {
          const area = document.createElement('textarea')
          area.className = 'sa-setting-textarea sa-setting-textarea-compact'
          area.rows = 3
          area.value = fallbackTextOf()
          area.setAttribute('aria-label', t('settings.fallbackLabel'))
          area.addEventListener('input', () => {
            persistFallbackText(area.value)
            section.refreshStatus()
          })
          area.addEventListener('blur', () => {
            if (area.value.trim() !== '') return
            area.value = DEFAULT_FALLBACK_TEXT
            persistFallbackText(DEFAULT_FALLBACK_TEXT)
            section.refreshStatus()
          })

          const section = settingsSection({
            open: fallbackSettingsOpen,
            label: t('settings.fallbackClosed'),
            getStatus: () =>
              fallbackTextOf().trim() === DEFAULT_FALLBACK_TEXT.trim()
                ? t('settings.default')
                : t('settings.customized'),
            body: [area],
            restoreTitle: t('settings.fallbackHint'),
            onRestore: () => {
              persistFallbackText(DEFAULT_FALLBACK_TEXT)
              area.value = fallbackTextOf()
            },
            onOpenChange: (open) => {
              fallbackSettingsOpen = open
            },
          })
          return section.box
        }

        /** 面板内容高度变化时重渲染并重新定位；面板在上方时底边因此保持不动。*/
        function refreshPanel() {
          renderPanel()
          if (panelOpen) positionPanel()
          // 右侧标签页平时靠 800ms 轮询刷新；拖动结束要立即换新，位移动画才作用在新节点上。
          for (const host of document.querySelectorAll('[data-sa-ui="side"]')) renderSideTabInto(host)
        }

        function openPanel(anchor) {
          panelOpen = true
          panelAnchor = anchor
          // 每次打开都按按钮的当前位置重新量一次；打开后位置就定格。
          panelAnchorRect = null
          cancelChipTimers()
          if (panelHideTimer !== 0) {
            window.clearTimeout(panelHideTimer)
            panelHideTimer = 0
          }
          panelRoot.style.display = ''
          panelRoot.dataset.open = '0'
          // 先按真实状态画一次按钮，之后由轮询跟上用户在侧栏里的关页签、切页签。
          sideTabPaintedOpen = sideAnnotationsTabOpen()
          renderPanel()
          positionPanel()
          // 先强制回流，确保从隐藏态开始过渡。
          void panelRoot.offsetHeight
          panelRoot.dataset.open = '1'
          startSideTabSync()
          emit()
        }

        function closePanel() {
          if (!panelOpen) return
          panelOpen = false
          panelAnchor = null
          panelAnchorRect = null
          stopSideTabSync()
          sideTabPaintedOpen = null
          cancelChipTimers()
          panelOpenedByHover = false
          panelHovered = false
          panelRoot.dataset.open = '0'
          if (panelHideTimer !== 0) window.clearTimeout(panelHideTimer)
          panelHideTimer = window.setTimeout(() => {
            panelHideTimer = 0
            if (!panelOpen) panelRoot.style.display = 'none'
          }, 180)
          emit()
        }

        panelRoot.addEventListener('mouseenter', () => {
          panelHovered = true
          if (chipHoverCloseTimer !== 0) {
            window.clearTimeout(chipHoverCloseTimer)
            chipHoverCloseTimer = 0
          }
        })
        panelRoot.addEventListener('mouseleave', () => {
          panelHovered = false
          scheduleChipHoverClose()
        })

        const onPanelOutsidePointerDown = (event) => {
          if (!panelOpen) return
          const target = elementOf(event.target)
          if (target === null) return
          if (target.closest('[data-sa-ui="panel"]') !== null) return
          if (target.closest('[data-sa-ui="popover"]') !== null) return
          if (target.closest('.sa-chip') !== null) return
          closePanel()
        }
        document.addEventListener('pointerdown', onPanelOutsidePointerDown, true)
        const onPanelEscapeKeyDown = (event) => {
          if (event.key === 'Escape') closePanel()
        }
        document.addEventListener('keydown', onPanelEscapeKeyDown)

        // 批注集合或面板开合变化时重渲染面板正文（订阅由 store 的 emit 驱动）。
        subscribe(() => {
          if (panelOpen) {
            renderPanel()
            positionPanel()
          }
        })

        /** composer 工具行里的触发按钮（紧挨发送按钮），只占一个紧凑控件位。*/
        function AnnotateButton(props) {
          const [local, setLocal] = React.useState(() => ({ items: snapshot(), open: panelOpen }))
          const propSessionId = props?.sessionId
          const propInputActions = props?.inputActions
          if (typeof propSessionId === 'string' && propSessionId !== '') latestSessionId = propSessionId
          if (propInputActions !== undefined && propInputActions !== null) latestInputActions = propInputActions

          React.useEffect(() => subscribe(() => setLocal({ items: snapshot(), open: panelOpen })), [])
          React.useEffect(() => {
            if (typeof propSessionId === 'string' && propSessionId !== '') adoptSession(propSessionId)
          }, [propSessionId])

          const count = local.items.length
          return h(
            'button',
            {
              className: `sa-chip${count > 0 ? ' sa-chip-has' : ''}${local.open ? ' sa-chip-open' : ''}`,
              type: 'button',
              title: count === 0 ? t('chip.emptyTitle') : t('chip.title'),
              onMouseEnter: (event) => scheduleHoverOpen(event.currentTarget),
              onMouseLeave: () => scheduleChipHoverClose(),
              onClick: (event) => {
                cancelChipTimers()
                // 点击是持久的开合；悬停只是临时展开，移开就收回去。
                if (panelOpen && !panelOpenedByHover) {
                  closePanel()
                  return
                }
                panelOpenedByHover = false
                if (!panelOpen) openPanel(event.currentTarget)
              },
            },
            h(
              'svg',
              {
                width: 14,
                height: 14,
                viewBox: '0 0 16 16',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 1.4,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                'aria-hidden': 'true',
              },
              h('path', { d: 'M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z' }),
            ),
            h('span', null, count === 0 ? t('chip.label') : t('chip.count', { n: count })),
            h(
              'svg',
              {
                className: 'sa-chip-chevron',
                width: 12,
                height: 12,
                viewBox: '0 0 16 16',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 1.6,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                'aria-hidden': 'true',
              },
              h('path', { d: 'M4 6.5 8 10.5 12 6.5' }),
            ),
          )
        }
        /* ------------------------------------------------------------------ 生命周期 */

        ctx.effect(() => {
          const style = document.createElement('style')
          style.setAttribute('data-selection-annotations', '')
          style.textContent = CSS
          document.head.appendChild(style)
          document.body.append(overlay, toolbar, contextMenu, popover, popSuggest, ghostTip, panelRoot, imageViewer)
          // 独立于批注集合：即使现在一条批注都没有，也要能摘掉重载前遗留的孤儿附件。
          orphanTimer = window.setInterval(() => {
            const shell = inputShell()
            if (shell !== undefined) sweepOrphans(shell)
          }, ORPHAN_SWEEP_MS)
          // 页面刷新、关闭或插件卸载前再存一次：只靠状态变更时保存会丢掉最后几秒的编辑。
          const onUnload = () => {
            // 卸载算「保存」侧：先去抖窗口里的键入补进条目与草稿，再整体存一次。
            flushPopAutoSave()
            saveDraft(annotationsSession)
          }
          window.addEventListener('beforeunload', onUnload)
          window.addEventListener('pagehide', onUnload)
          return () => {
            flushPopAutoSave()
            saveDraft(annotationsSession)
            window.removeEventListener('beforeunload', onUnload)
            window.removeEventListener('pagehide', onUnload)
            cancelHoverOpen()
            cancelHoverClose()
            // 历史卡片是我们插进消息行里的节点，插件卸载时要一并摘掉。
            for (const node of document.querySelectorAll('[data-sa-ui="sent"]')) node.remove()
            for (const node of document.querySelectorAll('[data-sa-ui="replies"]')) node.remove()
            style.remove()
            if (orphanTimer !== null) window.clearInterval(orphanTimer)
            orphanTimer = null
            if (watchTimer !== null) window.clearInterval(watchTimer)
            watchTimer = null
            if (consumeTimer !== null) window.clearTimeout(consumeTimer)
            consumeTimer = null
            stopSideTabSync()
            overlay.remove()
            toolbar.remove()
            contextMenu.remove()
            popover.remove()
            popSuggest.remove()
            ghostTip.remove()
            if (panelObserver !== null) {
              panelObserver.disconnect()
              panelObserver = null
            }
            if (panelRaf !== 0) {
              window.cancelAnimationFrame(panelRaf)
              panelRaf = 0
            }
            panelRoot.remove()
            imageViewer.remove()
          }
        })

        /** 当前页面里可见的最大轮次；没有轮次行时返回 0。 */
        function currentMaxTurn() {
          let max = 0
          for (const row of document.querySelectorAll('[data-chat-turn]')) {
            const value = Number(row.getAttribute('data-chat-turn'))
            if (Number.isFinite(value)) max = Math.max(max, value)
          }
          return max
        }

        /**
         * 会话回退后的清理与回放：宿主在会话记录里写 rewind（at + 起点轮次），
         * 这里把该轮及之后的已发送记录撤掉、删掉对应卡片，并把批注原样放回待发送。
         */
        function applyRewind(sessionId, mark) {
          if (sessionId !== currentSessionId()) return
          const cutoff = Number.isFinite(mark?.turn) ? Number(mark.turn) : currentMaxTurn() + 1
          const table = loadSent(sessionId)
          const removed = []
          for (const [key, record] of [...table]) {
            if (!Number.isFinite(record?.turn) || record.turn < cutoff) continue
            removed.push({ key, record })
            table.delete(key)
          }
          if (removed.length > 0) {
            const gone = sentRemovals.get(sessionId) ?? new Set()
            for (const { key } of removed) gone.add(key)
            sentRemovals.set(sessionId, gone)
            saveSent(sessionId, table)
          }
          for (const { key } of removed) {
            for (const card of document.querySelectorAll(`[data-sa-ui="sent"][data-anchor="${cssEscape(key)}"]`)) card.remove()
          }
          for (const section of document.querySelectorAll('[data-sa-ui="replies"]')) {
            const turn = Number(section.dataset.saTurn)
            if (Number.isFinite(turn) && turn >= cutoff) section.remove()
          }
          const items = removed
            .sort((left, right) => left.record.savedAt - right.record.savedAt)
            .flatMap(({ record }) => (Array.isArray(record.items) ? record.items : []))
          if (items.length > 0) reuseSentItems(items, null, true)
          // 这里直接摘掉了卡片与答复区，正文位置变了：高亮必须重新量。
          if (removed.length > 0) markHighlightsDirty()
          scheduleRepaint('poll')
        }

        // 输入区里整段粘贴我们的导出数据时，拦下这次输入，转成导入批注。
        ctx.effect(() => {
          const onPaste = (event) => {
            const target = elementOf(event.target)
            if (target === null) return
            const editable = target.closest('[contenteditable="true"], [contenteditable="plaintext-only"], textarea')
            if (editable === null || editable.closest('[data-composer-card]') === null) return
            let text = ''
            try {
              text = event.clipboardData?.getData('text/plain') ?? ''
            } catch {
              return
            }
            const items = parseAnnotations(text)
            if (items === undefined) return
            event.preventDefault()
            event.stopPropagation()
            importAnnotations(items)
          }
          document.addEventListener('paste', onPaste, true)
          return () => document.removeEventListener('paste', onPaste, true)
        })

        // 逐条答复由宿主写进会话文件：轮询本机路由，把新答复挂到历史卡片后面。
        ctx.effect(() => {
            let timer = null
          let disposed = false
          const tick = async () => {
            timer = null
            if (disposed) return
            try {
              if (document.visibilityState !== 'hidden') {
                const sessionId = currentSessionId()
                if (sessionId !== undefined) {
          const remote = await pullRemoteSession(sessionId)
                  const mark = remote !== null && remote !== undefined ? remote.rewind : undefined
                  if (mark !== null && mark !== undefined && Number.isFinite(mark.at) && rewindHandled.get(sessionId) !== mark.at) {
                    rewindHandled.set(sessionId, mark.at)
                    applyRewind(sessionId, mark)
                  }
                  if (remote !== null && remote !== undefined && absorbRemoteReplies(sessionId, remote)) {
                    markConversationDirty()
                    scheduleRepaint('poll')
                  }
                }
              }
            } catch {
              /* 拉取失败：下一轮再话*/
            } finally {
              if (!disposed) {
                timer = window.setTimeout(tick, REPLY_POLL_MS)
                // 测试环境（Node）里要unref，否则轮询定时器会撑住测试进程不退出。
                if (typeof timer?.unref === 'function') timer.unref()
              }
            }
          }
          timer = window.setTimeout(tick, REPLY_POLL_MS)
          if (typeof timer?.unref === 'function') timer.unref()
          return () => {
            disposed = true
              if (timer !== null) window.clearTimeout(timer)
            timer = null
          }
        })

        ctx.effect(() => {
          document.addEventListener('selectionchange', onSelectionChange)
          // 拖动选区的过程中只记录指针，不渲染工具条；松手后再出现，避免频闪。
          /**
           * 按下时算「点插件自己的 UI、不是划线」的选择器：只有真正的控件与浮层。
           * 已发送卡与答复区本身带 data-sa-ui，但正文是用户可以划选的，不能算进来，
           * 否则在卡片正文里划线时松手，会被当成「点自己的 UI」而跳过工具条。
           */
          const UI_CONTROL_SELECTOR = [
            'button',
            'a[href]',
            'input',
            'textarea',
            'select',
            '[contenteditable="true"]',
            '.sa-section-head',
            '.sa-drag-handle',
            '[data-sa-ui="popover"]',
            '[data-sa-ui="panel"]',
            '[data-sa-ui="toolbar"]',
            '[data-sa-ui="menu"]',
            '[data-sa-ui="suggest"]',
            '[data-sa-ui="ghost"]',
          ].join(', ')
          /** 指针按下时是否落在插件自己的控件或浮层里：从这些里面按下再松手不算划线结束。*/
          let pointerDownInUi = false
          const onSelectPointerDown = (event) => {
            const target = elementOf(event.target)
            // 不管按在正文还是插件自己的卡片、答复区上，按下就进入拖选态：拖选期间不能重建卡片，
            // 否则选区起点会被夹到容器开头，松手后选区也会消失。
            pointerSelecting = true
            pointerDownInUi = target !== null && target.closest(UI_CONTROL_SELECTOR) !== null
            // 点真正的控件（卡片标题、复用按钮、弹层、面板）：只是交互，不动工具条。
            if (pointerDownInUi) return
            hideToolbar()
          }
          document.addEventListener('pointerdown', onSelectPointerDown, true)
          // 记住划线结束的位置；工具条要贴在这里，而不是 range 的末尾矩形。
          const onPointerUp = (event) => {
            // 松手就结束拖选：即使落在工具条/弹层上或窗口外没有后续事件，也不能让标记一直为真。
            pointerSelecting = false
            // 拖选挡住的重绘：这一下松手如果选区已收（单击、或点掉了选区），立刻补上。
            flushPendingRepaint()
            const target = elementOf(event.target)
            const fromUi = pointerDownInUi
            pointerDownInUi = false
            // 从控件上按下又松手（点卡片标题、按钮、拖弹层）不算划线结束：不重算工具条。
            // 只有「按下点在控件里」才算；在卡片正文里划选时按下点不是控件，走下面的正常收尾。
            if (fromUi && target !== null && target.closest('[data-sa-ui]') !== null) return
            if (target !== null && target.closest('[data-sa-ui="toolbar"], [data-sa-ui="menu"], [data-sa-ui="suggest"]') !== null) return
            // 在弹层里松手（包括拖标题）不算划线结束，不重算工具条。
            if (target !== null && target.closest('[data-sa-ui="popover"], [data-sa-ui="ghost"]') !== null) return
            lastPointerUp = { x: event.clientX, y: event.clientY, at: Date.now() }
            // 松手即渲染：选区已经定了，不需要再等 220ms 的去抖。
            window.clearTimeout(settleTimer)
            settleTimer = null
            showSelectionToolbar()
            if (toolbar.dataset.open === '1' && pendingSelection !== null) {
              const rect = safe(() => pendingSelection.range.getBoundingClientRect())
              if (rect !== undefined) placeToolbar(toolbar, rect, lastPointerUp)
            }
          }
          document.addEventListener('pointerup', onPointerUp, true)
          const onPointerMove = (event) => {
            lastPointerMove = { x: event.clientX, y: event.clientY }
            if (popResize !== null && popover.dataset.open === '1') {
              resizePopoverFromPointer(event.clientX, event.clientY)
              return
            }
            if (popDrag === null || popover.dataset.open !== '1') return
            const left = Math.max(8, Math.min(event.clientX - popDrag.dx, window.innerWidth - popDrag.width - 8))
            const top = Math.max(8, Math.min(event.clientY - popDrag.dy, window.innerHeight - popDrag.height - 8))
            popover.style.left = `${left}px`
            popover.style.top = `${top}px`
          }
          const onPopDragUp = () => {
            if (popResize !== null) {
              popResize = null
              popover.classList.remove('sa-pop-resizing')
              const sized = popover.getBoundingClientRect()
              // 只读面板的拖拽尺寸只留在内存里，不写编辑面板记住的那一份。
              if (sized.width > 0 && sized.height > 0 && popoverMode !== 'sent') {
                savePopoverSize(sized.width, sized.height)
              }
            }
            if (popDrag === null) return
            popDrag = null
            popover.classList.remove('sa-pop-dragging')
          }
          document.addEventListener('pointerup', onPopDragUp, true)
          document.addEventListener('pointermove', onPointerMove, true)
          document.addEventListener('contextmenu', onContextMenu, true)
          // 菜单外的按下与 Escape 都要关掉；菜单内的按下不能关，否则点不到菜单项。
          const onMenuPointerDown = (event) => {
            const target = elementOf(event.target)
            if (target !== null && target.closest('[data-sa-ui="menu"]') !== null) return
            closeContextMenu()
            if (target !== null && target.closest('[data-sa-ui="popover"]') !== null) return
            lowerPopover()
          }
          /** 发送动作发生前补正文：点击发送按钮或按 Enter 提交时都要经过这里。 */
          const fillFallbackIfSending = () => {
            if (annotations.length === 0) return
            const shell = inputShell()
            if (shell === undefined) return
            ensureFallbackPrompt(shell)
            armSendConsumeCheck()
          }
          const onDocumentClick = (event) => {
            const target = elementOf(event.target)
            if (target === null) return
            const button = target.closest('button')
            if (button === null || button.closest('[data-composer-card]') === null) return
            const label = button.getAttribute('aria-label')
            // 发送按钮在忙碌时会变成「排队发送 / 插话发送」等文案；按关键词判断，避免只认固定词。
            if (typeof label !== 'string' || !/(发送|送信|전송|senden|envoyer|inviare|send)/i.test(label)) return
            fillFallbackIfSending()
          }
          const onDocumentKeydown = (event) => {
            if (event.key === 'Escape') closeContextMenu()
            if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
            const target = elementOf(event.target)
            if (target === null || target.closest('[data-composer-card]') === null) return
            if (target.closest('[contenteditable="true"], textarea, input') === null) return
            fillFallbackIfSending()
          }
          document.addEventListener('pointerdown', onMenuPointerDown, true)
          document.addEventListener('click', onDocumentClick, true)
          document.addEventListener('keydown', onDocumentKeydown, true)
          // 元素尺寸变化（折叠展开/收起、换行重排）不一定改窗口尺寸、也不一定触发滚动：
          // 观察会话内容列与它外层的滚动容器，尺寸一变就重算高亮。
          let resizeObserver = null
          let resizeTargets = new Set()
          const syncResizeTargets = () => {
            if (typeof ResizeObserver !== 'function') return
            if (resizeObserver === null) {
              resizeObserver = new ResizeObserver(() => {
                highlightDirty = true
                scheduleRepaint('mutation')
              })
            }
            // 重绘会重建部分节点：只保留当前这棵树上还在的目标，旧节点及时 unobserve，避免集合一路上涨。
            const next = new Set()
            const observe = (element) => {
              if (element === null || element === undefined || next.has(element)) return
              next.add(element)
              safe(() => resizeObserver.observe(element))
            }
            for (const element of document.querySelectorAll('[data-chat-flow]')) {
              observe(element)
              // 内容列变高变矮时滚动容器不会触发 resize，但列自己的尺寸会变；两层都观察更稳。
              for (const container of scrollAncestorsOf(element)) observe(container)
            }
            for (const element of resizeTargets) {
              if (!next.has(element)) safe(() => resizeObserver.unobserve(element))
            }
            resizeTargets = next
          }
          const onViewport = (event) => {
            // 滚动与窗口尺寸变化会移动正文：高亮要重新量，但会话区不必重建。
            highlightDirty = true
            scheduleRepaint('viewport')
            closeContextMenu()
            if (popover.dataset.open === '1' && popoverRect !== null && popover.dataset.dragged !== '1') placePopover(popoverRect)
            // 面板位置在打开时定格：滚动不动它；窗口尺寸变化只做越界兜底。
            if (event.type === 'resize') {
              markViewportResize()
              clampPanelToViewport()
              clampSizedPopoverToViewport()
              // 只在窗口尺寸变化时重建观察目标：滚动事件太密，逐次 querySelectorAll 会拖慢滚动。
              syncResizeTargets()
            }
          }
          window.addEventListener('scroll', onViewport, true)
          window.addEventListener('resize', onViewport)
          // 只对「不是我们自己写出来的」DOM 变化重绘：否则 repaint 写 overlay 会再次触发观察器，
          // 形成 120ms 自激循环，把输入卡死。
          const observer = new MutationObserver((records) => {
            for (const record of records) {
              const target = elementOf(record.target)
              if (target !== null && target.closest('[data-sa-ui]') !== null) continue
              // 有批次等着记账时，任何 DOM 变化都立刻再试一次：消息气泡一挂出来就能落台账。
              if (pendingSent.length > 0) safe(() => scanSentMessages())
              // 宿主自己的重排、流式增量、时间刷新都不再排重绘：会话区只在数据真的变了、
              // 或有卡片/答复等着落位时才重建。滚动与窗口尺寸变化走 onViewport，只更新高亮。
              if (conversationNeedsRender()) {
                syncResizeTargets()
                scheduleRepaint('mutation')
              }
              return
            }
          })
          observer.observe(document.body, { childList: true, subtree: true, characterData: true })
          // 挂载时先建一遍：会话数据可能已经在本地台账里，而页面上没有任何变化会触发观察器。
          scheduleRepaint('mount')
          // 追踪监听早一步挂上：挂载后即便没有重建，用户滚动也能记到是谁动的。
          safe(() => watchConversationScroll())
          syncResizeTargets()
          return () => {
            scrollTrace.dispose()
            markdown.dispose()
            document.removeEventListener('selectionchange', onSelectionChange)
          document.removeEventListener('pointerdown', onSelectPointerDown, true)
            document.removeEventListener('pointerup', onPointerUp, true)
          document.removeEventListener('pointerup', onPopDragUp, true)
            document.removeEventListener('pointermove', onPointerMove, true)
            document.removeEventListener('contextmenu', onContextMenu, true)
            document.removeEventListener('pointerdown', onMenuPointerDown, true)
            document.removeEventListener('click', onDocumentClick, true)
            document.removeEventListener('keydown', onDocumentKeydown, true)
            document.removeEventListener('mousemove', onHoverMoveDocument, true)
            document.removeEventListener('pointerdown', onPopoverOutsidePointerDown, true)
            document.removeEventListener('keydown', onPopoverEscapeKeyDown)
            document.removeEventListener('pointerdown', onPanelOutsidePointerDown, true)
            document.removeEventListener('keydown', onPanelEscapeKeyDown)
            window.removeEventListener('scroll', onViewport, true)
            window.removeEventListener('resize', onViewport)
            if (resizeObserver !== null) resizeObserver.disconnect()
            observer.disconnect()
          }
        })

        // 只跟随用户点「已完成」这一次操作，不监听 aria-expanded 的程序性变化：
        // 否则 DSH 自己在轮到结束时收起过程块，会把默认展开的答复区一起收掉。
        ctx.effect(() => {
          const onTurnProcessClick = (event) => {
            const target = elementOf(event.target)
            if (target === null) return
            const button = target.closest('[data-turn-process]')
            // 过程分组的折叠头是 aria-expanded 按钮，挂在 [data-step-process] 的第一个子元素里。
            const groupButton = target.closest('button[aria-expanded]')
            const groupRoot = groupButton === null ? null : groupButton.closest('[data-step-process]')
            const groupHeader =
              groupRoot !== null && groupRoot.firstElementChild?.contains(groupButton) === true ? groupButton : null
            if (button === null && groupHeader === null) return
            // 展开/折叠会挪动正文：高亮必须重新量到新的可见标题行。
            highlightDirty = true
            scheduleRepaint('mutation')
            if (button !== null) window.requestAnimationFrame(() => syncReplyCollapse(button))
          }
          document.addEventListener('click', onTurnProcessClick, true)
          return () => {
            document.removeEventListener('click', onTurnProcessClick, true)
            previewBridge.dispose()
            webPicker.dispose()
          }
        })

        ctx.slots.inject('conversation.input.right', () =>
          ctx.slots.register({ name: 'conversation.input.right', id: 'selection-annotations', order: 30 }, AnnotateButton),
        )

        /**
         * `annotation_replies` 工具调用的原生卡片：直接读工具参数里的replies。
         *
         * 工具调用本身就在会话里渲染（ToolCallTree 的tool.call.toolview 键位），
         * 不需要宿主再存一份、也不需要客户端轮询路由。
         */
        function AnnotationRepliesCard(props) {
          const phase = props?.phase
          const block = props?.block
          let replies = []
          try {
            const raw = phase === 'result' ? block?.call?.argsRaw : block?.argsRaw
            const parsed = JSON.parse(raw ?? '')
            if (Array.isArray(parsed?.replies)) replies = parsed.replies
          } catch {
            replies = []
          }
          if (replies.length === 0) {
            return h('div', { className: 'sa-replies-card sa-replies-empty' }, t('replies.waiting'))
          }
          return h(
            'div',
            { className: 'sa-replies-card' },
            h('div', { className: 'sa-replies-head' }, t('replies.title', { n: replies.length })),
            ...replies.map((reply) =>
              h(
                'div',
                { className: 'sa-reply', key: `reply-${reply?.index}` },
                h('div', { className: 'sa-reply-line' },
                  h('span', { className: 'sa-reply-index' }, `#${reply?.index ?? '?'}`),
                  h('span', { className: `sa-reply-verdict sa-reply-${reply?.verdict ?? 'unknown'}` },
                    t(VERDICT_LABELS[reply?.verdict]?.[0] ?? 'verdict.unknown')),
                ),
                h('div', { className: 'sa-reply-reason' }, reply?.reason ?? ''),
                reply?.next ? h('div', { className: 'sa-reply-next' }, t('next.prefix', { text: reply.next })) : null,
              ),
            ),
          )
        }

        try {
          ctx.slots.inject('tool.call.toolview', () =>
            ctx.slots.register({ name: 'tool.call.toolview', key: 'annotation_replies', inject: () => ({}) }, AnnotationRepliesCard),
          )
          } catch (error) {
          console.error('[selection-annotations] 批注答复卡片注册失败：', error)
        }

        /** 插件详情页里的标准设置区：和批注面板共用同一份批注指令配置。*/
        function AnnotationInstructionSettings() {
          const [text, setText] = React.useState(() => instructionOf())
          const [adoptText, setAdoptText] = React.useState(() => adoptTextOf())
          const [rejectText, setRejectText] = React.useState(() => rejectTextOf())
          const [fallbackText, setFallbackText] = React.useState(() => fallbackTextOf())
          const customized = !isDefaultInstruction(text)
          const card = (key, title, hint, control, actions) =>
            h(
              'section',
              { className: 'sa-settings-card', key },
              h(
                'div',
                { className: 'sa-settings-card-head' },
                h('h3', { className: 'sa-settings-card-title' }, title),
                hint ? h('p', { className: 'sa-hint' }, hint) : null,
              ),
              control,
              actions ? h('div', { className: 'sa-settings-actions' }, actions) : null,
            )
          return h(
            'div',
            { className: 'sa-settings-page' },
            card(
              'instruction',
              t('settings.pageTitle'),
              `${customized ? t('settings.customized') : t('settings.default')} · ${t('settings.pageHint')}`,
              h('textarea', {
                className: 'sa-setting-textarea',
                'aria-label': t('settings.pageTitle'),
                rows: 10,
                value: text,
                onChange: (event) => {
                  setText(event.target.value)
                  persistInstructionSettings(event.target.value)
                },
              }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'sa-link',
                  onClick: () => {
                    setText(defaultInstruction())
                    persistInstructionSettings(defaultInstruction())
                  },
                },
                t('settings.restore'),
              ),
            ),
            card(
              'adopt',
              t('settings.adoptLabel'),
              t('settings.adoptHint'),
              h('input', {
                className: 'sa-setting-input',
                'aria-label': t('settings.adoptLabel'),
                value: adoptText,
                onChange: (event) => {
                  setAdoptText(event.target.value)
                  persistAdoptText(event.target.value)
                },
              }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'sa-link',
                  onClick: () => {
                    const next = DEFAULT_ADOPT_TEXT
                    setAdoptText(next)
                    persistAdoptText(next)
                  },
                },
                t('settings.restore'),
              ),
            ),
            card(
              'reject',
              t('settings.rejectLabel'),
              t('settings.rejectHint'),
              h('input', {
                className: 'sa-setting-input',
                'aria-label': t('settings.rejectLabel'),
                value: rejectText,
                onChange: (event) => {
                  setRejectText(event.target.value)
                  persistRejectText(event.target.value)
                },
              }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'sa-link',
                  onClick: () => {
                    const next = DEFAULT_REJECT_TEXT
                    setRejectText(next)
                    persistRejectText(next)
                  },
                },
                t('settings.restore'),
              ),
            ),
            card(
              'fallback',
              t('settings.fallbackLabel'),
              t('settings.fallbackHint'),
              h('textarea', {
                className: 'sa-setting-textarea',
                'aria-label': t('settings.fallbackLabel'),
                rows: 3,
                value: fallbackText,
                onChange: (event) => {
                  setFallbackText(event.target.value)
                  persistFallbackText(event.target.value)
                },
              }),
              h(
                'button',
                {
                  type: 'button',
                  className: 'sa-link',
                  onClick: () => {
                    const next = DEFAULT_FALLBACK_TEXT
                    setFallbackText(next)
                    persistFallbackText(next)
                  },
                },
                t('settings.restore'),
              ),
            ),
          )
        }
        try {
          ctx.slots.inject('plugins.bundle.config', () =>
            ctx.slots.register(
              { name: 'plugins.bundle.config', key: 'dsh-selection-annotations', inject: () => ({}) },
              AnnotationInstructionSettings,
            ),
          )
          } catch (error) {
          console.error('[selection-annotations] 插件详情页设置区注册失败：', error)
        }

        /**
         * DSH 设置窗里的独立页块：只读展示四项当前生效的设置。
         * 编辑仍在插件详情页的配置区完成，两个入口读的是同一份本地设置。
         */
        function SelectionAnnotationsSettings() {
          const image = imageSettingsOf()
          const shot =
            image.webShot === 'page'
              ? t('settings.webShotPage')
              : image.webShot === 'off'
                ? t('settings.webShotOff')
                : t('settings.webShotElement')
          const compression = image.compress
            ? t('settings.imagesOn', { n: Math.round(image.quality * 100) })
            : t('settings.imagesOff')
          const card = (key, title, hint, value) =>
            h(
              'section',
              { className: 'sa-settings-card', key },
              h(
                'div',
                { className: 'sa-settings-card-head' },
                h('h3', { className: 'sa-settings-card-title' }, title),
                hint ? h('p', { className: 'sa-hint' }, hint) : null,
              ),
              h('div', { className: 'sa-setting-readonly' }, value),
            )
          return h(
            'div',
            { className: 'sa-settings-page' },
            h('p', { className: 'sa-hint' }, t('settings.section.hint')),
            card('instruction', t('settings.pageTitle'), t('settings.pageHint'), instructionOf()),
            card('adopt', t('settings.adoptLabel'), null, adoptTextOf()),
            card('reject', t('settings.rejectLabel'), null, rejectTextOf()),
            card(
              'images',
              t('settings.section.imagesTitle'),
              t('settings.section.imagesHint'),
              `${t('settings.section.imagesSent')}\n${t('settings.section.imagesDetail', { shot, compression })}`,
            ),
          )
        }
        try {
          ctx.slots.inject('settings.section', () =>
            ctx.slots.register(
              { name: 'settings.section', id: 'selection-annotations', order: 62, label: () => t('settings.section.title') },
              SelectionAnnotationsSettings,
            ),
          )
        } catch (error) {
          console.error('[selection-annotations] 设置页注册失败：', error)
        }

        locale.subscribe(() => applyLocale())

        // 便于人工核对与排障：window.__dshSelectionAnnotations.list() 等。
        // `add` 与 `_internals` 同时给无浏览器的测试台用（见 test/client-half.test.mjs）。
        window.__dshSelectionAnnotations = {
          list: () =>
            snapshot().map((item) => ({
              id: item.id,
              number: item.number,
              quote: item.quote,
              note: item.note,
              source: item.source,
            })),
          payload: () => buildPayload(annotations),
          receipt: () => draftIds[0] ?? null,
          drafts: () => [...draftIds],
          session: () => currentSessionId(),
          sentStats: () => sentRenderStats,
          repaint,
          remove: removeAnnotation,
          clear: clearAnnotations,
          update: (id, note) => updateAnnotation(id, note),
          add: (input) => addAnnotation(input),
          fillFallback: () => {
            const shell = inputShell()
            if (shell !== undefined) ensureFallbackPrompt(shell)
          },
          /** 控制台开关：`__dshSelectionAnnotations.traceScroll(false)` 停掉滚动追踪。*/
          traceScroll: (on) => scrollTrace.setEnabled(on),
          _internals: { buildPayload, payloadSource, describeSource, captureSource, matchInRoot, rangeFromOffsets, offsetRange, anchorRoot, locateRange, locateInSource, lineOfOffset, resolveSourcePosition, refineSourcePosition, adoptSession, loadDraft, saveDraft, loadSent, saveSent, recordSent, scanSentMessages, buildSentCard, renderSentCards, renderReplySections, buildReplySection, mergeReplyBatches, absorbRemoteReplies, shouldDiscardEmpty, loadImageSettings, syncReplyCollapse, sentCardAnchor, turnOfRow, placeToolbar, createPayloadHidingRule, copyAnnotationsToClipboard, panelHintTextOf, openPanel, closePanel, clampPanelToViewport, buildSegments, segmentsOf, fitSegmentsToQuote, matchInRootNormalized, locateSegmentsOf },
        }
    },
  }
  return plugin
}
