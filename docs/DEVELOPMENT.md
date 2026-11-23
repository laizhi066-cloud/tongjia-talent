# 开发与扩展指南

Foundation 是“先有通用骨架，再接入业务”的起点。本指南规定新增能力的落点和闭环，避免在路由页直接堆逻辑、绕过权限，或把基础版重新演化为行业产品。

## 扩展前先定边界

先把需求分成两类：

| 类型 | 例子 | 放置原则 |
| --- | --- | --- |
| 基础能力 | 新的管理员资料字段、通用通知偏好、文件用途、审计辅助 | 可在本仓库扩展，但必须保持中性、单实例和可复用 |
| 业务模块 | 预约、订单、库存、课程、营销、会员权益 | 作为独立模块设计和接入，不把行业页面、样例数据或领域枚举混入基础集合 |

任何扩展都不能引入 `TENANT_MODE`、`site` cookie、`X-Site-Slug`、站点选择、按请求切换 PocketBase、第二个 PB 连接、交付档位或行业功能开关。唯一 `site_config` 只负责品牌、主题和微信基础配置。

## 本分支已有的业务模块

新增功能前先看天赋专项是怎么接入的，按同一模式扩展即可：

| 层 | 位置 |
| --- | --- |
| 数据 | `scripts/setup.mjs` 中的 `talent_*` 集合；存量库用 `scripts/sync-talent.mjs` |
| 服务端 | `server/utils/talent.ts`、`talent-business.ts`、`talent-external-sync.ts`；路由在 `server/api/{admin,org,client}/talent/` |
| 平台 B 端 | `app/pages/admin/talent/*.vue` + `app/composables/api/` 中的天赋 API 封装 |
| 机构端 | `app/pages/org/talent/{members,reports,plans}.vue`，数据范围由 `requireTalentPermission` / `assertInstitutionScope` 统一执行 |
| C 端 | `apps/client/src/pages/talent/**` + `modules/foundation-portal` 组件 |
| 验收 | `test/talent-*.test.ts`、`scripts/e2e/02–05` |

不要复制一份平行的“新业务骨架”；沿用同一套权限、审计、状态机和 PDF 代理模式。

## 一项能力的闭环

| 层 | 必须同步的内容 |
| --- | --- |
| 数据 | PocketBase 集合 / 字段、`shared/types/`、`scripts/setup.mjs`；新库初始化与索引 / 权限一并考虑 |
| 服务端 | `server/api/` 文件路由、Zod schema、当前用户与权限校验、统一响应、写入审计和错误处理 |
| B 端 | `app/composables/api/` 请求封装、页面 / 组件、菜单和权限码、加载 / 空态 / 错误态 |
| C 端 | `/api/client/*` 契约、`foundation-portal` 模块组件或 composable、未登录与异常状态、H5 / 小程序差异 |
| 质量 | 相关 Vitest、类型检查、必要的真实 PocketBase 烟测、文档 / API 索引 / 验收清单 |

先明确哪些角色可以读写，再写 UI。前端隐藏入口不是权限边界，Nitro 路由必须自行验证当前用户与权限。

## B 端开发规范

### 页面与状态

- 路由页放在 `app/pages/admin/`，用 `<script setup lang="ts">`，只负责组合 UI、composable 和页面级导航。
- 请求只能由 `app/composables/api/useXxxApi.ts` 封装；页面、布局和组件不能直接调用 `useApi()`。
- 可复用的无业务组件放 `app/components/`；某个页面专用的弹窗、抽屉和表单放在该页面的 `components/` 目录。
- 新页面需要在 `scripts/setup.mjs` 的基础菜单中明确登记 `C` 类型的路径、组件和页面权限；每个 `requirePermission()` 的查询或操作码还要登记为对应页面下的 `F` 类型按钮菜单，并将两类权限赋予合适角色。不要只创建页面文件或只新增 API 权限码。

### 列表与表单

- 列表页优先使用 `AdminListPage`、`NDataTable` 与 `AdminPagination`；必须传入真实的 `loading` 和 `empty`，不能用手写条件替代加载 / 空态。
- 筛选、搜索、重置、分页和批量操作由页面 state 管理，切换筛选条件时回到第一页。
- 表单弹窗在 `handleSave()` 做客户端必填和格式校验，提交时显示 loading 并阻止重复提交；服务端校验仍不可省略。
- 六个及以上的短字段使用宽屏双列栅格，长文本、上传、富文本和动态内容占整行；不能把复杂表单挤成窄单列。
- 成功、失败、空数据、无权限和网络异常都要有可理解反馈，避免看似可点但无反应的控件。

### B 端视觉

- 使用 Naive UI 按需 import，图标使用 `@vicons/ionicons5`；颜色、边框、阴影和圆角只使用已有主题令牌。
- 基础概览只展示基础运行状态与下一步配置，不伪造经营数据或业务指标。
- 后台外观和 C 端站点默认外观从唯一站点配置同步；用户在 C 端的本机偏好不回写后台。

完整视觉基线见 [../app/DESIGN.md](../app/DESIGN.md)。

## C 端开发规范

- 长期入口固定为“首页 / 我的”双 Tab；新增账户基础流程只能作为二级页，不能添加原生 TabBar、动态 Tab 或业务门禁。
- `pages/index/index.vue`、`pages/me/me.vue` 是薄组合层。展示组件、账户动作和主题逻辑放在 `apps/client/src/modules/foundation-portal/`。
- 使用 Wot UI 与 `--foundation-*` 令牌；不使用 Emoji 作为 UI 图标，不硬编码行业色、行业名词或演示业务内容。
- 所有主操作目标至少 `44px`；固定底栏留安全区；H5 要可键盘聚焦并遵从减少动效偏好；小程序与 H5 都要覆盖加载、空态、错误和未登录状态。
- C 端只调用 `/api/client/*`。不要在客户端直接访问管理员 API、使用 PocketBase 管理凭据，或根据域名 / header / 本地值切换数据源。

路由、环境变量、主题和微信认证的细节见 [CLIENT-PORTAL.md](CLIENT-PORTAL.md)。

## API、数据与安全规范

### Nitro API

- 路由使用 `server/api/` 文件约定；管理 API 放 `admin/`，C 端 API 放 `client/`，不把内部管理能力暴露为公开接口。
- JSON 写接口必须通过 `validateBody(event, schema)` 使用 Zod 校验；multipart 接口须校验文件字段、类型、大小和当前用户。
- 认证接口使用 `getCurrentUserBasic()`；管理资源使用 `getCurrentUser()` 和 `requirePermission()`，受保护角色变更再使用对应的超管保护。
- 写入成功使用 `success(data, message)`；需要审计的管理写操作包裹在 `withOperLog()` 中。密码、token、AppSecret 和敏感字段不能写入日志或响应。
- 新增外部跳转时，在服务端或共享工具中集中实施协议 / 域名白名单校验并补测试；不能把不可信字符串直接绑定到 `href` 或跳转 API。文件 URL 复用统一 helper，不能手拼 PocketBase 路径。

### PocketBase

- 服务端固定通过 `getAdminPB()` 连接 `POCKETBASE_URL`；浏览器文件访问使用唯一公开地址 `POCKETBASE_PUBLIC_URL` / `NUXT_PUBLIC_POCKETBASE_URL`。
- 新集合必须在 `scripts/setup.mjs`、`shared/types/`、对应 Zod schema、API、权限、测试和文档中同步。该初始化器只验证全新目录，不能作为对现有环境的迁移工具。
- 关系、删除策略、唯一索引、字段长度和空值语义要在设计阶段定好。PB 控制台可用于检查数据，但不能成为未记录的 schema 真源。

当前接口边界见 [API.md](API.md)，基础集合见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 建议的开发顺序

1. 写清角色、数据归属、状态机和验收场景；涉及支付、隐私数据、鉴权或迁移时先做设计评审。
2. 定义数据结构与 Zod schema，再写 Nitro API 和测试。
3. 增加 B 端 composable、菜单权限和管理界面；先验证无权限与错误路径。
4. 若需要 C 端，再接 `/api/client/*`、账户态和跨端 UI。
5. 补 API 索引、架构 / C 端说明、质量清单；执行与风险匹配的门禁。

## 不要这样扩展

- 不要把业务字段塞进 `users`、`configs` 或 `site_config`，也不要以 JSON 配置代替需要权限和索引的业务实体。
- 不要为了“快速”从页面直接调用 PocketBase、`useApi()` 或管理员路由。
- 不要把个人主题偏好、微信 AppSecret 或用户 token 放进公开站点配置。
- 不要对真实 `pb_data/` 跑 `env:setup`，不要提交 `.env`、数据库目录、构建产物、测试截图或日志。

开发前后的检查项目见 [QUALITY.md](QUALITY.md)。
