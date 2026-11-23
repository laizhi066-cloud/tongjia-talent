# M6-B · 旧口径代码清理与迁移脚本（实现清单 + dry-run 证据）

| 项 | 内容 |
| --- | --- |
| 状态 | **代码清理完成（2026-11-17，implementer-m6b / task-43）；真实数据删除未执行（按约束只做 dry-run）** |
| 依据 | [M6 规格](spec.md) §2/§4/§5/§6、[M6 验收](acceptance.md) AC-M6-01/02/03/08、[ADR 0006](../../adr/0006-m6-cleanup-and-roles.md) D1/D2/D4/D5、[ADR 0007](../../adr/0007-m7-client-portal.md)、[ADR 0008](../../adr/0008-m8-integration-pdf.md) |
| 边界 | **不 commit / 不切分支；不删除演示库或真实 `pb_data` 的任何集合 / 记录**；只改 task-43 允许路径 |
| 前置 | M6-A 已完成三角色 + 工作台拆码（[m6a-roles-implementation.md](m6a-roles-implementation.md)）；M7 / M8 新路由与页面已落地 |

> 本文是 M6-B 的**执行清单与证据**，不代表 M6 验收通过：集合 / 旧行 / 旧字段的真实删除要在备份与恢复演练后由
> `pnpm migration:m6 -- --confirm-m6 ...` 在生产 / 演示库执行（本文只做 dry-run），验收证据由 verifier 按
> [acceptance.md](acceptance.md) 回填。

---

## 1. 代码清理清单（已删除 148 个文件）

| 类别 | 数量 | 路径 / 说明 |
| --- | --- | --- |
| 平台 admin 旧 API | 56 | `server/api/admin/talent/[resource]*`、`customer/**`、`report/**`、`institution/**`、`authorization*`、`plan/**`、`plan-selections*`、`template/**`、`matching*`、`sync-config*`、`sync-logs*`、`level-copy`、`level-status`（与 spec §2.4 的 56 条一致） |
| 机构端 API | 16 | `server/api/org/talent/**`（`context` / `members/**` / `reports/**` / `plans/**` / `authorizations`） |
| 旧 C 端 API | 13 | `binding.get`、`bindings/[customerId].put`、`plans`、`plan-selections*`、`reports/[id]/{books,categories,interpretations,items,pdf,progress.get,progress.put}`；保留 M2 `bindings.get/claim`、M7 `summary/reports/volumes/factors/advice/directions/profile/children/selections`、M8 PDF 路由 |
| 旧 integration | 1 | `server/api/integrations/talent/reports.post.ts`；保留 M8 的 `gene-reports/sync`、`gene-query/receipts`、`advice/sync` |
| 旧 server/utils | 18 | `talent.ts`、`talent-admin.ts`、`talent-business.ts`、`talent-csv.ts`、`talent-customer-relations.ts`、`talent-export.ts`、`talent-external-sync.ts`、`talent-institution{,-role}.ts`、`talent-matching.ts`、`talent-plan-recommendation.ts`、`talent-report-{service,pdf,lifecycle}.ts`、`talent-sync-{config,log,scheduler}.ts`、`talent-ai.ts` |
| 旧插件 | 1 | `server/plugins/talent-report-sync.ts`（定时拉取旧集合） |
| 旧 shared | 3 | `shared/types/talent-business.ts`、`shared/types/talent-import.ts`、`shared/utils/talent-report.ts`；`shared/types/talent.ts` 裁剪为只含 `TalentStatus` |
| 平台旧页面 | 11 | `app/pages/admin/talent/{[resource],authorization,element,import,institution,level,library,matching,plan,receive,sync}.vue` |
| 平台旧组件 | 12 | `app/pages/admin/talent/components/` 整目录（11 个 Form/Pdf 组件 + `types.ts`） |
| 机构端页面 | 3 | `app/pages/org/talent/{members,reports,plans}.vue`（`app/pages/org/` 整目录移除） |
| 旧前端工具 | 4 | `useTalentAdminApi.ts`、`useTalentBusinessApi.ts`、`useTalentOrgType.ts`、`app/utils/talent-admin-presentation.ts` |
| 旧测试 | 12 | `talent-admin-presentation`、`talent-admin`、`talent-csv`、`talent-customer-relations`、`talent-minimal-closure`、`talent-recommendation-institution`、`talent-report-completeness`、`talent-report-lifecycle`、`talent-ui-closure`、`talent-matching`、`talent-progress`、`talent-ai` |
| 旧种子 | 1 | `scripts/seed-talent.mjs` 与 `package.json` 的 `talent:seed`（会清空天赋业务数据，PRD BR-14 明确移除） |
| 旧 e2e | — | `scripts/e2e/03-ingest.mjs` 删除；01/02/04/05 重写为新域 / 三角色 / C 端 M7 用例；新增 `06-m6-cleanup.mjs` |

**共享 helper 迁移（删除前已完成，避免新功能 500）**

| 旧位置 | 新位置 | 调用方更新 |
| --- | --- | --- |
| `talent-matching.ts#calculateTalentAge` | `server/utils/talent-age.ts`（新增，纯函数 + `parseTalentDate`） | `talent-report-api.ts`、`talent-client-api.ts`、`talent-advice.ts`、`talent-report-source.ts` |
| `talent-export.ts#encodeTalentCsv/TalentCsvValue` | `server/utils/talent-csv-format.ts`（新增，BOM/CRLF/转义） | `talent-rule-api.ts`、`talent-advice-api.ts` |
| `talent-report-pdf.ts#fetchTalentReportPdfSource` | 旧 C 端 PDF 代理已删除；M8-A 的 `talent-pdf-service.ts` 承接 | 无需迁移（旧路由已删） |

**Foundation 引用修复**

- `server/api/admin/user/index.get.ts`：移除对已删除 `talent_user_institutions` 的机构成员查询；`app/pages/admin/user/index.vue` 同步删除「天赋机构」列。
- 登录回跳与兜底：`safe-admin-redirect.ts` / `admin-landing.ts` / `super-guard.ts` / `error.vue` / `pages/index.vue` 从 `/admin/talent/customer` 改为 `/admin/talent/dashboard`，并停止放行 `/org/talent/**`。
- `app/composables/useMenuTree.ts`：删除 12 个旧 `TALENT_PATHS` 与整段 `TALENT_ORG_PATHS`，仅保留工作台 / 会员管理 / 天赋规则 / 报告管理 / 培育建议。

---

## 2. `scripts/setup.mjs`（新库只建新集合）

- `COLLECTION_DEFS` 删除 19 个旧集合定义；`talent_*` 只剩 **17 个**保留集合
  （M2/M1/M3/M5/M4-B/M8：`talent_parents`、`talent_children`、`talent_levels`、`talent_gene_reports`、
  `talent_reports`、`talent_sync_logs`、`talent_reading_progress`、`talent_factor_libraries`、`talent_factors`、
  `talent_factor_notes`、`talent_directions`、`talent_tiers`、`talent_direction_requests`、`talent_advice_versions`、
  `talent_advice_docs`、`talent_report_pdfs`、`talent_pdf_downloads`）。
- 删除 17 条旧索引（`idx_talent_customers_no` … `idx_talent_content_libraries_name`、`idx_talent_levels_element_level`）；
  保留 `idx_talent_reports_no` / `idx_talent_levels_code|sort` / `talent_reading_progress` / M1–M8 新索引。
- `talent_levels` 删除旧字段 `elementId/levelCode/levelName/annotation` 与旧要素关系；`talent_reports` 删除 `customerId` 关系。
- `FOUNDATION_ACTION_MENU_DEFS` 删除 25 条旧 F 行；`FOUNDATION_RBAC_PERMISSION_CODES` 删除 22 个旧权限码；
  在册业务码 = 35（M1 15 + M2 9 + M3 4 + M4 1 + M5 5 + 工作台 1）。
- `seedMenus` 删除「服务商授权 / 培养计划审核 / 分类与要素 / 匹配规则 / 内容库 / 报告接收 / 同步配置」归档块、
  机构端 3 个 C 页、旧「工作台 / 会员管理 / 培养方向 / 机构业务」分组、「机构管理」系统页与「培养方向」旧分组；
  `SYSTEM_AND_MONITOR_MENU_PATHS` 移除 `/admin/talent/institution`。
- 新增归零清单常量（单测 / sync / 迁移脚本共用，避免多处漂移）：
  `LEGACY_TALENT_COLLECTION_NAMES`（19）、`LEGACY_TALENT_COLLECTION_DELETE_ORDER`（19，被引用者后删）、
  `LEGACY_TALENT_PERMISSION_CODES`（22）、`LEGACY_TALENT_MENU_PATHS`（16，含旧 customer/report/content/template）、
  `LEGACY_TALENT_GROUP_NAMES`（4）、`LEGACY_TALENT_ROLE_KEYS`（2）。
- `assertFreshFoundationDatabase` 保持不变：既有库（含旧集合）仍会拒绝 `env:setup`，不清库、不迁移。

## 3. `scripts/sync-talent.mjs`（存量库只加新域，不建 / 不修补旧集合）

- 删除旧集合创建 / 补丁：`talent_customer_bindings`、import batches/rows、`talent_customers` 字段补丁、
  `talent_levels` 旧字段放宽、`talent_reports.customerId` 放宽、内容库 / 模板 / 机构 / 计划 / 报名 / 接收 / 发布集合与旧索引。
- 保留：M1–M8 新集合 / 字段 / 关系 / 索引的幂等补齐；`talent_reading_progress` 唯一索引；`talent_sync_logs` M3 字段。
- 新增 M6 清理块（只删**菜单 / 角色配置**，不删业务数据、不删集合）：
  - 旧 C 行 → 旧 F 行 → 旧分组行（先删 `role_menus` 引用）顺序删除；
  - 删除机构角色 `talent_agent` / `talent_service_provider` 及其 `role_menus` / `user_roles`（账号只停用不删除，由运维执行）；
  - 断言：旧菜单 path / 旧权限码 / 旧分组 0 行；机构角色不存在；35 个业务码全部有 C/F 行；三角色矩阵与系统 / 监控隔离；
  - 输出 `m6Cleanup` 统计；旧集合仍存在时只告警并提示执行 `pnpm migration:m6`（sync 不删除存量数据）。
- `scripts/seed-accounts.mjs` / `app/composables/useMenuTree.ts` 沿用 M6-A 三角色矩阵，不随清理回退。

## 4. `scripts/cleanup-m6.mjs`（新增；默认 dry-run）

```bash
# 只读盘点（默认）：只打印将删除的集合 / 记录 / 菜单 / 权限码 / 角色，写 schema + dry-run 报告
pnpm migration:m6 -- --dry-run --pb-url=http://127.0.0.1:8090 --data-dir=/path/to/pb_data
# 正式删除：四参数缺一即拒绝；备份必须存在 / 非空 / sha256 / 24h 新鲜度
pnpm backup:pb --dir=backups-m6
pnpm migration:m6 -- --pb-url=... --data-dir=... --backup=backups-m6/<key>.zip --confirm-m6 \
  [--export-csv=backups-m6/legacy] [--allow-production] [--max-backup-age-hours=24]
```

- 默认模式 = dry-run（无 `--confirm-m6` 永不删除；`--dry-run` 与 `--confirm-m6` 互斥）。
- 目标显式：`--pb-url` / `--data-dir` 必须与 `POCKETBASE_URL` / `POCKETBASE_DATA_DIR` 一致；只给其一或二者不一致即拒绝。
- 备份门槛：存在、非空、sha256 可算、mtime 在阈值内；若存在 `backups-m6/m6-backup-manifest.json` 则比对 sha256。
- 拒绝 `--force` / `--reset` / `--clean` / `--drop-all`；不调用 `setupFoundation`、不含 `rmSync` / `unlinkSync`；
  `PROTECTED_COLLECTIONS` 显式保护 Foundation（users/roles/menus/configs/oper_logs/login_logs/uploads…）与 17 个新域集合。
- 删除范围只来自 `LEGACY_TALENT_COLLECTION_DELETE_ORDER` 与旧字段 / 旧行 / 旧菜单 / 旧角色清单；顺序：旧字段 / 旧索引 → 旧行 →
  旧菜单 + 旧角色 → 旧集合。
- 产物：`m6-schema-before.json`、`m6-cleanup-report.json`、dry-run 报告 JSON；正式执行写 `oper_logs`（目标 URL、备份 sha256 摘要、
  删除计数、操作人，脱敏）；失败即中止不重试，提示整库恢复（ADR 0006-D6）；`pending=0` 时幂等安全退出。

---

## 5. dry-run 结果（只读，未删除任何数据）

| 目标 | 模式 | pending | 旧集合 | 旧记录 | 旧菜单 | 旧码 | 旧字段 | 旧角色 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 演示库 `127.0.0.1:8090`（`/tmp/tongjia-demo-pb`，M6-A 测试后状态） | dry-run | **61** | 19/19 存在 | 0 | C 10 / F 24 / 分组 3 | 34 行（22 个码） | `talent_levels` 4 个 + `talent_reports.customerId` + 旧索引 | 0 | [dry-run-report.json](dry-run-report.json)、[evidence/m6-schema-before.json](evidence/m6-schema-before.json) |
| 新库 8103（`env:setup` + `talent:sync`×2 后） | dry-run | **0** | 0/19 | 0 | 0 | 0 | 0 | 0 | [dry-run-report-newdb.json](dry-run-report-newdb.json)、[evidence/newdb/m6-schema-before.json](evidence/newdb/m6-schema-before.json) |

- 演示库 dry-run 为**只读**：未删除任何集合 / 记录 / 菜单 / 角色；旧集合当前 0 记录（M6-A 验证期间的演示数据已回滚），
  但 19 个旧集合定义、旧菜单行与旧字段仍存在，必须走「备份 → 恢复演练 → `--confirm-m6`」才能归零。
- 新库 pending=0 证明 `setup.mjs` / `sync-talent.mjs` 不再创建旧集合、旧字段、旧菜单与旧权限码（AC-M6-02 的「新库不创建」部分）。

### 5.1 迁移脚本安全门槛自测

| 场景 | 命令 | 期望 | 实际 |
| --- | --- | --- | --- |
| 缺 `--backup` + `--confirm-m6` | `cleanup-m6.mjs --pb-url ... --data-dir ... --confirm-m6` | 非 0 退出 | exit 2，提示「正式删除必须提供 --backup」 |
| 禁用参数 `--force` | `cleanup-m6.mjs --force --dry-run` | 非 0 退出 | exit 2，提示不支持清库 / 重置 |
| `--pb-url` 与环境不一致 | `--pb-url=http://127.0.0.1:9999` | 非 0 退出 | exit 2，提示与 `POCKETBASE_URL` 不一致 |
| 默认模式 | `cleanup-m6.mjs --pb-url ... --data-dir ...`（无 `--confirm-m6`） | dry-run | 只读盘点 + 报告 |

---

## 6. 门禁与证据（本机）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 语法 | `node --check scripts/cleanup-m6.mjs scripts/setup.mjs scripts/sync-talent.mjs` + e2e 全部 | 通过 |
| 类型 | `pnpm typecheck` | exit 0（仅既有 `Duplicated imports` WARN） |
| Lint | `pnpm lint` | exit 0 |
| 单测 | `pnpm test` | **573 passed / 1 skipped（33 个测试文件）**（删除 12 个旧测试后；新增 `test/m6-cleanup-plan.test.ts` 15 用例） |
| 构建 | `pnpm build` | exit 0（`.output` 无旧路由 chunk、无旧 path 字符串） |
| 新库集合数 | 临时空库 8103 `env:setup` | **34 个集合**（M6-A 证据为 53 个 → 减少 19 个旧集合） |
| 存量库幂等 | 8103 `talent:sync` ×2 | 两次 exit 0，`m6Roles` 完全一致（平台运营 40 菜单 / 7C / 31F / 35 码；审核 14/4/9/10；规则 19/4/14/17），`m6Cleanup.legacyMenusInDatabase=0`、`legacyCollectionsRemaining=0` |
| 旧 URL 静态断言 | `test/m6-cleanup-plan.test.ts` | 48 个旧文件 / 旧路径不存在；`useMenuTree` 无旧 path / 无 `TALENT_ORG_PATHS` |
| 旧菜单 / 旧码静态断言 | 同上 + `pnpm talent:sync` 输出 | 新库 8103 实测：菜单 85 行（M6-A 为 124）、`talent:*` 在册码 35、旧 path / 旧码 / 旧分组 0 行；存量库 sync 断言旧菜单 0 行、旧码 0 行 |

> 未跑：`pnpm client:typecheck` / `client:build:*`（M6-B 未改 `apps/client`，归 M7-M9）；`pnpm e2e`（需 Playwright +
> 已启动后台 / H5；M6-B 只交付套件代码与静态断言，执行取证归 verifier / M9）。

---

## 7. 遗留与后续（不伪报）

| 项 | 状态 | 说明 / 责任 |
| --- | --- | --- |
| 真实删除旧集合 / 旧行 / 旧字段 | **未执行（按约束）** | 需在维护窗口备份 + 恢复演练后执行 `pnpm migration:m6 -- --confirm-m6`；本文只交付 dry-run 证据 |
| 演示库 / 真实 `pb_data` | 未改动 | dry-run 只读；未运行 `talent:sync` / `accounts:seed`（会写菜单 / 角色），避免改动演示库 |
| 机构账号停用（`status="0"`） | 未执行 | 需迁移 / 运维在目标库执行；sync 只删除机构角色与授权，不删账号（ADR 0006-Q7） |
| 旧菜单 / 旧码在演示库仍存在 | 待迁移 | dry-run pending=61；执行 `migration:m6` 或 `talent:sync`（仅清理菜单 / 角色）后归零 |
| 文档同步（ARCHITECTURE / API / STATUS / TALENT-LOCAL / CLIENT-PORTAL / SCRIPT-GUIDE / OPERATIONS / AGENTS / specs README） | **未改（不在 task-43 允许路径）** | 归 M6 文档任务 / M6-E；`docs/SCRIPT-GUIDE.md` 的 `talent:seed` 行与 `docs/STATUS.md` 账号表需同步删除 / 更新 |
| 全量 E2E 执行与证据 | 未跑 | 需 Playwright + 运行中的后台 / H5；套件已重写（01/02/04/05/06），归 verifier / M9 |
| 旧数据 CSV 导出 | 未执行 | 迁移脚本已支持 `--export-csv`，正式删除时建议开启 |
| `.env` 的 `POCKETBASE_DATA_DIR` 指向旧机器路径（`/Users/cherish/...`） | 环境问题 | 本机跑迁移 / sync 时需临时覆盖该变量，否则脚本按设计拒绝执行 |
| 旧真实数据删除路径未对「有数据的旧库」演练 | 未验证 | 演示库旧集合当前 0 行，删除旧行的分支（`talent_levels.elementId != ""` / `talent_reports.subjectType = ""`）只有代码与单测级保障，正式执行前在隔离恢复副本上演练 |

## 8. 正式执行 runbook（交由 lead / 运维）

```bash
# 0) 冻结：停止天赋同步定时任务、确认无写入；创建 pre-m6-cleanup-<date> tag
# 1) 目标环境显式化（必须在目标 PB 所在环境执行）
export POCKETBASE_URL=... POCKETBASE_DATA_DIR=...

# 2) 备份 + sha256 + 恢复演练（隔离目录），记录 backup key / size / sha256
pnpm backup:pb --dir=backups-m6

# 3) dry-run 复核（本脚本只读）
pnpm migration:m6 -- --dry-run --pb-url="$POCKETBASE_URL" --data-dir="$POCKETBASE_DATA_DIR"

# 4) 正式删除（缺任一参数即拒绝；建议同时导出旧数据 CSV）
pnpm migration:m6 -- --pb-url="$POCKETBASE_URL" --data-dir="$POCKETBASE_DATA_DIR" \
  --backup="backups-m6/<key>.zip" --confirm-m6 --export-csv=backups-m6/legacy

# 5) 幂等复核：再次 dry-run 期望 pending=0；随后 pnpm talent:sync（只加新域 + 清理旧菜单/角色）
pnpm migration:m6 -- --dry-run --pb-url="$POCKETBASE_URL" --data-dir="$POCKETBASE_DATA_DIR"
pnpm talent:sync && pnpm accounts:seed

# 6) 冒烟 + e2e 06，回填 acceptance.md 证据；回滚只能整库恢复备份 + 切 tag（ADR 0006-D6）
pnpm e2e --only 06
```