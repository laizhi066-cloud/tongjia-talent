# M8 外部接口与 PDF · 验收与追溯

> 状态：**已执行回填（2026-11-17，verifier-m9 / task-44）**。本轮在演示库（PB 8090 / Nuxt 3000）完成 M8 相关单测、真实 PDF 下载与 ticket 生命周期抽检；真实供应商、OSS、调度、字体资产、B 端预览未验证。结论见 §6。
> 依据：[M8 规格](spec.md)、[ADR 0008](../../adr/0008-m8-integration-pdf.md)、PRD v1.1 §6.6（L258–300）/ §6.7（L301–322）/ §7.4（L363–369）/ §9（L539–578）/ §10（L581–589）/ §11（L591–602）/ §12（L604–630）/ §13.1（L636–643）、BR-02–07/10（L96–110）；M2 §5.6、M3 §3/§4/§8.4/§9、M5 §3/§4/§8.5/§9、M7 §6.5/§10.4/§10.5；[QUALITY](../../QUALITY.md) 风险分级、[OPERATIONS](../../OPERATIONS.md) §6/§10/§11。
> 状态取值只允许：`通过` / `未通过` / `未验证` / `不在范围` / `待裁决`。**本轮未取得证据的条目不改成其它值**；`未通过` 给实际输出。
> 原始证据：`/tmp/tj-m9-verify/vitest-m8.log`、`pdf-ticket.json`、`security.json`、`lint.log`、`typecheck.log`；记录人 `verifier-m9`，日期 `2026-11-17`。

## 1. 范围与前置

**验收对象**

- 外部传输层：签名/HMAC、时间窗/重放、超时、限流、重试退避、熔断、错误分类、脱敏摘要、告警钩子（spec §3、§4.4–§4.5）。
- 三个 `external` 源：M2 查询提交 + 回执、M3 基因报告查询、M5 建议匹配；Mock→external 切换（spec §3.4–§3.10、§4、§5）。
- 同步编排：定时/手动/入站触发、锁与去重、同步日志、熔断、告警、状态接口（spec §2.3、§4.6–§4.7、§5.5、§8.2、§8.5）。
- PDF：六册渲染（快照来源/分页/字体）、水印、内容哈希缓存、PB/OSS 私有存储与加密、代理与 120s ticket、下载留痕、发布/撤回/恢复/补发联动、未发布/未开放口径、清理（spec §6、§7）。
- 数据与配置：`talent_report_pdfs` / `talent_pdf_downloads` 两集合与索引、`setup.mjs`/`sync-talent.mjs` 只加不删、env 键与 `env-check` 规则（spec §7、§9）。
- 权限/审计/隐私：C 端归属与 404/409 口径、状态接口按权限裁剪、入站 HMAC、日志无明文 PII（spec §8.4）。

**不在本次验收**（在 spec §1.2 明确，本表标 `不在范围`）

- M3 报告快照/状态机/增量分册计算/同步预演与提交的内部规则（M3 已验收）；M8 只验「external 实现 + 调用后结果」。
- M5 建议版本/正文/发布撤回/可见性派生（M5 已验收）；M8 只验「external 实现 + 周期触发 + 失败处理」。
- M2 会员/子女状态机/回执丢弃规则（M2 已验收）；M8 只验「查询源 external + 回执入口」。
- M7 C 端页面、下载按钮交互、H5/小程序打开方式（M7 已验收页面，PDF 真实文件项依赖 M8）；M8 只验文件/门禁/ticket。
- 六册打包下载、B 端同步配置页/集成管理页、旧模型/旧 PDF 字段清理（M6/后续）。
- 1000 条性能、e2e 重写、全量视觉与暗色截图（M9）。

**前置依赖（执行时实际状态，2026-11-17）**

1. M2/M3/M5 实现已合并：三个冻结接口工厂存在；M3 `withTalentReportLock`/`previewTalentReportSync`/`commitTalentReportSync`、M5 `receiveTalentAdviceVersion` 可用 — **已满足**。
2. M7 PDF 路由 `GET /api/client/talent/reports/:id/volumes/:volumeId/pdf` 已落地 — **已满足（真实下载 200 `%PDF-`）**。
3. 本地 PocketBase 可启动；`.env` 有超管凭据、`ENCRYPTION_KEY` — **已满足（未读取/未打印任何密钥）**；新库烟测本轮未起（见 E-M8-10）。
4. Mock 全链路可用；PDF 字体文件已入库 — **Mock 可用**；**字体资产已入库**（`server/assets/fonts/NotoSansSC-Regular.otf` + `OFL.txt`，2026-11-17 lead 补齐；PDF 单测 19 passed/1 skipped）。
5. 真实外部契约/OSS 沙箱凭据 — **未提供**（`TALENT_CONTRACT_*`、OSS 测试 bucket/密钥缺失）。
6. 告警 webhook — **未提供**（无测试机器人/本地 mock 接收端）。

## 2. 追溯表（AC-M8-01..16）

> 「实现」按 spec 落点；「测试 / 证据」写实际命令或步骤；退出码与关键输出写入 §4。
> 本轮实际测试集中在本仓库两个测试文件：`test/talent-external-adapter.test.ts`（32 用例：签名/时间窗/nonce/退避/客户端/三源映射/入站/env fail-fast/状态接口）与 `test/talent-report-pdf.test.ts`（20 用例，1 skip：文档模型/水印/门禁/ticket/留痕/Range）。spec 规划的 5 个测试文件未拆分。

| AC | 内容 | PRD / 上游 | 实现 | 测试 / 证据 | 状态 |
| --- | --- | --- | --- | --- | --- |
| AC-M8-01 | 真实源切换：`external` 生效；缺配置 503；生产 Mock 启动失败；不静默降级 | PRD §13.1-2；M2 §5.6；M3 §9；M5 §9 | 三个工厂 `external` 分支 + `env-check` 规则 + `TALENT_ALLOW_MOCK_SOURCES` | 单测：external 缺配置 → 三源工厂 503、生产 + mock 未放行 → fail-fast；**external 端到端切换未实测**；状态接口 live 仅在 mock 模式 | 未验证（单测覆盖缺配置/fail-fast；切换未实测） |
| AC-M8-02 | 鉴权/签名：HMAC 正确；时间窗/nonce 重放拒绝；401 不重试并告警 | PRD §10.5；spec §3.2–§3.3 | `talent-external-adapter` + 入站签名 | 单测：canonical 固定顺序、验签/篡改、±skew、nonce 重放、401 不重试且告警；**真实提供方契约沙箱未验证（缺凭据）** | 未验证（单测通过；沙箱缺） |
| AC-M8-03 | 基因报告一人一份 + 增量分册：重复同步不新建；`books` 全量；补发只追加 | BR-02/BR-05；M3 §4 | external 源映射 + 复用 M3 commit | 单测：M3 源请求体/幂等键/books 归一/sections 映射、found=false 不抛错；**连续两次同步联调与补发旧册 hash 未实测（需隔离实例写操作）** | 未验证 |
| AC-M8-04 | 失败重试/退避/限流/熔断：retryable 重试、permanent 不重试、429 尊重 `Retry-After`、熔断开合 | PRD §13.1-2；M3 C5 | `talent-external-adapter` 传输层 | 单测：超时/连接/5xx/429 可重试，401/403 中止，0/4xx 不重试；退避 1s→4s→16s；429 Retry-After；5xx 重试、超时耗尽、401 快失败、熔断打开/半开、令牌桶限流、404 空结果 | 通过（单测级） |
| AC-M8-05 | 同步日志：`trigger/status/scope/counts/details` 可查；无 PII | PRD §10.3；M3 §3.3 | 复用 `talent_sync_logs` | live：`GET /api/admin/talent/reports/sync-logs` 200（本页 3,963 字节，扫描 0 明文 PII）；单测覆盖 details/映射；**三类 trigger 全量写入未实测** | 未验证（接口可查、trigger 未全测） |
| AC-M8-06 | 建议周期/新版本：到期窗口才接收；重复版本 409→noop；旧版归档；C 端切新版 | BR-07；M5 §4 | 定时检查 + 复用 M5 receive | **调度未接入/未实测**（`server/plugins` 仅有会员查询扫描，无建议周期任务）；版本接收逻辑由 M5 单测覆盖 | 未验证（scheduler 缺） |
| AC-M8-07 | 建议失败处理：源不可用 503；单条失败不阻断；旧版保持生效 | M5 §9；PRD §13.1-2 | external 源 + 编排错误处理 | 单测：源失败分类与 fail-fast；**编排级 partial/旧版保持生效未实测** | 未验证（单测部分） |
| AC-M8-08 | PDF 六册来源：只读快照；改 M1 配置后 PDF 字节不变；未开放册不可渲染 | BR-03/BR-04；M3 §3.2；M7 §6.5 | `talent-pdf-document` 只读快照 | 单测：同一快照字节稳定（渲染测试）、contentHash 只随本册内容/身份/模板/字体变化、未开放册 `VOLUME_NOT_FOUND`、空册/快照缺失 `PDF_NOT_READY`、文件名不含姓名/证件 | 通过（单测级） |
| AC-M8-09 | 水印：每页含家长姓名/手机尾号/报告编号/生成日期；不含证件全号 | PRD §10.4；M7 D7 | 水印层 | 单测：水印策略四段、关闭手机尾号后省略该段且身份哈希变化、每页水印文本（渲染测试）、文件名无 PII；**真机/字体视觉未验证** | 通过（单测级） |
| AC-M8-10 | 时效 ticket/代理：无直链；120s 过期；撤回/越权后 ticket 也不可用 | PRD §10.4；M7 §6.5 | ticket 模块 + 代理门禁 | live（演示报告 `b0bfl8us6s3z9mq` / V1）：Bearer 200 `%PDF-` 67,804B；ticket 200；跨册 ticket 403；篡改 403；无凭据 401；**125s 后 410 `PDF_TICKET_EXPIRED`**；URL 为同源相对路径（无 `oss.`/存储直链）；单测覆盖一次性 ticket 重放 410；**撤回后持有效 ticket 409 未实测** | 通过（live + 单测；撤回后未验证） |
| AC-M8-11 | 下载留痕：成功/拒绝/渲染失败均记录；无明文 PII/完整 IP | PRD §10.3；M7 §6.5 | `talent_pdf_downloads` + 代理钩子 | 单测：写 `talent_pdf_downloads`（`ipHash` 摘要、`uaFamily` 枚举、无明文 IP/UA/姓名）；live 实际下载发生（审计链路由代码保证）；**在线直查留痕表与保留期清理未验证** | 通过（单测 + live 下载；清理未验证） |
| AC-M8-12 | 私有存储：PB uploads 不可公开读；OSS 对象 private + 加密；代理可读 | PRD §10.4；QUALITY 发布清单 | 存储模块 + `purpose` + OSS `putACL` | **OSS 沙箱缺失未验证**；PB 模式匿名/普通用户直读未单独验证；代理可读已由 live 下载证明 | 未验证（OSS/PB 直读未验证） |
| AC-M8-13 | 发布/撤回/恢复/补发联动：撤回 409；恢复同字节；补发旧册缓存命中、新册新产物 | BR-03/BR-05/BR-10；AC-ADM-06-2/3/4 | 代理门禁 + contentHash 缓存 | 单测覆盖门禁码与缓存；**写操作联动（撤回/恢复/补发/重算）未实测**（本轮不写演示库）；二次下载字节一致（缓存命中行为）已实测 | 未验证 |
| AC-M8-14 | 未发布/未开放/越权：404/409 与 M7 一致；不泄露存在性 | PRD §10.5；M7 §10.4 | 复用 M7/M3 守卫 | 单测：pending→409 `report_pending`、retracted→409 `report_retracted`、非本人/解绑→404、未开放→404；live：无 token 401、C 端跨对象报告 404、不存在报告 404 | 通过（单测 + 只读 live） |
| AC-M8-15 | 权限/审计：状态接口按权限裁剪；入站 HMAC；C 端越权 404；无新增菜单/权限码 | PRD §10.1–10.3；M6 §2 | 状态接口 + 入站路由 | live：集成状态超管 200、报告审核员 403、响应无密钥字样；入站无签名/错签名 → 401 `SIGNATURE_INVALID`（fail-closed，无业务写入）；C 端越权 404；现场权限码 35 个、旧码 0 行；**「sync 前后菜单/权限码数量不变」未复验、C 端不接受 `parentId` 未测**；单测覆盖状态接口按权限裁剪 | 未验证（状态/入站/C 端通过；数量不变未复验） |
| AC-M8-16 | 观测/告警：状态接口字段完整；阈值触发告警；冷却生效 | PRD §11；OPERATIONS §10 | 状态接口 + 告警钩子 | 状态接口 live 200 且字段完整（无密钥/URL/PII）；**告警 webhook 未接入，阈值/冷却未演练**；单测覆盖状态字段 | 未验证（告警未演练） |

## 3. PRD / 上游章节映射

| 需求 | PRD / 上游位置 | 本文落点 |
| --- | --- | --- |
| 一键同步全部报告、三类归因、逐人明细 | PRD §6.6 L278；M3 §4.2 | AC-M8-03/05；spec §4.1–§4.6 |
| 增量分册 = 外部已出 − 已发布；补发只追加 | BR-05 L101；M3 §4.3 | AC-M8-03/13；spec §4.2、§6.10 |
| 发布即冻结；配置调整不回写历史 | BR-03 L99；M3 §4.5 | AC-M8-08；spec §6.1/§6.6 |
| 培育建议周期 4 个月；旧版归档；C 端只展示生效版 | BR-07 L103；M5 §4.1 | AC-M8-06；spec §5.1–§5.2 |
| 建议与报告同发（派生可见性） | BR-06 L102；M5 §4.5 | AC-M8-13；spec §5.4 |
| 外部同步即默认已发布；正文只同步不改写 | PRD §6.7 L315；M5 ADR D3 | AC-M8-06；spec §5.4 |
| 报告撤回 C 端口径：分册/下载/建议均不可见 | BR-10 L106；M7 §10.4 | AC-M8-13/14；spec §6.10–§6.11 |
| PDF 不暴露直链，走签名/代理，带时效与水印 | PRD §10.4 L586；§13.1-3 L640 | AC-M8-09/10/12；spec §6.4–§6.8 |
| 下载留痕；日志可检索；无 PII | PRD §10.3 L585；§11 L600 | AC-M8-05/11；spec §6.9、§8.5 |
| 真实第三方接口、同步幂等键、失败重试与告警 | PRD §13.1-2 L639 | AC-M8-01/02/04/05/07/16；spec §3、§4、§5 |
| 单实例单 PB；不回填 users/configs/site_config | AGENTS.md；CONVENTIONS §1/§6 | AC-M8-01/15；spec §1.3、§9 |
| 新增外部源/PDF 涉及上传与权限 → 质量门禁升级 | QUALITY L12/L80–81 | §4 证据表（新库/OSS/安全直连） |

## 4. 补充验收（口径见 spec §3–§9 与 ADR 0008）

### 4.1 自动化命令

| # | 命令 | 期望 | 实际输出 / 退出码 | 证据位置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| E-M8-01 | `pnpm vitest run test/talent-external-adapter.test.ts` | 全绿；覆盖签名/时间窗/错误分类/映射/缺配置 503 | **32 passed**（与 PDF 用例合并运行：`2 passed files / 51 passed / 1 skipped`，exit 0） | `/tmp/tj-m9-verify/vitest-m8.log` | 通过 |
| E-M8-02 | `pnpm vitest run test/talent-external-sync.test.ts` | 全绿；覆盖触发/锁/退避/熔断/告警/日志/重放 | **文件不存在**（spec 规划文件未拆分；相关内容并入 adapter 用例） | `test/` 列表 | 未验证（文件未实施） |
| E-M8-03 | `pnpm vitest run test/talent-pdf-domain.test.ts` | 全绿；覆盖文档模型/分页/水印/hash 决定性/保留策略 | **文件不存在**（并入 `test/talent-report-pdf.test.ts`：20 用例/1 skip，覆盖文档模型/水印/hash/门禁/ticket/留痕） | `vitest-m8.log` | 未验证（文件未实施） |
| E-M8-04 | `pnpm vitest run test/talent-pdf-api.test.ts` | 全绿；覆盖路由/ticket/门禁码/响应头/无直链/留痕 | **文件不存在**；路由/ticket 改由 live 抽检（E-M8-22）与 `talent-report-pdf.test.ts` 覆盖 | 同上 | 未验证（文件未实施） |
| E-M8-05 | `pnpm vitest run test/talent-integration-status.test.ts` | 全绿；覆盖权限裁剪/字段脱敏 | **文件不存在**；状态接口权限裁剪由 adapter 用例 + live 403 覆盖 | 同上 | 未验证（文件未实施） |
| E-M8-06 | `pnpm typecheck` | 退出码 0 | exit 0（仅 WARN `Duplicated imports isTalentMemberUniqueError`） | `/tmp/tj-m9-verify/typecheck.log` | 通过 |
| E-M8-07 | `pnpm lint` | 退出码 0 | **exit 1**：`scripts/e2e/04-client.mjs:7 'ACCOUNTS' is defined but never used` | `/tmp/tj-m9-verify/lint.log` | 未通过 |

> 说明：spec §11 规划的 5 个 M8 测试文件实际收敛为 2 个；覆盖内容基本齐备，但「文件级可追溯」与 M8 spec 不一致，登记为文档/覆盖口径偏差（M9-D03 同源）。

### 4.2 契约测试（提供方沙箱，条件执行）

| # | 步骤 / 命令 | 期望 | 实际输出 / 退出码 | 证据位置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| E-M8-08 | `TALENT_CONTRACT_BASE_URL=… TALENT_CONTRACT_APP_ID=… TALENT_CONTRACT_API_SECRET=… pnpm vitest run test/talent-integration-contract.test.ts` | 三接口真实请求映射正确、签名被接受、found/empty/错误码符合 spec §3 | **未执行**：无测试文件、无沙箱凭据（spec §15 C1） | — | 未验证（缺沙箱） |
| E-M8-09 | fixture 回放（无凭据 CI） | 适配层回归通过 | 以 `test/talent-external-adapter.test.ts` 32 用例替代（fake transport / 固定签名向量） | `vitest-m8.log` | 通过（fixture 级） |

### 4.3 新库、存储与安全

| # | 步骤 / 命令 | 期望 | 实际输出 / 退出码 | 证据位置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| E-M8-10 | `export POCKETBASE_DATA_DIR="$(mktemp -d /tmp/tongjia-m8-XXXXXX)" && pnpm env:doctor && pnpm env:setup` | 新库成功；`talent_report_pdfs`/`talent_pdf_downloads` 字段与索引齐全；旧集合仍在 | **本轮未起新库**（避免与演示库端口冲突）；引用 M6-B 新库 8103 证据（34 集合，含两个 PDF 集合） | [M6-B](../M6-cleanup/m6b-implementation.md) §6 | 未验证（引用 M6-B） |
| E-M8-11 | `pnpm talent:sync`（连续两次） | 只加不删；索引/菜单/权限码不重复；旧 PDF 字段/旧集合结构不变 | 本轮未重跑 sync；E2E 06 现场断言旧菜单/旧码 0 行、talent 在册码 35；M6-B 记录 8103 sync×2 幂等 | `security.json`、M6-B | 未验证（未重跑；现场断言通过） |
| E-M8-12 | OSS 沙箱上传 + `getACL` + 未签名 GET + 代理读取 | ACL=private；未签名 403；签名 60s 过期；代理可解密返回 PDF | **未执行**：无 OSS 测试 bucket/密钥 | — | 未验证（缺沙箱） |
| E-M8-13 | PB 模式（`OSS_ENABLED=false`） | `uploads` purpose 正确；匿名/普通用户 list/view 被拒；admin 代理可读 | live 代理可读已证（200 `%PDF-`）；**匿名/普通用户直读 `uploads` 未验证** | `pdf-ticket.json` | 未验证（直读未验证） |
| E-M8-14 | 存储对象头部与解密 | 非 `%PDF` 明文头；正确 key 解密为合法 PDF；错 key 不返回内容 | **未直接检查存储对象**（需 PB/OSS 侧凭据；不读 `.env`）；单测覆盖文件头/加解密与文件名 | `talent-report-pdf.test.ts` | 未验证（单测级） |
| E-M8-15 | API 安全直连 | 无 token 401；无权限状态接口 403；入站无签名 401；错误签名不写业务集合 | live：无 token 401；报告审核员状态接口 403；入站无签名/错签名 → 401 `SIGNATURE_INVALID`（拒绝于路由入口，未写业务） | `security.json`、入站 curl | 通过 |
| E-M8-16 | 响应/日志 PII 扫描 | 新增响应与 `talent_sync_logs`/`talent_pdf_downloads` 无 18 位/11 位明文、无存储直链、无 ticket/密钥 | live：sync-logs 20 行、集成状态响应扫描 0 明文/0 密钥/0 存储直链；`talent_pdf_downloads` 未直查 | `security.json` | 通过（可访问部分） |

### 4.4 手工烟测（真实 PB + Nuxt）

| # | 步骤 | 期望 | 实际结果 | 证据位置 | 状态 |
| --- | --- | --- | --- | --- | --- |
| E-M8-17 | Mock 全链路：种子数据 → C 端下载 V1 PDF | 六册可读册可下载；水印/页脚/文件名/响应头正确；二次下载 `cacheHit=true` | 演示报告（已发布，V1/V2 readable）Bearer 下载 200 `application/pdf` 67,804 字节 `%PDF-`；二次下载字节一致；水印/文件名由单测覆盖 | `pdf-ticket.json`、`vitest-m8.log` | 通过（下载链路；水印视觉未验证） |
| E-M8-18 | 切换 external（沙箱）→ M3 一键同步 | 预演/确认正常；同步日志 `trigger=manual`；重复同步无重复行 | 未执行（缺沙箱） | — | 未验证 |
| E-M8-19 | 外部源缺配置 → 手动同步/状态接口 | 503 `EXTERNAL_SOURCE_UNAVAILABLE`；无业务写入；告警/错误日志 | 未做外部源实配演练；单测覆盖三源 503 与不静默降级 | `vitest-m8.log` | 未验证 |
| E-M8-20 | 建议到期窗口触发 → 新版生效 | 新版本 active、旧版 archived、C 端读模型切换；同月重复触发 noop | 未执行（无调度） | — | 未验证 |
| E-M8-21 | 撤回 → 恢复 → 补发 → 重算 逐动作下载 | 撤回 409；恢复同字节；补发旧册缓存命中/新册新产物；重算相关册新 hash | 未执行（写操作会改演示库既有数据，本轮不写） | — | 未验证 |
| E-M8-22 | H5 ticket：正常/过期/篡改/撤回后使用 | 正常下载；410/403；撤回后 409；无直链 | live 5/5：正常 200；跨册 403；篡改 403；无凭据 401；125s 过期 410 `PDF_TICKET_EXPIRED`；撤回后 409 未测 | `pdf-ticket.json` | 通过（撤回后未验证） |
| E-M8-23 | 越权/未登录/停用/解绑 | 401/403/404 与 M7 一致；无存在性泄露 | live：未登录 401；C 端跨对象/不存在报告 404；停用/解绑未验证（单测覆盖 parent 不匹配 404） | `security.json`、`vitest-m8.log` | 未验证（部分） |
| E-M8-24 | 入站签名：正确/错误/时间偏移/重放/超限 | 200/401/409/429；错误不写业务数据；`error_logs` 摘要 | live：无签名/错误签名均 401 `SIGNATURE_INVALID`（当前未配置入站密钥，fail-closed）；正确签名 200 需配置密钥，未验证；单测覆盖 401/409/413/429 与正文拒绝 | 入站 curl、`vitest-m8.log` | 未验证（错误签名通过；正确签名未验证） |
| E-M8-25 | 生产配置演练（staging）：mock 启动 / 缺密钥 / PDF 关闭 | 前两者启动失败；`TALENT_PDF_ENABLED=0` → C 端 404 `PDF_NOT_READY` | 未执行（无 staging） | — | 未验证 |
| E-M8-26 | 回滚演练：关 PDF → 关调度 → 切源/关入站 | 每步验证 C 端 PDF/同步日志/health 符合 spec §14 | 未执行 | — | 未验证 |
| E-M8-27 | 告警演练：mock webhook 接收 | 规则命中一次、冷却内不重复、载荷无 PII | 未执行（无 webhook） | — | 未验证 |

### 4.5 文档与仓库卫生

| # | 检查 | 期望 | 实际 | 状态 |
| --- | --- | --- | --- | --- |
| E-M8-28 | `git diff --check` | 无空白错误；本任务只改 `docs/specs/M9-quality/acceptance.md` 与 `docs/specs/M8-external/acceptance.md` | exit 0；本任务改动仅两个 acceptance | 通过 |
| E-M8-29 | Markdown 链接可解析 | 规格/ADR/验收互链与 PRD/上游链接可打开 | 关键链接目标（spec/ADR/M2/M3/M5/M7/QUALITY/OPERATIONS）均存在 | 通过 |
| E-M8-30 | 示例数据 | 文档示例均为虚构（陈示例/13800000001/110101201609081234） | 未新增真实 PII；证据只记 id/字节数/状态码 | 通过 |

## 5. 未验证 / 阻塞记录

```
- 条目：E-M8-08 / AC-M8-01/02（提供方契约沙箱）
- 状态：未验证
- 阻塞原因：提供方未提供沙箱地址与凭据（spec §15 C1）
- 已做替代验证：test/talent-external-adapter.test.ts 32 用例（签名向量/重试/熔断/三源映射/fail-fast）
- 需谁解除：lead / 客户 / 提供方
- 解除后复验命令：TALENT_CONTRACT_* pnpm vitest run test/talent-integration-contract.test.ts

- 条目：AC-M8-06/20（建议周期调度）
- 状态：未验证
- 阻塞原因：调度未接入（`server/plugins` 无建议周期任务）；`TALENT_ADVICE_SCHEDULE*` 未配置
- 已做替代验证：M5 版本接收单测 + M8 适配层映射单测
- 需谁解除：M8 实现任务；lead 排期
- 解除后复验：隔离实例触发到期窗口 → 新版 active / 旧版 archived / 重复 409 noop

- 条目：AC-M8-12 / E-M8-12（OSS 私有存储）
- 状态：未验证
- 阻塞原因：无 OSS 测试 bucket/密钥；本轮不读 `.env`
- 已做替代验证：PB 模式代理下载 live 200 %PDF；存储加解密单测
- 需谁解除：运维提供 OSS 沙箱
- 解除后复验：E-M8-12 全步骤

- 条目：AC-M8-02/09（字体资产）——**已解除（2026-11-17 lead 入库 Noto Sans SC + OFL，PDF 测试通过）**
- 状态：未验证（部署可移植性）
- 原阻塞原因：`server/assets/fonts/` 未入库；2026-11-17 已入库 Noto Sans SC 与 OFL 许可，字体版本参与 contentHash。
- 已做替代验证：本机 PDF 生成 67,804 字节 + 水印单测
- 需谁解除：M8 实现（字体 OFL 许可入库）
- 解除后复验：干净构建机生成 PDF + 文本抽取水印

- 条目：AC-M8-13/21（撤回/恢复/补发联动）、AC-M8-16/27（告警）
- 状态：未验证
- 阻塞原因：需写演示库或隔离实例；告警 webhook 未接入
- 已做替代验证：PDF 门禁/缓存单测；集成状态接口 live 200
- 需谁解除：M9 隔离实例 + 运维 webhook
- 解除后复验：E-M8-21 / E-M8-27
```

## 6. 验收判定

- **通过**：AC-M8-01..16 全部有证据；E-M8-01..07 全绿；E-M8-10/11/15/16 通过；E-M8-12/13/14 至少一种存储模式有证据；E-M8-17..27 有手工记录（提供方沙箱/OSS 缺失的子项除外）。
  → **本轮不满足**：AC 通过 6 / 未验证 10；E-M8-02/03/04/05 文件未实施、E-M8-07 lint 未通过；E-M8-12 无存储模式证据；E-M8-18..21/25..27 未执行。
- **未通过**：任一 P0 失败——外部源静默降级 Mock、PDF/OSS 直链泄露、明文 PII 落库/日志、撤回后仍可下载、OSS 公开读、ticket 绕过门禁。
  → **本轮未发现已证实 P0 失败**：ticket 过期/篡改/跨册/无凭据均拒绝；响应与同步日志无明文 PII；无存储直链。
- **未验证**：提供方沙箱/OSS/告警/调度/字体资产缺失导致 E-M8-08/12/18..21/25..27 与 AC-M8-01/02/06/07/12/13/16 无法执行；已写阻塞原因（§5），**不得标通过**。
- **不在范围**：M3/M5/M7 内部规则、M9 性能/e2e/视觉、打包下载、B 端集成配置页、旧模型清理。
- **待裁决**：spec §15 C1/C3/C4/C5/C8/C9 影响验收口径的条目，裁决后回写本文与 spec 并重跑相关项。

**本轮结论：M8 未达到「通过」条件；无已证实 P0 失败；判定 `未验证`（阻塞项见 §5）。** 已完成取证：外部适配器/传输层单测（32 用例）、PDF 文档/水印/门禁/ticket/留痕单测（20 用例）、真实 PDF 下载与 ticket 全生命周期（200/403/401/410）、入站 fail-closed、集成状态权限裁剪。未完成：真实提供方联调、OSS、调度、撤回/恢复/补发联动、告警、字体资产、B 端预览。

## 7. 回填记录

- 2026-11-17（verifier-m9 / task-44）：执行 `pnpm vitest run test/talent-report-pdf.test.ts test/talent-external-adapter.test.ts`（52 用例，51 passed / 1 skipped，exit 0）、`pnpm typecheck`（0）、`pnpm lint`（1，见 E-M8-07）；演示报告真实 PDF 下载与 ticket 过期/篡改/跨册/无凭据（5/5）；入站无签名/错签名 401；集成状态接口超管 200/审核员 403。回填 §2 状态（通过 6 / 未验证 10）、§4 证据、§5 阻塞与 §6 判定。

> 2026-11-17 lead 补充：`server/assets/fonts/NotoSansSC-Regular.otf` + `OFL.txt` 已入库，`talent-report-pdf.test.ts` 19 passed / 1 skipped；外部供应商/OSS/调度/真机仍未验证，M8 总判定不变。

> 2026-11-17 lead 补充（客户真实包）：6 份 Word 已转 PDF 并写入 `talent_report_source_pdfs`；C 端 `/pdf` 优先返回原版 PDF（实测 A 篇 588,684B、`%PDF-`）。客户原版包导入脚本：`scripts/import/`。原版 PDF 仍走 PB 私有存储，不依赖 OSS；真实供应商接口/OSS 联调仍未验证。
