# API 索引

> 最后按 `server/api/` 核对：2026-11-17（M1–M8 实现 + M6 旧口径清理后）。当前共 **170** 个路由文件：`admin` 133（其中天赋 67）、`client` 27（其中天赋 19）、`integrations` 3、`integration` 别名 2、`public` 1、`upload` 3、`health` 1。本文描述内部 API，不表示对外开放承诺。
> 现状数字与已知缺口见 [STATUS.md](STATUS.md)；数据对象见 [ARCHITECTURE.md](ARCHITECTURE.md#数据模型)；模块合同见 [specs/](specs/README.md)。

## 通用约定

- API 路径由 Nitro 文件路由生成；`.get.ts`、`.post.ts`、`.put.ts`、`.delete.ts` 分别对应 HTTP 方法。
- 成功响应统一为 `{ code: 200, message, data }`；列表统一返回 `{ rows, total, page, pageSize }`。
- 需要登录的接口使用当前 PocketBase 认证态；管理接口还会检查 RBAC 权限码，C 端业务接口还会校验家长/子女归属，越权一律 404。
- 除“公开与站点读取”、`GET /api/admin/theme` 及表中明确标为可选认证的接口外，所有当前路由都需要有效认证；`/api/admin/*` 中的管理资源还会检查相应菜单权限或超管身份。
- JSON 写接口使用 `validateBody()`（Zod）；multipart 上传接口自行校验文件字段、MIME 类型、10MB 大小上限与权限。管理写操作或账户资料接口会通过 `withOperLog()` 记录操作日志。
- 天赋写接口权限码只来自 M6 后的 35 个在册业务码（工作台 1 + M1 15 + M2 9 + M3 4 + M4 1 + M5 5），每个码都必须有 C/F 菜单行承载；旧 `talent:customer:*` / `talent:content:*` / `talent:institution:*` / `talent:plan:*` / `talent:service:*` / `talent:sync:*` 等 22 个码已随 M6 删除。
- 所有上传接口与其文件 URL 都基于唯一 PocketBase，不接受站点上下文。

## 公开与站点读取

| 方法 | 路径                      | 用途                             | 认证 |
| ---- | ------------------------- | -------------------------------- | ---- |
| POST | `/api/public/admin-login` | B 端管理员登录（账号名或邮箱）   | 否   |
| GET  | `/api/health`             | 应用探活；`?deep=1` 额外探测 PocketBase | 否   |
| GET  | `/api/client/config/site` | C 端读取品牌与主题 | 否   |

## C 端账户

| 方法 | 路径                              | 用途                            | 认证 |
| ---- | --------------------------------- | ------------------------------- | ---- |
| POST | `/api/client/auth/wx-login`       | 小程序微信授权登录 / 首次建户   | 否   |
| POST | `/api/client/auth/wx-phone-login` | 微信手机号一键登录 / 首次建户   | 否   |
| POST | `/api/client/auth/phone-login`    | 使用 PocketBase identity 和密码登录 C 端账户 | 否   |
| GET  | `/api/client/auth/profile`        | 获取当前中性账户资料            | 是   |
| PUT  | `/api/client/auth/profile`        | 更新当前账户资料                | 是   |
| POST | `/api/client/auth/delete-account` | 注销当前账户                    | 是   |
| POST | `/api/client/client-error`        | 上报 C 端错误记录               | 可选 |

账户注销会立即替换认证凭据并清除原始微信 / 手机号身份，当前 token 随即失效。服务端仅保留由 `ENCRYPTION_KEY` 派生的不可逆标记，因此同一认证身份不能绕过注销流程重新自动建户。

## B 端启动、主题与个人资料

| 方法       | 路径                              | 用途                              | 认证                           |
| ---------- | --------------------------------- | --------------------------------- | ------------------------------ |
| GET        | `/api/admin/bootstrap`            | 获取登录后的 B 端初始化资料与菜单 | 是                             |
| GET        | `/api/admin/theme`                | 读取后台初始明暗主题              | 否（仅返回主题标识与明暗状态） |
| PUT        | `/api/admin/theme`                | 保存后台明暗主题                  | 是，超级管理员                 |
| GET / PUT  | `/api/admin/profile`              | 读取 / 更新当前管理员资料         | 是                             |
| PUT        | `/api/admin/profile/password`     | 修改当前管理员密码                | 是                             |
| GET / POST | `/api/admin/settings/wechat`      | 读取 / 保存微信小程序认证配置     | 是，超级管理员                 |
| POST       | `/api/admin/settings/wechat/test` | 验证微信认证配置                  | 是，超级管理员                 |

## B 端系统管理

下表的“资源 CRUD”遵循列出的实际路由，不额外假设不存在的详情或列表接口。系统管理 / 运行监控菜单只授予 `superAdmin`，平台运营 / 报告审核 / 规则配置三角色不可见。

| 资源     | 当前路由                                                                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 用户     | `GET/POST /api/admin/user`；`GET/PUT/DELETE /api/admin/user/:id`；`PUT /api/admin/user/:id/roles`、`PUT /api/admin/user/:id/reset-pwd`、`PUT /api/admin/user/batch-status` |
| 角色     | `GET/POST /api/admin/role`；`GET/PUT/DELETE /api/admin/role/:id`；`PUT /api/admin/role/:id/menus`                                                                          |
| 菜单     | `GET /api/admin/menu/tree`；`POST /api/admin/menu`；`PUT/DELETE /api/admin/menu/:id`                                                                                       |
| 部门     | `GET /api/admin/dept/tree`；`POST /api/admin/dept`；`PUT/DELETE /api/admin/dept/:id`                                                                                       |
| 岗位     | `GET/POST /api/admin/post`；`PUT/DELETE /api/admin/post/:id`                                                                                                               |
| 字典类型 | `GET/POST /api/admin/dict/type`；`GET/PUT/DELETE /api/admin/dict/type/:id`                                                                                                 |
| 字典数据 | `GET/POST /api/admin/dict/data`；`PUT/DELETE /api/admin/dict/data/:id`；`GET /api/admin/dict/types/data`                                                                   |
| 参数配置 | `GET/POST /api/admin/config`；`PUT/DELETE /api/admin/config/:id`；`GET /api/admin/config/by-key/:key`                                                                      |

`site_config`、`system_theme` 和 `error_monitor` 是系统级配置，通用参数接口仍会要求超级管理员；其中 `site_config` 保存时会校验基础站点 schema，并以补偿方式同步 B/C 共用的品牌主色。`wechat_config` 不会出现在参数列表、通用按键读取或删除接口中，必须使用微信配置专用接口，响应中的 AppSecret 始终为掩码。

## B 端监控与审计

| 范畴     | 当前路由                                                                                                                                                                                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 系统健康 | `GET /api/admin/monitor/health`                                                                                                                                                                                                                                             |
| 在线用户 | `GET/POST /api/admin/monitor/online`；`PUT /api/admin/monitor/online/heartbeat`、`PUT /api/admin/monitor/online/offline`；`DELETE /api/admin/monitor/online/:id`                                                                                                            |
| 错误监控 | `GET /api/admin/monitor/error`、`GET /api/admin/monitor/error/stats`、`GET /api/admin/monitor/error/config`；`PUT /api/admin/monitor/error/config`、`PUT /api/admin/monitor/error/:id/status`；`POST /api/admin/monitor/error/clear`；`DELETE /api/admin/monitor/error/:id` |
| 登录日志 | `GET/POST /api/admin/log/login`                                                                                                                                                                                                                                             |
| 操作日志 | `GET /api/admin/log/oper`                                                                                                                                                                                                                                                   |

在线会话的全局查询与强制下线仍受 `monitor:online:list` 和超管保护；登录注册、当前账户心跳与主动离线仅更新自己的会话。C 端账户即使持有有效 JWT，也不能注册后台会话、清除强制下线标记或调用这些后台端点。强退会轮换 PocketBase 的 `tokenKey`，旧 JWT 会立刻失效。

## 天赋专项总览

天赋业务分为四层：规则域（M1）、会员域（M2）、报告域（M3，含方向匹配 M4 与培育建议 M5）、C 端门户（M7）与外部集成 / PDF（M8）。所有集合以 `talent_*` 命名，业务字段不写回 `users` / `configs` / `site_config`。

| 权限码组 | 数量 | 用途 |
| --- | --- | --- |
| `talent:dashboard:*` | 1 | 工作台入口码（M6 从 `talent:report:list` 拆出），对应 `talent:dashboard:list` |
| `talent:direction:*` / `talent:tier:*` | 6 | 培养方向 CRUD 与停用启用、目标档位（M1） |
| `talent:factor:*` / `talent:rule:*` | 9 | 潜质要素同步导出、分级与固定注解 CRUD/导入导出（M1） |
| `talent:parent:*` / `talent:child:*` | 9 | 会员详情 / 建档 / 状态 / 证件全号 / 子女动作（M2） |
| `talent:report:*` | 4 | 报告列表 / 详情 / 同步 / 发布撤回恢复补发重算（M3） |
| `talent:direction:merge` | 1 | 自定义方向归并 / 转正（M4） |
| `talent:advice:*` | 5 | 培育建议列表 / 详情 / 发布撤回 / 接收新版 / 导出（M5） |

合计 35 个在册业务码；Foundation 的系统管理与运行监控权限码另计。

### B 端 · 天赋工作台

| 方法 | 路径 | 用途 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/admin/talent/dashboard` | 工作台汇总（会员、报告、建议、规则缺口等待办计数） | `talent:dashboard:list` |

### B 端 · 规则域（M1，31 条）

> 实现合同：[M1 规则域规格](specs/M1-rules/spec.md)。`talent_levels` 在 M6 后只保留新语义行（`code != ""`）。

| 方法 | 路径 | 用途 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/admin/talent/factor-libraries` | 分库列表（性别 / 年龄 / 状态） | `talent:factor:list` |
| POST | `/api/admin/talent/factor-libraries/sync` | 库不存在时按 `{gender, age}` upsert 后同步 | `talent:factor:sync` |
| POST | `/api/admin/talent/factor-libraries/:id/sync` | 已存在分库再同步 | `talent:factor:sync` |
| GET | `/api/admin/talent/factors` | 要素列表（`libraryId` 必传、分册 / 关键字） | `talent:factor:list` |
| GET | `/api/admin/talent/factors/:id` | 要素详情（含 12 槽位四段文案） | `talent:factor:list` |
| GET | `/api/admin/talent/factors/export` | 导出当前库要素 CSV | `talent:factor:export` |
| GET | `/api/admin/talent/factors/template` | 下载要素导出模板 | `talent:factor:export` |
| GET / POST | `/api/admin/talent/levels` | 分级列表 / 新增 | `talent:rule:list` / `talent:rule:add` |
| PUT / DELETE | `/api/admin/talent/levels/:id` | 编辑 / 删除分级 | `talent:rule:edit` / `talent:rule:delete` |
| GET | `/api/admin/talent/levels/template`、`/api/admin/talent/levels/export` | 分级模板 / 导出 | `talent:rule:export` |
| POST | `/api/admin/talent/levels/import/preview`、`/api/admin/talent/levels/import` | 分级导入预览 / 提交 | `talent:rule:import` |
| GET / POST | `/api/admin/talent/factor-notes` | 固定注解列表 / 新增 | `talent:rule:list` / `talent:rule:add` |
| PUT / DELETE | `/api/admin/talent/factor-notes/:id` | 编辑 / 删除注解 | `talent:rule:edit` / `talent:rule:delete` |
| GET | `/api/admin/talent/factor-notes/template`、`/api/admin/talent/factor-notes/export` | 注解模板 / 导出 | `talent:rule:export` |
| POST | `/api/admin/talent/factor-notes/import/preview`、`/api/admin/talent/factor-notes/import` | 注解导入预览 / 提交 | `talent:rule:import` |
| GET / POST | `/api/admin/talent/directions` | 培养方向列表 / 新增 | `talent:direction:list` / `talent:direction:add` |
| GET / PUT / DELETE | `/api/admin/talent/directions/:id` | 详情 / 保存配置 / 删除保护 | `talent:direction:list` / `edit` / `delete` |
| PUT | `/api/admin/talent/directions/:id/status` | 停用 / 启用（不改版本） | `talent:direction:edit` |
| GET | `/api/admin/talent/tiers` | 目标档位列表（固定 4 档） | `talent:tier:list` |
| PUT | `/api/admin/talent/tiers/:id` | 编辑 / 停用启用 / 设全局默认 | `talent:tier:edit` |

### B 端 · 会员域（M2，12 条：11 业务 + 1 探针）

> 实现合同：[M2 会员域规格](specs/M2-members/spec.md)。会员编号/手机号/身份证默认脱敏；全号查看需 `talent:parent:idno` 并写 `oper_logs`。旧 `/api/admin/talent/customer/**` 已随 M6 删除。

| 方法 | 路径 | 用途 | 权限 |
| --- | --- | --- | --- |
| GET / POST | `/api/admin/talent/members` | 家长列表（姓名/手机号/子女姓名/状态四筛 + 分页） / 新建家长+子女 | `talent:parent:list` / `talent:parent:add` |
| GET / PUT | `/api/admin/talent/members/:id` | 家长详情（子女/报告空态/账号资料） / 编辑 | `talent:parent:view` / `talent:parent:edit` |
| PUT | `/api/admin/talent/members/:id/status` | 停用 / 启用（即时失效） | `talent:parent:status` |
| POST | `/api/admin/talent/members/:id/children` | 新增子女（已解绑档案可重绑）并自动查询 | `talent:child:edit` |
| GET | `/api/admin/talent/members/:id/id-no` | 家长身份证全号（单项） | `talent:parent:idno` |
| GET | `/api/admin/talent/children/:id` | 子女档案只读探针（静态段优先，脱敏） | `talent:parent:view` |
| PUT | `/api/admin/talent/children/:id` | 编辑子女（证件留空不改，关键字段自动重查） | `talent:child:edit` |
| POST | `/api/admin/talent/children/:id/query` | 重新查询（幂等 + 30s 节流） | `talent:child:query` |
| POST | `/api/admin/talent/children/:id/unbind` | 解绑（幂等；家长端即时不可见） | `talent:child:unbind` |
| GET | `/api/admin/talent/children/:id/id-no` | 子女身份证全号（单项） | `talent:parent:idno` |

### B 端 · 报告域（M3，14 条）

> 实现合同：[M3 报告域规格](specs/M3-reports/spec.md)。报告为一人一份 + 增量分册；发布 / 撤回 / 恢复 / 补发 / 重算统一受 `talent:report:publish` 保护，动作以路径后缀区分。

| 方法 | 路径 | 用途 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/admin/talent/reports` | 报告列表（10 列 / 四项筛选 / 状态计数 / 分页） | `talent:report:list` |
| GET | `/api/admin/talent/reports/:id` | 报告详情（快照、分册、建议计数） | `talent:report:view` |
| GET | `/api/admin/talent/reports/:id/volumes/:volumeId` | 单册快照（章节 / 要素 / 数据熵） | `talent:report:view` |
| GET | `/api/admin/talent/reports/:id/publish-preview` | 发布预览（可开放册与影响面） | `talent:report:view` |
| GET | `/api/admin/talent/reports/:id/reissue-preview` | 补发预览（新增册） | `talent:report:view` |
| GET | `/api/admin/talent/reports/:id/direction-preview` | 方向预览（冻结快照与当前配置 diff） | `talent:report:view` |
| POST | `/api/admin/talent/reports/:id/publish` | 发布（选择开放分册） | `talent:report:publish` |
| POST | `/api/admin/talent/reports/:id/withdraw` | 撤回（C 端即时不可见） | `talent:report:publish` |
| POST | `/api/admin/talent/reports/:id/restore` | 恢复到最近发布版本 | `talent:report:publish` |
| POST | `/api/admin/talent/reports/:id/publish-new` | 补发新增分册 | `talent:report:publish` |
| POST | `/api/admin/talent/reports/:id/regenerate-snapshot` | 按当前配置重新生成快照 | `talent:report:publish` |
| POST | `/api/admin/talent/reports/:id/selection` | 后台代选 / 换档 / 取消培养方向（M4 语义） | `talent:report:view` |
| POST | `/api/admin/talent/reports/sync` | 一键同步全部报告（preview / commit） | `talent:report:sync` |
| GET | `/api/admin/talent/reports/sync-logs` | 同步运行日志（按批次 / 来源 / 结果） | `talent:report:sync` |

### B 端 · 方向匹配（M4，4 条 + 3 条别名）

> 实现合同：[M4 方向匹配规格](specs/M4-matching/spec.md)。命中算法为“级序 ≥ 要求”计 1 条，四键排序，推荐 ≤5 / 选择 ≤3，0 命中回退自定义方向。

| 方法 | 路径 | 用途 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/admin/talent/directions/preview` | 按报告冻结要素快照 + 当前配置重算方向命中与排序（含 0 命中与诊断） | `talent:report:view` |
| GET | `/api/admin/talent/direction-requests` | 待归并自定义方向列表（关键词 / 状态 / 分页） | `talent:direction:list` |
| POST | `/api/admin/talent/direction-requests/:id/merge`、`/promote` | 归并到正式方向（写别名）/ 转正（生成停用待配置方向） | `talent:direction:merge` |
| GET | `/api/admin/talent/directions/requests` | 待归并列表的别名路径（同一服务函数） | `talent:direction:list` |
| POST | `/api/admin/talent/directions/requests/:id/merge`、`/promote` | 归并 / 转正的别名路径 | `talent:direction:merge` |

### B 端 · 培育建议（M5，9 条）

> 实现合同：[M5 培育建议规格](specs/M5-advice/spec.md)。版本两层（当前生效 / 归档）单一生效；接收新一版在全局锁内建新版本并归档旧版，失败补偿回滚且旧版保持生效。

| 方法 | 路径 | 用途 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/admin/talent/advice` | 建议列表（15 列 / 检索 / 状态计数 / 分页） | `talent:advice:list` |
| GET | `/api/admin/talent/advice/:id` | 建议书详情（按分册四段文案） | `talent:advice:view` |
| GET | `/api/admin/talent/advice/:id/history` | 按人历史版本 | `talent:advice:view` |
| GET | `/api/admin/talent/advice/versions` | 版本历史（全部版本 + 每版份数 / 发布 / 撤回统计 + 周期 / 来源 / 是否当前生效） | `talent:advice:view` |
| POST | `/api/admin/talent/advice/versions` | 接收新一版（生成新版本、旧版归档、C 端切新版；重复版本 / 顺序倒置 409，零写入） | `talent:advice:sync` |
| GET | `/api/admin/talent/advice/subject` | 按对象或报告查询当前生效建议（`?subjectType=&subjectId=` 或 `?reportId=`，M3 详情第 4 页签复用） | `talent:advice:view` |
| GET | `/api/admin/talent/advice/export` | 导出建议 CSV | `talent:advice:export` |
| POST | `/api/admin/talent/advice/:id/publish` | 发布 | `talent:advice:publish` |
| POST | `/api/admin/talent/advice/:id/withdraw` | 撤回 | `talent:advice:publish` |

### B 端 · 集成状态与基因报告（M8，2 条）

| 方法 | 路径 | 用途 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/admin/talent/integrations/status` | 外部源与 PDF 只读状态（配置是否完整 / 最近运行 / 连续失败 / 熔断 / 下次运行 / PDF 队列与缓存），不返回密钥、URL、PII | `talent:report:sync` 或 `talent:advice:sync`（按权限裁剪返回段） |
| GET | `/api/admin/talent/gene-reports/:id` | 读取基因报告（外部分册 / 增量来源） | `talent:report:view` |

## C 端 · 天赋门户（M2 + M7 + M8，19 条）

> 页面与交互见 [CLIENT-PORTAL.md](CLIENT-PORTAL.md)，合同见 [M7 C 端规格](specs/M7-c-end/spec.md) §10。所有路由都要求家长登录态；业务资源越权统一 404，报告状态改用 409 + `data.state`。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/client/talent/summary` | 启动聚合：账号状态、对象列表、当前对象、待核对、计数（`?subjectId=`） |
| GET | `/api/client/talent/reports` | 当前家长视角的报告对象摘要（本人 + 已绑定子女各一行：状态派生、六册摘要、开放册、建议份数） |
| GET | `/api/client/talent/reports/:id` | 报告总览：状态 + 6 册摘要 + 建议份数 |
| GET | `/api/client/talent/reports/:id/volumes/:volumeId` | 分册要素（章节 / 要素 / 数据熵 / 指引 / 相关方向） |
| GET | `/api/client/talent/reports/:id/factors/:factorCode` | 单要素解读（固定注解、相关方向） |
| GET | `/api/client/talent/advice` | 培育建议（`?reportId=`，按分册四段） |
| GET | `/api/client/talent/directions` | 推荐 / 已选方向与全局档位（`?reportId=`） |
| GET / PUT | `/api/client/talent/profile` | 家长资料（中性账户 + 会员档案脱敏合并） |
| GET / POST | `/api/client/talent/children` | 孩子列表 / 新增（自动发起外部查询） |
| PUT | `/api/client/talent/children/:id` | 编辑孩子（证件留空不改，关键字段自动重查） |
| GET | `/api/client/talent/bindings` | 本人 + 已绑子女只读列表（GET 不写绑定） |
| POST | `/api/client/talent/bindings/claim` | 用已验证手机号哈希认领唯一 parent |
| POST | `/api/client/talent/selections` | 选择培养方向（≤3） |
| PUT | `/api/client/talent/selections/:selectionId` | 换档 |
| DELETE | `/api/client/talent/selections/:selectionId` | 取消选择（`?reportId=`） |
| POST | `/api/client/talent/reports/:id/volumes/:volumeId/pdf-ticket` | 签发 120s PDF 下载 ticket（H5 新窗口场景，必须 Bearer） |
| GET | `/api/client/talent/reports/:id/volumes/:volumeId/pdf` | 分册 PDF 权限代理（Bearer 或有效 ticket；写下载留痕） |

守卫口径：无 token / 过期 401；账号停用 403；未绑定家长 200（summary）/404（数据路由）；报告 `pending_publish` / `retracted` 返回 409 + `state`；越权、解绑、子女停用统一 404；PDF 未就绪返回 404 `PDF_NOT_READY`。

## 入站集成（M8，3 条 + 2 条别名）

| 方法 | 路径 | 用途 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/integrations/talent/gene-reports/sync` | 触发基因报告拉取（只接收 `eventId`，不接收正文；运行中去重，立即 202） | HMAC（`TALENT_EXTERNAL_WEBHOOK_SECRET`） |
| POST | `/api/integrations/talent/advice/sync` | 触发培育建议周期检查 | HMAC |
| POST | `/api/integrations/talent/gene-query/receipts` | M2 基因查询回执落库（旧 / 重复回执丢弃） | HMAC |
| POST | `/api/integration/talent/gene-reports/notify` | 基因报告同步通知的别名路径（同一处理函数） | HMAC |
| POST | `/api/integration/talent/advice/notify` | 建议同步通知的别名路径 | HMAC |

入站接口校验 HMAC + 时间窗 + nonce/`eventId` + 体积 + 内容类型，按应用级限流；系统对系统，不使用 `requirePermission`，也不接收报告或建议正文。

## 上传

| 方法 | 路径                | 用途                       | 认证 |
| ---- | ------------------- | -------------------------- | ---- |
| POST | `/api/upload`       | 上传本人头像或受控通用附件 | 是   |
| POST | `/api/upload/form`  | 创建通用附件记录并上传     | 是   |
| POST | `/api/upload/clear` | 清除当前账户可管理的文件   | 是   |

头像仅允许 JPG、PNG、GIF、WebP；通用附件在此基础上允许 PDF、文本、CSV 与常见 Office 文档。所有上传最大 10MB；文件字段固定为 `users.avatar` 或 `uploads.file`。

## M6 已删除的旧路由（不要再调用）

M6-B（2026-11-17）已删除 148 个旧口径文件：56 条平台旧 API、16 条机构端 API、13 条旧 C 端 API、1 条旧 integration、19 个旧集合与 22 个旧权限码。以下路径现在均为 404，旧页面与菜单入口同时下线：

| 旧路径组 | 示例 | 替代 |
| --- | --- | --- |
| `/api/admin/talent/customer/**` | 会员导入 / 绑定 / 解绑 | `/api/admin/talent/members`、`/children` |
| `/api/admin/talent/report/**` | 旧报告发布 / 撤回 / 接收 / 同步 / PDF 上传 | `/api/admin/talent/reports/**` |
| `/api/admin/talent/[resource]` | 旧分类 / 要素 / 分级 / 内容库 / 培育内容 CRUD | `/api/admin/talent/factors`、`levels`、`factor-notes` 等 M1 路由 |
| 旧匹配 / 模板 / 内容库 | `matching`、`template`、`content`、`library`、`level-copy`、`level-status` | 删除，不再有等价入口 |
| 旧机构 / 授权 / 计划 / 同步配置 | `institution`、`authorization`、`plan`、`plan-selections`、`sync-config`、旧 `/api/admin/talent/sync-logs` | 机构端整体退出；同步日志改用 `GET /api/admin/talent/reports/sync-logs`，外部源改用 M8 集成 |
| `/api/org/talent/**` | 机构会员 / 报告 / 培养计划 / 授权 | 删除，机构业务端退出 |
| 旧 C 端 | `binding`、`plans`、`plan-selections`、`reports/:id/{books,categories,interpretations,items,pdf,progress}` | `/api/client/talent/summary`、`reports`、`advice`、`directions` 等 M7 契约 |
| 旧入站 | `POST /api/integrations/talent/reports` | `/api/integrations/talent/gene-reports/sync` 等 M8 入站 |

## 变更检查清单

新增或修改 API 时，同时检查：

1. 路径、方法和认证是否已更新到本索引。
2. 写接口是否使用 `validateBody()`、权限校验与 `withOperLog()`。
3. B 端调用是否通过 `app/composables/api/`，而不是页面直接调用请求函数。
4. C 端调用是否仍使用 `/api/client/*`，且没有引入站点选择参数；业务资源越权是否保持 404。
5. 管理端列表是否继续隐藏审计字段，C 端是否只返回已发布且在开放分册内的内容。
6. 新增权限码是否同时在 `scripts/setup.mjs` 的 C/F 菜单与角色矩阵登记，且没有复活 M6 已删旧码。
> M8 PDF 代理优先返回客户原版 PDF（`talent_report_source_pdfs` 私有文件）；未导入时回退 M8 生成版。
