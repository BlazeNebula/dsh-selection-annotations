/**
 * @u2a5f/dsh-selection-annotations — 客户端半边（Web bundle）。
 *
 * 设计要点（用户明确要求）：
 *   - 批注 **不写进消息正文*。既不拼草稿、也不做「发出去再从气泡里藏掉」的手术。
 *   - 批注件*原生附件块*（`file` content part）随消息提交：把批注报告包成一不`File`，
 *     交给运行时自己的 `createDrafts` + 输入外壳的`addFiles`（拖拖粘贴附件走的就是这条
 *     链路）。于是那条用户消息的 content 天然是 `[{type:'text'}, {type:'file'}]` 两个独立块，DSH 官方 UI 就把它们
 *     分开渲染（正文气注+ 附件卡片），宿主半边再把附件块换成一条独立的批注消息发给模型。
 *
 * 另一半职责是「选中即批注」本身：选区 →浮动工具条→批注弹层 →原文高亮 + 编号角标，
 * 锚点只用语义化 `data-*`（`data-chat-anchor-key` / `data-chat-flow-kind` /
 * `data-textpreview-url` / `data-textpreview-line`），不依赖 CSS Modules 哈希类名。
 */
window.__ModuleLoader__.load({
  id: '@u2a5f/dsh-selection-annotations',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** 批注负载的文件名；只是给用户看的，宿主靠 JSON 里的 kind 字段认领。 */
    const ANNOTATION_FILE = '批注.json'
    /** 负载类型标记；客户端与宿主半边共用这个值。*/
    const PAYLOAD_KIND = 'dsh-selection-annotations'
    const MAX_QUOTE = 1600
    const MAX_NOTE = 4000
    /** 单条批注最多能挂几张图；再多会明显拖慢消息序列化。*/
    const MAX_IMAGES_PER_ANNOTATION = 4
    /** 单张图片的字节上限，超过就拒绝（避免把一条消息撑爆）。*/
    const MAX_IMAGE_BYTES = 8 * 1024 * 1024
    /** 图片设置键：压缩开关、质量、触发压缩的最小边。*/
    const IMAGE_SETTINGS_KEY = 'dsh-selection-annotations:image-settings'
    /** 默认设置：80% 质量、最短边超过 100 像素才重编码。 */
    const DEFAULT_IMAGE_SETTINGS = { compress: true, quality: 0.8, minSize: 100 }
    /** 批注指令设置键：随批注数据块发给模型的说明文字。*/
    const INSTRUCTION_SETTINGS_KEY = 'dsh-selection-annotations:instruction-settings'
    /** 默认批注指令；删掉「必须调用annotation_replies」这句，逐条答复会退化成正文自由文本。*/
    const DEFAULT_INSTRUCTION = [
      '这是用户发来的批注数据块。它与用户消息正文相互独立：用户可能同时发了正文，',
      '也可能只发了这个批注块（此时它就是本条消息的全部内容）。annotations[].quote 是用户选中的原文；',
      'annotations[].source 给出它的位置：',
      '工作区文件用 path + lineStart/lineEnd（1 基行号）+ charStart/charEnd；',
      '对话消息用 role + anchorKey + charStart/charEnd。',
      'charStart/charEnd 是半开区间 [charStart, charEnd)，',
      '口径由 source.textOrigin 指明："source" = 文件原文的字符偏移，',
      '"rendered" = 该锚点元素渲染后正文的字符偏移。工作区文件但凡能读到原文就给 "source"；',
      '拿不到原文（或引文跨了 Markdown 标记）时退回 "rendered"。',
      'annotations[].images 是该条批注附带的图片，order 是图片在本条消息图片附件中的 1 基顺序，',
      '请把 order 与消息里图片的出现顺序对照。处理完这批批注后，',
      '必须调用 annotation_replies 工具提交逐条答复，不要在正文里重复逐条内容：',
      'replies 里每一项对应一条批注，index 与 annotations[].index 一致，',
      'verdict 取 accepted / partial / rejected / needs_info，',
      'reason 写理由，next 写下一步。正文只用来说明整体改动或提出需要澄清的问题。',
    ].join('')
    /** 草稿在本地存储里的体积上限；超了先丢最旧批注的图片。*/
    const DRAFT_MAX_BYTES = 3.5 * 1024 * 1024
    /** 鼠标停在已批注原文上多久打开编辑框。*/
    const HOVER_OPEN_DELAY_MS = 500
    /** 选区稳定后再弹工具条，避免拖选过程中抖动。*/
    const SETTLE_MS = 220
    /** 批注集合变化后合并上传，避免每敲一个字都发一次请求。*/
    const UPLOAD_DEBOUNCE_MS = 450
    /** 等草稿附件上传就绪的上限；超时就本次不挂，绝不制造发送失败。*/
    const UPLOAD_READY_TIMEOUT_MS = 10000
    /** 装饰重绘合并窗口。*/
    const REPAINT_MS = 120
    /** 拉取式消费检测的间隔：不依赖 composer 是否发布通知。*/
    const CONSUME_POLL_MS = 1000
    /** 输入态说「附件没了」之后，隔多久向运行时求证（提交可能只是暂时移走）。*/
    const CONSUME_CONFIRM_MS = 400
    /** 读源文件求行号的超时；超时就退回渲染坐标，不拖住保存。*/
    const SOURCE_LOOKUP_TIMEOUT_MS = 600
    /** 认领「上一轮遗留的孤儿批注附件」的间隔。*/
    const ORPHAN_SWEEP_MS = 1500
    /** 首次上传最多为在途的位置精修等多也——精修通常几十毫秒，这只是个上限。*/
    const REFINE_WAIT_MS = 1200
    /** 发出后仍可能被运行时 restore 回来的孤儿附件，要盯多久。 */
    const STRAY_GUARD_MS = 120000

    const CSS = `
.sa-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 60; }
.sa-hl { position: fixed; pointer-events: none; border-radius: 3px;
  background: rgb(255 208 66 / 0.45); box-shadow: inset 0 -1px 0 rgb(255 176 0 / 0.75); }
.sa-badge { position: fixed; pointer-events: auto; cursor: pointer; font: inherit; border: none; padding: 0 3px; min-width: 15px; height: 15px; padding: 0 3px; box-sizing: border-box;
  display: inline-flex; align-items: center; justify-content: center; border-radius: 8px;
  background: var(--dsw-alias-brand-primary, #247bbf); color: #fff; font-size: 10px; line-height: 1;
  font-weight: 600; font-variant-numeric: tabular-nums; }
.sa-toolbar { position: fixed; display: none; z-index: 61; }
.sa-toolbar[data-open="1"] { display: block; }
.sa-btn { font: inherit; font-size: 12px; line-height: 1; padding: 6px 10px; cursor: pointer;
  color: var(--dsw-alias-label-primary, CanvasText); background: var(--dsw-alias-bg-overlay, Canvas);
  border: 1px solid var(--dsw-alias-border-l2, ButtonBorder); border-radius: 7px;
  box-shadow: 0 4px 14px rgba(0,0,0,.18); }
.sa-btn:hover { border-color: var(--dsw-alias-brand-primary, #247bbf); color: var(--dsw-alias-brand-primary, #247bbf); }
.sa-popover { position: fixed; display: block; z-index: 70; width: 340px; max-width: calc(100vw - 24px);
  padding: 10px; box-sizing: border-box; border-radius: 10px; color: var(--dsw-alias-label-primary, CanvasText);
  background: var(--dsw-alias-bg-overlay, Canvas); border: 1px solid var(--dsw-alias-border-l2, ButtonBorder);
  box-shadow: 0 10px 32px rgba(0,0,0,.24);
  opacity: 0; visibility: hidden; transform: translateY(-6px) scale(0.98);
  will-change: opacity, transform;
  transition: opacity 180ms ease, transform 180ms ease, visibility 180ms; }
.sa-popover[data-open="1"] { opacity: 1; visibility: visible; transform: none; }
.sa-viewer { position: fixed; inset: 0; z-index: 80; display: none; align-items: center; justify-content: center;
  background: rgb(0 0 0 / 0.72); cursor: zoom-out; }
.sa-viewer[data-open="1"] { display: flex; }
.sa-viewer-img { max-width: 92vw; max-height: 88vh; box-sizing: border-box; border-radius: 6px;
  background: #fff; box-shadow: 0 12px 48px rgb(0 0 0 / 0.5); }
.sa-pop-title { font-size: 12px; font-weight: 600; margin: 0 0 6px; }
.sa-pop-quote { max-height: 120px; overflow: auto; margin: 0 0 8px; padding: 6px 8px; font-size: 12px;
  white-space: pre-wrap; word-break: break-word; color: var(--dsw-alias-label-secondary, GrayText);
  background: var(--dsw-alias-bg-layer-2, ButtonFace); border-left: 2px solid var(--dsw-alias-border-l2, ButtonBorder); border-radius: 4px; }
.sa-pop-src { margin: 0 0 8px; font-size: 11px; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-pop-input { width: 100%; box-sizing: border-box; min-height: 62px; resize: vertical; padding: 6px 8px;
  font: inherit; font-size: 12px; color: var(--dsw-alias-label-primary, CanvasText); background: var(--dsw-alias-bg-layer-1, Canvas);
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 6px; }
.sa-pop-actions { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.sa-pop-spacer { flex: 1; }
.sa-pop-delete { color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-float { position: fixed; z-index: 63; max-width: calc(100vw - 16px); }
.sa-chip { font: inherit; font-size: 12px; line-height: 1; padding: 5px 9px; cursor: pointer;
  color: var(--dsw-alias-brand-primary, #247bbf); background: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 38%, transparent); border-radius: 999px; }
.sa-chip:hover { background: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 22%, transparent); }
.sa-chip-open { background: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 30%, transparent); }
.sa-panel { width: min(520px, calc(100vw - 32px)); max-height: min(72vh, 560px); overflow: auto; padding: 10px;
  box-sizing: border-box; border-radius: 10px; color: var(--dsw-alias-label-primary, CanvasText);
  background: var(--dsw-alias-bg-layer-1, Canvas); border: 1px solid var(--dsw-alias-border-l2, ButtonBorder);
  opacity: 0; visibility: hidden; transform: translateY(6px) scale(0.98); will-change: opacity, transform;
  transition: opacity 180ms ease, transform 180ms ease, visibility 180ms; }
.sa-float[data-open="1"] .sa-panel { opacity: 1; visibility: visible; transform: none; }
.sa-item { padding: 10px 0; border-bottom: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-item:last-child { border-bottom: none; }
.sa-item.sa-dragging { opacity: 0.45; }
.sa-item.sa-drop-before { box-shadow: inset 0 2px 0 var(--dsw-alias-brand-primary, #247bbf); }
.sa-drag-handle { cursor: grab; color: var(--dsw-alias-label-secondary, GrayText); font-size: 12px; line-height: 1;
  padding: 2px 3px; border-radius: 4px; user-select: none; }
.sa-drag-handle:hover { background: var(--dsw-alias-bg-layer-2, ButtonFace); color: var(--dsw-alias-label-primary, CanvasText); }
.sa-drag-handle:active { cursor: grabbing; }
.sa-item-head { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item-num { font-weight: 600; color: var(--dsw-alias-brand-primary, #247bbf); }
.sa-item-src { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sa-item-q { margin-top: 6px; padding-left: 9px; border-left: 2px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-item-label { font-size: 10px; letter-spacing: 0.04em; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item-quote { margin: 2px 0 0; font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;
  color: var(--dsw-alias-label-secondary, GrayText); display: -webkit-box; -webkit-box-orient: vertical;
  -webkit-line-clamp: 3; overflow: hidden; cursor: pointer; }
.sa-item-quote.sa-q-open { display: block; -webkit-line-clamp: unset; }
.sa-item-a { margin-top: 8px; }
.sa-item-note { margin: 2px 0 0; font-size: 13.5px; line-height: 1.65; white-space: pre-wrap; word-break: break-word;
  color: var(--dsw-alias-label-primary, CanvasText); }
.sa-link { font: inherit; font-size: 11px; padding: 2px 4px; cursor: pointer; background: none; border: none;
  color: var(--dsw-alias-label-secondary, GrayText); text-decoration: underline; }
.sa-link:hover { color: var(--dsw-alias-state-error-primary, #e5484d); }
.sa-foot { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.sa-search { flex: 1; box-sizing: border-box; padding: 5px 8px; font: inherit; font-size: 12px;
  color: var(--dsw-alias-label-primary, CanvasText); background: var(--dsw-alias-bg-layer-2, ButtonFace);
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 6px; }
.sa-result { display: block; width: 100%; text-align: left; font: inherit; font-size: 12px; padding: 5px 6px;
  cursor: pointer; background: none; border: none; border-radius: 6px; color: var(--dsw-alias-label-primary, CanvasText); }
.sa-result:hover { background: var(--dsw-alias-bg-layer-2, ButtonFace); }
.sa-hint { font-size: 11px; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-pop-images { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 6px; }
.sa-pop-image { position: relative; width: 56px; height: 56px; border-radius: 6px; overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); background: var(--dsw-alias-bg-layer-2, ButtonFace); }
.sa-pop-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
.sa-pop-thumb-fallback { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;
  box-sizing: border-box; padding: 2px; font-size: 10px; text-align: center; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-pop-image-remove { position: absolute; top: 0; right: 0; width: 16px; height: 16px; padding: 0; line-height: 1;
  cursor: pointer; border: none; border-radius: 0 0 0 6px; font-size: 11px; color: #fff; background: rgb(0 0 0 / 0.55); }
.sa-pop-images-hint { font-size: 11px; color: var(--dsw-alias-label-secondary, GrayText); }
.sa-item-images { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
.sa-item-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 4px;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-settings { margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-settings-head { display: flex; align-items: center; gap: 8px; }
.sa-setting { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 11px;
  color: var(--dsw-alias-label-secondary, GrayText); }
.sa-setting-value { min-width: 34px; font-variant-numeric: tabular-nums; }
.sa-setting-number { width: 68px; }
.sa-setting-textarea { width: 100%; min-height: 96px; box-sizing: border-box; resize: vertical; margin-top: 6px;
  padding: 6px 8px; font: inherit; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-primary, CanvasText);
  background: var(--dsw-alias-bg-layer-2, ButtonFace); border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); border-radius: 6px; }
.sa-settings-actions { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.sa-settings-page { display: flex; flex-direction: column; gap: 8px; padding: 4px 2px 8px; }
.sa-settings-page-head { display: flex; align-items: center; gap: 8px; }
.sa-settings-page .sa-hint { font-size: 12px; line-height: 1.6; margin: 0; }
.sa-replies-card { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-secondary, #3333); border-radius: 10px; background: var(--dsw-alias-bg-secondary, #0001); }
.sa-replies { display: flex; flex-direction: column; gap: 10px; margin: 8px 0 0; width: 100%; max-width: none; box-sizing: border-box; padding: 12px 14px;
  border: 1px solid var(--dsw-alias-border-secondary, #3333); border-radius: 10px;
  background: var(--dsw-alias-bg-secondary, #0001); }
.sa-replies-head { display: flex; align-items: baseline; gap: 8px; font-size: 12px; line-height: 1.4;
  color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-replies-title { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary, CanvasText); }
.sa-replies-summary { color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-replies-body { display: flex; flex-direction: column; }
.sa-reply-item { display: flex; flex-direction: column; gap: 8px; padding: 12px 0; border-top: 1px solid var(--dsw-alias-border-secondary, #3333); }
.sa-reply-item:first-child { border-top: none; padding-top: 2px; }
.sa-q { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding-left: 10px;
  border-left: 2px solid var(--dsw-alias-border-l1, ButtonBorder); }
.sa-q-head { font-size: 11px; letter-spacing: 0.02em; color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-q-quote { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
  font-size: 12.5px; line-height: 1.55; color: var(--dsw-alias-label-secondary, #8b949e);
  white-space: pre-wrap; word-break: break-word; cursor: pointer; }
.sa-q-quote.sa-q-open { display: block; -webkit-line-clamp: unset; }
.sa-q-note { font-size: 14px; line-height: 1.65; color: var(--dsw-alias-label-primary, CanvasText);
  white-space: pre-wrap; word-break: break-word; }
.sa-a { display: flex; flex-direction: column; gap: 4px; }
.sa-a-head { display: flex; align-items: center; gap: 8px; }
.sa-a-label { font-size: 11px; color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-a-verdict { font-size: 12px; font-weight: 600; padding: 1px 8px; border-radius: 999px;
  border: 1px solid currentColor; background: transparent; }
.sa-reply-accepted { color: #3fb950; }
.sa-reply-partial { color: #d29922; }
.sa-reply-rejected { color: #f85149; }
.sa-reply-needs_info { color: #58a6ff; }
.sa-a-reason { font-size: 15px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
.sa-a-next { font-size: 12.5px; color: var(--dsw-alias-label-secondary, #8b949e); }
.sa-sent { display: block; margin: 8px 0 0; width: 100%; max-width: none; box-sizing: border-box; }
.sa-sent-head { font: inherit; font-size: 11px; line-height: 1; padding: 4px 8px; cursor: pointer;
  color: var(--dsw-alias-brand-primary, #247bbf); background: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 32%, transparent); border-radius: 999px; }
.sa-sent-head[data-open="1"] { background: color-mix(in srgb, var(--dsw-alias-brand-primary, #247bbf) 20%, transparent); }
.sa-sent-body { margin-top: 6px; padding: 6px 8px; box-sizing: border-box; border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); background: var(--dsw-alias-bg-layer-1, Canvas); }
.sa-sent-item { display: flex; gap: 6px; padding: 8px 0; font-size: 12px; line-height: 1.5;
  border-top: 1px solid var(--dsw-alias-border-secondary, #3333); }
.sa-sent-item:first-child { border-top: none; padding-top: 2px; }
.sa-sent-num { flex: none; min-width: 14px; font-weight: 600; color: var(--dsw-alias-brand-primary, #247bbf); }
.sa-sent-text { min-width: 0; }
.sa-sent-quote { padding-left: 8px; border-left: 2px solid var(--dsw-alias-border-l1, ButtonBorder);
  font-size: 12.5px; color: var(--dsw-alias-label-secondary, GrayText); white-space: pre-wrap; word-break: break-word; }
.sa-sent-note { margin-top: 4px; font-size: 14px; line-height: 1.6; color: var(--dsw-alias-label-primary, CanvasText); white-space: pre-wrap; word-break: break-word; }
.sa-sent-thumbs { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.sa-sent-thumb { width: 96px; height: 96px; object-fit: cover; border-radius: 6px; cursor: zoom-in;
  border: 1px solid var(--dsw-alias-border-l1, ButtonBorder); }
`

    return {
      name: '@u2a5f/dsh-selection-annotations',
      // 客户端上下文只把**已声明的**服务/命名空间挂到 ctx 上：
      // `remote` 是远程门面，`remote.workspaceFiles` 是其中一个命名空间。少声明一个，
      // 取值就会直接抛（实测 `remote.workspaceFiles` 抛，导致读原文整条失败）——
      // 官方同类插件（dsh-client-ui-sidebar-documentpreview、dsh-api-workspace-files）都这么写。
      inject: ['slots', 'sessions', 'conversation', 'remote', 'remote.workspaceFiles'],
      apply(ctx) {
    /**
     * 客户端半边只提供 `console.log` 与 `console.error` —— **没有 `console.warn`**。
     * 而且日志本身不该有能力搞坏主流程（一次 console.warn 抛错就会把整条精修链路打断），
     * 所以统一包一层，绝不外抛。
     */
    const log = (message, ...rest) => {
      try {
        console.log(message, ...rest)
      } catch {
        /* 日志失败无所调*/
      }
    }
    const warn = (message, ...rest) => {
      try {
        console.error(message, ...rest)
      } catch {
        /* 日志失败无所调*/
      }
    }
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
        /** 由槽位标准 props 注入的 composer 动作与当前会话 id —— 比自行解析 scope 更稳。 */
        let latestInputActions = undefined
        let latestSessionId = undefined
        /** 批注集合归属的会话；切换会话时按会话换入换出草稿，避免批注跑到别的会话里。*/
        let annotationsSession = undefined
        /** 未提交批注草稿的本地存储前缀：按会话分键，切走再回来、刷新页面都还能接着改。*/
        const DRAFT_STORAGE_PREFIX = 'dsh-selection-annotations:draft:'
        /** 最多保留多少个会话的草稿；超出按保存时间淘汰最旧的。*/
        const DRAFT_MAX_SESSIONS = 24
        /** 单个会话最多保存多少条草稿批注，避免异常数据把存储写满。*/
        const DRAFT_MAX_ITEMS = 200
        /** 已载入会话的草稿（sessionId → 可序列化条目），切换会话时先在内存里换入换出。 */
        const draftSessions = new Map()
        /** 已提交批注的本地台账前缀：按会话分键，用消息锚点键索引，供对话历史回看。*/
        const SENT_STORAGE_PREFIX = 'dsh-selection-annotations:sent:'
        /** 每个会话最多保留多少条已提交记录。*/
        const SENT_MAX_ENTRIES = 120
        /** 已提交台账的体积预算：超出时先丢图片，文字永远保留。*/
        const SENT_MAX_BYTES = 2 * 1024 * 1024
        /** 轮询宿主答复的间隔：模型答复通常紧跟发送，6 秒足够且只请求本机路由。*/
        const REPLY_POLL_MS = 6000
        /** 已提交批注台账（sessionId → Map(anchorKey → 记录)）。 */
        const sentBySession = new Map()
        /** 刚随消息发出、还在等对应消息行出现的负载。*/
        let pendingSent = []
        /** 最后一次成功挂附件时页面上已有的批注消息锚点键；发送后据此区分新消息与旧历史。*/
        let lastAnnotatedKeys = new Set()
        /** 图片设置缓存；第一次用到时从本地存储读。*/
        let imageSettings
        /** 批注指令缓存；第一次用到时从本地存储读。*/
        let instructionSettings
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

        const safe = (fn) => {
          try {
            return fn()
          } catch {
            return undefined
          }
        }

        function elementOf(node) {
          if (node === null || node === undefined) return null
          if (node.nodeType === 1) return node
          return node.parentElement ?? null
        }

        /** 当前会话 id：优先槽位 props，其次 uiSession 的 current 绑定，最后退回会话列表。 */
        function currentSessionId() {
          if (typeof latestSessionId === 'string' && latestSessionId !== '') return latestSessionId
          const fromUi = safe(() => {
            const binding = ctx.get('uiSession')?.adapter?.current?.getSnapshot?.()
            return typeof binding?.key === 'string' && binding.key !== '' ? binding.key : undefined
          })
          if (fromUi !== undefined) return fromUi
          return safe(() => {
            const snap = ctx.sessions?.list?.getSnapshot?.()
            if (snap === undefined || snap === null) return undefined
            if (typeof snap.current === 'string' && snap.current !== '') return snap.current
            const ids = Array.isArray(snap.ids) ? snap.ids : Object.keys(snap.byId ?? {})
            for (const id of ids) {
              const retained = snap.byId?.[id]?.retainedBy
              if (retained !== null && typeof retained === 'object' && retained.mainView > 0) return id
            }
            return undefined
          })
        }

        /** 当前会话的composer 输入外壳；拿不到就静默降级（批注仍可记录，只是不随消息发送）。*/
        function inputShell() {
          const sessionId = currentSessionId()
          if (sessionId === undefined) return undefined
          return safe(() => {
            const scoped = ctx.sessions.scope(sessionId)
            if (scoped === undefined || scoped === null) return undefined
            return ctx.conversation.input.for(scoped)
          })
        }

        /**
         * 输入外壳**实时**持有的草稿附件 id。
         *
         * 刻意不用运行时那张私有草稿表：只发附件（无正文）时，输入态已经交出了附件，
         * 但运行时仍会持有条目直到 admission 结算 —— 拿它当判据就永远等不到「已消费」。
         * @returns id 数组；拿不到时返回 undefined（此时不判定）。
         */
        function liveAttachmentIds(shell) {
          if (Array.isArray(shell?.attachmentIds)) return shell.attachmentIds
          const snapshot = safe(() => shell?.state?.getSnapshot())
          return Array.isArray(snapshot?.attachmentIds) ? snapshot.attachmentIds : undefined
        }

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
                thumbs.push({ name: typeof image.name === 'string' ? image.name : '图片', dataUrl: image.thumb })
              }
              return thumbs.length > 0 ? { ...annotation, thumbs } : annotation
            })
            pendingSent.push({
              items,
              known: lastAnnotatedKeys,
              at: Date.now(),
            })
            lastAnnotatedKeys = new Set()
          }
          annotations = []
          emit()
          scheduleRepaint()
          // 草稿存储也要跟着清掉：否则刷新后这批已发出的批注会「复活」。
          saveDraft(annotationsSession)
          log(`[selection-annotations] 批注已随消息发出（${reason}）`)
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

        /* --------------------------------------------------------------- 图片处理 */

        /** 图片设置：读坏了回落到默认值。*/
        function loadImageSettings() {
          const settings = { ...DEFAULT_IMAGE_SETTINGS }
          const storage = draftStorage()
          if (storage === undefined) return settings
          const parsed = safe(() => JSON.parse(storage.getItem(IMAGE_SETTINGS_KEY) ?? 'null'))
          if (parsed === null || typeof parsed !== 'object') return settings
          settings.compress = parsed.compress !== false
          const quality = Number(parsed.quality)
          if (Number.isFinite(quality)) settings.quality = Math.min(1, Math.max(0.1, quality))
          const minSize = Number(parsed.minSize)
          if (Number.isFinite(minSize)) settings.minSize = Math.min(4096, Math.max(0, Math.round(minSize)))
          return settings
        }

        function imageSettingsOf() {
          if (imageSettings === undefined) imageSettings = loadImageSettings()
          return imageSettings
        }

        function persistImageSettings() {
          const storage = draftStorage()
          if (storage === undefined) return
          safe(() => storage.setItem(IMAGE_SETTINGS_KEY, JSON.stringify(imageSettingsOf())))
        }

        /** 批注指令：读坏了或读成空串时回落到默认文案。*/
        function loadInstructionSettings() {
          const storage = draftStorage()
          if (storage === undefined) return DEFAULT_INSTRUCTION
          const parsed = safe(() => JSON.parse(storage.getItem(INSTRUCTION_SETTINGS_KEY) ?? 'null'))
          if (parsed === null || typeof parsed !== 'object') return DEFAULT_INSTRUCTION
          const text = typeof parsed.text === 'string' ? parsed.text : ''
          return text.trim() === '' ? DEFAULT_INSTRUCTION : text
        }

        function instructionOf() {
          if (instructionSettings === undefined) instructionSettings = loadInstructionSettings()
          return instructionSettings
        }

        function persistInstructionSettings(text) {
          instructionSettings = text
          const storage = draftStorage()
          if (storage === undefined) return
          safe(() => storage.setItem(INSTRUCTION_SETTINGS_KEY, JSON.stringify({ text })))
        }

        function jpegName(name) {
          const base = typeof name === 'string' && name !== '' ? name : 'image'
          return `${base.replace(/\.[^.]+$/, '')}.jpg`
        }

        /**
         * 按设置把图片重编码成 JPEG。透明区域先填白 —— JPEG 没有 alpha，不填会变黑。
         * 压缩没变小、或不需要压缩时保留原文件，避免把小图越压越大。
         */
        async function compressImage(file) {
          const settings = imageSettingsOf()
          if (!settings.compress) return file
          if (typeof createImageBitmap !== 'function') return file
          let bitmap
          try {
            bitmap = await createImageBitmap(file)
          } catch {
            return file
          }
          try {
            if (Math.max(bitmap.width, bitmap.height) <= settings.minSize) return file
            const canvas = document.createElement('canvas')
            canvas.width = bitmap.width
            canvas.height = bitmap.height
            const painter = canvas.getContext('2d')
            if (painter === null) return file
            painter.fillStyle = '#ffffff'
            painter.fillRect(0, 0, canvas.width, canvas.height)
            painter.drawImage(bitmap, 0, 0)
            const blob = await new Promise((resolve) => {
              try {
                canvas.toBlob(resolve, 'image/jpeg', settings.quality)
              } catch {
                resolve(null)
              }
            })
            if (blob === null || blob.size >= file.size) return file
            return new File([blob], jpegName(file.name), { type: 'image/jpeg' })
          } finally {
            safe(() => bitmap.close?.())
          }
        }

        /**
         * 生成一张小缩略图（data URL）。已提交台账里只放缩略图：原尺寸 data URL 会把存储撑爆，
         * 而清单里需要的是「看得出是哪张图。 点击放大。
         */
        async function downscaleDataUrl(file, maxSide, quality) {
          if (typeof createImageBitmap !== 'function') return undefined
          let bitmap
          try {
            bitmap = await createImageBitmap(file)
          } catch {
            return undefined
          }
          try {
            const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
            const width = Math.max(1, Math.round(bitmap.width * scale))
            const height = Math.max(1, Math.round(bitmap.height * scale))
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const painter = canvas.getContext('2d')
            if (painter === null) return undefined
            painter.fillStyle = '#ffffff'
            painter.fillRect(0, 0, width, height)
            painter.drawImage(bitmap, 0, 0, width, height)
            const blob = await new Promise((resolve) => {
              try {
                canvas.toBlob(resolve, 'image/jpeg', quality)
              } catch {
                resolve(null)
              }
            })
            if (blob === null) return undefined
            return await fileToDataUrl(new File([blob], 'thumb.jpg', { type: 'image/jpeg' }))
          } finally {
            safe(() => bitmap.close?.())
          }
        }

        function fileToDataUrl(file) {
          return new Promise((resolve) => {
            try {
              const reader = new FileReader()
              reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined)
              reader.onerror = () => resolve(undefined)
              reader.readAsDataURL(file)
            } catch {
              resolve(undefined)
            }
          })
        }

        /** 从本地存储恢复的图片只有 data URL：重新构造 File 才能在发送时带上字节。 */
        function dataUrlToFile(image) {
          if (typeof image?.dataUrl !== 'string' || image.dataUrl === '') return undefined
          return safe(() => {
            const comma = image.dataUrl.indexOf(',')
            if (comma < 0) return undefined
            const header = image.dataUrl.slice(0, comma)
            const match = header.match(/^data:([^;]+)/)
            const mime = match?.[1] ?? 'image/jpeg'
            const binary = atob(image.dataUrl.slice(comma + 1))
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
            const name = typeof image.name === 'string' && image.name !== '' ? image.name : 'image.jpg'
            return new File([bytes], name, { type: mime })
          })
        }

        /* --------------------------------------------------------- 宿主侧落盘通道 */

        /** 落盘通道的可用性：undefined = 还没探测，true / false = 已探测结果。 */
        let remoteStoreState

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

        function storeUrl(sessionId) {
          return `/selection-annotations/session/${encodeURIComponent(sessionId)}`
        }

        /** 读一个会话的落盘记录；连不上或格式不对都返回 undefined（调用方退回本地）。 */
        async function pullRemoteSession(sessionId) {
          if (typeof fetch !== 'function') {
            remoteStoreState = false
            return undefined
          }
          try {
            const response = await fetch(storeUrl(sessionId), { method: 'GET', headers: { accept: 'application/json' } })
            if (response.status === 204) {
              remoteStoreState = true
              return null
            }
            if (!response.ok) {
              remoteStoreState = false
              return undefined
            }
            const data = await response.json()
            remoteStoreState = true
            return data !== null && typeof data === 'object' && !Array.isArray(data) ? data : null
          } catch {
            remoteStoreState = false
            return undefined
          }
        }

        /** 当前会话的可落盘快照：草稿与已提交台账（落盘不做体积裁剪）。*/
        function sessionSnapshot(sessionId) {
          const drafts =
            annotationsSession === sessionId ? draftItems(annotations) : draftSessions.get(sessionId) ?? []
          const sent = {}
          for (const [key, value] of sentBySession.get(sessionId) ?? []) sent[key] = value
          return { schemaVersion: 1, sessionId, updatedAt: new Date().toISOString(), drafts, sent }
        }

        async function pushRemoteSession(sessionId) {
          if (typeof fetch !== 'function') return
          try {
            const response = await fetch(storeUrl(sessionId), {
              method: 'PUT',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(sessionSnapshot(sessionId)),
            })
            remoteStoreState = response.ok
          } catch {
            remoteStoreState = false
          }
        }

        let remotePushTimer = null
        const remotePushQueue = new Set()

        /** 合并 600ms 内的写入，避免每敲一个字就发一次请求。 */
        function scheduleRemotePush(sessionId) {
          if (typeof sessionId !== 'string' || sessionId === '') return
          remotePushQueue.add(sessionId)
          if (remotePushTimer !== null) return
          remotePushTimer = window.setTimeout(() => {
            remotePushTimer = null
            const ids = [...remotePushQueue]
            remotePushQueue.clear()
            for (const id of ids) void pushRemoteSession(id)
          }, 600)
        }

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
              table.set(key, { savedAt: Number(value.savedAt) || 0, items })
            }
            if (table.size > 0 && (sentBySession.get(sessionId) ?? new Map()).size === 0) {
              sentBySession.set(sessionId, table)
              touched = true
            }
          }
          if (touched) scheduleRepaint()
        }

        /** localStorage 在受限上下文里可能不可用：取不到就退回纯内存，绝不让保存路径抛错。*/
        function draftStorage() {
          return safe(() => {
            const storage = window.localStorage
            return storage !== null && storage !== undefined && typeof storage.getItem === 'function' ? storage : undefined
          })
        }

        function draftKey(sessionId) {
          return `${DRAFT_STORAGE_PREFIX}${sessionId}`
        }

        /** 草稿只保留可序列化字段：liveRange 是活 DOM 对象，恢复时按锚点与引文重建。 */
        function draftItems(items) {
          return items.map((item) => ({
            id: item.id,
            number: item.number,
            quote: item.quote,
            note: item.note,
            source: item.source,
            createdAt: item.createdAt,
            // 图片只存压缩后的 data URL：File 与对象 URL 都带不过本地存储。
            images: (Array.isArray(item.images) ? item.images : [])
              .filter((image) => typeof image?.dataUrl === 'string' && image.dataUrl !== '')
              .map((image) => ({ id: image.id, name: image.name, dataUrl: image.dataUrl, bytes: image.bytes })),
          }))
        }

        function isDraftItem(value) {
          if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
          return typeof value.quote === 'string' || typeof value.note === 'string'
        }

        function restoreDraftItem(item) {
          const images = (Array.isArray(item.images) ? item.images : [])
            .filter((image) => typeof image?.dataUrl === 'string' && image.dataUrl !== '')
            .map((image) => {
              const file = dataUrlToFile(image)
              return {
                id: typeof image.id === 'string' ? image.id : `img-${Math.random().toString(36).slice(2, 8)}`,
                name: typeof image.name === 'string' ? image.name : '图片',
                dataUrl: image.dataUrl,
                bytes: Number(image.bytes) || 0,
                file,
                // 恢复后没有对象 URL：直接用 data URL 当缩略图来源。
                url: image.dataUrl,
              }
            })
          return {
            id: typeof item.id === 'string' && item.id !== '' ? item.id : `sa-restored-${Math.random().toString(36).slice(2, 10)}`,
            number: Number.isFinite(item.number) ? item.number : 0,
            quote: typeof item.quote === 'string' ? item.quote : '',
            note: typeof item.note === 'string' ? item.note : '',
            source: item.source ?? { kind: 'dom' },
            createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
            images,
          }
        }

        /** 超出体积上限时，从最旧的批注开始丢图片（文字永远保留）。*/
        function fitDraftSize(items) {
          let text = JSON.stringify({ version: 1, items })
          if (text.length <= DRAFT_MAX_BYTES) return items
          const next = items.map((item) => ({ ...item, images: Array.isArray(item.images) ? item.images.slice() : [] }))
          for (let i = 0; i < next.length && text.length > DRAFT_MAX_BYTES; i += 1) {
            if (next[i].images.length === 0) continue
            next[i] = { ...next[i], images: [] }
            text = JSON.stringify({ version: 1, items: next })
          }
          if (text.length > DRAFT_MAX_BYTES) log('[selection-annotations] 草稿超出本地存储预算，图片已丢弃、文字保留')
          return next
        }

        /** 存一份草稿；批注被清空时把这一键一起删掉。*/
        function saveDraft(sessionId) {
          if (typeof sessionId !== 'string' || sessionId === '') return
          // 内存与落盘保留完整内容；只有 localStorage 受配额限制，写进去时才裁剪。
          const full = draftItems(annotations)
          const items = fitDraftSize(full)
          if (full.length === 0) draftSessions.delete(sessionId)
          else draftSessions.set(sessionId, full)
          // 落盘通道也同步一份：localStorage 只在当前客户端里有效。
          scheduleRemotePush(sessionId)
          const storage = draftStorage()
          if (storage === undefined) return
          try {
            if (items.length === 0) {
              storage.removeItem(draftKey(sessionId))
              return
            }
            storage.setItem(draftKey(sessionId), JSON.stringify({ version: 1, savedAt: Date.now(), items }))
            pruneDrafts(storage)
          } catch {
            /* 配额满或写入被禁：降级为仅内存保存*/
          }
        }

        /** 只保留最近 DRAFT_MAX_SESSIONS 个会话的草稿。 */
        function pruneDrafts(storage) {
          const keys = []
          for (let i = 0; i < storage.length; i += 1) {
            const key = safe(() => storage.key(i))
            if (typeof key === 'string' && key.startsWith(DRAFT_STORAGE_PREFIX)) keys.push(key)
          }
          if (keys.length <= DRAFT_MAX_SESSIONS) return
          const dated = keys.map((key) => {
            const savedAt = safe(() => Number(JSON.parse(storage.getItem(key) ?? '{}')?.savedAt) || 0)
            return { key, savedAt: savedAt ?? 0 }
          })
          dated.sort((a, b) => a.savedAt - b.savedAt)
          for (const entry of dated.slice(0, dated.length - DRAFT_MAX_SESSIONS)) {
            safe(() => storage.removeItem(entry.key))
          }
        }

        /** 读一份草稿：内存优先，其次本地存储；读坏了当没有。*/
        function loadDraft(sessionId) {
          const memory = draftSessions.get(sessionId)
          if (memory !== undefined) return memory.map(restoreDraftItem)
          const storage = draftStorage()
          if (storage === undefined) return []
          const items = safe(() => {
            const raw = storage.getItem(draftKey(sessionId))
            if (raw === null) return []
            const parsed = JSON.parse(raw)
            if (parsed === null || typeof parsed !== 'object' || !Array.isArray(parsed.items)) return []
            return parsed.items.filter(isDraftItem).slice(0, DRAFT_MAX_ITEMS).map(restoreDraftItem)
          })
          if (items === undefined || items.length === 0) return []
          draftSessions.set(sessionId, draftItems(items))
          return items
        }

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

        function toBase64(bytes) {
          let binary = ''
          const step = 0x8000
          for (let i = 0; i < bytes.length; i += step) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step))
          }
          return btoa(binary)
        }

        /* ------------------------------------------------------------------ 锚点 */

        /**
         * 选区在根元素内的字符区间（半开 `[start, end)`，与 `textContent` 口径一致）。
         * 这是批注位置的可校验表示：引文可能重复，字符区间不会。
         */
        function offsetRange(root, range) {
          const measure = (node, offset) =>
            safe(() => {
              const probe = range.cloneRange()
              probe.setStart(root, 0)
              probe.setEnd(node, offset)
              return probe.toString().length
            })
          const start = measure(range.startContainer, range.startOffset)
          const end = measure(range.endContainer, range.endOffset)
          if (start === undefined) return { start: undefined, end: undefined }
          return { start, end: end === undefined || end < start ? start : end }
        }

        function pathFromPreviewUrl(url) {
          // dsh-resource://file/session/<sessionId>/<encoded path>
          const marker = '/session/'
          const at = url.indexOf(marker)
          if (at === -1) return undefined
          const rest = url.slice(at + marker.length)
          const slash = rest.indexOf('/')
          if (slash === -1) return undefined
          const raw = rest.slice(slash + 1)
          return safe(() => decodeURIComponent(raw)) ?? raw
        }

        function lineNumberOf(element) {
          if (element === null) return undefined
          const holder = element.closest('[data-textpreview-line]')
          if (holder === null) return undefined
          const value = Number(holder.getAttribute('data-textpreview-line'))
          return Number.isFinite(value) ? value : undefined
        }

        /**
         * 代码预览没有行号属性，只能按`.line` 的序号推算。
         * 先看选区端点能不能向上找到最近的 `.line`；找不到再退回「第几个 .line 包含它」。
         */
        function codeLineNumberOf(scope, element) {
          if (element === null || scope === null || scope === undefined) return undefined
          const lines = [...scope.querySelectorAll('.line')]
          const own = typeof element.closest === 'function' ? element.closest('.line') : null
          const target = own !== null ? own : lines.find((line) => line.contains(element))
          if (target === null || target === undefined) return undefined
          const index = lines.indexOf(target)
          return index === -1 ? undefined : index + 1
        }

        /** 空白折叠成单个空格，并记下每个规范化字符对应的源文本下标。*/
        function normalizeWithMap(value) {
          const chars = []
          const map = []
          let spaceAt = -1
          for (let i = 0; i < value.length; i += 1) {
            const ch = value[i]
            if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
              if (spaceAt === -1) spaceAt = i
              continue
            }
            if (spaceAt !== -1) {
              if (chars.length > 0) {
                chars.push(' ')
                map.push(spaceAt)
              }
              spaceAt = -1
            }
            chars.push(ch)
            map.push(i)
          }
          return { text: chars.join(''), map }
        }

        /**
         * 在*源文件文有*里定位引文。
         *
         * 渲染后的正文与原文并不一样（标题丢了 `#`、强调丢了 `**`、链接只剩文字），而且换行、
         * 缩进也会被重排，所以不能直接 `indexOf`：先把两边都做空白折叠再比，命中后把区间映射回
         * 源文本下标。找不到就返回 undefined —— 那时宁可不要行号，也不要给一个错的。
         * @returns { start, end } 源文本里的半开区间。
         */
        function locateInSource(source, quote) {
          const needle = quote.replace(/\s+/g, ' ').trim()
          if (needle === '') return undefined
          const hay = normalizeWithMap(source)
          const at = hay.text.indexOf(needle)
          if (at === -1) return undefined
          const start = hay.map[at]
          const end = hay.map[at + needle.length - 1]
          if (start === undefined || end === undefined) return undefined
          return { start, end: end + 1 }
        }

        /** 源文本里某个下标所处的 1 基行号。 */
        function lineOfOffset(text, offset) {
          let line = 1
          const limit = Math.max(0, Math.min(offset, text.length))
          for (let i = 0; i < limit; i += 1) if (text.charCodeAt(i) === 10) line += 1
          return line
        }

        /**
         * 给一次远端调用套上超时，并且**不吞掉失败原图* ——
         * 返回 `{ ok: true, value }` 或 `{ ok: false, reason }`，便于把「超时」与「抛错」分开。
         */
        function withTimeout(promise, ms) {
          return new Promise((resolve) => {
            let settled = false
            const settle = (outcome) => {
              if (settled) return
              settled = true
              window.clearTimeout(timer)
              resolve(outcome)
            }
            const timer = window.setTimeout(() => settle({ ok: false, reason: `${ms}ms 内没有返回` }), ms)
            Promise.resolve(promise).then(
              (value) => settle({ ok: true, value }),
              (error) => settle({ ok: false, reason: error instanceof Error ? error.message : String(error) }),
            )
          })
        }

        /** 远端结果可能是裸值，也可能是 { ok, value } 包装。 */
        function unwrapRemote(value) {
          if (value !== null && typeof value === 'object' && 'ok' in value && 'value' in value) {
            return value.ok === true ? value.value : undefined
          }
          return value
        }

        /**
         * 读源文件，把引文折算户*原文坐标**的行号与字符区间。
         *
         * 能拿到原文就用原文坐标（`textOrigin: source`）—— 这样 charStart/charEnd 在任何预览形态下
         * 都与文件一致，Markdown 也能有行号；拿不到就保留渲染坐标（`textOrigin: rendered`）。
         * @returns 覆盖用的字段，或 undefined。
         */

        async function resolveSourcePosition(source, quote, onSkip) {
          try {
            return await resolveSourcePositionInner(source, quote, onSkip)
          } catch (error) {
            // 抛错绝不能无声消失：安静退回渲染坐标，控制台留一行原因。
            log(`[selection-annotations] 位置精修抛错：${error instanceof Error ? error.message : String(error)}`)
            return undefined
          }
        }

        async function resolveSourcePositionInner(source, quote, onSkip) {
          /**
           * 精修失败一律安静退回（退到渲染坐标，绝不阻断创建），但原因要有去处：
           * 控制台一行日志，另外交给 onSkip —— 插件把它显示在面板条目上。
           */
          const skip = (reason) => {
            log(`[selection-annotations] 位置精修跳过（${String(source?.path)}）：${reason}`)
            if (typeof onSkip === 'function') onSkip(reason)
            return undefined
          }
          if (source?.kind !== 'file') return undefined
          if (typeof source.path !== 'string' || source.path === '') return undefined
          const sessionId = currentSessionId()
          if (sessionId === undefined) return skip('拿不到当前会话 id')
          // 读原文要经 remote：客户端上下文只把 inject 里声明过的命名空间挂上去，
          // 所以 `remote.workspaceFiles` 必须先写进 inject（少写就取值即抛）。
          // 而 remote 本身有两种作用域 —— 会话作用域（sessions.scope().remote）与根上下文
          // （ctx.remote）—— 前者不带这个命名空间，因此逐个探测、哪个能用用哪个。
          const candidates = []
          const agent = safe(() => ctx.sessions?.scope?.(sessionId))
          if (agent?.remote !== undefined) candidates.push({ label: 'sessions.scope().remote', remote: agent.remote })
          const direct = safe(() => ctx.remote) ?? safe(() => ctx.get('remote'))
          if (direct !== undefined) candidates.push({ label: 'ctx.remote', remote: direct })
          // 探测放在 safe 里：取不到的候选会抛，而不是返回 undefined。
          let usable
          for (const entry of candidates) {
            const probe = safe(() => typeof entry.remote?.workspaceFiles?.read === 'function')
            if (probe === undefined) {
              continue
            }
            if (probe === true) {
              usable = entry
              break
            }
          }
          if (usable === undefined) {
            return skip(`拿不到 remote.workspaceFiles.read（试过 ${candidates.map((e) => e.label).join(' / ') || '无任何 remote'}）`)
          }
          log(`[selection-annotations] 位置精修：经 ${usable.label} 读 ${source.path}`)
          const outcome = await withTimeout(
            safe(() => usable.remote.workspaceFiles.read(sessionId, source.path, {})),
            SOURCE_LOOKUP_TIMEOUT_MS,
          )
          if (outcome.ok === false) return skip(`读取失败：${outcome.reason}`)
          const file = unwrapRemote(outcome.value)
          const text = typeof file?.text === 'string' ? file.text : undefined
          if (text === undefined) return skip('返回里没有 text（path 可能不被接受）')
          const hit = locateInSource(text, quote)
          if (hit === undefined) {
            return skip(
              file?.eof === false
                ? `引文不在读取窗口内（只拿到 ${text.length} 字符，eof=false）`
                : '引文不在原文里（多半是跨了行内 Markdown 标记）',
            )
          }
          return {
            charStart: hit.start,
            charEnd: hit.end,
            lineStart: lineOfOffset(text, hit.start),
            lineEnd: lineOfOffset(text, Math.max(hit.start, hit.end - 1)),
            textOrigin: 'source',
          }
        }

        /**
         * 行号区间：优先用行自带的 `data-textpreview-line`（纯文本预览有）；
         * 代码预览没有这个属性，退回按 `.line` 序号推算。两者都拿不到就不写行号。
         */
        function lineRangeWithin(root, startEl, endEl) {
          const marked = lineNumberOf(startEl) ?? lineNumberOf(endEl)
          if (marked !== undefined) return { start: marked, end: lineNumberOf(endEl) ?? marked }
          const start = codeLineNumberOf(root, startEl)
          if (start === undefined) return { start: undefined, end: undefined }
          return { start, end: codeLineNumberOf(root, endEl) ?? start }
        }

        /**
         * 记录选区来源：哪条消息 / 哪个文件 / 行号区间 / 字符区间。
         * 字符区间是 `[charStart, charEnd)`，以锚点根元素的 `textContent` 为口径。
         */
        function captureSource(range) {
          const startEl = elementOf(range.startContainer)
          const endEl = elementOf(range.endContainer)
          if (startEl === null) return { kind: 'dom' }

          const row = startEl.closest('[data-chat-anchor-key]')
          if (row !== null) {
            const chars = offsetRange(row, range)
            return {
              kind: 'message',
              role: (row.getAttribute('data-chat-flow-kind') ?? '') === 'user' ? 'user' : 'assistant',
              anchorKey: row.getAttribute('data-chat-anchor-key') ?? '',
              flowKind: row.getAttribute('data-chat-flow-kind') ?? '',
              charStart: chars.start,
              charEnd: chars.end,
            }
          }

          const doc = startEl.closest('[data-textpreview-url]')
          if (doc !== null) {
            const url = doc.getAttribute('data-textpreview-url') ?? ''
            const lines = lineRangeWithin(doc, startEl, endEl)
            const chars = offsetRange(doc, range)
            return {
              kind: 'file',
              path: pathFromPreviewUrl(url),
              sourceUrl: url,
              lineStart: lines.start,
              lineEnd: lines.end,
              charStart: chars.start,
              charEnd: chars.end,
              // 默认口径是渲染后的正文；保存时会再试着读源文件改成 source。
              textOrigin: 'rendered',
            }
          }

          const code = startEl.closest('[data-code-preview]')
          if (code !== null) {
            const lines = lineRangeWithin(code, startEl, endEl)
            const chars = offsetRange(code, range)
            return { kind: 'file', lineStart: lines.start, lineEnd: lines.end, charStart: chars.start, charEnd: chars.end, textOrigin: 'rendered' }
          }

          return { kind: 'dom' }
        }

        /** 锚点根元素：消息行或文件预览外壳。*/
        function anchorRoot(source) {
          if (source === null || source === undefined) return null
          if (source.kind === 'message' && source.anchorKey) {
            return (
              document.querySelector(`[data-chat-anchor-key="${cssEscape(source.anchorKey)}"]`) ??
              document.querySelector(`[data-chat-flow-key="${cssEscape(source.anchorKey)}"]`)
            )
          }
          if (source.kind === 'file' && source.sourceUrl) {
            return document.querySelector(`[data-textpreview-url="${cssEscape(source.sourceUrl)}"]`)
          }
          if (source.kind === 'file') return document.querySelector('[data-code-preview]')
          return null
        }

        function cssEscape(value) {
          return String(value).replace(/["\\]/g, '\\$&')
        }

        /** 按字符偏移在根元素里重建 Range（只走文本节点，偏移口径与 textContent 一致）。 */
        function rangeFromOffsets(root, start, length) {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
          let offset = 0
          let startNode
          let startOffset = 0
          let endNode
          let endOffset = 0
          let node = walker.nextNode()
          while (node !== null) {
            const size = node.nodeValue === null ? 0 : node.nodeValue.length
            if (startNode === undefined && offset + size >= start) {
              startNode = node
              startOffset = start - offset
            }
            if (startNode !== undefined && offset + size >= start + length) {
              endNode = node
              endOffset = start + length - offset
              break
            }
            offset += size
            node = walker.nextNode()
          }
          if (startNode === undefined || endNode === undefined) return undefined
          return safe(() => {
            const range = document.createRange()
            range.setStart(startNode, Math.max(0, Math.min(startOffset, startNode.nodeValue.length)))
            range.setEnd(endNode, Math.max(0, Math.min(endOffset, endNode.nodeValue.length)))
            return range
          })
        }

        /** 在根元素里定位原文；重复片段用保存时的偏移择优。*/
        function matchInRoot(root, quote, savedOffset) {
          if (typeof quote !== 'string' || quote === '') return undefined
          const text = root.textContent ?? ''
          const positions = []
          let from = 0
          for (;;) {
            const at = text.indexOf(quote, from)
            if (at === -1 || positions.length >= 64) break
            positions.push(at)
            from = at + 1
          }
          if (positions.length === 0) return undefined
          let best = positions[0]
          if (positions.length > 1 && Number.isFinite(savedOffset)) {
            best = positions.reduce((a, b) => (Math.abs(b - savedOffset) < Math.abs(a - savedOffset) ? b : a))
          }
          return rangeFromOffsets(root, best, quote.length)
        }

        function rangeMatchesQuote(range, quote) {
          const current = safe(() => range.toString())
          if (typeof current !== 'string') return false
          const normalize = (value) => value.replace(/\s+/g, ' ').trim()
          return normalize(current) === normalize(quote)
        }

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
          const range = matchInRoot(root, item.quote, item.source.charStart)
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
          scheduleRepaint()
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
        const SENT_PENDING_TTL_MS = 60000

        /* ------------------------------------------------- 已提交批注的历史回看 */

        function isSentItem(value) {
          if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
          return typeof value.quote === 'string' || typeof value.note === 'string'
        }

        /** 读一个会话的已提交台账（anchorKey → { savedAt, items }）。 */
        function loadSent(sessionId) {
          const memory = sentBySession.get(sessionId)
          if (memory !== undefined) return memory
          const table = new Map()
          const storage = draftStorage()
          if (storage !== undefined) {
            const parsed = safe(() => JSON.parse(storage.getItem(`${SENT_STORAGE_PREFIX}${sessionId}`) ?? 'null'))
            if (parsed !== null && typeof parsed === 'object' && parsed.entries !== null && typeof parsed.entries === 'object') {
              for (const [key, value] of Object.entries(parsed.entries)) {
                if (typeof key !== 'string' || key === '') continue
                if (value === null || typeof value !== 'object' || !Array.isArray(value.items)) continue
                const items = value.items.filter(isSentItem).slice(0, DRAFT_MAX_ITEMS)
                if (items.length === 0) continue
                table.set(key, { savedAt: Number(value.savedAt) || 0, items })
              }
            }
          }
          sentBySession.set(sessionId, table)
          return table
        }

        function saveSent(sessionId, table) {
          const storage = draftStorage()
          const ordered = [...table.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt)
          // 内存与落盘都保留完整记录；只有localStorage 受配额限制，写进去时按预算裁剪。
          const kept = ordered.slice(Math.max(0, ordered.length - SENT_MAX_ENTRIES))
          sentBySession.set(sessionId, new Map(kept))
          scheduleRemotePush(sessionId)
          if (storage === undefined) return
          let stored = kept
          if (JSON.stringify(Object.fromEntries(kept)).length > SENT_MAX_BYTES) {
            stored = kept.map(([key, value]) => [
              key,
              { ...value, items: value.items.map((item) => ({ ...item, thumbs: [] })) },
            ])
            if (JSON.stringify(Object.fromEntries(stored)).length > SENT_MAX_BYTES) {
              stored = stored.slice(Math.max(0, stored.length - 40))
            }
          }
          const entries = {}
          for (const [key, value] of stored) entries[key] = value
          try {
            storage.setItem(`${SENT_STORAGE_PREFIX}${sessionId}`, JSON.stringify({ version: 1, entries }))
          } catch {
            /* 配额满：本地缓存放弃写入，落盘通道仍有完整记录 */
          }
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
            if (kind === '' || kind === 'turn-process' || anchorKey.startsWith('group:')) {
              push(element, anchorKey)
            }
          }
          return rows
        }

        /** 当前页面上已有的候选锚点键。*/
        function captureAnchorKeys() {
          return new Set(collectAnchorRows().map((entry) => entry.anchorKey))
        }

        function recordSent(sessionId, anchorKey, items) {
          const table = loadSent(sessionId)
          table.set(anchorKey, { savedAt: Date.now(), items })
          saveSent(sessionId, table)
        }

        /** 把新出现的候选行与刚发出的批注负载按出现顺序配对。*/
        function scanSentMessages() {
          if (pendingSent.length === 0) return
          const now = Date.now()
          pendingSent = pendingSent.filter((entry) => now - entry.at < SENT_PENDING_TTL_MS)
          if (pendingSent.length === 0) return
          const sessionId = currentSessionId()
          if (sessionId === undefined) return
          const rows = collectAnchorRows()
          if (rows.length === 0) return
          const pending = pendingSent[0]
          // 候选：不在「发送前快照」里、也还没落台账的行。
          const fresh = rows.filter((entry) => !pending.known.has(entry.anchorKey) && !loadSent(sessionId).has(entry.anchorKey))
          // 兜底：纯批注消息可能复用已有的组行（锚点键不变），那就取最后一个还没记账的行。
          const target = fresh.length > 0 ? fresh[fresh.length - 1] : undefined
          if (target === undefined) return
          pendingSent.shift()
          recordSent(sessionId, target.anchorKey, pending.items)
          scheduleRepaint()
        }

        function truncateQuote(value) {
          const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
          return text.length > 140 ? `${text.slice(0, 140)}…` : text
        }

        /** 一条已提交批注在历史里的卡片：默认收起，点开看引文与批注文字。*/
        function buildSentCard(record, anchorKey) {
          const card = document.createElement('div')
          card.className = 'sa-sent'
          card.setAttribute('data-sa-ui', 'sent')
          // 记下锚点键：卡片现在插在消息行外，判重要靠它而不是「行内有没有卡片」。
          if (typeof anchorKey === 'string' && anchorKey !== '') card.setAttribute('data-anchor', anchorKey)
          const head = document.createElement('button')
          head.type = 'button'
          head.className = 'sa-sent-head'
          head.textContent = `已发送的批注 ×${record.items.length}`
          const body = document.createElement('div')
          body.className = 'sa-sent-body'
          body.style.display = 'none'
          for (const item of record.items) {
            const line = document.createElement('div')
            line.className = 'sa-sent-item'
            const num = document.createElement('span')
            num.className = 'sa-sent-num'
            num.textContent = Number.isFinite(item.index) ? String(item.index) : ''
            const text = document.createElement('div')
            text.className = 'sa-sent-text'
            const quote = document.createElement('div')
            quote.className = 'sa-sent-quote'
            quote.textContent = truncateQuote(item.quote)
            text.appendChild(quote)
            if (typeof item.note === 'string' && item.note.trim() !== '') {
              const note = document.createElement('div')
              note.className = 'sa-sent-note'
              note.textContent = item.note
              text.appendChild(note)
            }
            const thumbs = Array.isArray(item.thumbs) ? item.thumbs : []
            if (thumbs.length > 0) {
              const gallery = document.createElement('div')
              gallery.className = 'sa-sent-thumbs'
              for (const thumb of thumbs) {
                if (typeof thumb?.dataUrl !== 'string' || thumb.dataUrl === '') continue
                const img = document.createElement('img')
                img.className = 'sa-sent-thumb'
                img.src = thumb.dataUrl
                img.alt = typeof thumb.name === 'string' ? thumb.name : '图片'
                img.title = '点击查看大图'
                img.addEventListener('click', (event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  openImageViewer(thumb.dataUrl, thumb.name)
                })
                gallery.appendChild(img)
              }
              if (gallery.childNodes.length > 0) text.appendChild(gallery)
            }
            line.append(num, text)
            body.appendChild(line)
          }
          head.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()
            const collapsed = body.style.display === 'none'
            body.style.display = collapsed ? '' : 'none'
            head.dataset.open = collapsed ? '1' : '0'
          })
          card.append(head, body)
          return card
        }

        /** 在历史行下方补出已提交批注卡片；同一行只补一次。*/
        function renderSentCards() {
          const sessionId = currentSessionId()
          if (sessionId === undefined) return
          const table = loadSent(sessionId)
          if (table.size === 0) return
          for (const entry of collectAnchorRows()) {
            const record = table.get(entry.anchorKey)
            if (record === undefined || record.items.length === 0) continue
            const anchor = cssEscape(entry.anchorKey)
            if (document.querySelector(`[data-sa-ui="sent"][data-anchor="${anchor}"]`) !== null) continue
            const card = buildSentCard(record, entry.anchorKey)
            // 插在消息行*后面**，不要插进行内部：过程折叠组/分组行内部布局会让卡片压住正文。
            const parent = entry.row.parentElement
            if (parent !== null) parent.insertBefore(card, entry.row.nextSibling)
            else entry.row.appendChild(card)
          }
        }

        /** 逐条答复的判定文案与样式类。*/
        const VERDICT_LABELS = {
          accepted: ['采纳', 'accepted'],
          partial: ['部分采纳', 'partial'],
          rejected: ['不采纳', 'rejected'],
          needs_info: ['需要澄清', 'needs_info'],
        }

        /** 一批答复里的每条答复按 index 去重：同一 index 以最后一批为准。*/
        function mergeReplyBatches(batches) {
          const byIndex = new Map()
          for (const batch of batches) {
            for (const reply of batch.replies) {
              if (reply === null || typeof reply !== 'object') continue
              const index = Number(reply.index)
              if (!Number.isFinite(index)) continue
              byIndex.set(index, { ...reply, index })
            }
          }
          return [...byIndex.values()].sort((a, b) => a.index - b.index)
        }

        /**
         * 结果是批注根本进不了消息（或直接抛错）。必须让运行时自己登记草稿附件。
         *
         * 引文与批注文字来自已提交记录（按 index 对应）；拿不到时只显示答复块。
         * 版式按「引用块 + 答复块」：批注块左侧竖线、次级字号，答复块给判定与理由。
         */
        function buildReplySection(batches, items = []) {
          const replies = mergeReplyBatches(batches)
          const byIndex = new Map()
          for (const item of Array.isArray(items) ? items : []) {
            if (Number.isFinite(item?.index)) byIndex.set(item.index, item)
          }
          const card = document.createElement('div')
          card.className = 'sa-replies'
          card.setAttribute('data-sa-ui', 'replies')

          const head = document.createElement('div')
          head.className = 'sa-replies-head'
          const title = document.createElement('span')
          title.className = 'sa-replies-title'
          title.textContent = `批注答复 ×${replies.length}`
          head.appendChild(title)
          const counts = { accepted: 0, partial: 0, rejected: 0, needs_info: 0 }
          for (const reply of replies) {
            if (Object.hasOwn(counts, reply.verdict)) counts[reply.verdict] += 1
          }
          const parts = []
          if (counts.accepted) parts.push(`采纳 ${counts.accepted}`)
          if (counts.partial) parts.push(`部分 ${counts.partial}`)
          if (counts.rejected) parts.push(`不采纳 ${counts.rejected}`)
          if (counts.needs_info) parts.push(`需澄清 ${counts.needs_info}`)
          if (parts.length > 0) {
            const summary = document.createElement('span')
            summary.className = 'sa-replies-summary'
            summary.textContent = parts.join(' · ')
            head.appendChild(summary)
          }
          card.appendChild(head)

          const body = document.createElement('div')
          body.className = 'sa-replies-body'
          for (const reply of replies) {
            const item = byIndex.get(reply.index)
            const group = document.createElement('div')
            group.className = 'sa-reply-item'

            if (item !== undefined) {
              const q = document.createElement('div')
              q.className = 'sa-q'
              const qHead = document.createElement('div')
              qHead.className = 'sa-q-head'
              qHead.textContent = `批注 ${reply.index}`
              q.appendChild(qHead)
              const quoteText = typeof item.quote === 'string' ? item.quote.trim() : ''
              if (quoteText !== '') {
            const quote = document.createElement('div')
                quote.className = 'sa-q-quote'
                quote.textContent = quoteText
                quote.title = '点击展开全文'
                // 超过三行时折叠；点一下展开，再点收回。
                quote.addEventListener('click', () => {
                  quote.className = quote.className.includes('sa-q-open') ? 'sa-q-quote' : 'sa-q-quote sa-q-open'
                })
                q.appendChild(quote)
              }
            if (typeof item.note === 'string' && item.note.trim() !== '') {
              const note = document.createElement('div')
                note.className = 'sa-q-note'
              note.textContent = item.note
                q.appendChild(note)
              }
              group.appendChild(q)
            }

            const a = document.createElement('div')
            a.className = 'sa-a'
            const aHead = document.createElement('div')
            aHead.className = 'sa-a-head'
            const aLabel = document.createElement('span')
            aLabel.className = 'sa-a-label'
            aLabel.textContent = item !== undefined ? '答复' : `批注 ${reply.index} · 答复`
            const [label, tone] = VERDICT_LABELS[reply.verdict] ?? ['答复', 'accepted']
            const verdict = document.createElement('span')
            verdict.className = `sa-a-verdict sa-reply-${tone}`
            verdict.textContent = label
            aHead.append(aLabel, verdict)
            a.appendChild(aHead)
            const reason = document.createElement('div')
            reason.className = 'sa-a-reason'
            reason.textContent = typeof reply.reason === 'string' ? reply.reason : ''
            a.appendChild(reason)
            if (typeof reply.next === 'string' && reply.next.trim() !== '') {
              const next = document.createElement('div')
              next.className = 'sa-a-next'
              next.textContent = `下一步：${reply.next}`
              a.appendChild(next)
            }
            group.appendChild(a)
            body.appendChild(group)
          }
          card.appendChild(body)
          return card
        }

        /**
         * 把答复挂到对应的「已发送的批注」卡片后面。
         *
         * 结果是批注根本进不了消息（或直接抛错）。必须让运行时自己登记草稿附件。
         * 模型答复总是紧跟发送，这个口径足够稳，也不需要模型额外回传批次号。
         */
        function renderReplySections() {
          const sessionId = currentSessionId()
          if (sessionId === undefined) return
          const table = loadSent(sessionId)
          if (table.size === 0) return
          const batches = remoteReplyCache.get(sessionId) ?? []
          if (batches.length === 0) return
          const records = [...table.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt)
          const grouped = new Map()
          for (const batch of batches) {
            let target
            for (const [key, record] of records) {
              if (record.savedAt <= batch.at) target = key
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
            const items = table.get(anchorKey)?.items ?? []
            const signature = `${list.map((batch) => String(batch.at)).join('|')}#${items.length}`
            const existing = document.querySelector(`[data-sa-ui="replies"][data-anchor="${escaped}"]`)
            if (existing !== null) {
              if (existing.dataset.signature === signature) continue
              const fresh = buildReplySection(list, items)
              fresh.setAttribute('data-anchor', anchorKey)
              fresh.dataset.signature = signature
              existing.replaceWith(fresh)
              continue
            }
            const section = buildReplySection(list, items)
            section.setAttribute('data-anchor', anchorKey)
            section.dataset.signature = signature
            sentCard.parentElement?.insertBefore(section, sentCard.nextSibling)
          }
        }

        /* ------------------------------------------------------- 原生附件块（随消息发送） */

        function describeSource(source) {
          if (source === null || source === undefined) return '未知出处'
          if (source.kind === 'message') {
            const role = source.flowKind === 'user' || source.flowKind === 'steering' ? '用户消息' : '助手回复'
            return `${role}（锚点 ${source.anchorKey || '-'}）`
          }
          if (source.kind === 'file') {
            const path = source.path ?? '(未知路径)'
            let where = ''
            if (Number.isFinite(source.lineStart)) {
              where =
                Number.isFinite(source.lineEnd) && source.lineEnd !== source.lineStart
                  ? ` 第 ${source.lineStart}—${source.lineEnd} 行`
                  : ` 第 ${source.lineStart} 行`
            }
            return `工作区文件 \`${path}\`${where}`
          }
          return '页面选区'
        }

        /**
         * 批注负载：一个自描述的 JSON 数据块。
         *
         * 用 JSON 而不是 Markdown，是因为位置是要被程序化使用的东西 —— 行号、字符区间、
         * 锚点锚——结构化字段才不会在自然语言里糊掉。
         */
        function buildPayload(items) {
          // 图片在消息里是独立的 image 块，顺序即挂载顺序；这里给每条批注记住它在本次消息里的 1 基序号。
          let imageOrder = 0
          const annotations = items.map((item) => {
            const entry = {
              index: item.number,
              quote: item.quote,
              note: item.note,
              source: payloadSource(item.source),
            }
            const images = Array.isArray(item.images) ? item.images : []
            if (images.length > 0) {
              entry.images = images.map((image) => {
                imageOrder += 1
                return { order: imageOrder, name: image.name }
              })
            }
            return entry
          })
          return JSON.stringify(
            {
              kind: PAYLOAD_KIND,
              version: 1,
              instruction: instructionOf(),
              count: annotations.length,
              annotations,
            },
            null,
            2,
          )
        }

        /** 只把有意义的字段放进 JSON，避免一堆 null 噪声。 */
        function payloadSource(source) {
          const out = { kind: source?.kind ?? 'dom' }
          if (source?.kind === 'message') {
            out.role = source.role ?? (source.flowKind === 'user' || source.flowKind === 'steering' ? 'user' : 'assistant')
            if (typeof source.anchorKey === 'string' && source.anchorKey !== '') out.anchorKey = source.anchorKey
            if (typeof source.flowKind === 'string' && source.flowKind !== '') out.flowKind = source.flowKind
          } else if (source?.kind === 'file') {
            if (typeof source.path === 'string' && source.path !== '') out.path = source.path
            if (Number.isFinite(source.lineStart)) out.lineStart = source.lineStart
            if (Number.isFinite(source.lineEnd)) out.lineEnd = source.lineEnd
          }
          if (out.kind === 'file' || out.kind === 'message') {
            out.textOrigin = source?.textOrigin === 'source' ? 'source' : 'rendered'
          }
          if (Number.isFinite(source?.charStart)) out.charStart = source.charStart
          if (Number.isFinite(source?.charEnd)) out.charEnd = source.charEnd
          return out
        }

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
        const annotateButton = document.createElement('button')
        annotateButton.type = 'button'
        annotateButton.className = 'sa-btn'
        annotateButton.textContent = '批注'
        toolbar.appendChild(annotateButton)

        const popover = document.createElement('div')
        popover.className = 'sa-popover'
        popover.setAttribute('data-sa-ui', 'popover')
        const popTitle = document.createElement('div')
        popTitle.className = 'sa-pop-title'
        const popQuote = document.createElement('div')
        popQuote.className = 'sa-pop-quote'
        const popSource = document.createElement('div')
        popSource.className = 'sa-pop-src'
        const popInput = document.createElement('textarea')
        popInput.className = 'sa-pop-input'
        popInput.placeholder = '写点什么（可以留空，只标记原文）'
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
        const popActions = document.createElement('div')
        popActions.className = 'sa-pop-actions'
        /** 当前正在编辑的这条批注挂的图片；只在内存里（二进制进不了 localStorage）。*/
        let popInputImages = []
        const popImages = document.createElement('div')
        popImages.className = 'sa-pop-images'
        const popImagesHint = document.createElement('div')
        popImagesHint.className = 'sa-pop-images-hint'
        popImagesHint.textContent = '可粘贴或拖入图片，随本条批注一起发出'

        /** 全屏查看批注图片：点缩略图放大，点任意处或 Esc 关闭。 */
        const imageViewer = document.createElement('div')
        imageViewer.className = 'sa-viewer'
        imageViewer.setAttribute('data-sa-ui', 'viewer')
        imageViewer.dataset.open = '0'
        const imageViewerImg = document.createElement('img')
        imageViewerImg.className = 'sa-viewer-img'
        imageViewerImg.alt = '批注图片'
        imageViewer.appendChild(imageViewerImg)

        function openImageViewer(url, name) {
          if (typeof url !== 'string' || url === '') return
          imageViewerImg.src = url
          imageViewerImg.alt = typeof name === 'string' && name !== '' ? name : '批注图片'
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
        popDelete.textContent = '删除'
        const popSpacer = document.createElement('span')
        popSpacer.className = 'sa-pop-spacer'
        const popCancel = document.createElement('button')
        popCancel.type = 'button'
        popCancel.className = 'sa-link'
        popCancel.textContent = '取消'
        const popSave = document.createElement('button')
        popSave.type = 'button'
        popSave.className = 'sa-btn'
        popSave.textContent = '保存'
        popActions.append(popDelete, popSpacer, popCancel, popSave)
        popover.append(popTitle, popQuote, popSource, popInput, popImages, popActions)

        function isExcluded(node) {
          const element = elementOf(node)
          if (element === null) return true
          if (element.closest('[data-sa-ui]') !== null) return true
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

        function placeAt(element, rect, gap) {
          const width = element.offsetWidth || 80
          const height = element.offsetHeight || 32
          const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8))
          const above = rect.top - height - gap
          const top = above < 8 ? Math.min(rect.bottom + gap, window.innerHeight - height - 8) : above
          element.style.left = `${left}px`
          element.style.top = `${Math.max(8, top)}px`
        }

        function onSelectionChange() {
          window.clearTimeout(settleTimer)
          settleTimer = window.setTimeout(() => {
            settleTimer = null
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
            placeAt(toolbar, rect, 8)
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
              thumb.title = '点击查看大图'
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
            remove.title = '移除这张图'
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
            const processed = await compressImage(file)
            const dataUrl = await fileToDataUrl(processed)
            const url = safe(() => URL.createObjectURL(processed))
            // 已提交台账只存这张小图：清单里够看清是哪张，点开还能放大。
            const thumb = await downscaleDataUrl(processed, 480, 0.65)
            popInputImages.push({
              id: `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
              file: processed,
              name: typeof processed.name === 'string' && processed.name !== '' ? processed.name : '图片',
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
          popInput.style.height = 'auto'
          const next = Math.max(min, Math.min(popInput.scrollHeight, max))
          popInput.style.height = `${next}px`
          popInputAutoValue = next
        }

        function showPopover(options) {
          popTitle.textContent = options.title
          popQuote.textContent = options.quote.length > 400 ? `${options.quote.slice(0, 400)}…` : options.quote
          popQuote.style.display = options.quote === '' ? 'none' : ''
          popSource.textContent = options.sourceText
          popInput.value = options.note
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
          if (options.rect !== undefined && options.rect !== null) placeAt(popover, options.rect, 10)
          syncPopInputHeight()
          safe(() => popInput.focus())
          safe(() => popInput.setSelectionRange(popInput.value.length, popInput.value.length))
        }

        function openCreatePopover() {
          const selection = pendingSelection
          if (selection === null) return
          popoverAnchor = { range: selection.range, quote: selection.quote, source: captureSource(selection.range) }
          showPopover({
            title: '新建批注',
            quote: selection.quote,
            sourceText: describeSource(popoverAnchor.source),
            note: '',
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
            title: `修改批注 #${item.number}`,
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
          // 页面刷新、关闭或插件卸载前再存一次：只靠状态变更时保存会丢掉最后几秒的编辑。
          safe(() => popInput.blur())
          popoverAnchor = null
          popoverTargetId = null
          popoverMode = 'create'
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
              return { ...item, source: { ...item.source, ...precise } }
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

        /** 新划出来但既没写文字也没加图：被动确认（点框外、悬停收起）时应当丢弃。*/
        function shouldDiscardEmpty(mode, note, images) {
          if (mode === 'edit') return false
          if (typeof note === 'string' && note.trim() !== '') return false
          return !Array.isArray(images) || images.length === 0
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
            const note = popInput.value
            closePopover()
            if (target !== null) updateAnnotation(target, note, images)
            return
          }
          const anchor = popoverAnchor
          if (anchor === null) return
          const note = popInput.value
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
        popCancel.addEventListener('click', () => closePopover())
        popSave.addEventListener('click', () => {
          commitPopover()
        })
        popDelete.addEventListener('click', () => deleteFromPopover())
        popInput.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') closePopover()
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) commitPopover()
        })
        popInput.addEventListener('input', () => {
          syncPopInputHeight()
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
          if (images.length === 0) return
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
          if (source?.kind === 'message') return source.flowKind === 'user' ? '用户消息' : '助手回复'
          if (source?.kind === 'file') {
            const path = source.path ?? '文件'
            const where = Number.isFinite(source.lineStart) ? `${path}:${source.lineStart}` : path
            // 行号是渲染坐标推出来的，未必等于文件真行发——这一点要让用户看见。
            return source.textOrigin === 'source' ? where : `${where}（渲染坐标）`
          }
          return '选区'
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

        function el(tag, className, text) {
          const created = document.createElement(tag)
          if (className !== undefined) created.className = className
          if (text !== undefined) created.textContent = text
          return created
        }

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

        function renderPanel() {
          panelEl.textContent = ''

          if (annotations.length === 0) {
            panelEl.appendChild(el('div', 'sa-hint', '选中回复、消息或文件预览里的文字，点浮动「批注」即可。'))
          }

          for (const item of annotations) {
            const row = el('div', 'sa-item')
            row.draggable = true
            row.dataset.id = item.id
            row.addEventListener('dragstart', (event) => {
              event.dataTransfer.setData('text/plain', item.id)
              event.dataTransfer.effectAllowed = 'move'
              row.className = 'sa-item sa-dragging'
            })
            row.addEventListener('dragend', () => {
              for (const node of panelEl.querySelectorAll('.sa-item')) {
                node.className = node.className.replace(' sa-drop-before', '').replace(' sa-dragging', '')
              }
            })
            row.addEventListener('dragover', (event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              row.className = 'sa-item sa-drop-before'
            })
            row.addEventListener('dragleave', () => {
              row.className = 'sa-item'
            })
            row.addEventListener('drop', (event) => {
              event.preventDefault()
              event.stopPropagation()
              const draggedId = event.dataTransfer.getData('text/plain')
              if (draggedId !== '') moveAnnotation(draggedId, item.id)
            })
            const head = el('div', 'sa-item-head')
            const grip = el('span', 'sa-drag-handle', '⠿')
            grip.title = '拖动排序'
            grip.setAttribute('aria-label', '拖动排序')
            head.appendChild(grip)
            head.appendChild(el('span', 'sa-item-num', `#${item.number}`))
            const summary = el('span', 'sa-item-src', sourceSummary(item))
            summary.title = summary.textContent
            head.appendChild(summary)
            head.appendChild(button('sa-link', '编辑', () => openEditPopover(item.id, head)))
            head.appendChild(button('sa-link', '删除', () => removeAnnotation(item.id)))
            row.appendChild(head)
            if (item.quote !== '') {
              const q = el('div', 'sa-item-q')
              q.appendChild(el('div', 'sa-item-label', '引用'))
              const quote = el('div', 'sa-item-quote', item.quote)
              quote.title = '点击展开全文'
              quote.addEventListener('click', () => {
                quote.className = quote.className.includes('sa-q-open') ? 'sa-item-quote' : 'sa-item-quote sa-q-open'
              })
              q.appendChild(quote)
              row.appendChild(q)
            }
            if (item.note !== '') {
              const a = el('div', 'sa-item-a')
              a.appendChild(el('div', 'sa-item-label', '批注'))
              a.appendChild(el('div', 'sa-item-note', item.note))
              row.appendChild(a)
            }
            if (Array.isArray(item.images) && item.images.length > 0) {
              const gallery = el('div', 'sa-item-images')
              for (const image of item.images) {
                if (typeof image?.url !== 'string' || image.url === '') continue
                const thumb = document.createElement('img')
                thumb.className = 'sa-item-thumb'
                thumb.src = image.url
                thumb.alt = typeof image.name === 'string' ? image.name : '图片'
                thumb.title = '点击查看大图'
                thumb.style.cursor = 'zoom-in'
                thumb.addEventListener('click', (event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  openImageViewer(image.url, image.name)
                })
                gallery.appendChild(thumb)
              }
              if (gallery.childNodes.length > 0) row.appendChild(gallery)
            }
            if (typeof item.refineReason === 'string' && item.refineReason !== '') {
              const why = el('div', 'sa-item-why', `位置精修未生效：${item.refineReason}`)
              why.style.fontSize = '11px'
              why.style.lineHeight = '1.5'
              why.style.opacity = '0.8'
              why.style.color = 'var(--dsw-alias-text-tertiary, GrayText)'
              why.style.marginTop = '2px'
              row.appendChild(why)
            }
            panelEl.appendChild(row)
          }

          const foot = el('div', 'sa-foot')
          if (annotations.length > 0) foot.appendChild(button('sa-link', '清空', () => clearAnnotations()))
          foot.appendChild(el('span', 'sa-hint', '发送时批注作为独立块随消息提交'))
          panelEl.appendChild(foot)
          panelEl.appendChild(imageSettingsRow())
          panelEl.appendChild(instructionSettingsRow())
        }

        /** 面板底部的图片设置：压缩开关、JPEG 质量、触发压缩的最短边。 */
        function imageSettingsRow() {
          const settings = imageSettingsOf()
          const box = el('div', 'sa-settings')
          const head = el('div', 'sa-settings-head')
          const toggle = button('sa-link', imageSettingsOpen ? '收起图片设置' : '图片设置', () => {
            imageSettingsOpen = !imageSettingsOpen
            refreshPanel()
          })
          head.appendChild(toggle)
          head.appendChild(
            el('span', 'sa-hint', settings.compress ? `压缩为 JPEG ${Math.round(settings.quality * 100)}%` : '不压缩，原样发送'),
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
          compressRow.append(compress, document.createTextNode(' 压缩图片（JPEG）'))
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
          qualityRow.append(document.createTextNode('质量 '), quality, qualityText)
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
          sizeRow.append(document.createTextNode('最短边超过 '), size, document.createTextNode(' 像素才压缩'))
          box.appendChild(sizeRow)

          return box
        }

        /** 面板底部的批注指令设置：可编辑，一键恢复默认。*/
        function instructionSettingsRow() {
          const box = el('div', 'sa-settings')
          const head = el('div', 'sa-settings-head')
          const toggle = button('sa-link', instructionSettingsOpen ? '收起批注指令' : '批注指令', () => {
            instructionSettingsOpen = !instructionSettingsOpen
            refreshPanel()
          })
          head.appendChild(toggle)
          head.appendChild(el('span', 'sa-hint', instructionOf() === DEFAULT_INSTRUCTION ? '默认文案' : '已自定义'))
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
            button('sa-link', '恢复默认', () => {
              persistInstructionSettings(DEFAULT_INSTRUCTION)
              refreshPanel()
            }),
          )
          actions.appendChild(el('span', 'sa-hint', '删掉「必须调用annotation_replies」那句会让逐条答复失效'))
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
              title: count === 0 ? '还没有批注：选中正文或文件里的文字后点浮动「批注」' : '查看 / 管理批注',
              onClick: (event) => togglePanel(event.currentTarget),
            },
            count === 0 ? '批注' : `批注 ×${count}`,
          )
        }
        /* ------------------------------------------------------------------ 生命周期 */

        ctx.effect(() => {
          const style = document.createElement('style')
          style.setAttribute('data-selection-annotations', '')
          style.textContent = CSS
          document.head.appendChild(style)
          document.body.append(overlay, toolbar, popover, panelRoot, imageViewer)
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
            popover.remove()
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
          const onViewport = () => {
            scheduleRepaint()
            positionPanel()
          }
          window.addEventListener('scroll', onViewport, true)
          window.addEventListener('resize', onViewport)
          // 只对「不是我们自己写出来的」DOM 变化重绘：否则 repaint 写 overlay 会再次触发观察器，
          // 形成 120ms 自激循环，把输入卡死。
          const observer = new MutationObserver((records) => {
            for (const record of records) {
              const target = elementOf(record.target)
              if (target !== null && target.closest('[data-sa-ui]') !== null) continue
              scheduleRepaint()
              return
            }
          })
          observer.observe(document.body, { childList: true, subtree: true, characterData: true })
          return () => {
            document.removeEventListener('selectionchange', onSelectionChange)
            window.removeEventListener('scroll', onViewport, true)
            window.removeEventListener('resize', onViewport)
            observer.disconnect()
          }
        })

        ctx.slots.inject('conversation.input.right', () =>
          ctx.slots.register({ name: 'conversation.input.right', id: 'selection-annotations', order: 30 }, AnnotateButton),
        )

        const verdictLabels = { accepted: '采纳', partial: '部分采纳', rejected: '不采纳', needs_info: '需要澄清' }

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
            return h('div', { className: 'sa-replies-card sa-replies-empty' }, '批注答复：等待参数')
          }
          return h(
            'div',
            { className: 'sa-replies-card' },
            h('div', { className: 'sa-replies-head' }, `批注答复 ×${replies.length}`),
            ...replies.map((reply) =>
              h(
                'div',
                { className: 'sa-reply', key: `reply-${reply?.index}` },
                h('div', { className: 'sa-reply-line' },
                  h('span', { className: 'sa-reply-index' }, `#${reply?.index ?? '?'}`),
                  h('span', { className: `sa-reply-verdict sa-reply-${reply?.verdict ?? 'unknown'}` },
                    verdictLabels[reply?.verdict] ?? reply?.verdict ?? '未判定'),
                ),
                h('div', { className: 'sa-reply-reason' }, reply?.reason ?? ''),
                reply?.next ? h('div', { className: 'sa-reply-next' }, `下一步：${reply.next}`) : null,
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
          const customized = text !== DEFAULT_INSTRUCTION
          return h(
            'div',
            { className: 'sa-settings-page' },
            h(
              'div',
              { className: 'sa-settings-page-head' },
              h('strong', null, '批注指令'),
              h('span', { className: 'sa-hint' }, customized ? '已自定义' : '默认文案'),
            ),
            h(
              'p',
              { className: 'sa-hint' },
              '这段文字随每条批注一起发给模型。删掉「必须调用 annotation_replies」那句，逐条答复会失效。',
            ),
            h('textarea', {
              className: 'sa-setting-textarea',
              rows: 8,
              value: text,
              onChange: (event) => {
                setText(event.target.value)
                persistInstructionSettings(event.target.value)
              },
            }),
            h(
              'div',
              { className: 'sa-settings-actions' },
              h(
            'button',
                {
              type: 'button',
                  className: 'sa-link',
                  onClick: () => {
                    setText(DEFAULT_INSTRUCTION)
                    persistInstructionSettings(DEFAULT_INSTRUCTION)
                  },
                },
                '恢复默认',
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
          _internals: { buildPayload, payloadSource, describeSource, captureSource, matchInRoot, rangeFromOffsets, offsetRange, anchorRoot, locateInSource, lineOfOffset, resolveSourcePosition, refineSourcePosition, adoptSession, loadDraft, saveDraft, loadSent, saveSent, recordSent, scanSentMessages, renderSentCards, renderReplySections, buildReplySection, mergeReplyBatches, absorbRemoteReplies, shouldDiscardEmpty, loadImageSettings },
        }
      },
    }
  },
})