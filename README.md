# 同佳天赋

同佳天赋是天赋测评报告业务的 B/C 全栈平台：第三方测评结果回传后固化为报告，平台整份发布并开放分册，家长在 H5 / 微信小程序按本人或子女视角读报告、要素解读和培养计划推荐，选一个计划提交审核，通过后推送给服务商。

工程底座是 Foundation：一个 Nuxt 4 服务、一个 PocketBase、一个 B 端管理台和一个 C 端基础门户。账户、RBAC、组织与字典、站点与微信配置、上传、审计、错误监控和主题沿用底座能力，天赋业务以独立集合与路由叠加，不回填到 `users` / `configs`。

> 当前分支状态、账号、规模与已知缺口见 [当前状态快照](docs/STATUS.md)。

## 适用范围

- **平台管理端**：天赋工作台、平台会员、机构与机构账号、服务商授权、天赋规则（分类与要素 / 分级与注解 / 匹配规则 / 内容库与培育内容）、报告接收与发布撤回、培养计划审核；另有用户 / 角色 / 菜单 / 部门 / 岗位、字典 / 参数、站点与微信配置、健康 / 在线 / 错误监控和日志。
- **机构业务端**：代理商登记与跟进自己引流的会员；服务商查看授权会员并提交培养计划。入口统一为“会员管理 > 会员列表 / 报告列表（服务商另有培养计划）”。
- **C 端**：uni-app，固定“首页 / 我的”双 Tab；登录后按本人 / 已授权子女视角读已发布报告、分册目录、要素解读、PDF 和培养计划推荐。
- **服务端**：Nuxt Nitro API、唯一 PocketBase 连接、RBAC、统一文件 URL、权限代理 PDF、基础审计和错误记录。

本分支刻意不含多租户、多站点控制平面、订单 / 商城 / 预约 / 营销 / 分销、检测样本与实验室流程，也不保留被 2026-09-24 新模型取代的培训机构、课程与课表。新增业务应作为独立模块接入，不要恢复旧模块。

## 技术栈

| 层 | 技术 |
| --- | --- |
| B 端与 API | Nuxt 4、Vue 3、Nitro、Naive UI、Zod |
| C 端 | uni-app、Vue 3、Pinia、Wot UI（H5 / 微信小程序） |
| 数据 | PocketBase（SQLite） |
| 工具链 | Node.js `>=20.19.0`、pnpm `>=10`、Vitest、ESLint、Playwright |

## 5 分钟快速开始

### 准备 PocketBase 二进制

仓库**不包含** `pocketbase/pocketbase`（已在 `.gitignore` 中），首次运行前必须自行准备，否则 `pnpm env:doctor` 会直接失败：

```bash
# macOS arm64 示例；其他平台替换文件名
curl -L -o /tmp/pb.zip https://github.com/pocketbase/pocketbase/releases/download/v0.38.1/pocketbase_0.38.1_darwin_arm64.zip
unzip -o /tmp/pb.zip -d /tmp/pb
mkdir -p pocketbase && cp /tmp/pb/pocketbase pocketbase/pocketbase && chmod +x pocketbase/pocketbase
```

版本必须与生产一致（当前 `0.38.1`）。放在其他位置时，在 `.env` 设置 `POCKETBASE_BINARY=/absolute/path/to/pocketbase`。

### 初始化并启动

前提：已安装 Node.js 与 pnpm。以下命令在仓库根目录执行，所有本地地址使用 `127.0.0.1`，不要使用 `localhost`。

```bash
pnpm install
cp .env.example .env
# 打开 .env：至少替换 POCKETBASE_ADMIN_EMAIL、POCKETBASE_ADMIN_PASSWORD、ENCRYPTION_KEY
pnpm env:doctor
pnpm env:setup
```

`env:setup` 只接受全新的 PocketBase 数据目录，会创建基础集合、初始菜单、默认站点配置和一个拥有 `superadmin` 角色的后台账户。若仓库根目录已有其他项目遗留的 `pb_data/`，先在 `.env` 增加一个新的绝对路径，例如 `POCKETBASE_DATA_DIR=/absolute/path/to/foundation-pb-data`，再执行初始化；它不会迁移、清空或改写旧库。

然后分别启动数据服务和应用：

```bash
# 终端 1
pnpm pb

# 终端 2
pnpm dev
```

打开 [http://127.0.0.1:3000/login](http://127.0.0.1:3000/login)，使用 `.env` 中的 `POCKETBASE_ADMIN_EMAIL` 与 `POCKETBASE_ADMIN_PASSWORD` 登录。默认 `.env.example` 的凭据仅用于本地开发，首次可访问环境务必改为强密码且不要提交 `.env`。

更详细的前置条件、故障定位和运行时变量见 [5 分钟快速开始](docs/QUICK-START.md) 与 [本地开发与部署](docs/DEPLOYMENT.md)。

## 启动 C 端

```bash
# 微信小程序开发构建
pnpm client:dev

# H5 开发构建
pnpm --filter foundation-portal dev:h5
```

C 端默认开发环境已指向 `http://127.0.0.1:3000`，并通过 `/api/client/*` 使用同一个 Nuxt 服务。生产构建的接口地址和 H5 子路径由 `apps/client/env/` 的 `VITE_*` 变量决定，根目录 `.env` 不会自动传入 C 端构建。配置方法见 [C 端基础门户](docs/CLIENT-PORTAL.md#环境配置)。

首页提供站点品牌、账户入口以及培养计划、检测报告、要素解读快捷入口；“我的”提供账户卡、报告对象切换和账户设置。正式环境不依赖 localStorage 存业务数据、不使用硬编码数组或演示数据，业务数据通过 Nitro API 持久化到 PocketBase。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm env:doctor` | 只读检查 PocketBase 二进制、数据目录和单实例地址 |
| `pnpm env:setup` | 初始化全新 PocketBase 的 schema、账号、菜单和配置 |
| `pnpm pb` | 启动唯一 PocketBase |
| `pnpm dev` | 启动 Nuxt B 端与 Nitro API |
| `pnpm dev:all` | 一键拉起 PocketBase + Nuxt + C 端 H5 |
| `pnpm client:dev` | 启动 C 端微信小程序开发构建 |
| `pnpm accounts:seed` | 创建 `superAdmin` / 客户管理员两个后台账号（可重复执行） |
| `TALENT_SEED_CONFIRM=mock pnpm talent:seed` | 写入天赋 Mock 闭环数据（**会清空天赋业务数据**，仅限本地） |
| `pnpm talent:sync` | 同步天赋 schema、菜单与权限到现有库（幂等） |
| `pnpm test` | 运行 Vitest |
| `pnpm e2e` | Playwright 端到端实测（首次需 `pnpm exec playwright install chromium`） |
| `pnpm typecheck` / `pnpm client:typecheck` | B/API 与 C 端类型检查 |
| `pnpm qa` | 根项目类型检查与 ESLint |
| `pnpm build` | 构建 Nuxt node-server 产物 |
| `pnpm client:build:h5` / `pnpm client:build:mp` | 构建 C 端 H5 / 微信小程序 |

完整命令与影响范围见 [脚本说明](docs/SCRIPT-GUIDE.md)。

## 从哪里读起

| 场景 | 文档 |
| --- | --- |
| 现在是什么状态、账号、已知缺口 | [当前状态快照](docs/STATUS.md) |
| 第一次运行、初始账号、常见问题 | [快速开始](docs/QUICK-START.md) |
| 代码和数据怎样组织 | [基础架构](docs/ARCHITECTURE.md) |
| B / C / API / 数据库的硬性规则 | [工程约定](docs/CONVENTIONS.md) |
| 新增能力或业务模块 | [开发与扩展指南](docs/DEVELOPMENT.md) |
| C 端路由、环境、主题、微信认证 | [C 端基础门户](docs/CLIENT-PORTAL.md) |
| 路由、认证和请求边界 | [API 索引](docs/API.md) |
| 本地天赋闭环与 Mock 数据 | [天赋系统本地闭环](docs/TALENT-LOCAL.md) |
| 测试、构建和验收 | [质量门禁与验收](docs/QUALITY.md) |
| 运行时变量与部署边界 | [本地开发与部署](docs/DEPLOYMENT.md) |
| 逐行报价功能完成度 | [天赋功能验收映射](docs/implementation/天赋功能验收映射.md) |
| 报价口径、功能清单、验收原型 | [天赋正式开发交接包](docs/天赋正式开发交接包/README.md) |
| 历次实现与验收流水 | [开发留痕](docs/implementation/开发留痕.md) |

面向协作 Agent 的入口与目录地图见 [AGENTS.md](AGENTS.md)，全部文档索引见 [docs/README.md](docs/README.md)。

## AI 协作入口

工程规则只在 [AGENTS.md](AGENTS.md) 维护。各工具读各自的入口文件，入口只做转发，不复制规则：

| 工具 | 入口文件 |
| --- | --- |
| Codex、CodeBuddy、Zed、Jules 等 | [AGENTS.md](AGENTS.md) |
| Claude Code | [CLAUDE.md](CLAUDE.md)（`@AGENTS.md` 导入） |
| Cursor | [.cursor/rules/000-project.mdc](.cursor/rules/000-project.mdc) |
| GitHub Copilot / VS Code | [.github/copilot-instructions.md](.github/copilot-instructions.md) |
| Gemini CLI | [GEMINI.md](GEMINI.md) |
| Windsurf | [.windsurf/rules/project.md](.windsurf/rules/project.md) |
| Trae | [.trae/rules/project_rules.md](.trae/rules/project_rules.md) |
| Cline / Roo Code | [.clinerules](.clinerules) |

改完入口文件后执行 `pnpm check:ai`，校验入口与 `AGENTS.md` 的登记表是否一致。
