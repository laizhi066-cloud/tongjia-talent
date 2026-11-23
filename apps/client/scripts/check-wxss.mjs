/**
 * @description 使用微信原生编译器检查全部小程序 WXSS，弥补 uni build 的平台语法检查缺口。
 * @file apps/client/scripts/check-wxss.mjs
 */
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import process from 'node:process'

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(clientRoot, process.argv[2] || 'dist/build/mp-weixin')
const compiler = process.env.WECHAT_WXSS_COMPILER || '/Applications/wechatwebdevtools.app/Contents/Resources/package.nw/node_modules/wcc-exec/wcsc'
if (!existsSync(compiler))
  throw new Error('未找到微信 WXSS 编译器，请设置 WECHAT_WXSS_COMPILER 为本机 wcsc 路径。')
if (!existsSync(join(output, 'app.wxss')))
  throw new Error('未找到小程序构建产物，请先执行 pnpm client:build:mp。')

function stylesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? stylesIn(path) : entry.name.endsWith('.wxss') ? [path] : []
  })
}

const files = stylesIn(output)
let failures = 0
for (const path of files) {
  const result = spawnSync(compiler, ['-lc', path], { cwd: output, encoding: 'utf8' })
  if (result.error || result.status !== 0) {
    failures++
    console.error(`WXSS 检查失败：${relative(output, path)}`)
    console.error(result.error?.message || result.stderr || result.stdout)
  }
}
console.log(`微信 WXSS 检查：${files.length} 个文件，${failures} 个失败。`)
process.exitCode = failures ? 1 : 0
