/**
 * @description 生产构建入口：按运行时优先级合并根 `.env`、`.env.production` 与命令行环境，再执行 Nuxt。
 *   构建时显式合并运行环境，避免依赖 shell 手动加载 dotenv。
 * @file scripts/build.mjs
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnvFile } from './lib/env-file.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const IS_WIN = process.platform === 'win32'

/**
 * 合并生产构建的运行时变量：`.env.production` 覆盖 `.env`，显式命令行变量优先级最高。
 * @param {string} root 仓库根目录。
 * @param {NodeJS.ProcessEnv} commandEnv 调用命令的环境变量。
 * @returns {NodeJS.ProcessEnv} 可直接传给子进程的环境。
 */
export function buildRuntimeEnv(root = ROOT, commandEnv = process.env) {
  return {
    ...parseEnvFile(path.join(root, '.env')),
    ...parseEnvFile(path.join(root, '.env.production')),
    ...commandEnv,
  }
}

/**
 * 在已合并的运行时环境中执行 Nuxt 生产构建。
 * @param {string} root 仓库根目录。
 * @param {NodeJS.ProcessEnv} commandEnv 调用命令的环境变量。
 * @returns {number} 子进程退出码。
 */
export function runNuxtBuild(root = ROOT, commandEnv = process.env) {
  const command = IS_WIN ? (process.env.ComSpec || 'cmd.exe') : 'pnpm'
  const args = IS_WIN
    ? ['/d', '/s', '/c', 'pnpm', 'exec', 'nuxt', 'build']
    : ['exec', 'nuxt', 'build']
  const result = spawnSync(command, args, {
    cwd: root,
    env: buildRuntimeEnv(root, commandEnv),
    stdio: 'inherit',
    shell: false,
  })
  if (result.error) throw result.error
  return result.status ?? 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exitCode = runNuxtBuild()
