import {
  ADOPT_SETTINGS_KEY,
  DEFAULT_ADOPT_TEXT,
  DEFAULT_FALLBACK_TEXT,
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_INSTRUCTION,
  FALLBACK_SETTINGS_KEY,
  IMAGE_SETTINGS_KEY,
  INSTRUCTION_SETTINGS_KEY,
} from './config.js'
import { safe } from './util.js'

/**
 * 本地设置：图片压缩参数与批注指令。
 * 存储通过 getStorage() 延迟获取（浏览器 localStorage 或测试台的内存实现）。
 */
export function createSettings(getStorage, locale) {
  let imageSettings
  let instructionSettings
  let adoptText
  let fallbackText

  /** 图片设置：读坏了回落到默认值。 */
  function loadImageSettings() {
    const settings = { ...DEFAULT_IMAGE_SETTINGS }
    const storage = getStorage()
    if (storage === undefined) return settings
    const parsed = safe(() => JSON.parse(storage.getItem(IMAGE_SETTINGS_KEY) ?? 'null'))
    if (parsed === null || typeof parsed !== 'object') return settings
    settings.compress = parsed.compress !== false
    const quality = Number(parsed.quality)
    if (Number.isFinite(quality)) settings.quality = Math.min(1, Math.max(0.1, quality))
    const minSize = Number(parsed.minSize)
    if (Number.isFinite(minSize)) settings.minSize = Math.min(4096, Math.max(0, Math.round(minSize)))
    return settings
  }

  function imageSettingsOf() {
    if (imageSettings === undefined) imageSettings = loadImageSettings()
    return imageSettings
  }

  function persistImageSettings() {
    const storage = getStorage()
    if (storage === undefined) return
    safe(() => storage.setItem(IMAGE_SETTINGS_KEY, JSON.stringify(imageSettingsOf())))
  }

  /** 批注指令：读坏了或读成空串时回落到默认文案。 */
  function loadInstructionSettings() {
    const storage = getStorage()
    if (storage === undefined) return DEFAULT_INSTRUCTION
    const parsed = safe(() => JSON.parse(storage.getItem(INSTRUCTION_SETTINGS_KEY) ?? 'null'))
    if (parsed === null || typeof parsed !== 'object') return DEFAULT_INSTRUCTION
    const text = typeof parsed.text === 'string' ? parsed.text : ''
    return text.trim() === '' ? DEFAULT_INSTRUCTION : text
  }

  function instructionOf() {
    if (instructionSettings === undefined) instructionSettings = loadInstructionSettings()
    // 没改过就用当前语言对应的默认文案；改过就保留用户自己的措辞。
    return locale.isDefaultInstruction(instructionSettings) ? locale.defaultInstruction() : instructionSettings
  }

  function persistInstructionSettings(text) {
    instructionSettings = text
    const storage = getStorage()
    if (storage === undefined) return
    safe(() => storage.setItem(INSTRUCTION_SETTINGS_KEY, JSON.stringify({ text })))
  }

  /** 「批注采纳」的预填文本：空串回落到默认文案。 */
  function loadAdoptText() {
    const storage = getStorage()
    if (storage === undefined) return DEFAULT_ADOPT_TEXT
    const parsed = safe(() => JSON.parse(storage.getItem(ADOPT_SETTINGS_KEY) ?? 'null'))
    if (parsed === null || typeof parsed !== 'object') return DEFAULT_ADOPT_TEXT
    const text = typeof parsed.text === 'string' ? parsed.text.trim() : ''
    // 旧默认值静默迁移到新默认，不要求用户手动恢复。
    if (text === '意见采纳。' || text === '意见采纳') return DEFAULT_ADOPT_TEXT
    return text === '' ? DEFAULT_ADOPT_TEXT : text
  }

  function adoptTextOf() {
    if (adoptText === undefined) adoptText = loadAdoptText()
    return adoptText
  }

  function persistAdoptText(text) {
    adoptText = typeof text === 'string' && text.trim() !== '' ? text : DEFAULT_ADOPT_TEXT
    const storage = getStorage()
    if (storage === undefined) return
    safe(() => storage.setItem(ADOPT_SETTINGS_KEY, JSON.stringify({ text: adoptText })))
  }

  /** 空提示词填充：空串等同默认文案；旧默认「请按批注内容处理。」静默迁移。 */
  function loadFallbackText() {
    const storage = getStorage()
    if (storage === undefined) return DEFAULT_FALLBACK_TEXT
    const parsed = safe(() => JSON.parse(storage.getItem(FALLBACK_SETTINGS_KEY) ?? 'null'))
    if (parsed === null || typeof parsed !== 'object') return DEFAULT_FALLBACK_TEXT
    const text = typeof parsed.text === 'string' ? parsed.text : ''
    if (text.trim() === '') return DEFAULT_FALLBACK_TEXT
    // 旧默认文案静默迁移到新的模板，不要求用户手动恢复。
    return text === '请按批注内容处理。' ? DEFAULT_FALLBACK_TEXT : text
  }

  function fallbackTextOf() {
    if (fallbackText === undefined) fallbackText = loadFallbackText()
    return fallbackText
  }

  function persistFallbackText(text) {
    fallbackText = typeof text === 'string' ? text : ''
    const storage = getStorage()
    if (storage === undefined) return
    safe(() => storage.setItem(FALLBACK_SETTINGS_KEY, JSON.stringify({ text: fallbackText })))
  }

  return {
    loadImageSettings,
    imageSettingsOf,
    persistImageSettings,
    loadInstructionSettings,
    instructionOf,
    persistInstructionSettings,
    loadAdoptText,
    adoptTextOf,
    persistAdoptText,
    loadFallbackText,
    fallbackTextOf,
    persistFallbackText,
  }
}
