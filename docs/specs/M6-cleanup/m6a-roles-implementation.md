# M6-A · 三角色与工作台权限码实现证据

> 状态：**实现完成（2026-11-17，implementer / task-41）；本文只覆盖 M6 的「角色 / 菜单授权 / 工作台拆码」，不含 M6-B 的旧集合 / 页面 / API 删除**。
> 依据：[M6 规格](spec.md) §6、[ADR 0006](../../adr/0006-m6-cleanup-and-roles.md) D3、PRD §2 角色与权限 / §6.8 系统管理、`AGENTS.md` 硬约束。
> 证据口径：临时空库 8102（`/tmp/tj-pb/pocketbase` + 独立 data dir）+ 演示库 8090；演示库测试后已按快照恢复角色 / 菜单 / role_menus / 账号。

---

## 1. 交付范围

| 项 | 状态 | 落点 |
| --- | --- | --- |
| 新增 `talent:dashboard:list` 权限码 | 完成 | `scripts/setup.mjs`：`FOUNDATION_RBAC_PERMISSION_CODES`、`FOUNDATION_ACTION_MENU_DEFS`、`TALENT_PAGE_MENU_DEFS` |
| 工作台 C 菜单 / F 行改码（旧码 `talent:report:list` 仍由基因报告承载） | 完成 | `scripts/setup.mjs` `seedMenus`：旧 F 行原位改码 + C 菜单 upsert |
| dashboard 接口改 `requirePermission("talent:dashboard:list")` | 完成 | `server/api/admin/talent/dashboard.get.ts`（本任务唯一 server 例外） |
| `customer-admin` 存量 roleKey 升级为「平台运营管理员」 | 完成 | `scripts/setup.mjs` `TALENT_ROLE_DEFS` + `syncTalentBusinessRoles`（按 roleKey 复用旧行，不新建 `platform-operator`） |
| 新增 `report-reviewer` / `rule-configurator` 角色与矩阵化 `role_menus` | 完成 | 同上；由 `sync-talent.mjs` / `seed-accounts.mjs` 调用 |
| 测试账号（平台运营 / 报告审核 / 规则配置） | 完成 | `scripts/seed-accounts.mjs` |
| 角色矩阵 / 拆码 / 菜单 / 越权单测 | 完成 | `test/talent-roles.test.ts`（12 用例） |
| 旧集合 / 页面 / API / 旧码 / 旧菜单 | **未删除（按任务边界留 M6-B）** | `setup/sync` 中旧定义与旧 F 行保留，仅从三角色授权中排除 |
| 机构端 / C 端 | 未改 | — |

**单实例单 PocketBase、`talent_*` 边界、不回填 `users`/`configs`、不碰真实 `pb_data`、不 commit / 不切分支** 均遵守。

---

## 2. 角色矩阵（实现值）

角色菜单 = 「启用 C 菜单 + 该角色权限码对应的 F 行 + 业务分组祖先」；系统管理 / 运行监控不下放。

| 角色 | `roleKey` | 显示名 | C 菜单 | F 动作行 | 分组 | 权限码 |
| --- | --- | --- | --- | --- | --- | --- |
| 平台运营管理员 | `customer-admin`（沿用旧角色） | 平台运营管理员 | 7 | 31 | 天赋规则 / 报告管理 | 35 |
| 报告审核员 | `report-reviewer` | 报告审核员 | 4 | 9 | 报告管理 | 10 |
| 规则配置员 | `rule-configurator` | 规则配置员 | 4 | 14 | 天赋规则 | 17 |
| 超级管理员 | `superadmin` | 超级管理员 | 全部 23 条平台页 | 全部 F 行 | 4 组 | 全部 |

| 菜单 | 平台运营 | 报告审核 | 规则配置 |
| --- | --- | --- | --- |
| 工作台 `/admin/talent/dashboard`（`talent:dashboard:list`） | ✅ | ✅ | ✅ |
| 会员管理 `/admin/talent/member` | ✅ 全功能 | ✅ 只读（`parent:list` / `parent:view`） | ❌ |
| 潜质要素 / 分级与固定注解 / 培养方向管理 | ✅ | ❌ | ✅ |
| 基因报告 `/admin/talent/reports` | ✅ | ✅（`list`/`view`/`publish`） | ❌ |
| 培育建议 `/admin/talent/advice` | ✅ | ✅（`list`/`view`/`publish`/`export`） | ❌ |
| 系统管理 / 运行监控 | ❌ | ❌ | ❌ |

- 报告审核员**不含** `talent:report:sync`、`talent:advice:sync`、`talent:parent:idno` 与任何会员写码（M6 规格 §6.4 / AC-M6-05 明确 403；任务摘要里的「report: list/view/sync/publish」按规格取前两者 + publish，不给 sync）。
- 规则配置员 = M1 全部 15 码 + `talent:direction:merge` + 工作台码；不含会员 / 报告 / 建议码。
- 平台运营 = M1 15 + M2 9 + M3 4 + M4 1 + M5 5 + 工作台 1 = 35 个业务码；旧 `talent:customer:*` / `talent:content:*` / `talent:report:revoke|edit|receive` / `talent:institution:*` / `talent:plan:*` / `talent:service:*` / `talent:sync:*` 不授予三角色（旧码仍在册留 M6-B 归零）。

---

## 3. 测试账号（口令只从环境变量 / dev 默认读取，不写真实凭据）

| 用户名 | 邮箱 | 角色 | 口令来源 |
| --- | --- | --- | --- |
| `superAdmin` | `superadmin@tongjia.local` | 超级管理员 | `SUPERADMIN_PASSWORD`（缺省为既有 dev 值，脚本只提醒不打印） |
| `admin` | `admin@tongjia.local` | 平台运营管理员（`customer-admin`） | `PLATFORM_OPERATOR_PASSWORD` 或兼容 `CUSTOMER_ADMIN_PASSWORD` |
| `reviewer` | `reviewer@tongjia.local` | 报告审核员 | `REPORT_REVIEWER_PASSWORD` |
| `rule-config` | `ruleconfig@tongjia.local` | 规则配置员 | `RULE_CONFIGURATOR_PASSWORD` |

- `seed-accounts.mjs` 可重复执行：角色 / `role_menus` upsert + 越权清理；**已存在账号不重置口令**（避免脚本改掉开发 / 演示库密码），只校正资料与角色绑定。
- 断言：内置 `admin`（通配）角色不得绑定任何账号；三角色不得出现系统管理 / 运行监控菜单。
- 生产口令由环境变量覆盖；文档与输出均不包含真实凭据。

---

## 4. 验证证据

### 4.1 静态 / 单测（本机）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `node --check scripts/setup.mjs scripts/sync-talent.mjs scripts/seed-accounts.mjs` | 0 | `NODE_CHECK_OK` |
| `npx eslint scripts/setup.mjs scripts/sync-talent.mjs scripts/seed-accounts.mjs server/api/admin/talent/dashboard.get.ts test/talent-roles.test.ts` | 0 | 无告警输出 |
| `pnpm typecheck` | 0 | 仅既有 `Duplicated imports` WARN，无 TS error |
| `npx vitest run test/talent-roles.test.ts` | 0 | 12 passed（矩阵 / 拆码 / 菜单 / 旧角色 / 越权正反） |
| `pnpm test` | 1 | 612 passed / 1 skipped / **2 failed 均在 `test/talent-ui-closure.test.ts` 的 M7-A C 端占位页断言**（并行 M7 正在重写 `apps/client/src/pages/**`，与本任务文件无交集；本任务新增 12 用例全通过） |
| `git diff --check`（改动文件） | 0 | 无空白错误 |

### 4.2 临时空库（8102，`/tmp/tj-pb/pocketbase` + 临时 data dir）

```bash
POCKETBASE_URL=http://127.0.0.1:8102 POCKETBASE_DATA_DIR=/tmp/tj-m6a-data \
POCKETBASE_BINARY=/tmp/tj-pb/pocketbase node scripts/setup.mjs
# → ✓ 基础版初始化完成：53 个集合

POCKETBASE_URL=http://127.0.0.1:8102 node scripts/sync-talent.mjs   # 第 1 次 exit 0
POCKETBASE_URL=http://127.0.0.1:8102 node scripts/sync-talent.mjs   # 第 2 次 exit 0
POCKETBASE_URL=http://127.0.0.1:8102 node scripts/seed-accounts.mjs # exit 0
```

- 连续两次 sync 的 `m6Roles` 统计完全一致（幂等）：平台运营 40 菜单 / 7 C / 31 F / 35 码；审核 14 / 4 / 9 / 10；规则 19 / 4 / 14 / 17；`superAdminMenus=124`。
- `dashboardPermissionCode=talent:dashboard:list`、`m6BusinessPermissionCodes=35`。
- 空库 bootstrap 模拟（角色菜单 + 祖先展开）：平台运营侧栏 = 工作台 / 会员管理 / 天赋规则 / 报告管理；审核 = 工作台 / 会员管理 / 报告管理；规则 = 工作台 / 天赋规则；三角色系统 / 监控菜单 0 条；内置 `admin` 角色绑定账号 0 个。

### 4.3 演示库 8090（Nuxt `127.0.0.1:3000` 实测 bootstrap 与接口 403）

对演示库执行 `talent:sync` + `accounts:seed` 后，用 4 个账号登录 `POST /api/public/admin-login`，取 `GET /api/admin/bootstrap` 菜单树并直调接口；测试后已恢复。

| 账号 | bootstrap C 菜单 | dashboard（`talent:dashboard:list`） | reports（`report:list`） | report sync-logs（`report:sync`） | levels（M1） | 会员 id-no（`parent:idno`） | `/api/admin/role`（system） | `/api/admin/monitor/health`（monitor） |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `superAdmin` | 全部（含系统管理 / 运行监控） | 200 | 200 | 200 | 200 | 200 | 200 | 200 |
| `admin`（平台运营） | 7 业务页 | 200 | 200 | 200 | 200 | 200（假 ID → 404 数据不存在，非 403） | 403 | 403 |
| `reviewer`（报告审核） | 工作台 / 会员管理 / 基因报告 / 培育建议 | 200 | 200 | **403** | **403** | **403** | 403 | 403 |
| `rule-config`（规则配置） | 工作台 + 天赋规则 3 页 | 200 | **403** | **403** | 200 | **403** | 403 | 403 |

补充反例（`POST` 校验通过后鉴权）：

| 接口 | 平台运营 | 报告审核 | 规则配置 |
| --- | --- | --- | --- |
| `POST /api/admin/talent/reports/sync`（`mode=preview`，零写入） | 200 | 403 | 403 |
| `POST /api/admin/talent/advice/versions` | 200 | 403 | 403 |
| `GET /api/admin/menu/tree` / `/api/admin/log/oper` | 403 | 403 | 403 |

> 工作台拆码生效的核心证据：规则配置员 `GET /dashboard` = 200 且 `GET /reports` = 403；报告审核员有 `report:publish` 但 `report:sync` = 403。

**演示库恢复**：测试前对 `roles` / `menus` / `role_menus` / `users` / `user_roles` 做行快照；测试后按快照回滚（含把误触发的培育建议新版本与 2 份建议文档、对应 sync/oper 日志删除，恢复 V2026.11 为 active）。恢复后核对：角色 4 行、菜单 124 行、`role_menus` 169 行且 `roleId|menuId` 对集合与快照 **0 差异**、账号 3 行、用户角色 3 行；`customer-admin` 显示名回到「客户管理员」、工作台菜单码回到 `talent:report:list`（即 M6-B 前的状态）。演示库仅保留验证期间的登录日志（审计用途，未删除他人日志）。

---

## 5. 改动文件

| 文件 | 改动 |
| --- | --- |
| `scripts/setup.mjs` | 工作台新码 + F 行改码；导出 `TALENT_*` 权限码 / 页面定义 / 三角色矩阵与纯函数 `resolveTalentRoleMenuIds`、幂等 `syncTalentBusinessRoles` |
| `scripts/sync-talent.mjs` | 复用 setup 的权限码与矩阵；新增工作台拆码、35 码覆盖、三角色菜单 / 系统监控隔离断言；输出 `m6Roles` |
| `scripts/seed-accounts.mjs` | 四角色 / 四账号种子；`customer-admin` 升级显示名；幂等 `role_menus`；内置 `admin` 不绑定账号断言；已存在账号不重置口令 |
| `server/api/admin/talent/dashboard.get.ts` | `requirePermission("talent:dashboard:list")`，移除 `talent-business` 依赖（本任务唯一 server 例外） |
| `test/talent-roles.test.ts`（新增） | 12 个纯单测：35 码 / 工作台拆码 / 三角色菜单与越权 / 旧码保留 / 幂等静态契约 |
| `test/talent-member-api.test.ts`、`test/talent-rule-api.test.ts` | 仅把「sync 源码含权限码字面量」断言改为「统一从 setup 矩阵导出 + setup 含字面量」，保持 M1/M2 原意 |

---

## 6. 未完成 / 留给后续

1. **M6-B 删除**（旧集合 / 旧页面 / 旧 API / 22 个旧码 / 12 条旧 C 菜单 / 25 条旧 F 行 / 机构端）不在本任务；三角色已不授予旧码，但旧资产仍存在于代码与菜单表（`status="0"` 或保留行）。
2. **M6-C/M6-D 的角色收敛在存量库的最终执行**：生产升级需在维护窗口执行 `pnpm talent:sync`（加角色 / 收敛菜单）与 `pnpm accounts:seed`；本次只在临时库与演示库验证。
3. **E2E `06-m6-cleanup` 与全量 AC-M6 取证**归 M6-E / verifier；本任务只提供单元与手工 API 证据。
4. `recordTalentRoleChange` 的 `oper_logs` 审计：角色种子脚本以超管直连 PB 写入，当前**未**额外写操作日志；若验收要求「角色新增 / 授权变更写日志」，需在 M6-E 用 API 路径或补 `oper_logs`（M6 规格 §6.7.5）——列为已知缺口，不伪报通过。
5. `pnpm test` 当前唯一失败为并行 M7-A C 端占位页断言（`test/talent-ui-closure.test.ts`），与本任务改动无关，合入前需由 M7 任务收口。