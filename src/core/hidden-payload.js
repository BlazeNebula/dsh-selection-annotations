/** 批注数据块在用户气泡里的隐藏规则。  *
 * 宿主半边在 agent/pre-step 把批注 JSON 作为额外的 text 块并进原用户消息，source 仍是
 * `kind: 'user'` —— 自动审查因此把整段文本当作用户指令。代价是这条用户气泡的正文里会
 * 多出一整段 JSON。这里注册一条 UserText 规则，把 JSON 段（从它开头的 `{` 到消息末尾）
 * 连同它前面的空行折叠成一行占位文字；模型请求与会话记录都不受影响，规则只改渲染。
 *
 * 规则契约见 @deepseek-ai/dsh-client-ui-conversation 的 contract/user-text.ts：
 * - 规则 id 不能是保留字 'text'；返回的节点 id 必须是 'text'；
 * - 返回的区间必须非空，且 `data.text` 必须等于原文切片；
 * - `data.display` 才是气泡里显示的文本。
 */

/** JSON.stringify(payload, null, 2) 里 kind 那一行；用它定位并入块的位置。 */
const KIND_LINE = '"kind": "dsh-selection-annotations"'

/** 并入块之前的空白：宿主固定加 `\n\n`，正文本身也可能以空白结尾。 */
const BLANK = /\s/

/**
 * 折叠后显示的一行占位。N 取负载里的批注条数；条数缺失或不是正整数时退回
 * 不带数字的 `【批注】`，不往气泡里写错数。
 */
function displayOf(payload) {
  const count = payload.count
  return Number.isInteger(count) && count > 0 ? `【批注 x ${count}】` : '【批注】'
}

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
      const jsonStart = text.lastIndexOf('{', kindAt)
      if (jsonStart === -1 || jsonStart < from) return undefined
      const candidate = text.slice(jsonStart)
      let payload
      try {
        payload = JSON.parse(candidate)
      } catch {
        return undefined
      }
      if (payload === null || typeof payload !== 'object' || payload.kind !== 'dsh-selection-annotations') {
        return undefined
      }
      // 宿主并块时在 JSON 前固定加了 `\n\n`，只隐藏 JSON 会在气泡里留下一条空行。
      // 这里把区间往前吞掉空白；遇到非空白字符就停，用户正文的最后一行不会被吃进来。
      let start = jsonStart
      while (start > from && BLANK.test(text[start - 1])) start -= 1
      // 气泡（UserMessageBubble）按 pre-wrap 内联渲染节点：display 不带换行就会紧贴正文最后一行，
      // 所以有正文时前置一个换行，让占位独占一行；只有 JSON、正文为空时不能前置，否则气泡顶部多出一条空行。
      const ownLine = start > 0 && text[start - 1] !== '\n'
      return {
        id: 'text',
        start,
        end: text.length,
        data: { text: text.slice(start), display: `${ownLine ? '\n' : ''}${displayOf(payload)}` },
      }
    },
  }
}
