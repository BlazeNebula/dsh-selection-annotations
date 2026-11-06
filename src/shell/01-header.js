/**
 * @u2a5f/dsh-selection-annotations — 客户端半边（Web bundle）。
 *
 * 设计要点（用户明确要求）：
 *   - 批注 **不写进消息正文*。既不拼草稿、也不做「发出去再从气泡里藏掉」的手术。
 *   - 批注件*原生附件块*（`file` content part）随消息提交：把批注报告包成一不`File`，
 *     交给运行时自己的 `createDrafts` + 输入外壳的`addFiles`（拖拖粘贴附件走的就是这条
 *     链路）。于是那条用户消息的 content 天然是 `[{type:'text'}, {type:'file'}]` 两个独立块，DSH 官方 UI 就把它们
 *     分开渲染（正文气注+ 附件卡片），宿主半边再把附件块换成一条独立的批注消息发给模型。
 *
 * 另一半职责是「选中即批注」本身：选区 →浮动工具条→批注弹层 →原文高亮 + 编号角标，
 * 锚点只用语义化 `data-*`（`data-chat-anchor-key` / `data-chat-flow-kind` /
 * `data-textpreview-url` / `data-textpreview-line`），不依赖 CSS Modules 哈希类名。
 */
window.__ModuleLoader__.load({
  id: '@u2a5f/dsh-selection-annotations',
  factory(require) {
    const React = require('react')
    const h = React.createElement

