# 运维手册：部署、生产与迭代

面向**单实例**（一个 Nuxt 进程 + 一个 PocketBase）的部署与迭代 runbook。拓扑与边界见 [DEPLOYMENT.md](DEPLOYMENT.md)。

> 单实例硬边界：**不要**用 PM2 cluster 或起多份应用。定时同步、进程内写锁、本地文件存储都假设只有一个进程；多实例会重复同步、写冲突或文件不可见。需要扩容前，先把文件迁到 OSS、把定时任务外置。

## 0. 进程模型

| 进程 | 说明 | 何时重启 |
| --- | --- | --- |
| `foundation` / `tongjia-talent`（Nuxt node-server） | B 端 + Nitro API + 定时同步 | 每次发版：按部署方式 reload 对应名称 |
| `foundation-pocketbase` / `tongjia-talent-pb` | 唯一 PocketBase（SQLite） | 仅升级 PB 版本 / 改数据目录 / 改 schema |

日常迭代**只重载 Nuxt**，数据库进程保持运行，数据不受影响。

## 1. 环境要求

- Node.js ≥ 20.19，pnpm ≥ 10。
- PocketBase 二进制：放 `pocketbase/pocketbase`，或用环境变量 `POCKETBASE_BINARY` 指定绝对路径。
- 反向代理（Nginx / Caddy）负责 HTTPS；C 端 H5 静态站点。
- 进程守护：PM2（参考 [ecosystem.config.cjs](../ecosystem.config.cjs)）。

## 2. 首次部署

```bash
git clone <repo> && cd tongjia-talent
pnpm install
cp .env.example .env.production   # 按下面清单填写生产专用值
pnpm env:doctor                   # 检查 PB 二进制 / 数据目录 / 地址
pnpm env:setup                    # 仅全新空目录：建 schema、菜单、配置
pnpm accounts:seed                # （可选）建 superAdmin / 客户管理员账号
pnpm release                      # 构建 B 端 + C 端 H5 + 小程序
pm2 start ecosystem.config.cjs
pm2 save                          # 记住进程列表
pm2 startup                       # 按提示执行输出的命令，实现开机自启
```

**生产必填变量**（`.env.production`，均不入库）：

- `POCKETBASE_URL`：服务端访问 PB 的地址（内网即可）。
- `POCKETBASE_PUBLIC_URL` / `NUXT_PUBLIC_POCKETBASE_URL`：**浏览器可达的 HTTPS 地址**，否则启动会被 `env-check` 拒绝，且 C 端头像/图片打不开。
- `POCKETBASE_ADMIN_EMAIL` / `POCKETBASE_ADMIN_PASSWORD`：换成生产强口令。
- `ENCRYPTION_KEY`：**长期保存、不要随意轮换**；变更后已加密的微信配置无法解密。
- `HOST` / `PORT`、`NUXT_APP_BASE_URL`、`NUXT_PUBLIC_H5_BASE`。
- 报告用 OSS 时补 `OSS_ENABLED=true` 及 OSS 密钥；否则 `OSS_ENABLED=false` 走 PB 存储。

首次部署完成后按 [QUALITY.md](QUALITY.md) 的发布验收清单逐项确认。

## 3. 远程部署（一键发版）

仓库提供 `pnpm deploy:remote`，把本机构建的产物推送到服务器并接管 PM2 / nginx：

```bash
cp .deploy.env.example .deploy.env   # 填服务器地址、路径、端口与子路径
pnpm deploy:remote                   # 构建 + 上传 + 重启 + nginx + 探活
pnpm deploy:remote -- --dry-run      # 只检查目标、协议、数据库模式和认证方式
pnpm deploy:remote -- --no-build     # 只上传当前产物（第二次起常用）
pnpm deploy:remote -- --no-db        # 不传数据库（日常发版）
```

它做的事：

1. 本地 `node .output` 与 C 端 H5 构建（H5 base 与 API base 由 `.deploy.env` 推导）。
2. 用 **rsync over SSH（连接复用）** 上传 `.output`、H5、PM2 配置、nginx 片段；认证支持密码、私钥或 SSH agent。
3. 服务器上 `pm2 startOrReload` 只用本项目两个进程（`tongjia-talent` / `tongjia-talent-pb`），不动服务器上其它项目。
4. 用宝塔的 `extension/<host>/*.conf` include 钩子挂 nginx 子路径，`nginx -t` 通过后才 reload。
5. 探活 `GET <adminBase>/api/health?deep=1`。

本地文件与边界：

- `.deploy.env` 含服务器口令；公开仓库绝不提交，私有仓库是否纳入版本控制按组织策略决定，推荐改用 SSH 密钥。
- `.deploy-staging/` 为临时打包目录，已忽略。
- 服务器 `.deploy-releases/` 保存最近发布快照，代码/H5 上传完成后才切换当前目录；快照数量由 `DEPLOY_RELEASE_KEEP` 控制。
- 服务器上目录结构：`<DEPLOY_PATH>/{server,h5,pb,logs}`，数据库在 `pb/pb_data`。
- 端口与子路径都在 `.deploy.env` 里，避开服务器已有端口即可。
- **默认永远不传数据库**：`DEPLOY_WITH_DB=false`。全新生产库使用 `--init-db`；已有库会被安全门禁拒绝，只有显式 `--force-init-db` / `--force-db-replace` 才会先停 PB 并保留旧 `pb_data` 后覆盖。
- 生产必须把 `DEPLOY_ENV=production` 与 `DEPLOY_PUBLIC_SCHEME=https` 一起设置；脚本会用该协议生成 B/C/PocketBase 公开地址并执行公网探活，生产模式拒绝 HTTP。
- 生成的 PM2 配置含运行时密钥，服务器权限自动收紧到 `600`；本地 `.deploy-staging/` 发布结束或失败都会自动清理。

## 4. 日常迭代发布（不重启数据库）

```bash
cd tongjia-talent
git pull
pnpm install            # 仅当依赖或 lockfile 变化
pnpm backup:pb          # 目标 PB 在本机时留一份；远端生产库需在服务器环境备份
pnpm deploy:remote -- --no-db
```

- 发版**不要**执行 `pnpm env:setup` / `pnpm talent:seed`（前者拒绝旧库，后者会清空天赋数据）。
- 只改 C 端时：`pnpm deploy:remote -- --no-db` 仍会复用同一套公开路径和 nginx 探活；若已构建，可加 `--no-build`。
- 手工 PM2 配置使用 `foundation` 名称；远程脚本生成的配置使用 `tongjia-talent` 名称，不要混用两个进程名。
- HTTP 反代下 `pm2 reload` 对 fork 模式是约 1 秒的滚动重启；要完全无感需在反代层做双实例 + 健康检查，这超出单实例边界。

## 5. 数据 / Schema 变更

1. 先在**目标生产 PB 所在环境**执行等价一致性备份；本机 `pnpm backup:pb` 只备份当前 `POCKETBASE_URL`。
2. 新库用 `pnpm env:setup`；**存量库**写幂等迁移脚本（参考 `scripts/sync-talent.mjs`：`createCollection` / `installFields` / `installRelations` / `ensureIndex` 可复用），在旧库上执行。
3. 远程环境执行 `pnpm deploy:remote -- --no-db`；手工 PM2 环境执行 `pm2 reload foundation` 让新代码生效。
4. 抽查 `GET /api/health?deep=1`、B 端“系统健康”、受影响的业务页。

绝不能在已有业务库上跑 `env:setup`（会直接失败），也不能在生产跑 `talent:seed`（已加 `NODE_ENV=production` 硬拦截）。

## 6. 回滚

```bash
git fetch --tags && git checkout <上一个稳定 tag>
pnpm install
pnpm deploy:remote -- --no-db
```

- 只回滚代码时，数据不回滚；若本次发版伴随 schema 变更，回滚前评估兼容性，必要时用最近备份恢复（见第 8 节（备份与恢复））。
- 保留每次发版的 tag 与备份，便于对照。

## 7. PocketBase 升级

```bash
pnpm backup:pb                        # 1. 先备份
pm2 stop foundation-pocketbase        # 2. 停库（此时 B/C 端会报连接失败）
# 3. 替换 pocketbase/pocketbase 二进制
pm2 start foundation-pocketbase       # 4. 启动新版本
curl -s http://127.0.0.1:3000/api/health?deep=1   # 5. 探活 + B 端“系统健康”
```

出问题时在 PocketBase 后台 → Settings → Backups → Restore 回滚。

## 8. 备份与恢复

- 每日定时：在服务器目标 PB 所在环境执行 `0 3 * * * cd /path/to/tongjia-talent && /usr/bin/pnpm backup:pb >> logs/backup.log 2>&1`
- `backups/` 只是本地副本，务必再同步到异地 / 对象存储；PocketBase 自带自动备份可并行开启。
- 恢复：PB 后台 Restore，或 `pb.backups.restore(key)`；恢复前先手动备份当前库。
- 定期做一次**恢复演练**（在隔离环境验证备份可用），只备份不演练不算完成。

## 9. 进程崩溃 / 服务器重启

- 崩溃：PM2 `autorestart` 自动拉起；连续失败达到 `max_restarts`(10) 会停在 `errored`，需要 `pm2 restart foundation` 并先看日志。
- 服务器重启：`pm2 startup` + `pm2 save` 后自动恢复；手动恢复用 `pm2 resurrect`。
- 数据库进程异常退出不影响数据文件，重启即恢复（SQLite WAL）。

## 10. 日志与监控

- 应用日志：`pm2 logs foundation`，文件在 `logs/app-*.log`；PB 在 `logs/pocketbase-*.log`。目录由 `ecosystem.config.cjs` 自动创建，已 gitignore。
- 业务日志：后台“登录日志 / 操作日志 / 错误监控”。
- 日志轮转：`pm2 install pm2-logrotate`（或系统 logrotate），避免磁盘被占满。
- 探活：
  - 应用存活：`GET /api/health`
  - 应用 + 数据库：`GET /api/health?deep=1`（`status: degraded` 表示 PB 不可达）
  - PocketBase：`GET ${POCKETBASE_URL}/api/health`
- 建议对上述探活配告警，并对磁盘、PB 数据目录大小设阈值。

## 11. 密钥与安全

- 生产专用 `POCKETBASE_ADMIN_PASSWORD`、`ENCRYPTION_KEY`；`.env*` 权限设为 `600`，不入库、不进镜像层。
- `ENCRYPTION_KEY` 一旦轮换，历史加密的微信配置将无法解密：轮换前先记录/重填微信配置。
- 修改预置账号（`superAdmin` / 客户管理员）的默认口令；对外只交付客户管理员账号。
- 浏览器只暴露 `POCKETBASE_PUBLIC_URL` / `NUXT_PUBLIC_*`；`POCKETBASE_ADMIN_PASSWORD`、`ENCRYPTION_KEY`、OSS/微信密钥只存在服务端。

## 12. 常见故障排查

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| `pnpm start` 启动即退出，报 `env-check` 内网地址 | `POCKETBASE_PUBLIC_URL` 还是 `127.0.0.1` | 换成公网 HTTPS 地址后重启 |
| C 端头像 / 报告图片打不开 | `POCKETBASE_PUBLIC_URL` / `NUXT_PUBLIC_POCKETBASE_URL` 不可浏览器访问 | 改为用户可达地址，检查反代与文件域名白名单 |
| C 端登录/接口 404 或跨域 | `VITE_SERVER_BASEURL`、反代前缀、CORS 不一致 | 核对构建变量与反代规则，重新 `client:build:*` |
| 小程序请求被拒 | 微信合法请求域名未配置或用了 `/` 相对地址 | 在微信平台配 HTTPS 域名，生产用 `VITE_SERVER_BASEURL__WEIXIN_*` |
| 报告 PDF 打不开 | `OSS_ENABLED` 与 OSS 配置不匹配，或权限代理判定报告已撤回/授权失效 | 关闭时检查 PocketBase `uploads` 文件；开启时核对密钥和私有 bucket；不要把对象改成公开读 |
| C 端看不到「查看 PDF」 | 该报告没有 PDF 源或尚未开放全部分册 | 第三方回传未带 `pdfUrl` 时，在管理端「报告列表 → 上传 PDF」手动补充；代理会重新校验发布和授权 |
| 时间显示差几小时 | 服务器时区与业务时区不一致 | 业务时间已固定 UTC+8 展示，服务器时区不影响；若仍不符先查系统时钟 |
| PocketBase 报 database is locked | 并发写或有多份进程/脚本同时写库 | 确认只有一个 PB 进程；不要在运行中直接复制数据目录 |
| 磁盘被写满 | `logs/`、`backups/`、`pb_data/backups`、上传文件增长 | 配日志轮转、备份保留策略；上传文件迁 OSS |
| 定时同步重复执行 / 文件互不可见 | 起了多实例 | 回到单实例，或先把定时任务与文件存储外置 |

## 13. 扩缩边界

- 单实例是当前交付口径：支持的文件存储、进程内锁、定时同步都基于单进程。
- 需要扩容时的前置改造：报告与上传文件迁 OSS；定时同步改为外部调度（cron / 队列）并加分布式锁；反代层多实例 + 健康检查；PB 仍是单实例。

相关文档：[DEPLOYMENT.md](DEPLOYMENT.md)、[QUALITY.md](QUALITY.md)、[SCRIPT-GUIDE.md](SCRIPT-GUIDE.md)。
