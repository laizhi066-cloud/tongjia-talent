#!/usr/bin/env node
/**
 * @description 生成一份「干净」的生产初始数据库：只含基础 schema、菜单、站点配置和账号，不含任何演示业务数据。
 *  在本地用一个全新临时数据目录跑基础初始化，产物放在 .deploy-staging/prod-db，供 `pnpm deploy:remote --init-db` 上传。
 * @file scripts/init-prod-db.mjs
 * @usage pnpm prod:init-db
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IS_WIN = process.platform === 'win32'
const PNPM = IS_WIN ? 'pnpm.cmd' : 'pnpm'

function parseEnvFile(path) {
  const env = {}
  if (!existsSync(path)) return env
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    env[line.slice(0, eq).trim()] = value
  }
  return env
}

// 生产凭据优先取 .env.production / .deploy.env，其次 .env。
const prodEnvFile = join(ROOT, '.env.production')
const env = {
  ...parseEnvFile(join(ROOT, '.env')),
  ...parseEnvFile(prodEnvFile),
  ...parseEnvFile(join(ROOT, '.deploy.env')),
}
if (!existsSync(prodEnvFile) && !existsSync(join(ROOT, '.deploy.env')))
  console.warn('⚠ 未发现 .env.production / .deploy.env，将使用 .env 的开发凭据生成生产库；请先配置生产账号与 ENCRYPTION_KEY。')
const adminEmail = env.POCKETBASE_ADMIN_EMAIL
const adminPassword = env.POCKETBASE_ADMIN_PASSWORD
const encryptionKey = env.ENCRYPTION_KEY
if (!adminEmail || !adminPassword)
  throw new Error('缺少生产后台账号：请在 .env.production 或 .deploy.env 配置 POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD')
if (!encryptionKey)
  throw new Error('缺少生产 ENCRYPTION_KEY：它用于加密微信配置，必须长期保存且不可随意轮换')

const dataDir = join(ROOT, '.deploy-staging', 'prod-db')
const migrationsDir = join(ROOT, '.deploy-staging', 'prod-migrations')
const pbUrl = 'http://127.0.0.1:8097'
const childEnv = {
  ...process.env,
  POCKETBASE_DATA_DIR: dataDir,
  POCKETBASE_MIGRATIONS_DIR: migrationsDir,
  POCKETBASE_URL: pbUrl,
  POCKETBASE_ADMIN_EMAIL: adminEmail,
  POCKETBASE_ADMIN_PASSWORD: adminPassword,
  ENCRYPTION_KEY: encryptionKey,
}

console.log(`▶ 清空并初始化干净生产库：${dataDir}`)
rmSync(dataDir, { recursive: true, force: true })
rmSync(migrationsDir, { recursive: true, force: true })
mkdirSync(migrationsDir, { recursive: true })

console.log('▶ 基础 schema（env:setup，仅新库）')
const setup = spawnSync(process.execPath, ['scripts/env.mjs', 'setup'], { cwd: ROOT, stdio: 'inherit', env: childEnv })
if (setup.status !== 0) throw new Error(`env:setup 失败（exit ${setup.status}）`)

// 启动临时 PB，创建 superAdmin / 客户管理员两个账号，然后关闭。
console.log('▶ 启动临时 PocketBase 以创建后台账号')
const pb = spawn(process.execPath, ['scripts/env.mjs', 'pb'], { cwd: ROOT, stdio: 'ignore', env: childEnv })

async function waitReady(timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${pbUrl}/api/health`, { signal: AbortSignal.timeout(2000) })
      if (res.ok) return true
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 800))
  }
  return false
}

try {
  if (!await waitReady()) throw new Error('临时 PocketBase 启动超时')
  const seed = spawnSync(PNPM, ['accounts:seed'], { cwd: ROOT, stdio: 'inherit', env: childEnv })
  if (seed.status !== 0) throw new Error(`accounts:seed 失败（exit ${seed.status}）`)
} finally {
  pb.kill('SIGTERM')
  // 给 PocketBase 一点时间做 WAL checkpoint，避免刚生成的库带着未落盘的 WAL。
  await new Promise((r) => setTimeout(r, 2000))
}

console.log(`
✓ 生产初始库已生成：${dataDir}
  只含 schema / 菜单 / 站点配置 / 账号，无演示业务数据。
  下一步：pnpm deploy:remote --init-db
  说明：把 .env.production 或 .deploy.env 里的 POCKETBASE_ADMIN_PASSWORD、SUPERADMIN_PASSWORD、CUSTOMER_ADMIN_PASSWORD 换为生产强口令后再生成。
`)
