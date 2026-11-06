import {
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_INSTRUCTION,
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

  return {
    loadImageSettings,
    imageSettingsOf,
    persistImageSettings,
    loadInstructionSettings,
    instructionOf,
    persistInstructionSettings,
  }
}
