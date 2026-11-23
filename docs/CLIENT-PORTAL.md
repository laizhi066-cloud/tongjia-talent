# C 端门户

`apps/client` 是同佳天赋的 uni-app 客户端，目标平台仅为 H5 与微信小程序。它提供 4 主栏门户（首页 / 报告 / 培养方向 / 我的）与 15 个二级页，不包含会员后台、原生 TabBar 或旧机构 / 服务商 / 培养计划入口。

## 页面与导航

顶部导航分两层，刻意与微信原生行为一致：

- **4 个主栏用微信原生导航栏**：在各自页面 SFC 的 `<route lang="json">` 里声明 `navigationStyle: "default"` 与 `navigationBarTitleText`（首页 / 报告 / 培养方向 / 我的），背景 `#FAF8F3`、黑色前景。主栏不展示 logo、应用名或客服图标 —— 原生导航不支持自定义按钮，品牌与客服入口分别落在首页欢迎卡与「我的」页脚。
- **二级页用 `PortalNavBar`（`PortalPageHeader` 薄封装）**：Wot `wd-navbar` + 44px 返回热区 + 居中标题 + 可选右侧动作（如孩子管理的「+ 新增」），两侧按微信胶囊宽度避让。
- 主栏不要再手写 `padding-top` 或品牌栏占位；二级页由 `wd-navbar` 的 `placeholder` + `safe-area-inset-top` 让位。

底部使用自绘 `PortalTabbar`（内部为 Wot `wd-tabbar`），固定 4 个主栏；`pages.json` 由 `@uni-helper/vite-plugin-uni-pages` 生成并提交，不注册原生 `tabBar`。主栏互切用 `uni.reLaunch` 清栈，二级页用 `navigateTo` 入栈。激活态为「图标胶囊底 + 深主色图标 + 加粗标签」，未激活保持中灰。共 **20 条注册路由**（4 主栏 + 16 二级页）：

| 主栏 | 路由 | 内容 |
| --- | --- | --- |
| 首页 | `pages/home/index` | 对象区（圆形头像 + 姓名 + 性别年龄关系 + 切换）、品牌色报告主视觉、待核对提示、四入口金刚区、页脚；游客看到深主色欢迎卡 |
| 报告 | `pages/report/index` | 对象条 + 页签「基因报告 / 培育建议」、状态卡、六册目录（字母 A–F）、建议分册列表 |
| 培养方向 | `pages/direction/index` | 页签「推荐方向 / 已选方向」、推荐卡 / 已选卡、取消与换档入口 |
| 我的 | `pages/profile/index` | 资料卡、对象行、编辑资料 / 孩子管理 / 更多设置 / 退出登录；协议、隐私、关于版本与注销收进「设置」 |

| 二级页 | 路由 | 所属 | 说明 |
| --- | --- | --- | --- |
| 登录 | `pages/auth/login` | — | 微信手机号一键 / 微信授权 / H5 账号密码；`redirect` 只接受 `/pages/` 站内路径 |
| 账号停用 | `pages/auth/locked` | — | 403 `ACCOUNT_DISABLED` 或 summary `parent_disabled` |
| 切换对象 | `pages/subject/picker` | 首页 / 报告 / 我的 | 本人 + 已绑定子女，返回后来源页按新对象重载 |
| 分册页 | `pages/report/volume` | 报告 | 章节 + 要素行；参数 `reportId`、`volumeId` |
| 要素解读 | `pages/report/factor` | 报告 | 固定注解、数据熵、相关方向、上一项 / 下一项 |
| 培育建议 | `pages/advice/index` | 报告 | 建议分册列表；`?reportId=` 可深链 |
| 建议书 | `pages/advice/detail` | 报告 | 按分册四段文案展示 |
| 方向详情 | `pages/direction/detail` | 培养方向 | 推荐命中、档位与选择 / 换档 |
| 选择方向 | `pages/direction/manual` | 培养方向 | 0 命中或主动自填；末位「其他」 |
| 编辑资料 | `pages/profile/edit` | 我的 | 昵称 / 头像 / 姓名 / 性别 / 生日；手机号只读 |
| 孩子管理 | `pages/profile/children` | 我的 | 孩子列表、查询状态、证件脱敏 |
| 孩子信息 | `pages/profile/child-form` | 我的 | 新增 / 编辑孩子 |
| 设置 | `pages/profile/settings` | 我的 | 用户协议、隐私政策、关于与版本、联系客服、注销账号（二次确认 + 勾选门禁） |
| 用户协议 | `pages/agreement/index` | — | 登录页与「设置」入口 |
| 隐私政策 | `pages/privacy/index` | — | 登录页、「设置」、资料编辑入口 |
| 关于 / 版本 | `pages/about/about` | 我的 | 品牌、版本号与版权（协议 / 隐私 / 客服不在此页重复） |

报告采用「报告主栏 = 总览、分册页 = 目录、要素解读 = 条目」三层：BR-02 一人一份，因此**不设独立报告列表页与报告总览页**；注销为「设置」页内二次确认，不单独设页。旧的 `pages/index/index`、`pages/me/me`、`pages/talent/report/{list,overview,catalog,item}`、`pages/talent/plans`、`pages/talent/binding`、`pages/account/delete` 已随 M6/M7 删除。

页面保持薄组合层：路由页只做参数解析与 `onLoad/onShow` 接线；业务组件与 composable 在 `src/modules/talent-portal/` 与各 `pages/**/components/`，基础门户（认证、主题、Tabbar、返回 / 登录守卫、协议文档、资料编辑基础表单）在 `src/modules/foundation-portal/`。

## 登录、对象切换与数据边界

| 平台/能力 | 客户端动作 | 接口 |
| --- | --- | --- |
| 微信小程序授权 | `uni.login()` 获取 code | `POST /api/client/auth/wx-login` |
| 微信手机号一键登录 | 小程序 login code + `getPhoneNumber` code | `POST /api/client/auth/wx-phone-login` |
| H5 账号密码登录 | 输入已开通密码的手机号 / 邮箱 / identity（仅 H5 展示） | `POST /api/client/auth/phone-login` |
| 家长资料 | 中性账户 + 会员档案脱敏合并 | `GET/PUT /api/client/talent/profile` |
| 孩子 | 列表 / 新增 / 编辑（自动发起外部查询） | `GET/POST /api/client/talent/children`、`PUT /children/:id` |
| 认领家长档案 | 微信已验证手机号哈希认领唯一 parent | `POST /api/client/talent/bindings/claim` |

- 微信小程序登录页只展示微信手机号一键登录，账号密码表单通过 `#ifdef H5` 编译期控制。
- **登录失败反馈**：登录页在行内展示可读原因（账号或密码错误、网络失败等），输入变化后自动清除；未勾选协议时按钮仍可点击并提示原因，不做「禁用但无说明」的死路。`/api/client/auth/*` 等未携带 token 的请求返回 401 时只回给页面处理，**不**触发全局会话过期跳转；只有带登录态的请求 401 才由会话守卫统一 `reLaunch` 回登录页。
- **对象切换**：服务端只按当前登录账户的 `talent_parents.userId` 解析家长，再按 `parentId` 列子女；C 端不写服务端绑定关系（`bindings` GET 只读），切换后的对象只记本机并由 `/summary?subjectId=` 与各数据路由的 `reportId` 携带；越权返回 404。
- 未登录访问受保护二级页会 `redirectTo` 登录并回跳；登录成功只接受 `/pages/` 开头且不含 `://` 的路径。退出登录清除本机会话与对象记忆。
- 未绑定家长（无 parent）时 summary 返回 `accountState="unbound"`；家长停用返回 `parent_disabled`，数据路由统一 404，不泄露资源存在性。
- 登录结果包含 token、过期时间、可选 openid、`isNew` 和中性用户资料；token 不得出现在 URL、日志、埋点、截图或公开配置中。

## 报告、培育建议与 PDF

- 报告主栏 `GET /api/client/talent/reports/:id` 返回状态 + 固定 6 册摘要 + 建议份数；分册 `GET .../volumes/:volumeId` 返回章节、要素、数据熵、固定注解与相关方向；要素解读 `GET .../factors/:factorCode` 返回单要素详情。空册、未开放册与不存在册分别有明确状态文案。
- 报告 `pending_publish` / `retracted` 返回 409 + `data.state`（「报告正在整理中」/「报告内容更新中」）；越权、解绑、子女停用统一 404「内容不可查看」。
- 培育建议按分册四段展示；`GET /api/client/talent/advice?reportId=` 返回 `available=false` 空态，不展示撤回原因；报告撤回后建议同步消失。
- 培养方向：推荐 ≤5、选择 ≤3、支持换档 / 取消 / 自填；0 命中时给出自定义入口；方向与档位编码不在页面展示。
- **PDF**：C 端唯一入口是 `GET /api/client/talent/reports/:id/volumes/:volumeId/pdf`。H5 先 `POST .../pdf-ticket` 取 120s HMAC ticket 再新窗口打开；小程序走 `uni.downloadFile` + `openDocument({ showMenu: true })`。代理每次重新校验登录态、会员 / 子女归属、报告发布状态与分册开放范围；`TALENT_PDF_ENABLED=0`、未发布、未开放均返回 404 `PDF_NOT_READY`。C 端不接触 PocketBase / OSS 原始地址，下载会写 `talent_pdf_downloads` 留痕（仅 HMAC 摘要与 UA 家族）。

## UI 与可访问性

- **Wot UI 优先**：能用 `wd-navbar`、`wd-tabbar`、`wd-cell`、`wd-button`、`wd-input`、`wd-textarea`、`wd-picker`、`wd-popup`、`wd-dialog`、`wd-empty`、`wd-loading`、`wd-icon` 等现成组件就不使用原生控件或重复自定义样式。仅在 Wot 无对应能力或平台原生开放能力（如微信 `chooseAvatar`）时保留原生控件，并统一 H5 / 小程序默认样式。
- Wot token 映射到 `--foundation-*` 令牌，不能恢复其默认蓝白主题；页面只引用令牌，禁止硬编码品牌色。
- **视觉系统**：暖纸底 `#faf8f3` + 纯白卡片 + 发丝描边 + 单层柔光阴影；圆角 18px（小卡 14px、大卡 24px）；标题字重统一 `--fw-semibold`（600），不写 650 之类非标准值；列表内部分隔线用 `--foundation-hairline`，底部固定操作条统一 `--foundation-shadow-bar`。
- **通用块**：`.portal-card`（卡片）/ `.portal-tap`（按下内缩 + 底色变化）/ `.portal-hint`（辅助说明）在 `style/index.scss` 统一维护，页面不重复写同款卡片样式。
- **状态视图**：加载 / 空 / 错只有一个实现 `PortalStateView`（图标胶囊 + 标题 + 一句说明 + 主操作）；`DirectionStatusCard` / `AdviceStatusCard` / `ReportStatusCard` 只做语义映射，阻断态图标按状态名从 `state-icons.ts` 取。页面级「未绑定 / 停用 / 列表为空 / 读取失败」也直接复用该组件，不再各写 `wd-empty` 或自绘状态卡。
- **列表行信息合并**：一行承载「标签 + 值」，多段元信息用 `·` 连接并单行省略（孩子卡：`证件 xxx · N 篇报告` + 右侧状态标签；报告对象条：`男 · 11 岁 · 6 个分册可读`），不再用两三条小字堆叠。
- **分册编号**：家长端一律用字母 `A / B / C…`（`volumeLetter()` / `volumeLabel()`，见 `modules/talent-portal/volume-label.ts`），不出现「第 1 分册」或 `01 / 02` 数字；分册入口左侧是浅主色字母徽标，册名不重复字母。数据层 `sortOrder` / `V1–V6` 与建议书 `A–F` 内部键不直接展示。
- **按钮层级**：主操作用实心 primary，次操作用 soft（深主色文字 + 主色浅染底），文字操作用 text；禁用态为中性底 + 中灰字（不用半透明白字，避免在浅绿底上看成坏按钮）。
- **操作条与页脚**：底部固定条只用 `--foundation-card` 底 + `--foundation-shadow-bar`，不加 `border-top`；翻页类操作优先用 44px 圆形图标按钮 + 中间位置说明，而不是两个大文字按钮。
- 交互控件最小高度 44px；图标按钮需 `aria-label`；H5 有可见焦点态并遵从 `prefers-reduced-motion`；4 栏在 340 宽度下仍保证每项可点区域 ≥44px。
- **文案口径**：家长端不出现内部编码（建议书编号、册号字母 A–F、接口 / 状态码）；一句一事，删除与按钮、页签、分区标题重复的说明行。
- 微信小程序需处理状态栏、胶囊与底部安全区；自定义导航 + 悬浮胶囊下，标题与返回不得被遮挡。
- **单位与字号**：布局与字号统一使用 `px`（375pt 基准，750 设计稿数值 ÷2），只有发丝线保留 `1rpx`；字号通过 `--fs-*` 令牌引用，不写死数值。
- **关系标签**：「本人 / 子女 / 当前」用横向 11px 胶囊标签，名字与标签同一行。
- **报告对象条**：首页与「我的」共用 `PortalObjectBar`，仅在存在多个可查看档案时展示；只有本人档案时首页不显示对象条。
- 状态覆盖：加载 / 空 / 错 / 未登录 / 未绑定 / 账号停用 / 报告整理中 / 内容更新中 / PDF 不可下载，弱网失败提供重试，不弹技术错误码。
- 图标使用 Wot 图标或门户内联 SVG，禁止 Emoji 图标。

## 站点配置与主题（只读）

启动时 `App.vue` 恢复本地会话并加载唯一站点的公开配置；配置来源为 `GET /api/client/config/site`：

```ts
{
  appName: string
  logo: string
  copyright: string
  contactPhone: string
  primaryColor: string
  themeMode: 'light' | 'dark' | 'system'
}
```

`useSiteStore` 会把配置派生为 `--foundation-*` 与 Wot UI CSS 变量。C 端只使用后台站点配置的品牌主色和 `themeMode`，**不提供用户侧外观设置**；当 `themeMode=system` 时跟随设备明暗模式，也不回写后台配置。

已知取舍：4 个主栏改用微信原生导航栏后，导航栏底色是 `pages.json` 里的静态值（`#FAF8F3`），不随 `themeMode` 变深；`themeMode=dark` 时页面转深色、原生导航仍为浅色。若要跟随，只能退回自绘导航条。

## 环境配置

根目录 `.env` 用于 Nuxt / PocketBase 运行时；**不会**自动注入 uni-app。C 端所有可编译变量位于 `apps/client/env/`，变量必须以 `VITE_` 开头，且会被打入 H5 / 小程序产物，因此不能放 AppSecret、PocketBase 超管密码、`ENCRYPTION_KEY` 或任何用户 token。

Vite 会读取公共 `apps/client/env/.env`，再按当前 mode 叠加 `.env.development`、`.env.production` 或 `.env.test`。当前关键变量如下：

| 变量 | 来源 / 默认值 | 用途与要求 |
| --- | --- | --- |
| `VITE_APP_TITLE` | `.env` | 门户构建名称；运行时站点名称仍来自 B 端公开配置。 |
| `VITE_APP_VERSION` | `.env`，当前 `1.0.0` | 关于页展示 + 小程序 versionName。 |
| `VITE_APP_PORT` | `.env`，当前 `9000` | H5 开发服务端口配置。实际 URL 以开发命令输出为准。 |
| `VITE_UNI_APPID` | `.env` | uni-app 应用 ID。 |
| `VITE_WX_APPID` | `.env` | 微信小程序 AppID；必须与 B 端「微信配置」中对应的小程序凭据属于同一个小程序。 |
| `VITE_FALLBACK_LOCALE` | `.env`，`zh-Hans` | 写入 manifest 的默认语言。 |
| `VITE_SERVER_BASEURL` | 开发模式为 `http://127.0.0.1:3000`，生产 H5 模板为 `/` | H5 请求的 Nuxt API 前缀。小程序不接受 `/` 或相对路径。 |
| `VITE_SERVER_BASEURL__WEIXIN_DEVELOP` / `__TRIAL` / `__RELEASE` | production 模板的开发者工具默认 `http://127.0.0.1:3000`；体验版 / 正式版需分别配置 HTTPS | 微信小程序按 `envVersion` 选择的完整 API URL；未配置时回退到 `VITE_SERVER_BASEURL`，若回退值为 `/` 会给出明确配置错误。 |
| `VITE_APP_PROXY_ENABLE` / `VITE_APP_PROXY_PREFIX` | development 启用 / `/fg-api` | 仅 H5 开发代理。启用时浏览器请求先走该代理前缀，再由 Vite 转发到 `VITE_SERVER_BASEURL`。 |
| `VITE_APP_PUBLIC_BASE` | 开发与生产模板均为 `/` | H5 静态站部署路径。子路径需前后带 `/`（如 `/portal/`），反向代理、静态目录与 OAuth 回调页必须一致。 |

本地开发不需要修改这些文件：`pnpm client:dev`（小程序）与 `pnpm --filter foundation-portal dev:h5` 会使用 `.env.development` 的 `http://127.0.0.1:3000`。`pnpm client:build:mp` 默认是 production mode，微信开发者工具仍识别为 `develop`；真机不能访问 `127.0.0.1`，需替换为手机可访问的 HTTPS 或局域网地址。体验版 / 正式版构建前必须覆盖对应的 `__TRIAL` / `__RELEASE` 变量。

## 本地开发与验证

在仓库根目录运行：

```bash
pnpm client:dev                         # 微信小程序开发构建
pnpm --filter foundation-portal dev:h5  # H5 开发（127.0.0.1:9000）
pnpm client:typecheck
pnpm client:lint
pnpm client:build:h5
pnpm client:build:mp
pnpm client:check:wxss                  # 构建后检查原生 WXSS 兼容性
```

页面与接口开发时使用 `127.0.0.1`，避免 `localhost` 的 IPv6/HMR 问题。验证至少覆盖：游客首页、登录（H5 账号密码 + 小程序手机号 / 微信授权退化）、本人 / 子女对象切换、报告主栏 / 分册 / 要素、培育建议、方向推荐 / 选择 / 换档 / 自填、孩子管理与资料编辑、PDF 下载、退出登录；390 与 340 宽度截图矩阵、无横向溢出、可点区域 ≥44px、console 0 错误。

发布前还要在真实目标环境验证：H5 子路径刷新后仍可进入页面、小程序已配置合法请求域名、微信胶囊与安全区、C 端上传 / 头像 URL 可由用户浏览器访问。完整检查表见 [QUALITY.md](QUALITY.md)。