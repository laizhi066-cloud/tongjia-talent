#!/usr/bin/env node
/**
 * @description 本地一键启动：唯一 PocketBase + B 端 Nuxt + C 端 H5，统一日志前缀，Ctrl+C 一起退出。
 * @file scripts/dev-all.mjs
 * @usage pnpm dev:all
 */
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IS_WIN = process.platform === 'win32'
const PNPM = IS_WIN ? 'pnpm.cmd' : 'pnpm'

const COLORS = { pb: '\u001B[35m', nuxt: '\u001B[32m', h5: '\u001B[36m', gray: '\u001B[90m', reset: '\u001B[0m' }

/** 只保留客户端命令，跳过 dev:all 自身的派生调用，避免递归。 */
const only = process.argv.slice(2).filter((arg) => !arg.startsWith('-'))
const enabled = (name) => !only.length || only.includes(name)

const tasks = []
if (enabled('pb'))
  tasks.push({ name: 'pb', cmd: process.execPath, args: ['scripts/env.mjs', 'pb'], env: {} })
if (enabled('nuxt'))
  tasks.push({ name: 'nuxt', cmd: PNPM, args: ['dev'], env: {} })
if (enabled('h5'))
  tasks.push({
    name: 'h5',
    cmd: PNPM,
    args: ['--filter', 'foundation-portal', 'dev:h5'],
    // 默认 C 端 H5 开发端口，与 VITE_APP_PORT 一致。
    env: { VITE_APP_PORT: process.env.VITE_APP_PORT || '9000' },
  })

if (!tasks.length) {
  console.error('没有可启动的任务，可选：pb / nuxt / h5，例如 `pnpm dev:all pb nuxt`')
  process.exit(1)
}

const children = []

/** 给子进程输出加名称前缀，便于同屏区分。 */
function pipe(name, stream) {
  let buffer = ''
  stream.on('data', (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines)
      if (line.trim()) process.stdout.write(`${COLORS[name]}[${name}]${COLORS.reset} ${line}\n`)
  })
  stream.on('end', () => {
    if (buffer.trim()) process.stdout.write(`${COLORS[name]}[${name}]${COLORS.reset} ${buffer}\n`)
    buffer = ''
  })
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  // 给子进程一点退出时间，然后强制结束残留。
  setTimeout(() => process.exit(code), 500)
}

process.on('SIGINT', () => { console.log(`\n${COLORS.gray}正在停止 dev:all …${COLORS.reset}`); shutdown(0) })
process.on('SIGTERM', () => shutdown(0))

console.log(`${COLORS.gray}dev:all 启动：${tasks.map((task) => task.name).join(' + ')}（Ctrl+C 全部退出）${COLORS.reset}`)

for (const task of tasks) {
  const child = spawn(task.cmd, task.args, {
    cwd: ROOT,
    env: { ...process.env, ...task.env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: IS_WIN,
  })
  children.push(child)
  pipe(task.name, child.stdout)
  pipe(task.name, child.stderr)
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`${COLORS[task.name]}[${task.name}]${COLORS.reset} 退出，code=${code}`)
      shutdown(code ?? 1)
    }
  })
}
