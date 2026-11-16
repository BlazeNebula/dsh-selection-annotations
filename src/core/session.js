import { safe } from './util.js'

/**
 * 会话定位：优先 sessions.list 里主视图保留的会话（retainedBy.mainView > 0），
 * 其次 uiSession 的 current 绑定，再退回槽位 props 与快照里的 current。
 * latestSessionId 由 React 组件在渲染时回填，所以这里通过 getter 读取，避免拷贝。
 */
export function createSessionApi(ctx, getLatestSessionId) {
  function currentSessionId() {
    // 主视图只保留一个会话：sessions.list 的 byId 里 retainedBy.mainView > 0 的那条
    // 才是用户正在看的会话。槽位 props 里的 id 会被其他仍挂载的会话覆盖，不能优先。
    const main = safe(() => {
      const byId = ctx.sessions?.list?.getSnapshot?.()?.byId
      if (byId === undefined || byId === null) return undefined
      for (const candidate of Object.values(byId)) {
        if ((candidate?.retainedBy?.mainView ?? 0) > 0 && typeof candidate.id === 'string') return candidate.id
      }
      return undefined
    })
    if (main !== undefined) return main
    const fromUi = safe(() => {
      const binding = ctx.get('uiSession')?.adapter?.current?.getSnapshot?.()
      return typeof binding?.key === 'string' && binding.key !== '' ? binding.key : undefined
    })
    if (fromUi !== undefined) return fromUi
    const latest = getLatestSessionId()
    if (typeof latest === 'string' && latest !== '') return latest
    return safe(() => {
      const snap = ctx.sessions?.list?.getSnapshot?.()
      if (snap === undefined || snap === null) return undefined
      if (typeof snap.current === 'string' && snap.current !== '') return snap.current
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
