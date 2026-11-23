# M6 · 旧口径清理与三角色验收与追溯

> 状态：**待验收（2026-11-17，architect 起草；实现与 verifier 执行后回填）**。本文是 M6 的验收合同：追溯表给范围与计划落点，证据表留给 verifier 填命令 / 退出码 / 关键输出。
> 依据：[M6 规格](spec.md)、[ADR 0006](../../adr/0006-m6-cleanup-and-roles.md)、PRD v1.1 §2（L46–60）/ §3.1（L66–85）/ §3.2（L87–91）/ §6.8（L324–337）/ §8.3（L522–535）/ §9（L539–577）/ §10（L581–589）/ §12（L604–630）、[AGENTS.md](../../../AGENTS.md)、[ARCHITECTURE.md](../../ARCHITECTURE.md)、[STATUS.md](../../STATUS.md)、`docs/QUALITY.md` 风险分级、开发计划 M6（L239–243）。
> 状态取值只允许：`通过` / `未通过` / `未验证` / `不在范围` / `待裁决`；**本文所有在范围内的条目初始为 `未验证`**，verifier 未取得证据前不得改为其它值。

---

## 1. 范围与前置

**验收对象**

- **删除侧**：spec §2 的 19 个旧集合、旧字段 / 旧索引 / 旧行、16 个旧页面（平台 11 + 机构 3 + C 端 2，C 端报告页归 M7 另计）、11 个旧组件、旧 API（admin 56 + org 16 + client 旧 6 + integration 1）、12 条旧 C 菜单、25 条旧 F 行、4 条旧分组行、22 个旧权限码、18 个旧服务端工具、旧种子 / 旧测试 / 旧 e2e。
- **保留侧**：spec §3 的 Foundation 底座、M2–M5 新集合与新 API、系统管理 / 运行监控（仅 superAdmin）、`talent_reading_progress`。
- **角色侧**：spec §6 的三角色（平台运营管理员 / 报告审核员 / 规则配置员）+ superAdmin、35 个在册权限码、工作台新码 `talent:dashboard:list`、客户管理员旧角色处置、系统 / 监控仅 superAdmin。
- **执行侧**：spec §4 的删除顺序、§5 的迁移脚本合同（备份 / 目标显式 / dry-run / 幂等 / 失败处理）、§11 的回滚方案。
- **不在本次验收**（spec §1.2 已明确，下表标 `不在范围`）：
  - 工作台四指标卡口径与系统管理页面能力补齐（M6 并行任务，验收归 AC-ADM-01 / AC-ADM-08）；
  - C 端报告 / 建议 / 方向页重建（M7）；
  - 真实外部接口、建议回传、PDF / OSS、同步配置（M8）；
  - E2E 全量重写与性能（M9）；
  - 旧数据迁移、历史客户 / 机构数据回填（客户 / M9；M6 只留备份与 CSV 导出）。

**前置依赖（未就绪则该条只能记「未验证」并写阻塞原因）**

1. M1–M5 规格对应的实现已合并到当前分支（M2 / M1 已完成；M3-C 页面、M5-A 数据层进行中）；M6 不得在并行任务未完成时删除其依赖文件。
2. M7 交接：新 C 端报告页 / 对象切换 / 阅读进度已可覆盖旧路径，或 lead 已签署「C 端报告页空窗」豁免（spec §7.3）。
3. S0 已完成：创建 `pre-m6-cleanup-<date>` tag；维护窗口确认；旧集成 / 定时任务已停写。
4. 目标 PocketBase 环境可访问，`.env` 有超管凭据；生产执行需 `POCKETBASE_ADMIN_EMAIL` / `POCKETBASE_ADMIN_PASSWORD` 为生产专用值。
5. 备份与恢复演练使用**隔离数据目录**（`mktemp -d`），禁止拿真实 `pb_data/` 做演练。
6. 三角色验收使用 seed 后的本地账号（平台运营 / 报告审核 / 规则配置 + superAdmin），口令只从环境变量读取，不写入文档。

---

## 2. 追溯表（AC-M6-01..12）

> 「实现（计划）」是按 spec 的落点；「测试 / 证据（计划）」是最小可复现命令或步骤，退出码与输出写入 §5。

### 2.1 删除归零（AC-M6-01..03、08）

| 需求 | 规格 / PRD 位置 | 实现（计划） | 测试 / 证据（计划） | 状态 |
| --- | --- | --- | --- | --- |
| **AC-M6-01** 旧入口 0 | spec §2.3 / §2.5 / §4.3–4.5；PRD §3.2 L89；开发计划 M6 出口 L243 | 删除 `app/pages/admin/talent/*` 旧 11 页 + 组件 11 个 + `app/pages/org/**` 3 页 + C 端 `binding.vue` / `plans/index.vue`；`useMenuTree.ts` 删旧 `TALENT_PATHS` / `TALENT_ORG_PATHS` | ① 侧栏截图：superAdmin / 平台运营 / 报告审核 / 规则配置四账号均无旧菜单；② `rg "admin/talent/(customer\|category\|element\|level\|library\|matching\|plan\|receive\|sync\|authorization\|institution)" app` 0 命中；③ `GET /api/admin/bootstrap` 菜单 path 集合无旧 path；④ `pnpm e2e --only 06` 通过 | 未验证 |
| **AC-M6-02** 旧集合 0 | spec §2.1 / §4.6 / §5；AGENTS 数据边界 | 迁移脚本删 19 个集合；`setup.mjs` 删旧 `COLLECTION_DEFS` 定义；`sync-talent.mjs` 加「旧集合不存在」断言 | ① 迁移报告 `deletedCollections=19`；② PB collections API 中 `talent_*` = spec §3.2 白名单（14–15 个）；③ `tmp=$(mktemp -d) && POCKETBASE_DATA_DIR="$tmp" pnpm env:setup` 后旧集合不存在；④ `pnpm vitest run test/foundation-schema.test.ts` 通过（含「不得出现旧集合」断言） | 未验证 |
| **AC-M6-03** 旧路由 404 | spec §2.4 / §4.4；PRD §10 L587 | 删除 admin 56 / org 16 / client 旧 6 / integration 1 条路由 | ① 对 §2.4 全部路径直调：期望 404（不得 500 / 不得 403 泄露）；② `rg "server/api/admin/talent/(customer\|report/\|institution\|authorization\|plan\|template\|matching\|sync-config\|sync-logs\|level-copy\|level-status)"` 0 命中；③ 旧 C 端报告路由按 §7.3 状态（M7 已替换则 404，未替换则记「未验证」） | 未验证 |
| **AC-M6-08** 旧权限码 0 | spec §2.6 / §6.2；ADR 0006-D1 | `setup.mjs` 删 22 旧码 + 25 条旧 F 行；`sync-talent.mjs` 断言旧码 0 行、新码 35 个均有 C/F 行 | ① `rg "talent:(customer\|content\|report:(revoke\|edit\|receive)\|institution\|plan\|service\|sync):" server app scripts shared test` 0 命中（`docs/` 历史文档排除）；② 菜单表 `permissionCode` 集合 = §6.2 的 35 个；③ `pnpm talent:sync` 输出新码 35 / 旧码 0 | 未验证 |

### 2.2 三角色与系统管理（AC-M6-04..06）

| 需求 | 规格 / PRD 位置 | 实现（计划） | 测试 / 证据（计划） | 状态 |
| --- | --- | --- | --- | --- |
| **AC-M6-04** 三角色菜单正反用例 | spec §6.1 / §6.3 / §6.7；PRD §2 L46–60、§12 L608 | `seed-accounts.mjs` 重写四角色；`sync-talent.mjs` 三角色精确收敛 | 每个账号登录后导出 bootstrap 菜单：平台运营 = 工作台 / 会员管理 / 天赋规则 3 页 / 报告管理 2 页（7 条 C）；报告审核 = 工作台 / 会员管理 / 基因报告 / 培育建议（4 条 C，会员只读）；规则配置 = 工作台 + 天赋规则 3 页（4 条 C）；superAdmin = 全部。再验停用某菜单 → 侧栏即时隐藏（不刷新登录态） | 未验证 |
| **AC-M6-05** 三角色接口正反用例 | spec §6.4 / §6.2；PRD §2 L56–60、§10 L587 | 三个自定义 roleKey 用菜单码鉴权；工作台拆 `talent:dashboard:list` | ✅ 正例：§6.4 每个角色允许的码逐个调 2xx（平台运营全量；审核 `report:publish` / `advice:publish`；规则 M1 写码 / `direction:merge`）。❌ 反例：报告审核调 `POST /members` 403、`POST /reports/sync` 403、`POST /advice/versions` 403；规则配置调 `GET /reports` 403、`GET /members` 403、`POST /reports/:id/publish` 403；三角色调 `POST /members/:id/id-no`（除平台运营外）403。**重点**：规则配置 `GET /dashboard` 200 且 `GET /reports` 403（工作台拆码生效） | 未验证 |
| **AC-M6-06** 系统管理 / 运行监控仅 superAdmin | spec §3.3 / §6.5；PRD §6.8 | 仅 superadmin 关联系统 / 监控菜单；操作日志归入系统管理 | ① 三角色 bootstrap 无「系统管理」「运行监控」菜单（含分组）；② 三角色直调 `/api/admin/system/users`、`/api/admin/role`、`/api/admin/menu`、`/api/admin/monitor/health`、`/api/admin/log/oper-log` 均 403；③ superAdmin 上述均 200 且侧栏可见；④ 系统管理含用户 / 菜单 / 角色 / 操作日志 4 页，运行监控 5 页 | 未验证 |

### 2.3 备份、迁移与回滚（AC-M6-07、11）

| 需求 | 规格 / PRD 位置 | 实现（计划） | 测试 / 证据（计划） | 状态 |
| --- | --- | --- | --- | --- |
| **AC-M6-07** 备份与迁移证据 | spec §4.1 / §5；ADR 0006-D2 | 新增 `scripts/migrate-m6-cleanup.mjs` + `pnpm migration:m6`；S1 备份与恢复演练 | ① `pnpm backup:pb --dir=backups-m6` 输出 backup key / 大小 / 路径；② sha256 与 `m6-backup-manifest.json` 一致；③ 备份 zip 还原到隔离数据目录，集合数 / 行数 / 登录 / 报告列表通过；④ dry-run 输出 `deletedCollections=19`、各集合行数、菜单数、权限码数；⑤ 正式执行输出 `m6-cleanup-report.json`；⑥ 第二次 dry-run 输出 `pending=0`（幂等）；⑦ 缺 `--confirm-m6` / 缺 `--backup` / URL 不一致时脚本非 0 退出 | 未验证 |
| **AC-M6-11** 文档同步 | spec §13；工程规则 | 按 §13 更新 9 份文档 + specs README | ① `rg "talent:seed\|/admin/talent/customer\|/admin/talent/institution\|/org/talent" docs AGENTS.md` 仅命中历史/交接包说明；② 链接抽查（ARCHITECTURE / API / STATUS / TALENT-LOCAL / CLIENT-PORTAL / SCRIPT-GUIDE / OPERATIONS / AGENTS / specs README）；③ `git diff --check` 通过 | 未验证 |

### 2.4 日志、门禁与客户验收面（AC-M6-09、10、12）

| 需求 | 规格 / PRD 位置 | 实现（计划） | 测试 / 证据（计划） | 状态 |
| --- | --- | --- | --- | --- |
| **AC-M6-09** 日志与审计 | spec §5.3 / §6.7；PRD §10 L585 | 迁移脚本写 `oper_logs`；角色新增 / 授权变更走 `withOperLog` | ① `oper_logs` 新增「M6 清理」记录：目标 URL、备份 key、删除计数、操作人；② 角色新增 / 菜单授权变更各 1 条日志；③ 日志字段无身份证明文 / 手机号；④ `GET /api/admin/log/oper-log` 可检索到 | 未验证 |
| **AC-M6-10** 门禁 | spec §9；docs/QUALITY.md | 见 §4 命令 | `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm client:typecheck`、`pnpm build`、`pnpm client:build:h5`、`pnpm client:build:mp` 全通过；`pnpm e2e --only 06` 通过；旧 e2e 断言已移除（01/02/03/05 可运行或明确标 M9） | 未验证 |
| **AC-M6-12** 客户验收面 | spec §3.3 / §8；PRD §6.8、§12 L616 | 三角色 + superAdmin 菜单与系统管理 4 页 | ① 客户用平台运营账号登录：仅见工作台 / 会员管理 / 天赋规则 / 报告管理，无机构 / 计划 / 内容库 / 报告接收 / 同步配置 / AI；② 系统管理 4 页可打开（用户 / 菜单 / 角色 / 操作日志）；③ C 端旧 bindings / 计划选择入口 0；④ 客户演示脚本走一遍会员 → 报告 → 建议 → 方向主链 | 未验证 |

---

## 3. 删除清单核对表（verifier 逐项打勾）

> 每项都要求「实现后 0 命中 / 404 / 不存在」，证据写入 §5。行数来自 spec §2。

| 类别 | 对象 | 目标数量 | 核对方式 | 状态 |
| --- | --- | --- | --- | --- |
| 集合 | spec §2.1 的 19 个旧集合 | 0 | PB collections API / 迁移报告 | 未验证 |
| 字段 | `talent_levels` 4 个旧字段 + 1 旧索引；`talent_reports.customerId` | 0 | schema 快照 / `sync-talent` 断言 | 未验证 |
| 旧行 | `talent_levels` 旧行、`talent_reports` 旧行（`subjectType=""`） | 0 | 迁移报告 `deletedRows` | 未验证 |
| B 端页面 | spec §2.3 平台 11 页 | 0 | `rg` / 目录 | 未验证 |
| 组件 | spec §2.3 旧组件 11 + `types.ts` | 0 | 目录 | 未验证 |
| 机构端 | 3 页 + 16 路由 + 3 C 菜单 + 7 F 行 + 2 角色 | 0 | 目录 / 菜单表 / 角色表 | 未验证 |
| C 端旧入口 | `binding.vue`、`plans/index.vue`、6 条旧路由 | 0 | 目录 / 路由 404 | 未验证 |
| C 端待 M7 | 报告阅读 4 页 + interpretations + 切换组件 + 9 条路由 | M7 替换 | M7 证据 / 豁免单 | 未验证（依赖 M7） |
| admin 旧路由 | spec §2.4 的 56 条 | 0（404） | 路由清单 / 直调 | 未验证 |
| org 路由 | spec §2.4 的 16 条 | 0（404） | 路由清单 / 直调 | 未验证 |
| integration | 旧 `POST /api/integrations/talent/reports` | 0（404） | 直调 | 未验证 |
| 菜单 | 12 条旧 C + 25 条旧 F + 4 条旧分组 | 0 | 菜单表 | 未验证 |
| 权限码 | 22 个旧码 | 0 | `rg` / 菜单表 | 未验证 |
| 服务端工具 | 18 个旧 util + 1 旧插件 | 0 | `rg` / 目录 | 未验证 |
| 共享文件 | `shared/types/talent-business.ts`、`talent-import.ts`、`shared/utils/talent-report.ts` | 0 | 目录 | 未验证 |
| 种子 | `scripts/seed-talent.mjs` + `talent:seed` | 0 | 目录 / package.json | 未验证 |
| 测试 | 11 个旧测试删除 / 重写；5 个断言更新 | 完成 | `rg` / `pnpm test` | 未验证 |
| e2e | 旧断言移除；新增 `06-m6-cleanup` | 完成 | `pnpm e2e --only 06` | 未验证 |

---

## 4. 测试命令（最小可复现）

```bash
# 0) 环境
pnpm env:doctor
gotag=$(git describe --tags --abbrev=0)   # 期望存在 pre-m6-cleanup-<date>

# 1) 静态与单测
pnpm typecheck
pnpm lint
pnpm test
pnpm client:typecheck

# 2) 构建
pnpm build
pnpm client:build:h5
pnpm client:build:mp

# 3) 新库烟测（禁止指向真实 pb_data）
tmp=$(mktemp -d) && POCKETBASE_DATA_DIR="$tmp" pnpm env:setup

# 4) 存量库加 schema / 菜单 / 权限（只加不删，连续两次断言幂等）
pnpm talent:sync
pnpm talent:sync

# 5) 备份与迁移（先 dry-run 再正式；目标显式）
pnpm backup:pb --dir=backups-m6
pnpm migration:m6 -- --dry-run --pb-url="$POCKETBASE_URL" --data-dir="$POCKETBASE_DATA_DIR" --backup="backups-m6/<key>.zip"
pnpm migration:m6 -- --confirm-m6 --pb-url="$POCKETBASE_URL" --data-dir="$POCKETBASE_DATA_DIR" --backup="backups-m6/<key>.zip"
pnpm migration:m6 -- --dry-run --pb-url="$POCKETBASE_URL" --data-dir="$POCKETBASE_DATA_DIR" --backup="backups-m6/<key>.zip"   # 期望 pending=0

# 6) 清理回归与角色正反用例
pnpm e2e --only 06

# 7) 仓库卫生
git diff --check
git status --short   # 只允许 docs/ 与任务范围内文件
```

**未跑检查必须显式声明**：缺 PocketBase / Playwright / 微信开发者工具导致未跑时，写「未验证 + 原因 + 复跑命令」，不得以「构建成功」代替权限 / 数据验收（docs/QUALITY.md）。

---

## 5. 证据表（verifier 回填）

> 填表规则：状态只允许五值；证据 = 命令 + 退出码 + 关键输出（≤3 行）；截图 / JSON / 日志放 `docs/specs/M6-cleanup/evidence/` 或任务评论，文中只写路径。禁止写「已实现」「应该可以」。

### 5.1 删除与归零

| 编号 | 命令 / 步骤 | 退出码 | 关键输出（脱敏） | 执行人 | 日期 |
| --- | --- | --- | --- | --- | --- |
| E-M6-01 | 侧栏四账号菜单导出 | — | — | — | — |
| E-M6-02 | `rg` 旧 path / 旧码 / 旧集合（spec §2） | — | — | — | — |
| E-M6-03 | 旧 URL / 旧 API 直调（spec §9.2） | — | — | — | — |
| E-M6-04 | 迁移报告 `m6-cleanup-report.json` | — | — | — | — |
| E-M6-05 | PB collections 白名单核对 | — | — | — | — |

### 5.2 备份与回滚

| 编号 | 命令 / 步骤 | 退出码 | 关键输出（脱敏） | 执行人 | 日期 |
| --- | --- | --- | --- | --- | --- |
| E-M6-06 | `pnpm backup:pb --dir=backups-m6` | — | backup key / size / sha256 | — | — |
| E-M6-07 | 恢复演练（隔离数据目录） | — | 集合数 / 关键行数 / 登录 / 报告列表 | — | — |
| E-M6-08 | dry-run 报告（迁移前） | — | deletedCollections / rows / menus / codes | — | — |
| E-M6-09 | 幂等 dry-run（迁移后） | — | `pending=0` | — | — |
| E-M6-10 | 回滚演练（恢复备份 + 切 tag） | — | 集合数 / 行数 / 登录 / 日志 | — | — |

### 5.3 三角色（正向 / 反向）

| 编号 | 角色 | 正向用例 | 反向用例 | 退出码 | 关键输出 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| E-M6-11 | 平台运营 `customer-admin` | 7 C 菜单；会员 / 报告 / 建议 / 规则全量接口 2xx | 系统 / 监控 403 | — | — | 未验证 |
| E-M6-12 | 报告审核 `report-reviewer` | 4 C 菜单；会员只读 2xx；`report:publish` / `advice:publish` 2xx | 会员写 / `report:sync` / `advice:sync` / 规则写 403 | — | — | 未验证 |
| E-M6-13 | 规则配置 `rule-configurator` | 4 C 菜单；M1 全码 2xx；`direction:merge` 2xx | `GET /reports` / 会员写 / 报告发布 403 | — | — | 未验证 |
| E-M6-14 | superAdmin | 全部菜单；系统 / 监控 2xx | — | — | — | 未验证 |
| E-M6-15 | 停用菜单即时隐藏 | 停用某 C 菜单 | 侧栏即时消失、接口 403 | — | — | 未验证 |

### 5.4 门禁与文档

| 编号 | 命令 | 退出码 | 关键输出 | 执行人 | 日期 |
| --- | --- | --- | --- | --- | --- |
| E-M6-16 | `pnpm typecheck` | — | — | — | — |
| E-M6-17 | `pnpm lint` | — | — | — | — |
| E-M6-18 | `pnpm test` | — | 文件 / 用例数 | — | — |
| E-M6-19 | `pnpm build` / `client:build:h5` / `client:build:mp` | — | — | — | — |
| E-M6-20 | `pnpm e2e --only 06` | — | 通过 / 失败条数 | — | — |
| E-M6-21 | `git diff --check` | — | 无输出 | — | — |
| E-M6-22 | 文档链接与口径抽查（spec §13） | — | — | — | — |

---

## 6. 结论与遗留

| 项 | 结果 | 说明 |
| --- | --- | --- |
| AC-M6-01 旧入口 0 | 未验证 | 依赖 M7（C 端报告页）时该部分记「未验证」 |
| AC-M6-02 旧集合 0 | 未验证 | |
| AC-M6-03 旧路由 404 | 未验证 | |
| AC-M6-04 三角色菜单 | 未验证 | |
| AC-M6-05 三角色接口 | 未验证 | 重点验证工作台拆码（规则配置 `GET /reports` 403） |
| AC-M6-06 系统 / 监控仅 superAdmin | 未验证 | |
| AC-M6-07 备份与迁移 | 未验证 | 硬门槛，缺证据不得进入删除 |
| AC-M6-08 旧权限码 0 | 未验证 | |
| AC-M6-09 日志与审计 | 未验证 | |
| AC-M6-10 门禁 | 未验证 | |
| AC-M6-11 文档同步 | 未验证 | |
| AC-M6-12 客户验收面 | 未验证 | |

**遗留 / 待裁决（同步 [spec §12](../M6-cleanup/spec.md)）**

| 编号 | 项 | 处理 |
| --- | --- | --- |
| Q1 | 菜单结构是否回到 PRD 6 组 11 菜单 | 沿用 2026-11-16 用户口径；lead 确认 |
| Q2 | 平台运营管理员是否可见系统管理（PRD §2 vs 任务约束） | 按「仅 superAdmin」执行；lead / 客户书面确认 |
| Q3 | 报告审核员是否保留发布权限 | 默认保留；客户要求只读则撤 `role_menus` |
| Q4 | 旧会员 / 机构数据删除后是否需可查 | 删除前 CSV 导出；长期保留备份 |
| Q5 | 系统管理是否保留 Foundation 额外页 | 保留，仅 superAdmin |
| Q6 | `customer-admin` 是否改名 `platform-operator` | M6 沿用；M9 可迁移 |
| Q7 | 机构账号删除还是停用 | 停用保留审计 |

---

## 7. 变更记录

- 2026-11-17：首版。按 [M6 规格](spec.md) 与 [ADR 0006](../../adr/0006-m6-cleanup-and-roles.md) 建立 AC-M6-01..12 追溯、删除清单核对表、三角色正反用例矩阵与空证据表；等待实现完成后由 verifier 回填。