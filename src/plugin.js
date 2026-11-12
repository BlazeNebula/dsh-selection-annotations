import { CSS } from './core/styles.js'
import {
  ANNOTATION_FILE,
  DEFAULT_ADOPT_TEXT,
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_INSTRUCTION,
  DEFAULT_INSTRUCTION_EN,
  IMAGE_SETTINGS_KEY,
  INSTRUCTION_SETTINGS_KEY,
  LOCALE_NS,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_ANNOTATION,
  MAX_NOTE,
  MAX_QUOTE,
  PAYLOAD_KIND,
  PLUGIN_BUILD,
  DRAFT_STORAGE_PREFIX,
  DRAFT_MAX_SESSIONS,
  DRAFT_MAX_ITEMS,
  SENT_STORAGE_PREFIX,
  SENT_MAX_ENTRIES,
  SENT_MAX_BYTES,
  REPLY_POLL_MS,
  SENT_PENDING_TTL_MS,
} from './core/config.js'
import { MESSAGES } from './core/messages.js'
import {
  CONSUME_CONFIRM_MS,
  CONSUME_POLL_MS,
  DRAFT_MAX_BYTES,
  HOVER_OPEN_DELAY_MS,
  ORPHAN_SWEEP_MS,
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
import { createSourceCapture } from './core/source-capture.js'
import { createSourceResolver } from './core/source-resolve.js'
import { createCards } from './core/cards.js'
import { createMarkdown } from './core/markdown.js'
import { createPanelRenderer } from './core/panel-render.js'
import { createSentStore } from './core/sent-store.js'
import { createRemoteSync } from './core/remote-sync.js'
import { createDraftCodec } from './core/draft-codec.js'
import { createDraftStore } from './core/draft-store.js'
import { compressImage, downscaleDataUrl, fileToDataUrl, dataUrlToFile } from './core/image-codec.js'
import {
  offsetRange,
  pathFromPreviewUrl,
  lineNumberOf,
  codeLineNumberOf,
  normalizeWithMap,
  locateInSource,
  lineOfOffset,
  withTimeout,
  lineRangeWithin,
} from './core/source-locate.js'
import { safe, toBase64, cssEscape, truncateQuote, el, button } from './core/util.js'
import { registerTurnAnchor, findTurnAnchor } from './core/turn-anchor.js'

/**
 * 组合根：装配 src/core/ 下的模块并驱动界面。
 *
 * 已拆出：locale、settings、payload、sent-store、remote-sync、draft-*、source-*、cards、util、image-codec。
 * 仍在此处：批注状态、会话切换、选区与弹层、总览面板、React 组件。
 * 迁移原则：行为不变，一次一个模块，npm test 全绿后提交。
 */
export function createPlugin(React, extras = {}) {
  const h = React.createElement

  return {
    name: '@u2a5f/dsh-selection-annotations',
    inject: ['slots', 'sessions', 'conversation', 'remote', 'remote.workspaceFiles', 'locale'],
    apply(ctx) {
    const locale = createLocale(ctx)

    const t = (key, params) => locale.t(key, params)
    const defaultInstruction = () => locale.defaultInstruction()
    const isDefaultInstruction = (text) => locale.isDefaultInstruction(text)
    registerTurnAnchor(ctx, h)

    /** 草稿在本地存储里的体积上限；超了先丢最旧批注的图片。*/
        /* ------------------------------------------------------------------ 状态*/

        /** 当前会话的批注集合；编号与顺序就是发给模型时的编号。*/
        let annotations = []
        /** 当前挂在草稿上的批注附件 receipt；发送后被 composer 消费。 */
        let draftIds = []
        let syncing = false
        let syncTimer = null
        let repaintTimer = null
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
        function emit() {
          for (const fn of [...listeners]) {
            try {
              fn()
            } catch (err) {
              warn('[selection-annotations] 订阅回调失败：', err)
            }
          }
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
        function sweepOrphans(shell) {
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
              const source = annotations[index]
              const images = Array.isArray(source?.images) ? source.images : []
              const thumbs = []
              for (const image of images) {
                if (typeof image?.thumb !== 'string' || image.thumb === '') continue
                thumbs.push({
                  name: typeof image.name === 'string' ? image.name : t('image.alt'),
                  dataUrl: image.thumb,
                  preview: typeof image.preview === 'string' && image.preview !== '' ? image.preview : image.dataUrl,
                })
              }
              return thumbs.length > 0 ? { ...annotation, thumbs } : annotation
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
          scheduleRepaint()
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
              if (!draftSeen) return
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
        /** 批注正文里出现「采纳」预填文本时，整条批注改用绿色标识。 */
        const hasAdoptNote = (note) => typeof note === 'string' && note.includes(adoptTextOf())

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

        const remoteSync = createRemoteSync(sessionSnapshot)
        const storeUrl = (sessionId) => remoteSync.storeUrl(sessionId)
        const pullRemoteSession = (sessionId) => remoteSync.pull(sessionId)

        /** 当前会话的可落盘快照：草稿与已提交台账（落盘不做体积裁剪）。*/
        function sessionSnapshot(sessionId) {
          const drafts =
            annotationsSession === sessionId ? draftItems(annotations) : draftSessions.get(sessionId) ?? []
          const sent = {}
          for (const [key, value] of sentBySession.get(sessionId) ?? []) sent[key] = value
          return { schemaVersion: 1, sessionId, updatedAt: new Date().toISOString(), drafts, sent }
        }

        const pushRemoteSession = (sessionId) => remoteSync.push(sessionId)
        const scheduleRemotePush = (sessionId) => remoteSync.schedule(sessionId)

        /** 把落盘记录并入内存：本地为空时用远端，本地有内容时保留本地并推上去。*/
        async function hydrateRemoteSession(sessionId) {
          const remote = await pullRemoteSession(sessionId)
          if (remote === null || remote === undefined) return
          let touched = absorbRemoteReplies(sessionId, remote)
          if (Array.isArray(remote.drafts) && remote.drafts.length > 0) {
            const items = remote.drafts.filter(isDraftItem).slice(0, DRAFT_MAX_ITEMS).map(restoreDraftItem)
            if (annotationsSession === sessionId && annotations.length === 0 && items.length > 0) {
              annotations = items
              emit()
              scheduleRepaint()
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
              table.set(key, { savedAt: Number(value.savedAt) || 0, items, ...(turn !== undefined ? { turn } : {}) })
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
          if (touched) scheduleRepaint()
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
          if (!first) saveDraft(annotationsSession)
          annotationsSession = sessionId
          // 首次挂载时内存里可能已有批注（测试台或热换前注入的），直接归到这个会话。
          if (first && annotations.length > 0) {
            saveDraft(sessionId)
            return
          }
          annotations = loadDraft(sessionId)
          draftIds = []
          draftSeen = false
          // 换会话时把上一会话的答复卡片清掉；新会话的数据用hydrate 补回来。
          for (const stale of document.querySelectorAll('[data-sa-ui="replies"]')) stale.remove()
          emit()
          scheduleRepaint()
          if (annotations.length > 0) scheduleSync()
          // 本地是空的就当远端有数据：跨端切换会话时靠这一步把记录带回来。
          void hydrateRemoteSession(sessionId)
        }

        const sourceResolver = createSourceResolver({
          ctx,
          getSessionId: () => currentSessionId(),
          log,
          timeoutMs: SOURCE_LOOKUP_TIMEOUT_MS,
        })
        const resolveSourcePosition = (source, quote, onSkip) => sourceResolver.resolve(source, quote, onSkip)

        const sourceCapture = createSourceCapture()
        const captureSource = (range) => sourceCapture.captureSource(range)
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
          const quote = typeof input.quote === 'string' ? input.quote.trim().slice(0, MAX_QUOTE) : ''
          const note = typeof input.note === 'string' ? input.note.trim().slice(0, MAX_NOTE) : ''
          const source = input.source ?? { kind: 'dom' }
          // 空选区空批注没有意义。
          if (quote === '' && note === '') return undefined
          sequence += 1
          const item = {
            id: `sa-${Date.now().toString(36)}-${sequence}`,
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
          scheduleRepaint()
          saveDraft(annotationsSession)
          return item
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

        function removeAnnotation(id) {
          annotations = annotations.filter((item) => item.id !== id)
          renumber()
          emit()
          scheduleSync()
          scheduleRepaint()
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
          scheduleRepaint()
          saveDraft(annotationsSession)
          refreshPanel()
        }

        function clearAnnotations() {
          annotations = []
          // 注意：不要在这里清 draftIds —— 交给 syncAttachment 才能把已挂上的附件摘掉。
          emit()
          scheduleSync()
          scheduleRepaint()
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
          onChanged: (sessionId) => scheduleRemotePush(sessionId),
        })
        const loadSent = (sessionId) => sentStore.loadSent(sessionId)
        const saveSent = (sessionId, table) => sentStore.saveSent(sessionId, table)
        const recordSent = (sessionId, anchorKey, items, turn) => {
          sentStore.recordSent(sessionId, anchorKey, items, turn)
          consumedSnapshot = null
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
            if (kind === '' || anchorKey.startsWith('group:')) {
              push(element, anchorKey)
            }
          }
          return rows
        }

        /** 当前页面上已有的候选锚点键。*/
        function captureAnchorKeys() {
          return new Set(collectAnchorRows().map((entry) => entry.anchorKey))
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
          scheduleRepaint()
          saveDraft(annotationsSession)
          warn('[selection-annotations] 这批批注没能记进已发送台账，已放回界面。')
        }

        function scanSentMessages() {
          if (pendingSent.length === 0) return
          const now = Date.now()
          const before = pendingSent.length
          pendingSent = pendingSent.filter((entry) => now - entry.at < SENT_PENDING_TTL_MS)
          if (pendingSent.length < before && pendingSent.length === 0) restoreConsumedSnapshot()
          if (pendingSent.length === 0) return
          const rows = collectAnchorRows()
          if (rows.length === 0) return
          const pending = pendingSent[0]
          const sessionId =
            typeof pending.sessionId === 'string' && pending.sessionId !== '' ? pending.sessionId : currentSessionId()
          if (sessionId === undefined) return
          // 候选：不在「发送前快照」里、也还没落台账的行；「已完成」尾行不是消息，别拿它当锚点。
          const fresh = rows.filter((entry) => {
            if (pending.known.has(entry.anchorKey)) return false
            if (loadSent(sessionId).has(entry.anchorKey)) return false
            const kind = entry.row.getAttribute('data-chat-flow-kind') ?? ''
            if (kind === 'turn-process') return false
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
            return kind === '' || kind.startsWith('group:')
          })
          const pool = attached.length > 0 ? attached : bubbles.length > 0 ? bubbles : loose
          // 等气泡最多 1.2 秒：消息气泡有时要等回合开始才挂出来，但「已发送」不该因此迟到太久。
          const wait = Date.now() - pending.at
          const fallback = pool.length === 0 && wait > 1200 ? fresh.slice(-1) : []
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
            // 消息行还没出现也不用干等：发送时数出的轮次已经能定位，先用它落台账。
            const hint = pending.turnHint
            if (Number.isFinite(hint)) {
              pendingSent.shift()
              recordSent(sessionId, `12:turn-process${hint}`, pending.items, hint)
              scheduleRepaint()
            }
            return
          }
          pendingSent.shift()
          const turn = turnOfRow(target.row)
          recordSent(sessionId, target.anchorKey, pending.items, turn)
          scheduleRepaint()
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
        const cards = createCards({ t, openImageViewer, markdown, isAdopt: hasAdoptNote })
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

        /** 在所属轮次的「已完成」之前补出已提交批注卡片；按轮次定位，不依赖消息行是否已加载。*/
        function renderSentCards() {
          const sessionId = currentSessionId()
          if (sessionId === undefined) return
          const table = loadSent(sessionId)
          if (table.size === 0) return
          // 卡片身份取台账键；锚点只用来挂答复卡。
          for (const stale of document.querySelectorAll('[data-sa-ui="sent"]')) {
            const key = stale.getAttribute('data-sa-key')
            if (key === null || !table.has(key)) stale.remove()
          }
          let learnedTurn = false
          for (const [storedKey, record] of table) {
            if (record.items.length === 0) continue
            const anchorKey = resolveLegacyAnchor(storedKey)
            const row = document.querySelector(`[data-chat-anchor-key="${cssEscape(anchorKey)}"]`)
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
            const footer = footerBlockForTurn(turn)
            if (row === null && footer === null) continue
            const existing = document.querySelector(`[data-sa-ui="sent"][data-sa-key="${cssEscape(storedKey)}"]`)
            const cardOptions = {
              onReuse: () => reuseSentItems(record.items),
              onReplayItem: (item) => reuseSentItems([item]),
            }
            let card = existing
            if (card !== null && card.getAttribute('data-reuse') !== '4') {
              const fresh = buildSentCard(record, anchorKey, cardOptions)
              fresh.setAttribute('data-sa-key', storedKey)
              existing.replaceWith(fresh)
              card = fresh
            }
            if (card === null) card = buildSentCard(record, anchorKey, cardOptions)
            card.setAttribute('data-reuse', '4')
            card.setAttribute('data-sa-key', storedKey)
            card.setAttribute('data-anchor', anchorKey)
            // 批注优先挂在用户消息气泡下方：插队（steering）消息还没有轮次尾行时也能出现，
            // 位置也贴着「自己这一条」，不必等整轮结束。
            const bubbleKind = row === null ? '' : (row.getAttribute('data-chat-flow-kind') ?? '')
            // 有轮次就按轮次定位，不再看锚点键指向哪条消息：即使锚点记错（曾抓到别的会话的消息），
            // 卡片也只会落在正确的那一轮，不会漂到看不见的节点上。锚点仍保留给答复卡配对。
            const onBubble =
              !Number.isFinite(turn) &&
              row !== null &&
              (bubbleKind === 'user' || bubbleKind === 'steering' || row.hasAttribute('data-pending-steering'))
            if (onBubble && row.parentElement !== null && row.parentElement !== document.body) {
              if (card.parentElement !== row.parentElement || card.previousSibling !== row) {
                row.parentElement.insertBefore(card, row.nextSibling)
              }
              continue
            }
            // 已发送卡仍贴在「已完成」上方：先按该轮的已完成按钮定位；
            // 槽位锚点只在没有按钮（进行中/无过程说明）时兜底，保证不会丢卡。
            const disclosure = Number.isFinite(turn) ? turnDisclosureItem(turn) : null
            if (disclosure !== null && disclosure.parentElement !== null) {
              if (card.parentElement !== disclosure.parentElement || card.nextSibling !== disclosure) {
                disclosure.parentElement.insertBefore(card, disclosure)
              }
              continue
            }
            const anchorEl = Number.isFinite(turn) ? findTurnAnchor(turn, sessionId) : null
            if (anchorEl !== null && anchorEl.parentElement !== null) {
              if (card.parentElement !== anchorEl.parentElement || card.nextSibling !== anchorEl) {
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
                footer.parentElement.insertBefore(card, footer)
              }
              continue
            }
            const target = sentCardAnchor(row)
            if (target.parent !== null) {
              if (card.parentElement !== target.parent || card.nextSibling !== target.before) target.parent.insertBefore(card, target.before)
            } else if (existing === null) {
              row.appendChild(card)
            }
          }
          if (learnedTurn) saveSent(sessionId, table)
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

        /** 答复卡留在「已完成」之下：有轮次号时按轮次尾行定位，否则退回相邻节点查找。*/
        function placeReplyAfterTurnProcess(section, turn) {
          const parent = section.parentElement
          if (parent === null) return
          if (Number.isFinite(turn)) section.dataset.saTurn = String(turn)
          // 答复卡紧跟在最终输出之后：找到该轮最后一个助手内容块，插在它后面；
          // 下方即使还有插队消息，答复也不会被推远。
          if (Number.isFinite(turn)) {
            const items = document.querySelectorAll(`[data-chat-turn="${turn}"]`)
            let lastAssistant = null
            for (const item of items) {
              const kind = item.getAttribute?.('data-chat-flow-kind') ?? ''
              if (kind.startsWith('assistant')) lastAssistant = item
            }
            // 「已完成」内联在助手消息体内；插队消息会排在最终输出之前，
            // 用户要的是答复紧贴在最终输出之前，所以插在最后一个助手内容块前面。
            if (lastAssistant !== null && lastAssistant.parentElement !== null) {
              lastAssistant.parentElement.insertBefore(section, lastAssistant)
              return
            }
          }
          // 槽位锚点在轮次尾部：没有「已完成」时贴在它后面。
          const anchorEl = Number.isFinite(turn) ? findTurnAnchor(turn, currentSessionId()) : null
          if (anchorEl !== null && anchorEl.parentElement !== null) {
            let cursor = anchorEl
            while (cursor.nextElementSibling !== null && cursor.nextElementSibling.getAttribute?.('data-sa-ui') === 'replies') {
              cursor = cursor.nextElementSibling
            }
            anchorEl.parentElement.insertBefore(section, cursor.nextSibling)
            return
          }
          const block = footerBlockForTurn(turn)
          if (block !== null && block.parentElement !== null) {
            let cursor = block
            while (cursor.nextElementSibling !== null && cursor.nextElementSibling.getAttribute?.('data-sa-ui') === 'replies') {
              cursor = cursor.nextElementSibling
            }
            block.parentElement.insertBefore(section, cursor.nextSibling)
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
          parent.insertBefore(section, cursor.nextSibling)
        }

        /**
         * 界面语言切换后：静态控件换文案，已提交卡片与面板按新语言重建。
         * 正在编辑的草稿仍留在输入框里，不会因为换语言丢掉。
         */
        function applyLocale() {
          safe(() => {
            annotateLabel.textContent = t('annotate')
            adoptLabel.textContent = t('annotate.adopt')
            copyLabel.textContent = t('annotate.copy')
          })
          safe(() => {
            menuAnnotate.textContent = t('menu.annotate')
            menuAdopt.textContent = t('menu.adopt')
            menuCopy.textContent = t('menu.copy')
          })
          safe(() => {
            popInput.setAttribute('aria-label', t('pop.placeholder'))
            popInput.dataset.placeholder = t('pop.placeholder')
          })
          safe(() => {
            popQuoteLabel.textContent = t('label.quote')
            popNoteLabel.textContent = t('pop.noteLabel')
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
         * 渲染时先用 resolveLegacyAnchor 改认那一轮的批注消息行，再按 savedAt 分给批次。
         */
        function renderReplySections() {
          const sessionId = currentSessionId()
          if (sessionId === undefined) return
          const table = loadSent(sessionId)
          if (table.size === 0) return
          const batches = remoteReplyCache.get(sessionId) ?? []
          if (batches.length === 0) return
          for (const stale of document.querySelectorAll('[data-sa-ui="replies"]')) {
            const anchorKey = stale.getAttribute('data-anchor')
            const known = [...table.keys()].some((storedKey) => resolveLegacyAnchor(storedKey) === anchorKey)
            if (!known) stale.remove()
          }
          const byAnchor = new Map()
          for (const [storedKey, record] of table) {
            const anchorKey = resolveLegacyAnchor(storedKey)
            const current = byAnchor.get(anchorKey)
            if (current === undefined || current.record.savedAt < record.savedAt) {
              byAnchor.set(anchorKey, { record, turn: turnOfRecord(record, storedKey) })
            }
          }
          const records = [...byAnchor.entries()].sort((a, b) => a[1].record.savedAt - b[1].record.savedAt)
          const grouped = new Map()
          for (const batch of batches) {
            let target
            for (const [key, entry] of records) {
              if (entry.record.savedAt <= batch.at) target = key
            }
            if (target === undefined) continue
            const list = grouped.get(target) ?? []
            list.push(batch)
            grouped.set(target, list)
          }
          for (const [anchorKey, list] of grouped) {
            const escaped = cssEscape(anchorKey)
            const sentCards = document.querySelectorAll(`[data-sa-ui="sent"][data-anchor="${escaped}"]`)
            const sentCard = sentCards[sentCards.length - 1]
            if (sentCard === undefined) continue
            const items = byAnchor.get(anchorKey)?.record.items ?? []
            const turn = byAnchor.get(anchorKey)?.turn ?? null
            const signature = `${list.map((batch) => String(batch.at)).join('|')}#${items.length}#replay4`
            const existing = document.querySelector(`[data-sa-ui="replies"][data-anchor="${escaped}"]`)
            if (existing !== null) {
              if (existing.dataset.signature === signature) continue
              const fresh = buildReplySection(list, items, {
                onReuseAll: () => reuseSentItems(items),
                onReplayItem: (item) => reuseSentItems([item]),
              })
              fresh.setAttribute('data-anchor', anchorKey)
              fresh.dataset.signature = signature
              existing.replaceWith(fresh)
              placeReplyAfterTurnProcess(fresh, turn)
              collapseSentForReplies(sentCard, signature)
              continue
            }
            const section = buildReplySection(list, items, {
              onReuseAll: () => reuseSentItems(items),
              onReplayItem: (item) => reuseSentItems([item]),
            })
            section.setAttribute('data-anchor', anchorKey)
            section.dataset.signature = signature
            sentCard.parentElement?.insertBefore(section, sentCard.nextSibling)
            placeReplyAfterTurnProcess(section, turn)
            collapseSentForReplies(sentCard, signature)
          }
        }

        /* ------------------------------------------------------- 原生附件块（随消息发送） */

        const payloadApi = createPayload({ t, instructionOf })
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

        const overlay = document.createElement('div')
        overlay.className = 'sa-overlay'
        overlay.setAttribute('data-sa-ui', 'overlay')

        function scheduleRepaint() {
          if (repaintTimer !== null) return
          repaintTimer = window.setTimeout(() => {
            repaintTimer = null
            repaint()
          }, REPAINT_MS)
        }

        function repaint() {
          highlightHits = []
          // 历史回看先于高亮：新消息行刚出现时在这里完成配对，卡片随即补上。
          scanSentMessages()
          renderSentCards()
          renderReplySections()
          const nodes = []
          for (const item of annotations) {
            const range = locateRange(item)
            if (range === undefined) continue
            const rects = safe(() => [...range.getClientRects()]) ?? []
            if (rects.length > 0) highlightHits.push({ id: item.id, rects })
            let badged = false
            for (const rect of rects) {
              if (rect.width <= 0 || rect.height <= 0) continue
              const box = document.createElement('div')
              box.className = 'sa-hl'
              if (hasAdoptNote(item.note)) box.dataset.adopt = '1'
              box.style.left = `${rect.left}px`
              box.style.top = `${rect.top}px`
              box.style.width = `${rect.width}px`
              box.style.height = `${rect.height}px`
              nodes.push(box)
              if (!badged) {
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
          }
          // 一次性换掉整层：先清空再逐个插入会在帧间露出空白，看起来像界面闪了一下。
          if (typeof overlay.replaceChildren === 'function') {
            overlay.replaceChildren(...nodes)
          } else {
            overlay.textContent = ''
            for (const node of nodes) overlay.appendChild(node)
          }
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
        // 「批注采纳」复用同一个创建流程，只在批注正文里预填「采纳」。
        const adoptButton = document.createElement('button')
        adoptButton.type = 'button'
        adoptButton.className = 'sa-btn sa-btn-adopt'
        const adoptLabel = document.createElement('span')
        adoptLabel.textContent = t('annotate.adopt')
        adoptButton.append(dshIconSvg('check'), adoptLabel)
        // 「复制」放在最左，先复制再决定批注还是采纳。
        const copyButton = document.createElement('button')
        copyButton.type = 'button'
        copyButton.className = 'sa-btn'
        const copyLabel = document.createElement('span')
        copyLabel.textContent = t('annotate.copy')
        copyButton.append(dshIconSvg('copy'), copyLabel)
        // 左边采纳、中间反馈、右边复制。
        toolbar.append(adoptButton, annotateButton, copyButton)

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
        const menuCopy = document.createElement('button')
        menuCopy.type = 'button'
        menuCopy.className = 'sa-menu-item'
        menuCopy.textContent = t('menu.copy')
        contextMenu.append(menuAnnotate, menuAdopt, menuCopy)
        /** 打开菜单时的那份选区：菜单点下去时 document 的选区可能已经变了。*/
        let contextMenuSelection = null

        const popover = document.createElement('div')
        popover.className = 'sa-popover'
        popover.setAttribute('data-sa-ui', 'popover')
        const popHead = document.createElement('div')
        popHead.className = 'sa-pop-head'
        const popTitle = document.createElement('div')
        popTitle.className = 'sa-pop-title'
        const popClose = document.createElement('button')
        popClose.type = 'button'
        popClose.className = 'sa-pop-close'
        popClose.textContent = '×'
        popClose.setAttribute('aria-label', t('pop.cancel'))
        popHead.append(popTitle, popClose)
        // 在弹层里移动光标、键入或删除时，把它抬到最前层，避免被页面里的浮层压住。
        const raisePopover = () => popover.classList.add('sa-front')
        popover.addEventListener('pointerdown', raisePopover, true)
        popover.addEventListener('focusin', raisePopover, true)
        popover.addEventListener('keydown', raisePopover, true)
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
        const popQuote = document.createElement('div')
        popQuote.className = 'sa-pop-quote'
        const popDivider = document.createElement('div')
        popDivider.className = 'sa-pop-divider'
        const popSource = document.createElement('div')
        popSource.className = 'sa-pop-src'
        const popNoteLabel = document.createElement('div')
        popNoteLabel.className = 'sa-pop-label'
        popNoteLabel.textContent = t('pop.noteLabel')
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
        /** 输入框默认跟随内容长高；用户一旦手动拖过高度，就不再覆盖他的选择。*/
        let popInputAutoHeight = true
        let popInputAutoValue = 0
        /** 已批注原文的高亮矩形缓存，供鼠标悬停命中检测。*/
        let highlightHits = []
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
          syncAdoptTone()
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

        function adoptTokenNode(phrase) {
          const token = document.createElement('span')
          token.className = 'sa-token'
          token.setAttribute('contenteditable', 'false')
          token.textContent = phrase
          return token
        }

        /** 用编辑器内容重建备注：第一次出现的采纳句换成不可编辑 token。*/
        function setNoteContent(value) {
          popInput.textContent = ''
          if (value === '') {
            refreshNoteState()
            return
          }
          const phrase = adoptTextOf()
          const at = value.indexOf(phrase)
          if (at === -1) {
            appendNoteText(value)
          } else {
            appendNoteText(value.slice(0, at))
            popInput.appendChild(adoptTokenNode(phrase))
            appendNoteText(value.slice(at + phrase.length))
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
          const phrase = adoptTextOf()
          const ctx = caretLine()
          if (ctx === null) {
            hideSuggestion()
            return
          }
          if (ctx.line === '' || ctx.line === phrase || !phrase.includes(ctx.line)) {
            hideSuggestion()
            return
          }
          suggested = { prefix: ctx.line, node: ctx.node, offset: ctx.offset }
          ghostTip.textContent = phrase
          const left = Math.min(ctx.rect.right + 1, window.innerWidth - 40)
          ghostTip.style.left = `${Math.max(8, left)}px`
          ghostTip.style.top = `${ctx.rect.top}px`
          ghostTip.style.display = ''
        }

        function acceptSuggestion() {
          if (suggested === null) return false
          const phrase = adoptTextOf()
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
          const token = adoptTokenNode(phrase)
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
        popover.append(popHead, popSource, popQuoteLabel, popQuote, popDivider, popNoteLabel, popInput, popImages, popActions)

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
          safe(() => {
            const area = document.createElement('textarea')
            area.value = text
            area.style.position = 'fixed'
            area.style.opacity = '0'
            document.body.appendChild(area)
            area.select()
            document.execCommand('copy')
            area.remove()
          })
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
        function placePopover(rect) {
          const width = popover.offsetWidth || 340
          const height = popover.offsetHeight || 240
          const point = popoverSource === 'hover' ? lastPointerMove : (selectionPointer ?? lastPointerMove)
          const left = anchoredLeft(point, rect, width)
          const above = rect.top - height - 10
          const top = above >= 8 ? above : Math.min(rect.bottom + 10, window.innerHeight - height - 8)
          popover.style.left = `${left}px`
          popover.style.top = `${Math.max(8, top)}px`
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
          window.clearTimeout(settleTimer)
          settleTimer = window.setTimeout(() => {
            settleTimer = null
            if (pointerSelecting) {
              hideToolbar()
              return
            }
            showSelectionToolbar()
          }, SETTLE_MS)
        }

        /** 弹层两种用途：新建（来自当前选区）与修改（某一条既有批注）。*/
        let popoverMode = 'create'
        let popoverAnchor = null
        let popoverTargetId = null

        /** 把当前图片列表画出来：缩略图 + 删除按钮，空列表时只留一行提示。 */
        function renderPopImages() {
          popImages.textContent = ''
          for (const image of popInputImages) {
            const box = document.createElement('div')
            box.className = 'sa-pop-image'
            if (typeof image.url === 'string' && image.url !== '') {
              const thumb = document.createElement('img')
              thumb.className = 'sa-pop-thumb'
              thumb.src = image.url
              thumb.alt = image.name
              thumb.title = t('image.open')
              thumb.style.cursor = 'zoom-in'
              thumb.addEventListener('click', (event) => {
                event.preventDefault()
                event.stopPropagation()
                openImageViewer(image.url, image.name)
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

        /** 每次打开弹层都从「跟随内容」开始，并清掉上一次拖拽留下的固定高度。*/
        function resetPopInputHeight() {
          popInputAutoHeight = true
          popInputAutoValue = 0
          popInput.style.height = ''
        }

        /** 按内容行数长高；用户拖过高度之后这里什么都不做。*/
        function syncPopInputHeight() {
          if (!popInputAutoHeight) return
          const min = 62
          const max = Math.max(min, Math.round(window.innerHeight * 0.6))
          const keepTop = popInput.scrollTop
          popInput.style.height = 'auto'
          const measured = Number(popInput.scrollHeight)
          if (!Number.isFinite(measured) || measured <= 0) return
          const next = Math.max(min, Math.min(measured, max))
          popInput.style.height = `${next}px`
          popInputAutoValue = next
          popInput.scrollTop = keepTop
        }

        /** 键入后让插入点留在可视区，而不是被撑高后跳回第一行。*/
        function ensureCaretVisible() {
          const selection = window.getSelection()
          if (selection === null || selection.rangeCount === 0) return
          const range = selection.getRangeAt(0).cloneRange()
          const rect = range.getBoundingClientRect()
          const box = popInput.getBoundingClientRect()
          if (rect.bottom > box.bottom - 4) {
            popInput.scrollTop += rect.bottom - box.bottom + 12
          } else if (rect.top < box.top + 4) {
            popInput.scrollTop -= box.top - rect.top + 12
          }
        }

        function syncAdoptTone() {
          popInput.dataset.adopt = hasAdoptNote(noteValue()) ? '1' : '0'
        }

        function showPopover(options) {
          popTitle.textContent = options.title
          popQuote.textContent = options.quote.length > 400 ? `${options.quote.slice(0, 400)}…` : options.quote
          popQuote.style.display = options.quote === '' ? 'none' : ''
          popQuoteLabel.style.display = options.quote === '' ? 'none' : ''
          popSource.textContent = options.sourceText
          setNoteContent(options.note)
          updateSuggestion()
          resetPopImages(options.images)
          popoverMode = options.mode
          popoverTargetId = options.targetId ?? null
          popDelete.style.display = options.mode === 'edit' ? '' : 'none'
          hideToolbar()
          resetPopInputHeight()
          popoverTouched = false
          popoverHovered = false
          popoverSource = options.source === 'hover' ? 'hover' : 'manual'
          cancelHoverOpen()
          cancelHoverClose()
          popover.dataset.open = '1'
          if (options.rect !== undefined && options.rect !== null) placePopover(options.rect)
          syncPopInputHeight()
          const focusEditor = () => {
            if (popover.dataset.open !== '1') return
            safe(() => popInput.focus({ preventScroll: true }))
            safe(() => caretToEnd())
          }
          focusEditor()
          safe(() => window.requestAnimationFrame(focusEditor))
          safe(() => window.setTimeout(focusEditor, 60))
          safe(() => window.setTimeout(focusEditor, 180))
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

        /**
         * 修改一条既有批注。
         * 这是编号角标点击后的默认行为 ——点它是要改这一条，不是打开列表。
         * @param id - 目标批注 id。
         * @param anchor - 用来定位弹层的元素（角标或列表里的「编辑」按钮）。
         */
        function openEditPopover(id, anchor, source = 'manual') {
          const item = annotations.find((candidate) => candidate.id === id)
          if (item === undefined) return
          const measured = safe(() => anchor?.getBoundingClientRect())
          const rect =
            measured ??
            {
              left: window.innerWidth / 2 - 40,
              top: window.innerHeight / 2,
              width: 80,
              height: 0,
              right: window.innerWidth / 2 + 40,
              bottom: window.innerHeight / 2,
            }
          popoverAnchor = null
          showPopover({
            title: t('pop.editTitle', { n: item.number }),
            quote: item.quote,
            sourceText: describeSource(item.source),
            note: item.note,
            images: Array.isArray(item.images) ? item.images : [],
            rect,
            mode: 'edit',
            targetId: id,
            source,
          })
        }

        function closePopover() {
          popover.dataset.open = '0'
          popover.classList.remove('sa-front')
          // 页面刷新、关闭或插件卸载前再存一次：只靠状态变更时保存会丢掉最后几秒的编辑。
          safe(() => popInput.blur())
          popoverAnchor = null
          popoverTargetId = null
          popoverMode = 'create'
          hideSuggestion()
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
          scheduleRepaint()
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
            scheduleRepaint()
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
            const target = popoverTargetId
            const images = popInputImages
            const note = noteValue()
            const before = target === null ? undefined : annotations.find((item) => item.id === target)
            closePopover()
            // 悬停预览只因离开而收起时，内容常常没变；不要白做一次重绘（会让会话视图抖一下）。
            if (before !== undefined && before.note === note && JSON.stringify(before.images) === JSON.stringify(images)) {
              return
            }
            if (target !== null) updateAnnotation(target, note, images)
            return
          }
          const anchor = popoverAnchor
          if (anchor === null) return
          const note = noteValue()
          const images = popInputImages
          if (discardEmpty && shouldDiscardEmpty(popoverMode, note, images)) {
            closePopover()
            return
          }
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

        /** 采纳不走弹层：直接按当前选区落一条带「采纳」字样的批注。*/
        function adoptSelectionDirectly() {
          const selection = pendingSelection
          if (selection === null) return
          hideToolbar()
          closeContextMenu()
          const source = captureSource(selection.range)
          const created = addAnnotation({
            quote: selection.quote,
            note: adoptTextOf(),
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
        }

        /** 把一条已发送记录里的批注原样追加回待发送列表（图片也带上）。*/
        function reuseSentItems(items) {
          const list = Array.isArray(items) ? items : []
          let added = 0
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
            addAnnotation({
              quote: typeof item.quote === 'string' ? item.quote : '',
              note: typeof item.note === 'string' ? item.note : '',
              images,
              source: item.source ?? { kind: 'dom' },
            })
            added += 1
          }
          return added
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
        menuCopy.addEventListener('mousedown', (event) => {
          event.preventDefault()
        })
        menuCopy.addEventListener('click', (event) => {
          event.preventDefault()
          const selection = contextMenuSelection ?? pendingSelection
          closeContextMenu()
          if (selection !== null) copyPlainText(selection.quote)
        })
        popCancel.addEventListener('click', () => closePopover())
        popSave.addEventListener('click', () => {
          commitPopover()
        })
        popDelete.addEventListener('click', () => deleteFromPopover())
        popClose.addEventListener('click', () => closePopover())
        popInput.addEventListener('keydown', (event) => {
          const phrase = adoptTextOf()
          // 采纳 token 是 contenteditable=false，退格与选中由浏览器按整块处理；
          // 手打前几个字时，Tab 把当前内容换成完整的采纳 token。
          if (event.key === 'Tab' && !event.shiftKey) {
            if (acceptSuggestion()) {
              event.preventDefault()
              return
            }
            const value = noteValue()
            if (value !== '' && phrase.startsWith(value)) {
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
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) commitPopover()
        })
        popInput.addEventListener('input', () => {
          const phrase = adoptTextOf()
          const value = noteValue()
          // 手打完整采纳句时直接转成 token，避免留下可拆开的纯文本。
          if (value.endsWith(phrase)) {
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
        // 原生 resize 手柄拖过之后，实际高度会与自动值不同 —— 从此不再覆盖用户的选择。
        popInput.addEventListener('pointerup', () => {
          if (!popInputAutoHeight) return
          if (Math.abs(popInput.offsetHeight - popInputAutoValue) > 2) popInputAutoHeight = false
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

        function hitHighlight(x, y) {
          for (const entry of highlightHits) {
            for (const rect of entry.rects) {
              if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return entry
            }
          }
          return undefined
        }

        function onHoverMove(event) {
          const open = popover.dataset.open === '1'
          const hit = highlightHits.length === 0 ? undefined : hitHighlight(event.clientX, event.clientY)
          if (open) {
            // 主动点开的弹层不会被悬停逻辑关掉；只有悬停预览才自动收。
            if (popoverSource !== 'hover') return
            if (popoverTouched || popoverHovered) return
            if (hit !== undefined) return
            scheduleHoverClose()
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
            const target = annotations.find((item) => item.id === hit.id)
            if (target === undefined) return
            const rect = hit.rects[0]
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
            popoverTouched = true
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
        document.addEventListener(
          'mousemove',
          (event) => {
            const now = Date.now()
            if (now - hoverMoveAt < 60) return
            hoverMoveAt = now
            onHoverMove(event)
          },
          true,
        )
        document.addEventListener('pointerdown', (event) => {
          if (popover.dataset.open !== '1') return
          const target = elementOf(event.target)
          if (target !== null && target.closest('[data-sa-ui="popover"]') !== null) return
          // 大图查看层是弹层的「子视图」：关它不该连带收起批注框。
          if (target !== null && target.closest('[data-sa-ui="viewer"]') !== null) return
          // 点框外算确认这次编辑：已经写下的内容不能因为一次误点就丢掉，
          // 但一个字都没写、也没加图的新批注属于「划完就反悔」，直接丢掉。
          commitPopover(true)
        }, true)
        document.addEventListener('keydown', (event) => {
          if (event.key !== 'Escape') return
          // 大图开着时 Esc 只收大图，弹层留在原地。
          if (imageViewer.dataset.open === '1') {
            closeImageViewer()
            return
          }
          hideToolbar()
          closePopover()
        })
        /* ------------------------------------------- 批注按钮 + 悬浮批注面板 */

        function sourceSummary(item) {
          const source = item.source
          if (source?.kind === 'message') return source.flowKind === 'user' ? t('source.user') : t('source.assistant')
          if (source?.kind === 'reply') return t('source.replyShort', { n: Number.isFinite(source.index) ? source.index : '-' })
          if (source?.kind === 'sent') return t('source.sentShort', { n: Number.isFinite(source.index) ? source.index : '-' })
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
          if (draggedId !== '') moveAnnotation(draggedId, null)
        })
        /** 面板尺寸变化时（例如手动拖高设置输入框）重新贴底。*/
        let panelRaf = 0
        let panelObserver = null
        // 输入框被手动拖高、或内容增减导致面板尺寸变化时，重新计算位置让底边不动。
        if (typeof ResizeObserver === 'function') {
          panelObserver = new ResizeObserver(() => {
            if (!panelOpen || panelRaf !== 0) return
            panelRaf = window.requestAnimationFrame(() => {
              panelRaf = 0
              positionPanel()
            })
          })
          panelObserver.observe(panelEl)
        }

        let panelOpen = false
        let panelAnchor = null
        /** 关闭动画结束后再隐藏面板，避免过渡被 display:none 打断。*/
        let panelHideTimer = 0
        /** 面板底部的图片设置是否展开。*/
        let imageSettingsOpen = false
        /** 面板底部的批注指令设置是否展开。*/
        let instructionSettingsOpen = false

        function button(className, text, onClick) {
          const created = el('button', className, text)
          created.type = 'button'
          created.addEventListener('click', onClick)
          return created
        }

        /** 面板贴着按钮放，优先在按钮上方；高度按上下可用空间自适应。*/
        function positionPanel() {
          if (!panelOpen || panelAnchor === null) return
          const rect = safe(() => panelAnchor.getBoundingClientRect())
          if (rect === undefined) return
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
          panelRoot.style.top = `${Math.max(8, top)}px`
        }

        const panelRenderer = createPanelRenderer({
          t,
          getAnnotations: () => annotations,
          clearAnnotations: () => clearAnnotations(),
          moveAnnotation: (from, to) => moveAnnotation(from, to),
          openEditPopover: (id, head) => openEditPopover(id, head),
          removeAnnotation: (id) => removeAnnotation(id),
          sourceSummary: (item) => sourceSummary(item),
          openImageViewer: (url, name) => openImageViewer(url, name),
          imageSettingsRow: () => imageSettingsRow(),
          instructionSettingsRow: () => instructionSettingsRow(),
          isAdopt: hasAdoptNote,
        })
        const renderPanel = () => panelRenderer.render(panelEl)

        /** 面板底部的图片设置：压缩开关、JPEG 质量、触发压缩的最短边。 */
        function imageSettingsRow() {
          const settings = imageSettingsOf()
          const box = el('div', 'sa-settings')
          const head = el('div', 'sa-settings-head')
          const toggle = button('sa-link', imageSettingsOpen ? t('settings.imagesOpen') : t('settings.imagesClosed'), () => {
            imageSettingsOpen = !imageSettingsOpen
            refreshPanel()
          })
          head.appendChild(toggle)
          head.appendChild(
            el(
              'span',
              'sa-hint',
              settings.compress
                ? t('settings.imagesOn', { n: Math.round(settings.quality * 100) })
                : t('settings.imagesOff'),
            ),
          )
          box.appendChild(head)
          if (!imageSettingsOpen) return box

          const compressRow = el('label', 'sa-setting')
          const compress = document.createElement('input')
          compress.type = 'checkbox'
          compress.checked = settings.compress
          compress.addEventListener('change', () => {
            imageSettingsOf().compress = compress.checked
            persistImageSettings()
            refreshPanel()
          })
          compressRow.append(compress, document.createTextNode(t('settings.compress')))
          box.appendChild(compressRow)

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
          })
          qualityRow.append(document.createTextNode(t('settings.quality')), quality, qualityText)
          box.appendChild(qualityRow)

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
          box.appendChild(sizeRow)

          return box
        }

        /** 面板底部的批注指令设置：可编辑，一键恢复默认。*/
        function instructionSettingsRow() {
          const box = el('div', 'sa-settings')
          const head = el('div', 'sa-settings-head')
          const toggle = button('sa-link', instructionSettingsOpen ? t('settings.instructionOpen') : t('settings.instructionClosed'), () => {
            instructionSettingsOpen = !instructionSettingsOpen
            refreshPanel()
          })
          head.appendChild(toggle)
          head.appendChild(el('span', 'sa-hint', isDefaultInstruction(instructionOf()) ? t('settings.default') : t('settings.customized')))
          box.appendChild(head)
          if (!instructionSettingsOpen) return box

          const area = document.createElement('textarea')
          area.className = 'sa-setting-textarea'
          area.rows = 6
          area.value = instructionOf()
          area.addEventListener('input', () => persistInstructionSettings(area.value))
          box.appendChild(area)

          const actions = el('div', 'sa-settings-actions')
          actions.appendChild(
            button('sa-link', t('settings.restore'), () => {
              persistInstructionSettings(defaultInstruction())
              refreshPanel()
            }),
          )
          actions.appendChild(el('span', 'sa-hint', t('settings.instrHint')))
          box.appendChild(actions)

          return box
        }

        /** 面板内容高度变化时重渲染并重新定位；面板在上方时底边因此保持不动。*/
        function refreshPanel() {
          renderPanel()
          if (panelOpen) positionPanel()
        }

        function openPanel(anchor) {
          panelOpen = true
          panelAnchor = anchor
          if (panelHideTimer !== 0) {
            window.clearTimeout(panelHideTimer)
            panelHideTimer = 0
          }
          panelRoot.style.display = ''
          panelRoot.dataset.open = '0'
          renderPanel()
          positionPanel()
          // 先强制回流，确保从隐藏态开始过渡。
          void panelRoot.offsetHeight
          panelRoot.dataset.open = '1'
          emit()
        }

        function closePanel() {
          if (!panelOpen) return
          panelOpen = false
          panelAnchor = null
          panelRoot.dataset.open = '0'
          if (panelHideTimer !== 0) window.clearTimeout(panelHideTimer)
          panelHideTimer = window.setTimeout(() => {
            panelHideTimer = 0
            if (!panelOpen) panelRoot.style.display = 'none'
          }, 180)
          emit()
        }

        function togglePanel(anchor) {
          if (panelOpen) closePanel()
          else openPanel(anchor)
        }

        document.addEventListener(
          'pointerdown',
          (event) => {
            if (!panelOpen) return
            const target = elementOf(event.target)
            if (target === null) return
            if (target.closest('[data-sa-ui="panel"]') !== null) return
            if (target.closest('[data-sa-ui="popover"]') !== null) return
            if (target.closest('.sa-chip') !== null) return
            closePanel()
          },
          true,
        )
        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') closePanel()
        })

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
              className: local.open ? 'sa-chip sa-chip-open' : 'sa-chip',
              type: 'button',
              title: count === 0 ? t('chip.emptyTitle') : t('chip.title'),
              onClick: (event) => togglePanel(event.currentTarget),
            },
            count === 0 ? t('chip.label') : t('chip.count', { n: count }),
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
          const onUnload = () => saveDraft(annotationsSession)
          window.addEventListener('beforeunload', onUnload)
          window.addEventListener('pagehide', onUnload)
          return () => {
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
                  if (remote !== null && remote !== undefined && absorbRemoteReplies(sessionId, remote)) {
                    scheduleRepaint()
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
          const onSelectPointerDown = (event) => {
            const target = elementOf(event.target)
            if (target !== null && target.closest('[data-sa-ui]') !== null) return
            if (popover.dataset.open === '1' && target !== null && target.closest('[data-sa-ui="popover"]') !== null) return
            pointerSelecting = true
            hideToolbar()
          }
          document.addEventListener('pointerdown', onSelectPointerDown, true)
          // 记住划线结束的位置；工具条要贴在这里，而不是 range 的末尾矩形。
          const onPointerUp = (event) => {
            const target = elementOf(event.target)
            if (target !== null && target.closest('[data-sa-ui="toolbar"], [data-sa-ui="menu"], [data-sa-ui="suggest"]') !== null) return
            // 在弹层里松手（包括拖标题）不算划线结束，不重算工具条。
            if (target !== null && target.closest('[data-sa-ui="popover"], [data-sa-ui="ghost"]') !== null) return
            pointerSelecting = false
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
            if (popDrag === null || popover.dataset.open !== '1') return
            const left = Math.max(8, Math.min(event.clientX - popDrag.dx, window.innerWidth - popDrag.width - 8))
            const top = Math.max(8, Math.min(event.clientY - popDrag.dy, window.innerHeight - popDrag.height - 8))
            popover.style.left = `${left}px`
            popover.style.top = `${top}px`
          }
          const onPopDragUp = () => {
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
          }
          const onMenuKeydown = (event) => {
            if (event.key === 'Escape') closeContextMenu()
          }
          document.addEventListener('pointerdown', onMenuPointerDown, true)
          document.addEventListener('keydown', onMenuKeydown, true)
          const onViewport = () => {
            scheduleRepaint()
            positionPanel()
            closeContextMenu()
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
              scheduleRepaint()
              return
            }
          })
          observer.observe(document.body, { childList: true, subtree: true, characterData: true })
          return () => {
            markdown.dispose()
            document.removeEventListener('selectionchange', onSelectionChange)
          document.removeEventListener('pointerdown', onSelectPointerDown, true)
            document.removeEventListener('pointerup', onPointerUp, true)
          document.removeEventListener('pointerup', onPopDragUp, true)
            document.removeEventListener('pointermove', onPointerMove, true)
            document.removeEventListener('contextmenu', onContextMenu, true)
            document.removeEventListener('pointerdown', onMenuPointerDown, true)
            document.removeEventListener('keydown', onMenuKeydown, true)
            window.removeEventListener('scroll', onViewport, true)
            window.removeEventListener('resize', onViewport)
            observer.disconnect()
          }
        })

        // 只跟随用户点「已完成」这一次操作，不监听 aria-expanded 的程序性变化：
        // 否则 DSH 自己在轮到结束时收起过程块，会把默认展开的答复区一起收掉。
        ctx.effect(() => {
          const onTurnProcessClick = (event) => {
            const target = elementOf(event.target)
            const button = target === null ? null : target.closest('[data-turn-process]')
            if (button === null) return
            window.requestAnimationFrame(() => syncReplyCollapse(button))
          }
          document.addEventListener('click', onTurnProcessClick, true)
          return () => {
            document.removeEventListener('click', onTurnProcessClick, true)
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
          )
        }
        try {
          ctx.slots.inject('plugins.bundle.config', () =>
            ctx.slots.register(
              { name: 'plugins.bundle.config', key: '@u2a5f/dsh-selection-annotations', inject: () => ({}) },
              AnnotationInstructionSettings,
            ),
          )
          } catch (error) {
          console.error('[selection-annotations] 插件详情页设置区注册失败：', error)
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
          repaint,
          remove: removeAnnotation,
          clear: clearAnnotations,
          update: (id, note) => updateAnnotation(id, note),
          add: (input) => addAnnotation(input),
          _internals: { buildPayload, payloadSource, describeSource, captureSource, matchInRoot, rangeFromOffsets, offsetRange, anchorRoot, locateRange, locateInSource, lineOfOffset, resolveSourcePosition, refineSourcePosition, adoptSession, loadDraft, saveDraft, loadSent, saveSent, recordSent, scanSentMessages, buildSentCard, renderSentCards, renderReplySections, buildReplySection, mergeReplyBatches, absorbRemoteReplies, shouldDiscardEmpty, loadImageSettings, syncReplyCollapse, sentCardAnchor, turnOfRow, placeToolbar },
        }
    },
  }
}
