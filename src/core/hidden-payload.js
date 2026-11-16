/** 批注数据块在用户气泡里的隐藏规则。  *
 * 宿主半边在 agent/pre-step 把批注 JSON 作为额外的 text 块并进原用户消息，source 仍是
 * `kind: 'user'` —— 自动审查因此把整段文本当作用户指令。代价是这条用户气泡的正文里会
 * 多出一整段 JSON。这里注册一条 UserText 规则，把 JSON 段（从它开头的 `{` 到消息末尾）
 * 显示为空；模型请求与会话记录都不受影响，规则只改渲染。
 *
 * 规则契约见 @deepseek-ai/dsh-client-ui-conversation 的 contract/user-text.ts：
 * - 规则 id 不能是保留字 'text'；返回的节点 id 必须是 'text'；
 * - 返回的区间必须非空，且 `data.text` 必须等于原文切片；
 * - `data.display` 才是气泡里显示的文本，取空串即隐藏。
 */

/** JSON.stringify(payload, null, 2) 里 kind 那一行；用它定位并入块的位置。 */
const KIND_LINE = '"kind": "dsh-selection-annotations"'

/**
 * 构造规则。order 取 900：比空白折叠规则（1000/1010）小，同起点时优先隐藏，
 * 不会被折叠规则先把这段文字拆出来。
 */
export function createPayloadHidingRule() {
  return {
    id: 'selection-annotations:payload',
    order: 900,
    match(text, from) {
      if (typeof text !== 'string' || text === '') return undefined
      const kindAt = text.indexOf(KIND_LINE, from)
      if (kindAt === -1) return undefined
      // JSON 块的开头是它前一个 `{`；从那里到消息末尾就是并入的批注数据。
      const start = text.lastIndexOf('{', kindAt)
      if (start === -1 || start < from) return undefined
      const candidate = text.slice(start)
      let payload
      try {
        payload = JSON.parse(candidate)
      } catch {
        return undefined
      }
      if (payload === null || typeof payload !== 'object' || payload.kind !== 'dsh-selection-annotations') {
        return undefined
      }
      return { id: 'text', start, end: text.length, data: { text: candidate, display: '' } }
    },
  }
}
