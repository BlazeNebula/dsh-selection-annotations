import { safe } from './util.js'

/**
 * 会话定位：优先槽位 props 给的 id，其次 uiSession 的 current 绑定，最后退回会话列表。
 * latestSessionId 由 React 组件在渲染时回填，所以这里通过 getter 读取，避免拷贝。
 */
export function createSessionApi(ctx, getLatestSessionId) {
  function currentSessionId() {
    const latest = getLatestSessionId()
    if (typeof latest === 'string' && latest !== '') return latest
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

  /** 当前会话的 composer 输入外壳；拿不到就静默降级（批注仍可记录，只是不随消息发送）。 */
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
   * 输入外壳实时持有的草稿附件 id。
   *
   * 刻意不用运行时那张私有草稿表：只发附件（无正文）时，输入态已经交出了附件，
   * 但运行时仍会持有条目直到 admission 结算 —— 拿它当判据就永远等不到「已消费」。
   */
  function liveAttachmentIds(shell) {
    if (Array.isArray(shell?.attachmentIds)) return shell.attachmentIds
    const snapshot = safe(() => shell?.state?.getSnapshot())
    return Array.isArray(snapshot?.attachmentIds) ? snapshot.attachmentIds : undefined
  }

  return { currentSessionId, inputShell, liveAttachmentIds }
}
