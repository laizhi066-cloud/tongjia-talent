# M3 · 报告域规格（基因报告同步 / 报告发布快照 / 撤回恢复补发 / 一键同步）

> 状态：**待实现（2026-11-16，architect / task-10 交付实现合同）**。本文是 M3 的实现合同，只写 docs，不改源码。
> 依据：PRD §6.6（L258–300）、§8.2 gene_report/report（L470–490）、§8.3 报告状态机（L522–533）、§9 API（L539–557）、§10 权限与安全（L581–590）、§12 验收（L604–616）、BR-02/03/04/05/06/09/10/12（L96–110）；[M1 规格](../M1-rules/spec.md)、[ADR 0001](../../adr/0001-m1-rule-domain.md)（方向 `requirements` / 分级 `sortOrder` / 快照命名）；[M2 规格](../M2-members/spec.md)、[ADR 0002](../../adr/0002-m2-member-domain.md)（`subjectType`/`subjectId` 归属、解绑不删档、旧 `talent_reports.customerId` 过渡）；旧实现 `server/utils/talent-report-service.ts`、`talent-report-lifecycle.ts`、`talent-report-lock.ts`、`talent-report-pdf.ts`、`talent-external-sync.ts`、`talent-matching.ts`、`scripts/setup.mjs` 的 `talent_reports` / `talent_report_items` / `talent_sync_logs` / `talent_report_publications` / `talent_report_receipts`、旧页 `app/pages/admin/talent/[resource].vue` / `receive.vue` / `sync.vue`（只读，不修改）。
> 关键取舍：[ADR 0003 · M3 报告域关键决策](../../adr/0003-m3-report-domain.md)。
> 验收：见同目录 [acceptance.md](acceptance.md)（初始全部「未验证」）。
> 协作对齐：M4 架构（task-11）2026-11-16 已确认 `factorSnapshot`（含 `levelOrder`）、`directionSnapshot` 对象信封、`selections` 结构、`recordTalentReportVersion` helper、`refreshDirectionSnapshot` 增量补发纯函数；M4 只出纯函数，不写报告集合。
> 修订：v1（2026-11-16，首版）。

## 0. 决策基线（不再作为未决项）

本文采用的关键口径全部落在 ADR 0003-D1–D8；实现 agent 不得自行改口径：

| 决策 | 结论 | 本文落点 |
| --- | --- | --- |
| D1 快照存储 | **JSON 字段**（`factorSnapshot` / `volumeSnapshot` / `directionSnapshot` / `selections` / `versions`），不建子表；外部原始行存 `talent_gene_reports.sections` JSON | §3.1、§3.2、ADR D1 |
| D2 一人一份 | `talent_gene_reports` 与 `talent_reports` 各以 `(subjectType, subjectId)` 唯一；一个测评对象只有一份基因报告、一份报告 | §3.1、§3.2、§4.1、ADR D2 |
| D3 增量分册 | 外部编码 `A`–`F` ↔ 内部 `V1`–`V6` 固定映射；新增 = 外部已出 − 已开放；补发只追加新增册 | §3.2.2、§4.3、ADR D3 |
| D4 同步 | 一键同步 = 预演（只读）+ 确认（重算后写入）；三类归因 + 单条失败；幂等靠唯一键 | §4.2、§5、ADR D4 |
| D5 版本链 | 发布/补发/显式重算 `snapshotVersion+1`；撤回/恢复/方向选择**不改**快照版本；`versions[]` 追加动作历史 | §4.4、ADR D5 |
| D6 旧数据过渡 | `talent_reports` 增量改造（只加字段/索引/放宽 `customerId` 必填）；旧行、旧集合、旧页、旧码保留到 M6；新代码不读不写 `customerId` | §3.7、ADR D6 |
| D7 权限菜单 | 新权威码 `talent:report:list/view/sync/publish`；菜单「基因报告」重指向 `/admin/talent/reports`；旧码保留到 M6 | §2、ADR D7 |
| D8 模块边界 | M4 纯函数出方向命中；M3 不写建议集合（M5 派生可见性）；C 端页面 M7；PDF/真实外部源 M8；旧代码清理 M6 | §7、§8、ADR D8 |

**本文未决项 6 条客户/协作口径**见 §14；未决项不影响数据层开工。

## 1. 范围与不在范围

### 1.1 本里程碑交付

- **集合**：
  - 新建 `talent_gene_reports`（外部基因报告元数据 + 原始篇目，一人一份）；
  - **增量改造** `talent_reports`（新增归属、三态、快照三件套、版本历史、`selections`；旧字段保留）；
  - 扩展 `talent_sync_logs`（新增 `syncScope` / `mode` / 三类计数 / 逐人明细）。
- **类型与领域工具**：`shared/types/talent-report.ts`；`server/utils/talent-report.ts`（快照构建/状态机/版本链/映射/归属/C 端读模型/`recordTalentReportVersion`）、`server/utils/talent-gene-report.ts`（gene report 归一化/sections 校验/sanitize）、`server/utils/talent-gene-report-source.ts`（冻结适配器 + Mock）、`server/utils/talent-report-sync.ts`（候选枚举/三类归因/预演/提交/日志）。
- **服务端**：`server/api/admin/talent/reports/**` 14 条管理路由（§5.2）、`server/api/admin/talent/gene-reports/[id].get.ts`；Zod + `requirePermission` + `withOperLog`；复用 `withTalentReportLock` 串行化同一报告写操作。
- **B 端页面**：`app/pages/admin/talent/reports/index.vue`（列表 10 列 + 四项筛选 + 发布状态下拉带数量）+ 页面组件（详情 4 页签、发布/补发/撤回/恢复/重算弹层、一键同步预演确认弹层、基因报告弹层）；`app/composables/api/useTalentReportApi.ts`。
- **权限与菜单**：4 个权威权限码 + 菜单重指向 + `app/composables/useMenuTree.ts` 的 `TALENT_PATHS` 增加 `/admin/talent/reports`。
- **本地演示数据**：`scripts/seed-talent-report.mjs` + `pnpm talent:report:seed`（幂等、纯虚构、非生产）。
- **文档同步（M3 出口，由 lead 派发，不在本任务写范围）**：`docs/API.md`、`docs/ARCHITECTURE.md`、`docs/STATUS.md`、`docs/TALENT-LOCAL.md`。

### 1.2 不在范围（M3 不做，避免越界）

| 项 | 归属 | 说明 |
| --- | --- | --- |
| 方向命中算法、排序、推荐上限、档位推荐、自定义方向归并 | M4 | M3 **只调用** M4 纯函数（`computeTalentDirectionMatches` / `refreshDirectionSnapshot`），不实现算法；方向/档位配置页归 M4 |
| C 端方向选择/换档/取消接口与 `talent_direction_requests` | M4 | M4 写 `talent_reports.selections` 并调 M3 `recordTalentReportVersion`；M3 不建 C 端写入路由 |
| 培育建议集合、版本、发布撤回、与报告同发联动 | M5 | M3 只读 M5 数据；建议可见性由 M5 以报告状态为唯一真源派生（§8.2） |
| C 端小程序页面、报告中心、分册页、要素解读、下载入口 | M7 | M3 冻结 C 端只读契约与服务层守卫（§7），页面与 C 端路由 M7 实现 |
| PDF 生成/水印/时效地址/OSS 代理、真实外部基因报告接口、失败重试队列/告警 | M8 | M3 用可替换 Mock 源；新旧 `pdfUrl`/`pdfFileKey` 字段不写不删；详见 §8.4 |
| 旧页面/旧 API/旧集合/旧权限码/旧 e2e 的删除与重写 | M6 | `talent_report_items` / `talent_report_publications` / `talent_report_receipts` / `talent_report_templates` / `talent_report_template_items`、旧页、旧 `talent:report:revoke/edit/receive` 全部保留到 M6 |
| 旧 `talent_customers` / `customerId` 归属迁移、旧报告回填、历史数据修复 | M6 | M3 新建行 `customerId=""`；不迁移、不回填、不按 `customerId` 反查 |
| 会员同步、子女查询状态机、绑定/解绑 | M2 | M3 只消费 `talent_children` 的 `query="found"` 与 M2 解密/归属 helper |
| 报告「复测」多份模型 | 客户（PRD §13.2-3） | M3 按 BR-02 一人一份；复测口径未确认，不在 M3 预留多份 |
| 1000 条性能验收、e2e 重写 | M9 | M3 只保证索引与两段查询写法（§3.4、§13 R7） |
| 机构端报告列表/发布 | M6 | 机构端继续走旧 `/api/org/talent/reports` 与旧集合；M3 新码不授予机构角色 |

### 1.3 硬约束

- 单实例、单 PocketBase；不引入 `TENANT_MODE`、`site` cookie、`X-Site-Slug`、第二个 PB 连接。
- 业务字段只落 `talent_*`；不回填 `users` / `configs` / `site_config`。
- `scripts/setup.mjs` 只用于空数据目录；存量库变更只走 `scripts/sync-talent.mjs`，且只允许「加集合 / 加字段 / 加索引 / 放宽必填 / 菜单权限 upsert」，不删旧集合、不改旧数据（ADR 0001-D1 门槛）。
- 快照**只写一次**：发布/补发/显式重算之外，任何动作（刷新同步、改配置、撤回、恢复、方向选择）不得改写已冻结的快照；补发只追加、不改旧分册内容。
- 身份证、手机号**明文只在内存**：`talent_gene_reports` 只存 `maskedIdNo` / `idNoHash`，任何集合、响应、日志、快照都不落明文。
- 页面不得直连 PocketBase 或 `useApi()`；权限在 Nitro 路由内校验，前端隐藏只做体验。
- 文档示例一律使用虚构数据（如 `110101201609081234`、`13800000001`、`GR202611160001`），不得写真实 PII。

## 2. 角色与权限

### 2.1 角色矩阵（M3 生效部分）

| 角色 | 列表 | 详情/快照 | 一键同步 | 发布/撤回/恢复/补发/重算 | C 端 |
| --- | --- | --- | --- | --- | --- |
| 平台运营管理员 | ✅ | ✅ | ✅ | ✅ | — |
| 报告审核员（M6 正式授权；M3 用临时角色验证） | ✅ 只读 | ✅ 只读 | ❌ | ✅（审核发布职责，默认授予 `talent:report:publish`；如客户要求审核员只能看，M6 收回） | — |
| 规则配置员 | ❌ 无菜单 | ❌ | ❌ | ❌ | — |
| 家长（C 端） | — | 仅本人 + 已绑子女的**已发布**报告 | — | — | ✅ 只读 |

- M3 报告域为**平台级**，不做机构数据隔离；机构端继续走旧代码，M3 不把新码授予机构角色（`sync-talent.mjs` 机构角色菜单收敛逻辑保持原样）。
- 验收账号：`admin` / `superadmin`；三角色正式授权与授权矩阵归 M6。

### 2.2 权限码（权威 4 个；旧 3 个保留到 M6）

| 页面 / 能力 | 权限码 | 接口侧校验 |
| --- | --- | --- |
| 报告列表入口（C 菜单「基因报告」） | `talent:report:list` | `GET /reports` |
| 查看报告详情 / 快照 / 预览 / 分册叠加层 / 基因报告元数据 | `talent:report:view` | `GET /reports/:id`、`/volumes/:volumeId`、`/publish-preview`、`/reissue-preview`、`/direction-preview`、`GET /gene-reports/:id` |
| 一键同步全部（F，新增） | `talent:report:sync` | `POST /reports/sync`、`GET /reports/sync-logs` |
| 发布 / 撤回 / 恢复发布 / 补发 / 按当前配置重新生成快照（F） | `talent:report:publish` | `POST /reports/:id/publish`、`/withdraw`、`/restore`、`/publish-new`、`/regenerate-snapshot` |

- PRD §9 明确撤回/恢复/补发均使用 `report:publish`，因此**不新增** `revoke/reissue` 码；`talent:report:publish` 一个码覆盖五个写动作，审计按动作区分。
- 旧 `talent:report:revoke`（撤回天赋报告）/ `talent:report:edit`（上传报告 PDF）/ `talent:report:receive`（查看报告接收）**保留在册**，但新路由不再校验它们；旧页在 M6 删除时一并删除。M3 不得把旧码复用于新动作（避免「上传 PDF 权限可发布报告」）。
- 每个 `requirePermission` 用到的码必须有 C 或 F 菜单行（CONVENTIONS §3）；`sync-talent.mjs` 在 M3 出口断言 4 个权威码均有 C/F 行，`基因报告` C 菜单唯一。

### 2.3 菜单登记（`scripts/setup.mjs` + `scripts/sync-talent.mjs` 幂等）

| 类型 | 菜单名 | 路径 | component | 权限码 |
| --- | --- | --- | --- | --- |
| C（重指向旧行） | 基因报告 | `/admin/talent/reports` | `admin/talent/reports/index.vue` | `talent:report:list` |
| F（新增） | 一键同步全部报告 | `/admin/talent/reports` | — | `talent:report:sync` |
| F（复用旧行改指向） | 查看报告详情 | `/admin/talent/reports` | — | `talent:report:view` |
| F（复用旧行改指向） | 发布天赋报告 | `/admin/talent/reports` | — | `talent:report:publish` |
| F（新增） | 撤回恢复补发报告 | `/admin/talent/reports` | — | `talent:report:publish` |
| F（新增） | 重新生成报告快照 | `/admin/talent/reports` | — | `talent:report:publish` |

- 按 `menuType="C" && path="/admin/talent/report"` 找旧行（M2.0 菜单对齐后 name 已是「基因报告」），改 `path`/`component`/`permissionCode`，保留该行 id 与既有 `role_menus`；不新增同名 C 菜单。旧 `path="/admin/talent/report"` 的页面文件 `app/pages/admin/talent/[resource].vue` 保留到 M6（仅 URL 可访问，侧栏不再有入口）。
- 旧 F 行（`talent:report:revoke` / `talent:report:edit` / `talent:report:receive`）保留 active，但指向的旧页已无入口；M6 统一删除。旧「报告接收」「同步配置」菜单在 M2.0 已隐藏，M3 不恢复。
- **同一权限码允许出现多条 F 菜单行（不同动作名）**：`talent:report:publish` 会有 3 条 F 行（发布 / 撤回恢复补发 / 重新生成快照），断言按「码存在≥1 条」而非「唯一」。
- `app/composables/useMenuTree.ts` 的 `TALENT_PATHS` 增加 `'/admin/talent/reports'`，否则菜单被 `isFoundationPath` 过滤。
- `scripts/sync-talent.mjs` 的 `MENU_ALIGNMENT_PAGES` / `BUSINESS_MENU_PATHS` / 11 条断言同步更新（报告行 path 从 `/admin/talent/report` 改为 `/admin/talent/reports`）。

### 2.4 数据权限与 C 端归属

- **后台**：按权限码鉴权，不按机构隔离（§2.1）。
- **C 端**（M7 实现，M3 冻结守卫）：家长只能读取 `talent_reports.parentId` 指向本人档案、且报告 `status="published"`、家长 `status="1"`、子女 `status="1"` 的报告；**不接受前端传 `parentId`**；跨家长/未绑定/已解绑一律 404（不泄露存在性）。
- **立即失效**：家长停用、子女解绑、报告撤回后，下一次 C 端请求立即不可读，不依赖缓存与 C 端本地状态。
- 敏感字段：列表/详情只返回 `maskedMobile` / `maskedIdNo`；全号不提供（M3 无全号接口；PDF 下载由 M8 按权限代理）。

## 3. 数据模型

### 3.0 通用约定

- 集合与字段命名 camelCase（与现有 `talent_*` 一致），PRD `snake_case` 映射见 §3.5。
- 报告状态：`pending_publish` 待发布 / `published` 已发布 / `retracted` 已撤回；**新行只有这三态**，旧行可能还有 `error`（旧代码遗留，保留不改）。
- `subjectType`：`child`（子女，M3 同步对象）/ `self`（家长本人，结构保留，§14 C2）。
- 时间字段用 PocketBase `date`（ISO 字符串）；`created` / `updated` 由 PB 维护；业务时间（`syncedAt` / `filedAt` / `snapshotAt` / `publishedAt` / `withdrawnAt` / `restoredAt` / `queriedAt`）单独字段。
- 唯一索引命名 `idx_<collection>_<field>`；部分唯一索引 `WHERE <field> != ""`（与 `setup.mjs` 现有写法一致）。
- JSON 字段只存结构化数据，读服务端映射后返回；**JSON 内不得出现明文身份证/手机号**。
- PocketBase `required` 语义偏差：`required` relation 不可为空，因此 `talent_gene_reports.parentId`、`talent_reports.parentId/geneReportId` 在 PB schema 中为**可选**，必填由服务层与部分唯一索引保证（同 M1/M2 §3.0 写法）。
- 新字段一律通过 `sanitizeTalentReportRecord` / `sanitizeTalentGeneReportRecord` 映射后返回；集合原始记录不直接返回。

### 3.1 `talent_gene_reports`（外部基因报告，一人一份）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `subjectType` | text(10) | 是 | `child` / `self`；M3 同步只写 `child` |
| `subjectId` | text(64) | 是 | `talent_children.id`（`self` 时为 `talent_parents.id`） |
| `parentId` | relation → `talent_parents` | 否 | `maxSelect: 1`，`cascadeDelete: false`；家长停用/子女解绑不影响历史报告 |
| `reportNo` | text(64) | 是 | 外部报告编号；缺省时服务端生成 `R{YYYYMMDD}{4 位当日序号}`；全局唯一 |
| `name` | text(50) | 是 | 检验人姓名（外部原文快照） |
| `gender` | text(10) | 是 | `male` / `female`；取 M2 子女档案，外部不一致时以 M2 为准并写 warn 日志 |
| `birthday` | text(10) | 是 | `YYYY-MM-DD` |
| `age` | number | 是 | 同步时的周岁（复用 `talent-matching.ts` 的 `calculateTalentAge`，只调用不修改旧实现；`calculateTalentAge(birthday, syncedAt)`）；0 合法，PB 中为可选，服务层保证 |
| `maskedIdNo` | text(24) | 是 | 脱敏身份证，前 4 + 10 个 `*` + 后 4（如 `1101**********1234`） |
| `idNoHash` | text(64) | 否 | 身份证 HMAC（复用 M2 `hashTalentMemberIdNo`），用于检索与去重；不存密文/明文 |
| `issuer` | text(100) | 否 | 出具方（外部机构名） |
| `filedAt` | date | 否 | 外部建档日 |
| `syncedAt` | date | 是 | 最近一次同步写入时间 |
| `source` | text(20) | 是 | `mock`（本地演示）/ `external`（M8 真实源） |
| `version` | text(40) | 否 | 外部版本/批次号；仅存展示，不参与业务比较 |
| `books` | text(20) | 是 | 外部已出分册编码，规范化大写、升序、去重，如 `ABC`；1–6 位，字符集 `A`–`F` |
| `sections` | JSON | 是 | 外部原始篇目（见 §3.1.1）；可为空数组（外部仅出元数据时）；发布时必须能解析出所选册要素 |
| `sectionCount` | number | 是 | `sections.length`，列表/详情显示用；PB 中可选，服务层保证 |
| `status` | text(20) | 是 | `synced`（已同步）；M3 唯一值，保留扩展位 |
| `createdBy` / `updatedBy` | relation → `users` | 否 | 审计字段 |

- 唯一索引：`idx_talent_gene_reports_subject` UNIQUE(`subjectType`,`subjectId`)；`idx_talent_gene_reports_no` UNIQUE(`reportNo`)。
- 普通索引：`idx_talent_gene_reports_parent`(`parentId`)；`idx_talent_gene_reports_synced`(`syncedAt`)。
- **一人一份**（BR-02）：重复同步按唯一键 upsert，不新建行；不需要「作废/多版本」，历史内容由报告快照保留。
- `books` 与 `sections` 在**已发布报告**之后仍可被同步刷新（外部新出册/修订），但**不自动改写报告快照**（快照只在发布/补发/显式重算时写）。

#### 3.1.1 `sections` JSON 契约（外部原始篇目）

```json
[
  {
    "bookCode": "A",
    "chapter": "1.1 生长发育概述",
    "factorCode": "A-01",
    "factorName": "运动协调",
    "levelCode": "LV3",
    "score": 78,
    "condition": ""
  }
]
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `bookCode` | 是 | `A`–`F`；必须 ∈ `books` |
| `chapter` | 是 | 外部章节名；同一册内用于分组排序（首次出现顺序） |
| `factorCode` | 是 | 要素编码 `A-01`…`F-23`；同一报告内唯一 |
| `factorName` | 否 | 外部要素名；发布时优先冻结外部名，缺失回退 M1 文库当前名 |
| `levelCode` | 是 | 外部分级编码 `LV1`–`LV4`；必须存在于 M1 启用分级（否则该要素记入「未匹配要素」并以 `levelCode` 原样冻结，发布不阻断） |
| `score` | 否 | 外部得分，只读展示 |
| `condition` | 否 | 外部适用条件原文；M3 原样冻结（没有则空串） |

- 校验：`sections` 的 `factorCode` 重复 → 单条同步失败（该对象不写，记 `failed`）；`bookCode` 不在 `books` → 失败；数组长度 ≤ 1000。
- 固定注解（`note`）**不在外部 sections 中**：发布时按 `factorCode + levelCode` 取 M1 `talent_factor_notes` 当前值冻结；缺失时 `note=""` 并写入发布响应的 `warnings`（不阻断，M1 种子应保证 632 条齐全）。

### 3.2 `talent_reports`（报告，增量改造既有集合）

> 既有字段（`reportNo` / `reportType` / `title` / `status` / `publishedAt` / `withdrawnAt` / `totalItems` / `customerId` 等）全部保留；M3 **只加字段/索引、把 `customerId` 放宽为非必填**，不删字段、不改旧行。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `subjectType` | text(10) | 否* | 新行必填：`child` / `self`；旧行空串 |
| `subjectId` | text(64) | 否* | 新行必填：子女/家长 id；旧行空串 |
| `parentId` | relation → `talent_parents` | 否 | 归属家长；`maxSelect: 1`；旧行为空 |
| `geneReportId` | relation → `talent_gene_reports` | 否 | 来源基因报告；`maxSelect: 1`；旧行为空 |
| `factorCount` | number | 否* | 冻结要素数（快照内要素总数）；发布前 0 |
| `snapshotVersion` | number | 否* | 快照版本：发布 1，补发/显式重算 +1；撤回/恢复/方向选择不变；发布前 0 |
| `snapshotAt` | date | 否 | 最近一次冻结时间 |
| `queriedAt` | date | 否 | 最近一次外部同步/查询时间（PRD `queried_at`） |
| `openVolumeIds` | JSON | 否 | 已开放分册 `["V1","V2"]`；`V1`–`V6` 与 `A`–`F` 固定映射（§3.2.2） |
| `factorSnapshot` | JSON | 否 | 冻结要素结果数组（§3.2.1）；发布前 `[]` |
| `volumeSnapshot` | JSON | 否 | 冻结六册（§3.2.2）；发布前 `[]` |
| `directionSnapshot` | JSON | 否 | 冻结方向命中对象（§3.2.3）；发布前 `null` |
| `selections` | JSON | 否 | 已选方向（§3.2.4）；默认 `[]` |
| `versions` | JSON | 否 | 版本历史（§3.2.5）；默认 `[]` |
| `restoredAt` | date | 否 | 最近恢复时间（撤回时间保留在 `withdrawnAt` 供审计） |
| `status` | text(20) | 是 | 新行 `pending_publish` / `published` / `retracted`；旧行可含 `error`，新代码不写 `error` |

> `*` 标注的新字段在 PB schema 中为可选，必填/唯一由服务层与部分唯一索引保证（PB 的 `required` 对 number/relation 有偏差）。

- 唯一索引：`idx_talent_reports_subject` UNIQUE(`subjectType`,`subjectId`) WHERE `subjectType != ""`（新行一人一份；旧行 `subjectType=""` 被部分索引排除，可共存）。
- 保留索引：`idx_talent_reports_no` UNIQUE(`reportNo`)（新旧共用；新行 `reportNo` 取自基因报告）。
- 新增普通索引：`idx_talent_reports_status`(`status`)、`idx_talent_reports_parent`(`parentId`)、`idx_talent_reports_gene`(`geneReportId`)、`idx_talent_reports_subject_id`(`subjectId`)。
- **`customerId` 只读过渡（D6）**：`sync-talent.mjs` 把 `talent_reports.customerId` 的 `required` 由 `true` 放宽为 `false`；新行写 `customerId=""`；新代码**不读不写** `customerId`；旧行值保持不变；机构端旧接口与旧页逻辑不修改，M6 删除。
- 新行 `reportType` 固定 `"gene_report"`、`title` 为「{对象名}·基因报告」，仅用于满足旧字段非空与旧页展示；新代码不按 `reportType` 匹配旧模板。
- `totalItems` 新行镜像 `factorCount`（兼容旧页显示），新代码不读。

#### 3.2.1 `factorSnapshot` JSON 契约（全部外部要素，冻结后不可变）

```json
[
  {
    "code": "A-01",
    "name": "运动协调",
    "category": "A",
    "categoryName": "生长发育",
    "volumeId": "V1",
    "bookCode": "A",
    "chapter": "1.1 生长发育概述",
    "levelCode": "LV3",
    "levelName": "优秀",
    "levelOrder": 3,
    "score": 78,
    "note": "固定注解全文",
    "condition": ""
  }
]
```

- 覆盖**外部全部分册**的要素（不限开放册）；按 `bookCode` 升序、`chapter` 首次出现顺序、sections 原顺序排列。
- `levelOrder` 为该分级 `sortOrder` 的**冻结值**（M4 命中只用它，不再反查当前分级）；`levelName` / `categoryName` / `note` 取**发布时** M1 当前值；`name` 优先外部 `factorName`，缺失回退 M1 文库当前名。
- 显式「重新生成快照」会按 M1 当前值刷新 `levelName` / `levelOrder` / `note` / `categoryName`，**不改变**要素集合、章节、开放册。

#### 3.2.2 `volumeSnapshot` JSON 契约（固定六册）与 A–F ↔ V1–V6 映射

固定映射（BR-04 L100；外部编码进列表，内部 id 进快照/接口）：

| volumeId | bookCode | 册名 |
| --- | --- | --- |
| V1 | A | 生长发育 |
| V2 | B | 智商 |
| V3 | C | 情商 |
| V4 | D | 领导商 |
| V5 | E | 艺术商 |
| V6 | F | 体育运动商 |

```json
[
  {
    "volumeId": "V1",
    "bookCode": "A",
    "name": "生长发育",
    "sortOrder": 1,
    "open": true,
    "chapterCount": 2,
    "factorCount": 18,
    "chapters": [
      {
        "chapter": "1.1 生长发育概述",
        "factors": [
          { "code": "A-01", "name": "运动协调", "levelCode": "LV3", "levelName": "优秀", "note": "固定注解全文" }
        ]
      }
    ]
  }
]
```

- 固定 6 项，顺序 V1→V6；外部未出/未关联的册 `open=false`、`chapters=[]`、`chapterCount=0`、`factorCount=0`。
- `open` 与 `openVolumeIds` 必须一致（服务端写入时由同一动作同时更新，读时可交叉校验，不一致视为数据异常写 `error_logs`）。
- `chapters[].factors` 是 `factorSnapshot` 的**展示子集**（同一要素在两处重复存储，便于按册读取；以 `factorSnapshot` 为唯一事实源，构建时由它生成）。
- 后台详情可查看全部 6 册内容（含未开放册）；C 端只能读取 `open=true` 的册（§7）。

#### 3.2.3 `directionSnapshot` JSON 契约（M4 输出整体冻结）

```json
{
  "version": 3,
  "at": "2026-11-16T10:00:00.000Z",
  "operatorId": "rec_user_1",
  "operatorName": "管理员示例",
  "recommendLimit": 5,
  "selectionLimit": 3,
  "levelOrders": { "LV1": 1, "LV2": 2, "LV3": 3, "LV4": 4 },
  "tiers": [
    { "id": "rec_tier_1", "code": "T1", "name": "启蒙", "teacher": "普通老师", "freq": "每周 2 次", "headline": "…", "sortOrder": 1 }
  ],
  "directions": [
    {
      "directionId": "rec_dir_1",
      "code": "DIR-001",
      "name": "舞蹈启蒙",
      "version": 3,
      "tierIds": ["rec_tier_1", "rec_tier_2"],
      "defaultTierId": "rec_tier_1",
      "total": 7,
      "hitCount": 5,
      "hitRate": 0.7143,
      "requirements": [
        {
          "code": "A-01",
          "level": "LV2",
          "factorName": "运动协调",
          "factorLevel": "LV3",
          "actualOrder": 3,
          "needOrder": 2,
          "met": true,
          "gap": 0
        }
      ]
    }
  ]
}
```

- `directions[]` 为**全部已评估方向**（含 0 命中、含未进推荐前 5 的），推荐/0 命中回退由 C 端读取时按冻结 `hitCount` 现算（不落 top5）；`recommendLimit=5`、`selectionLimit=3` 冻结，读取优先快照值（PRD 13.3 若调整上限不需重冻结）。
- 排序按 BR-08：`hitCount` 降序 → `hitRate` 降序 → `requirements.length`（配置条数）降序 → `code` 升序。`hitRate` 为 0–1 小数（`hitCount / total`，保留 4 位）；`total=0` 时 `hitRate=0`。`requirements[].gap = met ? 0 : max(0, needOrder - actualOrder)`（未达成时的差距级数，达成时恒为 0；C 端只在未达成时展示「差 N 级」）。
- `version` / `at` / `operatorId` / `operatorName` 为本次冻结的方向配置版本与操作人；`tiers[]` 冻结档位快照。
- 结构由 M4 纯函数产出，M3 **不得增删字段**；M3 只在发布/补发/显式重算时写入。

#### 3.2.4 `selections` JSON 契约（M4 写，M3 存）

```json
[
  {
    "directionId": "rec_dir_1",
    "requestId": "",
    "custom": false,
    "tierId": "rec_tier_2",
    "directionName": "舞蹈启蒙",
    "tierName": "精进",
    "teacher": "卓越老师",
    "freq": "每周 3 次",
    "manualName": "",
    "selectedAt": "2026-11-16T12:00:00.000Z"
  }
]
```

- 正式方向：`directionId` 非空、`requestId=""`、`custom=false`；自定义方向：`requestId` 非空、`directionId=""`、`custom=true`、`manualName` 为家长手填（≤10 字）。二者至多一个非空，`directionName`/`tierName`/`teacher`/`freq` 为**选择当时冻结值**（后续方向改名不回溯）。
- 数量 ≤3（`selectionLimit` 快照值）；M3 不写 selections（M4 的 C 端接口写），报告详情只读展示；自定义方向归并不回写历史 selections（只影响新选择）。

#### 3.2.5 `versions` JSON 契约（版本历史）

```json
[
  { "version": 2, "type": "publish", "summary": "发布，开放 3 册（A、B、C）", "books": ["A", "B", "C"], "operatorId": "rec_user_1", "operatorName": "管理员示例", "at": "2026-11-16T10:00:00.000Z" },
  { "version": 2, "type": "selection", "summary": "家长选择「舞蹈启蒙」·目标档位 精进", "operatorId": "", "operatorName": "", "at": "2026-11-16T12:00:00.000Z" },
  { "version": 3, "type": "reissue", "summary": "补发 2 册（D、E）", "books": ["D", "E"], "operatorId": "rec_user_1", "operatorName": "管理员示例", "at": "2026-11-20T10:00:00.000Z" }
]
```

- `type` 枚举：`publish` / `withdraw` / `restore` / `reissue` / `regenerate` / `selection`。
- `version` = 该动作发生时的 `snapshotVersion`（撤回/恢复/方向选择不改版本号，因此与上一条同号）。
- 顺序按追加顺序；只追加、不修改、不删除（上限 200 条，超出时保留最近 200 条并在 `summary` 前缀「历史已截断」，M9 如需归档另立任务）。
- `selection` 条目由 M4 调用 M3 `recordTalentReportVersion(reportId, entry)` 写入；M4 不直接改 `versions`。

#### 3.2.6 写矩阵（哪个动作写哪些字段）

| 动作 | status | openVolumeIds | factor/volume/directionSnapshot | snapshotVersion | versions | 其他 |
| --- | --- | --- | --- | --- | --- | --- |
| 同步新建 | `pending_publish` | `[]` | `[]` / `[]` / `null` | 0 | `[]` | `queriedAt`、`reportNo`、`geneReportId` |
| 刷新同步 | 不变 | 不变 | **不改** | 不变 | 不变 | 基因报告 `books/sections/syncedAt` 更新；报告 `queriedAt` |
| 发布 | `published` | 勾选册 | 全部写入 | 1 | +publish | `publishedAt`=`snapshotAt`=now、`factorCount` |
| 撤回 | `retracted` | 不变 | 不改 | 不变 | +withdraw | `withdrawnAt`=now |
| 恢复 | `published` | 不变 | 不改 | 不变 | +restore | `restoredAt`=now |
| 补发 | `published` | 追加新增册 | 追加旧册不变；direction 增量刷新 | +1 | +reissue | `snapshotAt`=now、`factorCount` |
| 显式重算 | 不变 | 不变 | factor 注解/级序刷新 + direction 全量重算；册内容不变 | +1 | +regenerate | `snapshotAt`=now |
| 方向选择/换档/取消（M4） | 不变 | 不变 | 不改 | 不变 | +selection | `selections` 由 M4 写 |

### 3.3 `talent_sync_logs`（扩展：逐人明细）

既有字段保留（`trigger` / `status` / `startedAt` / `finishedAt` / `durationMs` / `received` / `generated` / `skipped` / `failedCount` / `message` / `details`），新增：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `syncScope` | text(20) | 否 | `gene_report`（M3）；旧行空串（第三方结果同步），列表按此过滤 |
| `mode` | text(10) | 否 | `commit`（只记提交；预演不落日志）；旧行空串 |
| `refreshed` | number | 否 | 刷新同步人数 |
| `created` | number | 否 | 新建报告人数 |
| `empty` | number | 否 | 外部暂无数据人数 |
| `subjectDetails` | JSON | 否 | 逐人明细（§3.3.1），≤500 条，超出 `truncated=true` |
| `operatorId` | text(64) | 否 | 触发人 id（旧行空） |

- `status`：`success`（无失败）/ `partial`（有单条失败但整体完成）/ `failed`（整体失败，未写入任何对象）。旧代码只写 success/failed，新增 `partial` 是兼容扩展。
- `trigger`：`manual`（一键同步按钮）；预留 `auto`（M8 定时）。
- 写入失败不影响主流程（沿用 `recordTalentSyncLog` 风格）；日志字段不含明文身份证/手机号，`subjectDetails` 用「姓名 + 脱敏身份证 + 报告编号」。

#### 3.3.1 `subjectDetails` 逐人明细契约

```json
[
  {
    "subjectType": "child",
    "subjectId": "rec_child_1",
    "subjectName": "陈小示",
    "maskedIdNo": "1101**********1234",
    "reportNo": "GR202611160001",
    "action": "refresh",
    "booksTotal": "ABCD",
    "booksAdded": "D",
    "reason": "",
    "message": ""
  }
]
```

- `action`：`refresh` / `created` / `empty` / `failed`；`empty` 的 `reason` ∈ `no_result` / `info_mismatch`；`failed` 的 `message` 为脱敏后的错误摘要（≤200 字，不含堆栈与外部原始报文）。
- `booksAdded` 为外部已出 − 已开放（新建报告时为全部外部册，因为尚未开放）；无新增为空串。

### 3.4 索引清单（新库必须断言存在）

| 集合 | 索引 |
| --- | --- |
| `talent_gene_reports` | `idx_talent_gene_reports_subject` UNIQUE(`subjectType`,`subjectId`)；`idx_talent_gene_reports_no` UNIQUE(`reportNo`)；`idx_talent_gene_reports_parent`(`parentId`)；`idx_talent_gene_reports_synced`(`syncedAt`) |
| `talent_reports` | `idx_talent_reports_subject` UNIQUE(`subjectType`,`subjectId`) WHERE `subjectType != ""`；`idx_talent_reports_no` UNIQUE(`reportNo`)（既有）；`idx_talent_reports_status`(`status`)；`idx_talent_reports_parent`(`parentId`)；`idx_talent_reports_gene`(`geneReportId`)；`idx_talent_reports_subject_id`(`subjectId`) |
| `talent_sync_logs` | 无新增索引（旧集合；按 `created` 排序即可） |
| 旧集合（保留，M3 不动） | `talent_report_items` / `talent_report_publications` / `talent_report_receipts` / `talent_report_templates` / `talent_report_template_items` 的既有字段与索引原样保留到 M6 |

- 列表两段查询所需的 M2 索引（`talent_parents.mobileHash` / `maskedMobile`、`talent_children.name`、`talent_children.idNoHash`）由 M2 交付；M3 不改 M2 集合与索引。若 1000 条性能不达标，M9 再评估给 `talent_children.name` 加索引（不在 M3）。
- 基因报告检索（检验人身份证）走 `idx_talent_gene_reports_no`（报告编号）与 `maskedIdNo` LIKE（无索引，≤1000 条可接受），完整 18 位时先算 HMAC 走 `idNoHash`（无索引但等值扫描可接受，M9 再优化）。

### 3.5 PRD → 集合字段映射

| PRD §8.2 | 本规格 | 说明 |
| --- | --- | --- |
| gene_report `id` | PB 主键 | — |
| gene_report `child_id` | `subjectType` + `subjectId` | PRD 的 `SELF` → `subjectType="self"` |
| gene_report `report_no` | `reportNo` | 全局唯一；外部缺省时服务端生成 |
| gene_report `id_no` | `maskedIdNo` + `idNoHash` | 不存明文/密文 |
| gene_report `name/gender/birthday/age` | 同名字段 | 同步时快照 |
| gene_report `issuer/filed_at/synced_at/source/version` | `issuer` / `filedAt` / `syncedAt` / `source` / `version` | — |
| gene_report `books` | `books` | 字符串 `ABC`，与 PRD 示例一致 |
| gene_report `status` | `status` = `synced` | 中文「已同步」 |
| report `child_id` / `child_name` / `parent_id` | `subjectType`+`subjectId` / 由 M2 解析 / `parentId` | 不在报告行冗余姓名 |
| report `subject_type` / `subject_id` | `subjectType` / `subjectId` | — |
| report `status` | `status` | 三态 |
| report `queried_at` / `published_at` | `queriedAt` / `publishedAt` | — |
| report `factor_count` / `snapshot_version` / `snapshot_at` | `factorCount` / `snapshotVersion` / `snapshotAt` | — |
| report `open_volume_ids` | `openVolumeIds` | `V1`–`V6` |
| report `factor_snapshot` | `factorSnapshot` | §3.2.1 |
| report `volume_snapshot` | `volumeSnapshot` | §3.2.2 |
| report `direction_snapshot` | `directionSnapshot` | §3.2.3 |
| report `selections` | `selections` | §3.2.4 |
| report `versions` | `versions` | §3.2.5 |

### 3.6 本地演示数据（`scripts/seed-talent-report.mjs`）

- 幂等：按 `(subjectType,subjectId)` / `reportNo` upsert，**不清空**其他天赋数据；不触碰旧 `talent_reports` 旧行与旧 `talent_report_items/publications/receipts`。
- 纯虚构数据：姓名「陈示例/陈小示」、手机号 `13800000001`、身份证 `110101201609081234` 一类格式合法但非真实身份；脚本头注明「仅本地演示」。
- 覆盖场景：
  1. 待发布（外部 2 册，未开放）；
  2. 已发布（外部 3 册，开放 2 册，含 1 次 publish 版本记录）；
  3. 已发布 + 新增分册（外部 5 册、开放 3 册，列表展示「新增分册」、可补发）；
  4. 已撤回（沿用快照，`withdrawnAt` 有值）；
  5. 外部暂无数据（只有 M2 子女、无基因报告 → 不出现在报告列表，由同步预演展示）。
- 依赖 M2 种子（家长 + 子女）与 M1/M4 配置（分级、方向、档位）；M4 未就绪时方向快照可为空数组（仅本地演示，不做验收）。
- 脚本需显式确认（沿用 `seed-talent.mjs` 的 `TALENT_SEED_CONFIRM` 风格）且拒绝在 `NODE_ENV=production` 运行。

### 3.7 与旧集合/旧行的共存关系

| 旧集合/字段 | M3 处理 | M6 |
| --- | --- | --- |
| `talent_reports` 旧行（`subjectType=""`、有 `customerId`） | 保留不改；新列表/详情按 `subjectType != ""` 过滤，旧行不出现在新页 | 删除旧行或迁移（另立任务） |
| `talent_reports.customerId` | `required` 放宽为 `false`；新行空；新代码不读不写 | 删除字段 |
| `talent_report_items` | 不写、不读（新快照不落子表）；旧页仍读 | 删除集合 |
| `talent_report_publications` | 不写（开放册改存 `openVolumeIds`）；旧页仍读 | 删除集合 |
| `talent_report_receipts` | 不写；接收/重试归 M8 | 删除集合 |
| `talent_report_templates` / `_template_items` | 不读不写 | 删除集合 |
| 旧页 `[resource].vue` / `receive.vue` / `sync.vue` | 保留；侧栏无入口（旧 report 菜单已重指向） | 删除 |
| 旧权限码 `talent:report:revoke/edit/receive` | 保留在册；新路由不校验 | 删除 |

## 4. 状态机、同步与版本规则

### 4.1 报告状态机（PRD §8.3 L522–533）

```
待发布 pending_publish ──发布──> 已发布 published ──撤回──> 已撤回 retracted ──恢复──> 已发布 published
                                      └──补发新增分册──> 已发布（snapshotVersion+1，分册增加）
                                      └──按当前配置重新生成快照──> 已发布/已撤回（snapshotVersion+1）
```

| 当前状态 | 动作 | 结果 | 前置校验 | 失败码 |
| --- | --- | --- | --- | --- |
| pending_publish | 发布 | published，v1 | 基因报告存在；`openVolumeIds` 1–6、∈ `books`、每册有要素 | 409 / 422 |
| published | 撤回 | retracted | — | 409 |
| retracted | 恢复 | published（快照不变，版本不变） | — | 409 |
| published | 补发 | published，v+1 | 新增册非空；基因报告存在 | 409 |
| published / retracted | 重算快照 | 状态不变，v+1 | 快照存在 | 409 |
| 其他组合 | 任意 | 拒绝 | — | 409「当前状态不支持该操作」 |

- **幂等**：重复发布/撤回/恢复/补发均 409（不做静默成功），前端按状态隐藏按钮；双击由 `withTalentReportLock("report:"+id)` 串行化，第二个请求看到新状态后 409。
- **C 端门禁**（M7 消费）：`published` 可读；`retracted` 返回 409 + `state=retracted`（页面显示「报告内容更新中」）；`pending_publish` 返回 409 + `state=pending_publish`（页面显示「整理中」）；非本人/未绑定/已解绑 404。
- 撤回不改 `selections`、不改快照、不删开放册；恢复沿用同一 `openVolumeIds` 与快照，C 端立即恢复可见。
- 状态变更必须写 `oper_logs`（发布/撤回/恢复/补发/重算），`withOperLog` 摘要含报告编号与版本号。

### 4.2 一键同步全部（PRD §6.6 一键同步）

**候选对象**：`talent_children` 中 `status="1"` 且 `query="found"`，且其 `parentId` 对应家长 `status="1"` 的子女（M2 状态机产出的「已查到」）。`subjectType="self"` 不在 M3 同步范围（§14 C2）。

**三类归因 + 单条失败**（弹层预演展示三类人数与逐人明细；`failed` 单列，不计入三类）：

| 分类 | 判定 | 写入 |
| --- | --- | --- |
| `refreshed` 刷新同步 | 已有基因报告 + 外部返回 `found` | 更新基因报告（`books`/`sections`/`issuer`/`filedAt`/`version`/`syncedAt`/`age`）、报告 `queriedAt`；**不改已发布快照**；报告不存在时补建（防御：基因报告存在但报告缺失） |
| `created` 新建报告 | 无基因报告 + 外部返回 `found` | 新建基因报告 + 新建报告（`pending_publish`、`snapshotVersion=0`、快照空、`openVolumeIds=[]`、`versions=[]`、`selections=[]`） |
| `empty` 外部暂无数据 | 外部返回 `found=false` | 不写任何集合；明细记 `reason`（`no_result` 外部未出结果 / `info_mismatch` 信息不一致） |
| `failed` 单条失败 | 适配器抛错、鉴权失败、超时、`sections` 校验失败、唯一冲突 | 不写该对象；明细记脱敏 message；整体继续 |

**预演与确认**（ADR D4）：

- `POST /reports/sync` body `{ mode: "preview" | "commit" }`。
- `preview`：只读外部 + 内存分类，不写任何集合、不写 `talent_sync_logs`、不写 `oper_logs`；返回三类人数、`failed` 数、逐人明细（`truncated` 标记）。
- `commit`：重新枚举候选、重新调用外部源（不复用 preview 结果，避免内存状态与 PII 驻留），逐人写入；返回实际分类结果与 `syncLogId`。preview 与 commit 之间外部数据可能变化，**以 commit 实际结果为准**，弹层在 commit 结果与 preview 差异较大时提示「外部数据已变化，已按最新结果写入」。
- 并发：commit 用 `withTalentReportLock("gene-report-sync")` 全局串行；第二个 commit 返回 409「同步正在进行中」。preview 不加锁。
- 日志：commit 写 `talent_sync_logs`（`syncScope="gene_report"`、`status` success/partial/failed、`refreshed/created/empty/failedCount`、`subjectDetails`）+ 一条 `oper_logs`（摘要「刷新 a / 新建 b / 暂无 c / 失败 d」）；日志写入失败不影响主流程。
- 外部源未配置/不可达 → 503「外部基因报告服务暂不可用」；无候选 → 200，三类均为 0。

### 4.3 增量分册计算（BR-05）

- `externalBooks` = 基因报告 `books`（字符数组）；`publishedBooks` = `openVolumeIds` 映射到的 `bookCode` 数组。
- `newBooks = externalBooks − publishedBooks`（按 A–F 升序）；列表「新增分册」= `newBooks.length > 0 ? `${N} 篇 ${newBooks.join("")}` : "—"`；「分册」列显示 `externalBooks.join("")`。
- 发布只能勾选 `externalBooks` 内且有要素的册；不能发布尚未外部出具的册（弹层置灰并提示「外部暂无此册」）。
- 补发按钮出现条件：`status="published"` 且 `newBooks.length > 0`；补发弹层列出新增册清单（章节数/要素数），确认后只追加新增册。
- 补发后 `openVolumeIds ∪= newVolumeIds`；旧册 `volumeSnapshot` 与 `factorSnapshot` 原值不变（只追加新册要素）；`snapshotVersion+1`。
- 撤回状态下不提供补发（需先恢复）；恢复后按钮按新增册重新出现。

### 4.4 版本链规则

| 动作 | `snapshotVersion` | `versions[]` 追加 | 说明 |
| --- | --- | --- | --- |
| 发布 | 0 → 1 | `publish` | 版本 1 = 首份快照 |
| 撤回 | 不变 | `withdraw` | 快照保留，C 端不可见 |
| 恢复 | 不变 | `restore` | 沿用原快照，不重算 |
| 补发 | +1 | `reissue` | 只追加新增册；方向快照按 M4 `refreshDirectionSnapshot` 增量刷新（旧要求的命中结果原样复制） |
| 显式重算 | +1 | `regenerate` | 按当前方向配置全量重算 + 刷新要素注解/级序；唯一允许回写旧要素命中的动作 |
| 方向选择/换档/取消 | 不变 | `selection` | M4 调 `recordTalentReportVersion`；不改快照 |
| 刷新同步 | 不变 | 不追加 | 只更新基因报告，不动报告快照 |

- `snapshotVersion` 是**快照内容版本**，只在内容变化时递增；`versions[].version` 记录动作发生时版本号（撤回/恢复/选择与前一动作同号）。
- PRD §8.3 的「补发 → 版本+1」按此实现；BR-03「恢复才产生新版本」在本文解释为「恢复产生版本历史记录」，不递增 `snapshotVersion`（避免 C 端/发布时间的语义漂移，且恢复必须沿用原快照，见 AC-ADM-06-3）。
- 并发：所有写动作在 `withTalentReportLock("report:"+id)` 内完成；补发与重算共享同一锁，避免版本号竞争。

### 4.5 快照不可变性（M3 出口硬验收）

- 发布后修改 M1（分级/注解/方向/档位）或 M2（子女姓名/证件）：`GET /reports/:id` 返回的 `factorSnapshot` / `volumeSnapshot` / `directionSnapshot` **逐字节不变**（以 JSON 序列化 hash 比较）。
- 刷新同步只更新 `talent_gene_reports`，不触碰报告快照；`factorCount` / `snapshotVersion` / `snapshotAt` 不变。
- 补发只追加：旧册 `volumeSnapshot` 项与旧要素 `factorSnapshot` 项逐项相等；`directionSnapshot` 中不涉及新增要素的 `requirements` 原样保留（M4 增量语义）。
- 显式重算（详情页「按当前配置重新生成快照」）是唯一例外，必须二次确认 + 审计 + `versions` 记录，且只影响指定报告。
- 服务层在写入快照前做深拷贝/冻结（`structuredClone` + `Object.freeze` 仅用于内存防误改，落库为普通 JSON）；读接口返回深拷贝，禁止把内部对象直接返回给调用方复用。

## 5. API

### 5.1 通用约定

- 路由放 `server/api/admin/talent/reports/`（静态段目录）与 `gene-reports/`；与旧 `[resource].get.ts` / `[resource].post.ts` 单段动态路由同目录，依赖 Nitro「静态段优先」，实现后必须按 §5.6 验证命中（同 M2 §5.7）。
- 列表统一返回 `{ rows, total, page, pageSize, statusCounts, statusTotal }`；`pageSize` 默认 20、上限 100，`page` 最小 1。
- 写接口链路：`validateBody(event, schema, { statusCode: 422 })` → `requirePermission` → `withTalentReportLock`（写报告时）→ `withOperLog()` → `success(data, message)`；无请求体的动作接口跳过 `validateBody`，权限与审计不省。
- 所有响应只含脱敏/冻结数据，不含明文身份证/手机号、不含 `*Cipher`/`*Hash`、不含外部原始报文与堆栈。
- 响应不回传 PocketBase 原始错误；唯一冲突统一 409 并指明对象（报告编号/对象）。
- 所有 GET 均为只读，不产生写入；预演接口不写日志。

### 5.2 路由表（14 条）

| # | 方法 | 路径 | 权限码 | 说明 | 审计 |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/api/admin/talent/reports` | `talent:report:list` | 列表：报告编号 / 子女姓名 / 家长手机号 / 检验人身份证 四项 + 状态 + 分页 + 状态计数 | 否 |
| 2 | GET | `/api/admin/talent/reports/:id` | `talent:report:view` | 详情：信息条 + 4 页签数据（selections、matching diff、基因报告册摘要、建议空态） | 否 |
| 3 | GET | `/api/admin/talent/reports/:id/volumes/:volumeId` | `talent:report:view` | 单册叠加层：章节 + 要素（编码/名称/分级/数据熵/固定注解） | 否 |
| 4 | GET | `/api/admin/talent/reports/:id/publish-preview` | `talent:report:view` | 发布弹层：信息条 + 可开放册 + M4 方向命中预览 + 冻结规则 | 否 |
| 5 | POST | `/api/admin/talent/reports/:id/publish` | `talent:report:publish` | 发布（冻结快照，v1，写 `publishedAt`） | 是 |
| 6 | POST | `/api/admin/talent/reports/:id/withdraw` | `talent:report:publish` | 撤回（C 端立即不可见） | 是 |
| 7 | POST | `/api/admin/talent/reports/:id/restore` | `talent:report:publish` | 恢复发布（沿用原快照） | 是 |
| 8 | GET | `/api/admin/talent/reports/:id/reissue-preview` | `talent:report:view` | 补发弹层：外部已出 / 本次新增 / 新增册清单 | 否 |
| 9 | POST | `/api/admin/talent/reports/:id/publish-new` | `talent:report:publish` | 补发新增分册（PRD §9 路径 `publish-new`；只追加新增册，v+1） | 是 |
| 10 | POST | `/api/admin/talent/reports/:id/regenerate-snapshot` | `talent:report:publish` | 按当前配置重新生成快照（v+1） | 是 |
| 11 | GET | `/api/admin/talent/reports/:id/direction-preview` | `talent:report:view` | 当前配置命中 vs 冻结快照 diff（M4 纯函数，不落库） | 否 |
| 12 | POST | `/api/admin/talent/reports/sync` | `talent:report:sync` | 一键同步全部：`mode=preview` 只读预演 / `mode=commit` 写入 + 同步日志 | 预演否 / 提交是 |
| 13 | GET | `/api/admin/talent/reports/sync-logs` | `talent:report:sync` | 最近 20 次一键同步记录（三类计数/失败数/时间/操作人） | 否 |
| 14 | GET | `/api/admin/talent/gene-reports/:id` | `talent:report:view` | 基因报告元数据与篇目（行内「基因报告」按钮） | 否 |

- 不提供报告删除、报告新建（报告只能由同步创建）、手动修改快照、PDF 上传/删除路由。
- 路由优先级（Nitro 静态段优先，必须实测，见 §5.6）：`reports` 静态目录优先于旧 `[resource].get.ts`；`POST /reports/sync`、`GET /reports/sync-logs` 是静态段，必须优先于 `GET /reports/:id`（`:id` 不得吞掉 `sync` / `sync-logs`）。
- 旧路由 `GET /api/admin/talent/report`、`/report/:id`、`/report/sync` 保留不动（旧页无入口）；M6 删除。
- 无 `/reports/:id/publish` 之外的新增/编辑字段路由；`selections` 写入归 M4 的 C 端接口（§8.1）。

### 5.3 关键请求体（Zod）

```ts
const volumeId = z.enum(["V1", "V2", "V3", "V4", "V5", "V6"]);

// #5 发布
{ openVolumeIds: volumeId[] }            // 1–6，去重；必须 ⊆ 外部已出且有要素的册

// #6 撤回
{ reason?: string }                      // ≤200，写入 versions.summary

// #7 恢复
{}                                       // 空请求体

// #9 补发
{}                                       // 空请求体；服务端按当前 geneReport.books 计算新增册

// #10 重算快照
{ regenerateFactorNotes?: boolean }      // 默认 true：刷新 M1 注解/级序；false 时只重算方向

// #12 一键同步
{
  mode: z.enum(["preview", "commit"]),
  previewCounts?: { refreshed: number, created: number, empty: number, failed: number }, // 可选：用于判断 changedSincePreview
}
```

- Zod 失败统一 422；业务校验（状态、册合法性、新增册为空、唯一冲突）在 Zod 之后，返回 409/422。

### 5.4 响应结构

#### 5.4.1 列表 `GET /reports`

```json
{
  "rows": [
    {
      "id": "rec_report_1",
      "reportNo": "GR202611160001",
      "parentId": "rec_parent_1",
      "parentName": "陈示例",
      "childName": "陈小示",
      "subjectType": "child",
      "subjectId": "rec_child_1",
      "maskedMobile": "1380****0001",
      "maskedIdNo": "1101**********1234",
      "geneBookCount": 4,
      "booksText": "ABCD",
      "newBookCount": 1,
      "newBooksText": "D",
      "status": "published",
      "statusLabel": "已发布",
      "snapshotVersion": 2,
      "publishedAt": "2026-11-16 10:00:00.000Z",
      "updatedAt": "2026-11-16 10:00:00.000Z",
      "geneReportId": "rec_gene_1"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "statusCounts": { "pending_publish": 1, "published": 5, "retracted": 1 },
  "statusTotal": 7
}
```

- `childName`：`subjectType="self"` 时为「本人」；`subjectType="child"` 取 `talent_children.name`（当前值）。
- `parentName` / `maskedMobile` 取 `talent_parents` 当前值；`maskedIdNo` 取基因报告快照值（无基因报告时取 M2 子女档案脱敏值）。
- `statusCounts` 在「四项输入」筛选下统计、**不叠加状态筛选**，保证下拉「全部（n）/待发布（a）/已发布（b）/已撤回（c）」与总数一致（同 M2 §5.4.1）。
- `newBookCount` / `newBooksText` 由外部 `books` − `openVolumeIds` 计算；无新增时 0 / `""`，页面显示「—」。
- 筛选参数：`reportNo`（模糊）、`childName`（模糊）、`parentMobile`（完整 11 位或后 4 位，其他 422）、`idNo`（完整 18 位或后 4 位，其他 422）、`status`（三态之一）、`page`、`pageSize`、`subjectType`（默认全部，M3 通常 `child`）。四项 AND 叠加；任一筛选或每页条数变化回第 1 页；默认排序 `-created`。
- 服务端两段查询：`parentMobile` → `talent_parents` 的 `mobileHash`/`maskedMobile` 解析 `parentIds`；`childName` → `talent_children.name` 解析 `subjectIds`；`idNo` → `talent_gene_reports.maskedIdNo`/`idNoHash` 解析 `geneReportIds`；再对 `talent_reports` 加 `subjectType != ""` 与上述 IN 条件分页；最后按 `parentId` / `subjectId` / `geneReportId` 批量补展示字段。

#### 5.4.2 详情 `GET /reports/:id`

```json
{
  "report": {
    "id": "rec_report_1", "reportNo": "GR202611160001", "status": "published", "statusLabel": "已发布",
    "snapshotVersion": 2, "snapshotAt": "2026-11-16 10:00:00.000Z",
    "publishedAt": "2026-11-16 10:00:00.000Z", "withdrawnAt": "", "restoredAt": "",
    "queriedAt": "2026-11-16 09:00:00.000Z", "factorCount": 108,
    "openVolumeIds": ["V1", "V2", "V3"], "openBooksText": "ABC",
    "subjectType": "child", "subjectId": "rec_child_1", "parentId": "rec_parent_1",
    "geneReportId": "rec_gene_1", "geneBookCount": 4, "booksText": "ABCD",
    "newBookCount": 1, "newBooksText": "D", "versions": [ /* §3.2.5 */ ]
  },
  "subject": { "type": "child", "id": "rec_child_1", "name": "陈小示", "gender": "female", "genderLabel": "女", "birthday": "2016-09-08", "age": 10, "maskedIdNo": "1101**********1234" },
  "parent": { "id": "rec_parent_1", "name": "陈示例", "maskedMobile": "1380****0001" },
  "geneReport": {
    "id": "rec_gene_1", "reportNo": "GR202611160001", "issuer": "示例检测机构", "filedAt": "2026-11-01",
    "syncedAt": "2026-11-16 09:00:00.000Z", "source": "mock", "sourceLabel": "模拟数据", "version": "v1", "booksText": "ABCD", "sectionCount": 72
  },
  "tabs": {
    "selections": [ /* §3.2.4；空数组时前端显示空态 */ ],
    "matching": {
      "frozen": { /* directionSnapshot；未发布为 null */ },
      "current": { /* 当前配置重算；未发布为 null */ },
      "diff": [
        { "directionId": "rec_dir_1", "code": "DIR-001", "name": "舞蹈启蒙", "frozenHitCount": 5, "currentHitCount": 4, "addedHits": [], "removedHits": ["A-02"], "requirementChanged": true }
      ],
      "configChanged": true
    },
    "geneReport": {
      "volumes": [
        { "volumeId": "V1", "bookCode": "A", "name": "生长发育", "open": true, "chapterCount": 2, "factorCount": 18 }
      ]
    },
    "advice": { "available": false, "items": [], "emptyText": "培育建议将在 M5 接入后显示" }
  }
}
```

- 详情接口**不返回** `factorSnapshot` / `volumeSnapshot` 全量（体积大），只返回册摘要；单册叠加层走 #3。
- 为控制体积，`matching.frozen` / `matching.current` 的 `directions[]` 只返回**方向级摘要**（`directionId/code/name/version/tierIds/defaultTierId/total/hitCount/hitRate`），不含 `requirements` 明细；`requirements` 明细只存于快照内部，验收时通过领域测试读取核对。
- `matching.current` / `diff` 由 M4 纯函数用冻结 `factorSnapshot` + **当前**方向配置实时计算，不落库；`configChanged` 为「任一方向 `version` 变化 / 档位停用或改名 / 要素分级或注解变化」。
- 未发布（`pending_publish`）时 `matching.frozen=null`、`matching.current=null`、`diff=[]`、`configChanged=false`。
- `advice.available=false`（M5 前）；M5 接入后替换为真实覆盖册与状态，`available=true`（M3 只保留字段与空态，不实现查询）。

#### 5.4.3 发布预览 `GET /reports/:id/publish-preview`

```json
{
  "reportId": "rec_report_1",
  "reportNo": "GR202611160001",
  "snapshotVersion": 0,
  "factorCount": 72,
  "directionCount": 6,
  "tierCount": 4,
  "volumes": [
    { "volumeId": "V1", "bookCode": "A", "name": "生长发育", "selectable": true, "chapterCount": 2, "factorCount": 18, "reason": "" }
  ],
  "directionHits": [
    { "directionId": "rec_dir_1", "code": "DIR-001", "name": "舞蹈启蒙", "hitCount": 5, "total": 7, "hitRate": 0.7143, "defaultTierName": "启蒙" }
  ],
  "warnings": [],
  "rules": "发布即冻结：要素结果、固定注解、六册开放范围、方向命中与档位；后续配置调整不回写本报告。"
}
```

- `volumes` 固定 6 项；外部未出/无要素册 `selectable=false`，`reason` 为「外部暂无此册」/「该册暂无可解析要素」。
- `directionCount` = 已评估方向数；`tierCount` = 启用档位数；`factorCount` = 全部外部要素数。
- 非 `pending_publish` 状态请求 → 409（弹层只在待发布时打开）。

#### 5.4.4 发布/撤回/恢复/补发/重算响应

```json
// #5 发布
{ "report": { /* 同 5.4.2 report（含快照版本与 versions 末条） */ }, "snapshotVersion": 1, "publishedAt": "…" }
// #6 撤回 / #7 恢复
{ "report": { /* 同 5.4.2 report */ } }
// #9 补发
{ "report": { /* 同 5.4.2 report */ }, "snapshotVersion": 2, "addedBooks": ["D"], "addedVolumeIds": ["V4"] }
// #10 重算
{ "report": { /* 同 5.4.2 report */ }, "snapshotVersion": 3, "regeneratedAt": "…", "warnings": [] }
```

- message：发布「已发布，快照版本 N」；撤回「已撤回，C 端立即不可见」；恢复「已恢复发布」；补发「已补发 N 册」；重算「已按当前配置重新生成快照（版本 N）」。
- 响应中的 `report.versions` 末条即本次动作记录。

#### 5.4.5 补发预览 `GET /reports/:id/reissue-preview`

```json
{
  "reportId": "rec_report_1",
  "reportNo": "GR202611160001",
  "status": "published",
  "snapshotVersion": 1,
  "externalBooksText": "ABCD",
  "publishedBooksText": "ABC",
  "newBooksText": "D",
  "newVolumes": [
    { "volumeId": "V4", "bookCode": "D", "name": "领导商", "chapterCount": 2, "factorCount": 18 }
  ],
  "rules": "补发只追加新增册；原分册章节与要素不变；写版本历史与操作日志。"
}
```

- 无新增册 → 409「当前没有新增分册」；非已发布 → 409。

#### 5.4.6 一键同步 `POST /reports/sync`

```json
// preview
{
  "mode": "preview",
  "source": "mock",
  "at": "2026-11-16T09:00:00.000Z",
  "scanned": 120,
  "counts": { "refreshed": 80, "created": 30, "empty": 8, "failed": 2 },
  "details": [ /* §3.3.1；≤500 条，truncated 标记 */ ],
  "truncated": false
}
// commit
{
  "mode": "commit",
  "source": "mock",
  "syncLogId": "rec_synclog_1",
  "durationMs": 1234,
  "scanned": 120,
  "counts": { "refreshed": 80, "created": 30, "empty": 8, "failed": 2 },
  "details": [ /* 同上，实际写入结果 */ ],
  "truncated": false,
  "changedSincePreview": false
}
```

- `changedSincePreview`：仅当请求带 `previewCounts`（可选，前端传预演结果）且 commit 实际计数不同时为 true；页面提示「外部数据已变化，已按最新结果写入」。
- `failed` 明细的 `message` 不含堆栈/明文。

#### 5.4.7 同步记录 `GET /reports/sync-logs`

```json
{
  "rows": [
    { "id": "rec_synclog_1", "at": "2026-11-16 09:00:00.000Z", "status": "partial", "statusLabel": "部分成功", "refreshed": 80, "created": 30, "empty": 8, "failedCount": 2, "durationMs": 1234, "operatorName": "管理员示例" }
  ]
}
```

#### 5.4.8 基因报告 `GET /gene-reports/:id`

```json
{
  "geneReport": {
    "id": "rec_gene_1", "reportNo": "GR202611160001", "name": "陈小示", "genderLabel": "女", "birthday": "2016-09-08", "age": 10,
    "maskedIdNo": "1101**********1234", "issuer": "示例检测机构", "filedAt": "2026-11-01",
    "syncedAt": "2026-11-16 09:00:00.000Z", "source": "mock", "sourceLabel": "模拟数据", "version": "v1",
    "booksText": "ABCD", "chapters": [{ "bookCode": "A", "name": "生长发育", "chapterCount": 2, "factorCount": 18 }]
  }
}
```

- 只返回元数据与册/章节计数，不返回 sections 全量（要素与注解按报告快照走详情 #2/#3）。

#### 5.4.9 错误码

| 状态码 | 场景 |
| --- | --- |
| 400 | 请求体不是合法 JSON、分页参数非法 |
| 401 | 未登录（统一认证拦截） |
| 403 | 缺少权限码；C 端跨家长/未绑定（按 404 处理见 §7） |
| 404 | 报告/基因报告/单册不存在；非本人报告；未开放册（C 端） |
| 409 | 状态冲突（非待发布发布、非已发布撤回、非已撤回恢复、非已发布补发、无新增册、重复动作、同步进行中）；`reportNo` 唯一冲突；C 端报告撤回/未发布（带 `state`） |
| 422 | Zod 校验失败；`openVolumeIds` 为空/重复/非外部已出册/该册无要素；手机号/身份证筛选格式错误；`mode` 非法 |
| 500 | 快照构建异常、解密失败（不返回明文/堆栈） |
| 503 | 外部基因报告源未配置/不可达 |

### 5.5 服务端落点

| 文件 | 职责 |
| --- | --- |
| `shared/types/talent-report.ts` | 集合实体、状态/动作/版本类型枚举、列表行、详情、快照结构、请求/响应、同步预览/结果类型（不复用旧 `shared/types/talent.ts` 的报告类型；与旧 `shared/utils/talent-report.ts` 状态常量分属不同文件，M6 清理旧文件） |
| `server/utils/talent-report.ts` | 快照构建（factor/volume/direction 冻结）、增量册计算、状态迁移、版本链、`selections` 校验、映射/sanitize、归属与 C 端读模型、`recordTalentReportVersion` |
| `server/utils/talent-gene-report.ts` | 基因报告归一化（books/reportNo/日期）、sections 校验、`sanitizeTalentGeneReportRecord`、报告编号生成 |
| `server/utils/talent-gene-report-source.ts` | `TalentGeneReportSource` 接口 + Mock 源（M8 只换实现） |
| `server/utils/talent-report-sync.ts` | 候选枚举（M2 `query="found"`）、三类归因、`previewTalentReportSync` / `commitTalentReportSync`、同步日志 |
| `server/utils/talent-report-lock.ts` | **复用**旧锁实现（不修改）；键 `report:<id>`、`gene-report-sync` |
| `server/api/admin/talent/reports/**`、`gene-reports/[id].get.ts` | 14 条路由：Zod / 权限 / 审计 / 响应映射 |
| `app/composables/api/useTalentReportApi.ts` | 页面唯一数据入口（不直连 `useApi()`/PB） |
| `app/pages/admin/talent/reports/index.vue` + `components/` | 列表 / 详情 4 页签 / 发布 / 补发 / 撤回恢复 / 重算 / 同步弹层 / 基因报告弹层 |
| `scripts/seed-talent-report.mjs` | 本地演示数据（幂等、虚构、非生产） |

### 5.6 与旧 `[resource]` 动态路由的静态优先验证（实现必做）

风险：`server/api/admin/talent/[resource].get.ts` / `[resource].post.ts` 覆盖 `/api/admin/talent/:resource`；新静态目录 `reports/` 必须优先命中。

实现后在测试与本地服务各验证一次：

1. `GET /api/admin/talent/reports` 返回新列表结构（`rows` + `statusCounts`），**不是** `{ statusCode: 404, message: "天赋资源不存在" }`；
2. `POST /api/admin/talent/reports/sync`（合法 body + 权限）进入新路由（返回 preview 结构），不被 `[resource].post.ts` 拦截；
3. `GET /api/admin/talent/reports/nonexistent` 返回新路由的 404「报告不存在」，而不是「天赋资源不存在」；
4. 旧路由回归：`GET /api/admin/talent/report` 仍走旧逻辑（旧报告列表），行为不变；`GET /api/admin/talent/report/:id` 仍返回旧详情结构；
5. 页面路由：静态页 `app/pages/admin/talent/reports/index.vue` 优先于 `[resource].vue`，访问 `/admin/talent/reports` 渲染新页，访问 `/admin/talent/report` 仍渲染旧动态页；
6. 静态段与 `:id` 的优先级：`POST /api/admin/talent/reports/sync` 与 `GET /api/admin/talent/reports/sync-logs` 命中静态路由，不被 `GET /api/admin/talent/reports/:id` 捕获（`id` 不得为 `sync` / `sync-logs`）；`GET /api/admin/talent/reports/sync` 应返回 404/405（该路径只有 POST），不得落成报告详情。

- 测试落点：`test/talent-report-api.test.ts` 断言路由文件清单与静态段优先；真实服务烟测发第 1–4 条请求。
- **兜底**：若 Nitro 版本导致静态段未优先，新路由迁到独立目录 `server/api/admin/talent-report/**` 并追加 spec/ADR 修订 + 更新 `docs/API.md`；不得用「在 `[resource]` 里加 if」兼容（会破坏旧资源语义）。

## 6. B 端页面

页面文件 `app/pages/admin/talent/reports/index.vue`，路由 `/admin/talent/reports`；`definePageMeta({ layout: "admin", middleware: ["auth", "permission-guard"] })`；请求全部走 `useTalentReportApi.ts`；列表用 `NDataTable` + `AdminPagination`；弹层尺寸沿用 Naive UI `preset`（详情 `ultra`、发布/补发/同步 `wide`）；主操作 ≥ 44px；状态标签用主题令牌与 Naive UI tag 类型，不硬编码色值。

### 6.1 列表（AC-ADM-06-1，PRD L260–262）

**10 列，一列一字段、无副行堆叠**（BR-13）：

| 列 | 内容 | 数据来源 |
| --- | --- | --- |
| 报告编号 | `reportNo` 等宽字体 | API #1 |
| 家长 | `parentName`，可点击打开详情 | API #1 |
| 子女 | `childName`（`self` 显示「本人」） | API #1 |
| 家长手机号 | `maskedMobile` | API #1 |
| 检验人身份证 | `maskedIdNo` | API #1 |
| 基因篇数 | `geneBookCount`（外部已出册数） | API #1 |
| 分册 | `booksText`（外部已出编码，如 `ABCD`）；无数据显示「—」 | API #1 |
| **新增分册** | `newBookCount>0` → `N 篇` + `newBooksText`（如 `3 篇 CDE`）；否则「—」 | API #1 |
| 状态 | `statusLabel` tag（待发布 default / 已发布 success / 已撤回 warning） | API #1 |
| 操作 | 详情（主）/ 基因报告 / 发布 / 撤回 / 恢复发布 / 补发（按状态与权限显示，超过 3 个收进「更多」） | — |

**筛选（PRD L264）**：

- 报告编号输入（`reportNo`，模糊）；
- 子女姓名输入（`childName`，模糊）；
- 家长手机号输入（`parentMobile`：完整 11 位或后 4 位；其他长度前端拦截提示，不请求）；
- 检验人身份证输入（`idNo`：完整 18 位或后 4 位；其他长度前端拦截提示）；
- 发布状态下拉：全部（`statusTotal`）/ 待发布（`statusCounts.pending_publish`）/ 已发布（`statusCounts.published`）/ 已撤回（`statusCounts.retracted`）。
- 五项 AND 叠加；任一筛选或每页条数变化 → 回第 1 页；「重置」清空五项并回第 1 页；点「查询」触发搜索（不做输入即搜），回车等价。
- 默认排序 `-created`；分页 20/50/100。

**行内操作出现条件**（PRD L266–275）：

| 操作 | 条件 | 说明 |
| --- | --- | --- |
| 详情 | 全部 | 打开详情 4 页签 |
| 基因报告 | `geneReportId` 非空 | 打开外部元数据与篇目弹层 |
| 发布 | `status="pending_publish"` + `talent:report:publish` | 打开发布弹层 |
| 撤回 | `status="published"` + `talent:report:publish` | 二次确认 |
| 恢复发布 | `status="retracted"` + `talent:report:publish` | 二次确认（说明沿用原快照） |
| 补发 | `status="published"` 且 `newBookCount>0` + `talent:report:publish` | 打开补发弹层 |

- 顶部主按钮「一键同步全部报告」（`talent:report:sync`）：打开同步弹层。
- 空态：无报告 → 「暂无基因报告」+「一键同步全部报告」按钮（无权限则仅提示文案）；筛选无结果 → 表格空态 +「重置筛选」。
- 错误态：接口失败 → 表格上方错误提示 + 重试；无 `talent:report:list` → 菜单不可见，直达 403 提示。

### 6.2 详情（AC-ADM-06-5，PRD L284–292）

`ultra` 弹层：顶部信息条（报告编号 / 家长 / 子女 / 状态 tag / 快照版本 / 开放册）+ 4 页签（带数量；数量为 0 也显示）：

1. **已选培养方向和目标**：表列 培养方向 / 目标档位 / 建议师资 / 频次 / 提交时间 / 类型（正式 / 自定义）。数据来自 `selections`；空态「尚未选择培养方向」（M4/M7 写入后显示）。
2. **匹配天赋**：表列 方向 / 发布时命中 / 当前配置命中 / 变化 / 方向版本。顶部 `configChanged=true` 时提示「方向或档位配置已变更，当前命中与发布时不同」；可「按当前配置重新生成快照」（`talent:report:publish`，二次确认，说明会更新 C 端内容并产生新版本）。未发布时页签显示「发布后可查看」。
3. **基因报告**：六册表（册名 / 开放状态 / 章节数 / 要素数 / 操作「详情」）。「详情」打开叠加层：表列 章节 / 要素编码 / 潜质要素 / 数据熵（= 分级名，如「优秀 LV3」）/ 固定注解；**后台可查看全部 6 册**（含未开放），未开放册标注「未开放（C 端不可读）」。叠加层尺寸 `large`，单册要素 ≤ 30 行，超出内滚动。
4. **培育建议**：M5 前显示空态「培育建议将在 M5 接入后显示」（`advice.available=false`）；M5 接入后展示当前生效版本覆盖册与状态，可逐份查看（M5 界面，M3 只留挂载点）。

- 顶部操作：发布/撤回/恢复/补发（按状态与权限）、一键同步不做详情入口。
- **页签回落（AC-ADM-06-5）**：支持 `?tab=selected|matching|gene|advice`；旧链接/未知值（如 `?tab=snapshot`、`?tab=versions`）回落到「已选培养方向和目标」；页签切换不重复请求整个详情（首屏一次请求，单册叠加层按需请求）；弹层关闭清理临时状态。
- 详情内所有写动作成功后刷新详情与列表行。

### 6.3 发布弹层（PRD L280）

`wide` 弹层：

- 信息条：报告编号 / 要素数 / 方向数 / 档位数 / 当前版本（`snapshotVersion=0` 显示「—」）；
- 六册勾选：每册一行（册名 + 外部编码 + 章节数/要素数），`selectable=false` 的册置灰并显示原因；至少勾选 1 册；
- 方向命中结果预览：按 `hitCount` 排序，显示前 5 条 + 「其余 N 个方向」折叠；列 方向 / 命中数 / 命中率 / 建议档位；
- 冻结规则说明（固定文案）：「发布即冻结要素结果、固定注解、开放分册、方向命中与档位；后续配置调整不回写本报告；撤回/恢复沿用本快照。」
- 确认按钮 loading 防重复；成功后 toast「已发布，快照版本 1」→ 关闭弹层、刷新列表与详情。

### 6.4 撤回 / 恢复 / 补发（PRD L272–282）

- **撤回**：`dialog.warning` 二次确认，文案含「撤回后 C 端立即显示『报告内容更新中』，分册、下载与建议均不可见；后台保留已撤回状态，可恢复发布。」
- **恢复发布**：二次确认，文案含「沿用原快照恢复，不重新生成，不改变快照版本；C 端立即恢复可见。」
- **补发**：`wide` 弹层：外部已出（N 册，编码）/ 本次新增（N 册，编码）/ 补发规则（只追加新增册，原分册内容不变，写版本历史与操作日志）/ 新增册清单（册名 / 章节数 / 要素数）；确认后 toast「已补发 N 册」→ 刷新列表（新增分册变「—」）与详情。
- 无新增册时「补发」按钮不出现；直接调接口返回 409 并按统一错误提示。

### 6.5 重算快照（PRD L290）

- 入口在详情「匹配天赋」页签右上角，按钮「按当前配置重新生成快照」（`talent:report:publish`）。
- 二次确认：说明「将按当前方向/档位/要素配置重算本报告快照，影响 C 端展示，快照版本 +1，并写入版本历史；开放分册与要素范围不变。」
- 成功后刷新详情，`versions` 末条类型「重新生成快照」。

### 6.6 一键同步弹层（PRD L278）

`wide` 弹层，三阶段：

1. **初始**：显示数据源（`source=mock` 时黄色提示「当前为模拟数据源，M8 接入真实接口」）+「开始预演」按钮；无候选时提示「暂无已查到结果的子女，请先在会员管理中查询」。
2. **预演结果**：三类人数卡片（刷新同步 N / 新建报告 N / 外部暂无数据 N）+ 失败人数（若有，红色单列）；逐人明细表（姓名 / 脱敏身份证 / 报告编号 / 类型 / 外部已出 / 本次新增 / 原因或失败摘要），支持内滚动；「确认同步」按钮（`talent:report:sync`）+「重新预演」。
3. **提交结果**：实际三类人数 + 失败明细 + `syncLogId` + 耗时；若 `changedSincePreview=true` 额外提示；「查看最近同步记录」可展开最近 5 条（API #13）。

- 预演不写任何数据、不写日志；关闭弹层清空预演结果；提交中禁止重复点击。

### 6.7 基因报告弹层

`large` 弹层：元数据（报告编号 / 检验人姓名 / 脱敏身份证 / 性别 / 出生日期 / 年龄 / 出具方 / 建档日 / 同步时间 / 来源 / 版本）+ 六册列表（外部编码 / 册名 / 章节数 / 要素数）；只读，不提供编辑（外部数据由同步刷新）。

### 6.8 通用交互

- 按钮权限：`hasPermission` 隐藏/禁用；服务端 403 兜底。
- 反馈：发布/撤回/恢复/补发/重算/同步中 loading；成功/失败统一 toast；破坏性动作二次确认。
- 空态/错误态：列表、详情每页签、弹层各自有空态；接口失败有重试。
- 主题/窄屏：只用主题令牌；1280 宽表格不溢出，375 宽表格内部横向滚动；操作列固定右侧（`fixed: "right"`）。
- 不出现「重置数据 / 恢复演示数据」「上传 PDF」「报告接收」入口（旧能力 M6/M8，M3 不提供）。

## 7. C 端契约与边界（M3 冻结，M7 实现页面）

### 7.1 只读契约（PRD §9 C 端行、§10.5）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/client/talent/reports/:id` | 家长登录态 + 归属 | 已发布报告总览：信息条 + 开放分册 + 方向命中快照 + 已选方向；撤回/未发布返回 409 + `state` |
| GET | `/api/client/talent/reports/:id/volumes/:volumeId` | 同上 | 单册要素：仅 `open=true` 的册；未开放 404 |

- **M3 交付**：`server/utils/talent-report.ts` 中的 `assertTalentReportPublished(userId, reportId)`、`getTalentReportClientSnapshot(report)`、`listTalentReportOpenVolumes(report)`；**路由文件与 C 端页面归 M7**（M3 只冻结契约与守卫，不写 `server/api/client/talent/reports/*`，避免与 M7 页面同期返工）。AC-ADM-06-2/3 的 C 端页面证据留 M7，服务端守卫与快照读取证据由 M3 的领域测试提供（见 acceptance §3 A5）。
- 未发布/撤回/解绑/停用：一律拒绝。`retracted` → 409 `{ code: "report_retracted", state: "retracted", message: "报告内容更新中" }`；`pending_publish` → 409 `{ code: "report_pending", state: "pending_publish", message: "报告正在整理中" }`；非本人/未绑定/已解绑 → 404（不泄露存在性）。
- C 端响应只含快照数据（方向命中、开放册、要素结果、固定注解、已选方向），**不重算**方向；要素编码/分册字母不展示给家长（BR-12，M7 展示层处理）。
- C 端不返回 `factorSnapshot` 全量；按分册读取（`/volumes/:volumeId`），首屏 ≤1.5s 口径由 M7/M9 验收。

### 7.2 归属与失效

- 服务端只按 `talent_parents.userId = 当前账号` 解析 parent；不接受前端传 `parentId`。
- 复用 M2 `assertTalentChildAccess(userId, childId)`；报告归属 `report.parentId` 与解析出的 parent 必须一致。
- 家长停用 / 子女解绑后立即不可读；撤回后立即 409；恢复后立即恢复，不依赖缓存。

## 8. 模块联动边界

### 8.1 与 M2（parent/child）

- M3 的 `subjectType="child"` 时 `subjectId = talent_children.id`；`parentId = talent_children.parentId`。M2 解绑不删档，历史报告仍可按 `subjectId` 追溯（ADR 0002-D7）。
- 同步候选 = M2 已查到（`query="found"`）且子女/家长均正常的对象。**M3 不触发 M2 查询、不调用 M2 的 `TalentGeneQuerySource`、不改写子女查询状态**；M2 查询源负责「查到/未查到」，M3 基因报告源只对已查到对象拉取报告数据。M3 只读候选集合，不改 M2 集合。
- 身份证明文由 M2 密文在服务端内存解密后传给外部源，不落 M3 集合/日志；`maskedIdNo` 复用 M2 脱敏函数；`idNoHash` 复用 M2 HMAC。
- M2 的 `countTalentMemberReports` 特性探测已预留 `talent_reports.subjectType/subjectId`：M3 落地后会员列表「关联报告」自动有数（M2 代码不改）。
- M2 不修改 M3 集合；M3 不修改 `talent_parents/talent_children` 结构。

### 8.2 与 M5（培育建议）

- M3 **不写** `talent_advice_*`；报告发布/撤回/恢复不改建议集合。BR-06「建议与报告同发」由 M5 以**报告状态为唯一可见性真源**派生：建议可读 = `advice.publishStatus=published && report.status=published`；报告撤回 → C 端建议不可见（派生，无需 M3 双写）。
- M3 报告详情第 4 页签只读 M5 数据（M5 提供 `listAdviceForSubject(subjectType, subjectId)` 或详情接口）；M5 未实现时 `advice.available=false` 空态。
- 补发新增分册与建议是否立即补册：PRD §13.2-1 未确认，M3 不处理；M5 按建议周期决策（新版本生效才切换）。
- M5 不修改报告快照与状态；报告撤回/恢复的 C 端建议可见性以派生查询实现，不落建议状态（避免双写漂移）。

### 8.3 与 M4（方向命中与选择）

- 发布/补发/重算：M3 调用 M4 纯函数；发布用 `computeTalentDirectionMatches`，补发用 `refreshDirectionSnapshot(base, factors, affectedFactorCodes)`（增量：旧要求命中原样复制，只更新新增册要素），重算用全量 `computeTalentDirectionMatches`。M3 不实现算法、不排序（M4 返回已排序结果）。
- 方向预览：`GET /reports/:id/direction-preview` 由 M3 路由调用 M4 纯函数，返回冻结 vs 当前 + diff；不落库。
- 方向选择：M4 的 C 端 `selections` 接口写 `talent_reports.selections` 并调 M3 `recordTalentReportVersion`（`type="selection"`，不改 `snapshotVersion`）；M3 不写 selections。
- 方向/档位删除保护（M1/M4 已做）读取 `talent_reports.selections` / `directionSnapshot`；M3 集合就绪后自动生效，M3 不改 M1 保护逻辑。
- M4 自定义方向 `talent_direction_requests` 归 M4；M3 的 selections 只存 `requestId/manualName` 冻结值，不反查（归并/转正式不回溯历史）。

### 8.4 与 M8（PDF / 真实外部接口）

- M3 不生成、不上传、不删除 PDF；旧 `pdfUrl` / `pdfFileKey` / `pdfFileName` 字段保留在旧行，新行不写；旧 `talent-report-pdf.ts` 不被 M3 调用。
- M8 的 PDF 交付建议：按报告快照（`volumeSnapshot/factorSnapshot`）渲染；存储/下载走权限代理 + 时效 + 水印；如需新字段/集合，M8 另立 ADR，不复用旧 `pdfUrl` 字段（避免新旧语义混淆）。
- 真实外部基因报告接口：M3 冻结 `TalentGeneReportSource` 签名（§9 接口见下），M8 只实现 `external` 源并切换环境变量；M8 负责重试队列、限流、失败告警、定时同步（M3 一键手动同步保留）。
- 生产环境默认 Mock 时 `env-check` 增加 warn（同 M2 写法）；M8 接入后删除提示。

### 8.5 与 M6 / M7 / M9

- **M6**：删除旧页 `[resource].vue` / `receive.vue` / `sync.vue`、旧路由 `/api/admin/talent/report*`、旧集合 `talent_report_items/publications/receipts/templates*`、旧权限码 `talent:report:revoke/edit/receive`、旧 `talent_reports.customerId` 字段与旧行；M3 全程不删。
- **M7**：实现 C 端页面与 §7 两条只读路由；消费 M3 冻结契约；不重算快照；M7 可扩展报告列表/对象切换，但报告内容与状态门禁以 M3 为准。
- **M9**：1000 条列表性能、e2e 重写；M3 只保证索引与两段查询；旧 e2e 02–05 中报告相关断言在 M3 期间不作为门禁（旧页菜单已无入口）。

## 9. 同步源接口（M3 冻结，M8 只换实现）

```ts
// server/utils/talent-gene-report-source.ts
export const TALENT_GENE_REPORT_MOCK_SOURCE = "mock";

export interface TalentGeneReportSyncSubject {
  subjectType: "child" | "self";
  subjectId: string;
  parentId: string;
  name: string;
  gender: "male" | "female";
  birthday: string;
  age: number;
  idNo: string;      // 明文仅内存，不落库、不进日志
  mobile: string;    // 家长手机号明文，仅内存
  existingReportNo?: string;
}

export interface TalentGeneReportExternalSection {
  bookCode: "A" | "B" | "C" | "D" | "E" | "F";
  chapter: string;
  factorCode: string;
  factorName?: string;
  levelCode: string;
  score?: number;
  condition?: string;
}

export interface TalentGeneReportExternalData {
  found: boolean;
  reason?: "no_result" | "info_mismatch";
  reportNo?: string;
  issuer?: string;
  filedAt?: string;
  sourceVersion?: string;
  books: Array<"A" | "B" | "C" | "D" | "E" | "F">;
  sections: TalentGeneReportExternalSection[];
}

export interface TalentGeneReportSource {
  readonly source: "mock" | "external";
  fetch(subject: TalentGeneReportSyncSubject): Promise<TalentGeneReportExternalData>;
}

/** M3 固定返回 Mock；M8 按配置切换真实源，不改调用方。 */
export function createTalentGeneReportSource(): TalentGeneReportSource;

export async function previewTalentReportSync(options?: {
  source?: TalentGeneReportSource;
  now?: Date;
}): Promise<TalentReportSyncPreview>;

export async function commitTalentReportSync(options?: {
  source?: TalentGeneReportSource;
  now?: Date;
}): Promise<TalentReportSyncResult>;
```

Mock 行为（仅开发/M3 验收；生产 M8 必须切真实源）：

| 环境变量 | 默认 | 作用 |
| --- | --- | --- |
| `TALENT_GENE_REPORT_SOURCE` | `mock` | `mock` / `external` |
| `TALENT_GENE_REPORT_MOCK_MODE` | `all_found` | `all_found` / `empty` / `partial`（前 50% found）/ `error`（前 1 人失败）/ `incremental`（已有报告的候选追加 D、E 两册） |
| `TALENT_GENE_REPORT_MOCK_DELAY_MS` | `0` | 单次调用延迟，用于验证 loading |

- Mock 数据必须由 `talent_children` 的姓名/性别/生日生成，要素编码与分级取 M1 启用数据（A-01…F-23、LV1–LV4），不得写死真实 PII。
- 测试可注入假 `source` 构造「found / empty / 抛错 / sections 非法」四种结果，不需要环境变量。

## 10. 验收映射

完整追溯、测试命令与证据表见 [acceptance.md](acceptance.md)。落点速查：

| 需求 | PRD 位置 | 本文落点 |
| --- | --- | --- |
| AC-ADM-06-1 列表 10 列、新增分册列只在有新增时显示内容 | §6.6 L260–262、L295 | §6.1、§5.4.1、API #1 |
| AC-ADM-06-2 发布后已发布、C 端可读、快照版本 +1 | §6.6 L296、§8.3 L522–533 | §4.1、§4.4、§5.4.4、API #5；C 端证据见 §7/acceptance A5 |
| AC-ADM-06-3 撤回后 C 端「报告内容更新中」，恢复后恢复 | §6.6 L297、BR-10 L106 | §4.1、§5.4.9、§7.1、API #6/#7 |
| AC-ADM-06-4 补发只追加新增册，原分册章节与要素不变 | §6.6 L298、BR-05 L101 | §4.3、§4.5、§5.4.5、API #9 |
| AC-ADM-06-5 详情 4 页签可切换，旧页签链接自动回落 | §6.6 L299 | §6.2、API #2 |
| 列表 10 列、四筛选 + 状态数量 | §6.6 L260–264 | §6.1、§5.4.1 |
| 行内操作条件（详情/基因报告/发布/撤回/恢复/补发） | §6.6 L266–275 | §6.1、§6.3–§6.5 |
| 一键同步三类归因 + 预演确认 + 逐人明细 + 日志 | §6.6 L278 | §4.2、§5.4.6、§6.6 |
| 发布弹层（信息条 + 六册 + 方向预览 + 冻结说明） | §6.6 L280 | §5.4.3、§6.3 |
| 补发弹层（外部已出/本次新增/规则/清单） | §6.6 L282 | §5.4.5、§6.4 |
| 详情 4 页签内容 | §6.6 L284–292 | §5.4.2、§6.2 |
| BR-02 一人一份、重复查询不重复建档 | L96 | §3.1、§4.2 |
| BR-03 发布即冻结、配置调整不回写 | L99 | §4.5、ADR D5 |
| BR-04 固定六册 A–F | L100 | §3.2.2 |
| BR-05 增量分册、补发只追加 | L101 | §4.3 |
| BR-06 建议与报告同发（派生可见性） | L102 | §8.2 |
| BR-09 0 命中仍可选 / 快照为空 | L105 | §3.2.3（M4 负责推荐回退） |
| BR-10 撤回 C 端口径 | L106 | §4.1、§7.1 |
| BR-12 编码不对家长展示 | L108 | §7.1（M7 展示层） |
| §8.2 gene_report / report 字段 | L470–490 | §3.1、§3.2、§3.5 |
| §8.3 报告状态机 | L522–533 | §4.1 |
| §9 API 报告分组 | L539–557 | §5.2（路径按 PRD，`publish-new` 保留原路径） |
| §10 数据权限、脱敏、审计、文件、接口归属 | L581–590 | §2.4、§3.1、§4.5、§7.1、§8.4 |
| §12 报告 10 列/发布冻结/撤回恢复/补发 | L608–616 | §6、acceptance §2 |

## 11. 测试命令与门禁（按 `docs/QUALITY.md` 分级）

> 涉及 schema / 权限 / 状态机 / 快照不可变 / C-B 跨端契约 → 「schema / 认证 / 权限」级：定向 Vitest + 真实 PocketBase 新库烟测 + B/API 类型检查 + 页面人工烟测。

| # | 命令 | 覆盖 |
| --- | --- | --- |
| 1 | `pnpm vitest run test/talent-report-domain.test.ts` | 快照构建（factor/volume/direction/selections）、A–F↔V1–V6 映射、增量分册计算、状态迁移与非法迁移、版本链（发布/撤回/恢复/补发/重算/选择）、补发只追加（旧册 JSON hash 不变）、快照不可变（改 M1 配置后 hash 不变）、`sanitize` 不含明文/hash、`recordTalentReportVersion` |
| 2 | `pnpm vitest run test/talent-report-sync.test.ts` | 候选枚举（M2 found/正常）、三类归因、`empty` 不写、`failed` 继续、重复 commit 幂等（行数不增、版本不变）、preview 零写入（前后行数与 `updated` 不变）、`refreshed` 不改已发布快照、`subjectDetails` 不含明文、Mock 五种模式、source 抛错整体 503 |
| 3 | `pnpm vitest run test/talent-report-api.test.ts` | 14 条路由文件清单与权限码映射、静态段优先于旧 `[resource]`、无删除/新建/PDF 路由、4 个权威权限码 ↔ C/F 菜单行、`基因报告` 菜单唯一且新 path、旧码与旧路由保留、响应不含 `Cipher/Hash`/明文 |
| 4 | `pnpm vitest run test/talent-report-lifecycle.test.ts test/talent-report-completeness.test.ts test/talent-admin.test.ts test/talent-matching.test.ts` | 回归：旧报告生命周期/完整性/旧管理资源/旧匹配逻辑未被改坏 |
| 5 | `pnpm typecheck` | 类型、`shared/types/talent-report.ts`、页面与 API 一致性 |
| 6 | `pnpm lint` | 代码规范 |
| 7 | `export POCKETBASE_DATA_DIR="$(mktemp -d /tmp/tongjia-m3-XXXXXX)" && pnpm env:doctor && pnpm env:setup` | 新库初始化；断言 §3.4 索引全部存在；`talent_reports.customerId` 已放宽为非必填；旧集合/旧索引仍在 |
| 8 | `pnpm talent:sync`（连续两次） | 存量库幂等（只加不删）：新集合/字段/索引只加一次；`customerId` 必填放宽不反复变更；菜单/权限码不重复；4 码均有 C/F 行；旧 `talent_report_items/publications/receipts` 结构未变 |
| 9 | `pnpm talent:report:seed`（可选，本地演示） | 幂等种子：待发布/已发布/有新增册/已撤回四种场景；不触碰旧行 |
| 10 | `pnpm pb` + `pnpm dev`，登录后人工烟测 `/admin/talent/reports` | 10 列、四筛选 + 状态数量、详情 4 页签与页签回落（AC-06-5）、发布（AC-06-1/2）、撤回/恢复（AC-06-3）、补发（AC-06-4）、一键同步预演/确认、空态/错误态 |
| 11 | API 安全直连 | 未登录 401；无 `report:publish` 发布 403 且无成功日志；跨状态动作 409；筛选格式 422；同步 commit 写 1 条 `talent_sync_logs` + 1 条 `oper_logs`；preview 前后集合行数不变 |
| 12 | `git diff --check` | 空白错误；确认只改 `docs/specs/M3-reports/` 与 `docs/adr/`（本任务） |

- 旧 e2e 02–05 覆盖旧报告页，M3 不纳入门禁；M9 重写。
- 页面验收依赖 seed 与 M2/M4 数据；未就绪时对应条目记「未验证」并写阻塞原因。
- 生产环境变量核对：`TALENT_GENE_REPORT_SOURCE` 在生产必须切 `external`（M8）；M3 期间默认 `mock` 时 `env-check` 只 warn。

## 12. 实施顺序（8–9 人天，计划基线 7–8）

1. **契约冻结（0.5d）**：`shared/types/talent-report.ts`；4 个权限码 + 菜单重指向 + `TALENT_PATHS`；与 M4 确认 `factorSnapshot`/`directionSnapshot`/`selections`/helper（本 spec §3.2、§8.3 已冻结）；与 M2 确认 `subjectId`/解密/归属 helper。
2. **数据层（1.5d）**：`talent_gene_reports` 新集合、`talent_reports` 增量字段、`talent_sync_logs` 扩展、索引（`setup.mjs` + `sync-talent.mjs` 只加不删、放宽 `customerId`）；`talent-gene-report.ts` / `talent-gene-report-source.ts`（Mock）；`test/talent-report-domain.test.ts` 第一部分（映射/归一化/唯一键）。
3. **快照与状态机（1.5d）**：`talent-report.ts`（factor/volume/direction 构建、版本链、状态迁移、`recordTalentReportVersion`、sanitize、C 端守卫）；依赖 M4 纯函数可先以假实现/注入函数跑通测试，M4 合并后替换。
4. **同步（1.5d）**：候选枚举、三类归因、preview/commit、同步日志、并发锁；`test/talent-report-sync.test.ts`。
5. **API（1.5d）**：14 条路由（Zod / 权限 / `withOperLog` / 响应映射）、静态段优先验证；`test/talent-report-api.test.ts`。
6. **B 端页面（2d）**：列表 10 列 + 四筛选（AC-06-1 最硬）→ 详情 4 页签 + 页签回落（AC-06-5）→ 发布（AC-06-2）→ 撤回/恢复（AC-06-3）→ 补发（AC-06-4）→ 一键同步预演/确认 → 重算 → 空态/错误态；`useTalentReportApi.ts`；人工烟测。
7. **收口（0.5d）**：`seed-talent-report.mjs`；`git diff --check`；文档同步（由 lead 派发）；verifier 填 acceptance 证据。

- 建议 2 → 4 先行（数据与同步不依赖 M4 完整实现，可用注入纯函数），发布/重算/方向预览在 M4 纯函数合并后接；页面内部先列表 + 筛选，再详情与弹层。

## 13. 风险与处置

| # | 风险 | 处置 |
| --- | --- | --- |
| R1 | `talent_reports.customerId` 旧字段 `required=true`，新行写不进 | `sync-talent.mjs` 只放宽必填（ADR 0001-D1 允许）；新行 `customerId=""`；新代码不读不写；旧行值不动 |
| R2 | 新静态路由 `/reports` 与旧 `[resource].get.ts` 冲突 | §5.6 实现后定向验证；兜底迁 `server/api/admin/talent-report/**` 并追加 spec/ADR 修订 + 更新 API 文档 |
| R3 | 旧报告页（平台管理员）过渡期会显示新行、字段不全 | 已知过渡行为：旧列表不按 `subjectType` 过滤且不可改（只读旧口径）；新页按 `subjectType != ""` 过滤；M6 删除旧页。验收不含旧页显示，但记录在 acceptance |
| R4 | 外部 `books` 编码 A–F 与内部 `V1–V6` 映射未客户书面确认 | 按 BR-04 固定映射（ADR D3）；如客户使用其他编码，映射表集中在一处常量，改动成本 1 处 + 重跑同步 |
| R5 | M4 纯函数未就绪阻塞发布/补发/重算 | 数据层与同步先行；快照构建依赖注入纯函数，M4 合并后替换；发布/重算在 M4 完成后联调（M3 与 M4 并行，非串行等待） |
| R6 | 补发方向快照口径（增量 vs 不重算） | 采用 M4 `refreshDirectionSnapshot` 增量：旧要求命中复制、只更新新增册要素；若 M4 最终不提供，退化为「补发不改 directionSnapshot，只在 versions 记录新增册」并在 acceptance 注明口径（已与 M4 对齐，采用增量） |
| R7 | 快照 JSON 体积（108 要素 × 注解 + 六册嵌套 + 方向要求） | 列表不返回快照；详情只返回册摘要；单册叠加层按册读取；预估单报告快照 < 300KB，PB json 可存；M9 如有性能问题再拆 |
| R8 | 「一人一份」与「复测」冲突（PRD §13.2-3 未确认） | M3 严格一人一份；复测多份需客户确认后另立 ADR + schema 变更（增加 reportCycle 或改为多行唯一键），M3 不预留 |
| R9 | C 端页面 M7 前无法端到端证明「C 端可读/更新中」 | AC-06-2/3 拆分：服务端守卫/快照读取由 M3 单测证明；C 端页面证据记「不在范围（M7）」，不阻塞 M3 服务端验收 |
| R10 | 旧 `status="error"` 行与新三态混存 | 新列表按 `subjectType != ""` 排除旧行；新代码不写 `error`；旧行只由旧页/旧接口处理 |
| R11 | 刷新同步更新 `sections` 后，补发只取新增册，旧册外部修订被丢弃 | 明确口径：已发布报告不追外部修订（BR-03 发布即冻结）；外部修订需显式「重新生成快照」或另立「报告重同步」任务，M3 不做 |
| R12 | 同步扫描候选依赖 M2 状态机，M2 未完成时无法联调 | 种子脚本可构造 `query="found"` 子女；单元测试可注入假候选/假 source；M2 完成后做一次真实联调 |
| R13 | 旧页/旧集合清理遗漏导致新行出现在机构端 | 机构端旧接口按 `customerId` 过滤，新行 `customerId=""` 天然不命中；M6 统一删除；M3 不修改旧代码 |

## 14. 未决项

| # | 未决项 | 现状 / 本文处理 | 需谁裁决 |
| --- | --- | --- | --- |
| C1 | C 端只读路由（`/api/client/talent/reports/:id`、`/volumes/:id`）由 M3 提前实现还是 M7 实现 | 本文默认 **M7 实现页面与路由**，M3 只冻结契约 + 守卫函数（§7.1）；AC-06-2/3 的 C 端页面证据留 M7。如 lead 要求 M3 打通端到端，可把 2 条只读路由提前到 M3（+0.5 人天），不改变契约 | lead / M7 |
| C2 | 家长本人（`self`）是否也要同步/发布报告 | PRD §8.2 gene_report 的 `child_id` 可为 `SELF`，但 §6.6 一键同步明确「以子女身份证号为主键」。本文默认 **M3 只同步 `child`**，`self` 结构保留（唯一键、读接口、C 端快照均支持），不主动创建；若客户要求本人报告，另开小任务（复用同一套同步与发布逻辑，候选枚举加 `talent_parents`） | 客户 / lead |
| C3 | 补发时方向快照增量重算的精确语义（旧要求复制、新要求按新增册更新、重新排序） | 已与 M4 对齐采用 `refreshDirectionSnapshot` 增量；若 M4 实现差异，以 M4 spec 为准并回写本文 §4.4 | M4 实现后复核 |
| C4 | 外部 `books` 编码是否就是 A–F、内部 `V1–V6` 是否客户认可 | 按 BR-04 固定映射（§3.2.2）；映射集中常量；客户如使用「第 1 册/1」等编码，在同步源适配层转换，不改快照/接口结构 | 客户 / M8 接口契约 |
| C5 | 同步失败是否需要在 M3 内重试/告警 | 本文默认 **M3 只记录 `failed` 明细与日志**，重试队列/告警归 M8（§8.4）；页面提供「重新预演/确认」人工重试 | M8 |
| C6 | 旧报告页过渡期显示新行是否可接受 | 本文默认接受（R3）：旧页只读、无入口、M6 删除；如客户验收时发现混淆，M3 可临时在旧列表加过滤（需改旧路由，超出「旧代码只读」边界，需 lead 批准） | lead |

## 15. 文档同步清单（M3 出口，由 lead 派发，不在本任务写范围）

- `docs/API.md`：14 条新路由 + 权限列；旧 `/report*` 路由标注「M6 删除」。
- `docs/ARCHITECTURE.md`：集合表新增 `talent_gene_reports`；`talent_reports` 标注「增量改造 + 旧 `customerId` 只读」；旧报告集合标注「保留到 M6」。
- `docs/STATUS.md`：集合数、路由数、权限码数、Mock 同步源与种子命令。
- `docs/TALENT-LOCAL.md`：报告域 Mock 同步模式（`TALENT_GENE_REPORT_MOCK_MODE` 等）、`pnpm talent:report:seed`、发布/补发/同步烟测步骤。
- `docs/specs/M3-reports/acceptance.md`：verifier 填证据表。
- `docs/specs/README.md`：M3 行状态与 ADR 索引（由 lead 维护）。