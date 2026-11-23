/**
 * @description Foundation 单实例生产进程配置：唯一 Nuxt 服务和唯一 PocketBase。
 * @file ecosystem.config.cjs
 * @usage pnpm build && pm2 start ecosystem.config.cjs && pm2 save
 *
 * 说明：
 * - 两个进程物理分离：日常发版只 `pm2 reload foundation`，PocketBase 不重启。
 * - 只有升级 PocketBase 版本 / 改数据目录时才 `pm2 restart foundation-pocketbase`。
 * - 单实例边界：不要用 cluster 模式或起多份，定时同步与本地文件存储会冲突。
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = __dirname

// PM2 的日志文件需要目录存在；提前创建，避免首次部署启动失败。
fs.mkdirSync(path.join(ROOT, 'logs'), { recursive: true })

/** @param {string} filename 读取可选环境文件。 @returns {Record<string, string>} */
function loadEnv(filename) {
  const values = {}
  try {
    for (const raw of fs.readFileSync(path.join(ROOT, filename), 'utf8').split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const separator = line.indexOf('=')
      if (separator < 0) continue
      const key = line.slice(0, separator).trim()
      let value = line.slice(separator + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
        value = value.slice(1, -1)
      values[key] = value
    }
  } catch {
    // 首次部署可只通过 PM2 环境注入；缺省值由下方统一处理。
  }
  return values
}

const fileEnv = { ...loadEnv('.env'), ...loadEnv('.env.production') }
const pocketBaseUrl = fileEnv.POCKETBASE_URL || 'http://127.0.0.1:8090'
const pocketBaseDataDir = fileEnv.POCKETBASE_DATA_DIR || './pb_data'
const pocketBaseMigrationsDir = fileEnv.POCKETBASE_MIGRATIONS_DIR || './pocketbase/empty-migrations'
const pocketBaseHttp = pocketBaseUrl.replace(/^https?:\/\//, '')

module.exports = {
  apps: [
    {
      name: 'foundation-pocketbase',
      cwd: ROOT,
      // 优先使用 POCKETBASE_BINARY；默认查找仓库内 pocketbase/pocketbase。
      script: fileEnv.POCKETBASE_BINARY || process.env.POCKETBASE_BINARY || './pocketbase/pocketbase',
      // 历史 pb_migrations 不参与基础版运行；所有结构由 scripts/setup.mjs / 迁移脚本对齐。
      args: `serve --http ${pocketBaseHttp} --dir ${pocketBaseDataDir} --migrationsDir ${pocketBaseMigrationsDir} --automigrate=false`,
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      exp_backoff_restart_delay: 200,
      // 给 SQLite WAL 留出干净的落盘/退出时间。
      kill_timeout: 15000,
      max_memory_restart: '500M',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true,
      error_file: './logs/pocketbase-error.log',
      out_file: './logs/pocketbase-out.log',
    },
    {
      name: 'foundation',
      cwd: ROOT,
      script: './.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      exp_backoff_restart_delay: 200,
      kill_timeout: 10000,
      max_memory_restart: '600M',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true,
      error_file: './logs/app-error.log',
      out_file: './logs/app-out.log',
      env: {
        NODE_ENV: 'production',
        HOST: fileEnv.HOST || '127.0.0.1',
        PORT: fileEnv.PORT || '3000',
        POCKETBASE_URL: pocketBaseUrl,
        // 此地址必须可从浏览器访问；反向代理时可填写公开 HTTPS 地址或同域路径。
        NUXT_PUBLIC_POCKETBASE_URL: fileEnv.NUXT_PUBLIC_POCKETBASE_URL || pocketBaseUrl,
        POCKETBASE_PUBLIC_URL: fileEnv.POCKETBASE_PUBLIC_URL || pocketBaseUrl,
        NUXT_APP_BASE_URL: fileEnv.NUXT_APP_BASE_URL || '/',
        NUXT_PUBLIC_API_BASE_URL: fileEnv.NUXT_PUBLIC_API_BASE_URL || '',
        NUXT_PUBLIC_H5_BASE: fileEnv.NUXT_PUBLIC_H5_BASE || '',
        POCKETBASE_ADMIN_EMAIL: fileEnv.POCKETBASE_ADMIN_EMAIL || '',
        POCKETBASE_ADMIN_PASSWORD: fileEnv.POCKETBASE_ADMIN_PASSWORD || '',
        ENCRYPTION_KEY: fileEnv.ENCRYPTION_KEY || '',
        TALENT_REPORT_SYNC_URL: fileEnv.TALENT_REPORT_SYNC_URL || '',
        TALENT_REPORT_SYNC_TOKEN: fileEnv.TALENT_REPORT_SYNC_TOKEN || '',
        TALENT_REPORT_SYNC_INTERVAL_MS: fileEnv.TALENT_REPORT_SYNC_INTERVAL_MS || '300000',
        TALENT_REPORT_SYNC_SECRET: fileEnv.TALENT_REPORT_SYNC_SECRET || '',
        OSS_ENABLED: fileEnv.OSS_ENABLED || 'false',
        OSS_ENDPOINT: fileEnv.OSS_ENDPOINT || '',
        OSS_REGION: fileEnv.OSS_REGION || '',
        OSS_BUCKET: fileEnv.OSS_BUCKET || '',
        OSS_ACCESS_KEY_ID: fileEnv.OSS_ACCESS_KEY_ID || '',
        OSS_ACCESS_KEY_SECRET: fileEnv.OSS_ACCESS_KEY_SECRET || '',
        OSS_PUBLIC_BASE_URL: fileEnv.OSS_PUBLIC_BASE_URL || '',
      },
    },
  ],
}
