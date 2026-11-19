    /** 批注负载的文件名；只是给用户看的，宿主靠 JSON 里的 kind 字段认领。 */
export const ANNOTATION_FILE = '批注.json'
    /** 负载类型标记；客户端与宿主半边共用这个值。*/
export const PAYLOAD_KIND = 'dsh-selection-annotations'
export const MAX_QUOTE = 1600
export const MAX_NOTE = 4000
    /** 单条批注最多能挂几张图；再多会明显拖慢消息序列化。*/
export const MAX_IMAGES_PER_ANNOTATION = 4
    /** 单张图片的字节上限，超过就拒绝（避免把一条消息撑爆）。*/
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
    /** 图片设置键：压缩开关、质量、触发压缩的最小边。*/
export const IMAGE_SETTINGS_KEY = 'dsh-selection-annotations:image-settings'
    /** 默认设置：80% 质量、最短边超过 100 像素才重编码。 */
export const DEFAULT_IMAGE_SETTINGS = { compress: true, quality: 0.8, minSize: 100, webShot: 'element' }
    /** 批注指令设置键：随批注数据块发给模型的说明文字。*/
export const INSTRUCTION_SETTINGS_KEY = 'dsh-selection-annotations:instruction-settings'
    /** 「批注采纳」预填文本：可在插件设置里改，恢复默认回到下面这句。*/
export const ADOPT_SETTINGS_KEY = 'dsh-selection-annotations:adopt-settings'
export const DEFAULT_ADOPT_TEXT = '【意见采纳】'
    /** 「批注否决」预填文本：与采纳同一组设置项，可改词，恢复默认回到下面这句。*/
export const REJECT_SETTINGS_KEY = 'dsh-selection-annotations:reject-settings'
export const DEFAULT_REJECT_TEXT = '【意见否决】'
    /** 空提示词填充：只发批注、正文为空时自动填入的句子；设为空串即关闭。*/
export const FALLBACK_SETTINGS_KEY = 'dsh-selection-annotations:fallback-settings'
    /** 弹层尺寸：用户拖拽调整后的宽高按会话记住，下次打开沿用。*/
export const POPOVER_SIZE_KEY = 'dsh-selection-annotations:popover-size'
export const DEFAULT_FALLBACK_TEXT = '此轮对话内容均在批注中给出，总计 {count} 条批注。\n此轮消息发起时间：{time}'
    /** 默认批注指令；删掉「必须调用annotation_replies」这句，逐条答复会退化成正文自由文本。*/
export const DEFAULT_INSTRUCTION = [
      '这是用户随消息附上的批注数据块，与本轮用户正文同属一条用户消息：正文可能在前，也可能只有这份数据。\n',
      '\n',
      '## 怎么读\n',
      '- `quote`：用户选中的原文。\n',
      '- `uuid`：每条顶层自带 `uuid`，它是答复这一条的唯一依据；从捕获到入库不会变，不要拿序号或轮次替代。\n',
      '- `source`：位置。工作区文件用 `path` + `lineStart/lineEnd`（1 基行号）+ `charStart/charEnd`；对话消息用 `role` + `anchorKey` + `charStart/charEnd`。\n',
      '- `kind: "reply"`（逐条答复区域）：`batchAt` 是批次时间戳，`uuid` 是条目 uuid，`index` 是序号（只供阅读），`field` 取 `quote` / `note` / `reason` / `next`（跨字段为 `item`）。\n',
      '- `kind: "sent"`（已发送批注区域）：`anchorKey` 是卡片所属消息，顶层 `uuid` 是这条批注的 uuid，`source.uuid`（若有）只说明它引用了哪条已发送批注，不是答复目标；`index` 只供阅读。\n',
      '- `charStart/charEnd`：半开区间。`textOrigin: "source"` 指文件原文偏移，`"rendered"` 指渲染文本偏移；能读原文时优先 source。\n',
      '- `images`：该条批注的图片，`order` 是它在消息图片附件里的 1 基顺序。\n',
      '\n',
      '## 怎么答\n',
      '- 处理完必须调用 `annotation_replies` 工具，不要在正文里逐条重复。\n',
      '- replies 里每一项用该条批注顶层的 `uuid` 指定，`uuid` 是唯一依据，不要传序号、轮次。\n',
      '- `verdict` 取 `accepted` / `partial` / `rejected` / `needs_info`。\n',
      '- `reason` 写的内容：基于轮次综合受理结论的视角，逐个应答单条批注的回复。\n',
      '- `next` 写的内容：基于答单条批注的回复内容，对应接下来的具体预期、做法方案。\n',
      '- `reason` 与  `next` 内容均以 Markdown 渲染，加粗、行内代码、代码块与表格都可用；表达上要优先给子弹式要点列表，之后再给相关阐述。\n',
      '- 正文只写整体说明或需要澄清的问题。',
    ].join('')

    /** 英文界面下的批注指令；结构与中文版逐项对应。*/
export const DEFAULT_INSTRUCTION_EN = [
      'This annotation payload was attached by the user to this message and is part of the user instruction, together with the body (which may come before it, or be absent entirely).\n',
      '\n',
      '## How to read it\n',
      '- `quote`: the text the user selected.\n',
      '- `uuid`: every annotation carries a top-level `uuid`; it is the only key for replying to that annotation. It does not change from capture to storage — do not substitute the sequence number or the turn.\n',
      '- `source`: the position. Workspace files use `path` + `lineStart/lineEnd` (1-based lines) + `charStart/charEnd`; chat messages use `role` + `anchorKey` + `charStart/charEnd`.\n',
      '- `kind: "reply"` (per-answer area): `batchAt` is the batch timestamp, `uuid` is the entry uuid, `index` is the sequence number (for reading only), `field` is `quote` / `note` / `reason` / `next` (`item` when the selection spans fields).\n',
      '- `kind: "sent"` (sent-annotations area): `anchorKey` is the message the card belongs to; the top-level `uuid` is this annotation\'s uuid; `source.uuid` (when present) only says which sent annotation it references — it is not the reply target; `index` is for reading only.\n',
      '- `charStart/charEnd`: a half-open range. `textOrigin: "source"` means offsets in the original file text, `"rendered"` means offsets in the rendered text; prefer source when the file can be read.\n',
      '- `images`: images attached to that annotation; `order` is the 1-based position among this message\'s image attachments.\n',
      '\n',
      '## How to answer\n',
      '- When done, you must call the `annotation_replies` tool instead of repeating replies in the body.\n',
      '- Each entry in replies names its annotation by that annotation\'s top-level `uuid`; the `uuid` is the only key — do not pass the sequence number or the turn.\n',
      '- `verdict` is `accepted` / `partial` / `rejected` / `needs_info`.\n',
      '- `reason` explains the verdict for that annotation, in the context of the whole turn.\n',
      '- `next` states the concrete expectation or plan that follows from the reply to that annotation.\n',
      '- `reason` and `next` render as Markdown: bold, inline code, code fences and tables are supported; prefer bullet lists first, then the supporting explanation.\n',
      '- Use the body only for an overall summary or clarifying questions.',
    ].join('')

    /** 界面文案命名空间；DSH 按语言注册后由 bind 解析。*/
export const LOCALE_NS = 'selection-annotations'
    /** 构建标记：显示在批注总览底部，用来确认当前页面加载的是哪一版代码。*/
export const PLUGIN_BUILD = '2.0.0'

    /** 未提交草稿的本地存储前缀：按会话分键。*/
export const DRAFT_STORAGE_PREFIX = 'dsh-selection-annotations:draft:'
export const DRAFT_MAX_SESSIONS = 24
export const DRAFT_MAX_ITEMS = 200
    /** 已提交批注的本地台账前缀：按会话分键。*/
export const SENT_STORAGE_PREFIX = 'dsh-selection-annotations:sent:'
export const SENT_MAX_ENTRIES = 120
export const SENT_MAX_BYTES = 2 * 1024 * 1024
    /** 轮询宿主答复的间隔；模型答复通常紧跟发送。*/
export const REPLY_POLL_MS = 6000
    /** 刚发出的批注负载等消息行出现的最长时间。*/
export const SENT_PENDING_TTL_MS = 60000
    /** 中文原文即现有措辞，保持与既有测试断言一致。*/
