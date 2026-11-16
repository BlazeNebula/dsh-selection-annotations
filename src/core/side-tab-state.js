/**
 * 「批注总览」侧栏按钮的动作决策。
 *
 * 只看三个事实：页签是否还开着、右侧栏是否展开、页签是不是当前激活的那个。
 * 决策与 DOM、侧栏服务调用分开，四条分支才好单测。
 */

/** 点击按钮的动作。 */
export const SIDE_TAB_ACTION = {
  /** 页签不存在：打开它。 */
  open: 'open',
  /** 页签开着、侧栏展开、且处于激活：关闭它。 */
  close: 'close',
  /** 页签开着、侧栏展开、但用户切到了别的页签：聚焦回它。 */
  focus: 'focus',
  /** 页签开着但侧栏收成窄条：先展开再聚焦。 */
  reveal: 'reveal',
}

/**
 * 由三个事实推出按钮该做什么。
 * @param {{ hasTab?: boolean, expanded?: boolean, active?: boolean }} state 页签记录、侧栏展开、页签激活。
 * @returns {'open' | 'close' | 'focus' | 'reveal'} 动作。
 */
export function sideTabAction({ hasTab, expanded, active } = {}) {
  if (hasTab !== true) return SIDE_TAB_ACTION.open
  if (expanded !== true) return SIDE_TAB_ACTION.reveal
  if (active !== true) return SIDE_TAB_ACTION.focus
  return SIDE_TAB_ACTION.close
}
