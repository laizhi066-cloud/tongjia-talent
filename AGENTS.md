# 同佳天赋工程说明

> 开始改动前先读 [docs/CONVENTIONS.md](docs/CONVENTIONS.md)。本文件是工程规则的**唯一事实来源**；其余入口文件只做转发，不复制规则。

## AI 工具入口

不同 AI 编程工具读不同文件，入口按工具约定分散，内容统一回到本文件：

| 工具 | 入口文件 | 读取方式 |
| --- | --- | --- |
| Codex CLI / Codex Cloud、CodeBuddy、Zed、Jules、Amp 等 | `AGENTS.md` | 原生读取（即本文件） |
| Claude Code | `CLAUDE.md` | `@AGENTS.md` 导入 |
| Cursor | `.cursor/rules/000-project.mdc` | `alwaysApply` 规则 |
| GitHub Copilot / VS Code | `.github/copilot-instructions.md` | 仓库自定义指令 |
| Gemini CLI | `GEMINI.md` | 原生读取 |
| Windsurf | `.windsurf/rules/project.md` | `trigger: always_on` |
| Trae（DeepSeek 等模型） | `.trae/rules/project_rules.md` | 项目规则 |
| Cline / Roo Code 等 | `.clinerules` | 项目规则 |

维护规则：

- 工程规则只在本文件改。入口文件只放「红线速览 + 指路」，不放会随迭代漂移的细节（路由清单、菜单、字段、命令参数）。
- 新增工具时加一个十行左右的入口文件，并在上表登记；**不要整段复制本文件**。
- 入口文件与本文件冲突时，以本文件为准。
- `pnpm check:ai` 校验上表与磁盘文件是否一致、入口是否被改坏。

## 产品边界

本仓库有两个层次，改动前先分清在哪一层：

1. **Foundation 底座**（`base` 分支的规则仍然有效）：单实例、单 PocketBase、中性账户、RBAC、组织字典、配置、会话、上传、日志。底座不承载行业字段，不恢复订单 / 商城 / 预约 / 营销 / 分销 / 多租户。
2. **天赋专项**（当前分支 `codex/talent-plan-rework-formal`）：在底座之上追加 `talent_*` 集合、`/api/admin/talent/*`、`/api/org/talent/*`、`/api/client/talent/*` 和对应菜单页面。当前分支**已有**天赋业务，`docs/README.md`、`CONVENTIONS.md` 中“本分支不含行业领域”的表述只适用于纯底座分支。

两条硬边界同时成立：

- 不支持多租户：不得增加 `TENANT_MODE`、`site` cookie、`X-Site-Slug`、控制 PocketBase 或按请求切换 PocketBase。
- 天赋业务字段只能落在 `talent_*` 集合；不得回填 `users`、`configs` 或 `site_config`。
- 不恢复已被 2026-09-24 模型取代的培训机构、课程、课表、计划课程和多计划共享。
- `scripts/setup.mjs` 只允许初始化全新的数据目录；它发现旧业务集合时必须失败，不能把它当作迁移或清库工具。

当前分支状态、账号与已知缺口见 [docs/STATUS.md](docs/STATUS.md)。

## 协作与工作方式

- 面向用户和文档默认使用简体中文；代码、命令、路径、配置键、错误信息和 API 名称保留原文。
- 先阅读 [docs/CONVENTIONS.md](docs/CONVENTIONS.md)，再定位调用链、数据结构和权限边界；仓库没有 `.codegraph/` 时使用 `rg` 查找。
- 用户未要求完整验证时，先做与风险相符的最小闭环：检查 diff、调用点、类型、schema、权限与 API 封装一致性，并明确说明未运行的检查。鉴权、权限、schema、上传、微信认证、跨端 API、提交、发布或用户明确要求时，按 [质量门禁](docs/QUALITY.md) 升级验证。
- 解释 PocketBase、Nitro API 或集合变更时，明确区分浏览器 / Vue、Nuxt 服务端和 PocketBase 数据库；说明字段用途、类型、必填性、前端输入和影响范围。
- 在已有脏工作树中只修改任务所需文件，不恢复、重置、覆盖或删除不相关改动；不执行 `git reset --hard`、广泛 `rm -rf` 或未授权发布。
- 文档是交付的一部分。涉及集合、API、环境变量、菜单、主题、C 端导航或脚本时，同步更新对应文档与索引，并检查链接。

## 当前能力

- 平台管理端：工作台、会员管理、天赋规则（潜质要素 / 分级与固定注解 / 培养方向管理）、报告管理（基因报告 / 培育建议）、系统管理、运行监控；报告支持发布 / 撤回 / 恢复 / 补发 / 一键同步，建议支持版本 / 发布撤回 / 回切。
- 系统管理 / 运行监控仅 superAdmin 可见；平台运营 / 报告审核 / 规则配置三角色按菜单与接口矩阵授权。
- C 端：uni-app 4 主栏门户（首页 / 报告 / 培养方向 / 我的）+ 19 条路由；支持微信授权 / 手机号一键登录 / H5 账号密码、对象切换、报告与分册 / 要素解读、建议书、方向推荐 / 选择 / 换档 / 自填、孩子管理、资料、PDF、隐私 / 协议 / 关于。
- 服务端：Nuxt Nitro API、统一文件 URL、单 PocketBase 连接、RBAC、PDF 权限代理、第三方报告接收、基础审计与错误记录。

C 端**不提供**用户侧外观设置：主题只跟随后台 `site_config` 的 `primaryColor` 与 `themeMode`。

## 文档地图

- [当前状态快照](docs/STATUS.md)：分支、服务、账号、规模、门禁结果与已知缺口（**先看这份**）。
- [工程约定](docs/CONVENTIONS.md)：不可违背的编码、API 与数据规则。
- [5 分钟快速开始](docs/QUICK-START.md)：依赖、PocketBase 二进制、`.env`、新库初始化和最小闭环。
- [开发与扩展指南](docs/DEVELOPMENT.md)：B/C 端、API、数据与业务模块接入的闭环。
- [架构](docs/ARCHITECTURE.md)：应用边界、数据集合与请求路径。
- [API 索引](docs/API.md)：当前路由分组与认证要求。
- [C 端门户](docs/CLIENT-PORTAL.md)：页面、主题与认证流程。
- [天赋系统本地闭环](docs/TALENT-LOCAL.md)：本地 PocketBase、Mock 数据、菜单口径和端到端验收。
- [质量门禁与验收](docs/QUALITY.md)：按风险分级的测试、构建、烟测和发布清单。
- [本地开发与部署](docs/DEPLOYMENT.md)、[脚本说明](docs/SCRIPT-GUIDE.md)。
- [生产环境首次部署指引](docs/PRODUCTION-SETUP.md)：全新服务器从零上线。
- [运维手册](docs/OPERATIONS.md)：迭代发布、PB 升级、回滚、备份恢复、故障排查。
- [天赋功能验收映射](docs/implementation/天赋功能验收映射.md)：逐行报价功能与证据（历史快照）。
- [天赋正式开发交接包](docs/天赋正式开发交接包/README.md)：天赋专项报价单（48,000 元：后台管理 36,000 + C 端小程序 12,000）、逐行功能清单、口径留痕、流程图与静态原型；二期业务 / 健康智脑 / 视频会诊材料不在此列。验收以报价单与功能清单为准；`talent-prototype/` 是 2026-09 四端旧口径，只作页面样式参考。
- [开发留痕](docs/implementation/开发留痕.md)：实现流水（历史，非当前口径）。
- [B 端设计约定](app/DESIGN.md)。

## 目录地图

```text
app/                         Nuxt B 端页面、组件与 composable
app/pages/admin/talent/      平台天赋页面（工作台、会员、规则、报告、机构）
app/pages/org/talent/        机构端页面（会员、报告、培养计划）
server/api/admin/talent/     平台天赋 API
server/api/org/talent/       机构端 API
server/api/client/talent/    C 端报告、计划与 PDF 代理
server/utils/                PocketBase、认证、RBAC、日志、天赋匹配等服务端工具
apps/client/                 uni-app C 端（H5 + 微信小程序）
apps/client/src/modules/foundation-portal/
                             C 端展示组件与认证 / 主题 composable
scripts/setup.mjs            仅新库可用的 schema 与菜单种子
scripts/seed-talent.mjs      天赋 Mock 闭环数据（会清空天赋业务数据）
scripts/sync-talent.mjs      存量库幂等同步 schema / 菜单 / 权限
scripts/e2e/                 Playwright 端到端套件 01–05
schemas/                     站点配置 JSON Schema
shared/types/                PocketBase 实体与共享类型
docs/                        面向开发和运行的文档
```

## 查找与扩展

| 任务               | 首选位置                                                       | 同步检查                                                |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------- |
| 新 B 端管理页      | `app/pages/admin/` + 同目录 `components/`                      | 菜单、权限码、`app/composables/api/`、加载/空态/错误态  |
| 新 C 端基础能力    | `apps/client/src/modules/foundation-portal/`                   | 薄路由、`/api/client/*`、H5 / 小程序、主题 / 安全区     |
| 新 Nitro API       | `server/api/admin/` 或 `server/api/client/`                    | Zod、认证 / RBAC、审计、composable、测试、`docs/API.md` |
| 新集合或字段       | `scripts/setup.mjs`、`shared/types/`                           | Zod、关系 / 索引、API、权限、测试、架构文档             |
| 文件上传或展示     | `server/api/upload/`、`server/utils/file-url.ts`               | 类型 / 大小 / 归属、统一 URL、公开 PB 地址              |
| 主题或站点公开配置 | `app/composables/useTheme.ts`、`apps/client/src/store/site.ts` | B/C 同步、本机偏好不回写、亮 / 暗色                     |

新业务模块先按 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) 定义边界、数据和验收，不能把行业逻辑塞入 `users`、`configs` 或 `site_config`。

## 本地运行

所有本地地址使用 `127.0.0.1`，不要用 `localhost`。

```bash
cp .env.example .env          # 首次执行
pnpm env:setup                # 仅全新 PB 数据目录：创建基础 schema 和初始数据
pnpm pb                       # PocketBase，默认 http://127.0.0.1:8090
pnpm dev                      # Nuxt B 端与 API，默认 http://127.0.0.1:3000
pnpm client:dev               # C 端微信小程序开发构建
pnpm --filter foundation-portal dev:h5  # C 端 H5 开发构建
```

常用检查：`pnpm typecheck`、`pnpm client:typecheck`、`pnpm build`、`pnpm client:build:h5`、`pnpm client:build:mp`。命令参数和影响范围详见 [docs/SCRIPT-GUIDE.md](docs/SCRIPT-GUIDE.md)。

预览客户交付的天赋专项原型（静态站，只读，无需安装依赖）：

```bash
cd "docs/天赋正式开发交接包/talent-prototype-v2" && python3 serve.py 8901
# 后台 http://127.0.0.1:8901/；小程序端 ?view=mini；登录页 ?view=login；业务流程 ?view=flow
```

改动 JS / CSS 后用 `python3 bump-version.py <版本号>` 统一刷新 `index.html` 与模块 import 的 `?v=`；不要用 `python3 -m http.server`（会缓存旧脚本）。

## 交付前

- 初始后台登录账号来自 `.env` 的 `POCKETBASE_ADMIN_EMAIL` / `POCKETBASE_ADMIN_PASSWORD`；不在代码、文档、测试或截图中硬编码真实凭据。
- `POCKETBASE_URL` 是服务端唯一连接，`POCKETBASE_PUBLIC_URL` 与 `NUXT_PUBLIC_POCKETBASE_URL` 是浏览器可达地址。生产环境的文件 URL 不能使用容器或内网地址。
- C 端 `VITE_*` 是 `apps/client/env/` 下的构建时变量，根 `.env` 不会自动写进 C 端构建；部署前核对 API 地址、H5 base、微信合法域名与 OAuth 回调。
- 完整的测试、构建、新库烟测、权限、主题和文档验收按 [docs/QUALITY.md](docs/QUALITY.md) 执行。

## 研发规则

- Vue 使用 Composition API、`<script setup lang="ts">`；B 端用 Naive UI，C 端用 Wot UI / uni-app。
- C 端组件优先级：Wot UI 最高。已有 `wd-*` 组件可以覆盖的按钮、输入、选择器、单元格、反馈和图标，必须优先使用 Wot；只有 Wot 无对应能力或平台原生开放能力（如微信 `chooseAvatar`）时才保留原生控件，并统一重置 H5 / 小程序默认样式。能使用 Wot 图标就不自绘图标，不新增重复的组件样式。
- 页面保持组合层；状态与副作用放到 composable；新增 C 端基础能力放进 `foundation-portal`，不要堆入页面路由文件。
- 服务端写接口使用 `validateBody()`、权限校验和 `withOperLog()`；成功响应使用 `success()`。
- 新 PB 集合或字段同步更新 `shared/types/` 与 `scripts/setup.mjs`；新 B 端 API 同步新增 composable。
- 使用主题令牌，不硬编码品牌色；移动端可交互区域不小于 44px。
- 不提交 `pb_data/`、`.env`、构建产物、运行日志或历史行业方案 / 截图。

<!-- open-wot agent instructions start -->
## Wot UI Agent Instructions

Before generating or modifying wot-ui component code, read the project Skill at `.agents/skills/wot-ui-v2/SKILL.md` and query the configured `wot-ui` MCP server for version-accurate APIs and examples.

<!-- open-wot agent instructions end -->
