# M3 报告域 · 验收与追溯

> 状态：**验收完成（2026-11-17，verifier-m3 独立验收）**。本文是 M3 的验收合同：追溯表给范围与实际落点，证据表记录命令 / 退出码 / 观察结果。结论见 [§7](#7-结论verifier)。
> 依据：[M3 报告域规格](spec.md)、[ADR 0003](../../adr/0003-m3-report-domain.md)、PRD §6.6（L258–300）/ §8.2（L470–490）/ §8.3（L522–533）/ §9（L539–557）/ §10（L581–590）/ §12（L604–616）、BR-02–06/09/10/12（L96–110）、[M1 规格](../M1-rules/spec.md) / [ADR 0001](../../adr/0001-m1-rule-domain.md)、[M2 规格](../M2-members/spec.md) / [ADR 0002](../../adr/0002-m2-member-domain.md)、`docs/QUALITY.md` 风险分级。
> 状态取值只允许：`通过` / `未通过` / `未验证` / `不在范围` / `待裁决`；证据编号（E1–E18）见 §4。
> 证据文件在 `/tmp/tj-m3-verify/`（不提交仓库）；临时空库（8093）与截图目录均在验收后保留于 `/tmp`，PB 8093 已停止、临时数据目录已删除。

## 1. 范围与前置

**验收对象（实现已核对，文件与行号见 §2/§3）**

- 集合：`talent_gene_reports`（`scripts/setup.mjs:1276,1943-1990`）、`talent_reports` M3 增量字段/索引（`scripts/setup.mjs:1952-1984`）、`talent_sync_logs` 逐人明细字段（`scripts/setup.mjs:1474-1481`）；存量库同步 `scripts/sync-talent.mjs:288-400,875-940`。
- 领域：`server/utils/talent-report-snapshot.ts`（快照构建 / 状态机 / 版本链，646-1178）、`server/utils/talent-report-source.ts`（Mock 同步源 + preview/commit，600-1162）、`server/utils/talent-report.ts`（sanitize / C 端守卫 419-524）、`server/utils/talent-report-api.ts`（列表/详情/预览/动作/同步/同步日志，239-1426）、`server/utils/talent-report-lock.ts`。
- 服务端：`server/api/admin/talent/reports/**`（`index.get.ts`、`[id].get.ts`、`[id]/[action].get.ts`、`[id]/[action].post.ts`、`[id]/volumes/[volumeId].get.ts`、`sync.post.ts`、`sync-logs.get.ts`）与 `server/api/admin/talent/gene-reports/[id].get.ts`：HTTP 路径与 spec §5.2 的 14 条一致（动作聚合在 `[action].get/post.ts`，见 D2）。
- B 端：`app/pages/admin/talent/reports/index.vue`（10 列 / 四项筛选 / 状态计数 / 行内动作）、`components/Report*.vue`（详情 4 页签 + 发布/补发/同步/基因报告弹层）、`report-ui.ts`（页签回落 / 状态计数 / 新增分册文案）、`app/composables/api/useTalentReportApi.ts`。
- 权限与菜单：4 个权威权限码、菜单重指向、`TALENT_PATHS`（`app/composables/useMenuTree.ts:52-53`）、旧码/旧页/旧路由保留。
- JSON 契约：`shared/types/talent-report.ts`（集合实体、快照、请求/响应、同步类型）。

**不在本次验收**

- C 端页面与两条只读 C 端路由（M7；M3 只验服务端契约与守卫，见 A5）；
- 方向命中算法/排序/推荐上限/选择写入（M4；M3 只验「调用纯函数并冻结」，M4-B/C 已上线但验收归 task-34）；
- 培育建议集合与联动落库（M5；M3 只验详情空态挂载点与派生口径文档）；
- PDF 生成/下载/水印、真实外部接口/重试/告警/定时同步（M8）；
- 旧页/旧集合/旧码/旧行/旧 e2e 的删除与重写（M6）。

**前置依赖（验收时全部就绪）**

1. M3-A/B/C 已落地（`shared/types/talent-report.ts`、`server/utils/talent-report*.ts`、14 条路由、`app/pages/admin/talent/reports/**`、`test/talent-report-{domain,sync,api}.test.ts` 存在）。
2. M2 数据层与状态机可用（演示库 1 家长 / 2 子女，`query=found` 参与同步候选）。
3. M4 纯函数可用（`computeTalentDirectionMatches` / `refreshDirectionSnapshot`，发布/补发/重算/预览已实测）。
4. 本地 PocketBase 可启动；`.env` 有超管凭据（未读取/未打印任何密钥）。
5. 新库烟测使用 `mktemp -d` 空目录 + `POCKETBASE_BINARY=/tmp/tj-pb/pocketbase`，未指向真实 `pb_data/`。
6. 权限验收用 `superAdmin` 与临时角色（测试后清理）；三角色正式授权属 M6。
7. Mock 同步源（`TALENT_GENE_REPORT_SOURCE=mock`）可用；真实外部接口 M8 不验收。

## 2. 追溯表

> 「实现（实际）」为 verifier 核对的文件与行号；「测试 / 证据」指向 §4 的 E 编号。

### 2.1 AC-ADM-06-1..5（PRD §6.6 L260–299）

| 需求 | PRD 位置 | 实现（实际） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- | --- |
| AC-ADM-06-1 表头 10 列，新增分册列只在有新增时显示内容 | §6.6 L260–262、L295 | `index.vue:94-214`（10 列）；`report-ui.ts:184` `newBooksText`；`talent-report-api.ts:239` 列表 | `GET /api/admin/talent/reports` | E10：`newBookCount/newBooksText`（已发布 ABCD−AB=「2 篇 CD」、待发布「2 篇 AB」）；E11：10 列列名/顺序逐列核对 | 通过 |
| AC-ADM-06-2 发布后状态变已发布、C 端可读，快照版本 +1 | §6.6 L296、§8.3 L522–533 | `talent-report-api.ts:993` `publishTalentReport`；快照构建 `talent-report-snapshot.ts:646+`；C 端守卫 `talent-report.ts:419` | `POST /api/admin/talent/reports/:id/publish` | E10：发布后 `status=published`、`snapshotVersion 0→1`、`publishedAt` 有值、`openVolumeIds=V1/V2`、三快照非空、`versions` 末条 `publish`；E11：发布弹层→勾选→确认，toast「已发布，快照版本 1」；C 端页面可见性（M7）见 A5 | 通过 |
| AC-ADM-06-3 撤回后 C 端显示「报告内容更新中」，恢复后恢复 | §6.6 L297、BR-10 L106 | `talent-report-api.ts:1038` `withdraw` / `:1068` `restore`；C 端守卫 `talent-report.ts:419-448` | `POST …/withdraw`、`POST …/restore` | E10：撤回后 `status=retracted`、`withdrawnAt` 有值、快照 hash 与 `snapshotVersion` 不变、末条 `withdraw`；恢复后 `status=published`、`restoredAt` 有值、hash 不变、末条 `restore`；重复动作 409；E11：二次确认文案与状态标签实测 | 通过 |
| AC-ADM-06-4 补发只追加新增册，原分册章节与要素不变 | §6.6 L298、BR-05 L101 | `talent-report-api.ts:1167` `reissueTalentReport`；M4 增量 `talent-report-snapshot.ts:1042` `refreshDirectionSnapshot` | `POST …/publish-new` | E10：外部 ABCD、开放 AB → 补发后 `snapshotVersion 1→2`、`addedBooks=["C","D"]`、`addedVolumeIds=["V3","V4"]`、旧册 `volumeSnapshot` 与旧要素 `factorSnapshot` 逐项 JSON 相等、旧要素 `requirements` 原样复制；无新增册 409；E11：补发弹层确认后「新增分册」变「—」 | 通过 |
| AC-ADM-06-5 报告详情 4 页签可切换，旧页签链接自动回落 | §6.6 L299 | `ReportDetailModal.vue:409-527`（4 页签 + 空态 + 单册叠加层）；`report-ui.ts:30` `normalizeReportTab`（`snapshot/versions/未知→selected`）；深链 `index.vue:453-463` | `GET /api/admin/talent/reports/:id` | E10：`tabs.selections/matching/geneReport/advice` 结构齐全、待发布 `matching=null/diff=[]/configChanged=false`、`advice.available=false`；E11：4 页签切换与 `?tab=snapshot/versions/unknown→首签`、`?tab=gene` 落位；E11b：未发布报告「发布后可查看」空态 | 通过 |

### 2.2 FR-ADM-06 功能条目（PRD §6.6）

| 需求 | PRD 位置 | 实现（实际） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 列表四项输入 + 发布状态下拉（带数量），条件交集 | §6.6 L264 | `index.vue:266-310`（四输入 + 状态下拉）、`:260-281`（查询/重置）；`report-ui.ts:171` `buildStatusOptions`；`talent-report-api.ts:239` 两段查询 | `GET /reports?reportNo=&childName=&parentMobile=&idNo=&status=` | E10：reportNo/childName/parentMobile（11 位与后 4 位）/idNo（18 位与后 4 位）/status 各命中；非法手机号/身份证/状态 422；四筛 AND；`statusCounts` 不叠加状态筛选；E11：状态下拉「全部（2）/待发布（1）/已发布（1）/已撤回（0）」、重置回 2 条、手机号格式前端拦截 | 通过 |
| 行内操作条件：详情（全部）/ 基因报告（已同步）/ 发布（待发布）/ 撤回（已发布）/ 恢复（已撤回）/ 补发（已发布且有新增） | §6.6 L266–275 | `index.vue:150-214` 按状态 + `hasPermission` 显示；`useAdminTable.createActionColumn` 超过 3 个收「更多」 | 对应各动作 API | E11：四种状态逐行核对按钮出现/隐藏（发布/撤回/恢复发布/补发/更多）、`canPublish` 控制写按钮；E10/E12：后端无权限 403 | 通过 |
| 一键同步全部：三类人数 + 逐人明细 + 预演确认 + 同步日志/操作日志 | §6.6 L278 | `sync.post.ts`；`talent-report-api.ts:1328/1335`；`talent-report-source.ts:600-1160`；`ReportSyncModal.vue` 三阶段 | `POST /reports/sync` | E10：preview ×3 零写入（四集合行数/updated 不变、不写日志）；commit 返回三类计数 + `syncLogId`，`talent_sync_logs` +1（`syncScope=gene_report`、计数、`subjectDetails`）、`oper_logs` +1；重复 commit 幂等（行数不增、`created=0`、`changedSincePreview=true`）；mode 非法 422；E11：预演→确认→结果三段、mock 提示、逐人明细、同步记录展开 | 通过 |
| 发布弹层：信息条 + 六册勾选 + 方向命中预览 + 冻结规则 | §6.6 L280 | `ReportPublishModal.vue:145-253`；`talent-report-api.ts:885` `buildTalentReportPublishPreview` | `GET /reports/:id/publish-preview`、`POST /reports/:id/publish` | E10：`volumes` 固定 6、外部未出册 `selectable=false` 带 reason、`directionHits` 按命中数降序、`factorCount/directionCount/tierCount/rules/warnings` 齐全、发布校验空册/重复/非法册 422、重复发布 409；E11：弹层默认勾选 2 可开放册、清空后确认禁用、规则文案可见、确认后 toast | 通过 |
| 补发弹层：外部已出 / 本次新增 / 补发规则 / 新增册清单 | §6.6 L282 | `ReportReissueModal.vue:96-162`；`talent-report-api.ts:1119` `buildTalentReportReissuePreview` | `GET /reports/:id/reissue-preview`、`POST /reports/:id/publish-new` | E10：外部已出 ABCD / 已开放 AB / 新增 CD、新增册含章节数/要素数、非已发布或撤回状态 409、预览零写入；E11：弹层三段信息 + 新增册清单 + 规则正文 + 确认后 toast；「补发规则」为正文无独立小标题（见 D3） | 通过 |
| 详情 4 页签内容（方向目标 / 匹配天赋 / 基因报告 / 培育建议） | §6.6 L284–292 | `ReportDetailModal.vue:409-527` 四页签；`talent-report-api.ts:658` 详情、`:767` 单册 | `GET /reports/:id`、`GET /reports/:id/volumes/:volumeId` | E10：详情四页签结构、单册 V1 要素含编码/名称/分级/注解、未开放册 V3 可读且 `open=false`、非法册 404；E11/E11b：页签切换、已选方向空态、培育建议「M5 接入后显示」、未发布 matching「发布后可查看」；`frozen/current` 为方向摘要数组（见 D1） | 通过 |
| 「匹配天赋」按当前配置重新生成快照 | §6.6 L290 | `talent-report-api.ts:1212` `regenerateTalentReportSnapshot`；`ReportDetailModal.vue:449-457` 按钮 + 二次确认 | `POST /reports/:id/regenerate-snapshot` | E10：`status` 不变、`snapshotVersion 2→3`、末条 `regenerate`、开放册与要素集合不变、方向快照由 M4 全量重算非空、`oper_logs` +1；未发布请求 409；E11b：二次确认文案含「快照版本 +1 / 影响 C 端 / 开放分册不变」，取消不写 | 通过 |
| 基因报告弹层：外部元数据与篇目 | §6.6 L270 | `gene-reports/[id].get.ts`；`talent-report-api.ts:1297` `loadTalentGeneReportDetail`；`ReportGeneModal.vue` | `GET /api/admin/talent/gene-reports/:id` | E10：元数据齐全、章节计数按外部已出册、不返回 `sections` 全量、不含 `idNoHash` 等字段；E11b：弹层元数据（报告编号/姓名/脱敏身份证/出具方/来源/版本/建档/同步时间）与分册计数、无编辑/上传控件、只读提示 | 通过 |

### 2.3 BR 业务规则（PRD L96–110）

| 需求 | PRD 位置 | 实现（实际） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| BR-02 一人一份：重复同步只刷新不新建 | L96 | 两集合部分唯一索引 + upsert（`setup.mjs:1952-1959`；`talent-report-source.ts` commit） | E2 单测：连续两次 commit 行数不变、第二次全部 `refresh`；E7 索引断言；E10 重复 commit：`gene_reports/reports` 行数不变、`counts.created=0` | 通过 |
| BR-03 发布即冻结、配置调整不回写历史 | L99 | 快照 JSON 只在发布/补发/重算写；读接口只读（`talent-report-snapshot.ts`） | E10 实测：发布后临时改 M1 分级名与 M2 子女姓名 → 三快照 hash 与版本不变；刷新同步前后 hash 不变；E2 单测同口径 | 通过 |
| BR-04 固定六册 A–F | L100 | `V1–V6` 固定映射；`talent-report-snapshot.ts` 六册快照 | E2 单测映射/册名/固定 6 项；E10 发布预览 6 项且未出册不可选；E11 详情基因报告页签六册齐全 | 通过 |
| BR-05 增量分册 = 外部已出 − 已开放；补发只追加 | L101 | `computeNewBooks`（`talent-report-snapshot.ts`）+ 补发追加 | E10：列表 `newBookCount/newBooksText` 0/1/多新增/外部空由单测覆盖，实测「2 篇 CD」；补发后旧册逐项相等、新增要素进入快照 | 通过 |
| BR-06 建议与报告同发（派生可见性） | L102 | M3 不写建议；详情 `advice.available=false` 空态 | E10：详情 `advice.available=false`、代码扫描 M3 无 `talent_advice_*` 写入；M5 已上线但联动验收归 task-34/M5 | 通过 |
| BR-09 0 命中仍可选 / 快照为空回退 | L105 | `directionSnapshot.directions` 含全部已评估方向（含 0 命中） | E2 单测：0 命中方向仍冻结、`recommendLimit/selectionLimit` 冻结；C 端读取逻辑（M7）不在范围 | 通过 |
| BR-10 撤回口径 | L106 | 状态机 + C 端守卫（`talent-report.ts:419`） | E10 撤回/恢复状态与快照不变、重复动作 409；E11 撤回二次确认文案含「C 端立即显示报告内容更新中」 | 通过 |
| BR-12 编码不对家长展示 | L108 | C 端展示层（M7）；后台保留编码 | E10：快照保留 `code/volumeId`、后台响应含编码；家长端展示归 M7（不在本表） | 通过 |

### 2.4 PRD §8.2 / §8.3 / §9 / §10 / §12 映射

| 需求 | PRD 位置 | 实现（实际） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| gene_report 字段完整（一人一份、books、issuer/filedAt/syncedAt/source/version/status） | §8.2 L470–490 | `talent_gene_reports`（`setup.mjs:1276,1943-1990`） | E7：字段齐全、4 索引；E10：同步后字段与 Mock 一致、`books` 规范化；E10 重复 commit 一人一份 | 通过 |
| report 字段完整（归属、三态、快照、selections、versions） | §8.2 L475–490 | `talent_reports` 增量字段（`setup.mjs:1952-1984`；`sync-talent.mjs:308-400`） | E7：新字段/索引齐全、`customerId.required=false`；E10：发布后字段逐项核对；新行 `customerId=""` | 通过 |
| §8.3 报告状态机 | L522–533 | `talent-report-snapshot.ts` 状态迁移 + `withTalentReportLock` | E10：待发布→已发布→已撤回→已发布全链路；非法迁移（非待发布发布、非已发布撤回、非已撤回恢复、无新增补发、未发布重算、重复动作）全部 409；E13：并发发布 1×200 + 1×409 | 通过 |
| §9 写接口 Zod/权限/审计；路径分组 | L539–557 | 14 条路由（`TALENT_REPORT_ADMIN_ROUTES`，`talent-report-api.ts:1467+`） | E2 单测：路由清单/权限码/`validateBody`/`withOperLog`/`success`/GET 不写；E10：401/403/404/405/409/422 实测、写动作均写 `oper_logs`、预演不写 | 通过 |
| §10 数据权限、敏感字段、审计、文件、接口归属 | L581–590 | 脱敏映射 + `sanitizeTalent*` + C 端守卫 + PDF 边界 | E10：14 端点响应递归扫描无 18/11 位明文、无 `Cipher/Hash` 键、无堆栈；集合全表序列化无明文；本轮审计日志无明文；E10/E12：403 且无成功日志；C 端守卫实现核对（见 A5，缺单测） | 通过 |
| §12 报告 10 列、发布冻结、撤回/恢复、补发只追加 | L608–616 | 同 §2.1/§2.2 | 同 §2.1/§2.2（E10/E11） | 通过 |

## 3. 补充验收（口径见 spec §4.5/§5/§7 与 ADR 0003）

### A1 快照不可变与版本链

| 需求 | 位置 | 实现（实际） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 发布后配置/档案变更不改快照 | spec §4.5；BR-03 | JSON 快照写一次；读接口只读 | E10 实测：发布 → 记录三快照 hash → 临时改 M1 分级名 + M2 子女姓名 → hash/版本不变 → 已恢复原值；E2 单测同口径 | 通过 |
| 补发旧册逐项不变 | spec §4.3/§4.5；AC-06-4 | 只追加（`talent-report-snapshot.ts:1042` M4 增量） | E10：补发前后旧册 `volumeSnapshot`（V1/V2）与旧要素 `factorSnapshot` JSON 逐项相等；旧要素 `requirements` 原样复制（diff=0） | 通过 |
| 撤回/恢复不改快照与 `snapshotVersion` | spec §4.4 | 状态机 | E10：撤回前后、恢复前后 hash 相等、`snapshotVersion` 不变；仅 `versions` 追加与时间字段变化 | 通过 |
| 版本链动作与版本号正确 | spec §4.4 | `versions[]` 追加 + `recordTalentReportVersion` | E10 实测序列：`publish(v1)` → `withdraw` → `restore` → `reissue(v2)` → `regenerate(v3)`；E2 单测：`selection` 只追加不改 `snapshotVersion`（M4 调用） | 通过 |
| 显式重算是唯一允许回写历史 | spec §4.4/§4.5 | `regenerate-snapshot` + 二次确认 + 审计 | E10：重算 `snapshotVersion+1`、末条 `regenerate`、`oper_logs` 有记录、开放册/要素集合不变；E2 单测：其他报告不受影响；E11b 二次确认文案 | 通过 |

### A2 同步幂等、三类归因与日志

| 需求 | 位置 | 实现（实际） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| preview 零写入 | spec §4.2 | `mode=preview` 只读（`talent-report-source.ts`） | E10：记录 `talent_gene_reports/talent_reports/talent_sync_logs/oper_logs` 行数与最大 `updated` → preview ×3 → 全部不变 | 通过 |
| commit 三类归因正确、`empty` 不建对象 | spec §4.2 | `refresh/created/empty/failed` 分类 | E2 单测：Mock 五模式（all_found/empty/partial/error/incremental）计数与写入正确、`empty` 不建行；E10 实测 refreshed=1 且不新建；演示库无 created/empty 候选，由单测覆盖 | 通过 |
| 重复 commit 幂等 | spec §4.2；BR-02 | 唯一键 + upsert | E10：连续两次 commit → 基因报告/报告行数不变、第二次 `created=0`、报告快照与版本不变、同步日志每次 +1 | 通过 |
| 单条失败不中断、整体 `partial` | spec §4.2 | 逐人 try/catch + 汇总 | E2 单测：注入第 2 人抛错 → 其余写入、失败明细 1 条、日志 `status=partial`、`counts.failed=1` | 通过 |
| 外部源不可用 → 503、无候选 → 200 全 0 | spec §5.4.9 | 前置校验 | E2 单测：全部候选源异常 → 503 且不写日志；无候选 → 200 `scanned=0`、不写日志；并发 commit 第二个 409 | 通过 |
| 同步日志与操作日志 | spec §3.3/§4.2 | `recordSyncLog` + `withOperLog` | E10：commit 后 `talent_sync_logs` 1 条（`syncScope/mode/refreshed/createdCount/empty/failedCount/subjectDetails/operatorId`）+ `oper_logs` 1 条摘要含三类计数；`subjectDetails` 无明文（见 D4 字段名） | 通过 |

### A3 安全与敏感字段

| 需求 | 位置 | 实现（实际） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 集合内无明文身份证/手机号 | spec §3.1/§3.2；PRD §10.2 | 只存 `maskedIdNo`/`idNoHash`；快照无明文 | E10：`talent_gene_reports` / `talent_reports` 全表序列化扫描：无 18 位/11 位明文；快照 JSON 同样干净 | 通过 |
| 响应不含明文/hash/cipher/外部报文 | spec §3.0/§5.1 | `sanitizeTalent*Record` | E10：14 条路由全部响应递归扫描 → 无 18/11 位明文、无 `Cipher/Hash` 键、无堆栈（登录接口的用户记录含 foundation 既有 `deleted*Hash`，不在 M3 路由范围，见 D5） | 通过 |
| 审计日志不含明文 | PRD §10.3；spec §5.1 | `withOperLog` 摘要用报告编号/册编码 | E10：本轮 `oper_logs`（16 条）+ `talent_sync_logs`（2 条）扫描无明文；摘要示例「报告 R202611160001 快照版本 1」 | 通过 |
| 无权限动作 403 且无成功日志 | spec §2.2 | 先鉴权后 `withOperLog` | E10：临时只读角色列表/详情/撤回/同步日志/同步预演全部 403、`oper_logs` 行数不变；E12：临时「报告审核员」发布 200、同步 403 | 通过 |

### A4 权限与菜单

| 需求 | 位置 | 实现（实际） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 4 个权威权限码均有 C/F 菜单行 | spec §2.2/§2.3 | `setup.mjs` + `sync-talent.mjs:878-935` | E7：`talent:report:list`（C 基因报告 + F）、`view`（F）、`sync`（F）、`publish`（3 条 F）命中；E8/E9：sync 内置断言通过 | 通过 |
| 「基因报告」菜单唯一且重指向新页 | spec §2.3 | 复用旧 C 行改 path/component（`sync-talent.mjs:912-926`） | E7：`基因报告` C 行唯一、`path=/admin/talent/reports`、`component=admin/talent/reports/index.vue`、`permissionCode=talent:report:list`；旧 `/admin/talent/report` 无生效 C 菜单 | 通过 |
| 旧码/旧页/旧路由保留、未被改语义 | ADR 0003-D7；spec §3.7 | 不修改旧文件 | E7：旧码 `talent:report:revoke/edit/receive` 仍在册；E10：旧 `GET /api/admin/talent/report` 200（旧 `rows/total` 结构）、旧页面 `/admin/talent/report` 200；git 无旧文件删除（旧集合保留见 A6） | 通过 |
| 未登录 401 / 无权限 403 / 角色矩阵 | spec §2.1 | `requirePermission` | E10：未登录 401；E12：临时「报告审核员」（list/view/publish）→ 列表/详情/发布预览/发布 200，同步日志与同步预演 403；临时无权限角色全部 403；E9：客户管理员 45 条菜单含 7 个业务 C 菜单与 M3 F 行 | 通过 |
| 菜单 `status="0"` 即时隐藏 | PRD §12 L608（M3 子集） | 菜单种子 | **未验证**：为避免在并行 M4/M5 验收共用演示库期间改动全局菜单，未做「置 0→侧栏消失→恢复」实测；菜单可见性由 E9 角色菜单断言与 superAdmin 侧栏实测（E11）间接覆盖 | 未验证 |

### A5 状态机、C 端门禁与模块边界

| 需求 | 位置 | 实现（实际） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 发布/撤回/恢复/补发/重算非法动作 409 | spec §4.1 | 状态迁移 + 锁 | E10：非待发布发布/非已发布撤回/非已撤回恢复/非已发布补发/无新增册补发/未发布重算 → 全部 409 且中文提示 | 通过 |
| 并发双击只成功一次 | spec §4.1/§4.4 | `withTalentReportLock`（`server/utils/talent-report-lock.ts`） | E13：两个并发 publish 实测 `[200, 409]`（消息「当前状态不支持该操作：发布仅支持『待发布』报告」），`snapshotVersion=1`、`versions` 仅 1 条 `publish`；E2 单测：并发 commit 第二个 409 | 通过 |
| C 端守卫：已发布可读、撤回/未发布 409、非本人/解绑 404 | spec §7.1；PRD §10.5 | `assertTalentReportPublished` / `getTalentReportClientSnapshot` / `listTalentReportOpenVolumes`（`talent-report.ts:419-524`） | **未验证**：实现已核对（retracted→409 `code=report_retracted,state=retracted,message=报告内容更新中`；pending→409 `report_pending`；published 返回快照），但仓内无直接单测（spec §11 #1 期望覆盖）、C 端路由归 M7 无法直连；建议 M7 验收补齐守卫单测/接口证据 | 未验证 |
| C 端页面「报告内容更新中」渲染 | PRD §6.6 L297；spec §7.1 | M7 页面 | **不在范围（M7）**：M3 只提供 409 + state；页面文案与可见性由 M7 验收 | 不在范围 |
| M3 不写建议集合、M5 派生口径 | spec §8.2；ADR D8 | 代码扫描 + 文档 | E18：M3 报告工具/路由无 `talent_advice_*` 写入；E10：详情 `advice.available=false`、空态文案；M5-B/C 已上线但联动验收归 task-34 | 通过 |
| M3 只调 M4 纯函数、不实现算法 | spec §8.3；ADR D8 | import 检查 | E18：`talent-report-snapshot.ts:48-51` 只 import `computeTalentDirectionMatches`/`refreshDirectionSnapshot` 等 M4 纯函数，无本地命中/排序实现；发布/补发/重算/方向预览均调用 M4 | 通过 |
| PDF/真实外部源不在 M3 | spec §8.4 | 代码扫描 | **不在范围（M8）**：M3 路由/领域工具无 PDF 上传/下载、无真实 HTTP 源（仅 Mock 源 + `external` 占位）；旧 `pdfUrl/pdfFileKey` 字段保留、M3 新行不写；M8-A 已上线但验收归 task-34/M8 | 不在范围 |

### A6 数据模型、旧数据过渡与工程红线

| 需求 | 位置 | 实现（实际） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 新库集合/字段/索引齐全 | spec §3.4 | `setup.mjs` | E6：空库 `env:setup` exit 0（53 集合）；E7：sync 后 58 集合；`talent_gene_reports` 4 索引、`talent_reports` 6 索引（含部分唯一 `idx_talent_reports_subject … WHERE subjectType != ""`）、`talent_sync_logs` 新字段齐全；旧 7 集合存在 | 通过 |
| `customerId` 放宽为非必填、旧行不变 | ADR 0003-D6 | `sync-talent.mjs:381-391` | E7/E9：新库与演示库 `talent_reports.customerId.required=false` 且 sync 两次稳定；旧行：新库与演示库均无 `subjectType=""` 旧行（0 条），**「旧行值未变」无存量数据可实测**，字段与旧索引均保留 | 通过 |
| `talent:sync` 两次幂等（只加不删） | ADR 0001-D1 | `sync-talent.mjs` | E8：新库 sync 两次 exit 0/0，两次日志 `diff` 为空（菜单/角色/权限/索引不重复）；E9：演示库同样两次输出一致；旧集合结构字段数稳定（items 17 / publications 10 / receipts 11 / templates 13 / template_items 6） | 通过 |
| 静态段优先于旧 `[resource]` | spec §5.6 | Nitro 路由 | E10：`GET /reports` 新结构、`GET /reports/sync` → 405、`GET /reports/:id` 新详情、`GET /reports/nonexistent` 404 新文案、旧 `/api/admin/talent/report` 旧结构；E11：`/admin/talent/reports` 渲染新页、`/admin/talent/report` 旧页 200 | 通过 |
| 只改 `talent_*`、不回填 users/configs | AGENTS.md | diff/代码扫描 | E18：M3 工具与路由无 `users`/`configs`/`site_config` 写入；新增集合名为 `talent_gene_reports`，其余均为 `talent_reports`/`talent_sync_logs` 增量 | 通过 |
| 单实例单 PB、无多租户 | CONVENTIONS §1 | diff/代码扫描 | E18：M3 文件 `TENANT_MODE`/`X-Site-Slug`/`site cookie` 0 命中；全部走默认 `POCKETBASE_URL` 单连接 | 通过 |
| 旧页/旧集合/旧码不删不改（M6 清理） | spec §1.2/§3.7 | diff 检查 | E10：旧页/旧路由 200；E7：旧集合仍在；E9：旧码仍在册；`git status` 无旧页/旧路由/旧集合定义删除 | 通过 |
| `setup.mjs` 只用于空库 | CONVENTIONS §1 | 脚本检查 | E16：对已在运行的演示库（8090）执行 `env:setup` → exit 1「PocketBase 已在 … 运行。基础版初始化必须独占一个新数据目录」，未写入任何数据 | 通过 |

### A7 页面空态/错误态/交互

| 需求 | 位置 | 实现（实际） | 页面 | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 无报告空态 + 可同步入口；筛选无结果 + 重置 | spec §6.1 | `index.vue:312-330`（empty 文案 + 同步按钮）、`:339-356`（重置筛选） | `/admin/talent/reports` | E11b：筛选「不存在的子女」→「当前筛选下暂无基因报告 + 重置筛选」、重置后恢复 2 条；无报告空态为静态核对（演示库有种子数据，空库页面需指向 8093 的独立 Nuxt，未起第二实例） | 通过 |
| 详情 4 页签空态 | spec §6.2 | `ReportDetailModal.vue:419-527` 各页签空态 | 详情弹层 | E11：已选方向空态、培育建议 M5 空态；E11b：未发布报告 matching「发布后可查看」而非空白 | 通过 |
| 加载/错误/无权限态 | spec §6.8 | loading / error alert / 403 | 列表与弹层 | **未验证**：未造断网/接口错误（会污染演示库或需改 mock 失败注入）；无权限侧有 API 403（E10/E12）与页面 `permission-guard` 静态核对，未做页面级 403 直达实测 | 未验证 |
| 二次确认文案（撤回/恢复/补发/重算/同步） | spec §6.3–§6.6 | dialog 文案 | 各弹层 | E11：撤回（C 端立即显示「报告内容更新中」…）、恢复（沿用原快照…不改变快照版本）、发布规则、补发规则；E11b：重算二次确认（快照版本 +1 / 影响 C 端 / 开放分册不变），取消不发请求；同步三阶段 | 通过 |

## 4. 证据表

> 环境：演示库 = 8090 PocketBase + 3000 Nuxt（dev）；新库 = 8093（`mktemp -d /tmp/tongjia-m3-ePSXvk`，PB 二进制 `/tmp/tj-pb/pocketbase`，验收后已停止并删除）。证据文件：`/tmp/tj-m3-verify/`（截图在 `shots/`）。

| E | 需求 / 条目 | 命令或步骤 | 退出码 | 关键输出 | 结论 | 证据位置 |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | 类型检查 | `pnpm typecheck` | 0 | 无 TS 错误；仅 6 条 WARN「`TalentReportStatus`/`TALENT_REPORT_STATUS_LABELS`/`TALENT_REPORT_STATUSES` 在 `shared/types/talent*.ts` 与 `shared/utils/talent-report.ts` 重复导入」（见 D6） | 通过 | `typecheck.log` |
| E2 | 领域/同步/API 单测 | `pnpm vitest run test/talent-report-domain.test.ts test/talent-report-sync.test.ts test/talent-report-api.test.ts` | 0 | 3 文件 / **70 tests passed**（domain 28 + sync 22 + api 20），605ms；覆盖快照/A–F 映射/状态机/版本链/不可变/补发只追加、三类归因/幂等/preview 零写入/失败继续/Mock 五模式/并发 409、14 路由清单/权限码/静态段优先/菜单断言/Zod/响应脱敏 | 通过 | `targeted-vitest.log` |
| E3 | 全量 Vitest | `pnpm test` | 1 | 41 文件 / **514 passed、6 failed、1 skipped**；失败仅 `test/talent-ui-closure.test.ts`（3）与 `test/foundation-client-guard.test.ts`（3），均为 M7-A 并行改动删除 `apps/client/src/pages/**` 旧页后的过期断言（`git status` 显示对应 `D`），与 M3 无关；M3 相关 3 文件与旧报告回归 4 文件（lifecycle 2 / completeness 2 / talent-admin 10 / matching 7）全过 | 通过（M3 相关全部通过；失败项属 M7-A 并行改动，见 D7） | `full-test.log` |
| E4 | 代码规范 | `pnpm lint`（全量）；另对 M3 文件定向 eslint | 1 / 0 | 全量：55 problems（54 error / 1 warning）分布在 38 文件：37 个 `apps/client/**`（M7-A 进行中）+ `test/talent-report-api.test.ts` 6 处（`import/no-duplicates`×4、`no-unused-vars`×2，行 18/22/23/54/35）。除该测试文件外，M3 的 shared/server/api/page/composable/seed/其余测试定向 eslint **exit 0** | 未通过（仅 M3 测试文件 6 处；实现代码 0 处；其余为 M7-A 并行进行中） | `lint.log` |
| E5 | 构建 | `pnpm build` | 0 | `✨ Build complete!`，`.output/` 生成（另有 tailwind sourcemap 警告，非阻断） | 通过 | `build.log` |
| E6 | 新库 env:doctor + env:setup | `POCKETBASE_BINARY=/tmp/tj-pb/pocketbase POCKETBASE_DATA_DIR=$(mktemp -d)/data POCKETBASE_MIGRATIONS_DIR=$(mktemp -d) POCKETBASE_URL=http://127.0.0.1:8093 pnpm env:doctor && pnpm env:setup` | 0 | doctor 显示二进制/空目录/8093；`✓ 基础版初始化完成：53 个集合` | 通过 | `newdb-setup.log`；`setup-guard.log`（反向用例 E16） |
| E7 | 新库集合 / 字段 / 索引 / customerId / 旧集合 | 8093 PB SDK 只读断言 ``node /tmp/tj-m3-verify/m3-assert-schema.mjs` | 0 | sync 后 **58 集合**；`talent_gene_reports` 4 索引（subject/no/parent/synced）；`talent_reports` 6 索引，`idx_talent_reports_subject` 为 `UNIQUE(subjectType, subjectId) WHERE subjectType != ""`；`customerId.required=false`；`talent_sync_logs` 新字段齐全（`syncScope/mode/refreshed/createdCount/empty/subjectDetails/operatorId`）；旧 7 集合（`talent_report_items/publications/receipts/templates/template_items/customers/customer_bindings`）全部存在；4 权限码 C/F 行齐、`基因报告` C 行唯一指向新页 | 通过 | `newdb-schema.json` |
| E8 | 新库 `talent:sync` 两次幂等 | 8093 上 `pnpm talent:sync` ×2 | 0 / 0 | 第 2 次输出与第 1 次 `diff` 完全一致（菜单/角色/权限/索引无重复）；`customerId` 必填状态稳定 | 通过 | `newdb-sync1.log`、`newdb-sync2.log` |
| E9 | 演示库存量同步幂等 / 角色菜单 | `pnpm talent:sync` ×2（8090） | 0 / 0 | 两次输出 `diff` 完全一致；`customerId.required=false`；旧集合字段数稳定；`customer-admin` 45 条菜单含 7 个业务 C 菜单（含 `基因报告 /admin/talent/reports`）与 M3 F 行；旧码 `revoke/edit/receive` 在册 | 通过 | `demo-sync1.log`、`demo-sync2.log`、`demo-baseline.json` |
| E10 | 演示库 API 14 端点 / 状态机 / 同步 / 安全 | `node /tmp/tj-m3-verify/api-probe.mjs`（superAdmin 登录，受控写动作结束后由种子恢复） | 0 | **109/109 PASS**：列表 10 列字段与状态计数、四项筛选（11/后 4 位、18/后 4 位、422）、详情四页签、单册（含未开放册）、基因报告弹层数据、发布预览（6 册/命中降序/零写入）、发布（v1/快照/已发布日志）、发布校验 422×4、重复发布 409、发布后改 M1/M2 不改快照、撤回/恢复（快照与版本不变、重复 409）、补发预览（零写入/非已发布 409）、补发（v2/只追加/旧要素逐项相等/方向旧要求原样复制/无新增 409）、方向预览（零写入）、重算（v3/状态不变/日志）、同步预演 ×3（零写入）+ commit（日志/操作日志/changedSincePreview/幂等）、同步 mode 422、同步日志列表、临时只读角色 403 且无成功日志、旧路由/旧页回归、静态段优先（`GET /reports/sync`→405）、响应与集合与审计无明文/无 Cipher/Hash | 通过 | `api-probe.log` |
| E11 | 页面人工走查（Playwright） | `node /tmp/tj-m3-verify/page-probe.mjs`（1500×940，superAdmin） | 0 | **43/43 PASS**：10 列列名/顺序、脱敏列、分册/新增分册、状态下拉计数、四筛选与前端拦截、详情 4 页签与 3 个旧页签回落、发布弹层（六册/置灰原因/规则/默认勾选/清空禁用/确认发布 toast）、撤回/恢复二次确认与状态、补发弹层与补发 toast、同步三阶段（初始/预演/提交/同步记录）、1280 与 375 无整页横向溢出、**console error = 0** | 通过 | `page-probe.log`；`shots/01–17*.png` |
| E11b | 页面补充走查（Playwright） | `node /tmp/tj-m3-verify/page-probe2.mjs` | 0 | **7/7 PASS**：基因报告弹层（元数据/分册计数/无编辑上传控件/只读提示）、未发布 matching「发布后可查看」、重算二次确认文案（取消不写）、筛选无结果空态 +「重置筛选」恢复、console error = 0 | 通过 | `page-probe2.log`；`shots/18–21*.png` |
| E12 | 角色矩阵（临时角色） | `node /tmp/tj-m3-verify/role-probe.mjs` | 0 | **7/7 PASS**：临时「报告审核员」（list/view/publish）登录成功；列表/详情/发布预览 200；发布 200（v1）；同步日志/同步预演 403；账号/角色清理后 0 残留 | 通过 | `role-probe.log` |
| E13 | 并发双击发布 | `node /tmp/tj-m3-verify/concurrency-probe.mjs` | 0 | **3/3 PASS**：两个并发 publish → `[200, 409]`（409 文案「当前状态不支持该操作：发布仅支持『待发布』报告」）；`snapshotVersion=1`、`versions` 仅 1 条 `publish`、`openVolumeIds=["V1","V2"]` | 通过 | `concurrency-probe.log` |
| E14 | 安全与敏感字段（详见 E10 扫描） | 直连 PB + 响应递归扫描 | — | 14 端点响应：0 处 18/11 位明文、0 个 `Cipher/Hash` 键、0 堆栈；`talent_gene_reports`/`talent_reports` 全表：0 明文；本轮 16 条 `oper_logs` + 2 条 `talent_sync_logs`：0 明文；无权限请求不写成功日志 | 通过 | `api-probe.log` §13 |
| E15 | 演示种子幂等 / 守卫 / 恢复 | `TALENT_REPORT_SEED_CONFIRM=report pnpm talent:report:seed`（多次）；`NODE_ENV=production …`；无 confirm 运行；后置只读复核 | 0 / 1 / 1 / — | 种子：`counts={geneReports:2,reports:2,created:0,updated:2,pending:1,published:1}`，场景「待发布 AB / 已发布+新增 CD」；生产环境拒绝（exit 1）；缺 confirm 拒绝（exit 1）；测试后已恢复演示种子（2 报告 / 基因报告 AB、ABCD）；缺失场景见 D8 | 通过（附 D8） | `seed-final-restore*.log`、`seed-prod-refusal.log`、`seed-no-confirm.log`、`demo-final-state.json` |
| E16 | `setup.mjs` 只用于空库 | 对运行中的 8090 执行 `pnpm env:setup`（空临时目录参数） | 1 | 「PocketBase 已在 http://127.0.0.1:8090 运行。基础版初始化必须独占一个新数据目录；请停止该服务后重试。」未写入 | 通过 | `setup-guard.log` |
| E17 | 工作区检查 | `git diff --check`；`git status --porcelain` | 0 / — | `git diff --check` 无输出；verifier 仅改动/新增 `docs/specs/M3-reports/acceptance.md`（该目录整体为未跟踪新建，属 M3 文档交付）；未修改源码、未 commit | 通过 | `diff-check.log` |
| E18 | 红线 / 模块边界扫描 | `rg` 扫描 M3 文件（见 §3 A5/A6） | 0 | M3 工具/路由：`TENANT_MODE`/`X-Site-Slug` 0 命中；无 `users/configs/site_config` 写入；无 `talent_advice_*` 写入；无 PDF 上传/下载实现；`talent-report-snapshot.ts:48-51` 仅 import M4 纯函数；`useMenuTree.ts:52-53` 含 `/admin/talent/reports`；composable 仅通过 `useApi` 调用后端 | 通过 | 本文件 §3 A5/A6 |

### 4.1 未验证项与阻塞原因

| ID | 条目 | 原因 | 依赖 / 解封条件 |
| --- | --- | --- | --- |
| U1 | A4 菜单 `status="0"` 即时隐藏 | 未在并行 M4/M5 验收共用演示库期间改动全局菜单（置 0/恢复会瞬时影响其他验收的侧栏） | 由 M6 或独立窗口复验；实现上菜单树每次由 `GET /api/admin/menus` 派生，E9 角色菜单断言已覆盖生效行过滤 |
| U2 | A5 C 端守卫（`assertTalentReportPublished` 等） | 实现已核对（`talent-report.ts:419-524`），但仓内无直接单测；C 端路由/页面归 M7，M3 无 HTTP 入口 | M7 验收补守卫单测 + C 端 409/404 接口证据 |
| U3 | A7 加载/错误/无权限页面态 | 未造断网或接口错误（需失败注入或断网），演示库未被破坏；页面 403 直达未实测 | 页面回归窗口补断网/错误参数/无权限直达用例 |

### 4.2 偏差与观察（不阻断通过，需记录）

| ID | 位置 | 偏差 / 观察 | 影响 / 建议 |
| --- | --- | --- | --- |
| D1 | spec §5.4.2 vs `talent-report-api.ts:412`、`report-ui.ts` | `tabs.matching.frozen/current` 实际返回**方向摘要数组**，spec 示例为带 `directions[]` 的信封对象；页面 `report-ui.ts` 按数组消费，行为一致 | 仅详情接口形状与文档示例不一致，无功能影响；建议文档修订或在 §5.4.2 注明实现形状 |
| D2 | spec §5.2「14 条路由」vs `server/api/admin/talent/reports/[id]/[action].get.ts` 与 `[action].post.ts` | 5 个动作聚合在 2 个文件（代码注释说明：14 个独立嵌套动态文件会触发 Nitro 路由类型 TS 递归深度上限）；HTTP 路径与权限码与 spec 完全一致，测试断言 14 端点清单 | 无需改动；建议 spec §5.2 落点列注明聚合实现 |
| D3 | spec §6.4 补发弹层 | 弹层展示 `外部已出 / 已开放 / 本次新增 / 新增册清单 / 规则正文`，但「补发规则」无独立小标题（规则用 `.reissue-rules` 正文展示） | 文案级偏差，不阻断；后续 UI 微调可加小标题 |
| D4 | spec §3.3 `created` 字段 vs `setup.mjs:1478` `createdCount` | PB `created` 为系统 autodate，数值字段改名 `createdCount`；API 响应（同步日志）通过 `createdCount ?? details.counts.created` 映射回 `created`，实测返回正确 | 需在 spec/ADR 记录字段名漂移，避免后续按 `created` 数值查询集合 |
| D5 | E10 响应扫描 | 登录接口 `data.record` 含 foundation 既有 `deletedOpenidHash/deletedPhoneHash/deletedUnionidHash`（users 记录，非 M3 路由） | 与 M3 无关；如需收敛由 foundation/账户模块另立任务 |
| D6 | `pnpm typecheck` | 6 条重复导入 WARN：新 `shared/types/talent-report.ts` 与旧 `shared/types/talent.ts`、`shared/utils/talent-report.ts` 中存在同名 `TalentReportStatus/TALENT_REPORT_STATUS*`（spec §5.5 要求新旧分离，Nuxt 自动导入扫描产生告警） | 类型检查通过；建议 M6 清理旧文件后消失 |
| D7 | `pnpm test` / `pnpm lint` | 6 个全量测试失败与 48 个 lint error 来自 `apps/client/**`（M7-A 进行中，旧 C 端页面被删/改），与 M3 无关；M3 自身仅 `test/talent-report-api.test.ts` 有 6 处 lint（未用变量与重复 import） | 建议 M3 实现者修 6 处测试 lint；M7-A 收口时恢复 C 端测试 |
| D8 | spec §3.6 vs `scripts/seed-talent-report.mjs:64-90` | 种子实际覆盖 2 个场景（待发布 AB、已发布+新增 CD），spec §3.6 列 5 个（另含已发布无新增、已撤回、外部暂无）；M3-C 任务描述称 4 个场景 | 演示可用；已撤回/无新增由验收时实时构造（E10/E11）。建议补种或修订 spec §3.6 |

## 5. 测试命令与门禁（摘要，详见 spec §11）

```bash
# 1) 定向测试（本次实跑）
pnpm vitest run test/talent-report-domain.test.ts test/talent-report-sync.test.ts test/talent-report-api.test.ts   # E2 70 passed
pnpm vitest run test/talent-report-lifecycle.test.ts test/talent-report-completeness.test.ts test/talent-admin.test.ts test/talent-matching.test.ts  # 已含在 E3 全量，全过

# 2) 静态检查
pnpm typecheck   # E1 通过
pnpm lint        # E4 未通过（M3 测试文件 6 处 + apps/client 48 处）

# 3) 新库 schema 烟测（指向新建空目录，未使用真实 pb_data/）
export POCKETBASE_BINARY=/tmp/tj-pb/pocketbase
export POCKETBASE_DATA_DIR="$(mktemp -d /tmp/tongjia-m3-XXXXXX)/data"
export POCKETBASE_MIGRATIONS_DIR="$(mktemp -d /tmp/tongjia-m3-XXXXXX)/migrations"
export POCKETBASE_URL=http://127.0.0.1:8093
pnpm env:doctor && pnpm env:setup   # E6 53 集合
pnpm talent:sync && pnpm talent:sync  # E8 两次一致

# 4) 演示库（8090 + 3000）
pnpm talent:sync && pnpm talent:sync   # E9
node /tmp/tj-m3-verify/api-probe.mjs   # E10 109/109
node /tmp/tj-m3-verify/page-probe.mjs  # E11 43/43 + 截图
node /tmp/tj-m3-verify/page-probe2.mjs # E11b 7/7
node /tmp/tj-m3-verify/role-probe.mjs  # E12 7/7
node /tmp/tj-m3-verify/concurrency-probe.mjs  # E13 3/3
TALENT_REPORT_SEED_CONFIRM=report pnpm talent:report:seed  # 恢复演示种子

# 5) 构建 / 收尾
pnpm build          # E5
git diff --check    # E17
```

- 新库烟测后已停止 8093 PocketBase 并删除本次创建的两个临时目录；未删除项目根目录/真实 `pb_data/`/其他 agent 的临时目录。
- Mock 源环境变量：`TALENT_GENE_REPORT_SOURCE=mock`、`TALENT_GENE_REPORT_MOCK_MODE=all_found|empty|partial|error|incremental`；生产必须切 `external`（M8）。
- 旧 e2e 02–05 覆盖旧报告页，M3 不纳入门禁；M9 重写。

## 6. 风险与待裁决（验收结果）

| # | 风险 / 待裁决 | 影响验收项 | 处置（验收结论） |
| --- | --- | --- | --- |
| V1 | M4 纯函数未合并导致发布/补发/重算/预览无法联调 | AC-06-2/4/5、A1、A5 | **已解除**：M4 已上线，E10 实测发布/补发/重算/方向预览全部可用，方向快照由 M4 产出 |
| V2 | C 端页面与只读路由归 M7 | AC-06-2/3 的「C 端可读/更新中」 | 维护：服务端守卫实现已核对但无单测（U2）；页面证据记「不在范围（M7）」 |
| V3 | 旧报告页过渡期显示新行（平台管理员） | 旧页回归 | 实测旧页/旧路由仍 200 且结构未改；旧页无入口（菜单已重指向）。演示库无旧行（0 条），未见混排现象 |
| V4 | 外部 A–F ↔ V1–V6 映射未经客户书面确认 | 列表分册列、发布/补发 | 按 BR-04 固定映射验收通过；客户换编码时只改适配层（spec R4） |
| V5 | 「一人一份」与「复测」未定（PRD §13.2-3） | BR-02 | 按一人一份验收通过；复测仍为待裁决（不阻塞） |
| V6 | 补发方向快照增量语义以 M4 实现为准 | AC-06-4 的方向部分 | 实测走 `refreshDirectionSnapshot` 增量：旧要素 `requirements` 原样复制（E10 diff=0），与 spec §4.3 一致 |
| V7 | 快照 JSON 体积/列表性能（1000 条） | 页面首屏 | M9 性能验收；M3 只验索引与两段查询写法（E7 索引齐全） |

## 7. 结论（verifier）

- 总条目数：**66**；通过：**61**；未通过：**0**；未验证：**3**（U1–U3）；不在范围：**2**（C 端页面 M7、PDF/真实源 M8）；待裁决：**0**。
- 是否达到 M3 出口（AC-ADM-06-1..5 全过 + 快照不可变/同步幂等测试通过）：**达到**。AC-ADM-06-1..5 全部实测通过（E10/E11）；快照不可变（发布后改 M1/M2 不改快照、补发只追加、撤回/恢复不改快照）与同步幂等（preview 零写入、重复 commit 不增行）均有单测 + 演示库实测双证据。
- 未通过条目与责任模块：**无功能/安全未通过项**。质量门禁 `pnpm lint` 未通过：`test/talent-report-api.test.ts` 6 处（M3 实现者，建议修 import/no-duplicates 与未用变量）+ `apps/client/**` 48 处（M7-A 进行中，非 M3 范围）。
- 未验证项：U1 菜单 status=0 即时隐藏；U2 C 端守卫缺直接单测（实现已核对）；U3 页面加载/错误/无权限态。均不影响 M3 出口。
- 偏差记录：D1（`matching.frozen/current` 形状）、D2（动作路由聚合）、D3（补发规则小标题）、D4（`createdCount` 字段名）、D5（登录响应 foundation Hash 字段）、D6（类型重复导入 WARN）、D7（全量 test/lint 的 C 端失败归因）、D8（种子场景少于 spec §3.6）。
- 演示库状态：已恢复种子（2 报告：`R202611160001` 待发布 / `R202611160002` 已发布 v1 开放 AB；基因报告 AB、ABCD），临时账号/角色 0 残留，用户/角色/家长/子女/旧集合未删改；`talent_sync_logs` 因验收 commit 追加至 13 条（审计日志只增不删，属预期）。
- 证据归档路径：`/tmp/tj-m3-verify/`（E1–E18 日志、`shots/01–21` 截图、`demo-final-state.json`）；临时库目录 `/tmp/tongjia-m3-ePSXvk` 与 8093 进程已清理。
- 工作区：仅改动 `docs/specs/M3-reports/acceptance.md`；未修改源码、未 commit；`git diff --check` 通过。