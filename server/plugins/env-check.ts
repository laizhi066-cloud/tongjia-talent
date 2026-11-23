/**
 * @description 启动时校验关键环境变量，缺失/用不安全默认值时 console.warn（仅提示，不中断启动）。
 *   pnpm dev 与生产 `node .output/server/index.mjs` 启动都会跑一次（Nitro 插件）。
 *   重点：POCKETBASE_PUBLIC_URL 缺失时文件 URL 回退用 POCKETBASE_URL，生产若是内网/容器地址 → C 端头像和品牌图片不可访问。
 * @file server/plugins/env-check.ts
 */
import { pbUrl } from '../utils/pb-env'
import { isOssEnabled } from '../utils/oss-config'
import { assertTalentExternalEnvFailFast } from '../utils/talent-external-adapter'

export default defineNitroPlugin(() => {
  const isProd = process.env.NODE_ENV === 'production'
  // M8：生产环境禁止 Mock 源、external 缺配置直接启动失败（仅 warn 不足以暴露配置错误）。
  assertTalentExternalEnvFailFast()
  const required: string[] = [] // 缺失会在运行时报错/无法鉴权
  const recommend: string[] = [] // 缺失可降级但有坑

  if (!process.env.ENCRYPTION_KEY) {
    required.push(
      'ENCRYPTION_KEY（敏感配置加密密钥）未设置\n'
      + '       作用：加密存储微信密钥。缺失时在后台保存微信配置会直接报错。\n'
      + '       怎么填：在 .env 写一行 ENCRYPTION_KEY=<至少 32 位随机字符串>（可用 `openssl rand -hex 32` 生成）。',
    )
  }
  if (!process.env.POCKETBASE_ADMIN_EMAIL || !process.env.POCKETBASE_ADMIN_PASSWORD) {
    required.push(
      'POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD（后端连数据库的管理员账号）未设置\n'
      + '       作用：后端要用超管身份连 PocketBase 才能读写数据。缺了几乎所有接口都会 500。\n'
      + '       怎么填：在 .env 填 PocketBase 超管的邮箱和密码（本地默认见 .env.example / .env）。',
    )
  }

  if (!process.env.POCKETBASE_URL) {
    recommend.push(
      'POCKETBASE_URL（数据库地址）未设置，已回退到 http://127.0.0.1:8090\n'
      + '       本地一般没事；部署时请填 PocketBase 实际地址。',
    )
  }

  if (process.env.TALENT_REPORT_SYNC_URL && !process.env.TALENT_REPORT_SYNC_SECRET)
    recommend.push('已配置 TALENT_REPORT_SYNC_URL，但未配置 TALENT_REPORT_SYNC_SECRET；第三方 webhook 将被拒绝。')
  if (isOssEnabled()) {
    if (!process.env.OSS_ACCESS_KEY_ID || !process.env.OSS_ACCESS_KEY_SECRET) {
      required.push(
        'OSS_ENABLED=true 但 OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET 未设置\n'
        + '       作用：报告生成后的 PDF 将上传到阿里云 OSS。\n'
        + '       怎么填：仅在服务端 .env 或部署密钥中配置，不能放到 VITE_*。',
      )
    }
  }
  if (!process.env.POCKETBASE_PUBLIC_URL) {
    const fallback = pbUrl()
    // 生产环境必须显式配置外网地址：缺失时回退地址若是内网/本机(127.0.0.1/localhost) → 浏览器无法加载文件。
    // fail-fast 启动失败，逼出配置错误，胜过线上静默裂图。
    const isInternalFallback = /(?:127\.0\.0\.1|localhost|\[::1\]|0\.0\.0\.0)/i.test(fallback)
    // 本地 dev:up 跑生产 .output(NODE_ENV=production)时 env.mjs 置 SHOP_LOCAL_RUN=1,127.0.0.1 本机可达 → 不 fail-fast;
    // 真实部署(pm2/deploy)不设此标记,生产缺 PUBLIC_URL 仍 fail-fast。
    if (isProd && isInternalFallback && process.env.SHOP_LOCAL_RUN !== '1') {
      throw new Error(
        `[env-check] 生产环境 POCKETBASE_PUBLIC_URL 未设置，回退地址 ${fallback} 是内网/本机地址，C 端头像和品牌图片将无法访问。\n`
        + '请在 .env 填用户浏览器能直接访问的公网地址，如 POCKETBASE_PUBLIC_URL=https://你的域名 后再启动。',
      )
    }
    recommend.push(
      `POCKETBASE_PUBLIC_URL（图片/文件的公网访问地址）未设置，已回退用 ${fallback}\n`
      + '       作用：C 端头像、站点 Logo 等文件链接都用它来拼。\n'
      + (isProd
        ? '       ⚠️ 当前是生产环境：如果上面这个回退地址是内网/容器地址（外网打不开），C 端文件将无法加载！\n'
          + '       怎么填：在 .env 填用户浏览器能直接访问的公网地址，如 POCKETBASE_PUBLIC_URL=https://你的域名'
        : '       本地开发用 127.0.0.1 即可，无需处理；部署到线上时务必设成公网地址。'),
    )
  }

  if (isProd && !process.env.LOGIN_LOCKOUT_HASH_SECRET) {
    recommend.push(
      '未单独配置 LOGIN_LOCKOUT_HASH_SECRET（登录防爆破身份摘要密钥）\n'
      + '       当前安全回退为 ENCRYPTION_KEY；生产建议使用独立随机密钥，降低密钥用途耦合。',
    )
  }

  if (!required.length && !recommend.length) return
  console.warn('\n⚠️  [env-check] 启动检查：以下环境变量需要注意')
  if (required.length) {
    console.warn('  ❌ 必须设置（不设会报错）：')
    for (const w of required) console.warn(`     • ${w}`)
  }
  if (recommend.length) {
    console.warn('  ⚠️ 建议设置（不设可运行，但有坑）：')
    for (const w of recommend) console.warn(`     • ${w}`)
  }
  console.warn('  ── 设置位置：项目根目录 .env 文件，或启动命令前的环境变量 ──\n')
})
