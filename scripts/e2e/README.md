# 端到端实测（E2E）

面向真实运行环境的黑盒实测，M9 起分两层：

- **冒烟（smoke）**：`01 / 02 / 04 / 05 / 06m`，任何改动后可跑，覆盖主链与权限边界，只读为主。
- **验收（acceptance）**：`06 / 07 / 08 / 09 / 10`，发布门禁执行，逐 AC 取证，允许更重的数据准备与写入（全部带 `runId` 后缀并在 finally 清理）。

编号说明：验收 `06` 是会员域套件（spec §4.4）；原 M6 清理回归套件保留为 `06m`（`06-m6-cleanup.mjs`），避免与验收编号冲突，同时保证 `--only 06,07,08,09` 落在验收套件。

## 运行

```bash
# 前置：本地已启动 pnpm pb / pnpm dev（或 dev:all），且已初始化数据
#   pnpm env:setup && pnpm talent:sync && pnpm accounts:seed
#   TALENT_RULE_SEED_CONFIRM=rule pnpm talent:rule:seed
#   TALENT_MEMBER_SEED_CONFIRM=member pnpm talent:member:seed
#   TALENT_REPORT_SEED_CONFIRM=report pnpm talent:report:seed
#   TALENT_ADVICE_SEED_CONFIRM=YES pnpm talent:advice:seed
# 首次运行需安装浏览器，否则 04 / 05 / 06 / 07 / 08 / 09 / 10 的页面用例会失败
pnpm exec playwright install chromium

pnpm e2e                          # 默认 = 冒烟（沿用旧用法：01/02/04/05/06m）
pnpm e2e --group smoke            # 冒烟 01/02/04/05/06m
pnpm e2e --group acceptance       # 验收 06/07/08/09/10（发布门禁）
pnpm e2e --group all              # 冒烟 + 验收（01–10 口径）
pnpm e2e --only 06,07             # 单/多套件（套件 id 见下表）
pnpm e2e --timeout 600000         # 覆盖单套件超时（毫秒）
pnpm e2e --target remote          # 打测试服/staging（见「目标与安全」）
```

单套件也可直接执行：`node scripts/e2e/09-direction-domain.mjs`。

## 套件

| 组 | id | 文件 | 覆盖 | 当前断言基线 |
| --- | --- | --- | --- | --- |
| smoke | 01 | `01-admin-crud.mjs` | 新域只读列表 + 旧 API 404 + 同步 preview | 35 |
| smoke | 02 | `02-admin-actions.mjs` | 三角色接口正反、系统/监控仅 superAdmin | 33 |
| smoke | 04 | `04-client.mjs` | C 端门户（H5 主页/受保护页/旧页下线） | 27 |
| smoke | 05 | `05-admin-ui.mjs` | 7 个后台页面渲染 + 旧页面 404 + 三角色菜单 | 52 |
| smoke | 06m | `06-m6-cleanup.mjs` | M6 旧口径清理回归（旧文件/旧 URL/旧码/三角色矩阵） | 127 |
| acceptance | 06 | `06-member-domain.mjs` | 会员 8 列 / 四筛 / 详情 3 页签 / 新建·子女编辑·查询状态机·解绑 / 全号权限与日志 / 无密文哈希 / bindings 只读 / 页面 8 列与详情 | 89 |
| acceptance | 07 | `07-report-domain.mjs` | 报告 10 列 / 五筛 / 发布 v1 / 撤回 C 端 409 / 恢复快照 hash 不变 / 补发只追加 / 重算 v+1 / preview 零写入 / sync preview 零写入 / 权限 / 审计 / 页面 10 列与 `?tab=` 回落 | 110 |
| acceptance | 08 | `08-advice-domain.mjs` | 建议 15 列 / 精确周岁 / 归档版本只读 409 / 发布撤回与派生可见 / 接收新版负向 / CSV 导出 15 列脱敏 / 权限 / 审计 / 页面 15 列与历史版本横幅 | 84 |
| acceptance | 09 | `09-direction-domain.mjs` | 方向 7 列 / 要素 158 与 6 册 / 配置校验 422 / 引用删除保护 409 / 命中排序与 0 命中回退 / 已选 ≤3·换档·取消 / 自填归并转正 / C 端方向与选择 / 权限 / 审计 / 页面 7 列与配置弹层 158 | 118 |
| acceptance | 10 | `10-client-permission-regression.mjs` | C 端主链与深链回登录 / 协议门禁 / 对象切换无串号 / 390·340 无溢出 / 越权 404 / 停用 403 / PDF ticket 门禁 / 旧路由与旧权限码 0 / 三角色接口正反 / 日志无 PII / health | 203 |

> 断言数会随实现补充微调；以 `summary.json` 的 `totals` 为准（单次运行实时统计）。

## 证据与汇总

每次运行输出到 `E2E_EVIDENCE_DIR`（默认 `/tmp/tj-m9-e2e/<runId>/`，不提交仓库）：

- `<套件文件>.json`：`{suite, runId, group, target, startedAt, durationMs, checks[], passed, failed, total, skipped[], cleanup}`；
- `<id>-<套件文件>.log`：完整 stdout/stderr；
- `summary.json`：`{runId, group, target, durationMs, suites[], totals}`，供 CI/发布门禁归档。

证据写入前统一脱敏：不含 token / Cookie / 口令；11 位手机号与 18 位证件按「前 4 + 后 4」打码。

```bash
# 复用同一 runId 复跑（数据后缀与证据目录都不变，便于对比）
E2E_RUN_ID=m9-demo-01 pnpm e2e --group acceptance
```

## 账号与地址

密码沿用 `scripts/seed-accounts.mjs` 的环境变量：`SUPERADMIN_PASSWORD`、`PLATFORM_OPERATOR_PASSWORD`（兼容 `CUSTOMER_ADMIN_PASSWORD`）、
`REPORT_REVIEWER_PASSWORD`、`RULE_CONFIGURATOR_PASSWORD`；C 端演示账号用 `TALENT_MOCK_CLIENT_PASSWORD`。
地址用 `ADMIN_ORIGIN` / `H5_ORIGIN` 覆盖；`--target remote` 等价于切到 staging 默认地址。

## 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `ADMIN_ORIGIN` / `H5_ORIGIN` | `127.0.0.1:3000` / `127.0.0.1:9000` | 目标地址 |
| `E2E_TARGET` | `local` | `remote` 仅 staging |
| `E2E_ALLOW_WRITE` | `0` | remote 写操作（验收组 / PB 夹具 / 性能脚本）必须显式 `1` |
| `E2E_GROUP` | `smoke` | 默认分组；`--group` 优先 |
| `E2E_RUN_ID` | 时间戳 | 数据后缀与证据目录名；复跑可指定同一 ID |
| `E2E_EVIDENCE_DIR` | `/tmp/tj-m9-e2e/<runId>` | 证据输出目录 |
| `E2E_ENABLE_PB_FIXTURE` | `1`（本地） | `0` 关闭 PB 夹具；remote 需 `E2E_ALLOW_PB_FIXTURE=1` |
| `E2E_ALLOW_GLOBAL_WRITE` | `0` | 允许全局写（一键同步 commit、接收新版建议）；默认跳过，需隔离库 |
| `E2E_STAGING_HOSTS` | `staging-host` | remote 允许的 staging 主机白名单 |

`E2E_ALLOW_PROD` 不存在：生产域名一律硬失败，任何「绕过」开关都不提供。

## 数据准备与清理

1. **只用真实 API/页面做业务写入**；报告、建议版本、账号等在业务 API 没有删除入口的对象，用 `scripts/e2e/fixtures.mjs` 的 PB 管理端夹具创建/删除**本进程自己创建的记录**（按 id 追踪，不触碰种子记录）。这是让 07/09/10 在「自有报告」上完成发布/撤回/补发/选择且不污染种子的前提。
2. 所有写入对象名/编号带 `RUN_ID` 后缀；`06/07/09/10` 在 `finally` 逆序清理，`06/08` 的种子发表状态在清理时还原。
3. `08` 只改种子建议的「发布状态」并在 finally 还原（归档版本只读用例不写库）；不新建建议版本。
4. `07` 的一键同步 `commit`、`08` 的「接收新版」正向路径默认 **skip**（会全局刷新/切换生效版本），隔离库设 `E2E_ALLOW_GLOBAL_WRITE=1` 执行；skip 会计入 `summary.json.skipped`，不冒充通过。
5. PB 夹具拒绝 `ADMIN_ORIGIN` 与 `POCKETBASE_URL` 不同实例；拒绝生产域名；remote 需双重开关。
6. 运行前后可用只读 API 核对种子规模（会员 1 / 子女 2 / 报告 2 / 建议 4 docs / 版本 2 / 方向 6），本轮验收运行已验证跑后归位。

## 性能基线

见 `scripts/perf/m9-perf.mjs`（spec §5）：

```bash
node scripts/perf/m9-perf.mjs --scale small   # 生成 20/20/20 夹具数据 → 测 P-01/02/03/04 + P-07 → 清理
node scripts/perf/m9-perf.mjs --scale full --allow-write --samples 10   # 1000/500/500，仅限隔离实例
```

- 每项 3 次预热 + 10 个样本，输出 median / p95 / 门槛 / pass / `baselineMet`。
- `--scale small` 时 P-01/02/03 的 `baselineMet=false`，输出会明确写「未达 1000/500」；不得据此宣称性能达标。
- P-05/P-06/P-08/P-09/P-10 与浏览器首屏尚未实现，脚本在 `gaps` 中逐条列出，不冒充通过。
- 建议数据用独立「归档夹具版本」承载，通过 `versionId` 过滤测量，不切换当前生效版本、不影响 C 端。

## 注意事项

- 01 / 02 / 06m 以只读为主；06 / 07 / 09 / 10 需要 PB 夹具（`POCKETBASE_ADMIN_EMAIL/PASSWORD`，来自环境，不写入任何文档）。
- 页面用例需要 Playwright chromium；缺浏览器时套件 fail-fast（不 skip）。
- 旧集合归零的静态证据仍由 `pnpm migration:m6 -- --dry-run` 与 `test/m6-cleanup-plan.test.ts` 提供；E2E 只断言旧路由 404、旧菜单/旧权限码 0 行。
- 单条失败打印 `✗ 名称 期望/实际`，`run-all` 汇总后以非 0 退出；超时套件标记 `timeout` 并 kill。