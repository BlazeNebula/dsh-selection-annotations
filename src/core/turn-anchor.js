/**
 * 在每轮对话的尾部插一个空的锚点元素。
 *
 * DSH 每轮末尾的「已完成 / 本轮费用」来自 `conversation.chat.turnTail` 槽位，
 * 槽位组件能直接拿到 `sessionId` 与 `turn`。我们在这里放一个带 data 属性的空 div，
 * 卡片按 `[data-sa-turn][data-sa-session]` 精确落位，不必再扫描整个页面猜是哪一轮。
 */
export const TURN_ANCHOR_SLOT = 'conversation.chat.turnTail'

export function registerTurnAnchor(ctx, h) {
  const slots = ctx.slots
  if (slots === undefined || slots === null) return
  if (typeof slots.inject !== 'function' || typeof slots.register !== 'function') return

  const TurnAnchor = (props) => {
    const turn = Number(props?.turn)
    if (!Number.isFinite(turn) || turn <= 0) return null
    const sessionId = typeof props?.sessionId === 'string' ? props.sessionId : ''
    return h('div', {
      className: 'sa-turn-anchor',
      'data-sa-turn': String(turn),
      'data-sa-session': sessionId,
    })
  }
  TurnAnchor.displayName = 'SelectionAnnotationsTurnAnchor'

  const register = () =>
    slots.register(
      {
        name: TURN_ANCHOR_SLOT,
        id: 'selection-annotations-turn-anchor',
        order: 20,
      },
      TurnAnchor,
    )

  // 槽位服务自己管生命周期；这里包一层 effect，确保插件卸载时一起撤掉。
  ctx.effect(() => slots.inject(TURN_ANCHOR_SLOT, register), 'selection-annotations: turn anchors')
}

/** 找到某一轮、某个会话的锚点元素；找不到就返回 null，让调用方退回旧逻辑。*/
export function findTurnAnchor(turn, sessionId) {
  if (!Number.isFinite(turn) || turn <= 0) return null
  const escaped = typeof sessionId === 'string' && sessionId !== '' ? sessionId.replace(/["\\]/g, '\\$&') : ''
  const selector =
    escaped === ''
      ? `[data-sa-turn="${turn}"]`
      : `[data-sa-turn="${turn}"][data-sa-session="${escaped}"]`
  return document.querySelector(selector)
}
