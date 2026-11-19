/**
 * 滚动追踪：把「谁改了会话区的滚动位置、谁触发了重绘」写成一行行 JSON，
 * 攒在内存队列里每 1000ms 批量送到宿主的调试路由，最终落在
 * `$DSH_HOME/selection-annotations/scroll-trace.log`。
 *
 * 只记录时间、数字和来源标记，不碰任何正文与批注内容。
 * 每条行还会带上 setContext 给出的上下文（当前会话 id 与构建号），flush 时统一合并。
 * 默认开启，控制台可用 `window.__dshSelectionAnnotations.traceScroll(false)` 关掉。
 */
export const SCROLL_TRACE_ROUTE = '/selection-annotations/debug/trace'

/** 批量推送间隔；页面隐藏或卸载时另外立即冲刷一次。 */
const FLUSH_MS = 1000
/** 内存队列上限，超出丢最旧的。 */
const MAX_QUEUE = 500
/** 插件写入的标记存活时间：scroll 事件是异步派发的，写完不能立刻清掉。 */
const WRITE_MARK_TTL_MS = 1000

export function createScrollTrace() {
  let enabled = true
  let queue = []
  let timer = null
  /** 每条行附带的上下文（会话 id、构建号）；flush 时求值，合并进该批每一行。 */
  let contextFn = null
  /** 卸载后停用；同一个实例再次 watch 时重新挂上页面级监听。 */
  let stopped = false
  let bound = false
  /** 容器 → {src, top, at}：插件刚把 scrollTop 写到哪里，等下一次 scroll 事件来认领。 */
  const marks = new WeakMap()
  const watched = new WeakSet()
  const lastTops = new WeakMap()

  function clearTimer() {
    if (timer === null) return
    try {
      window.clearTimeout(timer)
    } catch {
      /* 忽略 */
    }
    timer = null
  }

  function push(entry) {
    if (stopped || !enabled) return
    queue.push(entry)
    if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE)
    if (timer === null) {
      timer = window.setTimeout(() => {
        timer = null
        flush()
      }, FLUSH_MS)
    }
  }

  /** 把队列里攒下的行一次性发出去；失败就丢，不重试也不报错。 */
  function flush() {
    clearTimer()
    if (stopped || !enabled || queue.length === 0) return
    // 上下文在冲刷时求值：同一批行共用一个会话与构建号，不必逐行重复调用。
    let context = {}
    if (contextFn !== null) {
      try {
        const value = contextFn()
        if (value !== null && typeof value === 'object') context = value
      } catch {
        /* 上下文取不到就照常发本行，追踪不能反过来影响功能 */
      }
    }
    // 上下文放在前面、行内同名字段优先：批次行自带的 session 不会被当前会话覆盖。
    const lines = queue.map((entry) => JSON.stringify({ ...context, ...entry }))
    queue = []
    if (typeof fetch !== 'function') return
    try {
      const task = fetch(SCROLL_TRACE_ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lines }),
        keepalive: true,
      })
      if (task !== undefined && task !== null && typeof task.catch === 'function') task.catch(() => {})
    } catch {
      /* 调试通道，失败不影响功能 */
    }
  }

  /** 记一次重绘调度：触发源由调用点给出。 */
  function repaint(source) {
    push({ t: Date.now(), kind: 'repaint', src: String(source ?? 'timer') })
  }

  /** 插件自己写 scrollTop 之前调用：标记这次写入的目标位置与来源。 */
  function markWrite(container, source, expectedTop) {
    if (stopped || container === null || container === undefined) return
    marks.set(container, {
      src: String(source),
      top: Math.round(Number(expectedTop) || 0),
      at: Date.now(),
    })
  }

  /** 给滚动容器挂 passive 监听；同一个容器只挂一次。 */
  function watch(container) {
    if (container === null || container === undefined) return
    if (typeof container.addEventListener !== 'function') return
    // 卸载后又重新挂载：恢复追踪并重新绑页面级监听。
    stopped = false
    bindPageListeners()
    if (watched.has(container)) return
    watched.add(container)
    container.addEventListener(
      'scroll',
      () => {
        if (stopped || !enabled) return
        const now = Date.now()
        const top = Math.round(Number(container.scrollTop) || 0)
        const previous = lastTops.get(container)
        lastTops.set(container, top)
        let src = 'other'
        const mark = marks.get(container)
        if (mark !== undefined) {
          // 位置对得上才认作插件写的；对不上说明有别人也动了，标记作废。
          if (now - mark.at <= WRITE_MARK_TTL_MS && Math.abs(top - mark.top) <= 2) src = mark.src
          marks.delete(container)
        }
        push({ t: now, kind: 'scroll', top, d: previous === undefined ? 0 : top - previous, src })
      },
      { passive: true },
    )
  }

  /** 设置随每条 trace 一起发出的上下文；返回对象里的字段会合并进每一行。 */
  function setContext(fn) {
    contextFn = typeof fn === 'function' ? fn : null
  }

  function setEnabled(on) {
    enabled = Boolean(on)
    if (!enabled) {
      queue = []
      clearTimer()
    }
  }

  function dispose() {
    stopped = true
    queue = []
    clearTimer()
    try {
      window.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
    } catch {
      /* 忽略 */
    }
    bound = false
  }

  /** 页面级监听只挂一次；dispose 之后再次 watch 会重新挂上。 */
  function bindPageListeners() {
    if (bound) return
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
    window.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    bound = true
  }

  function onVisibilityChange() {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') flush()
  }

  function onPageHide() {
    flush()
  }

  bindPageListeners()

  return { setEnabled, setContext, flush, push, repaint, markWrite, watch, dispose }
}
