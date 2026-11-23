# 同佳天赋架构

> 最后按源码核对：2026-11-17（M1–M8 实现 + M6 旧口径代码清理后）。现状数字与已知缺口见 [STATUS.md](STATUS.md)。

## 应用边界

同佳天赋是天赋测评报告业务的 B/C 全栈平台，在 Foundation（单实例、单 PocketBase、中性账户与 RBAC）骨架之上叠加 `talent_*` 天赋专项。Nuxt 是唯一以管理员凭据连接 PocketBase 的服务端；B/C 端通过 Nitro API 使用同一份数据。

```text
浏览器（Nuxt B 端） ─┐
uni-app（H5 / 小程序） ├─> Nuxt Nitro API ─> 唯一 PocketBase
                       ├─> 外部适配器 ────> 基因查询 / 基因报告 / 培育建议供应商（M8 骨架）
                       └─> PDF 权限代理 ─> 私有 PocketBase 文件 / 私有 OSS
```

- `app/` 是 Nuxt B 端。它通过 `app/composables/api/` 调用管理 API。
- `server/api/` 是 Nitro 文件路由；认证、权限、审计、文件 URL、天赋领域服务与 PocketBase 客户端工具位于 `server/utils/`。
- `apps/client/` 是 uni-app C 端（H5 + 微信小程序）。4 主栏壳层与基础门户在 `src/modules/foundation-portal/`，报告/建议/方向/资料逻辑在 `src/pages/**` 与 `src/modules/talent-portal/`，页面保持组合层。
- `scripts/setup.mjs` 是新数据库初始化器，不是迁移工具；`scripts/sync-talent.mjs` 只对存量库做幂等补齐；`scripts/cleanup-m6.mjs`（`pnpm migration:m6`）默认 dry-run，真实删除旧集合必须显式确认 + 备份门槛。三者职责不重叠。

## 单 PocketBase 规则

服务端使用 `getAdminPB()`，客户端使用唯一的公开 PocketBase URL。普通上传文件由 PocketBase 托管；报告 PDF 由 `TALENT_PDF_STORAGE` / `OSS_ENABLED` 选择 PocketBase 或阿里云 OSS，但数据库只保存私有存储 key（第三方同步的原始地址仅服务端代理使用）。B/C 端拿到的 PDF 地址始终是 Nitro 权限代理或短时效 ticket 结果，调用方不传站点、slug 或租户上下文。

因此新增能力时：

1. 不要新增 `TENANT_MODE`、`site` cookie、`X-Site-Slug` 或第二个 PB 连接。
2. 不要让 C 端根据请求头、域名或本地缓存切换 API / 文件源。
3. 站点配置是唯一品牌与主题来源，不是多站点控制平面。
4. 天赋业务字段只能落在 `talent_*` 集合，不回填 `users`、`configs` 或 `site_config`。

公开配置与敏感配置分开处理：`site_config` 只向 B/C 端提供名称、Logo、主色、默认外观和必要公开信息；微信小程序 AppSecret 只保存于服务端加密配置。外部供应商密钥、HMAC 密钥与 PDF 存储密钥只来自环境变量（见 [.env.example](../.env.example)），不写入 `configs`。

## 数据模型

M6 后新库由 `scripts/setup.mjs` 的 `COLLECTION_DEFS` 创建 **35** 个业务集合：17 个 Foundation 集合 + 18 个 `talent_*` 集合。不含 `_superusers` 等 PocketBase 系统集合。

Foundation 集合：

| 范畴 | 集合 |
| --- | --- |
| 账户与组织 | `users`、`roles`、`menus`、`depts`、`posts`、`user_roles`、`role_menus`、`user_posts`、`role_depts` |
| 通用配置 | `configs`、`dict_types`、`dict_data` |
| 会话与审计 | `user_sessions`、`login_logs`、`oper_logs`、`error_logs` |
| 文件 | `uploads` |

天赋专项集合（17 个）：

| 范畴 | 集合 |
| --- | --- |
| 规则域（M1） | `talent_factor_libraries`、`talent_factors`、`talent_levels`、`talent_factor_notes`、`talent_directions`、`talent_tiers` |
| 会员域（M2） | `talent_parents`、`talent_children`；手机号/身份证按「密文 + HMAC + 脱敏」三件套存储，`talent_parents.userId` 为唯一账号绑定 |
| 报告域（M3） | `talent_gene_reports`（一人一份）、`talent_reports`（快照 / 状态机 / 版本链）、`talent_sync_logs`、`talent_reading_progress` |
| 方向匹配（M4） | `talent_direction_requests`（自定义方向待归并） |
| 培育建议（M5） | `talent_advice_versions`（版本两层 / 单一生效）、`talent_advice_docs`（按分册四段文案） |
| PDF（M8） | `talent_report_pdfs`（产物元数据 / contentHash 缓存）、`talent_pdf_downloads`（下载留痕，只存 HMAC 摘要） |

### M6 已删除的旧集合（19 个）

`talent_customers`、`talent_customer_bindings`、`talent_institutions`、`talent_user_institutions`、`talent_customer_leads`、`talent_customer_authorizations`、`talent_cultivation_plans`、`talent_member_plan_selections`、`talent_report_receipts`、`talent_report_publications`、`talent_customer_import_batches`、`talent_customer_import_rows`、`talent_categories`、`talent_elements`、`talent_cultivation_contents`、`talent_content_libraries`、`talent_report_templates`、`talent_report_template_items`、`talent_report_items`。

这些定义已从 `scripts/setup.mjs` / `scripts/sync-talent.mjs` 移除，新库不会再创建；旧菜单、旧权限码、机构角色已在 `talent:sync` 中收敛归零。**演示库 / 真实库中旧集合与旧字段的真实删除尚未执行**：`pnpm migration:m6` 当前只做 dry-run，正式删除需备份 + 恢复演练后显式 `--confirm-m6`（见 [M6-B 实现清单](specs/M6-cleanup/m6b-implementation.md) 与 [ADR 0006](adr/0006-m6-cleanup-and-roles.md)）。

`talent_levels` 在 M6 后只保留 M1 新语义字段（`code` / `name` / `sortOrder` / `range` / `tone` / `status` / `subjectType` / `subjectId`）；旧 `elementId` / `levelCode` / `levelName` / `annotation` 字段与旧索引随 `migration:m6` 删除，`sync-talent.mjs` 不再补丁旧结构。

## 最终菜单

平台管理端菜单（`scripts/setup.mjs` 为唯一数据源，`sync-talent.mjs` 收敛存量库）按操作链路组织：

```text
工作台（一级 C）                 /admin/talent/dashboard       talent:dashboard:list
会员管理（一级 C）               /admin/talent/member          talent:parent:list
天赋规则（M）
  ├ 潜质要素                    /admin/talent/rules/factor    talent:factor:list
  ├ 分级与固定注解              /admin/talent/rules/level     talent:rule:list
  └ 培养方向管理                /admin/talent/rules/direction talent:direction:list
报告管理（M）
  ├ 基因报告                    /admin/talent/reports         talent:report:list
  └ 培育建议                    /admin/talent/advice          talent:advice:list
系统管理（M，仅 superAdmin）
  └ 用户列表 / 菜单管理 / 角色管理 / 部门管理 / 岗位管理 / 字典管理 / 参数设置 / 站点配置 / 微信配置
运行监控（M，仅 superAdmin）
  └ 系统健康 / 服务器信息 / 在线用户 / 错误监控 / 操作日志 / 登录日志
```

- 工作台与会员管理是**一级 C 菜单**；培养方向管理不再单独分组，并入「天赋规则」。
- 三角色矩阵（`TALENT_ROLE_DEFS`，`customer-admin` / `report-reviewer` / `rule-configurator`）只授予业务页面与业务权限码，不含系统管理 / 运行监控；`superAdmin` 拥有全部菜单。
- 旧天赋入口（服务商授权、培养计划审核、分类与要素、匹配规则、内容库、报告接收、同步配置）与机构端 3 页已随 M6 删除，不再以隐藏菜单形式保留。
- B 端调用方只通过 `app/composables/api/` 访问接口；前端另有 `useMenuTree.ts` 白名单，只渲染已登记的天赋路径。

## C 端门户（4 主栏 + 20 路由）

C 端使用自绘 `wd-tabbar`，固定 4 主栏：首页 / 报告 / 培养方向 / 我的；主栏互切用 `reLaunch` 清栈。20 条注册路由（4 主栏 + 16 二级页）与 `pages.json` 一一对应：

| 主栏 | 路由 | 二级页 |
| --- | --- | --- |
| 首页 | `pages/home/index` | — |
| 报告 | `pages/report/index` | 分册 `report/volume`、要素解读 `report/factor`、培育建议 `advice/index`、建议书 `advice/detail` |
| 培养方向 | `pages/direction/index` | 方向详情 `direction/detail`、自己填写 `direction/manual` |
| 我的 | `pages/profile/index` | 登录 `auth/login`、账号停用 `auth/locked`、切换对象 `subject/picker`、编辑资料 `profile/edit`、孩子管理 `profile/children`、孩子信息 `profile/child-form`、设置 `profile/settings`、用户协议 `agreement/index`、隐私政策 `privacy/index`、关于 `about/about` |

报告采用「报告主栏 = 总览、分册页 = 目录、要素解读 = 条目」三层，不设独立报告列表 / 总览页（BR-02 一人一份）。C 端不提供用户侧外观设置，主题只跟随后台 `site_config` 的 `primaryColor` 与 `themeMode`；详细页面、Wot UI 优先与验收口径见 [CLIENT-PORTAL.md](CLIENT-PORTAL.md) 与 [M7 规格](specs/M7-c-end/spec.md)。

## PDF 与外部适配器（M8）

**PDF**：`server/utils/talent-pdf-*.ts` 负责配置、字体、渲染、存储、ticket 与服务编排。六册按冻结快照渲染，每页水印含家长姓名/手机尾号/报告编号/生成日期；产物按 `contentHash` 缓存到 `talent_report_pdfs`，私有存储于 PocketBase 或 OSS；`talent_pdf_downloads` 只存 HMAC 摘要与 UA 家族。C 端唯一下载入口是 `/api/client/talent/reports/:id/volumes/:volumeId/pdf`（H5 新窗口先取 120s ticket），报告发布 / 撤回 / 恢复 / 补发联动可见性，未发布或未开放统一 404 `PDF_NOT_READY`。

**外部适配器**：

| 文件 | 职责 |
| --- | --- |
| `server/utils/talent-external-adapter.ts` | 传输层：env 解析与 fail-fast、HMAC-SHA256 签名 / 时间窗 / nonce、幂等键、错误分类、指数退避、并发 / QPS 限流、熔断、告警钩子与运行指标 |
| `server/utils/talent-external-sources.ts` | 三个外部源（M2 基因查询 / M3 基因报告 / M5 培育建议）的供应商字段映射；Mock → external 的唯一切换点 |
| `server/utils/talent-external-webhook.ts` | 入站 HMAC 校验、触发去重与查询回执落库 |
| `server/utils/talent-integration-status.ts` | `GET /api/admin/talent/integrations/status` 的只读状态投影（不返回密钥 / URL / PII） |

源类型由 `TALENT_GENE_QUERY_SOURCE` / `TALENT_GENE_REPORT_SOURCE` / `TALENT_ADVICE_SOURCE` 控制，默认 `mock`；生产环境仍为 mock 或 `external` 缺基址 / APP_ID / API_SECRET 时启动失败。真实供应商合同未定（C1），当前只完成可注入传输的骨架，未做真实联调。

## B 端

B 端以系统基础管理为中心：账号与 RBAC、组织字典、参数、站点 / 微信配置、主题、健康 / 在线 / 错误监控和审计日志。初始菜单在 `scripts/setup.mjs` 中写入：每个可进入的后台页面是 `C` 菜单，每个管理 API 的查询或操作权限是其下的 `F` 按钮菜单；自定义角色必须同时分配页面和所需按钮权限。页面实现位于 `app/pages/admin/`。

站点配置中的名称、Logo、主色与 `themeMode` 影响 C 端门户；其中品牌主色会与 B 端皮肤双向同步。后台全局亮暗状态与门户外观分别保存，C 端只读取站点配置；当 `themeMode=system` 时跟随设备明暗模式，不再保存用户本机外观偏好。

## 新增能力落点

| 需求 | 放置位置 |
| --- | --- |
| 新管理页面 | `app/pages/admin/talent/<域>/`，并在 `scripts/setup.mjs` 的 `TALENT_PAGE_MENU_DEFS` 登记 |
| 新管理 API | `server/api/admin/talent/` + 领域服务 `server/utils/talent-*.ts` + `app/composables/api/` |
| 新 C 端能力 | `apps/client/src/modules/{foundation,talent}-portal/`；路由页只做组合与参数接线 |
| 新数据结构 | `shared/types/` + `scripts/setup.mjs`（新库）+ `scripts/sync-talent.mjs`（存量库）+ 测试 |
| 新权限码 | `scripts/setup.mjs` 的 C/F 菜单行 + 角色矩阵 + `sync-talent.mjs` 断言，缺一不可 |
| 文件能力 | 复用上传 API、`server/utils/file-url.ts` 与 PDF 私有存储，不自行拼接 PB / OSS 路径 |
| 外部供应商字段差异 | 只改 `server/utils/talent-external-sources.ts` 的映射函数，不改 M2/M3/M5 领域语义 |

具体 API 路由、认证与写入约定见 [API.md](API.md) 与 [CONVENTIONS.md](CONVENTIONS.md)；模块合同与验收见 [specs/](specs/README.md)。

## 基础版与业务模块的分界

Foundation 负责提供可复用的“地基”，不替代业务建模。业务模块需要业务字段时应独立定义 `talent_*` 集合、角色权限、API、B/C 页面和验收；不要把字段追加到 `users` 或将业务状态塞进站点配置。接入前后按 [DEVELOPMENT.md](DEVELOPMENT.md) 的闭环同步类型、初始化、测试和文档。

数据结构发生变化时，应在新的临时数据目录运行一次 `pnpm env:setup` 烟测，断言只存在本节列出的 34 个集合；它不是对运行中环境的迁移方案。存量环境升级用 `pnpm talent:sync`；M6 旧集合归零用 `pnpm migration:m6`（先备份、先 dry-run）。