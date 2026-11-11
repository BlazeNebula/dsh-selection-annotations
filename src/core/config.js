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
export const DEFAULT_IMAGE_SETTINGS = { compress: true, quality: 0.8, minSize: 100 }
    /** 批注指令设置键：随批注数据块发给模型的说明文字。*/
export const INSTRUCTION_SETTINGS_KEY = 'dsh-selection-annotations:instruction-settings'
    /** 「批注采纳」预填文本：可在插件设置里改，恢复默认回到下面这句。*/
export const ADOPT_SETTINGS_KEY = 'dsh-selection-annotations:adopt-settings'
export const DEFAULT_ADOPT_TEXT = '【意见采纳】'
    /** 默认批注指令；删掉「必须调用annotation_replies」这句，逐条答复会退化成正文自由文本。*/
export const DEFAULT_INSTRUCTION = [
      '这是用户发来的批注数据块，与用户消息正文相互独立：正文可能同时存在，也可能没有。\n',
      '\n',
      '## 怎么读\n',
      '- `quote`：用户选中的原文。\n',
      '- `source`：位置。工作区文件用 `path` + `lineStart/lineEnd`（1 基行号）+ `charStart/charEnd`；对话消息用 `role` + `anchorKey` + `charStart/charEnd`。\n',
      '- `kind: "reply"`（逐条答复区域）：`batchAt` 是批次时间戳，`index` 是批注编号，`field` 取 `quote` / `note` / `reason` / `next`（跨字段为 `item`）。\n',
      '- `kind: "sent"`（已发送批注区域）：`anchorKey` 是卡片所属消息，`index` 是批注编号，`field` 取 `quote` / `note`（跨字段为 `item`）。\n',
      '- `charStart/charEnd`：半开区间。`textOrigin: "source"` 指文件原文偏移，`"rendered"` 指渲染文本偏移；能读原文时优先 source。\n',
      '- `images`：该条批注的图片，`order` 是它在消息图片附件里的 1 基顺序。\n',
      '\n',
      '## 怎么答\n',
      '- 处理完必须调用 `annotation_replies` 工具，不要在正文里逐条重复。\n',
      '- 每条批注对应 replies 里的一项，`index` 与批注编号一致。\n',
      '- `verdict` 取 `accepted` / `partial` / `rejected` / `needs_info`；`reason` 写理由，`next` 写下一步。\n',
      '- 答复正文按 Markdown 渲染，优先用要点列表；加粗、行内代码、代码块与表格都可用。\n',
      '- 正文只写整体说明或需要澄清的问题。',
    ].join('')

    /** 英文界面下的批注指令；结构与中文版逐项对应。*/
export const DEFAULT_INSTRUCTION_EN = [
      'This is an annotation payload sent by the user. It is independent of the user message body, which may or may not be present.\n',
      '\n',
      '## How to read it\n',
      '- `quote`: the text the user selected.\n',
      '- `source`: the position. Workspace files use `path` + `lineStart/lineEnd` (1-based lines) + `charStart/charEnd`; chat messages use `role` + `anchorKey` + `charStart/charEnd`.\n',
      '- `kind: "reply"` (per-answer area): `batchAt` is the batch timestamp, `index` is the annotation number, `field` is `quote` / `note` / `reason` / `next` (`item` when the selection spans fields).\n',
      '- `kind: "sent"` (sent-annotations area): `anchorKey` is the message the card belongs to, `index` is the annotation number, `field` is `quote` / `note` (`item` across fields).\n',
      '- `charStart/charEnd`: a half-open range. `textOrigin: "source"` means offsets in the original file text, `"rendered"` means offsets in the rendered text; prefer source when the file can be read.\n',
      '- `images`: images attached to that annotation; `order` is the 1-based position among this message\'s image attachments.\n',
      '\n',
      '## How to answer\n',
      '- When done, you must call the `annotation_replies` tool instead of repeating replies in the body.\n',
      '- Each annotation maps to one entry in replies; `index` matches the annotation number.\n',
      '- `verdict` is `accepted` / `partial` / `rejected` / `needs_info`; `reason` explains it, `next` states the next step.\n',
      '- Reply bodies render as Markdown: prefer bullet lists; bold, inline code, code fences and tables are supported.\n',
      '- Use the body only for an overall summary or clarifying questions.',
    ].join('')

    /** 界面文案命名空间；DSH 按语言注册后由 bind 解析。*/
export const LOCALE_NS = 'selection-annotations'
    /** 构建标记：显示在批注总览底部，用来确认当前页面加载的是哪一版代码。*/
export const PLUGIN_BUILD = '1.3.0'

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
