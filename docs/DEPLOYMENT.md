# 本地开发与单实例部署

本仓库是单实例、单 PocketBase 基础版：Nuxt 服务端始终连接一个 `POCKETBASE_URL`，浏览器文件链接始终使用一个公开 PB 地址。没有站点切换、控制 PB、交付档位或自动化多站点发布流程。

生产部署应保持以下拓扑，所有用户和文件请求都落到同一个应用与数据源：

```text
B 端浏览器 ─┐
C 端 H5 / 小程序 ─> 反向代理 / 静态站点 ─> Nuxt node-server ─> 唯一 PocketBase
文件 URL ─────────────────────────────────────> 唯一公开 PocketBase 地址
```

本指南说明应用侧的环境契约，不提供云账号、反向代理、进程守护、备份或发布器的自动化脚本。部署系统可以自行选择 Nginx、Caddy、PM2、systemd 或容器，但不能改变上述单实例边界。

## 首次本地启动

先安装依赖并创建本机运行时文件。`env:setup` 不会复制 `.env`，也不会安装依赖，更不会下载 PocketBase：仓库不含二进制，需先放到 `pocketbase/pocketbase` 或设 `POCKETBASE_BINARY`（见 [QUICK-START.md](QUICK-START.md#准备-pocketbase-二进制)）。

```bash
pnpm install
cp .env.example .env
# 编辑 .env，至少替换 POCKETBASE_ADMIN_EMAIL、POCKETBASE_ADMIN_PASSWORD、ENCRYPTION_KEY
pnpm env:doctor
pnpm env:setup
```

`pnpm env:setup` 只可用于新的基础版 PocketBase 数据目录：它会在没有正在运行的 PB 时临时启动一个实例、创建基础 schema 和初始后台账户，完成后停止该临时实例。

默认数据目录是仓库根目录的 `pb_data/`，默认地址是 `http://127.0.0.1:8090`。若需要独立的新库，在初始化与之后启动 PB 的同一环境中设置目录，例如：

```bash
export POCKETBASE_DATA_DIR="$PWD/pb_data_foundation"
pnpm env:setup
pnpm pb
```

初始化会拒绝包含旧业务集合的数据目录，不会迁移、删除或清理既有 `pb_data`。若 `POCKETBASE_URL` 已有别的 PB 实例在运行，先确认它就是目标新库；否则停止该实例或为新库改用其他地址和端口。

## 日常开发

分别在终端启动基础设施与应用：

```bash
# 终端 1：唯一 PocketBase，前台运行
pnpm pb

# 终端 2：B 端管理台与 Nitro API
pnpm dev

# 终端 3（按需）：C 端微信小程序开发
pnpm client:dev
```

Nuxt 默认访问地址为 `http://127.0.0.1:3000`，PocketBase 默认地址为 `http://127.0.0.1:8090`。始终使用 `127.0.0.1`，不要使用 `localhost`。

也可以用一条命令同时拉起三者（适合演示）：

```bash
pnpm dev:all            # PocketBase + Nuxt + C 端 H5
pnpm dev:all pb nuxt    # 只启动其中几个
```

每条日志都带 `[pb]` / `[nuxt]` / `[h5]` 前缀，Ctrl+C 会一起退出。

`pnpm client:dev` 对应微信小程序开发。需要 C 端 H5 开发时，在 `apps/client` 运行：

```bash
pnpm dev:h5
```

C 端接口地址来自 `apps/client/env/` 下当前 mode 的 `VITE_SERVER_BASEURL`；本地应指向 Nuxt 的 `http://127.0.0.1:3000`。

## 运行时变量

根目录 `.env` 用于本地运行，`.env.production` 用于生产运行时。生产构建会按“命令行环境变量 → `.env.production` → `.env`”的优先级合并变量。

| 变量 | 用途 |
| --- | --- |
| `POCKETBASE_URL` | Nuxt 服务端访问的唯一 PocketBase 地址。 |
| `NUXT_PUBLIC_POCKETBASE_URL` | B/C 浏览器访问 PocketBase 的公开地址。 |
| `POCKETBASE_PUBLIC_URL` | 服务器生成文件 URL 时使用的公开前缀；未设置时回退 `POCKETBASE_URL`。 |
| `POCKETBASE_ADMIN_EMAIL` / `POCKETBASE_ADMIN_PASSWORD` | PB 超管凭据，同时用于首次初始化的后台账户。 |
| `ENCRYPTION_KEY` | 加密后台保存的微信 AppSecret，并派生已注销认证身份的 HMAC 标记；生产环境必须安全保存且不可随意轮换。 |
| `HOST` / `PORT` | Nuxt node-server 监听地址和端口。 |
| `NUXT_APP_BASE_URL` | 管理台部署路径，默认 `/`。 |
| `NUXT_PUBLIC_API_BASE_URL` | 浏览器 API 基础地址；同域部署可留空。 |
| `NUXT_PUBLIC_H5_BASE` | C 端 H5 的公开入口地址。 |
| `POCKETBASE_DATA_DIR` | `pnpm pb` 与 `pnpm env:setup` 使用的 PB 数据目录；适合显式指定新库位置。 |
| `POCKETBASE_BINARY` | 可选的 PocketBase 二进制绝对路径；默认查找 `pocketbase/pocketbase`。 |
| `POCKETBASE_MIGRATIONS_DIR` | `pnpm pb` / `env:setup` 使用的空迁移目录；通常无需设置。默认目录可含仅用于 Git 保留目录的 `.gitkeep`，显式设置时除此之外必须为空；脚本会拒绝真实迁移文件且不会删除其中内容。 |
| `OSS_ENABLED` | 报告 PDF 是否上传阿里云 OSS；`false` 时保存到当前 PocketBase 的 `uploads` 集合。 |
| `TALENT_AI_BASE_URL` | 天赋培养计划 AI 建议服务端点；留空则关闭 AI 建议。 |
| `TALENT_AI_API_KEY` | 天赋 AI 服务端密钥，只放服务端环境变量，不得提交或下发浏览器。 |
| `TALENT_AI_MODEL` | AI 模型名，默认 `deepseek-chat`。 |
| `TALENT_AI_PROTOCOL` | `anthropic` 或 `openai` 兼容请求格式，默认 `anthropic`。 |
| `TALENT_PLAN_RECOMMENDATION_LIMIT` | C 端培养计划推荐返回条数上限，默认 `3`；只影响展示条数，不改变匹配规则。 |
| `DEPLOY_PUBLIC_SCHEME` | 远程部署公开地址协议；测试可用 `http`，生产必须使用 `https`。 |
| `DEPLOY_ENV` | `staging` 或 `production`；生产模式会强制要求 `DEPLOY_PUBLIC_SCHEME=https`。 |
| `DEPLOY_SSH_KEY` | 可选的 SSH 私钥路径；未配置密码时使用该私钥或本机 SSH agent。 |
| `DEPLOY_NODE_OPTIONS` | 本机构建 Node 参数，默认 `--max-old-space-size=4096`，用于避免 H5 构建被系统终止。 |
| `DEPLOY_RELEASE_KEEP` | 远程服务器保留的发布快照数量，默认 3，范围 2-10。 |
| `OSS_ENDPOINT` / `OSS_REGION` / `OSS_BUCKET` | OSS 服务端连接配置，默认对应 `oss-cn-shenzhen.aliyuncs.com`、`cn-shenzhen`、`zhihuitongjia2026`。 |
| `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET` | OSS 服务端密钥，仅 Nuxt 运行时使用，不能放入 `VITE_*` 或提交到 Git。 |
| `OSS_PUBLIC_BASE_URL` | 兼容旧配置的公开前缀；报告 PDF 不再使用公开直链，留空即可。 |

`NUXT_PUBLIC_POCKETBASE_URL` 与 `POCKETBASE_PUBLIC_URL` 必须是浏览器可访问的地址，不能填写仅服务器可访问的内网地址。单实例不需要也不支持 `TENANT_MODE`、`CONTROL_PB_URL`、`DEFAULT_SITE`、`APP_EDITION`、`BUILD_PROFILE`、站点 cookie 或 `X-Site-Slug`。

报告 PDF 存储由 `OSS_ENABLED` 控制。开启后，必须同时提供 OSS 密钥和 `ENCRYPTION_KEY`，并将 OSS bucket 保持私有；新上传 PDF 会先加密再保存，关闭时保存到 PocketBase `uploads`，该 `purpose=talent-report-pdf` 文件同样禁止直链访问。B/C/机构端只访问 Nuxt 权限代理，代理每次按报告发布、分册、会员授权、机构和角色状态重新判权。

### C 端构建变量

`apps/client/env/` 下的 `VITE_*` 变量与根 `.env` 是两套边界：前者在 H5 / 小程序构建时公开注入，后者仅供 Nuxt、PocketBase 和服务端脚本使用。不要把任何密钥复制到 `VITE_*`。

生产至少核对：

- `VITE_SERVER_BASEURL` 默认是 `/`，能从 C 端访问并正确承载 `/api/client/*`；若改用自定义反代前缀，反代规则应将它转发到 Nuxt 的 API 路由。
- `VITE_APP_PUBLIC_BASE` 默认是 `/`；仅在 H5 部署到子路径时改为如 `/portal/` 的前后均带 `/` 值，并让静态服务器和 OAuth 回调页保持一致。
- `VITE_WX_APPID` 与 B 端保存的小程序 AppID / AppSecret 属于同一个小程序；小程序合法请求域名配置为实际 HTTPS 域名。

变量详情和本地调试说明见 [CLIENT-PORTAL.md](CLIENT-PORTAL.md#环境配置)。

## 构建与运行

先在目标环境写好 `.env.production` 或导出等价变量，再构建：

```bash
pnpm fonts:fetch   # PDF 中文字体不入库（约 16MB）；缺失时 PDF 会报字体不可用并回落系统字体
pnpm build
pnpm client:build:h5
pnpm client:build:mp
```

Nuxt 使用 node-server preset，构建产物在 `.output/`，可由进程管理器以相同运行时变量启动：

```bash
node .output/server/index.mjs
```

C 端 H5 与微信小程序由 uni-app 分别构建；产物位于 `apps/client/dist/build/h5/` 与 `apps/client/dist/build/mp-weixin/`。部署时将 H5 静态产物发布到其公开站点，并在微信开发者工具中导入小程序产物。

仓库提供 `pnpm deploy:remote` 作为单实例远程发布入口，读取本机 `.deploy.env`，通过 rsync over SSH 上传 Nuxt/H5 产物、PM2 配置和 nginx 片段，并在服务器上执行 PM2 重载与探活。反向代理、进程守护、备份和发布到目标服务器仍必须保持同一个 Nuxt 实例与同一个 PocketBase 实例。

常用命令：

```bash
pnpm deploy:remote -- --dry-run             # 只检查目标和发布模式，不连接服务器
pnpm deploy:remote -- --no-db               # 构建并发布代码，不触碰线上数据库
pnpm deploy:remote -- --no-build --no-db    # 复用已有产物，最快迭代
pnpm deploy:remote -- --init-db             # 全新生产库首次部署；目标库已有数据时会拒绝
pnpm deploy:remote -- --force-init-db       # 明确覆盖已有库，并先把旧 pb_data 改名保留
```

默认数据库模式是 `no-db`。`--with-db` 仅用于测试演示库恢复；已有数据库必须额外使用 `--force-db-replace`，生产日常发布禁止带库。
只有服务器无法访问自己的公网域名时才允许临时使用 `--skip-public-check`；生产发布应修复 DNS/HTTPS/反向代理后再发版。

代码与 H5 会先上传到服务器的 `.deploy-releases/<releaseId>/`，探活成功后才切换到 `server/` 与 `h5/`；服务器默认保留最近 3 个快照（由 `DEPLOY_RELEASE_KEEP` 控制），避免 rsync 中断直接破坏当前运行目录。

### PM2 参考配置

仓库提供 [ecosystem.config.cjs](../ecosystem.config.cjs) 作为单实例 PM2 配置：它启动一个 `foundation-pocketbase` 和一个 `foundation` Nuxt 进程，均为单进程 fork 模式。构建并准备好根目录 `.env` / `.env.production` 后可执行：

```bash
pnpm build
pm2 start ecosystem.config.cjs
```

该参考配置的 PocketBase 进程固定使用仓库根目录 `./pb_data` 和 `./pocketbase/empty-migrations`，因此它只适用于已在该目录完成基础初始化的部署目标。远程脚本会生成独立的 `ecosystem.tongjia-talent.config.js`，使用 `tongjia-talent` / `tongjia-talent-pb` 两个进程名。若生产数据目录或端口不同，应先审查并在部署系统中显式调整配置；不能让 Nuxt 与 PM2 中的 PocketBase 指向不同目录或地址。PM2 本身不替代反向代理、备份、密钥管理和发布回滚。

## 运行日志

- **B 端 / Nuxt**：进程的 stdout / stderr。PM2 模式下写到 `logs/app-out.log` 与 `logs/app-error.log`（目录由 `ecosystem.config.cjs` 自动创建）。
- **PocketBase**：进程输出写到 `logs/pocketbase-out.log` / `logs/pocketbase-error.log`；PocketBase 自身的请求与审计日志在设置页和 `pb_data/` 内维护。
- **业务日志**：登录 / 操作 / 错误记录在后台「登录日志 / 操作日志 / 错误监控」可查，不依赖文件日志。
- `logs/` 已在 `.gitignore` 中，不会入库；轮转与保留策略由部署环境的日志系统负责。

## PocketBase 生命周期与数据安全

**启动方式**

- 本地：`pnpm pb` 单独启动；`pnpm dev:all` 会把 PB、Nuxt、H5 一起拉起；`pnpm dev` **不会**启动 PB。
- 生产：`ecosystem.config.cjs` 里是两个独立进程 `foundation-pocketbase` 和 `foundation`。

**迭代 / 发版时 PB 会不会被重启**

- 只重启 Nuxt：`pm2 restart foundation` → PocketBase 不受影响。日常前端 / API 迭代用这个。
- 只有升级 PocketBase 版本、改数据目录或改 schema 时才重启 `pm2 restart foundation-pocketbase`；普通发版**不需要** `pm2 restart all`。
- PB 重启本身是安全的（SQLite WAL），秒级恢复；但没必要每次发版都重启。

**数据会不会被覆盖**

- 不会。数据存放在 `POCKETBASE_DATA_DIR`（默认 `pb_data/`），进程重启、发版都不会写入或清空数据。
- 只有两个命令会动数据：
  - `pnpm env:setup`：只在**全新空目录**建库；目标目录已有业务数据时直接失败，不会迁移或清理。
  - `pnpm talent:seed`：会**清空天赋业务数据**。已加硬拦截：`NODE_ENV=production` 时拒绝运行、必须显式 `TALENT_SEED_CONFIRM=mock`、只允许连接 `127.0.0.1`。生产环境绝不执行。
- 生产 schema 变更请用迁移类脚本（如 `pnpm talent:sync`）或手工在 PB 后台调整，不要用 `env:setup` / `talent:seed`。

## 备份与恢复

- `pnpm backup:pb`：让 PocketBase 生成一次一致性备份，下载到仓库 `backups/`（已 gitignore），本地只保留最近 N 份（`--keep=14` 可调）。
- 定时任务示例：

  ```cron
  0 3 * * * cd /path/to/tongjia-talent && /usr/bin/pnpm backup:pb >> logs/backup.log 2>&1
  ```

- 建议同时把 `backups/` 定期复制到异地 / 对象存储；PocketBase 自带「设置 → Backups」也能配置自动备份，两者可并行。
- 恢复：PocketBase 后台 → Settings → Backups → Restore，或调用 `pb.backups.restore(key)`；恢复前先手动备份当前库。
- 不要在运行中的 SQLite 数据目录上直接复制文件作为唯一备份。

## 上线前运行要求

- 为 PocketBase 数据目录建立部署环境自己的、可恢复的备份与演练流程；不要在运行中的 SQLite 数据目录上直接复制文件作为唯一备份方案。
- 仅将 `POCKETBASE_PUBLIC_URL`、C 端 API 基地址和 H5 静态地址暴露给浏览器。`POCKETBASE_ADMIN_PASSWORD`、`ENCRYPTION_KEY` 和微信 AppSecret 只存在于受控服务端环境。
- 首次启动和每次变量变更后检查 Nuxt 的环境告警、B 端“系统健康”、上传文件 URL 和 C 端公开站点配置。
- 运行 `node .output/server/index.mjs` 时提供与构建目标一致的运行时变量；构建时读取 `.env.production` 不等于运行进程会自动拥有这些环境变量。

## 验证

```bash
pnpm test
pnpm typecheck
pnpm client:typecheck
pnpm build
pnpm client:build:h5
pnpm client:build:mp
```

提交前的轻量检查可使用 `pnpm qa`（仅 Nuxt 类型检查和 ESLint）。完整命令说明见 [SCRIPT-GUIDE.md](SCRIPT-GUIDE.md)。

交付前的权限、主题、C 端、文档与仓库卫生检查见 [QUALITY.md](QUALITY.md)。
