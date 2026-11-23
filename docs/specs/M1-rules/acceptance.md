# M1 规则域 · 验收与追溯

> 状态：**已验收（2026-11-16，task-3 verifier 独立验证）**。本文是 M1 的验收合同；证据见 §4，结论与遗留见 §7。
> 依据：[M1 规则域规格](spec.md)、PRD v1.1 §6.3/§6.4/§6.5/§12、`docs/QUALITY.md` 风险分级、开发计划 M1 出口（L209–213）。
> 状态取值只允许：`通过` / `未通过` / `未验证` / `不在范围` / `待裁决`。

## 1. 范围与前置

- 验收对象：`docs/specs/M1-rules/spec.md` 的 6 集合（`talent_levels` 为增量改造）、31 条 API、3 个 B 端页面、导入导出、菜单与权限码种子。
- 实现任务：task-2（`server/api/admin/talent/**`、`server/utils/**`、`shared/types/**`、`scripts/setup.mjs`、`scripts/sync-talent.mjs`、`test/**`）。
- **前置依赖（未就绪则相关项只能记「未验证」）**：
  1. 种子脚本 `scripts/seed-talent-rule.mjs` 与 `pnpm` 登记（M1 补充项，不在 task-2 写范围）；
  2. 本地 PocketBase 可启动、`.env` 有超管凭据（`POCKETBASE_ADMIN_EMAIL` / `POCKETBASE_ADMIN_PASSWORD`）；
  3. 用于新库烟测的**新空目录** `POCKETBASE_DATA_DIR`，禁止指向真实 `pb_data/`。
- M1 出口（开发计划 L213）：`AC-ADM-04` / `AC-ADM-05` 全过；新库 `env:setup` 烟测通过；`talent:sync` 幂等重跑无副作用。

## 2. 追溯表

> 「实现」列为按 spec 的**计划落点**；实现后 verifier 需核对文件与行号再改状态。「测试 / 证据」列给最小可复现命令或步骤，退出码与输出写入 §4。

### 2.1 AC-ADM-03 培养方向（PRD §6.3 L197–222）

| 需求 | PRD 位置 | 实现（计划） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- | --- |
| AC-ADM-03-1 列表 7 列，行内 7 单元格对齐 | §6.3 L219 | `app/pages/admin/talent/rules/direction.vue` 列定义 | `GET /api/admin/talent/directions` | 启动 `pnpm pb` + `pnpm dev`，登录后台打开 `/admin/talent/rules/direction`；逐列核对表头（编码/培养方向/关联要素与要求分级/启用档位/默认档位/状态/操作）并截图 | 通过 |
| AC-ADM-03-2 配置弹层只列 158 项文库要素，分册筛选与数量正确 | §6.3 L220 | 配置弹层 + `useTalentRuleApi` 要素查询 | `GET /api/admin/talent/factors?libraryId=&category=` | 种子后接口断言：无筛选 `total=158`；A–F 各分册数量与 `element-lib.js` 一致（A=26 / B=39 / C=27 / D=25 / E=18 / F=23）；弹层人工核对分册下拉「全部分册 + 6 册带数量」 | 通过 |
| AC-ADM-03-3 保存缺要素 / 缺档位时阻断并提示 | §6.3 L221 | 弹层 `handleSave()` 校验 + 服务端 Zod | `POST/PUT /api/admin/talent/directions` | `pnpm vitest run test/talent-rule-domain.test.ts`：空 `requirements` → 422；空 `tierIds` → 422；`defaultTierId ∉ tierIds` → 422；弹层人工提交空表单看到行内提示 | 通过 |
| AC-ADM-03-4 已被报告引用的方向不可删除 | §6.3 L222 | `server/utils/talent-rule.ts` 引用扫描（`talent_reports` 存在才查） | `DELETE /api/admin/talent/directions/:id` | 单元测试：stub 报告引用 → 409；无引用 → 删除成功。M3 接入后补真实链路 | 未验证 |
| 方向保存后生成新版本 | §6.3 L211 | `version` 递增 | `PUT /api/admin/talent/directions/:id` | 单测：保存前 `version=N`，保存后 `N+1`；仅状态接口不改版本 | 通过 |
| 方向删除保护跨 M1 边界 | spec §4.3 | 渐进式引用扫描 | `DELETE /api/admin/talent/directions/:id` | 单测：`talent_reports` 集合不存在时不报错、直接允许删除 | 通过 |
| 档位维护：4 预置、可编辑/停用/设默认、不提供新增 | §6.3 L213 | `tiers` 页面弹层组件 | `GET/PUT /api/admin/talent/tiers` | 单测：无 POST/DELETE 路由（404）；同时两次设默认 → 库内仅 1 条 `isDefault=true`；人工核对无「新增档位」按钮 | 通过 |

### 2.2 AC-ADM-04 潜质要素（PRD §6.4 L224–238）

| 需求 | PRD 位置 | 实现（计划） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- | --- |
| AC-ADM-04-1 共 158 项、6 分册，数量与文库一致 | §6.4 L236 | `scripts/seed-talent-rule.mjs` + `talent_factors` | `GET /api/admin/talent/factors` | 新库种子后断言 `total=158`；按 `category` 聚合 A=26/B=39/C=27/D=25/E=18/F=23；`slotTotal=12` 全量一致 | 通过 |
| AC-ADM-04-2 检索与分册下拉可叠加 | §6.4 L237 | 页面筛选 + 列表接口 | `GET /api/admin/talent/factors?keyword=&category=&libraryId=` | 单测：`code` 关键字 + `category=A` 交集条数正确；分页 20；人工核对筛选变化回第一页 | 通过 |
| AC-ADM-04-3 页面无新增/编辑/停用入口 | §6.4 L238 | `factor.vue` 只读页 | 路由清单 | 人工：页面无新增/编辑/停用/删除按钮；路由目录中无 `factors.post.ts` / `[id].put.ts` / `[id].delete.ts`（仅 `sync` 写） | 通过 |
| 12 槽位文案弹层：4 档 × 3 变体 × 四段，未回填「待补写」 | §6.4 L232 | 文案弹层 + `slots` JSON（每槽 `content/example/direction/suggestion`） | `GET /api/admin/talent/factors/:id` | 单测：种子要素 `slots` 四键齐全且每键 3 项、每项四段字段齐全；`filledSlotCount` = 四段全空的补集计数（种子 27）、`partialSlotCount=0`；人工打开弹层核对四段与「待补写」 | 通过 |
| 切换性别与年龄库、同步该库（含库不存在时） | §6.4 L232 | 库切换条 + 两个 sync 入口 + Mock 源 | `GET /api/admin/talent/factor-libraries`、`POST /factor-libraries/sync`（body `{gender, age}`）、`POST /factor-libraries/:id/sync` | 单测：对不存在的 `male/1` 调无 id 同步 → 新建分库并写入要素；同库二次同步幂等（要素 158 不变、槽位/`filledCount` 不翻倍）；两条同步路径都写 `oper_logs`；人工切换库刷新 | 通过 |
| 导出、下载模板 | §6.4 L232 | `factors/export`、`factors/template` | GET CSV | 人工下载：导出列 = 外部文库 9 列（含四段），行数 = 要素×分级×变体；模板仅表头+示例且带 BOM | 通过 |

### 2.3 AC-ADM-05 分级与固定注解（PRD §6.5 L240–256）

| 需求 | PRD 位置 | 实现（计划） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- | --- |
| AC-ADM-05-1 固定注解 632 条、分级 4 条 | §6.5 L254 | 种子 + 两页签列表 | `GET /api/admin/talent/factor-notes`、`GET /api/admin/talent/levels` | 新库种子后断言 `factor-notes.total=632`、`levels.total=4`；分级 `sortOrder` = 1–4 唯一 | 通过 |
| AC-ADM-05-2 分级下拉筛选后条数与选项一致 | §6.5 L255 | 列表接口聚合 + 页面下拉 | `GET /api/admin/talent/factor-notes?levelCode=LVn` | 单测：每档 `total` 与下拉 count 相同，四档之和 = 632；切换页签保留筛选值 | 通过 |
| AC-ADM-05-3 导入可预览通过/失败行，失败行不写入 | §6.5 L256 | `import/preview` + `import` | `POST /api/admin/talent/factor-notes/import/preview`、`/import` | `pnpm vitest run test/talent-rule-csv.test.ts`：构造 1 行通过 + 1 行失败（要素编码不存在）→ 预览 `passed=1/failed=1`；提交后库内只新增通过行、失败行无记录、响应含失败行号与原因 | 通过 |
| 固定注解 9 列 / 分级设置 7 列 | §6.5 L246/L248 | `level.vue` 两页签列定义 | 两个列表接口 | 人工核对表头与列数；注解正文列省略 + hover 全文；潜质要素名称取文库当前值（改文库名后列表跟着变） | 通过 |
| 编码唯一、编辑不可改 | §6.5 L250 | `code` 生成 + 422 | `POST/PUT /levels`、`/factor-notes` | 单测：更改 `code` → 422；重复 `code` / 重复 `sortOrder` → 409 | 通过 |
| 被方向引用的分级只允许停用 | §6.5 L250 | 引用扫描（notes + directions JSON） | `DELETE /api/admin/talent/levels/:id` | 单测：分级被注解引用 → 409；被方向 `requirements` 引用 → 409；仅停用成功 | 通过 |
| 模板 / 导出 | §6.5 L250 | 模板与导出路由 | `GET */template`、`GET */export` | 人工下载：固定注解模板 6 列、分级模板 6 列；导出跟随当前筛选 | 通过 |

### 2.4 PRD §12 后台验收条目（M1 相关子集）与工程红线

| 需求 | PRD 位置 | 实现（计划） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 方向列表 7 列、配置弹层只取 158 项文库、保存校验、被引用不可删 | §12 L611 | 同 §2.1 | 同 §2.1 | 同 AC-ADM-03-1~4（03-4 因缺 `talent_reports.selections` 未验证，见 §4.1 F2） | 未验证 |
| 潜质要素只读、158 项 / 6 册、12 槽位 × 四段 | §12 L612 | 同 §2.2 | 同 §2.2 | 同 AC-ADM-04-1~3 | 通过 |
| 固定注解 632 条、分级 4 条、导入预览与失败明细 | §12 L613 | 同 §2.3 | 同 §2.3 | 同 AC-ADM-05-1~3 | 通过 |
| 11 个菜单可见性与角色一致，停用即时生效 | §12 L608 | M1 只登记 3 条 C 菜单 + F 码；三角色授权在 M6 | 菜单种子 | M1 只验证「新菜单可见、`status="0"` 即时隐藏」；完整角色矩阵 M6 验收 | 通过 |
| BR-08 方向命中：级序 ≥ 计 1 条、排序与上限 | L104 | **不在 M1**（算法 M4）；M1 只交 `requirements` 契约 | — | 单测只验契约：`{code,level}` 结构、1–50、去重、编码存在、分级启用；排序算法 M4 验收（契约见 §2.5） | 不在范围 |
| BR-12 编码不对家长展示，后台保留编码 | L108 | 后台列表保留 `code` 列；C 端 M7 | — | 人工：3 个页面均展示编码；M7 验收编码不外露 | 通过 |
| BR-13 列表规范：一列一字段、筛选交集、每页 20 | L109 | 3 页面列表 | 列表接口 | 单测：`pageSize` 默认 20、上限 100；多筛选 AND；人工核对筛选变化回第一页 | 通过 |
| 单实例 / 无多租户 / 业务字段只落 `talent_*` | AGENTS.md 红线 | 全量 diff | — | `rg -n "TENANT_MODE\|X-Site-Slug\|site cookie" scripts server app shared` 无新增；`git diff` 中 `users`/`configs`/`site_config` 无业务字段新增 | 通过 |
| 新库 `env:setup` 烟测 | 开发计划 M1 出口 | `setup.mjs` 新集合与索引 | — | 新空目录 `pnpm env:setup` 成功；集合清单含 6 个集合；§3.7 新索引全部存在（含 2 个 `talent_levels` 部分唯一索引）；旧索引 `idx_talent_levels_element_level` **仍然存在**（M1 不删） | 通过 |
| `talent:sync` 幂等重跑无副作用（只加不删） | 开发计划 M1 出口 | `sync-talent.mjs` | — | 连续两次 `pnpm talent:sync`，集合/字段/索引清单与条数不变；`talent_levels` 旧字段与旧索引仍在、旧行未被改动；菜单/权限码不重复 | 通过 |
| `talent_levels` 增量改造与双语义过滤 | ADR 0001-D1 | `sync-talent.mjs` + `talent-rule.ts` 过滤封装 | `GET /api/admin/talent/levels`、`/factor-notes` | 单测：连续新增 4 条新分级成功（旧唯一索引 `(elementId, levelCode)` 不阻塞，因新行镜像 `levelCode=code`）；`levels` 列表不含 `code=""` 旧行；新增/编辑/删除只作用于新行；`requirements` 引用的分级必须 `code!=""` 且启用 | 通过 |
| 固定注解全局口径（不按分库） | ADR 0001-D3 | `talent_factor_notes` 无 `libraryId`；名称解析 | `GET /api/admin/talent/factor-notes` | 单测：新增第二个分库（女/0）后 `factor-notes` 仍为 632 条、不随库翻倍；名称解析取最近同步库 | 通过 |
| 权限码与菜单登记（C + F） | CONVENTIONS §3 / spec §2 | `setup.mjs` + `sync-talent.mjs` | — | 单测/脚本断言：15 个新权限码均在 `menus` 有 C 或 F 行；`requirePermission` 用到但无菜单行的码为零 | 通过 |
| 审计：写接口落 `oper_logs` | PRD §10.3 | `withOperLog()` | 写接口 | 人工：新增方向、保存配置、停用、导入、同步、改档位各产生一条操作日志；日志不含导入正文明文 | 通过 |

### 2.5 BR-08 契约（M1 只验数据契约，不算命中验收）

| 需求 | PRD 位置 | 实现（计划） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `requirements` 结构 `[{code, level}]`，1–50 项、去重 | L104 / spec §3.5.1 | Zod + 服务层校验 | `POST/PUT /api/admin/talent/directions` | 单测：空数组 422；重复 `code` 422；51 项 422；`level` 非启用分级 422；`code` 不存在 422 | 通过 |
| 命中比较依赖 `sortOrder`，不依赖名称 | L104 / spec §3.5.1 | `talent_levels.sortOrder` 唯一 1–4 | 列表接口 | 单测：改名后 `requirements.level` 仍有效；`sortOrder` 重复 → 409；M4 命中用 `sortOrder` | 通过 |

## 3. 测试命令（按 `docs/QUALITY.md` 分级）

> schema / 权限 / 菜单变更属「schema / 认证 / 权限」级：必须定向 Vitest + 真实 PocketBase 新库烟测 + B/API 类型检查。

| # | 命令 | 覆盖 |
| --- | --- | --- |
| 1 | `pnpm vitest run test/talent-rule-domain.test.ts` | 方向契约、分级/注解唯一与引用保护、版本递增、名称解析、档位默认唯一、分库同步（含无 id upsert）幂等、四段槽位结构、双语义过滤（旧唯一索引兼容写入）、渐进式引用扫描 |
| 2 | `pnpm vitest run test/talent-rule-csv.test.ts` | 注解/分级 CSV 解析、表头别名、失败行不写入、预览与提交一致 |
| 3 | `pnpm vitest run test/talent-admin.test.ts test/talent-csv.test.ts` | 回归：旧天赋管理资源与 CSV 模式未被改坏 |
| 4 | `pnpm typecheck` | 类型、`shared/types/`、页面与 API 一致性 |
| 5 | `pnpm lint` | 代码规范 |
| 6 | `export POCKETBASE_DATA_DIR="$(mktemp -d /tmp/tongjia-m1-XXXXXX)" && pnpm env:doctor && pnpm env:setup` | 新库初始化、6 集合、§3.7 新索引、旧索引/旧字段保留 |
| 7 | `pnpm talent:sync`（连续两次） | 存量库幂等（只加不删）、旧数据未改、菜单/权限不重复 |
| 8 | 后台烟测：`pnpm pb` + `pnpm dev`，登录后逐页人工核对 §2 的页面类条目并截图 | 3 个页面、弹层、空态、错误态 |
| 9 | `git diff --check` | 空白错误；确认未改源码以外路径（本任务） |

- **本轮执行状态（2026-11-16）**：§3 表中 #1–#7、#9 已执行（证据见 §4；其中 #3 旧天赋回归 `talent-admin.test.ts` + `talent-csv.test.ts` 14 tests 全绿，`/tmp/tj-verify-regression.log`）；#8 页面烟测已由 verifier 用 Playwright 真实登录覆盖主路径与列数（`/tmp/tj-verify-pages.log`），空态/错误态/暗色未覆盖（§4.1 O2）；e2e 按 §3 说明未纳入 M1 门禁、未运行。
- 未运行或未安装的命令写「未运行」，不能写「通过」。
- 旧 e2e（`pnpm e2e` 02–05）覆盖旧规则页，**M1 不纳入门禁**，M9 重写；若运行变红不算 M1 失败，但必须在本表记录（见 §6 R1）。
- 种子脚本未就绪时，§2.2 / §2.3 的计数类条目只能记「未验证」。

## 4. 证据表（verifier 填写）

> 每条证据 = 命令或可复现步骤 + 退出码 + 关键输出；没有证据不得标「通过」。
> 本轮环境：PocketBase 0.38.1（`/tmp/tj-pb/pocketbase`）、Node 22.23.5、pnpm 10.33.2；临时库 `/tmp/tongjia-verify-C322W3/data`（`mktemp` 新建，未触碰真实 `pb_data/` 与 8090）；临时 Nuxt dev `http://127.0.0.1:3000`；超管凭据由脚本自行读取 `.env`，未打印。
> 证据文件均在 `/tmp/tj-verify-*.log`、`/tmp/tj-verify-shots/*.png`（本轮临时目录，验收后可清理；关键输出已摘录在本表）。

| 需求 ID / 条目 | 命令或步骤 | 退出码 | 关键输出（条数 / 集合 / 索引 / 页面观察） | 结论（通过/未通过） | 证据位置（截图/日志路径/提交） |
| --- | --- | --- | --- | --- | --- |
| AC-ADM-03-1 | Playwright 真实登录后打开 `/admin/talent/rules/direction`，读表头与行数 | 0 | 表头 7 列：编码 / 培养方向 / 关联要素与要求分级 / 启用档位 / 默认档位 / 状态 / 操作；6 行；console 0 | 通过 | `/tmp/tj-verify-pages.log`；`/tmp/tj-verify-shots/direction-page.png` |
| AC-ADM-03-2 | `GET /api/admin/talent/factors?libraryId=<男0>` + 分册聚合；Playwright 打开「新增方向」弹层 | 0 | `total=158`，分册 A=26 / B=39 / C=27 / D=25 / E=18 / F=23；弹层含「要素配置」「已选 0 / 50 项」「全部分册（158）」；弹层宽 1180 两栏 | 通过 | `/tmp/tj-verify-api.log`；`/tmp/tj-verify-shots/direction-config.png` |
| AC-ADM-03-3 | `PUT /directions/:id` 空 `requirements` / 默认档位不在子集；`vitest run test/talent-rule-domain.test.ts` | 0 | 空 requirements → 422「至少配置 1 项要素」；`defaultTierId∉tierIds` → 422「默认档位必须在启用档位中」；方向相关单测全绿 | 通过 | `/tmp/tj-verify-api.log`；`/tmp/tj-verify-vitest.log` |
| AC-ADM-03-4 | 尝试构造真实报告引用后 `DELETE /directions/:id` | — | M1 `talent_reports` 无 `selections` 字段（`scripts/setup.mjs` L1143–1193），无法造真实引用；纯函数 409 由单测覆盖，无引用删除成功 | 未验证（阻塞：M3 补 `selections` 后补测，见 §4.1 F2） | `test/talent-rule-domain.test.ts:552`；`/tmp/tj-verify-api.log` |
| AC-ADM-04-1 | 种子后断言 `talent_factors` 总数与分册聚合、`slotTotal` | 0 | 158 条；A=26 / B=39 / C=27 / D=25 / E=18 / F=23；每项 `slotTotal=12` | 通过 | `/tmp/tj-verify-data.log` |
| AC-ADM-04-2 | `GET /factors?libraryId&category=A`、`&keyword=A-01` | 0 | 默认 `pageSize=20`、`rows=20`；`category=A` total=26；`category=A + keyword=A-01` total=1；`pageSize=500` 被压到 100 | 通过 | `/tmp/tj-verify-api.log` |
| AC-ADM-04-3 | 无写路由探测 + 页面按钮检查 | 0 | `POST /factors`、`PUT/DELETE /factors/:id` 均 404；要素页仅「同步该库 / 导出 / 文库模板 / 查看文案」，无新增/编辑/停用/删除 | 通过 | `/tmp/tj-verify-api.log`；`/tmp/tj-verify-shots/factor-page.png` |
| 12 槽位 × 四段结构 | 种子抽检全部 158 要素 `slots`；详情接口；文案弹层 | 0 | `slots` 键固定 LV1–LV4、每档 3 变体、每变体 content/example/direction/suggestion 四段齐全；A-01 12/12「完整」、A-02 3/12「部分」、其余「待补写」；弹层 4 档页签均「已回填 3/3」 | 通过 | `/tmp/tj-verify-data.log`；`/tmp/tj-verify-api.log`；`/tmp/tj-verify-shots/factor-slots.png` |
| 库不存在时同步（无 id 入口） | `POST /api/admin/talent/factor-libraries/sync` body `{female,3}`；再调有 id 同步 | 0 | 新建分库 + 要素 158（`created=158`、`itemCount=158`、`slotTotal=1896`、`filled=0`——该库无正文为设计行为）；再次同步 `created=0`、要素仍 158、`filledSlotCount` 不翻倍（27）；两条路径均写 `oper_logs` | 通过（F1 已修） | `/tmp/tj-verify-api.log`；`/tmp/tj-verify-f1.log` |
| AC-ADM-05-1 | 种子后断言 + `GET /levels`、`GET /factor-notes` | 0 | `factor-notes.total=632`、`levels.total=4`；`noteCounts={LV1:158,LV2:158,LV3:158,LV4:158}`；分级 sortOrder 1–4 唯一 | 通过 | `/tmp/tj-verify-seed1.log`；`/tmp/tj-verify-data.log`；`/tmp/tj-verify-api.log` |
| AC-ADM-05-2 | `GET /factor-notes?levelCode=LV2`；页面分级下拉 | 0 | LV2 total=158；下拉「全部分级（632）」+ 每档 158；切换页签保留筛选值（页面观察） | 通过 | `/tmp/tj-verify-api.log`；`/tmp/tj-verify-shots/level-notes.png` |
| AC-ADM-05-3 | `POST /factor-notes/import/preview`、`/import`（1 通过 + 1 失败：要素编码 Z-99 不存在） | 0 | 预览 `passed=1 failed=1`，失败行 `rowNumber=3`、原因「要素编码不存在或文库未同步：Z-99」；执行 `success=1 failed=1`；A-03-LV1 正文写入、Z-99 无记录、总数仍 632 | 通过 | `/tmp/tj-verify-api.log` |
| 固定注解全局口径（632 不随库翻倍） | 造第二分库（女 3）后再查注解总数 | 0 | 分库 2 个、要素 316 条，`factor-notes.total=632`、`noteTotal=632` | 通过 | `/tmp/tj-verify-api.log` |
| 方向版本递增 | `POST /directions` → `PUT /directions/:id` → `PUT /directions/:id/status` | 0 | 新建 `version=1`；保存配置后 `version=2`；仅状态接口后 `version` 仍为 2 | 通过 | `/tmp/tj-verify-api.log` |
| 引用保护（分级/方向） | `DELETE /levels/:id`（LV4）；`vitest` 方向引用函数 | 0 | 分级被 158 注解与方向引用 → 409「该分级已被引用，只允许停用」；方向有引用 409 仅单测覆盖（真实链路见 AC-ADM-03-4） | 通过（分级实测；方向真实链路待 M3） | `/tmp/tj-verify-api.log`；`/tmp/tj-verify-vitest.log` |
| 档位默认唯一 | `PUT /tiers/:id` 设默认、重名、停用默认、恢复默认 | 0 | 设 T2 默认后库内仅 1 条 `isDefault=true`；重名 → 409「档位名称已存在：启蒙」；停用全局默认 → 422；恢复 T1 后唯一且启用；`POST/DELETE /tiers` → 404 | 通过 | `/tmp/tj-verify-api.log`；`/tmp/tj-verify-shots/direction-tiers.png` |
| `talent_levels` 增量改造（旧字段/旧索引保留、新行过滤） | 新库 schema 断言；`GET /levels`；编辑/删除新行 | 0 | 旧索引 `idx_talent_levels_element_level` 仍存在；旧字段 `elementId/levelCode/levelName/annotation` 保留且 `required=false`；新索引 `idx_talent_levels_code`（部分唯一）与 `idx_talent_levels_sort` 存在；`GET /levels` 只返回 4 条 `code!=""` 新行；编辑/删除只作用于新行（旧行无法在全新库构造，过滤由单测覆盖） | 通过 | `/tmp/tj-verify-schema.log`；`/tmp/tj-verify-schema-post-sync.log`；`/tmp/tj-verify-api.log` |
| 菜单与权限码登记 | 新库 `menus` 全量断言；`talent:sync` 两次；Playwright 侧栏；菜单 status=0 观察 | 0 | 15 个权限码各恰好 1 条菜单行（3 C + 12 F）；3 条新 C 菜单 path/component/permissionCode 与 spec §2.2 完全一致，均挂在唯一「培养方向」M 分组下；旧「分级与固定注解」C 菜单唯一且已重指向 `/admin/talent/rules/level`（旧 `/admin/talent/level` 0 条）；`status="0"` 后侧栏即时隐藏、恢复后重现 | 通过 | `/tmp/tj-verify-schema.log`；`/tmp/tj-verify-sync2.log`；`/tmp/tj-verify-pages.log` |
| 审计日志 | 写操作后查 `oper_logs` | 0 | 30 条日志覆盖 17 类写操作（同步/再同步/导出/导入/新增/编辑/删除/配置/状态/档位）；8 条失败操作 `status=1`；标题 ≤100 字（max 61）；导出/导入只记计数摘要（如「潜质要素导出（1896 行）」「固定注解导入（总 2 / 成功 1 / 失败 1）」）；无导入正文明文 | 通过 | `/tmp/tj-verify-api.log` |
| 新库 `env:setup` 烟测 | `POCKETBASE_BINARY=/tmp/tj-pb/pocketbase` + `POCKETBASE_DATA_DIR=$(mktemp -d)` → `pnpm env:doctor`、`pnpm env:setup`；随后 133 条 schema 断言 | 0 | doctor 识别二进制/临时目录/临时端口；setup「45 个集合」；§3.7 新索引 100% 存在（含 2 个 `talent_levels` 部分唯一索引）；旧索引仍存在；133/133 断言通过（同步前后各一次） | 通过 | `/tmp/tj-verify-setup2.log`；`/tmp/tj-verify-schema.log`；`/tmp/tj-verify-schema-post-sync.log` |
| `talent:sync` 幂等（只加不删） | 临时库连续两次 `pnpm talent:sync`；同步前后快照比对 | 0 | 两次均 exit 0；快照（集合/字段/索引/菜单/id/条数）diff 0 行；规则域权限码校验 15；`talent_levels` 旧字段/旧索引未动、旧行未改；菜单与权限码无重复 | 通过 | `/tmp/tj-verify-sync1.log`；`/tmp/tj-verify-sync2.log`；`/tmp/tj-verify-snap-0.json` vs `/tmp/tj-verify-snap-1.json`（diff 0） |
| 红线检查（单 PB / `talent_*`） | `rg -n "TENANT_MODE|X-Site-Slug|site cookie" scripts server app shared`；检查 diff | 0 | 仅命中 `scripts/check-ai-entry.mjs:53` 的规则定义本身，无实际使用；新增业务字段全部落 `talent_*`，`users/configs/site_config` 无业务字段新增 | 通过 | `/tmp/tj-verify-redline.log`（含 grep 输出）；`git diff` |
| `git diff --check` | `git diff --check` | 0 | 无输出（无空白错误）；本任务只改本文件 | 通过 | 本轮终端记录 |
| 静态门禁（补充） | `pnpm typecheck`；3 个定向 Vitest；旧天赋回归（`talent-admin` + `talent-csv`）；`foundation-schema` 回归；变更文件定向 ESLint | 0 | typecheck exit 0；规则域 Vitest 3 文件 73 tests 全绿；旧天赋回归 2 文件 14 tests 全绿；foundation-schema 6 tests 全绿；定向 ESLint exit 0；全量 `pnpm lint` 见 §4.1 O1 | 通过 | `/tmp/tj-verify-typecheck.log`；`/tmp/tj-verify-vitest.log`；`/tmp/tj-verify-regression.log`；`/tmp/tj-verify-foundation.log`；`/tmp/tj-verify-eslint.log` |
| 页面渲染与列数（补充） | Playwright 真实登录打开 3 页；读表头、行数、按钮、console | 0 | 方向 7 列 / 6 行；要素 7 列 / 20 行、无编辑入口、库头「要素 158 项 · 文案 27/1896」；注解 9 列 / 20 行、顶部「分级 4 档 / 固定注解 632 条」；分级设置 7 列 / 4 行；导入弹层可打开；三页 console/pageerror 均 0 | 通过 | `/tmp/tj-verify-pages.log`；`/tmp/tj-verify-shots/*.png` |
| 401 / 403 权限拒绝（补充） | 未带 token 调用；创建无规则域权限的自定义角色账号后调用 | 0 | 未登录 → 401；探针账号可登录后台但 `GET /levels`、`GET /factors` → 403；探针账号/角色/关联已清理 | 通过 | `/tmp/tj-verify-api.log` |
| 导入边界（补充） | multipart 上传 10MB+ 文件；上传 `.txt`；导出 BOM 检查 | 0 | >10MB → 413；非 CSV → 415；要素/分级/注解导出均带 UTF-8 BOM；分库同步 `age=19` / `gender` 非法 → 422；要素列表缺 `libraryId` → 422 | 通过 | `/tmp/tj-verify-api.log`；`/tmp/tj-verify-extra.log` |
| 文档同步状态（补充） | 检查 `docs/API.md` / `docs/ARCHITECTURE.md` / `docs/STATUS.md` | — | API.md 已含新路由条目；ARCHITECTURE L52 已列 6 集合与 `talent_levels` 增量改造；STATUS 注明「大盘数字待 M1 验收后统一更新」 | 遗留（不阻塞 M1，见 §7） | 对应文档 |

### 4.1 发现与遗留（不改变 §2 状态，需 lead / 后续里程碑处理）

| # | 级别 | 发现 | 影响 | 证据 | 建议 |
| --- | --- | --- | --- | --- | --- |
| F1 | 中 → **已修复** | **分库再同步的写入幂等缺陷**：`planTalentFactorMerge` 原先用 `JSON.stringify` 比较 `slots`；PocketBase 落库 JSON 键序被规范化为字母序，导致每次再同步 `updated=158`、`unchanged=0`。已改为键序无关的 `stableComparable` 深比较，并补回归测试「已落库 JSON 键序变化不算内容变化」。 | 低：原问题只导致全量重写与同步日志失真，不重复数据；修复后同一源二次 merge 为 no-op。 | `pnpm vitest run test/talent-rule-domain.test.ts` exit 0（38 tests，含新增键序用例）；`pnpm typecheck` exit 0；修复文件 `server/utils/talent-rule-source.ts`、`test/talent-rule-domain.test.ts` | 不再阻塞 M1；M8 接真实源后复跑同一幂等用例 |
| F2 | 低 | **方向删除保护真实链路在 M1 不可验证**：M1 `talent_reports` 无 `selections` 字段，`assertTalentDirectionDeletableInStore`（`server/utils/talent-rule.ts` L569–585）以 `fields: "id,selections"` 查询会报错并被 catch 当作无引用 | 中：M3 加字段前，删除方向不会因报告引用被 409 拦截（当前数据模型下也无法存在引用，风险后移到 M3） | `scripts/setup.mjs` `talent_reports` 字段清单无 `selections`；API 无引用删除成功；纯函数单测 409 通过 | M3 落地 `selections` 后补 E2E（含 409 断言），并确认查询字段存在 |
| F3 | 低 | **schema 必填性与 spec 字面差异**：因 PocketBase「required number 不能为 0 / required bool 只能 true」，`talent_factor_libraries.age/filledCount`、`talent_factors.filledSlotCount/partialSlotCount`、`talent_tiers.isDefault` 在 PB 层为可选，必填性由 Zod / 种子保证（`scripts/setup.mjs` L1289–1295、L1319–1322、L1421–1423 有注释） | 低：功能与数据正确；但 spec §3 的「必填」列与库内 schema 字面不一致，后续按 spec 断言会误报 | `/tmp/tj-verify-schema.log` 对上述字段的 `required=false` 断言通过（按实现口径） | spec v1.2 在必填列补 PB 语义说明，或改为「服务层必填」 |
| O1 | 提示 → **已处理** | **全量 `pnpm lint` 原先被历史原型 JS 阻塞**：37 个 error 全在 `docs/天赋正式开发交接包/talent-prototype*/assets/js/*`。已在 `eslint.config.mjs` ignores 排除该历史资产目录；全量 `pnpm lint` 现 exit 0。 | 已消除完整门禁阻塞；原型文件本身未改。 | `pnpm lint` exit 0（2026-11-16 19:36）；`git diff --check` exit 0 | 无需后续动作；若原型要参与 lint，另建独立配置 |
| O2 | 提示 | 页面「空态/错误态/暗色/窄屏」本轮未独立验证；仅覆盖真实登录主路径、列数、弹层、console 0 | 低：M1 验收条目未强制，但发布验收清单要求 | `/tmp/tj-verify-pages.log` | M1 合并前抽检或并入 M9 页面验收 |
| O3 | 待裁决 | U2「弱势 vs 优秀」口径仍待客户确认（spec §9 U2）；种子按「卓越→LV4 / 优良→LV3 / 常态→LV2 / 弱势→LV1」映射，632/158/27 等数字不受影响 | 低：仅外部同步映射口径 | `scripts/talent-rule-seed-data.mjs` L26–34；`/tmp/tj-verify-seed1.log` | 客户/PRD v1.2 裁决；M8 真实源接入前确认 |
| O4 | 提示 → **已完成** | 文档收尾：`docs/API.md` 增加 M1 31 条路由与 200 路由口径；`docs/ARCHITECTURE.md` 增加规则域集合与 M1 菜单说明；`docs/STATUS.md` §5 更新为 200 路由 / 68 B 页 / 45 集合 / 30 测试文件 194 用例，并记录 M1 变更。 | 已消除文档遗留；门禁基线仍以 §6 的 2026-10-23 与 acceptance 证据为准。 | 上述文档 + `git diff --check` exit 0 | 无 |

## 5. 判定规则

- 任一 AC 子项 `未通过` → M1 不能 complete，先修再验；不得删断言、跳检查或放宽口径过关。
- 「页面类」条目（列表列数、按钮出入口、空态）必须有人工观察 + 截图，不能只靠接口通过。
- 「计数类」条目（158 / 632 / 4 / 27 / 1896）必须有种子或同步后的实际查询输出，不能引用规格数字。
- 「结构类」条目（12 槽位 × 四段、`talent_levels` 新旧字段共存、索引清单）必须给出实际 schema/索引查询输出，不能只看 spec。
- 文档类（`docs/API.md` / `docs/ARCHITECTURE.md` / `docs/STATUS.md`）未同步不算 M1 验收失败，但必须在 task-3 结论中列为遗留项，由 lead 派发。

## 6. 最高风险与对应验证命令（task-1 出口）

| # | 风险 | 影响 | 验证命令 / 步骤 |
| --- | --- | --- | --- |
| R1 | **`talent_levels` 增量改造的双语义期**：旧行（`elementId` 非空、`code` 空）与新行共存；旧分级页失效、旧 e2e 变红；若误删旧字段则不可回滚 | M1 后页面/接口混入旧行导致列表错乱、方向引用了旧分级；误删字段破坏本地 Mock 库 | ① `rg -n "admin/talent/level\\|talent/level-\\|level-copy\\|level-status" scripts server app` 核对菜单已重指向、旧代码未删；② 新库烟测断言**旧索引 `idx_talent_levels_element_level` 仍存在**、旧字段仍在、2 个新索引已建；③ 单测断言 `levels` / `factor-notes` / `directions.requirements` 只接受 `code != ""` 的分级；④ 回滚演练：删新字段/新索引后旧页面可访问（本地 Mock 库）；⑤ 记录 `pnpm e2e --only 02,03,04,05` 失败清单（不作为 M1 门禁，作为 M6/M9 待办） |
| R2 | **`requirements` JSON 与 M4 命中语义漂移**：用名称/库 id 而非 `code`/`sortOrder`；重复编码或停用分级混入 | M4 命中算法与 M3 快照拿到脏契约，返工跨里程碑 | `pnpm vitest run test/talent-rule-domain.test.ts`（空数组、重复 code、51 项、不存在要素、停用分级、默认档位不在子集、方向编码不可改）；契约字段只允许 `{code, level}` 的断言；命中比较走 `sortOrder` |
| R3 | **种子/同步数据不可复现**：158 / 632 / 27 / 1896 对不上；四段文案结构缺字段；外部文库「弱势 vs 优秀」口径未定；`talent:sync` 二次执行翻倍 | AC-ADM-04-1、AC-ADM-05-1 无法验收；M7 消费四段时缺字段仍需迁移 | ① 新空目录 `pnpm env:setup` + 种子脚本后断言 `factors=158`、`factor-notes=632`、`levels=4`、分库 `filledCount=27`、`partialSlotCount=0`；② 断言每个 factor 的 `slots` 四键齐全、每键 3 项、每项四段字段齐全；③ 连续两次 `pnpm talent:sync`，断言条数不变、旧行未被改；④ 分册聚合同 `element-lib.js`；⑤ 未决项 U2（弱势/优秀）在验收结论中列为「待裁决」，不得静默通过 |

> 另有三项风险随 M1 交付记录：R4 新路由与旧 `[resource]` 动态路由遮蔽（验证：`curl -i http://127.0.0.1:3000/api/admin/talent/factors` 命中新路由而非「天赋资源不存在」）；R5 M1 无并发编辑保护，后写覆盖（验证：并发保存后查 `oper_logs` 与 `version`，在验收结论中记为已知限制）；R6 多分库后同一 `factorCode` 名称不一致（验证：造两个分库同名编码不同名称，断言注解名称解析取 `syncedAt` 最近库并在验收记录标注）。

## 7. 验收结论（task-3 verifier，2026-11-16）

### 7.1 计数

| 口径 | 通过 | 未通过 | 未验证 | 不在范围 | 备注 |
| --- | --- | --- | --- | --- | --- |
| §2 追溯表（36 行） | 33 | 0 | 2（AC-ADM-03-4、其汇总行） | 1（BR-08 算法） | 未验证均因 M1 数据模型不含 `talent_reports.selections`，属 M3 依赖 |
| §4 证据表（28 项） | 26 | 0 | 1（AC-ADM-03-4） | — | 「库不存在时同步」结论为「通过（F1 已修）」；O1/O4 已处理 |

### 7.2 M1 出口判定

开发计划 M1 出口要求：`AC-ADM-04` / `AC-ADM-05` 全过、新库 `env:setup` 烟测通过、`talent:sync` 幂等无副作用。本轮：

- AC-ADM-04（158 / 6 分册 / 12 槽位 × 四段 / 只读 / 同步 / 导出模板）：**全部通过**；
- AC-ADM-05（632 / 4 分级 / 下拉一致 / 导入预览失败行不写 / 9 列 + 7 列）：**全部通过**；
- 新库烟测：**通过**（45 集合、133/133 schema 断言、旧索引保留）；
- `talent:sync` 连续两次：**通过**（快照 diff 0，菜单/权限不重复）。

**结论：M1 出口条件满足，可进入 M1 收尾/合并流程。** F1/O1/O4 已处理；仍需携带 F2/F3 遗留项；AC-ADM-03-4 在 M3 加 `talent_reports.selections` 后补真实链路验收。全量 `pnpm lint` 现已 exit 0（历史原型资产已在 ESLint ignores 中排除）。

### 7.3 需 lead 处理

1. **F1（已修）**：`planTalentFactorMerge` 改为键序无关深比较，补「JSON 键序变化不计为变化」单测；`talent-rule-domain` 38 tests + `typecheck` 通过。
2. **F2**：把「方向被报告引用 → 409」补测登记到 M3 任务；M3 加 `selections` 字段时同步补 E2E。
3. **F3**：spec v1.2 为 PB required number/bool 语义补必填说明（或 M6 改服务层校验口径），避免后续按字面断言误报。
4. **O1（已处理）**：`eslint.config.mjs` 已忽略历史原型目录，`pnpm lint` exit 0。
5. **O4（已完成）**：`docs/API.md` / `docs/ARCHITECTURE.md` / `docs/STATUS.md` 已同步 M1 口径。
6. **O3**：U2 口径仍需客户裁决，M8 真实文库接入前确认。
