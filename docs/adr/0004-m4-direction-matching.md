# ADR 0004 · M4 方向匹配域关键决策

| 项 | 内容 |
| --- | --- |
| 状态 | 已接受（待 lead 复核） |
| 日期 | 2026-11-16 |
| 决策人 | 架构师 teammate（task-11 / architect-m4） |
| 关联 | [M4 方向匹配规格](../specs/M4-matching/spec.md)、[M4 验收](../specs/M4-matching/acceptance.md)、实现任务 M4（待派发）、PRD v1.1 §6.3/BR-08/§8.2/§8.3/§13.3、[M1 规格](../specs/M1-rules/spec.md)、[ADR 0001](0001-m1-rule-domain.md) D2/D5、M3 报告域 [spec](../specs/M3-reports/spec.md) §3.2.1/§3.2.3/§3.2.4/§3.2.5/§8.3（已出稿，字段以 M3 为准） |
| 影响范围 | `shared/types/talent-direction.ts`、`server/utils/talent-direction-*.ts`、`server/api/client/talent/{directions,selections}/**`、`server/api/admin/talent/direction-requests/**`、`scripts/setup.mjs`、`scripts/sync-talent.mjs`、`app/pages/admin/talent/rules/components/DirectionRequestModal.vue` 与方向页 `#headerExtra` 增量、`test/talent-direction-*.test.ts` |

> 修订：v2（2026-11-16 按 M3 spec §3.2.3/§3.2.4/§3.2.5 对齐字段与 helper 签名）。与 architect-m3 对齐结论：`factorSnapshot` 冻结 `levelCode/levelOrder`；`directionSnapshot` 冻结全部已评估方向 + `levelOrders/tiers/limits`；发布全量计算、补发增量重算、恢复不重算、显式重算才整体替换；方向选择写 `versions[]` 但不改 `snapshotVersion`。

## 背景

M1 已交付方向 `requirements`（`[{code, level}]`，1–50、去重、分级启用校验）与档位（固定 4 档）的数据契约，并明确 BR-08 的命中算法属 M4（M1 spec §3.5.1/§5.2 #24–31、ADR 0001-D2/D5）。M3 报告域将发布时的要素结果、方向命中、档位与选择冻结为快照（PRD BR-03/§8.2）。旧实现 `server/utils/talent-matching.ts`（加权达成度 + 随机抽取内容）与 `talent-plan-recommendation.ts`（计划推荐 score）服务的是已废弃的内容库/培养计划业务，口径与 BR-08 完全不同，**不可复用**。

M4 需要同时回答：命中怎么算、怎么排序与兜底、快照输入输出怎么定、0 命中怎么办、家长自填方向怎么归并、推荐/选择上限怎么配置。以下决策在「与 M3 并行、M1 已验收、M2/M7 未实现」的约束下做出，目标是让 M3 可以照 §3.3 冻结、M7 可以照 §7 展示、实现 agent 可以照纯函数签名直接写单测。

---

## D1 · 命中口径：级序 ≥ 计 1 条、按 requirement 计数、不设权重

**背景**

PRD BR-08（L104）：「要素实际分级级序 ≥ 要求分级级序记 1 条命中；按命中条数降序，同数依次比较命中率、配置条数、方向编码」。PRD §6.3 L208 明确「不设权重、不校验合计 100」。M1 已交付 4 档分级 `LV1–LV4`，`sortOrder` 1–4 唯一；方向 `requirements` 只存 `{code, level}`。需要定死：命中率分母、部分命中怎么算、要素缺失/分级停用等运行期边界。

**选项**

1. 加权达成度（旧 `talent-matching.ts` 思路）：按分值/权重累加，得到 0–100 匹配度。
2. 全满足才算命中（AND）：所有 requirement 都达到才计入方向。
3. **按 requirement 逐条计数（OR 计数）**：每满足一条记 1；`hitCount` / `total` / `hitRate` 三值；不设权重。
4. 命中率按「命中要素数 / 报告 158 项」计算。

**结论**

选 3。理由：与 BR-08 逐字一致，也是 C 端「命中 N/M 项」「要素对照：已达成 / 差 N 级」与后台「发布时 vs 当前配置」唯一可解释的口径；选项 1 是客户已废弃的旧算法，且 PRD 明令不设权重；选项 2 会让「部分命中」无法展示，直接违反 C 端 §7.7 的「命中 N/M」；选项 4 把未配置的要素也计入分母，方向之间不可比且与「配置条数」排序键冲突。

**后果**

- 纯函数输出 `hitCount/total/hitRate` 与逐条明细（`met/gap/actualOrder/needOrder`）；`total` = 去重后 requirement 条数。
- 运行期边界定死：要素缺失 → 未命中（`actualOrder=0`、`gap=needOrder`）；要求分级已停用 → 未命中且**计入分母**（保守，不虚高命中率，标 `levelDisabled`）；实际分级停用仍按快照级序计算（级序是内在属性）；重复 requirement/factor → 首条生效 + 警告（脏数据兜底，正常 M1 保存不会出现）。
- 不读旧 `talent-matching.ts`、不复用其类型；旧文件保留到 M6 清理。
- 停用档位在**选择侧**剔除（§4.5），但不影响命中计算（命中与档位无关），因此「命中但不可选」是合法组合，C 端需展示「该方向暂未开放档位」。

---

## D2 · 排序与平手：四键全序 + 交叉相乘，禁止依赖 locale/浮点

**背景**

BR-08 只给四层顺序：「命中条数降序 → 命中率 → 配置条数 → 方向编码」。原型 `store.js` 用 `b.hitRate - a.hitRate` 比较浮点、用 `localeCompare` 比较编码。M4 会被单测、后台预览、C 端推荐三处复用；如果比较器受浮点舍入或 ICU/locale 影响，同一快照在不同环境可能给出不同推荐顺序，验收不可复现。

**选项**

1. 按原型：`b.hitCount - a.hitCount || b.hitRate - a.hitRate || b.total - a.total || a.code.localeCompare(b.code)`。
2. **四键全序 + 命中率交叉相乘 + 编码按 Unicode 码位 + id 兜底**：`b.hitCount - a.hitCount`；`total>0` 时 `b.hitCount*a.total - a.hitCount*b.total`；`b.total - a.total`；`a.code < b.code ? -1 : 1`；最后 `id` 升序。
3. 只按命中数排序，其余交给页面。

**结论**

选 2。理由：①「命中率」是比值，整数交叉相乘（`hitCount * other.total`）在数学上等价且无浮点误差，平手判定与排序结果可复现；② 方向编码是内部分类编码（`DIR-001` 等），按 Unicode 码位比较是确定性的，`localeCompare` 会随 ICU/区域设置变化，且没有「人读拼音序」需求（拼音排序只用于 C 端自填下拉的方向名称，见 D5/§7.3，那是另一件事）；③ 加 `id` 兜底让「同 code 脏数据」也不会破坏稳定性，保证 `rankHits` 是**全序**，单测可断言「打乱输入顺序结果一致」；④ 用 `Array.prototype.sort` 时仍要求返回新数组、不修改入参。

**后果**

- `rankHits` 是唯一排序入口；`matchDirections`、`computeTalentDirectionMatches`、`recommendDirections`、M3 的快照冻结/预览都调用它，禁止页面或路由另写排序。
- 典型平手链写进 spec §4.3 表与单测 UT-M4-10~12：`1/2` 与 `2/4` 命中率相同 → 配置条数 4 在前；`2/2` 与 `2/3` → 命中率高的在前；全平手 → 编码升序。
- `hitRate` 仍以原始比值输出/冻结（展示用），但**不用于比较**；M7 展示「N/M 项命中」即可，百分比可选。

---

## D3 · 快照输入/输出与版本边界：M3 冻结、M4 只算不写

**背景**

BR-03 要求「发布即冻结：要素结果、固定注解、六册开放范围、方向命中与档位；后续配置调整不回写历史报告」。M3 拥有 `talent_reports` 集合与发布/撤回/恢复/补发状态机，M4 拥有命中算法。两边并行开发，必须先把接口冻结，否则 M3 的 `directionSnapshot` 与 M4 的纯函数会各写一套。M3 也明确：补发只追加新增册、原分册内容不变；恢复沿用原快照；「按当前配置重新生成快照」是显式动作。

**选项**

1. M4 自己在 C 端每次按当前配置实时计算命中（不依赖快照），M3 快照只存展示文本。
2. **M3 冻结 `factorSnapshot`（含 `levelOrder`）与 `directionSnapshot`（全部已评估方向 + levelOrders/tiers/limits）；M4 提供「全量计算/补发增量/读取推荐」三个纯函数；C 端只读快照；M4 不写报告集合、不改 snapshotVersion。**
3. M3 只冻结果要素，方向命中由 M4 在 C 端实时重算。
4. M4 直接把 `directionSnapshot` 写进报告，M3 只读。

**结论**

选 2（已与 architect-m3 对齐）。理由：选项 1/3 会让配置调整回写历史报告，直接违反 BR-03，且 C 端推荐随配置漂移、无法复现验收；选项 4 越过 M3 的集合与版本所有权，两个模块同时写 `talent_reports` 必然冲突。选 2 的边界是：M3 决定何时算（发布/补发/恢复/显式重算）与版本号，M4 决定怎么算；输入只依赖 3 个字段（`code/levelCode/levelOrder`），其余字段（名称、注解、分册、条件）M4 透传不消费。

**后果**

- 输入契约（M3 spec §3.2.1 / 本 spec §3.1）：M3 每项冻结 `{code, name, category, categoryName, volumeId, bookCode, chapter, levelCode, levelName, levelOrder, score, note, condition}`（`condition` 为字符串）；`levelOrder` 缺失时 M4 降级按当前 `talent_levels.sortOrder` 反查，并标 `levelOrderSource:"current"`（仅兜底，M3 必须冻结）。
- 输出契约（M3 spec §3.2.3 / 本 spec §3.3）：`directionSnapshot = {version, at, operatorId, operatorName, recommendLimit, selectionLimit, levelOrders, tiers[], directions[]}`；`directions[]` 返回**全部已评估方向**（含 0 命中、含未进推荐前 5 的），每方向 10 键、每 requirement 8 键（`code/level/factorName/factorLevel/actualOrder/needOrder/met/gap`），诊断字段（`levelDisabled/factorMissing/warnings`）不落快照；推荐上限只在读取时截断，这样后台「发布时 vs 当前配置」可以逐方向 diff，且客户若改上限无需重新冻结。
- 三个纯函数：`computeTalentDirectionMatches`（发布/显式重算，全量）、`refreshDirectionSnapshot`（补发增量：只重算 `affectedFactorCodes` 的 requirement，其余原样复制，重排序，envelope 可覆盖）、`recommendDirections`（C 端读取，不落库）。恢复不调任何计算函数（M3 沿用快照）。
- **M4 不写报告集合**：选择/换档/取消只改 `selections` JSON；版本记录由 M3 的 `recordTalentReportVersion(reportId, entry)` 写入（`entry={type:"selection", summary, operatorId, operatorName?}`，`version/at` 由 M3 helper 按当前 `snapshotVersion` 填充），`snapshotVersion` 不变。这样「方向与档位变更追加版本记录」的报价/原型口径满足，同时不污染发布版本号。
- 显式「按当前配置重新生成快照」是唯一允许回写旧要素命中的动作（M3 详情页按钮），M4 只负责全量重算函数。
- 报告读取/归属 helper 由 M3 导出（`getTalentReportById` / `assertTalentReportPublished` / `getTalentReportClientSnapshot`），M4 不私建报告读取（避免两套归属校验）。

---

## D4 · 0 命中回退：快照有方向则全部可列（受上限 5）、快照无方向则空态并可自填

**背景**

BR-09（L105）：「没有匹配也可选：报告可读但 0 命中时列出全部已配置方向并标「暂无匹配」；发布快照里没有任何方向时推荐页为空，家长可从后台方向中自选或自己填写（≤10 字）」。C 端 §7.7（L385–386）又写「推荐方向按命中条数降序，最多 5 个」「0 命中：列出全部后台方向，标暂无匹配」「快照无方向：空态」。原型 `pages-mini.js` 的实现是：`hitDirs.length ? hitDirs : source` 后统一 `.slice(0, recommendLimit)`，即**先回退、再截断 5**。两条 PRD 条文在「列出全部 vs 最多 5」上存在字面冲突。

**选项**

1. 0 命中时列全部启用方向，**不截断**（严格按 BR-09「列出全部」）。
2. **0 命中时把全部启用方向作为候选，但仍受推荐上限 5 截断**（与原型一致），页面文案说明「以下为可选方向（前 5 个），也可自己填写」。
3. 0 命中时只列前 5 个命中率最高的方向（不复用回退列表）。
4. 0 命中直接空态，只允许自填。

**结论**

选 2。理由：与 2026-09 客户已确认的原型一致；C 端一屏展示 5 张方向卡是版式与「最多 5 个」的验收口径；「列出全部」在交互上仍需上限，否则 6+ 方向会无限下拉，与 §7.7「最多 5」冲突。选项 1 会让 C 端违反自身验收；选项 4 违反 BR-09「没有匹配也可选」；选项 3 无意义（命中都是 0，没有「最高」）。该取舍作为待客户确认项（spec §13 C1）记录，**改动只在读取层截断**，不影响算法、快照与已选数据。

**后果**

- `recommendDirections` 返回 `{items, fallback, totalCandidates, emptyReason}`；`fallback=true` 时每项标 `fallback:true`，M7 显示「暂无匹配」。
- 两种不同空态必须区分：① 快照有方向但全 0 命中 → 回退列 5 个；② 快照 `directions=[]`（发布时无启用方向）→ `items=[]`、`NO_DIRECTIONS`、页面「暂无可推荐方向，可自己填写」；③ 有方向但全部停用/0 配置/无启用档位 → `items=[]`、`NO_ENABLED_DIRECTIONS`（后台预览给警告）。
- 自填不依赖快照方向：快照为空时仍可自填（档位取当前启用档位），因此「推荐为空」不等于「不能选」。
- 页面不得自行把 0 命中方向过滤掉（否则「没有匹配也可选」失效）；过滤/截断只在读取函数里做一次。

---

## D5 · 自定义方向：新集合承载待归并、别名不 bump 版本、转正生成停用 stub、历史选择不回写

**背景**

PRD §6.3 L215：「家长自填方向进入「待归并」，可归并到正式方向（写别名）或转为正式方向（生成停用方向待配置）。原型当前无页面入口，正式版需补入口（见 13.4/13.3）」。原型用 `manualDirections` 本地数组（status 待归并/已归并/已转正式、count），归并时 `direction.aliases.push(name)`；转正时调 `createDirection` 生成 `status:"停用"、requirements:[]、tiers=启用档位` 的方向。M1 已把 `aliases` 作为 `talent_directions` 的 JSON 字段交付；`talent_directions` 的保存校验要求 ≥1 requirement、≥1 档位、`defaultTierId ∈ tierIds`。需求必须在「只落 `talent_*`、不改 M1 已交付实现、PRD §13.3 待定入口」下落地。

**选项**

1. 不加集合：从 `talent_reports.selections` 里筛 `manualName` 派生出待归并列表，状态用 selection 上的 `merged` 字段临时表达。
2. **新集合 `talent_direction_requests`（一行一次提交，含 reportId/parentId/manualName/tierId/status/targetDirectionId）**；归并写 `aliases` 且不改方向 version；转正生成停用 stub；历史 selections 不回写。
3. 复用 `talent_directions` 本身：自填直接生成停用方向，归并就是把停用方向合并掉。
4. 新建独立「自定义方向」集合，与 `talent_directions` 平行维护。

**结论**

选 2。理由：选项 1 无法表达「已归并/已转正式」状态与操作人审计，且混合写报告 selections 会让 M3 的 `selections` 语义变复杂（M3 已明确只存 `requestId/manualName`，不写请求集合）；选项 3 会让每个自填都进方向列表、污染 7 列验收与方向编码唯一性；选项 4 制造两套方向真源。新集合只放「提交事实 + 处理状态」，方向仍是唯一正式实体；单行唯一键 `(reportId, manualName) WHERE status="待归并"` 防重复提交。

**后果**

- 归并：目标方向必须存在且启用；`manualName` 写入 `aliases`（去重；全局唯一，不得与其他方向别名或方向名称重复，冲突 409）；请求置 `已归并` + `targetDirectionId/mergedAt/mergedBy`；**不 bump `talent_directions.version`**——别名不参与命中算法，`version` 的用途是 M3「发布时 vs 当前配置」对照，别名变更若 bump 会让所有历史报告误报「配置已变更」。
- 转正：生成 `status="0"`（停用）stub：`requirements=[]`、`tierIds=全部启用档位`、`defaultTierId=全局默认档位`、`version=1`、`aliases=[]`、`code` 复用 M1 的 `generateTalentDirectionCode`；**绕过 M1 `POST /directions` 的保存校验**（M1 要求 ≥1 要素/档位，stub 是「待配置」例外），由 M4 的领域函数直接经 admin PB 创建；管理员补齐配置后走 M1 PUT（version+1）。M1 列表需要容忍「requirements 为空」的方向（显示「未配置」），实现时验证 M1 配置弹层能否打开空配置（创建流程本身从空开始，预期可用）。
- 历史 `selections` 不回写：归并/转正后，家长已选记录仍展示选择时冻结的 `manualName`（BR-03 + 与 M3 对齐「以 selections 冻结值为准」）；别名只用于后台溯源/检索。
- 别名不参与命中、不自动匹配、不作为 C 端下拉候选；C 端下拉用 `manualOptions`（正式方向按拼音排序）+「其他（自己填写）」。
- 入口：方向页 `#headerExtra` 增量按钮（唯一触碰 M1 页面的点，需 lead 批准；否则降级独立 URL 页），权限码新增 `talent:direction:merge`（F），不新增 C 菜单。
- 两步写（请求 + selections）无 PB 事务：先 upsert 请求、再写 selections；失败 best-effort 删除新建请求并返回 5xx（已知限制，M9 可加对账）。

---

## D6 · 上限配置：常量 5/3 + 纯函数注入 + 发布时冻结，不落库

**背景**

BR-08 写死「家长端推荐最多 5 个，已选上限 3 个」；PRD §13.3 L655 把「推荐上限 5、选择上限 3 是否按客户运营策略可配置」列为**待定项**。原型把 `directionLimit:3 / recommendLimit:5` 放进配置快照（发布时冻结）。实现需要一个不阻塞当前开发、又不给未来配置化挖坑的方案。

**选项**

1. 硬编码常量，页面与算法各自写 5/3。
2. **常量 + `options` 注入 + 发布时冻结进 `directionSnapshot`**；读取端优先快照值，快照缺失/非法回退常量；不建配置表、页面不可改。
3. 现在就建 `talent_system_configs` 配置表 + 后台设置页，支持运营改上限。
4. 放到 `configs` / `site_config` 全局参数。

**结论**

选 2。理由：选项 1 会让算法/API/页面三处重复数字，改一次要改三处且无法按报告保持一致；选项 3 超出 M4 范围、PRD §13.3 尚未裁决，且引入「配置变更是否回写历史报告」的新问题；选项 4 违反硬约束（业务字段只落 `talent_*`，不得回填 `configs`/`site_config`）。选 2 让当前行为确定（5/3），同时：上限随快照冻结 → 历史报告上限不变、验收可复现；未来客户要求可配置时，只需加配置来源（talent_* 新集合）+ 不改读取契约。

**后果**

- 常量：`TALENT_DIRECTION_RECOMMEND_LIMIT = 5`、`TALENT_DIRECTION_SELECTION_LIMIT = 3`（`shared/types/talent-direction.ts` 或 match util 导出）；`matchDirections`/`recommendDirections`/`resolveDirectionSelection` 都通过 options 接收，不直接读常量。
- 发布时 `computeTalentDirectionMatches` 把生效值写进 `directionSnapshot.recommendLimit/selectionLimit`；C 端读取用快照值（合法整数：推荐 1–20、选择 1–10，非法回退 5/3）；后台预览用当前常量。
- 不提供任何修改上限的 API/页面；PRD §13.3 裁决为「可配置」时，新 ADR 说明配置集合与生效时点（建议新报告生效、历史快照不变），并同步改 M3/M7 契约。

---

## 附：被否决的备选小结

| 决策 | 主要否决理由 |
| --- | --- |
| D1 加权达成度 / 全满足 AND / 命中率按 158 分母 | 违反 BR-08「每条计 1」「不设权重」；AND 无法展示部分命中；158 分母与「配置条数」排序键冲突 |
| D2 浮点命中率比较 / `localeCompare` 编码 | 跨环境不可复现，平手判定依赖浮点舍入；编码无拼音语义 |
| D3 C 端实时重算 / M4 写报告快照 | 违反 BR-03 冻结；两模块同时写 `talent_reports` 必然冲突；历史不可复现 |
| D4 0 命中列全部不截断 / 直接空态 | 违反 C 端「最多 5 个」版式；空态违反「没有匹配也可选」 |
| D5 从 selections 派生 / 自填即建方向 / 双集合 | 无法表达处理状态与审计；污染方向 7 列与编码唯一性；两套真源 |
| D6 硬编码 / 立即建配置表 / 用 `configs` | 三处重复、改不动；超范围且引入回写问题；违反「业务字段只落 `talent_*`」硬约束 |
