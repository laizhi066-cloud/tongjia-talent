# M5 培育建议域 · 验收与追溯

> 状态：**已验收（2026-11-17，verifier-m45 / task-34）**。M5-A（数据层/领域）、M5-B（9 条后台 API + 权限菜单）、M5-C（B 端 15 列页面与弹层）均已实现并取得证据；C 端只读契约的服务端守卫已由单测覆盖，C 端路由与页面按实现方声明留 M7（本表相关条目记 `未验证`/`不在范围`，不判缺陷，见 §6 F4）。
> 依据：[M5 培育建议规格](spec.md)、[ADR 0005](../../adr/0005-m5-advice-domain.md)、PRD v1.1 §6.7（L301–322）/ §7.6（L374–380）/ §8.2 advice_version·advice_doc（L488–494）/ §8.3（L533）/ §9（L564–566、L572）/ §10（L581–587）/ §12（L615、L625）/ §13.2（L647–648）/ §13.3（L656）、BR-06/07/10/11/13（L102–109）、[M3 报告域规格](../M3-reports/spec.md) §3.1/§4.1/§7.1/§8.2、[ADR 0003](../../adr/0003-m3-report-domain.md)、[M2 会员域规格](../M2-members/spec.md) §3.4、[M4 方向匹配规格](../M4-matching/spec.md) §7、[M1 规则域规格](../M1-rules/spec.md) §3.3、`docs/QUALITY.md` 风险分级。
> 状态取值只允许：`通过` / `未通过` / `未验证` / `不在范围` / `待裁决`。
> 证据必须是命令 + 退出码 + 关键输出（或页面步骤 + 截图/观察记录），不能只写「已实现」或「页面正常」。
> 验收环境：演示库 PocketBase `http://127.0.0.1:8090` + Nuxt `http://127.0.0.1:3000`（账号 `superAdmin`）；新空库 `http://127.0.0.1:8094`（`/tmp/tj-m4m5-smoke` + `/tmp/tj-pb/pocketbase`，未触碰真实 `pb_data/`）。执行日期 2026-11-17。

## 1. 范围与前置

**验收对象**（对应 spec 章节，均已核对实际文件）

- 集合：`talent_advice_versions`（15 字段、3 索引，含单一生效部分唯一索引）、`talent_advice_docs`（32 字段、8 索引，含版本内一人一份部分唯一键）。
- 领域：年龄精确周岁/匹配键、建议编号与 `sections` 归一化、接收新一版、版本与建议状态机、派生可见性、脱敏读模型（`server/utils/talent-advice.ts`、`talent-advice-source.ts`）。
- 服务端：spec §5.2 的 9 条后台路由（含静态段优先守卫）、Zod/权限/审计/响应映射、导出。
- B 端：`/admin/talent/advice` 列表（15 列 + 固定操作列 + 5 项检索 + 版本视图）、建议书弹层、版本历史弹层、按人历史弹层、接收新一版弹层、发布/撤回弹层、导出。
- 权限与菜单：复用 `talent:advice:list`（C 行唯一），新增 4 个 F 码（view/publish/sync/export）。
- C 端契约：`GET /api/client/talent/advice` 的响应结构与守卫由领域函数冻结，路由与页面归 M7（`未验证`）。

**不在本次验收**（spec §1.2，标 `不在范围`）

- C 端页面、C 端路由文件（M7；M5 只验服务端契约与守卫）；
- M3 报告状态机/快照/发布撤回/一键同步、报告详情第 4 页签页面（M3）；
- M4 方向命中/推荐/选择、M1 要素/分级/注解配置、M2 建档/绑定解绑（仅验边界不读写、不泄露明文）；
- M8 真实外部建议接口/重试/告警/定时同步（M5 只验 Mock 源与 `503` 不静默降级）；
- M6 旧集合/旧页面清理与三角色正式授权；M9 1000 条性能与 e2e 重写。

**前置依赖（2026-11-17 复核）**

| # | 前置 | 状态（2026-11-17） | 影响的验收项 |
| --- | --- | --- | --- |
| P1 | M1 规则域已验收（仅用于「建议不依赖 M1」的对照） | **已验收**（[M1 acceptance](../M1-rules/acceptance.md)） | §2.5 对照 |
| P2 | M3 报告域：`talent_gene_reports`/`talent_reports`、C 端 409 契约 | **已交付并可用**（M3-A/B/C 完成；独立验收 task-33 待执行） | 全部联调项、§2.1、§2.4 |
| P3 | M2 会员域：归属 helper、脱敏/HMAC、解绑不删档 | **已实现并验收**（task-9/task-16） | 归属、可见性、E12 |
| P4 | M4 方向匹配：`directionSnapshot`/`selections` 只读对照 | **已交付**（本卡 task-34 同批验收 M4） | §2.5 边界（M5 不读写 M4） |
| P5 | 本地 PocketBase、`.env` 超管凭据与 `ENCRYPTION_KEY` | 满足（`env:doctor` 通过） | schema / 幂等 / 权限验收 |
| P6 | 新库烟测使用新建空目录 | 满足（`/tmp/tj-m4m5-smoke`） | 索引/幂等验收 |
| P7 | 权限验收账号 `admin` / `superadmin`；三角色正式授权属 M6 | 两个账号均可用；无受限角色（403 未验证，见 §6 F3） | 权限码/菜单验收 |
| P8 | Mock 建议源可用；真实外部接口 M8 不验收 | 满足（E1/E2 单测 + E16 接收新版实跑） | §2.2 / §2.4 |
| P9 | M7 C 端页面未开始 | **未开始** | AC-ADM-07-3 的 C 端页面证据记「不在范围（M7）」 |

## 2. 追溯表

> 「实现（实际落点）」已由 verifier 核对；「测试 / 证据」输出写入 §3。

### 2.1 AC-ADM-07-1..4（PRD §6.7 L319–322）

| ID | 需求 | PRD 位置 | 实现（实际落点） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| AC-ADM-07-1 | 15 列对齐，操作列固定 | §6.7 L303、L319 | `app/pages/admin/talent/advice.vue:143-281`（14 业务列 + `createActionColumn` 固定右列，`fixed:'right'`）；派生缓存字段渲染 | `GET /api/admin/talent/advice` | E3（单测断言 15 列字段、不含 sections/idNoHash）、E16（接口行字段齐全）、E10（浏览器表头顺序与 `position:sticky;right:0`） | 通过 |
| AC-ADM-07-2 | 年龄按精确周岁匹配（输 7 只命中 7 岁） | §6.7 L305、L320 | 冻结 `age` + 列表精确相等过滤（`talent-advice-api.ts` `matchesTalentAdviceListQuery`）；`ageLabel` 渲染「N 岁」 | `GET /api/admin/talent/advice?age=7` | E2（单测：生日当天/前后、闰年 2/29、未来生日）、E16（`age=7`→1 行且 `age=7`；`age=10`→1 行；`7-8`/`7岁`→422）、E10（页面输入 7 只余 1 行「7 岁」） | 通过 |
| AC-ADM-07-3 | 撤回后 C 端对应建议消失，发布后恢复 | §6.7 L321、BR-10 L106、BR-06 L102 | 发布/撤回 + 派生可见性 `isTalentAdviceClientVisible`/`resolveTalentAdviceClientVisibility`；C 端守卫 `getTalentAdviceClientSnapshot` | `POST /advice/:id/withdraw`、`/publish`；`GET /api/client/talent/advice`（M7） | E16（撤回后列表 `clientVisible=false` 且 `withdrawnAt` 有值；重新发布 `clientVisible=true` 且 `withdrawnAt` 清空；报告 `pending_publish` 的建议 `clientVisible=false`）、E2/E12（单测六种组合 + 409/404 守卫）；**C 端页面证据不在范围（M7）** | 通过 |
| AC-ADM-07-4 | 切到历史版本出现「历史版本只读」提示，发布/撤回按钮隐藏 | §6.7 L322 | 版本视图（`viewing.isCurrent=false`）+ 页面只读条（`advice.vue:571-588`）+ 行内按钮条件 `!row.versionReadonly` | `GET /advice?versionId=归档版本`、`POST /advice/:id/publish` | E16（归档视图 `rows` 全 `versionReadonly=true`；对归档建议 publish → 409 `ADVICE_VERSION_READONLY`）、E10（只读条文案含版本号与周期；行内发布/撤回按钮 0 个；「回到当前生效版」恢复） | 通过 |

### 2.2 FR-ADM-07 功能条目（PRD §6.7 L303–315）

| 需求 | PRD 位置 | 实现（实际落点） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 检索 5 项：建议编号 / 子女姓名 / 身份证（前4·后4·完整18）/ 报告编号 / 年龄（精确周岁），条件交集 | §6.7 L305、BR-13 L109 | `talent-advice-api.ts:222` `parseTalentAdviceListQuery` + 列表过滤；4 位走 `maskedIdNo` 包含、18 位走 `idNoHash` 精确；其它长度 422 | E16：adviceNo 命中 1、姓名命中 1、`1101` 命中 2、18 位身份证两号各命中 1、`1101012`→422 `INVALID_ID_NO_LENGTH`、`R202611160002` 命中 1、`age=7/10` 各 1 且精确、`7-8`/`7岁`→422、AND 交集 1/0；E3 单测；E10 页面检索 | 通过 |
| 尾部「接收新一版建议」→ 选同步日期 → 旧版归档 → 新版生效 → C 端切换 | §6.7 L307、BR-07 L103 | `POST /advice/versions` + 版本状态机 + `AdviceSyncModal`（默认值=当前版 `nextUpdateAt`） | E16：`effectiveAt=2027-01-15` → 新版本 `V2027.01` active、旧版 archived、`docCount=2`、`archivedVersionId`=旧 active、`talent_advice_versions` 仅 1 行 active、`talent_sync_logs` +1（`syncScope=advice_version`，status=success）、`oper_logs` 1 条；重复提交 409 `ADVICE_VERSION_EXISTS`、早于当前版 409 `ADVICE_VERSION_ORDER`、非法日期 422；E10 弹层默认 `effectiveAt=2027-03-12`、`versionNo=V2027.03`；E2 单测锁/补偿/C 端切换 | 通过 |
| 版本历史：按版本看份数与状态，只读回溯；「回到当前生效版」 | §6.7 L313 | `GET /advice/versions`（`listTalentAdviceVersions`）+ `AdviceVersionHistoryModal` | E16：`total=2`、`isCurrent` 唯一为 true、每行 `docCount/publishedCount/withdrawnCount` 与集合聚合逐项一致；E10：弹层列出 V2026.07/V2026.11 与「查看该版本」；E3 单测 | 通过 |
| 建议书：按分册展示四段家长文案 | §6.7 L309、§7.6 L378 | `GET /advice/:id`（`buildTalentAdviceBookGroups`）+ `AdviceBookModal` | E16：`books=A,B,C,D` 升序、每册 `adviceNo={adviceNo}-{book}`、四段键齐全（`content/example/direction/suggestion`）、`sectionCount` 与 sections 一致；E10：弹层标题「培育建议书（同步原文）」、四段标题齐全、分组 4 个；E3/E2 单测 | 通过 |
| 发布/撤回：仅当前生效版本可操作，历史版本只读 | §6.7 L311、L322 | `publishTalentAdviceDoc`/`withdrawTalentAdviceDoc` + 路由 | E16：发布/撤回各成功一次并刷新 `publishedAt/withdrawnAt`；重复动作 409 `ADVICE_ALREADY_PUBLISHED`/`ADVICE_ALREADY_WITHDRAWN`；历史版本 409 `ADVICE_VERSION_READONLY`；E2 单测；E3 权限码断言 | 通过 |
| 导出 | §6.7 L311 | `GET /advice/export`（`buildTalentAdviceExportCsv`，CSV 15 列含撤回时间） | E16：`status=200`、原始字节 `EF BB BF`（BOM）、表头 15 列、行数与列表一致、身份证列脱敏、历史版本导出 2 行、`idNo=12345` 422；E2 单测 `>10000 行` 422 | 通过 |
| 口径：外部同步即默认已发布；后台逐份撤回后家长端立即不可见；正文只同步不改写 | §6.7 L315、ADR D3 | 接收新版所有建议行 `published`；发布/撤回只改可见性 | E16：接收新版后列表两行均 `published`；发布/撤回前后 `books/sections/age/matchKey` 未变（详情读取一致）；E3 单测断言无正文编辑/新建/删除/版本回切路由 | 通过 |

### 2.3 BR 业务规则（PRD L102–109）

| 需求 | PRD 位置 | 实现 | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| BR-06 建议与报告同发（派生可见性，不双写） | L102 | `isTalentAdviceClientVisible`（报告状态 ∧ 建议状态 ∧ 当前生效版 ∧ 归属） | E2/E12 单测六种组合；E16：报告 `pending_publish` 的建议 `clientVisible=false`、已发布报告的建议 `clientVisible=true`；撤回建议 → false、重新发布 → true；`grep` 确认 M3 代码无 `talent_advice` 写入、M5 代码无 `talent_reports` 写入 | 通过 |
| BR-07 建议按周期更新（默认 4 个月；旧版归档只读；C 端只展示当前生效版） | L103 | `TALENT_ADVICE_CYCLE_MONTHS=4`、版本行冻结 `cycle/nextUpdateAt` | E1/E2 单测（`nextUpdateAt=effectiveAt+4 月`、`cycle` 文本）；E16：active 版 `cycle=2026-11 ~ 2027-02`、`nextUpdateAt=2027-03-12`；历史版本发布/撤回 409；E10 只读条 | 通过 |
| BR-10 报告撤回 C 端口径（建议不可见） | L106 | `assertTalentAdviceReadable`/`getTalentAdviceClientSnapshot`（409 `report_retracted`） | E2/E12 单测（报告 retracted → 409；报告可读但建议撤回 → 200 `available=false`）；C 端路由由 M7 实现 → 接口级未验证 | 通过 |
| BR-11 敏感信息脱敏（身份证前 4 + 后 4） | L107 | 只读 `maskedIdNo`/`idNoHash`，`idNoHash` 永不返回 | E16：列表/详情/导出均无 18 位明文、无 `idNoHash`/`idNoCipher`；审计摘要无证件号；E3 单测 | 通过 |
| BR-13 列表规范（一列一字段、筛选交集、每页 20） | L109 | 15 列表头固定、`pageSize` 默认 20 上限 100、筛选 AND | E10 表头顺序与数量；E16 `pageSize=20`、2025 年交集 `total` 手工核对（1/0）；E3 单测 | 通过 |

### 2.4 PRD §8.2 / §8.3 / §9 / §10 / §12 / §13.2 映射

| 需求 | PRD 位置 | 实现 | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| advice_version 字段完整（name/status/cycle/effective_at/next_update_at/synced_at/source/note/operator） | §8.2 L492 | `talent_advice_versions` 15 字段 | E7 新库字段/索引断言；E16 接收新版后逐字段核对；`operator` 拆 id + 名称快照 | 通过 |
| advice_doc 字段完整（gene_report_id/report_no/name/id_no/gender/birthday/age/match_key/version_id/version_name/publish_status/published_at/withdrawn_at/synced_at/books/sections） | §8.2 L493 | `talent_advice_docs` 32 字段 | E7 新库字段/索引断言；字段映射逐项核对（`id_no` → `maskedIdNo`+`idNoHash`，`id` → `adviceNo`） | 通过 |
| sections[] 字段完整（book/book_name/chapter/factor/entropy/content/example/direction/suggestion/variant） | §8.2 L494 | `normalizeTalentAdviceSections`（白名单、超长/条数/体积校验、PII 文本拒绝） | E1 单测（10 键、空段允许、非法分册/变体/超长拒绝）；E16 详情四段 | 通过 |
| §8.3 建议状态机（已发布 ⇄ 已撤回）+ 版本维度 | L533 | `publishTalentAdviceDoc`/`withdrawTalentAdviceDoc`/`receiveTalentAdviceVersion` | E2 单测状态矩阵 + 版本 active 唯一性；E16 E2E 发布/撤回/接收 | 通过 |
| §9 建议分组 API + C 端建议 | L564–566、L572 | 9 条后台路由；C 端契约冻结 | E3 路由清单断言；E16 静态优先/401/C 端 404；C 端路由由 M7 实现 | 通过 |
| §10 数据权限、脱敏、审计、C 端归属与状态 | L581–587 | 后台按权限码；C 端按 `talent_parents.userId` + M2/M3 helper | E2/E12 单测（跨家长/解绑 404、报告不可读 409）；E16 审计日志与脱敏；401 实测 | 通过 |
| §12 后台「建议 15 列、撤回/发布、版本历史只读、接收新一版后 C 端切换」 | L615 | 页面 + 接口 | E10（15 列/发布撤回/只读/接收弹层）+ E16（接口） | 通过 |
| §12 C 端「建议按分册、四段文案、周期说明」 | L625 | 契约 §7.3/§5.4.8 | E2 单测 `buildTalentAdviceClientSnapshot`（不含后台字段、按分册排序、过滤变体）；页面 M7 | 通过 |
| §13.2-1 补发新增分册后建议是否立即补册（当前按周期等下版） | L647 | 无「按册补发建议」路由/函数 | E3 路由清单断言「无按册补发」；E16 补发后建议覆盖册不变（M3 数据未动） | 通过 |
| §13.2-2 报告撤回时建议是否同步置撤回（当前不改状态、C 端不可见） | L648 | 派生可见性，不双写 | E2 单测（报告撤回后建议行 `publishStatus` 仍 `published`、`withdrawnAt` 空、C 端不可见） | 通过 |
| §13.3 历史版本是否需要导出 | L656 | 默认允许「跟随查看版本导出」 | E16：`/advice/export?versionId=归档版` 200、2 行 | 待裁决 |
### 2.5 工程红线与跨模块契约

| 需求 | 位置 | 测试 / 证据 | 状态 |
| --- | --- | --- | --- |
| 单实例、单 PocketBase、无多租户 | AGENTS.md 红线 | E14：`grep -rnE "TENANT_MODE\|X-Site-Slug\|site.cookie"` 于 M5 新增文件无命中；无第二个 PB 连接 | 通过 |
| 业务字段只落 `talent_*`，不回填 `users`/`configs`/`site_config` | AGENTS.md 红线 | E14：无 `collection("users"/"configs"/"site_config")` 命中；新库集合清单只多 2 个 `talent_advice_*` | 通过 |
| `setup.mjs` 只初始化空库；`sync-talent.mjs` 只加不删 | CONVENTIONS §1、ADR 0001-D1 | E7/E8：空库 `env:setup` 53 业务集合 → `talent:sync` 后 58（含 5 个 PB 系统集合），集合名清单与演示库一致；连续 sync 集合/字段/索引/菜单不变 | 通过 |
| 旧口径不复用、不迁移（`talent_cultivation_contents` 等） | ADR 0005-D6 | E14：M5 代码/API/seed 对旧集合仅注释提及，无读写；无迁移脚本 | 通过 |
| M3 不写建议、M5 不写报告 | M3 spec §8.2、ADR 0005-D4 | E14：`grep -rn "talent_advice" server/utils/talent-report*.ts server/api/admin/talent/reports` 无命中；M5 只读 `talent_reports`/`talent_gene_reports` 做归属与可见性 | 通过 |
| M5 不读身份证明文/不解密 | spec §8.1、ADR 0005-D5 | E14：`grep -rnE "decryptTalentSensitive\|idNoCipher"` 无命中；集合只存 `maskedIdNo`/`idNoHash` | 通过 |
| C 端契约与 M3 一致（409 状态码/文案） | M3 §7.1、spec §7.1 | E2/E12 单测 `report_pending`/`report_retracted` 的 code/state/message 与 M3 一致 | 通过 |
| 建议与方向无耦合 | spec §8.3 | E14：`grep -rnE "talent_directions\|directionSnapshot\|selections"` 于 M5 文件无命中 | 通过 |
| 静态段优先于旧 `[resource]` 动态路由 | spec §5.7 | E16：`versions/subject/export` 200、`GET /advice/<真实id>` 200、`POST /advice` 404；E3 单测 | 通过 |

## 3. 证据表（已执行）

> 执行人 verifier-m45；日期 2026-11-17。命令均在仓库根执行；日志 `/tmp/m45-*.log`、截图 `/tmp/m45-shots/*.png`（临时目录，不入库）。

| # | 验收条目 | 命令或步骤（见 §5） | 退出码 | 关键输出 | 结论 |
| --- | --- | --- | --- | --- | --- |
| E1 | 领域：年龄/编号/sections/派生/脱敏 | `pnpm exec vitest run test/talent-advice-domain.test.ts` | 0 | `Test Files 1 passed`；`Tests 25 passed` | 通过 |
| E2 | 版本接收/状态机/可见性 | `pnpm exec vitest run test/talent-advice-sync.test.ts` | 0 | `Test Files 1 passed`；`Tests 37 passed`（含锁内串行、补偿回滚、派生可见性矩阵、客户端快照） | 通过 |
| E3 | 路由/权限/静态优先/导出 | `pnpm exec vitest run test/talent-advice-api.test.ts` | 0 | `Test Files 1 passed`；`Tests 27 passed`（9 端点/5 权限码/静态优先/无编辑路由/15 列字段） | 通过 |
| E4 | 回归：M2/M3/M4 既有测试 | `pnpm exec vitest run test/talent-report-domain.test.ts test/talent-member-domain.test.ts test/talent-direction-match.test.ts` | 0 | `Test Files 3 passed`；`Tests 134 passed` | 通过 |
| E5 | 类型检查 | `pnpm typecheck` | 0 | 仅既有 WARN：`Duplicated imports "TALENT_REPORT_STATUSES/TalentReportStatus/TALENT_REPORT_STATUS_LABELS"`（M3 shared types） | 通过 |
| E6 | Lint | `pnpm lint` | 1 | `✖ 58 problems (57 errors, 1 warning)`；分布在 `apps/client/**`（M7-A 并行改造，`style/eol-last` 等）与 `server/utils/talent-external-adapter.ts`、`test/talent-report-api.test.ts`；**M4/M5 文件 0 条** | 未通过 |
| E7 | 新库 schema（2 集合 + 索引 + 单 active 部分唯一索引） | `export POCKETBASE_BINARY=/tmp/tj-pb/pocketbase POCKETBASE_URL=http://127.0.0.1:8094 POCKETBASE_DATA_DIR=/tmp/tj-m4m5-smoke/data POCKETBASE_MIGRATIONS_DIR=/tmp/tj-m4m5-smoke/migrations`；`pnpm env:doctor`；`pnpm env:setup`；`pnpm pb` 后逐集合读取 | 0/0/0 | `talent_advice_versions`：15 字段、3 索引（`idx_..._no` UNIQUE、`idx_..._active` UNIQUE `WHERE status="active"`、`idx_..._effective`）；`talent_advice_docs`：32 字段、8 索引（`idx_..._no` UNIQUE、`idx_..._version_gene` UNIQUE `WHERE geneReportId != ""`、`_version_status/_report/_gene/_subject/_reportno/_synced`）；旧集合/旧索引仍在 | 通过 |
| E8 | 存量库幂等（连续两次，只加不删） | 同上环境 `pnpm talent:sync` ×3 | 0/0/0 | 第 3 次后 `collectionCount=58`（53 业务 + 5 PB 系统）、`menuCount=124`、`cMenuCount=33`，与第 1/2 次一致；集合名清单与演示库 8090 完全一致 | 通过 |
| E9 | 种子幂等与场景覆盖 | 同上环境 `pnpm talent:rule:seed && pnpm talent:member:seed && pnpm talent:report:seed && pnpm talent:advice:seed` ×2 | 0/0/0/0 ×2 | 第一次后：`factors=158 / levels=4 / tiers=4 / factor_notes=632 / parents=1 / children=2 / gene_reports=2 / reports=2 / advice_versions=2（active=1）/ advice_docs=4 / directions=6`；第二次完全一致（行数不变、仍 1 个 active 版本） | 通过 |
| E10 | 页面人工/自动化烟测（AC-ADM-07-1/2/4 + 建议书/版本/接收/发布撤回/导出） | Playwright（chromium 1500×940，superAdmin 登录 `127.0.0.1:3000`）访问 `/admin/talent/advice` | 0 | 11 项检查全 PASS：15 列表头顺序完全一致；操作列 `n-data-table-th--fixed-right`、`position=sticky; right=0px`；行数 2；`age=7` 检索后仅 1 行「7 岁」；建议书弹层四段齐全、分组 4 个；版本历史含 V2026.07/V2026.11 与「查看该版本」；历史视图只读条 + 行内发布/撤回按钮 0 个 + 「回到当前生效版」；接收弹层默认 `effectiveAt=2027-03-12`、`versionNo=V2027.03`；导出按钮存在；`consoleErrors=[]`；截图 `m5-advice-list.png`、`m5-advice-book.png`、`m5-advice-readonly.png`、`m5-advice-sync.png` | 通过 |
| E11 | API 安全直连（401/403/409/422/503 + 日志） | 脚本 `/tmp/m45-m5.mjs`（curl/fetch 直连 + PB 直读）：列表/详情/版本/历史/导出/发布/撤回/接收 + 未登录 + 受限校验 | 0 | 401 实测通过（未带 token → 401）；409 实测：`ADVICE_VERSION_READONLY` / `ADVICE_ALREADY_WITHDRAWN` / `ADVICE_ALREADY_PUBLISHED` / `ADVICE_VERSION_EXISTS` / `ADVICE_VERSION_ORDER`；422 实测：日期格式、`age=7-8`、`age=7岁`、`idNo` 非 4/18 位；503（外部源不可用）仅单测（E2），未实测；403 未验证（无受限角色，见 F3）；`oper_logs` 发布/撤回/接收各 1 条且无手机号/身份证明文 | 通过 |
| E12 | C 端守卫（AC-ADM-07-3 服务端证据） | `pnpm exec vitest run test/talent-advice-sync.test.ts -t "可见"`（等价：E2 全量） | 0 | 单测覆盖：报告 `pending_publish`/`retracted` → 409 固定码；非本人/未绑定/已解绑 → 404；报告可读 + 建议已发布 → `available=true` 按分册返回最小 variant；建议撤回/无生效版本 → `available=false` + 空态文案 | 通过 |
| E13 | 静态路由优先实测 | E16 中 `GET /advice/versions`、`/advice/subject`、`/advice/export`、`/advice/<真实 id>`、`POST /advice` | 0 | 200/200/200/200/404；`assertTalentAdviceDetailSegment` 双保险拦截静态段 | 通过 |
| E14 | 红线审查（无旧口径读写、无 M3 写建议、无明文、无 M4 耦合） | `grep -rnE "talent_cultivation_contents\|talent_content_libraries\|talent_elements\|talent_directions\|directionSnapshot\|selections\|decryptTalentSensitive\|idNoCipher" server/utils/talent-advice*.ts server/api/admin/talent/advice scripts/seed-talent-advice.mjs`；`grep -rn "talent_advice" server/utils/talent-report*.ts server/api/admin/talent/reports`；`grep -rnE "collection\(\"users\"\)\|collection\(\"configs\"\)\|collection\(\"site_config\"\)"` | 1（无命中，仅注释提及旧集合） | 三条红线检查均无功能性命中；M5 只读报告/会员，不写它们；M3 不触碰建议集合 | 通过 |
| E15 | 文档/空白检查 | `grep -nE " +$" docs/specs/M4-matching/acceptance.md docs/specs/M5-advice/acceptance.md`；文件末尾换行检查（两个文件当前为新增未跟踪文件，`git diff --check` 不覆盖未跟踪文件） | 1（无匹配） | 行尾空白 0 行；两个文件均以换行结尾 | 通过 |
| E16 | 演示库业务链路（M5 主路径） | 脚本 `/tmp/m45-m5.mjs`（PB 8090 + Nuxt 3000，superAdmin） | 0 | 51 项断言 48 PASS；3 项为脚本断言口径错误（见下方注）→ 复核后实际均符合 spec；关键输出见 §2.1/§2.2 各行：列表/检索/版本/详情/历史/subject/发布撤回/接收新版/导出/静态优先/审计 | 通过 |
| E17 | 测试后数据恢复与 M2/M3 完整性 | 测试前快照 10 个集合 → 测试后逐字段恢复并复核 | 0 | `TOTAL_DIFFS=0`：报告 2、基因报告 2、建议版本 2（1 active）、建议 4、方向 6、待归并 0、家长 1、子女 2、分级 4、档位 4；`menus=124` 不变；未触碰真实 `pb_data/`，8094 临时库已停止 | 通过 |

- **E16 三项脚本断言更正**（实现均符合 spec，脚本写错）：① `versionId` 不存在时按 spec §5.5 返回 `404 ADVICE_VERSION_NOT_FOUND`（脚本误期望 200 + `viewing=null`）；② `/advice/:id/history` 按 spec §5.4.4 返回 `items[]`（脚本误读 `rows`）；③ 导出 CSV 的 BOM 在 Node `fetch.text()` 解码时被剥离，原始字节为 `EF BB BF`（实测 `xxd` 确认），脚本以 `text.startsWith("\uFEFF")` 断言导致误报。

## 4. 待裁决 / 未决项（与 spec §14 一致）

| # | 未决项 | 本文处理 | 需谁裁决 | 验收状态（2026-11-17） |
| --- | --- | --- | --- | --- |
| C1 | 数据熵等级名（优秀/优良、弱态/弱势）与 M1 四档口径 | 白名单双收、原样保存展示 | 客户 / PRD v1.2 | 已按白名单实现（E1）；口径未变 |
| C2 | C 端「各自编号」是否展示含报告编号的完整建议编号 | 默认按册派生 `{adviceNo}-{book}` | 客户 / lead | 已按默认实现（E16：`AD-...-202611-A`） |
| C3 | 建议周期是否可配置 | 常量 4 个月；版本行冻结 | 客户 / lead | 已按默认实现（E16 `nextUpdateAt=+4 月`） |
| C4 | 历史版本是否需要导出（PRD §13.3 L656） | 默认允许「跟随查看版本导出」 | 客户 | 已实现（E16 归档版导出 2 行）；是否作为正式能力待客户确认 |
| C5 | 补发新增分册后建议是否立即补该册（PRD §13.2-1） | 不提供按册补发，随下一版进入 | 客户 | 已按当前口径（E3 路由清单断言无按册补发） |
| C6 | 报告撤回时建议是否同步置撤回（PRD §13.2-2） | 当前不改状态、C 端派生不可见 | 客户 / lead | 已按当前口径（E2 单测） |
| C7 | 接收新版是全量基因报告重扫还是仅上一版基线 | 本文按全量候选 | M8 / 客户 | 已按全量实现（E16 `docCount=2` 覆盖全部基因报告） |
| C8 | M3 报告详情第 4 页签接线归属 | M5 提供 `GET /advice/subject`；M3 路由 1 处改调由 lead 派发 | lead | 接口已实现并实测 200（E16）；页面接线是否已挂到 M3 详情页不在本卡范围 |

## 5. 命令清单（可复现）

```bash
# 1. 定向单测（注意：合同写的 talent-advice-version.test.ts 实际为 talent-advice-sync.test.ts）
pnpm exec vitest run test/talent-advice-domain.test.ts
pnpm exec vitest run test/talent-advice-sync.test.ts
pnpm exec vitest run test/talent-advice-api.test.ts

# 2. 回归（M2/M3/M4 既有领域测试）
pnpm exec vitest run test/talent-report-domain.test.ts test/talent-member-domain.test.ts test/talent-direction-match.test.ts

# 3. 类型 / lint / 构建
pnpm typecheck
pnpm lint        # 当前 57 errors 均在 apps/client（M7-A 并行改造）与 M8/M3 文件；M4/M5 文件 0 条
pnpm build

# 4. 新库 schema 烟测（必须指向新建空目录，禁止指向真实 pb_data/）
export POCKETBASE_BINARY=/tmp/tj-pb/pocketbase
export POCKETBASE_URL=http://127.0.0.1:8094
export POCKETBASE_DATA_DIR="$(mktemp -d /tmp/tj-m4m5-data-XXXXXX)"
export POCKETBASE_MIGRATIONS_DIR="$(mktemp -d /tmp/tj-m4m5-mig-XXXXXX)"
pnpm env:doctor && pnpm env:setup
pnpm pb &                  # 8094
pnpm talent:sync && pnpm talent:sync
# 断言：talent_advice_versions（3 索引，含 UNIQUE WHERE status="active"）
#       talent_advice_docs（8 索引，含 UNIQUE WHERE geneReportId != ""）

# 5. 种子幂等（同一临时库，连续两次；需确认变量）
export TALENT_RULE_SEED_CONFIRM=rule TALENT_MEMBER_SEED_CONFIRM=member
export TALENT_REPORT_SEED_CONFIRM=report TALENT_ADVICE_SEED_CONFIRM=YES
pnpm talent:rule:seed && pnpm talent:member:seed && pnpm talent:report:seed && pnpm talent:advice:seed
pnpm talent:rule:seed && pnpm talent:member:seed && pnpm talent:report:seed && pnpm talent:advice:seed

# 6. 页面烟测（演示库 8090 + Nuxt 3000）
pnpm dev    # 127.0.0.1:3000
# superAdmin → /admin/talent/advice：15 列 + 固定操作列；age=7 精确；建议书四段；
# 版本历史 → 查看该版本 → 只读条 + 按钮隐藏 → 回到当前生效版；接收新一版弹层；导出

# 7. API 安全直连
#   未登录 → 401；归档版 publish → 409 ADVICE_VERSION_READONLY；
#   重复版本 → 409 ADVICE_VERSION_EXISTS；age=7-8 / idNo=7 位 → 422；
#   接收新版 → talent_sync_logs 1 条（syncScope=advice_version）+ oper_logs 1 条；
#   导出原始字节以 EF BB BF 开头、15 列表头；响应不含 idNoHash / 明文证件

# 8. 红线审查
grep -rnE "talent_cultivation_contents|talent_content_libraries|talent_elements|talent_directions|directionSnapshot|selections|decryptTalentSensitive|idNoCipher" \
  server/utils/talent-advice*.ts server/api/admin/talent/advice scripts/seed-talent-advice.mjs   # 期望无命中
grep -rn "talent_advice" server/utils/talent-report*.ts server/api/admin/talent/reports          # 期望无命中
```

- 旧 e2e 02–05 覆盖旧页，M5 不纳入门禁；M9 重写。
- C 端路由/页面归 M7；AC-ADM-07-3 的 C 端页面证据记「不在范围（M7）」，M5 以 E2/E12 服务端守卫作为证据，不视为缺口。

## 6. 已知缺口与风险（验收记录）

| # | 缺口 / 风险 | 影响 | 验收处置 |
| --- | --- | --- | --- |
| F1 | spec §5.6「服务端落点」写的是文件级路由（`advice/versions/index.get.ts`、`advice/[id]/publish.post.ts` 等），实际实现把 publish/withdraw 聚合为 `app/api/admin/talent/advice/[id]/[action].post.ts`、history 为 `[id]/[action].get.ts`（文件头注释：避免 Nitro 路由类型递归深度上限，HTTP 路径与 spec 完全一致） | 文档落点表与 diff 不一致，后续维护易误判 | 非缺陷（HTTP 契约一致，E13/E16 实测通过）；建议回写 spec §5.6 落点表 |
| F2 | 验收合同 E2 计划 `test/talent-advice-version.test.ts` 与 spec §5.6 测试清单同名文件未创建，实际为 `talent-advice-sync.test.ts`（37 tests） | 文档/测试文件口径不一致 | 已在本表更正（E2）；建议回写 spec §5.6/§11 |
| F3 | 403（无权限码）未实测：演示库 `superAdmin` / `admin` 均被 M2.0 菜单种子授予业务 F 码，无受限角色；三角色正式授权归 M6 | 权限拒绝路径缺少运行时证据 | 401 已实测；403 以「路由级 `requirePermission` 源码断言（E3）」作弱证据，不判通过；M6 三角色授权后补测 |
| F4 | C 端 `GET /api/client/talent/advice` 未实现（M7）；`/api/client/talent/advice` 实测 404 | AC-ADM-07-3 的 C 端页面、BR-10 的 C 端调用链、§12 C 端展示无法端到端验证 | 服务端守卫/可见性已有单测（E2/E12）；C 端记 `未验证`/`不在范围`，不阻塞 M5 服务端验收；由 M7 完成后补 |
| F5 | 演示库只有 1 份 `published` 报告（`R202611160002`）与 1 份 `pending_publish`（`R202611160001`）；未改写报告状态做「撤回→建议不可见→恢复」的端到端（避免破坏 M3 数据） | 报告状态机与建议可见性的端到端组合仅覆盖「pending_publish」一种 | 以单测六种组合（E2）+ 实测 pending 组合作为证据；M3/M9 联调时可补真实撤回链路 |
| F6 | 全量 `pnpm test` 6 条失败：`foundation-client-guard.test.ts`（3）、`talent-ui-closure.test.ts`（3），均为 M7-A 并行改造 `apps/client` 删除 `src/store/talent.ts`、`useProtectedFoundationPage.ts` 等导致 | 全量门禁当前非绿 | 与 M4/M5 无关；M7-A 完成后复跑；本卡以 M4/M5 定向测试为验收依据 |
| F7 | `pnpm lint` 57 errors：`apps/client/**`（M7-A 并行改造，`style/eol-last` 等）+ `server/utils/talent-external-adapter.ts`、`test/talent-report-api.test.ts`；M4/M5 文件 0 条 | 全局 lint 门禁非绿 | 与本卡无关；建议 M7-A 收口后统一 `pnpm format`；M4/M5 文件无需改动 |
| F8 | 验收脚本初版三处断言口径与实现不一致（历史版本 404、history `items`、CSV BOM） | 无产品影响 | 已在 E16 注中更正；不改实现 |
| G3 | 版本切换非跨请求事务 | 极端失败可能需人工核对 | 单测覆盖补偿（E2：激活失败删除新版本/建议并恢复旧版生效）；实测锁内串行（E2 并发接收一个成功一个 409） |
| G5 | M3 报告详情第 4 页签接线未在本卡验证 | 报告详情第 4 页签是否已挂载 `GET /advice/subject` 未知 | 接口已实现并 200（E16）；接线归 lead 派发，记「待接线（C8）」 |
| G7 | Mock 源与真实外部源字段差异（M8） | 上线前需契约联调 | M5 只验 Mock；M8 接入时按 spec §9 接口与 `sections` 白名单复核 |
