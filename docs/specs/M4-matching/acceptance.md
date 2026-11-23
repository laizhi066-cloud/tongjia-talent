# M4 方向匹配域 · 验收与追溯

> 状态：**已验收（2026-11-17，verifier-m45 / task-34）**。M4-A（纯函数）/ M4-B（待归并 + 后台方向选择 API/集合）/ M4-C（方向页待归并入口）均已实现并取得证据；C 端 4 条方向/选择路由按实现方声明留 M7（本表记「未验证」，不判缺陷，见 §6 F1）。
> 依据：[M4 方向匹配规格](spec.md)、[ADR 0004](../../adr/0004-m4-direction-matching.md)、[M3 报告域规格](../M3-reports/spec.md) §3.2.3/§3.2.4/§3.2.5/§7.1、PRD v1.1 §6.3（L197–222）/BR-08（L104）/BR-09（L105）/BR-12（L108）/§8.2（L472–501）/§8.3（L535）/§9（L573）/§12（L626–628）/§13.3（L651–656）、开发计划 M4（L227–230）。
> 状态取值只允许：`通过` / `未通过` / `未验证` / `不在范围` / `待裁决`。证据必须是命令 + 退出码 + 关键输出（或页面步骤 + 截图），不能只写「已实现」。
> 验收环境：演示库 PocketBase `http://127.0.0.1:8090` + Nuxt `http://127.0.0.1:3000`（账号 `superAdmin`）；新空库 `http://127.0.0.1:8094`（`/tmp/tj-m4m5-smoke` + `/tmp/tj-pb/pocketbase`，禁止指向真实 `pb_data/`）。执行日期 2026-11-17。

## 1. 范围与前置

- **验收对象**：`docs/specs/M4-matching/spec.md` 的纯函数、`talent_direction_requests` 集合、后台待归并接口（#1–#3）、后台方向选择入口（实现为 `POST /api/admin/talent/reports/:id/selection`，替代 spec §5.2 #5–#8 的 C 端 4 条路由）、方向页待归并入口、权限码/菜单、单测与门禁。C 端页面与 4 条 C 端路由归 M7。
- **实现任务**：task-13（M4-A）、task-27（M4-B）、task-30（M4-C）。
- **前置依赖（2026-11-17 复核）**：

| # | 前置 | 状态（2026-11-17） | 影响的验收项 |
| --- | --- | --- | --- |
| P1 | M1 规则域（方向/档位/分级/注解）已验收 | **已验收**（[M1 acceptance](../M1-rules/acceptance.md)） | 全部只读依赖；`talent:direction:list` 权限码；方向 CRUD |
| P2 | M3 报告域：`factorSnapshot`（含 `levelOrder`）、`directionSnapshot`、`selections`、版本 helper、`GET /reports/:id/direction-preview` | **已交付并可用**（M3-A/B/C 完成；独立验收 task-33 待执行） | AC-M4-01/03/04/05/06/07、快照冻结 |
| P3 | M2 会员域：parent/child 归属 helper | **已实现并验收**（task-9/task-16） | 待归并列表家长/子女归属 |
| P4 | 本地 PocketBase 可启动、`.env` 有超管凭据、新空目录用于 schema 烟测 | 满足（`env:doctor` 通过） | schema/幂等/权限验收 |
| P5 | M7 C 端页面与 4 条 C 端路由（spec §5.2 #5–#8） | **未开始** | C 端相关项记 `未验证`；页面记 `不在范围` |

- **M4 出口（开发计划 L230）**：AC-ADM-03 全过；命中排序单测覆盖平手规则。**结论：满足**（见 §2.1、§3）。

## 2. 追溯表

> 「实现（实际落点）」列已由 verifier 核对文件与行号；「测试 / 证据」列给最小可复现命令或步骤，输出写入 §3。

### 2.1 AC-ADM-03 补充（PRD §6.3 L197–222）

| ID | 需求 | PRD 位置 | 实现（实际落点） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| AC-M4-01 | 命中预览：每方向命中数/配置条数/命中率，排序符合 BR-08 | §6.3 L280、BR-08 L104 | `server/utils/talent-direction-match.ts` `matchDirections`/`computeTalentDirectionMatches`/`recommendDirections`；`server/utils/talent-direction-api.ts:588` `buildTalentDirectionPreview`；M3 `server/utils/talent-report-api.ts:1264` | `GET /api/admin/talent/directions/preview?reportId=`（M4-B 新增）、`GET /api/admin/talent/reports/:id/direction-preview`（M3） | E-M4-001（59 单测）、E-M4-014（冻结快照 hitCount/hitRate/排序）、E-M4-016（M3 预览 frozen/current/diff） | 通过 |
| AC-M4-02 | 自定义方向待归并入口存在，可归并（写别名）/转正（生成停用方向） | §6.3 L215、§13.3 L654 | `talent_direction_requests`（14 字段 + 4 索引）；`server/utils/talent-direction-selection.ts:285` merge / `:366` promote；`DirectionRequestsModal.vue`；方向页 `#headerExtra` | `GET /direction-requests`、`POST /direction-requests/:id/merge`、`POST .../promote`（另有 `/directions/requests` 别名） | E-M4-011（列表/归并/转正）、E-M4-012（单测 24 项）、E-M4-015（Playwright 弹层归并/转正） | 通过 |
| AC-M4-03 | 已被报告选择引用的方向不可删除 | §6.3 L222 | `server/api/admin/talent/directions/[id].delete.ts` + `server/utils/talent-rule.ts:569` `assertTalentDirectionDeletableInStore`（扫描 `talent_reports.selections`） | `DELETE /api/admin/talent/directions/:id`（M1） | E-M4-017（造 1 条 selections → DELETE 409「该方向已被报告引用，只允许停用」；不存在 id → 404） | 通过 |
| AC-M4-04 | 停用方向不进推荐；停用档位不可选/换档剔除 | §6.3 L213、BR-08 | `matchDirections` 过滤 `status!=="1"`；`pickTier` 过滤停用档位；`resolveTalentReportDirectionSelection` 运行期校验 | 预览 API、后台选择入口 | E-M4-014（停用 DIR-003 后 preview evaluatedDirections 6→5、选择 422 `DIRECTION_NOT_AVAILABLE`）；E-M4-001（UT-M4-08/16/18） | 通过 |
| AC-M4-05 | 推荐上限 5、选择上限 3（含自填共享），快照冻结值优先 | §6.3 L215、BR-08、§13.3 L655 | `resolveRecommendLimit`/`resolveSelectionLimit`；快照 `recommendLimit/selectionLimit` | 预览 API、`POST /reports/:id/selection` | E-M4-014（6 个已评估方向仅返回 5 个推荐；第 4 个选择 409 `SELECTION_LIMIT_REACHED`；快照 selectionLimit=3） | 通过 |
| AC-M4-06 | 平手规则：命中数→命中率→配置条数→编码（可复现） | BR-08 L104 | `compareDirectionHits`/`rankDirectionHits` | 纯函数 | E-M4-001（UT-M4-10/11/12/26：四键全序、打乱输入一致）；E-M4-014（冻结 6 方向排序 001→004→002→003→005→006） | 通过 |
| AC-M4-07 | 0 命中回退与空快照空态、空快照仍可自填 | BR-09 L105、§7.7 L385–386 | `recommendDirections`/`resolveDirectionRecommendations`；`pickManualTier` | 预览 API、后台选择入口 | E-M4-014（种子报告全 0 命中 → `fallback=true`、推荐 5 项且每项 `fallback=true`）；E-M4-015（快照 directions=[] 时自填成功并生成待归并）；E-M4-001（UT-M4-14/15：`emptyReason=NO_DIRECTIONS`/`NO_ENABLED_DIRECTIONS`） | 通过 |
| AC-M4-08 | 补发增量重算：只更新新增分册要素相关要求 | BR-05 L101、BR-03 L99 | `refreshDirectionSnapshot`（`server/utils/talent-direction-match.ts:635`） | M3 补发流程调用 | E-M4-001（UT-M4-28/29：只重算 affected、旧命中逐字段一致）；M3 补发联调不在本卡 | 未验证 |
### 2.2 PRD §12 C 端方向条目（M4 只验算法；页面与 4 条 C 端路由归 M7）

> spec §5.2 #5–#8（`/api/client/talent/directions`、`/selections*`）**未实现**（实现方声明留 M7，代码注释见 `server/api/admin/talent/reports/[id]/selection.post.ts` 文件头）。下列各项以「单测 + 后台选择入口」作算法证据，C 端接口/页面本身记 `未验证`/`不在范围`。

| 需求 | PRD 位置 | 实现 / 证据 | 状态 |
| --- | --- | --- | --- |
| 方向两页签、命中排序 | §12 L626、§7.7 L384 | 算法 UT-M4-10~12 + 冻结快照排序（E-M4-014）；C 端接口未实现 | 未验证 |
| 0 命中「暂无匹配」 | §12 L626、BR-09 | UT-M4-14 + 预览 fallback（E-M4-014） | 未验证 |
| 空推荐空态「暂无可推荐方向，可自己填写」 | §12 L626、§7.10 L416 | UT-M4-15（`NO_DIRECTIONS`）；C 端接口未实现 | 未验证 |
| 自己填写可提交（≤10 字 + 培养目标） | §12 L626、§7.7 L389 | E-M4-011（自填 11 字 422 `INVALID_MANUAL_NAME`、合法提交生成待归并）；E-M4-012 单测 | 未验证 |
| 已选上限 3、可取消、可换档 | §12 L627、§8.3 L535 | E-M4-011（上限 409、换档、取消幂等） | 未验证 |
| 方向下拉按拼音首字母排序 | §12 L628、§7.7 L389 | UT-M4-31（`buildManualDirectionOptions` zh-Hans-CN）；C 端接口未实现 | 未验证 |
| 编码不对家长展示 | BR-12 L108 | UT/接口字段审计：C 端读模型未实现，无法断言响应；后台预览保留 code（允许） | 未验证 |
| 报告不可读时方向不可见 | §10.5 L587、§7.7 | C 端路由未实现；M3 报告 C 端守卫由 M3/M7 负责 | 未验证 |
| 390/340 无横向溢出、0 控制台错误、Wot UI | §12 L630、§11 L596 | C 端页面未开始 | 不在范围 |
### 2.3 工程红线与跨模块契约

| 需求 | 位置 | 实现 / 证据 | 状态 |
| --- | --- | --- | --- |
| 单实例、单 PocketBase、无多租户 | AGENTS.md 红线 | E-M4-018：`grep -rnE "TENANT_MODE\|X-Site-Slug\|site.cookie"` 于 M4 新增文件无命中 | 通过 |
| 业务字段只落 `talent_*` | AGENTS.md 红线 | E-M4-006：新库集合清单只多 `talent_direction_requests`；M4 代码无 `users/configs/site_config` 写（E-M4-018） | 通过 |
| `setup.mjs` 只初始化空库；`sync-talent.mjs` 只加不删 | CONVENTIONS §1、ADR 0001-D1 | E-M4-006/007：空库 `env:setup` 53 业务集合 → `talent:sync` ×3 后 58（含 5 个 PB 系统集合），集合名清单与演示库 8090 完全一致；索引/权限只增不减 | 通过 |
| 不改 M1 已交付实现（唯一增量：方向页 headerExtra 按钮 + 弹层挂载） | 任务硬约束 | 人工 diff：`app/pages/admin/talent/rules/direction.vue` 仅新增 `pendingCount/showRequests/canMerge` 与按钮、`DirectionRequestsModal` 挂载；M1 列表/表单/弹层未改 | 通过 |
| 权限码有 C/F 菜单行；无新增 C 菜单 | CONVENTIONS §3、spec §2.2/§2.3 | E-M4-008：`talent:direction:merge` F 行 1 条（「待归并方向」），无新增 C 菜单（全站 C 菜单 33 条，M4 未增；合同写的「仍 11 条」为 task-15 菜单重构前的旧基线，见 §6 F7） | 通过 |
| 写接口 Zod + 权限 + 审计；日志不含敏感信息 | CONVENTIONS §2、PRD §10.3 | E-M4-011：归并/转正/选择各产生 `oper_logs`；摘要只含方向名/报告编号/数量，无手机号、身份证明文（正则核对） | 通过 |
| M3 契约：factorSnapshot(含 levelOrder)/directionSnapshot/selections/版本 helper | spec §3.1/§3.3/§3.4 | E-M4-014/016：`reports/:id/regenerate-snapshot` 真实调用 M4 纯函数产出冻结快照（6 方向、4 档位、`selectionLimit=3`）；M3 `direction-preview` 返回 `frozen/current/diff`；选择只追加 `versions[]`、不改 `snapshotVersion`（1→2 来自重算，选择后保持 2） | 通过 |
| M7 契约：推荐/详情/已选/自填字段与空态 | spec §7 | C 端路由/页面未实现 | 不在范围 |
| 演示数据虚构、不入生产 | PRD §11 L600、spec §3.8 | E-M4-011：待归并行家长「演示家长」、子女「演示子女一/二」、手机号 `1380****0001`（脱敏）；无真实 PII；seed 脚本本地执行 | 通过 |

### 2.4 单测覆盖（验收以用例全绿为准）

| 用例组 | 文件 | 覆盖 | 状态 |
| --- | --- | --- | --- |
| UT-M4-01~32 | `test/talent-direction-match.test.ts`（59 tests） | 命中/级序/缺失/重复/停用分级/0 配置/排序/平手/上限/回退/空快照/pickTier/选择/换档/取消/自填/快照/补发/拼音 | 通过 |
| UT-M4-S1~S10 | `test/talent-direction-api.test.ts`（24 tests） | 路由/权限/零写入/选择/换档/取消/上限/自填补偿/列表/归并/别名/转正/计数 | 通过 |
- 合同原计划的 `test/talent-direction-selection.test.ts` **未单独创建**，选择/归并/转正领域用例并入 `talent-direction-api.test.ts`（见 §6 F2）。

## 3. 证据表（已执行）

> 执行人 verifier-m45；日期 2026-11-17。命令均在仓库根 `/Users/hui/tongjia_jiankan/tongjia-talent` 执行；日志保存在 `/tmp/m45-*.log`，截图为 `/tmp/m45-shots/*.png`（临时目录，不入库）。

| 证据ID | 验证项（对应 §2 ID） | 命令 / 步骤 | 退出码 | 关键输出 | 结论 |
| --- | --- | --- | --- | --- | --- |
| E-M4-001 | AC-M4-01/06/07/08、§2.4 | `pnpm exec vitest run test/talent-direction-match.test.ts` | 0 | `Test Files 1 passed`；`Tests 59 passed` | 通过 |
| E-M4-002 | 合并定向回归（M4） | `pnpm exec vitest run test/talent-direction-match.test.ts test/talent-direction-api.test.ts` | 0 | `Test Files 2 passed`；`Tests 83 passed` | 通过 |
| E-M4-003 | —— | 合同原命令 `pnpm vitest run test/talent-direction-selection.test.ts` | — | 文件不存在（未创建）；覆盖并入 E-M4-012 | 不在范围 |
| E-M4-004 | 类型检查 | `pnpm typecheck` | 0 | 仅既有 WARN：`Duplicated imports "TALENT_REPORT_STATUSES/TalentReportStatus/TALENT_REPORT_STATUS_LABELS"`（M3 shared types，非 M4 新增） | 通过 |
| E-M4-005 | 回归（全量） | `pnpm test` | 1 | `Test Files 2 failed / 39 passed (41)`；`Tests 6 failed / 514 passed / 1 skipped`；失败均来自 C 端套件（`foundation-client-guard.test.ts` 3 条、`talent-ui-closure.test.ts` 3 条），原因：M7-A 并行改造 `apps/client`（`src/store/talent.ts`、`useProtectedFoundationPage.ts` 已删除）。M4/M5 全部测试文件通过 | 未通过 |
| E-M4-006 | schema 新库 | `export POCKETBASE_BINARY=/tmp/tj-pb/pocketbase POCKETBASE_URL=http://127.0.0.1:8094 POCKETBASE_DATA_DIR=/tmp/tj-m4m5-smoke/data POCKETBASE_MIGRATIONS_DIR=/tmp/tj-m4m5-smoke/migrations`；`pnpm env:doctor`；`pnpm env:setup`；启动 `pnpm pb` 后逐集合读取 | 0/0 | `env:setup`：53 个集合；`talent_direction_requests` 存在：14 字段、4 索引 `idx_talent_direction_requests_pending/_status/_report/_parent`；未删除任何旧集合 | 通过 |
| E-M4-007 | 存量幂等 | 同上环境 `pnpm talent:sync` ×3 | 0/0/0 | 第 3 次后 `collectionCount=58`（53 业务 + 5 PB 系统）、`menuCount=124`、`cMenuCount=33`，与第 1/2 次一致；集合名清单与演示库 8090 完全一致（`DIFF` 为空） | 通过 |
| E-M4-008 | 权限/菜单 | E-M4-006 环境读 `menus` | 0 | `talent:direction:merge` = F 行 1 条（「待归并方向」，status=1）；无新增 C 菜单 | 通过 |
| E-M4-009 | 构建 | `pnpm build` | 0 | `✨ Build complete!`；`Σ Total size: 20.9 MB (5.76 MB gzip)` | 通过 |
| E-M4-010 | 演示库连通 | 演示库 8090 + Nuxt 3000，`POST /api/public/admin-login`（superAdmin） | 0 | 列表：报告 2、方向 6、档位 4、建议版本 2、待归并 0 | 通过 |
| E-M4-011 | AC-M4-02/05/07（后台选择/自填/归并/转正/审计） | 脚本 `/tmp/m45-m4.mjs`（后台 API + PB 直读）：注入可交叉要素快照 → `POST /reports/:id/regenerate-snapshot` → 预览 → 选择/换档/取消/自填 → 归并/转正 → 读 `oper_logs` | 0 | 37 项断言 35 PASS；2 项为脚本断言口径写错（见下方注）→ 复核后实际符合预期；关键：recommend=`DIR-001,DIR-004,DIR-002,DIR-003,DIR-005`、第 4 个选择 `409 SELECTION_LIMIT_REACHED`、换档 `精进`、取消幂等、自填 `冰球`/11 字 422、归并 `aliases=["冰球"] version 1→1`、转正 stub `DIR-007 status=0 version=1`、快照版本选择前后不变、`oper_logs` 含归并/转正/选择且无手机号/身份证明文 | 通过 |
| E-M4-012 | AC-M4-02、§2.4 | `pnpm exec vitest run test/talent-direction-api.test.ts` | 0 | `Tests 24 passed` | 通过 |
| E-M4-013 | 演示数据/待归并列表 | `GET /api/admin/talent/direction-requests?status=待归并` | 0 | `total=1`；行字段 `id,reportId,reportNo,subjectType,subjectName,parentName,maskedMobile,manualName,tierId,tierName,status,targetDirectionId,targetDirectionName,createdAt,mergedAt,mergedByName`；`maskedMobile=1380****0001`；响应内 11 位数字串为报告编号 `R202611160001`（非手机号，脚本正则误报） | 通过 |
| E-M4-014 | AC-M4-01/04/05/06/07（预览与边界） | 演示库：种子报告 `R202611160002`（published）`GET /directions/preview`；随后注入要素→`regenerate-snapshot`→再次预览；停用 `DIR-003` 再预览/选择；最后恢复种子 | 0 | 种子态：`evaluatedDirections=6`、`recommendation.items=5`、`fallback=true`、每项 `hitCount=0`（0 命中回退，受上限 5 截断）；注入后：冻结 6 方向 `hitCounts=DIR-001:6/6, DIR-004:5/5, DIR-002:4/5, DIR-003:4/5, DIR-005:4/5, DIR-006:4/5`、推荐 5 项、`totalCandidates=6`；停用 DIR-003 后 `evaluatedDirections=5`、选择 → `422 DIRECTION_NOT_AVAILABLE` | 通过 |
| E-M4-015 | AC-M4-02/07（页面） | Playwright（chromium 1500×940，superAdmin）：`/admin/talent/rules/direction` → 「待归并方向（2）」→ 弹层 → 归并 `冰球`→`舞蹈家` → 转正确认 → 核对 PB | 0 | 19 项页面检查全 PASS（M4 段 8 项）：按钮含计数「（2）」；弹层含脱敏手机号、两行自填；归并后 `aliases=["冰球"] version=1`；转正后 `DIR-007 status=0 version=1`；`consoleErrors=[]`；截图 `m4-direction-requests.png`、`m4-direction-requests-after.png` | 通过 |
| E-M4-016 | M3 契约联调 | `GET /api/admin/talent/reports/b0bfl8us6s3z9mq/direction-preview` | 0 | `code=200`，返回 `frozen`(6 方向 summary)/`current`(6)/`diff`(6)/`configChanged=true`；M3 快照生成走 M4 纯函数 | 通过 |
| E-M4-017 | AC-M4-03 | 脚本 `/tmp/m45-m4-del.mjs`：注入 `DIR-001` 要求要素 → 重算快照 → 选择 `DIR-001` → `DELETE /directions/:id` | 0 | `regen=200 select=200 selections=1 DELETE(ref)=409 msg=该方向已被报告引用，只允许停用 DELETE(missing)=404 方向仍在=true` | 通过 |
| E-M4-018 | 红线 diff / 静态审计 | `grep -rnE "TENANT_MODE\|X-Site-Slug\|site.cookie"`、`grep -rnE "collection\(\"users\"\)\|collection\(\"configs\"\)\|collection\(\"site_config\"\)"`（M4 新增 utils/api 目录） | 1（无命中） | 两处均无输出；M4 只动 `talent_*` | 通过 |
| E-M4-019 | 文档/空白检查 | `grep -nE " +$" docs/specs/M4-matching/acceptance.md docs/specs/M5-advice/acceptance.md`；文件末尾换行检查（两个文件当前为新增未跟踪文件，`git diff --check` 不覆盖未跟踪文件） | 1（无匹配） | 行尾空白 0 行；两个文件均以换行结尾 | 通过 |

- **E-M4-011 两项脚本口径更正**：① 断言 `DIR-003` 未命中 gap 应为 3，实际 `B-28` 要求 LV2、实际 LV1 → `gap=1`（实现正确，断言写错）；② 待归并列表的「无手机号」正则 `\d{11}` 命中的是报告编号 `R202611160001`，人工核对响应仅含 `maskedMobile=1380****0001`，无明文手机号（见 E-M4-013）。
- **数据恢复**：演示库测试前快照（`talent_reports/talent_gene_reports/talent_advice_versions/talent_advice_docs/talent_directions/talent_direction_requests/talent_parents/talent_children/talent_levels/talent_tiers`）；测试后逐字段恢复并复核 `TOTAL_DIFFS=0`，方向 6、待归并 0、报告 2、建议版本 2/建议 4，`menus=124` 不变。临时库 8094 已停止，未触碰真实 `pb_data/`。

## 4. 待裁决 / 未决项（与 spec §13 一致）

| # | 项 | 当前默认 | 裁决人 | 裁决状态（2026-11-17） |
| --- | --- | --- | --- | --- |
| C1 | 0 命中回退「列全部」vs 最多 5 | 回退后受上限 5 截断（与原型一致） | 客户 / lead | 实现按 5 截断并通过（E-M4-014）；客户口径待确认 |
| C2 | 推荐 5 / 选择 3 是否可配置 | 常量 + 快照冻结，不落库 | 客户 / lead | 已按默认实现（E-M4-011 快照 `recommendLimit=5/selectionLimit=3`）；可配置性未做 |
| C3 | 停用分级的要求是否计分母 | 计入（未命中） | 客户 / lead | 已按默认实现（UT-M4-08） |
| C4 | 转正后历史已选是否改指向新方向 | 不改（以 `manualName` 为准） | lead | 已按默认实现；未单独复核历史选择指向（低风险） |
| C5 | 别名是否参与自动命中 | 不参与 | 客户 / lead | 已按默认实现（归并只写 aliases，不改 requirements/version） |
| C6 | 选择是否写版本历史 | 写 `versions[]`，不改 `snapshotVersion`（已与 M3 对齐） | 已定（M3） | 已验证（E-M4-011） |
| C7 | 显式重算是否允许回写旧命中 | 允许（唯一显式动作） | 已定（M3） | 已验证（E-M4-011/014） |
| P2 | M3 报告域实现 | 已交付（独立验收 task-33 待） | lead | 已解除 |
| P3 | M2 归属 helper | 已验收 | lead | 已解除 |

## 5. 命令清单（可复现）

```bash
# 定向单测（2 个文件；原计划第 3 个 selection 测试文件未创建）
pnpm exec vitest run test/talent-direction-match.test.ts test/talent-direction-api.test.ts

# 类型 / 全量回归 / 构建
pnpm typecheck
pnpm test                 # 全量：C 端 6 条失败与本卡无关（M7-A 并行改造），见 E-M4-005
pnpm build

# 新库 schema 烟测（临时空目录；禁止指向真实 pb_data/）
export POCKETBASE_BINARY=/tmp/tj-pb/pocketbase
export POCKETBASE_URL=http://127.0.0.1:8094
export POCKETBASE_DATA_DIR="$(mktemp -d /tmp/tj-m4m5-data-XXXXXX)"
export POCKETBASE_MIGRATIONS_DIR="$(mktemp -d /tmp/tj-m4m5-mig-XXXXXX)"
pnpm env:doctor && pnpm env:setup
pnpm pb &                  # 8094
pnpm talent:sync && pnpm talent:sync
# 断言：talent_direction_requests 存在 + 4 索引；集合清单 = 演示库；菜单 124、C 33、merge F 行 1

# 演示库（8090 + Nuxt 3000）
# 页面：/admin/talent/rules/direction → 待归并方向（N）→ 归并 / 转正；Playwright 截图与 console 0
```

## 6. 已知缺口与风险（验收记录）

| # | 缺口 / 风险 | 影响 | 处置 |
| --- | --- | --- | --- |
| F1 | spec §5.2 #5–#8 的 4 条 C 端路由（`/api/client/talent/directions`、`/selections*`）未实现；实现方以 `POST /api/admin/talent/reports/:id/selection` 提供同一领域能力的后台联调入口，并声明 C 端路由留 M7 | AC-M4-05/07 的 C 端接口、§2.2 全部 C 端条目无法端到端验证 | 由 lead 派发 M7 或补 M4-B；本表记 `未验证`/`不在范围`，不判缺陷 |
| F2 | 验收合同 E-M4-002 计划 `test/talent-direction-selection.test.ts` 未创建，选择/归并/转正单测并入 `talent-direction-api.test.ts` | 文档口径与文件不符 | 已在本表更正；建议回写 spec §5.5/§10 的测试文件清单 |
| F3 | 演示库种子 `talent_reports.factorSnapshot`（报告 `R202611160002`）只有 8 个 A/B/C 要素，方向要求使用 B/E/F 编码，二者不交叉 → 种子态全部方向 0 命中 | 演示库无法直接展示「正向命中 + 排序」；本次注入要素快照后验证 | 非代码缺陷（数据种子问题）：建议 `scripts/seed-talent-report.mjs` 按方向要求补齐因子或改用同源编码 |
| F4 | M4 spec §5.3.4 示例把 `frozen/current` 描述为 `directionSnapshot` 包装（含 `recommendation`），M3 实现返回 summary 数组；M4-B 另建 `/directions/preview` 承载 recommendation | 文档口径与实现有出入 | 按 spec 声明「以 M3 spec 为准」处理；建议回写 M4 spec §5.3.4 |
| F5 | 待归并路由存在两套路径：`/api/admin/talent/direction-requests/**` 与 `/api/admin/talent/directions/requests/**`；`server/api/admin/talent/directions/requests/[id]/[action].post.ts` 与 `server/api/admin/talent/direction-requests/[id]/[action].post.ts` 为**逐行复制**（仅注释不同，各约 110 行），`index.get.ts` 同样重复 | 两套别名若后续只改一处会产生行为漂移 | 非功能性缺陷（当前行为一致，均通过 E-M4-013/015）；建议收敛为单实现 + re-export，并在文档明确唯一口径 |
| F6 | 全量 `pnpm test` 6 条失败：`test/foundation-client-guard.test.ts`（3）、`test/talent-ui-closure.test.ts`（3），均为 M7-A 并行改造 `apps/client` 删除 `src/store/talent.ts`、`useProtectedFoundationPage.ts` 等导致 | 全量门禁当前非绿 | 与 M4/M5 无关；M7-A 完成后复跑；本卡以 M4/M5 定向测试为验收依据 |
| F7 | 合同「无新增 C 菜单（仍 11 条）」的基线过时：task-15 已重构为「工作台/会员管理一级 + 天赋规则（培养方向）/报告管理/系统管理/运行监控」，全站 C 菜单 33 条 | 只能按「M4 未新增 C 菜单」验收 | 已按相对口径验收（E-M4-008）；建议回写合同基线 |
| G3 | 自填两步写无事务 | 可能残留请求 | 单测覆盖补偿（E-M4-012「报告写入失败时删除新建请求」）；对账任务留 M9 |
| G4 | 并发选择无乐观锁 | 理论上限击穿/丢更新 | 已知限制；M9 压测决定 |
| F8 | `/directions/preview` 对 `pending_publish` 报告（空 `factorSnapshot`）仍返回 5 项 0 命中推荐（`fallback=true`），不返回 `NO_DIRECTIONS` | 后台预览可能被误读为「有可选方向」 | 观察项：该路由是「按当前配置重算」的后台诊断入口，响应含 `hasSnapshot=false`；是否改为空态由 lead/产品定；C 端空态由 M7 按 M3 契约实现 |
