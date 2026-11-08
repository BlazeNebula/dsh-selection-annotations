import { createPlugin } from './plugin.js'

window.__ModuleLoader__.load({
  id: '@u2a5f/dsh-selection-annotations',
  factory(require) {
    const React = require('react')
    // 这两项是可选能力：宿主版本缺少它们时退回纯文本渲染，不影响插件加载。
    let MarkdownText
    let createRoot
    try {
      MarkdownText = require('@deepseek-ai/dsh-client-ui-primitives').MarkdownText
    } catch {
      MarkdownText = undefined
    }
    try {
      createRoot = require('react-dom/client').createRoot
    } catch {
      createRoot = undefined
    }
    return createPlugin(React, { MarkdownText, createRoot })
  },
})
