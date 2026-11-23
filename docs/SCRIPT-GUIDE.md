# 脚本说明

所有命令都面向单实例、单 PocketBase 的基础版 + 天赋专项。没有按站点路由、交付档位、领域包、自动化客户发布或多实例迁移命令。实际可用脚本以根目录 [package.json](../package.json) 的 `scripts` 为准。

## 初始化与 PocketBase

| 命令 | 用途 | 说明 |
| --- | --- | --- |
| `pnpm env:doctor` | 检查本机 PB 二进制、数据目录和唯一连接地址 | 只读检查，不启动服务。 |
| `pnpm env:setup` | 初始化新库 schema、初始角色 / 菜单 / 配置和后台账户 | **仅适用于全新的空数据目录**；缺少 PB 时会临时启动并在完成后停止。 |
| `pnpm pb` | 前台启动唯一 PocketBase | 使用 `POCKETBASE_URL`、`POCKETBASE_DATA_DIR` 和可选的 `POCKETBASE_BINARY`。 |
| `pnpm shop doctor` / `pnpm shop setup` / `pnpm shop pb` | 上述命令的统一入口别名 | 三者为同义别名。 |
| `pnpm accounts:seed` | 初始化 / 校正后台账号与 M6 三角色矩阵 | 创建 `superAdmin`（运维超管）、`admin`（平台运营）、`reviewer`（报告审核员）、`rule-config`（规则配置员）；可重复执行；口令用 `SUPERADMIN_PASSWORD` / `PLATFORM_OPERATOR_PASSWORD`（兼容 `CUSTOMER_ADMIN_PASSWORD`）/ `REPORT_REVIEWER_PASSWORD` / `RULE_CONFIGURATOR_PASSWORD` 覆盖。 |
| `pnpm prod:init-db` | 生成干净的生产初始库 | 全新临时目录跑基础初始化，产物在 `.deploy-staging/prod-db`（无演示数据），供 `deploy:remote --init-db` 上传。 |
| `pnpm backup:pb` | 创建并下载一次 PocketBase 备份 | 产物在 `backups/`（已 gitignore）；`--keep=14` 控制本地保留份数，适合配 cron。 |

开始前先执行 `pnpm install`，再手动运行 `cp .env.example .env` 并替换超管密码和 `ENCRYPTION_KEY`。`env:setup` 不安装依赖、不复制 `.env`，也**不会迁移或清理旧 `pb_data`**；目标库发现既有业务集合时脚本会失败，要求改用新的 `POCKETBASE_DATA_DIR`。存量库的 schema / 菜单 / 权限升级用 `pnpm talent:sync`，不要用 `env:setup`。

仓库**不包含** PocketBase 二进制；`env:doctor` / `env:setup` / `pb` 都从 `pocketbase/pocketbase` 或 `POCKETBASE_BINARY` 查找，缺失时直接报错。获取方式见 [QUICK-START.md](QUICK-START.md#1-前置条件)。

## 天赋专项种子与同步

演示数据按 **规则 → 会员 → 报告 → 建议** 顺序幂等写入；每个种子脚本都只允许本机 PocketBase、要求显式确认变量，并在 `NODE_ENV=production` 时拒绝执行。种子只 upsert 自己域内的集合，不清空其他天赋数据。

| 命令 | 写入内容 | 显式确认 |
| --- | --- | --- |
| `pnpm talent:rule:seed` | M1 规则域：4 分级、4 档位、1 个分库 × 158 要素、632 固定注解、6 个培养方向 | `TALENT_RULE_SEED_CONFIRM=rule` |
| `pnpm talent:member:seed` | M2 会员域：1 名演示家长 + 2 名子女（已查到 / 未查到），含三件套密文与脱敏 | `TALENT_MEMBER_SEED_CONFIRM=member` |
| `pnpm talent:report:seed` | M3 报告域：1 份待发布 + 1 份已发布（含新增册）报告与对应 `talent_gene_reports`；依赖会员种子 | `TALENT_REPORT_SEED_CONFIRM=report` |
| `pnpm talent:advice:seed` | M5 培育建议：2 个版本（1 生效 + 1 归档）；依赖报告种子 | `TALENT_ADVICE_SEED_CONFIRM=YES` |
| `pnpm talent:sync` | 把当前 schema、菜单、权限、三角色矩阵同步到**已有库** | 无（幂等，可重复执行；旧集合只告警不删除） |
| `pnpm migration:m6`（别名 `pnpm cleanup:m6`） | M6 旧集合 / 旧字段 / 旧菜单 / 旧权限码归零 | 默认 **dry-run**；正式删除需 `--pb-url` / `--data-dir` / `--backup` / `--confirm-m6` 四参数齐全 |

M6 迁移脚本的安全门槛：

```bash
# 只读盘点（默认）
pnpm migration:m6 -- --dry-run --pb-url=http://127.0.0.1:8090 --data-dir=/path/to/pb_data
# 正式删除（备份必须存在、非空、sha256 可算且足够新）
pnpm backup:pb --dir=backups-m6
pnpm migration:m6 -- --pb-url=http://127.0.0.1:8090 --data-dir=/path/to/pb_data \
  --backup=backups-m6/<key>.zip --confirm-m6
```

迁移脚本拒绝 `--force` / `--reset` / `--clean` / `--drop-all`，不调用 `setupFoundation`，不执行 `rmSync` / `unlinkSync`；删除顺序来自 `LEGACY_TALENT_COLLECTION_DELETE_ORDER`，失败即中止，只能整库恢复。详见 [M6-B 实现清单](specs/M6-cleanup/m6b-implementation.md)。

## 开发

| 命令 | 用途 |
| --- | --- |
| `pnpm dev:all` | 一键启动 PocketBase + B 端 Nuxt + C 端 H5（统一日志前缀，Ctrl+C 一起退出）。可加参数：`pnpm dev:all pb nuxt`。 |
| `pnpm dev` | 只启动 Nuxt B 端管理台与 Nitro API。 |
| `pnpm preview` | 预览已构建的 Nuxt 产物。 |
| `pnpm client:dev` | 启动 C 端微信小程序开发。 |
| `pnpm --filter foundation-portal dev:h5` | 只启动 C 端 H5 开发。 |

日常需在另一个终端先运行 `pnpm pb`。本地 PB 和 Nuxt 分别默认使用 `http://127.0.0.1:8090` 与 `http://127.0.0.1:3000`，C 端 H5 为 `http://127.0.0.1:9000`；不要将 `localhost` 用作访问地址。

## 校验与构建

| 命令 | 用途 |
| --- | --- |
| `pnpm test` | 运行 Vitest（33 个测试文件 / 574 用例）。 |
| `pnpm test:watch` | 以 watch 模式运行 Vitest。 |
| `pnpm e2e` | 端到端实测（Playwright）5 套件：01 后台新域只读、02 三角色权限、04 C 端门户、05 后台页面与菜单、06 M6 清理回归。`--target remote` 打测试服，`--only 01,06` 选套件。**首次执行前需 `pnpm exec playwright install chromium`**。详见 `scripts/e2e/README.md`。 |
| `pnpm typecheck` | Nuxt（含服务端）类型检查。 |
| `pnpm lint` | 运行根目录 ESLint。 |
| `pnpm format` | 使用 Prettier 格式化仓库文件。 |
| `pnpm qa` | 运行 `typecheck` 与 `lint`。 |
| `pnpm check:ai` | 校验 AI 工具入口文件与 `AGENTS.md` 的入口登记表是否一致。 |
| `pnpm build` | 合并 `.env`、`.env.production` 和命令行环境后构建 Nuxt。 |
| `pnpm release` | 依次构建 B 端、C 端 H5 与微信小程序。 |
| `pnpm start` | 以生产模式运行已构建的 Nuxt 产物（`node .output/server/index.mjs`）。 |
| `pnpm deploy:remote` | 单实例远程部署：本地构建 → rsync 上传 → 服务器 PM2/nginx。配置见本地 `.deploy.env`；支持 `--dry-run`、`--no-db`、`--no-build`、`--init-db`、`--force-init-db`、`--skip-public-check`。详见 [运维手册](OPERATIONS.md#3-远程部署一键发版)。 |
| `pnpm client:typecheck` | C 端 uni-app 类型检查。 |
| `pnpm client:lint` | C 端 ESLint。 |
| `pnpm client:build:h5` | 构建 C 端 H5，产物为 `apps/client/dist/build/h5/`。 |
| `pnpm client:build:mp` | 校验小程序完整 API URL 后构建微信小程序，产物为 `apps/client/dist/build/mp-weixin/`。 |
| `pnpm client:check:wxss` | 构建后检查小程序原生 WXSS 兼容性；默认调用 macOS 的 `wcsc`，可用 `WECHAT_WXSS_COMPILER` 指定路径，未安装时明确失败。 |

`pnpm build` 的环境优先级为：命令行环境变量最高，其次 `.env.production`，最后 `.env`。C 端构建变量不读取根 `.env`，而是从 `apps/client/env/` 的当前 Vite mode 读取。微信小程序命令会在编译前拒绝 `/` 或相对 API 地址，体验版 / 正式版变量一旦配置则必须使用 HTTPS。

M8 相关门禁：`pnpm test` 已覆盖外部适配器（fake transport）、PDF 渲染 / ticket / 下载留痕与集成状态；真实供应商与 OSS 的契约测试需要目标环境变量，未配置时按验收文档标「未验证」，不得当作通过。

## 已移除的旧流程

以下内容不属于当前版本，不能作为可用命令或配置继续使用：

- `talent:seed` / `scripts/seed-talent.mjs`：M6 删除；它曾**清空天赋业务数据**，现由 `talent:rule:seed` → `talent:member:seed` → `talent:report:seed` → `talent:advice:seed` 幂等种子链替代。`TALENT_SEED_CONFIRM` 不再生效。
- 旧天赋页面与旧机构端脚本入口：服务商授权、培养计划审核、机构账号、旧报告接收 / 同步配置页面均已删除，API 404。
- `TENANT_MODE`、控制 PocketBase、站点切换、`site` cookie、`X-Site-Slug`、`PB_PORT_<SLUG>`。
- `APP_EDITION`、`BUILD_PROFILE`、`DELIVERY_PROFILE`、领域包、交付工厂和按客户生成/发布流程。
- `pnpm publish*`、按多站点 PB 端口的批量发布。当前不读取 `.env.deploy`；单实例远程发布用 `pnpm deploy:remote`（读本机 `.deploy.env`，见 [运维手册](OPERATIONS.md)）。
- 向现有业务数据库运行 `setup`，或将旧业务 `pb_data` 复制后作为新库数据源。

仓库另提供 [ecosystem.config.cjs](../ecosystem.config.cjs) 作为手工单实例 PM2 参考配置；远程发布使用 `pnpm deploy:remote`，两套进程名不同，详见 [DEPLOYMENT.md](DEPLOYMENT.md#pm2-参考配置)。