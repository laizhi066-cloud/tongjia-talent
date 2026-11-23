# 生产环境首次部署指引（全新服务器）

面向**一台全新的 Linux 服务器**，从零到上线的最小可执行步骤。生产是干净环境：**不携带任何演示数据**，数据库只包含基础 schema、菜单、站点配置和账号。

单实例边界：一个 Nuxt 进程 + 一个 PocketBase + nginx。不要用 PM2 cluster 或多实例（定时同步、进程内锁、本地文件存储都假设单进程）。

## 0. 选型与端口

| 项 | 建议 | 说明 |
| --- | --- | --- |
| 系统 | Linux x86_64，2C4G 起 | PocketBase 二进制按平台下载（linux_amd64） |
| Node | 20.19+ | `node -v` 校验 |
| 进程守护 | PM2 | 参考 `ecosystem.config.cjs` |
| 反向代理 | nginx | 负责 HTTPS 与子路径/域名 |
| 端口 | 应用 3000 起、PB 8090 起 | 避开服务器已占用端口 |

## 1. 服务器系统准备（一次性）

```bash
# Node 20 + pnpm + PM2（示例：用 nvm 或系统包管理器均可）
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs   # Debian/Ubuntu
corepack enable && corepack prepare pnpm@10 --activate
npm i -g pm2
# 其它依赖
apt-get install -y nginx rsync unzip git        # Debian/Ubuntu；CentOS/Alinux 用 yum/dnf
```

- 放行 80/443（云安全组 + 系统防火墙）。
- 准备域名并解析到服务器 IP；用 certbot 或宝塔申请 HTTPS 证书。
- 准备 `logs/`、数据目录、备份目录的磁盘空间（见第 7 节）。

## 2. 配置生产环境变量

在**本地**仓库根目录创建 `.env.production`（不入库），至少包含：

| 变量 | 生产要求 |
| --- | --- |
| `POCKETBASE_ADMIN_EMAIL` / `POCKETBASE_ADMIN_PASSWORD` | **生产专用强口令**；同时是数据库超管与初始后台账户 |
| `ENCRYPTION_KEY` | 64 位随机串；**长期保存、不要轮换**（轮换后已加密的微信配置无法解密） |
| `POCKETBASE_PUBLIC_URL` / `NUXT_PUBLIC_POCKETBASE_URL` | **浏览器可达的 HTTPS 地址**；否则 `env-check` 拒绝启动、C 端图片打不开 |
| `OSS_ENABLED` 及 OSS 密钥 | 报告用 OSS 时填写；否则 `false` 走 PocketBase 存储 |
| `TALENT_REPORT_SYNC_*` | 接第三方结果同步时填写 |
| `TALENT_AI_*` | 可选的 AI 建议服务；只生成草稿，必须人工确认，不得自动发布 |

- `.env`（开发）与 `.env.production`（生产）会按“命令行 → `.env.production` → `.env`”合并，生产值写 `.env.production` 即可覆盖开发值。
- **绝不**把 `.env*` 提交到 Git，也不写进镜像层。服务器权限建议 `chmod 600`。

## 3. 初始化生产数据库（全新）

生产库**只含 schema / 菜单 / 站点配置 / 账号，不含演示数据**。两种方式，推荐 A：

### A. 本地生成干净库 → 随部署上传（推荐）

```bash
# 先在 .env.production 里填好生产账号与 ENCRYPTION_KEY
pnpm prod:init-db                 # 生成 .deploy-staging/prod-db（约 1MB，无演示数据）
pnpm deploy:remote -- --init-db   # 首次部署：上传干净库并启动
```

`prod:init-db` 会用全新临时目录跑基础初始化（`scripts/setup.mjs` 同款），并创建 `superAdmin` / 客户管理员账号；需要覆盖默认口令时用环境变量：

```bash
SUPERADMIN_PASSWORD='强口令' CUSTOMER_ADMIN_PASSWORD='强口令' pnpm prod:init-db
```

### B. 在服务器上原生初始化（不依赖本地产物）

适合“服务器才能访问生产 PB”的场景：把仓库（或至少 `scripts/` 与 `node_modules/pocketbase`）放到服务器，用服务器自带的 Node 运行：

```bash
cd /www/wwwroot/tongjia-talent/tools
POCKETBASE_DATA_DIR=/www/wwwroot/tongjia-talent/pb/pb_data \
POCKETBASE_URL=http://127.0.0.1:8090 \
POCKETBASE_BINARY=/www/wwwroot/tongjia-talent/pb/pocketbase \
POCKETBASE_ADMIN_EMAIL=... POCKETBASE_ADMIN_PASSWORD=... ENCRYPTION_KEY=... \
node scripts/setup.mjs            # 仅新库；旧库会拒绝
```

两种方式产出的库结构一致，选一种即可。

## 4. 首次部署

在本地：

```bash
cp .deploy.env.example .deploy.env   # 填生产服务器 IP/用户/口令/路径/端口/子路径
# 生产必须将 DEPLOY_ENV=production、DEPLOY_PUBLIC_SCHEME=https，并使用域名而不是裸 IP
pnpm deploy:remote -- --init-db      # 构建 → 上传 → PB + Nuxt 启动 → nginx 挂子路径 → 探活
```

`deploy:remote` 会：

1. 本地构建 B 端（`.output`，含运行时依赖，服务器无需 `pnpm install`）与 C 端 H5。
2. 用 rsync（连接复用）上传产物、H5、PM2 配置、nginx 片段，以及**干净生产库**。
3. 服务器上 `pm2 startOrReload` 只启动本项目两个进程（`tongjia-talent` / `tongjia-talent-pb`）。
4. 用宝塔 `extension/<host>/*.conf` 或 nginx 配置挂子路径，`nginx -t` 通过后才 reload。
5. 探活 `GET <adminBase>/api/health?deep=1`。

> PDF 字体：仓库不带 16MB 中文字体，`deploy:remote` 只上传 `.output`。服务器首次上线前需安装 Noto CJK（如 `fonts-noto-cjk`）或用 `TALENT_PDF_FONT_PATH` 指向可用 TTF/OTF，否则分册 PDF 渲染会明确报「字体不可用」；本地开发执行 `pnpm fonts:fetch` 即可。

上线后按 [QUALITY.md](QUALITY.md) 的发布验收清单逐项确认。

## 5. 日常迭代发版

```bash
pnpm deploy:remote -- --no-db          # 重新构建 + 上传 + 只重载 Nuxt（不动数据库）
pnpm deploy:remote -- --no-build --no-db   # 复用已构建产物，最快
pnpm deploy:remote -- --dry-run       # 发版前检查目标、HTTPS、SSH 和数据库模式
```

- 只重载 `foundation`/`tongjia-talent`，PocketBase 不重启、数据不变。
- 改 C 端时只跑 `pnpm client:build:h5` 后重新上传 H5 即可。
- 需要改 schema 时，先写幂等迁移脚本、备份后再执行（见 [OPERATIONS.md](OPERATIONS.md) 第 5 节）。

## 6. 账号与权限

| 账号 | 角色 | 可见范围 | 面向 |
| --- | --- | --- | --- |
| `superAdmin` | 超级管理员 | 全部菜单与接口（含系统管理、运行监控、日志） | 开发 / 运维，内部使用 |
| 客户管理员（默认用户名 `admin`） | 客户管理员 | 仅会员管理与天赋业务；系统 / 监控 / 日志不可见 | 交付给客户 |

- 默认口令是弱口令；生产务必用 `SUPERADMIN_PASSWORD` / `CUSTOMER_ADMIN_PASSWORD` 覆盖后再 `pnpm prod:init-db`。
- 交付前把客户管理员账号口令告知客户，并要求首次登录后修改；`superAdmin` 不对客户开放。
- 首次上线后，可在「用户管理」里给客户创建更细的角色与账号。

## 7. 备份与监控（上线必做）

- 定时备份：在**服务器目标 PB 所在环境**执行 `0 3 * * * cd /path/to/repo && /usr/bin/pnpm backup:pb >> logs/backup.log 2>&1`；`backups/` 再同步到异地/对象存储。开发机执行的 `pnpm backup:pb` 只备份开发机当前 `POCKETBASE_URL`。
- 探活告警：`GET /api/health`（应用）、`GET /api/health?deep=1`（含数据库）、`GET <POCKETBASE_URL>/api/health`。
- 日志：PM2 的 `logs/app-*.log` / `logs/pocketbase-*.log`，配 `pm2-logrotate`。
- 进程守护：`pm2 start ecosystem.config.cjs && pm2 save && pm2 startup`（重启自动拉起）。
- 详细 runbook 见 [OPERATIONS.md](OPERATIONS.md)。

## 8. 上线检查清单（精简）

- [ ] 生产 `.env.production` 已填，`POCKETBASE_PUBLIC_URL` 是公网 HTTPS。
- [ ] `.deploy.env` 的 `DEPLOY_PUBLIC_SCHEME=https`，`DEPLOY_WITH_DB=false`，SSH 使用私钥或受控口令。
- [ ] `ENCRYPTION_KEY` 已生成并妥善保存。
- [ ] 生产库干净（无演示会员/报告），账号口令已改为强口令。
- [ ] `pnpm deploy:remote -- --init-db` 成功，健康检查 200。
- [ ] 域名 HTTPS 可访问，C 端 H5 能登录并查看报告。
- [ ] 微信小程序 AppID/AppSecret、合法域名、OAuth 回调在目标环境配好。
- [ ] 定时备份 + 异地存储 + 一次恢复演练。
- [ ] 监控告警已配。
- 完整清单见 [QUALITY.md](QUALITY.md#发布验收清单)。

相关文档：[运维手册](OPERATIONS.md)、[本地开发与部署](DEPLOYMENT.md)、[脚本说明](SCRIPT-GUIDE.md)。
