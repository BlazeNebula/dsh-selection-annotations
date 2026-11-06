// 校验 client.js 与 src/ 一致：直接改产物会被下一次 build 覆盖。
import { buildClientSource, readBuiltClient } from './build.mjs'

const expected = await buildClientSource()
const actual = readBuiltClient()

if (expected !== actual) {
  console.error('client.js 与 src/ 不一致：请运行 `npm run build` 后重新提交。')
  process.exit(1)
}
