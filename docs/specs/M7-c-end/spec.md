# M7 · C 端门户规格（4 主栏 / 15 二级页 / 报告·建议·方向·我的）

| 项 | 内容 |
| --- | --- |
| 状态 | **规格已出（2026-11-17，architect-m7 / task-25；待 lead 复核）**，实现与验收未开始 |
| 日期 | 2026-11-17 |
| 决策人 | 架构师 teammate（task-25），关键取舍见 [ADR 0007](../../adr/0007-m7-client-portal.md) D1–D8 |
| 关联 | PRD v1.1 §5.2（L122–140）/ §7（L341–418）/ §10（L581–589）/ §11（L591–602）/ §12（L604–630）；[UX 基线](ux-baseline.md)；[M2 规格](../M2-members/spec.md) §7、[M3 规格](../M3-reports/spec.md) §7、[M4 规格](../M4-matching/spec.md) §7、[M5 规格](../M5-advice/spec.md) §7、[M6 规格](../M6-cleanup/spec.md) §7；[CLIENT-PORTAL](../../CLIENT-PORTAL.md)、[app/DESIGN.md](../../../app/DESIGN.md)、[AGENTS.md](../../../AGENTS.md) C 端规则、[wot-ui-v2 SKILL](../../../.agents/skills/wot-ui-v2/SKILL.md)、[mini-program-ux SKILL](../../../.dsh/skills/mini-program-ux/SKILL.md) |
| 影响范围 | `apps/client/src/{pages,modules/foundation-portal,modules/talent-portal,api,http,store,style}`、`apps/client/{pages.config.ts,pages.json}`、`server/api/client/talent/**`（M7 新路由）、`shared/types/talent-client.ts`（如需）、`test/talent-client-api.test.ts`、`scripts/e2e/07-m7-client.mjs`、`docs/{CLIENT-PORTAL,API,STATUS}.md`（出口由 lead 派发） |
| 不做的事 | 不写代码、不 commit、不改 `app/`（B 端）、不改 M1–M6 已交付实现；只写 `docs/specs/M7-c-end/` 与 `docs/adr/` |

> 本文沿用 M1–M6 规格的写法：先冻结边界与合同，再给页面与验收。PRD 与冻结契约冲突时标「待裁决」，不静默二选一。AC-APP 编号由本规格自定（PRD §12 C 端清单无 AC 编号），映射见 §14。

---

## 0. 决策基线（ADR 0007 摘要，不再作为未决项）

| # | 决策 | 本文落点 | ADR |
| --- | --- | --- | --- |
| D1 | **4 主栏 + 15 二级页**：报告列表/总览合并进「报告」主栏（一人一份，无独立列表页），分册=目录、要素解读=条目；15 页按原型四栏口径固定，新增/删除页面需新 ADR | §2 | D1 |
| D2 | **旧双 Tab / 9 个天赋页整体迁移**：保留认证、资料、协议、隐私、关于、注销的路径与能力；旧天赋报告四页收敛为报告主栏 + 分册 + 要素；旧 `talent/binding`、`talent/plans`、`interpretations`、`TalentChildSwitcher` 删除；不保留旧路由空壳别名（预发布阶段） | §2.5 | D2 |
| D3 | **Wot UI 最高优先**：能用 `wd-*` 就不用原生；原生只保留微信开放能力（`getPhoneNumber`、`chooseAvatar`、`open-type="share"`、`input type="nickname"`）与 `uni.downloadFile/openDocument`，且必须重置默认样式 | §12.1 | D3 |
| D4 | **主题只跟随后台**：只读取 `GET /api/client/config/site` 的 `primaryColor` / `themeMode`，派生 `--foundation-*` 与 `--wot-*`；**不提供任何用户侧外观开关**，不写回站点配置 | §12.4 | D4 |
| D5 | **对象切换是纯本机视图偏好**：`talent_parents.userId` 是唯一归属真源，服务端不持久化 `isCurrent`；切换只记本机并按 `userId` 隔离；所有数据请求显式携带对象/报告标识，服务端以登录态重新鉴权，越权一律 404 | §4 | D5 |
| D6 | **登录退化矩阵**：小程序手机号一键为主、微信登录兜底；H5 只做账号密码（不接微信 OAuth）；游客可浏览首页/我的，业务页引导登录；账号停用进停用页；过期回登录并回跳 | §3 | D6 |
| D7 | **PDF 只做代理消费**：M7 实现分册 PDF 的归属/状态/开放册门禁与流式代理、下载/打开交互；真实渲染、水印、对象存储签名与时效归 M8；不可下载时给明确文案，不暴露直链 | §6.5 | D7 |
| D8 | **双端差异编译期隔离**：`#ifdef H5` / `#ifdef MP-WEIXIN` 只包平台 API 分支，业务逻辑与文案共用；小程序不使用 DOM/`window`；H5 提供 `:focus-visible`；包体不进大依赖 | §12.6 | D8 |

---

## 1. 范围与不在范围

### 1.1 本里程碑交付

- **路由与导航**：4 主栏（首页 / 报告 / 培养方向 / 我的）+ 15 二级页，自绘 `PortalTabbar`（4 项），`pages.json` 注册，深链、返回栈、登录守卫、切换 Tab 语义。
- **认证与账号**：登录页（协议勾选、微信手机号一键、微信登录兜底、H5 账号密码、游客）、账号停用页、登录过期回跳、注销账号（二次确认，无独立页面）、未绑定家长提示与 `claim` 认领。
- **首页**：对象卡 + 六态脚注 + 待核对提示 + 四宫格 + 页脚说明；加载/空/错/未登录/弱网状态。
- **报告主栏**：对象条（唯一切换入口）+ 页签「基因报告（可读册数）/ 培育建议（份数）」；状态卡；固定六册全列（可读/未检测/未开放）；分册页（数据熵筛选、章节、要素行、无编码、本册 PDF）；要素解读（数据熵、天赋解读、适用条件、相关方向、上一项/下一项循环、返回来源）。
- **培育建议**：报告页页签内的按分册列表 + 独立建议页（首页四宫格直达）+ 建议书详情（四段、`adv:<分册>` 筛选记忆、周期说明、空态/撤回不可见）。
- **培养方向**：推荐方向（≤5，按冻结命中排序，0 命中回退标「暂无匹配」，空快照空态）/ 已选方向（N/3、取消、换档）/ 方向详情（命中 N/M、要素对照、档位）/ 自己填写（拼音排序下拉 + 末位「其他（自己填写）」≤10 字 + 培养目标）。
- **我的**：家长资料卡、编辑资料、孩子管理（列表/新增/编辑）、用户协议、隐私政策、关于/版本信息、退出登录、注销账号。
- **C 端 API**：`server/api/client/talent/**` 的 M7 路由（summary / report / volume / pdf / profile / children / claim 消费），以及 M4 的 directions/selections、M5 的 advice、M2 的 bindings 的**消费**；统一错误模型与守卫；越权 404。
- **视觉与体验**：Wot 优先决策树、390/340、44px、安全区、微信胶囊、主题令牌、暗色、加载/空/错/未登录状态、弱网、动效克制。
- **验收合同**：AC-APP-01..15、截图矩阵、双端构建、`console` 0、wxss 检查、测试命令、实施顺序、风险与未决项。

### 1.2 不在范围（M7 不做，避免越界）

| 项 | 归属 | 说明 |
| --- | --- | --- |
| 真实 PDF 渲染、六册模板、水印、对象存储签名/时效、下载留痕报表 | **M8** | M7 只做权限代理与下载交互；M8 前用明确「暂不可下载」文案，不伪造 PDF |
| 真实第三方基因报告/建议接口、重试退避、限流、告警、定时同步 | **M8** | M7 消费 M3/M5 已发布快照，不感知外部源 |
| 微信模板消息/订阅消息、短信、客服消息、分享朋友圈 | 未列入报价范围 | 仅保留 `open-type="share"` 可选入口时也不做后端 |
| 后台页面、后台 API、B 端菜单/权限 | M1–M6 / M9 | 不改 `app/**`、`server/api/admin/**` |
| 旧机构/服务商/培养计划/内容库/报告接收任何入口 | M6 已删除 | **不恢复**。C 端不出现机构、服务商、课程、计划、审核等旧口径 |
| 多租户、多站点、按机构切换、`TENANT_MODE`、`site` cookie、`X-Site-Slug`、第二个 PB 连接 | **永久红线** | 单实例单 PocketBase；C 端只读唯一站点公开配置 |
| 用户侧外观设置（主题开关、字号切换、深浅色手动切换） | 产品红线 | 只跟随后台 `site_config`；见 D4 |
| C 端绑定/解绑子女、邀请码、手动输入会员编号绑定 | 产品口径 | 归属只由后台会员管理维护；C 端只做本人 + 已授权子女的**视角切换**；`claim` 只认领唯一 parent |
| 家庭多家长/多账号共享同一子女 | 后续需求 | M2 单 `parentId`；双账号需关系表 + 新 ADR |
| 短信验证码、找回密码、换绑手机号 | 未列入报价范围 | H5 账号密码登录；忘记密码联系后台（待裁决，见 §18 U1） |
| 阅读进度（`talent_reading_progress`） | 本规格裁决：M7 不做 | PRD §7 无进度要求；M6 保留集合但 M7 不读写，M9 再评估（见 §18 U5） |
| 报告列表分页/检索、报告导出打包 | — | 一人一份报告（BR-02），无列表分页；打包下载归 M8 |
| 端到端全量测试重写、1000 条性能专项 | M9 | M7 只交 C 端主链 smoke 与截图基线 |

### 1.3 硬约束

- 单实例、单 PocketBase；不新增 `TENANT_MODE`、`site` cookie、`X-Site-Slug`、按请求切库。
- C 端只调 `/api/client/*`；不直连 PocketBase、不调管理员接口、不接受前端指定数据源。
- 天赋业务只落 `talent_*` 集合；C 端**写**接口只写 `talent_parents` / `talent_children` / `talent_reports.selections` / `talent_direction_requests`，复用 M2/M4 已冻结服务层函数，不新写一套校验/加密。
- 手机号、身份证默认脱敏；密文/哈希**永不进任何响应**；日志不含明文；全号在本里程碑**不提供** C 端查看。
- 主题只读后台；不出现硬编码品牌色、行业色、行业旧口径文案。
- 页面不直连 API：页面只组合 `src/modules/**` 组件与 composable；请求/缓存/守卫放 composable 或 store。
- 不写代码、不 commit；`git diff` 只允许 `docs/specs/M7-c-end/` 与 `docs/adr/`。

---

## 2. 信息架构、路由与导航

### 2.1 4 主栏 + 15 二级页（计数口径固定）

**口径**：一级 = 底部自绘 Tabbar 的 4 个主栏；二级 = 除主栏外的独立注册页面。主栏内页签（基因报告/培育建议、推荐方向/已选方向）与弹层/面板（档位选择、确认框）**不计数**；注销为「我的」内二次确认动作，**不占二级页**。共 19 条路由。

| # | 主栏 | 路由 | 页面职责 | 未登录行为 |
| --- | --- | --- | --- | --- |
| T1 | 首页 | `pages/home/index` | 品牌栏、对象卡、待核对提示、四宫格、页脚 | 可浏览（游客欢迎态 + 登录引导） |
| T2 | 报告 | `pages/report/index` | 对象条 + 页签「基因报告/培育建议」、状态卡、六册目录、建议分册列表 | 需登录；`redirectTo` 登录并回跳 |
| T3 | 培养方向 | `pages/direction/index` | 页签「推荐方向/已选方向」，推荐卡/已选卡、取消/换档入口 | 需登录；`redirectTo` 登录并回跳 |
| T4 | 我的 | `pages/profile/index` | 资料卡、四入口、版本、退出、注销 | 可浏览（未登录显示登录卡） |

| # | 二级页 | 路由 | 所属主栏 | 入栈来源 / 深链 | 关键参数 | 返回目标 | 登录 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | 登录 | `pages/auth/login` | — | 守卫跳转、我的登录卡、退出登录 | `redirect`（可选，仅 `/pages/` 开头的站内路径） | 登录成功 → `redirect` 或首页；返回 → 来源页/首页 | — |
| S2 | 账号停用 | `pages/auth/locked` | — | 403 `ACCOUNT_DISABLED`、summary `parent_disabled` | `reason`（枚举，仅控制文案，不展示内部码） | 退出登录 → 登录页；联系客服 | —（需有会话或错误上下文） |
| S3 | 切换对象 | `pages/subject/picker` | 首页/报告/我的 | 对象条、待核对提示、孩子管理入口 | 无（来源页由导航栈决定） | `navigateBack` 回来源页 | 是 |
| S4 | 分册页 | `pages/report/volume` | 报告 | 报告主栏六册行、建议书「看本册要素」 | `reportId`、`volumeId` | 返回报告主栏（保留页签） | 是 |
| S5 | 要素解读 | `pages/report/factor` | 报告 | 分册页要素行 | `reportId`、`volumeId`、`index`（0 起，本册内） | 返回分册页（保留筛选）；上一项/下一项本册内循环 | 是 |
| S6 | 培育建议（独立页） | `pages/advice/index` | 报告 | 首页四宫格、深链 | `reportId`（可选，缺省取当前对象） | 返回来源页/报告主栏 | 是 |
| S7 | 建议书 | `pages/advice/detail` | 报告 | 建议列表、报告主栏建议页签 | `reportId`、`book`（A–F 内部键，不展示） | 返回建议列表/报告主栏建议页签 | 是 |
| S8 | 方向详情 | `pages/direction/detail` | 培养方向 | 推荐卡、已选卡「更换档位」 | `reportId`、`directionId`（或 `requestId`） | 返回培养方向主栏 | 是 |
| S9 | 选择方向（自填） | `pages/direction/manual` | 培养方向 | 推荐页「自己填写」、已选空态 | `reportId` | 返回培养方向主栏 | 是 |
| S10 | 编辑资料 | `pages/profile/edit` | 我的 | 资料卡 | 无 | 返回我的 | 是 |
| S11 | 孩子管理 | `pages/profile/children` | 我的 | 我的、首页待核对提示、四宫格 | 无 | 返回我的/来源页 | 是 |
| S12 | 孩子信息（新增/编辑） | `pages/profile/child-form` | 我的 | 孩子管理「新增/编辑」 | `id`（编辑时）；无 id 为新增 | 返回孩子管理 | 是 |
| S13 | 用户协议 | `pages/agreement/index` | — | 登录页、我的 | 无 | 返回来源页 | — |
| S14 | 隐私政策 | `pages/privacy/index` | — | 登录页、我的、资料编辑 | 无 | 返回来源页 | — |
| S15 | 关于/版本 | `pages/about/about` | 我的 | 我的「版本信息」 | 无 | 返回我的 | — |

**报告列表/总览/目录/条目四层收敛说明**（回应任务口径，避免误解）：BR-02 一人一份 ⇒ **不设独立「报告列表」页与「报告总览」页**；报告主栏即总览（对象条 + 状态 + 页签 + 六册目录），分册页即目录（章节 + 要素行），要素解读即条目。旧 `talent/report/{list,overview,catalog,item}.vue` 四页由「报告主栏 + 分册页 + 要素解读」三页承接，`list` 与 `overview` 合并。

### 2.2 `pages.json` 注册与生成规则

- 页面由文件路径经 `@uni-helper/vite-plugin-uni-pages` 生成，**禁止手改 `pages.json` 的 `pages` 数组**；仓库提交生成结果。`pages.config.ts` 只保留 `globalStyle`（`navigationStyle: "custom"`、站点名），**不注册原生 `tabBar`**（自绘 `wd-tabbar`）。
- 首屏 `type: "home"` 固定为 `pages/home/index`；其余主栏为普通 `type: "page"`。
- 不开启 `enablePullDownRefresh`（自定义导航 + 下拉刷新双端体验不一致）；刷新用 `onShow` + 错误态「重试」+ 切换对象自动刷新。
- H5 使用 hash 路由（uni-app 默认），`VITE_APP_PUBLIC_BASE` 与 H5 子路径部署一致；小程序按路径 + query 进入。

目标形态（示意，`pages.json` 由插件生成）：

```jsonc
{
  "globalStyle": { "navigationBarTitleText": "同佳天赋", "navigationStyle": "custom" },
  "pages": [
    { "path": "pages/home/index", "type": "home" },
    { "path": "pages/report/index", "type": "page" },
    { "path": "pages/direction/index", "type": "page" },
    { "path": "pages/profile/index", "type": "page" },
    { "path": "pages/auth/login", "type": "page" },
    { "path": "pages/auth/locked", "type": "page" },
    { "path": "pages/subject/picker", "type": "page" },
    { "path": "pages/report/volume", "type": "page" },
    { "path": "pages/report/factor", "type": "page" },
    { "path": "pages/advice/index", "type": "page" },
    { "path": "pages/advice/detail", "type": "page" },
    { "path": "pages/direction/detail", "type": "page" },
    { "path": "pages/direction/manual", "type": "page" },
    { "path": "pages/profile/edit", "type": "page" },
    { "path": "pages/profile/children", "type": "page" },
    { "path": "pages/profile/child-form", "type": "page" },
    { "path": "pages/agreement/index", "type": "page" },
    { "path": "pages/privacy/index", "type": "page" },
    { "path": "pages/about/about", "type": "page" }
  ]
}
```

### 2.3 Tab 切换、返回栈与深链

**Tabbar**：`PortalTabbar` 从 2 项扩为 4 项（首页 / 报告 / 培养方向 / 我的），内部仍为 `wd-tabbar` + `wd-tabbar-item`；`placeholder`、`fixed`、`safe-area-inset-bottom`、`bordered` 保留；`active` 由当前路由推导；点击只接受 4 个合法值。每个 Tab 根页是**独立栈底**。

| 行为 | 规则 |
| --- | --- |
| 主栏互切 | `uni.reLaunch({ url })`：清空页面栈，目标 Tab 为栈底；不累积历史。H5 浏览器后退退出门户，这是自绘 Tabbar 的已知取舍（ADR 0007-D1） |
| 二级页进入 | `uni.navigateTo` 入栈；页面栈深度上限 10，实际最深 3（报告→分册→要素） |
| 二级页返回 | `uni.navigateBack`；栈深 = 1（H5 刷新/外链/小程序 scene 直入）时改为 `reLaunch` 到所属主栏 |
| 深链 / 冷启动 | `onLoad` 解析 query → 恢复会话 → 加载 summary → 校验参数 → 拉取数据；失败给「内容不可查看」+ 回首页，不白屏 |
| 深链回跳 | 未登录访问受保护二级页：`redirectTo('/pages/auth/login?redirect=' + encodeURIComponent(当前路径+query))`；登录成功只接受 `/pages/` 开头且不含 `://` 的路径，非法回首页（防开放重定向） |
| 对象切换返回 | `navigateBack` 回来源页，来源页 `onShow` 以新对象重载；不在切换页内跳主栏 |
| 参数约定 | 只传业务标识（`reportId` / `volumeId` / `index` / `book`），不传姓名、手机号、身份证等 PII；`book`/`volumeId` 为内部键，不渲染 |
| 参数校验 | `volumeId` 必须 `V1`–`V6`；`index` 必须为非负整数且小于本册要素数；`book` 必须 `A`–`F`；非法 → 参数错误态 + 返回，不发起越权请求 |
| 返回按钮 | 二级页统一 `PortalPageHeader`（`wd-navbar` 封装）+ 44px 返回热区；H5 提供 `aria-label="返回"` |

**页面标题**（`navigationBarTitleText` 自定义导航时以页面内标题为准）：登录 / 账号状态 / 切换对象 / 报告 / 分册 / 要素解读 / 培育建议 / 建议书 / 培养方向 / 方向详情 / 选择方向 / 我的 / 编辑资料 / 孩子管理 / 孩子信息 / 用户协议 / 隐私政策 / 关于。

### 2.4 代码落点（页面薄壳，逻辑进模块）

| 层 | 落点 | 约束 |
| --- | --- | --- |
| 页面 | `apps/client/src/pages/**`（19 个 `.vue`） | 只做参数解析、`onLoad/onShow` 接线、组合组件；不写业务规则、不发裸请求 |
| 天赋业务组件 | `src/modules/talent-portal/components/` | 对象条、报告状态卡、六册目录、分册要素、建议书四段、方向卡、档位选择、空/错/未登录状态视图 |
| 天赋业务 composable / store | `src/modules/talent-portal/composables/`、`src/store/talent-portal.ts` | summary、当前对象、报告/分册、建议、方向、资料/孩子；会话级缓存，退出/切换账号清空 |
| 基础门户 | `src/modules/foundation-portal/`（保留并扩展） | 主题、认证（登录面板/微信授权）、Tabbar、返回/登录守卫、协议文档、资料编辑基础表单 |
| API | `src/api/talent.ts`（重写）、`src/api/talent-types.ts` | 只拼 `/api/client/talent/*`，类型与契约一一对应 |
| HTTP | `src/http/http.ts`（扩展） | 统一错误模型 `{ statusCode, code, state, message }`；401 清会话并回登录；不弹出技术错误码 |
| 样式 | `src/style/index.scss`、`store/site.ts` | 只用 `--foundation-*` / `--fs-*` / `--sp-*` / `--wot-*` 令牌，不新增硬编码色值 |

### 2.5 旧路由迁移映射（M6 交接 + M7 重建）

| 旧文件 | 处置 | 新落点 | 说明 |
| --- | --- | --- | --- |
| `src/pages/index/index.vue` | 删除/替换 | `pages/home/index` | 首页重建 |
| `src/pages/me/me.vue` | 删除/替换 | `pages/profile/index` | 我的重建 |
| `src/pages/talent/report/list.vue`、`overview.vue` | 删除 | `pages/report/index` | 列表/总览合并 |
| `src/pages/talent/report/catalog.vue` | 删除 | `pages/report/volume` | 目录→分册页 |
| `src/pages/talent/report/item.vue` | 删除 | `pages/report/factor` | 条目→要素解读 |
| `src/pages/talent/interpretations/index.vue` | 删除 | 并入 `pages/report/factor` | 旧「要素解读」列表页 |
| `src/pages/talent/binding.vue`、`components/TalentChildSwitcher.vue` | 删除 | `pages/subject/picker` | 旧视角切换依赖旧 bindings，M6 已删旧 bindings 入口 |
| `src/pages/talent/plans/index.vue` | 删除（M6） | — | 培养计划整体退出（PRD §3.2） |
| `src/pages/account/delete.vue` | 删除 | 「我的」内 `wd-dialog` 二次确认 | 注销不占二级页 |
| `src/pages/auth/login.vue`、`profile/edit.vue`、`agreement/index.vue`、`privacy/index.vue`、`about/about.vue` | **保留路径**，内容重写 | 同名新实现 | 路径不变，降低深链与文档迁移成本 |
| `src/store/talent.ts`、`src/api/talent.ts`、`src/api/talent-types.ts`、`src/utils/talent-presentation.ts` | 重写 | 新模块/新 API | 旧字段（`customerId`、旧报告条目）不得残留 |
| `src/modules/foundation-portal/components/{PortalAccountContent,TalentHomeContent,PortalReportCover,...}` | 按需重写/退役 | 新组件 | 认证/主题/文档基础能力保留 |

**不保留旧路由空壳别名**：C 端尚未对外发布，无存量深链；保留别名会增加页面数（违反 4+15）并让旧页面代码残留。上线后如确需改路由，再按新 ADR 加「空壳页 + `redirectTo`」。

**M6 出口联动**：M6 §7.3 要求 M7 先覆盖报告页/分册/要素解读/切换对象，否则 M6 只能以书面豁免放行；本规格的 S3–S7、T2 即为该门槛的交付物。

---

## 3. 登录、协议、授权与账号状态（FR-APP-01）

### 3.1 账号状态机（C 端视角）

| 状态 | 判据（服务端） | C 端表现 | 关键动作 |
| --- | --- | --- | --- |
| 游客 | 无有效 token | 首页/我的可浏览；点击业务入口 → 登录页（带回跳） | 登录、浏览协议/隐私/关于 |
| 未绑定家长 | 有效 token，但 `talent_parents.userId` 无匹配且 claim 无命中 | 首页空态「暂未关联会员档案」+「重新匹配」；我的显示登录卡 + 未绑定说明 | 自动/手动 claim、联系客服、退出登录 |
| 正常 | token 有效 + parent `status="1"` | 正常使用 | — |
| 家长停用 | parent `status="0"` | summary 返回 `accountState="parent_disabled"` → 跳停用页；其他数据接口 404 | 联系客服、退出登录 |
| 账号停用 | `users.status="0"`，`GET /auth/profile` 或业务接口 403 `ACCOUNT_DISABLED` | 停用页（不可进入主栏） | 联系客服、退出登录 |
| 会话过期 | token 过期 / 401 | 清本地会话 → 登录页（`redirect` 回跳） | 重新登录 |
| 已注销 | 注销成功 | 清本地 → 登录页 | — |

**状态判定数据源**：`GET /api/client/talent/summary`（M7 新增）返回 `accountState`（见 §10.2）；认证接口 401/403 由统一错误模型映射。C 端**不根据 bindings 空数组自行推断停用**（M2 契约里未绑定与家长停用都返回空 items）。

### 3.2 登录页（S1）

**结构**（单屏、无 Tabbar、无返回或仅顶部关闭）：
1. 品牌区：站点 `logo`（失败回退首字方块）+ `appName` + `slogan`（一句话说明，来自站点配置，不硬编码）。
2. 微信授权区（仅 `MP-WEIXIN`）：主按钮 `wd-button type="primary" size="large" block`，`open-type="getPhoneNumber"`，文案「微信手机号一键登录」；次按钮（文字）「微信快捷登录」`wx-login` 兜底。
3. H5 账号密码区（仅 `H5`）：`wd-input` 账号（手机号/邮箱/identity，`type="text"`）+ 密码（`wd-input type="password" show-password`）+ 登录按钮；键盘类型正确、失焦校验、密码不可见默认。
4. 协议勾选：`wd-checkbox` + 文案「我已阅读并同意《用户协议》《隐私政策》」，两个书名号为可点链接（`wd-link` 语义或文本 + `role="link"`）；**未勾选时主按钮 disabled**，点击主按钮不发起请求，行内提示「请先阅读并同意协议」。
5. 游客入口：「先随便看看」文字按钮 → 首页（游客态）。
6. 底部：客服电话（`site.contactPhone`，有值才展示，`tel` 拨号）。

**协议门禁实现**：勾选状态只在登录页内存 + `onShow` 保留；不预勾选、不跨会话记忆；协议/隐私页返回后保持勾选。登录成功后才能写入会话；勾选本身不产生服务端记录（如需留痕，另立账户域需求）。

**首次登录**：不强制完善资料；直接 `reLaunch` 首页。若 `isNew`，首页顶部可显示一次性引导条「完善头像与昵称，方便在报告中辨认」，可关闭（本机记忆，不阻断）。

### 3.3 微信授权、手机号一键与 H5 账号密码

| 端 / 入口 | 触发 | 接口 | 成功 | 失败 |
| --- | --- | --- | --- | --- |
| 小程序·手机号一键 | `wd-button open-type="getPhoneNumber"`（用户点击）→ `getphonenumber` 事件拿 `code` | `POST /api/client/auth/wx-phone-login`（`loginCode` + `phoneCode`） | 写会话；`refreshProfile`；`claim`；`reLaunch` 首页或 `redirect` | 拒绝授权 → 提示「未获得手机号授权，可用微信登录或联系客服绑定」；接口失败 → 保留页面 + 可重试；**不循环弹授权** |
| 小程序·微信登录 | 次按钮 | `POST /api/client/auth/wx-login`（`code`） | 写会话；手机号为空 → 不自动 claim；首页「未关联会员档案」+ 联系客服 | 失败提示重试；微信未配置 → 文案「微信登录未配置，请联系管理员」 |
| H5·账号密码 | 表单提交 | `POST /api/client/auth/phone-login`（`identity` + `password`） | 写会话；`claim`；回跳 | 账号/密码错误统一「账号或密码错误」；不做账号存在性区分；连续失败不做本地锁定（服务端限流归 M8/M9） |
| H5·微信 OAuth | — | — | **不在范围** | 不展示入口；旧文档/环境变量中的 OAuth 回调不再要求 |

- 小程序登录页通过 `#ifdef H5` / `#ifdef MP-WEIXIN` 编译期隔离，**账号密码表单不进入小程序产物**；微信授权按钮不进入 H5 产物（H5 不依赖 `open-type`）。
- 登录结果只保存 token、过期时间、中性资料；**token 不进 URL、日志、埋点、截图**。
- 登录成功后统一调用一次 `bindings` +（本地无 claim 记录时）`claim`；claim 结果本机缓存 `userId + status`，退出/注销清空。

### 3.4 账号停用页（S2）

- 全屏无 Tabbar，展示：状态图标（`wd-icon`）、标题「账号已停用」、说明「该账号暂时无法查看报告与培养方向，请联系客服处理」、客服电话按钮（`site.contactPhone`）、「退出登录」按钮。
- 不展示停用原因细节、不展示内部错误码、不提供「申诉」表单（不在范围）。
- 触发：summary `accountState="parent_disabled"`；或任意接口 403 `ACCOUNT_DISABLED`；或登录响应带停用标记（若账户域调整认证契约，以账户域为准）。
- 退出后 `reLaunch` 登录页；小程序返回不回到主栏（`reLaunch` 清栈）。

### 3.5 登录过期（401）与回跳

- `http.ts` 统一处理：401 → `authStore.logout()` → 清空天赋缓存与当前对象 → `reLaunch` 登录页并带 `redirect`（当前页路径 + query，经过白名单校验）。
- 同一次会话内并发多个 401 只跳转一次（防重复导航/闪烁）。
- 登录成功消费 `redirect`：仅接受以 `/pages/` 开头、不含 `://`、不含 `..` 的路径；否则回首页。`redirect` 只用于导航，不携带 token。

### 3.6 注销账号（无独立页面）

- 入口：「我的」底部危险区「注销账号」，`wd-cell` 破坏性样式（`--foundation-danger`）。
- 流程：`wd-dialog`（`useDialog`）二次确认，正文列明影响：
  1. 注销后不可恢复，无法再用同一微信/账号登录；
  2. 已绑定的会员档案、报告、建议将不可查看（后台审计留痕不受影响）；
  3. 如需再次使用，需联系客服重新建档。
- 二次确认按钮「确认注销」（`type="error"`）；勾选「我已了解注销不可恢复」后才可提交（避免误触）。提交中 loading + 防重复；成功后清 token/资料/对象/筛选记忆/claim 缓存 → `reLaunch` 登录页。
- 接口：`POST /api/client/auth/delete-account`（既有）；失败：401 按过期处理；其他错误 toast 可读文案，不显示技术码。

### 3.7 未绑定家长与 `claim` 认领

- 登录成功后：
  1. `GET /api/client/talent/bindings` → `items` 非空且解析出家长 → 正常。
  2. `items` 为空：若本机无 claim 记录且当前账号有手机号（`users.phone`）→ `POST /api/client/talent/bindings/claim` 一次；结果 `bound` / `already_bound` → 重拉 bindings；`no_match` / `no_phone` / `ambiguous` / `conflict` → 首页显示「未关联会员档案」卡片。
- 「未关联会员档案」卡：说明「请确认手机号与后台登记一致；如仍未匹配，请联系客服核对会员档案」；按钮「重新匹配」（再调 claim）+ 客服电话 + 退出登录。**不提供手动输入会员编号/邀请码**（不在范围）。
- `conflict` 文案「该手机号对应的家长档案已绑定其他账号，请联系客服」；`ambiguous` 文案「匹配到多份档案，请联系客服核对合并」。

---

## 4. 对象切换（FR-APP-09）

### 4.1 数据与真源

- 归属真源：`talent_parents.userId = 当前账号`；服务端只按登录态解析 parent，**不接受前端传 `parentId` 作为归属依据**。
- 可切换对象 = 本人（`talent_parents`）+ 已绑定且 `talent_children.status="1"` 的子女；解绑/归档/停用不出现在列表。
- **服务端不持久化「当前对象」**（不写 `isCurrent`、不建绑定表）；M2 bindings 的 `currentId` 只作为默认值（本人）。
- C 端本机记忆：`foundation:talent:subject:<userId>` 存 `{ subjectType: "self"|"child", subjectId, at }`；退出登录、注销、切换账号、家长停用/解绑导致对象失效时清除。
- 数据请求携带方式：`summary?subjectId=<id>`；报告内容以 `reportId` 定位（服务端校验报告归属）。**不把 `subjectId` 当作授权凭据**——服务端总是重新校验归属。

### 4.2 对象条（`PortalObjectBar`）

| 位置 | 展示 | 可点 |
| --- | --- | --- |
| 首页 | 头像/首字 + 姓名 + 关系标签（本人/子女）+ 切换 | 多对象时可点；仅本人时隐藏整条 |
| 报告主栏 | 头像/首字 + 姓名 + 关系标签 + 「切换」 | **报告页的唯一切换入口**；多对象可点，单对象显示静态条（不显示「切换」） |
| 我的 | 报告对象行（同上） | 多对象可点；单对象退化为单行「我的报告」不可点 |

- 关系标签：横向 `11px` 胶囊，`--foundation-surface` 底 + `--foundation-interactive` 文字；名字与标签同一行，不换第二行。
- 可点区域整条 ≥ 48px 高，符合 44px；`role="button"`、`aria-label="切换报告对象"`；H5 `:focus-visible`。

### 4.3 切换页（S3）

- 列表：本人一行 + 每个子女一行；每行：首字头像、姓名、`性别 · 年龄`、报告状态文案（见 §11.2）、当前项 `wd-icon name="check"` 选中态。
- 点击行：写入本机对象 → `uni.showToast('已切换报告对象')` → `navigateBack`；来源页 `onShow` 重载 summary。
- 加载态：`wd-loading` 或骨架；空态（只有本人）：仍展示本人一行并说明「暂未绑定孩子，孩子档案由后台维护」；错误态：可重试。
- 底部说明：「同一时间只看一个对象的报告、建议与培养方向；切换后内容会跟着变。」

### 4.4 越权、失效与跨对象防串号

- 请求 `summary?subjectId=X`：X 不在当前家长的本人/已绑定子女集合 → **404**（不区分不存在与无权限，不泄露存在性）。
- 解绑/停用/撤回后：下一次请求立即失效（服务端不缓存）；C 端不缓存跨会话报告内容。
- 对象失效：本机 selected 不在 summary.subjects 中 → 自动回退本人 + toast「该对象已不可查看」；本人也不存在（parent 停用/未绑定）→ 按 §3 状态处理。
- **防串号硬规则**（原型历史缺陷，M7 必须杜绝）：
  1. 报告/分册/建议/方向请求必须带 `reportId`（或缺省由**当前对象**解析），不得回落到「家长名下任意一份报告」；
  2. 所有页面切换对象后重新拉取，不复用旧对象缓存；
  3. 本机对象 key 按 `userId` 隔离，多账号切换不串；
  4. 提交方向/改档后刷新当前对象的选择列表，不使用全局单例 `selections`。

---

## 5. 首页（FR-APP-02，T1）

### 5.1 结构（自上而下）

1. **品牌栏**（`PortalBrandHeader`）：`logo` + `appName`；右侧可选「客服」图标（有 `contactPhone` 时）。不使用大图 Banner。
2. **对象卡**（登录 + 有家长时）：当前对象首字/头像、姓名、关系胶囊、`性别 · 年龄`、脚注状态文案（§11.2）、右侧「切换」；整卡可点进切换页。游客态替换为欢迎卡：「看见天赋，陪伴成长」+ 一句话说明 +「登录查看报告」。
3. **待核对提示**（有条数时）：「N 个孩子的检测结果待核对」→ 点击进孩子管理；条件 = 子女 `query != "found"` 的数量（与报告是否同步无关）。
4. **四宫格**（`wd-grid` 2×2 或自绘 2×2，按钮 ≥ 88px 高）：
   | 入口 | 副标题 | 点击 |
   | --- | --- | --- |
   | 报告与分册 | 可读：`N 篇 · 按分册阅读`；整理中：`整理中 · 待发布`；更新中：`更新中 · 完成后可读`；无报告：`等待报告同步` | 切到报告主栏 |
   | 培育建议 | `N 份建议书 · 一册一份` 或 `暂未发布` | 报告主栏 `?tab=advice` 或独立建议页（§7.1） |
   | 培养方向 | `已选 N/3 个方向` 或 `按命中项数选择` | 切到培养方向主栏 |
   | 孩子管理 | `N 个孩子` / `N 个待核对` | 孩子管理页 |
5. **页脚小字**：`copyright` + 一句说明「报告由检测机构出具，按分册同步；内容仅作成长参考，不构成医学建议。」（站点版权取配置；说明文案为产品固定文案）。

### 5.2 状态

| 状态 | 表现 |
| --- | --- |
| 加载 | 骨架屏（`wd-skeleton`）：品牌栏 + 对象卡 + 2×2 方块；超过 300ms 才显示，避免闪烁 |
| 游客 | 欢迎卡 + 四宫格（点击进登录）；页脚照常 |
| 未绑定 | 对象卡换为「未关联会员档案」卡（说明 + 重新匹配 + 客服） |
| 无报告 | 对象卡脚注「该对象暂无基因报告」；四宫格副标题降级；报告主栏显示状态卡 |
| 错误 | 保留品牌栏与对象卡，内容区 `wd-empty` + 「加载失败，请重试」+ 重试按钮；不白屏 |
| 弱网/断网 | 顶部 `wd-notice-bar`「网络已断开，恢复后将自动重试」；恢复后自动重试一次；不做离线缓存 |

### 5.3 数据

- `GET /api/client/talent/summary`（§10.2）一次取 `accountState` / `subjects` / `current` / `pendingCheckCount` / 四宫格计数；首页不串行发四个请求。
- `onShow` 刷新（切回首页、切对象后、从二级页返回）；下拉不启用。
- 首屏性能：summary 单请求 + 骨架，目标 ≤ 1.5s（PRD §11）；图片仅站点 logo，失败回退首字。

---

## 6. 报告主栏（FR-APP-03/04/05，T2）

### 6.1 结构

- **对象条**（§4.2）：报告页唯一切换入口。
- **页签**（`wd-tabs`，粘性置顶 `wd-sticky`）：
  - 基因报告（`可读册数` 徽标）
  - 培育建议（`份数` 徽标）
- **状态卡优先**：报告不可读（`pending_publish` / `retracted` / 无报告 / 查询中 / 未查到 / 未查询）→ 只显示状态卡（§11.2）+ 说明 +「刷新」+（待核对时）「去孩子管理」；**不列分册、不展示下载、建议页签显示空态**。
- **可读时（基因报告页签）**：
  - 表头：全开 `6 篇`；部分开放 `共 6 册 · N 册可读`。
  - 固定 6 行，顺序固定：生长发育 / 智商 / 情商 / 领导商 / 艺术商 / 体育运动商。
  - 行内容：序号、册名、`N 章 · M 项要素`、状态标签、右箭头。
  - 可读行 → 分册页；未检测 → 文案「本次未检测该分册」+ 灰标「未做报告」；检测未开放 → 文案「分册未开放，暂不可查看」+ 灰标「未开放」；两者置灰不可点（无按下反馈、无 `data-action`）。
  - 底部固定操作（`wd-button`）：主「下载本册 PDF」仅在分册页；报告页不放「下载全部」（M8 再评估打包）。
- **可读时（培育建议页签）**：按分册的建议卡列表（§7.2），无已发布建议 → 空态「暂未收到培育建议」+ 说明「建议与报告同时发布，按分册推送」。

### 6.2 分册页（S4，FR-APP-04）

- **页头**：册名（如「生长发育」）+ 系列/第 N 分册（不显示分册字母 A–F）；`PortalPageHeader` 返回。
- **数据熵筛选**（`wd-tabs` 或横向 chip，可换行）：「全部」+ 本册实际出现的等级（按固定展示顺序：卓越 / 优秀 / 优良 / 常态）；每项带数量；再点已选项 = 取消；筛选值按册记忆（key `volume:<volumeId>`），跨会话保留到退出/注销；筛选后列表即时过滤，空结果给「该等级下没有要素」。
- **章节分组**：章节标题 + 章节内要素行；要素行：名称 + 数据熵标签（`wd-tag` 语义色），**不展示要素编码**（BR-12）。
- **底部固定按钮**：「下载本册 PDF」（仅本册 `open=true`；点击见 §6.5）；按钮 + 安全区。
- **状态**：加载骨架 3–5 行；空（本册无要素）「本册暂无要素内容」；错误可重试；404/409 回报告主栏状态卡（不显示技术码）。

### 6.3 要素解读（S5，FR-APP-05）

- **内容**：数据熵（等级名 + 语义色标签）、天赋解读话术（固定注解 `note`）、适用条件（`condition`，有才显示）、相关培养方向（`相关方向（命中 N/M）` 卡片列表，点卡进方向详情；无则「暂无相关方向」）。
- **导航**：底部或两侧「上一项 / 下一项」，**限本册内循环**（首项上一项 = 末项；末项下一项 = 首项）；返回来源分册页并保留筛选。
- **信息层级**：标题 = 要素名；不以编码/内部 id 作为标题或副标题。
- **状态**：越界/非法 `index` → 参数错误态 + 返回分册；数据取不到 → 可重试。

### 6.4 数据来源

- 报告主栏：`summary.current`（状态、可读册数、建议份数）+ `GET /reports/:id`（6 册摘要 + 报告状态）。
- 分册页：`GET /reports/:id/volumes/:volumeId`（章节、要素、数据熵、本册要素详情与相关方向）；按需加载，不拉全量 `factorSnapshot`。
- 报告不可读时不调用体积接口；`pending_publish`/`retracted` 由 summary 状态直接渲染状态卡，避免无意义的 409。

### 6.5 PDF 代理与下载（FR-APP-04 底部；D7）

| 项 | 规则 |
| --- | --- |
| 接口 | `GET /api/client/talent/reports/:id/volumes/:volumeId/pdf`（M7 定义路由；M8 提供真实文件/渲染实现） |
| 门禁 | 登录态 + 家长/子女正常 + 报告 `published` + 本册 `open=true`；否则：报告状态 409（`state`）/越权或未开放 404；不泄露存在性 |
| 响应 | `content-type: application/pdf`、`content-disposition: inline; filename*=UTF-8''…`、`cache-control: private, no-store`；**不返回 PB/OSS 直链**，不写 URL 到日志 |
| 小程序 | `uni.downloadFile` → 成功 `uni.openDocument({ filePath, showMenu: true })`；下载中 loading + 失败 toast「文件下载失败，请重试」；`downloadFile` 域名必须在小程序合法域名 |
| H5 | 新窗口/标签打开代理地址（同源或已配置 API 域），失败提示；不内嵌 PDF 解析器 |
| M8 前 | 无真实文件时返回 404 `PDF_NOT_READY`（文案「本册 PDF 暂不可下载」），页面按钮置灰或点击提示；**不得用旧 `pdfUrl` 字段冒充** |
| M8 后 | 渲染/水印（姓名 + 手机尾号 + 报告编号）/时效/下载留痕由 M8 提供；M7 页面只消费最终代理地址，不改交互 |
| 埋点/日志 | 只记 `reportId` / `volumeId` 摘要与结果码，不记姓名/手机号/身份证/文件地址 |
| 与 PRD §9 的偏差 | PRD §9 L575 建议 `GET /reports/:id/download` 整份下载；本规格按 PRD §7.4「下载本册 PDF（仅开放册）」改为**按分册**路由，整份打包下载不在范围（M8 可另加聚合路由）。ADR 0007-D7 已记录 |

---

## 7. 培育建议（FR-APP-06）

### 7.1 入口与页面

- **报告主栏页签**：内嵌建议分册列表（组件复用）。
- **独立建议页 S6**（`pages/advice/index`）：从首页四宫格直达 + 深链；结构 = 对象条 + 版本/周期说明卡 + 按分册建议卡列表 + 底部「按建议选培养方向」。
- **建议书 S7**（`pages/advice/detail`）：`?reportId&book=A|B|…`；内部键只用于定位，不展示字母。

### 7.2 列表口径

- 按分册展示，一册一份，各自编号（`adviceNo` 按册派生，属单据编号可展示）；每卡：`第 N 分册 · 册名` + 状态标签「可查看」+「N 项要素 · 数据熵…」+ 建议书编号。
- 版本/周期说明：「本版 {versionNo}（{cycle} 生效）· 每 4 个月更新一版，基因报告内容不随版本变化」。
- 空态：无基因报告 →「暂无基因报告」+「先看基因报告」；有报告无建议 →「暂未收到培育建议」+ 说明「建议与报告同时发布，按分册推送」；报告不可读 → 状态卡，不展示建议。
- 不展示：版本 id、同步时间、发布状态、撤回原因、来源、内部 PB id、要素编码（M5 §7.1/§7.3）。

### 7.3 建议书详情

- 页头：`第 N 分册 · 册名` +「建议书」标签 + 对象 + 年龄 + 编号。
- **数据熵筛选**：「全部 + 本份实际出现的等级」，命中数显示「已选 / 总数」；筛选值按分册记忆 `adv:<book>`，与分册页筛选互不干扰；再点取消。
- **四段固定顺序**：分级内容 / 分级举例 / 培育方向 / 培育建议；空段不渲染（不显示「—」）。
- 每条要素卡：章节（小字）+ 要素名 + 数据熵标签 + 四段正文（段落，长文自动换行）。
- 底部（两项）：左「看本册要素」（→ 分册页），右「选培养方向」（→ 培养方向主栏）。
- 「接续服务」说明卡：内容仅作成长参考、不构成医学诊断；后续按周期更新（固定文案）。

### 7.4 状态与错误

| 场景 | 表现 |
| --- | --- |
| 加载 | 骨架 2–3 张卡 |
| 报告整理中/更新中/无报告 | 状态卡（与报告主栏一致的文案），不调建议接口 |
| `available=false` | 空态「暂未收到培育建议」，不提示撤回原因 |
| 409 `report_pending`/`report_retracted` | 状态卡（同名文案），不弹技术 toast |
| 404 越权/已解绑 | 「内容不可查看」+ 回首页/报告主栏；不泄露对象信息 |
| 错误 | 可读文案 + 重试；不显示 code |

---

## 8. 培养方向（FR-APP-07，T3）

### 8.1 结构

- 页头标题「培养方向」；对象条（多对象时可切换；与报告共用本机对象）。
- 页签（`wd-tabs`）：
  - **推荐方向**（`N` 徽标，≤5）
  - **已选方向**（`已选 N/3`）
- **报告前置**：当前对象无可读报告 → 空态「报告发布后可选方向」+ 说明「培养方向依据基因报告结果推荐，报告发布后即可选择」+「查看报告」；**不调用 directions 接口**。
- 推荐页底部：「没有合适的？自己填写」文字按钮 → S9。

### 8.2 推荐方向

- 方向卡（`wd-card` 或自绘卡片）：图标/首字、名称、一句描述、「N/M 项命中」、`X 个档位`、已选标记；`fallback=true` 时卡片带灰标「暂无匹配」+ 顶部提示「当前报告暂无匹配方向，仍可选择或自己填写」。
- 排序以接口返回为准（BR-08：命中数降序 → 命中率 → 配置条数 → 编码；C 端不重排）。
- 0 命中回退：接口返回后台全部已配置方向 + `fallback=true`，每卡「暂无匹配」。
- 空快照：`items=[]` + `emptyReason="NO_DIRECTIONS"` → 空态「暂无可推荐方向，可自己填写」+ 自填按钮；`manualOptions` 仍可用。
- 点击卡 → 方向详情 S8（携带 `reportId` + `directionId`）。

### 8.3 已选方向

- 卡片：名称、目标档位（名称 / 师资 / 频次）、选择时间（可选）、已选标记。
- 操作：
  - 「更换档位」→ 打开 `wd-action-sheet`/`wd-popup` 档位选择（名称/师资/频次/一句话卖点，默认档位预选）→ 确认调 `PUT /selections/:selectionId`；同档位返回 `changed=false` → toast「档位未变化」。
  - 「取消选择」→ `wd-dialog` 二次确认（「取消后该方向不再计入已选，确认取消？」）→ `DELETE /selections/:selectionId?reportId=…`；幂等成功 toast。
- 空态：「还没有选择方向」+「去推荐方向」+「自己填写」。
- 上限：`selectionCount >= 3` 时新增按钮禁用/点击提示「最多选择 3 个方向，请先取消一个」；接口 409 兜底提示。

### 8.4 方向详情（S8）

- 头：名称、描述、命中 `N/M`、档位数量。
- 要素对照列表：`要素名称 · 需 X · 现 Y`；已达成显示「已达成」；未达成显示「差 N 级」；不展示编码。
- 目标档位选择：档位卡片（名称、师资、频次、一句话卖点），默认档位预选；`selectable=false` → 「该方向暂未开放档位」+ 确认禁用。
- 主按钮：未选 →「确认选择」；已选同方向 →「更新档位」（或「已选择」禁用）；提交中 loading + 防重复。
- 错误映射：409 `SELECTION_LIMIT_REACHED` → 提示先取消；409 `DUPLICATE_SELECTION` → 提示已选择，可更换档位；422 `INVALID_TIER`/`TIER_UNAVAILABLE` → 提示重选档位；422 `DIRECTION_NOT_AVAILABLE` → 提示方向不可选；404 → 「内容不可查看」。
- 成功：toast「已选择「X」·目标档位 精进」/「已更新档位」；返回培养方向主栏并刷新已选。

### 8.5 自己填写（S9）

- 方向下拉（`wd-picker`）：选项来自 `manualOptions` 按拼音升序，**末位固定「其他（自己填写）」**；选择「其他」后显示 `wd-input`（≤10 字，计数 `N/10`，超长截断 + 行内错误）。
- 培养目标（档位）必选：`wd-picker`/卡片单选，默认全局默认档位；无启用档位 → 禁用提交 + 说明「暂未开放培养目标」。
- 提交：`POST /selections`（`manualName` + `tierId`）；成功提示「已提交自填方向「X」」；重复提交幂等；超 10 字/空 → 行内校验，不发请求。
- 只允许在报告可读时进入；报告不可读时直接状态卡。

### 8.6 数据与刷新

- `GET /directions?reportId=` 返回推荐（≤5，已排序）、`fallback`、`emptyReason`、`selections`、`selectionCount`、`selectionLimit`、`manualOptions`、`manualLimit`；C 端不读 M3 快照自行重算。
- 选择/换档/取消后：刷新已选与计数；不整页重新拉推荐（推荐不变），除非 409 状态冲突。
- 编码/内部 id 不进展示（BR-12）；URL 只用 `reportId` / `directionId`（M4 §7.1）。

---

## 9. 我的（FR-APP-08，T4）

### 9.1 结构

1. **账户卡**（整卡可点进编辑资料）：头像（中性账户，失败回退首字）、姓名、脱敏手机号、脱敏身份证（或「未填写」）、关系/登录方式标签。
2. **列表入口**（`wd-cell-group` + `wd-cell`，每行 ≥ 48px）：
   - 编辑资料（S10）
   - 孩子管理（右侧显示 `N 人`，S11）
   - 用户协议（S13）
   - 隐私政策（S14）
   - 版本信息 / 关于（S15，右侧显示版本号）
   - 退出登录（普通样式，二次确认可选）
3. **危险区**：注销账号（`--foundation-danger` 文字）+ 说明「注销后不可恢复」。
4. **页脚**：`copyright` + 客服电话（如有）。

### 9.2 编辑资料（S10）

- 字段与校验：
  | 字段 | 可编辑 | 校验 | 说明 |
  | --- | --- | --- | --- |
  | 头像 | 是 | 图片类型/大小由上传接口限制 | 小程序 `open-type="chooseAvatar"`（微信开放能力），H5 系统图片选择器；上传后调中性账户资料接口 |
  | 昵称 | 是 | ≤ 20 字，去首尾空格 | 中性账户字段，不影响会员档案 |
  | 姓名 | 是 | 1–50 字，必填 | 写入 `talent_parents.name`，审计 |
  | 手机号 | **只读**（待裁决 U1） | — | 展示脱敏；修改需后台/客服；见 §18 U1 |
  | 性别 | 是 | `male`/`female` | `wd-radio`/`wd-picker` |
  | 出生日期 | 是 | `YYYY-MM-DD`，不晚于今天；填身份证时与证件第 7–14 位一致 | `wd-datetime-picker` |
  | 身份证 | 是（选填） | 18 位（末位 X）、与生日一致、唯一性冲突 409 | 留空 = 修改时不改；不得回显全文，只显示脱敏占位「已填写（1101**********1234）」；输入新号才更新 |
- 交互：分组表单、字段级错误提示（失焦 + 提交校验）、底部单一「保存」按钮（固定 + 安全区）、保存中 loading + 防重复、成功 toast「已保存」+ 返回我的。
- 数据：`GET /api/client/talent/profile` 合并中性账户（头像/昵称）与家长档案（脱敏）；`PUT /api/client/talent/profile` 只提交变化字段；不提交 `mobile`（只读）。
- 安全：三件套（密文/哈希/脱敏）由 M2 `talent-member-crypto.ts` 生成；响应不含 cipher/hash；日志不含明文；身份证全号不在 C 端展示。

### 9.3 孩子管理（S11）

- 列表每行：姓名、`性别 · 年龄`、与家长关系、查询状态（含原因，如「信息待核对 · 信息不一致」）、报告篇数、右箭头「编辑」。
- 顶部「新增孩子」按钮（`wd-button` 主按钮）→ S12 新增。
- 空态：「暂无孩子档案」+ 说明「孩子档案用于同步检测报告；新增后会自动发起查询」+「新增孩子」。
- 待核对说明卡：`not_found` 时展示原因与「编辑信息后可重新查询」；保存编辑后自动重查（复用 M2 服务层）。
- **不提供解绑**（C 端无解绑能力；解绑由后台会员管理执行）。
- 数据：`GET /api/client/talent/children`（脱敏、查询状态、报告篇数）；`onShow` 刷新；保存后置「结果查询中」并刷新。

### 9.4 孩子信息（S12，新增/编辑）

- 字段：姓名（必填，1–50）、性别（必选）、与家长关系（7 项 `wd-picker`）、出生日期（必选，不晚于今天）、身份证（新增必填；编辑留空 = 不改；18 位 + 与生日一致）。
- 提交：`POST /api/client/talent/children`（新增）/ `PUT /api/client/talent/children/:id`（编辑）；成功 toast「已保存，正在查询结果」；返回孩子管理并刷新。
- 错误：422 字段校验（定位到字段）；409 身份证已存在（「该身份证已存在孩子档案，请联系客服核对」）；404 孩子不存在/已解绑；401 回登录。
- 编辑时不得回显完整身份证；占位提示「已填写，留空表示不修改」。
- 查询状态说明：保存后为「结果查询中」；结果回传后由 `onShow`/重试刷新（不做轮询，避免耗电与隐私风险）。

### 9.5 协议、隐私、关于

- 协议/隐私：静态文档页（`PortalDocument`），内容为客户端常量（版本号 + 生效日期，如「v1.0 · 2026-11-17 生效」）；登录页与我的均可进入；页面顶部标题 + 正文可选中复制、可滚动到底。
- 协议内容至少覆盖：服务说明、账号与授权、报告与建议的参考性质（非医学诊断）、个人信息处理（手机号/身份证/未成年人信息）、数据安全、注销与退出、联系方式。隐私政策覆盖：收集范围与目的、存储与加密、共享（检测机构/后台运营）、保存期限、用户权利（查询/更正/注销）、未成年人保护、联系方式。**正式文本需客户/法务确认**（U3）。
- 关于：站点 logo/appName/slogan/copyright、客户端版本号（`manifest.versionName`，如 `1.0.0`）、隐私/协议入口、「客服电话」。不展示内部环境、API 地址、构建号（debug 构建可从控制台看，不在 UI）。
- 三者均为公开页（游客可达），不需要登录。

### 9.6 退出登录

- `wd-dialog` 确认（可选，默认直接退出但给 toast）→ 清 token/资料/天赋缓存/对象/筛选记忆/claim 缓存 → `reLaunch` 登录页；小程序不保留上一账号的页面栈与数据。

---

## 10. C 端 API 契约与守卫

### 10.1 通用约定

- 前缀：`/api/client/**`；C 端不调 `/api/admin/**`。
- 成功：HTTP 200 + `{ "code": 200, "message": "...", "data": {...} }`（复用 `success()`）。
- 失败：HTTP 4xx/5xx + `{ "statusCode": 404, "message": "内容不可查看", "data": { "code": "REPORT_NOT_FOUND", "state": "" } }`；业务码固定在 `data.code` / `data.state`，客户端 `http.ts` 归一为 `ApiError { statusCode, code, state, message }`。
  - 兼容说明：M3/M4/M5 冻结契约中的 `409 { code: "report_retracted", state, message }` 由 M7 路由以 `createError({ statusCode, message, data: { code, state } })` 落地；**C 端统一从 `data` 读取业务码**。
- 分页：C 端无列表分页（一人一份/按分册）。
- 鉴权：`Authorization: Bearer <token>`（`http.ts` 注入）；所有数据路由服务端重新解析 parent，**不接受前端传 `parentId`**。
- 缓存：业务数据 `cache-control: no-store`；C 端不缓存跨会话报告内容。
- 审计：C 端写接口（profile / children / claim / selections）写 `oper_logs`，摘要只含对象编号/名称/动作，不含证件号、手机号、正文。
- 日志与错误：服务端错误不含 PII；客户端错误上报（如复用 `client-error.post`）只传页面、错误码、时间，不传 token/正文。

### 10.2 M7 新增路由（服务端实现归 M7）

| # | 方法 | 路径 | 说明 | 守卫 | 审计 |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/api/client/talent/summary` | 启动聚合：账号状态 + 对象列表 + 当前对象 + 待核对 + 计数 | 登录态；无 parent 返回 `accountState="unbound"`；parent 停用返回 `parent_disabled` | 否 |
| 2 | GET | `/api/client/talent/reports/:id` | 报告总览（M3 契约）：状态 + 6 册摘要 + 建议份数 | M3 `assertTalentReportPublished`；撤回/待发布 409 + `state`；越权 404 | 否 |
| 3 | GET | `/api/client/talent/reports/:id/volumes/:volumeId` | 分册要素（M3 契约）：章节、要素、数据熵、要素解读与相关方向 | 报告可读 + 本册 `open=true`；未开放/越权 404；报告状态 409 | 否 |
| 4 | GET | `/api/client/talent/reports/:id/volumes/:volumeId/pdf` | 分册 PDF 代理（M8 提供文件） | 同上 + 文件存在；否则 404 `PDF_NOT_READY` | 是（摘要） |
| 5 | GET | `/api/client/talent/profile` | 家长资料（中性账户 + 会员档案脱敏合并） | 登录态 + parent 存在 | 否 |
| 6 | PUT | `/api/client/talent/profile` | 编辑家长资料（姓名/性别/生日/身份证） | 登录态 + parent 存在；Zod 422；唯一冲突 409 | 是 |
| 7 | GET | `/api/client/talent/children` | 孩子列表（脱敏 + 查询状态 + 报告篇数） | 登录态 + parent 存在；只返回 `status="1"` 且归属本人 | 否 |
| 8 | POST | `/api/client/talent/children` | 新增孩子 → 自动发起查询 | 登录态 + parent 正常；复用 M2 校验/加密/查询服务 | 是 |
| 9 | PUT | `/api/client/talent/children/:id` | 编辑孩子（身份证留空不改）→ 关键字段变更重查 | 登录态 + `assertTalentChildAccess`；越权 404 | 是 |

**Summary 响应契约**（`data`）：

```jsonc
{
  "accountState": "active",          // active | unbound | parent_disabled
  "subjects": [
    {
      "subjectType": "self",         // self | child
      "subjectId": "rec_parent_1",
      "name": "陈示例",
      "gender": "female", "genderLabel": "女",
      "age": 38, "ageLabel": "38 岁",
      "relation": "", "relationLabel": "",
      "query": null, "queryReason": "",
      "reportId": "rec_report_1",     // 无报告为 ""
      "reportStatus": "published",    // published | pending_publish | retracted | none
      "statusText": "3 个分册可读",    // §11.2 文案
      "readableVolumeCount": 3,
      "totalVolumeCount": 6,
      "adviceCount": 2,
      "selectedDirectionCount": 1,
      "selectionLimit": 3
    }
  ],
  "currentId": "rec_parent_1",
  "current": { /* 同 subjects[0] 结构 */ },
  "pendingCheckCount": 1,
  "footer": { "copyright": "© 同佳", "contactPhone": "" }
}
```

- `subjects` 只含本人 + 已绑定且正常的子女；顺序本人优先、子女按建档顺序。
- 本人 `query=null`；子女 `query` 四态。`reportStatus` 服务端按 M3 状态派生；**不返回报告编号、证件全号、PII 原文**。
- `current` 由 `subjectId` query 选中（缺省本人/本机无记忆时的默认）；非法/越权 `subjectId` → 404。
- `accountState="unbound"` 时 `subjects=[]`、`current=null`、计数 0；`parent_disabled` 时只返回账号状态与客服信息，不返回 subjects。

**报告总览响应**（`GET /reports/:id`，M3 快照投影，字段固定不新增事实源）：

```jsonc
{
  "report": {
    "id": "rec_report_1", "status": "published", "statusLabel": "已发布",
    "publishedAt": "2026-11-16T10:00:00.000Z", "snapshotVersion": 2,
    "readableVolumeCount": 3, "totalVolumeCount": 6,
    "volumeHeaderText": "共 6 册 · 3 册可读", "adviceCount": 2
  },
  "subject": { "subjectType": "child", "name": "陈小示", "genderLabel": "女", "ageLabel": "10 岁", "relationLabel": "母亲" },
  "volumes": [
    { "volumeId": "V1", "name": "生长发育", "sortOrder": 1,
      "state": "readable", "chapterCount": 2, "factorCount": 18 },
    { "volumeId": "V2", "name": "智商", "sortOrder": 2,
      "state": "not_open", "chapterCount": 0, "factorCount": 0 },
    { "volumeId": "V3", "name": "情商", "sortOrder": 3,
      "state": "not_detected", "chapterCount": 0, "factorCount": 0 }
  ]
}
```

- `volumes` 固定 6 项、按 `V1`–`V6` 顺序；`state` ∈ `readable | not_open | not_detected`（由 `open` 与外部 `books` 派生）；不返回 `bookCode`、报告编号、要素编码。
- 409：`data.state=pending_publish|retracted`，`message` 用 PRD 文案（「报告正在整理中」/「报告内容更新中」）；404：越权/未绑定/已解绑/不存在，统一「内容不可查看」。

**分册响应**（`GET /reports/:id/volumes/:volumeId`）：

```jsonc
{
  "volume": { "volumeId": "V1", "name": "生长发育", "sortOrder": 1, "chapterCount": 2, "factorCount": 3 },
  "entropyOptions": [ { "name": "卓越", "count": 1 }, { "name": "优秀", "count": 2 } ],
  "chapters": [
    { "chapter": "1.1 生长发育概述", "factorIndexes": [0, 1] },
    { "chapter": "1.2 运动能力", "factorIndexes": [2] }
  ],
  "factors": [
    {
      "index": 0, "name": "运动协调", "levelName": "优秀",
      "note": "固定注解全文", "condition": "",
      "relatedDirections": [ { "directionId": "rec_dir_1", "name": "舞蹈启蒙", "hitCount": 5, "total": 7 } ]
    }
  ]
}
```

- `index` 为**本册内 0 起序号**，供上一项/下一项与深链定位；不返回要素编码/分册字母。
- `relatedDirections` 由 M3 冻结 `directionSnapshot` 派生（按要素命中方向），不重算；无相关方向为空数组。
- `note`/`condition` 取冻结快照；空串不渲染。

### 10.3 消费的冻结契约（不重复定义）

| 契约 | 路由 | 冻结方 | M7 消费要点 |
| --- | --- | --- | --- |
| bindings | `GET /api/client/talent/bindings`、`POST /bindings/claim` | M2 §7 | 信封 `items/currentId/current/currentRelationType`；`items` 只含脱敏；GET 无写入；未绑定 200 + 空 |
| 报告/分册 | `GET /reports/:id`、`GET /reports/:id/volumes/:volumeId` | M3 §7 | 只读快照；撤回/待发布 409 + state；越权 404；不重算方向 |
| 建议 | `GET /api/client/talent/advice?reportId=` | M5 §7 | `available=false` 空态；不展示撤回原因；按分册四段；`adv:<book>` 筛选 |
| 方向/选择 | `GET /directions?reportId=`、`POST /selections`、`PUT/DELETE /selections/:selectionId` | M4 §7 | 推荐 ≤5/选择 ≤3；`fallback`/`emptyReason`；`manualOptions` 拼音序 + 末位「其他」；编码不展示；409/422 映射 |
| 站点/认证 | `GET /api/client/config/site`、`POST /auth/{wx-login,wx-phone-login,phone-login}`、`GET/PUT /auth/profile`、`POST /auth/delete-account` | Foundation | 主题只读；登录结果本地保存；注销二次确认 |

### 10.4 守卫与越权口径（统一表）

| 条件 | HTTP | `data.code` / `state` | C 端表现 |
| --- | --- | --- | --- |
| 无 token / token 过期 | 401 | `UNAUTHORIZED` | 清会话 → 登录页（回跳） |
| `users.status="0"` | 403 | `ACCOUNT_DISABLED` | 停用页 |
| 未绑定家长（无 parent） | 200（summary）/ 404（数据路由） | `UNBOUND` / `NOT_FOUND` | 首页未绑定卡 / 内容不可查看 |
| 报告 `pending_publish` | 409 | `report_pending` / `pending_publish` + 文案「报告正在整理中」 | 报告状态卡「报告整理中」 |
| 报告 `retracted` | 409 | `report_retracted` / `retracted` + 文案「报告内容更新中」 | 报告状态卡「报告内容更新中」；建议消失、下载不可用 |
| 报告不存在 / 非本人 / 解绑 / 子女停用 / 家长停用 | 404 | `REPORT_NOT_FOUND` | 「内容不可查看」+ 回首页；**不返回 403** |
| 分册未开放 / 不存在 / 越权 | 404 | `VOLUME_NOT_FOUND` / `NOT_FOUND` | 回报告主栏 + 提示「分册未开放」 |
| 档位/方向不可用 | 422 | `INVALID_TIER` / `TIER_UNAVAILABLE` / `DIRECTION_NOT_AVAILABLE` | 行内提示重选 |
| 选择上限 / 重复选择 | 409 | `SELECTION_LIMIT_REACHED` / `DUPLICATE_SELECTION` | 提示先取消/换档 |
| 自填非法 | 422 | `INVALID_MANUAL_NAME` | 行内校验提示 |
| 证件/手机号唯一冲突 | 409 | `IDNO_EXISTS` / `MOBILE_EXISTS` / `CHILD_IDNO_EXISTS` | 字段级提示 + 联系客服 |
| Zod 校验失败 | 422 | `VALIDATION_ERROR` | 字段级错误，不弹统一 toast |
| PDF 未就绪（M8 前） | 404 | `PDF_NOT_READY` | 「本册 PDF 暂不可下载」 |
| 其他 5xx | 500 | `INTERNAL` | 「服务暂时不可用，请稍后重试」 |

- **越权一律 404**：不返回 403 表示「存在但无权」；403 只用于账号状态（停用）与权限码（后台），C 端业务资源不泄露存在性（PRD §10.5）。
- 家长停用的派生：summary 用 `accountState` 让页面显示停用页；数据路由仍按 404，二者不矛盾（summary 是账号级引导，数据路由是资源级隐藏）。

### 10.5 服务端落点（M7 实现）

| 文件 | 职责 |
| --- | --- |
| `server/api/client/talent/summary.get.ts` | 聚合；复用 M2 `getTalentMemberBindings`/parent 解析、M3 报告状态 helper、M5 建议计数 |
| `server/api/client/talent/reports/[id].get.ts` | M3 契约投影；守卫 `assertTalentReportPublished` |
| `server/api/client/talent/reports/[id]/volumes/[volumeId].get.ts` | M3 契约投影；开放册门禁；投影要素/相关方向 |
| `server/api/client/talent/reports/[id]/volumes/[volumeId]/pdf.get.ts` | M8 seam：鉴权/门禁 + 流式代理；M8 前 404 `PDF_NOT_READY` |
| `server/api/client/talent/profile.get.ts` / `.put.ts` | 合并中性账户 + 家长档案；写走 M2 加密/唯一校验 + `withOperLog` |
| `server/api/client/talent/children/index.get.ts` / `.post.ts`、`children/[id].put.ts` | 复用 M2 `talent-member.ts` 校验/编号/加密/查询服务；归属 `assertTalentChildAccess` |
| `server/utils/talent-client-summary.ts`（建议） | 投影/文案/状态派生纯函数，便于单测 |
| `shared/types/talent-client.ts`（如需） | 上述响应类型；与 M2/M3/M4/M5 类型复用不重复定义 |

> M2/M3/M5 冻结的 `assertTalentChildAccess` / `assertTalentReportPublished` / `getTalentReportClientSnapshot` / `assertTalentAdviceReadable` / `getTalentAdviceClientSnapshot` 必须在 M7 路由内复用，**不得重写一套归属判断**。

---

## 11. 状态、文案与错误映射

### 11.1 统一状态视图

| 状态 | 组件 | 规则 |
| --- | --- | --- |
| 加载 | `wd-skeleton`（首屏）/ `wd-loading`（局部/下拉） | >300ms 才显示；不用空白屏；加载文案可读（「正在加载报告」） |
| 空 | `wd-empty` + 说明 + 下一步按钮 | 说明「为什么空」+「能做什么」；不用「暂无数据」这种无信息文案 |
| 错 | `wd-empty` + 可读文案 + 「重试」 | 不显示 HTTP 码/技术错误/堆栈；404 给「内容不可查看」+ 返回 |
| 未登录 | 登录引导（欢迎卡/按钮） | 受保护页跳登录并回跳；游客页显示登录入口 |
| 停用 | 停用页 | 不可进入主栏；客服 + 退出 |
| 无权限/越权 | 同上「内容不可查看」 | 404 语义；不提示「无权限」以免泄露存在性 |
| 提交中 | 按钮 `loading` + `disabled` | 防重复点击；成功/失败 toast 或行内反馈 |
| 弱网/断网 | 顶部 `wd-notice-bar` / 错误态 | 断网提示 + 恢复自动重试一次；请求超时 15s（上传 60s） |
| 减少动效 | 全局 `prefers-reduced-motion`（H5） | 不开阻塞动画；小程序不做长动画 |

### 11.2 C 端状态文案（PRD §7.10 为准，不得改写）

| 场景 | 文案 | 使用位置 |
| --- | --- | --- |
| 报告已发布（可读） | `N 个分册可读` | 首页脚注、对象切换、报告表头 |
| 报告待发布 | `报告整理中` | 首页脚注、报告状态卡、对象切换 |
| 报告已撤回 | `报告内容更新中` | 首页脚注、报告状态卡、对象切换 |
| 查询中 | `结果查询中` | 首页脚注、对象切换、孩子列表 |
| 未查到 | `信息待核对` | 首页脚注、对象切换、孩子列表（含原因） |
| 未查询 | `尚未查询` | 首页脚注、对象切换、孩子列表 |
| 无基因报告 | `该对象暂无基因报告` | 报告主栏空态、首页 |
| 建议为空 | `暂未收到培育建议` | 建议页签/独立页 |
| 方向为空 | `暂无可推荐方向，可自己填写` | 培养方向空快照 |
| 0 命中回退 | `暂无匹配`（卡片）+「当前报告暂无匹配方向，仍可选择或自己填写」 | 推荐页 |
| 报告前置（方向/建议） | `报告发布后可选方向` / `报告整理中` / `报告内容更新中` | 方向页、建议页 |
| 已选满 | `最多选择 3 个方向，请先取消一个` | 方向详情/推荐 |
| PDF 不可用 | `本册 PDF 暂不可下载` | 分册页 |
| 网络失败 | `网络连接失败，请稍后重试` | 错误态/toast |

**报告状态派生优先级**（避免多文案冲突）：无 parent/未绑定 → 未绑定；家长停用 → 停用；无报告且子女 `query != found` → 查询态文案；无报告且 `found` → 「报告待同步」（原型口径，PRD 对象切换含「报告待同步」）；有报告 `pending_publish` → 报告整理中；`retracted` → 报告内容更新中；`published` → `N 个分册可读`；`published` 但 0 册开放 → 「报告整理中」（防御数据异常）。「报告未发布」文案用于「已查到且已同步基因报告、但报告记录未建」的过渡态（M8 前 Mock 同步窗口）。

### 11.3 页面级状态矩阵（验收用）

| 页面 | 加载 | 空 | 错 | 未登录 | 其他 |
| --- | --- | --- | --- | --- | --- |
| 首页 | 骨架 | 游客欢迎/未绑定 | 重试 | 欢迎+登录 | 待核对提示、无报告脚注 |
| 报告主栏 | 骨架 | 无报告状态卡 | 重试 | 跳登录 | 整理中/更新中/六册/建议列表 |
| 分册页 | 骨架 | 本册无要素 | 重试/回报告 | 跳登录 | 未开放/越权 404 |
| 要素解读 | loading | 无相关方向 | 重试 | 跳登录 | 上一项/下一项 |
| 建议页/书 | 骨架 | 暂未收到培育建议 | 重试 | 跳登录 | 报告不可读状态卡 |
| 培养方向 | 骨架 | 报告前置/无推荐/无已选 | 重试 | 跳登录 | 0 命中/上限/换档/取消 |
| 我的 | 骨架 | 未登录卡 | 重试 | 登录卡 | 未绑定、停用、注销 |
| 孩子管理 | 骨架 | 暂无孩子 | 重试 | 跳登录 | 查询中/待核对原因 |
| 编辑资料/孩子信息 | 骨架 | — | 字段级错误 | 跳登录 | 保存中/成功/冲突 |

---

## 12. 体验与视觉规范

### 12.1 Wot UI 优先决策树（D3）

1. **能直接用 `wd-*`**：按钮、输入、文本域、表单、单元格、选择器、日期时间、弹层、动作面板、页签、导航栏、图标、标签、空态、加载、骨架、搜索、开关、单选/复选、上传、宫格、通知栏、轻提示、对话框 → **必须用 Wot**。
2. **仅 Wot 无能力或微信开放能力**才用原生：
   - `button open-type="getPhoneNumber"`（手机号一键）
   - `button open-type="chooseAvatar"`（头像选择）
   - `input type="nickname"`（微信昵称键盘）
   - `button open-type="share"`（如做分享，本里程碑不做后端）
   - `uni.downloadFile` / `uni.openDocument`（PDF 打开）
   - 原生 `scroll-view` 仅在 `wd-*` 无法满足滚动吸顶/虚拟列表时使用（本规格不要求）
3. **原生控件必须重置**：边框、圆角、背景、行高、内边距、`tap-highlight`、`appearance` 与 Wot 同尺寸、同色令牌；不得出现浏览器默认按钮/输入框外观。
4. **图标**：优先 `wd-icon`；无对应图标用项目内联 SVG（禁止 Emoji 当 UI 图标）；图标按钮必须有 `aria-label`。
5. **不新增重复组件样式**：同类卡片/状态/列表样式统一在 `modules/**/components` 内复用；页面不堆样式。

**页面 → 组件映射（最低要求）**：

| 场景 | Wot 组件 |
| --- | --- |
| 导航/返回 | `wd-navbar`（经 `PortalPageHeader` 封装） |
| 底部 4 栏 | `wd-tabbar` + `wd-tabbar-item` |
| 对象条/列表行 | `wd-cell` / `wd-cell-group`（或自绘卡片，但尺寸/令牌与 Wot 一致） |
| 页签 | `wd-tabs` + `wd-tab` |
| 对象卡/方向卡/建议卡 | `wd-card` 或自绘卡片；优先 `wd-cell` 组合 |
| 状态标签/数据熵 | `wd-tag` |
| 空态/加载/骨架 | `wd-empty` / `wd-loading` / `wd-skeleton` |
| 表单/输入/选择 | `wd-form` / `wd-input` / `wd-textarea` / `wd-picker` / `wd-datetime-picker` / `wd-radio` / `wd-checkbox` / `wd-switch` |
| 弹层/确认/动作 | `wd-popup` / `wd-action-sheet` / `useDialog` / `useToast` |
| 通知/提示 | `wd-notice-bar` / `wd-tooltip` |
| 图标 | `wd-icon` |

**已知 `wot lint` 例外**（UX 基线 U4，不阻塞）：`wd-cell-group` / `wd-tab` / `wd-tabbar-item` 子组件未被 CLI 1.2.1 收录；2 条 `wd-button` 为头像图标按钮且已有 `aria-label`。M7 新增 warning 视为阻塞；例外清单记录在 PR 描述/验收证据中。

### 12.2 尺寸与布局

- **画幅**：以 **390px**（iPhone 12/13/14 逻辑宽）设计；**340px** 为最小验收宽度，无横向溢出、无文字截断导致不可读。
- 布局单位统一 `px`（375pt 基准，750 设计稿 ÷2）；只有发丝线用 `1rpx`（CLIENT-PORTAL 约定）；字号只用 `--fs-*` 令牌（11/12/13/14/15/16/17/20）。
- **可点区域 ≥ 44px**（主按钮 48px；列表行 ≥ 48px；Tabbar 项 ≥ 56px 高；图标按钮 44×44 热区）。
- **固定底栏**：`PortalTabbar` 固定 + `safe-area-inset-bottom` + `placeholder`；页面内容底部留白 `--foundation-page-bottom`（`calc(72px + env(safe-area-inset-bottom))`），最后一个元素不被遮挡。
- **固定底部操作条**（分册下载、编辑保存、方向确认）：`padding-bottom: calc(12px + env(safe-area-inset-bottom))`；键盘弹起时不被遮挡（H5 `scrollIntoView`/小程序 `cursor-spacing`）。
- **页面边距**：`--foundation-page-padding` 16px；卡片圆角 `--foundation-radius`(18px)/`--foundation-radius-sm`(14px)；间距 4px 步进（`--sp-1..5`）。
- **一屏一主操作**：每页只有一个主按钮；次要操作为文字按钮/更多菜单。
- **长文**：建议书四段、协议隐私正文自动换行、可滚动、不截断；`overflow-wrap: break-word`。
- **横向溢出**：根页面 `overflow-x: hidden`；340 下卡片/表格内容自适应换行，禁止固定宽度撑破。

### 12.3 微信胶囊、状态栏与安全区

- 自定义导航（`navigationStyle: "custom"`）：所有二级页顶部安全区 = `statusBarHeight + 导航栏高度`；小程序用 `uni.getMenuButtonBoundingClientRect()` 计算胶囊位置，标题/返回不进入胶囊区域（右侧留 96px 以上）。
- 导航栏高度：建议 `44px`；`statusBarHeight` 由 `uni.getSystemInfoSync().statusBarHeight` 获取；H5 顶部安全区为 0（状态栏不存在）。
- Tabbar/底部操作条使用 `env(safe-area-inset-bottom)`（H5 与小程序均支持）；iPhone 底部横条不遮挡可点内容。
- 弹层（`wd-popup`/`wd-action-sheet`）底部同样留安全区；`position: fixed` 在 H5 键盘弹起时用 `uni.onKeyboardHeightChange`（小程序）或 `visualViewport`（H5，仅 H5 分支）修正，避免输入框被遮挡。
- 真机验收：iOS 微信 + Android 微信各至少 1 台，核对胶囊、状态栏、底部安全区、键盘。

### 12.4 主题令牌（D4）

- 来源：`GET /api/client/config/site` → `{ appName, logo, copyright, contactPhone, primaryColor, themeMode, slogan? }`；`useSiteStore` 派生 `--foundation-*` 与 `--wot-*`（现有实现），并在 `App.vue` 启动恢复。
- **只读**：不提供主题开关、深浅色切换、字号切换、外观设置页；不写回 `site_config`；后台改色后 C 端下次启动/每 10s 同步生效。
- `themeMode`：`light` / `dark` / `system`；`system` 跟随设备（H5 `prefers-color-scheme`，小程序 `uni.getSystemInfoSync().theme`）。
- 颜色：只用 `--foundation-*`；语义色用 `--foundation-success/warning/danger/info` 与 `*-surface`；禁止硬编码 `#hex`/`rgb()` 品牌色（Wot 默认蓝白主题不得回退）。
- 暗色可读性：正文/次要文字/边框/占位/标签对比度达标；状态色在暗色下用对应的 `*-surface` + 文字色组合。
- 字号/间距/圆角/阴影：令牌化；不新增数值主题。
- 动效：克制（≤200ms），尊重 `prefers-reduced-motion`；不做阻塞式动画/全屏 loading 动画。

### 12.5 表单与输入

- 标签在字段上方或左侧（移动端统一上方），必填标 `*`，错误文案在字段下方（12px，`--foundation-danger`）。
- 键盘类型：手机号 `type="number"`/`tel`，身份证 `idcard`，数字 `number`，日期用 `wd-datetime-picker`（不用原生 `input type=date`）。
- 校验时机：失焦 + 提交；错误定位到字段，不弹笼统 toast；提交中禁用按钮。
- 协议勾选/隐私授权/手机号授权必须用户主动触发，不自动勾选、不诱导。
- 头像/昵称仅微信开放能力（`chooseAvatar` / `type="nickname"`），H5 用系统图片选择；上传前限制大小/类型并给出错误。

### 12.6 H5 / 微信小程序差异（D8）

| 维度 | H5 | 微信小程序 |
| --- | --- | --- |
| 平台判断 | `#ifdef H5` | `#ifdef MP-WEIXIN` |
| 登录 | 账号密码表单；无微信 OAuth | 手机号一键/微信登录；无账号密码表单 |
| API 地址 | `VITE_SERVER_BASEURL` / H5 代理前缀；同源或已配置 API 域 | 按 `envVersion` 选 `VITE_SERVER_BASEURL__WEIXIN_DEV/TRIAL/RELEASE`；必须是合法请求域名（HTTPS） |
| PDF | 新窗口打开代理地址 | `downloadFile` + `openDocument({ showMenu: true })`；域名合法 |
| 头像 | 系统图片选择器 | `chooseAvatar`（微信开放能力） |
| 键盘/滚动 | `:focus-visible`、浏览器地址栏/键盘遮挡处理 | `cursor-spacing`、`adjust-position`、胶囊避让 |
| 分享 | 浏览器分享/复制链接（可选） | `open-type="share"`（本里程碑不做后端与分享内容定制） |
| DOM | 可用（仅 H5 分支） | **禁止** `window`/`document`/`localStorage` DOM API；用 `uni.*` |
| 包体 | 不限制 | 主包尽量小；新页面不引入大依赖（图表/PDF 解析器不进主包） |
| 主题跟随 | `prefers-color-scheme` | `uni.getSystemInfoSync().theme` + `onThemeChange`（如可用） |

- 业务逻辑、文案、状态映射两端共用；平台分支只包 API 调用。
- 两端均需通过 `pnpm client:typecheck`、目标端构建、`client:check:wxss`。

### 12.7 弱网与容错

- 请求超时 15s（普通）/60s（上传）；超时/断网 → 错误态 + 重试，不无限 loading。
- `uni.onNetworkStatusChange`（两端可用）监听网络：断网顶部 `wd-notice-bar`；恢复后自动重试当前页一次（防抖 1s）。
- 提交类操作失败保留表单内容，不清空已填；重复提交由按钮 loading + 服务端幂等双保险。
- 图片（logo/头像）加载失败显示首字/占位，不出现破图图标。
- 不做离线缓存（报告内容涉及隐私，缓存会带来越权风险）；仅缓存主题（现有）与本机对象 id。

---

## 13. 视觉验收与双端门禁

### 13.1 截图矩阵（最低要求）

- 尺寸：**390×844**、**340×800**（或 340 宽等价设备）；主题：**亮色**、**暗色**（`themeMode=light/dark` 各一组；`system` 跟随设备等同暗/亮）。
- 页面/状态（20 个 surface）：

| # | Surface | 状态 |
| --- | --- | --- |
| 1 | 登录页 | 未勾选协议（按钮禁用）/ 已勾选 / 错误提示 |
| 2 | 停用页 | — |
| 3 | 首页 | 正常（有报告）/ 无报告 / 游客 / 未绑定 / 待核对提示 |
| 4 | 切换对象 | 本人 + 2 子女（含四种报告状态） |
| 5 | 报告主栏 | 已发布 3 册 / 全开 6 册 / 整理中 / 更新中 / 无报告 |
| 6 | 分册页 | 筛选前 / 筛选后 / 空筛选结果 / 未开放不可进 |
| 7 | 要素解读 | 有相关方向 / 无相关方向 |
| 8 | 培育建议列表 | 有建议 / 空建议 |
| 9 | 建议书 | 四段完整 / 筛选后 |
| 10 | 培养方向 | 推荐（正常）/ 0 命中回退 / 空快照 / 已选（N/3）/ 已选满 |
| 11 | 方向详情 | 未选 / 已选 / 无档位 |
| 12 | 选择方向（自填） | 默认 / 选「其他」输入 / 超长错误 |
| 13 | 我的 | 正常 / 游客 |
| 14 | 编辑资料 | 默认 / 字段错误 / 保存中 |
| 15 | 孩子管理 | 有孩子（含待核对）/ 空 |
| 16 | 孩子信息 | 新增 / 编辑（身份证留空）/ 校验错误 |
| 17 | 用户协议 | 顶部 / 底部 |
| 18 | 隐私政策 | 顶部 / 底部 |
| 19 | 关于 | — |
| 20 | 注销确认弹层 | 未勾选（禁用）/ 已勾选 |

- 数量：20 surface × 390/340 × 亮/暗 ≈ 80 张；M7 最低交 **60 张**（390 亮 + 390 暗 + 340 亮），覆盖上表 20 个 surface 的关键状态；暗色至少覆盖 1/3/5/6/10/13。
- 另需**真机截图**：iOS 微信 + Android 微信各 1 台，至少 6 张：首页、报告主栏、分册页、建议书、培养方向、我的（含胶囊/安全区/底部 Tabbar）。

### 13.2 自动与半自动检查

| 检查 | 方法 | 通过判据 |
| --- | --- | --- |
| H5 console | Playwright 打开关键路径，收集 `console`（error + warning）与 `pageerror` | **0 error / 0 pageerror**；允许已知第三方 warning 需逐条登记 |
| 小程序 console | 微信开发者工具 / 真机 console 截图 | 0 error；合法域名/下载/授权无报错 |
| 横向溢出 | Playwright 设 390/340 宽，断言 `document.documentElement.scrollWidth <= innerWidth + 1` | 每页通过 |
| 44px 触控 | Playwright 遍历可点元素（`a,button,[role=button],[role=tab],.wd-button` 等）读取 `getBoundingClientRect` | 主交互高度 ≥ 44（或 44×44 热区）；图标按钮 `aria-label` 非空 |
| 底栏遮挡 | 滚动到底，断言最后一个内容元素底边 < Tabbar 顶边 | 不被遮挡 |
| 主题令牌 | `rg -n "#[0-9a-fA-F]{3,8}|rgb\\(" apps/client/src/pages apps/client/src/modules`（排除 `store/site.ts`/`style/index.scss`/Wot 变量映射） | 0 命中 |
| Emoji 图标 | `rg` Emoji 字符（UI 范围） | 0 命中 |
| 双端构建 | `pnpm client:build:h5`、`pnpm client:build:mp` | 均成功；产物含 19 页 |
| WXSS | `pnpm client:check:wxss` | 0 失败（需本机 `wcsc`） |
| Wot lint | wot-ui MCP `wot_lint`（`dir=apps/client`） | 无新增 warning；已知例外清单不变 |
| 类型/lint | `pnpm client:typecheck`、`pnpm client:lint` | 0 error（lint warning 记入证据） |

### 13.3 验收证据要求

- 截图按 `M7-<surface>-<width>-<theme>.png` 命名；**截图本体不入库**（2026-11 起移出 Git 以控制仓库体积，改存验收归档包），文档中只保留 `docs/specs/M7-c-end/evidence/*.png` 文件名作索引（**只放脱敏/虚构数据**，不得含真实姓名、手机号、身份证、token）。
- 每条证据记录：设备/浏览器版本、主题、宽高、页面状态、截图路径、console 结果。
- 真机证据额外记录微信版本、系统版本、机型。

---

## 14. 验收映射（AC-APP-01..15）

> AC 编号为本规格自定；「实现（计划）」按本 spec 落点；验收状态与证据见 [acceptance.md](acceptance.md)。PRD §12 C 端 11 条清单逐条落入下列 AC，无遗漏。

| ID | 验收项 | PRD / 依据 | 实现（计划） | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- | --- |
| AC-APP-01 | 登录需勾选协议；未勾选不可登录；微信手机号一键与 H5 账号密码可用；微信登录兜底 | §7.1 L343–346、§12 L620 | S1、§3.2–3.3、`useWechatAuthentication`、`FoundationLoginPanel` | 手工：未勾选点登录无请求；勾选后 MP 手机号/微信登录、H5 密码登录成功；H5 产物不含微信按钮 | 未验证 |
| AC-APP-02 | 停用账号显示停用页，不能进入主栏；退出可回登录 | §7.1 L345、§12 L620 | S2、§3.4、summary `accountState` | 造停用家长/账号 → 停用页；点击退出回登录；业务接口 404/403 无数据泄露 | 未验证 |
| AC-APP-03 | 首页对象卡与六种状态文案正确（可读/整理中/更新中/查询中/待核对/未查询） | §7.2 L347–353、§12 L621 | T1、§5、§11.2 | 三对象账号 + 构造状态；逐条比对文案；待核对条数与孩子管理一致 | 未验证 |
| AC-APP-04 | 报告页固定六册全列；未检测/未开放置灰不可点；表头「6 篇 / 共 6 册 · N 册可读」 | §7.3 L355–361、§12 L622 | T2、§6.1 | 2 册/3 册/6 册三种报告；断言 6 行、灰标文案、不可点、表头文案 | 未验证 |
| AC-APP-05 | 撤回后不列分册、不给下载、建议消失；恢复后恢复 | §7.3 L359、BR-10、§12 L623 | §6.1、§6.5、§7.4、§11.2 | 后台撤回 → C 端状态卡「报告内容更新中」+ 建议空 + 下载不可用；恢复 → 立即恢复；越权/未发布 409/404 | 未验证 |
| AC-APP-06 | 分册数据熵筛选、章节分组、要素行无编码、筛选按册记忆 | §7.4 L363–368、BR-12、§12 L624 | S4、§6.2 | 选「优秀」只剩优秀项；再点取消；切册后记忆独立；页面 DOM/文本 0 编码（A-01/V1） | 未验证 |
| AC-APP-07 | 要素解读：数据熵、天赋解读、适用条件、相关方向、上一项/下一项本册循环、返回来源 | §7.5 L370–372 | S5、§6.3 | 首项上一项=末项、末项下一项=首项；相关方向命中 N/M；返回保留筛选 | 未验证 |
| AC-APP-08 | 建议按分册、四段文案、周期说明、`adv:<分册>` 独立筛选；撤回不可见 | §7.6 L374–380、BR-06/07、§12 L625 | S6/S7、§7 | 每册一卡一编号；四段顺序；筛选记忆与分册页互不干扰；撤回后 0 份 + 空态 | 未验证 |
| AC-APP-09 | 方向两页签、命中排序、0 命中「暂无匹配」、空推荐空态、自己填写可提交 | §7.7 L382–390、BR-08/09、§12 L626 | T3/S8/S9、§8 | 推荐 ≤5 且顺序=接口；0 命中回退全部 + 灰标；空快照空态；自填 ≤10 字提交成功 | 未验证 |
| AC-APP-10 | 已选上限 3、可取消、可换档；方向下拉按拼音首字母排序、末位「其他」 | §7.7 L389–390、§12 L627–628 | §8.3–8.5 | 第 4 个选择被拦截；取消后计数-1；换档成功/同档无变化；下拉顺序与接口 `manualOptions` 一致 | 未验证 |
| AC-APP-11 | 我的页四入口（编辑资料/孩子管理/协议/隐私）+ 关于、孩子管理增改、协议隐私可打开、注销二次确认 | §7.8 L392–398、§12 L629 | T4/S10–S15、§9 | 四入口可进；新增/编辑孩子保存后「结果查询中」；协议/隐私/关于可打开；注销需勾选+确认 | 未验证 |
| AC-APP-12 | 切换对象：本人 + 子女、四种报告状态、切换后回来源页、同一时刻只呈现一个对象 | §7.9 L400–402、§12 L621 | S3、§4 | 两子女账号：状态文案正确；切换后返回来源页并刷新；报告/建议/方向均随对象变化；无串号 | 未验证 |
| AC-APP-13 | 未登录/过期/停用/无权限/空/错/加载/弱网状态齐全；不白屏、不显示技术码 | §10.5 L587、§11 L598、UX 基线 | §11、§12.7 | 逐页状态矩阵走查；断网/超时提示；401 回登录并回跳；404 文案统一 | 未验证 |
| AC-APP-14 | 390/340 无横向溢出、44px、安全区、胶囊、主题令牌、亮暗可读；0 控制台错误；H5+小程序构建通过；wxss 0 失败 | §11 L596、§12 L630、UX 基线 §4 | §12、§13 | 截图矩阵 + Playwright 断言 + `client:check:wxss` + `client:build:h5/mp` + console 0 | 未验证 |
| AC-APP-15 | C 端数据权限：本人/已授权子女；解绑/停用/撤回即时失效；越权 404；PDF 仅开放册；写接口无明文 | §10 L581–589、§12 | §10、§6.5 | 接口用例：他人子女/解绑后/停用家长各接口 404；撤回 409；PDF 未开放册 404；响应无 cipher/hash/明文；日志无 PII | 未验证 |

---

## 15. 测试命令与门禁（按 `docs/QUALITY.md` 分级）

### 15.1 命令

```bash
# 1. C 端类型与 lint
pnpm client:typecheck
pnpm client:lint

# 2. 双端构建
pnpm client:build:h5
pnpm client:build:mp

# 3. 小程序 WXSS 原生编译检查（需本机 wcsc，可用 WECHAT_WXSS_COMPILER 指定）
pnpm client:check:wxss

# 4. 服务端类型/测试（M7 新路由与投影）
pnpm typecheck
pnpm vitest run test/talent-client-api.test.ts

# 5. 全量回归（M1–M6 既有测试不得变红）
pnpm test

# 6. C 端主链 smoke（M7 新增；M9 重写全量 e2e）
node scripts/e2e/07-m7-client.mjs

# 7. 主题/编码/Emoji 静态检查（示例）
rg -n "#[0-9a-fA-F]{3,8}|rgb\\(" apps/client/src/pages apps/client/src/modules
rg -n "A-[0-9]{2}|[A-F] 分册|要素编码" apps/client/src/pages apps/client/src/modules
```

- `pnpm dev` + `pnpm client:dev` / `pnpm --filter foundation-portal dev:h5` 联调；本地一律 `127.0.0.1`。
- 真机：微信开发者工具预览 + iOS/Android 真机；H5 Chrome/Safari（含 340 宽模拟）。
- `wot lint`：通过 wot-ui MCP `wot_lint`（`dir=apps/client`），已知例外清单见 §12.1；新增 warning 阻塞。

### 15.2 门禁判定

| 门禁 | 通过判据 |
| --- | --- |
| G1 类型/lint | `client:typecheck`、`client:lint`、`pnpm typecheck` 全 0 error |
| G2 构建 | H5、MP 均构建成功；产物页面数 19；无旧页面残留 |
| G3 WXSS | `client:check:wxss` 0 失败 |
| G4 接口 | `test/talent-client-api.test.ts` 全绿（守卫/越权/状态/契约字段） |
| G5 回归 | `pnpm test` 全绿（M1–M6 既有） |
| G6 视觉 | 截图矩阵 ≥60 张、console 0、390/340 无溢出、44px 断言通过 |
| G7 真机 | iOS/Android 微信各 1 台关键 6 页无遮挡/无报错 |
| G8 红线 | 无硬编码品牌色、无 Emoji 图标、无 `TENANT_MODE`/多 PB、无旧机构/计划入口、无 PII 明文响应 |

---

## 16. 实施顺序（10–12 人天，与开发计划 M7 对齐）

| 阶段 | 内容 | 依赖 | 估算 | 出口 |
| --- | --- | --- | --- | --- |
| M7-A 基础骨架 | 路由/pages.json/4 栏 Tabbar/主题令牌接入/`http.ts` 错误模型/登录守卫与回跳/通用状态组件/`modules` 目录 | M1–M6 现有；M2 认证接口 | 2 人天 | 19 页可导航；游客/登录/停用/过期状态可走通（Mock 数据） |
| M7-B 首页 + 对象切换 | summary 接口 + 投影纯函数 + 首页 + 切换页 + 本机对象记忆 + 未绑定/claim | M7-A、M2 bindings、M3 报告状态 | 2 人天 | 首页五态 + 切换 + 无串号 |
| M7-C 报告/分册/要素/PDF | report/volume 路由 + 投影 + 状态卡 + 六册 + 分册筛选 + 要素解读 + PDF 代理 seam | M7-B、M3 快照 helper | 3 人天 | AC-APP-04/05/06/07 通过 |
| M7-D 建议 + 方向 | advice 页面/接口消费 + 方向两页签/详情/自填/选择/换档/取消 | M7-B/C、M4/M5 契约 | 2.5 人天 | AC-APP-08/09/10 通过 |
| M7-E 我的 + 孩子 + 资料/协议/注销 | profile/children 路由 + 页面 + 协议/隐私/关于 + 注销 | M7-A、M2 服务层 | 1.5 人天 | AC-APP-11 通过 |
| M7-F 视觉/双端/验收 | 390/340/亮暗截图、44px/溢出断言、真机、构建、wxss、console、smoke e2e | A–E | 1.5 人天 | G1–G8 全绿，证据入 acceptance |

**并行建议**：M7-A/B 完成即可与 M6 收尾并行；M7-C/D 依赖 M3/M4/M5 出口；M7-F 与 M9 的 e2e/性能衔接（M9 重写 04/07）。

---

## 17. 风险与处置

| # | 风险 | 概率/影响 | 处置 |
| --- | --- | --- | --- |
| R1 | 旧 C 端页面/旧绑定/旧计划接口未清干净，新页面读到旧数据或旧入口复活 | 中/高 | M6 §7.3 交接门槛；M7 重写 `api/talent.ts`、`store`，删除旧页；`rg` 断言旧路径/旧字段 0 命中；上线前 M6 验收 |
| R2 | 对象切换串号（历史上「给二宝选方向写进一宝报告」） | 中/高 | D5 四条硬规则；所有请求带 `reportId` 或当前对象解析；服务端归属校验；本机 key 按 `userId`；e2e 覆盖两子女交叉操作 |
| R3 | 停用/解绑/撤回不即时，C 端展示旧内容 | 低/高 | 服务端每次请求重新鉴权，不缓存跨会话报告；`onShow` 刷新；401/404/409 直接切状态卡；测试用例覆盖 |
| R4 | 手机号可编辑与账号绑定/claim 真源冲突（PRD §7.8 vs 安全） | 中/中 | 本规格暂定手机号只读（U1）；若必须可编辑需先定短信验证/账户域方案，另立需求 |
| R5 | PDF 真实渲染未就绪（M8），下载入口形同虚设 | 高/中 | D7：代理路由先落地，M8 前返回明确「暂不可下载」；不伪造、不复用旧 `pdfUrl`；验收标记未验证（依赖 M8） |
| R6 | 双端差异：胶囊/安全区/键盘/下载域名 | 中/中 | D8 编译期隔离 + 真机矩阵 + 合法域名清单；H5/MP 分别构建验收 |
| R7 | 首屏性能（summary + report + advice 串行） | 中/中 | summary 单请求聚合；报告/分册按需加载；骨架；目标 ≤1.5s；M9 专项 |
| R8 | 主题暗色对比度/状态色不达标 | 中/低 | 只用语义令牌；暗色截图走查；新增色值需走 Wot token 映射 |
| R9 | 协议/隐私文本未经法务，未成年人信息合规 | 中/高 | U3 待客户/法务确认；先静态 v1 占位并标注版本与生效日，不虚构条款 |
| R10 | Wot 组件平台差异 / lint 误报导致返工 | 中/低 | D3 决策树 + 已知例外清单；原生控件统一 reset；组件能力用 wot-ui MCP 校验 |
| R11 | M2/M3/M5 helper 实际导出名与规格不一致 | 中/中 | 实现前先读 `server/utils/talent-*.ts` 实际导出并以实际名为准；契约字段以 M2/M3/M5 spec 为准，字段不增减 |

---

## 18. 未决项（需 lead/客户裁决，不自行拍板）

| # | 未决项 | 现状/冲突 | 建议 | 裁决人 |
| --- | --- | --- | --- | --- |
| U1 | C 端是否允许编辑手机号 | PRD §7.8 允许；但手机号是 claim/唯一键真源，自填无验证会破坏账号—档案一致性 | **只读**，修改走后台会员管理/客服；若必须可编辑，需先定短信验证（新范围） | lead + 客户 |
| U2 | C 端是否允许新增/编辑孩子 | PRD §7.8 要求「孩子管理增改」；M2 §7.2 曾写「C 端不写」，但 ADR 0002-D11 明确 M7 另开写接口并复用 M2 服务层 | **允许**，复用 M2 校验/加密/查询；不提供解绑 | lead |
| U3 | 协议/隐私文本来源与版本 | 当前为静态占位；无 CMS/法务文本 | M7 用客户端静态常量（版本号 + 生效日期），法务确认后再定是否后台可配 | 客户/法务 |
| U4 | M8 前 PDF 入口 | PRD 要求分册下载；真实渲染归 M8 | M7 先落代理与门禁，M8 前明确「暂不可下载」，验收标未验证（依赖 M8） | lead |
| U5 | 阅读进度是否保留 | M6 保留 `talent_reading_progress` 并写「M7 重写访问层」；但 PRD §7 无进度要求、新 IA 无入口 | **M7 不做**；集合保留，M9 再评估或清理 | lead |
| U6 | 报告主栏 vs 独立报告列表 | 任务口径含「报告列表/总览」；BR-02 一人一份，PRD IA 无列表层 | 按本规格合并进报告主栏（D1）；如客户坚持列表层，需新增页面并调整 4+15 计数 | lead + 客户 |
| U7 | 关于页版本号来源 | 小程序真机 `version` 可能为空 | 用构建常量（`manifest.versionName`）+ 环境兜底；不显示构建号 | 实现者 |
| U8 | 分享能力 | 原型有「分享到微信会话」；PRD 无要求 | 不做后端与内容定制；如需要分享链接/图片，另立需求 | lead |
| U9 | 客服联系方式 | `site_config.contactPhone` 可能为空 | 有值才展示拨号；为空时隐藏并提示「联系机构老师」 | 客户配置 |
| U10 | H5 是否需要微信 OAuth | 现文档有历史 OAuth 回调说明；当前 H5 仅账号密码 | 不接 OAuth（避免 AppSecret/回调复杂度）；H5 用账号密码 | lead |

---

## 19. 文档同步清单（M7 出口，由 lead 派发，不在本任务写范围）

- `docs/CLIENT-PORTAL.md`：4 栏/15 页、路由表、登录/对象/PDF/主题/双端差异全文重写。
- `docs/API.md`：新增 M7 C 端路由与权限/错误码。
- `docs/ARCHITECTURE.md`：C 端模块目录（`modules/talent-portal`）与数据流。
- `docs/STATUS.md`：C 端页面数、账号、已知缺口（旧页删除、M8 依赖）。
- `docs/TALENT-LOCAL.md`：C 端演示账号与 Mock 口径（M2/M3/M5 种子）。
- `docs/specs/README.md`：M7 行与 ADR 0007 索引（**本任务不允许改，lead 派发**）。
- `AGENTS.md` / `app/DESIGN.md`：C 端「双 Tab」旧表述改为 4 栏（由 M6/M7 出口统一改）。
- `docs/QUALITY.md`：如新增 `07-m7-client` smoke，补命令与风险级别。
- 本目录：`acceptance.md` 证据与状态。