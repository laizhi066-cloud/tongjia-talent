# ADR 0001 · M1 规则域关键决策

| 项 | 内容 |
| --- | --- |
| 状态 | 已接受（待 lead 复核） |
| 日期 | 2026-11-16 |
| 决策人 | 架构师 teammate（task-1） |
| 关联 | [M1 规则域规格](../specs/M1-rules/spec.md)、实现 M1-A/B/C（task-2/4/5）、验收 task-3、PRD v1.1 §6.3–§6.5/§8.2 |
| 影响范围 | `scripts/setup.mjs`、`scripts/sync-talent.mjs`、`shared/types/`、`server/utils/`、`server/api/admin/talent/`、`app/pages/admin/talent/rules/` 与菜单/权限种子 |

> 修订：2026-11-16 v2（按 lead 评审）——D1 由「删旧字段/旧索引」改为「增量改造 + 回滚 + `sync-talent` 只加不删门槛」；D3 补「固定注解全局共用、不按分库隔离」结论；D2 字段 `order` → `sortOrder`（避开 SQL 关键字，与仓库 `sortOrder` 惯例一致）。

## D1 · 集合命名：`talent_levels` 增量改造（只加新字段/新索引，旧字段保留到 M6）

**背景**

新分级只有全局 4 档（LV1–LV4，级序/得分范围），每档一条固定注解 × 158 要素。旧 `talent_levels` 是「要素下的分级阶梯」：`elementId` 必填、`annotation` 内嵌、唯一索引 `(elementId, levelCode)`，被旧页面 `app/pages/admin/talent/level.vue`、`/api/admin/talent/level*` 使用。开发计划 §4.3 把 `talent_levels` 标注为「改造」。其余 5 个集合（`talent_factor_libraries`、`talent_factors`、`talent_factor_notes`、`talent_directions`、`talent_tiers`）与旧集合不重名，可与旧集合共存到 M6。

**选项**

1. 破坏性改造 `talent_levels`：删旧字段/旧唯一索引，`sync-talent.mjs` 做迁移动作。
2. **增量改造**：保留旧字段与旧索引到 M6，M1 只新增 `code/name/sortOrder/range/tone` 5 个字段 + 2 个新索引，并把旧字段置为非必填以便写入新行。
3. 新建 `talent_rule_levels` / `talent_grade_levels`，旧集合原样保留到 M6。
4. 新建并立刻迁移/改名旧集合。

**结论**

选 2（lead 评审后从原方案 1 调整）。理由：`sync-talent.mjs` 的定位是**幂等同步、不是迁移工具**（CONVENTIONS §1），删除字段/索引属不可回滚的破坏性动作，而它正是 `scripts/setup.mjs` 明令不能做的事；项目尚未投产但本地已有 Mock 库，删字段会直接毁掉旧数据；增量改造保留旧页面/旧 API 的代码与数据完整性，M1 新页面只读新字段，风险面最小。选项 3 仍被否决：两套「分级」并存会让外部同步、固定注解、方向 `requirements` 三处引用语义长期混淆，且集合名与 task-2 任务卡一致更省协调成本。

**后果**

- M1 对 `talent_levels` 只执行：新增 5 字段；新增 `idx_talent_levels_code` UNIQUE(`code`) WHERE `code != ""`、`idx_talent_levels_sort` UNIQUE(`sortOrder`) WHERE `sortOrder > 0`（部分索引用于容忍存量旧行的空值/0 值）；旧字段 `elementId` / `levelCode` / `levelName` / `annotation` 保留、**改为非必填**；不删字段、不删旧索引 `idx_talent_levels_element_level`、不改旧行。
- 新页面/新 API 只处理 `code != ""` 的行，旧行不会出现在新列表；旧页面文件与旧路由保留（菜单在 M1 重指向，旧页不再有入口），M6 统一删除。
- **新行写入约定**：旧唯一索引 `idx_talent_levels_element_level` 仍在，为了不阻塞新分级写入，新行必须镜像旧字段——`levelCode = code`、`levelName = name`、`elementId`/`annotation` 留空。这样 4 条新行在旧索引上的键为 `("", LV1)`…`("", LV4)`，互不冲突。读取与业务只认新字段，镜像值仅为兼容，M6 随旧字段删除。
- 双语义期（M1–M6）：集合内同时存在旧行（`elementId` 非空、`code` 为空）与新行（`code` 非空、`elementId` 为空）；**任何跨语义的查询必须显式带 `code != ""` 或 `elementId != ""` 过滤**，SDK 层在 `server/utils/talent-rule.ts` 统一封装，禁止页面自行拼条件。
- 旧 e2e 02–05 中涉及旧规则页的断言预期变红，不纳入 M1 门禁，M9 重写（acceptance.md §6 R1）。
- **回滚**：删除 5 个新字段与 2 个新索引，并把「分级与固定注解」菜单指回 `/admin/talent/level`、权限码换回 `talent:content:list`，即回到 M1 前状态；旧字段、旧索引、旧数据全程未被修改，回滚不丢数据。
- **`sync-talent.mjs` 安全门槛（写进实现要求）**：只允许「加集合 / 加字段 / 加索引 / 放宽必填 / 菜单权限 upsert」；任何删除字段、删除索引、改数据或改必填方向的操作都必须另写迁移脚本，脚本启动前强制 `pnpm backup:pb`，并在迁移脚本内打印目标 PB URL 与数据目录供人工确认。M6 删除旧分级字段/旧行时按此流程执行。
- `talent_categories` / `talent_elements` / `talent_cultivation_contents` / `talent_content_libraries` 等旧集合与页面原样保留至 M6，M1 不读不写。

## D2 · 方向 `requirements` / `tierIds` 用 JSON 字段

**背景**

PRD §8.2 direction 要求 `requirements[{code, level}]`、`tiers[]`、`default_tier_id`。方向是整份读取的配置实体：列表展示前 3 项 + 「等 N 项」、C 端方向详情整份对照、M3 发布时整份冻结进快照；没有任何按单个 requirement 跨方向查询或更新的需求。

**选项**

1. JSON 字段：`requirements`（数组）+ `tierIds`（数组）+ `defaultTierId`（文本）。
2. 建子表 `talent_direction_requirements` + 关系字段。
3. `requirements` 用关系字段指向 `talent_factors`。

**结论**

选 1（与 task-2 任务卡口径一致）。理由：整份读写、无跨表查询；避免为 6 个集合再增子表；方向数量与要素数都小（≤数百方向 × ≤50 要求），全量扫描成本可忽略；快照可直接复制 JSON。选项 3 不可行：同一要素编码存在于多个性别/年龄分库，关系会绑死到某个分库记录。

**后果**

- 引用完整性不靠数据库，由服务层 + Zod 校验：`requirements[].code` 必须存在于启用分库、`level` 必须是启用分级；`tierIds` 必须指向启用档位，`defaultTierId ∈ tierIds`。
- 分级/档位删除或停用时，服务层扫描 `talent_directions` JSON 做引用保护（409）。
- 分级/档位改名不影响 JSON 引用（引用 `code` / tier id，不引用名称）。
- M4 命中算法只读 `requirements`：`code` → 报告实际分级、`level` → 级别 `sortOrder` 比较，不依赖本集合之外的新结构。

## D3 · 固定注解不落 `factorName`，且全局按 `factorCode` 共用（不按分库隔离）

**背景**

PRD §6.5 L246 明确「要素名称取潜质要素文库当前值，避免快照漂移」。原型 `INITIAL_NOTES` 同时存了 `factorName`（写入时快照）与展示时优先取文库名，属两套口径并存。注解共 632 条，文库 158 项（每性别/年龄一库）——632 是**全局**数量（158 × 4）。需要同时回答：多分库下同一 `factorCode` 可能名称/文案不同时，注解是否按库拆成副本。

**选项**

1. 不落 `factorName` / `levelName`，列表、导出、检索时用「编码 → 当前库名称」map 解析；注解全局按 `factorCode` 共用（不建 `libraryId`）。
2. 不落展示名，但注解按 `libraryId` 隔离（每库 632 条）。
3. 落 `factorName` 作展示缓存，导入/同步/编辑时由服务端强制覆盖。
4. 完全照原型：落快照名并直接展示。

**结论**

选 1。理由：

- 展示名：选项 4 直接违反 PRD 口径；选项 3 需要每个写入点（导入、同步、单条编辑、分级改名）都刷新缓存，任何遗漏即漂移，且制造「取哪个库的 name」二义性；158 项 / 632 条规模下解析成本可忽略。
- 隔离：PRD §6.5 L242/L254 把「632 / 4」写成固定验收数字，未定义按库副本；注解是规则层可维护/可导入数据，分库文案是外部只读原文（`talent_factors.slots`），两者来源与生命周期不同。按库隔离会让条数 = 632 × 库数（38 个性别/年龄库 → 24016 条），直接推翻验收口径并让导入模板出现库维度。因此 M1 不建 `libraryId`，唯一键仍是 `factorCode + levelCode`。

**后果**

- 列表接口需要一次批量解析：按启用分库取 `code→name`，找不到编码时回退显示编码并标记数据异常；多库同名编码名称不一致时以「启用库中 `syncedAt` 最近的库」为准，并在验收记录中标注（不因名称差异拆注解）。
- 检索「潜质要素名称」需先按名称命中要素编码再过滤注解（服务端两步查询），不能在 PB 单条 filter 里直接跨集合。
- 导入文件的「潜质要素」列忽略或仅作校验（以要素编码为准）；导出时按当前文库名称填充。
- 分级名称同理不落 `levelName`，按 `levelCode` 解析（4 档，成本为零）。
- 报告发布时的快照名冻结属 M3 报告域，不在本决策范围（快照仍冻结当时名称）。
- 如客户后续要求注解按库差异化：必须新开 ADR（会改变 632 计数口径、M3 快照结构与导入模板），M1 不预留 `libraryId` 字段。

## D4 · 导入预览不落库（无中间批次表）

**背景**

PRD §6.5 要求「数据导入（字段映射 + 校验预览 + 失败明细）」、`AC-ADM-05-3` 要求「导入可预览通过/失败行，失败行不写入」。仓库已有会员导入的批次表（`talent_customer_import_batches` / `_rows`）模式可参考，但 PRD §3.2 已把会员导入排除，旧批次表 M6 删除。注解/分级导入规模为 632 / 4 行级别。

**选项**

1. 无状态两次请求：`import/preview` 只解析校验并返回明细，`import` 重新解析、二次校验后写入。
2. 复用/新建导入批次集合：预览落批次与行，提交按批次 id 执行。
3. 预览即写入（无确认步骤）。

**结论**

选 1。理由：不新增集合（M1 只建 6 个，避免刚建就为 M6 留下清理债）；预览与提交都是小文件，重复解析成本可忽略；失败明细作为响应返回即可满足「失败明细」验收；还能避免批次表清理与并发过期问题。选项 3 不满足「预览后再确认」。

**后果**

- 预览与提交之间若数据被他人修改，以提交时的校验为准（可能预览通过、提交失败），响应中明确失败行。
- 失败明细不持久化；`oper_logs` 只记摘要（模板类型、总行数、成功数、失败数），不记正文。
- 提交采用「逐行 upsert + 收集失败」而非整批事务：通过行写入、失败行跳过；同批重复唯一键由后行覆盖前行并在预览标注。
- 若后续客户要求导入可追溯，再引入批次表需新 ADR（可复用 `sync_logs` 思路）。

## D5 · 权限码与菜单过渡：新码 + 菜单重指向，角色授权留到 M6

**背景**

旧规则页统一用 `talent:content:*`（分类与要素 / 分级与固定注解 / 匹配规则 / 内容库四页共用）。新规则域有独立角色「规则配置员」（PRD §2 L52），且旧内容库 M6 删除。M1 期间新旧菜单必须同时在册（旧代码 M6 才删），但同名菜单不能重复。

**选项**

1. 复用 `talent:content:*`，M6 再拆分。
2. 新增独立权限码（`talent:direction:*` / `talent:factor:*` / `talent:rule:*` / `talent:tier:*`），旧码保留给旧页面。
3. 新增权限码并同步创建三角色与完整授权。

**结论**

选 2。理由：选项 1 会让「规则配置员」拿到内容库权限，M6 需要重排；选项 3 超出 M1 范围（三角色属 M6，PRD 角色矩阵尚未最终确认）。新码共 15 个，一次登记到位。

**后果**

- M1 菜单动作：新增「培养方向」一级分组 + 「培养方向管理」「潜质要素」两条 C 菜单；把既有「分级与固定注解」C 菜单的 `path` / `component` / `permissionCode` 指到新页与新码；「分类与要素」「匹配规则」「内容库与培育内容」三个旧菜单原样保留至 M6。旧 `/admin/talent/level` 页面文件不删但不再有菜单入口。
- 旧码 `talent:content:*` 在 M6 随旧页面删除，需在 M6 删除清单中显式列出。
- M1 验收用 `admin` / `superadmin`（RBAC 通配）；`user` 角色暂不授权新码。M6 建三角色时按规则配置员 → 方向/档位/要素/分级页面的 C+F 授权。
- 每个 `requirePermission` 码都必须有对应 C 或 F 菜单行，否则自定义角色无法分配（CONVENTIONS §3 / DEVELOPMENT §B 端）。

## 附：被否决的备选小结

| 决策 | 主要否决理由 |
| --- | --- |
| D1 破坏性删旧字段 / 新建 `talent_rule_levels` | 删字段/删索引不可回滚且违背 `sync-talent.mjs` 的幂等定位（CONVENTIONS §1）；新建并存会让两套分级语义混淆到 M6，合并成本高于增量改造 |
| D2 子表 / 关系字段 | 无查询诉求，增加集合与级联复杂度；快照复制不便 |
| D3 展示缓存 | 多点刷新易漏，制造第二真源 |
| D4 批次表 | 新增集合与清理逻辑，收益仅「可追溯」，当前验收不要求 |
| D5 复用旧码 | 角色权限被内容库污染，M6 必然返工 |