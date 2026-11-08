import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** DSH 的客户端加载器只取一个文件，所以源码用 ES 模块写、构建时打成 IIFE。 */
const options = {
  entryPoints: [join(root, 'src/entry.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  // React 由宿主注入（__ModuleLoader__ 的 factory(require)），不打进产物。
  external: ['react', 'react-dom/client', '@deepseek-ai/dsh-client-ui-primitives'],
  charset: 'utf8',
  legalComments: 'none',
  logLevel: 'silent',
}

export async function buildClientSource() {
  const result = await build({ ...options, write: false })
  return result.outputFiles[0].text
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = await buildClientSource()
  const { writeFileSync } = await import('node:fs')
  writeFileSync(join(root, 'client.js'), text)
  console.log(`client.js <- src/（${text.split('\n').length} 行）`)
}

// 让 check-build 能直接比较源码与产物。
export function readBuiltClient() {
  return readFileSync(join(root, 'client.js'), 'utf8')
}
