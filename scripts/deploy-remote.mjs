#!/usr/bin/env node
/**
 * @description 远程部署（测试/生产单实例）：本地构建 → rsync 上传 → 服务器 PM2 启动/重载 → nginx 子路径挂载。
 *  - 默认只重载本项目两个进程（tongjia-talent / tongjia-talent-pb），不动服务器上其它项目。
 *  - 服务器无需 rsync；产物通过 rsync over SSH 传输。
 *  - 配置来自 .deploy.env；支持密码、指定 SSH 私钥或本机 SSH agent。
 * @file scripts/deploy-remote.mjs
 * @usage pnpm deploy:remote [--with-db|--no-db] [--init-db [--force-init-db]] [--force-db-replace] [--no-build] [--dry-run] [--skip-nginx] [--skip-pb] [--skip-public-check]
 */
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IS_WIN = process.platform === 'win32'
const PNPM = IS_WIN ? 'pnpm.cmd' : 'pnpm'
const has = (flag) => process.argv.includes(flag)

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

function loadDeployEnv() {
  const deployPath = existsSync(join(ROOT, '.deploy.env')) ? join(ROOT, '.deploy.env') : join(ROOT, '.deploy.env.example')
  if (!existsSync(deployPath)) throw new Error('缺少 .deploy.env，请先复制 .deploy.env.example 并填写')
  return {
    env: {
      ...parseEnvFile(join(ROOT, '.env')),
      ...parseEnvFile(join(ROOT, '.env.production')),
      ...parseEnvFile(deployPath),
      ...process.env,
    },
    from: deployPath,
  }
}

/** @param {unknown} value 要转义的 shell 字符串。 @returns {string} 单引号 shell 字符串。 */
function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`
}

/** @param {string} name 配置项名称。 @param {string} value 配置值。 @param {RegExp} pattern 允许的格式。 */
function assertSafeConfig(name, value, pattern) {
  if (!pattern.test(value)) throw new Error(`${name} 格式不安全：${value}`)
}

/** @param {string} name 命令名。 */
function assertCommand(name) {
  const result = spawnSync('sh', ['-lc', `command -v ${name}`], { stdio: 'ignore' })
  if (result.status !== 0) throw new Error(`本机缺少命令：${name}`)
}

const { env, from } = loadDeployEnv()
const cfg = {
  host: env.DEPLOY_HOST,
  port: env.DEPLOY_PORT || '22',
  user: env.DEPLOY_USER || 'root',
  password: env.DEPLOY_PASSWORD || '',
  sshKey: env.DEPLOY_SSH_KEY || '',
  path: (env.DEPLOY_PATH || '/www/wwwroot/tongjia-talent').replace(/\/$/, ''),
  pbPort: env.DEPLOY_PB_PORT || '8096',
  appPort: env.DEPLOY_APP_PORT || '3101',
  publicHost: env.DEPLOY_PUBLIC_HOST,
  publicScheme: env.DEPLOY_PUBLIC_SCHEME || 'http',
  environment: env.DEPLOY_ENV || 'staging',
  h5Base: (env.DEPLOY_H5_BASE || '/tongjia-talent-h5').replace(/\/$/, ''),
  adminBase: (env.DEPLOY_ADMIN_BASE || '/tongjia-talent').replace(/\/$/, ''),
  pbBase: (env.DEPLOY_PB_BASE || '/tongjia-talent-pb').replace(/\/$/, ''),
  pbVersion: (env.DEPLOY_PB_VERSION || '0.38.1').replace(/^v/, ''),
  pbArch: env.DEPLOY_PB_ARCH || 'amd64',
  nodeOptions: env.DEPLOY_NODE_OPTIONS || process.env.NODE_OPTIONS || '--max-old-space-size=4096',
  healthTimeoutSec: Number(env.DEPLOY_HEALTH_TIMEOUT_SEC || '60'),
  releaseKeep: Number(env.DEPLOY_RELEASE_KEEP || '3'),
  withDb: has('--with-db') || (String(env.DEPLOY_WITH_DB || '') === 'true' && !has('--no-db')),
  nginxExtDir: env.DEPLOY_NGINX_EXT_DIR || '',
}
if (!cfg.host || !cfg.publicHost) throw new Error(`部署配置不完整：${from}`)
if (cfg.password && cfg.sshKey) throw new Error('DEPLOY_PASSWORD 与 DEPLOY_SSH_KEY 只能配置一个')
if (!Number.isInteger(cfg.healthTimeoutSec) || cfg.healthTimeoutSec < 10 || cfg.healthTimeoutSec > 300)
  throw new Error('DEPLOY_HEALTH_TIMEOUT_SEC 必须是 10-300 的整数')
if (!Number.isInteger(cfg.releaseKeep) || cfg.releaseKeep < 2 || cfg.releaseKeep > 10)
  throw new Error('DEPLOY_RELEASE_KEEP 必须是 2-10 的整数')
if (!['http', 'https'].includes(cfg.publicScheme)) throw new Error('DEPLOY_PUBLIC_SCHEME 只能是 http 或 https')
if (!['staging', 'production'].includes(cfg.environment)) throw new Error('DEPLOY_ENV 只能是 staging 或 production')
if (cfg.environment === 'production' && cfg.publicScheme !== 'https') throw new Error('DEPLOY_ENV=production 时必须使用 DEPLOY_PUBLIC_SCHEME=https')
assertSafeConfig('DEPLOY_HOST', cfg.host, /^[A-Za-z0-9._:-]+$/)
assertSafeConfig('DEPLOY_USER', cfg.user, /^[A-Za-z0-9._-]+$/)
assertSafeConfig('DEPLOY_PATH', cfg.path, /^\/[A-Za-z0-9._/-]+$/)
assertSafeConfig('DEPLOY_PUBLIC_HOST', cfg.publicHost, /^[A-Za-z0-9._:-]+$/)
for (const [name, value] of [['DEPLOY_H5_BASE', cfg.h5Base], ['DEPLOY_ADMIN_BASE', cfg.adminBase], ['DEPLOY_PB_BASE', cfg.pbBase]])
  assertSafeConfig(name, value, /^\/[A-Za-z0-9._/-]+$/)
if (cfg.nginxExtDir) assertSafeConfig('DEPLOY_NGINX_EXT_DIR', cfg.nginxExtDir, /^\/[A-Za-z0-9._/-]+$/)
if (!/^[0-9]+$/.test(cfg.port) || !/^[0-9]+$/.test(cfg.pbPort) || !/^[0-9]+$/.test(cfg.appPort))
  throw new Error('DEPLOY_PORT / DEPLOY_PB_PORT / DEPLOY_APP_PORT 必须是数字')
if (!/^v?[0-9]+\.[0-9]+\.[0-9]+$/.test(cfg.pbVersion)) throw new Error('DEPLOY_PB_VERSION 必须是 semver 版本号')
if (!['amd64', 'arm64'].includes(cfg.pbArch)) throw new Error('DEPLOY_PB_ARCH 只能是 amd64 或 arm64')

const remote = `${cfg.user}@${cfg.host}`
// 连接复用：所有 ssh/scp/rsync 共用一个 TCP+认证会话，避免频繁重连被服务器限流，也明显更快。
const CONTROL_PATH = `/tmp/tj-deploy-${cfg.host}-${cfg.port}.sock`
const SSH_COMMON = [
  '-o', 'StrictHostKeyChecking=accept-new',
  '-o', cfg.password ? 'PreferredAuthentications=password' : 'PreferredAuthentications=publickey',
  '-o', cfg.password ? 'PubkeyAuthentication=no' : 'PasswordAuthentication=no',
  '-o', 'ControlMaster=auto',
  '-o', `ControlPath=${CONTROL_PATH}`,
  '-o', 'ControlPersist=180',
  '-o', 'ServerAliveInterval=30',
]
if (cfg.sshKey) SSH_COMMON.push('-i', resolve(ROOT, cfg.sshKey))
const baseEnv = { ...process.env, ...(cfg.password ? { SSHPASS: cfg.password } : {}) }
const appBase = `${cfg.adminBase}/`
const publicOrigin = `${cfg.publicScheme}://${cfg.publicHost}`
const publicH5Base = `${publicOrigin}${cfg.h5Base}/`
const publicPbBase = `${publicOrigin}${cfg.pbBase}`

if (has('--init-db') && has('--with-db')) throw new Error('--init-db 与 --with-db 不能同时使用')
if (has('--with-db') && has('--skip-pb')) throw new Error('--with-db 不能与 --skip-pb 同时使用，否则会跳过数据库上传')
if (has('--dry-run')) {
  console.log(JSON.stringify({
    source: from,
    remote,
    path: cfg.path,
    publicOrigin,
    environment: cfg.environment,
    adminBase: cfg.adminBase,
    h5Base: cfg.h5Base,
    pbBase: cfg.pbBase,
    databaseMode: has('--init-db') ? 'init-db' : cfg.withDb ? 'with-db' : 'no-db',
    build: has('--no-build') ? 'reuse' : 'local',
    releaseKeep: cfg.releaseKeep,
    nginx: has('--skip-nginx') ? 'skip' : cfg.nginxExtDir ? 'reload' : 'not-configured',
    sshAuth: cfg.password ? 'password' : cfg.sshKey ? 'private-key' : 'agent/default-key',
  }, null, 2))
  process.exit(0)
}
assertCommand('ssh')
assertCommand('rsync')
if (cfg.password) assertCommand('sshpass')
if (cfg.sshKey && !existsSync(resolve(ROOT, cfg.sshKey))) throw new Error(`找不到 DEPLOY_SSH_KEY：${cfg.sshKey}`)

const sshClient = cfg.password ? 'sshpass' : 'ssh'
const sshClientPrefix = cfg.password ? ['-e', 'ssh'] : []

function run(cmd, args, { env: extraEnv = {}, optional = false } = {}) {
  console.log(`\n▶ ${cmd} ${args.slice(0, 8).join(' ')}${args.length > 8 ? ' …' : ''}`)
  const result = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: { ...baseEnv, ...extraEnv } })
  if (result.status !== 0) {
    if (optional) { console.warn(`⚠ 跳过（exit ${result.status}）`); return false }
    throw new Error(`命令失败：${cmd} ${args.join(' ')}`)
  }
  return true
}

const ssh = (command, opts) => run(sshClient, [...sshClientPrefix, ...SSH_COMMON, '-p', cfg.port, remote, command], opts)

/** 用 rsync 上传目录（大量小文件比 scp 快很多）。 */
function uploadDir(localDir, remoteDir, { optional = false, remove = false, exclude = [] } = {}) {
  console.log(`\n▶ rsync ${localDir} → ${remote}:${remoteDir}`)
  ssh(`mkdir -p ${shellQuote(remoteDir)}`, { optional })
  const sshTransport = [...(cfg.password ? ['sshpass', '-e'] : []), 'ssh', ...SSH_COMMON, '-p', cfg.port]
    .map(shellQuote).join(' ')
  const excludeArgs = exclude.flatMap((pattern) => ['--exclude', pattern])
  return run('rsync', ['-az', '--no-perms', '--no-owner', '--no-group', ...(remove ? ['--delete'] : []), ...excludeArgs, '-e', sshTransport, `${localDir}/`, `${remote}:${remoteDir}/`], { optional })
}

const dbDir = cfg.path + '/pb/pb_data'
const dbBackupDir = cfg.path + '/pb/pre-deploy-db'
const dbOperation = has('--init-db') || cfg.withDb
const forceDbReplace = has('--force-init-db') || has('--force-db-replace')
// 非覆盖模式先做远端只读门禁，避免数据库误操作前还要等待本地完整构建。
if (dbOperation && !forceDbReplace)
  ssh(`set -e; if [ -d ${shellQuote(dbDir)} ] && find ${shellQuote(dbDir)} -type f -print -quit | grep -q .; then echo '目标 PocketBase 已有数据；如确需覆盖，请显式加 --force-init-db 或 --force-db-replace'; exit 1; fi`)

// ── 1. 构建（本地）──────────────────────────────────────────────
if (!has('--no-build')) {
  const buildEnv = {
    NODE_ENV: 'production',
    NODE_OPTIONS: cfg.nodeOptions,
    NUXT_APP_BASE_URL: appBase,
    NUXT_PUBLIC_API_BASE_URL: cfg.adminBase,
    NUXT_PUBLIC_H5_BASE: publicH5Base,
    POCKETBASE_URL: `http://127.0.0.1:${cfg.pbPort}`,
    POCKETBASE_PUBLIC_URL: publicPbBase,
    NUXT_PUBLIC_POCKETBASE_URL: publicPbBase,
  }
  run(PNPM, ['build'], { env: buildEnv })
  const localEnvFile = join(ROOT, 'apps/client/env/.env.production.local')
  const backup = existsSync(localEnvFile) ? readFileSync(localEnvFile, 'utf8') : null
  try {
    writeFileSync(localEnvFile, `VITE_SERVER_BASEURL=${cfg.adminBase}\nVITE_APP_PUBLIC_BASE=${cfg.h5Base}/\n`)
    run(PNPM, ['client:build:h5'], { env: { NODE_OPTIONS: cfg.nodeOptions } })
  } finally {
    if (backup === null) rmSync(localEnvFile, { force: true })
    else writeFileSync(localEnvFile, backup)
  }
}
if (!existsSync(join(ROOT, '.output/server/index.mjs'))) throw new Error('缺少 .output/server/index.mjs，请先构建（去掉 --no-build）')
if (!existsSync(join(ROOT, 'apps/client/dist/build/h5/index.html'))) throw new Error('缺少 H5 构建产物')
if (statSync(join(ROOT, '.output/server/index.mjs')).size < 100) throw new Error('Nuxt 构建产物异常：.output/server/index.mjs 过小')
if (statSync(join(ROOT, 'apps/client/dist/build/h5/index.html')).size < 100) throw new Error('H5 构建产物异常：index.html 过小')

// ── 2. 生成服务器配置（PM2 + nginx）────────────────────────────
const staging = join(ROOT, '.deploy-staging')
rmSync(staging, { recursive: true, force: true })
process.on('exit', () => {
  try { rmSync(staging, { recursive: true, force: true }) } catch { /* 仅清理本脚本临时目录 */ }
})
const configDir = join(staging, 'config')
mkdirSync(configDir, { recursive: true })
chmodSync(configDir, 0o700)

const adminEmail = env.POCKETBASE_ADMIN_EMAIL || ''
const adminPassword = env.POCKETBASE_ADMIN_PASSWORD || ''
const encryptionKey = env.ENCRYPTION_KEY || ''
const runtimePrefixes = ['OSS_', 'TALENT_REPORT_SYNC_', 'TALENT_AI_', 'LOGIN_LOCKOUT_']
const extra = Object.fromEntries(Object.entries(env).filter(([key]) => runtimePrefixes.some((prefix) => key.startsWith(prefix))))
const gitShaResult = spawnSync('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: ROOT, encoding: 'utf8' })
const releaseSha = gitShaResult.status === 0 ? gitShaResult.stdout.trim() : 'unknown'
const releaseId = `${releaseSha}-${Date.now()}`
const releasesRoot = cfg.path + '/.deploy-releases'
const releaseRoot = `${releasesRoot}/${releaseId}`
const releaseServer = `${releaseRoot}/server`
const releaseH5 = `${releaseRoot}/h5`
const releasePrevious = `${releaseRoot}/previous`

writeFileSync(join(configDir, 'release.json'), `${JSON.stringify({ releaseId, commit: releaseSha, createdAt: new Date().toISOString() }, null, 2)}\n`)

writeFileSync(join(configDir, 'ecosystem.tongjia-talent.config.js'), `// 自动生成，请勿手改；由 pnpm deploy:remote 维护。
module.exports = { apps: [
  {
    name: 'tongjia-talent-pb', cwd: '${cfg.path}/pb', script: './pocketbase', interpreter: 'none',
    args: 'serve --http 127.0.0.1:${cfg.pbPort} --dir ./pb_data --migrationsDir ./empty-migrations --automigrate=false',
    instances: 1, exec_mode: 'fork', autorestart: true, max_restarts: 10, kill_timeout: 15000,
    merge_logs: true, log_date_format: 'YYYY-MM-DD HH:mm:ss Z', time: true,
    error_file: '${cfg.path}/logs/pocketbase-error.log', out_file: '${cfg.path}/logs/pocketbase-out.log',
  },
  {
    name: 'tongjia-talent', cwd: '${cfg.path}/server', script: './server/index.mjs',
    instances: 1, exec_mode: 'fork', autorestart: true, max_restarts: 10, kill_timeout: 10000, max_memory_restart: '700M',
    merge_logs: true, log_date_format: 'YYYY-MM-DD HH:mm:ss Z', time: true,
    error_file: '${cfg.path}/logs/app-error.log', out_file: '${cfg.path}/logs/app-out.log',
    env: ${JSON.stringify({
      NODE_ENV: 'production', HOST: '127.0.0.1', PORT: cfg.appPort,
      POCKETBASE_URL: `http://127.0.0.1:${cfg.pbPort}`,
      POCKETBASE_PUBLIC_URL: publicPbBase, NUXT_PUBLIC_POCKETBASE_URL: publicPbBase,
      NUXT_APP_BASE_URL: appBase, NUXT_PUBLIC_API_BASE_URL: cfg.adminBase, NUXT_PUBLIC_H5_BASE: publicH5Base,
      POCKETBASE_ADMIN_EMAIL: adminEmail, POCKETBASE_ADMIN_PASSWORD: adminPassword, ENCRYPTION_KEY: encryptionKey,
      ...extra,
    }, null, 6)},
  },
]}
`)
chmodSync(join(configDir, 'ecosystem.tongjia-talent.config.js'), 0o600)

writeFileSync(join(configDir, 'tongjia-talent.nginx.conf'), `# 自动生成，请勿手改；由 pnpm deploy:remote 维护。
location ^~ ${appBase} {
    proxy_pass http://127.0.0.1:${cfg.appPort};
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    client_max_body_size 50m;
}
location ^~ ${cfg.h5Base}/ {
    alias ${cfg.path}/h5/;
    index index.html;
    try_files $uri $uri/ ${cfg.h5Base}/index.html;
}
location ^~ ${cfg.pbBase}/ {
    proxy_pass http://127.0.0.1:${cfg.pbPort}/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    client_max_body_size 50m;
}
`)

// ── 3. 服务器准备 ──────────────────────────────────────────────
ssh(`set -e; command -v pm2 >/dev/null; command -v curl >/dev/null; node -e 'if (Number(process.versions.node.split(".")[0]) < 20) process.exit(1)'; mkdir -p ${shellQuote(cfg.path + '/server')} ${shellQuote(cfg.path + '/h5')} ${shellQuote(cfg.path + '/pb/empty-migrations')} ${shellQuote(cfg.path + '/logs')}; echo ok`)
if (!has('--skip-pb'))
  ssh(`set -e; if [ ! -x ${shellQuote(cfg.path + '/pb/pocketbase')} ]; then command -v unzip >/dev/null || { command -v dnf >/dev/null && dnf install -y unzip; } || { command -v yum >/dev/null && yum install -y unzip; }; tmp_dir=$(mktemp -d /tmp/tj-pb.XXXXXX); trap 'rm -rf "$tmp_dir" "$tmp_dir.zip"' EXIT; curl -fsSL -o "$tmp_dir.zip" ${shellQuote(`https://github.com/pocketbase/pocketbase/releases/download/v${cfg.pbVersion}/pocketbase_${cfg.pbVersion}_linux_${cfg.pbArch}.zip`)}; unzip -o "$tmp_dir.zip" -d "$tmp_dir" >/dev/null; cp "$tmp_dir/pocketbase" ${shellQuote(cfg.path + '/pb/pocketbase')}; chmod +x ${shellQuote(cfg.path + '/pb/pocketbase')}; fi; ${shellQuote(cfg.path + '/pb/pocketbase')} --version`)

// ── 4. 数据库安全门禁（默认不上传；覆盖已有库必须显式确认）────────

// ── 5. 上传产物（先上传到独立快照，完成后再原子切换）─────────────
ssh(`set -e; mkdir -p ${shellQuote(releaseRoot)}`)
uploadDir(join(ROOT, '.output'), releaseServer, { remove: true })
uploadDir(join(ROOT, 'apps/client/dist/build/h5'), releaseH5, { remove: true })
uploadDir(configDir, cfg.path)
ssh(`set -e; chmod 600 ${shellQuote(cfg.path + '/ecosystem.tongjia-talent.config.js')}; cp ${shellQuote(cfg.path + '/ecosystem.tongjia-talent.config.js')} ${shellQuote(cfg.path + '/ecosystem.tongjia-talent.cjs')}; chmod 600 ${shellQuote(cfg.path + '/ecosystem.tongjia-talent.cjs')}; chmod 644 ${shellQuote(cfg.path + '/release.json')} ${shellQuote(cfg.path + '/tongjia-talent.nginx.conf')}`)
ssh(`set -e; mkdir -p ${shellQuote(releasePrevious)}; cp ${shellQuote(cfg.path + '/release.json')} ${shellQuote(releaseRoot + '/release.json')}; if [ -e ${shellQuote(cfg.path + '/server')} ]; then mv ${shellQuote(cfg.path + '/server')} ${shellQuote(releasePrevious + '/server')}; fi; if [ -e ${shellQuote(cfg.path + '/h5')} ]; then mv ${shellQuote(cfg.path + '/h5')} ${shellQuote(releasePrevious + '/h5')}; fi; mv ${shellQuote(releaseServer)} ${shellQuote(cfg.path + '/server')}; mv ${shellQuote(releaseH5)} ${shellQuote(cfg.path + '/h5')}; printf '%s\\n' ${shellQuote(releaseRoot)} > ${shellQuote(cfg.path + '/.deploy-current-release')}`)
if (dbOperation && forceDbReplace)
  ssh(`set -e; if [ -d ${shellQuote(dbDir)} ] && find ${shellQuote(dbDir)} -type f -print -quit | grep -q .; then ts=$(date -u +%Y%m%d%H%M%S); mkdir -p ${shellQuote(dbBackupDir)}; pm2 stop tongjia-talent-pb >/dev/null 2>&1 || true; mv ${shellQuote(dbDir)} ${shellQuote(dbBackupDir)}/pb_data.$ts; fi`)
// 只排除 PB 日志库、本地备份、类型定义和临时目录；但保留 data.db 的 WAL/SHM，否则可能丢未 checkpoint 的数据。
const dbExclude = ['auxiliary.db*', 'logs.db*', 'types.d.ts', 'backups/', '.notify/', '.pb_temp_to_delete/']
if (has('--init-db')) {
  // 生产全新库：本地先生成干净库（schema + 账号，无演示数据），再上传。
  console.log('\n▶ 生成干净生产库并初始化服务器数据库（覆盖服务器数据）')
  run(PNPM, ['prod:init-db'])
  uploadDir(join(staging, 'prod-db'), dbDir, { exclude: dbExclude })
} else if (cfg.withDb && !has('--skip-pb')) {
  console.log('\n▶ 生成一致性备份并准备首次数据库（含演示数据，会覆盖服务器数据库）')
  run(PNPM, ['backup:pb'])
  const backupDir = join(ROOT, 'backups')
  const latest = readdirSync(backupDir).filter((f) => f.endsWith('.zip'))
    .map((f) => ({ f, t: statSync(join(backupDir, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0]?.f
  if (!latest) throw new Error('未找到备份 zip')
  const extractDir = join(staging, 'pb_data')
  mkdirSync(extractDir, { recursive: true })
  run('unzip', ['-o', join(backupDir, latest), '-d', extractDir])
  uploadDir(extractDir, dbDir, { exclude: dbExclude })
}

// ── 6. PM2 启动 / 重载（只动本项目两个进程）────────────────────
ssh(`set -e; cd ${shellQuote(cfg.path)} && pm2 startOrReload ecosystem.tongjia-talent.config.js --update-env >/dev/null && pm2 save >/dev/null && echo pm2-ok`)

// ── 7. nginx 子路径（宝塔 include 钩子）────────────────────────
if (!has('--skip-nginx') && cfg.nginxExtDir)
  ssh(`set -e; mkdir -p ${shellQuote(cfg.nginxExtDir)} && cp ${shellQuote(cfg.path + '/tongjia-talent.nginx.conf')} ${shellQuote(cfg.nginxExtDir + '/tongjia-talent.conf')} && nginx -t && nginx -s reload && echo nginx-ok`)

// ── 8. 探活 ───────────────────────────────────────────────────
ssh(`set -e; for i in $(seq 1 ${cfg.healthTimeoutSec}); do code=$(curl -s -o /tmp/tj-health.json -w '%{http_code}' 'http://127.0.0.1:${cfg.appPort}${appBase}api/health?deep=1'); if [ "$code" = "200" ]; then cat /tmp/tj-health.json; exit 0; fi; sleep 1; done; echo '应用未就绪，最近日志：'; pm2 logs tongjia-talent --lines 40 --nostream; exit 1`)
if (!has('--skip-public-check'))
  ssh(`set -e; app_code=$(curl -s -o /dev/null -w '%{http_code}' ${shellQuote(`${publicOrigin}${appBase}`)}); h5_code=$(curl -s -o /dev/null -w '%{http_code}' ${shellQuote(`${publicOrigin}${cfg.h5Base}/`)}); case "$app_code" in 2*|3*) ;; *) echo "公网 B 端探活失败：$app_code"; exit 1;; esac; [ "$h5_code" = "200" ] || { echo "公网 H5 探活失败：$h5_code"; exit 1; }; echo "public APP:$app_code public H5:$h5_code"`)
ssh(`set -e; if [ -d ${shellQuote(releasesRoot)} ]; then find ${shellQuote(releasesRoot)} -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\\n' | sort -nr | tail -n +$(( ${cfg.releaseKeep} + 1 )) | cut -d' ' -f2- | while IFS= read -r old; do [ -z "$old" ] || rm -rf -- "$old"; done; fi`)

// ── 9. 收尾：关闭复用的控制连接 ─────────────────────────────────
try { run(sshClient, [...sshClientPrefix, ...SSH_COMMON, '-O', 'exit', '-p', cfg.port, remote], { optional: true }) } catch { /* 控制连接不存在时忽略 */ }

console.log(`
✓ 部署完成
  发布标识   : ${releaseId}
  B 端管理台 : ${publicOrigin}${appBase}
  C 端 H5    : ${publicOrigin}${cfg.h5Base}/
  PocketBase : ${publicOrigin}${cfg.pbBase}/
  日志       : pm2 logs tongjia-talent / tongjia-talent-pb
`)
