# 工程约定

本文件是 Foundation 的硬性研发规则。开始改动前必须阅读；与历史业务项目的文档冲突时，以本文件、[AGENTS.md](../AGENTS.md) 和当前源码为准。

## 1. 边界：底座与天赋专项

当前分支是**同佳天赋专项**，同时遵守两层边界：

- **底座边界**：工程是**单实例、单 PocketBase**。服务端只通过 `getAdminPB()` 连接 `POCKETBASE_URL`，浏览器文件 URL 只使用一个公开 PocketBase 地址。禁止新增 `TENANT_MODE`、`site` cookie、`X-Site-Slug`、控制 PocketBase、站点切换、按域名 / header / 请求切库或第二个 PB 连接。`site_config` 是唯一站点的品牌与主题配置，不是多站点控制平面。
- **底座不承载行业字段**：中性账户、RBAC、组织、字典、参数、配置、会话、上传和日志保持通用；订单、会员资产、预约、商城、营销、分销、开放 API、实体构建器和交付系统不属于本仓库。
- **天赋专项边界**：天赋业务只落在 `talent_*` 集合、`server/api/{admin,org,client}/talent/` 和对应页面。不得把机构、会员、报告或培养计划字段塞进 `users`、`configs`、`site_config`。
- **已废弃模型**：培训机构、课程、课表、计划课程、多计划共享、机构资格申请与审核 SLA 已被 2026-09-24 新模型取代，不得恢复。
- `scripts/setup.mjs` 只支持新的空数据目录。发现旧业务集合必须失败；不得把它当作迁移、升级或清库脚本。存量库变更走 `scripts/sync-talent.mjs` 这类幂等同步脚本。

## 2. 通用代码与仓库卫生

- 运行环境为 Node.js `>=20.19.0`、pnpm `>=10`；使用 pnpm workspace，不混用 npm / yarn 锁文件。
- 注释和用户可见文案使用 UTF-8 中文。新增源文件写 `@description`、`@file` 文件头；API 文件补充 `@route`、`@body`、`@returns`，复杂函数写参数和返回值说明。
- Vue 文件顺序固定为 `<script setup lang="ts">` → `<template>` → `<style scoped>`。优先 Composition API 与明确 TypeScript 类型，避免用 `any` 掩盖接口、权限或数据结构问题。
- 页面保持组合层，状态、请求和副作用下沉到 composable；函数与组件保持单一职责，复杂页面拆出同目录组件。
- 使用已有设计令牌，不硬编码品牌色、行业色或行业文案。可点击主控件最小触控高度为 44px。
- 不提交 `.env`、`pb_data/`、`.output/`、`apps/client/dist/`、日志、临时测试数据、截图、历史行业方案或生成产物。提交前执行 `git diff --check`。
- 本地地址统一使用 `127.0.0.1`，不要用 `localhost`；本机 `localhost` 可能命中 IPv6 / HMR 并返回 `426`。

## 3. B 端规范

### 结构与数据流

- 路由页放 `app/pages/admin/`；页面调用 `app/composables/api/useXxxApi.ts`，不得在页面、布局或普通组件中直接调用 `useApi()`。
- 共享、无业务逻辑组件放 `app/components/`；页面专属表单、抽屉、详情组件放在对应页面的 `components/` 目录。
- 新后台页面必须同时登记菜单路径、组件、`permissionCode` 和角色授权；只添加 Vue 路由文件不构成可用功能。
- 受权限约束的功能在 UI 隐藏或禁用之外，服务端必须执行对应 RBAC 校验。前端可见性不是安全边界。

### 列表、表单与反馈

- 列表使用 `AdminListPage`、`NDataTable`、`AdminPagination`。必须传递真实的 `loading` 和 `empty`，不要手写 `v-if` 替代加载、空态。
- 搜索 / 重置、分页、排序、批量操作要有明确状态；筛选条件变化时回到第一页。空列表仍必须能创建首条记录。
- 弹窗表单在 `handleSave()` 做客户端必填、格式与关联校验；保存中阻止重复提交，成功 / 失败使用一致的消息反馈。服务端 Zod 校验不可省略。
- 六个及以上短字段的表单采用宽屏两列栅格，长文本、上传和动态内容占整行；避免在桌面端形成冗长窄单列。
- B 端使用 Naive UI 按需 import，图标统一为 `@vicons/ionicons5`。详细视觉基线见 [DESIGN.md](../app/DESIGN.md)。

## 4. C 端规范

- C 端位于 `apps/client`，目标仅为 H5 和微信小程序，使用 uni-app、Vue 3、Pinia 和 Wot UI。
- C 端组件优先级：Wot UI 最高。已有 `wd-*` 组件可以覆盖的按钮、输入、选择器、单元格、反馈和图标，必须优先使用 Wot；只有 Wot 无对应能力或平台原生开放能力（如微信 `chooseAvatar`）时才保留原生控件，并统一重置 H5 / 小程序默认样式。能使用 Wot 图标就不自绘图标，不新增重复的组件样式。
- “首页 / 我的”是固定的长期双 Tab。不要添加动态 Tab、原生业务 TabBar、首页装修、假业务入口或模块路由门禁。
- `pages/index/index.vue`、`pages/me/me.vue` 只组合模块与导航；展示组件、账户动作、主题抽屉、微信认证放在 `src/modules/foundation-portal/`。
- C 端请求只走 `/api/client/*`，不得调用管理员 API、直连 PocketBase 管理接口，或让客户端选择数据源。
- 使用 Wot UI 和 `--foundation-*` CSS 令牌。图标使用 Wot 图标或内联 SVG，禁止 Emoji UI 图标；不得硬编码行业色、行业名词或演示业务数据。
- 覆盖加载、空态、错误、会话失效与未登录状态。固定底栏与底部面板预留安全区，页面根不能横向溢出；H5 提供可见焦点态并遵从 `prefers-reduced-motion`。
- C 端**不提供**用户侧外观开关：主题只读后台 `site_config` 的 `primaryColor` 与 `themeMode`（浅色 / 深色 / 跟随系统），页面不得新增本机外观偏好或回写站点配置。详情见 [CLIENT-PORTAL.md](CLIENT-PORTAL.md)。

## 5. Nitro API 规范

- 路由遵循 `server/api/` 文件路由：`admin/` 是 B 端管理 API，`client/` 是 C 端 API，`public/` 只放明确允许匿名访问的最小认证入口。
- 成功响应使用 `success(data, message)`，保持 `{ code: 200, message, data }` 结构；错误交给统一错误处理，不把 PocketBase 原始错误或敏感堆栈直接返回浏览器。
- JSON `POST` / `PUT` / `DELETE` 使用 `validateBody(event, schema)` 与 Zod v4；multipart 上传接口必须显式校验文件字段、大小、MIME 类型和权限。
- 基础认证使用 `getCurrentUserBasic()`；管理资源使用 `getCurrentUser()`、`requirePermission()`；变更受保护角色时使用超管保护。新增权限码、菜单和 API 必须同步。
- B 端管理写操作需要 `withOperLog()`；日志中不得记录密码、token、AppSecret、手机号原文或其他敏感数据。账户注销等高敏操作须有明确确认和可追溯记录。
- 新增外部跳转时，在服务端或共享工具中集中实施协议 / 域名白名单校验并补测试；禁止把不可信字符串直接绑定到 `href` 或跳转 API。文件 URL 使用统一 helper，禁止拼接 PocketBase 文件路径或传递站点上下文。
- 新 / 改路由必须更新 [API.md](API.md)，并为正常、必填缺失、格式错误、权限拒绝和边界值补充对应测试。

## 6. PocketBase 与配置规范

- 数据结构的真源是 `scripts/setup.mjs`；`shared/types/`、Zod schema、API、页面、权限、测试和文档必须同步。不要只在 PocketBase Admin UI 修改结构而遗漏源码。
- 设计集合时明确字段长度、必填 / 可空、默认值、关系、级联删除、唯一索引和权限。中性 `users` 不承载行业会员、员工或业务资产身份。
- `POCKETBASE_URL` 供 Nuxt 服务端连接；`POCKETBASE_PUBLIC_URL` 与 `NUXT_PUBLIC_POCKETBASE_URL` 必须能被用户浏览器访问，用于文件和客户端访问。生产环境不得把内网地址下发给浏览器。
- `ENCRYPTION_KEY` 用于加密微信 AppSecret 等敏感配置，必须在环境间安全保管；不要在前端、日志、响应、截图或文档中暴露值。
- 上传复用 `/api/upload*` 和统一文件 URL。验证类型、大小、归属和访问权限；不要把文件二进制、公开 URL 或第三方密钥直接塞入参数配置。

## 7. 测试、文档与验收

- 新 API 至少覆盖正常入参、缺失必填、无效格式、边界值和权限拒绝；变更 PocketBase、认证、主题或跨端契约时补真实链路或针对性回归。
- 小改动先检查 diff、类型、调用链与对应页面；鉴权、权限、schema、上传、微信认证、C/B 跨端契约和准备提交 / 发布时升级为定向测试、构建与真实服务烟测。
- 全量命令和发布清单见 [QUALITY.md](QUALITY.md)。不要把“构建成功”当作真实 API、权限或微信平台配置已验收。
- README、架构、API、C 端、环境变量、脚本和验收文档必须跟随源码更新。改动任一项后检查本地 Markdown 链接有效、术语不包含已删除的多租户或行业功能。

## 8. 提交前最小清单

- [ ] 代码位于正确层级，页面没有绕过 composable，API 没有绕过认证和 Zod。
- [ ] 数据、类型、schema、菜单、权限和测试已形成闭环。
- [ ] B/C 两端都有加载、空态、错误和无权限 / 未登录反馈。
- [ ] 主题令牌、亮 / 暗色、窄屏与安全区不退化。
- [ ] 文档、API 索引、环境变量说明和验收清单已同步，`git diff --check` 通过。
