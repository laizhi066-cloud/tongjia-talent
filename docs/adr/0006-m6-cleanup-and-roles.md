# ADR 0006 · M6 旧口径清理与三角色授权关键决策

| 项 | 内容 |
| --- | --- |
| 状态 | 已接受（2026-11-17，architect / task-23；待 lead 复核） |
| 日期 | 2026-11-17 |
| 决策人 | 架构师 teammate（task-23） |
| 关联 | [M6 规格](../specs/M6-cleanup/spec.md)、[M6 验收](../specs/M6-cleanup/acceptance.md)；[M1 规格](../specs/M1-rules/spec.md)/[ADR 0001](0001-m1-rule-domain.md)、[M2 规格](../specs/M2-members/spec.md)/[ADR 0002](0002-m2-member-domain.md)、[M3 规格](../specs/M3-reports/spec.md)/[ADR 0003](0003-m3-report-domain.md)、[M4 规格](../specs/M4-matching/spec.md)/[ADR 0004](0004-m4-direction-matching.md)、[M5 规格](../specs/M5-advice/spec.md)/[ADR 0005](0005-m5-advice-domain.md)、PRD v1.1 §2（L46–60）/ §3.1（L66–85）/ §3.2（L87–91）/ §6.8（L324–337）/ §8.3（L522–535）/ §9（L539–577）/ §10（L581–589）/ §12（L604–630） |
| 影响范围 | `scripts/setup.mjs`、`scripts/sync-talent.mjs`、`scripts/seed-accounts.mjs`、新增 `scripts/migrate-m6-cleanup.mjs`、`server/api/admin/talent/**`、`server/api/org/**`、`server/api/client/talent/**`、`server/api/integrations/**`、`server/utils/**`、`app/pages/admin/talent/**`、`app/pages/org/**`、`app/composables/**`、`shared/types/**`、`shared/utils/**`、`test/**`、`scripts/e2e/**`、`docs/**` |
| 并行对齐 | M1 保留 `talent_levels` 旧字段 / 旧索引到 M6；M2 保留 `talent_customers` / `bindings` / 旧 `talent:customer:*` 到 M6；M3 保留旧报告集合 / 旧码 / `customerId` 到 M6；M4 提供 `talent:direction:merge`；M5 不复用旧内容库口径。M6 是这些「保留到 M6」承诺的统一兑现点 |

> 本文沿用 ADR 0001–0005 的「背景 / 选项 / 结论 / 后果」写法；D1–D6 是实现合同，spec 中不再重复论证。

---

## D1 · 删除策略：先备份，再「停菜单 → 删路由 → 删页面 → 删集合」；不做原地改造

**背景**

M1–M5 为了不阻塞并行实现，统一采用「只加不删、旧代码保留」策略：`scripts/sync-talent.mjs` 只允许加集合 / 加字段 / 加索引 / 加菜单；M1 把 `talent_levels` 改成双语义（旧字段 + 新字段）；M2/M3/M5 保留旧会员、旧报告、旧内容库到 M6。结果是当前 `talent_*` 集合中 19 个是旧口径（M1–M5 落地后集合总数随里程碑增长，M5 后约 33 个），213 条 API 中约三分之一（79 条）是旧路由，菜单表里还有 12 条旧 C 行 / 25 条旧 F 行 / 4 条空分组，22 个旧权限码仍「在册但不校验」。

这些旧资产不是「少写几行」的问题：它们与 PRD §3.2（L89）明确排除的机构、培养计划、内容库、报告接收、跟进单、AI 辅助一一对应，且旧页 / 旧 API 仍在文件系统里，任何一次误访问都会读到与新模型不一致的数据。M6 必须让它们**物理消失**，而不是继续 `status="0"` 隐藏。

**选项**

1. **一次性物理删除**：备份后按「停菜单 → 删路由 → 删页面 → 删集合」顺序删除 19 个集合、旧路由、旧页、旧码、旧 e2e；不迁移旧数据。
2. **保留旧集合、只删入口**：继续 `status="0"` 隐藏，保留旧集合与旧路由，只清理菜单。
3. **旧集合原地改名 / 改造**：把 `talent_customers` 改造成 `talent_parents` 的补充表，把 `talent_elements` 改造成 `talent_factors` 的旧库。
4. **分多个里程碑渐进删除**：M6 删页面与路由，M9 再删集合。

**结论**

选 1。理由：

- PRD §3.2 是**范围排除**，不是「隐藏即可」。旧集合保留意味着数据继续存在、API 继续可达、`talent_customer_bindings` 仍是 C 端归属的第二真源，与 M2「`talent_parents.userId` 唯一绑定」（ADR 0002-D1）直接冲突；只要旧表在，就迟早有人写回旧表。
- 选项 2 会让 `setup.mjs` 继续创建全部旧集合、`foundation-schema.test.ts` 继续把旧集合当合法集合，新库越建越脏；M3 的旧报告列表也会继续显示新行（ADR 0003-R3 已知过渡问题）。
- 选项 3 是 M1 对 `talent_levels` 已经踩过的坑：双语义期必须靠显式过滤维持，任何一处漏过滤就混入旧行。M6 的目标是结束双语义，不是制造第二组双语义。
- 选项 4 把风险拉长到 M9，而 M9 是验收里程碑，不适合承载不可逆删除；且 M9 前旧页 / 旧 API 会持续干扰 E2E 重写。
- 顺序「先停菜单、再删路由、再删页面、最后删集合」保证每一步失败时数据仍完整、代码可回退：菜单先停 = 用户不再进入；路由再删 = 旧链接 404 而非 403/500；页面再删 = 构建不含旧代码；集合最后删 = 前面任一步失败都能直接回退代码。
- 旧数据**不迁移**：M2 已确认旧会员不迁移（ADR 0002-D1），M3 已确认旧报告不迁移（ADR 0003-D6），M5 旧建议库不复用（ADR 0005-D6）。迁移旧数据会引入「旧 ID → 新 ID」映射与清洗成本，而客户尚未提出历史数据查询需求；备份 + CSV 导出已满足可追溯。

**后果**

- 删除清单与顺序固定为 spec §2 / §4；19 个集合、56 条 admin 旧路由、16 条机构端路由、6 条旧 C 端路由、1 条旧 integration、12 条旧 C 菜单、25 条旧 F 行、22 个旧权限码在 M6 完成后必须为 0 / 404 / 不存在。
- `talent_levels` 旧字段 `elementId/levelCode/levelName/annotation` 与 `idx_talent_levels_element_level`、`talent_reports.customerId` 与旧行在 S6 删除；M1/M3 的「旧字段保留到 M6」承诺到此关闭。
- `talent_sync_logs`、`talent_reading_progress` 是**保留**的旧集合：前者是 M3 扩展的审计表，后者是 C 端阅读进度（与旧会员口径无关，键为 `reportId + userId`），删除会让 M7 重建成本上升，故不列入 19 个。
- 旧 e2e 断言（01/02/03/05）在 M6 删除，新增 `06-m6-cleanup` 覆盖「旧入口 0」；全量 E2E 重写归 M9。短期覆盖率下降是已知取舍（spec R5）。
- 旧集成 / 同步配置 / PDF 删除后，真实外部接入空窗到 M8；M6 期间以 M3 Mock 同步兜底（spec §3.5）。

---

## D2 · 备份门槛：无当日一致性备份、无显式目标、无 dry-run，不得删除

**背景**

删除集合是不可逆操作：PocketBase 没有「回收站」，删除 19 个集合后只能靠备份 zip 恢复。仓库现有 `pnpm backup:pb`（`scripts/backup-pb.mjs`）只备份**当前** `POCKETBASE_URL` 指向的库，下载到 `backups/` 并保留 N 份；`docs/OPERATIONS.md` 已要求生产备份在目标环境执行、并做恢复演练。但脚本本身没有「目标库一致性校验」「备份新鲜度校验」「破坏性操作确认」能力，无法直接当删除门槛。

同时 `scripts/setup.mjs` 历史上被误当成「重置 / 清库」工具的风险一直存在：`AGENTS.md` / `CLAUDE.md` 三句红线之一就是「`setup.mjs` 只初始化空数据目录」。M6 引入删除能力时，必须把这个口子焊死，而不是开第二个「清理脚本」后门。

**选项**

1. **删除前强制备份 + 迁移脚本自带目标 / 新鲜度 / dry-run 校验**：`pnpm migration:m6` 必须带 `--pb-url`、`--data-dir`、`--backup`、`--confirm-m6`；先 `--dry-run` 出报告，再正式执行；备份 zip 校验 sha256 与生成时间。
2. **依赖运维流程**：文档写「先备份」，脚本不做校验。
3. **用 PB 自带备份 / 手工 zip**：不写脚本，人工在 PB 后台备份后手工删集合。
4. **让 `setup.mjs` 支持 `--reset` / `--clean`**：统一入口。

**结论**

选 1，并明确拒绝 4。理由：

- 选项 2 把不可逆操作的成败交给人的记忆；M6 是多人并行 + 生产执行，必须让脚本在缺备份时**无法继续**。
- 选项 3 无法批量删 19 个集合（PB 后台只能逐个删），也没有 schema / 行数快照与删除报告，验收无法取证。
- 选项 4 直接违反 AGENTS 红线：`setup.mjs` 的能力边界是「只建不删」，一旦有 `--reset`，迟早有人在存量库上执行。删除必须是一个**单独的、带确认的、只做删除**的迁移脚本。
- 「目标显式化」解决的是最容易犯的错：本机备份了测试库、却在生产上删除。脚本必须打印并校验 `POCKETBASE_URL` / `POCKETBASE_DATA_DIR` 与参数一致，且拒绝只有其一。
- 备份新鲜度阈值（默认 24h）与 sha256 校验，防止「拿旧备份当新备份」或备份文件损坏；恢复演练（隔离数据目录）证明备份**可用**，而不只是存在。

**后果**

- 新增 `scripts/migrate-m6-cleanup.mjs` + `pnpm migration:m6`；合同见 spec §5。
- S1 产出四类证据：备份 key / 大小 / sha256、恢复演练通过、dry-run 报告（集合/行/菜单/码计数）、schema 与行数快照 JSON；缺一不得进入 S2。
- `setup.mjs` 不新增任何删除 / 清库 / `--force` 分支；`COLLECTION_DEFS` 移除 19 个旧集合定义（这是「新库不建」，不是「删数据」），`assertFreshDataDirectory` / `assertFreshFoundationDatabase` 保持并加强。
- 迁移脚本幂等：第二次执行报告 0 待删并安全退出；失败不自动重试，要求恢复备份后重来。
- `pnpm backup:pb` 保持「只备份当前 URL」语义，文档补充「生产必须在目标环境执行」；M6 不把备份脚本改造成删除工具。

---

## D3 · 三角色矩阵：平台运营 / 报告审核 / 规则配置；系统管理与运行监控仅 superAdmin

**背景**

PRD §2（L46–60）定义 5 类主体：平台运营管理员（后台全量）、报告审核员（发布/撤回、会员只读）、规则配置员（要素、分级、方向）、家长（C 端）、外部系统（非人）。但当前实现只有内置 `superadmin` / `admin`（通配）与 `customer-admin`（业务 7 菜单）三个角色，M1–M5 验收全部用 `admin` / `superadmin` 通配放行，从未真正验证「角色只能做分内事」。同时 2026-11-16 菜单调整把系统管理与运行监控收敛为「仅 superAdmin 可见」，与 PRD §2「平台运营管理员可见全部菜单」存在文字冲突。

更隐蔽的问题：工作台 C 菜单当前复用 `talent:report:list`（与「基因报告」C 菜单同码）。`hasPermission` 按**权限码**判定，而菜单可见性按 `role_menus` 行判定。于是「给规则配置员看工作台」会同时把 `GET /api/admin/talent/reports` 的接口权限授出去——菜单矩阵看起来正确，接口却越权。这是 M6 必须显式修复的设计缺陷。

**选项**

1. **三业务角色 + superAdmin**：`customer-admin` 升为平台运营管理员（保留 roleKey）、新增 `report-reviewer` / `rule-configurator`；系统管理 / 运行监控仅 superAdmin；新增 `talent:dashboard:list` 专用码，工作台不再复用 `report:list`。
2. **五角色全建**：再建 `platform-operator` 新角色，保留 `customer-admin` 作历史别名双跑。
3. **只建两个新角色，客户管理员维持现状**：平台运营 = 现有 customer-admin，审核 / 规则新增；系统管理按 PRD 给平台运营。
4. **沿用通配 admin 验收，不建角色**：M6 只删代码，角色放 M9。

**结论**

选 1，并单列工作台拆码。理由：

- 选项 2 会让同一套业务权限存在两个角色（customer-admin 与 platform-operator），`role_menus` 双份维护、越权清理两套逻辑、E2E 两套账号，收益只是 `roleKey` 好看；改名需求可放 M9 一次性迁移。
- 选项 3 的「系统管理按 PRD 给平台运营」与 2026-11-16 用户确认的「仅 superAdmin」冲突，且把交付账号暴露到用户/角色/菜单管理，风险高于收益；本任务约束明确要求系统管理 / 运行监控仅 superAdmin（PRD §2 文字冲突记入 spec §12 Q2，由 lead / 客户书面确认）。
- 选项 4 等于 M6 不落三角色，违背本任务目标与 PRD §2；M1–M3 spec 均写明「三角色正式授权归 M6」，M9 再建会让验收链条断裂。
- **工作台拆码是必须项**：`talent:dashboard:list` 独立后，规则配置员 / 报告审核员获得工作台菜单不会顺带获得报告列表接口；这是「菜单隐藏 ≠ 接口鉴权」的反面教材，必须在 M6 修掉，否则 AC-M6-05 无法成立。
- 报告审核员默认保留 `report:publish` / `advice:publish`（M3/M5 原文：如客户要求只读，M6 收回）；收回只改 `role_menus`、不改代码，保留弹性。

**后果**

- 角色：`superadmin`（全菜单）、`customer-admin`（显示名「平台运营管理员」，7 业务菜单 + 全部业务 F）、`report-reviewer`（工作台 / 会员只读 / 报告 / 建议 + 发布类 F）、`rule-configurator`（工作台 + 天赋规则 3 页 + M1 全码 + `direction:merge`）。
- 权限码：M6 后在册 35 个（M1 15 + M2 9 + M3 4 + M4 1 + M5 5 + 工作台 1）；22 个旧码归零。
- 工作台 C 菜单 `permissionCode` 改为 `talent:dashboard:list`；`dashboard.get.ts` 同步改 `requirePermission`，删除对旧 `talent-business.ts` 的依赖（否则删旧 util 后工作台 500）。
- 系统管理 / 运行监控：仅 superAdmin 关联菜单；三角色直调 `system:*` / `monitor:*` 403；「操作日志」按 PRD §6.8 从运行监控迁入系统管理。
- 机构角色 `talent_agent` / `talent_service_provider` 随机构端删除；机构账号 `users` 停用保留，不删账号。
- 内置 `admin` 角色保留为通配，但**不得绑定交付账号**（否则三角色矩阵被绕过）；`seed-accounts.mjs` 加断言。
- 客户管理员升级对交付账号透明：`admin` 账号、口令环境变量、登录方式不变；只改显示名与授权集合。

---

## D4 · 机构端退出：删菜单 / 页面 / API / 角色 / 集合，不迁移数据、不恢复多租户

**背景**

2026-09-24 计划重构后，机构端（代理商 / 服务商）从「培训机构 + 课程 + 课表」简化为「会员列表 / 报告列表 / 培养计划」，平台侧保留机构管理、服务商授权、培养计划审核。2026-11-04 报价范围收敛为「后台管理 + C 端小程序」两端，机构、代理商、服务商、培养计划、内容库、AI 辅助均不再纳入；PRD §3.2（L89）明确「机构 / 代理商 / 服务商、培养计划提交与审核、内容库与培育内容、报告接收列表、跟进单 / 认领 / 转交、AI 辅助建议、多租户与站点切换、平台参数、支付与订单」不在本期范围，且「页面中不得出现上述入口」。

但代码仍保留：`app/pages/org/talent/` 3 页、`server/api/org/talent/` 16 条路由、`talent_agent` / `talent_service_provider` 角色、6 个机构相关集合、`talent-institution*` / `talent-business` / `talent-export` / `talent-plan-recommendation` / `talent-ai` 等工具。机构端 3 个菜单还挂在根级（`parentId=null`），平台超管侧栏同样能看到（STATUS §7 P1）。继续保留会让「这是单实例平台版」的边界失真，也让三角色矩阵无法收敛。

**选项**

1. **整体删除 + 账号停用留痕**：删机构菜单 / 页面 / API / 角色 / 集合；机构账号 `users` 停用、移除角色关联，不删账号；不迁移数据。
2. **保留机构端只读**：菜单隐藏，页面 / API 保留，机构账号可登录只读。
3. **机构端迁到独立仓库 / 独立实例**：M6 只做入口下线，代码另存。
4. **机构数据迁入新模型**：把机构会员并入 `talent_parents`，授权关系转成 M4 方向选择。

**结论**

选 1。理由：

- PRD §3.2 要求「页面中不得出现上述入口」，只读保留仍是入口；且机构端依赖旧会员 / 旧报告 / 旧计划集合，这些集合在 D1 中已决定删除，保留机构端等于保留 6 个旧集合，与 D1 冲突。
- 选项 3 不符合本仓库「单实例、单 PocketBase」边界：独立实例就是多租户的变体，违反 AGENTS 硬边界；且客户未购买机构端。
- 选项 4 是数据迁移，M2 已确认不迁移旧会员（ADR 0002-D1）；机构授权与 M4 方向选择是两套语义（机构访问范围 vs 家长方向选择），强行映射会产生错误归属。
- 账号**停用而不是删除**：`users` 是中性账户，登录 / 操作日志有审计价值；删除账号会让历史日志失去主体。停用 + 移除角色即可保证不能登录后台（`console-access` 要求启用角色 + 启用 C 菜单）。
- 旧计划 / 内容库 / 报告接收 / 同步配置 / AI 与机构端同批删除：它们共享旧集合与旧菜单，分开删会留下半套入口；M8 只重建「外部接入 + PDF」，不重建机构业务。

**后果**

- 删除 3 个机构页面、16 条 org 路由、3 条机构 C 菜单 + 7 条 F 行、`talent_agent` / `talent_service_provider` 角色、6 个集合（institutions / user_institutions / customer_leads / customer_authorizations / cultivation_plans / member_plan_selections）、机构相关工具与 `useTalentOrgType` / `useTalentBusinessApi`。
- 机构账号 `users` 行保留并 `status="0"`；删 `user_roles` / `role_menus`；本地 Mock 机构账号可随种子脚本一并清理（仅限非生产）。
- `talent-business.ts` 的 `requireTalentPermission` / `isPlatformAdmin` / `listScopedCustomerIds` 随机构端删除；唯一残留调用方 `dashboard.get.ts` 在 D3 中先改为新码，避免删除后工作台 500。
- 不恢复多租户：删除后不得新增 `TENANT_MODE`、`site` cookie、`X-Site-Slug`、第二 PB 连接、按机构过滤的数据范围；`/api/org/**` 前缀不再存在。
- STATUS §7 P1「客户管理员侧边栏出现系统管理 > 机构管理」随机构管理删除关闭。

---

## D5 · 旧 C 端 bindings 退出：归属唯一真源改为 `talent_parents.userId`；阅读进度保留

**背景**

旧 C 端通过 `talent_customer_bindings` 建立「账号 → 会员档案」关系，用 `PUT /api/client/talent/bindings/:customerId` 切换当前视角；M2 引入 `talent_parents.userId` 唯一绑定与 `bindings` 新契约（`GET` 只读 + `claim` POST），但旧路由与旧 C 端页仍并存。PRD §7 的 C 端模型是「家长 + 名下子女」，没有「绑定多个会员档案 / 切换客户」的概念，旧 bindings 是机构时代的遗留。同时旧 C 端还有培养计划选择（`plans` / `plan-selections`），与 PRD §3.2 排除项冲突。

阅读进度（`talent_reading_progress`）是另一类：它按 `reportId + userId` 存 C 端阅读位置，不依赖旧会员 / 旧机构，M3/M7 的报告阅读仍需要。若随旧代码一起删，M7 要重建表与迁移逻辑。

**选项**

1. **删旧 bindings + 旧计划选择，保留阅读进度集合**：删 `/api/client/talent/binding`（单数）、`bindings/:customerId`、`plans`、`plan-selections.*` 与 C 端 `binding.vue` / `plans/index.vue`；`talent_customer_bindings` 删除；`talent_reading_progress` 保留，M7 重写访问层。
2. **全部保留到 M7**：M6 不碰 C 端，M7 重建时一起删。
3. **全部删除（含阅读进度）**：M7 重建阅读进度。
4. **旧 bindings 改造成新契约的别名**：保留路由，内部转调 M2。

**结论**

选 1。理由：

- 旧 bindings 与 `talent_parents.userId` 是**两个真源**，保留一天就有一天可能写旧表；且旧路由按 `customerId` 切换视角，与新的「家长 + 子女」模型语义冲突，改造成别名（选项 4）会让两套身份模型长期共存。
- 旧计划选择依赖 `talent_cultivation_plans` / `talent_member_plan_selections`，这两个集合在 D1/D4 中删除；保留路由必然 500，不如直接删。
- 选项 2 把删除成本推给 M7，而 M7 是 C 端重建，已经承担 4 栏 + 15 页的重写；M6 顺手删旧 bindings 能减少 M7 的兼容负担，且旧 bindings 与机构端同批（同一 `talent.ts` 依赖），分开删反而要拆工具。
- 阅读进度**保留**：它的键是新模型可用的（`reportId` 指向 `talent_reports`，`userId` 指向中性账户），不携带机构 / 会员归属；保留可让 M7 直接复用，只重写读写接口与归属校验（`validateTalentReadingProgressItemIds` 迁移到新 helper）。
- C 端旧**报告阅读页**（`report/*`、`interpretations`）由 M7 重建，M6 不重复删除 M7 已替换的文件；否则 M6 会让 C 端在 M7 完成前完全不可用（空窗风险，spec R3）。

**后果**

- 删除 6 条旧 C 端路由与 2 个 C 端页面；保留 M2 的 `bindings.get.ts` / `bindings/claim.post.ts`（名字接近，按文件头区分，禁止整目录删）。
- 删除 `talent_customer_bindings`；C 端家长归属只认 `talent_parents.userId`（M2），子女归属只认 `talent_children.parentId`。
- `talent_reading_progress` 保留；旧 `talent.ts` 中的进度校验函数迁移到独立 helper 后再删旧文件；M7 重写 `reports/:id/progress` 读写。
- 旧 C 端报告读取 9 条路由由 M7 替换；M6 验收时若 M7 未合并，C 端相关 AC 记「未验证（依赖 M7）」，不得伪造通过。
- C 端不得恢复「多档案绑定 / 视角切换 / 培养计划选择 / 多选计划」。

---

## D6 · 回滚：备份恢复 + 代码 tag，禁止「只回滚代码 / 只补一个集合」

**背景**

M6 删除集合后，PocketBase schema 与数据同时消失。此时如果只回滚代码（`git checkout` 旧版本），旧代码会访问不存在的集合，报错面比删除前更大；如果只补一个集合，schema 与索引、旧行、菜单 / 角色授权都无法还原，形成半旧半新的不可用状态。因此回滚必须是一个**整体**动作。

另外，M6 删除发生在维护窗口内，理想 RPO ≈ 0；但如果窗口外继续有写入，RPO 会扩大。回滚方案必须写明 RPO/RTO 与演练要求，不能只写「用备份恢复」。

**选项**

1. **整库恢复 + 回滚代码 tag**：停服 → 恢复 S1 备份 zip（PB 后台 / `pb.backups.restore`）→ 切回 `pre-m6-cleanup-<date>` tag → 重建启动 → 验证集合数 / 行数 / 登录 / 关键页。
2. **只回滚代码**：保留已删除的数据，旧代码报错。
3. **按集合逐个恢复**：从备份里导出单个集合再导入。
4. **依赖 PB 自动备份**：不额外指定备份点。

**结论**

选 1。理由：

- 选项 2 必然失败：旧代码引用 19 个已删集合，任何列表 / 登录 bootstrap 都可能 500。
- 选项 3 在 PocketBase 中没有可靠的单集合还原路径（备份是整库 zip；导入需自己写脚本且 relation / 索引 / 行 id 难保一致），且 19 个集合互相引用，逐个补必然缺关系。
- 选项 4 的自动备份点位不可控，可能落在删除后；S1 的显式备份是唯一确定的恢复点。
- 代码 tag 必须在 S0 创建（`pre-m6-cleanup-<date>`），否则回滚时找不到「删除前最后一个可用版本」；tag 与备份 key 一起写入变更单。
- 恢复演练（S1）就是回滚预演：先证明备份可用，再允许删除；否则「有备份」只是心理安慰。

**后果**

- S0 创建 tag；S1 记录 backup key + sha256 + 演练结果；S6 变更单记录两者。
- 回滚顺序固定：停服 → 再备份当前库（留证）→ 恢复 S1 备份 → 切 tag → 重建 → 验证（集合数与 S1 快照一致、关键行数一致、superAdmin / 平台运营可登录、报告列表与 C 端报告页可打开、`oper_logs` 有回滚记录）。
- 迁移脚本失败不自动重试；必须恢复备份后重来，避免「部分删除 + 重试」产生不一致。
- RPO：维护窗口内停写 ≈ 0；未停写则 RPO = 备份点至故障点，写入变更单。
- RTO：本地 / 单机 ≤ 30 分钟；生产按 `docs/OPERATIONS.md` §7 / §8 执行。
- 回滚后如需再次执行 M6，必须重新走 S1 备份（不能复用旧备份）并重新 dry-run。

---

## 决策汇总

| 编号 | 决策 | 一句话 |
| --- | --- | --- |
| D1 | 删除策略 | 备份后按「停菜单 → 删路由 → 删页面 → 删集合」物理删除 19 个旧集合与全部旧入口，旧数据不迁移 |
| D2 | 备份门槛 | 迁移脚本强制目标显式、备份校验、dry-run、恢复演练；`setup.mjs` 永不承担清库 |
| D3 | 角色矩阵 | 平台运营（customer-admin 升级）/ 报告审核 / 规则配置三角色 + superAdmin；工作台拆 `talent:dashboard:list`；系统管理仅 superAdmin |
| D4 | 机构端退出 | 删机构菜单 / 页面 / API / 角色 / 集合；账号停用留痕；不迁移、不恢复多租户 |
| D5 | 旧 C 端退出 | 删旧 bindings / 计划选择；归属唯一真源 `talent_parents.userId`；阅读进度保留、M7 重写 |
| D6 | 回滚 | 整库恢复 + 代码 tag；禁止只回滚代码或只补单集合；演练先行 |

## 遗留与移交

- **PRD 文字冲突**（平台运营管理员是否可见系统管理）→ spec §12 Q2，lead / 客户书面确认。
- **三角色显示名 / roleKey 是否改名** → spec §12 Q6，M9 可迁移。
- **M7 交接**：旧 C 端报告页由 M7 替换；M6 出口依赖 M7 完成或书面豁免（spec §7.3）。
- **M8 交接**：旧 integration / sync-config / PDF 已删除，M8 按新合同重建（spec §3.5）。
- **M9 交接**：全量 E2E 重写、性能验收、`roleKey` 改名（如需）、历史 CSV 保留期。