// 校验 client.js 与 src/ 下的源码片段一致：直接改 client.js 会让下一次 build 覆盖掉。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildClientSource } from './build.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const expected = buildClientSource(root)
const actual = readFileSync(join(root, 'client.js'), 'utf8')

if (expected !== actual) {
  console.error('client.js 与 src/ 源码不一致：请运行 `npm run build` 后重新提交。')
  process.exit(1)
}
