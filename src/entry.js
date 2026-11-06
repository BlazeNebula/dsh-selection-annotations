import { createPlugin } from './plugin.js'

window.__ModuleLoader__.load({
  id: '@u2a5f/dsh-selection-annotations',
  factory(require) {
    const React = require('react')
    return createPlugin(React)
  },
})
