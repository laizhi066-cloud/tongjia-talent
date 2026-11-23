# M4 · 方向匹配域规格（命中 / 推荐 / 选择 / 自定义方向归并）

> 状态：**待实现（2026-11-16，architect-m4 / task-11 交付实现合同）**。本文只写 docs，不改源码、不 commit。
> 依据：PRD v1.1 §6.3（L197–222）、BR-08（L104）、BR-09（L105）、BR-12（L108）、§8.2 direction/tier（L496–501）与 report（L472–486）、§8.3（L535）、§9（L539–577，方向 L552 / C 端 L573）、§10（L581–590）、§12（L604–630）、§13.3（L651–656）；开发计划 M4（L227–230）。
> 上游契约：M1 规则域 [spec](../M1-rules/spec.md) §3.5/§3.6/§4.2/§4.3 与 [ADR 0001-D2/D5](../../adr/0001-m1-rule-domain.md)；M2 会员域 [spec](../M2-members/spec.md) §7（C 端归属）；M3 报告域 [spec](../M3-reports/spec.md) §3.2.1/§3.2.3/§3.2.4/§3.2.5/§5.4.2/§7.1/§8.3（**已出稿，快照与选择结构以 M3 spec 为准**；本文 §3.1/§3.3/§3.4 是其 M4 侧输入/输出口径，冲突时以 M3 spec 字段为准并回改本文）。
> 关键取舍：[ADR 0004](../../adr/0004-m4-direction-matching.md) D1–D6。验收：[acceptance.md](acceptance.md)（初始全部「未验证」）。
> 修订：v2（2026-11-16 按 M3 spec §3.2.3/§3.2.4/§3.2.5 对齐：`directionSnapshot.requirements` 字段名、`factorSnapshot` 字段、`recordTalentReportVersion` 签名、C 端 409/404 错误口径；v1 为与 architect-m3 口头对齐版）。

## 0. 决策基线（ADR 0004 摘要，不再作为未决项）

| # | 决策 | 本文落点 |
| --- | --- | --- |
| D1 | 命中口径：要素实际分级级序 ≥ 要求分级级序计 1 条；命中率 = 命中数 / 有效配置条数；不设权重、不校验合计 100 | §4.1–§4.2 |
| D2 | 排序平手：命中数降序 → 命中率降序（交叉相乘精确比较）→ 配置条数降序 → 方向编码升序 → 方向 id 升序 | §4.3 |
| D3 | 快照输入/输出：M3 发布时冻结 `factorSnapshot`（含 `levelOrder`）与 `directionSnapshot`（全部已评估方向）；C 端只读快照，不按当前配置重算；补发用增量函数、恢复不重算、显式重算才整体替换 | §3.1、§3.3、§4.9 |
| D4 | 0 命中回退：快照有方向但全 0 命中 → 返回全部启用方向并标「暂无匹配」（受推荐上限 5 截断）；快照无方向 → 空列表 + `NO_DIRECTIONS`，自填仍可用 | §4.4 |
| D5 | 自定义方向：新集合 `talent_direction_requests`；归并写 `talent_directions.aliases` 且**不 bump 方向 version**；转正生成「停用待配置」方向；历史 `selections` 不回写 | §3.5、§4.7、§5.3 |
| D6 | 上限：推荐 5 / 选择 3 为常量 + 纯函数 options 注入，发布时冻结进快照；不落库、页面不可改（PRD §13.3 待定） | §4.4、§4.6 |

---

## 1. 范围与不在范围

### 1.1 本里程碑交付

- **纯函数与领域逻辑**（可单测，不依赖 PB）：`server/utils/talent-direction-match.ts`——`matchDirections`、`rankHits`、`pickTier`、`resolveDirectionSelection`、`computeTalentDirectionMatches`、`refreshDirectionSnapshot`、`recommendDirections`、`buildManualDirectionOptions`。
- **类型契约**：`shared/types/talent-direction.ts`——命中结果、方向快照、选择项、待归并请求；供 M3 冻结 / M7 读取。
- **服务端 IO**：`server/utils/talent-direction-selection.ts`（选择/换档/取消/自填、待归并合并与转正）、`server/utils/talent-direction-api.ts`（Zod、列表分页、响应组装、名称/档位解析）。
- **API**：C 端 4 条（`directions`、`selections` 选择/换档/取消）；后台 3 条待归并接口；M3 报告路由 `direction-preview` 的契约与响应形状（路由归 M3，M4 供纯函数与组装建议）。
- **新集合**：`talent_direction_requests`（自定义方向待归并）。同步 `scripts/setup.mjs`（仅新库）、`scripts/sync-talent.mjs`（存量库只加不删）、`shared/types/`。
- **权限与菜单**：新增权限码 `talent:direction:merge`（F 按钮行），登记到 setup/sync 种子；**不新增 C 菜单**（入口挂在已有「培养方向管理」页）。
- **B 端页面（增量）**：方向页 `#headerExtra` 增加「待归并 (N)」按钮 + `DirectionRequestModal.vue`（列表 / 归并 / 转正式）；新增 composable `app/composables/api/useTalentDirectionApi.ts`。不改 M1 方向页已有列、检索、配置弹层与保存逻辑（见 §1.3）。
- **测试**：`test/talent-direction-match.test.ts`（纯函数全量用例）、`test/talent-direction-selection.test.ts`（选择/归并领域逻辑）、`test/talent-direction-api.test.ts`（路由级最小契约）、schema/索引断言并入现有 foundation-schema 或新增定向断言。

### 1.2 不在范围（明确不越界）

| 项 | 归属 | 说明 |
| --- | --- | --- |
| `factorSnapshot` / `directionSnapshot` / `selections` / `versions` / `snapshotVersion` 的集合字段、发布、撤回、恢复、补发、显式重算、报告详情 4 页签、发布弹层 | **M3** | M4 只提供纯函数与快照结构契约（§3.1/§3.3），不建 `talent_reports` 读取、不写报告版本、不实现报告页 |
| 培育建议四段文案、建议版本与报告联动 | **M5** | M4 不读写 `talent_advice_*` |
| C 端页面（推荐/已选/方向详情/自填的 UI、空态、Wot UI、390/340 适配、拼音下拉渲染） | **M7** | M4 只冻结接口与展示字段（§7），不写 `apps/client/**` |
| 培养方向/档位的增删改、配置弹层、档位维护、列表 7 列 | **M1（已交付）** | M4 只读 `talent_directions/talent_tiers/talent_levels`；唯一写 `aliases` 走 §5.3 合并接口 |
| 工作台「自定义方向待归并」指标卡与待办跳转、三个角色正式授权、旧集合/旧路由清理 | **M6** | M4 提供列表 `total` 与计数 helper（§5.5） |
| 真实第三方基因查询/建议同步、PDF、限流与告警 | **M8** | M4 只用报告快照与 Mock 数据 |
| 旧实现 `server/utils/talent-matching.ts`（内容加权/随机匹配）与 `talent-plan-recommendation.ts`（计划推荐 score） | 旧业务 | **只读、不复用、不修改**；与本规格的 BR-08 口径无关 |
| 会员/报告数据迁移、演示数据重置 | 客户/M6/M9 | M4 不写 `talent_parents/talent_children/talent_gene_reports` |

### 1.3 硬约束与对 M1 的边界

- 单实例、单 PocketBase；不引入 `TENANT_MODE`、`site` cookie、`X-Site-Slug`、第二个 PB 连接。
- 业务字段只落 `talent_*`；不回填 `users` / `configs` / `site_config`。
- `scripts/setup.mjs` 只初始化空数据目录；存量库只走 `scripts/sync-talent.mjs`，且只允许「加集合 / 加字段 / 加索引 / 加菜单权限」；M4 不删、不改 M1 已交付集合的字段与索引。
- **不改 M1 已交付实现**：M4 不修改 `talent_directions/talent_tiers/talent_levels` 的 schema、M1 领域校验、M1 API 语义、方向页已有列与弹层。
- **唯一计划内增量**（需 lead 在派发 M4 实现任务时确认）：方向页 `app/pages/admin/talent/rules/direction.vue` 的 `#headerExtra` 插槽追加一个「待归并 (N)」按钮 + 挂载 `DirectionRequestModal`（纯追加，不改已有逻辑）。若 lead 不允许触碰 M1 页面文件，退化为独立路由页 `/admin/talent/rules/direction-merge`（可通过 URL 直达，工作台入口留到 M6），并在 M4 验收中注明「无侧栏入口」。
- 示例数据一律虚构（方向名、家长/子女姓名、编码后缀），不得使用真实客户数据；种子/演示数据不入生产。

---

## 2. 角色、权限与跨模块边界

### 2.1 角色矩阵（M4 生效部分）

| 动作 | 平台运营管理员 | 报告审核员 | 规则配置员 | 家长（C 端） |
| --- | --- | --- | --- | --- |
| 查看/预览方向命中（后台） | ✓（复用 M1/M3 码） | ✓（`talent:report:view`，M3 路由） | ✓（`talent:direction:list`） | — |
| 待归并列表/归并/转正式 | ✓ | —（默认无） | ✓（列表 `talent:direction:list`；写 `talent:direction:merge`） | — |
| 推荐方向（C 端） | — | — | — | ✓（本人 + 已绑定子女） |
| 选择/换档/取消/自填（C 端） | — | — | — | ✓（上限 3） |

> 三角色正式授权在 M6；M4 验收用 `admin` / `superadmin`（RBAC 通配）。每个 `requirePermission` 码必须有对应 C 或 F 菜单行（CONVENTIONS §3）。

### 2.2 权限码（新增 1 个 + 复用）

| 码 | 类型 | 用途 | 登记 |
| --- | --- | --- | --- |
| `talent:direction:merge` | F（按钮） | 归并、转正式（待归并列表读取复用 `talent:direction:list`） | `scripts/setup.mjs` + `scripts/sync-talent.mjs` 菜单种子；`sync-talent` 增加缺码断言 |
| `talent:direction:list` | C（复用 M1） | 待归并列表读取（只读） | M1 已登记 |
| `talent:report:view`（M3） | C（复用 M3） | `direction-preview` 路由 | M3 登记；M4 不重复登记 |

- C 端接口不套 RBAC 码，走家长登录 + 报告归属/状态校验（§7.1）。
- 权限码不得只在接口使用而无菜单行；M4 实现后 `sync-talent` 必须能断言 `talent:direction:merge` 存在 F 行。

### 2.3 菜单登记

- 不新增一级分组、不新增 C 菜单（当前业务菜单结构（工作台/会员管理/天赋规则/报告管理））。
- 在「培养方向管理」C 菜单（`/admin/talent/rules/direction`）下追加 F 行：`待归并方向` / `talent:direction:merge`。
- `app/composables/useMenuTree.ts` 的 `TALENT_PATHS` 已含 `/admin/talent/rules` 前缀（M1 交付），无需改动；若走降级独立页则需新增 `/admin/talent/rules/direction-merge` 前缀。

### 2.4 跨模块边界（一张表定死）

| 模块 | 交互 | 契约 / 边界 |
| --- | --- | --- |
| M1 规则域 | 读 `talent_directions`（requirements/tierIds/defaultTierId/aliases/version/status）、`talent_tiers`（sortOrder/status/文案）、`talent_levels`（sortOrder/status） | 只读；别名写走 M4 合并接口且不改 version；不修改 M1 校验与 API |
| M2 会员域 | 解析当前家长、校验报告对象归属（本人/子女、停用/解绑） | 复用 M2 冻结 helper：`assertTalentChildAccess(userId, childId)` + 按 `talent_parents.userId` 解析 parent（helper 命名以 M2 spec 为准，本文 `resolveCurrentTalentParent(event)` 为占位名）；M2 未落地前 M4 用同签名 Mock seam，落地后替换实现（不复制归属逻辑） |
| M3 报告域 | 读 `talent_reports.directionSnapshot/selections/status/subject*`；写 `selections`；调 `recordTalentReportVersion` | 以 M3 spec §8.3 为准：路由/归属 helper 由 M3 提供（`getTalentReportById`、`assertTalentReportPublished`、`getTalentReportClientSnapshot`、`recordTalentReportVersion(reportId, entry)`）；M4 不建报告集合读取、不改 snapshotVersion/versions 语义；方向预览路由归 M3 |
| M5 建议域 | 无 | M4 不读写建议 |
| M6 工作台/系统 | 待归并计数与入口跳转 | M4 提供 `countPendingTalentDirectionRequests(pb)` 与列表 `total`；M6 消费 |
| M7 C 端 | 消费 §7 接口与展示字段 | 编码不出 C 端（BR-12）；拼音排序由 API 返回 |
| M8 集成 | 无直接交互 | 报告数据由 M3 同步 |

---

## 3. 数据模型与契约

### 3.0 通用约定

- 所有集合名 `talent_*`；PB 字段驼峰，PRD 下划线字段给映射（§3.7）。
- 状态枚举：方向/档位/分级沿用 M1 `"1"` 启用 / `"0"` 停用；待归并请求用中文 `待归并 / 已归并 / 已转正式`。
- JSON 字段只存契约内字段；不存 PocketBase 展开对象、不存展示用临时字段。
- 时间：JSON 内时间统一 ISO 8601 UTC 字符串（`new Date().toISOString()`）；PB `date` 字段同 ISO；页面按本地时区展示。

### 3.1 输入契约 A：M3 `factorSnapshot`（**以 M3 spec §3.2.1 为准**）

M3 发布时冻结**外部全部分册**的要素结果（不是只算开放分册）。M4 只消费其中 3 个字段（其余透传/不读）：

```jsonc
[
  {
    "code": "A-01",          // 要素编码（M4 主键）
    "levelCode": "LV3",      // 实际分级编码（M4 主键）
    "levelOrder": 3,         // 实际分级级序（M4 主键；M3 冻结，避免级序调整导致历史漂移）
    "name": "运动协调",       // 展示名（M4 透传，不重算）
    "category": "A",         // 分册编码（M7 展示用）
    "categoryName": "生长发育",
    "volumeId": "V1",        // 分册 id（M3/补发定位）
    "bookCode": "A",         // 分册字母
    "chapter": "1.1 生长发育概述",
    "levelName": "优秀",      // 展示名
    "score": 78,             // 要素得分（M4 不消费）
    "note": "固定注解全文",    // M4 不消费
    "condition": ""          // 条件文案（M4 不消费；字符串，非对象）
  }
]
```

| 规则 | 说明 |
| --- | --- |
| 必填 | `code` / `levelCode` / `levelOrder`（`levelOrder` 缺失时降级：按 `options.levelOrders[levelCode]` 解析，并在结果标 `levelOrderSource:"current"`） |
| 唯一 | 同一 `code` 只应出现一次；重复时首条生效并产生 `DUPLICATE_FACTOR` 警告（§4.8） |
| 空快照 | `[]` 合法：所有要求均未命中，走 0 命中回退（§4.4） |
| 编码范围 | 要素编码沿用 M1（`A-01`–`F-23`）；分库差异不影响命中（跨库统一用编码） |
| 不在 M4 范围 | 名称/注解/条件/分册/得分 的冻结与展示由 M3/M7 负责，M4 不写快照；`condition` 是字符串，M4 不做结构假设 |

### 3.2 输入契约 B：M1 方向 / 档位 / 分级（只读）

| 实体 | M1 字段（[spec §3.5/§3.6](../M1-rules/spec.md)） | M4 使用 |
| --- | --- | --- |
| `talent_directions` | `id` / `code` / `name` / `status` / `version` / `requirements[{code,level}]` / `tierIds[]` / `defaultTierId` / `aliases[]` | 命中算法、推荐、预览、合并（写 aliases） |
| `talent_tiers` | `id` / `code` / `name` / `sortOrder` / `teacher` / `freq` / `headline` / `description` / `preset` / `isDefault` / `status` | `pickTier`、自填默认档位、快照冻结 |
| `talent_levels` | `code` / `name` / `sortOrder` / `status`（旧行 `code=""` 必须过滤） | 级序反查 / 降级解析；新行口径见 ADR 0001-D1 |

- 引用完整性由 M1 保证（保存时 `requirements[].level` 必须启用、`code` 必须存在、`tierIds` 指向启用档位、`defaultTierId ∈ tierIds`）；M4 **不重复校验配置保存**，只处理「配置保存后、发布前/后状态变化」的运行期边界（分级/档位停用、方向停用、脏数据）。
- JSON 不存权重；M4 不新增字段。

### 3.3 输出契约：`directionSnapshot`（M3 冻结；**以 M3 spec §3.2.3 为准**）

M4 提供 `computeTalentDirectionMatches` 生成该对象，由 M3 写入 `talent_reports.directionSnapshot` 并冻结；**结构由 M4 纯函数产出，M3 不得增删字段**（M3 spec §3.2.3）。字段集合固定为下列 8 个顶层键与每方向 10 个键：

```jsonc
{
  "version": 2,                       // 镜像报告 snapshotVersion（number），M4 只做镜像
  "at": "2026-11-16T02:00:00.000Z",   // directionSnapshot.at（ISO）
  "operatorId": "u_demo_1",           // 发布/重算操作人
  "operatorName": "审核示例",
  "recommendLimit": 5,
  "selectionLimit": 3,
  "levelOrders": { "LV1": 1, "LV2": 2, "LV3": 3, "LV4": 4 },   // 冻结，读取时不再反查分级表
  "tiers": [                          // 冻结发布时启用档位
    { "id": "t_demo_1", "code": "T1", "name": "启蒙", "teacher": "普通老师", "freq": "每周 1–2 次", "headline": "…", "sortOrder": 1 }
  ],
  "directions": [                     // 全部已评估方向（含 0 命中、含未进推荐前 5 的）
    {
      "directionId": "d_demo_1", "code": "DIR-001", "name": "舞蹈家",
      "version": 1,
      "tierIds": ["t_demo_1", "t_demo_2", "t_demo_3"], "defaultTierId": "t_demo_2",
      "total": 6, "hitCount": 4, "hitRate": 0.666667,
      "requirements": [
        {
          "code": "E-16", "level": "LV3", "factorName": "节奏感知", "factorLevel": "LV4",
          "actualOrder": 4, "needOrder": 3, "met": true, "gap": 0
        }
      ]
    }
  ]
}
```

| 规则 | 说明 |
| --- | --- |
| 评估范围 | 只评估**发布时启用**（`status="1"`）的方向；停用方向不进快照 |
| directions 完整性 | 返回全部已评估方向，**不截断**；推荐上限只控制 C 端读取时展示 |
| requirements 字段 | 固定 8 个：`code`（要素编码）/`level`（要求分级编码）/`factorName`/`factorLevel`（实际分级**编码**）/`actualOrder`/`needOrder`/`met`/`gap`；不存 `levelName`，C 端展示名由读取层按分级编码解析（§7.1） |
| gap 口径 | `gap = met ? 0 : Math.max(0, needOrder - actualOrder)`；要素缺失时 `actualOrder=0`、`gap=needOrder`（M3 spec §3.2.3 已同步此口径，未达成时才展示「差 N 级」） |
| 诊断字段 | `levelDisabled` / `factorMissing` / `warnings` **不落快照**，只存在于纯函数内部结果与管理端预览响应；快照不得增加字段 |
| 冻结值 | `hitCount/total/hitRate/requirements/actualOrder/needOrder` 冻结后不再按当前配置重算（BR-03） |
| tierIds | 冻结发布时方向 `tierIds` ∩ 启用档位；停用档位在快照内剔除；读取时再与**当前**启用档位求交，空则 `selectable=false`（§4.5） |
| 方向展示字段 | 快照只存 `name`；`icon/description` 不进快照，读取时按 `directionId` 取当前方向配置（取不到留空），仅展示、不参与命中与排序 |
| 字段命名 | 报告级 `snapshotVersion`(number) / `snapshotAt`；快照内 `version/at/operatorId/operatorName`；以 M3 spec 为准，M4 的 `version` 仅镜像，不参与判断 |
| 不写 | M4 不写 `talent_reports`、不改 `snapshotVersion`；补发/恢复/重算的版本动作归 M3 |

### 3.4 输出契约：`talent_reports.selections`（M3 集合内 JSON，**与 M3 对齐**）

M4 的选择/换档/取消只写这个 JSON 数组（字段契约如下），并由 M3 的 `recordTalentReportVersion` 追加版本记录：

```jsonc
[
  {
    "directionId": "d_xxx",       // 正式方向：非空；自定义方向：空串
    "requestId": "",              // 自定义方向：talent_direction_requests.id；正式：空串
    "custom": false,              // 是否自定义（二者至多一个 id 非空）
    "tierId": "t2",
    "directionName": "舞蹈家",     // 选择时冻结的名称（之后方向改名不回写）
    "tierName": "养成",
    "teacher": "资深老师",
    "freq": "每周 2 次",
    "manualName": "",             // 自定义时的家长填写原文（≤10 字）
    "selectedAt": "2026-11-16T03:12:00.000Z"
  }
]
```

| 规则 | 说明 |
| --- | --- |
| 身份 | `directionId`（正式）或 `requestId`（自定义）**至多一个非空**；API 路径参数 `:selectionId` 即该非空值（全局唯一，无需另建 id） |
| 上限 | 数组长度 ≤ `selectionLimit`（默认 3，冻结算）；正式 + 自定义共享 |
| 名称冻结 | `directionName/tierName/teacher/freq` 在选择/换档时冻结（优先级：`directionSnapshot` 冻结值 → 当前配置）；方向/档位后续改名不改历史选择 |
| 快照不动 | 选择不修改 `directionSnapshot`、不改 `snapshotVersion` |
| 版本 | 选择/换档/取消各调 M3 `recordTalentReportVersion(reportId, entry)`（`entry = {type:"selection", summary, operatorId, operatorName?}`，`version`/`at` 由 M3 helper 按当前 `snapshotVersion` 填充，见 M3 spec §3.2.5）；`oper_logs` 由 M4 路由 `withOperLog` 记；**不改 snapshotVersion** |
| 存储 | 只存上述字段；不存手机号/身份证等敏感信息 |
| 响应补充 | `GET /directions` 与选择接口返回的 `selectionId` 是派生字段（= 非空的 `directionId` 或 `requestId`），**不落库**；C 端用它调换档/取消接口 |

### 3.5 新集合 `talent_direction_requests`（自定义方向待归并，M4 所有）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `reportId` | relation → `talent_reports` | 是 | 提交自填方向的报告（maxSelect 1，cascadeDelete=false） |
| `subjectType` | text(10) | 是 | `self` / `child`（与报告 `subjectType` 一致） |
| `subjectId` | text(64) | 是 | 报告对象 id（`talent_parents.id` 或 `talent_children.id`） |
| `parentId` | relation → `talent_parents` | 是 | 提交家长（列表/权限用；不接受前端传入） |
| `manualName` | text(20) | 是 | 家长填写原文，trim 后 1–10 字（按 Unicode 码位计） |
| `tierId` | text(64) | 是 | 提交时选择的目标档位（全局启用档位） |
| `status` | text(10) | 是 | `待归并` / `已归并` / `已转正式` |
| `targetDirectionId` | text(64) | 否 | `已归并`：目标正式方向 id；`已转正式`：新建方向 id |
| `mergedAt` | date | 否 | 归并/转正时间 |
| `mergedBy` | relation → `users` | 否 | 操作人 |
| `createdBy` | relation → `users` | 否 | 提交家长账号（`users`） |

- 索引（§3.6）：待归并唯一键防重复提交；状态/报告/家长普通索引。
- PB 权限规则：与现有天赋集合一致，**仅服务端 admin PB 访问**（客户端不直连）；C 端不直接读该集合。
- 不存冗余的家长/子女姓名、手机号；列表通过关系展开读取（脱敏字段 `talent_parents.maskedMobile`）。

### 3.6 索引清单（新库必须断言存在）

| 集合 | 索引 |
| --- | --- |
| `talent_direction_requests` | `idx_talent_direction_requests_pending` UNIQUE(`reportId`,`manualName`) WHERE `status = "待归并"`；`idx_talent_direction_requests_status`(`status`)；`idx_talent_direction_requests_report`(`reportId`)；`idx_talent_direction_requests_parent`(`parentId`) |

- 存量库同步只允许「加集合 / 加索引 / 加菜单权限」；不删旧集合/旧字段/旧索引（ADR 0001-D1 门槛）。
- 不加 `talent_reports` 相关索引（M3 负责）。

### 3.7 PRD → 集合字段映射

| PRD §8.2 | 本规格 | 说明 |
| --- | --- | --- |
| direction `requirements[{code,level}]`（L500） | `TalentDirectionRequirement`（M1 已有） | M4 只读；`level` 用 `talent_levels.sortOrder` 比较 |
| direction `tiers[]` / `default_tier_id`（L500） | `tierIds` / `defaultTierId`（M1 已有） | 快照冻结为 `tiers[]`（含 sortOrder） |
| direction `aliases[]`（L500） | `aliases`（M1 已有） | M4 合并接口写入 |
| report `direction_snapshot`（L484） | §3.3 `directionSnapshot` | M3 冻结；含版本/生成时间/操作人/命中数/命中率 |
| report `selections`（L485） | §3.4 `selections` | M3 集合内 JSON；M4 写选择/换档/取消 |
| 自定义方向「待归并」（§6.3 L215、§13.3 L654） | `talent_direction_requests`（新） | PRD 无表，本文补；仅 `talent_*` |

### 3.8 种子 / 演示数据（M4 交付必须可复现）

- 方向/档位/分级种子沿用 M1（`DIR-001`–`DIR-006`、`T1`–`T4`、`LV1`–`LV4`）；M4 **不新增方向**。
- 自填方向演示数据（虚构）：
  - 报告 `R-DEMO-0001`（已发布）→ 请求 `{manualName:"冰球", tierId:"T2", status:"待归并"}`；
  - 报告 `R-DEMO-0002`（已发布）→ 请求 `{manualName:"编程启蒙", tierId:"T1", status:"待归并"}`；
  - 报告 `R-DEMO-0003`（已发布）→ 请求 `{manualName:"街舞", tierId:"T3", status:"已归并", targetDirectionId:"DIR-001 对应 id"}`（数据须在报告种子存在后才可写；不存在则跳过并打印提示）。
- 种子脚本建议 `scripts/seed-talent-direction.mjs` + `pnpm talent:direction:seed`（幂等 upsert，按 `(reportId, manualName)` 唯一键；不清空其他天赋域数据）。
- 演示数据不得进入生产；脚本头注释与 `docs/TALENT-LOCAL.md`（M4 出口）说明。

---

## 4. 命中算法与纯函数

### 4.1 口径（BR-08 L104）

> 要素实际分级级序 ≥ 要求分级级序记 1 条命中；按命中条数降序，同数依次比较命中率、配置条数、方向编码；家长端推荐最多 5 个，已选上限 3 个。

| 项 | 口径 |
| --- | --- |
| 命中 | `actualOrder >= needOrder` 计 1；`actualOrder` 取快照 `levelOrder`（缺省按分级表反查）；`needOrder` 取 `levelOrders[requirement.level]` |
| 未命中 | 实际级序 < 要求级序；或要素缺失（快照无该 `code`）；或要求分级停用（见下） |
| 配置条数 | `total` = 方向 `requirements` 去重后的条数（唯一 `code` 计数；M1 保存校验保证 1–50） |
| 命中率 | `hitRate = total > 0 ? hitCount / total : 0`；原始比值存快照，**排序用交叉相乘**（§4.3），不依赖浮点 |
| 权重 | 不设权重、不校验合计 100（PRD §6.3 L208）；命中即 1 条，与要素分值无关 |
| 停用分级 | 要求 `level` 已停用 → 该条**视为未命中且计入分母**（保守，不虚高命中率），命中明细标 `levelDisabled:true`；实际分级停用仍按其级序计算（报告结果已产生，级序是内在属性） |
| 停用方向 | 不参与推荐/快照（`matchDirections` 默认过滤 `status!=="1"`） |
| 停用档位 | 从方向可选项剔除（§4.5）；离线已选保留冻结名称，换档只能选启用档位 |
| 脏数据 | 重复编码、未知分级、0 配置见 §4.8；不静默吞掉 |

### 4.2 算法步骤（伪代码）

```text
input: factors[], directions[], options{levelOrders, disabledLevelCodes?, includeDisabledDirections=false}
1. 建 factorByCode：按数组顺序，首条生效；重复 code → warning DUPLICATE_FACTOR
2. levelOrder(code) = factor.levelOrder ?? options.levelOrders[code] ?? 0
3. 对每个 direction（默认跳过 status !== "1"）：
   a. requirements 去重（首条生效，重复 → warning DUPLICATE_REQUIREMENT）
   b. 对每条 requirement：
        needOrder = levelOrders[req.level] ?? 0（未知 → warning UNKNOWN_LEVEL，按未命中）
        factor = factorByCode[req.code]
        actualOrder = factor ? (factor.levelOrder ?? levelOrders[factor.levelCode] ?? 0) : 0
        levelDisabled = disabledLevelCodes.includes(req.level)
        met = factor != null && !levelDisabled && needOrder > 0 && actualOrder >= needOrder
        gap = max(0, needOrder - actualOrder)
        （要素缺失时 actualOrder=0、factorLevelName="—"、gap=needOrder）
   c. hitCount = requirements.filter(met).length；total = requirements.length
   d. hitRate = total ? hitCount / total : 0
4. 返回 { hits: rankHits(全部评估结果), warnings }
```

- 未要求「所有要求都满足」才算命中——**每满足一条就是一条命中**，方向可部分命中（BR-08 / C 端「命中 N/M」）。
- `total` 为 0 的方向：`hitCount=0/total=0`，标记 `emptyRequirements:true`，**不进入推荐**（§4.4），后台预览仍显示并给警告。
- 不需要报告要素数 = 158；只按方向 requirements 取数，未配置的要素不影响任何方向。

### 4.3 排序比较器（`rankHits`）

严格按序比较，返回新数组（不修改入参）：

1. `hitCount` 降序；
2. **命中率降序**：若 `a.total>0 && b.total>0`，比较 `b.hitCount * a.total` 与 `a.hitCount * b.total`（整数交叉相乘，避免浮点误差）；`total=0` 视为命中率 0，排在 `total>0` 且 `hitCount=0` 之后（由第 3 条自然保证）；
3. `total`（配置条数）降序；
4. `code` 升序：按 Unicode 码位逐字符比较（**不用 `localeCompare`**，避免 ICU/环境影响；`DIR-001` < `DIR-002`）；
5. `directionId` 升序兜底（防同编码脏数据导致不稳定）。

典型平手链：

| 场景 | 结果 |
| --- | --- |
| A: 4/6、B: 4/6、C: 3/5 | A/B 命中率相同 → 配置条数 6>5 → A、B 在前；A/B 再按编码 |
| A: 2/2、B: 2/3 | 命中数同、命中率高者先 → A |
| A: 1/2、B: 2/4、C: 2/5 | 1/2 与 2/4 命中率相同（交叉相乘相等）→ 配置条数 4>2 → B、A、C |
| 全部相同 | 编码升序；编码也相同 → id 升序 |

### 4.4 推荐与 0 命中回退（`recommendDirections`）

读取端（C 端 `GET /directions`）从冻结快照现算，不落库：

| 场景 | 行为 |
| --- | --- |
| 存在命中方向 | 取 `hitCount>0` 且 `total>0` 且 `status="1"` 的方向，按 §4.3 排序后截断 `recommendLimit`（默认 5） |
| 快照有方向但全部 0 命中 | `fallback=true`：返回**全部启用方向**（含 0 命中），按 §4.3 排序后截断 `recommendLimit`；每项标 `fallback:true`（C 端标「暂无匹配」） |
| 快照 `directions=[]`（发布时无启用方向） | `items=[]`、`emptyReason="NO_DIRECTIONS"`、`fallback=false`；C 端空态「暂无可推荐方向，可自己填写」；自填接口仍可用（§7.4） |
| 有方向但无可用（全部停用/0 配置/无启用档位） | `items=[]`、`emptyReason="NO_ENABLED_DIRECTIONS"`；后台预览给警告 |
| 推荐上限 | 常量 `TALENT_DIRECTION_RECOMMEND_LIMIT = 5`；快照 `recommendLimit` 优先（合法整数 1–20，非法回退 5） |
| 选择上限 | 常量 `TALENT_DIRECTION_SELECTION_LIMIT = 3`；快照 `selectionLimit` 优先（合法整数 1–10，非法回退 3） |

> PRD BR-09 写「列出全部已配置方向」，C 端又写「最多 5 个」。本规格取**先回退、再受上限 5 截断**（与 2026-09 原型一致），在 ADR 0004-D4 与 acceptance 中标注为待客户确认项；若客户要求 0 命中时列全部，只改读取层截断（算法/快照不变）。

### 4.5 档位选择（`pickTier`）

```ts
pickTier(direction: {tierIds: string[]; defaultTierId: string}, tiers: TalentTier[], options?: {
  requestedTierId?: string; currentTierId?: string;
}): TalentTier | null
```

1. 候选 = `tiers.filter(t => t.status === "1" && direction.tierIds.includes(t.id))`，按 `sortOrder` 升序（相同按 id 升序）；
2. 依次取：`requestedTierId ∈ 候选` → 它；`currentTierId ∈ 候选` → 它；`defaultTierId ∈ 候选` → 它；否则候选第一条；
3. 候选为空 → 返回 `null`，方向 `selectable=false`（C 端详情显示「该方向暂未开放档位」，不可选择；换档返回 422 `TIER_UNAVAILABLE`）。

自定义方向（无方向配置）：候选 = 全部启用档位，`defaultTierId` 取全局 `isDefault`（部分唯一索引保证至多 1 条），`requested/current` 规则同上；无启用档位 → `null` + 422 `NO_TIER_AVAILABLE`。

> 读取/写入时的 `tiers` 入参 = **快照 `directionSnapshot.tiers` ∩ 当前 `talent_tiers` 启用集合**（一次查询）：快照保证名称/文案按发布时冻结，当前状态保证「停用档位后所有方向同步不可选」（M1 spec §4.1）对已发布报告同样生效；交集为空 → `selectable=false`。

### 4.6 选择 / 换档 / 取消（`resolveDirectionSelection`）

纯函数，输入当前 `selections` 与动作，返回新数组与状态，不触库：

```ts
resolveDirectionSelection(input: {
  action: "select" | "changeTier" | "cancel";
  selections: TalentSelectionItem[];      // 已冻结名称的当前数组
  selectionLimit: number;
  target: {
    directionId?: string;  requestId?: string;  custom?: boolean;
    tierId?: string;       // select/changeTier 必填
    manualName?: string;   // 自填必填（trim 后 1–10 字）
    directionName?: string; tierName?: string; teacher?: string; freq?: string;
    selectedAt: string;    // 由调用方注入（便于测试）
  };
}): {
  ok: boolean; changed: boolean;
  selections: TalentSelectionItem[];
  selection?: TalentSelectionItem;
  code?: "LIMIT_REACHED" | "INVALID_TIER" | "INVALID_MANUAL_NAME" | "DUPLICATE" | "NOT_SELECTED";
  message?: string;
}
```

| 动作 | 规则 |
| --- | --- |
| `select` 正式 | `directionId` 必填；已存在同 `directionId` → `DUPLICATE`（提示用换档）；数量 ≥ `selectionLimit` → `LIMIT_REACHED`；否则追加 |
| `select` 自定义 | `manualName` 必填（trim；`[...name].length` 1–10；禁控制字符）；已存在同 `manualName` 的待归并项 → `DUPLICATE`；上限同上 |
| `changeTier` | 必须命中已选项（`directionId` 或 `requestId`）；`tierId` 必须 ∈ 该方向候选档位；同档位 → `changed:false` 幂等成功；更新 `tierId/tierName/teacher/freq`，保留 `directionName/manualName/selectedAt`（换档不改方向名称冻结值） |
| `cancel` | 未找到 → 幂等成功 `changed:false`；找到则移除；剩余顺序保持 |
| 上限 | 新增才检查数量；换档/取消不检查；正式 + 自定义共享 3 个名额 |
| 顺序 | 追加到数组末尾；C 端按数组顺序展示已选 |

### 4.7 自定义方向：归并 / 别名 / 转正

| 动作 | 规则 |
| --- | --- |
| 提交自填 | C 端 `POST /selections`（body 带 `manualName`）：①校验名称/档位 ②`resolveDirectionSelection` ③upsert `talent_direction_requests`（`(reportId, manualName)` 待归并唯一；重复提交同名 → 复用旧请求）④写 `selections` + M3 版本记录；两步写失败时 best-effort 删除新建请求并返回 500 错误（§12 R4） |
| 归并到正式方向 | `POST /direction-requests/:id/merge {targetDirectionId}`：目标必须存在且 `status="1"`（停用方向先启用，422 `TARGET_DIRECTION_DISABLED`）；`manualName` 写入 `talent_directions.aliases`（trim 后去重；已存在相同别名 → 幂等成功）；别名不得同时属于其它方向（409 `ALIAS_CONFLICT`），也不得与其它方向 `name` 相同（409，避免混淆）；更新请求 `status="已归并" / targetDirectionId / mergedAt / mergedBy`；**不 bump 方向 version**（别名不参与命中，版本用于「发布时 vs 当前配置」对照）；**不改历史 `selections`**（BR-03 + M3 对齐：以选择时冻结的 `manualName` 为准） |
| 转为正式方向 | `POST /direction-requests/:id/promote`：生成**停用待配置**方向：`name=manualName`、`description="由自定义方向「…」转入，待配置要素与要求分级。"`、`icon=首字`、`requirements=[]`、`tierIds=全部启用档位 id（按 sortOrder）`、`defaultTierId=全局默认档位（须 ∈ tierIds）`、`aliases=[]`、`version=1`、`status="0"`、`code=DIR-xxx（复用 M1 generateTalentDirectionCode）`；请求 `status="已转正式" / targetDirectionId=新方向 id`；**不走 M1 `POST /directions` 的保存校验**（M1 要求 ≥1 要素/档位，stub 例外，见 ADR 0004-D5）；管理端补齐配置后按 M1 PUT 保存（version+1） |
| 幂等 | 归并/转正重复调用：同目标 → 200 幂等返回；目标不一致 → 409 `REQUEST_ALREADY_PROCESSED` |
| 审计 | 两个动作都 `withOperLog` + 请求行记录操作人；日志不记家长敏感信息 |
| 别名用途 | 仅后台归并溯源与检索；**不参与命中算法**（算法只读 `requirements`），不自动改写已选方向，不作为 C 端下拉候选 |

### 4.8 边界与异常输入

| 边界 | 处理 |
| --- | --- |
| `factors=[]` | 所有要求未命中；`hitCount=0`；结果合法 |
| 重复 `factor.code` | 首条生效，其余忽略；`warnings` 加 `DUPLICATE_FACTOR`（code） |
| 重复 `requirement.code` | 首条生效；`total` 按去重后计；`warnings` 加 `DUPLICATE_REQUIREMENT`（方向 id + code）。正常配置不可能出现（M1 保存 422 重复），为脏数据兜底 |
| 重复方向 `code` | 首条生效（按入参顺序）；`warnings` 加 `DUPLICATE_DIRECTION_CODE` |
| 未知 `requirement.level`（分级已删/脏数据） | `needOrder=0`，按未命中；`warnings` 加 `UNKNOWN_LEVEL`；不计 `levelDisabled`（无法判定） |
| 要求分级停用 | 未命中且计分母，`levelDisabled:true`；`warnings` 加 `LEVEL_DISABLED` |
| 实际分级未知（`levelCode` 不在 `levelOrders` 且无 `levelOrder`） | `actualOrder=0`，按未命中，`warnings` 加 `UNKNOWN_FACTOR_LEVEL` |
| 方向 0 条要求 | `total=0/hitRate=0`；不进入推荐；预览标 `emptyRequirements:true` + 警告 |
| 方向 tierIds 全部停用 | `selectable=false`；仍可出现在推荐列表（命中与档位无关），但不能选择/换档 |
| 快照 limits 非法（0/负数/非整数） | 回退常量 5 / 3 |
| 排序平手 | 由 §4.3 第 4/5 键保证**全序**，同一输入顺序不同（打乱）输出一致；不得使用 `Array.prototype.sort` 稳定性的隐含依赖 |
| 入参数组 | 纯函数不修改入参；返回新数组/新对象 |

### 4.9 纯函数签名（`server/utils/talent-direction-match.ts`，无 PB import）

```ts
// ── 输入（唯一 IO 来源是 M3 factorSnapshot + M1 配置） ──────────────────
export interface TalentMatchFactor {
  code: string; levelCode: string; levelOrder?: number;
  levelName?: string; name?: string;              // 仅透传展示
}
export interface TalentMatchLevel { code: string; sortOrder: number; status: "0" | "1"; name?: string }
export interface TalentMatchTier {
  id: string; code: string; name: string; sortOrder: number;
  teacher: string; freq: string; headline?: string; description?: string; status: "0" | "1";
}
export interface TalentMatchDirection {
  id: string; code: string; name: string; icon?: string; description?: string;
  status: "0" | "1"; version: number;
  requirements: Array<{ code: string; level: string }>;
  tierIds: string[]; defaultTierId: string;
}
export interface TalentMatchOptions {
  levelOrders: Record<string, number>;             // levelCode -> sortOrder（含停用分级）
  disabledLevelCodes?: readonly string[];
  includeDisabledDirections?: boolean;             // 默认 false
}

// ── 纯函数内部结果（含诊断字段；不直接落快照） ──────────────────────────
export interface TalentDirectionRequirementHit {
  code: string; level: string; needOrder: number;
  factorName: string; factorLevel: string;        // 实际分级编码
  factorLevelName?: string;                        // 展示名（读取层解析，不落快照）
  actualOrder: number; met: boolean; gap: number;  // gap = met ? 0 : max(0, need-actual)
  levelDisabled: boolean; factorMissing: boolean;
}
export interface TalentDirectionHit {
  directionId: string; code: string; name: string; version: number; status: "0" | "1";
  requirements: TalentDirectionRequirementHit[];
  hitCount: number; total: number; hitRate: number;
  tierIds: string[]; defaultTierId: string; emptyRequirements: boolean;
}
export interface TalentMatchWarning {
  code: "DUPLICATE_FACTOR" | "DUPLICATE_REQUIREMENT" | "DUPLICATE_DIRECTION_CODE"
      | "UNKNOWN_LEVEL" | "UNKNOWN_FACTOR_LEVEL" | "LEVEL_DISABLED" | "EMPTY_REQUIREMENTS";
  directionId?: string; factorCode?: string; message: string;
}

// ── 快照契约（与 M3 spec §3.2.3 逐字段一致；写库/读库唯一结构） ─────────
export interface TalentDirectionSnapshotRequirement {
  code: string; level: string; factorName: string; factorLevel: string;
  actualOrder: number; needOrder: number; met: boolean; gap: number;
}
export interface TalentDirectionSnapshotHit {
  directionId: string; code: string; name: string; version: number;
  tierIds: string[]; defaultTierId: string;
  total: number; hitCount: number; hitRate: number;
  requirements: TalentDirectionSnapshotRequirement[];
}
export interface TalentDirectionSnapshotTier {
  id: string; code: string; name: string; teacher: string; freq: string;
  headline?: string; sortOrder: number;
}
export interface TalentDirectionSnapshot {
  version: number; at: string; operatorId: string; operatorName: string;
  recommendLimit: number; selectionLimit: number;
  levelOrders: Record<string, number>;
  tiers: TalentDirectionSnapshotTier[];
  directions: TalentDirectionSnapshotHit[];
}

// ── 选择域类型（存 talent_reports.selections，结构见 §3.4） ──────────────
export interface TalentSelectionItem {
  directionId: string; requestId: string; custom: boolean;
  tierId: string; directionName: string; tierName: string;
  teacher: string; freq: string; manualName: string; selectedAt: string;
}
export interface TalentSelectionResolutionInput {
  action: "select" | "changeTier" | "cancel";
  selections: readonly TalentSelectionItem[];
  selectionLimit: number;
  target: {
    directionId?: string; requestId?: string; custom?: boolean;
    tierId?: string; manualName?: string;
    directionName?: string; tierName?: string; teacher?: string; freq?: string;
    selectedAt: string;                              // 调用方注入，便于测试
  };
}
export interface TalentSelectionResolution {
  ok: boolean; changed: boolean;
  selections: TalentSelectionItem[];
  selection?: TalentSelectionItem;
  code?: "LIMIT_REACHED" | "INVALID_TIER" | "INVALID_MANUAL_NAME" | "DUPLICATE" | "NOT_SELECTED";
  message?: string;
}

// ── 必交付纯函数（task 卡指定） ────────────────────────────────────────
export function matchDirections(
  factors: readonly TalentMatchFactor[],
  directions: readonly TalentMatchDirection[],
  options: TalentMatchOptions,
): { hits: TalentDirectionHit[]; warnings: TalentMatchWarning[] };

export function rankHits(hits: readonly TalentDirectionHit[]): TalentDirectionHit[];

export function pickTier(
  direction: Pick<TalentMatchDirection, "tierIds" | "defaultTierId">,
  tiers: readonly TalentMatchTier[],
  options?: { requestedTierId?: string; currentTierId?: string },
): TalentMatchTier | null;

export function resolveDirectionSelection(input: TalentSelectionResolutionInput): TalentSelectionResolution;

// ── 快照与读取辅助（M3 冻结 / C 端推荐共用） ──────────────────────────
export function computeTalentDirectionMatches(input: {
  factors: readonly TalentMatchFactor[];
  directions: readonly TalentMatchDirection[];
  tiers: readonly TalentMatchTier[];
  levels: readonly TalentMatchLevel[];
  recommendLimit?: number;      // 默认 5
  selectionLimit?: number;      // 默认 3
  version: number; at: string; operatorId: string; operatorName: string;
}): TalentDirectionSnapshot;    // 严格按 M3 §3.2.3 字段输出，不增删

export function refreshDirectionSnapshot(
  base: TalentDirectionSnapshot,
  factors: readonly TalentMatchFactor[],
  affectedFactorCodes: readonly string[],
  options?: { version?: number; at?: string; operatorId?: string; operatorName?: string },
): TalentDirectionSnapshot;    // 补发增量：只重算 affected 的 requirement，其余原样复制

export function recommendDirections(
  snapshot: TalentDirectionSnapshot,
  options?: { recommendLimit?: number },
): {
  items: TalentDirectionSnapshotHit[];             // 截断后的推荐（或 0 命中回退）
  fallback: boolean;
  totalCandidates: number;
  emptyReason: "NO_DIRECTIONS" | "NO_ENABLED_DIRECTIONS" | null;
};

export function buildManualDirectionOptions(
  snapshot: TalentDirectionSnapshot,
): Array<{ directionId: string; name: string }>;   // 按名称拼音（zh-Hans-CN）升序
```

- `TalentDirectionSnapshot` 的字段名/层级与 M3 spec §3.2.3 一字不差；M4 实现后以 M3 spec 为准，不新增字段。
- C 端读取项（`description/icon/selected/selectedTierId/selectable/fallback/needLevelName/actualLevelName` 等展示装饰）由 `server/utils/talent-direction-api.ts` 基于快照 + 当前方向/档位/分级名称拼装，**不进纯函数、不落快照**（§5.3.5）。
- 纯函数文件只 import `shared/types`（type-only），保证 `test/talent-direction-match.test.ts` 不启动 Nuxt/PB 即可覆盖；快照辅助函数也放本文件，保持「零 IO」。

---

## 5. API

### 5.1 通用约定

- 路由：后台 `server/api/admin/talent/**`，C 端 `server/api/client/talent/**`；Nitro 静态段优先于旧 `[resource]` 动态路由，实现后必须验证（同 M1 spec §5.1）。
- 写接口：`validateBody(event, zodSchema)` → 权限/归属 → `withOperLog()` → `success(data, message)`；错误用 `createError({ statusCode, message })`，不回传 PB 原始错误与堆栈。
- 列表统一 `{ rows, total, page, pageSize }`；`pageSize` 默认 20、上限 100；筛选变化回第一页由页面负责（BR-13）。
- C 端响应不出现方向编码、要素编码、手机号/身份证原文（BR-12/BR-11）；后台保留编码。
- 幂等：见 §5.4；并发不做乐观锁（单 PB、低并发；已知限制 §12 R5）。

### 5.2 路由表

| # | 分组 | 方法 | 路径 | 权限 | 说明 | 审计 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 后台·待归并 | GET | `/api/admin/talent/direction-requests` | `talent:direction:list` | 待归并列表（关键词/状态/分页） | 否 |
| 2 | 后台·待归并 | POST | `/api/admin/talent/direction-requests/:id/merge` | `talent:direction:merge` | 归并到正式方向（写别名） | 是 |
| 3 | 后台·待归并 | POST | `/api/admin/talent/direction-requests/:id/promote` | `talent:direction:merge` | 转正式（生成停用方向待配置） | 是 |
| 4 | 后台·预览 | GET | `/api/admin/talent/reports/:id/direction-preview` | `talent:report:view`（M3） | 发布/详情预览：frozen vs current + diff（**路由归 M3，M4 提供纯函数与响应契约**） | 否 |
| 5 | C 端 | GET | `/api/client/talent/directions` | 家长（归属校验） | 推荐/已选/自填选项（读冻结快照） | 否 |
| 6 | C 端 | POST | `/api/client/talent/selections` | 家长（归属校验） | 选择正式方向或自填方向 | 是（`oper_logs` + M3 版本） |
| 7 | C 端 | PUT | `/api/client/talent/selections/:selectionId` | 家长 | 换档（`selectionId` = 正式 `directionId` 或自定义 `requestId`） | 是 |
| 8 | C 端 | DELETE | `/api/client/talent/selections/:selectionId` | 家长 | 取消选择（幂等） | 是 |

- 不新增方向 CRUD（M1 已有 #24–31）；不新增报告路由（M3 所有）；M4 仅 #4 的契约。
- M6 工作台计数用 #1 的 `total`（`status=待归并`）或 helper，不加接口。

### 5.3 关键请求 / 响应

#### 5.3.1 `GET /api/admin/talent/direction-requests`

Query：`keyword`（自填方向 / 家长姓名 / 子女姓名，三项 OR）、`status`（默认 `待归并`）、`page`、`pageSize`。

响应 `rows[]`：`{ id, reportId, reportNo, subjectType, subjectName, parentName, maskedMobile, manualName, tierId, tierName, status, targetDirectionId, targetDirectionName, createdAt, mergedAt, mergedByName }`。

- `maskedMobile` 取 `talent_parents.maskedMobile`（前 4 + 后 4），不返回原文。
- SQL/PB 查询：`keyword` 命中家长/子女名时先查 id 集合再拼 `manualName ~ kw || parentId in [...] || subjectId in [...]`；找不到名匹配时只按 `manualName` 过滤（避免 PB 跨关系模糊匹配能力差异）。
- 排序：`-created`；`status` 缺省只列待归并。

#### 5.3.2 `POST /api/admin/talent/direction-requests/:id/merge`

Body：`{ "targetDirectionId": "d_xxx" }`。

响应：`{ request: {...}, direction: { id, code, name, aliases, version } }`；message「已归并到「舞蹈家」」。

错误：404 请求/方向不存在；422 `TARGET_DIRECTION_DISABLED`；409 `ALIAS_CONFLICT` / `REQUEST_ALREADY_PROCESSED`；幂等同目标 200。

#### 5.3.3 `POST /api/admin/talent/direction-requests/:id/promote`

Body：无（空对象）。

响应：`{ request: {...}, direction: { id, code, name, status:"0", version:1 } }`；message「已生成停用方向「冰球」，请补充要素与要求分级后启用」。

错误：404；422 `NO_TIER_AVAILABLE`（无启用档位时无法生成合法 stub）；409 `REQUEST_ALREADY_PROCESSED`（已转正式且目标不同）；幂等：已转正式 → 200 返回原方向。

#### 5.3.4 `GET /api/admin/talent/reports/:id/direction-preview`（M3 路由，M4 契约）

响应形状与 M3 spec §5.4.2 `tabs.matching` 保持一致（M3 已定；若 M3 实现调整，以 M3 spec 为准）：

```jsonc
{
  "reportId": "r_demo_0001",
  "subject": { "type": "child", "id": "c_demo_1", "name": "小同" },
  "frozen": { /* directionSnapshot | null（未发布） */ },
  "current": {
    /* directionSnapshot（按当前配置全量重算，不落库），M4 追加： */
    "recommendation": { "items": [/* 前 5 或 0 命中回退 */], "fallback": false, "totalCandidates": 6, "emptyReason": null }
  },
  "diff": [
    { "directionId": "d_demo_1", "code": "DIR-001", "name": "舞蹈家",
      "frozenHitCount": 4, "currentHitCount": 3,
      "addedHits": ["E-16"], "removedHits": ["F-10"], "requirementChanged": true }
  ],
  "configChanged": true,
  "generatedAt": "2026-11-16T03:00:00.000Z"
}
```

- `frozen` / `current`：未发布（`pending_publish`）时均为 `null`、`diff=[]`、`configChanged=false`（与 M3 §5.4.2 一致）；发布弹层预览用 `current`（此时 `frozen=null`）。
- `configChanged`：任一方向 version 变化、档位启停/改名、要素分级/注解变化、`levelOrders` 变化 → true（M3 计算；M4 提供当前配置快照与纯函数供比对）。
- `current.recommendation` 是 M4 在 M3 响应内追加的只读字段（M3 允许在 `current` 内加字段），供发布弹层展示「方向命中预览」；**不是新路由、不落库**。
- 后台命中明细含编码、`levelDisabled`、`factorMissing` 与 `warnings`；C 端读取项不含编码（§5.3.5）。
- 权限 `talent:report:view`；报告不存在/不可预览由 M3 路由返回 404/422。

#### 5.3.5 `GET /api/client/talent/directions`

Query：`reportId`（可选；缺省取当前对象当前报告，由 M3 helper 解析）。

响应（示例为虚构成人数据）：

```jsonc
{
  "code": 200, "message": "ok",
  "data": {
    "reportId": "r_demo_0001",
    "snapshotVersion": 2,
    "publishedAt": "2026-11-16T02:00:00.000Z",
    "recommendLimit": 5,
    "selectionLimit": 3,
    "selectionCount": 1,
    "fallback": false,
    "emptyReason": null,
    "items": [
      {
        "directionId": "d_demo_001",
        "name": "舞蹈家",
        "description": "以肢体协调、节奏感与表现力为核心。",
        "icon": "舞",
        "hitCount": 4, "total": 6, "hitRate": 0.666667,
        "selected": true, "selectedTierId": "t_demo_3",
        "requirements": [
          { "factorName": "节奏感知", "needLevelName": "优秀", "actualLevelName": "卓越", "met": true, "gap": 0 },
          { "factorName": "动作模仿", "needLevelName": "优秀", "actualLevelName": "优良", "met": false, "gap": 1 }
        ],
        "tiers": [
          { "tierId": "t_demo_1", "name": "启蒙", "teacher": "普通老师", "freq": "每周 1–2 次", "headline": "…", "description": "…", "default": false }
        ],
        "defaultTierId": "t_demo_2",
        "selectable": true,
        "fallback": false
      }
    ],
    "selections": [
      { "selectionId": "d_demo_001", "directionId": "d_demo_001", "requestId": "", "custom": false,
        "directionName": "舞蹈家", "tierId": "t_demo_3", "tierName": "精进",
        "teacher": "卓越老师", "freq": "每周 2–3 次", "manualName": "", "selectedAt": "…" }
    ],
    "manualOptions": [ { "directionId": "d_demo_001", "name": "舞蹈家" } ],
    "manualLimit": 10
  }
}
```

- `items` 的排序即 BR-08（快照冻结值）；`requirements` 只给展示名，**不含 code**（BR-12）；`hitRate` 原始比值，M7 展示「N/M 项命中」即可（百分比可选）。`description/icon` 由 M4 按 `directionId` 取当前方向配置（取不到留空），不属于冻结数据。
- `manualOptions`：快照内启用方向按名称拼音升序；快照为空时用当前启用方向；M7 末位追加「其他（自己填写）」；`manualLimit=10`（PRD §7.7 L389）。
- 报告状态错误与 M3 C 端契约一致：`pending_publish` → 409 `{code:"report_pending", state:"pending_publish", message:"报告正在整理中"}`；`retracted` → 409 `{code:"report_retracted", state:"retracted", message:"报告内容更新中"}`；非本人/未绑定/已解绑/家长或子女停用 → 404（不泄露存在性）；报告不存在 → 404。M7 把两种 409 映射为报告状态卡/空态（PRD §7.10）。
- 数据源：M4 通过 M3 `getTalentReportClientSnapshot` 读同一份 `directionSnapshot` + `selections`；M7 也可从 M3 `GET /api/client/talent/reports/:id` 读原始快照，但方向页推荐/自填选项以本接口为准（含 `recommendation`、`manualOptions`、选择上限）。
- 快照为空：`items=[]`、`emptyReason="NO_DIRECTIONS"`，`manualOptions` 仍返回（自填可用）。

#### 5.3.6 `POST /api/client/talent/selections`

Body（二选一）：

```jsonc
{ "reportId": "r_demo_0001", "directionId": "d_demo_001", "tierId": "t_demo_3" }
{ "reportId": "r_demo_0001", "manualName": "冰球", "tierId": "t_demo_2" }
```

响应：`{ selection, selections, selectionCount, selectionLimit }` + message「已选择「舞蹈家」·目标档位 精进」/「已提交自填方向「冰球」」。

错误：

| HTTP | code（message 前缀） | 触发 |
| --- | --- | --- |
| 409 | `report_pending` / `report_retracted` | 报告未发布/已撤回（不写库；与 M3 §7.1 一致） |
| 404 | `REPORT_NOT_FOUND`（含非本人/解绑/停用） | 报告不存在或不可见，不泄露存在性 |
| 404 | `DIRECTION_NOT_FOUND` | 方向不在该报告冻结快照 |
| 409 | `SELECTION_LIMIT_REACHED` | 已选 3 个（新增时） |
| 409 | `DUPLICATE_SELECTION` | 同方向/同名自填已存在（提示用换档） |
| 422 | `INVALID_TIER` / `TIER_UNAVAILABLE` | 档位不在候选/无启用档位 |
| 422 | `INVALID_MANUAL_NAME` | 空/超 10 字/含控制字符 |
| 422 | `DIRECTION_NOT_AVAILABLE` | 方向停用或 `selectable=false` |

- 幂等：完全相同的重复提交（同方向同档位 / 同名自填同档位）→ 200 + `alreadySelected:true`，不追加版本记录；同方向不同档位 → 409 提示换档。
- 事务：写 `selections` 与 `talent_direction_requests` 无 PB 事务；顺序与补偿见 §4.7（已知限制 R4）。

#### 5.3.7 `PUT /api/client/talent/selections/:selectionId`

Body：`{ "reportId": "r_demo_0001", "tierId": "t_demo_2" }`。

- `selectionId` = 正式 `directionId` 或自定义 `requestId`；服务端在 `selections` 中按二者匹配（至多一个非空）。
- 换档：更新 `tierId/tierName/teacher/freq`；同档位 → 200 `changed:false`；非法档位 → 422；未选 → 404 `SELECTION_NOT_FOUND`。
- 追加 M3 版本记录（type `selection`，summary「家长更换「舞蹈家」目标档位为 养成」）。

#### 5.3.8 `DELETE /api/client/talent/selections/:selectionId`

Query：`reportId`。响应：`{ selections, selectionCount }`；未选 → 200 `changed:false`（幂等）。

- 追加 M3 版本记录（type `selection`，summary「家长取消「舞蹈家」」）。
- 自定义取消不回退/不改 `talent_direction_requests`（请求保持待归并，供后台归并）。

### 5.4 幂等与版本摘要

| 操作 | 幂等键 | 重复调用 |
| --- | --- | --- |
| 提交自填 | `(reportId, manualName)` 待归并唯一 | 复用请求；同档位 200 no-op |
| 选择正式 | `(reportId, directionId)` | 同档位 200 no-op；异档位 409 |
| 换档 | `(reportId, selectionId)` | 同档位 200 `changed:false` |
| 取消 | `(reportId, selectionId)` | 200 `changed:false` |
| 归并 | `request.id` + target | 同目标 200；异目标 409 |
| 转正 | `request.id` | 200 返回原方向；异目标 409 |

- 方向 `version`：仅 M1 配置保存 +1；M4 合并别名**不改**；快照方向 version 在发布时冻结，用于 M3 diff。
- 报告 `snapshotVersion`：仅 M3 发布/补发/恢复/显式重算变更；M4 选择只调 `recordTalentReportVersion` 追加 `versions[]`，不改 `snapshotVersion`。

### 5.5 服务端落点

| 文件 | 职责 |
| --- | --- |
| `server/utils/talent-direction-match.ts` | 纯函数（§4.9），无 PB/网络 IO |
| `server/utils/talent-direction-selection.ts` | 选择/换档/取消/自填、请求 upsert、归并/转正、计数 helper `countPendingTalentDirectionRequests(pb)` |
| `server/utils/talent-direction-api.ts` | Zod schema、列表分页参数、快照读取（M3 helper）、组装 `GET /directions` 响应、别名冲突检查、方向 stub 创建 |
| `server/api/client/talent/directions.get.ts` | #5 |
| `server/api/client/talent/selections.post.ts` | #6 |
| `server/api/client/talent/selections/[selectionId].put.ts` / `.delete.ts` | #7/#8 |
| `server/api/admin/talent/direction-requests/index.get.ts` | #1 |
| `server/api/admin/talent/direction-requests/[id]/merge.post.ts` | #2 |
| `server/api/admin/talent/direction-requests/[id]/promote.post.ts` | #3 |
| `shared/types/talent-direction.ts` | 以上类型 + `TalentDirectionSnapshot` / `TalentSelectionItem` / `TalentDirectionRequest` |
| `app/pages/admin/talent/rules/components/DirectionRequestModal.vue` | 待归并列表/归并/转正弹层 |
| `app/composables/api/useTalentDirectionApi.ts` | 后台待归并接口封装 |

> M3 路由 `server/api/admin/talent/reports/[id]/direction-preview.get.ts` 与 M3 helper 由 M3 实现；M4 只提供 `computeTalentDirectionMatches` / `recommendDirections` 与 §5.3.4 响应契约。若 M3 延期，M4 需要提供临时 Mock 适配器（`server/utils/talent-direction-api.ts` 内的 seam），不得私建报告读取。

### 5.6 权限与归属

- 后台：`requirePermission`（`talent:direction:list` / `talent:direction:merge`）+ `withOperLog`。
- C 端：登录家长 → M2 按 `talent_parents.userId` 解析 parent（helper 命名以 M2 spec 为准，本文 `resolveCurrentTalentParent(event)` 为占位名）→ M3 `getTalentReportClientSnapshot` / `assertTalentReportPublished`；报告 `subjectType=child` 时用 M2 `assertTalentChildAccess(userId, childId)`；`self` 时校验报告归属家长 id。**不接受前端传 parentId/childId 作为归属依据**。
- 解绑/停用/撤回后下一次请求立即不可读（409 `report_pending`/`report_retracted` 或 404，PRD §10.1/§10.5，与 M3 §7.1 一致）。
- 日志：记录方向名、档位名、报告编号；不记手机号/身份证/自填方向以外正文。

---

## 6. B 端页面

### 6.1 待归并入口（增量，唯一触碰 M1 页面的点）

- `app/pages/admin/talent/rules/direction.vue` 的 `#headerExtra` 追加：

```vue
<n-button v-if="canMerge" class="main-action" @click="showRequests = true">
  待归并<span v-if="pendingCount"> ({{ pendingCount }})</span>
</n-button>
<!-- 现有「档位维护 / 新增方向」按钮与表格、检索、弹层均不动 -->
<DirectionRequestModal v-model:show="showRequests" @merged="load" />
```

- `pendingCount` 取列表接口 `total`（`status=待归并&pageSize=1`），首次加载与归并后刷新；失败时按钮不显示数字（不阻断页面）。
- 权限：`canMerge = hasPermission("talent:direction:merge")`；无权限不渲染按钮（API 仍强校验）。
- 若 lead 不批准触碰 M1 页面：降级为独立页 `/admin/talent/rules/direction-merge`（复用同一弹层组件），M4 验收注明「仅 URL 可达，工作台入口 M6」。

### 6.2 `DirectionRequestModal.vue`

- 尺寸：wide；标题「自定义方向待归并」。
- 顶部：状态筛选（待归并/已归并/已转正式，默认待归并）、关键词（自填方向/家长/子女）。
- 列表列：提交时间、家长（姓名 + 脱敏手机号）、子女/对象、自填方向、目标档位、状态、目标方向（已处理时）、操作。
- 行内操作：
  - 「归并」→ 弹出启用方向下拉（名称 + 编码），确认后调 #2；成功 toast「已归并到「X」」并刷新；
  - 「转正式」→ 二次确认（提示「将生成停用方向，需补充要素与档位后启用」）→ #3；成功 toast；
  - 已处理行只读展示目标方向；无操作按钮。
- 空态「暂无待归并方向」；加载/错误态复用 `AdminListPage` 规范；分页 20。
- 不展示家长/子女身份证、全号手机号。

### 6.3 报告侧（M3 页面消费，不归 M4 实现）

- 发布弹层信息条「方向数 / 档位数」与命中预览取 #4（M3 页面）；
- 报告详情「匹配天赋」页签用 #4 的 frozen/current/diff 展示「发布时 vs 当前配置」，可触发 M3「按当前配置重新生成快照」（版本动作归 M3）；
- 「已选培养方向和目标」页签读 `selections`（M3 页面），展示方向名、档位、师资、频次、提交时间、类型（正式/自定义）；自定义展示 `manualName`。

---

## 7. C 端契约（M7 消费，M4 定契约不做页面）

### 7.1 数据契约

- 接口：§5.3.5–§5.3.8；数据源：报告 `directionSnapshot` + `selections` + `talent_direction_requests`（仅 ID/状态，不展示）。
- 展示字段：`name/description/icon/hitCount/total/hitRate/requirements[{factorName,needLevelName,actualLevelName,met,gap}]/tiers/defaultTierId/selected/selectedTierId/selectable`。
- **不展示**：`code`（方向编码）、`factorCode`、分级编码、内部 id（BR-12）；URL 只用 C 端路由参数。
- 空/异常映射：

| API 结果 | C 端展示 |
| --- | --- |
| `items=[]` + `NO_DIRECTIONS` | 「暂无可推荐方向，可自己填写」 |
| `fallback=true` | 方向卡标「暂无匹配」+ 提示「当前报告暂无匹配方向，仍可选择或自己填写」 |
| 409 `report_pending` / `report_retracted`；404 越权 | 空态「报告发布后可选方向」/报告状态卡「报告整理中」「报告内容更新中」（M7 判据）；越权走报告不可见 |
| 未选 | 已选页签空态「还没有选择方向」+ 去推荐/自己填写 |
| 已选满 3 | 确认按钮禁用 + 提示「最多选择 3 个方向，请先取消一个」 |

### 7.2 推荐页（FR-APP-07 L382–390）

- 页签：推荐方向（≤5，按快照命中排序）/ 已选方向（N/3）。
- 方向卡：名称、一句描述、「N/M 项命中」、「X 个档位」、已选标记、0 命中「暂无匹配」。
- 方向详情：命中 N/M、要素对照（需 X · 现 Y / 已达成 / 差 N 级）、目标档位（名称/师资/频次/一句话卖点）、确认/更新按钮；`selectable=false` 显示「该方向暂未开放档位」。
- 自填：方向下拉（`manualOptions` 拼音升序 + 末位「其他（自己填写）」）+ 输入 ≤10 字 + 培养目标必选（默认全局默认档位）。
- 交互：确认选择 → #6；更换档位 → #7；取消 → #8（二次确认）；提交上限 3，超出提示先取消。

### 7.3 拼音排序

`buildManualDirectionOptions` 用 `name.localeCompare(name, "zh-Hans-CN")` 升序；Node 需完整 ICU（Nuxt 默认）。测试断言固定虚构样例顺序（如「编程启蒙」<「冰球」<「舞蹈家」）；若运行环境 ICU 缺失导致顺序变化，以中文拼音字典序为准并记录环境（§12 R6）。

### 7.4 快照为空时的自填

- 快照 `directions=[]` 时仍允许自填：档位取当前启用档位（全局默认档位预选）；`manualOptions` 为空（下拉只有「其他（自己填写）」）；提交后生成待归并请求 + 选择项。
- 报告不可读（未发布/撤回）时不展示方向页内容，仅状态卡；接口返回 409 `report_pending` / `report_retracted`（与 M3 C 端一致），越权返回 404。

---

## 8. 验收映射

完整追溯与证据表见 [acceptance.md](acceptance.md)。落点速查：

| 需求 | PRD 位置 | 本文落点 |
| --- | --- | --- |
| BR-08 命中/排序/上限 | L104 | §4.1–§4.4、§4.9、UT-M4-01~12 |
| BR-09 0 命中可回退、空快照可自填 | L105 | §4.4、§7.1、§7.4、UT-M4-13~15 |
| BR-12 编码不对家长展示 | L108 | §5.3.5、§7.1 |
| §6.3 自定义方向待归并入口 | L215、§13.3 L654 | §3.5、§4.7、§5.2、§6.1–§6.2 |
| §8.2 direction/tier 字段 | L496–501 | §3.2/§3.3、§4.9 |
| §8.2 report direction_snapshot/selections | L484–485 | §3.3/§3.4 |
| §8.3 方向选择状态机（未选→已选≤3、取消、换档、自定义待归并） | L535 | §4.6、§5.3、§7.2 |
| §9 C 端方向与选择接口 | L573 | §5.2 #5–#8 |
| §10 数据权限、审计、接口校验 | L581–590 | §2.4、§5.6 |
| §12 C 端方向验收（排序/0 命中/空态/自填/上限/取消/换档/拼音） | L626–628 | §7、acceptance §2.2 |
| AC-ADM-03 补充（命中预览、待归并、删除引用保护补链路、停用边界） | §6.3 L217–222 | §6、acceptance §2.1 |

---

## 9. 单测用例表（`test/talent-direction-match.test.ts` 为主）

> 全部用虚构数据（方向「舞蹈家/音乐家/逻辑思维」，要素 `E-16/F-10/B-34`，分级 LV1–LV4 级序 1–4）。断言纯函数，不依赖 PB/网络。

| ID | 用例 | 输入要点 | 期望 |
| --- | --- | --- | --- |
| UT-M4-01 | 基本命中计数 | 方向 3 条要求，实际级序 4/3/2，要求 3/3/3 | hitCount=2、total=3、hitRate≈0.6667、第 3 条 met=false gap=1 |
| UT-M4-02 | 级序相等算命中 | 实际 LV3、要求 LV3 | met=true、gap=0 |
| UT-M4-03 | 低于要求未命中 | 实际 LV2、要求 LV3 | met=false、gap=1 |
| UT-M4-04 | 要素缺失 | 快照无 requirement.code | met=false、actualOrder=0、gap=needOrder、factorMissing=true |
| UT-M4-05 | `levelOrder` 快照优先 | 快照 `levelOrder=4` 但当前分级表 LV3=3 | 用 4（不反查当前表） |
| UT-M4-06 | 重复 requirement | 同 code 出现两次（LV2/LV4） | 只计 1 条（首条）、total 去重、warnings 含 DUPLICATE_REQUIREMENT |
| UT-M4-07 | 重复 factor | 同 code 两条不同级序 | 首条生效、warnings 含 DUPLICATE_FACTOR |
| UT-M4-08 | 停用分级要求 | `disabledLevelCodes=[LV4]`，要求 LV4 且实际 LV4 | met=false、计分母、levelDisabled=true |
| UT-M4-09 | 0 配置方向 | requirements=[] | total=0/hitRate=0、emptyRequirements=true、不进推荐 |
| UT-M4-10 | 排序：命中数 | 4/6 vs 3/6 | 4/6 在前 |
| UT-M4-11 | 排序：命中率平手→配置条数 | 1/2 vs 2/4 vs 2/5 | 顺序 B(2/4)、A(1/2)、C(2/5) |
| UT-M4-12 | 排序：全平手→编码 | 同命中/同率/同条数，编码 DIR-002/DIR-001 | DIR-001 在前；打乱输入顺序结果一致 |
| UT-M4-13 | 推荐上限 | 8 个命中方向、limit=5 | items.length=5、顺序正确、totalCandidates=8 |
| UT-M4-14 | 0 命中回退 | 快照 6 个方向全 0 命中 | fallback=true、items=6（limit 5 时 5 条）、均标 fallback |
| UT-M4-15 | 快照无方向 | directions=[] | items=[]、NO_DIRECTIONS、fallback=false |
| UT-M4-16 | 停用方向不评估 | 方向 status="0" | 不进 hits/snapshot |
| UT-M4-17 | pickTier 优先级 | requested/current/default/候选 | 依次命中；非法 requested 回退 current/default/首条 |
| UT-M4-18 | pickTier 无启用档位 | tierIds 全停用 | 返回 null、selectable=false |
| UT-M4-19 | 选择上限 | 已有 3 项再新增 | ok=false、LIMIT_REACHED、数组不变 |
| UT-M4-20 | 重复选择→换档提示 | 已选同 directionId | DUPLICATE_SELECTION |
| UT-M4-21 | 换档 | 已选方向换到合法档位 | tierName/teacher/freq 更新、directionName 保持、changed=true |
| UT-M4-22 | 换档非法档位 | tierId 不在候选 | ok=false、INVALID_TIER |
| UT-M4-23 | 取消幂等 | 取消不存在/已取消 | changed=false、ok=true |
| UT-M4-24 | 自填名称校验 | ""/"0123456789A"/"冰 球" | 空与 11 字拒绝 INVALID_MANUAL_NAME；trim 后合法 |
| UT-M4-25 | 自填+正式共享上限 | 2 正式 + 1 自填 → 再选第 4 个 | LIMIT_REACHED |
| UT-M4-26 | 排序不改入参 | 传入数组引用 | 原数组顺序不变、返回新数组 |
| UT-M4-27 | 快照生成字段完整 | computeTalentDirectionMatches | version/at/operator/limits/levelOrders/tiers/directions 齐全；directions 含 0 命中 |
| UT-M4-28 | 补发增量重算 | base 方向 2 条要求，新增要素命中 1 条 | 仅受影响 requirement 更新，旧命中/旧 actualOrder 原样，hitCount 重算、重排序 |
| UT-M4-29 | 补发无影响 | affected 为空 | 与 base 完全一致（除 envelope 覆盖） |
| UT-M4-30 | 推荐读取快照值 | snapshot.recommendLimit=2 | 读取按 2 截断，不用常量 5 |
| UT-M4-31 | 拼音排序 | 虚构方向名 | 「编程启蒙」<「冰球」<「舞蹈家」（zh-Hans-CN） |
| UT-M4-32 | 空快照自填档位 | 快照空、当前启用档位 4 个 | 全局默认档位预选，自填可用 |

领域/接口用例（`test/talent-direction-selection.test.ts` / `test/talent-direction-api.test.ts`）：

| ID | 用例 | 期望 |
| --- | --- | --- |
| UT-M4-S1 | 归并写别名 | aliases 追加、请求=已归并、方向 version 不变 |
| UT-M4-S2 | 别名冲突 | 另一方向已有同名别名 → 409；与其它方向 name 相同 → 409 |
| UT-M4-S3 | 归并目标停用 | 422 TARGET_DIRECTION_DISABLED |
| UT-M4-S4 | 转正 stub | 生成 status="0"、requirements=[]、tierIds=启用全集、default ∈ tierIds、code DIR-NNN |
| UT-M4-S5 | 转正无启用档位 | 422 NO_TIER_AVAILABLE |
| UT-M4-S6 | 归并/转正幂等 | 同目标 200；异目标 409 |
| UT-M4-S7 | 待归并列表权限 | 无 `talent:direction:merge` → 403（merge/promote）；list 用 direction:list |
| UT-M4-S8 | C 端越权/不可读 | 他人子女/解绑/停用 → 404；未发布/撤回 → 409；均无写库 |
| UT-M4-S9 | 写选择追加版本 | 调用 M3 helper；snapshotVersion 不变；oper_logs 一条 |
| UT-M4-S10 | 自填两步写补偿 | 报告写失败 → 请求删除（或标记）且返回 5xx；无脏待归并 |

---

## 10. 测试命令与门禁（按 `docs/QUALITY.md` 风险分级）

本模块涉及 schema / 权限 / C-B 跨端契约 → 「schema / 认证 / 权限」级门禁：

```bash
# 1. 定向单测（纯函数 + 领域 + 路由契约）
pnpm vitest run test/talent-direction-match.test.ts test/talent-direction-selection.test.ts test/talent-direction-api.test.ts

# 2. 类型与 lint
pnpm typecheck
pnpm lint

# 3. 回归（M1/M2/M3 既有测试不得变红）
pnpm test

# 4. 新库 schema 烟测（新空目录，禁止指向真实 pb_data）
#    POCKETBASE_DATA_DIR=<临时空目录> pnpm env:doctor && pnpm env:setup
#    断言 talent_direction_requests 与 4 个索引存在；现有集合/索引清单不变

# 5. 存量库幂等同步（只加不删）
pnpm talent:sync && pnpm talent:sync

# 6. 权限码/菜单断言（sync-talent 内置：缺 F 行即失败）
#    手动核对：talent:direction:merge 有 F 菜单行；无新增 C 菜单（仍 11 条）

# 7. C 端（M7 页面就绪后）
pnpm client:typecheck
```

- 不要求 M4 自己跑 `pnpm build` / C 端构建；M7 页面合并后按 `QUALITY.md` 完整门禁补跑。
- 证据（命令 + 退出码 + 关键输出）写入 acceptance.md §3；未跑项标「未验证」并注明阻塞原因。

## 11. 实施顺序（4–5 人天，可与 M3 并行）

| 步骤 | 内容 | 依赖 | 出口 |
| --- | --- | --- | --- |
| 1 | `shared/types/talent-direction.ts` + `server/utils/talent-direction-match.ts` 纯函数 + `test/talent-direction-match.test.ts` | 无（只用 M1 类型与 ADR 0004） | UT-M4-01~32 全绿；`pnpm vitest run test/talent-direction-match.test.ts` |
| 2 | `talent_direction_requests` schema + 索引 + 类型 + seed（setup/sync/seed 脚本） | 步骤 1；M3 集合存在才可写演示数据 | 新库 `env:setup` 有集合/索引；`talent:sync` 两次幂等 |
| 3 | 领域 IO：`talent-direction-selection.ts`（选择/自填/归并/转正）+ 单元测试 | 步骤 1、2；M2/M3 helper（可 Mock seam） | UT-M4-S1~S6、S10 |
| 4 | 后台路由 #1–#3 + 菜单/权限码 + `DirectionRequestModal` + 方向页 headerExtra 增量 | 步骤 2、3；M1 页面 lead 批准 | 后台列表/归并/转正可用；F 菜单行存在 |
| 5 | C 端路由 #5–#8 + `GET /directions` 组装 + M3 `direction-preview` 契约联调 | 步骤 1、3；M3 helper 就绪 | UT-M4-S7~S9；M3 发布弹层/详情页可调通 |
| 6 | 验收证据：acceptance.md 逐项填「通过/未通过/未验证」 | 全部 | `git diff --check` 干净；只改允许目录 |

## 12. 风险与处置

| # | 风险 | 影响 | 处置 |
| --- | --- | --- | --- |
| R1 | M3 实现延期或在实现中调整字段 | C 端推荐与 M4 API 联调受阻 | M3 spec 已出稿并与本文 §3.1/§3.3/§3.4 对齐；M4 用 Mock seam 先行；联调时以 M3 实现为准回改本文「与 M3 对齐」段并同步 M7 契约 |
| R2 | M2 归属 helper 延期 | C 端选择越权风险 | 复用同签名 seam，禁止 M4 自写归属逻辑；验收前替换为 M2 实现并补越权用例 |
| R3 | PRD 13.3/13.4 编号不一致（开发计划引用 13.4，PRD v1.1 只有 13.3） | 需求追溯歧义 | 以 PRD §13.3 第 2 条为准（自定义方向补入口）；本文 §3.5 落点，acceptance 记录 |
| R4 | 自填两步写（请求 + selections）无 PB 事务 | 可能残留无选择的待归并请求 | best-effort 补偿删除 + 错误日志；验收覆盖 UT-M4-S10；后续可加对账任务（M9） |
| R5 | 并发选择（读改写 selections JSON）导致上限击穿/丢更新 | 家长重复点击 | 单 PB、低并发 + 前端防抖；已知限制写入 acceptance；必要时 M9 加 `updated` 乐观锁 |
| R6 | 拼音排序依赖 ICU 版本 | 测试/环境顺序差异 | 固定虚构样例断言 + 记录 Node 版本；环境缺失 ICU 时在验收注明，不改排序口径 |
| R7 | 方向页 headerExtra 增量触碰 M1 已交付文件 | 违反「不改 M1 实现」边界 | 仅追加按钮/弹层挂载，不改已有逻辑；lead 批准后执行；不批准则降级独立页 |
| R8 | 停用分级/档位的运行期边界口径 | 命中率/可选性争议 | 按 §4.1（要求侧未命中计分母）/§4.5（停用档位剔除）执行；acceptance 标「待裁决」项供客户确认 |
| R9 | 0 命中回退「全部 vs 前 5」口径 | C 端展示差异 | 按原型取前 5；ADR 0004-D4 标注；客户确认后只改读取层 |
| R10 | 快照 `levelOrder` 缺失时降级反查当前分级 | 历史报告口径漂移 | M3 必须冻结 `levelOrder`（已对齐）；降级路径仅兜底，响应标 `levelOrderSource:"current"` |

## 13. 未决项（不阻塞实现，按建议默认执行）

| # | 问题 | 建议/默认 | 裁决人 |
| --- | --- | --- | --- |
| C1 | 0 命中回退是否「列出全部」还是最多 5 个（BR-09 vs §7.7） | 按原型：回退后仍受推荐上限 5 截断；客户要求全列时只放开截断 | 客户 / lead |
| C2 | 推荐上限 5、选择上限 3 是否可配置（PRD §13.3 L655） | 暂常量 + 快照冻结，不落库；配置化需新 ADR（会改快照结构与验收） | 客户 / lead |
| C3 | 停用分级的要求是否计入分母 | 计入（视为未命中），不虚高命中率 | 客户 / lead（规则配置员） |
| C4 | 自定义方向转正后，历史已选是否改指向新方向 | 不改（BR-03 冻结 + M3 对齐：以 `manualName` 为准） | lead |
| C5 | 别名是否参与后续报告自动命中 | 不参与（算法只读 `requirements`）；若客户要求别名参与，需改算法口径并新 ADR | 客户 / lead |
| C6 | 方向选择是否写入报告版本历史 | 写 `versions[]`（type `selection`），不改 `snapshotVersion`（已与 M3 对齐） | 已定（M3） |
| C7 | 「按当前配置重新生成快照」后旧方向命中被整体重写 | 属显式动作，允许（PRD §6.6 详情页按钮）；仅在用户确认后执行 | 已定（M3） |

## 14. 文档同步清单（M4 出口，由 lead 派发，不在本任务写范围）

- `docs/API.md`：8 条新路由（后台 3 + C 端 4 + M3 preview 契约）。
- `docs/ARCHITECTURE.md`：新集合 `talent_direction_requests` 与索引。
- `docs/STATUS.md`：M4 实现/验收状态。
- `docs/TALENT-LOCAL.md`：种子脚本 `pnpm talent:direction:seed` 与演示口径。
- `docs/specs/README.md` / `docs/adr/` 索引由 lead 在 M4 验收后统一更新（本任务只交付 M4 三文件）。
