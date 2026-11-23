# M1 · 规则域规格（文库 / 分级 / 固定注解 / 培养方向 / 档位）

> 状态：待实现（task-2 按本文落地）。本文是 M1 的实现合同，只写 docs，不改源码。
> 依据：PRD v1.1 §6.3（L197–222）、§6.4（L224–238）、§6.5（L240–256）、§8.2（L496–520）、§9（L552–557）、§12（L604–616）；开发计划 M1（`docs/implementation/天赋专项正式开发计划-2026-11-16.md` L209–213）；决策见 [ADR 0001](../../adr/0001-m1-rule-domain.md)。
> 验收：见同目录 [acceptance.md](acceptance.md)。
> 修订：v1.1（2026-11-16，按 lead 评审）——① `slots` 每槽落四段文案（关闭原 U7）；② 补「库不存在时同步」入口 `POST /factor-libraries/sync`（API 共 31 条）；③ 固定注解全局按 `factorCode` 共用、不按分库隔离（ADR 0001-D3）；④ `talent_levels` 改为**增量改造**：M1 只加新字段/新索引，旧字段/旧索引保留到 M6（ADR 0001-D1 重写）。

## 1. 范围与不在范围

### 1.1 本里程碑交付

- 6 个集合：`talent_factor_libraries`、`talent_factors`、`talent_factor_notes`、`talent_directions`、`talent_tiers` 为新建；`talent_levels` 为**增量改造**（只加新字段/新索引，旧字段/旧索引保留到 M6）；同步 `shared/types/`、`scripts/setup.mjs`（仅新库）、`scripts/sync-talent.mjs`（存量库只做加法）。
- B 端 3 个页面：培养方向管理、潜质要素、分级与固定注解；档位维护为方向页内弹层。
- `/api/admin/talent/{factor-libraries,factors,levels,factor-notes,directions,tiers}` 路由 + Zod + RBAC 权限码 + `withOperLog()`。
- 固定注解 / 分级的 CSV 导入（预览 + 失败明细 + 模板 + 导出）；文库导出与文库模板。
- 菜单与权限码登记；M1 种子数据（4 分级、4 档位、1 个分库 × 158 要素 × 632 注解、6 个方向）。

### 1.2 不在范围（M1 不做，避免越界）

| 项 | 归属 | 说明 |
| --- | --- | --- |
| 方向命中算法（级序 ≥ 计 1 条、命中数降序、平手规则）、推荐上限 5 / 选择上限 3 | M4 | M1 只落 `requirements` 数据契约（§3.5.1） |
| 报告 / 快照 / 已选方向 / 方向配置变更对照 | M3 | M1 删除校验对 `talent_reports` 做「集合存在才校验」的渐进式处理 |
| 会员、子女、报告、建议集合与页面 | M2/M3/M5 | 不建、不改 |
| 自定义方向归并入口与别名维护（PRD §13.3 L654） | M4 | M1 只建 `aliases` 字段与读取 |
| 旧口径集合/页面/API/菜单删除（机构 / 服务商 / 培养计划 / 内容库 / 分类与要素 / 匹配规则） | M6 | M1 保留旧代码；`talent_levels` 改造后旧分级页失效，处置见 ADR 0001-D1 |
| C 端展示（要素解读、方向详情、档位选择） | M7 | M1 不开 `/api/client/*` 规则接口 |
| 真实外部文库接口联调 | M8 | M1 实现可替换的 `TalentFactorLibrarySource`，默认本地文件 Mock |
| 三角色（平台运营管理员 / 报告审核员 / 规则配置员）正式授权 | M6 | M1 只登记权限码与菜单；验收用 `admin` / `superadmin` |
| 规则相关 E2E 重写 | M9 | 旧 e2e 02–05 覆盖旧规则页，M1 不纳入门禁 |

### 1.3 硬约束

- 单实例、单 PocketBase；不引入 `TENANT_MODE`、`site` cookie、`X-Site-Slug`、第二个 PB 连接。
- 业务字段只落 `talent_*`；不回填 `users` / `configs` / `site_config`。
- `scripts/setup.mjs` 只用于空数据目录；存量库变更只走 `scripts/sync-talent.mjs`。
- 页面不得直连 PocketBase 或 `useApi()`；权限必须在 Nitro 路由内校验。

## 2. 角色与权限

### 2.1 权限码（新增 15 个）

| 页面 / 能力 | 权限码 |
| --- | --- |
| 培养方向管理 | `talent:direction:list` / `add` / `edit` / `delete` |
| 潜质要素（文库与要素只读） | `talent:factor:list` / `sync` / `export` |
| 分级与固定注解 | `talent:rule:list` / `add` / `edit` / `delete` / `import` / `export` |
| 档位维护（方向页内弹层） | `talent:tier:list` / `edit` |

- 服务端统一使用 `requirePermission(event, code)`；前端 `hasPermission(code)` 只做体验层隐藏。
- 旧 `talent:content:*` 保留给旧页面，M6 随旧页面删除（ADR 0001-D5）。

### 2.2 菜单登记（`scripts/setup.mjs` + `scripts/sync-talent.mjs` 幂等）

| 类型 | 菜单名 | 路径 | component | 页面权限码 | 按钮权限（`F`） |
| --- | --- | --- | --- | --- | --- |
| M | 培养方向 | — | — | — | — |
| C | 培养方向管理 | `/admin/talent/rules/direction` | `admin/talent/rules/direction.vue` | `talent:direction:list` | add/edit/delete、tier:list/tier:edit |
| C | 潜质要素 | `/admin/talent/rules/factor` | `admin/talent/rules/factor.vue` | `talent:factor:list` | sync/export |
| C | 分级与固定注解 | `/admin/talent/rules/level` | `admin/talent/rules/level.vue` | `talent:rule:list` | add/edit/delete/import/export |

- 「分级与固定注解」菜单沿用旧菜单行的 `menuName`，把 `path` / `component` / `permissionCode` 指向新页；旧菜单行不新增同名项。
- 「分类与要素」「匹配规则」「内容库与培育内容」菜单原样保留到 M6；「培养方向」一级分组若已存在则复用。
- 页面路由统一放 `app/pages/admin/talent/rules/`，避开旧 `app/pages/admin/talent/level.vue` 的 `/admin/talent/level`，不覆盖旧页面文件。
- 菜单 `status = "0"` 时侧栏即时隐藏（PRD §2 L58）。

## 3. 数据模型

### 3.0 通用约定

- 集合与字段命名以本仓库现有风格为准（camelCase），与 PRD `snake_case` 的映射见 §3.8。
- `status`：`text` 长度 10，必填，`"1"` 启用 / `"0"` 停用（与现有 `talent_*` 一致）。
- 写操作审计字段：`createdBy` / `updatedBy`（relation → `users`，`maxSelect: 1`，`cascadeDelete: false`）。
- 时间字段用 PocketBase `date`；`created` / `updated` 由 PB 维护。
- 唯一索引命名 `idx_<collection>_<field>`，与 `setup.mjs` 现有索引段一致。
- 删除策略：要素随分库 `cascadeDelete: true`；规则实体（分级 / 注解 / 方向）默认 `cascadeDelete: false`，删除前服务层校验引用。
- JSON 字段必须写清内部结构并做 Zod 校验；需要被筛选/索引的字段不塞 JSON。
- PocketBase `required` 语义偏差：`required` number 等价于「不能为 0」，`required` bool 等价于「必须为 true」。因此 `age`、`filledCount`、`filledSlotCount`、`partialSlotCount`、`isDefault` 在 PB schema 中为可选，必填性由 Zod / 服务层与种子保证（见 acceptance §4.1 F3）。

### 3.1 `talent_factor_libraries`（外部文库分库：性别 + 具体年龄）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `gender` | text(16) | 是 | `male` / `female`；展示层映射「男 / 女」 |
| `age` | number | 是 | 具体年龄 0–18，一岁一库，不合并区间（PRD §6.4 L232） |
| `source` | text(100) | 是 | 来源标识；M1 固定 `mock-file`，M8 换真实来源 |
| `version` | text(40) | 否 | 外部文库批次号 |
| `syncedAt` | date | 否 | 最近同步时间 |
| `syncedBy` | relation → `users` | 否 | 最近同步操作人 |
| `itemCount` | number | 是 | 本库要素数（同步后回填，种子 158） |
| `slotTotal` | number | 是 | 应回填槽位总数 = `itemCount × 12`（种子 1896） |
| `filledCount` | number | 是 | 四段完整的槽位数（种子 27，= 本库 `talent_factors.filledSlotCount` 之和） |
| `status` | text(10) | 是 | 未同步的库不建记录 |

唯一索引：`idx_talent_factor_libraries_gender_age`（`gender, age`）。

### 3.2 `talent_factors`（潜质要素，只读文库）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `libraryId` | relation → `talent_factor_libraries` | 是 | `maxSelect: 1`，`cascadeDelete: true` |
| `code` | text(16) | 是 | 要素编号 `A-01`…`F-23`；后台保留编码用于定位（BR-12 L108） |
| `name` | text(100) | 是 | 潜质要素名称 |
| `category` | text(2) | 是 | 分册编码 `A`–`F` |
| `categoryName` | text(20) | 是 | 分册名称，固定映射：A 生长发育 / B 智商 / C 情商 / D 领导商 / E 艺术商 / F 体育运动商（BR-04 L100） |
| `sortOrder` | number | 否 | 外部文库「序号」1–158 |
| `slots` | JSON | 是 | 12 槽位 × 4 段文案，结构见 §3.2.1 |
| `slotTotal` | number | 是 | 固定 12 |
| `filledSlotCount` | number | 是 | 四段全部非空的完整槽位数 0–12 |
| `partialSlotCount` | number | 是 | 有文案但四段未填满的槽位数 0–12 |
| `createdBy` / `updatedBy` | relation → `users` | 否 | 审计字段 |

- 无 `status`：PRD §6.4 L226/L238 明确不提供新增/编辑/停用入口，`AC-ADM-04-3`。
- 索引：唯一 `idx_talent_factors_library_code`（`libraryId, code`）；普通 `idx_talent_factors_category`（`category`）、`idx_talent_factors_sort`（`libraryId, sortOrder`）。

#### 3.2.1 `slots` JSON 契约（每槽 4 段，M7 直接消费）

```json
{
  "LV1": [
    { "content": "", "example": "", "direction": "", "suggestion": "" },
    { "content": "", "example": "", "direction": "", "suggestion": "" },
    { "content": "", "example": "", "direction": "", "suggestion": "" }
  ],
  "LV2": [
    { "content": "", "example": "", "direction": "", "suggestion": "" },
    { "content": "", "example": "", "direction": "", "suggestion": "" },
    { "content": "", "example": "", "direction": "", "suggestion": "" }
  ],
  "LV3": [
    { "content": "", "example": "", "direction": "", "suggestion": "" },
    { "content": "", "example": "", "direction": "", "suggestion": "" },
    { "content": "", "example": "", "direction": "", "suggestion": "" }
  ],
  "LV4": [
    { "content": "", "example": "", "direction": "", "suggestion": "" },
    { "content": "", "example": "", "direction": "", "suggestion": "" },
    { "content": "", "example": "", "direction": "", "suggestion": "" }
  ]
}
```

| 段 | 字段 | 对应外部文库列（PRD §6.4 L232 / 原型 `ELEMENT_LIB_COLUMNS`） | M1 消费方 |
| --- | --- | --- | --- |
| 分级内容 | `content` | 分级内容 | 后台文案弹层、导出 |
| 分级举例 | `example` | 分级举例 | 后台文案弹层、导出、C 端要素解读（M7） |
| 培育方向 | `direction` | 培育方向 | 后台文案弹层、导出、C 端（M7） |
| 培育建议 | `suggestion` | 培育建议 | 后台文案弹层、导出、C 端（M7） |

- 键必须是 `talent_levels.code` 的当前值（4 档）；每档 3 个变体（`ELEMENT_VARIANTS = 3`）。**四段必须全量落库**：M1 一次定义到位，避免 M7 再做 schema 迁移与全量 re-sync（原 U7 关闭，见 §9）。
- 空串 = 待补写；完整槽位 = 四段均非空（计入 `filledSlotCount`），有任一非空但未填满 = 部分回填（计入 `partialSlotCount`）。
- 槽位键固定 4 档，不随分级改名漂移（分级改名只改 `name`，`code` 不可改）。
- 同步器按外部行（序号/年龄/分册/潜质要素/数据熵/四段）解析后写入；同一 `code + level + variant` 重复推送按唯一位置覆盖（幂等），不追加。

### 3.3 `talent_levels`（分级，**增量改造既有集合，不删旧字段**）

M1 只做加法：新增 5 个字段 + 2 个新索引；旧字段与旧索引原样保留到 M6（ADR 0001-D1）。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `code` | text(16) | 是 | `LV1`–`LV4`；唯一标识，编辑不可改（新增字段） |
| `name` | text(20) | 是 | 常态 / 优良 / 优秀 / 卓越（可改文案，新增字段） |
| `sortOrder` | number | 是 | 级序 1–4；BR-08 命中比较的唯一依据（新增字段，PRD `order` 的映射） |
| `range` | text(20) | 否 | 得分范围文案，如 `0–59`（新增字段） |
| `tone` | text(20) | 否 | 展示色位 `default` / `info` / `success` / `warning`，映射 Naive UI tag 类型与主题令牌，不存色值（新增字段） |
| `status` | text(10) | 是 | 启用 / 停用（沿用旧字段） |
| `createdBy` / `updatedBy` | relation → `users` | 否 | 审计字段（沿用旧字段） |
| `elementId` / `levelCode` / `levelName` / `annotation` | 旧字段 | — | **保留但改为非必填**（否则新分级无法在没有要素关系的情况下写入）；旧页面/旧代码原样保留，M6 删除 |

- 新索引：`idx_talent_levels_code` UNIQUE(`code`) WHERE `code != ""`；`idx_talent_levels_sort` UNIQUE(`sortOrder`) WHERE `sortOrder > 0`（`WHERE` 是为了容忍存量 Mock 库里的旧行：旧行新字段为空、`sortOrder = 0`）。
- **写入约定（兼容旧唯一索引）**：因为旧索引 `idx_talent_levels_element_level` 仍在，新行必须同时回填旧字段镜像：`levelCode = code`（如 `LV1`）、`levelName = name`，`elementId` 留空、`annotation` 留空。这样 4 条新行在旧索引上的键为 `("", LV1)`…`("", LV4)`，互不冲突，旧索引不会阻塞新分级写入。读取/业务只认新字段（`code/name/sortOrder/range/tone`），旧镜像值仅为兼容，M6 随旧字段一起删除。
- 旧索引 `idx_talent_levels_element_level` 与旧字段**保留不动**；`sync-talent.mjs` 只执行「新增字段 / 新增索引 / 旧字段置为非必填」，不删字段、不删索引、不改旧数据。
- 新页面与新 API 只处理 `code != ""` 的行（`filter: code != ""`），旧行不会出现在新列表中。
- 回滚：删除 5 个新字段与 2 个新索引即可回到 M1 前结构（旧数据与旧索引未动），再把「分级与固定注解」菜单指回旧路由 `/admin/talent/level`。详见 ADR 0001-D1「回滚」。
- M6 清理清单：删旧字段（`elementId` / `levelCode` / `levelName` / `annotation`）、旧索引、旧行与旧页面/旧 API。

### 3.4 `talent_factor_notes`（固定注解，632 = 158 × 4）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `code` | text(32) | 是 | 注解编号 = `${factorCode}-${levelCode}`（如 `A-01-LV1`）；服务端生成，唯一，编辑不可改 |
| `factorCode` | text(16) | 是 | 要素编号，逻辑引用 `talent_factors.code`（同一编码存在于多个分库，不做 PB relation） |
| `category` | text(2) | 是 | 分册，保存时由要素当前值派生 |
| `levelCode` | text(16) | 是 | 分级编码，逻辑引用 `talent_levels.code` |
| `note` | text(2000) | 否 | 注解正文；空 = 待补写（导入补写场景） |
| `ageRange` | text(50) | 否 | 年龄条件文案（如 `0 岁`、`3–6 岁`）；空 = 不限 |
| `gender` | text(10) | 否 | `男` / `女` / `通用`，默认 `通用` |
| `status` | text(10) | 是 | 启用 / 停用 |
| `createdBy` / `updatedBy` | relation → `users` | 否 | 审计字段 |

- **不落 `factorName` / `levelName`**：读取时按文库当前值解析，避免 PRD §6.5 L246 所说的「快照漂移」（ADR 0001-D3）。
- **固定注解全局按 `factorCode` 共用，不按分库隔离**：632 = 158 要素 × 4 分级 是**全局**数量，与性别/年龄分库无关；不建 `libraryId`，唯一键仍是 `factorCode + levelCode`。理由：PRD §6.5 L242/L254 把 632 / 4 作为固定验收数字，未定义按库副本；注解是规则层可维护/可导入的数据，而分库文案是外部只读原文（`talent_factors.slots`），两者来源与生命周期不同，不应混用。
  - 同一 `factorCode` 在多个分库若出现**不同名称**，视为外部数据异常：列表/导出解析名称以「启用库中 `syncedAt` 最近的库」为准，并在验收记录中标注，不因此拆注解。
  - 如客户后续要求注解按库差异化 → 必须新增 ADR（会改变 632 计数口径与 M3 快照结构），M1 不做预留字段。
- 索引：唯一 `idx_talent_factor_notes_code`（`code`）；普通 `idx_talent_factor_notes_factor`（`factorCode`）、`idx_talent_factor_notes_level`（`levelCode`）、`idx_talent_factor_notes_status`（`status`）。

### 3.5 `talent_directions`（培养方向）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `code` | text(64) | 是 | 方向编码，如 `DIR-001`；唯一，编辑不可改 |
| `name` | text(100) | 是 | 培养方向名称 |
| `description` | text(500) | 否 | 一句描述（列表第二行文案） |
| `icon` | text(100) | 否 | 图标标识（汉字或图标 key）；B 端列表不展示，C 端 M7 用 |
| `requirements` | JSON | 是 | 要素要求，结构见 §3.5.1；1–50 项 |
| `tierIds` | JSON | 是 | 启用档位 id 数组（引用 `talent_tiers.id`），1–4 个，去重 |
| `defaultTierId` | text(64) | 是 | 默认档位 id，必须 ∈ `tierIds` |
| `aliases` | JSON | 否 | 别名 `string[]`，自定义方向归并写入（M4 使用；M1 只读写） |
| `version` | number | 是 | 规则版本，默认 1；保存配置 +1，见 §4.2 |
| `status` | text(10) | 是 | 启用 / 停用 |
| `createdBy` / `updatedBy` | relation → `users` | 否 | 审计字段 |

- 索引：唯一 `idx_talent_directions_code`（`code`）；普通 `idx_talent_directions_status`（`status`）。
- `requirements` / `tierIds` 用 JSON 而非关系或子表（ADR 0001-D2），引用完整性全部由服务层校验。

#### 3.5.1 `requirements` JSON 契约（M4 命中算法的唯一输入）

```json
[{ "code": "A-01", "level": "LV1" }]
```

| 规则 | 说明 |
| --- | --- |
| `code` | 必须是**某个启用分库**中存在的要素编码；不接受分库 id（跨库口径统一用编码） |
| `level` | 必须是**启用中**的分级 `code`；命中比较用该分级的 `sortOrder`（M4） |
| 数量 | 1–50；空数组保存时 422 |
| 去重 | 同一 `code` 不得重复；重复保存 422 |
| 顺序 | 数组顺序 = 后台展示与 C 端对照顺序；不做排序计算 |
| 权重 | 不设权重、不校验合计 100（PRD §6.3 L208） |
| 版本 | 保存配置后 `version + 1`；M3 快照按 `version` 对照「发布时 vs 当前配置」 |

### 3.6 `talent_tiers`（目标档位，固定 4 档）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `code` | text(16) | 是 | `T1`–`T4`；唯一，不可改 |
| `name` | text(20) | 是 | 启蒙 / 养成 / 精进 / 冲刺（可改文案） |
| `sortOrder` | number | 是 | 1–4，唯一（新增集合，无旧行，可用普通唯一索引） |
| `teacher` | text(50) | 是 | 建议师资（普通 / 资深 / 卓越 / 大师级老师） |
| `freq` | text(50) | 是 | 建议频次（如 `每周 2 次`） |
| `headline` | text(100) | 否 | 一句话卖点 |
| `description` | text(1000) | 否 | 档位说明 |
| `preset` | bool | 是 | 系统预置，M1 全部 `true` |
| `isDefault` | bool | 是 | 全局默认档位；全局仅 1 条 `true` |
| `status` | text(10) | 是 | 启用 / 停用；停用后所有方向同步不可选 |
| `updatedBy` | relation → `users` | 否 | 审计字段 |

- 索引：唯一 `idx_talent_tiers_code`（`code`）、唯一 `idx_talent_tiers_sort`（`sortOrder`）、部分唯一 `idx_talent_tiers_default`（`isDefault` where `isDefault = 1`）。
- 不提供新增 / 删除 API（PRD §6.3 L213「不提供新增档位」）；只允许编辑、停用/启用、设全局默认。

### 3.7 索引清单（新库必须断言存在）

| 集合 | 索引 |
| --- | --- |
| `talent_factor_libraries` | `idx_talent_factor_libraries_gender_age` UNIQUE(`gender`,`age`) |
| `talent_factors` | `idx_talent_factors_library_code` UNIQUE(`libraryId`,`code`)；`idx_talent_factors_category`；`idx_talent_factors_sort` |
| `talent_levels` | `idx_talent_levels_code` UNIQUE(`code`) WHERE `code != ""`；`idx_talent_levels_sort` UNIQUE(`sortOrder`) WHERE `sortOrder > 0` |
| `talent_factor_notes` | `idx_talent_factor_notes_code` UNIQUE；`idx_talent_factor_notes_factor`；`idx_talent_factor_notes_level`；`idx_talent_factor_notes_status` |
| `talent_directions` | `idx_talent_directions_code` UNIQUE；`idx_talent_directions_status` |
| `talent_tiers` | `idx_talent_tiers_code` UNIQUE；`idx_talent_tiers_sort` UNIQUE；`idx_talent_tiers_default` UNIQUE(`isDefault`) WHERE `isDefault = 1` |
| `talent_levels`（旧，保留） | `idx_talent_levels_element_level` 保留到 M6，M1 不删 |

### 3.8 PRD → 集合字段映射

| PRD §8.2 | 本规格 | 说明 |
| --- | --- | --- |
| `element_lib`（L520） | `talent_factor_libraries` + `talent_factors` | `items`→`itemCount`，`filled`→`filledCount`（槽位数） |
| `factor`（L507） | `talent_factors` | `score` / `level` / `note` / `age_range` 属报告结果，不在文库 |
| `level`（L509） | `talent_levels` | `code` / `name` / `order`→`sortOrder` / `range` / `tone` / `status` |
| `note`（L508） | `talent_factor_notes` | `id`→`code`，`factor_code`→`factorCode`，`level`→`levelCode`；`factor_name` 不落库 |
| `direction`（L500） | `talent_directions` | `tiers[]`→`tierIds` JSON，`default_tier_id`→`defaultTierId` |
| `tier`（L501） | `talent_tiers` | 补 `code` / `order`→`sortOrder` / `isDefault` |

### 3.9 种子数据（M1 交付必须可复现）

| 数据 | 数量 | 内容 |
| --- | --- | --- |
| 分级 | 4 | LV1 常态 1 `0–59` default；LV2 优良 2 `60–74` info；LV3 优秀 3 `75–89` success；LV4 卓越 4 `90–100` warning |
| 档位 | 4 | T1 启蒙/普通老师/每周 1–2 次（`isDefault`）；T2 养成/资深老师/每周 2 次；T3 精进/卓越老师/每周 2–3 次；T4 冲刺/大师级老师/每周 3 次以上 |
| 分库 | 1 | `male` / `0` / `mock-file` / `v1` / `itemCount=158` / `slotTotal=1896` / `filledCount=27` |
| 要素 | 158 | `A-01`–`F-23`；分册数量 A=26 / B=39 / C=27 / D=25 / E=18 / F=23；每项 12 槽位 × 四段；四段完整的槽位 27（A-01 12、A-02 3、D-15 12），部分回填 0 |
| 固定注解 | 632 | 158 × 4；`code = factorCode-levelCode`；正文取该要素该分级第 1 变体的「分级内容」，无则空（待补写） |
| 培养方向 | 6 | `DIR-001`–`DIR-006`（舞蹈家 / 音乐家 / 逻辑思维 / 语言表达 / 绘画创作 / 运动竞技），`version=1`，`tierIds` 按原型 |

- 种子脚本：`scripts/seed-talent-rule.mjs`，按唯一键幂等 upsert，**不清空其他天赋域数据**；脚本与 `pnpm` 登记属于 M1 补充项（不在 task-2 写范围），验收前必须可用（见 acceptance.md §1）。分级种子行同时镜像旧字段（`levelCode = code`、`levelName = name`），满足 §3.3 的增量改造兼容约定。
- 数据来源：`docs/天赋正式开发交接包/talent-prototype-v2/assets/js/element-lib.js` 与客户 xlsx（当前仅男 0 岁库）。全量分库数据未交付（开发计划 R4）。

## 4. 状态与版本规则

### 4.1 状态

| 实体 | 状态 | 规则 |
| --- | --- | --- |
| 分级 / 注解 / 方向 / 档位 | `"1"` / `"0"` | 停用不删除数据；停用后 C 端不再命中/展示（M4/M7 消费）；已发布报告快照不受影响（BR-03 L99） |
| 方向 | 启用 → 停用 → 启用 | 停用需二次确认；被报告引用的方向删除返回 409「只允许停用」 |
| 档位 | 启用 / 停用 + 全局默认 | 停用某档位后所有方向同步不可选；全局默认必须启用 |
| 分库 / 要素 | 无状态变更入口 | 由同步覆盖写入，不提供停用 |

### 4.2 版本

- `talent_directions.version`：初始 1；**保存配置（PUT 配置）后 +1**，无论改了名称/要素/档位哪一项——对齐 PRD §6.3 L211「保存后生成方向新版本」与原型文案；停用/启用（独立状态接口）不改版本。
- `talent_factor_libraries.version`：外部批次号，由同步写入；不参与后台版本判断。
- 分级 / 注解 / 档位：无独立版本；历史报告通过 M3 快照冻结（M1 不涉及）。
- 并发：M1 不做乐观锁；同时保存以后写覆盖，并以 `oper_logs` 留痕，记入已知限制。

### 4.3 引用保护（M1 范围）

| 被删对象 | 检查引用 | 结果 |
| --- | --- | --- |
| 分级 | `talent_factor_notes.levelCode`、`talent_directions.requirements[].level` | 存在引用 → 409，只允许停用 |
| 要素 | 不提供删除 API | — |
| 方向 | `talent_reports.selections`（M3 集合，存在才查） | 存在引用 → 409，只允许停用 |
| 档位 | 不提供删除 API | — |
| 注解 | 无规则层引用（报告快照冻结） | 允许删除，提示历史快照不受影响 |

## 5. API 清单

### 5.1 通用约定

- 路由放 `server/api/admin/talent/`，与旧 `[resource].get.ts` 同目录时依赖 Nitro「静态段优先」；实现后必须验证 `/api/admin/talent/factors` 等新路径命中新路由（见 acceptance.md §6 R4）。
- 列表统一返回 `{ rows, total, page, pageSize }`（`paginatedQuery`）；`pageSize` 默认 20、上限 100。
- 写接口：`validateBody(event, zodSchema)` → `requirePermission` → `withOperLog()` → `success(data, message)`。
- 列表筛选参数：字符串 `keyword`（命中各自 keywordFields）与各字段独立筛选，取交集（BR-13 L109）；筛选变化回第一页由页面负责。
- 响应不回传 PocketBase 原始错误或堆栈。

### 5.2 路由表

| # | 方法 | 路径 | 权限码 | 说明 | 审计 |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/api/admin/talent/factor-libraries` | `talent:factor:list` | 分库列表（`gender` / `age` / `status`） | 否 |
| 2 | POST | `/api/admin/talent/factor-libraries/sync` | `talent:factor:sync` | **库不存在时的同步入口**：body `{ gender, age }` → 按唯一键 `gender+age` upsert 分库，再拉取要素/槽位 | 是 |
| 3 | POST | `/api/admin/talent/factor-libraries/:id/sync` | `talent:factor:sync` | 已同步库的再同步：provider 拉取 → 幂等 upsert 要素与四段槽位、刷新库 `filledCount`（部分回填槽位数写入同步日志） | 是 |
| 4 | GET | `/api/admin/talent/factors` | `talent:factor:list` | 要素列表（`libraryId` 必传、`category` / `keyword`） | 否 |
| 5 | GET | `/api/admin/talent/factors/:id` | `talent:factor:list` | 要素详情含 12 槽位 × 4 段 | 否 |
| 6 | GET | `/api/admin/talent/factors/export` | `talent:factor:export` | 导出当前库 CSV（行 = 要素 × 分级 × 变体，列含四段） | 是（摘要） |
| 7 | GET | `/api/admin/talent/factors/template` | `talent:factor:export` | 下载文库模板 CSV（仅表头示例，不提供要素导入） | 否 |
| 8 | GET | `/api/admin/talent/levels` | `talent:rule:list` | 分级列表（只含 `code != ""` 的新行），含每档固定注解数 | 否 |
| 9 | POST | `/api/admin/talent/levels` | `talent:rule:add` | 新增分级 | 是 |
| 10 | PUT | `/api/admin/talent/levels/:id` | `talent:rule:edit` | 编辑分级（`code` 不可改） | 是 |
| 11 | DELETE | `/api/admin/talent/levels/:id` | `talent:rule:delete` | 删除分级（被引用 → 409） | 是 |
| 12 | GET | `/api/admin/talent/levels/template` | `talent:rule:export` | 分级导入模板 CSV | 否 |
| 13 | GET | `/api/admin/talent/levels/export` | `talent:rule:export` | 分级导出 CSV | 是（摘要） |
| 14 | POST | `/api/admin/talent/levels/import/preview` | `talent:rule:import` | 分级导入预览（不落库） | 否 |
| 15 | POST | `/api/admin/talent/levels/import` | `talent:rule:import` | 分级执行导入（幂等 upsert，失败行不写入） | 是（摘要） |
| 16 | GET | `/api/admin/talent/factor-notes` | `talent:rule:list` | 注解列表（`levelCode` / `factorCode` / 名称 / 正文关键字），返回解析后的要素名 | 否 |
| 17 | POST | `/api/admin/talent/factor-notes` | `talent:rule:add` | 新增注解（`code` 服务端生成） | 是 |
| 18 | PUT | `/api/admin/talent/factor-notes/:id` | `talent:rule:edit` | 编辑注解（编号/要素/分级不可改） | 是 |
| 19 | DELETE | `/api/admin/talent/factor-notes/:id` | `talent:rule:delete` | 删除注解 | 是 |
| 20 | GET | `/api/admin/talent/factor-notes/template` | `talent:rule:export` | 注解导入模板 CSV | 否 |
| 21 | GET | `/api/admin/talent/factor-notes/export` | `talent:rule:export` | 注解导出 CSV（按当前筛选） | 是（摘要） |
| 22 | POST | `/api/admin/talent/factor-notes/import/preview` | `talent:rule:import` | 注解导入预览（不落库） | 否 |
| 23 | POST | `/api/admin/talent/factor-notes/import` | `talent:rule:import` | 注解执行导入（幂等 upsert，失败行不写入） | 是（摘要） |
| 24 | GET | `/api/admin/talent/directions` | `talent:direction:list` | 方向列表（`name` / `code`），返回解析后的要素名、分级名、档位名 | 否 |
| 25 | GET | `/api/admin/talent/directions/:id` | `talent:direction:list` | 方向详情（含 `requirements` / `tierIds` 展开名） | 否 |
| 26 | POST | `/api/admin/talent/directions` | `talent:direction:add` | 新增方向（`version = 1`） | 是 |
| 27 | PUT | `/api/admin/talent/directions/:id` | `talent:direction:edit` | 保存配置（`version + 1`） | 是 |
| 28 | PUT | `/api/admin/talent/directions/:id/status` | `talent:direction:edit` | 停用 / 启用（不改版本） | 是 |
| 29 | DELETE | `/api/admin/talent/directions/:id` | `talent:direction:delete` | 删除方向（被引用 → 409） | 是 |
| 30 | GET | `/api/admin/talent/tiers` | `talent:tier:list` | 档位列表（含全局默认） | 否 |
| 31 | PUT | `/api/admin/talent/tiers/:id` | `talent:tier:edit` | 编辑档位 / 停用启用 / 设全局默认 | 是 |

- 同步入口二选一：库首次切换（列表里没有该 `gender+age`）用 #2；已有库用 #3；#2 内部等价「upsert 分库 → 调 #3 的同步实现」。两者都写 `oper_logs`（库、要素数、完整槽位数、部分槽位数）。

### 5.3 关键请求体（Zod）

```ts
// 分库同步（库可能尚未存在）
{ gender: "male" | "female", age: 0 | 1 | ... | 18 }   // 按 gender+age upsert 分库后拉取要素

// 方向新增 / 保存配置
{ code?: string, name: string, description?: string, icon?: string,
  requirements: { code: string, level: string }[],   // 1–50，去重，编码存在，分级启用
  tierIds: string[], defaultTierId: string,           // 1–4，去重，指向启用档位，default ∈ tierIds
  aliases?: string[], status?: "1" | "0" }

// 分级
{ code?: string, name: string, sortOrder: 1|2|3|4, range?: string, tone?: "default"|"info"|"success"|"warning", status?: "1"|"0" }

// 固定注解
{ factorCode: string, levelCode: string, note?: string, ageRange?: string, gender?: "男"|"女"|"通用", status?: "1"|"0" }

// 档位（PUT）
{ name?: string, teacher?: string, freq?: string, headline?: string, description?: string, isDefault?: boolean, status?: "1"|"0" }
```

- 分库同步 `age` 仅允许 0–18 整数；`gender` 仅允许 `male` / `female`；重复同步同库按唯一键更新，不新增第二条。
- 方向 `PUT` 时 `code` 出现在 body 且与库中不同 → 422「方向编码不可修改」。
- 注解 `code` 由 `${factorCode}-${levelCode}` 生成；编辑时改 `factorCode` / `levelCode` → 422。
- 唯一冲突（分级 `code`/`sortOrder`、注解 `code`、方向 `code`、档位 `code`/`sortOrder`、分库 `gender+age`）→ 409，message 指明冲突字段。

### 5.4 错误码

| 状态码 | 场景 |
| --- | --- |
| 403 | 缺少权限码、未登录 |
| 404 | 资源不存在（含 `[resource]` 旧路由未命中） |
| 409 | 唯一冲突；引用保护（只允许停用） |
| 413 | 导入文件超过 10MB |
| 422 | Zod 校验失败、业务校验失败（要素编码不存在、分级停用、档位未启用、默认档位不在子集、空 requirements 等） |

错误响应走统一错误处理；前端用 toast / 行内提示展示 message。

### 5.5 服务端落点

| 文件 | 职责 |
| --- | --- |
| `server/utils/talent-rule.ts` | 规则域校验：要素/分级/档位存在性与启用态、`code` 生成、名称解析 map、引用扫描（含 `talent_reports` 渐进式） |
| `server/utils/talent-rule-source.ts` | `TalentFactorLibrarySource` 接口 + M1 本地文件 Mock 实现（M8 替换） |
| `server/utils/talent-rule-csv.ts` | CSV 解析 / 表头别名 / 行校验（复用 `talent-csv.ts` 模式与 10MB 上限） |
| `server/api/admin/talent/{factors,levels,factor-notes,directions,tiers}/**` | 路由、Zod、权限、审计 |

## 6. B 端页面

三个页面均：`definePageMeta({ layout: "admin", middleware: ["auth", "permission-guard"] })`；请求走新增 `app/composables/api/useTalentRuleApi.ts`（不改旧 `useTalentAdminApi`）；列表使用 `NDataTable` + `AdminPagination`，传真实 `loading` / 空态；弹层校验在 `handleSave()` 与服务端双做；主操作 ≥ 44px。

### 6.1 培养方向管理

- 文件：`app/pages/admin/talent/rules/direction.vue`；路由 `/admin/talent/rules/direction`；页面专属组件放 `app/pages/admin/talent/rules/components/`。
- 顶部操作：「新增方向」(`talent:direction:add`)、「档位维护」(`talent:tier:list`)。
- 检索：方向名称、方向编码（两个独立输入，AND，BR-13）。
- **列表 7 列**（AC-ADM-03-1）：

| 列 | 内容 |
| --- | --- |
| 编码 | `code` 等宽字体 |
| 培养方向 | 名称（主）+ 一句描述（次行，同属该字段展示） |
| 关联要素与要求分级 | 前 3 项 `要素名 · 分级名` chip + 「等 N 项」；未配置 → tag「未配置要素」 |
| 启用档位 | `tierIds` 解析为档位名 chip；空 → tag「未启用档位」 |
| 默认档位 | `defaultTierId` 解析名，无 → `—` |
| 状态 | 启用 / 停用 tag |
| 操作 | 配置（主）、停用/启用、删除 |

- **配置弹层**（`ultra`，两栏）：
  - 基础信息：方向名称*、方向编码*（新增可填、编辑只读）、方向说明、状态、配置版本（只读）。
  - 要素配置：分册筛选 select（全部 + A–F 带数量）→ 潜质要素多选（**只列启用库的 158 项**，编码 A-01~F-23，AC-ADM-03-2）→「添加所选」→ 已选表（要素编码 / 潜质要素 / 所属分册 / 要求分级 select / 移除）；「清空」；不设权重、不校验合计。
  - 目标档位：4 档位多选 chip（显示建议师资 · 频次，停用档位不可选）；默认档位 select（仅 `tierIds` 子集）；全局默认档位只读展示。
  - 保存校验（AC-ADM-03-3）：名称非空；编码格式 `^[A-Z0-9-]{2,64}$` 且唯一；≥ 1 项要素；每项要素存在且要求分级启用；≥ 1 个档位且默认档位 ∈ 选中；档位均启用。失败 → 行内 + toast，不发请求；服务端同校验。
  - 保存成功 toast「方向配置已保存，已生成新版本」；`version` 刷新。
- 停用/启用：停用二次确认（提示影响 C 端推荐）；启用直接生效；写操作日志。
- 删除（AC-ADM-03-4）：二次确认 → 409 时 toast「该方向已被报告引用，只允许停用」。
- 档位维护弹层（`wide`）：表 6 列 档位名称 / 建议师资 / 建议频次 / 状态 / 全局默认 / 操作；操作：编辑、设为默认、停用/启用（**无新增、无删除**）；编辑弹层字段 名称* / 建议师资 / 建议频次 / 档位说明；停用二次确认；名称全局唯一（含已停用档位）。
- 空态：无方向 → 「暂无培养方向」+ 新增按钮；无启用档位 → 配置弹层提示「暂无启用档位，请先在目标档位维护中启用」；加载失败 → 表格上方错误提示 + 重试。

### 6.2 潜质要素

- 文件：`app/pages/admin/talent/rules/factor.vue`；路由 `/admin/talent/rules/factor`。
- 库切换条：性别 select（男/女）+ 年龄 select（0–18 岁）+ 当前库 tag（已同步/未同步）+ 元信息（来源 / 同步时间 / 要素 N 项 / 文案 `filledCount/slotTotal` 条 / 每项 4 档 × 3 变体 × 4 段）+「同步该库」(`talent:factor:sync`)+「导出」+「文库模板」(`talent:factor:export`)。
- 同步（两个入口，见 spec §5.2 #2/#3）：确认弹层（来源、库、覆盖说明「同编码覆盖文案，不新增/不停用要素」）→ 库已存在走 `POST /factor-libraries/:id/sync`；库不存在（首次切到该性别/年龄）走 `POST /factor-libraries/sync`（body `{ gender, age }`，服务端先 upsert 分库再拉取）→ toast（更新 N 项、完整回填 M 槽位、部分回填 P 槽位）→ 刷新列表与库头。同步失败 → 错误提示，保持原数据。
- 检索：要素编号、潜质要素、分册下拉（全部分册 + 6 册带数量），可叠加（AC-ADM-04-2）。
- **列表 7 列**（AC-ADM-04-1）：

| 列 | 内容 |
| --- | --- |
| 要素编号 | `code` 等宽字体（后台保留编码，BR-12） |
| 潜质要素 | `name` |
| 所属分册 | `A 生长发育` |
| 数据熵分级 | `4 档`（tooltip 列出当前 4 档名称；不堆副行，BR-13） |
| 文案槽位 | `已填 X / 12`（X = `filledSlotCount`，四段完整才算已填） |
| 回填状态 | 完整（`filledSlotCount=12`）/ 部分（`partialSlotCount>0` 或 `0<filledSlotCount<12`）/ 待补写（两者均为 0）/ 未同步（库未同步） |
| 操作 | 查看文案（`filledSlotCount + partialSlotCount > 0` 可点，否则 `—`） |

- 文案弹层（`ultra`，只读）：4 档页签（每档 `已回填 X/3`）；每档 3 行变体，每行 4 段（分级内容 / 分级举例 / 培育方向 / 培育建议，空洞显示「待补写」）+ 状态 tag；无编辑/新增/停用/删除入口（AC-ADM-04-3）。
- 导出：当前库 CSV，行 = 要素 × 分级 × 变体，列同外部文库 9 列（序号 / 年龄 / 分册 / 潜质要素 / 数据熵 / 分级内容 / 分级举例 / 培育方向 / 培育建议）；文件名 `talent-factor-library-<gender>-<age>.csv`。模板仅表头+1 行示例，不提供要素导入。
- 空态：库未同步 → 整区空态「「男 · 0 岁」的潜质要素文库尚未同步，点上方「同步该库」从外部系统拉取」；检索无结果 → 表格空态；不在任何页面出现要素编辑入口。

### 6.3 分级与固定注解

- 文件：`app/pages/admin/talent/rules/level.vue`；路由 `/admin/talent/rules/level`。
- 顶部统计：分级 4 档 / 固定注解 632 条（AC-ADM-05-1）。
- 页签：固定注解（632）/ 分级设置（4）；两页签共用同一「分级」筛选值（AC-ADM-05-2）。
- 共享检索：分级下拉（`全部分级（632）` + 每档 `LVn 名称（count）`，count 来自同一接口聚合，保证下拉数量 = 筛选后条数）、要素编码、潜质要素、注解内容；分级设置页签只保留分级下拉。

**固定注解表（9 列，AC-ADM-05-1）**

| 列 | 内容 |
| --- | --- |
| 注解编号 | `code`（如 `A-01-LV1`） |
| 要素编码 | `factorCode` |
| 潜质要素 | 读取时按文库当前名称解析（不落快照） |
| 分级 | `levelCode` → 分级名称 tag |
| 注解正文 | 限宽省略 + hover 全文；空 → tag「待补写」 |
| 年龄条件 | `ageRange`，空 → `—` |
| 性别条件 | `gender` |
| 状态 | 启用 / 停用 |
| 操作 | 编辑、停用/启用、删除 |

- 新增/编辑注解弹层（`wide`）：要素编码（新增 select，编辑只读）+ 潜质要素（只读回显）+ 分级（新增 select，编辑只读）+ 注解正文 textarea + 年龄条件 + 性别条件 select + 状态。编号由服务端生成并只读展示。保存校验：要素编码存在、分级启用、正文 ≤ 2000；正文允许为空（待补写）。
- 删除注解：二次确认，提示「历史报告使用发布时快照，不受影响」。

**分级设置表（7 列，AC-ADM-05-1）**

| 列 | 内容 |
| --- | --- |
| 分级编码 | `code`（编辑不可改） |
| 分级名称 | `name` |
| 级序 | `sortOrder`（1–4） |
| 得分范围 | `range`，空 → `—` |
| 固定注解数 | 该分级下注解条数（服务端聚合） |
| 状态 | 启用 / 停用 |
| 操作 | 编辑、删除 |

- 新增/编辑分级弹层：分级编码*（`^LV\d{1,2}$`，编辑只读）、分级名称*、级序*（1–4 唯一）、得分范围、展示色位 select（default/info/success/warning）、状态。删除前校验引用（注解 / 方向 requirements）→ 409「该分级已被引用，只允许停用」。
- **导入弹层（两页签都有，`wide`，AC-ADM-05-3）**：步骤 1 选文件（CSV，≤10MB，UTF-8，容忍 BOM）→ 步骤 2 字段映射 + 校验预览（行号 / 数据内容 / 通过或失败 + 原因 / 处理建议；底部「下载错误明细」「执行导入（N 行）」）→ 步骤 3 结果（成功 N / 失败 M + 明细）。失败行不写入；同批重复编码后者覆盖前者并在预览标注。
- 导出：按当前筛选导出 CSV；固定注解列同表 9 列，分级列同表 7 列（含固定注解数）。
- 空态：无注解 → 「暂无固定注解，可通过导入批量补写」+ 导入按钮；无分级 → 不应出现（种子 4 条），异常时提示重新初始化。

### 6.4 通用交互

- 列表：`pageSize = 20`；筛选条件变化回第一页；一列只对应一个字段（BR-13）。
- 反馈：保存中禁用重复提交；成功/失败统一 toast；删除与停用二次确认；无权限隐藏按钮且服务端 403。
- 状态：加载骨架/表格 loading；空态文案可执行；错误态含重试。
- 主题与窄屏：只用主题令牌与 Naive UI 组件；1280 宽两栏弹层不溢出。

## 7. 导入导出

| 资源 | 模板列 | 必填 | 唯一键 / 写入 | 失败行 |
| --- | --- | --- | --- | --- |
| 固定注解 | `注解编号,要素编码,分级编码,注解正文,年龄条件,性别条件,启用状态` | 要素编码、分级编码、注解正文 | 唯一键 = 要素编码 + 分级编码；upsert（覆盖正文/条件/状态） | 不写入，返回行号与原因 |
| 分级 | `分级编码,分级名称,级序,得分范围,展示色位,启用状态` | 分级编码、分级名称、级序 | 唯一键 = 分级编码；upsert | 不写入，返回行号与原因 |
| 要素 / 文库 | 外部文库 9 列（序号/年龄/分册/潜质要素/数据熵/分级内容/分级举例/培育方向/培育建议） | — | 仅导出与模板，不提供导入 | — |

- 格式：CSV（UTF-8，容忍 BOM，`,` 分隔，`"` 转义），≤ 10MB；表头支持中文与系统字段名两种写法（复用 `talent-csv.ts` 的别名映射模式）。
- 预览不落库、不留中间批次（ADR 0001-D4）；提交时重新解析并二次校验，以提交结果为准；错误明细随响应返回，不持久化；`oper_logs` 只记摘要（模板类型、总行数、成功数、失败数），不记正文。
- 导出走服务端生成 CSV 流（不异步、不落文件）；导出与导入模板都带 BOM 以便 Excel 打开。
- 库未同步时禁止导出要素（返回 409「该库尚未同步」）。

## 8. 验收映射

完整追溯与测试命令见 [acceptance.md](acceptance.md)。本规格落点速查：

| 需求 | PRD 位置 | 本文落点 |
| --- | --- | --- |
| FR-ADM-03 方向列表 7 列、检索、配置、删除保护 | §6.3 L197–222；AC-ADM-03-1~4 | §3.5、§5.2(#24–29)、§6.1 |
| FR-ADM-04 要素只读、158/6、12 槽位 × 四段、切换分库、同步（含首次无 id）、导出 | §6.4 L224–238；AC-ADM-04-1~3 | §3.1–3.2、§5.2(#2–7)、§6.2 |
| FR-ADM-05 固定注解 632、分级 4、导入预览 | §6.5 L240–256；AC-ADM-05-1~3 | §3.3–3.4、§5.2(#8–23)、§6.3、§7 |
| BR-08 方向命中 | L104 | 只定义 `requirements` 契约（§3.5.1）；算法 M4 |
| BR-12 编码后台保留 | L108 | §3.2 `code`、§3.4 `code`、§6 列表编码列 |
| BR-13 列表规范 | L109 | §6.4、§5.1 |
| §9 接口分组 | L552–557 | §5.2（路径与 PRD 差异见 §9 U1） |
| §12 后台验收条目（规则相关） | L611–613 | §6.1–6.3、acceptance.md |

## 9. 未决项（不得自行拍板）

| # | 未决项 | 现状 / 本文处理 | 需谁裁决 |
| --- | --- | --- | --- |
| U1 | 路由路径：PRD §9 写 `/notes`、`/factors/sync`；本规格用 `/factor-notes`、`/factor-libraries/sync` 与 `/factor-libraries/:id/sync` | 以本规格路径为准（更明确资源归属与首次同步场景），M6 更新 `docs/API.md` 时同步口径 | lead / 客户无异议即可 |
| U2 | 数据熵 4 档名称冲突：PRD §6.5 L244 与原型 `LEVELS` 为 常态/优良/优秀/卓越；原型外部文库 `ELEMENT_ENTROPY` 为 卓越/优良/常态/**弱势** | `talent_levels` 以 LV1–LV4 四档为准；外部同步映射「弱势 → LV1 常态」并写同步日志；是否新增「优秀 vs 弱势」口径待客户确认 | 客户 / PRD v1.2 |
| U3 | 固定注解 632 条正文来源：xlsx 仅回填 27 槽位 | M1 条数 632 必达，未回填正文留空显示「待补写」；不生成模板占位话术 | 客户（正文是否另行交付） |
| U4 | 一条注解多话术随机展示（原型 `INITIAL_NOTES.texts`） | PRD v1.1 §6.5 只定义单条正文，M1 不建变体字段 | 客户 / PRD v1.2 |
| U5 | 要素是否可停用：§6.4 L238「无停用入口」 vs §6.5 L250「被方向引用的要素只允许停用」 | M1 要素只读不可停用；冲突留待 PRD 定稿 | 客户 |
| U6 | 自定义方向归并入口（PRD §13.3 L654） | M1 只建 `aliases` 字段；归并 UI/API 在 M4 | lead |

> 已关闭：原 U7「槽位四段文案是否全量落库」→ **已定：四段全量落库**（§3.2.1），M7 不再迁移 schema；原 U8「固定注解是否按分库隔离」→ **已定：全局按 `factorCode` 共用**（§3.4，ADR 0001-D3）。

## 10. 实施顺序与测试命令（给 task-2）

1. `shared/types/talent-rule.ts` + `scripts/setup.mjs` 集合与索引 + `scripts/sync-talent.mjs` **只做加法**（新增 6 集合/字段/新索引、`talent_levels` 旧字段置非必填；不删字段、不删索引、不改旧数据；破坏性变更必须另写迁移脚本并先 `pnpm backup:pb`）。
2. `server/utils/talent-rule-source.ts`（Mock 源）+ `scripts/seed-talent-rule.mjs`（种子；`talent_levels` 种子只写新字段，`code != ""`）。
3. `server/utils/talent-rule.ts`（校验 / 派生 / 引用扫描 / 名称解析）+ `talent-rule-csv.ts`。
4. 路由 + Zod + 权限码 + `withOperLog()`（含 `factor-libraries/sync` 无 id 入口）；菜单与 F 权限种子。
5. `app/composables/api/useTalentRuleApi.ts` + 3 页面 + 档位弹层。
6. 测试：`test/talent-rule-domain.test.ts`（校验/唯一/引用/版本/名称解析/分库同步 upsert/导入预览）、`test/talent-rule-csv.test.ts`（模板与失败行）。
7. 文档：`docs/API.md`、`docs/ARCHITECTURE.md`、`docs/STATUS.md`（数字）同步（不在本规格写范围，由 lead 派发）。

```bash
pnpm vitest run test/talent-rule-domain.test.ts test/talent-rule-csv.test.ts
pnpm typecheck
pnpm lint
# 新库烟测（务必指向新建的空目录，不要用真实 pb_data/）
export POCKETBASE_DATA_DIR="$(mktemp -d /tmp/tongjia-m1-XXXXXX)"
pnpm env:doctor && pnpm env:setup
git diff --check
```

- e2e：旧 02–05 覆盖旧规则页，M1 不纳入门禁；M9 重写。
- 风险与验证命令见 acceptance.md §6。

## 11. 文档同步清单（M1 出口）

- `docs/API.md`：31 条新路由与认证/权限列。
- `docs/ARCHITECTURE.md`：集合表新增 6 个集合；`talent_levels` 标注「增量改造，旧字段保留到 M6」。
- `docs/STATUS.md`：集合数、路由数、种子数据规模。
- `docs/specs/M1-rules/acceptance.md`：verifier 填证据表。

> 2026-11-18 用户口径调整：分级设置不再单独页签，分级的新增/编辑/删除内联在「分级筛选」左栏；固定注解表常驻右侧。PRD §6.5 原「固定注解 / 分级设置」双页签作为历史口径保留，验收以本注为准。
