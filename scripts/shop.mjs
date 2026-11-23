#!/usr/bin/env node
/**
 * @description 基础版统一命令入口。
 * @file scripts/shop.mjs
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** @param {string} script 仓库内 Node 脚本。 @param {string[]} args 参数。 */
function run(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, stdio: 'inherit' })
  process.exitCode = result.status ?? 1
}

const [, , command] = process.argv
const commands = {
  setup: () => run('scripts/env.mjs', ['setup']),
  pb: () => run('scripts/env.mjs', ['pb']),
  doctor: () => run('scripts/env.mjs', ['doctor']),
}

if (!command || command === 'help' || command === '--help' || command === '-h') {
  console.log('用法：pnpm shop <setup|pb|doctor>')
  process.exitCode = command ? 0 : 1
} else if (commands[command]) {
  commands[command]()
} else {
  console.error(`✗ 未知命令「${command}」`)
  process.exitCode = 1
}
