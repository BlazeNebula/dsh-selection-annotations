import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PARTS } from './parts.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 按 PARTS 顺序拼出 client.js 的完整文本（与原文件字节保持一致）。 */
export function buildClientSource(baseDir = root) {
  const output = PARTS.map((rel) => readFileSync(join(baseDir, 'src', rel), 'utf8')).join('')
  // 原文件的结尾是 "})\r"（没有 LF）；保持原字节，避免无关 diff。
  return output.endsWith('\r\n') ? output.slice(0, -1) : output
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = buildClientSource()
  writeFileSync(join(root, 'client.js'), text)
  console.log(`client.js <- ${PARTS.length} 个源码片段，共 ${text.split('\n').length} 行`)
}
