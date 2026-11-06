import { DEFAULT_INSTRUCTION, DEFAULT_INSTRUCTION_EN, LOCALE_NS } from './config.js'
import { MESSAGES } from './messages.js'
import { safe } from './util.js'

/** 把 {name} 占位符换掉；缺省保留原样，便于发现漏翻的键。 */
export function formatMessage(template, params) {
  if (typeof template !== 'string') return ''
  if (params === undefined || params === null) return template
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match))
}

/**
 * 文案跟着 DSH 的界面语言走：注册中英词典、绑定翻译函数。
 * 没有 locale 服务（老版本宿主 / 测试台）时保持中文，功能不受影响。
 */
export function createLocale(ctx) {
  let active = 'zh'
  const service = ctx.locale
  const usable =
    service !== undefined &&
    service !== null &&
    typeof service.register === 'function' &&
    typeof service.bind === 'function'

  const fallback = (key, params) => formatMessage(MESSAGES[active]?.[key] ?? MESSAGES.zh[key] ?? key, params)
  let translate = fallback

  if (usable) {
    active = safe(() => service.getSnapshot?.().active) ?? 'zh'
    ctx.effect(() => service.register(LOCALE_NS, MESSAGES), 'selection-annotations: dictionaries')
    translate = service.bind(LOCALE_NS)
  }

  return {
    get active() {
      return active
    },
    t: (key, params) => translate(key, params),
    defaultInstruction: () =>
      active.toLowerCase().startsWith('en') ? DEFAULT_INSTRUCTION_EN : DEFAULT_INSTRUCTION,
    isDefaultInstruction: (text) => text === DEFAULT_INSTRUCTION || text === DEFAULT_INSTRUCTION_EN,
    syncActive() {
      if (usable) active = safe(() => service.getSnapshot?.().active) ?? active
    },
    /** 语言切换后重绘；返回 effect 的清理函数。 */
    subscribe(onChange) {
      if (!usable || typeof service.subscribe !== 'function') return () => {}
      return ctx.effect(() => {
        const off = service.subscribe(() => {
          active = safe(() => service.getSnapshot?.().active) ?? active
          onChange()
        })
        return () => {
          safe(off)
        }
      }, 'selection-annotations: locale changes')
    },
  }
}
