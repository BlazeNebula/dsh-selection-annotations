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
    /** 默认批注指令；删掉「必须调用annotation_replies」这句，逐条答复会退化成正文自由文本。*/
export const DEFAULT_INSTRUCTION = [
      '这是用户发来的批注数据块。它与用户消息正文相互独立：用户可能同时发了正文，',
      '也可能只发了这个批注块（此时它就是本条消息的全部内容）。annotations[].quote 是用户选中的原文；',
      'annotations[].source 给出它的位置：',
      '工作区文件用 path + lineStart/lineEnd（1 基行号）+ charStart/charEnd；',
      '对话消息用 role + anchorKey + charStart/charEnd；',
      '逐条答复区域用 kind + batchAt + index + field + charStart/charEnd：',
      'kind 为 "reply"，batchAt 是该批答复的时间戳，index 是这条答复对应的批注编号，',
      'field 取 quote / note / reason / next（跨字段时为 item），charStart/charEnd 是字段渲染文本的字符偏移。',
      '已发送批注区域用 kind + anchorKey + index + field + charStart/charEnd：',
      'kind 为 "sent"，anchorKey 是该卡片所属消息的锚点键，index 是已发送批注的编号，field 取 quote / note（跨字段为 item）。',
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

    /** 英文界面下的批注指令；结构与中文版逐句对应。*/
export const DEFAULT_INSTRUCTION_EN = [
      'This is an annotation payload sent by the user. It is independent of the user message body: ',
      'the user may have sent a body as well, or only this payload (in which case it is the entire message). ',
      'annotations[].quote is the text the user selected; annotations[].source gives its position: ',
      'workspace files use path + lineStart/lineEnd (1-based lines) + charStart/charEnd; ',
      'chat messages use role + anchorKey + charStart/charEnd; ',
      'the reply area uses kind + batchAt + index + field + charStart/charEnd: ',
      'kind is "reply", batchAt is the batch timestamp, index is the annotation number the reply belongs to, ',
      'field is quote / note / reason / next (item when the selection spans fields), and charStart/charEnd ',
      'are character offsets into the field\'s rendered text. ',
      'The sent-annotations area uses kind + anchorKey + index + field + charStart/charEnd: ',
      'kind is "sent", anchorKey is the message anchor of that card, index is the sent annotation number, ',
      'field is quote / note (item across fields). ',
      'charStart/charEnd is the half-open range [charStart, charEnd); ',
      'source.textOrigin tells you the basis: "source" means character offsets in the original file, ',
      '"rendered" means offsets in the rendered text of the anchored element. ',
      'Use "source" whenever the workspace file text can be read; fall back to "rendered" when it cannot ',
      '(or when the quote crosses Markdown markers). ',
      'annotations[].images lists images attached to that annotation; order is the 1-based position ',
      'of the image among this message\'s image attachments—match order against how images appear in the message. ',
      'After handling this batch you must call the annotation_replies tool to submit per-annotation replies ',
      'instead of repeating them in the body: each entry in replies matches one annotation, index matches ',
      'annotations[].index, verdict is accepted / partial / rejected / needs_info, reason explains it, ',
      'and next states the next step. Use the body only for an overall summary or clarifying questions.',
    ].join('')

    /** 界面文案命名空间；DSH 按语言注册后由 bind 解析。*/
export const LOCALE_NS = 'selection-annotations'
    /** 构建标记：显示在批注总览底部，用来确认当前页面加载的是哪一版代码。*/
export const PLUGIN_BUILD = '1.3.0+10'

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
