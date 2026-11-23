# M2 会员域 · 验收与追溯

> 状态：**验收完成（2026-11-17，verifier 独立验收）**。结论见 [§7](#7-结论verifier)。本文是 M2 的验收合同：追溯表给范围与计划落点，证据表记录命令 / 退出码 / 观察结果。
> 依据：[M2 会员域规格](spec.md)、[ADR 0002](../../adr/0002-m2-member-domain.md)、[M2 需求分析](requirements.md)、PRD §6.2（L164–196）/ §8.2（L436–468）/ §8.3（L522–533）/ §9（L539–557）/ §10（L581–590）/ §12（L604–616）、`docs/QUALITY.md` 风险分级。
> 状态取值只允许：`通过` / `未通过` / `未验证` / `不在范围` / `待裁决`。`未通过` 必须给出文件与行号；`未验证` 必须在 §5 写阻塞原因。
> 口径修正（2026-11-17 用户调整）：菜单不再是「6 组 11 菜单」旧口径。当前为 **2 个一级 C 菜单（工作台 / 会员管理）+ 4 个 M 分组（天赋规则 / 报告管理 / 系统管理 / 运行监控）**；「平台会员」统一改称「会员管理」；培养方向管理归入「天赋规则」；系统管理 / 运行监控仅 superAdmin 可见。

## 1. 范围与前置

**验收对象**

- 集合：`talent_parents`、`talent_children`（含 §3.3 索引、关系、状态枚举、三件套字段）。
- 服务端：spec §5.2 的 13 条路由（11 条管理 + 2 条 C 端）+ 1 条静态段优先只读探针（`GET /children/:id`，不属于 13 条业务路由）；查询状态机 / Mock 源 / 超时扫描、三件套加解密与脱敏、菜单 / 权限种子。
- B 端：`/admin/talent/member` 列表（8 列 + 四项筛选）、详情三页签、新建 / 编辑、子女就地编辑、解绑二次确认、全号查看。
- C 端契约：`GET /api/client/talent/bindings` 只读、`POST /api/client/talent/bindings/claim` 显式认领；不验收 C 端页面（M7）。

**前置依赖**

1. 实现任务 M2-A（数据层）/ M2-B（API + 权限菜单）/ M2-C（B 端页面）已完成。
2. 演示环境：PocketBase `127.0.0.1:8090`、Nuxt `127.0.0.1:3000`；账号 `superAdmin / laizhi066`（超管）、`admin / admin123`（客户管理员）。本轮实测时两者均在线。
3. 新库烟测使用 `mktemp -d` 新建的空目录（`POCKETBASE_DATA_DIR=/tmp/tj-m2-newdb-data-X8PlZm`、`POCKETBASE_MIGRATIONS_DIR=/tmp/tj-m2-newdb-mig-hff2pq`，`POCKETBASE_URL=http://127.0.0.1:8093`），未触碰真实 `pb_data/`；结束后已删除临时目录。
4. 三角色正式授权属 M6；本轮权限验收用 `superAdmin` / `admin` 与临时只读角色。
5. C 端页面（M7）、报告归属（M3）、真实第三方查询（M8）不在范围。

## 2. 追溯表

> 「实现（实际）」已由 verifier 核对文件；「测试 / 证据」见 §4 证据编号 E1–E13。页面运行态本轮按 lead 指示未复跑 Playwright（见 §5 U1）。

### 2.1 AC-ADM-02-1..5（PRD §6.2 L177–196）

| 需求 | 实现（实际） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| AC-ADM-02-1 会员列表 8 列一列一字段、无副行堆叠 | `app/pages/admin/talent/member/index.vue:83-164`（会员编号 / 家长 / 手机号 / 家长身份证 / 名下子女 / 关联报告 / 账号状态 / 操作，共 8 列） | `GET /api/admin/talent/members` | E10 列表返回 `parentNo/name/maskedMobile/maskedIdNo/childCount/reportCount/statusLabel` 一一对应；E12 静态核对列定义。页面渲染未复跑 | 通过（接口 + 静态；页面运行态见 §5 U1） |
| AC-ADM-02-2 四项筛选可叠加、重置后恢复全量 | 筛选区 `index.vue:320-349`；`statusOptions` 带 `statusTotal` / `statusCounts`（`index.vue:61-65`）；`handleReset` 回第 1 页（`index.vue:210-217`） | `GET /members?name=&mobile=&childName=&status=` | E10 实测：`name=演示`→1、`mobile=0001`→1、`childName=演示子女一`→1、`status=1`→1、`status=0`→0、四条件叠加→1；`statusTotal=1=正常 1+停用 0` | 通过（接口 + 静态；页面重置交互未复跑） |
| AC-ADM-02-3 编辑子女保存后变「查询中」，回执到达后就地刷新 | 保存后按 `requery` 发起查询（`children/[id].put.ts`）；详情 2s 轮询、最多 60s（`MemberDetailModal.vue:290-297`、`643`） | `PUT /children/:id` + Mock 回执 | E2 单测覆盖状态机 / 回执；E10 实测改姓名→`requery=true`、`query=querying` | 未验证（页面自动刷新交互需浏览器；本轮未复跑） |
| AC-ADM-02-4 编辑态不回显脱敏证件号、留空不修改 | 就地编辑面板 `MemberChildEditPanel.vue:173-245`，提示「原证件已脱敏，不修改请留空」（`:231`）；服务层留空不改 | `PUT /children/:id` | E10 实测仅改关系 `requery=false`、非法证件 422；E2 单测覆盖留空不改 / 三件套不变 | 通过（接口 + 静态；面板运行态未复跑） |
| AC-ADM-02-5 解绑需二次确认，确认后家长端不可见 | 确认框文案 `MemberDetailModal.vue:392-394`（家长端立即不可见 / 历史报告保留 / 档案保留可复用）；`POST /children/:id/unbind` | `POST /children/:id/unbind`、`GET /client/talent/bindings` | E10 实测解绑 200（`status="2"`）、重复解绑 200 `alreadyUnbound=true`、详情子女数变 0；E2 单测覆盖 bindings 剔除 | 通过（接口 + 静态；确认框交互未复跑） |

### 2.2 FR-ADM-02 功能条目（PRD §6.2）

| 需求 | 实现（实际） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 详情弹层：顶部信息条 + 三页签（名下子女 / 关联报告 / 账号资料） | `MemberDetailModal.vue:610-614`（三页签，带数量）；顶部信息条同文件 `558` 起 | `GET /members/:id` | E10 详情 200：`children=2`、`counts={"children":2,"reports":0}`、`account.bound=false`；E12 静态核对页签 | 通过（接口 + 静态；弹层运行态未复跑） |
| 名下子女表：子女 / 关系 / 身份证 / 查询状态（含原因）/ 关联报告份数 / 编辑·重查·解绑 | 详情子女表列定义 `MemberDetailModal.vue:196-256`；操作列 `:145` | `GET /members/:id` | E10 子女响应仅含 `maskedIdNo` 与 `query/queryReasonLabel`，无 cipher/hash；E11 单测覆盖四态与三类 reason | 通过（接口 + 单测 + 静态） |
| 新建会员：家长资料 + 多名子女（≥1），保存后逐个发起查询 | `MemberFormModal.vue:351-487`（家长 + 动态子女行，`添加子女` `:420`）；`members/index.post.ts` 逐个发起 | `POST /api/admin/talent/members` | E10 实测 200「已创建会员，1 名子女正在查询」，`queries[0].accepted=true`、首个子女 `query=querying` | 通过（接口 + 静态；表单运行态未复跑） |
| 子女编辑字段与校验：姓名*/性别/关系/生日*/身份证*；18 位 + 生日一致 | `MemberChildEditPanel.vue:173-245`；服务层 Zod / 服务校验 | `PUT /children/:id`、`POST /members/:id/children` | E2 单测 + E10 实测非法 18 位证件 422、仅改关系 `requery=false` | 通过 |
| 行内操作：详情（主）、编辑、停用/启用（Q9） | `index.vue:142-163`（详情/编辑/停用启用，按权限显示）；停用二次确认 `index.vue:277-301` | `PUT /members/:id/status` | E10 实测停用/启用均 200 且 `statusLabel` 正确；E2 单测覆盖状态语义 | 通过（接口 + 静态；确认框交互未复跑） |
| 业务规则：一家长一行；子女独立档案（`parentId`）；解绑后不可见、历史报告保留 | `talent_parents` / `talent_children` 两集合（setup.mjs:585、628）；解绑只改 `parentId/status/unbindAt/unbindBy` | — | E7 新库两集合字段与 9 索引；E10 解绑后详情不含该子女；`childIds/childRelations` 在 M2 新代码中 0 处引用（grep） | 通过 |
| 全号查看：独立权限 + 单项接口 + 审计 | `members/[id]/id-no.get.ts`、`children/[id]/id-no.get.ts`（先鉴权后审计）；`talent:parent:idno` | 两个全号路由 | E10 家长/子女全号均 200 且与种子一致；`oper_logs` 每次一条（143→145），标题含对象编号/姓名、**无 11/18 位明文**；E13 临时只读角色 403 且该用户 0 条日志 | 通过 |
| 家长/子女状态展示：正常/停用；账号资料页签含来源、注册时间、子女数、报告数 | `MemberDetailModal.vue:685-702`（账号资料 9 项 + 登录账号 `:269`） | `GET /members/:id` | E10 详情含 `statusLabel/sourceLabel/registeredAt/counts.children`，未绑定账号时 `account.bound=false` | 通过（接口 + 静态；页签运行态未复跑） |

### 2.3 补充验收（口径见需求 §8 与 spec §9 验收映射）

#### A1 安全：敏感字段与日志

| 需求 | 实现（实际） | API / 位置 | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 库内无明文手机号/身份证；只有 cipher/hash/masked | `server/utils/talent-member-crypto.ts` + 服务层即时加密 | 两个集合 | E9 新库种子后直接查 PB：三件套齐全、`plain11=0`、`plain18=0`；E2 单测覆盖密文可解 / 哈希稳定 / 脱敏 | 通过 |
| 任何响应不含 cipher / hash | `sanitizeTalentParentRecord` / `sanitizeTalentChildRecord`（全路由统一） | 全部 13 条路由 | E10 列表 / 详情 / bindings 响应递归扫描：键名 0 个 `Cipher` / `Hash`、值 0 个 `hex:hex:hex`；E2 单测覆盖 | 通过 |
| 无权限看全号 → 403 且无「成功」日志 | 先 `requirePermission` 再 `withOperLog`（`members/[id]/id-no.get.ts:14-16`、`children/[id]/id-no.get.ts:14-16`） | 两个全号路由 | E13：临时只读角色请求全号 → 403「无权限访问」，该用户 `oper_logs` 前 0 / 后 0 条 | 通过 |
| 全号日志不含明文；日志不记手机号/证件号 | `withOperLog` 只记标题 / 类型 / 状态 / 耗时（`server/utils/withOperLog.ts:38-47`），摘要只用 `parentNo` / 子女姓名 | `oper_logs` | E10：日志标题「查看会员证件全号（家长 P202611160001）」「查看子女证件全号（子女 演示子女一）」，正则扫 11/18 位明文命中 `false` | 通过 |
| 解密失败不降级明文；`ENCRYPTION_KEY` 缺失时报错 | `assertTalentMemberCryptoReady` + 解密异常 500 | 服务层 | E2 单测「解密失败抛 500 且不回退明文、不回显密文」「ENCRYPTION_KEY 缺失自检抛错」 | 通过 |
| GET bindings 只读（无写入） | `server/api/client/talent/bindings.get.ts` 纯读 | `GET /api/client/talent/bindings` | E10 连续 3 次调用：`talent_parents` / `talent_children` / `talent_customer_bindings` 行数与 `updatedMax` 全部不变；E2 单测同样覆盖 | 通过 |
| claim 只写唯一 parent 的 `userId`；不绑多个 | `bindings/claim.post.ts` + 服务层 | `POST /api/client/talent/bindings/claim` | E10 实测 `no_phone` / `bound`（写入 userId 且 items=3）/ `already_bound` / `no_match` / `conflict`（409）；`ambiguous` 因 `mobileHash` 唯一索引实时库无法造数，由 E2 单测（内存 PB）覆盖 | 通过（ambiguous 为单测证据） |

#### A2 权限

| 需求 | 实现（实际） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 未登录 → 401；无权限 → 403 | `requirePermission` | 11 条管理路由 | E10：无 token → 401；E13：仅 list/view 的临时角色 新建 / 全号 → 403 | 通过 |
| 报告审核员只读：列表/详情 200，写接口 403，全号 403 | 角色授权（M6 前用自定义角色验证） | 全部管理路由 | E13 临时只读角色：列表 200 / 详情 200 / 新建 403 / 全号 403 | 通过（以自定义只读角色近似） |
| 规则配置员无菜单且接口 403 | 菜单不授予 + `requirePermission` | 菜单 + API | 未造规则配置员角色；M6 三角色授权 | 未验证（依赖 M6，仅静态确认菜单不授予 + 权限码独立） |
| 9 个权限码均有 C/F 菜单行；「会员管理」菜单唯一且重指向新页 | `setup.mjs:85-95`、`147-155`；`sync-talent.mjs:570-625` 断言 | 菜单种子 | E7 新库 9 码各 1 条 C/F 行（list=C，其余 8=F）、`/admin/talent/member` C 菜单唯一 1 条；E10 admin 权限 35 个含全部 9 码；E8 `talent:sync` 断言通过 | 通过 |
| 旧码/旧页保留、未被改语义 | 旧路由与旧页不修改 | `/api/admin/talent/customer` | E10 旧 `GET /api/admin/talent/customer` 仍 200 且为旧结构（无 `statusCounts`）；旧 `app/pages/admin/talent/[resource].vue`、旧 `[resource].get.ts`、`bindings/[customerId].put.ts` 仍在；E7 旧 6 个集合仍在，旧 `talent:customer:*` 9 条菜单行保留 | 通过 |

#### A3 失效

| 需求 | 实现（实际） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 停用家长后 bindings 不含本人与子女 | bindings 过滤 `status="1"` | `PUT /members/:id/status`、`GET /bindings` | E2 单测覆盖停用 / 解绑后 items 消失；E10 停用 / 启用接口 200 | 通过（单测证据） |
| 解绑后子女不在 bindings | bindings 过滤 `status="1"` 子女 | `POST /children/:id/unbind`、`GET /bindings` | E2 单测；E10 解绑后详情子女数 0、重复解绑幂等 | 通过（单测 + 接口） |
| 跨家长访问他人子女 → 404（不泄露存在性） | `assertTalentChildAccess` | 服务层 | E2 单测覆盖「他人子女 / 不存在均 404、本人通过」 | 通过（单测证据） |
| 停止家长后不再发起新查询 | `submitTalentChildQuery` 校验 parent.status | `POST /children/:id/query` | E2 单测覆盖家长停用 409、found 再查 422、节流幂等 | 通过（单测证据） |

#### A4 校验

| 需求 | 实现（实际） | API | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 手机号格式错误 → 422 | Zod + 归一化 | 新建 / 编辑家长 | E10 实测 `mobile=123` → 422；E2 单测覆盖 `+86` 归一化 | 通过 |
| 身份证 18 位不符 → 422 | Zod | 新建 / 编辑家长 / 子女 | E10 实测子女证件 `123` → 422；E2 单测覆盖 17 位 / 字母 / 末位 X | 通过 |
| 证件生日与出生日期不一致 → 422 | 服务层校验 | 新建 / 编辑家长 / 子女 | E2 单测覆盖不一致 / 家长填证件未填生日 / 未来生日 | 通过（单测证据） |
| 重复手机号 / 身份证 → 409 指明字段 | 唯一索引 + 冲突转 409 | 新建 / 编辑 | E10 实测同手机号 → 409「该手机号已存在家长档案，请在后台核对合并」；同证件子女 → 409；E2 单测覆盖重绑复用 | 通过 |
| 新建子女数 0 或 >10、同请求重复身份证 → 422 | Zod + 服务层 | `POST /members` | E10 实测 `children=[]` → 422；E2 单测覆盖 11 名 / 重复证件 | 通过 |
| 编辑提交不同 `parentNo` → 422 | 服务层校验 | `PUT /members/:id` | E10 实测 → 422「会员编号不可修改」 | 通过 |
| `found` 状态再次查询 → 422；`querying` 重查幂等；30s 节流 | 状态机 | `POST /children/:id/query` | E10 实测 found 再查 → 422「已查到结果的子女无需重复查询」；E2 单测覆盖 querying 幂等 / 30s 节流 / 超时转换 | 通过 |

#### A5 空态 / 边界

| 需求 | 实现（实际） | 页面 | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 无会员 → 空态可新建 | 列表空态 `index.vue:351-364`（「暂无会员…」+「新建会员」） | `/admin/talent/member` | 代码静态核对；页面运行态未复跑 | 未验证（页面运行态，见 §5 U1） |
| 无子女 → 空态可新增；无报告 → 空态；未注册 → 未绑定账号提示 | `MemberDetailModal.vue:658`（子女空态）、`:679`（报告空态）、`:269`（未绑定账号提示） | 详情弹层 | 代码静态核对；页面运行态未复跑 | 未验证（页面运行态，见 §5 U1） |
| 筛选无结果 → 空态 + 重置 | `index.vue:351-364`（`hasFilters` 分支 +「重置筛选」） | 列表 | 代码静态核对；E10 四筛接口可复现 0 结果 | 未验证（页面运行态，见 §5 U1） |
| 加载态 / 错误态 / 无权限态 | `AdminListPage` 的 `loading/error`；`permission-guard` 中间件 | 列表与详情 | 代码静态核对；页面运行态未复跑 | 未验证（页面运行态，见 §5 U1） |

#### A6 工程红线

| 需求 | 实现（实际） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- |
| 单实例单 PB / 无多租户 | 全量 diff | 新 M2 文件 grep `TENANT_MODE` / `X-Site-Slug` / `site cookie` 0 命中；无第二个 PB 连接 | 通过 |
| 只落 `talent_*`，不回填 `users`/`configs`/`site_config` | 两个新集合；`users` 仅被关系引用 | grep：M2 新文件对 `users/configs/site_config` 仅 `users` 只读（详情账号展示），0 写入；E7 集合清单 | 通过 |
| 旧集合 / 旧页 / 旧码不删不改（M6 清理） | 旧文件与旧集合不动 | E10 旧路由 200 旧结构；旧页 / 旧路由文件仍在；`setup.mjs` 旧集合定义未被删除（diff 中 0 处删除 `talent_customers` 定义） | 通过 |
| `setup.mjs` 只用于空库；存量走 `sync-talent.mjs` 只加不删 | 新库 / 存量两条路径 | E6 空库 `env:setup` 成功；E8 连续 sync 只加不删、无删除动作 | 通过 |

### 2.4 PRD §12 / §9 / §10 条目映射

| 需求 | 实现（实际） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- |
| 会员列表 8 列、四筛选交集、详情三页签、子女就地编辑与校验 | 同 §2.1 | E10 接口 / E12 静态 / E2 单测 | 通过（接口与静态；页面运行态见 §5 U1） |
| 菜单可见性与角色一致（M2 子集），停用即时生效 | 新菜单口径：superAdmin 6 个顶层入口；admin 4 个顶层入口（工作台 / 会员管理 / 天赋规则 / 报告管理） | E10 bootstrap：superAdmin 顶层=工作台/会员管理/天赋规则/报告管理/系统管理/运行监控；admin 顶层=工作台/会员管理/天赋规则/报告管理，侧栏路径 7 个且无系统/监控/日志；菜单 `status="0"` 即时隐藏逻辑沿用底座（本轮未复跑页面） | 通过（bootstrap 实测；动态隐藏未复跑） |
| 写接口参数校验、权限校验、审计日志（PRD §9 L555–556） | `validateBody` / `requirePermission` / `withOperLog` | E2 单测逐路由断言；E10 实测写接口 200 / 400+ 错误码 + `oper_logs` 增长（全号 143→145、会员新建/编辑/解绑日志可见） | 通过 |
| 身份证全号单独授权 | `talent:parent:idno` 独立码 + 两个单项接口 | E10 / E13 / E2 单测 | 通过 |
| 数据权限：本人 + 已绑定子女；解绑/停用立即失效 | bindings 过滤 + `assertTalentChildAccess` | E2 单测；E10 bindings 只读与 claim 分支 | 通过（单测证据） |
| 敏感字段默认脱敏；数据库存加密值 | 三件套 | E9 / E2 / E10 | 通过 |
| 关键动作审计：子女解绑、账号停用 | `withOperLog` | E10 解绑 / 停用 / 全号动作日志可见 | 通过 |

### 2.5 M2 出口（schema / 环境 / 幂等）

| 出口项 | 实现（实际） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- |
| 新库 `env:setup` 建两集合与 §3.3 全部索引 | `scripts/setup.mjs:585-685`、`:1556-1600` | E6 退出码 0：「✓ 基础版初始化完成：47 个集合」；E7 两集合索引 9 条齐全（5 + 4），旧 6 个集合仍在 | 通过 |
| `talent:sync` 连续两次幂等、只加不删 | `scripts/sync-talent.mjs` | E8 连续 3 次退出码 0；第 2、3 次运行后状态快照 JSON 完全一致（`inspect-diff2` 无差异）；旧集合结构未变。附注：空库 setup 后第一次 sync 会为 superAdmin 补 7 条 `role_menus` 关联（109→116），属首次对齐而非业务数据写入 | 通过（附注见 §5 D4） |
| 路由静态段优先（新 `/members`、`/children` vs 旧 `[resource]`） | 独立目录路由 | E10：`GET /members` 返回新结构；`GET /children/nonexistent` 返回 404「子女档案不存在」（非「天赋资源不存在」）；旧 `/customer` 200 旧结构；E2 单测断言路由文件清单 | 通过 |
| 响应不含 cipher/hash；GET bindings 无写入 | 映射层 + 只读路由 | E10 递归扫描 + 3 次调用无写入；E2 单测 | 通过 |
| 本地演示数据脚本幂等、纯虚构、拒绝生产 | `scripts/seed-talent-member.mjs` | E9：连续两次 seed 后仍 1 家长 / 2 子女（4 状态子集见 §5 D3）；`NODE_ENV=production` 退出码 1 拒绝运行；号码为虚构号段 | 通过（覆盖范围偏差见 §5 D3） |
| 文档同步（API / ARCHITECTURE / STATUS / TALENT-LOCAL） | M2 出口由 lead 派发 | 2026-11-17 lead 已补：API 增加 M2 14 条路由；ARCHITECTURE 增加两集合；STATUS 更新 213 路由/47 集合/33 文件 318 用例；TALENT-LOCAL 增加 member seed 命令 | 通过（补后复验） |

## 3. 测试命令（按 `docs/QUALITY.md` 分层）

> M2 涉及 schema / 认证 / 权限 / C-B 跨端契约 → 「schema / 认证 / 权限」级：定向 Vitest + 真实 PocketBase 新库烟测 + B/API 类型检查 + 页面人工烟测。以下命令均在仓库根目录执行。

| # | 命令 | 覆盖 | 本轮 |
| --- | --- | --- | --- |
| 1 | `pnpm vitest run test/talent-member-domain.test.ts` | 三件套、校验、编号、脱敏映射、重绑、归属、状态机、解绑归档（含原计划的 query 用例） | 已跑（合并执行） |
| 2 | `pnpm vitest run test/talent-member-query.test.ts` | 四态 / 三类 reason / 回执守卫 / 节流 / 超时 / Mock 五模式 | 文件不存在；用例已并入 `talent-member-domain.test.ts`（见 §5 D1） |
| 3 | `pnpm vitest run test/talent-member-api.test.ts` | 路由清单与权限码、静态段优先、9 码 ↔ C/F 菜单、菜单唯一重指向、响应无 cipher/hash、404/409/422、bindings/claim | 已跑 |
| 4 | `pnpm vitest run test/talent-customer-relations.test.ts test/talent-admin.test.ts` | 旧会员关系与旧管理资源回归 | 已跑（含在全量 test 内） |
| 5 | `pnpm typecheck` | 类型一致性 | 已跑 |
| 6 | `pnpm lint` | 代码规范 | 未跑全量；已跑 M2 变更文件定向 eslint |
| 7 | `env:doctor` + `env:setup`（空目录 / 8093） | 新库初始化、索引与旧集合保留 | 已跑 |
| 8 | `pnpm talent:sync`（连续两次） | 存量库幂等（只加不删） | 已跑（连续 3 次） |
| 9 | `pnpm talent:member:seed` | 幂等虚构种子 + 拒生产 | 已跑 |
| 10 | `pnpm pb` + `pnpm dev` 页面烟测 | 页面类条目 | **未跑**（lead 指示收尾；M2-C 已报 35 项断言，见 §5 U1） |
| 11 | API 直连（401/403/404/409/422、GET 无写入、claim、停用/解绑失效） | 安全 / 权限 / 失效 | 已跑（37 项） |
| 12 | `git diff --check` | 空白与路径 | 已跑 |

## 4. 证据表（verifier 填写）

> 证据文件在 `/tmp/tj-m2-verify/`（不提交仓库）。E 编号在 §2 引用。
> 环境：本轮演示库 = 8090 PocketBase + 3000 Nuxt；新库 = 8093（临时目录，结束已删）。

| E | 需求 / 条目 | 命令或步骤 | 退出码 | 关键输出 | 结论 | 证据位置 |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | 静态类型 | `pnpm typecheck` | 0 | `nuxt typecheck` 无错误 | 通过 | `/tmp/tj-m2-verify/typecheck.log` |
| E2 | 定向 Vitest | `pnpm vitest run test/talent-member-domain.test.ts test/talent-member-api.test.ts` | 0 | 2 个文件 / **65 tests passed**（domain 47 + api 18） | 通过 | `/tmp/tj-m2-verify/member-tests.log` |
| E3 | 全量 Vitest | `pnpm test` | 0 | 33 个文件 / **318 tests passed** | 通过 | `/tmp/tj-m2-verify/full-test.log` |
| E4 | 变更文件 lint | `pnpm exec eslint <server M2 / page member / composable / scripts / tests>` | 0 | 无输出（0 error / 0 warning） | 通过 | `/tmp/tj-m2-verify/eslint.log` |
| E5 | 构建 | `pnpm build` | 0 | `✨ Build complete!`，`.output` 总计 17 MB | 通过 | `/tmp/tj-m2-verify/build.log` |
| E6 | 新库 env:setup | `POCKETBASE_BINARY=/tmp/tj-pb/pocketbase POCKETBASE_DATA_DIR=$(mktemp -d) POCKETBASE_MIGRATIONS_DIR=$(mktemp -d) POCKETBASE_URL=http://127.0.0.1:8093 pnpm env:doctor && pnpm env:setup` | 0 | `✓ 基础版初始化完成：47 个集合` | 通过 | `/tmp/tj-m2-verify/newdb-doctor.log`、`newdb-setup.log` |
| E7 | 新库集合 / 索引 / 旧集合 | 8093 PB SDK 只读检查 | — | PB 共 52 集合 = 47 业务 + 5 系统（`_mfas/_otps/_externalAuths/_authOrigins/_superusers`）；`talent_parents` 索引 5 条（含 2 条部分唯一）、`talent_children` 索引 4 条；旧 6 集合（customers / customer_bindings / import_batches / import_rows / leads / customer_authorizations）全部存在 | 通过 | `/tmp/tj-m2-verify/newdb-inspect1.json`、`newdb-inspect2.json`、`newdb-inspect3.json` |
| E8 | 存量同步幂等 | `pnpm talent:sync` 连续 3 次 + 每次后状态快照 | 0 / 0 / 0 | 第 2、3 次快照无差异（9 码菜单、116 条菜单、superadmin 116 条 role_menus 稳定）；第 1 次为 setup 后首次对齐（109→116，见 D4） | 通过（附注） | `/tmp/tj-m2-verify/newdb-sync1.log`–`sync3.log`、`inspect-diff2.txt` |
| E9 | 演示种子 | `TALENT_MEMBER_SEED_CONFIRM=member pnpm talent:member:seed` ×2；`NODE_ENV=production pnpm talent:member:seed` | 0 / 0 / 1 | 两次后 1 家长 / 2 子女（found + not_found/info_mismatch）；三件套齐全、`plain11=0/plain18=0`；生产环境拒绝（退出码 1） | 通过（覆盖偏差 D3） | `/tmp/tj-m2-verify/seed1.log`、`seed2.log`、`seed-prod.log` |
| E10 | 演示库 API 37 项 | `node /tmp/tj-m2-verify/api-probe.mjs`（superAdmin / admin 登录；临时档案测后清理） | 0 | **37/37 PASS**，含：bootstrap 菜单、列表 / 四筛 / 状态计数、详情、401、404、409×2、422×4、全号 + 审计无明文、bindings 3 次只读、claim no_phone/bound/already_bound/no_match/conflict、新建 / 子女冲突 409 / 编辑重查 / 解绑幂等 / 停用启用、临时只读角色 403、旧路由回归、清理恢复（1 家长 / 2 子女 / 3 账号，`parent.userId` 空） | 通过 | `/tmp/tj-m2-verify/api-probe.log` |
| E11 | 红线 / 空白 | grep `TENANT_MODE` / `X-Site-Slug` / `site cookie`、`childIds` / `childRelations`、`users` / `configs` / `site_config` 写入；`git diff --check` | 0 | 前三项 0 命中；`git diff --check` 无输出 | 通过 | `/tmp/tj-m2-verify/diff-check.log` |
| E12 | 页面结构（静态） | 代码核对页面组件 | — | 8 列 `index.vue:83-164`；四筛选 + 查询/重置 `:320-349`；列表空态 `:351-364`；详情三页签 `MemberDetailModal.vue:610-614`；解绑文案 `:392-394`；2s 轮询 `:290-297`；全号弹窗 `:725-740`；子女就地编辑 + 留空提示 `MemberChildEditPanel.vue:173-245,231`；新建表单 `MemberFormModal.vue:351-487` | 通过（静态） | 本文件 §2 行号 |
| E13 | 403 且无成功日志 | 临时只读角色（list/view）请求家长全号 → 403；查该用户 `oper_logs` | 0 | `{"idnoStatus":403,"message":"无权限访问","logsForUserBefore":0,"logsForUserAfter":0}`；临时角色 / 账号已清理 | 通过 | `/tmp/tj-m2-verify/auth-403-log.log` |
| E14 | 演示库恢复 | 探针结束后只读复核 | — | 1 家长（`P202611160001`，`userId` 空）/ 2 子女（found、not_found/info_mismatch）/ 3 账号 / 4 角色 / 3 user_roles；superAdmin、admin 手机号为空 | 通过 | `/tmp/tj-m2-verify/demo-restored.log` |

## 5. 未验证阻塞与遗留（verifier 回填）

### 5.1 未验证（本轮无直接运行证据）

| ID | 条目 | 阻塞原因 | 依赖 | 建议解封条件 |
| --- | --- | --- | --- | --- |
| U1 | AC-ADM-02-3（编辑后就地刷新 / 轮询）、AC-ADM-02-5 页面确认交互、详情三页签运行态、新建表单运行态、A5 全部空态 / 筛选重置 / 加载错误无权限态、页面 console error 0、Playwright 截图 | 按 lead 2026-11-17 指示收尾，**本轮未复跑 Playwright**；M2-C（task-14）已报「35 项页面断言」，但本 session 无可引用的落盘证据 / 截图路径 | 页面运行验收 | 复跑 M2-C 的 35 项断言或按本表 §3 #10 用 Playwright 截图（建议 `/tmp/tj-m2-shots/`）+ console error 0，补入 E12 |
| U2 | A2 规则配置员无菜单且接口 403 | 未创建规则配置员角色；三角色正式授权属 M6 | M6 | M6 建三角色后按 spec §2.1 矩阵复验 |
| U3 | 停用家长后 bindings 为空 / 跨家长 404 / 停用后查询 409 / 回执守卫等失效链路 | 本轮以单测（E2）为证据，未在演示库做端到端（避免污染种子） | — | 需要时在临时库或 Playwright 中补端到端证据 |

### 5.2 偏差 / 观察（不阻断通过，但需记录）

| ID | 需求 / 位置 | 偏差 | 建议 |
| --- | --- | --- | --- |
| D1 | spec §10 #2、acceptance §3 #2 | `test/talent-member-query.test.ts` 不存在；四态 / 回执 / 节流 / 超时 / Mock 用例已并入 `test/talent-member-domain.test.ts`「子女查询状态机」等 | 新增该文件或修正 spec / acceptance 的命令清单，避免门禁命令指向不存在文件 |
| D2 | spec §5.2（13 条路由） | 多 1 条 `server/api/admin/talent/children/[id].get.ts`（`GET /children/:id` 只读探针，`talent:parent:view`），用于 spec §5.7 第 3 条静态段优先验证；测试已声明「11 管理路由 + 1 探针 + 2 C 端」 | 在 spec §5.2 / §5.7 明确登记该探针路由（或改由既有路由验证后删除） |
| D3 | spec §3.6 | 种子只覆盖 2 种查询状态（found + not_found/info_mismatch）+ 1 家长 2 子女；未覆盖 spec 要求的「查询中 / 未查询 / 三类 reason 各 1 / 已解绑 / 停用 / 未绑定账号」 | 按任务口径（1 家长 + 2 子女）可接受；补种或修订 spec §3.6 |
| D4 | `scripts/setup.mjs:2572-2580` | 空库 `env:setup` 只给 superAdmin 关联 `seedMenus` 返回的 C 页面；4 个 M 分组 + 3 个机构页的 `role_menus` 要等第一次 `talent:sync` 才补齐（109→116）。因此「setup 后立即 sync」的第一次并非纯 no-op | 在 setup 的 seedFoundation 中按全部菜单关联 superAdmin，或文档明确「新库需再跑一次 `talent:sync`」 |
| D5 | spec §14 / acceptance §2.5 | ~~文档同步未完成~~ 2026-11-17 lead 已补：`docs/API.md` M2 14 条路由、`docs/ARCHITECTURE.md` 两集合、`docs/STATUS.md` 213 路由/47 集合/33 文件 318 用例、`docs/TALENT-LOCAL.md` member seed | 已处理；无需复验 |
| D6 | 演示库断言口径 | `ambiguous`（同号多档）在实时库因 `talent_parents.mobileHash` 唯一索引**无法造数**；仅单测（内存 PB）可复现 | 文档说明该分支属于存量 / 绕过索引数据；保留单测证据 |

## 6. 交接说明（给后续里程碑）

1. 页面运行态验收（U1）需补 Playwright 截图与 console error 0，建议落 `/tmp/tj-m2-shots/` 并在 §4 E12 补路径。
2. M6 三角色授权后复验 A2「规则配置员无菜单 / 接口 403」与菜单可见性矩阵；M7 消费 `TalentMemberBindingsResponse`（items / currentId / current / currentRelationType）。
3. M3 报告归属按 `subjectType/subjectId` 挂接 `talent_parents.id` / `talent_children.id`；解绑不删档保证历史报告可追溯（spec §8）。
4. 生产环境变量核对：`ENCRYPTION_KEY` 已配置；`TALENT_GENE_QUERY_MOCK_MODE` 在生产必须切真实源（M8）。

## 7. 结论（verifier）

**结论：PASS（有条件）。** M2-A/B/C 实现与门禁证据满足出口条件；页面运行态与文档同步两项需补证据后转为无条件通过。

- **通过（有证据）**：静态门禁 5 项（typecheck / 定向 65 tests / 全量 318 tests / 定向 eslint / build）全绿；新库 `env:setup` 47 集合 + 9 索引 + 旧集合保留；`talent:sync` 连续运行状态稳定（附 D4）；种子幂等且拒生产；演示库菜单口径正确（superAdmin 6 顶层 / admin 4 顶层）；API 37/37（401/403/404/409/422、四筛、全号审计无明文、bindings 只读、claim 分支、解绑幂等、旧路由回归）；红线检查通过；演示库已恢复种子（1 家长 + 2 子女）。
- **未通过（需处理）**：无（D5 文档同步已由 lead 于 2026-11-17 补齐）。
- **未验证（记录在案）**：U1 页面运行态 / Playwright 截图 / console error 0（lead 指示本轮收尾未复跑；M2-C 35 断言无落盘证据）；U2 规则配置员（M6）；U3 失效链路的端到端（有单测证据）。
- **通过率**：追溯表状态行 42 项中，`通过` 36 项、`未通过` 0 项、`未验证` 6 项（U1/U2/U3 与页面运行态细分）、`不在范围` 0 项、`待裁决` 0 项。

> 证据复现：`/tmp/tj-m2-verify/` 下 E1–E14 文件；临时库目录已于 2026-11-17 删除，复跑需按 §3 #7–#9 重建空目录。