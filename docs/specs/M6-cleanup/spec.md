# M6 · 旧口径清理与三角色规格

| 项 | 内容 |
| --- | --- |
| 状态 | **规格已出（2026-11-17，architect / task-23；待 lead 复核）**，实现与验收未开始 |
| 里程碑 | M6（开发计划 L239–243：工作台 + 系统管理 + 菜单重组）。本文只负责其中 **旧口径删除 + 三角色正式授权** 两项；工作台四指标卡与系统管理页面本身由同里程碑的并行任务承接，边界见 §1.2 |
| 依据 | PRD v1.1 §2 角色与权限（L46–60）、§3.1 本期范围（L66–85）、§3.2 不在本期范围（L87–91）、§6.8 系统管理（L324–337）、§8.3 状态机（L522–535）、§9 接口（L539–577）、§10 权限与安全（L581–589）、§12 验收总表（L604–630）；[AGENTS.md](../../../AGENTS.md)；[ARCHITECTURE.md](../../ARCHITECTURE.md)；[STATUS.md](../../STATUS.md)；M1–M5 规格与 ADR；[ADR 0006](../../adr/0006-m6-cleanup-and-roles.md) |
| 关联文档 | [M6 验收与追溯](acceptance.md)、[M1 规格](../M1-rules/spec.md)/[ADR 0001](../../adr/0001-m1-rule-domain.md)、[M2 规格](../M2-members/spec.md)/[ADR 0002](../../adr/0002-m2-member-domain.md)、[M3 规格](../M3-reports/spec.md)/[ADR 0003](../../adr/0003-m3-report-domain.md)、[M4 规格](../M4-matching/spec.md)/[ADR 0004](../../adr/0004-m4-direction-matching.md)、[M5 规格](../M5-advice/spec.md)/[ADR 0005](../../adr/0005-m5-advice-domain.md)、[M7 基线](../M7-c-end/ux-baseline.md) |
| 读者 | 实现 agent（按 §4/§5/§6 执行删除与角色种子）、verifier（按 [acceptance.md](acceptance.md) 取证）、lead（裁决 §12 未决项） |

> 本文是**删除合同**而不是重构建议：凡列入 §2 的旧资产，M6 完成时必须是「0 入口 / 0 集合 / 404 路由 / 0 权限码」；凡列入 §3 的资产，M6 不得删除、不得改语义。删除不可逆，唯一回退手段是 §4.1 的备份，因此 §5 的迁移脚本门槛与 §11 的回滚方案是本文的硬约束，不是建议。

---

## 0. 决策基线（不再作为未决项）

| 编号 | 决策 | 落点 | 关联 |
| --- | --- | --- | --- |
| D1 | **先备份、再停菜单 → 删路由 → 删页面 → 删集合**；旧集合不做原地改名/复用，旧数据不迁移，只保留备份 | §4、§5 | ADR 0006-D1 |
| D2 | **备份是删除的硬门槛**：无当日一致性备份、无目标 PB URL / 数据目录显式确认、无 dry-run 报告，迁移脚本必须拒绝执行；`setup.mjs` 永久不得承担清库 | §4.1、§5 | ADR 0006-D2 |
| D3 | **三角色正式授权**：平台运营管理员 / 报告审核员 / 规则配置员；系统管理与运行监控仅 `superAdmin`；客户管理员旧角色并入平台运营管理员 | §6 | ADR 0006-D3 |
| D4 | **机构端整体退出**：机构菜单 / 页面 / API / 角色 / 授权 / 培养计划 / 内容库全部删除，不做机构数据迁移，不恢复多租户 | §3.4、§7.1 | ADR 0006-D4 |
| D5 | **旧 C 端 bindings 退出**：`/api/client/talent/binding*` 与计划选择删除；家长—子女归属唯一真源改为 `talent_parents.userId`；阅读进度集合保留、由 M7 重写访问层 | §7.2 | ADR 0006-D5 |
| D6 | **回滚 = 备份恢复 + 代码 tag**：删除后不允许「只回滚代码不回滚数据」；恢复演练先于生产执行 | §11 | ADR 0006-D6 |

---

## 1. 范围与不在范围

### 1.1 本规格交付

1. **旧口径清点与删除清单**：集合、字段、索引、页面、组件、API、菜单、权限码、种子脚本、旧测试、旧 e2e 的逐项清单与顺序（§2、§4）。
2. **保留边界**：Foundation 底座、M2–M5 新集合、系统管理与运行监控（§3）。
3. **删除前置与迁移脚本合同**：备份门槛、目标环境显式化、dry-run、幂等、失败回滚、禁止清库（§4.1、§5）。
4. **三角色权限矩阵**：平台运营管理员 / 报告审核员 / 规则配置员 × 菜单 / 接口权限码；系统管理与运行监控仅 `superAdmin`；客户管理员旧角色处置；角色种子与菜单收敛实现要求（§6）。
5. **旧 C 端 bindings 与机构端退出边界**（§7）。
6. **验收标准 AC-M6-01..12**（§8）、测试命令（§9）、实施顺序（§10）、回滚（§11）、风险与未决项（§12）、文档同步（§13）。

### 1.2 不在本规格范围

| 项 | 归属 | 说明 |
| --- | --- | --- |
| 工作台四指标卡口径与实现（FR-ADM-01） | M6 并行任务 | 本文只要求工作台权限码拆分为 `talent:dashboard:list` 并纳入三角色矩阵；指标卡数值口径以 PRD §6.1 与 M6 并行任务为准 |
| 系统管理四页（用户 / 菜单含一级分组页签 / 角色 / 操作日志）的页面能力补齐 | M6 并行任务 | 本文只负责「仅 superAdmin 可见」与菜单归组；页面 CRUD 验收归并行任务与 AC-ADM-08 |
| C 端报告页 / 建议页 / 方向页重建 | M7 | 本文只删旧 bindings / 计划选择入口，并定义与 M7 的交接门槛（§7.3） |
| 真实外部接口、建议回传、PDF 渲染与水印、同步配置 | M8 | 旧 integration / PDF / 同步配置在 M6 删除；M8 按新合同重建（§3.5） |
| E2E 全量重写、性能验收 | M9 | M6 只新增 `06-m6-cleanup` 回归套件并移除必红的旧断言（§9.2） |
| PRD §13 待定项（含验收口径二义性） | lead / 客户 | 见 §12 未决项 Q1–Q7 |
| 旧数据迁移、历史客户/机构数据回填 | 客户 / M9 | M6 **不迁移**，只留备份；如需可查须在删除前导出（§4.1） |

### 1.3 硬约束（违反即不通过）

- **单实例、单 PocketBase**：不新增 `TENANT_MODE`、`site` cookie、`X-Site-Slug`、第二个 PB 连接、按请求切库；不恢复多租户。
- **不恢复机构业务**：机构 / 代理商 / 服务商、培养计划、内容库、报告接收列表、跟进单 / 认领 / 转交、AI 辅助建议一律不得以任何形式回到菜单、页面或 API（PRD §3.2 L89）。
- **业务字段只落 `talent_*`**：不回填 `users` / `configs` / `site_config`；删除旧集合时不得把字段挪进 `users`。
- **`setup.mjs` 只初始化全新数据目录**：发现旧业务集合必须失败；M6 不得给 `setup.mjs` 增加任何删除 / 清理 / `--force` 能力。
- **只有一个删除入口**：M6 的 schema 删除只能由 §5 的迁移脚本执行，不得在 `sync-talent.mjs`、种子脚本、插件启动流程里夹带删除。
- **权限前后端双校验**：菜单隐藏只做体验，接口必须独立 `requirePermission`（PRD §2 L58–59）。
- **文档示例虚构**：姓名如「陈示例 / 陈小示」、手机号 `13800000001`、身份证 `110101201609081234`、报告号 `GR202611160001`；不写真实 PII。
- **只写文档**：本任务只产出 `docs/specs/M6-cleanup/` 与 `docs/adr/`，不改代码、不 commit。

---

## 2. 旧口径清点（M6 必须归零）

> 清点口径：2026-11-17 工作树（M1/M2 已实现、M3 页面进行中、M5 进行中）。行号指向 `scripts/setup.mjs`、`scripts/sync-talent.mjs` 的当前行；实现时若行号漂移，以集合名 / 路径为准。

### 2.1 旧集合（19 个，必须删除）

| # | 集合 | `setup.mjs` 定义 | 旧用途 | 被谁引用（删除前必须已改完） | 处置 |
| --- | --- | --- | --- | --- | --- |
| 1 | `talent_customers` | L531 | 旧会员档案（含 `customerNo`/`phoneHash`） | 旧 `customer*` API / `[resource]` / org / 旧 C 端 | 删除 |
| 2 | `talent_customer_bindings` | L566 | 旧「账号—会员」绑定与当前视角 | 旧 `talent.ts` / 旧 C 端 bindings | 删除 |
| 3 | `talent_institutions` | L689 | 机构（代理商 / 服务商） | 旧 institution / authorization / plan / org | 删除 |
| 4 | `talent_user_institutions` | L726 | 机构账号关系 | 旧 institution account / org context | 删除 |
| 5 | `talent_customer_leads` | L751 | 引流 / 跟进单 | 旧 org members / leads | 删除 |
| 6 | `talent_customer_authorizations` | L786 | 会员—机构授权 | 旧 authorization / org | 删除 |
| 7 | `talent_cultivation_plans` | L822 | 培养计划 | 旧 plan / org plans / 旧 C 端 plans | 删除 |
| 8 | `talent_member_plan_selections` | L890 | 会员计划选择 | 旧 plan-selections / 旧 C 端 | 删除 |
| 9 | `talent_report_receipts` | L935 | 第三方结果接收记录 | 旧 report/receipts / integrations | 删除（M8 重建新合同） |
| 10 | `talent_report_publications` | L962 | 报告分册发布记录 | 旧 report/publish | 删除（M3 已改用 `openVolumeIds`） |
| 11 | `talent_customer_import_batches` | L989 | 会员 CSV 导入批次 | 旧 customer/import | 删除 |
| 12 | `talent_customer_import_rows` | L1009 | 会员 CSV 导入明细 | 旧 customer/import | 删除 |
| 13 | `talent_categories` | L1033 | 天赋分类 | 旧 element / `[resource]` / 旧 seed | 删除 |
| 14 | `talent_elements` | L1058 | 天赋要素（旧编码） | 旧 element / level / library / matching | 删除（由 M1 `talent_factors` 取代） |
| 15 | `talent_cultivation_contents` | L1133 | 要素 × 分级 × 年龄/性别培育内容 | 旧 library / 旧匹配 / 旧报告生成 | 删除（M5 不复用该口径，ADR 0005-D6） |
| 16 | `talent_content_libraries` | L1182 | 内容库 | 旧 library | 删除 |
| 17 | `talent_report_templates` | L1207 | 报告类型 / 分册模板 | 旧 template / 旧报告生成 | 删除 |
| 18 | `talent_report_template_items` | L1243 | 模板要素 | 旧 template | 删除 |
| 19 | `talent_report_items` | L1403 | 旧报告要素子表 | 旧 report 详情 / 旧 C 端 | 删除（M3 改用 `factorSnapshot`） |

- 上表 19 个集合的**全部旧索引**随集合删除，共 17 条（以索引名为准，行号会随并行改动漂移）：
  `idx_talent_customers_no`、`idx_talent_customers_phone_hash`、`idx_talent_customer_bindings_pair`、`idx_talent_customer_bindings_current`、`idx_talent_customer_import_rows_batch`、`idx_talent_categories_code`、`idx_talent_elements_code`、`idx_talent_levels_element_level`、`idx_talent_institutions_no`、`idx_talent_report_templates_active_type`、`idx_talent_report_template_items_pair`、`idx_talent_user_institutions_pair`、`idx_talent_customer_authorizations_pair`、`idx_talent_member_plan_selection_pair`、`idx_talent_report_receipts_external`、`idx_talent_report_publications_pair`、`idx_talent_content_libraries_name`。
  **保留**：`idx_talent_reports_no`（新旧报告行共用）、`idx_talent_levels_code` / `idx_talent_levels_sort`（M1 新分级）、`talent_reading_progress` / `talent_sync_logs` 的既有索引。
- 删除后 `talent_*` 集合应为：`talent_parents`、`talent_children`、`talent_levels`、`talent_gene_reports`、`talent_reports`、`talent_sync_logs`、`talent_reading_progress`、`talent_factor_libraries`、`talent_factors`、`talent_factor_notes`、`talent_directions`、`talent_tiers`（12 个）+ M5 的 `talent_advice_versions`、`talent_advice_docs`（2 个）+ M4-B 若已落地的 `talent_direction_requests`（1 个）= **14–15 个**。删除前集合数随 M1–M5 落地增长（M5 落地后约 33 个：19 旧 + 14 新；STATUS §5 的 30 是 2026-11-16 快照）；本步删除 19 个、保留 12 个，M5 的 2 个与 M4-B 的 1 个（如已落地）为并行新增，不属于旧口径统计。

### 2.2 旧字段与旧行（集合保留但字段/行必须清）

| 对象 | 旧物 | 位置 | 处置 | 依据 |
| --- | --- | --- | --- | --- |
| `talent_levels` | 旧字段 `elementId` / `levelCode` / `levelName` / `annotation` | `setup.mjs` L1092 起；`sync-talent.mjs`（约 L155）将其改为非必填 | **删字段**；旧唯一索引 `idx_talent_levels_element_level` 同步删除 | M1 ADR 0001-D1、spec §3.2 |
| `talent_levels` | 旧镜像写入约定（`levelCode=code`、`levelName=name`、`elementId=""`、`annotation=""`） | M1 spec §3.2「写入约定」 | 随旧字段删除，新代码只读写 `code/name/sortOrder/range/tone` | 同上 |
| `talent_levels` | 旧行（`elementId != ""` 或 `code=""` 的旧分级） | 存量库 | 删除前先导出 CSV 留档；删除旧行 | M1 ADR 0001-D1「旧行与旧页面/旧 API」 |
| `talent_reports` | `customerId` 关系字段 | `setup.mjs` L1317 起；`sync-talent.mjs`（约 L363）已放宽为可选 | **删字段**；旧行 `customerId` 值随旧行删除 | M3 ADR 0003-D6、spec §3.7 |
| `talent_reports` | 旧行（`subjectType=""`、有 `customerId`、`status` 可能为 `error`） | 存量库 | 删除前导出 CSV 留档；删除旧行 | M3 spec §3.7 / §8.5 |
| `talent_reports` | `reportType` / `title` / `totalItems` 兼容字段 | M3 新行仍写入 | **保留**（新行继续写，不参与新业务判断），M6 不删 | M3 spec §3.2 |
| `talent_sync_logs` | 旧行（`syncScope=""`，第三方结果同步） | 存量库 | **保留**（审计留痕，列表按 `syncScope` 过滤）；M6 不清空 | M3 spec §3.3、§8.5 |
| `talent_reading_progress` | 无旧字段 | — | **保留**；旧访问层随旧 `talent.ts` 删除，M7 重写 | ADR 0006-D5 |

### 2.3 页面与组件（16 个页面 + 11 个组件 + 4 个前端工具，必须删除）

**平台 B 端（11 个页面）**

| 文件 | 旧能力 | 备注 |
| --- | --- | --- |
| `app/pages/admin/talent/[resource].vue` | 旧会员 / 分类 / 要素 / 分级 / 内容库 / 培育内容 / 模板 / 报告 动态页 | 含 `TalentCategoryForm` 等 9 个旧组件 |
| `app/pages/admin/talent/authorization.vue` | 服务商授权 | |
| `app/pages/admin/talent/element.vue` | 分类与要素 | |
| `app/pages/admin/talent/import.vue` | 旧地址重定向到 `/admin/talent/report` | 重定向目标本身被删，必须一起删 |
| `app/pages/admin/talent/institution.vue` | 机构管理 | 与机构端一起退出 |
| `app/pages/admin/talent/level.vue` | 旧分级页（`/admin/talent/level`） | 新页在 `rules/level.vue` |
| `app/pages/admin/talent/library.vue` | 内容库与培育内容 | |
| `app/pages/admin/talent/matching.vue` | 匹配规则 | |
| `app/pages/admin/talent/plan.vue` | 培养计划审核 | |
| `app/pages/admin/talent/receive.vue` | 报告接收 | |
| `app/pages/admin/talent/sync.vue` | 同步配置 | |

**平台 B 端旧组件（11 个 `.vue` + `types.ts`）**：`app/pages/admin/talent/components/` 下 `TalentCategoryForm`、`TalentContentForm`、`TalentContentLibraryForm`、`TalentCustomerForm`、`TalentCustomerImport`、`TalentCustomerRelationForm`、`TalentElementForm`、`TalentInstitutionForm`、`TalentLevelForm`、`TalentReportPdf`、`TalentTemplateForm` 与 `types.ts`。已核对：上述组件只被 §2.3 的旧页面引用，新页（`member/`、`rules/`）使用各自 `components/`，可整目录删除。

**机构端（3 个页面）**：`app/pages/org/talent/members.vue`、`reports.vue`、`plans.vue`。

**前端工具（3 个）**：`app/composables/api/useTalentAdminApi.ts`、`app/composables/api/useTalentBusinessApi.ts`、`app/composables/useTalentOrgType.ts`、`app/utils/talent-admin-presentation.ts`（后者用于旧页与旧测试）。

**C 端（M6 删 2 个，M7 重建 5 个）**

| 文件 | M6 处置 | 说明 |
| --- | --- | --- |
| `apps/client/src/pages/talent/binding.vue` | **删除** | 旧 bindings 入口 |
| `apps/client/src/pages/talent/plans/index.vue` | **删除** | 培养计划选择 |
| `apps/client/src/pages/talent/report/{list,overview,catalog,item}.vue` | M7 重建 | 旧报告阅读实现依赖旧报告集合；M6 不重复删除 M7 已替换的文件（§7.3） |
| `apps/client/src/pages/talent/interpretations/index.vue` | M7 重建 | 同上 |
| `apps/client/src/pages/talent/components/TalentChildSwitcher.vue` | M7 重写 | 旧对象切换依赖旧 bindings |

### 2.4 API 路由（56 条 admin + 16 条 org + 6 条旧 client + 1 条 integration，必须删除）

**平台 admin（56 条）**

| 分组 | 文件 / 通配 | 条数 | 说明 |
| --- | --- | --- | --- |
| 旧动态资源 | `server/api/admin/talent/[resource].{get,post}.ts`、`[resource]/[id].{put,delete}.ts` | 4 | customer / category / element / level / content / library / template / report 白名单（`server/utils/talent-admin.ts`） |
| 旧会员 | `server/api/admin/talent/customer/**` | 11 | 含 `bind`/`unbind`/`import` 与批次明细 |
| 旧报告 | `server/api/admin/talent/report.get.ts`、`report/**` | 11 | 含 `items`、`pdf`、`publish`、`revoke`、`receipts`、`sync` |
| 旧机构 | `server/api/admin/talent/institution/**` | 8 | 含机构账号 |
| 旧授权 | `server/api/admin/talent/authorization.{get,post}.ts`、`authorization/[id].delete.ts` | 3 | 服务商授权 |
| 旧计划 | `server/api/admin/talent/plan/**` | 4 | 含 AI 建议 |
| 旧计划选择 | `plan-selections.get.ts`、`plan-selections/[id]/review.post.ts` | 2 | |
| 旧模板 | `server/api/admin/talent/template.get.ts`、`template.post.ts`、`template/**` | 6 | 报告类型 / 分册配置 |
| 旧同步 | `sync-config.{get,put}.ts`、`sync-logs.get.ts` | 3 | 第三方拉取配置与运行日志 |
| 旧匹配 / 分级 | `matching.{get}.ts`、`matching/preview.post.ts`、`level-copy.post.ts`、`level-status.post.ts` | 4 | M1/M4 已用新页取代 |

**机构端（16 条，全部删除）**：`server/api/org/talent/**`（`context`、`members/**`、`reports/**`、`plans/**`、`authorizations.post`）。

**旧 C 端（6 条，M6 删除）**：`server/api/client/talent/binding.get.ts`（单数，旧）、`bindings/[customerId].put.ts`（旧视角切换）、`plans.get.ts`、`plan-selections.get.ts`、`plan-selections.post.ts`、`plan-selections/[id].delete.ts`。
> **保留**：`bindings.get.ts` 与 `bindings/claim.post.ts`（M2 新契约，按 `talent_parents.userId` 解析，ADR 0002）。二者与旧 `binding`/`bindings/:customerId` 名字接近，实现时按文件头 `@description` 区分，禁止整目录删除。

**旧集成（1 条）**：`server/api/integrations/talent/reports.post.ts`（写旧 receipt / 模板 / 报告条目）。M6 删除；M8 按新合同重建（新幂等键、新 gene_report 入参），不得恢复旧 v1 报文。

### 2.5 菜单（12 条旧 C 行 + 25 条旧 F 行 + 4 条旧分组行）

| 类型 | 菜单 | path | 关联权限码 | 现状 |
| --- | --- | --- | --- | --- |
| C | 服务商授权 | `/admin/talent/authorization` | `talent:service:member` | `status="0"` |
| C | 培养计划审核 | `/admin/talent/plan` | `talent:plan:list` | `status="0"` |
| C | 分类与要素 | `/admin/talent/element` | `talent:content:list` | `status="0"` |
| C | 匹配规则 | `/admin/talent/matching` | `talent:content:list` | `status="0"` |
| C | 内容库与培育内容 | `/admin/talent/library` | `talent:content:list` | `status="0"` |
| C | 报告接收 | `/admin/talent/receive` | `talent:report:receive` | `status="0"` |
| C | 同步配置 | `/admin/talent/sync` | `talent:sync:manage` | `status="0"` |
| C | 旧分类页 | `/admin/talent/category` | — | `status="0"` |
| C | 旧分级页 | `/admin/talent/level` | — | `status="0"` |
| C | 机构端会员列表 | `/org/talent/members` | `talent:customer:list` | `status="1"`（机构账号可见） |
| C | 机构端报告列表 | `/org/talent/reports` | `talent:report:list` | `status="1"` |
| C | 机构端培养计划 | `/org/talent/plans` | `talent:plan:list` | `status="1"` |

- **旧 F 行 25 条**：`FOUNDATION_ACTION_MENU_DEFS`（`setup.mjs` L35–L121）中挂在旧页面或使用旧码的行——`talent:customer:*` 5 条、`talent:content:*` 3 条、`talent:report:revoke/edit` 2 条、`talent:institution:edit` 1 条、`talent:service:member` 2 条、`talent:plan:*` 3 条（`edit/review/submit`）、`talent:report:receive` 1 条、机构端 8 条（`talent:customer:list/add/edit`、`talent:report:list`、`talent:plan:list/add/edit/submit`）。
- **工作台 F 行改码（不删）**：`/admin/talent/dashboard` 的「查看天赋工作台」F 行当前码为 `talent:report:list`，M6 改为 `talent:dashboard:list`，与 C 菜单同码。
- **旧分组行 4 条**：`工作台`、`会员管理`、`培养方向`（均已 `status="0"`，M2.0 扁平化后遗留）、`机构业务`（`status="0"`）。M6 直接删除，不再保留空壳分组。
- **旧 F 行与菜单行删除顺序**：先删 `role_menus` 引用，再删 F 行，再删 C 行，最后删分组行（避免 relation 悬空）。
- **`visible` 与 `status`**：M6 后菜单集合里不得再存在 §2.5 任何 path 的行（含 `status="0"`），AC 按「行不存在」而不是「不可见」判定。

### 2.6 旧权限码（22 个，必须从代码与菜单中归零）

| 分组 | 权限码 |
| --- | --- |
| 旧会员 | `talent:customer:list` / `view` / `add` / `edit` / `delete` / `import` |
| 旧内容 | `talent:content:list` / `add` / `edit` / `delete` |
| 旧报告 | `talent:report:revoke` / `edit` / `receive` |
| 旧机构 | `talent:institution:list` / `edit` |
| 旧计划 | `talent:plan:list` / `add` / `edit` / `submit` / `review` |
| 旧授权 | `talent:service:member` |
| 旧同步 | `talent:sync:manage` |

- 归零判定：`rg "talent:(customer|content|report:(revoke|edit|receive)|institution|plan|service|sync):" server app scripts shared test` **0 命中**（文档与 `docs/` 历史留痕除外，需在 `docs/` 中标注「历史」）。
- 保留的新码：M1 15 个、M2 9 个、M3 4 个、M4 1 个、M5 5 个、M6 新增 1 个（`talent:dashboard:list`），合计 **35 个**（§6.2）。

### 2.7 服务端工具与共享类型（删除 18 个旧 util、拆分 2 个共享文件）

**删除的旧服务端工具（18 个）**

| 文件 | 旧职责 | 删除前置 |
| --- | --- | --- |
| `server/utils/talent.ts` | 旧 bindings / 报告读取 / 阅读进度 | 阅读进度校验函数 `validateTalentReadingProgressItemIds` 迁到新小工具后再删 |
| `server/utils/talent-admin.ts` | 旧资源白名单 | 旧 `[resource]` 路由先删 |
| `server/utils/talent-business.ts` | 机构 / 授权 / 计划 / 报告数据权限 | **工作台 `dashboard.get.ts` 先改用 `requirePermission("talent:dashboard:list")`**，否则删除后工作台 500 |
| `server/utils/talent-csv.ts` | 会员 CSV 解析 | M1 `talent-rule-csv.ts` 只复用约定、不 import，可独立删除 |
| `server/utils/talent-customer-relations.ts` | 旧会员关系校验 | — |
| `server/utils/talent-export.ts` | 机构端 CSV 导出 | — |
| `server/utils/talent-external-sync.ts` | 旧第三方结果同步 | 与旧 integration 一起删 |
| `server/utils/talent-institution-role.ts` | 机构角色种子 | 与机构端一起删 |
| `server/utils/talent-institution.ts` | 机构启停 | 同上 |
| `server/utils/talent-matching.ts` | 旧要素匹配 | **`calculateTalentAge` 被 M3 新代码引用，先迁到 `server/utils/talent-age.ts`（或 M2 工具）再删** |
| `server/utils/talent-plan-recommendation.ts` | 旧计划推荐 | M4 纯函数已取代 |
| `server/utils/talent-report-service.ts` | 旧结果校验 / 报告条目生成 | — |
| `server/utils/talent-report-pdf.ts` | 旧 PDF 上传 / OSS | M8 重建 |
| `server/utils/talent-report-lifecycle.ts` | 旧发布 / 撤回守卫 | M3 状态机已取代 |
| `server/utils/talent-sync-config.ts` | 旧同步配置 | M8 重建 |
| `server/utils/talent-sync-log.ts` | 旧同步日志写入 | `talent_sync_logs` 保留，M3 内联写入；M8 如需 helper 再建 |
| `server/utils/talent-sync-scheduler.ts` | 旧定时拉取 | 与插件 `server/plugins/talent-report-sync.ts` 一起删 |
| `server/utils/talent-ai.ts` | 旧 AI 计划建议 | PRD §3.2 排除 AI 辅助 |

**删除的旧插件**：`server/plugins/talent-report-sync.ts`（删除前先在部署环境停用，避免删除过程中写旧集合）。

**共享类型拆分（不能整文件删）**

| 文件 | 新代码仍依赖 | M6 处置 |
| --- | --- | --- |
| `shared/types/talent.ts` | `TalentStatus`（`useTalentMemberApi` / `useTalentRuleApi` / `member/index.vue` / `talent-member*` / `talent-rule-csv` 共 6 处） | **保留并裁剪**为只含 `TalentStatus`（`"0"` / `"1"`）；删除 `TalentCustomer` 等旧接口 |
| `shared/utils/talent-report.ts` | 仅旧 `talent-report-lifecycle.ts` 引用（M3 已把 `TALENT_REPORT_STATUSES` 等迁入 `shared/types/talent-report.ts`） | **删除** |
| `shared/types/talent-business.ts` | 仅旧页 / 旧 API / 旧 util 引用 | **删除** |
| `shared/types/talent-import.ts` | 仅旧会员 CSV 导入 | **删除** |
| `shared/types/talent-report.ts` | M3 新合同 | **保留** |

### 2.8 种子脚本与旧测试

| 对象 | 处置 | 原因 |
| --- | --- | --- |
| `scripts/seed-talent.mjs`（`pnpm talent:seed`） | **删除脚本与 package script** | 会清空 14 个旧集合造 Mock，属于 PRD BR-14 明确要移除的「重置数据 / 恢复演示数据」；M6 后本地演示统一用 `seed-talent-rule` / `seed-talent-member` / `seed-talent-report` / `seed-talent-advice` |
| `scripts/talent-rule-seed-data.mjs` | 保留 | M1 文库数据 |
| 旧测试 11 个 | 删除或重写 | `test/talent-admin-presentation.test.ts`、`talent-admin.test.ts`、`talent-csv.test.ts`、`talent-customer-relations.test.ts`、`talent-minimal-closure.test.ts`、`talent-recommendation-institution.test.ts`、`talent-report-completeness.test.ts`、`talent-report-lifecycle.test.ts`、`talent-ui-closure.test.ts`、`talent-matching.test.ts`（保留年龄计算用例，改为测新 age helper）、`talent-progress.test.ts`（改为测迁移后的进度校验 helper） |
| 需改断言的测试 5 个 | 更新 | `test/foundation-schema.test.ts`（删 19 个旧集合、加「不得出现旧集合」断言）、`talent-member-domain.test.ts` L535–536（旧集合存在断言反转为不存在）、`talent-report-domain.test.ts` L294–345（旧集合保留 / `customerId` 放宽断言改为已删除）、`talent-report-api.test.ts` L601（旧路由保留断言改为 404）、`talent-report-sync.test.ts`（旧 `customerId` fixtures 清理） |
| `test/talent-oss.test.ts` | 保留 | 只测 `oss-config`，属 M8 前置配置 |

### 2.9 旧 e2e（必须移除必红断言，新增清理回归）

| 套件 | 旧断言 | M6 处置 |
| --- | --- | --- |
| `scripts/e2e/01-admin-crud.mjs` | 分类 / 要素 / 分级 / 内容库 / 培育内容 / 模板 / 会员 CRUD | 删除旧资源用例；M9 重写 |
| `scripts/e2e/02-admin-actions.mjs` | 绑定解绑、阶梯启停复制、模板要素、匹配预览、旧报告发布/撤回/PDF、机构与授权、同步配置 | 删除旧用例；权限边界用例改到 `06` |
| `scripts/e2e/03-ingest.mjs` | 旧 webhook 签名 / 幂等 / 完整性、会员 CSV 导入 | 删除；M8 重建接入用例 |
| `scripts/e2e/04-client.mjs` | 旧 C 端三账号、对象切换、阅读进度、计划选择 | 删除旧天赋用例；M7/M9 重写 |
| `scripts/e2e/05-admin-ui.mjs` | 16 个旧页面渲染、客户管理员菜单、同步配置直连拦截 | 改为新页面 + 三角色菜单；旧页面断言删除 |
| **新增** `scripts/e2e/06-m6-cleanup.mjs` | — | 本规格的清理回归：旧 URL 404、旧 API 404、旧菜单 0、三角色菜单正反用例、系统管理仅 superAdmin、旧集合 0（经迁移脚本报告与 `test/foundation-schema.test.ts` 双证） |

### 2.10 文档引用点（实现时同步，不在本次交付改）

`docs/ARCHITECTURE.md`（集合表、菜单树、机构端描述）、`docs/API.md`（旧路由分组与权限列）、`docs/STATUS.md`（规模数字、账号、已知缺口 §7 的 P1「客户管理员侧边栏出现系统管理 > 机构管理」随机构管理删除而关闭）、`docs/TALENT-LOCAL.md`（Mock 数据与菜单口径）、`docs/CLIENT-PORTAL.md`（C 端旧天赋二级页）、`docs/SCRIPT-GUIDE.md`（`talent:seed` 删除、新增 `migration:m6`）、`AGENTS.md`（「当前能力」中机构业务端、服务商授权、培养计划审核、内容库等表述）、`docs/specs/README.md`（新增 M6 行）。

---

## 3. 保留边界（M6 不得删除、不得改语义）

### 3.1 Foundation 底座（全部保留）

`users`、`roles`、`menus`、`depts`、`posts`、`user_roles`、`role_menus`、`user_posts`、`role_depts`、`configs`、`dict_types`、`dict_data`、`user_sessions`、`login_logs`、`oper_logs`、`error_logs`、`uploads`，以及站点 / 微信配置、主题、健康 / 在线 / 错误监控、操作日志与登录日志。M6 只做**菜单归组**与**角色授权**，不改这些集合的字段与 API。

### 3.2 天赋新域（M2–M5，全部保留）

`talent_parents`、`talent_children`、`talent_levels`（新字段）、`talent_factor_libraries`、`talent_factors`、`talent_factor_notes`、`talent_directions`、`talent_tiers`、`talent_gene_reports`、`talent_reports`（新字段与快照）、`talent_sync_logs`、`talent_reading_progress`、`talent_advice_versions`、`talent_advice_docs`，以及 M4-B 的 `talent_direction_requests`（若已落地）。对应 API 前缀 `/api/admin/talent/{members,children,directions,tiers,factor-libraries,factors,factor-notes,levels,reports,gene-reports,advice}` 与 C 端新契约（§7.2）保留。

### 3.3 系统管理与运行监控（保留，仅 `superAdmin`）

- **系统管理**：用户列表、菜单管理、角色管理、部门管理、岗位管理、字典管理、参数设置、站点配置、微信配置；**操作日志**按 PRD §6.8 归入本组（当前在运行监控，M6 迁移）。
- **运行监控**：系统健康、服务器信息（复用健康页）、在线用户、错误监控、登录日志。
- **机构管理**（`/admin/talent/institution`）**不在保留集**：属机构业务，随 §7.1 删除；这是 STATUS §7 P1 的收口点。
- PRD §6.8 的 4 页（用户 / 菜单 / 角色 / 操作日志）是验收面；其余页面是 Foundation 既有能力，superAdmin 可用，不进入三角色菜单。
- 运行监控与系统管理对三个业务角色**不可见、接口 403**（AC-M6-06）。

### 3.4 明确不恢复

多租户、站点切换、机构 / 代理商 / 服务商、培养计划、内容库与培育内容、报告接收列表、跟进单 / 认领 / 转交、AI 辅助建议、平台参数业务化、支付与订单。**删除后即使旧代码在 Git 历史中可查，也不得用「恢复旧文件」的方式回退**；回退只走 §11。

### 3.5 与 M8 的接口边界

旧 integration / sync-config / PDF 删除后，M6 期间**不提供外部系统接入通道**；这是可接受的，因为 M3 的一键同步走 Mock 源（`TALENT_GENE_REPORT_SOURCE=mock`），真实接入由 M8 按 PRD §9 重建。M6 必须在 `docs/STATUS.md` 与 `docs/API.md` 标注「外部接口 M8 重建中」，避免客户误以为接入能力丢失。

---

## 4. 删除清单与顺序

### 4.0 顺序总览

```text
S0 冻结与前置（M1–M5 合并 / M7 交接 / 打 tag / 通知窗口）
S1 备份与恢复演练（硬门槛）
S2 停写（停插件 / 停 integration / 维护窗口）
S3 停菜单（先 status=0，再删 role_menus 与菜单行）
S4 删路由（admin / org / client 旧 / integration + composable）
S5 删页面（B 端 11 + 组件 11 + 机构端 3 + C 端 2 + 前端工具）
S6 删集合（迁移脚本：字段 → 旧行 → 集合；19 个）
S7 清权限码 / 菜单种子 / 角色种子 / 旧测试 / 旧自定义 e2e
S8 文档、门禁与证据回填
```

**为什么是这个顺序**：菜单先停 → 用户不再进入旧页；路由再删 → 旧页即使被收藏也 404 而不是 403/500 泄露；页面再删 → 前端构建不含旧代码；集合最后删 → 前面任一步失败都能在数据仍完整的情况下回退代码。**任何一步都不允许先删集合**（ADR 0006-D1）。

### 4.1 S1 备份与恢复演练（硬门槛，必须先于一切删除）

1. **明确目标环境**：迁移与备份都必须在**目标 PocketBase 所在环境**执行。命令必须显式带 `--pb-url` 与 `--data-dir`（或环境变量 `POCKETBASE_URL` / `POCKETBASE_DATA_DIR` 同时存在并由脚本打印确认）；只给其中一个时脚本必须拒绝。远端生产库不能在本机 `pnpm backup:pb` 后就当作已备份（`backup-pb.mjs` 只备份当前 `POCKETBASE_URL`）。
2. **一致性备份**：`pnpm backup:pb --dir=backups-m6`（内部走 PB `backups.create` + 下载 zip），记录：backup key、文件路径、大小、SHA-256、创建时间。
3. **schema 与行数快照**：迁移脚本 dry-run 必须导出并落盘 `backups-m6/m6-schema-before-<timestamp>.json`（所有集合定义 + 索引）与 `m6-rows-before.json`（§2.1 每个集合的行数、§2.3 旧行数、菜单/角色/role_menus 行数）。这是回滚比对与验收证据。
4. **恢复演练**：把备份 zip 还原到**隔离数据目录**（`POCKETBASE_DATA_DIR=/tmp/m6-restore-drill`，独立端口），验证集合数量、9 个关键集合行数、管理员可登录、报告列表可打开。演练失败 → 禁止进入 S2。
5. **可查数据兜底**：若客户要求删除后仍能查旧会员 / 旧报告 / 机构数据，S1 额外导出 CSV（旧会员、旧报告、机构、授权、计划、导入批次），存放位置与保留期由 lead 与客户确认；**不写入新集合**。
6. **门槛**：S2 开始前，verifier 必须已看到「备份 key + 大小 + sha256 + 恢复演练通过 + dry-run 报告」四项证据（[acceptance.md](acceptance.md) E-M6-01）。

### 4.2 S2 停写

- 停止 `server/plugins/talent-report-sync.ts` 对应的定时任务（删除插件前先在部署环境关闭），避免删除过程中仍写 `talent_report_receipts` / `talent_report_templates` / `talent_reports` 旧行。
- 确认无进行中的导入 / 发布 / 同步任务（`talent_sync_logs` 最近 10 分钟无新行；`oper_logs` 无进行中任务）。
- 维护窗口内**禁止**任何后台写入；B 端与 C 端可短暂只读或停服。旧 C 端页面在 S5 后自然 404。
- 若无法停写：必须改为「先只读、备份、再删除」，并把 RPO 风险写进变更单，由 lead 批准。

### 4.3 S3 停菜单

1. 先确认 §2.5 的 12 条 C 行（含机构端 3 条 `status="1"`）全部 `status="0"`；机构端 3 条必须在 S3 置 0，否则机构账号仍可见。
2. 删除这些菜单的 `role_menus` 引用（含 `superadmin` 的授权；superAdmin 通过通配 `hasPermission` 放行接口，不依赖旧菜单行）。
3. 删 F 行（24 条）→ 删 C 行（12 条）→ 删旧分组行（4 条）。
4. 同步更新 `scripts/setup.mjs` 的 `FOUNDATION_ACTION_MENU_DEFS` / `FOUNDATION_RBAC_PERMISSION_CODES` / `seedMenus` 与 `scripts/sync-talent.mjs` 的 `LEGACY_HIDDEN_MENU_PATHS` / `MENU_ALIGNMENT_PAGES` / `BUSINESS_MENU_PATHS` 断言（S7 收口，但 S3 起不能再生效旧行）。
5. 验证：`alignedMenus` 中不再存在 §2.5 任何 path；客户管理员与三角色侧栏无旧入口。

### 4.4 S4 删路由

1. 先改引用：`server/api/admin/talent/dashboard.get.ts` 改用 `requirePermission(event, "talent:dashboard:list")`，删除 `requireTalentPermission` / `isPlatformAdmin` 依赖。
2. 删除 §2.4 的 56 + 16 + 6 + 1 条路由文件；删除旧 composable（`useTalentAdminApi` / `useTalentBusinessApi` / `useTalentOrgType`）与 `app/utils/talent-admin-presentation.ts`。
3. 删除旧服务端工具（§2.7）与旧插件；删除前完成两处迁移：`calculateTalentAge` → 新 age helper、`validateTalentReadingProgressItemIds` → 新进度 helper。
4. 旧 C 端报告读取路由（9 条 `server/api/client/talent/reports/**`）由 M7 替换；M6 只在 M7 合并后确认删除（§7.3）。
5. 验证：生产构建后访问旧路径返回 **404**（不是 500、不是 403、不是空页面）；`server/api/admin/talent/` 下不再有旧前缀文件。

### 4.5 S5 删页面

1. 删除 §2.3 平台 B 端 11 页 + 11 组件 + `types.ts`；机构端 3 页；C 端 `binding.vue` / `plans/index.vue`。
2. 更新 `app/composables/useMenuTree.ts`：`TALENT_PATHS` 删除旧 path（`/admin/talent/customer`、`category`、`element`、`level`、`matching`、`content`、`library`、`institution`、`authorization`、`plan`、`receive`、`report`、`sync`），`TALENT_ORG_PATHS` 整段删除；保留 `/admin/talent/rules`、`/admin/talent/reports`、`/admin/talent/member`、`/admin/talent/advice`、`/admin/talent/dashboard`。
3. 更新 `apps/client/src/pages.json`（重建时由 uni-pages 生成，M6 删除旧路由后需重新生成或由 M7 一并处理）。
4. 验证：`pnpm build` 通过；`rg "admin/talent/(customer|category|element|level|library|matching|plan|receive|sync|authorization|institution)" app` 0 命中；侧栏与登录后菜单无旧项。

### 4.6 S6 删集合

1. 只允许由 `scripts/migrate-m6-cleanup.mjs`（S6 新增，§5）执行；禁止手写 sqlite 删除、禁止 `rm -rf pb_data`。
2. 顺序：**先删字段/旧行，再删集合**。
   - 字段：`talent_levels.elementId/levelCode/levelName/annotation` 与 `idx_talent_levels_element_level`；`talent_reports.customerId` 与旧行。
   - 旧行：`talent_levels` 旧行、`talent_reports` 旧行（`subjectType=""`）；先导出 CSV（S1）再删。
   - 集合：按「被引用者后删」的顺序删除 19 个集合：`talent_report_template_items` → `talent_report_templates` → `talent_report_publications` → `talent_report_receipts` → `talent_report_items` → `talent_cultivation_contents` → `talent_content_libraries` → `talent_elements` → `talent_categories` → `talent_member_plan_selections` → `talent_cultivation_plans` → `talent_customer_authorizations` → `talent_customer_leads` → `talent_user_institutions` → `talent_institutions` → `talent_customer_import_rows` → `talent_customer_import_batches` → `talent_customer_bindings` → `talent_customers`。
   - 删除前若仍有 relation 指向待删集合，先删该 relation 字段或先删引用集合；PB 不会自动级联删除集合。
3. 同步 `scripts/setup.mjs`：从 `COLLECTION_DEFS` 删除 19 个定义与对应建索引语句（旧集合索引段，`idx_talent_customers_no` 起至 `idx_talent_content_libraries_name`），保证**新库**不再创建旧集合；`assertFreshFoundationDatabase` 保持「发现不受支持集合即失败」。
4. 同步 `scripts/sync-talent.mjs`：删除旧集合只读保留逻辑与旧 `talent_levels` 兼容块；新增断言「旧集合不存在」。
5. 验证：PB collections API 返回的 `talent_*` 只含 §3.2 白名单；`pnpm test` 中 `foundation-schema.test.ts` 通过；新空目录 `pnpm env:setup` 不创建旧集合。

### 4.7 S7 清权限码 / 种子 / 测试 / e2e

1. `scripts/setup.mjs`：删除 22 个旧码与 25 条旧 F 行；`FOUNDATION_RBAC_PERMISSION_CODES` 只保留 35 个新码 + Foundation 码。
2. `scripts/sync-talent.mjs`：删除旧码「保留到 M6」断言，改为「旧码 0 命中」断言；删除机构角色收敛块（`talent_agent` / `talent_service_provider`），改为删除这两个角色及其 `role_menus` / `user_roles`。
3. `scripts/seed-accounts.mjs`：重写为三角色种子（§6.7）；客户管理员旧角色并入平台运营管理员。
4. 删除 `scripts/seed-talent.mjs` 与 `package.json` 的 `talent:seed`；在 `package.json` 注册 `migration:m6`（指向 §5 脚本）。
5. 删除 / 重写 §2.8 的 11 个旧测试；更新 5 个断言测试；新增 `test/m6-cleanup-plan.test.ts`（纯函数：旧集合清单、旧码清单、角色矩阵断言，不连真实 PB）。
6. e2e：删除 §2.9 旧断言，新增 `06-m6-cleanup.mjs`。
7. 验证：`rg` 旧码 0 命中；`pnpm test`、`pnpm typecheck`、`pnpm lint` 通过。

### 4.8 S8 文档、门禁与证据

- 按 §13 同步文档；按 [acceptance.md](acceptance.md) 回填证据；`git diff --check`；由 lead 复核 §12 未决项。

---

## 5. 迁移脚本合同（`scripts/migrate-m6-cleanup.mjs`，S6 实现）

> 本节只定义合同，不写代码。脚本归属 M6 实现任务；本文是验收依据。

### 5.1 CLI 与目标显式化

```text
pnpm migration:m6 -- --pb-url=http://127.0.0.1:8090 --data-dir=/path/to/pb_data \
  --backup=backups-m6/<key>.zip --confirm-m6 [--dry-run] [--allow-production] \
  [--export-csv=backups-m6/legacy] [--schema-out=backups-m6]
```

| 参数 | 必填 | 行为 |
| --- | --- | --- |
| `--pb-url` | 是 | 必须与运行时 `POCKETBASE_URL` 一致；打印并写入操作日志 |
| `--data-dir` | 是 | 必须存在且可写；与 `POCKETBASE_DATA_DIR` 一致；打印绝对路径 |
| `--backup` | 是 | 必须存在、非空、SHA-256 与 `m6-backup-manifest.json` 一致；备份时间必须晚于脚本启动前 24h（可配置 `--max-backup-age-hours`） |
| `--confirm-m6` | 是 | 文本确认；缺失即拒绝（防止误执行） |
| `--dry-run` | 否 | 只读：输出将删集合/行数/菜单数/权限码数，写 schema/rows JSON，不写任何集合 |
| `--allow-production` | 否 | `NODE_ENV=production` 时必须显式提供，否则拒绝 |
| `--export-csv` | 否 | 删除前导出旧会员 / 旧报告 / 机构 / 授权 / 计划 / 导入批次 |
| `--schema-out` | 否 | schema 与行数快照目录，默认 `backups-m6/` |

### 5.2 前置校验（任一失败即退出，退出码非 0）

1. `POCKETBASE_URL` 与 `--pb-url` 一致；`POCKETBASE_DATA_DIR` 与 `--data-dir` 一致；拒绝只有其一或二者都缺。
2. `--backup` 存在、非空、sha256 匹配、生成时间在阈值内。
3. 旧集合存在性符合预期：19 个集合**全部存在**（不存在说明目标库不对或已执行过，需人工确认）；若发现已部分删除 → 拒绝并提示「先恢复备份」。
4. 无写入方：最近 10 分钟 `talent_sync_logs` 无新行；同步插件未运行；维护窗口标记已设置。
5. 磁盘余量 ≥ 备份大小 × 2。
6. 集合 schema 与 `setup.mjs` 的旧定义一致（至少名称/字段数/索引名一致），防止对错库执行。

### 5.3 执行语义

1. 写 `m6-schema-before.json`、`m6-rows-before.json`、`m6-backup-manifest.json`。
2. 删旧字段 / 索引 / 旧行（§4.6），每步写计数。
3. 删集合（§4.6 顺序），每步写计数。
4. 删旧菜单 F 行 / C 行 / 分组行与 `role_menus`。
5. 写 `oper_logs`（M6 清理：目标 URL、备份 key、删除计数、操作人）与 `m6-cleanup-report.json`。
6. 幂等：第二次执行 dry-run 应报告「0 待删」；正式执行应安全退出（不报错、不重复删除）。
7. **禁止**：`setup.mjs` 清库、`--force`、直接 SQLite 写入、删除 `users` / `oper_logs` / `login_logs` / `uploads`。
8. 失败处理：任一步失败即中止，**不自动重试**；输出已完成步骤与剩余步骤，要求恢复备份后重来（§11）。

### 5.4 与 `setup.mjs` 的红线

- `setup.mjs` 只允许「创建」与「初始化」；M6 从 `COLLECTION_DEFS` 移除旧集合是**删除定义**，不是删除数据，允许。
- `setup.mjs` 不得新增删除集合、清空集合、`--reset`、`--force`、清库分支；`assertFreshDataDirectory` 与 `assertFreshFoundationDatabase` 保持并加强（发现旧集合失败）。
- `pnpm env:setup` 对已有库继续失败，这是预期行为；生产升级只走 `pnpm talent:sync`（加）与 `pnpm migration:m6`（删）。

---

## 6. 三角色矩阵

### 6.1 角色定义

| 角色 | `roleKey` | 职责（PRD §2） | 约定 |
| --- | --- | --- | --- |
| 超级管理员 | `superadmin` | 系统所有者（运维），全部菜单与接口 | 保留；唯一可见系统管理 / 运行监控；账号 `superAdmin`，不对外 |
| 平台运营管理员 | `customer-admin`（沿用，显示名改为「平台运营管理员」） | 会员、报告、建议全量操作 | 复用旧角色行与其 `role_menus`，避免存量授权丢失；不新建 `platform-operator` 重复角色 |
| 报告审核员 | `report-reviewer`（新增） | 报告发布 / 撤回 / 恢复、建议发布 / 撤回、会员只读 | 默认授予 `talent:report:publish`、`talent:advice:publish`；**不授予** `talent:report:sync`、`talent:advice:sync`、任何会员写权限 |
| 规则配置员 | `rule-configurator`（新增） | 潜质要素、分级与注解、培养方向与档位 | 授予 M1 全码 + `talent:direction:merge`；**不授予**任何会员 / 报告 / 建议码 |
| 家长（C 端） | —（中性 `users` + `talent_parents.userId`） | 本人及已绑定子女 | C 端不套 RBAC 码，走登录 + 归属 + 报告状态校验（M2/M3/M5 冻结守卫） |
| 外部系统（非人） | — | 推送基因报告 / 建议 | 不走菜单 RBAC；由 M8 的签名 / 令牌 + 幂等键鉴权，M6 不建角色、不建菜单 |

> **客户管理员旧角色处置**：`customer-admin` 就是「平台运营管理员」的实现，`roleKey` 不变、`roleName` 改为「平台运营管理员」、`remark` 注明合并来源；`admin` 账号继续绑定该角色（交付账号不变），`CUSTOMER_ADMIN_PASSWORD` 环境变量保留兼容，可新增 `PLATFORM_OPERATOR_PASSWORD` 别名（同值）。若客户坚持 `roleKey` 也叫 `platform-operator`，作为 M9 迁移项，M6 不双角色并存（ADR 0006-D3）。

### 6.2 权限码总表（35 个，M6 后唯一在册集合）

| 域 | 权限码 | 类型 | 归属 |
| --- | --- | --- | --- |
| 工作台 | `talent:dashboard:list` | C | **M6 新增**（工作台专用，替代复用 `talent:report:list`） |
| 会员 M2 | `talent:parent:list` / `view` / `add` / `edit` / `status` / `idno` | C + F | M2 |
| 会员 M2 | `talent:child:edit` / `unbind` / `query` | F | M2 |
| 规则 M1 | `talent:direction:list` / `add` / `edit` / `delete`、`talent:tier:list` / `edit` | C + F | M1 |
| 规则 M1 | `talent:factor:list` / `sync` / `export` | C + F | M1 |
| 规则 M1 | `talent:rule:list` / `add` / `edit` / `delete` / `import` / `export` | C + F | M1 |
| 匹配 M4 | `talent:direction:merge` | F | M4 |
| 报告 M3 | `talent:report:list` / `view` / `sync` / `publish` | C + F | M3 |
| 建议 M5 | `talent:advice:list` / `view` / `publish` / `sync` / `export` | C + F | M5 |

- **工作台新码是硬要求**：当前 `工作台` C 菜单与 `基因报告` C 菜单共用 `talent:report:list`，而 `hasPermission` 按权限码判定，导致「给规则配置员看工作台」会同时授予 `GET /api/admin/talent/reports` 的接口权限。M6 必须拆分，否则规则配置员可越权读报告列表（AC-M6-05 反例）。
- 每个 `requirePermission` 码必须有 ≥1 条 C/F 菜单行（CONVENTIONS §3）；`talent:report:publish` 允许 3 条 F 行（发布 / 撤回恢复补发 / 重算），`talent:advice:publish` 允许 ≥1 条，断言按「码存在」而非唯一。

### 6.3 菜单矩阵

| 菜单 | 平台运营管理员 | 报告审核员 | 规则配置员 | superAdmin |
| --- | --- | --- | --- | --- |
| 工作台 `/admin/talent/dashboard` | ✅ | ✅ | ✅ | ✅ |
| 会员管理 `/admin/talent/member` | ✅ 全功能 | ✅ 只读（`parent:list` + `parent:view`） | ❌ | ✅ |
| 潜质要素 `/admin/talent/rules/factor` | ✅ | ❌ | ✅ | ✅ |
| 分级与固定注解 `/admin/talent/rules/level` | ✅ | ❌ | ✅ | ✅ |
| 培养方向管理 `/admin/talent/rules/direction` | ✅ | ❌ | ✅ | ✅ |
| 基因报告 `/admin/talent/reports` | ✅ | ✅ | ❌ | ✅ |
| 培育建议 `/admin/talent/advice` | ✅ | ✅ | ❌ | ✅ |
| 系统管理（用户 / 菜单 / 角色 / 部门 / 岗位 / 字典 / 参数 / 站点 / 微信 / 操作日志） | ❌ | ❌ | ❌ | ✅ |
| 运行监控（系统健康 / 服务器信息 / 在线用户 / 错误监控 / 登录日志） | ❌ | ❌ | ❌ | ✅ |

- **菜单行精确断言**：平台运营管理员 = 7 条业务 C 菜单 + 其下全部业务 F 行；报告审核员 = 4 条 C（工作台、会员管理、基因报告、培育建议）+ 只读/发布 F 行；规则配置员 = 4 条 C（工作台 + 天赋规则 3 页）+ M1 全部 F 行 + `direction:merge`。
- 「工作台」C 菜单的 `permissionCode` 改为 `talent:dashboard:list`；`基因报告` C 菜单保持 `talent:report:list`。
- **菜单结构沿用 2026-11-16 用户口径**（工作台 / 会员管理为一级 C 菜单；培养方向管理并入「天赋规则」），不回到 PRD §3.1 字面的「培养方向」独立分组。业务可见菜单为 **7 条**（PRD 口径 11 条中的业务子集），差异见 §12 Q1。
- 系统管理 / 运行监控对三个业务角色**不授任何菜单**（含分组祖先）；`seed-accounts.mjs` 与 `sync-talent.mjs` 都要有防御断言。

### 6.4 接口（`requirePermission`）矩阵

| 接口域（代表路由） | 权限码 | 平台运营 | 报告审核 | 规则配置 |
| --- | --- | --- | --- | --- |
| `GET /api/admin/talent/dashboard` | `talent:dashboard:list` | ✅ | ✅ | ✅ |
| `GET /members`、`GET /members/:id`、`GET /children/:id` | `talent:parent:list` / `view` | ✅ | ✅ | ❌ |
| `POST/PUT /members*`、`PUT /children/:id`、`/children/:id/query`、`/unbind` | `talent:parent:*` / `child:*` | ✅ | ❌ 403 | ❌ 403 |
| `GET /members/:id/id-no`、`/children/:id/id-no` | `talent:parent:idno` | ✅ | ❌ 403 | ❌ 403 |
| `GET /directions`、`/tiers`、`/factors`、`/factor-libraries`、`/levels`、`/factor-notes` | M1 读码 | ✅ | ❌ 403 | ✅ |
| `POST/PUT/DELETE` 方向 / 档位 / 因子同步 / 分级 / 注解 / 导入 / 导出 | M1 写码 | ✅ | ❌ 403 | ✅ |
| 待归并方向列表 / 归并 / 转正式 | `talent:direction:list` / `merge` | ✅ | ❌ 403 | ✅ |
| `GET /reports`、`/reports/:id`、`/volumes/:id`、`/gene-reports/:id` | `talent:report:list` / `view` | ✅ | ✅ | ❌ 403 |
| `POST /reports/:id/{publish,withdraw,restore,publish-new,regenerate-snapshot}` | `talent:report:publish` | ✅ | ✅ | ❌ 403 |
| `POST /reports/sync`、`GET /reports/sync-logs` | `talent:report:sync` | ✅ | ❌ 403 | ❌ 403 |
| `GET /advice*`、`POST /advice/:id/{publish,withdraw}`、`GET /advice/export` | `talent:advice:list` / `view` / `publish` / `export` | ✅ | ✅ | ❌ 403 |
| `POST /advice/versions`（接收新一版） | `talent:advice:sync` | ✅ | ❌ 403 | ❌ 403 |
| `/api/admin/system/**`、`/api/admin/monitor/**`、`/api/admin/log/**` | `system:*` / `monitor:*` | ❌ 403 | ❌ 403 | ❌ 403 |

- 上表「❌」均为**接口 403**，不依赖前端隐藏；前端 `hasPermission` 只做按钮/菜单体验。
- 报告审核员默认**有**发布 / 撤回 / 恢复 / 建议发布 / 建议撤回（PRD §2 L51 职责），M3/M5 的「如客户要求只读，M6 收回」默认不收回；如收回，只改 `role_menus`，不改代码（见 §12 Q3）。
- 报告审核员默认**无** `report:sync` / `advice:sync` / `advice:export` 以外的写码；导出（`advice:export`）按 M5 §2.1 授予。
- 规则配置员默认**无**工作台指标以外的报告 / 会员数据；工作台指标卡是聚合数，不含明细（PRD §6.1 待定项）。

### 6.5 系统管理与运行监控（仅 superAdmin）

- 菜单：只有 `superadmin` 角色关联系统管理 / 运行监控的全部菜单行；平台运营 / 审核 / 规则三角色不关联任何系统 / 监控菜单（含分组 M 行）。
- 接口：`system:*`、`monitor:*`、`system:operlog:list`、`system:loginlog:list` 等仅 `superAdmin` 可调；三角色直调 403。
- 操作日志归组：M6 把「操作日志」C 菜单从「运行监控」移到「系统管理」，`orderNum` 排在角色管理之后；运行监控保留 5 页。M6 同步更新 `MENU_ALIGNMENT_PAGES` / `MENU_ALIGNMENT_CHILDREN` 与 e2e 断言。
- **与 PRD §2 的冲突**：PRD §2 写平台运营管理员「系统管理全量操作 / 全部菜单」，与 2026-11-16「系统管理与运行监控仅 superAdmin」及本任务约束冲突。M6 按后者执行，冲突记入 §12 Q2，由 lead 与客户书面确认。

### 6.6 客户管理员旧角色处置

| 项 | 处置 |
| --- | --- |
| 角色行 `customer-admin` | 保留 `roleKey`，`roleName` → 「平台运营管理员」，`remark` 注明「M6 由客户管理员升级」；不新建重复角色 |
| 账号 `admin` | 保留用户名与角色绑定；显示名「平台运营管理员」；生产口令由 `CUSTOMER_ADMIN_PASSWORD` 覆盖，不在文档写默认值 |
| `role_menus` | 保留既有业务菜单关联；按 §6.3 重新收敛（新增 M6 新码对应的 F 行、移除旧码行） |
| 旧角色 `talent_agent` / `talent_service_provider` | **删除**角色行、`role_menus`、`user_roles`；机构账号 `users` 行保留并置 `status="0"`（中性账户留痕，不删账号） |
| 内置 `admin` 角色（`roleKey=admin`） | 保留为内置系统管理员（通配）；**不得**分配给任何交付账号，避免绕过三角色矩阵 |

### 6.7 角色种子与菜单授权实现要求

1. `scripts/seed-accounts.mjs` 重写：种子 `superadmin`（全菜单）、`customer-admin`（平台运营，7 业务菜单 + 全业务 F）、`report-reviewer`、`rule-configurator` 四类角色；角色与菜单授权必须**幂等**（`role_menus` upsert + 越权清理）。
2. `scripts/sync-talent.mjs` 角色收敛：把当前「customer-admin 白名单」逻辑替换为三角色矩阵表；断言：
   - 每个角色 C 菜单集合**精确等于** §6.3；
   - 三角色均不含系统 / 监控菜单（含分组）；
   - superAdmin 关联全部菜单行；
   - 35 个新码每个都有 ≥1 条生效 C/F 菜单行；
   - 22 个旧码 0 行、12 条旧菜单 path 0 行。
3. `server/utils/console-access.ts` 不改逻辑：三角色是自定义角色，只要有启用 C 菜单即可进后台；停用菜单即时移出侧栏（PRD §2 L58）。
4. `server/utils/permission.ts` 不改：`admin` / `superadmin` 通配仅对内置角色生效；三角色靠菜单码。**不得**把三个新角色 `roleKey` 设为 `admin` 或 `superadmin`。
5. 审计：角色新增 / 授权变更走 `withOperLog`（`system:role:*`），迁移脚本删除角色也写 `oper_logs`。

### 6.8 数据权限

- 三角色都是**平台级**，不按机构 / 部门隔离；M6 删除机构后更无数据范围分支。会员 / 报告 / 建议列表返回全量，由权限码控制可写动作。
- C 端数据权限不变：`talent_parents.userId` 解析家长、`talent_children` 归属、报告 `published` + 家长/子女启用（M2/M3/M5 冻结守卫）；M6 不动这些 helper。
- 身份证全号：仅 `talent:parent:idno`，默认不授予报告审核员；全号查看写 `oper_logs`（M2）。
- 日志不含明文身份证 / 手机号；迁移脚本日志同样脱敏。

---

## 7. 旧 C 端 bindings 与机构端退出

### 7.1 机构端退出清单

| 对象 | 内容 | 处置 |
| --- | --- | --- |
| 菜单 | 机构端 3 页（§2.5）+ 其 F 行 7 条 + 「机构业务」旧分组 | 删除 |
| 页面 | `app/pages/org/talent/{members,reports,plans}.vue` | 删除 |
| API | `server/api/org/talent/**` 16 条 | 删除 |
| 集合 | `talent_institutions`、`talent_user_institutions`、`talent_customer_leads`、`talent_customer_authorizations`、`talent_cultivation_plans`、`talent_member_plan_selections` | 删除 |
| 服务端 | `talent-institution.ts`、`talent-institution-role.ts`、`talent-business.ts`、`talent-export.ts`、`talent-plan-recommendation.ts`、`talent-ai.ts` | 删除 |
| 角色 | `talent_agent`、`talent_service_provider` | 删除角色与授权 |
| 账号 | 机构账号（`talent-agent-*`、`talent-service-*`） | `users` 行保留并 `status="0"`；删除 `user_roles` / `role_menus` 关联；不删账号（审计留痕） |
| 前端 | `useTalentOrgType.ts`、`useTalentBusinessApi.ts`、`TALENT_ORG_PATHS` | 删除 |
| 配置 | `configs(talent_sync_config)` 旧同步配置 | 由迁移脚本删除该配置记录（M8 重建） |
| 文档 | AGENTS「机构业务端」、ARCHITECTURE 机构段、STATUS §7 P1、API 机构分组 | 更新 |

- **不迁移机构数据**：备份即归档；客户如需留存，S1 导出 CSV。
- **不恢复多租户**：删除后不得以 `institutionTypes`、数据范围、`org` 路由任何形式回流。

### 7.2 旧 C 端 bindings 退出清单

| 对象 | 处置 | 替代 |
| --- | --- | --- |
| `server/api/client/talent/binding.get.ts`（单数） | 删除 | `GET /api/client/talent/bindings`（M2 新契约） |
| `server/api/client/talent/bindings/[customerId].put.ts` | 删除 | 对象切换改由 M7 以 `talent_children` / `talent_parents` 为视角，不再有「当前 binding 记录」 |
| `server/api/client/talent/plans.get.ts`、`plan-selections.*`（4 条） | 删除 | 培养计划整体退出（PRD §3.2）；C 端方向选择由 M4/M7 的 `directions/selections` 承接 |
| `apps/client/src/pages/talent/binding.vue`、`plans/index.vue` | 删除 | M7 重建「孩子管理 / 培养方向」 |
| `talent_customer_bindings` 集合 | 删除 | 唯一真源 `talent_parents.userId`（ADR 0002-D1 / D3） |
| `talent_reading_progress` 集合 | **保留** | M7 重写读写接口；归属校验 helper 迁移后删除旧 `talent.ts` |
| 旧 C 端报告读取 9 条路由 | M7 替换 | §7.3 |

### 7.3 与 M7 的交接门槛（避免 C 端空窗）

- M6 的 S5 只删 **bindings / plans** 两个旧入口；旧报告阅读页（`report/*`、`interpretations`、`TalentChildSwitcher`）的删除 / 替换由 M7 负责。
- **M6 出口前提**：M7 已完成「报告页 / 分册 / 要素解读 / 切换对象」新页面并能覆盖旧路径；否则 M6 只能以「C 端报告页暂不可用」的书面豁免放行，豁免须 lead 签字并列入风险 R3。
- M6 验收时若 M7 尚未合并：AC-M6-01「旧入口 0」的 C 端部分标记为「未验证（依赖 M7）」，不得伪造通过。
- M7 重建时必须继续消费 M2/M3/M5 的冻结守卫，不得恢复 `customerId`、旧 binding 或在 C 端按机构 / 租户切换。

---

## 8. 验收标准（AC-M6-01..12）

> 完整追溯与证据空表见 [acceptance.md](acceptance.md)。状态只允许 `通过` / `未通过` / `未验证` / `不在范围` / `待裁决`；未取证前不得写「通过」。

| 编号 | 验收项 | 通过判据 | PRD / 依据 |
| --- | --- | --- | --- |
| **AC-M6-01** | 旧入口 0 | 侧栏（superAdmin + 三角色）无 §2.5 任何菜单；`rg` 旧 path / 旧页面 / 旧 composable 0 命中；`06-m6-cleanup` 断言通过 | §3.2 L89、开发计划 M6 出口 L243 |
| **AC-M6-02** | 旧集合 0 | PB `talent_*` 仅 §3.2 白名单；19 个旧集合不存在；新空目录 `env:setup` 不创建旧集合；`foundation-schema.test.ts` 通过 | §3.2、AGENTS 数据边界 |
| **AC-M6-03** | 旧路由 404 | §2.4 全部旧路径（admin 56 / org 16 / client 6 / integration 1）直调返回 404；无 500 / 无 403 泄露；旧 C 端报告路由按 §7.3 状态 | §3.2、§10 |
| **AC-M6-04** | 三角色菜单正反用例 | 每个角色登录后 bootstrap 菜单集合精确等于 §6.3；直接访问越权 path 被拒（无菜单 / 403）；停用菜单即时隐藏 | §2 L58、§12 L608 |
| **AC-M6-05** | 三角色接口正反用例 | 表 §6.4 的 ✅ 码返回 2xx；❌ 码返回 403；规则配置员调 `GET /reports` 403（工作台新码拆分生效）；报告审核员调会员写 / `report:sync` / `advice:sync` 403 | §2 L56–60、§10 L587 |
| **AC-M6-06** | 系统管理 / 运行监控仅 superAdmin | 三角色无相关菜单；直调 `/api/admin/system/**`、`/api/admin/monitor/**`、`/api/admin/log/**` 403；superAdmin 正常 | §6.8、§2 |
| **AC-M6-07** | 备份与迁移证据 | 备份 key / 大小 / sha256 / 恢复演练通过 / dry-run 报告 / 删除计数 / schema 快照齐全；迁移脚本二次执行幂等 | ADR 0006-D2、§4.1、§5 |
| **AC-M6-08** | 旧权限码 0 | 22 个旧码在 `server/app/scripts/shared/test` 0 命中；菜单表 0 行；`talent:*` 在册码 = §6.2 的 35 个 | §2.6 |
| **AC-M6-09** | 日志与审计 | 清理动作写 `oper_logs`（目标、备份、计数、操作人）；角色新增 / 授权变更写日志；日志无明文 PII | §10 L585、§6.7 |
| **AC-M6-10** | 门禁 | `pnpm typecheck` / `lint` / `test` / `build` / `client:typecheck` / `client:build:h5` / `client:build:mp` 通过；`06` 套件通过；旧断言已移除 | docs/QUALITY.md |
| **AC-M6-11** | 文档同步 | §13 文档全部更新，链接有效；`docs/specs/README.md` 增 M6 行；`git diff --check` 通过 | 工程规则 |
| **AC-M6-12** | 客户验收面 | 登录后仅见 PRD 业务菜单；系统管理 4 页（用户 / 菜单 / 角色 / 操作日志）可打开；无机构 / 计划 / 内容库 / 报告接收 / 同步配置 / AI 入口 | §6.8、§12 L616 |

---

## 9. 测试与门禁命令

### 9.1 必跑（M6 出口）

```bash
# 静态与单测
pnpm typecheck
pnpm lint
pnpm test
pnpm client:typecheck

# 构建
pnpm build
pnpm client:build:h5
pnpm client:build:mp

# 新库烟测（必须新空目录，禁止指向真实 pb_data）
tmp=$(mktemp -d) && POCKETBASE_DATA_DIR="$tmp" pnpm env:setup
# 存量库：加 schema / 菜单 / 权限（只加不删）
pnpm talent:sync          # 连续两次，断言幂等
# 删除（先 dry-run，后正式；显式目标）
pnpm migration:m6 -- --dry-run --pb-url=... --data-dir=... --backup=...
pnpm migration:m6 -- --confirm-m6 --pb-url=... --data-dir=... --backup=...

# 清理回归（M6 新增）
pnpm e2e --only 06

# 文档与仓库卫生
git diff --check
```

### 9.2 定向断言（建议写进 06 套件 / 单测）

- 旧 URL 列表：`/admin/talent/{customer,category,element,level,library,matching,plan,receive,sync,authorization,institution}`、`/org/talent/{members,reports,plans}` 直开 → 404 / 无页面。
- 旧 API 列表：`GET /api/admin/talent/customer`、`GET /api/admin/talent/report`、`GET /api/admin/talent/institution`、`GET /api/org/talent/members`、`POST /api/integrations/talent/reports` → 404。
- 三角色登录：`GET /api/admin/bootstrap`（或菜单接口）返回的 C 菜单 path 集合与 §6.3 相等；`GET /api/admin/system/users` 三角色 403。
- 工作台拆分：规则配置员 `GET /api/admin/talent/dashboard` 200、`GET /api/admin/talent/reports` 403。
- 旧集合：`GET /api/collections`（超管）或迁移报告断言 19 个集合不存在。
- 迁移幂等：第二次 dry-run 输出 `pending=0`。

### 9.3 未跑检查要显式声明

M6 实现若因环境缺 PocketBase / Playwright / 微信工具未跑某项，必须在 acceptance 写「未验证 + 原因 + 复跑命令」，不得以「构建成功」代替权限与数据验收（docs/QUALITY.md）。

---

## 10. 实施顺序（任务拆分建议）

| 步骤 | 任务 | 写入范围（建议） | 前置 | 出口 |
| --- | --- | --- | --- | --- |
| 1 | **M6-A 备份与迁移脚本** | `scripts/migrate-m6-cleanup.mjs`、`package.json`、`scripts/backup-pb.mjs`（只读取证增强） | S0 冻结 | dry-run + 备份 + 恢复演练报告 |
| 2 | **M6-B 路由与页面删除** | `server/api/admin/talent/[resource]*`、`customer/**`、`report/**`、`institution/**`、`authorization*`、`plan*`、`template/**`、`matching*`、`sync-*`、`level-*`、`server/api/org/**`、`server/api/client/talent/{binding,plans,plan-selections}*`、`app/pages/admin/talent/*` 旧页、`app/pages/org/**`、旧组件、旧 composable、`app/composables/useMenuTree.ts` | M6-A 备份就绪 | 构建通过；旧 URL 404 |
| 3 | **M6-C 数据层与工具收敛** | `scripts/setup.mjs`、`scripts/sync-talent.mjs`、`shared/types/talent.ts` 裁剪、删旧 shared、删旧 util/插件、age / progress helper 迁移 | M6-B 路由已删 | `env:setup` 新库无旧集合；`talent:sync` 幂等 |
| 4 | **M6-D 三角色与菜单** | `scripts/seed-accounts.mjs`、`scripts/sync-talent.mjs` 角色矩阵、`scripts/setup.mjs` 工作台新码、`server/api/admin/talent/dashboard.get.ts` | M6-C 权限码收敛 | 三角色菜单 / 接口正反用例 |
| 5 | **M6-E 测试 / e2e / 文档** | `test/**`、`scripts/e2e/05,06`、§13 文档 | M6-D | 门禁全绿 + 证据回填 |
| 6 | **M6-F 生产执行** | 备份 → 迁移脚本 → 冒烟 → 回滚演练记录 | M6-A..E + lead 批准 | AC-M6-01..12 通过 |

- 写入范围互斥：M6-A 独占 `scripts/migrate-m6-cleanup.mjs`；M6-B 独占 `app/`、`server/api/`；M6-C 独占 `shared/`、`server/utils/`；M6-D 独占 `scripts/seed-accounts.mjs` 与角色段；M6-E 独占 `test/`、`scripts/e2e/`、`docs/`。
- 与并行任务（M3-C 页面、M5-A 数据层）冲突时：**先让并行任务合并**，M6 再删旧代码；M6 不得在并行任务未完成时删 `shared/types/talent-report.ts` 等新文件。

---

## 11. 回滚方案

### 11.1 触发条件

- 删除后出现：登录 / 菜单不可用、权限大面积 403、关键报表读不到、C 端主链路不可用、构建失败且 30 分钟内无法修复。
- 迁移脚本中途失败（集合部分删除、schema 不一致）→ **立即停止，不重试**。

### 11.2 回滚顺序（数据 → 代码 → 验证）

1. **停服务**：停 Nuxt 与定时任务，避免回滚期间写入。
2. **恢复数据**：用 S1 备份 zip（PocketBase 后台 Settings → Backups → Restore，或超管 `pb.backups.restore(key)`）；恢复前再备份当前库（即使已损坏也留证）。
3. **回滚代码**：切回 S0 创建的 tag（如 `pre-m6-cleanup-<date>`），重新 `pnpm install && pnpm build`，启动；**先回代码后启服务**，避免新代码访问已恢复的旧 schema。
4. **回滚菜单 / 角色**：备份已包含 `menus` / `roles` / `role_menus`，随数据恢复；若只回滚菜单（未删集合），用备份中的行重建并核对 `role_menus`。
5. **验证**：集合数量与 S1 快照一致；9 个关键集合行数一致；superAdmin / 平台运营登录；报告列表 / C 端报告页可打开；`oper_logs` 有回滚记录。
6. **复盘**：输出回滚报告，记录触发点、恢复的 backup key、耗时、数据缺口（RPO）。

### 11.3 约束

- **RPO**：维护窗口内停写，RPO ≈ 0；若未停写，RPO = 备份点至故障点，需在变更单写明。
- **RTO**：本地 / 单机 ≤ 30 分钟（恢复 zip + 重启）；生产按 OPERATIONS §7 执行。
- **不可局部恢复**：集合已删除时禁止「只补一个集合」；必须整库恢复，避免 schema 半旧半新。
- **回滚后不得**用旧代码直连已删除集合；必须先恢复数据。
- **演练**：S1 的恢复演练就是回滚预演；生产执行前 verifier 记录演练结果（AC-M6-07）。

---

## 12. 风险与未决项

### 12.1 风险

| 编号 | 风险 | 概率 | 影响 | 缓解 |
| --- | --- | --- | --- | --- |
| R1 | 备份不可用 / 未在目标环境备份，删除无法回退 | 中 | 高（数据丢失） | S1 硬门槛 + 恢复演练 + 脚本校验 sha256 / 时间 |
| R2 | 迁移脚本对错库执行 | 低 | 高 | `--pb-url` + `--data-dir` 双显式 + 环境一致性 + dry-run 人工复核 |
| R3 | M7 未合并，旧 C 端报告页空窗 | 中 | 中 | §7.3 交接门槛；必要时书面豁免 |
| R4 | 旧会员 / 机构历史数据删除后客户要查 | 中 | 中 | S1 导出 CSV；备份长期保留 |
| R5 | e2e 覆盖下降（旧用例删除，M9 才重写） | 高 | 中 | 新增 `06` 清理回归；M9 排期前不放松主链冒烟 |
| R6 | 工作台新码漏配，规则配置员看不到工作台 / 或误授报告权限 | 中 | 中 | §6.2 拆分 + AC-M6-05 正反用例 |
| R7 | 角色菜单复用旧行 id 误授权（旧 C 行重指向后 id 相同） | 中 | 中 | 按 path/component/permissionCode 精确断言；越权清理 |
| R8 | 旧权限码残留导致 403 / 菜单空 | 中 | 低 | §2.6 rg 归零 + sync 断言 |
| R9 | 外部接入通道删除后 M8 未就绪 | 中 | 中 | M3 Mock 同步兜底；STATUS / API 标注 |
| R10 | 内置 `admin` 通配角色被误分配给交付账号 | 低 | 高 | seed 断言「admin 角色不绑定账号」 |
| R11 | 集合删除顺序错误导致 relation 报错 | 中 | 中 | §4.6 固定顺序 + dry-run 预检 |
| R12 | `setup.mjs` 被误加清理分支 | 低 | 高 | §5.4 红线 + code review + 测试断言无 `rmSync` |
| R13 | 生产 PB 与本地 PB 版本 / 插件不一致 | 低 | 中 | 执行前 `pnpm env:doctor`；记录 PB 版本 |
| R14 | 角色显示名 / roleKey 变更影响既有账号 | 低 | 低 | 保留 roleKey；改显示名；账号绑定不变 |

### 12.2 未决项（裁决人：lead，个别需客户确认）

| 编号 | 未决项 | 建议默认 | 裁决人 |
| --- | --- | --- | --- |
| Q1 | 菜单结构：PRD §3.1 字面「6 组 11 菜单」含「培养方向」独立分组，与 2026-11-16 用户确认的「培养方向管理并入天赋规则 + 工作台/会员管理一级」不一致 | 沿用 2026-11-16 用户口径（业务 7 菜单 + superAdmin 系统/监控），PRD 结构差异写入验收说明 | lead / 客户 |
| Q2 | PRD §2 说平台运营管理员「系统管理全量操作 / 全部菜单」，与本任务「系统管理/运行监控仅 superAdmin」冲突 | 按本任务执行；PRD 文字由 M0/客户确认后修订 | lead / 客户 |
| Q3 | 报告审核员是否保留 `talent:report:publish` / `talent:advice:publish`（M3/M5 默认保留） | 保留；如客户要求纯只读，M6 只撤 `role_menus` | lead / 客户 |
| Q4 | 旧 `talent_reports` 旧行 / 旧会员 / 机构数据删除后是否需要客户可查 | 删除前导出 CSV 并留备份；不建历史查询页 | 客户 |
| Q5 | 系统管理是否保留 Foundation 额外页（部门 / 岗位 / 字典 / 参数 / 站点 / 微信） | 保留，仅 superAdmin；PRD §6.8 的 4 页是验收面 | lead |
| Q6 | 平台运营管理员 `roleKey` 是否改名为 `platform-operator` | M6 沿用 `customer-admin`（改显示名）；改名放 M9 | lead |
| Q7 | 机构账号 `users` 行删除还是停用 | 停用（`status="0"`）保留审计；不删账号 | lead |

---

## 13. 文档同步清单（S8）

| 文档 | 需更新内容 |
| --- | --- |
| `docs/ARCHITECTURE.md` | 集合表删除 19 个旧集合、标注 14–15 个保留；菜单树改为三角色视角；删除机构端段落；数据模型段删旧集合 |
| `docs/API.md` | 删除旧路由分组（customer / report 旧 / institution / authorization / plan / plan-selections / template / matching / sync-config / org / integration / client 旧）；保留新路由与权限列；标注「外部接入 M8 重建」 |
| `docs/STATUS.md` | 集合数 / API 数 / 页面数 / 测试数；账号表（三角色）；§7 关闭「客户管理员侧边栏机构管理」P1；快照日期 |
| `docs/TALENT-LOCAL.md` | 删除 `talent:seed` 与旧 Mock 菜单口径；改为 4 个分域种子 + 三角色账号 |
| `docs/CLIENT-PORTAL.md` | 删除旧 bindings / plans 页；C 端报告页由 M7 重建 |
| `docs/SCRIPT-GUIDE.md` | 删除 `talent:seed`；新增 `migration:m6` 与备份门槛说明 |
| `docs/OPERATIONS.md` | 新增 M6 删除变更单模板与回滚步骤（引用 §11） |
| `AGENTS.md` | 「当前能力」删除机构业务端、服务商授权、培养计划审核、内容库、报告接收、同步配置；保留三角色与系统管理 / 运行监控 |
| `docs/specs/README.md` | 新增 M6 行与 ADR 0006 索引 |
| `docs/implementation/天赋专项正式开发计划-2026-11-16.md` | M6 内容与实际拆分对齐（工作台 / 系统管理与清理 / 三角色三块） |
| 交接包 | 不改商务依据；在 README 注明「2026-09 原型含机构端，正式版已删除」 |

---

## 14. 示例假数据（文档与种子统一口径）

| 用途 | 示例值 |
| --- | --- |
| 家长 | 陈示例，`13800000001`，身份证 `110101198001011234`（虚构） |
| 子女 | 陈小示，`110101201609081234`（虚构），2016-09-08 |
| 报告号 | `GR202611160001` |
| 建议号 | `AD-GR202611160001-202611` |
| 方向编码 | `D001`，方向名「逻辑思维」；档位「T1 启蒙」 |
| 要素编码 | `A-01`、`F-23`（后台可见，C 端不展示） |
| 三角色账号（仅本地） | `admin`（平台运营）、`reviewer`（报告审核）、`rule-config`（规则配置）；口令只从环境变量读取，不写文档默认值 |

---

## 变更记录

- 2026-11-17：首版。清点 19 个旧集合、56 条旧 admin 路由、16 条机构端路由、6 条旧 C 端路由、1 条旧 integration、12 条旧菜单、25 条旧 F 行、22 个旧权限码；定义删除顺序、迁移脚本门槛、三角色矩阵（含工作台新码 `talent:dashboard:list`）、机构端与旧 bindings 退出、AC-M6-01..12、回滚与风险。