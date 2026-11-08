/**
 * 用 DSH 自己的 MarkdownText 渲染批注答复正文。
 *
 * 这是可选能力：宿主没有暴露 primitives 或 react-dom/client 时退回纯文本，
 * 不影响插件加载。所有挂载出去的 React 根都会在容器离开文档后自动卸掉。
 */
export function createMarkdown({ h, MarkdownText, createRoot, labels }) {
  const usable = typeof MarkdownText === 'function' && typeof createRoot === 'function'
  const active = new Map()
  let labelsKey = ''
  let labelsValue = {}

  function unmount(container) {
    const root = active.get(container)
    if (root === undefined) return
    active.delete(container)
    try {
      root.unmount()
    } catch {
      /* 卸载失败不阻断重绘 */
    }
  }

  /** 容器已经被移除的根，下一次挂载时顺手卸掉，避免越堆越多。 */
  function prune() {
    for (const [container] of active) {
      if (container.isConnected === false) unmount(container)
    }
  }

  function mount(container, text) {
    if (typeof text !== 'string') return
    prune()
    if (!usable) {
      container.textContent = text
      return
    }
    unmount(container)
    const root = createRoot(container)
    active.set(container, root)
    container.setAttribute('data-sa-md', '1')
    const fresh = typeof labels === 'function' ? labels() : {}
    const key = JSON.stringify(fresh)
    if (key !== labelsKey) {
      labelsKey = key
      labelsValue = fresh
    }
    root.render(h(MarkdownText, { text, variant: 'body', labels: labelsValue }))
  }

  function dispose() {
    for (const [container] of active) unmount(container)
    active.clear()
  }

  return { mount, prune, dispose, usable }
}
