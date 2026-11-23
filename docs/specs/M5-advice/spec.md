# M5 · 培育建议域规格（版本 / 建议书 / 接收新一版 / 发布撤回 / C 端只读契约）

> 状态：**待实现（2026-11-17，architect / task-19 交付实现合同）**。本文是 M5 的实现合同，只写 docs，不改源码。
> 依据：PRD v1.1 §6.7（L301–322）、§7.6 C 端培育建议（L374–380）、§8.2 advice_version / advice_doc（L488–494）、§8.3 建议状态机（L533）、§9 API（L564–566、L572）、§10 权限与安全（L581–587）、§12 验收（L615、L625）、BR-06（L102）/ BR-07（L103）/ BR-10（L106）/ BR-11（L107）/ BR-13（L109）、§13.2 待明确口径（L647–648）、§13.3 待定项（L656）；[M3 报告域规格](../M3-reports/spec.md)（报告三态、基因报告 `reportNo`/`books`/`sections`/`maskedIdNo`/`idNoHash`、C 端 409 契约、详情第 4 页签挂载点）、[ADR 0003](../../adr/0003-m3-report-domain.md)（D2 一人一份、D5 版本链、D8 模块边界）；[M2 会员域规格](../M2-members/spec.md)（parent/child 归属、脱敏/HMAC、解绑不删档）；[M4 方向匹配规格](../M4-matching/spec.md)（方向选择契约、C 端「按建议选方向」跳转边界）；[M1 规则域规格](../M1-rules/spec.md)（分级与固定注解不参与建议正文）；旧实现 `scripts/setup.mjs` 的 `talent_cultivation_contents` / `talent_content_libraries` / `talent_elements`、`server/utils/talent-matching.ts`、旧页 `app/pages/admin/talent/[resource].vue`（**只读，不修改、不复用其口径**）；PRD 原型 `talent-prototype-v2` 的建议页与数据形状（2026-11-16 原型 `?v=1.61.0`，仅作页面形状与字段样例，不作为正式口径）。
> 关键取舍：[ADR 0005 · M5 培育建议域关键决策](../../adr/0005-m5-advice-domain.md)（D1–D6）。
> 验收：见同目录 [acceptance.md](acceptance.md)（初始全部「未验证」）。
> 协作对齐：M3 已冻结「报告状态为建议可见性唯一真源、M3 不写 `talent_advice_*`」（M3 spec §8.2）；M5 以派生可见性实现 BR-06，不双写。M3 报告详情第 4 页签由 M5 提供只读挂载数据（§7.4）。
> 修订：v1（2026-11-17，首版）。

## 0. 决策基线（不再作为未决项）

本文采用的关键口径全部落在 ADR 0005-D1–D6；实现 agent 不得自行改口径：

| 决策 | 结论 | 本文落点 |
| --- | --- | --- |
| D1 版本与生效版 | 版本行 `talent_advice_versions` 与建议行 `talent_advice_docs` 分离；`status="active"` 的部分唯一索引保证**同一时刻只有一版生效**；归档只读；不建「当前版本指针」字段、不建配置表 | §3.1、§4.1、§4.6、ADR D1 |
| D2 sections JSON | **一份建议书 = 一份基因报告 × 一个版本**；分册内容内嵌在 `sections[]`（四段 + book/chapter/factor/entropy/variant），不建子表；列表所需聚合值落**派生缓存字段**（只读、可由 sections 重建） | §3.2、§3.3、§3.4、ADR D2 |
| D3 同步即发布 | 外部同步写入即 `publishStatus="published"`、`publishedAt=syncedAt`；后台发布/撤回只改家长端可见性、不改正文；重复版本 409，不静默成功 | §4.2、§4.3、§5.5、ADR D3 |
| D4 撤回与 M3 联动 | **不双写报告/建议状态**；C 端建议可见 = 建议已发布 ∧ 属于当前生效版本 ∧ 报告 `published` ∧ 归属正常（派生）；报告撤回/恢复不改建议行 `publishStatus` | §4.5、§7.2、ADR D4 |
| D5 年龄口径 | 同步日按 `calculateTalentAge(birthday, effectiveAt)` 算**精确周岁**并冻结；`matchKey = 姓名｜N 岁`；列表年龄筛选按冻结 `age` **精确相等**，不区间合并 | §3.2、§4.3、§6.1、ADR D5 |
| D6 旧数据不迁移 | 旧 `talent_cultivation_contents`（要素 × 分级 × 年龄/性别的内容库口径）、旧要素/内容库、旧建议相关代码**不复用、不迁移、不双写**；旧集合保留到 M6；新集合独立 | §1.2、§3.8、ADR D6 |

**本文未决项 8 条客户/协作口径**见 §14；未决项不阻塞数据层与接口开工。

## 1. 范围与不在范围

### 1.1 本里程碑交付

- **集合（2 个，全新）**：
  - `talent_advice_versions`（建议版本：当前生效 / 已归档、周期、生效/下一版/同步时间、来源、说明、操作人）；
  - `talent_advice_docs`（建议书：按基因报告 + 版本，含归属、脱敏身份、精确周岁、匹配键、分册覆盖册、`sections[]` 四段正文、发布状态与时间）。
- **类型与领域工具**：`shared/types/talent-advice.ts`；`server/utils/talent-advice.ts`（年龄/匹配键/建议编号/`sections` 归一化与校验/派生摘要/当前生效版本解析/发布撤回状态迁移/派生可见性/脱敏映射/版本历史与按人历史读模型/客户端只读读模型）；`server/utils/talent-advice-source.ts`（冻结适配器接口 + Mock 外部建议源）。
- **服务端**：`server/api/admin/talent/advice/**` 9 条管理路由（§5.2）；Zod + `requirePermission` + `withOperLog` + `success`；版本接收用 `withTalentReportLock("advice:version")` 串行化（复用既有锁实现，不改锁文件）；扩展 `talent_sync_logs.syncScope="advice_version"` 日志。
- **B 端页面**：改造占位页 `app/pages/admin/talent/advice.vue`（列表 15 列 + 5 项检索 + 版本筛选 + 历史版本只读条 + 接收新一版/版本历史/建议书/历史版本/发布/撤回弹层 + 导出）；页面组件放 `app/pages/admin/talent/advice/components/`（`nuxt.config.ts` 已把 `pages/**/components/**` 注册为组件并移除路由，**不新增页面路由**）；`app/composables/api/useTalentAdviceApi.ts`。
- **权限与菜单**：复用既有 C 菜单行「培育建议」与 `talent:advice:list`；新增 4 个 F 权限码（`view/publish/sync/export`）并登记 `setup.mjs` + `sync-talent.mjs`；`useMenuTree.ts` 的 `TALENT_PATHS` 已含 `/admin/talent/advice`，无需改动。
- **C 端只读契约**：冻结 `GET /api/client/talent/advice` 的响应结构、归属与状态门禁、可见性派生、展示口径；实现服务端守卫函数（§7）。**C 端路由与页面归 M7**（与 M3 §7.1 同一处理方式）。
- **M3 报告详情第 4 页签挂载数据**：提供 `listTalentAdviceForSubject(subjectType, subjectId)` 与 `GET /api/admin/talent/advice/subject`；M3 详情路由接线是 1 处跨模块小改（§8.2、§14 C6），不属 M5 页面范围。
- **本地演示数据**：`scripts/seed-talent-advice.mjs` + `pnpm talent:advice:seed`（幂等、纯虚构、拒绝生产）。
- **文档同步（M5 出口，由 lead 派发，不在本任务写范围）**：`docs/API.md`、`docs/ARCHITECTURE.md`、`docs/STATUS.md`、`docs/TALENT-LOCAL.md`。

### 1.2 不在范围（M5 不做，避免越界）

| 项 | 归属 | 说明 |
| --- | --- | --- |
| 基因报告集合、报告三态、发布快照、撤回/恢复/补发、一键同步、报告详情 4 页签页面 | M3 | M5 **只读** `talent_gene_reports` / `talent_reports`；报告状态是建议 C 端可见性的唯一真源（派生，§4.5） |
| C 端小程序页面、报告页「培育建议」页签、建议书详情页、数据熵筛选交互、路由与入口 | M7 | M5 只冻结 §7 契约与服务端守卫；AC-ADM-07-3 的 C 端页面证据留 M7 |
| 真实外部培育建议接口、重试队列、失败告警、定时同步、外部匹配算法 | M8 | M5 冻结 `TalentAdviceSource` 接口 + Mock 源（§9）；M8 只换实现 |
| 方向命中算法、推荐/选择、档位、自定义方向归并 | M4 | 建议 `sections[].direction` 是**外部原文文案**，不映射 `talent_directions`；C 端「按建议选方向」只是页面跳转（M7），M5 不读 M4 集合、不写 `selections` |
| 潜质要素、分级、固定注解、方向、档位配置 | M1 | 建议正文不取 M1 要素/注解/分级，不带要素编码外键；M1 配置变化不回写已同步建议 |
| 会员建档、子女查询、绑定/解绑、身份证明文解密 | M2 | M5 只读 `parentId`/`subjectId` 做归属；**不读身份证明文、不调用解密**（匹配键 = 姓名 + 周岁，PRD 口径即不需要证件号） |
| 旧集合/旧页面/旧 API/旧权限码/旧 e2e 的删除与重写 | M6 | `talent_cultivation_contents`、`talent_content_libraries`、`talent_elements`、旧 `[resource].vue` 等保留；M5 不读不写、不复用其「要素 × 分级 × 年龄/性别」内容匹配口径 |
| 旧 `talent_customers` / `customerId` 归属迁移、旧建议回填、历史数据修复 | M6 | M5 不迁移、不回填；旧库中无正式建议数据（原型为静态） |
| 1000 条列表性能验收、e2e 重写 | M9 | M5 只保证索引与「列表不返回 sections」的查询写法（§3.5、§13 R3） |
| 历史版本导出是否作为正式能力、建议周期是否可配置、C 端编号展示形态 | 客户 / lead | PRD §13.3 L656、§13.2；M5 给默认口径并列入 §14 |

### 1.3 硬约束

- 单实例、单 PocketBase；不引入 `TENANT_MODE`、`site` cookie、`X-Site-Slug`、第二个 PB 连接。
- 业务字段只落 `talent_*`；**不回填 `users` / `configs` / `site_config`**。
- `scripts/setup.mjs` 只用于空数据目录；存量库变更只走 `scripts/sync-talent.mjs`，且只允许「加集合 / 加字段 / 加索引 / 加菜单权限」，不删旧集合、不改旧数据（ADR 0001-D1）。
- 建议正文**只同步不改写**：M5 不提供正文编辑接口；后台页面所有文本只读展示。
- 身份证/身份信息**明文只在内存**：`talent_advice_docs` 只存 `maskedIdNo` / `idNoHash`；任何集合、响应、日志、`sections` 都不落明文身份证或手机号（M5 不存手机号）。
- 页面不得直连 PocketBase 或 `useApi()`；权限在 Nitro 路由内校验，前端隐藏只做体验。
- 文档与种子示例一律使用虚构数据（如 `陈小示`、`110101201609081234`、`GR202611160001`、`AD-GR202611160001-202611`），不得写真实 PII。

## 2. 角色与权限

### 2.1 角色矩阵（M5 生效部分）

| 角色 | 列表 | 建议书详情 / 版本历史 | 接收新一版 | 发布 / 撤回 | 导出 | C 端 |
| --- | --- | --- | --- | --- | --- | --- |
| 平台运营管理员 | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| 报告审核员（PRD L51；M6 正式授权） | ✅ 只读 | ✅ | ❌ | ✅（审核发布职责，`talent:advice:publish`；如客户要求只读，M6 收回） | ✅ | — |
| 规则配置员 | ❌ 无菜单 | ❌ | ❌ | ❌ | ❌ | — |
| 家长（C 端） | — | — | — | — | — | ✅ 只读：本人 + 已绑定子女、当前生效版本、已发布、报告可读 |

- M5 为**平台级**，不做机构数据隔离；机构端继续走旧代码，M5 不把新码授予机构角色（`sync-talent.mjs` 机构角色菜单收敛逻辑保持原样）。
- 验收账号：`admin` / `superadmin`；三角色正式授权矩阵归 M6。
- 前台隐藏只做体验：无权限码时按钮不显示/禁用，服务端仍 403。

### 2.2 权限码（复用 1 个 + 新增 4 个）

| 页面 / 能力 | 权限码 | 接口侧校验 | 菜单行 |
| --- | --- | --- | --- |
| 培育建议列表入口（C 菜单，既有行复用） | `talent:advice:list` | `GET /advice` | C（既有 `培育建议` 行） |
| 建议书详情 / 版本历史 / 按人历史 / 报告详情挂载数据 | `talent:advice:view`（新增） | `GET /advice/:id`、`GET /advice/versions`、`GET /advice/:id/history`、`GET /advice/subject` | F |
| 接收新一版建议（F，新增） | `talent:advice:sync`（新增） | `POST /advice/versions` | F |
| 逐份发布 / 撤回（F，新增） | `talent:advice:publish`（新增） | `POST /advice/:id/publish`、`POST /advice/:id/withdraw` | F |
| 导出（F，新增） | `talent:advice:export`（新增） | `GET /advice/export` | F |

- PRD §9 明确列表 `advice:list`、发布/撤回 `advice:publish`、接收新版 `advice:sync`；本文按仓库前缀规范落为 `talent:advice:*`。**不新增** `revoke/restore/archive` 码：发布与撤回同属 `talent:advice:publish`，审计按动作区分。
- 旧码审查：现有 `talent:advice:list` 是 M2.0 菜单对齐时登记的 C 菜单码（`scripts/setup.mjs` L2216–2219），M5 **复用它、不新建同名 C 菜单**；仓库中不存在其它 `talent:advice:*` 码可用于新动作，故 4 个新码全部新增。
- 每个 `requirePermission` 用到的码必须有 C 或 F 菜单行（CONVENTIONS §3）；`sync-talent.mjs` 在 M5 出口断言 5 个码均有 C/F 行，`培育建议` C 菜单唯一。

### 2.3 菜单登记（`scripts/setup.mjs` + `scripts/sync-talent.mjs` 幂等）

| 类型 | 菜单名 | 路径 | component | 权限码 |
| --- | --- | --- | --- | --- |
| C（复用既有行，不改 path/component） | 培育建议 | `/admin/talent/advice` | `admin/talent/advice.vue` | `talent:advice:list` |
| F（新增） | 查看培育建议书 | `/admin/talent/advice` | — | `talent:advice:view` |
| F（新增） | 发布撤回培育建议 | `/admin/talent/advice` | — | `talent:advice:publish` |
| F（新增） | 接收新一版建议 | `/admin/talent/advice` | — | `talent:advice:sync` |
| F（新增） | 导出培育建议 | `/admin/talent/advice` | — | `talent:advice:export` |

- C 菜单行已由 M2.0 建立（path `/admin/talent/advice`、component `admin/talent/advice.vue`、权限码 `talent:advice:list`、父级「报告管理」）；M5 **不新增 C 菜单、不改 path/component**，页面在原文件上改造，因此 `useMenuTree.ts` 的 `TALENT_PATHS`（已含该 path）无需改动。
- 新增 F 行按 `menuType="F" && permissionCode=...` upsert 幂等；同一码允许多条 F 行（不同动作名），断言按「码存在 ≥1 条」。
- `sync-talent.mjs` 现有 11 条 C 菜单断言不变（C 菜单总数不增）；新增 5 码断言。
- 旧天赋入口（分类与要素 / 匹配规则 / 内容库 / 报告接收 / 同步配置 / 机构管理）保持隐藏，M5 不恢复。
- 三角色（平台运营管理员 / 报告审核员 / 规则配置员）正式授权与菜单收敛归 M6。

### 2.4 数据权限、归属与脱敏

- **后台**：按权限码鉴权，不按机构隔离（§2.1）；列表可看全部建议行。
- **C 端**（M7 实现，M5 冻结守卫）：
  1. 服务端只按 `talent_parents.userId = 当前账号` 解析 parent，**不接受前端传 `parentId`**；
  2. 报告归属 `talent_reports.parentId` 必须等于解析出的 parent；
  3. `subjectType="child"` 时复用 M2 `assertTalentChildAccess(userId, childId)`，解绑/停用/跨家长一律 404（不泄露存在性）；
  4. 报告状态必须 `published`：`pending_publish` → 409 `report_pending`、`retracted` → 409 `report_retracted`（与 M3 §7.1 完全一致，文案「报告内容更新中」由 M7 报告页状态卡承接）；
  5. 通过后只读当前生效版本、`publishStatus="published"` 的那份建议。
- **脱敏**：列表/详情/历史/导出只返回 `maskedIdNo`（前 4 + 10 个 `*` + 后 4）；`idNoHash` **永不返回**；不提供身份证全号接口（M5 无全号需求）。`name` 为外部原文快照（同 M3 `talent_gene_reports.name`，非 §10 敏感字段）。
- 日志：`oper_logs` / `talent_sync_logs` 摘要只写建议编号、版本号、姓名、份数、失败数；不写身份证明文/密文/hash、不写外部原始报文与堆栈。

## 3. 数据模型

### 3.0 通用约定

- 集合与字段命名 camelCase（与现有 `talent_*` 一致），PRD `snake_case` 映射见 §3.6。
- 版本状态：`active` 当前生效 / `archived` 已归档；建议发布状态：`published` 已发布 / `withdrawn` 已撤回（PRD §8.3 L533）。
- 时间字段用 PocketBase `date`（ISO 字符串）；`created` / `updated` 由 PB 维护；业务时间（`effectiveAt` / `nextUpdateAt` / `syncedAt` / `publishedAt` / `withdrawnAt`）单独字段。
- 唯一索引命名 `idx_<collection>_<语义>`；部分唯一索引写成 `CREATE UNIQUE INDEX ... WHERE <expr>`（与 `setup.mjs` 现有写法一致，已用于 `idNoHash != ""` / `status = "1"`）。
- PocketBase `required` 语义偏差：relation 字段在 PB schema 中多为可选，必填/唯一由服务层与部分唯一索引保证（同 M1/M2/M3 §3.0）。
- JSON 字段只存结构化数据，读服务端映射后返回；**JSON 内不得出现明文身份证/手机号**。
- 新字段一律通过 `sanitizeTalentAdviceDocRecord` / `sanitizeTalentAdviceVersionRecord` 映射后返回；集合原始记录不直接返回。
- `talent_advice_docs.sections` 是**同步原文快照**：写入后除「接收新一版创建新行」外不可修改；发布/撤回不改 `sections`、不改 `books`、不改 `age`。

### 3.1 `talent_advice_versions`（建议版本）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `versionNo` | text(40) | 是 | 版本号，如 `V2026.11`；默认按 `effectiveAt` 生成 `V{YYYY}.{MM}`；**全局唯一** |
| `status` | text(20) | 是 | `active` 当前生效 / `archived` 已归档；**同一时刻只能有一行 `active`**（部分唯一索引） |
| `cycle` | text(40) | 是 | 生效周期显示值，如 `2026-11 ~ 2027-02`；按 `effectiveAt` + 周期月数冻结（周期常量见下） |
| `effectiveAt` | date | 是 | 生效日期 `YYYY-MM-DD`（接收弹层「同步日期」） |
| `nextUpdateAt` | date | 是 | 下一版建议时间 = `effectiveAt` + `TALENT_ADVICE_CYCLE_MONTHS`（4 个月，BR-07）；接收弹层默认值 |
| `syncedAt` | date | 是 | 接收写入时间 |
| `source` | text(20) | 是 | `mock`（本地演示）/ `external`（M8 真实源） |
| `note` | text(500) | 否 | 同步说明；缺省由服务端生成「外部系统按姓名 + 具体年龄重新匹配输出，覆盖 N 份基因报告」 |
| `operatorId` | text(64) | 否 | 触发人 id；系统同步为空串 |
| `operatorName` | text(50) | 是 | 操作人名快照；系统同步写「系统同步」 |
| `createdBy` / `updatedBy` | relation → `users` | 否 | 审计字段 |

- 唯一索引：`idx_talent_advice_versions_no` UNIQUE(`versionNo`)；`idx_talent_advice_versions_active` UNIQUE(`status`) WHERE `status = "active"`（保证单一生效版本，新版本切换时先归档旧行再激活新行）。
- 普通索引：`idx_talent_advice_versions_effective`(`effectiveAt`)。
- 周期常量：`TALENT_ADVICE_CYCLE_MONTHS = 4`（`shared/types/talent-advice.ts` 导出，BR-07「默认 4 个月一版」）。`cycle` / `nextUpdateAt` 在版本创建时冻结，不随后续配置变化回写；**不建** `cycleMonths` 字段、不建配置集合（PRD §13.3 未裁决周期是否可配置）。
- 份数与发布状态统计（`docCount` / `publishedCount` / `withdrawnCount`）**不落字段**，读取时由 `talent_advice_docs` 聚合（避免每次发布/撤回都要回写版本行、避免计数漂移）。
- 版本行不删除：归档版本永久保留（只读回溯）；不提供删除/编辑版本接口。

### 3.2 `talent_advice_docs`（建议书，一份基因报告 × 一个版本一行）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `adviceNo` | text(80) | 是 | 建议编号 `AD-{reportNo 规范化}-{YYYYMM}`（如 `AD-GR202611160001-202611`）；**全局唯一**；规范化规则见 §4.3 |
| `geneReportId` | relation → `talent_gene_reports` | 否* | 来源基因报告（M3）；服务层必填 |
| `reportId` | relation → `talent_reports` | 否* | 对应报告；同步时按 `geneReportId` 解析，缺失记 `failed(report_missing)` 不建行 |
| `reportNo` | text(64) | 是 | 报告编号快照（展示与检索用） |
| `subjectType` | text(10) | 是 | `child` / `self`（镜像基因报告；M3 同步只产 `child`） |
| `subjectId` | text(64) | 是 | `talent_children.id`（`self` 时为 `talent_parents.id`） |
| `parentId` | relation → `talent_parents` | 否 | 归属家长；解绑/停用不删建议行（与 M2 ADR 0002-D7 一致） |
| `name` | text(50) | 是 | 本人姓名（外部原文快照；非敏感字段） |
| `maskedIdNo` | text(24) | 是 | 脱敏身份证，前 4 + 10 个 `*` + 后 4（复用 M2 `maskTalentIdNo` / M3 `maskedIdNo`） |
| `idNoHash` | text(64) | 否 | 身份证 HMAC（复用 M2 `hashTalentMemberIdNo`），仅检索/去重用；**不存密文、不存明文、响应不返回** |
| `gender` | text(10) | 是 | `male` / `female` |
| `birthday` | text(10) | 是 | `YYYY-MM-DD` |
| `age` | number | 是 | **同步当日（`effectiveAt`）精确周岁**，冻结；0 合法；PB 中可选，服务层保证 |
| `matchKey` | text(120) | 是 | 外部匹配键快照 `{name}｜{age} 岁`（PRD `match_key`；如 `陈小示｜7 岁`） |
| `versionId` | relation → `talent_advice_versions` | 否* | 所属版本；服务层必填 |
| `versionName` | text(40) | 是 | 版本号快照 |
| `publishStatus` | text(20) | 是 | `published` / `withdrawn`；同步写入即 `published` |
| `publishedAt` | date | 否 | 最近一次发布（含同步即发布，= `syncedAt`）；撤回时保留 |
| `withdrawnAt` | date | 否 | 最近一次撤回；重新发布时清空 |
| `syncedAt` | date | 是 | 同步时间 |
| `source` | text(20) | 是 | `mock` / `external` |
| `books` | text(20) | 是 | 同步时**基因报告** `books` 快照（M3 外部已出分册，规范化大写升序去重，如 `ABCDEF`）；用于 15 列「基因篇数 / 分册」口径。外部建议源返回的 `books` 只用于校验：与基因报告不一致时以基因报告为准并记 `warnings`，不阻断 |
| `sections` | JSON | 是 | 建议书正文（§3.3）；按分册内嵌四段文案 |
| `sectionCount` | number | 是 | `sections.length`（派生缓存，§3.4） |
| `bookCount` | number | 是 | 有 section 的分册数 = 建议书份数（派生缓存） |
| `entropyCounts` | JSON | 是 | 各数据熵条数，如 `{"优秀":2,"常态":1}`（派生缓存；15 列「数据熵」） |
| `firstFactorName` | text(50) | 否 | 首条 section 的 `factor`（派生缓存；15 列「覆盖要素」显示「运动协调 等 2 项」） |
| `createdBy` / `updatedBy` | relation → `users` | 否 | 审计字段 |

> `*` 标注字段在 PB schema 中为可选，必填由服务层与部分唯一索引保证。

- 唯一索引：`idx_talent_advice_docs_no` UNIQUE(`adviceNo`)；`idx_talent_advice_docs_version_gene` UNIQUE(`versionId`,`geneReportId`) WHERE `geneReportId != ""`（一个版本内一份基因报告只有一份建议书）。
- 普通索引：`idx_talent_advice_docs_version_status`(`versionId`,`publishStatus`)；`idx_talent_advice_docs_report`(`reportId`)；`idx_talent_advice_docs_gene`(`geneReportId`)；`idx_talent_advice_docs_subject`(`subjectType`,`subjectId`)；`idx_talent_advice_docs_reportno`(`reportNo`)；`idx_talent_advice_docs_synced`(`syncedAt`)。
- **不建议索引**：`name` / `maskedIdNo` 用包含匹配（`~` / LIKE `%…%`），SQLite 前缀索引无效；1000 条内可接受（M9 再评估）。
- 建议行**不随报告状态变化**：报告撤回/恢复不改 `publishStatus`（PRD §13.2-2 当前口径，ADR D4）；建议可见性在读取时派生。
- `books` 与 `sections` 是同步快照：新版接收时按当次基因报告 `books` 与外部建议结果重建新行，旧行原样归档；后台不接受正文/分册编辑。

### 3.3 `sections` JSON 契约（建议书正文，四段 + 分册/章节/要素/数据熵/变体）

```jsonc
[
  {
    "book": "A",
    "bookName": "生长发育",
    "chapter": "1.1 生长发育概述",
    "factor": "运动协调",
    "entropy": "优秀",
    "content": "该项潜质发展良好，基础条件较为扎实，具备在现有水平上继续提升的空间。",
    "example": "多数情境下能稳定完成对应任务，遇到稍复杂的安排时经过引导可以较快适应。",
    "direction": "在现有基础上逐步增加任务复杂度，用阶段性目标巩固优势。",
    "suggestion": "保持规律接触与练习节奏，定期回顾表现变化，再决定是否提高投入强度。",
    "variant": 1
  }
]
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `book` | 是 | 分册编码 `A`–`F`；必须 ∈ 本行 `books`；C 端/后台按它分组「按分册 / 一册一份」 |
| `bookName` | 否 | 分册名；缺省按固定映射补齐（A 生长发育 / B 智商 / C 情商 / D 领导商 / E 艺术商 / F 体育运动商，与 M3 §3.2.2 同一映射） |
| `chapter` | 是 | 章节名；`1–100` 字，缺省「专项潜质」；只用于展示分组，不参与业务判断 |
| `factor` | 是 | 要素名称（外部原文，如「运动协调」）；`1–50` 字；**不存要素编码**（BR-12 编码不对家长展示，且建议正文不绑定 M1 要素） |
| `entropy` | 是 | 数据熵等级名，归一化去尾「级」后保存；白名单 `卓越 / 优秀 / 优良 / 常态 / 弱态 / 弱势`（M1 U2 两种外部口径都接受、原样展示，不在 M5 裁决映射）；C 端筛选用本份实际出现值 |
| `content` | 是 | 分级内容；0–2000 字，允许空串（外部未出该段） |
| `example` | 是 | 分级举例；同上 |
| `direction` | 是 | 培育方向；同上（**外部文案，不映射 `talent_directions`**） |
| `suggestion` | 是 | 培育建议；同上 |
| `variant` | 否 | 同一 `(book,chapter,factor,entropy)` 的话术变体序号，整数 ≥1，默认 1；后台全部展示，C 端只返回 variant 最小的一条（§7.3） |

- **顺序规则**：落库前按 `book` A–F 升序、同一册内保持外部原始顺序（稳定排序），不按 `factor` 重排（外部顺序即展示顺序）。
- **校验/失败口径**（单条对象失败，不阻断整批，计入 `failed` 明细；`failed` 明细的 `reason` 取值见 §5.5）：
  - `age` 无法计算（生日缺失/非法/未来生日，`calculateTalentAge` 返回 `undefined`）→ 该对象 `failed(info_mismatch)`，不建行；
  - `sections` 非数组、数组长度 > 200、整份 JSON 序列化 > 256KB；
  - `book` 不在 `A`–`F` 或不在本行 `books`；
  - `factor` 为空或超 50 字；`chapter` 超 100 字；任一段文本超 2000 字；
  - `entropy` 不在白名单；
  - 文本中出现 18 位身份证号 / 11 位手机号形态（正则命中直接拒绝，防止外部误带 PII）；
  - `sections` 为空数组（该建议书无任何内容）。
- **四段可空但建议书不可空**：四段各自允许空串（页面不渲染空段），但至少一条 section 有非空正文，否则记 `failed(empty_sections)`。
- **不存固定注解**：M1 的 632 条固定注解服务于基因报告要素解读；建议书的四段文案来自外部《天赋培育开发建议文库》，**不调用 M1 注解、不落 `note` 字段**。

### 3.4 派生缓存字段（只读、非 PRD 字段）

`sectionCount` / `bookCount` / `entropyCounts` / `firstFactorName` 是为「列表 15 列不返回 `sections` 全量」而落的**派生缓存**，写入时由服务端按 `sections` 计算：

| 字段 | 计算 | 用途 |
| --- | --- | --- |
| `sectionCount` | `sections.length` | 建议项数、建议书详情信息条 |
| `bookCount` | `new Set(sections.map(s => s.book)).size` | 15 列「建议书份数」/ C 端「N 份」 |
| `entropyCounts` | 按 `entropy` 计数对象 | 15 列「数据熵」（渲染为 `优秀 2·常态 1`） |
| `firstFactorName` | 取 `sections` 第一条的 `factor`，无则空串 | 15 列「覆盖要素」（渲染为 `运动协调 等 2 项`） |

- 只读约束：无任何接口可单独写这 4 个字段；发布/撤回不改；同步写入后不变。
- 一致性：领域测试断言「由 `sections` 重算 === 落库值」；若外部修订导致不一致，只能通过接收新一版重建行。
- 保留理由：列表 20 行 × `sections`（每份几十条四段文本）会显著放大响应体积与 PB 读放大；M3 同样采用「列表不返回 `factorSnapshot`」的思路（M3 §5.4.2）。

### 3.5 索引清单（新库必须断言存在）

| 集合 | 索引 |
| --- | --- |
| `talent_advice_versions` | `idx_talent_advice_versions_no` UNIQUE(`versionNo`)；`idx_talent_advice_versions_active` UNIQUE(`status`) WHERE `status = "active"`；`idx_talent_advice_versions_effective`(`effectiveAt`) |
| `talent_advice_docs` | `idx_talent_advice_docs_no` UNIQUE(`adviceNo`)；`idx_talent_advice_docs_version_gene` UNIQUE(`versionId`,`geneReportId`) WHERE `geneReportId != ""`；`idx_talent_advice_docs_version_status`(`versionId`,`publishStatus`)；`idx_talent_advice_docs_report`(`reportId`)；`idx_talent_advice_docs_gene`(`geneReportId`)；`idx_talent_advice_docs_subject`(`subjectType`,`subjectId`)；`idx_talent_advice_docs_reportno`(`reportNo`)；`idx_talent_advice_docs_synced`(`syncedAt`) |

- `scripts/setup.mjs` 新建空库时建齐；`scripts/sync-talent.mjs` 存量库只加索引（`ensureIndex` 已按索引名幂等，L1976–1990），不删既有索引、不改既有集合。
- 断言方式：新空目录 `env:setup` 后逐条比对 `collections.getOne(...).indexes`；连续两次 `pnpm talent:sync` 索引数量与内容不变。

### 3.6 PRD → 集合字段映射

| PRD §8.2 | 本规格 | 说明 |
| --- | --- | --- |
| advice_version `id` | PB 主键 + `versionNo` | PRD `id` 是版本标识（`AV2026-11`），本规格用可读 `versionNo`（`V2026.11`）+ PB 主键 |
| advice_version `name` | `versionNo` | 版本号即展示名 |
| advice_version `status` | `status` | `active` / `archived`（PRD 当前生效 / 已归档） |
| advice_version `cycle` | `cycle` | 冻结显示值 `YYYY-MM ~ YYYY-MM` |
| advice_version `effective_at` | `effectiveAt` | 同步日期 |
| advice_version `next_update_at` | `nextUpdateAt` | +4 个月 |
| advice_version `synced_at` / `source` / `note` / `operator` | `syncedAt` / `source` / `note` / `operatorId`+`operatorName` | `operator` 拆 id + 名称快照 |
| advice_doc `id` | `adviceNo` | PRD `id` 是建议编号 |
| advice_doc `gene_report_id` / `report_no` | `geneReportId` / `reportNo` | 关系 + 快照 |
| advice_doc `name` | `name` | 原文快照 |
| advice_doc `id_no` | `maskedIdNo` + `idNoHash` | PRD「脱敏存储/展示」（§10.2）拆为脱敏 + 哈希；无全号需求，不存密文 |
| advice_doc `gender` / `birthday` / `age` | 同名 | `age` 为冻结精确周岁 |
| advice_doc `match_key` | `matchKey` | `姓名｜N 岁` |
| advice_doc `version_id` / `version_name` | `versionId` / `versionName` | 关系 + 快照 |
| advice_doc `publish_status` | `publishStatus` | `published` / `withdrawn` |
| advice_doc `published_at` / `withdrawn_at` / `synced_at` | 同名 | 撤回时间用于 15 列副行 |
| advice_doc `books` | `books` | 外部已出分册快照（15 列「基因篇数 / 分册」） |
| advice_doc `sections[]` | `sections` | §3.3 |
| （PRD 无） | `subjectType` / `subjectId` / `parentId` | 归属与 C 端/报告页签查询（M2/M3 同名字段） |
| （PRD 无） | `reportId` / `source` | 报告联动与来源留痕 |
| （PRD 无） | `sectionCount` / `bookCount` / `entropyCounts` / `firstFactorName` | 派生缓存（§3.4） |

### 3.7 本地演示数据（`scripts/seed-talent-advice.mjs`）

- 命令：`pnpm talent:advice:seed`（`scripts/seed-talent-advice.mjs`；`package.json` 登记 `"talent:advice:seed"`）。
- 前置：先跑 `pnpm talent:report:seed` 生成 `talent_gene_reports` / `talent_reports`；建议种子按 `reportNo` 匹配，缺基因报告时跳过该人并打印 warn（不反向创建 M3 集合）。
- 幂等：按 `versionNo` / `adviceNo` upsert；重复执行行数不变、不切版；**不清空**其它天赋数据、不触碰旧 `talent_cultivation_contents` 等旧集合。
- 覆盖场景（全部虚构）：3 个版本（1 生效 + 2 归档，跨 4 个月周期）；同一 `reportNo` 三代历史（版本历史/按人历史）；已撤回一份（15 列副行「撤回于 …」）；报告 `retracted` 一份（后台「已发布」但 C 端派生不可见）；报告 `pending_publish` 一份；年龄边界（生日刚过/未过，验 AC-ADM-07-2）；一份跨 3 个分册、一份单分册；`variant=2` 一份（验 C 端只取最小 variant）。
- 保护：`TALENT_ADVICE_SEED_CONFIRM=YES` 显式确认；`NODE_ENV=production` 直接拒绝（沿用 `seed-talent*.mjs` 风格）。
- 数据规模：8–10 份建议书即可覆盖验收，不铺满 1000 行（性能属 M9）。

### 3.8 与旧集合/旧行的共存关系

- **不复用旧口径**：旧 `talent_cultivation_contents` 是「要素 × 分级 × 年龄/性别 → 培育内容」的规则匹配内容库（`levelCode/minAge/maxAge/gender/content/elementId`），与 PRD 的「外部按基因报告输出的建议书（一册一份、周期版本）」不是同一业务对象；M5 **不读不写**，也不把 `content` 迁移进 `sections`（ADR D6）。
- 旧 `talent_elements` / `talent_content_libraries` / `talent_cultivation_plans` 等保留到 M6；M5 不建外键、不做引用扫描。
- 旧页 `app/pages/admin/talent/[resource].vue`（含旧 content 资源）与旧 `/api/admin/talent/:resource` 动态路由保留；M5 新增静态 `advice/**` 目录并验证静态优先（§5.7），不改旧路由。
- 新集合行 `createdBy` / `updatedBy` 只写 `users` 关系，不回填 `users` 业务字段。

## 4. 状态机、版本规则与接收新一版

### 4.1 版本状态机（PRD §8.3 L533「版本维度」）

```
（无生效版本）──接收第一版──> active
active ──接收新一版──> archived（旧版）+ active（新版，同一锁内翻转）
archived ──（不提供任何 back-to-active 接口）──> archived
```

| 当前状态 | 动作 | 结果 | 前置校验 | 失败码 |
| --- | --- | --- | --- | --- |
| 任意 | 接收新一版 | 新版本 `active`，旧 `active` → `archived` | `effectiveAt` 合法且晚于当前生效版本；版本号/月份未占用；外部源可用 | 409 / 422 / 503 |
| active | 发布/撤回其下建议 | 仅改建议行 `publishStatus` | 仅当前生效版本可写 | 409 |
| archived | 发布/撤回其下建议 | **拒绝** | 历史版本只读 | 409 `ADVICE_VERSION_READONLY` |
| archived | 查看/导出/历史 | 只读 | — | — |

- **单一生效版本**由部分唯一索引 + 服务层双保险：翻转顺序固定为「旧 active → archived，再新 → active」，任何时刻最多一行 active；若翻转中途失败，补偿恢复旧行 active（§4.3 步骤 5d）。
- 不提供「手动归档」「删除版本」「编辑版本」「切换生效版本（回到历史版作为生效）」接口；PRD 只要求「回到当前生效版」的**查看**行为（§6.3「回到当前生效版」按钮只清空查看筛选，不改数据）。
- 归档版本行永久保留；历史版本建议行只读。

### 4.2 建议发布状态机（PRD §8.3 L533「已发布 ⇄ 已撤回」）

```
published ──撤回──> withdrawn ──发布──> published
```

| 当前状态 | 动作 | 结果 | 前置校验 | 失败码 |
| --- | --- | --- | --- | --- |
| published | 撤回 | `withdrawn`，`withdrawnAt=now`，`publishedAt` 不变 | 属于当前生效版本 | 409 |
| withdrawn | 发布 | `published`，`publishedAt=now`，`withdrawnAt=""` | 属于当前生效版本 | 409 |
| 任意 | 重复同一动作 | 拒绝 | — | 409 `ADVICE_ALREADY_PUBLISHED` / `ADVICE_ALREADY_WITHDRAWN` |
| 任意（历史版本） | 发布/撤回 | 拒绝 | — | 409 `ADVICE_VERSION_READONLY` |

- 外部同步写入的建议一律 `published` + `publishedAt=syncedAt`（PRD §6.7「外部系统同步即默认已发布」，ADR D3）；**新建版本内的建议也是同步即发布**，不因上一版某人被撤回而在新版继承撤回状态。
- 发布/撤回只影响家长端可见性，**不改正文、不改分册、不改 `age`/`matchKey`/`sections`**（PRD §6.7「正文只同步不改写」）。
- 状态变更必须写 `oper_logs`（标题「发布培育建议」/「撤回培育建议」，摘要含建议编号、版本号、姓名），由 `withOperLog` 统一落。
- 双击/并发：`withTalentReportLock("advice:doc:"+id)` 串行化；第二个请求看到新状态后 409，不做静默成功（与 M3 §4.1 一致）。

### 4.3 接收新一版（`POST /api/admin/talent/advice/versions`，PRD §6.7「选同步日期 → 生成新版本，旧版归档，C 端切到新版」）

**请求**：`{ effectiveAt, versionNo?, note? }`（§5.3）。

1. **校验与排序**：`effectiveAt` 合法 `YYYY-MM-DD`；必须**晚于**当前生效版本 `effectiveAt`（否则 409 `ADVICE_VERSION_ORDER`）；`versionNo` 缺省 `V{YYYY}.{MM}`（按 `effectiveAt`）。
2. **重复版本（幂等口径）**：`versionNo` 已存在、或存在同 `effectiveAt` 月份（`YYYY-MM`）的版本、或存在同 `effectiveAt` 的版本 → 409 `ADVICE_VERSION_EXISTS`，`data.existingVersionId` / `data.existingVersionNo`；**不写任何集合、不切版**。重复接收是「提示已同步」，不是静默成功（AD-D3）。
3. **候选枚举**：全部 `talent_gene_reports`（`status="synced"`）；对每条按 `geneReportId` 在 `talent_reports` 中找到对应报告（`talent_reports.geneReportId`）。**找不到报告 → 记 `failed(report_missing)`**，该对象不建建议（不猜测归属）。候选覆盖全部基因报告（不只上一版基线），以便新同步的人进入新版；`subjectType="self"` 结构支持，M5 不主动创建（M3 C2 一致）。
4. **逐人调用外部源**：`age = calculateTalentAge(birthday, effectiveAt)`（复用 `server/utils/talent-matching.ts` 的现成函数，只调用不修改；M3 同一函数同口径），`matchKey = "{name}｜{age} 岁"`；`TalentAdviceSource.match(subject)` 返回 `found / books / sections / reason`。落库的 `books` 以**基因报告 `books`** 为准（15 列「基因篇数 / 分册」与 M3 一致），源返回 `books` 与之不同时记 `warnings` 并以基因报告为准；`sections[].book` 必须 ∈ 基因报告 `books`。
5. **分类写入**（锁内，`withTalentReportLock("advice:version")`）：
   - a. 新建版本行：`status="archived"` 占位（部分唯一索引只约束 active，可先建；失败时整行删除）；
   - b. 逐条创建 `talent_advice_docs`：`versionId=new`、`versionName`、`publishStatus="published"`、`publishedAt=syncedAt`、`withdrawnAt=""`、`source`、`books`、`sections`、派生缓存；`adviceNo="AD-{reportNo 规范化}-{YYYYMM}"`（`reportNo` 仅保留 `[A-Za-z0-9]`，其余替换为 `-`，保证 `^[A-Za-z0-9_-]{1,80}$`）；
   - c. 翻转：旧 `active` → `archived`；新行 → `active`；
   - d. 失败补偿：删除本次已建 docs 与新版本行；若已执行 c 的旧行归档则恢复旧行为 `active`；返回 500 `ADVICE_VERSION_SYNC_FAILED`，**旧版保持生效、C 端内容不变**；
   - e. 单条失败（`failed`）不影响整体：其余对象照常写入，整体 `status="partial"`；全部失败且无写入 → 500 `ADVICE_VERSION_SYNC_FAILED`（不切换版本，避免「新版生效但没有内容」）。
6. **日志**：`talent_sync_logs`（`syncScope="advice_version"`、`mode="commit"`、`status` success/partial/failed、`received`=候选数、`generated`=新建份数、`skipped`=暂无匹配数、`failedCount`、`details[]` ≤500 条含 `reportNo/name/maskedIdNo/action/reason/message`，无明文）+ 一条 `oper_logs`（标题「接收培育建议新版本」，摘要 `V2026.11 生效，新建 8 份，暂无 1 人，失败 0 人；V2026.07 归档`）。日志写入失败不影响主流程。
7. **返回**：`{ version, docCount, emptyCount, failedCount, archivedVersionId, syncLogId, warnings }`（§5.4.5）；前端 toast「新一版培育建议已接收，家长端已切换」+ 列表回到当前生效版 + 版本历史刷新。
8. **并发**：全局锁 `advice:version`；第二个并发请求在新版生效后命中重复版本 → 409。
9. **幂等重放**：同一请求重放返回 409（带已有版本 id），不产生第二条版本、不重复建建议（唯一索引 `versionNo` + `(versionId,geneReportId)` 双保险）。
10. **新版未覆盖的人**：上一版有、新版 `empty` 的人，旧行归档后当前生效版本下无建议 → C 端「暂未收到培育建议」空态（PRD L415）；后台 15 列在当前版本视图看不到该人，历史版本可按人回溯（§6.4）。这是**预期行为**，接收结果里以 `emptyCount` 与明细提示运营核对。
11. **默认说明文案**：`note` 缺省写「外部系统按姓名 + 具体年龄（周岁）重新匹配输出，覆盖 N 份基因报告。」（原型同口径）。

### 4.4 版本历史与只读回溯（PRD §6.7「版本历史：按版本看份数与状态，只读回溯；回到当前生效版」）

- `GET /advice/versions` 返回全部版本（默认按 `effectiveAt` 倒序），每行聚合 `docCount` / `publishedCount` / `withdrawnCount`（读取时聚合，不落字段）。
- 「查看该版本」= 列表请求带 `versionId` 参数（**客户端状态**，不落服务端 session、不写集合）；响应带 `viewing: { versionId, versionName, isCurrent }`。
- `viewing.isCurrent=false` 时页面显示固定提示条「**历史版本只读**：正在查看 V2026.07（2026-07 ~ 2026-10）的同步快照，仅供后台回溯；家长端只会看到当前生效版本。」+ 「回到当前生效版」按钮；该按钮只清空 `versionId` 筛选，不改数据。
- 历史版本视图下：行内「发布/撤回」按钮**不渲染**（AC-ADM-07-4）；服务端对历史版本写动作一律 409 `ADVICE_VERSION_READONLY`（双保险）。「接收新一版」按钮仍可点（作用于当前生效版本），成功后自动回到当前生效版视图。
- 「按人历史版本」：行内「历史版本」→ `GET /advice/:id/history`，返回该 `reportNo` 在各版本下的建议快照（版本号、状态、周期、当时匹配口径 `matchKey`、年龄、数据熵分布、发布状态、同步时间、是否当前生效）；只读，可逐版打开建议书。

### 4.5 派生可见性（与 M3 报告状态联动，BR-06 / BR-10 / PRD §13.2-2）

**唯一真源**：报告状态由 M3 持有；建议状态由 M5 持有；C 端可见性不落任何字段，读取时派生：

```
adviceClientVisible(doc) =
      doc.publishStatus === "published"
  &&  doc.versionId === 当前生效版本.id                       // BR-07 只展示当前生效版
  &&  report(doc.reportId).status === "published"             // BR-10 / §10.5
  &&  parent.status === "1"                                   // M2 立即失效
  &&  (subjectType === "self" ? true : child.status === "1" && child.parentId === parent.id)
```

| 场景 | 后台建议行 | C 端建议 |
| --- | --- | --- |
| 建议已发布 + 报告已发布 + 当前生效版 | 已发布 | 可见 |
| 后台逐份撤回 | 已撤回（副行撤回时间） | **立即不可见**；报告页仍可读，建议页签显示「暂未收到培育建议」 |
| 重新发布 | 已发布 | 立即恢复可见 |
| 报告撤回了、建议未动 | **仍为已发布**（PRD §13.2-2 当前口径） | 不可见（报告页只显示「报告内容更新中」状态卡，不列分册、不给下载、不显示建议） |
| 报告恢复发布 / 首次发布 | 不变 | 自动可见（无需 M3 双写、无需再点建议发布） |
| 浏览历史版本 | 按该版当时的发布状态只读 | 不影响（C 端只读当前生效版） |
| 家长停用 / 子女解绑 | 不变 | 不返回（404 或空） |

- **BR-06「建议与报告同发」的实现解释**：报告发布/恢复时，该对象当前周期建议**自动变为可见**（派生 AND 成立），不需要把建议行「置为已发布」；报告不可读时建议不可见。此实现与 BR-06 的用户可观察结果一致，且避免 M3/M5 双写漂移（ADR D4；M3 spec §8.2 已同口径）。
- **后台派生提示**（不落库、不占 15 列）：建议书详情信息条增加一行「家长端可见性：可见 / 不可见（报告未发布）/ 不可见（报告已撤回）/ 不可见（建议已撤回）」；列表 API 返回 `clientVisible` 布尔供行内 tooltip 使用。
- M5 **不修改** `talent_reports` / `talent_gene_reports`；M3 发布/撤回/恢复不改 `talent_advice_*`（M3 spec §8.2、ADR 0003-D8）。
- 补发新增分册后建议是否立即补该册：PRD §13.2-1 当前口径「按周期等下版」；M5 **不提供按册补发建议**，新分册内容随下一次接收新一版进入（§14 C5）。

### 4.6 回到当前生效版（不改数据）

- 纯前端状态：清空列表 `versionId` 参数 + 重新请求；服务端无「切换生效版本」写接口。
- 目的只是查看态复原，防止运营误以为「把历史版本设为生效」；版本生效只由「接收新一版」改变（§4.1）。

## 5. API

### 5.1 通用约定

- 路由放 `server/api/admin/talent/advice/`（静态段目录），与旧 `[resource].get.ts` / `[resource].post.ts` 单段动态路由同目录，依赖 Nitro「静态段优先」，实现后必须按 §5.7 验证命中（同 M2 §5.7、M3 §5.6）。
- 列表统一返回 `{ rows, total, page, pageSize, viewing }`；`pageSize` 默认 20、上限 100，`page` 最小 1（BR-13 每页 20 条）。
- 写接口链路：`validateBody(event, schema, { statusCode: 422 })` → `requirePermission` → `withTalentReportLock`（需要串行化的写）→ `withOperLog()` → `success(data, message)`；无请求体的动作接口跳过 `validateBody`，权限与审计不省。
- 所有响应只含脱敏/冻结数据，不含明文身份证/手机号、不含 `*Cipher`/`*Hash`、不含外部原始报文与堆栈。
- 响应不回传 PocketBase 原始错误；唯一冲突统一 409 并指明对象（版本号 / 建议编号）。
- 所有 GET 均为只读，不产生写入、不写日志（导出除外：导出写 1 条 `oper_logs`）。
- 列表默认排序：`-syncedAt`，同值按 `adviceNo` 升序（稳定、可复现）。

### 5.2 路由表（9 条后台 + 1 条 C 端冻结契约）

| # | 方法 | 路径 | 权限码 | 说明 | 审计 |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/api/admin/talent/advice` | `talent:advice:list` | 列表（15 列 + 5 检索 + `versionId` 版本筛选 + 分页） | 否 |
| 2 | GET | `/api/admin/talent/advice/:id` | `talent:advice:view` | 建议书详情（信息条 + 按分册分组四段） | 否 |
| 3 | GET | `/api/admin/talent/advice/versions` | `talent:advice:view` | 版本历史（份数/发布/撤回统计 + 周期 + 来源 + 说明） | 否 |
| 4 | GET | `/api/admin/talent/advice/:id/history` | `talent:advice:view` | 按人历史版本（同一 `reportNo` 跨版本快照） | 否 |
| 5 | GET | `/api/admin/talent/advice/subject` | `talent:advice:view` | 按 `subjectType` + `subjectId` 读当前生效版建议（M3 报告详情第 4 页签挂载） | 否 |
| 6 | GET | `/api/admin/talent/advice/export` | `talent:advice:export` | 导出 CSV（跟随当前筛选与查看版本） | 是（EXPORT，行数） |
| 7 | POST | `/api/admin/talent/advice/:id/publish` | `talent:advice:publish` | 发布（仅当前生效版） | 是 |
| 8 | POST | `/api/admin/talent/advice/:id/withdraw` | `talent:advice:publish` | 撤回（仅当前生效版，C 端立即不可见） | 是 |
| 9 | POST | `/api/admin/talent/advice/versions` | `talent:advice:sync` | 接收新一版（选同步日期 → 新版生效 → 旧版归档 → C 端切换） | 是 |
| 10 | GET | `/api/client/talent/advice` | 家长登录态 + 归属 | **M5 只冻结契约与守卫，路由与页面归 M7**（§7） | 否 |

- 不提供：建议正文/分册/年龄的手工编辑、建议新建（只能由接收新一版创建）、建议删除、版本删除/编辑/回切、按册补发建议、PDF 下载。
- 路由优先级（必须实测，§5.7）：静态段 `versions` / `subject` / `export` 必须优先于 `GET /advice/:id`（`:id` 不得吞掉这三个段）；`advice/` 目录静态路由必须优先于旧 `[resource].get.ts`。
- C 端 `GET /api/client/talent/advice` 由 M7 在 `server/api/client/talent/advice.get.ts` 实现，调用 M5 的领域函数；M5 不写该路由文件（避免与 M7 同期返工，同 M3 §7.1 处理）。

### 5.3 关键请求体（Zod）

```ts
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必须为 YYYY-MM-DD");

// #1 列表 query（非 body）
{ adviceNo?: string(≤80), name?: string(≤50), idNo?: string(4|18), reportNo?: string(≤64),
  age?: string(整数 0–100), versionId?: string, page?: number, pageSize?: number }

// #7 发布
{}                                       // 空请求体

// #8 撤回
{ reason?: string(≤200) }                // 可选，写入 oper_logs 摘要

// #9 接收新一版
{
  effectiveAt: isoDate,                  // 必填：同步/生效日期
  versionNo?: string(1–40),              // 缺省 V{YYYY}.{MM}
  note?: string(≤500),                   // 缺省服务端生成说明
}
```

- Zod 失败统一 422；业务校验（版本顺序、重复版本、历史版本只读、重复动作、外部源不可用）在 Zod 之后，返回 409/422/503。
- `idNo` 只允许 4 位（前 4 / 后 4 包含匹配）或 18 位（完整命中 `idNoHash`）；其它长度 422 `{ code: "INVALID_ID_NO_LENGTH" }`。
- `age` 只接受整数（`"7"`）；带「岁」或区间（`"7-8"`）→ 422；按冻结 `age` **精确相等**过滤（AC-ADM-07-2）。

### 5.4 响应结构

#### 5.4.1 列表 `GET /advice`（15 列数据源）

```json
{
  "rows": [
    {
      "id": "rec_advice_1",
      "adviceNo": "AD-GR202611160001-202611",
      "versionId": "rec_av_1",
      "versionName": "V2026.11",
      "name": "陈小示",
      "maskedIdNo": "1101**********1234",
      "gender": "male",
      "genderLabel": "男",
      "birthday": "2018-09-08",
      "age": 8,
      "ageLabel": "8 岁",
      "geneReportId": "rec_gene_1",
      "reportId": "rec_report_1",
      "reportNo": "GR202611160001",
      "geneBookCount": 4,
      "geneBookCountLabel": "4 篇",
      "books": "ABCD",
      "coveredFactorText": "运动协调 等 3 项",
      "entropyText": "优秀 2·常态 1",
      "publishStatus": "published",
      "publishStatusLabel": "已发布",
      "publishedAt": "2026-11-12 09:20:00.000Z",
      "withdrawnAt": "",
      "syncedAt": "2026-11-12 09:20:00.000Z",
      "source": "mock",
      "clientVisible": true,
      "versionReadonly": false
    }
  ],
  "total": 8,
  "page": 1,
  "pageSize": 20,
  "viewing": { "versionId": "rec_av_1", "versionName": "V2026.11", "isCurrent": true }
}
```

- 15 列映射见 §6.1；接口**不返回** `sections` / `idNoHash` / `matchKey`（详情才返回 `matchKey`）。
- `clientVisible` 为派生布尔（§4.5），用于行内提示与详情；不落库。
- `versionReadonly` = `viewing.isCurrent === false`（页面据此隐藏发布/撤回按钮，AC-ADM-07-4）。

#### 5.4.2 建议书详情 `GET /advice/:id`

```json
{
  "id": "rec_advice_1",
  "adviceNo": "AD-GR202611160001-202611",
  "version": { "id": "rec_av_1", "versionNo": "V2026.11", "status": "active", "cycle": "2026-11 ~ 2027-02", "effectiveAt": "2026-11-12", "nextUpdateAt": "2027-03-12" },
  "report": { "id": "rec_report_1", "reportNo": "GR202611160001", "status": "published", "statusLabel": "已发布" },
  "owner": { "name": "陈小示", "gender": "male", "genderLabel": "男", "birthday": "2018-09-08", "age": 8, "ageLabel": "8 岁", "matchKey": "陈小示｜8 岁" },
  "books": [
    { "book": "A", "bookName": "生长发育", "adviceNo": "AD-GR202611160001-202611-A", "sectionCount": 2, "entropyCounts": { "优秀": 1, "常态": 1 }, "entropyText": "优秀 1·常态 1",
      "sections": [
        { "chapter": "1.1 生长发育概述", "factor": "运动协调", "entropy": "优秀", "variant": 1,
          "content": "…", "example": "…", "direction": "…", "suggestion": "…" }
      ] }
  ],
  "publishStatus": "published",
  "publishStatusLabel": "已发布",
  "publishedAt": "2026-11-12 09:20:00.000Z",
  "withdrawnAt": "",
  "syncedAt": "2026-11-12 09:20:00.000Z",
  "source": "mock",
  "booksCovered": "ABCD",
  "bookCount": 4,
  "clientVisible": true,
  "clientVisibleText": "可见",
  "versionReadonly": false
}
```

- 按分册分组返回；每册派生「建议书编号」= `{adviceNo}-{book}`（PRD「一册一份、各自编号」）；正文四段原样返回（可空串），后台空段显示「—」。
- `clientVisibleText` ∈ `可见 / 不可见（报告未发布）/ 不可见（报告已撤回）/ 不可见（建议已撤回）`（§4.5 派生提示）。

#### 5.4.3 版本历史 `GET /advice/versions`

```json
{
  "rows": [
    { "id": "rec_av_1", "versionNo": "V2026.11", "status": "active", "statusLabel": "当前生效",
      "cycle": "2026-11 ~ 2027-02", "effectiveAt": "2026-11-12", "nextUpdateAt": "2027-03-12",
      "syncedAt": "2026-11-12 09:20:00.000Z", "source": "mock",
      "note": "外部系统按姓名 + 具体年龄（周岁）重新匹配输出，覆盖 8 份基因报告。",
      "operatorName": "系统同步", "docCount": 8, "publishedCount": 7, "withdrawnCount": 1, "isCurrent": true }
  ],
  "total": 3
}
```

- 统计值按 `talent_advice_docs` 聚合；历史版本行也统计（当时状态）。

#### 5.4.4 按人历史 `GET /advice/:id/history`

```json
{
  "reportNo": "GR202611160001",
  "name": "陈小示",
  "maskedIdNo": "1101**********1234",
  "items": [
    { "adviceNo": "AD-GR202611160001-202611", "versionId": "rec_av_1", "versionNo": "V2026.11",
      "versionStatus": "active", "cycle": "2026-11 ~ 2027-02", "effectiveAt": "2026-11-12",
      "matchKey": "陈小示｜8 岁", "age": 8, "entropyText": "优秀 2·常态 1",
      "publishStatus": "published", "publishStatusLabel": "已发布",
      "syncedAt": "2026-11-12 09:20:00.000Z", "isCurrent": true }
  ]
}
```

- 按 `effectiveAt` 倒序；「查看该版本」打开对应建议书详情（只读语义由 `versionReadonly` 表达）。

#### 5.4.5 接收新一版 `POST /advice/versions`

```json
{
  "version": { "id": "rec_av_2", "versionNo": "V2026.11", "status": "active", "cycle": "2026-11 ~ 2027-02",
               "effectiveAt": "2026-11-12", "nextUpdateAt": "2027-03-12", "syncedAt": "2026-11-12 09:20:00.000Z" },
  "docCount": 8,
  "emptyCount": 1,
  "failedCount": 0,
  "archivedVersionId": "rec_av_prev",
  "syncLogId": "rec_synclog_1",
  "warnings": ["1 人外部暂无建议：陈小示（GR202611160002）"]
}
```

- `message`：`新一版培育建议已接收，家长端已切换`。
- `warnings` ≤10 条（姓名 + 报告编号，不含证件号）。

#### 5.4.6 发布 / 撤回 `POST /advice/:id/publish|withdraw`

```json
{
  "id": "rec_advice_1",
  "adviceNo": "AD-GR202611160001-202611",
  "publishStatus": "withdrawn",
  "publishStatusLabel": "已撤回",
  "publishedAt": "2026-11-12 09:20:00.000Z",
  "withdrawnAt": "2026-11-17 10:00:00.000Z",
  "clientVisible": false,
  "message": "已撤回，家长端不再展示"
}
```

- 成功消息：发布 `已发布，家长端可见` / 撤回 `已撤回，家长端不再展示`；撤回后 `clientVisible` 必为 `false`。

#### 5.4.7 导出 `GET /advice/export`

- CSV（UTF-8 + BOM，与 M1 导出一致），列：建议编号 / 版本 / 本人 / 身份证（脱敏） / 性别 / 出生日期 / 年龄 / 基因报告 / 基因篇数 / 分册 / 覆盖要素 / 数据熵 / 发布状态 / 同步时间 / 撤回时间。
- 跟随当前筛选与 `versionId`（历史版本视图导出历史数据；PRD §13.3 L656 未裁决，默认允许并列入 §14 C4）。
- ≤10000 行；超出 422 `{ code: "ADVICE_EXPORT_TOO_LARGE" }`；文件名 `培育建议-{versionNo}-{YYYYMMDDHHmm}.csv`；写 1 条 `oper_logs`（EXPORT，行数）。

#### 5.4.8 C 端建议 `GET /api/client/talent/advice?reportId=`（M5 冻结，M7 实现）

```json
{
  "available": true,
  "version": { "versionNo": "V2026.11", "cycle": "2026-11 ~ 2027-02", "effectiveAt": "2026-11-12", "nextUpdateAt": "2027-03-12", "cycleMonths": 4 },
  "owner": { "name": "陈小示", "gender": "male", "genderLabel": "男", "age": 8, "ageLabel": "8 岁" },
  "books": [
    { "book": "A", "bookName": "生长发育", "adviceNo": "AD-GR202611160001-202611-A",
      "sectionCount": 2, "total": 2,
      "entropyList": [{ "level": "优秀", "count": 1 }, { "level": "常态", "count": 1 }],
      "sections": [
        { "chapter": "1.1 生长发育概述", "factor": "运动协调", "entropy": "优秀",
          "content": "…", "example": "…", "direction": "…", "suggestion": "…" }
      ] }
  ],
  "emptyText": "暂未收到培育建议"
}
```

- `available=false` 时返回 `{ available: false, emptyText: "暂未收到培育建议" }`（报告可读但无已发布建议/建议已撤回）。
- 不返回：`versionId`、`reportNo`、`matchKey`、`syncedAt`、`publishStatus`、`source`、`idNo`、内部 PB id（`adviceNo` 按册派生是 PRD「各自编号」要求，列 §14 C2）。
- 门禁与错误码见 §7.2；`cycleMonths` 来自常量 4（C 端固定文案「每 4 个月更新一版」）。

### 5.5 错误码

| HTTP | code | 场景 | 说明 |
| --- | --- | --- | --- |
| 401 | `UNAUTHORIZED` | 未登录 | 统一认证中间件 |
| 403 | `FORBIDDEN` | 无对应权限码 | 所有写接口与 view 接口 |
| 404 | `ADVICE_DOC_NOT_FOUND` | 建议 id 不存在/已不存在 | 不泄露其它家长数据 |
| 404 | `ADVICE_VERSION_NOT_FOUND` | `versionId` 不存在 | 列表/版本历史 |
| 409 | `ADVICE_VERSION_READONLY` | 对历史版本建议发布/撤回 | AC-ADM-07-4 服务端双保险 |
| 409 | `ADVICE_ALREADY_PUBLISHED` | 已发布再发布 | 不做静默成功 |
| 409 | `ADVICE_ALREADY_WITHDRAWN` | 已撤回再撤回 | 同上 |
| 409 | `ADVICE_VERSION_EXISTS` | 重复版本（版本号/生效月份/生效日期已占用） | `data.existingVersionId`、`data.existingVersionNo` |
| 409 | `ADVICE_VERSION_ORDER` | `effectiveAt` 不晚于当前生效版本 | 版本只能前进 |
| 422 | `VALIDATION_ERROR` | Zod 校验失败 | 统一 422 |
| 422 | `INVALID_ID_NO_LENGTH` | 身份证检索非 4/18 位 | 与 M2/M3 检索口径一致 |
| 422 | `ADVICE_EXPORT_TOO_LARGE` | 导出 > 10000 行 | 建议收窄筛选 |
| 503 | `ADVICE_SOURCE_UNAVAILABLE` | 外部建议源未配置/不可达 | 不写任何集合 |
| 500 | `ADVICE_VERSION_SYNC_FAILED` | 写入失败已补偿回滚 | 旧版保持生效 |
| 409 | `report_pending` / `report_retracted` | C 端报告不可读（复用 M3 §7.1） | M7 页面显示状态卡 |
| 404 | `NOT_FOUND` | C 端非本人/未绑定/已解绑 | 不泄露存在性 |

- 单条同步失败属于明细分类（`failed` + `reason`），不是 HTTP 错误；`reason` ∈ `report_missing` / `no_result` / `info_mismatch` / `sections_invalid` / `source_error` / `duplicate`。

### 5.6 服务端落点

| 文件 | 职责 |
| --- | --- |
| `shared/types/talent-advice.ts` | 集合记录类型、状态枚举、`sections` 类型、请求/响应类型、`TALENT_ADVICE_CYCLE_MONTHS`、分册名映射、数据熵白名单 |
| `server/utils/talent-advice.ts` | `calculateTalentAdviceAge`（薄封装 `calculateTalentAge`）、`buildTalentAdviceMatchKey`、`buildTalentAdviceNo`、`normalizeTalentAdviceSections`、`buildTalentAdviceDerived`、`getActiveTalentAdviceVersion`、`receiveTalentAdviceVersion`（§4.3）、`publishTalentAdviceDoc` / `withdrawTalentAdviceDoc`、`isTalentAdviceClientVisible`、`getTalentAdviceClientSnapshot`、`listTalentAdviceForSubject`、`listTalentAdvicePersonHistory`、`sanitizeTalentAdviceDocRecord` / `sanitizeTalentAdviceVersionRecord` |
| `server/utils/talent-advice-source.ts` | `TalentAdviceSource` 接口 + `TALENT_ADVICE_MOCK_SOURCE`；Mock 源按模式返回（§9）；`recordTalentAdviceSyncLog` |
| `server/api/admin/talent/advice/index.get.ts` | #1 列表（筛选/分页/版本视图/派生 `clientVisible`） |
| `server/api/admin/talent/advice/[id].get.ts` | #2 建议书详情 |
| `server/api/admin/talent/advice/versions/index.get.ts` | #3 版本历史 |
| `server/api/admin/talent/advice/versions/index.post.ts` | #9 接收新一版 |
| `server/api/admin/talent/advice/[id]/history.get.ts` | #4 按人历史 |
| `server/api/admin/talent/advice/subject.get.ts` | #5 报告详情挂载数据 |
| `server/api/admin/talent/advice/export.get.ts` | #6 CSV 导出 |
| `server/api/admin/talent/advice/[id]/publish.post.ts` | #7 发布 |
| `server/api/admin/talent/advice/[id]/withdraw.post.ts` | #8 撤回 |
| `app/composables/api/useTalentAdviceApi.ts` | 前端 API 封装（列表/详情/版本/历史/接收/发布/撤回/导出） |
| `app/pages/admin/talent/advice.vue` + `advice/components/*.vue` | B 端页面与弹层（§6） |
| `scripts/setup.mjs` / `scripts/sync-talent.mjs` | 2 集合 + 索引 + 4 个 F 权限码菜单（只加不删） |
| `scripts/seed-talent-advice.mjs` | 本地演示数据（§3.7） |
| `test/talent-advice-domain.test.ts` / `talent-advice-version.test.ts` / `talent-advice-api.test.ts` | 单元/领域/路由契约测试（§11） |

### 5.7 与旧 `[resource]` 动态路由的静态优先验证（实现必做）

- 旧单段动态路由：`server/api/admin/talent/[resource].get.ts` / `.post.ts`（`getTalentAdminResource` 只认识旧资源名，`advice` 不在其中）。
- 实现后必须实测（新空库 + 本地服务或路由级测试）：
  1. `GET /api/admin/talent/advice` → 命中新 `advice/index.get.ts`（不是旧 `[resource].get.ts` 的 404/旧逻辑）；
  2. `GET /api/admin/talent/advice/versions` / `/subject` / `/export` → 命中静态段，不被 `[id]` 吞掉（`id` 不得为 `versions/subject/export`）；
  3. `GET /api/admin/talent/advice/rec_xxx` → 命中 `[id]`；
  4. `POST /api/admin/talent/advice` 无此路由 → 404（不落旧 `[resource].post.ts`）。
- 若 Nitro 实际行为与预期不符（静态未优先）：兜底把新路由迁到 `server/api/admin/talent-advice/**`，并同步修订本文 §5.2、`docs/API.md` 与 ADR 0005（与 M3 §5.6 同一处置方式）。

## 6. B 端页面

页面文件：改造 `app/pages/admin/talent/advice.vue`（占位页 → 列表页）；页面专属组件放 `app/pages/admin/talent/advice/components/`，用相对路径导入（与 `member/index.vue`、`rules/direction.vue` 同一写法）；`nuxt.config.ts` 的 `pages/**/components/**` 已注册为组件并从路由移除，**不新增路由、不删除旧占位文件路径**。菜单 C 行不变（`component` 仍为 `admin/talent/advice.vue`）。

### 6.1 列表（AC-ADM-07-1、AC-ADM-07-2，PRD L303–305）

**15 列（一个表头只对应一个字段，BR-13）**：

| # | 表头 | 数据源 | 渲染口径 |
| --- | --- | --- | --- |
| 1 | 建议编号 | `adviceNo` | 等宽字体，单行不换行 |
| 2 | 版本 | `versionName` | 等宽字体 |
| 3 | 本人 | `name` | 加粗 |
| 4 | 身份证 | `maskedIdNo` | 脱敏；空显示 `—` |
| 5 | 性别 | `genderLabel` | 男/女 |
| 6 | 出生日期 | `birthday` | `YYYY-MM-DD` |
| 7 | 年龄 | `ageLabel` | 「N 岁」；按冻结精确周岁（AC-ADM-07-2） |
| 8 | 基因报告 | `reportNo` | 可点（打开 M3 基因报告弹层；基因报告缺失时纯文本） |
| 9 | 基因篇数 | `geneBookCountLabel` | 「N 篇」（`books.length`） |
| 10 | 分册 | `books` | 等宽字体 `ABCD` |
| 11 | 覆盖要素 | `coveredFactorText` | 「运动协调 等 3 项」；0 项 `—` |
| 12 | 数据熵 | `entropyText` | 「优秀 2·常态 1」；无 `—` |
| 13 | 发布状态 | `publishStatusLabel` | 已发布（绿）/已撤回（灰） |
| 14 | 同步时间 | `syncedAt` | `YYYY-MM-DD HH:mm`；**已撤回时副行**「撤回于 {withdrawnAt}」（灰色小字） |
| 15 | 操作 | — | 建议书 / 历史版本 / 撤回（已发布时）/ 发布（已撤回时） |

- **表格横向滑动时固定操作列**（`position: sticky; right: 0` + 背景色，AC-ADM-07-1）；列多时允许横向滚动，不换行、不省略关键字段（长文本 `ellipsis + tooltip`）。
- 顺序：建议编号 → 版本 → 本人 → 身份证 → 性别 → 出生日期 → 年龄 → 基因报告 → 基因篇数 → 分册 → 覆盖要素 → 数据熵 → 发布状态 → 同步时间 → 操作，**不得增删列**（原型曾去掉「建议项数/建议篇数」，本规格不回加）。
- **检索区（5 项，独立生效、同时填写取交集，BR-13）**：建议编号（包含） / 子女姓名（包含） / 身份证（支持前 4、后 4 或完整 18 位） / 报告编号（包含） / 年龄（整数，精确周岁）。尾部按钮「接收新一版建议」（`talent:advice:sync`）；筛选变化回第 1 页。
- **版本视图**：默认当前生效版本；顶部「版本历史」→ 选择版本后进入只读视图（§6.3）；只读视图提示条见 §4.4。
- **页头操作**：版本历史 / 导出（`talent:advice:export`）；不放统计芯片（PRD 未要求，避免与 15 列重复）。
- **无编辑态**：列表所有字段只读；发布状态只能通过行内「发布/撤回」改变。
- **空态/错误态**：无数据「暂无培育建议」+ 「接收新一版建议」入口；外部源不可用 503 → 错误提示与重试；权限不足按钮隐藏。
- 分页每页 20（BR-13）。

### 6.2 建议书弹层（PRD L309「按分册展示四段家长文案」）

`ultra` 弹层，标题「培育建议书（同步原文）」，副标题 `{matchKey} · {bookCount} 个分册对应 {bookCount} 份建议书（一册一份）`：

1. **信息条**（`kv-strip`）：建议编号 / 关联基因报告 / 本人姓名 / 性别 / 出生日期 / 年龄 / 匹配口径 / 所属版本（含状态） / 同步时间 / 来源系统 / 覆盖分册（如 `ABCD（4 个分册）`） / 建议书份数（「4 份（一个分册一份）」） / 发布状态（撤回时附「撤回于 …」） / 家长端可见性（派生，§4.5）。
2. **按分册分组**（按 A–F 升序，只列有 section 的册）：每组标题「第 N 分册 · {bookName} · 建议书」，右侧元信息「`{adviceNo}-{book}` · 本册 X 项 · 数据熵 …」；每组内逐条：
   - 头：`第 i 项 · {factor}` + 章节 + 数据熵标签（四档配色 tone）；
   - 四段固定顺序：**分级内容 / 分级举例 / 培育方向 / 培育建议**；空段显示 `—`（不隐藏行，保证版式稳定）；
   - `variant>1` 时头标「变体 {variant}」（后台看全部变体）。
3. **说明条**：「分册口径：每个分册对应一份建议书……一册一份、各自独立编号（建议编号 + 分册编码），不跨分册合并。」「只读说明：建议书由外部系统按固定格式推送，按「姓名 + 具体年龄（周岁）」匹配生成；本系统不修改正文，仅同步与更新。」
4. 底部只有「关闭」；无编辑、无上传、无下载。

### 6.3 版本历史弹层（PRD L313、AC-ADM-07-4）

`ultra` 弹层，标题「培育建议版本历史」，副标题「每 4 个月由外部系统推送一版；后台保留全部版本，家长端只展示当前生效版本。」

| 列 | 数据 |
| --- | --- |
| 版本号 | `versionNo`（加粗） |
| 状态 | 当前生效（绿）/ 已归档（灰） |
| 生效周期 | `cycle` |
| 建议份数 | `docCount`（另可显示 `publishedCount/withdrawnCount` 摘要） |
| 生效日期 | `effectiveAt` |
| 同步时间 | `syncedAt` |
| 来源系统 | `source` 映射（mock → 本地演示源；external → 外部培育建议系统） |
| 更新说明 | `note`（副行小字） |
| 操作 | 「查看该版本」 |

- 「查看该版本」→ 关闭弹层、列表切到该 `versionId`、顶部出现只读提示条 + 「回到当前生效版」（§4.4）；**不修改任何数据**。
- 底部说明：「历史版本为外部系统推送时的同步快照，仅供后台回溯，不可编辑；家长端只会看到当前生效版本的内容。」

### 6.4 按人历史版本弹层（PRD L313「版本历史：按版本看份数」，行内入口）

`ultra` 弹层，标题「培育建议 · 历史版本」，副标题「{name} · {reportNo} · 共 N 个版本（每 4 个月一版）」：

| 列 | 数据 |
| --- | --- |
| 版本号 | `versionNo` + 当前生效 tag / 已归档 tag |
| 生效周期 | `cycle` |
| 当时匹配口径 | `matchKey` |
| 数据熵分布 | `entropyText` |
| 发布状态 | 该版当时的 `publishStatusLabel` |
| 同步时间 | `syncedAt` |
| 操作 | 「查看该版本」（打开建议书详情，只读） |

- 说明条：「跨版本年龄按同步当日重算，过完生日会换到下一岁分册；历史版本不可编辑、不能发布或撤回。」

### 6.5 接收新一版弹层（PRD L307、AC-ADM-07-3 前置）

`wide` 弹层，标题「接收新一版培育建议」，副标题「外部系统按「姓名 + 具体年龄（周岁）」重新匹配后整版推送；本系统只接收与归档，不修改内容。」

- 字段（两列栅格）：
  - 版本号（必填，默认 `V{YYYY}.{MM}`，按生效日期联动；1–40 字）；
  - 生效日期（必填 `date`，默认当前生效版本的 `nextUpdateAt`；不得早于等于当前生效版本）；
  - 同步说明（`textarea`，≤500，占整行，可空——空时服务端生成默认说明）。
- 说明块：「接收后：新版成为当前生效版本，覆盖 N 份建议（一人一份）；{当前版本} 自动归档；家长端即时切换为最新内容；历史版本保留在版本历史中可回溯。」
- 确认按钮「接收并同步」：二次确认 → 调 `POST /advice/versions` → 成功 toast + 结果摘要（新建 N 份 / 暂无 M 人 / 失败 K 人 + warnings）+ 列表回到当前生效版 + 版本历史刷新；失败（409/503/500）保留弹层并展示原因，不乐观更新。
- 重复版本：409 → toast「该版本已同步，请勿重复接收」+ 高亮版本号字段；不关闭弹层。

### 6.6 发布 / 撤回弹层（PRD L311–315、AC-ADM-07-3）

`wide` 弹层，标题「发布培育建议」/「撤回培育建议」，副标题 `{name} · {matchKey} · {versionName}`：

- 信息条：所属版本 / 建议项数 / 当前状态。
- 影响说明：发布「家长端「培育建议」立即可见，正文与所属版本不变，仅改变这一份的可见性。」；撤回「家长端「培育建议」立即不再展示，报告、已选培养方向与历史版本均不受影响；可随时重新发布。」
- 仅当前生效版本显示行内按钮；历史版本视图按钮不渲染 + 服务端 409 双保险（AC-ADM-07-4）。
- 成功后 toast + 刷新列表行（不整表刷新也可，保持版本视图状态）。

### 6.7 通用交互

- 加载/空态/错误态用 `AdminListPage`、`NDataTable`、`AdminPagination`（CONVENTIONS §3）；不手写 `v-if` 替代。
- 所有写动作二次确认 + 防重复提交（按钮 loading、弹层确认态）。
- 权限按钮：无 `talent:advice:publish` 不显示发布/撤回；无 `talent:advice:sync` 不显示接收新一版；无 `talent:advice:export` 不显示导出；无 `talent:advice:view` 不显示建议书/历史版本入口（仅体验层，服务端仍校验）。
- 页面不得出现「编辑正文」「上传」「删除建议」「切换生效版本」等入口；PRD 明确正文只同步不改写。
- 视觉：沿用现有 token；操作列 sticky 需要背景/阴影与暗色适配；弹层内长文本正常折行。

## 7. C 端契约与边界（M5 冻结，M7 实现页面）

### 7.1 只读契约（PRD §7.6 L374–380、§9 L572、§10.5）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/client/talent/advice?reportId=` | 家长登录态 + 归属 + 报告可读 | 当前生效版本、已发布的建议书，按分册分组（§5.4.8） |

- **M5 交付**：`server/utils/talent-advice.ts` 中的 `assertTalentAdviceReadable(userId, reportId)`、`getTalentAdviceClientSnapshot(userId, reportId)`；**路由文件与 C 端页面归 M7**（M5 不写 `server/api/client/talent/advice*.ts`，避免与 M7 同期返工）。
- 未发布/撤回/解绑/停用：一律拒绝。报告 `retracted` → 409 `{ code: "report_retracted", state: "retracted", message: "报告内容更新中" }`；`pending_publish` → 409 `{ code: "report_pending", state: "pending_publish", message: "报告正在整理中" }`；非本人/未绑定/已解绑 → 404（不泄露存在性）。与 M3 §7.1 完全一致，M7 报告页状态卡直接复用。
- 报告可读但没有已发布建议（建议撤回 / 当前版本未覆盖该人）→ 200 `{ available: false, emptyText: "暂未收到培育建议" }`（PRD L415；**不提示撤回原因**）。
- C 端响应不返回后台口径（版本 id、报告编号、同步时间、匹配键、发布状态、来源、证件信息）；不返回要素编码（BR-12）。
- M5 不返回 `sections` 全量快照给 C 端以外的读者；单对象响应 < 50KB（每册约 2 项 × 四段）。

### 7.2 归属与失效

- 服务端只按 `talent_parents.userId = 当前账号` 解析 parent，不接受前端传 `parentId`。
- 复用 M2 `assertTalentChildAccess(userId, childId)`；报告归属 `report.parentId` 必须一致。
- 家长停用 / 子女解绑 / 报告撤回后**下一次请求立即失效**，不依赖缓存与 C 端本地状态。
- 建议撤回/发布的可见性变化同样即时生效（每次请求按 DB 当前状态派生，不缓存 `clientVisible`）。

### 7.3 展示口径（M7 消费）

- **按分册展示，一册一份，各自编号**：每个分册一张卡/一段；册内显示「第 N 分册 · {bookName}」「{sectionCount} 项要素 · 数据熵…」「建议书编号 `{adviceNo}-{book}`」。
- **四段固定顺序**：分级内容 / 分级举例 / 培育方向 / 培育建议；空段不渲染（与后台「—」不同，C 端隐藏空段以保持简洁）。
- **数据熵筛选**：详情顶部「全部 + 本份实际出现的等级」，命中数显示「已选 / 总数」（`total` / 过滤后条数）；筛选值按分册各自记忆（`adv:<分册>`），与报告分册页筛选互不干扰；再点已选项取消。
- **周期说明**：列表/详情展示「本版 {versionNo}（{cycle}）生效 · 每 4 个月更新一版，基因报告内容不随版本变化」。
- **文案**：空态「暂未收到培育建议」；不出现「已撤回」「版本 id」「同步失败」等后台术语。
- 「按建议选方向」是跳转培养方向页的入口（M7 页面导航），不传建议数据给 M4、不写 `selections`。
- 390 画幅设计、340 不横向溢出、可点区域 ≥44px、Wot UI 优先——M7 验收（M5 只保证契约字段足够渲染）。

### 7.4 与 M3 报告页 / 详情页的接口面

- **C 端报告页「培育建议」页签**（M7）：调用 §7.1；报告不可读时页面只显示 M3 状态卡，不调用本接口。
- **B 端报告详情第 4 页签「培育建议」**（M3 页面）：M5 提供 `GET /api/admin/talent/advice/subject?subjectType=&subjectId=`，返回 `{ available, version, reportReadable, clientVisible, docs: [{ adviceNo, versionName, publishStatus, publishStatusLabel, books, bookCount, sectionCount, entropyCounts, clientVisible }] }`；M3 详情响应中的 `advice` 字段当前硬编码 `available=false`（M3 spec §5.4.2），M5 出口后由 **lead 派发 1 处接线小改**（M3 `[id].get.ts` 改调 `listTalentAdviceForSubject`），不在本任务范围（§14 C6）。
- 报告详情页签只展示「当前生效版建议覆盖册与状态」，逐份查看打开 M5 建议书弹层（B 端跨模块入口）。
- M5 不修改 M3 的报告状态、快照与 C 端报告接口。

## 8. 模块联动边界

### 8.1 与 M2（parent/child）

- `subjectType="child"` 时 `subjectId = talent_children.id`、`parentId = talent_children.parentId`；`self` 时 `subjectId = talent_parents.id`。解绑不删档：建议行保留，历史可追溯（与 M2 ADR 0002-D7 一致）。
- **M5 不读身份证明文、不调用解密**：匹配键是「姓名 + 具体年龄（周岁）」（PRD §6.7 / 原型 `ADVICE_MATCH_RULE`），因此只需要 `maskedIdNo`（展示/检索）与 `idNoHash`（精确检索）；不触碰 `idNoCipher`。
- M5 不修改 `talent_parents` / `talent_children`；M2 不改 M5 集合。M2 的会员列表「关联报告」特性探测只读 `talent_reports`，不受 M5 影响。

### 8.2 与 M3（报告）

- 只读 `talent_gene_reports`（`reportNo`/`books`/`sections`/`maskedIdNo`/`idNoHash`/`subjectType`/`subjectId`/`parentId`/`gender`/`birthday`）与 `talent_reports`（`status`/`parentId`/`geneReportId`）；不写这两集合。
- 报告状态是建议可见性唯一真源（§4.5 派生）；报告发布/撤回/恢复不改建议集合；建议发布/撤回不改报告。
- 报告详情第 4 页签挂载数据见 §7.4；M3 未实现时 M5 无法联调真实报告，用种子构造（§3.7）。
- 报告补发新增分册不触发建议补册（§4.5、§14 C5）。
- C 端报告不可读的 409 契约与错误码直接复用 M3 §7.1，不另定一套。

### 8.3 与 M4（方向匹配与选择）

- `sections[].direction` 是**外部建议文案**（如「在现有基础上逐步增加任务复杂度」），不是 `talent_directions` 的方向实体；**不建映射、不存方向 id、不做命中计算**。
- C 端「按建议选方向」只是 M7 页面跳转；M5 不读 M4 的 `directionSnapshot`/`selections`，不写 `talent_direction_requests`。
- M4 未就绪不阻塞 M5（无依赖）；M5 建成的建议页也不会改变 M4 的推荐/选择逻辑。

### 8.4 与 M1（规则）

- 建议正文不取 M1 `talent_factors` / `talent_factor_notes` / `talent_levels`；不存要素编码与固定注解。
- M1 配置调整（分级改名、注解重写、方向删除）**不回写**已同步建议；建议正文只随外部新一版变化（BR-07）。
- 数据熵等级名与 M1 四档（`卓越/优秀/优良/常态`）的映射争议沿用 M1 U2 未决口径；M5 原样保存外部等级名（§3.3、§14 C1）。

### 8.5 与 M6 / M7 / M8 / M9

- **M6**：删除旧 `talent_cultivation_contents` 等旧集合、旧 `[resource].vue`、旧权限码、旧 e2e；M5 全程不删、不迁移。M6 同时正式授权三角色与菜单收敛。
- **M7**：实现 C 端建议列表/详情页面与 `GET /api/client/talent/advice` 路由，消费 §7 契约；不重算、不拼装正文。
- **M8**：实现 `TalentAdviceSource` 的 `external` 源并切换环境变量；负责重试队列、限流、失败告警、定时同步（M5 的「接收新一版」人工入口保留）；外部接口需按「姓名 + 周岁」匹配、按分册输出四段（§9）。
- **M9**：1000 条列表性能与 e2e 重写；M5 只保证索引与「列表不返回 sections」写法。

## 9. 同步源接口（M5 冻结，M8 只换实现）

```ts
// server/utils/talent-advice-source.ts
export const TALENT_ADVICE_MOCK_SOURCE = "mock";

export interface TalentAdviceSyncSubject {
  geneReportId: string;
  reportNo: string;
  subjectType: "child" | "self";
  subjectId: string;
  parentId: string;
  name: string;
  gender: "male" | "female";
  birthday: string;   // YYYY-MM-DD
  age: number;        // 按 effectiveAt 计算的精确周岁
  maskedIdNo: string; // 仅脱敏值；不向外部源传明文证件号
}

export interface TalentAdviceRawSection {
  book: string;             // A–F
  bookName?: string;
  chapter?: string;
  factor: string;
  entropy: string;          // 卓越/优秀/优良/常态/弱态/弱势（可带「级」后缀）
  content?: string;
  example?: string;
  direction?: string;
  suggestion?: string;
  variant?: number;
}

export interface TalentAdviceMatchResult {
  found: boolean;
  books?: string;                        // 外部已出分册（大写升序去重）
  sections?: TalentAdviceRawSection[];
  reason?: "no_result" | "info_mismatch";
  version?: string;                      // 外部版本/批次号，仅留痕
}

export interface TalentAdviceSource {
  readonly name: string;
  match(subject: TalentAdviceSyncSubject): Promise<TalentAdviceMatchResult>;
}

export function createTalentAdviceSource(): TalentAdviceSource;
```

- 环境变量：`TALENT_ADVICE_SOURCE`（`mock` 默认 / `external`，M8 切换）；`TALENT_ADVICE_MOCK_MODE`（`full` / `partial` / `empty` / `error` / `slow`，仅 mock）。
- Mock 模式语义（单测与演示固定）：`full` 全部 found；`partial` 一半 found、一半 empty；`empty` 全部 found=false；`error` 第 2 个 subject 抛错（验单条失败不阻断）；`slow` 延迟 200ms（验锁与超时提示）。
- 失败处理：源整体未配置/不可达 → 503 `ADVICE_SOURCE_UNAVAILABLE`，不写任何集合；单条抛错 → `failed(source_error)`，其余继续；Mock 默认不写真实外部请求。
- **幂等键**：`versionNo`（版本层）+ `(versionId, geneReportId)`（建议层）+ `adviceNo`（展示层）；外部源重复推送同一版 → 409，不重复建行。
- 生产环境默认 Mock 时 `env-check` 增加 warn（同 M2/M3 写法）；M8 接入后删除提示。

## 10. 验收映射

完整追溯、测试命令与证据表见 [acceptance.md](acceptance.md)。落点速查：

| 需求 | PRD 位置 | 本文落点 |
| --- | --- | --- |
| AC-ADM-07-1 15 列对齐，操作列固定 | §6.7 L303、L319 | §6.1、§5.4.1、API #1 |
| AC-ADM-07-2 年龄按精确周岁匹配（输 7 只命中 7 岁） | §6.7 L305、L320 | §3.2 `age`/`matchKey`、§4.3、§5.3、§6.1 |
| AC-ADM-07-3 撤回后 C 端对应建议消失，发布后恢复 | §6.7 L321、BR-10 L106 | §4.2、§4.5、§7.1、§5.4.6；C 端页面证据见 §7 与 acceptance §2.1 / E12 |
| AC-ADM-07-4 切到历史版本出现「历史版本只读」提示，发布/撤回按钮隐藏 | §6.7 L322 | §4.4、§4.1、§5.5、§6.3 |
| FR-ADM-07 列表 15 列 + 5 项检索 + 尾部「接收新一版」 | §6.7 L303–305 | §6.1、§5.2 #1/#9 |
| 接收新一版：选同步日期 → 新版生效 → 旧版归档 → C 端切换 | §6.7 L307、BR-07 L103 | §4.1、§4.3、§5.4.5、§6.5 |
| 版本历史只读回溯 + 回到当前生效版 | §6.7 L313 | §4.4、§5.2 #3/#4、§6.3/§6.4 |
| 建议书按分册四段家长文案 | §6.7 L309、§7.6 L378 | §3.3、§5.4.2、§6.2、§7.3 |
| 发布/撤回仅当前生效版可操作 | §6.7 L311、L322 | §4.2、§4.4、§5.5、§6.6 |
| 同步即默认已发布；后台逐份撤回后家长端立即不可见；正文只同步不改写 | §6.7 L315 | §4.2、§1.3、ADR D3 |
| BR-06 建议与报告同发（派生可见性） | L102 | §4.5、§7.2、ADR D4 |
| BR-07 建议按周期更新（默认 4 个月、旧版归档只读、C 端只展示生效版） | L103 | §3.1 周期常量、§4.1、§4.4、§7.3 |
| BR-10 报告撤回 C 端口径（建议不可见） | L106 | §4.5、§7.1 |
| BR-11 敏感信息脱敏 / 全号授权 | L107 | §2.4、§3.2（无全号接口） |
| BR-13 列表规范（一列一字段、筛选交集、每页 20） | L109 | §6.1、§5.1 |
| §8.2 advice_version / advice_doc / sections 字段 | L488–494 | §3.1、§3.2、§3.3、§3.6 |
| §8.3 建议状态机 + 版本维度 | L533 | §4.1、§4.2 |
| §9 API 建议分组 + C 端建议 | L564–566、L572 | §5.2、§7.1 |
| §10 数据权限、脱敏、审计、C 端归属与状态 | L581–587 | §2.4、§4.2、§4.3、§7.2 |
| §12 后台建议 15 列/撤回发布/版本历史/接收新版 | L615 | §6、acceptance §2 |
| §12 C 端建议按分册、四段、周期说明 | L625 | §7.3、acceptance §2.2（页面证据 M7） |
| §13.2-1 补发后建议是否立即补册（当前按周期等下版） | L647 | §4.5、§14 C5 |
| §13.2-2 报告撤回时建议是否同步置撤回（当前不改状态、C 端不可见） | L648 | §4.5、ADR D4、§14 C6 |
| §13.3 历史版本是否需要导出 | L656 | §5.4.7、§14 C4 |

## 11. 测试命令与门禁（按 `docs/QUALITY.md` 分级）

> 涉及 schema / 权限 / 状态机 / 版本切换 / C-B 跨端契约 → 「schema / 认证 / 权限」级：定向 Vitest + 真实 PocketBase 新库烟测 + B/API 类型检查 + 页面人工烟测。

| # | 命令 / 步骤 | 覆盖 |
| --- | --- | --- |
| 1 | `pnpm vitest run test/talent-advice-domain.test.ts` | 年龄精确周岁（生日前后、闰年、未来生日）、`matchKey`、`adviceNo` 生成与规范化、`sections` 归一化/排序/白名单/超长/PII 拒绝、派生缓存（`sectionCount/bookCount/entropyCounts/firstFactorName` 重算一致）、分册名映射、`sanitize` 不含 `idNoHash`/明文 |
| 2 | `pnpm vitest run test/talent-advice-version.test.ts` | 版本状态机（active/archived 单一性）、接收新版全流程（分类 created/empty/failed、旧版归档、新行发布即已发布、`publishedAt=syncedAt`）、重复版本 409（三种重复）、`effectiveAt` 顺序 409、失败补偿（旧版仍生效、无残留行）、锁内并发、发布/撤回状态迁移与历史版本只读、派生可见性（报告 published/pending/retracted × 建议 published/withdrawn × 归属状态） |
| 3 | `pnpm vitest run test/talent-advice-api.test.ts` | 9 条路由文件清单与权限码映射、静态段优先（`versions/subject/export` 不被 `:id` 吞）、无编辑/删除/版本回切/C 端路由、5 个权限码 ↔ C/F 菜单行、旧 `[resource]` 路由保留、响应不含 `idNoHash`/明文、导出 CSV 表头与行数 |
| 4 | `pnpm vitest run test/talent-report-domain.test.ts test/talent-member-domain.test.ts test/talent-direction-match.test.ts` | 回归：M2/M3/M4 既有领域测试不被改坏（重点：M3 未因 M5 改动而改口径） |
| 5 | `pnpm typecheck` | 类型、`shared/types/talent-advice.ts`、页面与 API 一致性 |
| 6 | `pnpm lint` | 代码规范 |
| 7 | `export POCKETBASE_DATA_DIR="$(mktemp -d /tmp/tongjia-m5-XXXXXX)" && pnpm env:doctor && pnpm env:setup` | 新库初始化；断言 §3.5 全部索引存在；`talent_advice_versions` 只有一个 active 的部分唯一索引；旧集合/旧索引仍在 |
| 8 | `pnpm talent:sync`（连续两次） | 存量库幂等（只加不删）：2 集合/字段/索引只加一次；4 个新权限码 + F 菜单行不重复；C 菜单仍 11 条；旧集合结构未变 |
| 9 | `pnpm talent:report:seed && pnpm talent:advice:seed`（可选，本地演示） | 幂等种子：3 版本 + 8–10 份建议覆盖 §3.7 场景；重复执行行数不变、不切版 |
| 10 | `pnpm pb` + `pnpm dev`，登录后人工烟测 `/admin/talent/advice` | 15 列 + 操作列固定（AC-07-1）、年龄精确筛选（AC-07-2）、建议书四段、发布/撤回（AC-07-3 后台侧）、版本历史只读提示与按钮隐藏（AC-07-4）、接收新一版、历史版本、导出、空态/错误态 |
| 11 | API 安全直连 | 未登录 401；无 `advice:publish` 发布 403 且无成功日志；历史版本发布/撤回 409；重复版本 409；筛选格式 422；接收新版写 1 条 `talent_sync_logs` + 1 条 `oper_logs`；列表/详情响应不含 `idNoHash`/明文 |
| 12 | C 端守卫单测（`talent-advice-version.test.ts` 内） | `assertTalentAdviceReadable`：报告 retracted → 409 `report_retracted`；pending → 409 `report_pending`；跨家长/解绑 → 404；建议撤回 → `available=false`；重新发布 → `available=true`（AC-ADM-07-3 服务端证据） |
| 13 | `git diff --check` | 空白错误；确认只改 `docs/specs/M5-advice/` 与 `docs/adr/`（本任务） |

- 旧 e2e 02–05 覆盖旧页，M5 不纳入门禁；M9 重写。
- 页面验收依赖 seed 与 M3 数据；M3 未就绪时相关条目记「未验证」并写阻塞原因。
- 生产环境变量核对：`TALENT_ADVICE_SOURCE` 在生产必须切 `external`（M8）；M5 期间默认 `mock` 时 `env-check` 只 warn。

## 12. 实施顺序（3–4 人天）

1. **契约冻结（0.5d）**：`shared/types/talent-advice.ts`（类型/状态/`sections`/常量/映射）；4 个 F 权限码 + 菜单 upsert；与 M3 确认只读字段（`geneReportId`/`reportNo`/`books`/`maskedIdNo`/`idNoHash`/`status`）；与 M2 确认 `assertTalentChildAccess` 与 parent 解析；确认旧 `[resource]` 静态优先验证方式。
2. **数据层（1d）**：`talent_advice_versions` + `talent_advice_docs` 集合与索引（`setup.mjs` 新库 + `sync-talent.mjs` 只加不删）；`talent-advice.ts` 领域函数（年龄/编号/sections 归一化/派生/可见性/sanitize）；`talent-advice-source.ts` Mock；`test/talent-advice-domain.test.ts`。
3. **版本与状态机（1d）**：`receiveTalentAdviceVersion`（候选枚举/分类/写入/翻转/补偿/日志）、`publish/withdraw`、版本历史与按人历史读模型、客户端只读读模型与守卫；`test/talent-advice-version.test.ts`。
4. **API（0.5–1d）**：9 条路由（Zod/权限/`withOperLog`/响应映射）、静态优先验证、导出；`test/talent-advice-api.test.ts`。
5. **B 端页面（1d）**：列表 15 列 + 5 筛选 + sticky 操作列（AC-07-1/2）→ 版本视图只读条与按钮隐藏（AC-07-4）→ 接收新一版（AC-07-3 前置）→ 建议书/版本历史/按人历史/发布撤回/导出 → 空态/错误态；`useTalentAdviceApi.ts`；人工烟测。
6. **收口（0.5d）**：`seed-talent-advice.mjs` + `package.json`；`git diff --check`；文档同步（由 lead 派发）；verifier 填 acceptance 证据。

- 建议 2 → 3 先行（数据层与版本逻辑不依赖页面）；页面先做列表与筛选（AC-07-1/2 最硬），再做版本视图与弹层。
- 跨模块接线（M3 详情第 4 页签改调 M5 helper）由 lead 派发，可放在 M5 收口或 M6 前，不阻塞 M5 自身验收。

## 13. 风险与处置

| # | 风险 | 处置 |
| --- | --- | --- |
| R1 | 报告状态与建议状态双源，若某处把报告撤回写成「建议同步撤回」会造成漂移 | ADR D4：M3/ADR 0003-D8 已冻结「M3 不写建议、M5 不写报告」；可见性只在读取时派生；代码审查用 `rg "talent_advice" server/utils/talent-report*` 断言无写入；单测覆盖六种组合 |
| R2 | 版本切换不是跨请求事务（PB SDK 无事务封装），中途失败可能新旧版本都不 active | 锁内固定顺序（先建归档占位 → 建文档 → 旧归档 → 新激活）+ 失败补偿删除/恢复；失败 500 且旧版保持生效；单测用注入失败点验证补偿 |
| R3 | `sections` 体积（每份几十条 × 四段 × 2000 字）导致列表/详情慢 | 列表不返回 `sections`，只返回派生缓存字段（§3.4）；详情按份返回；单份 > 256KB 记 failed；M9 再评估拆分 |
| R4 | 「年龄」口径误用成「当前周岁」/区间匹配，导致 AC-ADM-07-2 不通过 | `age` 在 `effectiveAt` 冻结；列表按冻结值精确相等；单测含生日当天/前一天/闰年/未来生日；文档与页面均标「同步时精确周岁」 |
| R5 | 外部数据熵等级名（优秀/优良、弱态/弱势）与 M1 四档不一致 | 白名单双收、原样保存与展示、不映射；与 M1 U2 同源列入 §14 C1；客户裁决后只改白名单与映射一处 |
| R6 | 历史版本导出是否合规/需要（PRD §13.3 L656 待定） | 默认允许「跟随查看版本导出」，页面 1 处开关可关；列入 §14 C4 待裁决 |
| R7 | `adviceNo` 含报告编号，C 端「各自编号」可能外泄内部编号 | C 端按册派生 `{adviceNo}-{book}`；不返回报告编号/版本 id；列入 §14 C2，若要更保守 M7 可只展示序号 |
| R8 | 新版未覆盖的人在新版下无建议，运营误以为数据丢失 | 旧行归档保留、按人历史可回溯；接收结果返回 `emptyCount` + `warnings` 明细；版本历史显示份数；文档与页面提示「暂无匹配以外部推送为准」 |
| R9 | 旧 `talent_cultivation_contents` 口径被误复用（按要素/分级/年龄匹配内容） | ADR D6 明确不复用、不迁移；新集合独立；实现审查禁止 `rg "talent_cultivation_contents"` 出现在 M5 新代码 |
| R10 | 重复接收/并发接收产生两条 active 版本 | 部分唯一索引 `idx_talent_advice_versions_active` + 全局锁 + 重复版本 409 三重保护；新库索引断言必查 |
| R11 | M3 数据未就绪导致无法联调真实报告 | 种子先跑 `pnpm talent:report:seed`；单测注入假基因报告/报告；M3 完成后做一次真实联调 |
| R12 | 身份证明文进入建议/日志/CSV | 建议只存 `maskedIdNo` + `idNoHash`；不读解密；`sections` 顶层做 PII 正则拒绝；导出只脱敏；日志摘要不含证件号；单测断言 |
| R13 | 静态路由被旧 `[resource].get.ts` 截获 | 实现后按 §5.7 实测 5 条路径；不符则按兜底迁目录并回写文档 |
| R14 | M7 未实现时 AC-ADM-07-3 的 C 端页面证据缺失 | 服务端守卫/派生可见性单测作为 M5 证据；C 端页面证据在 acceptance §3 E12 单列记「不在范围（M7）」，不阻塞 M5 服务端验收 |
| R15 | `talent_sync_logs` 被 M3 扩展字段复用时的兼容 | M5 只写 `syncScope="advice_version"`（text 字段扩值，不改结构）；旧行 `syncScope=""` 不受影响；M3 的 `gene_report` 过滤不串 |

## 14. 未决项

| # | 未决项 | 现状 / 本文处理 | 需谁裁决 |
| --- | --- | --- | --- |
| C1 | 数据熵等级名口径：M1 四档为 卓越/优秀/优良/常态，原型建议文案出现「弱态」，外部文库为「弱势」 | 白名单 `卓越/优秀/优良/常态/弱态/弱势` 双收、原样保存与展示、不映射四档；与 M1 U2 同源 | 客户 / PRD v1.2 |
| C2 | C 端「一册一份、各自编号」是否展示含报告编号的完整建议编号 | 默认按册派生 `{adviceNo}-{book}` 返回（PRD L376 要求各自编号）；不含其它后台字段；如客户要求脱敏，M7 改展示序号即可 | 客户 / lead |
| C3 | 建议周期是否可配置（当前常量 4 个月） | 常量 `TALENT_ADVICE_CYCLE_MONTHS=4`；版本行冻结 `cycle/nextUpdateAt`；不建配置集合，后续要改另立 ADR | 客户 / lead |
| C4 | 历史版本是否需要导出（PRD §13.3 L656） | 默认允许导出「当前查看版本」，页面 1 处开关可关；不额外做异步导出 | 客户 |
| C5 | 补发新增分册后建议是否立即补该册（PRD §13.2-1 当前按周期等下版） | M5 不提供按册补发建议；新分册内容随下一次接收新一版进入；接收前 C 端建议仍只覆盖旧册 | 客户（需书面确认） |
| C6 | 报告撤回时建议是否同步置「已撤回」（PRD §13.2-2 当前仅 C 端不可见、后台仍已发布） | 本文按当前口径：不改建议状态，读取时派生不可见；如客户要求双写，需同时改 M3/M5 并新增可见性校验，不推荐 | 客户 / lead |
| C7 | 接收新一版是否全量重扫所有基因报告（本文口径）还是只按上一版基线续推（原型行为） | 本文采用**全量基因报告为候选**，保证新同步的人进入新版；新版未匹配到的人空态；外部接口能力需 M8 确认 | M8 接口 / 客户 |
| C8 | M3 报告详情第 4 页签接线归属 | M5 提供 `listTalentAdviceForSubject` + `GET /advice/subject`；M3 `[id].get.ts` 改调 1 处由 lead 派发 | lead / M3 实现者 |

## 15. 文档同步清单（M5 出口，由 lead 派发，不在本任务写范围）

- `docs/API.md`：9 条新后台路由 + 权限列；C 端 `GET /api/client/talent/advice` 标注「M5 冻结契约 / M7 实现」。
- `docs/ARCHITECTURE.md`：集合表新增 `talent_advice_versions` / `talent_advice_docs`；标注「旧 `talent_cultivation_contents` 保留到 M6，不复用」。
- `docs/STATUS.md`：集合数、路由数、权限码数、Mock 建议源与种子命令。
- `docs/TALENT-LOCAL.md`：`TALENT_ADVICE_SOURCE` / `TALENT_ADVICE_MOCK_MODE`、`pnpm talent:advice:seed`、接收新版/发布撤回/版本历史烟测步骤。
- `docs/specs/M5-advice/acceptance.md`：verifier 填证据表。
- `docs/specs/README.md`：模块索引补 M5（如该文件维护模块清单）。
