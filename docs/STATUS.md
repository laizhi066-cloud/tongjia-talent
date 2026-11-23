# 当前状态快照

> 本文件是**唯一"现状"入口**：分支、服务、账号、规模、门禁结果和已知缺口。其余文档描述规则与做法，不重复记录会漂移的数字。
> 快照日期：2026-11-17；核对方式：本地源码 + 命令实测 + 任务板状态 + 各模块 acceptance。M9 发布验收仍在并行取证，最终门禁以 [M9 acceptance](specs/M9-quality/acceptance.md) 为准。

## 1. 项目定位

**同佳天赋**：天赋测评报告业务的 B/C 全栈平台，在 Foundation（单实例、单 PocketBase）骨架之上叠加 `talent_*` 天赋专项。报价范围为后台管理 + C 端小程序两端。

- **平台管理端**：天赋工作台、会员管理、天赋规则（潜质要素 / 分级与固定注解 / 培养方向管理）、报告管理（基因报告 / 培育建议）；系统管理与运行监控仅 `superAdmin` 可见。
- **C 端（H5 + 微信小程序）**：家长登录后按本人或已绑定子女视角查看已发布报告（4 主栏 + 16 二级页）、培育建议、培养方向与 PDF，维护孩子与个人资料。
- **外部集成与 PDF**：M8 已落地可注入传输的三源适配器骨架、入站 webhook、集成状态与 PDF 六册渲染 / 水印 / ticket / 下载留痕；真实供应商尚未联调。

单实例硬边界不变：一个 Nuxt 进程、一个 PocketBase，不引入多租户、站点切换或第二个 PB 连接。机构 / 代理商 / 服务商 / 培养计划 / 培养内容库 / AI 辅助已随 M6 退出。

## 2. 分支与提交

| 项 | 值 |
| --- | --- |
| 当前分支 | `codex/talent-plan-rework-formal` |
| 最新提交 | `1d670b98`（2026-11-16，`chore: 忽略公网发布产物并记录 11-15 / 11-16 工作日志`） |
| M1–M9 工作状态 | **未提交**：工作树含大量修改、删除与未跟踪文件（M1–M8 实现 + M6 删除 + M9 验收文档并行进行中） |
| 与 `master` 关系 | 该分支包含 `codex/talent-report` 全部提交，是本仓库最新业务线 |
| 交付约束 | 本分支验证任务一律**不 commit**；`.env` 仍被 Git 跟踪（P0，见 §8） |

## 3. 本地服务

| 服务 | 地址 | 启动命令 |
| --- | --- | --- |
| PocketBase 0.38.1 | `http://127.0.0.1:8090` | `pnpm pb` |
| Nuxt B 端 + Nitro API | `http://127.0.0.1:3000` | `pnpm dev` |
| C 端 H5 | `http://127.0.0.1:9000` | `pnpm --filter foundation-portal dev:h5` |

一键拉起三者（含 H5）用 `pnpm dev:all`。健康检查：`GET /api/health`（应用）、`GET /api/health?deep=1`（含数据库）。验证任务建议使用独立端口 / 临时数据目录（如 8093 / 8094 与 `/tmp` 下的 PB 数据），不要指向真实 `pb_data/`。

## 4. 测试账号（仅本地库）

后台账号由 `pnpm accounts:seed` 创建；口令可用环境变量覆盖，未覆盖时使用本地 dev 默认值（生产必须覆盖）：

| 账号（username / 邮箱） | 本地默认口令 | 角色 | 菜单范围 |
| --- | --- | --- | --- |
| `superAdmin` / `superadmin@tongjia.local` | `laizhi066` | `superadmin` 运维超管 | 全部菜单（含系统管理 / 运行监控） |
| `admin` / `admin@tongjia.local` | `admin123` | `customer-admin` 平台运营管理员 | 7 条业务菜单 + 全部业务 F 行 |
| `reviewer` / `reviewer@tongjia.local` | `reviewer123` | `report-reviewer` 报告审核员 | 工作台 / 会员只读 / 报告 / 建议 |
| `rule-config` / `ruleconfig@tongjia.local` | `ruleconfig123` | `rule-configurator` 规则配置员 | 工作台 + 天赋规则 3 页 + 方向归并 |

- PocketBase 超管来自 `.env` 的 `POCKETBASE_ADMIN_EMAIL` / `POCKETBASE_ADMIN_PASSWORD`（默认示例 `admin@example.com` / `admin123456`），用于 `env:setup` 与脚本鉴权。
- 生产环境用 `SUPERADMIN_PASSWORD` / `PLATFORM_OPERATOR_PASSWORD`（兼容 `CUSTOMER_ADMIN_PASSWORD`）/ `REPORT_REVIEWER_PASSWORD` / `RULE_CONFIGURATOR_PASSWORD` 覆盖，只向客户交付平台运营账号。
- **C 端演示账号**：新种子链不创建 C 端用户。本地可把演示家长绑定到已有中性账户（后台会员管理写入 `talent_parents.userId`，或 C 端 `POST /api/client/talent/bindings/claim` 用已验证手机号认领）；M7 收口验收在演示库使用 `admin@tongjia.local` 走通 H5 登录全链路。C 端默认口令变量为 `TALENT_MOCK_CLIENT_PASSWORD`（默认 `TalentMock123!`），仅本地使用。

## 5. 规模（按源码统计）

| 指标 | 数量 |
| --- | --- |
| Nitro API 路由 | 170 个文件（`server/api/**/*.ts`）：admin 133（天赋 67）、client 27（天赋 19）、integrations 3 + integration 别名 2、public 1、upload 3、health 1 |
| B 端页面 | 26 个路由页（`app/pages/**/*.vue` 排除 `components/`；含登录与 `/admin` 首页）；含组件共 61 个 `.vue` |
| C 端页面 | 20 条注册路由（4 主栏 + 16 二级页） |
| PocketBase 集合 | **35** 个业务集合（17 基础 + 18 `talent_*`，不含 `_superusers` 等系统集合） |
| 权限码 | 35 个在册业务码（工作台 1 + M1 15 + M2 9 + M3 4 + M4 1 + M5 5）+ Foundation 系统 / 监控码 |
| Vitest | 33 个测试文件、574 个用例（573 通过 / 1 跳过，2026-11-17 实测） |
| E2E | 10 个套件实测 **878/878 通过**（冒烟 274 + 验收 604）；`--group smoke/acceptance/all` 可用，连续三次验收组一致；API 层 1000/500 性能达标 |

演示数据由新种子链生成（规则 → 会员 → 报告 → 建议），详见 [TALENT-LOCAL.md](TALENT-LOCAL.md)。E2E 会追加数据，报告数可能大于种子值。

## 6. 里程碑状态

| 里程碑 | 状态 | 证据 / 说明 |
| --- | --- | --- |
| M0 密钥止血 | 待人工执行 | [M0 规格](specs/M0/security-remediation.md)；`.env` 仍在 Git 跟踪 |
| M1 规则域 | ✅ 完成并验收（2026-11-16） | [acceptance](specs/M1-rules/acceptance.md)：33/36 通过、0 未通过、2 未验证（依赖 M3） |
| M2 会员域 | ✅ 完成并验收（2026-11-17） | [acceptance](specs/M2-members/acceptance.md)：数据层 / 11 条管理业务 + 1 条探针 + 2 条 C 端路由 / B 端页面 |
| M3 报告域 | ✅ 完成并验收（2026-11-17） | [acceptance](specs/M3-reports/acceptance.md)：14 条后台端点、快照 / 状态机 / 版本链 |
| M4 方向匹配 | ✅ 完成并验收（2026-11-17） | [acceptance](specs/M4-matching/acceptance.md)：纯函数 / 待归并 / 后台选择；C 端 4 条归 M7 |
| M5 培育建议 | ✅ 完成并验收（2026-11-17） | [acceptance](specs/M5-advice/acceptance.md)：9 条后台端点、版本两层、15 列页面 |
| M6 清理与三角色 | 🟡 代码清理完成；真实数据删除未执行 | [M6-B 清单](specs/M6-cleanup/m6b-implementation.md)：删 148 文件 / 19 集合定义 / 56+16+13+1 旧路由；dry-run 演示库 pending=61 |
| M7 C 端 | ✅ 完成并收口（2026-11-17） | [acceptance](specs/M7-c-end/acceptance.md)：4 主栏 + 19 路由；真机 / 胶囊 / 暗色 / 法务文本仍未验证 |
| M8 外部接口与 PDF | 🟡 骨架完成，验收取证中 | [规格](specs/M8-external/spec.md)；PDF 渲染 / ticket / 入站 / 集成状态已实现；真实供应商未联调 |
| M9 质量与发布 | 🔄 验收进行中 | [规格](specs/M9-quality/spec.md)；acceptance 由 verifier 回填，最终发布判定以该文件为准 |

## 7. 质量门禁实测

| 项 | 结果（2026-11-17） | 来源 |
| --- | --- | --- |
| `pnpm test`（Vitest） | ✅ 33 文件 / 574 用例：573 通过、1 跳过 | 文档收口实测 |
| `pnpm typecheck` | ✅ 通过（有 1 条 duplicated import 警告，不影响退出码） | 文档收口实测 |
| `pnpm build` | ✅ 通过（Nitro 产物 18.3 MB / gzip 5.11 MB） | 文档收口实测 |
| `pnpm lint` / `pnpm client:typecheck` | 待 M9 结果 | verifier-m9 并行执行 |
| `pnpm client:build:h5` / `client:build:mp` / `client:check:wxss` | 待 M9 结果 | 依赖 `wcsc` 与微信开发者工具环境 |
| `pnpm e2e` | 未在本轮执行 | 5 套件已按 M6 重写；全量重写与证据归 M9 |

M1–M8 的模块级证据在各自 `docs/specs/*/acceptance.md`；本表不替代验收，只记录本轮可复现的仓库级门禁。

## 8. 已知未闭环（按优先级）

| 级别 | 问题 | 影响 | 建议 |
| --- | --- | --- | --- |
| P0 | `.env`、`.deploy.env` 已被 Git 跟踪，含 OSS AK/SK、服务器口令与超管密码 | 密钥随仓库泄露 | `git rm --cached` 后**轮换全部密钥**，再补 `.gitignore`；M0 未完成前不得发布 |
| P1 | M6 真实数据删除未执行：19 个旧集合、旧字段、旧索引仍存在于演示 / 真实库（新库已不再创建） | 旧数据与旧字段残留；schema 与代码不同步 | 按 [M6-B](specs/M6-cleanup/m6b-implementation.md)：备份 → 恢复演练 → `pnpm migration:m6 -- --confirm-m6` |
| P1 | 真实供应商未联调（C1 未定）：三源仍为可注入传输的 external 骨架 | 生产无法切真实基因查询 / 报告 / 建议 | 拿到接口合同后只改 `talent-external-sources.ts` 映射与 env；生产禁止 mock |
| P1 | 仓库不含 `pocketbase/pocketbase`（已 gitignore） | 新机器 `pnpm env:doctor` 直接失败 | 按 [QUICK-START.md](QUICK-START.md#1-前置条件) 放置或设 `POCKETBASE_BINARY` |
| P1 | 真机 / 微信胶囊 / 暗色 / 法务文本未验证；`client:check:wxss` 依赖本机 `wcsc` | C 端发布存在平台差异风险 | 真机走查 + `client:check:wxss` + 法务文案签字（M9 G 系列） |
| P1 | 性能未按 1000 会员 / 500 报告 / C 端首屏口径实测 | 无法证明 M9 性能门槛 | 由 M9 性能任务在隔离实例压测并回填 p50 / p95 |
| P1 | E2E 全量重写未完成：当前只有 01 / 02 / 04 / 05 / 06 冒烟与清理回归，03 已删除 | 发布前缺领域验收套件 06–10 | 按 [M9 规格](specs/M9-quality/spec.md) §4 重写并连续跑两次 |
| P2 | C 端新库没有现成演示账号，必须先绑定 `talent_parents.userId` 或用 claim 认领 | 新环境 C 端无法直接登录看数 | 种子链文档已写明绑定步骤（[TALENT-LOCAL.md](TALENT-LOCAL.md)） |
| P2 | `AGENTS.md`（双 Tab / `seed-talent.mjs`）、`docs/DEVELOPMENT.md`（双 Tab）、`docs/QUICK-START.md`（`talent:seed`）仍有旧口径 | 文档入口与新口径不一致 | 由文档 owner 按本文件与 [SCRIPT-GUIDE.md](SCRIPT-GUIDE.md) 统一收口（本轮只改指定 docs 与 `.env.example`） |
| P2 | PDF 字体依赖部署环境（`TALENT_PDF_FONT_PATH` / 仓库 `server/assets/fonts/`） | 字体缺失时 PDF 渲染明确失败 | 部署清单中固定字体文件与只读权限 |

## 9. 文档权威顺序

冲突时按以下顺序取信：

1. **源码与 `package.json` scripts** —— 唯一事实源。
2. [docs/CONVENTIONS.md](CONVENTIONS.md) + [AGENTS.md](../AGENTS.md) —— 硬性规则。
3. 本文件 —— 现状数字与已知缺口。
4. [docs/API.md](API.md)、[docs/ARCHITECTURE.md](ARCHITECTURE.md)、[docs/CLIENT-PORTAL.md](CLIENT-PORTAL.md)、[docs/SCRIPT-GUIDE.md](SCRIPT-GUIDE.md)、[docs/TALENT-LOCAL.md](TALENT-LOCAL.md) —— 接口、数据、C 端、脚本与本地闭环。
5. [docs/specs/](specs/README.md) 各模块 `spec.md` / `acceptance.md` —— 模块合同与证据。
6. [docs/adr/](adr/) —— 关键决策与后果。
7. [docs/implementation/开发留痕.md](implementation/开发留痕.md) —— **历史流水，非当前口径**。
8. [docs/天赋正式开发交接包/](天赋正式开发交接包/README.md) —— 报价单、功能清单与原型，用于商务口径和页面样式参考，不作为现状依据。

## 10. 如何更新本文件

- 分支、提交、服务地址、账号、规模或门禁结果发生变化时更新对应小节，并改快照日期。
- 关闭 §8 的条目时同步删除该行，并在文末记录一句变更。
- 不要在其它文档里复制这些数字；需要引用时链接到本文件。

## 变更记录

- 2026-10-23：首次建立；记录分支、本地服务、门禁实测与 7 项已知缺口。
- 2026-11-02：并入天赋专项报价单、功能清单、设计基线与静态原型（`docs/天赋正式开发交接包/`）。
- 2026-11-04：报价范围调整为后台管理 + C 端小程序两端（36,000 + 12,000 = 48,000）。
- 2026-11-16：M1 规则域 / M2 会员域实现；菜单改为工作台 / 会员管理一级 + 天赋规则 + 报告管理，系统管理 / 运行监控仅 superAdmin。
- 2026-11-20：C 端「我的」精简为高频入口（编辑资料 / 孩子管理 / 更多设置 / 退出登录），协议、隐私、关于版本与注销收进「设置」页，注册路由 19 → 20。
- 2026-11-17：M3–M8 实现与验收推进；M6 完成旧口径代码清理（真实数据删除未执行）；C 端改为 4 主栏 + 19 路由；集合收敛为 34；重写本文件的分支、账号、规模、里程碑、门禁与缺口。