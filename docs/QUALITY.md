# 质量门禁与验收

质量门禁按改动风险升级。日常小改动先做最小闭环；涉及数据结构、认证、权限、跨端契约、文件上传或发布时必须完成相应构建和真实服务验证。

## 分层门禁

| 场景 | 至少执行 | 还需人工确认 |
| --- | --- | --- |
| 文案、样式或局部组件 | 阅读 diff、检查调用点、相关页面状态 | 目标页面的亮 / 暗色与窄屏表现 |
| B 端或 Nitro 一般改动 | 相关 Vitest、`pnpm typecheck` | 加载、空态、错误态、权限不足 |
| C 端改动 | `pnpm client:typecheck`、目标端构建 | H5 与小程序的导航、主题、安全区和未登录状态 |
| schema / 认证 / 权限 / 上传 | 定向 Vitest、真实 PocketBase 初始化烟测、B/API 类型检查 | 正常 / 拒绝 / 越权 / 异常链路与审计日志 |
| 交付或合并前 | 本页“完整门禁” | 本页“发布验收清单” |

用户明确要求全量验证、准备提交 / 发版 / 合并，或改动高风险路径时，不可只执行静态检查。

## 完整门禁

在依赖已安装、环境已就绪的仓库根目录运行：

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm client:typecheck
pnpm client:lint
pnpm build
pnpm client:build:h5
pnpm client:build:mp
pnpm client:check:wxss
```

微信端须在 `uni build` 后运行原生 WXSS 检查，防止 H5 通配选择器等语法被带入小程序。`client:check:wxss` 默认使用 macOS 标准安装目录的 `wcsc`；其他安装路径通过 `WECHAT_WXSS_COMPILER` 指定，未安装时明确失败，不能当作通过。H5 的 `prefers-reduced-motion` 通配规则仅在 H5 编译。

登录页和“我的”页还须在微信模拟器检查：按钮文字水平/垂直居中，导航不被胶囊或状态栏遮挡；游客不显示空档案表格，已登录后才展示已有报告档案，小程序只显示微信手机号授权入口。

`pnpm qa` 是 `pnpm typecheck && pnpm lint` 的轻量组合，不能代替 C 端检查或构建。构建结果不应提交：Nuxt 是 `.output/`，C 端是 `apps/client/dist/build/`。

## 端到端实测

改动 B/C 端页面、接口、权限或数据行为后执行：

```bash
pnpm exec playwright install chromium   # 每台机器只需一次；未安装时 04/05 套件会直接失败
pnpm e2e                                # 本地，5 个套件
pnpm e2e --target remote                # 打测试服
pnpm e2e --only 04,05                   # 只跑指定套件
```

M6 后套件重写为：

| 编号 | 文件 | 覆盖 |
| --- | --- | --- |
| 01 | `01-admin-crud.mjs` | 新域只读列表（工作台 / 会员 / 规则 / 报告 / 建议 / 集成状态）+ 旧 API 404 + 报告同步 preview |
| 02 | `02-admin-actions.mjs` | 平台运营 / 报告审核 / 规则配置三角色接口正反用例；系统管理与运行监控仅 superAdmin |
| 04 | `04-client.mjs` | C 端 M7 门户（首页 / 报告 / 建议 / 方向 / 我的 / 孩子）可打开、受保护页回登录、旧天赋页下线 |
| 05 | `05-admin-ui.mjs` | 7 个新后台页面渲染、14 个旧页面 404、三角色侧栏菜单 |
| 06 | `06-m6-cleanup.mjs` | 旧页面 / 旧 API 文件不存在、旧 URL 与旧 API 404、旧菜单 / 22 旧权限码 0 行、三角色菜单矩阵、工作台拆码 |

03（旧第三方 webhook 接入 / 会员 CSV 导入）已随 M6 删除；真实外部接入由 M8 重建，接入与性能类用例归 M9 重写（见 [M9 规格](specs/M9-quality/spec.md) §4）。在 M9 全量套件落地前，E2E 结果只作为冒烟证据，不能替代模块 acceptance。

注意事项（报告不可删除、会上传测试 PDF、跑完远端需重新带库部署）见 `scripts/e2e/README.md`。

## 新库初始化烟测

schema、初始化、PocketBase 客户端或环境变量变更后，在与日常数据隔离的空目录验证：

1. 在独立 shell 或临时 `.env` 中设置新的 `POCKETBASE_DATA_DIR`，不要指向已有 `pb_data/`。
2. 执行 `pnpm env:doctor` 与 `pnpm env:setup`，确认初始化成功。
3. 启动 `pnpm pb`，使用 `.env` 的后台凭据登录 B 端。
4. 确认只有 [ARCHITECTURE.md](ARCHITECTURE.md#数据模型) 列出的 34 个集合（17 基础 + 17 `talent_*`）；没有 M6 已删的 19 个旧集合、旧字段、旧菜单、旧权限码或机构角色。
5. 验证用户、角色、菜单、站点配置、文件上传和日志链路能写入预期基础集合。

完成后按本机环境的安全流程处理临时目录；不得删除项目根目录、真实 `pb_data/` 或未明确定位的路径。

## 发布验收清单

### 环境与安全

- [ ] 生产 `POCKETBASE_URL` 只指向唯一目标 PocketBase，未设置任何站点选择或多实例变量。
- [ ] `POCKETBASE_PUBLIC_URL` 与 `NUXT_PUBLIC_POCKETBASE_URL` 是用户浏览器可访问的 HTTPS 地址；上传图片和 Logo 可打开。
- [ ] 远程发布前 `pnpm deploy:remote -- --dry-run` 通过；生产为 `DEPLOY_ENV=production`、`DEPLOY_PUBLIC_SCHEME=https`、`DEPLOY_WITH_DB=false`，并确认 SSH 使用受控凭据。
- [ ] `POCKETBASE_ADMIN_EMAIL`、`POCKETBASE_ADMIN_PASSWORD`、`ENCRYPTION_KEY` 已换为生产专用值，未出现在 Git、日志、截图或前端构建变量中。
- [ ] `ENCRYPTION_KEY` 已长期保存；变更它会导致已有加密微信配置无法解密。
- [ ] 报告 PDF 存储模式已确认：`TALENT_PDF_ENABLED` / `TALENT_PDF_STORAGE` 与 `OSS_ENABLED` 一致；关闭 OSS 时验证 PocketBase 私有文件经权限代理预览，开启时已配置 OSS 密钥，并从 C 端实际下载一个经 ticket / 权限代理的 PDF。
- [ ] M8 外部三源已按环境设置：生产不得为 `mock`（除非显式 `TALENT_ALLOW_MOCK_SOURCES=1` 且经批准）；`external` 域的基址、`TALENT_EXTERNAL_APP_ID`、`TALENT_EXTERNAL_API_SECRET`、`TALENT_EXTERNAL_WEBHOOK_SECRET` 已配置且未进入前端产物。
- [ ] `TALENT_PUBLIC_API_BASE_URL` 已按 H5 / API 是否同域设置；`TALENT_PDF_TICKET_TTL_SECONDS` 不超过 300；PDF 中文字体文件存在且服务进程可读。
- [ ] `OSS_ACCESS_KEY_ID` / `OSS_ACCESS_KEY_SECRET` / `ENCRYPTION_KEY` 只存在服务端运行时，OSS bucket 保持私有；新上传对象为 AES-256-GCM 密文，撤回、授权取消、机构/角色停用后代理和旧存储直链均失效。
- [ ] C 端 `VITE_SERVER_BASEURL`、`VITE_APP_PUBLIC_BASE`、H5 OAuth 回调和微信平台合法域名一致。

### B 端

- [ ] 后台账户可登录，工作台 / 会员管理 / 天赋规则 / 报告管理 7 个业务页面、站点配置、微信配置和健康监控可用。
- [ ] `superAdmin` / 平台运营（`customer-admin`）/ 报告审核员（`report-reviewer`）/ 规则配置员（`rule-configurator`）四个账号的菜单与 API 权限一致；系统管理 / 运行监控仅 `superAdmin` 可见；直接访问无权限路由 / API 会被拒绝。
- [ ] 新增、编辑、禁用、删除等管理写操作有清晰反馈，并在操作日志中可追溯。
- [ ] 亮色与暗色下文本、边框、焦点、表格和表单可读；375px 宽度无破坏性横向溢出。

### C 端

- [ ] 4 主栏（首页 / 报告 / 培养方向 / 我的）均可到达，固定底栏不遮挡内容，所有主操作触控区域至少 44px。
- [ ] 未登录、登录成功、会话失效、接口失败、空资料、未绑定家长、微信未配置、报告整理中 / 内容更新中、PDF 不可下载和注销确认均有可理解状态。
- [ ] 对象切换（本人 / 已绑定子女）后报告、分册、要素、建议、方向按新对象重载；越权返回 404 且不泄露资源存在性。
- [ ] PDF 在 H5（ticket 新窗口）与小程序（`downloadFile` + `openDocument`）均可打开；撤回报告后旧地址立即失效。
- [ ] 站点浅色、深色、跟随系统三种外观正确；C 端不提供本机外观开关，也不会改写 B 端站点默认外观。
- [ ] H5 与微信小程序构建完成；实际微信授权和手机号授权在配置过的目标环境验证。

### 文档与仓库卫生

- [ ] README 的快速开始可从空目录执行，账号来源、C 端环境与运行地址没有过时描述。
- [ ] 新 / 改 API、集合、页面、环境变量、权限和脚本已同步更新 [API.md](API.md)、[ARCHITECTURE.md](ARCHITECTURE.md)、[CLIENT-PORTAL.md](CLIENT-PORTAL.md)、[SCRIPT-GUIDE.md](SCRIPT-GUIDE.md) 或相关文档。
- [ ] `git diff --check` 无空白错误；本地 Markdown 链接可解析。
- [ ] 改了工程规则（`AGENTS.md`）时，各 AI 入口文件同步，且 `pnpm check:ai` 通过。
- [ ] 没有暂存或提交 `.env`、`pb_data/`、`.output/`、`apps/client/dist/`、日志、历史行业素材或测试临时产物。

### 远程发布

- [ ] 日常发版使用 `pnpm deploy:remote -- --no-db`；复用构建产物前确认 `.output/` 与 H5 产物属于同一提交。
- [ ] 涉及 schema、权限或高风险接口时，发布前已在目标服务器 PB 上完成一致性备份，并确认异地副本可用。
- [ ] 远程 PM2 的 `tongjia-talent` / `tongjia-talent-pb` 均为 `online`，`GET /api/health?deep=1` 返回 200，公网 B 端为 2xx/3xx、H5 为 200。
- [ ] 服务器 `ecosystem.tongjia-talent.config.js` 权限为 `600`，发布结束后本地 `.deploy-staging/` 已清理。
- [ ] 服务器 `.deploy-releases/` 保留策略正常，当前 `release.json` 的提交标识与待发布提交一致。
- [ ] 生产首次初始化只使用 `--init-db`；已有库触发门禁时不得绕过，除非经过备份与变更审批后显式使用 `--force-init-db`。
- [ ] 发版失败保留命令和健康检查证据；代码回滚使用上一个稳定 tag 重新执行 `--no-db`，数据回滚单独从 PocketBase 备份执行。

## 故障处理原则

先保留证据，再缩小范围：记录命令、环境变量名称（不要记录值）、访问地址、错误响应和复现步骤。优先检查是否连接了正确的单一 PB、是否使用 `127.0.0.1`、账号是否来自当前 `.env`、C 端是否在使用目标 Vite mode；不要通过删除数据库、重置 Git 或绕过权限来“修复”问题。
