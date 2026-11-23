# M2 · 会员域规格（家长档案 / 子女档案 / 主动查询 / 解绑）

> 状态：**待实现（2026-11-16，architect / task-7 交付实现合同）**。本文是 M2 的实现合同，只写 docs，不改源码。
> 依据：[M2 需求分析](requirements.md)（task-6，用户 2026-11-16 确认 Q1–Q5 按建议、Q6–Q10 按默认）；PRD §6.2（L164–196）、§8.2 parent/child（L436–468）、§8.3 状态机（L522–533）、§9（L539–557）、§10（L581–590）、§12（L604–616）；M1 写法（[M1 规格](../M1-rules/spec.md)、[ADR 0001](../../adr/0001-m1-rule-domain.md)）；旧实现 `scripts/setup.mjs` / `server/api/admin/talent/customer/**` / `server/utils/talent-customer-relations.ts` / `server/utils/crypto.ts` / `app/pages/admin/talent/[resource].vue` / `apps/client` 绑定逻辑（只读，不修改）。
> 关键取舍：[ADR 0002 · M2 会员域关键决策](../../adr/0002-m2-member-domain.md)。
> 验收：见同目录 [acceptance.md](acceptance.md)（初始全部「未验证」）。
> 修订：v1（2026-11-16，首版）。

## 0. 决策基线（不再作为未决项）

用户已确认的 Q1–Q10 结论与本文落点：

| # | 结论（已确认） | 本文落点 |
| --- | --- | --- |
| Q1 | M2 不做旧会员导入/导出、不迁移旧数据；旧身份证只有 SHA-256，无法支持全号查看 | §1.2、ADR D1 |
| Q2 | 先按单 `parentId` 实现；父母双账号以后再加关系表 | §3.2、§4.3、ADR D2 |
| Q3 | 已验证手机号哈希自动绑定唯一 parent；同号多档拒绝自动绑定、后台合并；不沿用旧「命中多个档案全绑」的 GET 写绑定逻辑 | §3.1、§5.4.8、ADR D3 |
| Q4 | `talent_parents.status` 是停用唯一真源；登录账号状态归 M6，不双写 | §3.1、§4.1、ADR D4 |
| Q5 | 三类归因都归「未查到 + reason」；`未出结果` 不按失败算，由定时任务被动重试；`查询中` 超 24h 转「未查到 / 接口异常」并告警（阈值 M8 可调）；M2 用 Mock 复现 | §4.2、§4.4、§5.6、ADR D6 |
| Q6 | M2 用 Mock + 冻结适配器签名，M8 只换实现 | §5.6、ADR D6 |
| Q7 | 解绑后保留档案（`parentId` 置空、`status="2"`），按 `idNoHash` 找回复用 | §4.3、ADR D7 |
| Q8 | 会员编号沿用 `createTalentCode` 风格（`P` 前缀 + 序号），新建可改、编辑不可改；家长仅 18 位、不校验末位，只强校验生日一致 | §3.1、§4.5、§5.3、ADR D9 |
| Q9 | 列表行内保留「编辑」（PRD L177），与详情顶部编辑复用同一弹层与 PUT，列数不变 | §6.1、§6.2 |
| Q10 | 脱敏统一前 4 + 后 4；档案状态只有正常/停用，「未注册」用「来源=后台录入 + 未绑定账号」标注 | §3.4、§6.2、ADR D5/D10 |

**本文未决项只剩 1 条客户口径**（§13 C1：手机号全号查看是否单独开放）；其余均可直接实现。

## 1. 范围与不在范围

### 1.1 本里程碑交付

- **集合**：新建 `talent_parents`、`talent_children`；同步 `shared/types/talent-member.ts`、`scripts/setup.mjs`（仅新库）、`scripts/sync-talent.mjs`（存量库只加不删）。
- **服务端**：`server/api/admin/talent/members/**`、`server/api/admin/talent/children/**` 共 11 条管理路由；`server/api/client/talent/bindings.get.ts` 只读重建 + `bindings/claim.post.ts` 显式认领；Zod + `requirePermission` + `withOperLog`。
- **领域工具**：`server/utils/talent-member.ts`（校验 / 编号 / 脱敏映射 / 状态迁移 / 一孩一家长约束 / 归属解析）、`server/utils/talent-member-crypto.ts`（三件套）、`server/utils/talent-member-query.ts`（查询状态机 + Mock 源 + 超时扫描）、`server/plugins/talent-member-query.ts`（超时扫描定时任务）。
- **B 端页面**：`app/pages/admin/talent/member/index.vue`（列表 8 列 + 四项筛选）+ 页面组件（新建/编辑表单、详情三页签、子女就地编辑面板）；`app/composables/api/useTalentMemberApi.ts`。
- **权限与菜单**：9 个权限码、1 条 C 菜单重指向 + 8 条 F 按钮菜单；`app/composables/useMenuTree.ts` 的 `TALENT_PATHS` 增加 `/admin/talent/member`。
- **本地演示数据**：`scripts/seed-talent-member.mjs` + `pnpm talent:member:seed`（幂等、纯虚构数据，不进生产）。
- **文档同步**（M2 出口，由 lead 派发，不在本任务写范围）：`docs/API.md`、`docs/ARCHITECTURE.md`、`docs/STATUS.md`、`docs/TALENT-LOCAL.md`。

### 1.2 不在范围（M2 不做，避免越界）

| 项 | 归属 | 说明 |
| --- | --- | --- |
| C 端孩子管理 / 切换对象 / 编辑资料 / 绑定页 | M7 | M2 只冻结 `/api/client/talent/bindings` 契约与归属校验；不改 `apps/client/**` |
| 真实第三方基因查询联调、重试退避、限流、真实告警通道 | M8 | M2 只交可替换的 `TalentGeneQuerySource`，默认 Mock；超时阈值与扫描入口留给 M8 调参 |
| 报告集合、报告归属（`subjectType`/`subjectId`）、关联报告明细、报告发布 | M3 | M2 详情「关联报告」页签只读 M3 数据，未就绪显示空态（§8） |
| 方向命中 / 档位 / 建议 / 报告推送 | M4 / M5 | 不读不写 |
| 旧会员导入 / 导出 / 受检人标识（报价单 23、37–38、41–46） | 客户（Q1） | M2 明确不做；旧身份证仅 SHA-256 不可逆，也无法支持全号查看 |
| 三角色（平台运营管理员 / 报告审核员 / 规则配置员）正式授权、机构数据范围、旧集合/旧路由/旧码清理 | M6 | M2 只登记新码与菜单；验收用 `admin` / `superadmin`；旧 `talent:customer:*` 与旧页保留到 M6 |
| 旧 `talent_customers` / `talent_customer_bindings` / `_import_batches` / `_import_rows` 的删除或改结构 | M6 | M2 不删、不改、不回填；`scripts/setup.mjs` 的清理逻辑不动 |
| 「重置数据 / 恢复演示数据」 | 移除 | BR-14 L110、PRD §13.1 L643；M2 不实现 |
| 会员列表 1000 条性能验收、E2E 重写 | M9 | M2 只保证索引与服务端两段查询写对（§3.3、§12 R7） |

### 1.3 硬约束

- 单实例、单 PocketBase；不引入 `TENANT_MODE`、`site` cookie、`X-Site-Slug`、第二个 PB 连接。
- 业务字段只落 `talent_*`；不回填 `users` / `configs` / `site_config`。家长与登录账号的关系只存 `talent_parents.userId` 一个方向。
- `scripts/setup.mjs` 只用于空数据目录；存量库变更只走 `scripts/sync-talent.mjs`，且只允许「加集合 / 加字段 / 加索引 / 加菜单权限」，不删旧集合、不删旧字段、不改旧数据。
- 手机号、身份证**默认脱敏**；密文与哈希**永不进任何响应**；全号查看使用独立权限码 + 单项接口 + `oper_logs`（日志不含明文）。
- 页面不得直连 PocketBase 或 `useApi()`；权限在 Nitro 路由内校验，前端隐藏只做体验。
- 文档示例一律使用虚构数据（如 `13800000001`、`110101201609081234`），不得写真实 PII。

## 2. 角色与权限

### 2.1 角色矩阵（M2 生效部分）

| 角色 | 列表/详情 | 建档/编辑家长 | 子女编辑/解绑/查询 | 停用/启用 | 身份证全号 |
| --- | --- | --- | --- | --- | --- |
| 平台运营管理员 | ✅ | ✅ | ✅ | ✅ | ✅（独立权限 + 留痕） |
| 报告审核员 | ✅ 只读 | ❌ | ❌ | ❌ | ❌ 默认不授予 |
| 规则配置员 | ❌ 无菜单 | ❌ | ❌ | ❌ | ❌ |
| 家长（C 端） | 仅本人 + 已绑定子女 | ❌ | ❌ | ❌ | ❌ |

- M2 的新会员域为**平台级**，不做机构数据隔离；机构端继续走旧 `/api/org/talent/members` 与旧集合，M6 统一。M2 不得把新权限码授予机构角色（`sync-talent.mjs` 的机构角色菜单收敛逻辑保持原样）。
- 验收账号：`admin` / `superadmin`（RBAC 通配）；M6 再建三角色授权。

### 2.2 权限码（新增 9 个）

| 页面 / 能力 | 权限码 | 接口侧校验 |
| --- | --- | --- |
| 会员管理列表 / 详情入口（C 菜单） | `talent:parent:list` | `GET /members` |
| 查看会员详情（F） | `talent:parent:view` | `GET /members/:id` |
| 新增会员（F） | `talent:parent:add` | `POST /members` |
| 编辑会员（F） | `talent:parent:edit` | `PUT /members/:id` |
| 停用 / 启用会员（F） | `talent:parent:status` | `PUT /members/:id/status` |
| 查看证件全号（F，独立高敏） | `talent:parent:idno` | `GET /members/:id/id-no`、`GET /children/:id/id-no` |
| 编辑 / 新增名下子女（F） | `talent:child:edit` | `POST /members/:id/children`、`PUT /children/:id` |
| 解绑子女（F） | `talent:child:unbind` | `POST /children/:id/unbind` |
| 重新查询（F） | `talent:child:query` | `POST /children/:id/query` |

- 服务端统一 `requirePermission(event, code)`；前端 `hasPermission(code)` 只做按钮隐藏。
- 旧 `talent:customer:*`（list/view/add/edit/delete/import）保留给旧页面与机构端，语义不变，M6 随旧页删除（ADR 0002-D8）。
- **每个 `requirePermission` 用到的码都必须有 C 或 F 菜单行**（CONVENTIONS §3），否则自定义角色无法分配；`sync-talent.mjs` 在 M2 出口做断言。

### 2.3 菜单登记（`scripts/setup.mjs` + `scripts/sync-talent.mjs` 幂等）

| 类型 | 菜单名 | 路径 | component | 权限码 |
| --- | --- | --- | --- | --- |
| C（一级菜单，重指向旧行） | 会员管理 | `/admin/talent/member` | `admin/talent/member/index.vue` | `talent:parent:list` |
| F | 查看会员详情 | `/admin/talent/member` | — | `talent:parent:view` |
| F | 新增会员 | `/admin/talent/member` | — | `talent:parent:add` |
| F | 编辑会员 | `/admin/talent/member` | — | `talent:parent:edit` |
| F | 停用启用会员 | `/admin/talent/member` | — | `talent:parent:status` |
| F | 查看会员证件全号 | `/admin/talent/member` | — | `talent:parent:idno` |
| F | 编辑名下子女 | `/admin/talent/member` | — | `talent:child:edit` |
| F | 解绑名下子女 | `/admin/talent/member` | — | `talent:child:unbind` |
| F | 重新查询子女结果 | `/admin/talent/member` | — | `talent:child:query` |

- **沿用旧菜单行，不新增同名项**（同 M1 ADR-D5 写法）：按 `menuType="C" && path="/admin/talent/customer"` 找旧行（M2.0 菜单对齐已把 name 改为「会员管理」；当前仍暂指旧页），把 `path` / `component` / `permissionCode` 指向新页，保留该行 id 与既有 `role_menus` 关联；随后 `seedMenus` 按新 path upsert 命中同一行。
- 旧页 `app/pages/admin/talent/[resource].vue` 与旧码不删、不改；菜单不再指向 `/admin/talent/customer`，旧页仅剩 URL 可访问，M6 删除。
- 一级分组、图标（`users`）、`orderNum = 10` 沿用旧行，不新增分组。

> 当前菜单口径已按用户调整：会员管理为一级 C 菜单（`parentId=null`），不再放在同名 M 分组下；`scripts/sync-talent.mjs` 的 `MENU_ALIGNMENT_PAGES` 第三列为 `null`，`BUSINESS_MENU_PATHS` 含 `/admin/talent/member`。M2 实现只改该 C 行 path/component/permissionCode，不新增同名菜单。
- 菜单 `status="0"` 时侧栏即时隐藏（PRD §2 L58）。
- `app/composables/useMenuTree.ts` 的 `TALENT_PATHS` 增加 `'/admin/talent/member'`；不加则该菜单被 `isFoundationPath` 过滤，页面即使存在也不可见。
- M2 出口在 `scripts/sync-talent.mjs` 增加断言：9 个权限码均有 C/F 菜单行；`path="/admin/talent/member"` 的 C 菜单唯一、`parentId=null` 且权限码为 `talent:parent:list`。

### 2.4 数据权限与立即失效

- **后台**：按权限码鉴权，不按机构隔离（§2.1）。
- **C 端**：家长只能解析到 `talent_parents.userId = 当前账号` 的本人档案，以及其 `parentId` 名下 `status="1"` 的子女；服务端解析 parent 上下文，**不接受前端传 `parentId`**；跨家长访问一律 404（不泄露存在性）。
- **立即失效**：家长停用（`talent_parents.status="0"`）或子女解绑（`talent_children.status="2"`）后，该对象从 `bindings` 消失；M2 用 API 测试证明，报告/建议/PDF 的拒绝沿用 M3 归属校验（§7.2）。

## 3. 数据模型

### 3.0 通用约定

- 集合与字段命名 camelCase（与现有 `talent_*` 一致），与 PRD `snake_case` 映射见 §3.5。
- `status`：`text(10)`，`"1"` 正常/启用、`"0"` 停用；子女档案另用 `"2"` 表示已解绑（§4.3）。
- 写操作审计字段：`createdBy` / `updatedBy`（relation → `users`，`maxSelect: 1`，`cascadeDelete: false`）。
- 时间字段用 PocketBase `date`；`created` / `updated` 由 PB 维护；业务时间（`registeredAt` / `queryAt` / `unbindAt`）单独字段。
- 唯一索引命名 `idx_<collection>_<field>`；部分唯一索引用 `WHERE <field> != ""`（与 `setup.mjs` 现有写法一致）。
- 密文字段 `text(255)`（AES-256-GCM 输出 `iv:tag:cipher` 十六进制，手机号约 90 字符、身份证约 105 字符）；哈希统一 64 位十六进制。
- 所有面向响应/页面的字段一律经 `sanitizeTalentParentRecord` / `sanitizeTalentChildRecord` 映射；集合原始记录（含 cipher/hash）不得直接返回。
- PocketBase `required` 语义偏差：`required` relation 不可为空，因此 `talent_children.parentId` 与 `talent_parents.userId` 在 PB schema 中为**可选**，必填/唯一约束由服务层与部分唯一索引保证（同 M1 §3.0 写法）。

### 3.1 `talent_parents`（家长档案，一档一行）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `parentNo` | text(64) | 是 | 会员编号（列表首列）；`P{YYYYMMDD}{4 位当日序号}`，如 `P202611160001`；新建可手填、编辑不可改 |
| `name` | text(50) | 是 | 家长姓名 |
| `mobileCipher` | text(255) | 是 | 手机号密文（AES-256-GCM） |
| `mobileHash` | text(64) | 是 | 手机号哈希（HMAC-SHA256，见 §3.4）；一手机号一家长 |
| `maskedMobile` | text(20) | 是 | 脱敏手机号，前 4 + 后 4（如 `1380****0001`） |
| `idNoCipher` | text(255) | 否 | 家长身份证密文（选填） |
| `idNoHash` | text(64) | 否 | 家长身份证哈希；有值时唯一 |
| `maskedIdNo` | text(24) | 否 | 脱敏身份证，前 4 + 后 4（如 `1101**********1234`） |
| `gender` | text(10) | 否 | `male` / `female` |
| `birthday` | text(10) | 否 | `YYYY-MM-DD`；填身份证时必填且与证件第 7–14 位一致 |
| `source` | text(20) | 是 | `admin`（后台录入）/ `wechat`（小程序注册）/ `mock`（本地种子，禁止生产写入） |
| `status` | text(10) | 是 | `"1"` 正常 / `"0"` 停用；**停用唯一真源**（Q4） |
| `registeredAt` | date | 是 | 注册/建档时间；后台新建取服务端当前时间，种子固定 |
| `userId` | relation → `users` | 否 | 登录账号绑定（Q3）；`maxSelect: 1`，`cascadeDelete: false`；`users` 被删时保留家长档案 |
| `remark` | text(500) | 否 | 备注 |
| `createdBy` / `updatedBy` | relation → `users` | 否 | 审计字段 |

- 唯一索引：`idx_talent_parents_no` UNIQUE(`parentNo`)；`idx_talent_parents_mobile` UNIQUE(`mobileHash`)；`idx_talent_parents_idno` UNIQUE(`idNoHash`) WHERE `idNoHash != ""`；`idx_talent_parents_user` UNIQUE(`userId`) WHERE `userId != ""`（一账号一家长档案）。
- 普通索引：`idx_talent_parents_status`(`status`)。
- 手机号唯一冲突（同号多档）→ 409，message 指明「该手机号已存在家长档案，请在后台核对合并」；不自动合并、不自动绑定（Q3）。
- `userId` 与 `mobileHash` 同时约束：一个账号只能被一个家长档案认领；一个手机号只能对一个家长（后台合并是后续人工动作，M2 只拒绝并提示，不做合并接口）。
- **不建** `talent_customer_bindings` 的新版本、不建 `talent_parent_children` 关系表（ADR 0002-D2/D3）。

### 3.2 `talent_children`（子女独立档案）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `parentId` | relation → `talent_parents` | 否 | `maxSelect: 1`，`cascadeDelete: false`；解绑后置空（Q7） |
| `name` | text(50) | 是 | 子女姓名 |
| `gender` | text(10) | 是 | `male` / `female` |
| `birthday` | text(10) | 是 | `YYYY-MM-DD` |
| `relation` | text(20) | 是 | 与家长关系：`father` / `mother` / `grandfather_paternal` / `grandmother_paternal` / `grandfather_maternal` / `grandmother_maternal` / `guardian` |
| `idNoCipher` | text(255) | 是 | 身份证密文 |
| `idNoHash` | text(64) | 是 | 身份证哈希；**全局唯一**，一孩一档 |
| `maskedIdNo` | text(24) | 是 | 脱敏身份证，前 4 + 后 4 |
| `query` | text(20) | 是 | `unqueried` / `querying` / `found` / `not_found`；默认 `unqueried` |
| `queryReason` | text(20) | 否 | 仅 `not_found` 有值：`info_mismatch` / `api_error` / `no_result` |
| `querySeq` | number | 是 | 当前发起序号（0 起）；回执幂等键 `${childId}:${seq}`（§4.4） |
| `queryAttempts` | number | 是 | 累计发起次数（含自动重查） |
| `queryStartedAt` | date | 否 | 本次 `querying` 开始时间；超时扫描依据（§4.4） |
| `queryAt` | date | 否 | 最近一次发起或回执写入时间（最小间隔与展示用） |
| `status` | text(10) | 是 | `"1"` 正常 / `"2"` 已解绑；**不存**「已停用」，家长停用时派生展示（Q4） |
| `unbindAt` | date | 否 | 解绑时间 |
| `unbindBy` | relation → `users` | 否 | 解绑操作人；`maxSelect: 1`，`cascadeDelete: false` |
| `createdBy` / `updatedBy` | relation → `users` | 否 | 审计字段 |

- 关系中文映射（响应 `relationLabel`）：`father` 父亲 / `mother` 母亲 / `grandfather_paternal` 祖父 / `grandmother_paternal` 祖母 / `grandfather_maternal` 外祖父 / `grandmother_maternal` 外祖母 / `guardian` 其他监护人。
- **`relation` 语义**：表示「该家长是这名子女的谁」（家长视角），不是子女性别；列表/详情列名沿用 PRD 的「与家长关系」，实现不得按子女 `gender` 反推。
- **PB `required` number 偏差**：`querySeq` / `queryAttempts` 在 PB schema 中为可选（`required` number 等价于「不能为 0」，新建时初值为 0），必填性由服务层写入与 Zod 保证（同 M1 §3.0）。
- 唯一索引：`idx_talent_children_idno` UNIQUE(`idNoHash`)。
- 普通索引：`idx_talent_children_parent`(`parentId`)；`idx_talent_children_query`(`query`)；`idx_talent_children_parent_status`(`parentId`, `status`)。
- **一孩一有效家长**：`parentId` 单值天然满足；服务层在「新增子女 / 重绑归档档案」时校验，解绑归档不删档（§4.3）。
- 解绑后档案保留，`parentId=""`、`status="2"`、`unbindAt`/`unbindBy` 落库；历史报告（M3）按 `subjectId` 保留归属，不丢档。
- 子女档案不存「与家长关系」以外的账号字段；登录账号只在家长档案上。

### 3.3 索引清单（新库必须断言存在）

| 集合 | 索引 |
| --- | --- |
| `talent_parents` | `idx_talent_parents_no` UNIQUE(`parentNo`)；`idx_talent_parents_mobile` UNIQUE(`mobileHash`)；`idx_talent_parents_idno` UNIQUE(`idNoHash`) WHERE `idNoHash != ""`；`idx_talent_parents_user` UNIQUE(`userId`) WHERE `userId != ""`；`idx_talent_parents_status`(`status`) |
| `talent_children` | `idx_talent_children_idno` UNIQUE(`idNoHash`)；`idx_talent_children_parent`(`parentId`)；`idx_talent_children_query`(`query`)；`idx_talent_children_parent_status`(`parentId`, `status`) |
| 旧集合（保留，M2 不动） | `talent_customers` / `talent_customer_bindings` 等既有索引原样保留到 M6 |

### 3.4 敏感字段三件套（密文 + 哈希 + 脱敏）

| 件 | 生成规则 | 落库 | 响应 | 用途 |
| --- | --- | --- | --- | --- |
| 密文 | `encrypt(value)`：复用 `server/utils/crypto.ts` 的 AES-256-GCM（`ENCRYPTION_KEY`，`iv:tag:cipher`） | ✅ `*Cipher` | ❌ 永不返回 | 全号查看 / 未来导出（M6+） |
| 哈希 | `HMAC-SHA256(derive(ENCRYPTION_KEY, <域盐>), 归一化明文)`，输出 64 位 hex；域盐按字段分离（手机号 `talent-member-mobile-hmac`、身份证 `talent-member-idno-hmac`） | ✅ `*Hash` | ❌ 永不返回 | 唯一键、绑定查询、去重 |
| 脱敏 | 手机号 `前4 + "****" + 后4`；身份证 `前4 + "*"×10 + 后4`（Q10 统一前 4 + 后 4） | ✅ `maskedMobile` / `maskedIdNo` | ✅ 唯一对外形态 | 列表、详情、C 端、日志摘要 |

实现落点 `server/utils/talent-member-crypto.ts`：

```ts
// 启动/首次使用自检：ENCRYPTION_KEY 缺失或过短 → 500（不降级明文）
export function assertTalentMemberCryptoReady(): void

// 明文只在请求体内出现；服务端即时加密 + 哈希 + 脱敏后丢弃明文
export function encryptTalentSensitive(value: string): string
export function decryptTalentSensitive(cipher: string): string   // 解密失败抛错，绝不回退明文
export function hashTalentMemberMobile(mobile: string): string  // 域盐 talent-member-mobile-hmac
export function hashTalentMemberIdNo(idNo: string): string     // 域盐 talent-member-idno-hmac
export function maskTalentMobile(mobile: string): string
export function maskTalentIdNo(idNo: string): string
export function normalizeTalentMobile(input: string): string     // trim、去空格/连字符、去 +86 前缀
export function normalizeTalentIdNo(input: string): string       // trim、转大写
```

- **不复用旧 `hashTalentPhone` / `hashTalentIdCard`（纯 SHA-256）**：11 位手机号与 18 位证件号空间小，无盐 SHA-256 可被彩虹表反查；新集合用加胡椒 HMAC（ADR 0002-D5）。旧字段与旧代码保留到 M6，互不读取。
- 密钥轮换：`ENCRYPTION_KEY` 变更会使历史密文不可解、哈希不可比。M2 不做轮换/迁移工具；启动自检只提示，轮换按运维流程另立任务（ADR D5「后果」）。
- 解密失败：抛 500「敏感数据处理失败，请联系管理员」，记录 `error_logs`（不含密文/明文）；**任何情况不得降级为明文返回**。
- 响应脱敏统一由 `sanitizeTalentParentRecord(record)` / `sanitizeTalentChildRecord(record)` 完成：删除 `mobileCipher` / `mobileHash` / `idNoCipher` / `idNoHash`，补 `statusLabel` / `sourceLabel` / `genderLabel` / `relationLabel` / `queryLabel` / `queryReasonLabel`；列表/详情/新建/编辑/查询/解绑响应全部走同一映射，禁止各路由各写一份。

### 3.5 PRD → 集合字段映射

| PRD §8.2 | 本规格 | 说明 |
| --- | --- | --- |
| parent `id` | `talent_parents.parentNo` | PRD 的 `id` 是会员编号，不是 PB 主键 |
| parent `mobile` | `mobileCipher` + `mobileHash` + `maskedMobile` | PRD「脱敏存储/展示」拆为三件套 |
| parent `id_no` | `idNoCipher` + `idNoHash` + `maskedIdNo` | 选填 |
| parent `source` | `source` | 小程序注册 / 后台录入 |
| parent `status` | `status` | 正常 / 停用 |
| parent `registered_at` | `registeredAt` | 建档时间 |
| child `id / parent_id` | PB 主键 + `parentId` | 解绑置空 |
| child `name / gender / birthday` | 同名字段 | gender 用 `male` / `female` |
| child `relation` | `relation` | 7 个英文枚举，中文映射见 §3.2 |
| child `id_no` | `idNoCipher` + `idNoHash` + `maskedIdNo` | 必填 |
| child `query` | `query` | 四态 |
| child `reason` | `queryReason` | 三类归因；仅 `not_found` 有值 |
| PRD §9 全号单独授权 | `talent:parent:idno` + 单项接口 | §5.2 #10/#11 |
| PRD §10 数据权限 | `talent_parents.userId` + 服务层归属解析 | §2.4、§7 |

### 3.6 本地演示数据（`scripts/seed-talent-member.mjs`）

- 幂等：按 `parentNo` / `mobileHash` / `idNoHash` upsert，**不清空**其他天赋数据、不触碰旧 `talent_customers`。
- 纯虚构数据：`13800000001`…、`110101201609081234` 一类格式合法但非真实身份；脚本头注明「仅本地演示」。
- 覆盖四种状态：已查到 / 未查到（三种 reason 各 1）/ 查询中 / 未查询；覆盖已解绑档案 1 条、停用家长 1 条、未绑定账号家长 1 条。
- 脚本以 `TALENT_MEMBER_SEED_CONFIRM` 之类的显式确认保护，且拒绝在 `NODE_ENV=production` 下运行（沿用 `seed-talent.mjs` 的保护风格）。

## 4. 状态、查询状态机与归因

### 4.1 家长状态

| 字段 | 值 | 规则 |
| --- | --- | --- |
| `talent_parents.status` | `"1"` 正常 / `"0"` 停用 | **停用唯一真源**（Q4）；停用后 C 端 bindings 立即不含本人与子女；不再发起新查询；已发出的回执仍可落库（不丢数据），但家长端不可见 |
| 登录账号状态 | `users.status` | 归 M6，M2 不读写、不与家长状态双写；账号资料页签不展示为「会员状态」 |

- 停用/启用为独立接口（`PUT /members/:id/status`），不改子女档案、不改查询状态、不写 `users`。
- 停用不删除任何数据；启用后 bindings 与子女恢复可见。

### 4.2 子女查询状态机

```
未查询 unqueried --发起查询（新建/编辑关键字段/手动重查）--> 查询中 querying
查询中 querying --回执 found--> 已查到 found
查询中 querying --回执 not_found（三类 reason）--> 未查到 not_found
未查到 not_found --重新查询--> 查询中 querying
查询中 querying --再次重查--> 幂等，不重复发起，返回当前状态
查询中 querying --超阈值（默认 24h）--> 未查到 not_found + api_error（并告警）
已查到 found --编辑姓名/性别/生日/身份证--> 自动 查询中 querying
已解绑 status="2" --> 不可编辑、不可重查、回执丢弃
```

- **四态**：`unqueried`（灰色）/ `querying`（蓝色，有等待态）/ `found`（绿色）/ `not_found`（红色，展示 reason）。
- **三类归因**（仅 `not_found` 有值，中文展示）：

| `queryReason` | 中文 | 含义 | 运营动作 |
| --- | --- | --- | --- |
| `info_mismatch` | 信息不一致 | 外部按手机号 + 身份证未匹配到检验人 | 核对家长/子女资料后编辑关键字段重查 |
| `api_error` | 接口异常 | 鉴权失败、超时、5xx、适配器异常 | 重新查询（M8 加自动退避） |
| `no_result` | 未出结果 | 外部已受理但尚未出结果，**不算失败** | 不催办；M8 定时任务被动重试，M2 用 Mock 复现 |

- 派生口径（工作台 M6 直接消费）：注册家长 = `talent_parents` 计数；已出结果 = `query="found"` 子女数；待出结果 = 其余（含 `not_found/no_result`，Q5「不按失败算」）。
- 重复查询不重复建档：M2 只维护状态与回执归属；报告建档归 M3（BR-02）。

### 4.3 解绑、归档与重绑（Q7）

| 动作 | 写入 | 结果 |
| --- | --- | --- |
| 解绑 | `parentId=""`、`status="2"`、`unbindAt=now`、`unbindBy=操作人`、`querySeq+1`（作废未到回执） | 档案保留；C 端立即不可见；历史报告（M3）归属不丢 |
| 重复解绑 | 幂等：已是 `"2"` 直接返回当前档案（message「该子女已解绑」） | 不报错、不重复写审计以外的数据 |
| 重绑（新增子女命中同 `idNoHash` 的已解绑档案） | `parentId=新家长`、`status="1"`、清空 `unbindAt/unbindBy`、更新姓名/性别/生日/关系、重置查询并重新发起 | 复用原档案 id，历史报告仍可按 `subjectId` 挂回 |
| 新增子女命中同 `idNoHash` 的**正常**档案 | 不写入，409「该子女档案已存在」 | 同家长：提示直接编辑；其他家长：提示先解绑或后台核对 |
| 新增子女命中同 `idNoHash` 的**停用家长**名下档案 | 409「该子女档案所属家长已停用」 | 运营先处理家长状态 |

- 解绑不删除记录、不级联删除历史数据（M3 报告保留）。
- 解绑后家长仍有其他正常子女 → 家长档案不变；家长无子女 → 详情子女页签空态。

### 4.4 迟到 / 无归属回执与超时

- 每次发起查询：`querySeq + 1`、`queryAttempts + 1`、`query="querying"`、`queryReason=""`、`queryStartedAt=now`、`queryAt=now`，先落库再调用适配器；回执幂等键 = `${childId}:${querySeq}`。
- **回执落库守卫**（`applyTalentGeneQueryReceipt`）任一不满足即 `discarded`，不建任何数据、不写任何字段：
  1. `childId` 不存在（无归属回执）；
  2. `child.status != "1"`（已解绑/归档）；
  3. `child.query != "querying"`（状态已变）；
  4. `receipt.seq != child.querySeq`（迟到 / 旧回执 / 重复回执）。
- 回执命中：`found` → `query="found"`、`queryReason=""`；`not_found` → `query="not_found"`、`queryReason=receipt.reason`；两者都写 `queryAt=now`、清空 `queryStartedAt`。回执不得创建家长/子女/报告（建档归 M3）。
- **发起即失败**：适配器 `submit` 抛错或返回 `accepted=false` 时，服务端把该子女置 `not_found` + `api_error`（写 `queryAt=now`、清空 `queryStartedAt`），由页面/详情提供重查入口；不把异常抛给建会员主流程。
- **超时**：`query="querying"` 且 `queryStartedAt < now - 阈值` → 转 `not_found` + `api_error`，写 `queryAt=now`、`queryStartedAt` 清空，并记录告警。阈值 `TALENT_QUERY_TIMEOUT_HOURS`（默认 24，M8 可调）；扫描入口 `sweepTalentQueryTimeouts({ timeoutHours?, now? })`，由 Nitro 插件每 `TALENT_QUERY_SWEEP_INTERVAL_MS`（默认 600000）执行一次，启动时执行一次；测试可直接传参复现（不需要等 24h）。
- **告警**：M2 用 `recordError(pb, { source: "api", level: "warn", message: "[talent-member] 子女查询超时未回执", meta: { childId, seq, hours } })` 写入 `error_logs`（错误监控页可见）+ `console.warn`；不写手机号/证件号。M8 替换为真实告警通道。
- **重查最小间隔**：单子女 30 秒内重复点「重新查询」不重复发起，返回当前状态（`throttled: true`）；`query="querying"` 时重查幂等返回当前状态。前端在 `querying` / 节流期内禁用按钮并显示倒计时。
- **未出结果重试**：M2 只落 `not_found/no_result` 状态与 `queryAt`；定时被动重试属 M8（不建 M2 定时重试器，避免与 M8 重复实现）。

### 4.5 编号与校验规则（Q8）

- 会员编号：`P` + `YYYYMMDD` + 4 位当日序号（如 `P202611160001`），按当日已有编号最大值 + 1，创建冲突最多重试 5 次后 409；新建表单可手填（`^P[0-9]{12}$`），编辑时提交与库中不同的编号 → 422「会员编号不可修改」。
- 手机号：`^1[3-9]\d{9}$`；入库前归一化（去空格/连字符、去 `+86` 前缀）；格式错误 422。
- 身份证：`^\d{17}[\dXx]$`（18 位，不校验末位，Q8）；归一化大写；出生日期取第 7–14 位，必须为合法日期且与 `birthday` 一致 → 否则 422「身份证号与出生日期不一致」；家长填身份证但未填生日 → 422「填写身份证时必须填写出生日期」。
- 出生日期：`YYYY-MM-DD` 合法日期、不得晚于今天；子女必填，家长选填。
- 性别：`male` / `female`；关系：7 枚举（§3.2）；错误 422。
- 新建会员子女数 1–10、同一请求内身份证不得重复（422）；家长身份证选填，子女身份证必填。

## 5. API

### 5.1 通用约定

- 路由放 `server/api/admin/talent/{members,children}/`，与旧 `[resource].get.ts` / `[resource].post.ts` 同目录，依赖 Nitro「静态段优先」；实现后必须按 §5.7 验证命中（同 M1 R4）。
- 列表统一返回 `{ rows, total, page, pageSize }`（`paginatedQuery`）；会员列表额外返回 `statusCounts` / `statusTotal`；`pageSize` 默认 20、上限 100，`page` 最小 1。
- 写接口链路：`validateBody(event, schema, { statusCode: 422 })` → `requirePermission` → `withOperLog()` → `success(data, message)`；无请求体的动作接口跳过 `validateBody`，权限与审计不省。
- 全号接口：`requirePermission` → `withOperLog()` → 返回 `{ idNo }`；先鉴权再写日志，保证「无权限 403 且无成功日志」。
- 响应不回传 PocketBase 原始错误/堆栈；唯一冲突统一 409 且 message 指明字段。
- 所有响应只含脱敏值，不含 `*Cipher` / `*Hash`（§3.4）。

### 5.2 路由表（14 条）

| # | 方法 | 路径 | 权限码 | 说明 | 审计 |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/api/admin/talent/members` | `talent:parent:list` | 列表：`name` / `mobile` / `childName` / `status` 四项交集 + 分页 + 状态计数 | 否 |
| 2 | GET | `/api/admin/talent/members/:id` | `talent:parent:view` | 详情：家长 + 名下子女（查询状态/原因）+ 报告空态 + 账号绑定信息 | 否 |
| 3 | POST | `/api/admin/talent/members` | `talent:parent:add` | 新建家长 + 1–10 名子女；保存后逐个发起查询 | 是 |
| 4 | PUT | `/api/admin/talent/members/:id` | `talent:parent:edit` | 编辑家长；手机号/身份证留空不改；改手机号重校验唯一 | 是 |
| 5 | PUT | `/api/admin/talent/members/:id/status` | `talent:parent:status` | 停用 / 启用，即时失效 | 是 |
| 6 | POST | `/api/admin/talent/members/:id/children` | `talent:child:edit` | 新增子女（命中已解绑档案则重绑）→ 自动发起查询 | 是 |
| 7 | PUT | `/api/admin/talent/children/:id` | `talent:child:edit` | 编辑子女；身份证留空不改；关键字段变更 → 自动重查 | 是 |
| 8 | POST | `/api/admin/talent/children/:id/query` | `talent:child:query` | 重新查询（幂等 + 30s 节流） | 是 |
| 9 | POST | `/api/admin/talent/children/:id/unbind` | `talent:child:unbind` | 解绑（服务端幂等；二次确认在 UI） | 是 |
| 10 | GET | `/api/admin/talent/members/:id/id-no` | `talent:parent:idno` | 家长身份证全号（单项，不批量/不导出） | 是（高敏） |
| 11 | GET | `/api/admin/talent/children/:id/id-no` | `talent:parent:idno` | 子女身份证全号（单项） | 是（高敏） |
| 12 | GET | `/api/client/talent/bindings` | 家长登录态 | 本人 + 已绑子女的只读对象列表（新契约，§7） | 否 |
| 13 | POST | `/api/client/talent/bindings/claim` | 家长登录态 | 用已验证手机号哈希认领唯一 parent（显式写入，GET 不写） | 是 |
| 14 | GET | `/api/admin/talent/children/:id` | `talent:parent:view` | 静态段只读探针：返回脱敏子女档案；用于证明新路由优先于旧 `[resource]`，不替代详情页的 members 聚合 | 否 |

- 旧 `/api/admin/talent/customer/**`、旧 `/api/client/talent/bindings` 的旧写逻辑：新路由不调用旧代码；旧 `talent:customer:*` 保留给旧页（§2.2）。
- 无「会员导入/导出」「恢复演示数据」路由。

### 5.3 关键请求体（Zod）

```ts
const gender = z.enum(["male", "female"]);
const relation = z.enum([
  "father", "mother",
  "grandfather_paternal", "grandmother_paternal",
  "grandfather_maternal", "grandmother_maternal",
  "guardian",
]);
const mobile = z.string().trim().regex(/^1[3-9]\d{9}$/, "手机号格式不正确");
const birthday = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "出生日期格式应为 YYYY-MM-DD");
const idNo = z.string().trim().regex(/^\d{17}[\dXx]$/, "身份证号应为 18 位");

// #3 新建会员
{
  parentNo?: string,                 // ^P[0-9]{12}$，缺省服务端生成
  name: string,                      // 1–50
  mobile,                            // 必填
  idNo?: idNo,                       // 选填；填了必须有 birthday 且一致
  gender?: gender,
  birthday?: birthday,
  remark?: string,                   // ≤500
  children: [{                       // 1–10
    name: string, gender, birthday, relation, idNo
  }]
}

// #4 编辑家长（至少一项；parentNo 出现时必须等于库中值）
{ parentNo?, name?, mobile?, idNo?, gender?, birthday?, remark? }
// mobile / idNo 缺省或空串 = 不修改；显式传新值则重新校验并重算三件套

// #5 状态
{ status: "0" | "1" }

// #6 新增子女
{ name, gender, birthday, relation, idNo }

// #7 编辑子女（至少一项；身份证留空 = 不改）
{ name?, gender?, birthday?, relation?, idNo? }
```

- 以上写接口 Zod 失败统一 422（`validateBody` 传 `{ statusCode: 422 }`）。
- 业务校验在 Zod 之后：身份证生日一致、生日不晚于今天、唯一冲突、状态冲突（§5.4.7）。

### 5.4 响应结构

#### 5.4.1 列表 `GET /members`

```json
{
  "rows": [
    {
      "id": "rec_parent_1",
      "parentNo": "P202611160001",
      "name": "陈示例",
      "maskedMobile": "1380****0001",
      "maskedIdNo": "1101**********1234",
      "idNoMissing": false,
      "childCount": 2,
      "reportCount": 0,
      "source": "admin",
      "status": "1",
      "statusLabel": "正常",
      "accountBound": true,
      "registeredAt": "2026-11-16 10:00:00.000Z",
      "updatedAt": "2026-11-16 10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "statusCounts": { "1": 1, "0": 0 },
  "statusTotal": 1
}
```

- `childCount` = `parentId` 名下 `status="1"` 子女数；`reportCount` 在 M2 恒为 `0`（§8 过渡读法），M3 接入后替换。
- `statusCounts` 在「家长姓名 + 手机号 + 子女姓名」三项筛选下统计、**不叠加状态筛选**，保证下拉 `全部（n）` / `正常（a）` / `停用（b）` 与总数一致。

#### 5.4.2 详情 `GET /members/:id`

```json
{
  "parent": {
    "id": "rec_parent_1", "parentNo": "P202611160001", "name": "陈示例",
    "maskedMobile": "1380****0001", "maskedIdNo": "1101**********1234", "idNoMissing": false,
    "gender": "female", "genderLabel": "女", "birthday": "1988-03-12",
    "source": "admin", "sourceLabel": "后台录入", "status": "1", "statusLabel": "正常",
    "registeredAt": "2026-11-16 10:00:00.000Z", "remark": "",
    "accountBound": true, "createdAt": "2026-11-16 10:00:00.000Z", "updatedAt": "2026-11-16 10:00:00.000Z"
  },
  "children": [
    {
      "id": "rec_child_1", "name": "陈小示", "gender": "female", "genderLabel": "女",
      "birthday": "2016-09-08", "relation": "mother", "relationLabel": "母亲",
      "maskedIdNo": "1101**********1234", "query": "found", "queryLabel": "已查到",
      "queryReason": "", "queryReasonLabel": "", "queryAt": "2026-11-16 10:00:05.000Z",
      "queryAttempts": 1, "reportCount": 0, "status": "1", "statusLabel": "正常"
    }
  ],
  "counts": { "children": 1, "reports": 0 },
  "account": { "bound": true, "account": "parent@example.com", "displayName": "陈示例" }
}
```

- `children` 只含 `status="1"` 的子女，按 `created` 升序；已解绑档案不出现在详情（仍可通过重绑复用）。
- `account`：`bound=false` 时 `account` / `displayName` 缺省；`account` 取 `users.username`，为空时取 `users.email`；只读展示绑定账号，不展示账号状态（Q4，账号状态归 M6）。
- 服务端不返回子女/家长的 cipher、hash；`children[].queryReason` 只在 `query="not_found"` 时有值。

#### 5.4.3 新建 `POST /members`

```json
{
  "parent": { /* 同 5.4.2 parent（已脱敏） */ },
  "children": [ /* 同 5.4.2 children，新建后 query 通常为 querying */ ],
  "queries": [ { "childId": "rec_child_1", "accepted": true, "query": "querying", "throttled": false } ]
}
```

- message 固定为「已创建会员，N 名子女正在查询」（N = 成功发起查询的子女数）。
- 全部子女先落库再逐个发起查询；单个查询发起失败不影响会员建档，响应中该子女 `accepted=false`（服务端把该子女置 `not_found/api_error`），页面提示「部分子女查询未发起，可在详情中重新查询」。

#### 5.4.4 子女新增 / 编辑 / 解绑

```json
// #6 / #7
{ "child": { /* 同 5.4.2 child */ }, "requery": true, "query": { "accepted": true, "throttled": false } }

// #9
{ "child": { /* 已解绑 child，status="2"，statusLabel="已解绑" */ }, "alreadyUnbound": false }
```

- `requery`：`true` 表示本次因关键字段（姓名/性别/生日/身份证）变更或新建而发起查询；仅修改「与家长关系」不重查（`requery=false`）。
- 解绑返回的 child 仍只含脱敏字段；不返回历史报告。

#### 5.4.5 查询 `POST /children/:id/query`

```json
{ "child": { /* 同 5.4.2 child */ }, "accepted": true, "throttled": false }
```

- `query="querying"` 或 30s 节流期内：`accepted=false`、`throttled=true`，HTTP 200（幂等，不报错）。
- `query="found"` → 422；`status="2"` → 409；家长停用 → 409。

#### 5.4.6 全号 `GET /members/:id/id-no`、`GET /children/:id/id-no`

```json
{ "idNo": "110101198803121234" }
```

- 家长未填身份证 → 404「该家长未填写身份证」；对象不存在 → 404。
- 审计摘要只记 `parentNo` / 子女姓名，不记全号；每次查看都写一条（不合并、不缓存）。

#### 5.4.7 错误码

| 状态码 | 场景 |
| --- | --- |
| 400 | 请求体不是合法 JSON、分页参数非法 |
| 401 | 未登录（统一认证拦截） |
| 403 | 缺少权限码；C 端未绑定家长访问 bindings 之外的本人对象 |
| 404 | 家长/子女不存在；家长未填写身份证（全号接口）；C 端跨家长访问他人子女 |
| 409 | 唯一冲突（会员编号、手机号、身份证、账号已被绑定）；状态冲突（已解绑子女编辑/查询、家长停用后查询、手机号对应档案已绑定其他账号） |
| 422 | Zod 校验失败；手机号格式、身份证 18 位、生日与证件不一致、生日晚于今天、性别/关系枚举、子女数 0 或 >10、同请求身份证重复、`found` 状态再次查询、编辑提交不同 `parentNo` |
| 500 | 敏感字段解密失败、`ENCRYPTION_KEY` 缺失（统一错误处理，响应不含明文/堆栈） |

#### 5.4.8 C 端契约（新 `GET /bindings` 与 `POST /bindings/claim`）

```json
// GET /api/client/talent/bindings
{
  "items": [
    {
      "id": "rec_parent_1", "objectType": "self", "name": "陈示例",
      "gender": "female", "genderLabel": "女", "birthday": "1988-03-12",
      "relation": "", "relationLabel": "",
      "maskedIdNo": "1101**********1234",
      "query": null, "queryReason": "", "reportAvailable": false
    },
    {
      "id": "rec_child_1", "objectType": "child", "name": "陈小示",
      "gender": "female", "genderLabel": "女", "birthday": "2016-09-08",
      "relation": "mother", "relationLabel": "母亲",
      "maskedIdNo": "1101**********1234",
      "query": "found", "queryReason": "", "reportAvailable": false
    }
  ],
  "currentId": "rec_parent_1",
  "current": { /* 同 items[0] */ },
  "currentRelationType": "self"
}
```

- 沿用现有信封命名 `items` / `currentId` / `current` / `currentRelationType`（需求 §6 #11）；item 为新契约 `TalentMemberBindingItem`。
- `items` = 本人（`objectType="self"`）+ 已绑子女（`objectType="child"`，`status="1"`）；家长停用时 `items=[]`、`current=null`、`currentRelationType=""`。
- `query`：本人为 `null`（家长不做基因查询），子女为四态；`reportAvailable` 在 M2 恒为 `false`（M3 接入后按报告是否已发布计算）。
- `currentId` 默认取本人档案 id；对象切换由 C 端请求参数携带，**服务端不持久化 `isCurrent`**（不建绑定表，ADR 0002-D3）。
- **GET 只读**：不创建/更新任何记录；测试必须证明连续调用前后行数不变。

`POST /api/client/talent/bindings/claim`（空请求体，显式写入）：

| 结果 `claim.status` | 条件 | 写入 |
| --- | --- | --- |
| `bound` | 用户 `phone` 哈希命中唯一 parent 且 `userId` 为空 | `talent_parents.userId = 当前账号` + 审计 |
| `already_bound` | 命中 parent 且 `userId = 当前账号` | 无 |
| `no_match` | 哈希命中 0 条 | 无 |
| `ambiguous` | 哈希命中 ≥2 条（同号多档） | 无；记录 warn 日志，返回 200 与空 items，提示后台合并 |
| `conflict` | 命中 parent 但 `userId` 是其他账号 | 无；返回 409「该手机号对应的家长档案已绑定其他账号」 |
| `no_phone` | 当前账号无手机号 | 无；返回 200 与空 items |

- 响应 = bindings 信封 + `claim: { status }`；请求体为空对象或不传，claim 不调 `validateBody`（§5.1）。
- 手机号「已验证」口径：`users.phone` 由微信一键登录/手机号授权写入，M2 视为已验证；若后续需要区分验证来源，在账户域（M6）扩展，不回填 `talent_*` 业务字段。

### 5.5 服务端落点

| 文件 | 职责 |
| --- | --- |
| `shared/types/talent-member.ts` | 集合实体、四态/三类 reason/关系/来源枚举、列表行、详情、请求/响应、`TalentMemberBindingsResponse` |
| `server/utils/talent-member-crypto.ts` | 三件套加解密/哈希/脱敏/归一化/自检（§3.4） |
| `server/utils/talent-member.ts` | 校验（手机号/身份证/生日/枚举）、编号生成、`sanitizeTalent*Record`、状态迁移、一孩一家长/重绑、归属解析（`assertTalentChildAccess`）、报告计数占位（§8） |
| `server/utils/talent-member-query.ts` | `TalentGeneQuerySource` + Mock 实现、`submitTalentChildQuery`、`applyTalentGeneQueryReceipt`、`sweepTalentQueryTimeouts` |
| `server/plugins/talent-member-query.ts` | 启动 + 每 10 分钟扫描超时（`nitroApp.hooks.hook("close")` 清理） |
| `server/api/admin/talent/members/**`、`children/**` | 11 条管理路由：Zod / 权限 / 审计 / 响应映射 |
| `server/api/client/talent/bindings.get.ts`、`bindings/claim.post.ts` | C 端只读 bindings + 显式认领 |
| `app/composables/api/useTalentMemberApi.ts` | 页面唯一数据入口（不直连 `useApi()`/PB） |
| `app/pages/admin/talent/member/index.vue` + `components/` | 列表 / 详情 / 表单 / 就地编辑面板 |
| `scripts/seed-talent-member.mjs` | 本地演示数据（幂等、虚构、非生产） |

### 5.6 查询适配器接口（M2 冻结，M8 只换实现）

```ts
// server/utils/talent-member-query.ts
export const TALENT_GENE_QUERY_MOCK_SOURCE = "mock";

export interface TalentGeneQueryRequest {
  childId: string;
  parentId: string;
  seq: number;              // 回执幂等键 = `${childId}:${seq}`
  name: string;
  gender: TalentMemberGender;
  birthday: string;
  idNo: string;             // 明文仅存在于内存，不落库、不进日志
  mobile: string;           // 家长手机号明文，同上
}

export interface TalentGeneQueryReceipt {
  idempotencyKey: string;   // `${childId}:${seq}`
  childId: string;
  seq: number;
  outcome: "found" | "not_found";
  reason?: TalentQueryReason;  // not_found 时必填
  externalRef?: string;
  receivedAt: string;       // ISO 字符串
}

export interface TalentGeneQuerySource {
  readonly source: string;
  submit(request: TalentGeneQueryRequest): Promise<{ accepted: boolean; externalRef?: string }>;
}

/** M2 固定返回 Mock；M8 按环境/配置切换到真实源，不改调用方。 */
export function createTalentGeneQuerySource(): TalentGeneQuerySource;

export async function submitTalentChildQuery(
  childId: string,
  options?: { source?: TalentGeneQuerySource },
): Promise<{ accepted: boolean; throttled: boolean; child: TalentChildRecord }>;

export async function applyTalentGeneQueryReceipt(
  receipt: TalentGeneQueryReceipt,
): Promise<"applied" | "discarded">;

export async function sweepTalentQueryTimeouts(options?: {
  timeoutHours?: number;
  now?: Date;
}): Promise<{ scanned: number; converted: number }>;
```

Mock 行为（仅开发/M2 验收；生产 M8 必须切真实源）：

| 环境变量 | 默认 | 作用 |
| --- | --- | --- |
| `TALENT_GENE_QUERY_MOCK_MODE` | `success` | `success` / `info_mismatch` / `api_error` / `no_result` / `pending`（`pending` 不回执，用于验证超时与迟到回执） |
| `TALENT_GENE_QUERY_MOCK_DELAY_MS` | `1500` | 回执延迟；Mock 用进程内 `setTimeout` 触发 `applyTalentGeneQueryReceipt`，重启丢失未回执属于 Mock 允许行为 |
| `TALENT_QUERY_TIMEOUT_HOURS` | `24` | 查询中超时阈值（M8 可调） |
| `TALENT_QUERY_SWEEP_INTERVAL_MS` | `600000` | 超时扫描间隔 |

- Mock 回执的 `seq` 必须来自发起时的 `TalentGeneQueryRequest.seq`；测试用注入的假 source 构造「旧 seq / 未知 childId / 已解绑」三种回执验证丢弃。
- 生产环境默认 Mock 时，`server/plugins/env-check.ts` 增加一条 warn：「未接真实基因查询源，查询将停留在 Mock 状态」；M8 接入后删除该提示。

### 5.7 与旧 `[resource]` 动态路由的静态优先验证（实现必做）

风险：`server/api/admin/talent/[resource].get.ts` / `[resource].post.ts` 是**单段动态路由**，覆盖 `/api/admin/talent/:resource`；新静态目录 `members/`、`children/` 必须优先命中，否则请求会落到旧动态路由并报 404「天赋资源不存在」。

- 实现后在测试与本地服务各验证一次：
  1. `GET /api/admin/talent/members` 返回新列表结构（含 `rows` + `statusCounts`），**不是** `{ statusCode: 404, message: "天赋资源不存在" }`；
  2. `POST /api/admin/talent/members`（合法 body + 权限）进入新路由（新建成功），不被 `[resource].post.ts` 拦截；
  3. `GET /api/admin/talent/children/nonexistent` 返回 404「子女档案不存在」，而不是「天赋资源不存在」（前者证明命中新路由的 id 段）；
  4. 旧路由回归：`GET /api/admin/talent/customer` 仍走旧逻辑（`talent_customer` 资源），行为不变。
- 测试落点：`test/talent-member-api.test.ts` 断言 `server/api/admin/talent/members/**` / `children/**` 路由文件清单（同 M1 `talent-rule-api.test.ts` 的 `collectRuleRouteFiles` 写法），并在「真实服务烟测」中发第 1–4 条请求核对响应。
- **兜底**：若 Nitro 版本导致静态段未优先（本地实测出现），新路由迁到独立目录 `server/api/admin/talent-member/**` 并在 spec/ADR 追加修订 + 更新 `docs/API.md`；在此之前不得用「在 `[resource]` 里加 if」的方式兼容（会破坏旧资源语义）。

## 6. B 端页面

页面文件 `app/pages/admin/talent/member/index.vue`，路由 `/admin/talent/member`；`definePageMeta({ layout: "admin", middleware: ["auth", "permission-guard"] })`；请求全部走 `app/composables/api/useTalentMemberApi.ts`；列表用 `NDataTable` + `AdminPagination`，真实 `loading` / 空态；弹层尺寸沿用 Naive UI `preset`（详情 `ultra`、表单 `wide`）；主操作 ≥ 44px；状态/查询标签用主题令牌与 Naive UI tag 类型，不硬编码色值。

### 6.1 列表（AC-ADM-02-1，PRD L177–183）

**8 列，一列一字段、无副行堆叠**（BR-13）：

| 列 | 内容 | 数据来源 |
| --- | --- | --- |
| 会员编号 | `parentNo` 等宽字体 | API #1 |
| 家长 | `name`，可点击打开详情 | API #1 |
| 手机号 | `maskedMobile` | API #1 |
| 家长身份证 | `maskedIdNo`；未填 → `—` | API #1 |
| 名下子女 | `childCount`（只显示人数） | API #1 |
| 关联报告 | `reportCount`（M2 为 0；列保留） | API #1 |
| 账号状态 | `statusLabel` tag（正常/停用） | API #1 |
| 操作 | 详情（主）、编辑、停用/启用（按钮按权限隐藏） | — |

**四项筛选交集（AC-ADM-02-2）**：

- 家长姓名输入（`name`，模糊）；
- 手机号输入（`mobile`：完整 11 位或后 4 位；其他长度前端拦截并提示，不请求）；
- 子女姓名输入（`childName`，模糊，服务端两段查询）；
- 账号状态下拉（`status`：全部（`statusTotal`）/ 正常（`statusCounts["1"]`）/ 停用（`statusCounts["0"]`））。
- 四个条件 AND 叠加；任一筛选或每页条数变化 → 回第 1 页；「重置」清空四项并回第 1 页、恢复全量；点「查询」按钮触发搜索（不做输入即搜），回车等价于点「查询」。
- 默认排序 `-created`；分页 20/50/100。

**行内操作（Q9）**：详情（主）、编辑（与详情顶部编辑复用同一表单弹层与 `PUT /members/:id`）、停用/启用（停用二次确认，说明「停用后家长端立即不可见，历史数据与报告保留」；启用直接生效）。

**空态/错误态**：无会员 → 「暂无会员」+「新建会员」按钮；筛选无结果 → 表格空态 +「重置筛选」；接口失败 → 表格上方错误提示 + 重试；无 `talent:parent:list` → 菜单不可见，直达 403 提示。

### 6.2 详情（PRD L181–190）

`ultra` 弹层：顶部信息条（会员编号 / 家长姓名 / 手机号 / 家长身份证 / 状态 tag）+ 三页签（带数量）：

1. **名下子女**：表列 子女 / 与家长关系 / 身份证 / 查询状态（含原因）/ 关联报告（份数）/ 操作。
   - 查询状态 tag：未查询（default）/ 查询中（info，带 loading 小图标）/ 已查到（success）/ 未查到（error）+ reason 文案（信息不一致 / 接口异常 / 未出结果，`no_result` 用 warning 语气但状态仍是「未查到」）。
   - 操作：编辑（就地展开面板，**不叠第二层弹窗**）、重新查询（仅 `not_found` / `querying` 且家长正常时可用；`querying` 或 30s 节流期内禁用并显示倒计时）、解绑（二次确认）。
   - **就地编辑面板（AC-ADM-02-4）**：字段 姓名* / 性别* / 与家长关系* / 出生日期* / 身份证号；编辑态身份证输入框为空 + 提示「原证件已脱敏，不修改请留空」；客户端与 `handleSave()` 双校验（18 位、与生日一致）；保存成功 toast、面板收起、该行高亮并就地刷新列表与页签数量。
   - **查询中就地刷新（AC-ADM-02-3）**：保存后子女变「查询中」；弹层存在任 `querying` 子女时每 2s 拉一次详情（最多 60s），回执到达后自动停止并刷新该行；仍无结果时显示「查询结果尚未返回，可稍后手动刷新」+ 刷新按钮；关闭弹层停止轮询（清 `setInterval`，`onUnmounted`）。
   - 空态：「尚未绑定子女，新增子女后自动发起查询」+「新增子女」按钮（`talent:child:edit`）。
2. **关联报告**：表列 报告编号 / 子女 / 状态 / 已选培养方向 / 目标档位 / 开放分册 / 操作（查看报告）；M2 `reports=[]` → 空态「暂无关联报告（报告域 M3 接入后显示）」；不实现「查看报告」跳转（M3）。
3. **账号资料**：会员编号 / 姓名 / 手机号（脱敏）/ 身份证（脱敏）/ 状态 / 来源（小程序注册 / 后台录入）/ 注册时间 / 子女数 / 报告数；额外一行「登录账号」：已绑定 → 账号名；未绑定 → 「未绑定登录账号（家长使用本人已验证手机号登录后可自动绑定）」。

- 顶部操作：编辑会员（`talent:parent:edit`）、停用/启用（`talent:parent:status`）。
- **全号查看**：家长身份证与子女身份证单元格旁「查看」按钮，仅 `hasPermission("talent:parent:idno")` 时显示；点击调用单项接口，弹小窗展示全号（`readonly`），提示「本次查看已写入操作日志」；403 → toast「无查看证件全号的权限」；家长未填证件 → 按钮不显示。
- 弹层关闭即清轮询与临时全号状态（不留内存）。

### 6.3 新建 / 编辑会员（PRD L190）

`wide` 表单（两列栅格；子女动态区整行）：

- 家长：家长姓名*、手机号*、身份证（选填）、性别、出生日期、备注、会员编号（选填，占位 `P202611160001`）。
- 子女动态行（≥1、≤10）：姓名* / 性别* / 与家长关系* / 出生日期* / 身份证*；「添加子女」追加空行、「移除」删除（仅剩 1 行时禁用移除）。
- 校验：客户端逐行必填与格式校验（身份证 18 位、生日一致由服务端最终判定）；保存中禁用重复提交；失败行内提示 + toast，不发请求。
- 新建成功 toast「已创建会员，N 名子女正在查询」→ 关闭弹层、回第 1 页刷新。
- 编辑态：手机号、身份证只显示脱敏值且输入框为空 + 提示「原信息已脱敏，不修改请留空」；会员编号只读；保存后刷新列表与详情。

### 6.4 解绑二次确认（AC-ADM-02-5）

确认框（`dialog.warning`/破坏性样式），文案必须包含：

- 「解绑后家长端立即不可见该子女」；
- 「历史报告保留在后台，可按操作日志追溯」；
- 「子女档案保留，重新新增同一证件号可复用档案」。

确认后调用 `POST /children/:id/unbind`，成功 toast「已解绑」→ 刷新详情子女列表与页签数量、刷新列表行（`childCount`）。取消不发请求。服务端幂等：重复调用不报错。

### 6.5 通用交互

- 按钮权限：`hasPermission` 隐藏/禁用；服务端 403 兜底。
- 反馈：保存/解绑中 loading；成功/失败统一 toast；停用、解绑二次确认。
- 查询中状态：行内 tag + 顶部轻提示「正在等待查询结果…」。
- 主题/窄屏：只用主题令牌；1280 宽两栏表单不溢出；375 宽表格内部横向滚动。
- 不出现「重置数据 / 恢复演示数据」入口（BR-14，已移除）。

## 7. C 端契约与归属（M2 只定契约，页面 M7）

### 7.1 契约

- `GET /api/client/talent/bindings` 返回 §5.4.8 的 `TalentMemberBindingsResponse`（信封沿用 `items` / `currentId` / `current` / `currentRelationType`）；`items` 只含脱敏证件号、查询状态、`reportAvailable`，**不含**手机号原文、cipher、hash。
- `POST /api/client/talent/bindings/claim` 显式认领（§5.4.8）；GET 不产生任何写入。
- M2 **替换** `server/api/client/talent/bindings.get.ts` 的实现（同一路径返回新契约）；未绑定家长的账号 GET 返回 200 + `items=[]` / `current=null`，不返回 403（是否提示绑定由 M7 页面决定）。

### 7.2 归属与失效

- 服务端只按 `talent_parents.userId = 当前账号` 解析 parent；不接受前端传 `parentId`。
- 子女归属校验函数 `assertTalentChildAccess(userId, childId)`：不存在 / 不属于当前家长 / 子女 `status != "1"` / 家长 `status != "1"` → 404（不区分「不存在」与「无权限」，不泄露存在性）；M3/M7 复用。
- 家长停用或子女解绑后，下一次请求立即失效，不依赖缓存与 C 端本地状态。
- M2 不实现「子女增删改」的 C 端接口与页面（M7）；C 端不写 `talent_parents`/`talent_children`（claim 只写 `userId` 一个字段）。

### 7.3 与旧 C 端的关系（迁移期）

- 旧 `apps/client/**` 页面仍读取**旧** bindings 结构（`items[].customer.*`）；M2 新契约上线后旧页在 M2–M7 间不作为可用性验收对象（M7 重建页面；报告归属 M3 重建）。这是已确认的迁移边界，不在 M2 修复旧页。
- 旧 `server/utils/talent.ts` 中旧的 bindings 读取函数保留，供旧报告接口（M3 前）使用；但**不再有新的 GET 写绑定路径**（旧的 GET 里创建/更新 `talent_customer_bindings` 逻辑不再被新 bindings 路由调用，安全验收见 acceptance.md §2.3 A1）。
- 旧 `talent_customer_bindings` 集合只读封存、M6 删除；M2 不写入。

## 8. 关联报告过渡读法（M3 前）

- 旧 `talent_reports.customerId` 指向旧 `talent_customers.id`；新 `talent_parents/children` 是独立集合，**没有任何 id 映射**（Q1 不迁移）。因此：
  - M2 **不按** `customerId` 回查旧报告（会错配或泄露无关报告）；
  - 列表「关联报告」列恒为 `0`，详情「关联报告」页签恒为空态并注明「报告域接入后显示」；
  - `server/utils/talent-member.ts` 提供 `countTalentMemberReports(pb, subjectType, subjectIds)`：**特性探测** `talent_reports` 是否已有 `subjectType` / `subjectId` 字段；有则按 `subjectType+subjectId` 统计（为 M3 预留，字段不存在时不启用）；无则返回全 0。禁止读 `customerId`。
- 与 M3 的约定（写入 ADR 并同步给 M3 实现者）：
  - M3 重建 `talent_reports` 归属：新增 `subjectType`（`self` / `child`）+ `subjectId`（对应 `talent_parents.id` / `talent_children.id`），旧 `customerId` 保留到 M6 或迁移后删除；
  - M2 的子女 id 即 M3 报告 `subjectId`，解绑不删除子女档案，历史报告仍可按 `subjectId` 追溯；
  - M2 不做报告数量/最近报告缓存，M3 接入后由 `countTalentMemberReports` 直接读取。

## 9. 验收映射

完整追溯、测试命令与证据表见 [acceptance.md](acceptance.md)。落点速查：

| 需求 | PRD 位置 | 本文落点 |
| --- | --- | --- |
| FR-ADM-02 会员列表 8 列、四项筛选交集 | §6.2 L177–180、L193–194；AC-ADM-02-1/2 | §6.1、§5.4.1、API #1 |
| FR-ADM-02 详情三页签、子女就地编辑与校验 | §6.2 L181–190、L195–196；AC-ADM-02-3/4 | §6.2、§5.4.2、API #2/#7 |
| FR-ADM-02 新建会员（家长 + 多子女）、逐个查询 | §6.2 L190 | §6.3、§5.4.3、API #3 |
| FR-ADM-02 解绑二次确认、家长端不可见、报告保留 | §6.2 L191–192、L196；AC-ADM-02-5 | §6.4、§4.3、§7.2、API #9 |
| BR-02 一家长一行、子女独立档案 | L99 | §3.1、§3.2 |
| BR-11 证件 18 位 + 生日一致 | L107 | §4.5、§5.3 |
| BR-13 列表一列一字段、筛选交集 | L109 | §6.1、§5.1 |
| BR-14 移除「恢复演示数据」 | L110 | §1.2、§6.5 |
| §8.2 parent/child 字段 | L436–468 | §3.5 |
| §8.3 查询状态机 | L522–533 | §4.2 |
| §9 接口分组、写接口校验/权限/审计/身份证全号单独授权 | L539–557 | §5.1–§5.4 |
| §10 数据权限、脱敏、全号审计、文件与接口归属 | L581–590 | §2.4、§3.4、§5.4.6、§7.2 |
| §12 会员列表/详情/子女编辑验收 | L611 | §6、acceptance §2 |
| Q1–Q10 已确认决策 | 需求 §9 | §0、ADR 0002 |

## 10. 测试命令与门禁（按 `docs/QUALITY.md` 分级）

> 本模块涉及 schema / 认证 / 权限 / C-B 跨端契约 → 「schema / 认证 / 权限」级：定向 Vitest + 真实 PocketBase 新库烟测 + B/API 类型检查 + 页面人工烟测。

| # | 命令 | 覆盖 |
| --- | --- | --- |
| 1 | `pnpm vitest run test/talent-member-domain.test.ts` | 三件套（密文可解、哈希稳定、归一化、脱敏）、校验（手机号/18 位/生日一致/未来生日/枚举）、编号生成与不可改、`sanitize` 不含 cipher/hash、一孩一家长与重绑、归属解析、状态迁移、解绑归档 |
| 2 | `pnpm vitest run test/talent-member-domain.test.ts` | 四态迁移、三类 reason、回执幂等/迟到/无归属/已解绑丢弃、30s 节流、`found` 再查 422、停用家长 409、超时转换（注入 `timeoutHours`/`now`）、Mock 五种模式 |
| 3 | `pnpm vitest run test/talent-member-api.test.ts` | 13 条路由文件清单与权限码映射、静态段优先于旧 `[resource]`、无导入/导出/恢复演示数据路由、9 个权限码 ↔ C/F 菜单行、「会员管理」菜单唯一且重指向、旧 `talent:customer:*` 保留、响应不含 `Cipher/Hash` 键 |
| 4 | `pnpm vitest run test/talent-customer-relations.test.ts test/talent-admin.test.ts` | 回归：旧会员关系与旧管理资源未被改坏 |
| 5 | `pnpm typecheck` | 类型、`shared/types/talent-member.ts`、页面与 API 一致性 |
| 6 | `pnpm lint` | 代码规范 |
| 7 | `export POCKETBASE_DATA_DIR="$(mktemp -d /tmp/tongjia-m2-XXXXXX)" && pnpm env:doctor && pnpm env:setup` | 新库初始化；断言 §3.3 索引全部存在、旧集合/旧索引仍在 |
| 8 | `pnpm talent:sync`（连续两次） | 存量库幂等（只加不删）；旧 `talent_customers`/`_bindings` 结构未变；菜单/权限码不重复；9 码均有 C/F 行 |
| 9 | `pnpm talent:member:seed`（可选，本地演示） | 幂等种子：4 状态、已解绑、停用、未绑定各 1 条 |
| 10 | `pnpm pb` + `pnpm dev`，登录后人工烟测 `/admin/talent/member` | 8 列、四筛选交集/重置、详情三页签、新建（多子女）、就地编辑（AC-02-3/4）、解绑确认（AC-02-5）、全号权限与审计、四种空态、错误态 |
| 11 | API 归属/安全直连 | 未登录 401；审核员写接口 403；无全号码查看 403 且无成功日志；跨家长子女 404；GET bindings 前后行数不变；停用/解绑后 items 消失 |
| 12 | `git diff --check` | 空白错误；确认只改 `docs/specs/M2-members/` 与 `docs/adr/`（本任务） |

- 旧 e2e 02–05 覆盖旧会员/规则页，**M2 不纳入门禁**；M9 重写。
- 种子未就绪时，页面与计数类条目只能记「未验证」。
- 生产环境变量核对：`ENCRYPTION_KEY` 已配置；`TALENT_GENE_QUERY_MOCK_MODE` 在生产必须切真实源（M8）。

## 11. 实施顺序（4–5 人天）

1. **契约冻结（0.5d）**：`shared/types/talent-member.ts` 枚举/类型/响应；9 个权限码 + C/F 菜单 + `TALENT_PATHS`；与 M3/M7 同步 id 与 bindings 契约（本 spec §7.3/§8）。
2. **数据层（1d）**：`talent_parents` / `talent_children` 集合、索引、关系进 `setup.mjs` + `sync-talent.mjs`（只加不删）；`talent-member-crypto.ts`（三件套 + 自检）；`talent-member.ts`（校验/编号/映射/重绑/归属）；`test/talent-member-domain.test.ts`。
3. **服务端 CRUD 与审计（1d）**：11 条管理路由（Zod 422 / 权限 / `withOperLog` / `success`）；列表四筛选 + 两段查询 + 状态计数；新建多子女；解绑；全号接口；`test/talent-member-api.test.ts`。
4. **查询状态机（1d）**：`talent-member-query.ts` + Mock 五模式 + 回执守卫 + 超时扫描 + 插件；`test/talent-member-domain.test.ts`；bindings 只读重建 + `claim`。
5. **B 端页面（1.5d）**：列表（8 列 + 四筛选，AC-02-1/2 最硬）→ 详情三页签 + 就地编辑（AC-02-3/4）→ 新建/编辑表单 → 解绑确认（AC-02-5）→ 全号查看与权限；`useTalentMemberApi.ts`；人工烟测。
6. **收口（0.5d）**：`scripts/seed-talent-member.mjs`；`git diff --check`；文档同步（`docs/API.md` / `ARCHITECTURE.md` / `STATUS.md` / `TALENT-LOCAL.md`，由 lead 派发）；verifier 填 acceptance 证据。

- 建议先做 2 → 3：M3/M7 等这套 id 与字段，先冻结可并行；页面放后面避免返工；页面内部先列表 + 四筛选，再详情。

## 12. 风险与处置

| # | 风险 | 处置 |
| --- | --- | --- |
| R1 | 旧 `talent_reports.customerId` 指向旧集合，新档案「关联报告」无数据 | M2 只做空态与 `reportCount=0`，禁止按 `customerId` 回查；M3 用 `subjectType/subjectId` 重建（§8） |
| R2 | 旧 C 端 bindings 在 GET 里写绑定、按手机号自动建立绑定（历史版本命中多档全绑） | 新 bindings GET 只读、claim 显式写唯一 parent；旧逻辑不再被调用；列 M2 安全验收项（acceptance.md §2.3 A1） |
| R3 | 旧身份证仅 SHA-256，无法还原全号 | 旧数据不迁移（Q1）；新数据三件套一次到位；文档与 ADR 写明不可逆 |
| R4 | `ENCRYPTION_KEY` 缺失/轮换导致密文不可解、哈希不可比 | 启动自检 + 解密失败不降级明文；轮换/迁移归运维另立任务（ADR D5） |
| R5 | 多家长共看一个孩子（父母双账号）诉求 | Q2 单 `parentId`；服务层写约束，未来加关系表需新 ADR |
| R6 | 新路由与 `[resource].get.ts` 动态段冲突 | §5.7 实现后定向验证；冲突则独立目录 `server/api/admin/talent-member/**` 并追加修订 |
| R7 | 1000 条 ≤2s：子女姓名筛选需两段查询 | §3.3 索引（`parentId` / `status` / `mobileHash` / `query`）；两段查询先收敛 parentIds 再分页；M9 性能验收 |
| R8 | 「解绑/停用立即失效」在 M7 前无法端到端证明 | M2 用 API/服务测试证明 bindings 与归属解析；页面验收留 M7/M9 |
| R9 | 旧 C 端页面在新 bindings 契约下不可用 | 迁移期明确不作为 M2 验收对象（§7.3）；M7 重建页面、M3 重建报告归属；不在 M2 打兼容补丁 |
| R10 | 同号多档（旧数据/多家长）无法自动绑定 | claim 返回 `ambiguous` + 后台提示合并；M2 不做自动合并接口（Q3），人工处理 |
| R11 | Mock 回执依赖进程内定时器，重启丢失 | Mock 允许；超时扫描最终把 `querying` 转 `api_error`；M8 真实源用 HTTP 回执 |

## 13. 未决项

| # | 未决项 | 现状 / 本文处理 | 需谁裁决 |
| --- | --- | --- | --- |
| C1 | PRD §10.2 写「手机号、身份证默认脱敏；全号查看需独立权限」，但未明确手机号全号是否开放 | M2 只开放**身份证**全号单项接口（`talent:parent:idno`）；手机号全号不提供（编辑不回显、列表脱敏、无界面入口）。如客户要求手机号全号，另加独立权限码与接口（避免与证件全号共用审计口径） | 客户 / PRD 定稿 |

> 除 C1 外无未决项：Q1–Q10 均已确认并落入 §0 与 ADR 0002；M3（报告归属）、M7（C 端页面）、M8（真实查询源）是已约定的里程碑边界，不阻塞 M2 开工。

## 14. 文档同步清单（M2 出口，由 lead 派发，不在本任务写范围）

- `docs/API.md`：13 条新路由 + 认证/权限列；旧 `/customer` 路由标注「M6 删除」。
- `docs/ARCHITECTURE.md`：集合表新增 `talent_parents` / `talent_children`；旧集合标注「保留到 M6」。
- `docs/STATUS.md`：集合数、路由数、权限码数、种子数据规模。
- `docs/TALENT-LOCAL.md`：会员域 Mock 查询模式（`TALENT_GENE_QUERY_MOCK_MODE` 等）与种子命令。
- `docs/specs/M2-members/acceptance.md`：verifier 填证据表。
- `app/DESIGN.md`：如新增页面模式（详情三页签 + 就地编辑）与现有条款无冲突，则不改；有新增通用约定时补一条。