#!/usr/bin/env node
/**
 * @description 基础版本地 PocketBase 与开发环境入口。
 * @file scripts/env.mjs
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PB_URL_DEFAULT, loadDotEnv } from './_pb.mjs'

loadDotEnv()

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = process.env.POCKETBASE_DATA_DIR || resolve(ROOT, 'pb_data')
const MIGRATIONS_DIR = process.env.POCKETBASE_MIGRATIONS_DIR || resolve(tmpdir(), 'foundation-pb-migrations')
const PB_URL = process.env.POCKETBASE_URL || PB_URL_DEFAULT

/** @returns {string} 本机 PocketBase 二进制路径。 */
function pocketBaseBinary() {
  const configured = process.env.POCKETBASE_BINARY
  const candidates = [configured, resolve(ROOT, 'pocketbase', 'pocketbase'), resolve(ROOT, 'pocketbase', 'pocketbase.exe')]
  const binary = candidates.find(candidate => candidate && existsSync(candidate))
  if (!binary)
    throw new Error('找不到 PocketBase 二进制文件。请将其放在 pocketbase/，或设置 POCKETBASE_BINARY。')
  return binary
}

/**
 * 只允许使用空迁移目录，避免基础版误加载历史迁移，也绝不删除用户指定的路径。
 *
 * @returns {void}
 */
function prepareEmptyMigrationsDir() {
  if (existsSync(MIGRATIONS_DIR)) {
    let entries
    try {
      entries = readdirSync(MIGRATIONS_DIR)
    } catch {
      throw new Error(`PocketBase 迁移目录不可读取：${MIGRATIONS_DIR}`)
    }
    if (entries.some(entry => entry !== '.gitkeep'))
      throw new Error(`PocketBase 迁移目录必须为空：${MIGRATIONS_DIR}。基础版不会删除或重放其中的文件。`)
    return
  }
  mkdirSync(MIGRATIONS_DIR, { recursive: true })
}

/** @returns {string[]} 禁用历史迁移的单实例启动参数。 */
function pocketBaseArgs() {
  prepareEmptyMigrationsDir()
  return ['serve', `--dir=${DATA_DIR}`, `--migrationsDir=${MIGRATIONS_DIR}`, '--automigrate=false', '--http', PB_URL.replace(/^https?:\/\//, '')]
}

/** @param {string} command 子命令。 */
function run(command) {
  if (command === 'setup') {
    const result = spawnSync(process.execPath, ['scripts/setup.mjs'], { cwd: ROOT, stdio: 'inherit', env: process.env })
    process.exitCode = result.status ?? 1
    return
  }

  if (command === 'pb') {
    const child = spawn(pocketBaseBinary(), pocketBaseArgs(), { cwd: ROOT, stdio: 'inherit' })
    child.once('exit', code => { process.exitCode = code ?? 1 })
    return
  }

  if (command === 'doctor') {
    const binary = pocketBaseBinary()
    console.log(`✓ PocketBase: ${binary}`)
    console.log(`✓ 数据目录: ${DATA_DIR}`)
    console.log(`✓ 单实例地址: ${PB_URL}`)
    return
  }

  throw new Error(`未知命令「${command}」。可用：setup | pb | doctor`)
}

try {
  run(process.argv[2] || 'doctor')
} catch (error) {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
