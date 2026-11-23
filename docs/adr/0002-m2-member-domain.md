# ADR 0002 · M2 会员域关键决策

| 项 | 内容 |
| --- | --- |
| 状态 | 已接受（2026-11-16，按用户已确认的 Q1–Q10；待 lead 复核） |
| 日期 | 2026-11-16 |
| 决策人 | 架构师 teammate（task-7） |
| 关联 | [M2 会员域规格](../specs/M2-members/spec.md)、[M2 需求分析](../specs/M2-members/requirements.md)、验收 [acceptance.md](../specs/M2-members/acceptance.md)（verifier 后续任务）、PRD §6.2 / §8.2 / §8.3 / §9 / §10 / §12、[ADR 0001](0001-m1-rule-domain.md) |
| 影响范围 | `scripts/setup.mjs`、`scripts/sync-talent.mjs`、`shared/types/talent-member.ts`、`server/utils/talent-member*.ts`、`server/api/admin/talent/{members,children}/**`、`server/api/client/talent/bindings*`、`server/plugins/talent-member-query.ts`、`app/pages/admin/talent/member/**`、`app/composables/api/useTalentMemberApi.ts`、`app/composables/useMenuTree.ts`、菜单/权限种子 |
| 输入决策 | 用户 2026-11-16 确认：Q1–Q5 按分析师建议、Q6–Q10 按默认（见需求 §9）；本文不再把已确认项列为未决 |

> 本文沿用 ADR 0001 的「背景 / 选项 / 结论 / 后果」写法；Q1–Q5 为主决策，Q6–Q10 并入相应决策条目。

## D1 · 旧会员不迁移、不导入导出；旧集合与旧页共存到 M6（Q1）

**背景**

现网会员模型是「一条扁平 `talent_customers` + `childIds`/`childRelations` JSON + `talent_customer_bindings`」，身份证只存 `idCardHash`（纯 SHA-256，不可逆），没有密文。PRD §6.2 只要求单条新建，未列导入/导出；报价单 23、37–38、41–46 有相关条目。旧集合同时被旧报告（`talent_reports.customerId`）、机构端、授权/引流/导入批次等旧代码引用。

**选项**

1. 迁移旧数据（重新采集明文、补密文）并保留导入/导出。
2. **不迁移、不做导入/导出；新建 `talent_parents` / `talent_children` 与旧集合并存，旧集合/旧页/旧码保留到 M6 删除。**
3. 原地改造 `talent_customers`（加 parent/child 字段、保留旧字段）。
4. 新建集合并立刻删除旧集合。

**结论**

选 2。理由：旧身份证只有不可逆哈希，任何「迁移」都等于要求客户重新提供全部证件号，成本与合规风险都高，而 M2 验收不要求历史数据可用，`talent_customers` 仍支撑旧报告/机构端演示；原地改造会让一个集合长期承载两套语义（parent + child），查询、唯一索引与权限都难以收敛；立即删除旧集合会打断 M3 前的旧报告链路，也与 `sync-talent.mjs` 只加不删的定位冲突。

**后果**

- `setup.mjs` 只新增两个集合与索引；`sync-talent.mjs` 只加不删，发现旧集合时不做任何删除；M6 再统一删除 `talent_customers`、`talent_customer_bindings`、`talent_customer_import_batches/_rows`、`talent_customer_leads/_authorizations` 与旧页旧码。
- 旧会员数据无法用于全号查看（无密文）；新档案的三件套一次到位，文档写明不可逆。旧数据不参与新会员列表/筛选，避免两套编号、两套脱敏混排。
- 不做会员导入/导出/受检人标识；「重置数据 / 恢复演示数据」按 BR-14 移除，M2 不提供入口。
- 旧 `talent_reports.customerId` 与新档案无映射，关联报告在 M2 恒为空态（D11）。
- 若客户后续坚持导入历史会员：另立任务（需客户提供明文证件号或接受「仅姓名/手机号、无全号」的降级导入），并新开 ADR。

## D2 · 数据归属：先单 `parentId`，不建关系表（Q2）

**背景**

PRD §8.2 是 `child.parent_id` 单家长模型；现实诉求可能出现「父母双账号共看一个孩子」。旧模型用 `parent.childIds` + 服务层「一孩一有效家长」约束隐含同样的单家长假设。

**选项**

1. **`talent_children.parentId` 单关系，服务层强制一孩一有效家长。**
2. 直接建 `talent_parent_children` 多对多关系表，M2 就支持多家长。
3. 仍用 `parentIds` JSON 数组。

**结论**

选 1。理由：PRD 与 M2 验收都是单家长；关系表会让列表/详情/解绑/查询归属全部多一层 join 与「谁是主家长」二义性，且 C 端 `currentRelationType` 与报告归属要重新定义；JSON 数组无法用关系索引，解绑与一孩一家长校验退化为全表扫描。Q2 已确认：要双账号时再加关系表（+1 人天，需新 ADR）。

**后果**

- `talent_children.parentId` 为 `maxSelect: 1` 关系；解绑置空；重绑换 parentId（D7）。
- 「一孩一有效家长」由 `idNoHash` 全局唯一 + 单 `parentId` 天然保证；服务层只需处理「命中已解绑档案 → 重绑」「命中正常档案 → 409」。
- 未来支持父母双账号时：新增关系表 `talent_parent_children(parentId, childId, relation, isPrimary)`，把 `parentId` 降级为主家长字段或迁到关系表，属破坏性 schema 变更，必须新 ADR + 迁移脚本 + 备份。

## D3 · 账号绑定：`talent_parents.userId` 唯一 + 显式 claim；不建新绑定表（Q3）

**背景**

旧 C 端 `GET /api/client/talent/bindings` 在读请求里创建/更新 `talent_customer_bindings`，并依据手机号命中档案自动建立绑定（历史版本会把命中多个档案全部视为待绑定）；这既是安全缺陷（GET 有副作用、越权读取风险），也让「谁是谁」不可解释。Q3 确认：已验证手机号哈希自动绑定唯一 parent，同号多档拒绝自动绑定、后台合并。

**选项**

1. **`talent_parents.userId` 关系（部分唯一索引，一账号一家长）+ 显式 `POST /client/talent/bindings/claim` 自动认领；GET 只读；不建新绑定表。**
2. 新建 `talent_member_bindings` 表（userId、parentId、isCurrent），GET 里幂等 upsert。
3. 复用旧 `talent_customer_bindings` 指向新档案（加 targetType）。
4. 手动绑定：后台或 C 端输入邀请码/后台分配。

**结论**

选 1。理由：单家长模型下 userId 是 1:1，关系字段足够，省掉一张集合与 `isCurrent` 的并发问题；「当前对象」由 C 端请求参数携带（现有旧代码注释也已是这个方向），不需要服务端持久化；显式 POST 把「读」和「写」分开，直接消除旧 GET 写绑定的安全缺陷。选项 2 会重复用户身份关系、M6 又要清理；选项 3 会让旧集合语义再次漂移；选项 4 与 Q3「自动绑定唯一 parent」冲突，且增加家长操作成本。

**后果**

- claim 规则：`users.phone` 归一化 → HMAC 哈希 → 命中 `talent_parents.mobileHash`；
  - 命中 1 条且 `userId` 空 → 写入 userId，`claim.status = "bound"`；
  - 命中 1 条且已是本账号 → `already_bound`；
  - 命中 0 条 → `no_match`；命中 ≥2 条 → `ambiguous`（不写，返回空 items，提示后台合并）；命中档案已绑定其他账号 → 409 `conflict`；账号无手机号 → `no_phone`。
- GET bindings 只读：测试必须证明连续调用前后记录数不变；任何「顺手绑定」都不允许。
- 一个手机号只建一个家长（`mobileHash` 唯一，409 提示合并）；后台合并动作 M2 不提供接口，人工处理，M6 再做合并工具（如需）。
- `talent_customer_bindings` 只读封存，M2 不写入，M6 删除；旧 C 端页面在新契约下不可用属已知迁移期状态（D11）。
- 账号状态（`users.status`）归 M6，家长状态不受账号状态影响、也不双写（D4）。

## D4 · 停用唯一真源：`talent_parents.status`；不双写账号状态（Q4）

**背景**

PRD §10.1 要求「账号停用后立即失效」，但「停用」可能指家长档案或登录账号。旧实现两者混用，容易一边停用、另一边仍能读报告。

**选项**

1. **`talent_parents.status` 作为会员域停用唯一真源；登录账号状态归 M6，互不双写。**
2. 停用家长时同时停用 `users.status`。
3. 只停 `users.status`，家长档案不动。

**结论**

选 1。理由：`users` 是中性账户域（AGENTS 红线：不回填 `users`），把会员停用写进 `users.status` 会污染账户语义、影响后台登录与其它业务，且双写必然出现「一处改、一处漏」的真源漂移；Q4 已确认该口径。

**后果**

- 停用/启用只改 `talent_parents.status`；C 端 bindings 在该状态为 `"0"` 时返回空 items，报告/建议/PDF 的拒绝在 M3/M7 按家长状态判定。
- 子女不落「已停用」状态（`status` 只有 `"1"` 正常 / `"2"` 已解绑）：家长停用时子女派生展示为「已停用」，恢复后自动恢复；避免给子女再加一个与家长联动的状态字段。
- 登录账号被停用时，认证层先 403（沿用现有 `getCurrentUserBasic`），会员域无需重复判断；M6 定义账号状态与会员状态的展示口径。
- 「账号资料」页签只读展示绑定账号名，不展示账号状态为会员状态（避免新一轮混淆）。

## D5 · 敏感字段三件套：AES-256-GCM 密文 + HMAC 哈希 + 前 4 后 4 脱敏；全号独立码 + 审计

**背景**

PRD §8.2「脱敏存储/展示」、§10.2「手机号、身份证默认脱敏（前 4 + 后 4）；全号查看需独立权限并写日志；数据库存加密值」。现有 `crypto.ts` 提供 AES-256-GCM；旧会员只有无盐 SHA-256 哈希，既不能还原（无法全号查看）也易被彩虹表反查。Q1 已确认旧数据不迁移。

**选项**

1. **三件套**：`cipher`（可解密，供全号查看/未来导出）+ `hash`（HMAC-SHA256，唯一键与绑定查询）+ `masked`（前 4 + 后 4，唯一对外形态）。
2. 只存密文，列表查询时逐条解密再脱敏（全表解密，性能与泄露面都差）。
3. 复用旧「纯 SHA-256 + 脱敏」两件套（不可全号查看）。
4. 明文加密后由 PocketBase 加密字段/外部 KMS 管理。

**结论**

选 1。理由：
- 哈希必须支持「按手机号查家长」（claim / 重号检测）与唯一索引，因此需要确定性摘要；纯 SHA-256 对 11 位手机号与 18 位证件号可被暴力反查，故用 `ENCRYPTION_KEY` 派生的 HMAC 密钥（加胡椒），密钥不出服务端。
- 全号查看与未来导出需要可逆密文；AES-256-GCM 复用现有 `server/utils/crypto.ts`，不引入新依赖与新密钥体系。
- 脱敏值单独落库，列表/详情/C 端/日志只读脱敏列，避免「按需解密」带来的批量明文风险与性能问题。
- 旧的 `hashTalentPhone` / `hashTalentIdCard` 保留给旧代码到 M6，新集合不复用（避免旧哈希可反查的弱点延续）。

**后果**

- 新字段：`mobileCipher/mobileHash/maskedMobile`、`idNoCipher/idNoHash/maskedIdNo`；响应层统一由 `sanitizeTalentParentRecord` / `sanitizeTalentChildRecord` 删除 cipher/hash（任何响应、错误、日志都不带）。
- 哈希归一化：手机号去空格/连字符/`+86` 后 HMAC；身份证 trim + 大写后 HMAC；两者都做域分离（salt 不同），避免跨字段碰撞。
- 全号查看：独立权限码 `talent:parent:idno` + 单项接口（`/members/:id/id-no`、`/children/:id/id-no`），每次写 `oper_logs`（只记对象编号/姓名，不记全号）；无权限 403 且不产生成功日志。
- 密钥轮换：`ENCRYPTION_KEY` 变更会使历史密文不可解、哈希不可比。M2 只做启动自检与「解密失败不回退明文」；轮换/重算哈希属运维迁移，需备份 + 迁移脚本，另立任务。
- 手机号全号 M2 不开放（spec §13 C1）：如客户要求，另加独立权限码与接口，不与证件全号共用审计口径。

## D6 · 查询状态机：四态 + 三类归因；回执幂等令牌；超时转 `api_error`；M2 用可替换 Mock 源（Q5/Q6）

**背景**

PRD §8.3 只给「未查询 → 查询中 → 已查到 / 未查到（可重查）」；需求补出三类失败归因，且现实会出现「外部已受理但未出结果」「回执迟到/重复/无归属」。M8 才接真实第三方，M2 必须有可验收的状态机与可替换适配器。

**选项**

1. **四态 + 三类 reason（全部归入 `not_found`）；每次发起递增 `querySeq` 作为幂等令牌；迟到/无归属回执丢弃；`querying` 超阈值（默认 24h）转 `not_found/api_error` 并告警；M2 用 `TalentGeneQuerySource` Mock。**
2. 五态（把「未出结果」单列状态），超时/失败分别用独立状态。
3. 不做回执守卫，以「最后一次回执覆盖」为准。
4. M2 不实现查询，等 M8 一起做。

**结论**

选 1。理由：
- 「未出结果」不是终态、也不代表失败（Q5），单列状态会让工作台「已出结果 = found、待出结果 = 其余」的派生口径多一个分支，且 C 端展示要么假装失败要么无限等待；归入 `not_found/no_result` 后所有消费方只认四态 + reason。
- 回执必须有归属令牌：第三方可能重试、乱序、迟到一个旧查询的回执；用 `querySeq` 比对是最小且可测的幂等方案，避免旧回执覆盖新结果或写回已解绑档案。
- 超时扫描是「查询中永不回执」的唯一兜底；阈值可配（`TALENT_QUERY_TIMEOUT_HOURS`）便于 M8 调整；M2 用 `error_logs` + `console.warn` 作为告警落点。
- Mock 源冻结 `submit` / receipt 签名，M8 只换实现、不改调用方与前端；与 M1 的 `TalentFactorLibrarySource` 策略一致。

**后果**

- 状态字段：`query`、`queryReason`、`querySeq`、`queryAttempts`、`queryStartedAt`、`queryAt`；`queryReason` 只在 `not_found` 有值。
- 规则：新建/编辑关键字段/手动重查发起；`querying` 重查幂等；30s 内重复点不重复发起；`found` 再查 422；家长停用/子女解绑后不再发起（409）；回执守卫四条（对象存在、`status="1"`、`query="querying"`、seq 匹配）。
- 回执**不创建**任何家长/子女/报告记录（建档归 M3）；「无归属回执」直接丢弃。
- 超时扫描由 Nitro 插件每 10 分钟 + 启动时执行；测试用参数注入阈值与当前时间，不需要等 24h。
- 「未出结果」的定时被动重试归 M8（M2 不建重试器）：M2 只保证状态、reason 与 `queryAt` 可被 M8 消费。
- Mock 模式：`success` / `info_mismatch` / `api_error` / `no_result` / `pending`，回执走进程内定时器；生产默认 Mock 时 `env-check` 提示，M8 必须切换。
- 工作台（M6）派生：注册家长 = parents 数；已出结果 = `found` 子女数；待出结果 = 其余（含 `no_result`，不算失败）。

## D7 · 解绑归档、不删档、按证件哈希重绑复用（Q7）

**背景**

PRD 要求「解绑后家长端不可见，历史报告保留在后台」；同时「一孩一档」「一孩一有效家长」要求唯一键不能被解绑破坏。若解绑即删档，历史报告归属会断；若解绑后仍占用全局唯一 `idNoHash`，则同一孩子无法被重新建档。

**选项**

1. **归档**：`parentId=""`、`status="2"`、`unbindAt/unbindBy` 落库，档案保留；新增子女命中已解绑档案时重绑复用；命中正常档案 409。
2. 解绑即软删并用唯一键排除 `status="2"`（部分唯一索引）。
3. 解绑即物理删除，把报告归属迁到家长。
4. 解绑后 `idNoHash` 置空（牺牲历史归属）。

**结论**

选 1。理由：报告归属要求档案 id 稳定（M3 报告按 `subjectId` 挂回）；部分唯一索引（选项 2）会让「同一证件号存在多条历史档案」，重绑时还要挑一条，且 409/复用规则更绕；物理删除（3）直接丢历史；置空哈希（4）既失去去重能力也把 PII 变成不可查。

**后果**

- `talent_children.idNoHash` 保持全局唯一；解绑不改哈希，改 `parentId` 与 `status`。
- 新增子女时按 `idNoHash` 查：未命中 → 新建；命中 `status="2"` → 重绑（更新家长、基本信息、重置查询并重新发起）；命中 `status="1"` → 409（同家长提示直接编辑，其他家长提示先解绑/核对）。
- 解绑时 `querySeq + 1`，作废在途回执；已查到的历史查询结果保留在档案上（重绑后重新发起覆盖）。
- 解绑/重绑都是高敏动作：`withOperLog` 记录，日志不记证件号。
- C 端 bindings 与归属解析只认 `status="1"` 且 `parentId` 非空的子女；归档档案对 C 端永不出现。

## D8 · 路由与菜单共存：静态段优先 + 菜单重指向 + 旧码保留到 M6

**背景**

旧天赋管理是「`[resource].get.ts` / `[resource].post.ts` 单段动态路由 + `app/pages/admin/talent/[resource].vue`」，`talent:customer:*` 同时服务旧后台页与机构端。新会员域需要 `/members`、`/children` 两个静态段目录，并在 M2 期间与旧路由/旧页/旧码同时存在。

**选项**

1. **新路由放 `server/api/admin/talent/{members,children}/` 独立目录，依赖 Nitro 静态段优先；菜单「会员管理」沿用旧行重指向新页（task-8 已改名）；旧码 `talent:customer:*` 原样保留到 M6。**
2. 把新逻辑塞进 `[resource].ts` 的 `if (resource === "member")` 分支。
3. 先删旧路由再上新路由。
4. 新路由放独立命名空间（如 `/api/admin/talent-member/*`），完全避开动态段。

**结论**

选 1。理由：选项 2 会让旧资源的权限、列表、详情逻辑与新会员逻辑搅在一起，`[resource]` 的权限码是 `talent:customer:*`，无法自然映射新码；选项 3 违反「旧页保留到 M6」与只加不删原则；选项 4 能避开冲突，但 API 路径与菜单/页面语义不一致，且 M3/M7 也要跟着用奇怪命名，收益只有「绝对不冲突」。M1 已用同目录静态段验证过 Nitro 静态优先，M2 按 spec §5.7 再验证一次；若实测冲突才退到选项 4，并追加修订。

**后果**

- 新路由：`GET/POST /members`、`GET/PUT /members/:id`、`PUT /members/:id/status`、`POST /members/:id/children`、`GET /members/:id/id-no`、`PUT /children/:id`、`POST /children/:id/query`、`POST /children/:id/unbind`、`GET /children/:id/id-no`；`children` 无列表路由。
- 验证方法：`/members` 返回新结构而非「天赋资源不存在」；`/children/:id` 的 404 文案来自新路由；旧 `/customer` 行为不变。
- 菜单：按 `path="/admin/talent/customer"` 找旧 C 行，改 `path` / `component` / `permissionCode`，保留行 id 与 `role_menus`；不新增同名菜单。`useMenuTree.ts` 的 `TALENT_PATHS` 增加 `/admin/talent/member`。
- 9 个新权限码：`talent:parent:list/view/add/edit/status/idno` + `talent:child:edit/unbind/query`；每个 `requirePermission` 码都有 C/F 菜单行；旧 `talent:customer:*` 与旧页保留到 M6。
- 机构数据范围不接入新会员域（M6 统一）；M2 不把新码授予机构角色。

## D9 · 会员编号与证件校验口径（Q8）

**背景**

旧会员编号来自 `createTalentCode("customer", name)`（`customer-<label>-<uuid>`），长度长、可读性差；PRD 列表首列是「会员编号」，需要运营可读。证件校验 PRD 要求 18 位 + 生日一致（BR-11），但未要求校验末位。

**选项**

1. **`P` + `YYYYMMDD` + 4 位当日序号（如 `P202611160001`），新建可手填、编辑不可改；18 位、不校验末位、强校验生日一致。**
2. 沿用 `createTalentCode("customer", name)`。
3. 纯自增数字编号。
4. 校验身份证末位（GB 11643 校验码）。

**结论**

选 1。理由：编号要进列表首列与操作日志，短且可读；日期 + 当日序号足够避免长期冲突（冲突重试 5 次），也不需要额外计数集合。选项 2 太长且 label 对中文名会退化为 `item`；选项 3 在并发与多实例下都要额外序列设施（本项目单实例但仍不必要）。不校验末位是 Q8 明确口径：历史数据本身是测试号/手工号，强校验末位会把大量合法业务输入挡在门外；只做「18 位 + 生日一致」两条硬校验。

**后果**

- 编号生成：`P{YYYYMMDD}{0001}`，当日已有最大序号 + 1；唯一冲突重试 5 次后 409；手填必须匹配 `^P[0-9]{12}$` 且唯一。
- 编辑接口出现与库中不同的 `parentNo` → 422「会员编号不可修改」。
- 证件：`^\d{17}[\dXx]$`、归一化大写；取第 7–14 位为生日，必须是合法日期且等于 `birthday`；家长填证件必须填生日；生日不得晚于今天；不校验末位。
- 手机号 `^1[3-9]\d{9}$`，归一化后哈希；重号 409 提示后台合并（不做自动合并）。

## D10 · 列表与脱敏/状态展示口径（Q9/Q10）

**背景**

PRD §6.2 列表 8 列、行内操作含「编辑」，但 2026-11-09 原型把编辑移进详情顶部；PRD §10.2 写「前 4 + 后 4」，旧码手机号脱敏是 3 + 4；PRD 未定义「未注册」状态。

**选项**

1. **按 PRD：8 列 + 行内「详情（主）/编辑/停用启用」；脱敏统一前 4 + 后 4；档案状态只有正常/停用，「未注册」用「来源=后台录入 + 未绑定账号」表达。**
2. 按原型：行内只保留详情，编辑只在详情顶部。
3. 脱敏沿用旧 3 + 4；状态加「未注册」第三值。

**结论**

选 1。理由：验收以 PRD 为准（Q9 确认）；前 4 + 后 4 与「手机号、身份证统一」的验收口径一致（Q10），也便于同一套脱敏函数服务两字段；「未注册」是账号绑定状态而不是会员状态，加第三状态会让筛选/统计/停用语义复杂化，用来源 + 绑定标记已能表达。

**后果**

- 列表 8 列一列一字段、无副行；行内编辑与详情顶部编辑复用同一表单弹层与 `PUT /members/:id`，列数不变。
- 脱敏函数：手机号 `前4****后4`；身份证 `前4 + 10 个 * + 后4`；列表/详情/子女表/C 端/日志摘要统一。
- 状态只有 `"1"` 正常 / `"0"` 停用；账号资料页签「登录账号：未绑定」表达「后台录入但尚未注册」。
- 列表筛选四项（家长姓名 / 手机号完整或后 4 位 / 子女姓名 / 状态带数量）取交集；状态计数不叠加状态筛选，保证下拉数量与总数一致。

## D11 · 契约边界：M3 报告归属过渡读法、M7 页面、bindings 迁移期

**背景**

M2 重建会员后，M3 才重建报告归属，M7 才重建 C 端页面；但 C 端 `bindings` 与旧报告接口今天就存在且互相引用（旧报告按 `customerId`，新档案没有这个 id）。需要明确「M2 冻结什么、过渡期怎么读、哪些不作为 M2 验收」。

**选项**

1. **M2 冻结新 bindings 契约（家长 + 子女对象）；旧报告在 M3 前一律空态，不按 `customerId` 回查；C 端旧页在 M2–M7 间不作为可用性验收；M3 报告以 `subjectType` + `subjectId` 挂到新档案。**
2. M2 顺手做旧报告映射（按姓名/手机号猜父档），把旧报告挂到新档案。
3. M2 同时重建报告归属（提前做 M3）。
4. M2 保留旧 bindings 写路径直到 M7。

**结论**

选 1。理由：选项 2 的「猜」会错配/串档，且与 Q1 不迁移的结论冲突；选项 3 把 M3 的范围与风险提前压进 M2（报告集合、发布状态、快照、PDF 权限都未定），会拖垮 M2；选项 4 保留安全缺陷，Q3 已否决。过渡期空态是明确、可验收的降级行为。

**后果**

- M2 详情「关联报告」页签空态、列表 `reportCount=0`；`countTalentMemberReports` 做字段特性探测：存在 `subjectType`/`subjectId` 才统计，禁止读 `customerId`。
- M3 约定：`talent_reports` 增 `subjectType`（`self` / `child`）+ `subjectId`（家长/子女 id）；M2 的子女档案 id 即 M3 `subjectId`；解绑不删档保证历史报告仍可追溯；旧 `customerId` 在 M3 迁移后由 M6 删除。
- M7 约定：消费 `TalentMemberBindingsResponse`（`items` / `currentId` / `current` / `currentRelationType`）；M7 另开 `/api/client/talent/**` 子女增删改写接口并复用 M2 已冻结的服务层函数（`talent-member.ts`），M2 不建 C 端写路由。
- 迁移期：旧 C 端页面读旧结构，在新 bindings 后不保证可用；M2 不为其打兼容补丁；旧 `talent_customer_bindings` 只读封存、M6 删除；旧报告接口在 M3 前继续服务旧数据，但不再有 GET 写绑定。
- 安全验收：GET bindings 无写入；claim 只写唯一 parent 的 `userId`；跨家长访问 404；停用/解绑后 items 立即消失。

## 附 A · 被否决的备选小结

| 决策 | 主要否决理由 |
| --- | --- |
| D1 迁移旧会员 / 原地改造 / 立即删旧集合 | 旧证件仅不可逆哈希，迁移等于重采全部明文；原地改造两套语义长期纠缠；删旧集合打断 M3 前旧报告链路 |
| D2 多对多关系表 / JSON 数组 | 超出 Q2 口径、引入主家长二义性与额外 join；JSON 无法索引与约束一孩一家长 |
| D3 新绑定表 / 复用旧绑定表 / 手动邀请码 | 单家长模型下 userId 1:1 足够；新表重复身份关系且 M6 要清理；旧表语义漂移；手动绑定与 Q3 自动认领冲突 |
| D4 双写 users.status / 只停账号 | 污染中性账户域、违反不回填 users 红线；真源漂移；账号状态归 M6 |
| D5 只存密文 / 复用纯 SHA-256 / 外部 KMS | 逐条解密成本与泄露面大；手机号/证件号空间小，无盐哈希可反查；引入新密钥体系超出 M2 |
| D6 五态 / 无回执守卫 / M2 不做查询 | 五态破坏工作台派生口径且「未出结果」不是终态；无守卫会被迟到回执覆盖；不做查询则 M2 无法验收状态机与页面 |
| D7 软删+部分唯一索引 / 物理删除 / 置空哈希 | 同证件多条历史档案、重绑挑档复杂；丢历史归属；失去去重且 PII 不可查 |
| D8 塞进 `[resource]` / 先删旧路由 / 独立命名空间 | 权限码与资源逻辑纠缠；违反只加不删；命名空间偏离菜单与 API 语义（保留为实测冲突时的兜底） |
| D9 `createTalentCode` / 纯自增 / 校验末位 | 编号不可读；自增需额外序列设施；末位强校验挡合法业务输入（Q8） |
| D10 原型口径 / 旧 3+4 脱敏 / 第三状态 | 验收以 PRD 为准；两字段脱敏规则不统一；「未注册」属账号绑定而非会员状态 |
| D11 旧报告猜映射 / 提前做 M3 / 保留旧 GET 写路径 | 错配串档且违背不迁移结论；把 M3 风险提前压入 M2；保留安全缺陷 |

## 附 B · 实施影响与回滚

- **schema**：`talent_parents` / `talent_children` 为新增集合，`sync-talent.mjs` 只加不删；旧集合、旧索引、旧数据全程不动。回滚 = 删除两个新集合 + 删除 9 个新码与菜单重指回 `/admin/talent/customer` + 还原旧 bindings 实现（git revert）；旧数据不受影响。
- **菜单/权限**：旧「会员管理」行被重指向；回滚时把 `path` / `component` / `permissionCode` 改回 `/admin/talent/customer` / `admin/talent/[resource].vue` / `talent:customer:list`，并保留新码行（无角色关联即无副作用）。
- **C 端**：旧 bindings 实现回滚可立即恢复旧页可用；新 `claim` 路由保留不影响旧逻辑。
- **数据**：M2 不迁移、不回填；已产生的 `talent_parents`/`talent_children` 在回滚时保留（新集合无其他模块引用），M6 再处置。
- **风险确认点**：路由静态优先（D8）、回执守卫（D6）、解密失败不降级（D5）、GET 无写入（D3）——四点在 acceptance.md 中都设了独立证据项。