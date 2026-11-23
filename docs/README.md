# 同佳天赋文档

同佳天赋是天赋测评报告业务的 B/C 全栈平台，工程底座是 Foundation：单实例、单 PocketBase。底座提供认证、权限、配置、审计、上传、监控和基础门户；天赋业务以独立的 `talent_*` 集合与路由叠加。

## 建议阅读顺序

1. **先看现状**：[当前状态快照](STATUS.md)（分支、服务、账号、规模、门禁结果、已知缺口）。
2. 第一次运行：从 [5 分钟快速开始](QUICK-START.md) 开始（注意仓库不含 PocketBase 二进制）。
3. 开始写代码：先读 [工程约定](CONVENTIONS.md)，再看 [开发与扩展指南](DEVELOPMENT.md)。
4. 需要理解数据、接口或 C 端：分别阅读 [基础架构](ARCHITECTURE.md)、[API 索引](API.md)、[C 端基础门户](CLIENT-PORTAL.md)。
5. 做天赋业务：看 [天赋系统本地闭环](TALENT-LOCAL.md)（Mock 数据、菜单口径、验收顺序）。
6. 提交、发布或验收：使用 [质量门禁与验收](QUALITY.md) 和 [本地开发与部署](DEPLOYMENT.md)。
7. 上线运维：首次安装看 [生产环境首次部署指引](PRODUCTION-SETUP.md)；日常按 [运维手册](OPERATIONS.md)。
8. 核对商务口径或原型：看 [天赋正式开发交接包](天赋正式开发交接包/README.md)（报价单、功能清单、流程图与静态原型）。

## 文档地图

| 文档 | 用途 |
| --- | --- |
| [当前状态快照](STATUS.md) | 分支、服务、账号、规模、门禁结果与已知缺口；数字类信息以此为准 |
| [5 分钟快速开始](QUICK-START.md) | 依赖、PocketBase 二进制、`.env`、新库初始化、初始账号、最小闭环 |
| [工程约定](CONVENTIONS.md) | 前后端、PocketBase、文件 URL、API、安全、测试与 UI 硬性规则 |
| [开发与扩展指南](DEVELOPMENT.md) | 新能力 / 业务模块的落点、B/C 端规范、数据与权限闭环 |
| [基础架构](ARCHITECTURE.md) | 单 PocketBase 边界、集合清单、请求路径与扩展边界 |
| [API 索引](API.md) | 当前 Nitro 路由、认证边界和 API 变更检查清单 |
| [C 端基础门户](CLIENT-PORTAL.md) | 双 Tab、环境变量、账户流程、主题和微信认证 |
| [天赋系统本地闭环](TALENT-LOCAL.md) | 本地库初始化、Mock 数据、账号、菜单口径与验收顺序 |
| [质量门禁与验收](QUALITY.md) | 风险分级验证、完整命令、初始化烟测和发布检查表 |
| [本地开发与部署](DEPLOYMENT.md) | 运行时变量、构建产物和单实例部署边界 |
| [生产环境首次部署指引](PRODUCTION-SETUP.md) | 全新服务器从零到上线：系统准备、生产变量、干净库初始化、首次部署 |
| [运维手册](OPERATIONS.md) | 迭代发布、PB 升级、回滚、备份恢复、崩溃/重启、故障排查 |
| [脚本说明](SCRIPT-GUIDE.md) | 初始化、开发、检查与构建命令的影响范围 |
| [天赋正式开发交接包](天赋正式开发交接包/README.md) | 天赋专项材料：**天赋专项报价单（48,000 元，后台管理 + C 端小程序，4 个 Sheet）**、逐行功能清单、口径留痕、流程图与静态原型（原型为旧口径） |
| [天赋功能验收映射](implementation/天赋功能验收映射.md) | 822 行报价功能的逐行映射与证据（2026-09-22 快照，状态列已滞后） |
| [天赋专项正式开发计划](implementation/天赋专项正式开发计划-2026-11-16.md) | PRD v1.1 对照现状的差距分析、架构评估、里程碑排期与风险（2026-11-16 评审稿） |
| [开发留痕](implementation/开发留痕.md) | 按时间追加的实现与验收流水（历史，非当前口径） |
| [AI 研发工作台](ai-workbench/README.md) | 角色、模型路由、kanban、worktree、任务卡与验收节奏（2026-11-16 建立） |
| [M1 规则域规格](specs/M1-rules/spec.md) | PRD §6.3–6.5 的实现合同：6 集合、31 条 API、3 个 B 端页（v1.1，待实现） |
| [M1 规则域验收](specs/M1-rules/acceptance.md) | AC-ADM-03/04/05 追溯表、测试命令与证据表（待 verifier 填） |
| [M0 密钥止血](specs/M0/security-remediation.md) | `.env` / `.deploy.env` / `cc-connect-config.toml` 出库与轮换步骤（P0，待人工执行） |

## 架构边界

- Nuxt 始终通过 `getAdminPB()` 使用唯一 PocketBase；不使用 `TENANT_MODE`、站点 cookie、`X-Site-Slug` 或按请求切换数据源。
- `site_config` 是唯一站点的公开品牌配置，保存名称、Logo、主题和门户默认外观；微信 AppSecret 在独立的加密配置中维护。
- `scripts/setup.mjs` 只支持空数据目录。检测到旧业务集合会拒绝执行，绝不迁移、删除或清理既有业务库。
- C 端固定为“首页 / 我的”双 Tab。首次微信认证创建中性账户；主题只跟随后台站点配置，不提供用户侧外观开关。
- 天赋业务字段只落在 `talent_*` 集合，不回填 `users` / `configs`。

## B 端页面地图

| 模块 | 页面与用途 |
| --- | --- |
| 天赋业务 | 天赋工作台、平台会员、服务商授权、培养计划审核；天赋规则（分类与要素 / 分级与固定注解 / 匹配规则 / 内容库与培育内容）；天赋报告（报告列表 / 报告接收 / 同步配置） |
| 机构业务 | 会员管理 > 会员列表 / 报告列表（服务商另有培养计划） |
| 账户与 RBAC | 个人资料、用户、角色、菜单、部门、岗位 |
| 基础配置 | 字典、参数设置、站点配置、微信配置、机构管理 |
| 运行与审计 | 系统健康、错误监控、在线用户、登录日志、操作日志 |

## 不在本仓库的内容

多站点控制平面、订单、商城、预约、营销、分销、开放 API、实体构建器、检测样本 / 实验室 / 送检 / 物流，以及已被 2026-09-24 新模型取代的培训机构、课程、课表与计划课程。新增业务应作为独立模块接入，不要恢复已删除的旧代码或旧命令。

## 验证入口

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm client:typecheck
pnpm build
pnpm client:build:h5
pnpm client:build:mp
pnpm e2e          # 首次需 pnpm exec playwright install chromium
```

命令会读取仓库当前环境；本地地址统一使用 `127.0.0.1`，不要使用 `localhost`。

文档应随代码一起更新。涉及集合、路由、环境变量、菜单权限、C 端导航或主题时，按 [QUALITY.md](QUALITY.md#文档与仓库卫生) 的清单核对，不能只更新 README；会漂移的数字写入 [STATUS.md](STATUS.md)。
