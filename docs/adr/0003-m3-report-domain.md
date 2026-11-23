# ADR 0003 · M3 报告域关键决策

| 项 | 内容 |
| --- | --- |
| 状态 | 已接受（2026-11-16，architect / task-10；待 lead 复核） |
| 日期 | 2026-11-16 |
| 决策人 | 架构师 teammate（task-10） |
| 关联 | [M3 报告域规格](../specs/M3-reports/spec.md)、验收 [acceptance.md](../specs/M3-reports/acceptance.md)、[M1 规格](../specs/M1-rules/spec.md) / [ADR 0001](0001-m1-rule-domain.md)、[M2 规格](../specs/M2-members/spec.md) / [ADR 0002](0002-m2-member-domain.md)、PRD §6.6（L258–300）/ §8.2（L470–490）/ §8.3（L522–533）/ §9（L539–557）/ §10（L581–590）/ §12（L604–616）、BR-02–06/09/10/12（L96–110） |
| 影响范围 | `scripts/setup.mjs`、`scripts/sync-talent.mjs`、`shared/types/talent-report.ts`、`server/utils/talent-report*.ts`、`server/utils/talent-gene-report*.ts`、`server/api/admin/talent/reports/**`、`server/api/admin/talent/gene-reports/**`、`app/pages/admin/talent/reports/**`、`app/composables/api/useTalentReportApi.ts`、`app/composables/useMenuTree.ts`、菜单/权限种子 |
| 并行对齐 | M4 架构 2026-11-16 确认：`factorSnapshot` 含 `levelOrder`；`directionSnapshot` 对象信封 + `operatorId/operatorName`；`selections` 结构；`recordTalentReportVersion` helper；补发用 `refreshDirectionSnapshot` 增量重算。M2 确认：`subjectId` 即子女/家长 id、解密/脱敏/HMAC 复用 M2、解绑不删档 |

> 本文沿用 ADR 0001/0002 的「背景 / 选项 / 结论 / 后果」写法；D1–D8 为实现合同，spec 中不再重复论证。

## D1 · 快照存 JSON 字段，不建子表；外部原始篇目存基因报告 `sections`

**背景**

PRD §8.2 要求报告冻结 `factor_snapshot` / `volume_snapshot` / `direction_snapshot` / `selections` / `versions`；现有旧实现是 `talent_reports`（主表）+ `talent_report_items`（每个要素一行，关系指向旧 `talent_elements`/`talent_categories`/`talent_cultivation_contents`）。新报告域的读取模式是「整份读」：后台详情一次展示 4 页签、C 端按报告/分册整体读取、发布时整份冻结；没有任何「按单个要素跨报告查询/更新」的需求。

同时，发布前需要外部报告的「章节 + 要素 + 分级」原始结果来构建快照与方向预览；PRD 的 `gene_report` 只给了元数据字段，没有要素明细表。

**选项**

1. **快照 JSON 字段**：`factorSnapshot` / `volumeSnapshot` / `directionSnapshot` / `selections` / `versions` 全部存在 `talent_reports`；外部原始篇目存 `talent_gene_reports.sections` JSON。旧 `talent_report_items` 保留给旧行，新代码不写。
2. 继续用子表：新增 `talent_report_factor_snapshots` / `_volume_snapshots` / `_direction_snapshots`，每个要素/方向一行。
3. 快照 JSON + 子表混合：要素明细走子表，册/方向走 JSON。
4. 复用旧 `talent_report_items` 存新要素（加 `subjectType` 等字段）。

**结论**

选 1。理由：

- 读取模式决定结构：四页签与 C 端都是整份读取，JSON 一次查询即可返回；子表要 N+1 次查询或多次 expand，且发布时「整份写入」需要多表事务式补偿（旧 `generateTalentReport` 就是「先删后建 + 失败回滚」的脆弱模式）。
- 快照是**不可变整体**：JSON 一旦写入不再逐项更新；子表逐行更新反而更容易被误改（任何一次 UPDATE 都可能破坏「发布即冻结」）。JSON 写入是「整字段替换」，语义更接近冻结。
- 子表会引入关系指向 M1 规则集合（旧实现指向 `talent_elements`），导致「改规则 = 改历史报告」的隐性耦合；JSON 存冻结的编码/名称/分级/注解，物理隔离。
- 外部原始篇目放基因报告 `sections`：它是「外部镜像」，可被同步刷新，且发布前需要；放报告上会让「未发布报告」提前承担快照语义，也会在刷新时误改快照。
- 规模可控：单报告要素 ≤ 158（六册）、方向 ≤ 数百、册 6 个，JSON < 300KB；PB `json` 字段可存。
- 选项 4 会让旧集合长期承载两套语义（旧 `elementId` 关系 + 新 `subjectType`），且旧行与新行在同一集合里混排，与 ADR 0001 对 `talent_levels` 的教训一致（双语义期必须显式过滤，能避免就避免）。

**后果**

- `talent_reports` 新增 6 个 JSON 字段（`factorSnapshot`/`volumeSnapshot`/`directionSnapshot`/`selections`/`versions`/`openVolumeIds`）+ 3 个快照元数据字段（`factorCount`/`snapshotVersion`/`snapshotAt`）；旧 `talent_report_items` 保留、不写、M6 删除。
- 读接口分层：列表不返回快照；详情只返回册摘要 + matching diff；单册叠加层 `GET /reports/:id/volumes/:volumeId` 按需返回要素；避免一次传输整份快照。
- 快照写入前深拷贝，读接口返回深拷贝；服务层禁止把 PB 记录对象直接复用。
- `factorSnapshot` 与 `volumeSnapshot` 存在展示冗余（同一要素两处），以 `factorSnapshot` 为唯一事实源，构建时由它生成 `volumeSnapshot`；写入同一动作完成，读时交叉校验。
- 若 M9 性能验收发现 JSON 过大：先做「按册拆分读取」（已预留单册接口），再评估归档/压缩，不改结构；拆子表需新 ADR。

## D2 · 一人一份：`talent_gene_reports` 与 `talent_reports` 各按 `(subjectType, subjectId)` 唯一

**背景**

BR-02（L96）「基因报告一人一份：一个测评对象（本人或子女）只有一份报告，重复查询只刷新状态，不重复建档」；BR-05（L101）「增量分册：外部可能先出 2 册、后补 3 册」。两者需要同时成立：报告对象唯一，分册在对象内追加。旧 `talent_reports` 按 `customerId`（旧会员）归属，且每次第三方同步都可能生成多条；旧 `talent_report_receipts` 靠 `externalReportId` 去重，没有「一人一份」约束。

**选项**

1. **新建 `talent_gene_reports`（外部元数据，一人一份）+ `talent_reports` 增量加归属字段（一人一份）**；两个集合都以 `(subjectType, subjectId)` 唯一；分册在报告内用 `books` / `openVolumeIds` 追加。
2. 只建一个集合（把外部元数据塞进 `talent_reports`），不建 `talent_gene_reports`。
3. 每次外部出册都建一条 `talent_reports`（一人多份），发布时再合并。
4. 保留旧 `customerId` 归属，新增 `subjectId` 作为辅助字段。

**结论**

选 1。理由：

- 外部元数据与发布态是两种生命周期：基因报告随外部同步刷新（`books`/`sections`/`syncedAt`），报告快照在发布后冻结；拆两个集合后「刷新同步不改快照」是物理保证（D4/D5）。
- 一人一份靠部分唯一索引 `(subjectType, subjectId) WHERE subjectType != ""` 强制；旧行 `subjectType=""` 被排除，可共存到 M6（D6）。
- 分册追加是报告内数组操作，不新增行，因此 `snapshotVersion` 语义清晰（D5），列表「新增分册 = 外部已出 − 已开放」可由两集合直接计算。
- 选项 2 会让同一行既被同步刷新又被冻结，边界靠代码纪律维持，容易在「刷新时顺手更新报告」上出错；选项 3 与 BR-02 直接冲突，也会让 C 端「一份报告」变成合并逻辑；选项 4 无法表达 `self`/`child` 多态，且旧 `customerId` 对新档案无映射（ADR 0002-D1 已确认不迁移）。

**后果**

- 唯一键：`talent_gene_reports(subjectType, subjectId)`、`talent_reports(subjectType, subjectId) WHERE subjectType != ""`；`reportNo` 两个集合都全局唯一，新建时 `报告.reportNo = 基因报告.reportNo`。
- `subjectType`：`child`（M3 同步对象）/ `self`（结构保留，C2 未决）；`subjectId` 为 M2 的 `talent_children.id` / `talent_parents.id`，M2 解绑不删档保证历史报告可追溯。
- 同步 upsert 按唯一键；重复同步不会新建行；「一人多份/复测」若客户确认，需新 ADR 改唯一键（如加 `reportCycle`）并迁移。
- 旧行与新行共存：新列表 `subjectType != ""` 过滤；旧行 `customerId` 保持；M6 清理。

## D3 · 增量分册：外部编码 `A–F` ↔ 内部 `V1–V6` 固定映射；新增 = 外部已出 − 已开放；补发只追加

**背景**

BR-04（L100）「固定六册：A~F 对应生长发育、智商、情商、领导商、艺术商、体育运动商；发布时逐册勾选开放范围」；BR-05（L101）「新增 = 外部已出篇目 − 已发布分册；补发只追加新增册，原分册内容不动」；PRD §8.2 又写 `books` 是「外部已出分册编码（如 ABCDE）」、`open_volume_ids` 是「已开放分册（V1~V6）」。外部编码是字母、内部开放标识是 V 号，必须给出映射；且「分册内容」与「方向命中」在补发时的更新范围需要明确。

**选项**

1. **外部 `A–F` ↔ 内部 `V1–V6` 一一固定映射（V1=A 生长发育 … V6=F 体育运动商）**；`books` 存外部字母串、`openVolumeIds` 存 V 号；新增按字母差集计算；补发只追加新增册的 `volumeSnapshot`/`factorSnapshot`，`directionSnapshot` 用 M4 增量重算（旧要求命中原样复制）。
2. 统一用外部字母（`openVolumeIds` 也存 `A–F`），不引入 V 号。
3. 统一用内部 V 号（`books` 也存 V1–V6），对外接口再转字母。
4. 补发时全量重算方向快照（旧要求命中也可能变化）。

**结论**

选 1。理由：

- PRD 同时使用两套编码（列表/弹层用字母、`open_volume_ids` 用 V1–V6），验收文档会按两套口径核对；固定映射表能满足双方，且映射只在服务层一处常量，客户若换编码只改适配层。
- 选项 2 会让 `open_volume_ids` 与 PRD §8.2 不符，验收时需解释「PRD 写错」；选项 3 会让列表/导出/外部对齐都要反查，且外部接口给的是字母。
- 补发用**增量重算**而非全量重算：BR-03「后续配置调整不回写历史报告」要求旧要素的命中不被当前配置回写；全量重算会把「发布后改过的方向配置」应用到旧册要素上，等于静默改历史。增量语义（M4 `refreshDirectionSnapshot`）只让新增册要素参与，旧要求结果复制，既满足「新增册可读、参与命中」，又不回写旧册。
- 补发的 `volumeSnapshot` 只追加新册，旧册 JSON 原样保留（AC-ADM-06-4 硬要求）。

**后果**

- 映射常量：`V1=A 生长发育 / V2=B 智商 / V3=C 情商 / V4=D 领导商 / V5=E 艺术商 / V6=F 体育运动商`；集中在一个导出常量，列表、发布、补发、C 端共用。
- `books` 规范化：大写、升序、去重、1–6 位；`openVolumeIds` 为 V 号数组；两者差集即「新增分册」。
- 发布只能勾选「外部已出且有要素」的册；未出册在弹层置灰并提示「外部暂无此册」。
- 补发只允许 `status="published"`；撤回态需先恢复；补发后 `openVolumeIds ∪= 新增册`、`snapshotVersion+1`、`versions` 追加 `reissue`；旧册 `volumeSnapshot` 与旧要素 `factorSnapshot` 逐项不变（验收用 JSON hash 对比）。
- 已发布报告不追外部对旧册的修订（BR-03 发布即冻结）；如需追修订，只能显式「重新生成快照」或另立「报告重同步」任务（M3 不做，记入风险 R11）。

## D4 · 同步：预演 + 确认两次请求、三类归因 + 单条失败、幂等靠唯一键、日志落 `talent_sync_logs`

**背景**

PRD §6.6「一键同步全部报告：以子女身份证号为主键批量拉取；弹层预演『刷新同步 / 新建报告 / 外部暂无数据』三类人数与逐人明细，确认后写入，写同步日志与操作日志」。现实约束：外部接口可能慢/超时/单条异常；同一批数据可能被重复点同步；预演与确认之间外部数据可能变化；M3 期间外部源是 Mock，M8 才接真实接口。旧实现 `syncTalentReportsFromThirdParty` 是「拉全量 + 按 `externalReportId` 去重 + 生成报告」，无一人一份、无三类归因、无逐人明细。

**选项**

1. **无状态两次请求**：`POST /reports/sync` 带 `mode=preview|commit`；preview 只读、不落任何数据；commit 重新枚举/重新拉取后写入；幂等靠唯一键与「已存在则刷新」；日志落 `talent_sync_logs`（扩展逐人明细）。
2. 服务端保存预演计划（批次表/内存 token），commit 按计划执行。
3. 一次请求直接写入（无预演）。
4. 复用旧 `talent_report_receipts` 做预演/接收记录。

**结论**

选 1。理由：

- 批次表会新增集合（M3 只允许 3 个集合变动，且 M6 要清理）；内存 token 在单实例可行但会持有 PII（身份证/手机号明文或外部报文），TTL/重启/并发清理都是额外风险。
- 无状态两次请求的「预演与提交可能不一致」是可接受且可解释的：commit 以最新外部数据为准、响应 `changedSincePreview` 提示；写入始终幂等（唯一键 + 状态校验），不会因为中间变化产生脏数据。
- 三类归因是验收口径，必须由服务端计算并返回逐人明细；单条失败不能中断整批（外部服务常见部分失败），因此单独 `failed` 桶 + 日志 `partial` 状态。
- 日志扩展 `talent_sync_logs` 而不是新建集合：旧集合已有触发/计数/明细字段，扩展成本最低；`syncScope` 区分旧「第三方结果同步」日志。
- 选项 4 的 receipt 是「接收即生成报告」的旧模型，与新同步（先预演后提交、元数据+报告分离）语义冲突，且 M6 要删除。

**后果**

- `talent_sync_logs` 加 `syncScope/mode/refreshed/created/empty/subjectDetails/operatorId`；`status` 新增 `partial`；commit 写 1 条同步日志 + 1 条操作日志；preview 零写入（测试断言前后行数与 `updated` 不变）。
- 幂等：重复 commit 对同一对象只刷新不新建；同一 `(subjectType,subjectId)` 唯一键兜底；`reportNo` 冲突记单条失败并提示核对。
- 并发：commit 全局锁 `gene-report-sync`（复用 `withTalentReportLock`），第二个 commit 409；preview 不加锁。
- 外部源冻结接口 `TalentGeneReportSource`，M8 只换实现；Mock 五模式覆盖验收；生产默认 Mock 时 env-check warn。
- 失败明细脱敏（姓名 + 脱敏身份证 + 报告编号 + 错误摘要），不落外部报文与堆栈。

## D5 · 版本链：`snapshotVersion` 只在快照内容变化时 +1；`versions[]` 记录全部动作

**背景**

PRD §8.3「发布 → 已发布；补发新增分册 → 已发布（版本+1，分册增加）；撤回 → 已撤回；恢复 → 已发布」；BR-03「发布即冻结…重新发布/补发/恢复才产生新版本」；报价单/原型「方向与档位变更均自动追加版本记录」「显式重算只更新指定报告、写版本历史与操作日志」。这三处对「版本」的口径不完全一致：恢复到底算不算新版本？方向选择要不要进版本历史？重新生成快照算不算？

**选项**

1. **`snapshotVersion` = 快照内容版本**：发布 1、补发 +1、显式重算 +1；撤回/恢复/方向选择**不改**；`versions[]` 记录所有动作（publish/withdraw/restore/reissue/regenerate/selection），条目带动作时版本号。
2. 每个动作都 +1（撤回/恢复/选择也算新版本）。
3. 恢复按 BR-03 字面 +1 并重算快照。
4. 不建版本历史，只留 `oper_logs`。

**结论**

选 1。理由：

- 恢复的验收口径是「沿用原快照恢复，C 端重新可见」（AC-ADM-06-3）；若恢复 +1 或重算，会让「恢复后内容与撤回前一致」无法保证，也让 C 端读到不同内容。
- 方向选择不改变快照内容（方向命中/要素/册都没变），+1 会让 `snapshotVersion` 失去「内容版本」语义；但报价单要求「方向与档位变更均自动追加版本记录」，因此**追加 `versions` 条目、不改版本号**，同时 `oper_logs` 留操作人与动作。
- 「重新生成快照」是唯一显式允许回写历史的动作（PRD §6.6 详情页按钮），必须 +1 + 版本记录 + 二次确认 + 审计，否则无法区分「历史冻结」与「人工重算」。
- 版本记录不落 `oper_logs` 替代：`oper_logs` 是全局审计，报告详情需要按报告展示动作时间线，必须有报告内 `versions`。

**后果**

- 字段：`snapshotVersion`（number，发布前 0）、`snapshotAt`、`versions[]`（`{version,type,summary,books?,operatorId,operatorName,at}`，≤200 条）。
- 动作矩阵：发布 v1；撤回/恢复/选择不改版本；补发/重算 +1；刷新同步不改。
- M4 的选择/换档/取消调 M3 `recordTalentReportVersion` 追加 `selection` 条目；M4 不直接写 `versions`、不改 `snapshotVersion`。
- 所有写动作在 `withTalentReportLock("report:"+id)` 内串行，避免版本号竞争与双击重复。
- 报告详情展示 `versions` 末条；完整版本历史页签在 M6 原型口径中曾出现，M3 不单开页签（PRD 详情 4 页签不含版本历史），只作为详情数据返回 + 操作日志可查；如客户要求独立版本历史页签，另立小任务。

## D6 · 旧数据过渡：`talent_reports` 增量改造、`customerId` 只读、旧集合/旧页/旧码保留到 M6

**背景**

现网 `talent_reports` 被旧后台页（`[resource].vue`）、机构端、旧 PDF、旧接收/同步页、e2e 使用；`customerId` 是 `required` 关系指向旧 `talent_customers`（ADR 0002 已确认旧会员不迁移，新档案与旧 `customerId` 无映射）。M3 要复用 `talent_reports` 承载新报告（PRD §8.2 `report` 与旧集合同名），不能新建第三个报告集合（会与 M2 的 `countTalentMemberReports` 特性探测、旧页、M6 清理三处冲突）。

**选项**

1. **增量改造**：保留旧字段/旧行/旧索引，只加新字段与新索引，把 `customerId` 的 `required` 放宽为 `false`；新行 `customerId=""`；新代码不读不写；旧页/旧接口/旧码保留到 M6。
2. 新建 `talent_gene_reports` + `talent_report_published`（新集合），旧 `talent_reports` 不动。
3. 原地迁移旧行到新结构（回填 `subjectType/subjectId`）。
4. 先删旧集合/旧页再上新的。

**结论**

选 1。理由：

- M2 的 `countTalentMemberReports` 已按「`talent_reports` 出现 `subjectType/subjectId` 字段」做特性探测（M2 spec §8），M3 增量改造后会员列表「关联报告」自动生效；新集合会让 M2 代码白写、还要改 M2。
- `sync-talent.mjs` 的定位是「只加不删 + 放宽必填」，ADR 0001-D1 已把「放宽必填」列为允许动作；放宽 `customerId` 是新行可写的最小改动，旧行值不变、旧页 expand 行为不变（旧行仍有 `customerId`）。
- 旧数据只有旧 `customerId`，与 M2 新档案无映射；回填需要「猜」或重采，ADR 0002-D1 已否决；旧行保留到 M6，新页按 `subjectType != ""` 过滤即可共存。
- 选项 2 会让「报告」有两个集合、M6 清理与 C 端读取都要跨集合，且与 PRD §8.2 命名不一致；选项 3 不可行（无映射）；选项 4 违反「旧页保留到 M6」与只加不删门槛，会打断 M3 前旧报告链路。

**后果**

- `sync-talent.mjs` 对 `talent_reports` 只做：加 15 个新字段、加 5 个新索引、`customerId.required=false`；不删旧字段/旧索引/旧行。
- 新行写入必须满足旧非空字段：`reportType="gene_report"`、`title="{对象名}·基因报告"`、`reportNo` 来自基因报告、`status` 三态之一；`totalItems` 镜像 `factorCount`（仅兼容旧页显示）。
- 新列表/详情/写接口全部按 `subjectType != ""` 过滤；旧行不会出现在新页；旧页（平台管理员）可能看到新行（字段不全），属已知过渡（spec R3），M6 删除旧页。
- 旧集合 `talent_report_items/publications/receipts/templates*` 不读不写、不删；旧权限码 `talent:report:revoke/edit/receive` 保留在册但新路由不校验。
- M6 清理清单：旧行、`customerId` 字段、旧集合、旧页、旧路由、旧码、旧 e2e；清理按 ADR 0001-D1 的迁移流程（备份 + 人工确认）。

## D7 · 权限码与菜单：权威 4 码、`publish` 聚合五动作、菜单重指向、旧码保留

**背景**

PRD §9 报告分组使用 `report:list/view/publish/sync`，其中发布、撤回、恢复、补发**共用 `report:publish`**；现网已有 `talent:report:list/view/publish/revoke/edit/receive` 六码与旧 F 菜单行，菜单「基因报告」在 M2.0 已建立但暂指旧页 `/admin/talent/report`。M3 需要新的区分（同步独立码）与旧码共存。

**选项**

1. **权威 4 码**：`talent:report:list/view/sync/publish`；`publish` 覆盖发布/撤回/恢复/补发/重算；新增 `sync`；旧 `revoke/edit/receive` 保留在册但新路由不校验；菜单「基因报告」重指向 `/admin/talent/reports`，F 行按动作新增/复用。
2. 为撤回/恢复/补发/重算各加独立码（`revoke/reissue/regenerate`）。
3. 复用旧 `revoke` 给撤回，新增 `reissue` 等。
4. 新旧码并存，新路由同时校验新旧两套（任一满足）。

**结论**

选 1。理由：

- PRD §9 已明确撤回/恢复/补发用 `report:publish`；拆细码会增加角色配置复杂度（M6 才建三角色），且目前只有一个运营角色需要这些动作。
- `sync` 必须独立：一键同步会批量写外部数据与日志，风险与「发布某一份」不同，客户可能只给运营发布权、不给批量同步权（PRD §9 也是 `report:sync`）。
- 旧码不复用于新动作：`talent:report:edit` 是「上传 PDF」，如果拿来当发布码，会让「能上传文件」隐式等于「能发布报告」，权限语义污染。
- 选项 4 会让「旧码」长期有授予价值，M6 删除时又要收回，且审计无法判断走的是哪套码。

**后果**

- 4 个权威码；`talent:report:publish` 有 3 条 F 菜单行（发布 / 撤回恢复补发 / 重新生成快照），断言「码存在 ≥1 条」而非唯一；`sync` 1 条 F；`view`/`list` 复用旧行。
- 菜单重指向：按 `path="/admin/talent/report"` 找旧 C 行，改 `path/component/permissionCode`，保留行 id 与 `role_menus`；`useMenuTree.ts` 的 `TALENT_PATHS` 加 `/admin/talent/reports`。
- 旧码/旧 F 行保留 active 到 M6；旧页无入口；旧码不被新路由校验。
- `sync-talent.mjs` 出口断言：4 码均有 C/F 行、`基因报告` C 菜单唯一、旧 `/admin/talent/report` 无 C 菜单；`报告接收`/`同步配置` 保持隐藏。
- 三角色正式授权（运营/审核员/规则配置员）归 M6；M3 验收用 `admin/superadmin`，审核员只读+发布用临时角色验证。

## D8 · 模块契约边界：M4 纯函数、M5 派生可见性、M7 C 端页面、M8 PDF/真实源、M6 清理

**背景**

M3 与 M4 并行开发；M5（建议）、M6（清理）、M7（C 端）、M8（PDF/真实外部接口）都依赖报告域，但没有一个模块可以等另一个完全做完再开工。需要明确「谁写什么、谁读什么、跨越边界时用什么契约」，避免并行阶段互相改集合/重复实现/双写。

**选项**

1. **M3 拥有报告集合与快照；M4 只出纯函数与 selections 写入；M5 以报告状态派生建议可见性、不写报告集合；M7 实现 C 端页面与只读路由、消费 M3 冻结契约；M8 只换同步源实现并做 PDF；M6 清理旧代码。**
2. M3 同时实现方向算法与建议联动（提前吃掉 M4/M5）。
3. M3 只做后台发布，C 端接口也归 M3（M7 只做静态页面）。
4. 各模块各自建报告只读视图/缓存，互不依赖。

**结论**

选 1。理由：

- M3 与 M4 并行、M4 纯函数是命中算法的唯一实现，M3 只调用能保证「报告快照里的命中」与「方向页预览的命中」同源；若 M3 自己实现一套，必然出现两套排序/上限口径。
- M5 的 BR-06「建议与报告同发」若让 M3 双写建议状态，会重演 M2 D4 的「双真源漂移」；以报告状态为派生真源，撤回/恢复天然一致，M5 不需要监听 M3。
- C 端两页面（M7）与后台发布（M3）共用快照，但页面交互/状态卡/对象切换是 M7 的范围；M3 若把 C 端路由也做完，会与 M7 页面同期返工（M2 已用「M2 冻结 bindings 契约、M7 做页面」验证过这个边界）。
- M8 的 PDF 需要快照作为渲染输入，但 PDF 生成/存储/时效/Mock→真实源都是 M8 的范围；M3 只冻结 `TalentGeneReportSource` 签名。
- 选项 2 把 M4/M5 风险提前压进 M3（7–8 人天已是最重模块），且方向算法需要独立验收（AC-ADM-03）；选项 3 与 M7 职责冲突；选项 4 会出现多份缓存/视图，撤回后不同步。

**后果**

- M4：提供 `computeTalentDirectionMatches` / `refreshDirectionSnapshot` 纯函数与 `tierIds/defaultTierId` 排序；写 `talent_reports.selections`（C 端接口）并调 `recordTalentReportVersion`；M3 提供 `GET /reports/:id/direction-preview` 与读取/归属 helper。M4 不建报告集合、不写快照。
- M5：报告详情第 4 页签只读 M5 数据；建议可见性 = `advice.publishStatus=published && report.status=published`（派生，不双写）；补发是否立即补册归 M5 周期决策。
- M7：实现 `/api/client/talent/reports/:id` 与 `/volumes/:volumeId` 两条只读路由 + 页面；消费 M3 `assertTalentReportPublished` / `getTalentReportClientSnapshot`；不重算快照、不写报告。
- M8：实现 `external` 源 + PDF 渲染/代理；不写报告快照；旧 `pdfUrl/pdfFileKey` 不复用（新字段/集合另立 ADR）；定时同步与重试告警归 M8。
- M6：删除旧页/旧路由/旧集合/旧码/`customerId`/旧 e2e；M3 全程不删。
- C2（家长本人报告）与 C1（C 端只读路由是否提前到 M3）见 spec §14 未决项，默认按本文边界。

## 附 A · 被否决的备选小结

| 决策 | 主要否决理由 |
| --- | --- |
| D1 子表 / 混合 / 复用旧 items | 整份读写成 N+1 与多表补偿；子表逐行更新难保证不可变；关系指向 M1 集合造成改规则污染历史；旧集合双语义 |
| D2 单集合 / 一人多份 / 保留 customerId | 同步刷新与发布冻结生命周期冲突；违反 BR-02；旧 customerId 与新档案无映射 |
| D3 统一字母 / 统一 V 号 / 全量重算方向 | 与 PRD §8.2 字段口径不符；全量重算会回写旧要素命中，违反 BR-03 |
| D4 批次表/内存 token / 一次写入 / 复用 receipts | 新增集合与 PII 驻留；无预演不满足验收；旧 receipt 语义冲突且 M6 删除 |
| D5 每动作 +1 / 恢复 +1 / 无版本历史 | 恢复内容不一致；快照版本语义失效；详情无法展示动作时间线 |
| D6 新建集合 / 回填旧行 / 先删旧 | M2 特性探测失效、M6 清理复杂；无映射无法回填；违反旧页保留与只加不删 |
| D7 细分动作码 / 复用 revoke / 新旧码并存 | 角色配置复杂且 PRD 已定 publish 聚合；权限语义污染；M6 收权成本高 |
| D8 M3 做算法/建议/ C 端 / 各模块自建视图 | 双算法双口径；双真源漂移；与 M7 返工；缓存不同步 |

## 附 B · 实施影响与回滚

- **schema**：`talent_gene_reports` 为新增集合；`talent_reports` 只加字段/索引 + 放宽 `customerId` 必填；`talent_sync_logs` 只加字段。`sync-talent.mjs` 只加不删。回滚 = 删除 `talent_gene_reports` + 删除 `talent_reports` 新字段与新索引 + 把 `customerId.required` 改回 `true`（新行已写入时需先清理新行）+ 还原菜单 path/component/permissionCode 到旧页 + 删除新增的 `talent:report:sync` 码行与新增 F 菜单行（`list/view/publish` 行指回旧页）；旧数据、旧行、旧集合全程未改，回滚不丢旧数据。
- **代码**：回滚 = `git revert` M3 的 `server/api/admin/talent/reports/**`、`gene-reports/**`、`server/utils/talent-report.ts`、`talent-gene-report.ts`、`talent-gene-report-source.ts`、`talent-report-sync.ts`、`app/pages/admin/talent/reports/**`、`useTalentReportApi.ts`、`shared/types/talent-report.ts`、`useMenuTree.ts` 的 `TALENT_PATHS` 一行；旧路由/旧页未改，回滚后旧入口恢复可用。
- **菜单/权限**：旧「基因报告」C 行被重指向；回滚时改回 `/admin/talent/report` / `admin/talent/[resource].vue` / `talent:report:list`，并保留或删除新码行（无角色关联即无副作用）。
- **数据**：已产生的基因报告/新报告/同步日志在回滚时保留（无模块引用时不影响旧链路；旧页可能显示新行，属过渡期行为）；M6 再处置。
- **C 端**：M3 不改 C 端路由/页面（M7 负责），回滚不影响现有 C 端；旧报告接口继续服务旧数据。
- **M4/M5/M8**：M4 的纯函数与 selections 写入不依赖 M3 回滚；M5/M8 未实现，无影响。