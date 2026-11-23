# ADR 0008 · M8 外部接口与 PDF 关键决策（适配器 / 拉取 / 渲染 / 水印 / 存储 / 告警 / 回滚）

| 项 | 内容 |
| --- | --- |
| 状态 | 已接受（2026-11-17，architect-m8 / task-26；待 lead 复核） |
| 日期 | 2026-11-17 |
| 决策人 | 架构师 teammate（task-26） |
| 关联 | [M8 规格](../specs/M8-external/spec.md)、[M8 验收](../specs/M8-external/acceptance.md)；[M2 规格](../specs/M2-members/spec.md) §5.6 / [ADR 0002](0002-m2-member-domain.md)、[M3 规格](../specs/M3-reports/spec.md) §7–§9 / [ADR 0003](0003-m3-report-domain.md)、[M5 规格](../specs/M5-advice/spec.md) §7–§9 / [ADR 0005](0005-m5-advice-domain.md)、[M7 规格](../specs/M7-c-end/spec.md) §6.5 / §10.5 / [ADR 0007](0007-m7-client-portal.md)；PRD v1.1 §6.6（L258–300）/ §6.7（L301–322）/ §7.4（L363–381）/ §9（L539–578）/ §10（L581–589）/ §11（L591–602）/ §13.1（L636–643）；[QUALITY](../QUALITY.md)、[OPERATIONS](../OPERATIONS.md)、[AGENTS.md](../../AGENTS.md) |
| 影响范围 | `server/utils/talent-external-*.ts`、`server/utils/talent-pdf-*.ts`、`server/api/integrations/talent/**`、`server/api/client/talent/reports/**`（M7 路由的 M8 seam）、`server/api/admin/talent/integrations/**`、`server/plugins/{env-check,talent-integration-scheduler}.ts`、`scripts/{setup,sync-talent}.mjs`、`shared/types/talent-*.ts`、`test/talent-*m8*.test.ts` / `test/talent-pdf-*.test.ts`、`.env.example` |
| 并行对齐 | 消费 M2 查询源、M3 报告快照与同步锁、M5 建议版本与接收新版、M7 PDF 路由 seam；M6 删除旧报告/旧 PDF/旧同步页；M9 做 e2e 与性能 |

> 本文沿用 ADR 0001–0007 的「背景 / 选项 / 结论 / 后果」写法；D1–D7 是实现合同，spec 中不再重复论证。三条永久红线（单实例单 PB、天赋字段只落 `talent_*`、PDF/OSS 私有）在 D1/D2/D5 中再次明确。

---

## D1 · 适配器接口与切换开关：保留 M2/M3/M5 冻结接口，M8 只加共享传输层与 `external` 实现

**背景**

M2/M3/M5 已分别冻结 `TalentGeneQuerySource`（M2 §5.6）、`TalentGeneReportSource`（M3 §9）、`TalentAdviceSource`（M5 §9），三者的 Mock 工厂是各自调用方的唯一切换点；M3/M5 规格都写明「M8 只换实现，不改调用方」。PRD §13.1-2 要求补齐「真实第三方接口（基因报告、培育建议）、同步幂等键、失败重试与告警」，M2 §5.6 也把真实查询源留给 M8。

现状：M3/M5 工厂在 `TALENT_*_SOURCE=external` 时直接 503（防静默降级）；M2 工厂忽略环境变量恒返回 Mock（`talent-member-query.ts` L485–494），三处不一致。同时仓库已有一套旧第三方同步（`talent-external-sync.ts` + `configs.talent_sync_config` + 旧 webhook），服务旧报告模型，M6 才删除。

矛盾点：如果为了「统一」重写三套接口为一个通用适配器，会破坏已冻结的调用方与测试；如果把 M8 配置写进 `configs`（沿用旧模式），就违反「天赋业务字段只落 `talent_*`、不回填 `configs`」硬约束。

**选项**

1. **保留三个冻结接口，M8 新增共享传输层（签名/重试/限流/告警）+ 三个 `external` 实现；环境变量切换、缺配置 503、生产 Mock 启动失败；M8 配置只读 env，不写 `configs`。**
2. 设计一个统一 `TalentExternalSource` 泛型适配器，替换三个接口，调用方全部改签名。
3. 复用旧 `talent-external-sync` + `configs.talent_sync_config`，在其上扩展新报告/建议。
4. 引入独立「集成网关服务」承接三个源，Nuxt 只做代理。

**结论**

选 1。理由：

- 三个接口是 M2/M3/M5 的验收合同，M8 的职责是「换实现」而不是「改合同」；保留签名让 M3/M5 的领域测试、Mock 语义、错误码继续有效。
- 三套调用方共享的是传输关注点（签名、超时、重试、限流、熔断、脱敏摘要），不是业务数据模型；抽「传输层」而不抽「领域接口」是正确切分。
- 配置只走环境变量：一是满足「不回填 `configs`」红线；二是 M8 不新增 B 端配置页（PRD 最终 11 个菜单里没有同步配置），避免 M6 删除旧页后再造一个新页；三是密钥留在部署环境比落库更符合 QUALITY §环境与安全。
- 缺配置必须 503 而不是静默降级 Mock：生产「看起来有数据」比「明确不可用」危险；`TALENT_ALLOW_MOCK_SOURCES=1` 只作为演示环境的显式危险开关。
- 选项 2 会让三个域的类型/错误/测试全部返工，收益只是少一个传输层；选项 3 把新模型绑在 M6 待删的旧链路上；选项 4 违反单实例/单 PB 的运维边界，M8 不需要独立服务。

**后果**

- M2 工厂补 `external` 分支，行为对齐 M3/M5（缺配置 503）；三个工厂仍是唯一开关点。
- 新增 `server/utils/talent-external-client.ts`（传输）与三个 `*-external-source.ts`（映射）；映射字段集中，不散落业务层。
- `.env.example` 新增 §9 配置键；`env-check` 增加「生产 + mock → 启动失败」「external 缺基址/密钥 → 启动失败」。
- 旧 `talent_sync_config`/旧 webhook/旧调度原样保留到 M6；M8 新调度插件与旧插件并行但互不共享配置/锁。
- 后续若要「后台可视化配置外部源」，需新 ADR 并新增 `talent_*` 配置集合或明确豁免，不能直接回填 `configs`。

---

## D2 · 拉取为主 + 签名触发：入站只触发幂等拉取，重试走「本次退避 + 下轮全量候选」

**背景**

PRD 同时存在两种外部交互语义：报告是「我们按子女身份证号批量拉取」（§6.6 一键同步「以子女身份证号为主键批量拉取」），建议是「外部系统按姓名 + 年龄输出、每 4 个月一版」（§1.1 / §6.7 / BR-07）。M3/M5 冻结的接口都是「按对象查询」（`fetch(subject)` / `match(subject)`），不是「推送整批正文」。但 PRD §13.1-2 又要求「失败重试与告警」，运维也会希望外部系统「有新数据时通知我们」，而不是等下一个 6 小时。

现有旧实现是「定时拉取 + webhook 推 payload + 指纹幂等 + 同步日志」，但 payload 入库逻辑绑旧模型（`talent_report_receipts`），且 webhook 接收正文会引入新的解析/校验/存储面。

**选项**

1. **出站拉取为主；入站 webhook 只做「签名触发拉取」（gene-reports/advice 两个 poke）与 M2 查询回执；不接收报告/建议正文。重试 = 运行内指数退避 + 下一轮全量候选重试，不建独立队列表。**
2. 入站接收完整报告/建议 payload，落临时集合后再转正式模型（全推送）。
3. 引入外部队列/消息中间件，由消费者拉取并重试。
4. 只保留定时拉取，不做任何入站（最简单，但「有新数据立即同步」做不到）。

**结论**

选 1。理由：

- M2/M3/M5 的接口是「按对象查询」，拉取天然复用；推送正文需要额外设计暂存集合、批次顺序、部分失败、重复覆盖，等于在 M8 重做一遍 M3/M5 的入库，成本与风险都高。
- 入站「触发」不携带正文，最坏情况只是多拉一次；拉取本身由 M3/M5 的唯一键/幂等保证，重复触发无害，也就不需要为去重再建事件表。
- 重试不建队列表：候选是「M2 已查到对象全集」，下一轮自然重试失败对象；运维也可手动触发 M3 一键同步。这避免新增一张需要清理、会与 M3/M5 状态机竞争的表，符合单实例 + SQLite 的现实。
- M2 查询回执是**回执**（小、幂等键冻结），不是正文推送，可以入站；由 M2 `applyTalentGeneQueryReceipt` 的 seq 守卫兜底。
- 选项 2 与冻结接口冲突且需要新集合；选项 3 超出单实例边界与报价范围；选项 4 会让「外部已出结果」到「家长可读」延迟到下一个周期，运营体验差。

**后果**

- 提供方合同必须提供 `POST /v1/.../query` 类接口（§3.4/§3.6/§3.7）；若对方只能推送，需在适配层加暂存（列入未决 C1，不在本期默认实现）。
- 入站 3 条路由：`gene-reports/sync`、`advice/sync`（202 触发）与 `gene-query/receipts`（200 落库）；统一 HMAC/时间窗/体积/限流，不复用旧 `reports.post.ts`。
- 定时器只在单实例注册；进程重启不补跑，下一轮全量候选补齐；运行锁复用 M3 `withTalentReportLock` / M5 `advice:version`。
- 失败语义：单条失败不阻断、整体 `partial`；源整体不可用 503 且不写业务数据；下一轮或手动重试。
- 不新增「事件表/队列表」；`eventId` 只进日志留痕，不作为业务幂等键。

---

## D3 · PDF 渲染：`pdf-lib` + `fontkit` 按快照程序化排版，不引入 headless Chromium

> 修订（2026-11 体积治理）：字体文件（16MB）移出 Git 仓库，本地执行 `pnpm fonts:fetch` 按需下载到 `server/assets/fonts/`，`OFL.txt` 仍随仓库；生产环境因只部署 `.output`，需在服务器安装中文字体或用 `TALENT_PDF_FONT_PATH` 指定路径。D3 其余结论不变。

**背景**

PRD §7.4 要求分册页底部「下载本册 PDF」（仅开放册），§10.4 要求「不暴露对象存储直链，走服务端签名/代理，带时效与水印」，§13.1-3 把「PDF 渲染、水印、时效地址、下载留痕与权限代理」列为必须补齐。M7 §6.5 已冻结代理路由、门禁与交互，M8 只提供真实文件。M3 §8.4 明确「按报告快照（volumeSnapshot/factorSnapshot）渲染」，M3 不生成/上传 PDF。

报告结构是高度结构化的（六册 × 章节 × 要素 × 固定注解），不是营销页面；内容全部来自冻结 JSON，排版规则稳定，不需要浏览器级 CSS 能力。

**选项**

1. **`pdf-lib` + `@pdf-lib/fontkit` 程序化排版：快照 → 文档模型 → 分页 → 中文子集字体 → 水印；纯 Node，无浏览器。**
2. headless Chromium（Puppeteer/Playwright）渲染 HTML/CSS 模板再打印 PDF。
3. 让外部机构直接出具带水印的 PDF，我们只存储/代理。
4. 用 Office/LaTeX 模板离线生成（人工或批处理）。

**结论**

选 1。理由：

- 内容确定、结构固定，程序化排版的版面控制（孤行、要素块不跨页、页眉页脚、水印平铺）比 CSS 更可预测；同一输入字节级稳定，便于 contentHash 缓存与验收比对。
- `pdf-lib` 是纯 JS、无浏览器依赖：单实例 Node 进程不需要额外 ~300MB Chromium、不需要处理浏览器并发/内存/沙箱与部署差异；15s 渲染超时与并发 2 可控。
- 中文可行：`fontkit` 支持子集化，随包 Noto Sans SC（OFL）避免线上缺系统字体；字体版本进哈希，升级可重渲。
- 选项 2 的 HTML/CSS 模板迭代更快，但会引入浏览器进程管理、字体安装、并发内存、容器镜像体积等运维成本，且渲染结果受环境影响，不利于「同输入同哈希」。
- 选项 3 无法满足「按开放册出、统一水印、发布/撤回联动、未发布 404」的平台侧口径；外部 PDF 只能作为旧模型附件存在，M3 已明确不复用旧 `pdfUrl`。
- 选项 4 无法按请求生成、无法覆盖增量分册，且引入离线工具链。

**后果**

- 新增纯函数模块：文档模型（快照→blocks）、分页器、字体加载/子集、水印、渲染器；可用快照 fixture 做黄金测试（页数、文本抽取、哈希）。
- 字体资产与 OFL 许可证进仓库；`.env` 可覆盖字体路径；字体缺失启动失败。
- 版面变更必须递增 `templateVersion`（进 contentHash），否则旧缓存不会失效；验收需覆盖「模板升级 → 新产物」。
- 单册 ≤200 页、≤10MB；超限明确失败，不截断内容。
- 不承诺像素级视觉稿；以版式规则 + 文本完整性 + 水印可见性作为验收标准（M9 若需要视觉基线再补截图）。

---

## D4 · 水印与时效下载：每页水印冻结「生成日期」，H5 用 120s 签名 ticket，小程序走 Bearer 代理，不下发存储直链

**背景**

PRD §10.4 要求 PDF「带时效与水印」；M7 D7/§6.5 约定水印含「姓名 + 手机尾号 + 报告编号」，并要求「不返回 PB/OSS 直链」。C 端两种平台能力不同：微信小程序 `uni.downloadFile` 可以带 Header，H5 新窗口打开无法自定义 Header。若只做 Bearer 代理，H5 下载会 401；若把 OSS 签名 URL 返回浏览器，就暴露存储域名与对象 key，且无法在撤回/停用后立即失效。

水印若包含「每次下载时间」，同一文件每次下载都必须重渲，缓存失效、CPU 成本高；若只含静态信息，又缺少时间要素。

**选项**

1. **水印 = 家长姓名 + 手机尾号 4 位 + 报告编号 + **首次生成日期**，每页平铺；生成日期写入元数据，内容哈希不含日期；H5 通过 `POST pdf-ticket` 拿 120s HMAC ticket，用同源代理 URL 新窗口打开；小程序用 Bearer 代理；两者都重新鉴权。**
2. 水印含每次下载时间，每次重渲（不缓存）。
3. 返回 OSS 60s 签名直链给 H5。
4. 不做 H5 新窗口，统一让用户长按/下载（H5 体验差）。

**结论**

选 1。理由：

- 「首次生成日期 + 报告编号 + 身份标识」已能起到溯源与震慑作用；下载时间另有 `talent_pdf_downloads.at` 留痕，审计需要时可关联，不需要把每次下载时间烧进文件。
- 生成日期不进 contentHash 的「日期」维度（哈希只含稳定内容与身份哈希），缓存才能复用；同一产物第二次下载字节一致，恢复/补发场景可验证。
- ticket 只解决「新窗口不能带 Header」，不是授权：载荷只含 id 与 exp，无 PII；服务端命中后仍重新校验账号/家长/报告/开放册/子女状态，撤回或停用后即使 ticket 未过期也拒绝。
- 120s TTL + `no-referrer` + 代理不记录查询串，泄露窗口小；可选一次性 nonce 应对更严合规。
- 选项 2 让每次下载都付渲染成本，且缓存/灰度/验收都变复杂；选项 3 暴露存储域名与 key，且撤回后签名 URL 在 TTL 内仍可用，违反「撤回立即不可见」；选项 4 牺牲 H5 体验且 PRD 要求双端可用。

**后果**

- 新增 `POST .../pdf-ticket`（Bearer）与 `GET .../pdf?ticket=` 双路径；M7 页面交互不变（H5 打开 ticket URL，小程序沿用代理）。
- 水印策略可配 `TALENT_PDF_WATERMARK_MOBILE=0`（去手机尾号时身份哈希改用姓名+报告编号）；客户如要求「下载时间水印」需新 ADR（重渲或动态叠加）。
- 家长改名/手机尾号变更会改变身份哈希 → 下次下载生成新产物；旧产物按保留策略清理。
- 反向代理配置要求：该路由不记录 query（或对 `ticket` 打码）；应用日志只记 `requestId` + 结果码。
- 响应头固定 `private, no-store`、`nosniff`、`no-referrer`；支持 Range（≤10MB 缓冲）。

---

## D5 · 存储：PB 私有 `uploads` 与 OSS 私有二选一，统一 AES-256-GCM 加密，新增内容哈希元数据集合

**背景**

QUALITY 发布清单要求「`OSS_ENABLED=false` 时验证 PocketBase 私有文件经权限代理预览；开启时 OSS bucket 保持私有、新上传对象为 AES-256-GCM 密文」。现有旧 `talent-report-pdf.ts` 已实现「OSS 对象加密 + PB uploads（purpose 保护）」两种模式，但服务旧报告模型（`pdfUrl/pdfFileKey` 字段），M3 明确不复用旧字段。

M8 需要：按分册存、按内容哈希复用、撤回/恢复/补发不改旧册、可清理、可审计、不得公开读。

**选项**

1. **默认 PB `uploads(purpose=talent-report-pdf)`（list/view 拒绝），可选 OSS 私有对象；两种模式都 AES-256-GCM 加密；新增 `talent_report_pdfs` 元数据集合，唯一键 `(reportId, volumeId, contentHash)`；对象 key 只含 id 与哈希。**
2. 只用 OSS（生产必须配 OSS），PB 仅本地开发。
3. 只用 PB，不接 OSS。
4. 复用旧 `talent_reports.pdfUrl/pdfFileKey` 字段存新 PDF。

**结论**

选 1。理由：

- 交付环境可能没有 OSS（本地/小规模客户），PB 私有 + purpose 规则已经能保证「不可公开读」；有 OSS 时再切，二者同一套代理与元数据，运维成本低。
- 加密存储是 QUALITY 明确要求，PB 模式也加密可避免「数据库文件被拷走即泄露 PDF」；`ENCRYPTION_KEY` 已是必填项，不引入新密钥体系。
- 内容哈希作缓存键：恢复/补发/重算时只有内容变化的册重渲；旧册字节不变可验证（AC-M8-13/R14）；旧 `pdfUrl` 字段语义是「外部附件/整份」，复用会重演 M3 要避免的新旧混淆。
- `talent_report_pdfs` 只存元数据（无 PII），既能定位存储对象，又能做清理与审计；不把文件二进制塞进业务集合。
- 选项 2 会让本地开发/无 OSS 部署不可用；选项 3 无法满足有 OSS 客户的容量/合规诉求；选项 4 违反 M3 边界且旧字段语义冲突。

**后果**

- 新库 `setup.mjs` 建两集合与索引；存量库 `sync-talent.mjs` 只加不删；旧 `talent_reports` 字段与旧集合原样保留到 M6。
- 对象 key：`talent-pdf/{reportId}/{volumeId}/{contentHash}.pdf`；OSS 存储 key 用 `oss1.{...}` 封装 iv/tag（沿用旧实现的封装思路，新代码独立）；PB 用 `uploads` record id，`purpose=talent-report-pdf`。
- 加密/解密只在服务端；响应不返回对象 key/存储地址；OSS 签名 URL 只在服务端内部 fetch（≤60s）。
- `ENCRYPTION_KEY` 轮换 → 旧产物不可解密，按需重渲（缓存失效，不视为数据丢失）；OPERATIONS 记录密钥长期保存。
- 清理任务默认每册保留最新 3 个 contentHash；下载日志独立集合保留 180 天；两者都可配置。

---

## D6 · 告警与观测：日志 + 通用 webhook，阈值与冷却集中配置，不引入 APM/短信/邮件新依赖

**背景**

PRD §11 要求「可维护：配置项集中、状态枚举统一、日志可检索」；OPERATIONS §10 要求「建议对探活配告警」；M2/M3/M5 都在失败时写 `error_logs`/同步日志，但还没有统一告警通道。M8 的失败模式是「外部系统不可用/签名错/长时间不同步/PDF 渲染失败」，需要运维在无人值守时也能知道。

**选项**

1. **同步日志 + `error_logs` + 通用告警 webhook（JSON POST，兼容企业微信/飞书机器人）；阈值/冷却集中在配置；新增只读状态接口；不引入 Prometheus/短信/邮件依赖。**
2. 接入 Prometheus/Grafana + Alertmanager。
3. 只写日志，靠人工巡检。
4. 直接集成邮件/短信服务商。

**结论**

选 1。理由：

- 单实例、小团队的运维现实是「PM2 + 日志 + 一个群机器人」；通用 webhook 覆盖企业微信/飞书且不绑定供应商，后续换通道只改 URL。
- 现有日志集合（`talent_sync_logs`/`error_logs`）已经是可检索事实源；M8 只需在其上定义阈值与摘要，不重复造监控系统。
- 状态接口给后台/运维一个「现在是否健康」的读模型，避免每次翻日志；权限复用 M3/M5 的 sync 码，不新增菜单/权限。
- 选项 2 超出交付范围且需要额外服务与长期维护；选项 3 会漏掉夜间失败；选项 4 引入账号/模板/费用与合规面，客户未要求。

**后果**

- 告警规则与冷却见 spec §4.7/§5.5；载荷只含规则、计数、时间、`requestId`，无 PII/密钥/外部报文。
- 未配置 `TALENT_ALERT_WEBHOOK_URL` 时只落 `error_logs` + `console.warn`；告警冷却为进程内状态（重启清零，可接受）。
- 状态接口 `GET /api/admin/talent/integrations/status` 按权限裁剪（`talent:report:sync` / `talent:advice:sync`），不返回基址/密钥。
- M9 如需 Prometheus，可在状态接口/日志上另接，不改变本 ADR 的阈值语义。

---

## D7 · 回滚：三个独立 kill switch，回滚到 Mock 或 M7 的 `PDF_NOT_READY`，新增集合只增不删

**背景**

M8 同时引入「真实外部依赖」与「文件存储/渲染」，故障面比内部模块大：提供方接口变更、密钥错、限流、字体/渲染异常、OSS 配置错。发布频率低但一旦出问题，需要分钟级恢复，且不能丢已同步数据/已发布报告。OPERATIONS §6 的代码回滚保留数据；M3/M5 都有补偿与幂等，M8 需要与之匹配的开关。

**选项**

1. **三个独立开关：源类型（`TALENT_*_SOURCE`）、调度（`*_SYNC_ENABLED`）、PDF（`TALENT_PDF_ENABLED`）；回滚到 Mock（非生产）或 M7 的 `404 PDF_NOT_READY`；新增集合/行保留，不做数据回滚；代码按 tag 回滚。**
2. 只回滚代码（切 tag），不改配置。
3. 回滚时删除新集合/新增行，恢复到「M8 前」。
4. 大爆炸开关：一个 `TALENT_M8_ENABLED=0` 全关。

**结论**

选 1。理由：

- 三类故障的处置动作不同：外部源问题要切源/停调度，但 PDF 可能仍可用；PDF 问题不应停掉同步。独立开关让恢复面最小。
- PDF 关闭返回 `404 PDF_NOT_READY` 正是 M7 在 M8 前的既定行为，C 端页面无需改动即可降级（按钮提示「暂不可下载」）。
- 新增集合是纯增量，旧代码不读它们；删除反而丢证据、可能触发外键/清理问题，且违反「只加不删」的迁移门槛。
- 选项 2 无法快速止血（配置错要等下一次构建）；选项 3 破坏审计与已发布数据；选项 4 一个 PDF 故障会连带停掉报告/建议同步，扩大影响。

**后果**

- 回滚顺序：PDF → 调度 → 源/入站 → 代码 tag；每一步有独立验证（C 端 PDF 404、同步日志不再新增 `auto`、health 200）。
- 生产 Mock 不被允许（D1 的 fail-fast）；回滚到 Mock 只用于非生产联调。
- 新增数据（`talent_report_pdfs`/`talent_pdf_downloads`/同步日志）在回滚后保留但不被旧代码读取；清理任务可停。
- 代码回滚用 OPERATIONS §6 的 tag + `pnpm deploy:remote -- --no-db`；不做 schema 回滚。
- 每次 M8 变更须在 acceptance 记录开关演练证据（spec §11.4 #21）。

---

## 决策汇总

| # | 决策 | 一句话 |
| --- | --- | --- |
| D1 | 适配器与开关 | 三个冻结接口不动；共享传输层 + `external` 实现；env 切换、缺配置 503、生产 Mock 失败 |
| D2 | 拉取与重试 | 出站拉取为主、入站只触发；重试 = 本次退避 + 下轮全量候选；不建队列/事件表 |
| D3 | PDF 渲染 | pdf-lib + fontkit 程序化排版；无浏览器；中文字体按需下载（不入库）、子集嵌入 |
| D4 | 水印与时效 | 每页水印含生成日期；H5 120s ticket；小程序 Bearer；不下发存储直链 |
| D5 | 存储 | PB 私有 / OSS 私有二选一；统一加密；内容哈希元数据集合 |
| D6 | 告警 | 日志 + 通用 webhook + 状态接口；阈值/冷却集中；不引入 APM/短信/邮件 |
| D7 | 回滚 | 源/调度/PDF 三个 kill switch；回滚到 Mock 或 404；只增不删 |

## 后果与后续

- 文档：`API.md`、`ARCHITECTURE.md`、`STATUS.md`、`OPERATIONS.md`、`TALENT-LOCAL.md`、`docs/specs/README.md` 需在 M8 出口同步（不在本任务写范围，见 spec §16）。
- 里程碑：M8 依赖 M2 查询源、M3 报告快照/同步、M5 建议版本、M7 PDF 路由 seam；M6 删除旧报告/旧 PDF/旧同步页后，M8 是唯一 PDF 与真实外部链路；M9 做 e2e、性能与视觉验收。
- 未决：提供方接口文档（C1）、books 编码（C2）、水印是否含手机尾号（C3）、水印时间口径（C4）、周期内新批次策略（C5）、保留期（C6）、告警通道（C8）、打包下载（C9）、临时 Mock 演示（C10）、多实例（C11）——见 spec §15，需 lead/客户/提供方裁决。
- 红线不回退：单实例单 PB；天赋字段只落 `talent_*`、不回填 `users`/`configs`/`site_config`；PDF 与 OSS 私有；旧机构/服务商/多租户入口不恢复。