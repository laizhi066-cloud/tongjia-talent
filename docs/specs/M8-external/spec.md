# M8 外部接口与 PDF · 规格

| 项 | 内容 |
| --- | --- |
| 文档版本 | v1.0（2026-11-17） |
| 状态 | 待评审（architect-m8 / task-26；待 lead 复核后进入实现） |
| 需求基准 | [PRD v1.1](../../天赋正式开发交接包/同佳天赋专项PRD-2026-11-16.md)：§6.6（L258–300）、§6.7（L301–322）、§7.4（L363–369）、§9（L539–578）、§10（L581–589）、§11（L591–602）、§12（L604–630）、§13.1（L636–643） |
| 上游冻结契约 | [M3 报告域](../M3-reports/spec.md) §3.1–§3.3 / §7 / §8.4 / §9；[M5 培育建议](../M5-advice/spec.md) §3 / §4 / §7 / §9；[M7 C 端](../M7-c-end/spec.md) §6.5 / §10.5；[M2 会员域](../M2-members/spec.md) §5.6 |
| 关联决策 | [ADR 0003](../../adr/0003-m3-report-domain.md)、[ADR 0005](../../adr/0005-m5-advice-domain.md)、[ADR 0007](../../adr/0007-m7-client-portal.md)、[ADR 0008](../../adr/0008-m8-integration-pdf.md) |
| 影响范围（实现时） | `server/utils/talent-external-*.ts`、`server/utils/talent-pdf-*.ts`、`server/api/integrations/talent/**`、`server/api/client/talent/reports/**`（M7 路由的 M8 seam）、`server/api/admin/talent/integrations/**`、`server/plugins/{env-check,talent-integration-scheduler}.ts`、`scripts/{setup,sync-talent}.mjs`、`shared/types/talent-*.ts`、`test/talent-*m8*.test.ts`、`test/talent-pdf-*.test.ts`、`.env.example` |
| 本任务边界 | **只写文档**：`docs/specs/M8-external/` 与 `docs/adr/`；不写代码、不 commit、不改 `.env.example`（由实现任务落） |

> 阅读方式：§0 是已冻结决策；§1 定边界；§3 是**提供方接口合同**（外部系统必须满足）；§4/§5 是 M8 在 M3/M5 之上补的同步编排；§6 是 PDF 全链路；§7/§8/§9 是可实现合同。验收证据见 [acceptance.md](acceptance.md)。

---

## 0. 决策基线（ADR 0008 摘要，不再作为未决项）

| # | 决策 | 一句话 |
| --- | --- | --- |
| D1 | 适配器接口与切换开关 | 三个 M2/M3/M5 冻结接口**不改签名**；M8 新增共享传输层 + 三个 `external` 实现；环境变量切换、缺配置即 503、生产 Mock 启动失败 |
| D2 | 拉取为主 + 签名触发 | 定时/手动**出站拉取**；入站 webhook 只做「签名触发拉取」与 M2 查询回执，不接收报告/建议正文；重试走「本次退避 + 下轮全量候选」 |
| D3 | PDF 渲染 | `pdf-lib` + `fontkit` 按快照程序化排版；不引入 headless Chromium；字体按需下载（`pnpm fonts:fetch`，不入库） |
| D4 | 水印与时效 | 每页平铺水印（家长姓名 + 手机尾号 + 报告编号 + 生成日期）；H5 用 120s 签名 ticket，小程序用 Bearer 代理；**不下发 OSS/PB 直链** |
| D5 | 存储 | 默认 PocketBase 私有 `uploads(purpose=talent-report-pdf)`，可选 OSS 私有对象；两端都加密存储；新增 `talent_report_pdfs` 元数据集合按内容哈希缓存 |
| D6 | 告警与观测 | 同步日志 + 错误日志 + 通用告警 webhook；阈值/冷却集中配置；**不引入 APM/短信/邮件新依赖** |
| D7 | 回滚 | 三个独立 kill switch（源 / 调度 / PDF）；回滚到 Mock 或 M7 的 `404 PDF_NOT_READY`；新增集合只增不删，不做数据回滚 |

---

## 1. 范围与不在范围

### 1.1 本里程碑交付

| 类别 | 交付物 |
| --- | --- |
| 外部传输层 | 统一 HTTP 客户端：HMAC 签名、时间窗/重放防护、超时、限流、重试退避、错误分类、脱敏日志（`server/utils/talent-external-client.ts`） |
| 真实源（3 个） | `TalentGeneQuerySource` 的 `external` 实现（M2）、`TalentGeneReportSource` 的 `external` 实现（M3）、`TalentAdviceSource` 的 `external` 实现（M5）；Mock 源与调用方不变 |
| 同步编排 | 定时拉取（基因报告、查询超时兜底、建议周期）、手动触发保留、入站签名触发、运行锁、逐人失败隔离、同步日志、熔断、告警 |
| PDF | 六册 PDF 渲染（快照来源）、分页/字体/水印、内容哈希缓存、PB/OSS 私有存储与加密、权限代理、120s 下载 ticket、下载留痕、发布/撤回/恢复/补发联动、未发布/未开放 404 口径 |
| 数据 | 新增 `talent_report_pdfs`（产物元数据）、`talent_pdf_downloads`（下载留痕）；索引与初始化脚本；不新增字段到 `users` / `configs` / `site_config` |
| API | C 端 PDF 代理与 ticket；管理端集成状态；入站签名触发与 M2 查询回执 |
| 配置与运维 | `.env.example` 键、`env-check` 规则、启停开关、告警阈值、回滚 runbook 条目 |
| 验收 | AC-M8-01..16、测试命令、契约测试、新库烟测、OSS 沙箱、手工烟测（见 [acceptance.md](acceptance.md)） |

### 1.2 不在范围（M8 不做，避免越界）

| 项 | 归属 | 说明 |
| --- | --- | --- |
| 报告集合/快照/状态机/增量分册计算/同步预演与提交的领域规则 | M3 | M8 **只提供** `TalentGeneReportSource` 的 `external` 实现并调用 M3 的 `previewTalentReportSync` / `commitTalentReportSync`；不改快照结构、不改状态机、不重算方向 |
| 建议版本/建议书/sections/发布撤回/可见性派生 | M5 | M8 **只提供** `TalentAdviceSource` 的 `external` 实现并调用 M5 `receiveTalentAdviceVersion`；不改版本规则、不改正文、不做可见性双写 |
| 会员/子女查询状态机、回执落库守卫、超时扫描规则 | M2 | M8 只实现 `TalentGeneQuerySource` 的 `external` 实现与回执 HTTP 入口；`applyTalentGeneQueryReceipt` 的丢弃规则归 M2 |
| C 端页面、下载按钮交互、H5/小程序打开方式、对象切换 | M7 | M7 已有 `GET .../volumes/:volumeId/pdf` 路由与交互；M8 在 seam 内返回真实文件；新增 ticket 只供 H5 新窗口使用，页面交互不变 |
| 六册打包下载（PRD §9 的整份 `/reports/:id/download`） | 后续任务 | M7 §6.5 已按「按分册」定稿；M8 不做打包，可另立任务 |
| B 端同步配置页/集成管理页 | M6 / 后续 | M8 **不新增后台配置页**、不写 `configs`；配置只走环境变量；旧「同步配置」页由 M6 删除 |
| 旧报告模型（`talent_report_receipts` / `pdfUrl` / 旧 PDF 上传接口） | M3 / M6 | M8 不复用旧 `pdfUrl`/`pdfFileKey`/`pdfFileName` 语义；旧集合与旧路由保留到 M6，M8 新代码不读写 |
| 多实例/分布式锁/外部队列 | 单实例边界 | 定时与渲染假设单进程（OPERATIONS §0）；扩容前置改造另立任务 |
| 1000 条列表性能、e2e 重写、全量视觉验收 | M9 | M8 只保证索引、单册按需渲染与缓存命中；e2e 归 M9 |
| 客户真实接口文档未定稿部分的字段名 | 客户 / 提供方 | 以 §3 的「我们要求的合同」为准；对方字段差异只在适配层映射，见 §15 C1 |

### 1.3 硬约束

- 单实例、单 PocketBase：只通过 `getAdminPB()` 连接唯一 PB；不新增第二个 PB、`TENANT_MODE`、`site` cookie、`X-Site-Slug` 或按请求切库。
- 天赋业务字段只落 `talent_*`；**不回填** `users` / `configs` / `site_config`；M8 外部源配置**不写** `configs`，只读环境变量。
- PDF 与对象存储**一律私有**：PB `uploads` 用 `purpose=talent-report-pdf` 且 `listRule/viewRule` 拒绝；OSS 对象逐对象 `private`；下发地址只能是 Nitro 代理，禁止把 OSS/PB 直链返回浏览器。
- 身份证明文/手机号明文**只在内存**：外部请求体可含明文（TLS 传输），但集合、日志、URL、ticket、文件名、告警、响应一律不落明文；日志只写 `reportNo` / `subjectId` / 脱敏值。
- 示例与测试数据一律虚构（如 `陈示例`、`13800000001`、`110101201609081234`、`GR202611160001`），不得出现真实 PII。
- 不修改 M3/M5/M7 已冻结的响应结构与错误码；M8 只做**新增**（ticket、状态、下载留痕、外部实现）。
- 文档任务本身不改代码、不 commit；`scripts/setup.mjs` 只用于空数据目录，存量库只走 `scripts/sync-talent.mjs`（只加不删）。

---

## 2. 对接拓扑与总体流程

### 2.1 三个外部源与冻结接口

| 域 | 冻结接口（上游） | 当前文件（只读参考） | M8 交付 | 调用方（不改） |
| --- | --- | --- | --- | --- |
| 会员查询（M2） | `TalentGeneQuerySource`（M2 §5.6） | `server/utils/talent-member-query.ts` | `external` 实现：提交查询 + HTTP 回执 | `submitTalentChildQuery`、M2 查询页/接口 |
| 基因报告（M3） | `TalentGeneReportSource`（M3 §9） | `server/utils/talent-report-source.ts` | `external` 实现：按对象拉取报告元数据与篇目 | `previewTalentReportSync` / `commitTalentReportSync`、M3 一键同步 |
| 培育建议（M5） | `TalentAdviceSource`（M5 §9） | `server/utils/talent-advice-source.ts` | `external` 实现：按姓名 + 周岁匹配建议正文 | `receiveTalentAdviceVersion`、M5 接收新一版 |

- 三个接口的签名、返回结构、Mock 语义**不改**；`createTalentGeneQuerySource` / `createTalentGeneReportSource` / `createTalentAdviceSource` 的工厂函数仍是唯一切换点。
- 当前 M2 工厂忽略环境变量、恒返回 Mock（`talent-member-query.ts` L485–494）；M8 必须补 `external` 分支，且行为与 M3/M5 对齐（缺配置 503，不静默降级）。

### 2.2 运行时拓扑（单实例）

```
外部基因检测机构 / 外部培育建议系统
        ▲  出站：HMAC 签名的 POST 查询（TLS）
        │  入站：签名触发 / M2 查询回执（HMAC，可选）
        │
┌───────┴────────────────────────────── Nuxt Nitro（单进程）──────────────────────────────┐
│ talent-integration-scheduler（进程内定时器，单实例）                                     │
│   ├─ gene query timeout sweep（M2，兜底）                                                │
│   ├─ gene report sync（M3：commit，全量候选）                                             │
│   └─ advice cycle sync（M5：receiveTalentAdviceVersion）                                  │
│ talent-external-client（签名/重试/限流/熔断/告警）                                         │
│ talent-report-source(external) / talent-advice-source(external) / talent-member-query(external) │
│ PDF：talent-pdf-document → render → store（PB 私有 / OSS 私有）→ ticket/代理            │
└──────────────────────────────┬───────────────────────────────────────────────────────────┘
                               │ getAdminPB()
                       唯一 PocketBase（SQLite + uploads）
```

### 2.3 触发与调度矩阵

| 触发 | 入口 | 作用域 | 锁 | 幂等/去重 |
| --- | --- | --- | --- | --- |
| 定时-基因报告 | 进程内 `setInterval`（默认 6h，可配） | `commitTalentReportSync`（全量候选） | `withTalentReportLock("talent-external-sync")` | 候选 + 唯一键；重跑只刷新 |
| 手动-基因报告 | M3 `POST /admin/talent/reports/sync`（保留） | 同上，`trigger=manual` | 同上 | M3 已实现（preview/commit 幂等） |
| 入站-基因报告 | `POST /api/integrations/talent/gene-reports/sync`（签名） | 异步触发同一定时任务 | 同上；运行中返回 202 `deduped` | `eventId` 仅日志留痕；拉取幂等 |
| 定时-建议 | 进程内 `setInterval`（默认每日检查，命中周期窗口才接收） | M5 `receiveTalentAdviceVersion` | `withTalentReportLock("advice:version")` | 版本号唯一 + `(versionId,geneReportId)` 唯一 |
| 手动-建议 | M5 `POST /admin/talent/advice/versions`（保留） | 同上 | 同上 | M5 已实现（重复 409） |
| 入站-建议 | `POST /api/integrations/talent/advice/sync`（签名） | 同定时任务 | 同上 | 触发幂等；拉取幂等 |
| 入站-M2 回执 | `POST /api/integrations/talent/gene-query/receipts`（签名） | `applyTalentGeneQueryReceipt` | 无（M2 幂等键） | `${childId}:${seq}` 旧/重复回执丢弃 |
| C 端下载 | `GET .../volumes/:volumeId/pdf` + ticket | 单分册按需渲染 | 进程内渲染并发闸 | 内容哈希缓存；重复下载命中缓存 |

- 定时器只在 `NODE_ENV` 非 test 且对应 `*_SYNC_ENABLED=1` 时注册；进程重启后按配置重建，**不补跑**（下一轮全量候选会自然补齐）。单实例是硬前提：多实例会重复同步/重复渲染，见 OPERATIONS §0。

### 2.4 与旧同步的关系

- 旧第三方结果同步（`server/utils/talent-external-sync.ts`、`server/utils/talent-sync-scheduler.ts`、`configs.talent_sync_config`、`POST /api/integrations/talent/reports`）服务旧报告模型，**保留到 M6**；M8 不扩展、不读取、不写入该配置。
- M8 新增 `server/plugins/talent-integration-scheduler.ts` 独立于旧 `server/plugins/talent-report-sync.ts`；两者可同时存在到 M6，互不共享锁与配置。
- M3 的「一键同步全部报告」仍可用；`external` 源切换后它走真实接口，预演/确认语义不变。

---

## 3. 外部接口契约（提供方必须满足）

> 本节是 M8 对**外部系统**的接口要求。对方实际字段名可不同，但语义、鉴权、幂等、错误分类必须可映射；映射集中在一个适配文件，不散落到业务层（§15 C1）。

### 3.1 通用传输约定

| 项 | 要求 |
| --- | --- |
| 协议 | 仅 HTTPS（`https://`）；本地开发可对 `127.0.0.1`/`localhost` 放开 HTTP；禁止明文公网 |
| 方法/编码 | 全部 `POST` + `application/json; charset=utf-8`；不使用 GET 携带 PII |
| 超时 | 连接 5s、读取 15s（`TALENT_EXTERNAL_TIMEOUT_MS`，默认 15000） |
| 体积 | 请求 ≤ 64KB；响应 ≤ 5MB；单对象 `sections` ≤ 1000 条（M3 校验）；建议分册 `sections` ≤ 200 条 / 256KB（M5 校验） |
| 字符集 | UTF-8；不允许 BOM；字符串按原样保存，不做 HTML 转义（展示层负责） |
| 时钟 | UTC ISO 8601（`Z`）；业务日期 `YYYY-MM-DD`；年龄按周岁整数 |
| 请求追踪 | 每个出站请求带 `X-Talent-Request-Id`（`req_` + 16 位随机）；响应原样回传，用于对账 |
| 连接复用 | 进程内复用 agent；不因单次失败重建客户端 |

### 3.2 鉴权与签名（出站 = 我们调用对方）

**请求头**

| Header | 必填 | 说明 |
| --- | --- | --- |
| `X-Talent-App-Id` | 是 | 我方应用标识（`TALENT_EXTERNAL_APP_ID`） |
| `X-Talent-Timestamp` | 是 | Unix 秒；与对方服务器偏差 ≤ `TALENT_EXTERNAL_CLOCK_SKEW_SECONDS`（默认 300） |
| `X-Talent-Nonce` | 是 | 16–32 位随机串，单次有效 |
| `X-Talent-Signature` | 是 | `v1=<hex(HMAC-SHA256(secret, canonical))>` |
| `X-Talent-Request-Id` | 是 | 幂等/追踪 |
| `Idempotency-Key` | 是 | 见 §3.8；对方 24h 内重复 key 必须返回同一结果 |
| `Content-Type` / `Accept` | 是 | `application/json` |

**canonical string**（固定顺序、`\n` 连接、UTF-8）：

```
v1
{METHOD}
{PATH_WITH_QUERY}        // 不含 host；如 /v1/gene-reports/query
{X-Talent-Timestamp}
{X-Talent-Nonce}
{sha256Hex(rawBody)}     // 空 body 用 sha256("")
```

- 对方校验：时间窗、nonce 未用过（≥10 分钟缓存）、`timingSafeEqual` 比较签名；失败返回 `401`，我们**不重试**并按配置错误告警。
- 密钥 `TALENT_EXTERNAL_API_SECRET` 只存在服务端环境；不进日志、不进响应、不进前端构建变量。密钥轮换支持双密钥窗口：`TALENT_EXTERNAL_API_SECRET_PREVIOUS`（只验旧，最长 7 天）。
- 入站（对方调用我们）使用同一套头与 canonical，但 secret 用 `TALENT_EXTERNAL_WEBHOOK_SECRET`；回执另见 §3.5。

### 3.3 响应信封与错误映射

**成功**

```jsonc
{
  "code": "OK",              // "OK" 或 0；非 OK 为业务失败
  "message": "success",
  "requestId": "req_...",
  "data": { /* 各接口的 data */ }
}
```

**失败**

```jsonc
{ "code": "SUBJECT_NOT_FOUND", "message": "未查询到该对象", "requestId": "req_..." }
```

| HTTP | 对方 code 示例 | 我方归类 | 是否重试 |
| --- | --- | --- | --- |
| 200 且 `data.found=false` | `NO_RESULT` / `INFO_MISMATCH` | `empty(no_result)` / `empty(info_mismatch)` | 否 |
| 200 且结构非法 | — | `failed(schema)` | 否（整批可继续；记录并告警） |
| 400 / 422 | `INVALID_ARGUMENT` | `failed(permanent)` | 否 |
| 401 / 403 | `AUTH_FAILED` | 配置错误：**中止本批**、告警 | 否 |
| 404 | `SUBJECT_NOT_FOUND` | `empty(no_result)`（单对象） | 否 |
| 408 / 429 / 5xx / 超时 / 连接失败 | — | `retryable` | 是（§4.4） |
| 200 但 `code != OK` 且非上述 | — | `failed(business)` | 否（error 摘要脱敏） |

- 响应体不得包含堆栈、SQL、内部路径；我方对该类内容只做截断摘要（≤200 字）并脱敏（身份证/手机号正则替换）。
- `requestId` 必须回传；缺失时用本地生成的 `X-Talent-Request-Id` 兜底。

### 3.4 基因查询提交接口（M2，出站）

`POST {TALENT_GENE_QUERY_BASE_URL}/v1/gene-queries`

**请求**（由 `TalentGeneQueryRequest` 映射）

```jsonc
{
  "requestId": "req_...",
  "childId": "rec_child_1",
  "seq": 7,
  "name": "陈小示",
  "gender": "female",
  "birthday": "2016-09-08",
  "idNo": "110101201609081234",   // 仅 TLS body；不落库、不进日志
  "mobile": "13800000001"         // 仅 TLS body
}
```

**响应**

```jsonc
{ "code": "OK", "data": { "accepted": true, "externalRef": "EXT-2026-0007" } }
```

- `accepted=false` + 明确业务码 → 不进入「查询中」，返回 M2 既有错误（M2 决定）。
- `externalRef` 仅用于回执关联与日志，不落 PII。
- **回执**：对方在结果就绪后调用 §3.5 的入站回执接口；若对方只能轮询，M8 增加 `GET {base}/v1/gene-queries/{externalRef}` 轮询（默认关闭，`TALENT_GENE_QUERY_RECEIPT_MODE=callback|poll`）。
- 幂等键：`${childId}:${seq}`（M2 冻结）；对方重复提交同一 key 必须返回同一 `externalRef`。

### 3.5 查询回执（入站，M2）

`POST /api/integrations/talent/gene-query/receipts`（HMAC，§3.2 入站 secret）

```jsonc
{
  "idempotencyKey": "rec_child_1:7",
  "childId": "rec_child_1",
  "seq": 7,
  "outcome": "found",                 // found | not_found
  "reason": "api_error",              // not_found 时必填，取值按 M2 §4.4
  "externalRef": "EXT-2026-0007",
  "receivedAt": "2026-11-17T05:00:00.000Z"
}
```

- 处理：校验签名/时间窗/体积 → 调 M2 `applyTalentGeneQueryReceipt` → `{ result: "applied" | "discarded" }`，HTTP 200。
- 旧 seq / 未知 childId / 已解绑 / 已停用：M2 返回 `discarded`，M8 记 `talent_sync_logs`（`syncScope="gene_query"`，`trigger=webhook`）与 warning，不返回具体原因（防探测）。
- 重放：同一 `idempotencyKey` 重复到达 → 200 `discarded`，不重复写。
- 对方重试策略：非 2xx 指数退避重试，最多 5 次；我们保证处理幂等。

### 3.6 基因报告查询接口（M3，出站）

`POST {TALENT_GENE_REPORT_BASE_URL}/v1/gene-reports/query`

**请求**（由 `TalentGeneReportSyncSubject` 映射）

```jsonc
{
  "requestId": "req_...",
  "subjectType": "child",
  "subjectId": "rec_child_1",
  "name": "陈小示",
  "gender": "female",
  "birthday": "2016-09-08",
  "age": 10,
  "idNo": "110101201609081234",  // 仅 body
  "mobile": "13800000001",       // 仅 body
  "existingReportNo": "GR202611160001"
}
```

**响应 `data`**（映射到 `TalentGeneReportExternalData`）

```jsonc
{
  "found": true,
  "reportNo": "GR202611160001",
  "issuer": "示例基因检测机构",
  "filedAt": "2026-11-16",
  "sourceVersion": "2026-11-A",
  "books": ["A", "B", "C"],                 // 当前外部**已出**分册；增量分册靠它
  "sections": [
    {
      "bookCode": "A",
      "chapter": "1.1 生长发育概述",
      "factorCode": "A-01",
      "factorName": "运动协调",
      "levelCode": "LV3",
      "score": 78,
      "condition": ""
    }
  ]
}
```

- `books` 必须是**当前已出全量**（不能只回新增册），否则 M3 无法计算「新增分册 = 外部已出 − 已开放」（BR-05）。外部只出 2 册时就回 2 项；后补 D 册时回 A、B、D。
- `found=false` 时必须给 `reason`：`no_result`（无结果）或 `info_mismatch`（信息不一致）。
- `sections[].factorCode` 唯一；`levelCode` 用 M1 口径（`LV1`–`LV4`，未知编码原样冻结、M3 不阻断）；`bookCode` 仅 A–F。
- 报告编号 `reportNo` 由外部提供时优先使用；缺省由 M3 生成（M3 §4.2）；同一对象第二次查询编号保持稳定。
- 外部修订：已发布报告**不追外部修订**（BR-03）；只有未发布/刷新同步更新基因报告原始篇目，M3 保证已发布快照不变（M3 R11）。

### 3.7 培育建议匹配接口（M5，出站）

`POST {TALENT_ADVICE_BASE_URL}/v1/advice/match`

**请求**（由 `TalentAdviceSyncSubject` 映射）

```jsonc
{
  "requestId": "req_...",
  "geneReportId": "rec_gene_1",
  "reportNo": "GR202611160001",
  "subjectType": "child",
  "subjectId": "rec_child_1",
  "name": "陈小示",
  "gender": "female",
  "birthday": "2016-09-08",
  "age": 10,                       // 按 effectiveAt 计算的精确周岁（M5 §4.3）
  "maskedIdNo": "1101**********1234"  // 只传脱敏值；不传明文证件号（M5 §9）
}
```

**响应 `data`**（映射到 `TalentAdviceMatchResult`）

```jsonc
{
  "found": true,
  "version": "2026-11-A",          // 外部批次/版本，仅留痕
  "books": "ABC",
  "sections": [
    {
      "book": "A",
      "bookName": "生长发育",
      "chapter": "1.1 生长发育概述",
      "factor": "运动协调",
      "entropy": "优秀",
      "content": "分级内容示例原文。",
      "example": "分级举例示例原文。",
      "direction": "培育方向示例原文。",
      "suggestion": "培育建议示例原文。",
      "variant": 1
    }
  ]
}
```

- 匹配口径：**姓名 + 精确周岁**（PRD §1.1 / §6.7 / AC-ADM-07-2）；`maskedIdNo`/`reportNo` 仅辅助，不作为唯一键（对方可能没有）。
- `sections` 只含四段家长文案；正文**只同步不改写**（PRD §6.7 L315），M8/M5 不做润色、不改字、不做分级映射。
- 数据熵白名单按 M5：`卓越/优秀/优良/常态/弱态/弱势`，可带「级」后缀，M5 归一化；M8 不裁决。
- `books` 只用于校验，M5 以基因报告 `books` 为准；`version` 仅写入日志与 `note` 留痕，不参与版本号（M5 版本号规则不变）。
- `found=false`：`reason=no_result|info_mismatch`；周期同步时该对象记 `empty`，不阻断整版。

### 3.8 幂等键与版本号（跨接口）

| 层 | 键 | 生成方 | 重放结果 |
| --- | --- | --- | --- |
| 查询提交 | `${childId}:${seq}` | M2（冻结） | 对方返回同一 `externalRef`；回执重复落库被 M2 丢弃 |
| 基因报告 | `(subjectType, subjectId)` + `reportNo` | M3 唯一索引 | 第二次为 `refresh`，不新建基因报告/报告 |
| 基因报告批次 | `Idempotency-Key = sha256("gene-reports:"+runStartedAt+":"+subjectId)` | M8 | 同一批次重试不重复写；跨批次靠 M3 唯一键 |
| 建议版本 | `versionNo` | M5 | 重复版本 409（M5 冻结），不建第二条 |
| 建议书 | `(versionId, geneReportId)` + `adviceNo` | M5 唯一索引 | 同版重复推送不重复建行 |
| 入站触发 | `eventId`（对方生成） | 对方 | 仅日志留痕；拉取本身幂等，重复触发无害 |
| PDF 产物 | `(reportId, volumeId, contentHash)` | M8 唯一索引 | 命中缓存，不重复渲染 |
| PDF ticket | `nonce` + `exp` | M8（HMAC） | TTL 内重放：默认允许（每次仍重新鉴权/门禁）；可开启一次性 |

### 3.9 限流、超时与重试（双方义务）

| 项 | 我方出站 | 对方入站（我们的接口） |
| --- | --- | --- |
| 并发 | `TALENT_EXTERNAL_MAX_CONCURRENCY`（默认 2） | 单 IP/应用 10 req/s（进程内令牌桶） |
| QPS | `TALENT_EXTERNAL_MAX_QPS`（默认 5） | 超限 `429` + `Retry-After: 1` |
| 超时 | 15s（§3.1） | 处理 ≤ 20s；触发类接口立即 202，不阻塞拉取 |
| 429 处理 | 尊重 `Retry-After`（上限 60s）后重试 | — |
| 对方限流要求 | 对方可在响应头 `X-RateLimit-Remaining` 提示 | — |

### 3.10 Mock → external 切换矩阵

| `TALENT_*_SOURCE` | 凭据/基址 | 运行行为 | 日志/告警 |
| --- | --- | --- | --- |
| 缺省 / `mock` | 不要求 | 走 M2/M3/M5 既有 Mock；M8 定时器不注册外部拉取 | 开发/联调；生产启动 `env-check` **失败**（见 §9.4） |
| `external` | 齐全 | 走真实接口；定时器注册 | 正常同步日志 |
| `external` | 缺任一必填 | **503 `EXTERNAL_SOURCE_UNAVAILABLE`**；不静默降级 Mock、不写业务数据 | `error_logs` + 告警（配置错误） |
| `mock` + `TALENT_ALLOW_MOCK_SOURCES=1`（仅显式） | 不要求 | 允许生产用 Mock 做演示；响应/日志带 `mock` 标记 | 启动 warn + 每天一次提醒；验收不得用此模式证明真实链路 |

- 切换步骤（运维）：备份 → 填 `TALENT_*_SOURCE=external` 与基址/密钥 → 重启 → 调 `GET /api/admin/talent/integrations/status` 确认 `source=external`、`configured=true` → 手动触发一次基因报告同步 + 一次建议周期检查 → 抽查 `talent_sync_logs` 与 C 端 PDF。
- 回切：`TALENT_*_SOURCE=mock` + 重启；已同步的真实数据保留，不回滚（Mock 不会覆盖真实行，只会按 mock 数据刷新未发布对象——测试环境才允许）。

---

## 4. 外部基因报告同步（M3 之上）

### 4.1 候选、触发与批次

- **候选**：M3 冻结口径（M3 §4.2）——`talent_children.status="1"` 且 `query="found"`，家长 `status="1"`；`self` 不在自动同步范围（M3 C2）。
- **触发**：定时（默认每 6h）+ 手动（M3 一键同步保留）+ 入站签名触发（异步、运行中合并）。
- **批次**：每次 commit 生成一个 `runStartedAt`，写 1 条 `talent_sync_logs`（`syncScope="gene_report"`、`mode="commit"`、`trigger=auto|manual|webhook`）；批次内逐人串行/受限并发，单条失败不阻断整批（M3 已实现）。
- **定时与手动互斥**：复用 M3 `withTalentReportLock("talent-external-sync")`；定时器发现锁被占（`isTalentReportSyncInFlight()`）→ 跳过本轮，在状态接口/`console.warn` 记 `skipped=locked`，**不写同步日志**（避免污染业务计数），不排队堆积。
- **M2 查询联动**：基因报告候选只取 M2 已查到对象；M8 **不**在报告同步中触发 M2 查询（M3 §8.1）。M2 的查询提交由 M2 既有入口触发，M8 只提供真实源与回执入口。

### 4.2 一人一份与增量分册（不变式）

M8 不重新实现，只保证外部源返回满足：

| 不变式 | M8 责任 |
| --- | --- |
| BR-02 一人一份 | 源按 `existingReportNo` 查询；重复同步走 M3 `refresh`，不新建行；唯一索引兜底 |
| BR-05 增量分册 | 源必须返回**当前已出全量** `books`；M3 计算新增 = 外部 − 已开放；M8 禁止在适配层做差集（避免与 M3 双算） |
| BR-03 发布即冻结 | 已发布报告只刷新 `talent_gene_reports`（未发布/已发布对象均刷新元数据），**不触碰** `talent_reports` 快照；M3 已保证 |
| 补发只追加 | 补发由运营在 M3 页面确认；M8 只让「新增分册」可被下一次同步发现；不自动补发 |
| 外部修订 | 已发布报告不追修订（M3 R11）；M8 不提供「强制覆盖快照」开关 |

### 4.3 并发与重复提交

- 定时器、手动、webhook 三者共用 M3 锁；后到者等待/跳过（见 §4.1），不并发写同一对象。
- 外部接口幂等：同 `Idempotency-Key` 24h 内返回同一结果（§3.8）；未实现幂等的外部系统由我们兜底（M3 唯一键 + 刷新语义）。
- 重复 webhook 触发：只产生「再拉一次」，不产生重复数据；日志可看到多次 `trigger=webhook`，验收以数据幂等为准。

### 4.4 失败分类、重试与退避（基因报告）

| 分类 | 判定 | 处理 | 计入 |
| --- | --- | --- | --- |
| `retryable` | 超时 / 连接失败 / 408 / 429 / 5xx | 本次运行内重试最多 `TALENT_EXTERNAL_RETRY_MAX`（默认 3）次；退避 `1s → 4s → 16s`（±20% jitter）；429 优先 `Retry-After`（≤60s） | 最终失败才计 `failed` |
| `permanent` | 400/422/结构非法/业务码非 OK | 不重试；单对象 `failed`，其余继续 | `failed` |
| `empty` | 200 + `found=false` | 不重试；`empty(no_result|info_mismatch)` | `empty` |
| `auth/config` | 401/403/缺少基址密钥 | **中止本批**（不继续打对方），不写业务数据；整体 503/失败 | 告警「配置/鉴权」 |
| `budget` | 单次运行超过 `TALENT_EXTERNAL_RUN_BUDGET_MS`（默认 10min） | 停止本批，剩余对象记 `failed(budget_exceeded)`；下一轮全量候选重试 | `failed` |

- **跨轮重试**：不建独立队列表。失败对象在下一轮定时任务的「全量候选」中自然重试；运维可手动触发 M3 一键同步立即重试。若外部对象长期失败，`talent_sync_logs` 连续出现同一 `subjectId`，由告警规则识别（§4.7）。
- **重试安全**：所有重试使用同一 `Idempotency-Key`；只读查询接口天然安全；不重试写类入站接口。
- **部分失败**：整体 `status=partial`（M3 已定义），不把整批标记 success；验收要求逐人明细可查。

### 4.5 熔断与限流（基因报告）

- **熔断**：连续 `TALENT_EXTERNAL_BREAKER_THRESHOLD`（默认 5）次源级失败（auth 除外，auth 直接告警）→ 打开 15 分钟，期间定时任务快速失败并记 `circuit_open`，不再请求对方；半开时只探 1 个对象。进程内状态（单实例），重启清零。
- **限流**：出站并发 ≤2、QPS ≤5（令牌桶）；`429` 计入退避；不因重试放大 QPS。
- **隔离**：基因报告、建议、查询三个域各自独立熔断与限流；一个域故障不拖垮其他域（共享进程但独立计数器）。

### 4.6 同步日志（基因报告）

沿用 M3 `talent_sync_logs`（M3 §3.3），M8 只补充运行元数据（写进既有字段，不新增字段）：

| 字段 | M8 取值 |
| --- | --- |
| `trigger` | `auto`（定时）/ `manual`（M3 手动）/ `webhook`（签名触发） |
| `status` | `success` / `partial` / `failed`（M3 已定义） |
| `syncScope` | `gene_report` |
| `mode` | `commit` |
| `message` | `定时同步：刷新 X / 新建 Y / 暂无 Z / 失败 W；耗时 Tms`（不含 PII） |
| `details` | M3 逐人明细（≤500）；M8 额外字段只放 `sourceKind`、`requestId`、`attempts`、`errorClass`（JSON 内扩展，不影响 M3 读模型） |
| `operatorId` | 手动=操作人；自动/入站=空串（`operatorName` 语义用 message「系统同步」） |

- 日志写入失败不阻断主流程（M3 风格）。
- 日志与告警**不含**：身份证/手机号明文、外部原始报文、签名、token、堆栈。

### 4.7 告警（基因报告）

| 规则 | 阈值 | 级别 | 冷却 |
| --- | --- | --- | --- |
| 鉴权/签名失败 | 任一次 | P1 | 30min |
| 配置缺失（`external` 但无基址/密钥） | 启动或首次调用 | P1 | 1h |
| 连续失败批次 | ≥3 次 | P2 | 30min |
| 单批失败率 | ≥20% 且候选 ≥10 | P2 | 30min |
| 长时间无成功同步 | 距上次 success > 2×间隔（默认 12h） | P2 | 2h |
| 熔断打开 | 每次打开 | P2 | 15min |
| 同一对象连续失败 | ≥5 轮 | P3 | 24h |

- 通道：`TALENT_ALERT_WEBHOOK_URL`（JSON POST，兼容企业微信/飞书机器人）+ `error_logs`（`source="talent-external"`）+ `console.warn`；未配置 webhook 时只落 `error_logs`。
- 载荷只含：`rule`、`scope`、`level`、`window`、`counts`、`lastSuccessAt`、`requestId`；**不含** PII、响应体、密钥。

---

## 5. 外部培育建议源（M5 之上）

### 5.1 周期与触发（PRD §7.6 / BR-07）

- **周期**：默认 4 个月一版（M5 `TALENT_ADVICE_CYCLE_MONTHS=4`，冻结常量，不在 M8 改成可配置）。
- **定时检查**：每日一次（`TALENT_ADVICE_SYNC_CHECK_INTERVAL_MS` 默认 24h）；仅当满足以下之一才真正接收新版：
  1. 无 `active` 版本；
  2. `now >= active.nextUpdateAt - TALENT_ADVICE_SYNC_LOOKAHEAD_DAYS`（默认 7 天，即到期前一周开始尝试）。
- **周期内重复检查**：当月版本已存在时 M5 返回 409 `ADVICE_VERSION_EXISTS`；M8 视为 `noop(already_synced)`，记 success 日志，**不告警、不建数据**。
- **触发**：定时 + 手动（M5 接收新一版保留）+ 入站签名触发（异步走同一检查）。
- **禁止**：M8 不自动「回切历史版本」、不自动发布/撤回单份建议（PRD §6.7 后台逐份操作保留给运营）。

### 5.2 版本唯一与幂等（M5 合同，M8 只消费）

| 场景 | 结果 |
| --- | --- |
| 同一周期重复接收 | 409 `ADVICE_VERSION_EXISTS`（带已有版本）；M8 noop + success 日志 |
| 同一 `versionNo` 手工指定重复 | 同上 |
| 外部同一批重复推送 | 触发拉取 → 命中 409 → noop；不重复建建议 |
| 并发接收 | M5 锁 `advice:version`；第二个请求在新版生效后命中重复 → 409 |
| 旧版归档 | M5 固定顺序翻转，失败补偿；M8 不介入 |
| 新版未覆盖对象 | 记 `empty`；C 端只显示当前生效版本，旧版归档可回溯（M5 §4.3-10） |

### 5.3 失败处理与补偿（建议）

- 源整体不可用 → 503 `ADVICE_SOURCE_UNAVAILABLE`（M5 §9 冻结；若 M5 实现按 §4.3 的「全部失败无写入」返回 500 `ADVICE_VERSION_SYNC_FAILED`，以 M5 实现为准，语义相同）；**不创建空版本**、不切换版本、旧版保持生效。
- 单对象失败 → `failed(source_error)`，其余继续；整体 `partial`；M5 保证无残留行、旧版仍生效。
- 定时任务失败 → 写 `talent_sync_logs`（`syncScope="advice_version"`、`status=failed|partial`）+ 告警；下一日检查重试（周期窗口内）。
- 周期边界错过（服务停机跨过 `nextUpdateAt`）→ 恢复后下一次检查满足条件即接收，`effectiveAt` 用当天；版本号由 M5 按 `YYYY.MM` 生成，若当月已存在则 noop 等下一月（记录运维提示）。
- **外部推送但内容未变化**：仍按周期生成新版本（BR-07 的「每 4 个月一版」是业务节奏，不是内容差异检测）；`version` 只进日志/`note` 留痕。

### 5.4 与 M5「接收新版 / 发布撤回」的联动

- 「同步即默认已发布」：M5 写入即 `publishStatus="published"`、`publishedAt=syncedAt`；M8 不额外发布。
- 后台逐份撤回：仅 M5 接口；M8 不重发、不覆盖撤回状态（下一次新版本按 M5 规则重新为 published）。
- 报告撤回/恢复：C 端建议可见性由 M5 派生（`report.status=published`），M8 **不写任何建议状态**、不做双写（M5 ADR D4）。
- 补发新增分册：建议不立即补该册（PRD §13.2-1，M5 C5）；M8 不在补发时触发建议同步。
- C 端切换：M5 新版本生效后 C 端下次请求即切换；M8 不缓存建议内容。

### 5.5 同步日志与告警（建议）

- 日志沿用 M5 `talent_sync_logs`（`syncScope="advice_version"`、`mode="commit"`）；M8 增加 `trigger=auto|webhook` 与 `details.counts`（created/empty/failed）、`externalVersion`（留痕，不含正文）。
- 告警规则：auth 失败 P1；连续 3 天检查失败 P2；周期到期后 7 天仍未成功接收 P2；单批失败率 ≥20% P2；冷却 30min–2h。
- 告警载荷只含版本号（成功时）、份数、错误分类；不含正文与 PII。

---

## 6. PDF

> 客户原版报告 PDF 存 `talent_report_source_pdfs`（PB 私有文件）；C 端 `/pdf` 优先返回原版，未导入时回退生成版。 渲染与交付

### 6.1 范围与六册数据来源

- 只渲染**已发布报告**（`talent_reports.status="published"`）且 `open=true` 的分册（M3 `volumeSnapshot[].open` + `openVolumeIds`）。未发布/撤回不渲染、不提供下载。
- 六册固定顺序 V1–V6（A–F）：生长发育 / 智商 / 情商 / 领导商 / 艺术商 / 体育运动商；每册独立 PDF，一次只渲染被请求的一册。
- 数据**只读冻结快照**，禁止读 M1 当前配置、禁止重算方向：

| 内容 | 来源 | 说明 |
| --- | --- | --- |
| 册名、章节、要素（名称/分级/注解） | `volumeSnapshot[volumeId]`（M3 §3.2.2） | 与 C 端分册页同源，编码不对家长展示 |
| 要素条件/分数（如有） | `factorSnapshot`（按 `code` 关联） | 只取展示需要的 `condition`，不展示内部编码 |
| 报告编号/发布时间/快照版本 | `talent_reports` | 封面与页脚 |
| 对象姓名/性别/生日/年龄 | 快照投影（`factorSnapshot` 不含对象名时用 `talent_gene_reports`/M2 只读） | 只用于封面与页眉；不写 PII 到文件名 |
| 家长姓名、手机尾号（水印） | `talent_parents`（只读，服务端） | 只用于水印纹理；手机号取脱敏尾号；缺失时省略该段 |
| 培育方向/已选方向 | **不渲染** | PDF 是基因报告分册，不含方向/建议；PRD §7.4 只要求分册内容 |

- 快照缺失（老报告/迁移前数据）→ `PDF_NOT_READY`，不即时用当前配置「补造」内容（违反 BR-03）。

### 6.2 文档结构与分页

| 区块 | 规则 |
| --- | --- |
| 页面 | A4 纵向 210×297mm；页边距 上18 / 下20 / 左18 / 右18mm |
| 封面 | 报告标题（「个性化能力培育开发基因服务报告」）+ 册名 + 系列/第 N 分册 + 对象姓名/年龄 + 报告编号 + 发布日期；无家长手机号/身份证 |
| 目录 | 单册章节 ≤12 时生成简目录；>12 时只列一级章节；目录页码由两遍排版得出（先测量后编号） |
| 页眉 | 报告编号（左）+ 册名（右），6pt 灰；封面与目录不显示 |
| 页脚 | `第 X / Y 页` + 「本文件仅供报告对象家庭查阅」；6pt 灰 |
| 章节 | 一级标题 16pt 加粗、二级 12pt 加粗；标题与正文同页（避免孤行）；章节另起页可选（默认接排） |
| 要素块 | 要素名（10pt 加粗）+ 数据熵标签 + 固定注解正文（9pt，行高 1.7）；块内不跨页；块高 > 半页时允许拆分并在续页标「（续）」 |
| 空册 | 不生成 PDF（C 端已不可点）；API 返回 `PDF_NOT_READY` |
| 上限 | 单册 ≤200 页；超出 → 渲染失败 `PDF_RENDER_FAILED(reason=too_large)`，不截断内容 |
| 确定性 | 相同输入（快照 + 模板版本 + 字体版本 + 水印身份哈希）生成字节级稳定 PDF（时间戳只来自元数据，不用 `Date.now()` 进内容） |

### 6.3 字体与文本

- 字体：**Noto Sans CJK SC Regular**（SIL OFL 1.1，`server/assets/fonts/OFL.txt` 随仓库）；字体本体（约 16MB）**不入 Git**，本地与构建机执行 `pnpm fonts:fetch` 下载到 `server/assets/fonts/`（SHA-256 校验），生产可用 `TALENT_PDF_FONT_PATH` 指向服务器已装字体；缺失时明确报错并回落系统字体候选，不伪造字体、不输出空白 PDF。
- 子集化：用 `fontkit` 对本次文档用到的码点做子集嵌入；未覆盖码点回退：① 字体 fallback 列表（Noto Sans SC → Noto Sans CJK SC → 系统无衬线）；② 仍缺字时用 `□` 替换并在日志记 `missing_glyphs`（不阻断整册），告警阈值：单册缺字 >10 → P3。
- 文本安全：外部文案按纯文本渲染，不执行 HTML/Markdown；超长段落按标点断行；不做自动翻译/改写。
- 字体版本号参与内容哈希（`fontVersion`），升级字体后新请求自动重渲，旧 PDF 保留到清理。

### 6.4 水印（PRD §10.4 / M7 D7）

- 每页平铺水印：旋转 -30°，浅灰 8% 不透明度，间距约 120mm × 70mm；内容按行重复：
  `{家长姓名} · {手机尾号} · {报告编号} · {生成日期}`
  - 家长姓名：`talent_parents.name`（无则省略段）；
  - 手机尾号：脱敏手机号后 4 位（`maskedMobile` 尾 4）；无则省略段；
  - 报告编号：`reportNo`；
  - 生成日期：**首次渲染日期 `YYYY-MM-DD`**（写入 `talent_report_pdfs.watermarkAt`），不是每次下载时间。
- 页脚再加一行 7pt：「报告编号 {reportNo} · 生成于 {watermarkAt}」。
- 水印在正文之上、半透明，不遮挡可读性；不接受关闭水印（配置只控制是否含手机尾号：`TALENT_PDF_WATERMARK_MOBILE=1|0`，默认 1）。置 0 时水印改为 `{家长姓名} · {报告编号} · {生成日期}`，`watermarkPolicy` 与 `watermarkIdentityHash` 随之变化，产生新产物。
- 水印文本**不写入日志**；`talent_report_pdfs` 只存 `watermarkAt` 与 `watermarkPolicy`，不存明文姓名/手机号。

### 6.5 文件命名与响应头

- 文件名：`{reportNo}-{册名}.pdf`（如 `GR202611160001-生长发育.pdf`），只含报告编号与册名，不含对象姓名/证件号。
- 代理响应头固定：

```
content-type: application/pdf
content-disposition: inline; filename*=UTF-8''{urlencoded}
cache-control: private, no-store
x-content-type-options: nosniff
referrer-policy: no-referrer
content-length: {bytes}
```

- 支持 `Range`：产物 ≤ `TALENT_PDF_MAX_BYTES`（默认 10MB）时整文件读入内存并按 `Range` 返回 206；超限直接 `PDF_RENDER_FAILED(too_large)`。不返回 302/307 到 OSS/PB。
- H5 新窗口下载使用 ticket URL（§6.8）；小程序 `uni.downloadFile` 使用 Bearer 代理地址，无需 ticket。

### 6.6 渲染触发、缓存与失效

```
请求分册 PDF
  → 门禁（§6.11）
  → 计算 contentHash = sha256({
        reportId, volumeId,
        volumeSnapshot[volumeId] 的内容哈希,      // 只取本册，不取整个六册数组
        factorSnapshot 中本册要素子集的内容哈希,   // 按 code 过滤后计算
        subjectDisplayName, watermarkIdentityHash, watermarkPolicy,
        templateVersion, fontVersion
      })
  → 查 talent_report_pdfs (reportId, volumeId, contentHash)
      命中 → 读存储 → 流式返回（cacheHit=true）
      未命中 → 进程内渲染闸（并发 ≤ TALENT_PDF_MAX_CONCURRENCY，默认 2；排队上限 8）
               → 渲染 → 加密 → 存储 → 写元数据 → 返回
               → 排队满/超时 → 503 PDF_RENDER_BUSY（Retry-After: 5）
```

- **contentHash 不含 `snapshotVersion`**：快照版本只写入元数据用于追溯；补发/重算时内容未变的旧册哈希不变 → 复用（§6.10），内容变化的册自然产生新哈希。
- **contentHash 不含水印日期**：`watermarkAt` 只写入元数据，首次渲染后固定；同内容重复下载不因日期变化重渲。

- **懒渲染**：首次下载触发；不做发布时预渲染（避免发布耗时与无人下载的浪费）。可选内部脚本 `pnpm talent:pdf:warm --report=<id>` 由运维手动预热（不新增后台 API，避免与 M3 路由清单断言冲突）。
- **缓存不变式**：同一 contentHash 只渲染一次；撤回不删产物（证据保留），恢复复用；补发/重算只有内容变化的册产生新 hash（旧册复用）。
- **失效**：身份信息变更（家长改名/手机尾号变）→ `watermarkIdentityHash` 变 → 新产物；水印策略切换（`TALENT_PDF_WATERMARK_MOBILE`）→ `watermarkPolicy` 变 → 新产物；模板/字体升级 → `templateVersion/fontVersion` 变 → 新产物；快照内容变化 → 本册哈希变 → 新产物。旧产物按 §6.12 清理。
- **幂等**：两个并发请求同一 hash → 单飞（in-flight map）只渲染一次，另一个等待结果。

### 6.7 存储（PB / OSS 私有）

| 模式 | 选择 | 存储位置 | 保护 |
| --- | --- | --- | --- |
| 默认 | `TALENT_PDF_STORAGE=pocketbase` 或 `auto` 且 `OSS_ENABLED=false` | PocketBase `uploads` 集合，`purpose="talent-report-pdf"` | `listRule/viewRule = purpose != "talent-report-pdf"`（现有规则，`setup.mjs` L517–526）；文件仅服务端用 admin token 读取 |
| 可选 | `TALENT_PDF_STORAGE=oss` 或 `auto` 且 `OSS_ENABLED=true` | 阿里云 OSS 私有对象 | 上传后逐对象 `putACL(private)`；bucket 不得公开读；签名 URL 只服务端内部使用（60s） |

- **加密**：两种模式都先 AES-256-GCM 加密再存（密钥由 `ENCRYPTION_KEY` 派生）；OSS 对象 key 编码 `oss1.{base64url({objectKey,iv,tag})}`（沿用现有 `talent-report-pdf.ts` 的密钥封装思路，新实现独立文件）；PB 模式把密文写入 `uploads.file`，上传 mime 用 `application/octet-stream`（内容是密文，不是直接可读 PDF），元数据 `objectKey=uploads record id`。
- **对象 key**：`talent-pdf/{reportId}/{volumeId}/{contentHash}.pdf`（只含 id 与哈希，不含 PII/姓名/报告编号）。
- **禁止**：把 PB 文件 URL、OSS 签名 URL、bucket、endpoint 写入 C 端响应/日志/前端构建变量；PB `uploads` 记录不得被公开列出。
- **`ENCRYPTION_KEY` 轮换**：旧 PDF 不可解密 → 视为缓存失效，按需重渲；不阻塞下载（重渲成功即恢复）。密钥轮换必须按 OPERATIONS §11 流程。

### 6.8 时效签名 URL / Ticket 与权限代理

**两条路径，同一门禁**

| 路径 | 用途 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `GET /api/client/talent/reports/:id/volumes/:volumeId/pdf` | 小程序 `downloadFile`；已登录 H5 也可 | `Authorization: Bearer` | M7 已定义路由；M8 在 seam 内返回文件 |
| `POST .../pdf-ticket` → `GET .../pdf?ticket=...` | H5 新窗口/标签打开（无法自定义 Header） | 120s HMAC ticket | M8 新增 |

**ticket**

- 响应：`{ url, expiresAt, ttlSeconds }`；`url` 默认同源相对路径 + `ticket` 查询参数；生产 H5 与 API 不同域时必须配置 `TALENT_PUBLIC_API_BASE_URL`，服务端用它拼绝对 URL（禁止信任请求 `Host`/`Origin` 拼接）。
- 载荷（base64url JSON，无 PII）：`{ r: reportId, v: volumeId, u: userId, p: parentId, e: expSeconds, n: nonce }`。
- 签名：`HMAC-SHA256(ticketKey, "pdf-ticket:" + payload)`，`ticketKey = sha256(ENCRYPTION_KEY + ":pdf-ticket")`；`timingSafeEqual` 比较。
- TTL：`TALENT_PDF_TICKET_TTL_SECONDS`（默认 120，上限 300）；过期 `410 PDF_TICKET_EXPIRED`；签名错 `403 PDF_TICKET_INVALID`。
- ticket **不是授权替代**：命中 ticket 后仍重新校验（同一事务读 DB）：账号正常、parent 正常且 `parentId` 匹配、报告 `published`、本册 `open=true`、子女未解绑。撤回/停用后即使 ticket 未过期也拒绝（409/404 口径同 §6.11）。
- 一次性（可选）：`TALENT_PDF_TICKET_ONE_TIME=1` 时进程内 nonce LRU 记已用，重放 `410`；默认关闭（单实例重启即失效，默认靠短 TTL + 重新鉴权）。
- 日志与代理：反向代理必须对本路由**不记录查询串**（或对 `ticket` 打码）；应用日志只记 `requestId` + 结果码，不记 ticket 原文。`referrer-policy: no-referrer` 已设。
- ticket 与 Bearer 同时存在时以 Bearer 为准；两者都无 → 401。

### 6.9 下载留痕

写 `talent_pdf_downloads`（§7.2），不写 `oper_logs`（C 端高频动作会淹没后台日志）：

| 场景 | 记录 | 频率控制 |
| --- | --- | --- |
| 成功下载 | `result="ok"`、`storage`、`contentHash`、`renderMs`、`cacheHit`、`ipHash`、`uaFamily` | 每次 |
| 门禁拒绝 | `result` ∈ `report_not_published` / `not_open` / `forbidden` / `not_ready` | 每次成功请求记录；同用户同结果 1 分钟内去重（防刷日志） |
| ticket 失败 | `result="ticket_invalid|expired"` | 触发限流（§8.4），不逐次写 |
| 渲染失败 | `result="render_failed"`，另写 `error_logs` | 每次（含 errorClass） |

- 保留期：`TALENT_PDF_DOWNLOAD_LOG_RETENTION_DAYS`（默认 180）；每日清理任务删除过期行；不做数据聚合表（M9 如需再评估）。
- 频率限制：单家长 `10 次/分钟`、单 IP `30 次/分钟`（进程内令牌桶，单实例）；超限 429 `PDF_DOWNLOAD_LIMIT` + `Retry-After: 60`，不写逐次日志（按 1 分钟聚合写 1 条 `result="rate_limited"`）。
- 隐私：不存姓名、手机号、身份证、完整 IP、User-Agent 原文；`ipHash = HMAC(ENCRYPTION_KEY, ip)`，`uaFamily ∈ mp|ios|android|h5|unknown`。
- 审计：M8 **不提供**下载日志查询页面/接口（不加菜单）；运维用 PB admin 直接按需查询。若后续需要应用内查询，另立任务并写 `oper_logs`。

### 6.10 与报告发布 / 撤回 / 恢复 / 补发联动

| 报告动作 | PDF 行为 | 证据 |
| --- | --- | --- |
| 发布（pending → published） | 下一次下载按快照渲染；`snapshotVersion=1` | 首次下载生成产物，元数据 `snapshotVersion=1` |
| 撤回（published → retracted） | 立即拒绝下载（409 `report_retracted`，M7 文案）；已生成产物保留不删；列表/建议同步不可见（M5 派生） | 撤回后请求代理 → 409；ticket 未过期也 409 |
| 恢复（retracted → published） | 复用同快照/同 contentHash 产物，不再重渲；`snapshotVersion` 不变 | 恢复后下载命中缓存（`cacheHit=true`），字节与撤回前一致 |
| 补发（publish-new，v+1） | 只有新增册需要新产物；旧册 contentHash 不变 → 复用 | 补发后请求旧册命中缓存；新册首次渲染 |
| 重算快照（regenerate，v+1） | 注解/分级可能变化 → 相关册内容哈希变化 → 按需重渲，旧产物保留到清理 | 重算后下载产生新 contentHash；旧快照产物不再被引用 |
| 报告不存在/未发布 | 404 `REPORT_NOT_FOUND` / 409 `report_pending`；无产物时 404 `PDF_NOT_READY` | §6.11 |

- **不预留打包下载**；不做「发布时推送 PDF 到家长」（C 端无消息能力，PRD 无要求）。

### 6.11 未发布 / 未开放 / 越权口径（与 M7 一致）

| 条件 | HTTP | code / state | 说明 |
| --- | --- | --- | --- |
| 未登录 / token 失效 | 401 | `UNAUTHORIZED` | M7 统一 |
| 账号停用 | 403 | `ACCOUNT_DISABLED` | 停用页 |
| 报告不存在 / 非本人 / 子女已解绑 | 404 | `REPORT_NOT_FOUND` | 不泄露存在性 |
| 报告 `pending_publish` | 409 | `report_pending` / `pending_publish` | 「报告正在整理中」 |
| 报告 `retracted` | 409 | `report_retracted` / `retracted` | 「报告内容更新中」 |
| 分册未开放 / 不存在 | 404 | `VOLUME_NOT_FOUND` | C 端回报告主栏 |
| 已发布且开放但无产物、渲染开关关闭 | 404 | `PDF_NOT_READY` | M7 前兼容文案「本册 PDF 暂不可下载」 |
| 渲染失败/超时/忙 | 503 | `PDF_RENDER_FAILED` / `PDF_RENDER_TIMEOUT` / `PDF_RENDER_BUSY` | 可重试；页面 toast「文件下载失败，请重试」 |
| ticket 无效/过期 | 403 / 410 | `PDF_TICKET_INVALID` / `PDF_TICKET_EXPIRED` | H5 提示重新点击下载 |
| 下载频率超限 | 429 | `PDF_DOWNLOAD_LIMIT` | `Retry-After: 60` |

### 6.12 清理与保留

- 清理任务（每日，进程内）：按 `renderedAt` 倒序，删除 `talent_report_pdfs` 中同一 `(reportId, volumeId)` 下**非最新 3 个 contentHash** 的产物（先删存储对象再删元数据；失败重试 3 次后告警）。撤回报告不删除产物（保留证据），但不再被引用。
- `talent_pdf_downloads` 按保留期删除；删除失败不影响主流程，连续 3 天失败 P2。
- 手动清理脚本 `pnpm talent:pdf:purge --report=<id> --keep=<n>`（dry-run 默认）供合规要求时使用；生产执行需二次确认。
- 存储用量：监控 PB 数据目录/OSS bucket 大小；超过阈值（默认 20GB）P2 告警，运维按保留策略处理。

---

## 7. 数据模型（M8 新增）

> 只新增两个 `talent_*` 集合；不改 `talent_reports` / `talent_gene_reports` / `talent_advice_*` 字段。初始化走 `scripts/setup.mjs`（新库）与 `scripts/sync-talent.mjs`（存量库，只加不删）。

### 7.1 `talent_report_pdfs`（PDF 产物元数据）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `reportId` | relation → `talent_reports` | 是 | `maxSelect:1`；删除报告时由清理任务处理（不级联删存储） |
| `volumeId` | text(2) | 是 | `V1`–`V6` |
| `contentHash` | text(64) | 是 | 渲染输入哈希（不含 PII 原文） |
| `snapshotVersion` | number | 是 | 渲染时报告快照版本 |
| `storage` | text(10) | 是 | `pocketbase` / `oss` |
| `objectKey` | text(255) | 是 | PB uploads 记录 id 或 `oss1.{...}` 编码；不含 PII |
| `fileName` | text(120) | 是 | 下载文件名（报告编号+册名） |
| `byteSize` | number | 是 | 解密后 PDF 字节数（用于 `content-length`；密文大小可另存 `storedSize`，非必需） |
| `pageCount` | number | 是 | 页数 |
| `templateVersion` | text(20) | 是 | 模板版本（布局变更递增） |
| `fontVersion` | text(20) | 是 | 字体版本 |
| `watermarkPolicy` | text(40) | 是 | 如 `name+mobile4+reportNo+date` / `name+reportNo+date` |
| `watermarkAt` | date | 是 | 首次渲染日期（水印时间） |
| `renderedAt` | date | 是 | 实际渲染完成时间（审计用） |

- 唯一索引：`idx_talent_report_pdfs_content` UNIQUE(`reportId`,`volumeId`,`contentHash`)；普通索引：`idx_talent_report_pdfs_report`(`reportId`)、`idx_talent_report_pdfs_hash`(`contentHash`)、`idx_talent_report_pdfs_rendered`(`renderedAt`)。
- 不存对象姓名、家长姓名、手机号、身份证、水印明文。
- 失败不落行（避免半成品）；失败证据写 `talent_pdf_downloads` + `error_logs`。

### 7.2 `talent_pdf_downloads`（下载留痕）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `reportId` | text(64) | 是 | 不建 relation（下载日志保留期短，避免 relation 级联约束） |
| `volumeId` | text(2) | 是 | — |
| `parentUserId` | text(64) | 是 | 中性账户 users id |
| `subjectType` / `subjectId` | text(10) / text(64) | 是 | 对象 |
| `result` | text(20) | 是 | `ok` / `report_not_published` / `not_open` / `forbidden` / `not_ready` / `render_failed` / `ticket_invalid` / `ticket_expired` / `rate_limited` |
| `storage` | text(10) | 否 | `pocketbase` / `oss`（无产物为空） |
| `contentHash` | text(64) | 否 | 命中产物时有值 |
| `renderMs` | number | 否 | 本次渲染耗时；缓存命中为 0 |
| `cacheHit` | bool | 否 | 是否命中产物 |
| `at` | date | 是 | 下载/尝试时间（UTC） |
| `ipHash` | text(64) | 是 | HMAC 摘要，不存 IP |
| `uaFamily` | text(20) | 是 | `mp` / `ios` / `android` / `h5` / `unknown` |
| `requestId` | text(40) | 否 | 与响应头/应用日志关联 |

- 索引：`idx_talent_pdf_downloads_report_at`(`reportId`,`at`)、`idx_talent_pdf_downloads_at`(`at`)、`idx_talent_pdf_downloads_parent_at`(`parentUserId`,`at`)。
- 权限：`listRule/viewRule/createRule/updateRule/deleteRule` 全部仅管理员（`null` / 服务端 admin）；PB 后台不对外开放。
- 保留期见 §6.9；不在 M8 提供 UI。

### 7.3 与旧字段/旧集合的关系

| 旧对象 | M8 处理 | M6 |
| --- | --- | --- |
| `talent_reports.pdfUrl` / `pdfFileKey` / `pdfFileName` | 不读、不写、不复用语义；新 PDF 走 `talent_report_pdfs` | 删除字段 |
| `talent_report_receipts` | 不写；M2 查询回执写 `talent_sync_logs` | 删除集合 |
| `server/utils/talent-report-pdf.ts`（旧上传/读取） | 只读参考加密/OSS 写法；M8 新实现独立文件，不复用该文件 | 随旧集合一起删除 |
| `configs.talent_sync_config` | 不读、不写；M8 配置只走 env | 随旧同步页删除（M6） |
| 旧 `POST /api/integrations/talent/reports` / 旧 `/api/client/talent/reports/:id/pdf` | 保留到 M6；M8 不改、不依赖 | 删除 |

---

## 8. API、错误码、权限与观测

### 8.1 路由表

| # | 方法 | 路径 | 归属 | 权限/鉴权 | 说明 |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/api/client/talent/reports/:id/volumes/:volumeId/pdf` | M7 路由 + M8 seam | 家长登录态 + 归属；或有效 ticket | 流式 PDF；门禁 §6.11；写下载留痕 |
| 2 | POST | `/api/client/talent/reports/:id/volumes/:volumeId/pdf-ticket` | **M8 新增** | 家长登录态 + 归属（必须 Bearer） | 签发 120s ticket；不写下载留痕（真正下载时写） |
| 3 | GET | `/api/admin/talent/integrations/status` | **M8 新增** | `talent:report:sync` 或 `talent:advice:sync`（按权限裁剪返回段） | 只读状态：源类型/配置是否完整/最近运行/连续失败/熔断/下次运行/PDF 队列与缓存；无 PII、无密钥、无 URL |
| 4 | POST | `/api/integrations/talent/gene-reports/sync` | **M8 新增** | HMAC（`TALENT_EXTERNAL_WEBHOOK_SECRET`） | 202 触发基因报告拉取；运行中去重；不接收正文 |
| 5 | POST | `/api/integrations/talent/advice/sync` | **M8 新增** | HMAC | 202 触发建议周期检查 |
| 6 | POST | `/api/integrations/talent/gene-query/receipts` | **M8 新增** | HMAC | M2 查询回执落库；200 `{result}` |

- **不新增**：B 端同步配置页/接口、PDF 管理端渲染/预览接口、打包下载接口、PDF 删除接口。旧 `POST /api/admin/talent/report/:id/pdf`（旧模型上传）保持到 M6，M8 不扩展。
- **与 M7 的协调**：M7 已冻结 `GET .../volumes/:volumeId/pdf` 为唯一下载入口；M8 的 `POST .../pdf-ticket` 是同一前缀下的新增兄弟路由，需在 M7 路由清单/测试与 `docs/API.md` 中补登（M7 若按「无 ticket 路由」断言，由 lead 在联调时放行并回写 M7 §10.2）。
- 3 条入站路由放 `server/api/integrations/talent/**`（现有目录），**不复用**旧 `reports.post.ts`；统一 `readRawBody` 后校验签名再解析 JSON（防 JSON 解析型攻击）。
- 入站路由不使用 `requirePermission`（系统对系统），但必须：HMAC、时间窗、nonce/`eventId`、体积、内容类型、IP/应用级限流。

### 8.2 关键响应

**`GET /api/admin/talent/integrations/status`（200）**

```jsonc
{
  "report": {
    "source": "external", "configured": true, "enabled": true,
    "lastRun": { "at": "2026-11-17T02:00:00.000Z", "status": "success",
                 "scanned": 42, "refreshed": 30, "created": 1, "empty": 10, "failed": 1 },
    "consecutiveFailures": 0, "circuitState": "closed", "nextRunAt": "2026-11-17T08:00:00.000Z"
  },
  "advice": {
    "source": "external", "configured": true, "enabled": true,
    "activeVersion": "V2026.11", "nextUpdateAt": "2027-03-01",
    "lastRun": { "at": "2026-11-17T02:00:00.000Z", "status": "success", "created": 8, "empty": 1, "failed": 0 },
    "consecutiveFailures": 0
  },
  "pdf": {
    "enabled": true, "storage": "pocketbase",
    "queueDepth": 0, "renderSuccess1h": 12, "renderFailed1h": 0,
    "cacheHitRate24h": 0.86, "oldestArtifactAgeDays": 31
  }
}
```

- 只返回调用者有权限的段（有 `report:sync` 才返回 `report`；有 `advice:sync` 才返回 `advice`；PDF 段两者任一即可见）。
- 不返回基址、密钥、token、对象 key、文件名、家长/对象信息。

**`POST .../pdf-ticket`（200）**

```jsonc
{ "url": "/api/client/talent/reports/rec_report_1/volumes/V1/pdf?ticket=eyJ...", "expiresAt": "2026-11-17T02:02:00.000Z", "ttlSeconds": 120 }
```

**入站触发（202）**

```jsonc
{ "accepted": true, "eventId": "evt_...", "deduped": false, "runId": "run_..." }
```

### 8.3 错误码

| code | HTTP | 场景 | 客户端处理 |
| --- | --- | --- | --- |
| `EXTERNAL_SOURCE_UNAVAILABLE` | 503 | `external` 但配置缺失/不可用（手动同步/状态接口） | 后台提示「外部服务未配置或暂不可用」 |
| `SYNC_IN_PROGRESS` | 409 | 手动同步与运行中任务冲突（M3 已用类似语义） | 提示稍后重试 |
| `SIGNATURE_INVALID` / `SIGNATURE_EXPIRED` / `UNAUTHORIZED` | 401 | 入站签名/时间窗失败 | 提供方检查密钥与时钟 |
| `REPLAY_DETECTED` | 409 | 入站 nonce/eventId 重放（可配置严格模式） | 提供方不要重试 |
| `RATE_LIMITED` | 429 | 入站限流 | 按 `Retry-After` 重试 |
| `PAYLOAD_TOO_LARGE` | 413 | 入站 body 超限 | 提供方修正 |
| `VALIDATION_ERROR` | 422 | 入站 JSON/schema 非法 | 提供方修正 |
| `PDF_NOT_READY` | 404 | 无产物/渲染关闭/快照缺失 | 「本册 PDF 暂不可下载」 |
| `PDF_RENDER_FAILED` | 503 | 渲染异常 | 「文件下载失败，请重试」 |
| `PDF_RENDER_TIMEOUT` | 503 | 渲染超时 | 同上 |
| `PDF_RENDER_BUSY` | 503 | 队列满/并发限制 | 稍后重试（`Retry-After`） |
| `PDF_TICKET_INVALID` / `PDF_TICKET_EXPIRED` | 403 / 410 | ticket 签名错/过期 | 回页面重新点击下载 |
| `PDF_DOWNLOAD_LIMIT` | 429 | 下载频率超限 | 稍后重试 |
| `report_pending` / `report_retracted` | 409 | 报告状态（M3/M7 冻结，保持小写风格） | M7 文案 |
| `REPORT_NOT_FOUND` / `VOLUME_NOT_FOUND` | 404 | 越权/不存在/未开放 | 「内容不可查看」 |

- C 端业务码统一放 `data.code`/`data.state`（M7 §10.1）；入站/管理端错误沿用 `createError` 的 `message` + `data.code`。
- 错误响应**不含**堆栈、SQL、外部原始报文、URL、密钥；`PDF_RENDER_FAILED` 只给通用文案，详细原因写 `error_logs`。

### 8.4 权限、审计与 PII

| 项 | 规则 |
| --- | --- |
| C 端 PDF | 只按登录态解析 parent；不接受前端 `parentId`；越权 404；ticket 也绑定 `userId` 并重新鉴权 |
| 管理端状态 | `talent:report:sync` / `talent:advice:sync`（复用 M3/M5 权限码，**不新增权限码/菜单**） |
| 入站 | HMAC + 时间窗 + 限流，不走 RBAC；IP/应用级限流（10 req/s） |
| 审计 | 管理端只读接口不写 `oper_logs`；入站触发写 `talent_sync_logs`；C 端下载写 `talent_pdf_downloads`；错误写 `error_logs` |
| 日志红线 | 不记身份证/手机号/姓名明文、ticket、签名、token、对象 key、外部原始 body；`reportNo`/`subjectId`/`requestId` 可记 |
| 响应扫描 | 新增响应做递归断言：不含 `Cipher`/`Hash`/`__` 内部字段、不含 18 位/11 位明文、不含 `oss.`/`http` 存储地址 |

### 8.5 观测指标

| 指标 | 来源 | 用途 |
| --- | --- | --- |
| `sync_runs_total{scope,trigger,status}` | `talent_sync_logs` | 成功率、失败趋势 |
| `sync_subjects{scope,action}` | 同上 `details`/计数 | 刷新/新建/暂无/失败 |
| `source_latency_ms{scope}` | 外部客户端内存统计（日志 `details` 抽样） | 性能与超时 |
| `consecutive_failures{scope}` | 进程内状态 | 熔断/告警 |
| `last_success_age_seconds{scope}` | 最近 success 日志 | 停摆告警 |
| `pdf_render_total{result}` / `pdf_render_ms` | `talent_pdf_downloads` | 渲染健康度 |
| `pdf_cache_hit_rate` | 同上 `cacheHit` | 缓存有效性 |
| `pdf_downloads_total{volumeId,result}` | 同上 | 使用与拒绝分布 |
| `pdf_queue_depth` / `pdf_artifact_days` | 进程内/元数据 | 容量与清理 |

- M8 不引入 Prometheus 客户端；指标通过日志/状态接口暴露，M9 如需接入监控再扩展。状态接口字段见 §8.2。

---

## 9. 配置名单（`env`，不写 `configs`）

### 9.1 外部源

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `TALENT_GENE_QUERY_SOURCE` | `mock` | `mock` / `external`（M2） |
| `TALENT_GENE_QUERY_BASE_URL` | — | 查询服务基址（https） |
| `TALENT_GENE_QUERY_RECEIPT_MODE` | `callback` | `callback`（对方回执）/ `poll`（轮询兜底） |
| `TALENT_GENE_REPORT_SOURCE` | `mock` | `mock` / `external`（M3 已存在） |
| `TALENT_GENE_REPORT_BASE_URL` | — | 基因报告服务基址 |
| `TALENT_ADVICE_SOURCE` | `mock` | `mock` / `external`（M5 已存在） |
| `TALENT_ADVICE_BASE_URL` | — | 建议服务基址 |
| `TALENT_EXTERNAL_BASE_URL` | — | 可选统一基址；分域未配时回退 |
| `TALENT_EXTERNAL_APP_ID` | — | 出站 `X-Talent-App-Id` |
| `TALENT_EXTERNAL_API_SECRET` | — | 出站 HMAC 密钥（≥32 字符） |
| `TALENT_EXTERNAL_API_SECRET_PREVIOUS` | — | 轮换期旧密钥（≤7 天） |
| `TALENT_EXTERNAL_API_VERSION` | `v1` | 协议版本；适配层固定 |
| `TALENT_EXTERNAL_WEBHOOK_SECRET` | — | 入站 HMAC 密钥 |
| `TALENT_EXTERNAL_CLOCK_SKEW_SECONDS` | `300` | 时间窗 |
| `TALENT_EXTERNAL_TIMEOUT_MS` | `15000` | 单请求超时 |
| `TALENT_EXTERNAL_RETRY_MAX` | `3` | 单对象重试次数 |
| `TALENT_EXTERNAL_MAX_CONCURRENCY` | `2` | 出站并发 |
| `TALENT_EXTERNAL_MAX_QPS` | `5` | 出站 QPS |
| `TALENT_EXTERNAL_RUN_BUDGET_MS` | `600000` | 单批预算 |
| `TALENT_EXTERNAL_BREAKER_THRESHOLD` | `5` | 熔断阈值 |
| `TALENT_ALLOW_MOCK_SOURCES` | `0` | 仅生产演示；`1` 显式放行 Mock（危险开关） |

### 9.2 调度

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `TALENT_GENE_REPORT_SYNC_ENABLED` | `1` | 定时基因报告同步开关 |
| `TALENT_GENE_REPORT_SYNC_INTERVAL_MS` | `21600000`（6h） | 间隔；下限 10min |
| `TALENT_ADVICE_SYNC_ENABLED` | `1` | 定时建议检查开关 |
| `TALENT_ADVICE_SYNC_CHECK_INTERVAL_MS` | `86400000`（24h） | 检查间隔 |
| `TALENT_ADVICE_SYNC_LOOKAHEAD_DAYS` | `7` | 到期前提前量 |
| `TALENT_QUERY_TIMEOUT_HOURS` | `24` | M2 已有；M8 复用 |
| `TALENT_QUERY_SWEEP_INTERVAL_MS` | `600000` | M2 已有；M8 复用 |

### 9.3 PDF

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `TALENT_PDF_ENABLED` | `1` | 关闭时 C 端返回 `PDF_NOT_READY`（M7 前行为） |
| `TALENT_PDF_STORAGE` | `auto` | `auto` / `pocketbase` / `oss`；`auto` 跟随 `OSS_ENABLED` |
| `TALENT_PDF_FONT_PATH` | 内置 `server/assets/fonts/NotoSansSC-Regular.otf` | 字体文件绝对路径（可选） |
| `TALENT_PDF_TICKET_TTL_SECONDS` | `120` | 上限 300 |
| `TALENT_PUBLIC_API_BASE_URL` | — | H5 与 API 不同域时 ticket 绝对地址基址（https；留空则同源相对路径） |
| `TALENT_PDF_TICKET_ONE_TIME` | `0` | 一次性 ticket 开关 |
| `TALENT_PDF_MAX_CONCURRENCY` | `2` | 渲染并发 |
| `TALENT_PDF_QUEUE_LIMIT` | `8` | 排队上限 |
| `TALENT_PDF_RENDER_TIMEOUT_MS` | `15000` | 渲染超时 |
| `TALENT_PDF_MAX_BYTES` | `10485760`（10MB） | 产物上限 |
| `TALENT_PDF_WATERMARK_MOBILE` | `1` | 水印是否含手机尾号 |
| `TALENT_PDF_DOWNLOAD_LOG_RETENTION_DAYS` | `180` | 下载日志保留 |
| `TALENT_PDF_KEEP_VERSIONS` | `3` | 每册保留产物版本数 |

### 9.4 `env-check` 规则（实现时改 `server/plugins/env-check.ts`）

| 条件 | 行为 |
| --- | --- |
| 生产 + 任一 `TALENT_*_SOURCE=mock` 且 `TALENT_ALLOW_MOCK_SOURCES!=1` | **启动失败**（fail-fast），提示切换 `external` 或显式放行 |
| `external` + 缺基址/`APP_ID`/`API_SECRET` | **启动失败**（配置错误不能到运行时才炸） |
| `external` + 缺 `WEBHOOK_SECRET` | warn（不启用入站，仅出站） |
| `TALENT_PDF_ENABLED=1` + `TALENT_PDF_STORAGE=oss` 但 `OSS_ENABLED!=true` | **启动失败** |
| `TALENT_PDF_ENABLED=1` 且字体文件不存在 | **启动失败**（PDF 必需；关闭 PDF 时不检查） |
| `ENCRYPTION_KEY` 缺失 | 已有规则（required） |
| 旧 M2 提示「未接真实基因查询源」 | M8 接入后删除该提示（M2 §5.6 L655） |

---

## 10. 验收映射（AC-M8-01..16）

完整追溯、命令与证据表见 [acceptance.md](acceptance.md)。

| AC | 内容 | PRD/M 规格 | 本文落点 |
| --- | --- | --- | --- |
| AC-M8-01 | 真实源切换：`external` 生效、缺配置 503、生产 Mock fail-fast | PRD §13.1-2；M2 §5.6；M3 §9；M5 §9 | §3.10、§9.1、§9.4 |
| AC-M8-02 | 鉴权/签名：HMAC 正确、时间窗/重放拒绝、401 不重试、告警 | PRD §10.5；§3.2、§3.3 | §3.2、§4.7、§5.5 |
| AC-M8-03 | 基因报告一人一份 + 增量分册：重复同步不新建、books 全量、补发只追加 | BR-02/BR-05；M3 §4 | §4.2、§4.3 |
| AC-M8-04 | 失败重试/退避/限流/熔断：retryable 重试、permanent 不重试、429 尊重 Retry-After、熔断开合 | PRD §13.1-2；M3 C5 | §3.9、§4.4、§4.5 |
| AC-M8-05 | 同步日志：`trigger/status/scope/counts/details` 可查、无 PII | PRD §10.3；M3 §3.3 | §4.6、§5.5 |
| AC-M8-06 | 建议周期/新版本：周期窗口才接收、重复版本 409→noop、旧版归档、C 端切新版 | BR-07；M5 §4 | §5.1、§5.2 |
| AC-M8-07 | 建议失败处理：源不可用 503、单条失败不阻断、旧版保持生效 | M5 §9；PRD §13.1-2 | §5.3 |
| AC-M8-08 | PDF 六册来源：只读快照、改 M1 配置后 PDF 字节不变、未开放册不可渲染 | BR-03/BR-04；M3 §3.2；M7 §6.5 | §6.1、§6.6 |
| AC-M8-09 | 水印：每页含家长/手机尾号/报告编号/生成日期；无姓名身份证全号 | PRD §10.4；M7 D7 | §6.4 |
| AC-M8-10 | 时效 ticket/代理：无直链、120s 过期、撤回/越权后 ticket 也不可用 | PRD §10.4；M7 §6.5 | §6.8、§6.11 |
| AC-M8-11 | 下载留痕：成功/拒绝/渲染失败均记录；无明文 PII/完整 IP | PRD §10.3；M7 §6.5 | §6.9、§7.2 |
| AC-M8-12 | 私有存储：PB uploads 不可公开读、OSS 对象 private + 加密、代理可读 | PRD §10.4；QUALITY 发布清单 | §6.7 |
| AC-M8-13 | 发布/撤回/恢复/补发联动：撤回 409、恢复复用同产物、补发只新增册重渲 | BR-03/BR-05/BR-10；AC-ADM-06-2/3/4 | §6.10 |
| AC-M8-14 | 未发布/未开放/越权：404/409 口径与 M7 一致、不泄露存在性 | PRD §10.5；M7 §10.4 | §6.11 |
| AC-M8-15 | 权限/审计：状态接口按权限裁剪、入站 HMAC、C 端越权 404、后台无新增菜单/权限码 | PRD §10.1–10.3；M6 §2 | §8.4 |
| AC-M8-16 | 观测/告警：状态接口字段完整、阈值触发告警、冷却生效 | PRD §11；OPERATIONS §10 | §4.7、§5.5、§8.5 |

---

## 11. 测试命令与门禁（按 `docs/QUALITY.md`）

> M8 涉及**上传/外部接口/权限/跨端契约** → 按「schema / 认证 / 权限 / 上传」级：定向 Vitest + 真实 PocketBase 新库烟测 + OSS 沙箱 + 手工烟测；真实外部契约测试需提供方沙箱凭据，缺失时记为「未验证」而不是通过。

### 11.1 自动化（默认必跑）

| # | 命令 | 覆盖 |
| --- | --- | --- |
| 1 | `pnpm vitest run test/talent-external-adapter.test.ts` | canonical string 与 HMAC 向量、时间窗/nonce、错误分类、`Retry-After`、脱敏摘要、字段映射（M2/M3/M5 三接口）、缺配置 503 |
| 2 | `pnpm vitest run test/talent-external-sync.test.ts` | 定时/入站触发、锁互斥、逐人失败隔离、退避（fake timers）、熔断、告警阈值/冷却、同步日志字段、重复重放不重复写 |
| 3 | `pnpm vitest run test/talent-pdf-domain.test.ts` | 快照→文档模型、分页/孤行、水印文本与策略、contentHash 决定性（同输入同哈希/改配置不变）、未开放册拒绝、保留策略 |
| 4 | `pnpm vitest run test/talent-pdf-api.test.ts` | 路由清单、ticket 签名/过期/一次性、Bearer 与 ticket 双路径、409/404/503/429 码、响应头、无直链、下载留痕无 PII |
| 5 | `pnpm vitest run test/talent-integration-status.test.ts` | 状态接口按权限裁剪、字段无密钥/URL/PII、熔断/计时展示 |
| 6 | `pnpm typecheck` / `pnpm lint` | 类型与规范 |

### 11.2 契约测试（提供方沙箱，条件执行）

| # | 命令/步骤 | 覆盖 |
| --- | --- | --- |
| 7 | `TALENT_CONTRACT_BASE_URL=… TALENT_CONTRACT_APP_ID=… TALENT_CONTRACT_API_SECRET=… pnpm vitest run test/talent-integration-contract.test.ts` | 三类接口真实请求/响应映射、签名被接受、`found/empty/not_found`、分册编码、建议四段、错误码；未配置凭据时 `describe.skip` 并输出「未验证」 |
| 8 | 录制回放 | 用提供方沙箱响应落 fixture（脱敏），无凭据 CI 跑回放，保证适配层回归 |

### 11.3 新库与存储

| # | 命令/步骤 | 覆盖 |
| --- | --- | --- |
| 9 | `export POCKETBASE_DATA_DIR="$(mktemp -d /tmp/tongjia-m8-XXXXXX)" && pnpm env:doctor && pnpm env:setup` | 新库初始化；断言 `talent_report_pdfs` / `talent_pdf_downloads` 字段与索引齐全；旧集合/旧索引仍在 |
| 10 | `pnpm talent:sync`（连续两次） | 存量库幂等：两集合/索引只加一次；菜单/权限码不重复；旧 PDF 字段与旧集合结构不变 |
| 11 | OSS 沙箱：`OSS_ENABLED=true` + 测试 bucket | 上传后 `getACL` 为 `private`；未签名 GET 403；服务端签名 URL 60s 过期；代理能读取并解密；产物对象 key 不含 PII |
| 12 | PB 模式：`OSS_ENABLED=false` | `uploads` 记录 `purpose=talent-report-pdf`；匿名/普通用户 list/view 被拒；admin 代理可读 |
| 13 | 加密校验 | 存储对象/`uploads.file` 非 `%PDF` 明文头；用 `ENCRYPTION_KEY` 解密后是合法 PDF；错 key 不返回内容（500，不泄露） |

### 11.4 手工烟测（真实 PB + Nuxt）

| # | 步骤 | 覆盖 |
| --- | --- | --- |
| 14 | Mock 全链路：`TALENT_*_SOURCE=mock` + M3/M5 种子 → C 端下载分册 PDF | 六册、水印、页脚、文件名、`cache-control`；二次下载 `cacheHit` |
| 15 | 切换 `external`（沙箱）→ `POST /admin/talent/reports/sync` | 预演/确认、同步日志、无重复行；缺配置时 503 且无业务写入 |
| 16 | 建议：到期窗口内触发检查 → 新版生效、旧版归档、C 端切换；同期重复触发 noop | AC-M8-06 |
| 17 | 撤回/恢复/补发/重算：逐动作下载 | 撤回 409；恢复同字节；补发旧册缓存命中、新册新产物；重算产生新 hash |
| 18 | H5 新窗口 ticket：正常、过期、改 reportId/volumeId、撤回后使用 | 正常下载；过期/篡改 403/410；撤回后 409 |
| 19 | 越权/未登录/停用/解绑 | 404/401/403 与 M7 一致，无存在性泄露 |
| 20 | 入站签名：正确/错误/时间偏移/重放/超限 | 200/401/409/429；错误不进业务集合；告警与 `error_logs` |
| 21 | 生产配置演练（staging） | 生产 + mock → 启动失败；`external` 缺密钥 → 启动失败；`PDF_ENABLED=0` → C 端 404 `PDF_NOT_READY` |
| 22 | `git diff --check` | 空白错误；本任务只改 `docs/specs/M8-external/` 与 `docs/adr/` |

### 11.5 门禁判定

- 通过：AC-M8-01..16 全部有证据（命令/退出码/关键输出），且 1–6 全绿、9–10 通过；7/8/11 有沙箱证据；14–21 有手工记录。
- 未通过：任一 P0 项失败（外部源静默降级、PDF 直链泄露、明文 PII、撤回后仍可下载、OSS 公开读）。
- 未验证：提供方沙箱/OSS 凭据缺失导致 7/8/11 无法执行；必须在 acceptance 写阻塞原因，不得标通过。
- M9 项（性能/e2e/视觉）不在本门禁。

---

## 12. 实施顺序（8–10 人天）

1. **契约与类型（0.5d）**：`shared/types` 补 external 源配置/状态/PDF 类型；冻结本文 §3 canonical/错误映射；确认 M2/M3/M5 工厂切换点；`.env.example` 与 `env-check` 规则。
2. **传输层（1.5d）**：`talent-external-client.ts`（签名/时间窗/重试/退避/限流/熔断/脱敏摘要/告警钩子）+ 单测（`talent-external-adapter.test.ts`）。
3. **三个 external 适配器（1.5d）**：M2 查询提交 + 回执入口、M3 报告查询、M5 建议匹配；Mock 切换与缺配置 503；映射单测与 fixture 回放。
4. **同步编排（1d）**：`talent-integration-scheduler.ts`、入站触发路由、运行锁/去重、同步日志、状态接口；单测 `talent-external-sync.test.ts`。
5. **PDF 领域（2d）**：文档模型/分页/字体子集/水印/contentHash（纯函数）+ 单测；本地字体资产与许可证。
6. **PDF 存储与 API（1.5d）**：PB/OSS 加密存储、`talent_report_pdfs`/`talent_pdf_downloads`、seam 接入 M7 路由、ticket、下载留痕、清理任务；`talent-pdf-api.test.ts`。
7. **联调与沙箱（1.5d）**：新库初始化、`talent:sync` 幂等、OSS 沙箱、提供方契约沙箱、手工烟测 14–21。
8. **收口（0.5d）**：回滚开关演练、告警联调、文档同步（lead 派发）、acceptance 证据回填。

- 并行建议：2→3 先行（适配器可注入假 client）；5 可与 3/4 并行（纯函数不依赖外部）；6 依赖 5 与 M7 seam（M7 未合入时先按契约写 seam 并在测试中注入）。
- 若 M7 的 `volumes/:volumeId/pdf` 路由尚未落地：M8 先交付 seam 函数与单测，路由由 M7 按 §8.1 接入，不阻塞 M8 领域与存储验收。

---

## 13. 风险与处置

| # | 风险 | 处置 |
| --- | --- | --- |
| R1 | 提供方接口文档/字段未定稿（C1），适配层返工 | 映射集中一个文件 + fixture 回放；先按 §3 合同实现，差异只改映射；接口版本进 `TALENT_EXTERNAL_API_VERSION` |
| R2 | 生产误用 Mock，验收「看起来通过」 | 生产 + mock 启动失败；`TALENT_ALLOW_MOCK_SOURCES` 仅显式放行并每天告警；acceptance 记录源类型 |
| R3 | 签名时钟偏差/密钥错误导致全量失败 | 时间窗可配、双密钥轮换、401 立即 P1 告警、状态接口显示 `lastRun` |
| R4 | 外部限流/故障造成同步长时间停摆 | 熔断 + 下轮全量候选重试 + 手动触发；C 端读已发布快照不受影响（数据不丢） |
| R5 | 中文 PDF 字体缺失/体积过大/许可问题 | 随包 Noto Sans SC（OFL）+ 许可证；子集化；缺字告警；字体版本进哈希 |
| R6 | 渲染 CPU/内存被下载打满（DoS） | 进程内并发 2 + 队列 8 + 每用户下载限流 + 缓存命中；超限 503 而非拖垮进程 |
| R7 | ticket 泄露/重放 | 120s TTL、可选一次性、每次重新鉴权（撤回/停用立即失效）、代理不记查询串、`no-referrer` |
| R8 | 存储直链泄露或 bucket 误公开 | 只返回代理地址；OSS 逐对象 private；PB `purpose` 规则；启动/烟测断言；代理不 302 |
| R9 | `ENCRYPTION_KEY` 轮换导致旧 PDF 不可读 | 视为缓存失效按需重渲；不阻塞；OPERATIONS 记录密钥长期保存要求 |
| R10 | 产物/下载日志无限增长 | 每册保留最新 3 个 hash；下载日志 180 天；每日清理 + 用量告警 |
| R11 | 撤回后已缓存 PDF 仍被拿到 | 每次请求（含 ticket）重新校验报告/册/归属；缓存只影响是否重渲，不影响门禁 |
| R12 | 单实例假设被破坏（多进程） | 定时/锁/限流均为进程内；OPERATIONS 明确禁止 PM2 cluster；扩容另立任务 |
| R13 | 旧 `pdfUrl`/旧集合被误复用，混出新旧语义 | M8 新代码不读写旧字段；测试断言新代码无 `pdfUrl` 引用；M6 删除 |
| R14 | 补发/重算后旧册被误重渲（浪费/不一致） | contentHash 只含内容；旧册 hash 不变即复用；测试比对字节 |
| R15 | 入站接口被扫描/刷 | HMAC 先行、体积限制、限流、错误不返回细节；失败只落 `error_logs` 摘要 |
| R16 | M2/M3/M5 实现与规格差异（如函数名/文件） | 以冻结行为为准，实现时按实际文件接线；差异回写 spec 版本，不改契约 |

---

## 14. 回滚

| 层 | 开关/动作 | 效果 | 数据影响 |
| --- | --- | --- | --- |
| 外部源 | `TALENT_*_SOURCE=mock` + 重启（仅非生产） | 回到 Mock；真实行保留 | 不回滚已同步数据；Mock 只刷新未发布对象（测试环境） |
| 调度 | `TALENT_GENE_REPORT_SYNC_ENABLED=0` / `TALENT_ADVICE_SYNC_ENABLED=0` + 重启 | 停止定时拉取；手动入口仍可用 | 无 |
| 入站 | 移除 `TALENT_EXTERNAL_WEBHOOK_SECRET` + 重启 | 入站全部 401，出站不受影响 | 无 |
| PDF | `TALENT_PDF_ENABLED=0` + 重启 | C 端 PDF 回到 M7 的 `404 PDF_NOT_READY`；已生成产物保留不服务 | 无删除 |
| PDF 存储 | `TALENT_PDF_STORAGE=pocketbase` + 重启 | 不回退已有 OSS 产物（元数据记录 storage，仍可读）；新产物写 PB | 旧产物保留 |
| 代码 | 切上一个稳定 tag + `pnpm deploy:remote -- --no-db`（OPERATIONS §6） | 整体回退 | 新增集合/行保留，旧代码不读它们 |
| Schema | **不回滚**（只加不删） | 新增集合/索引保留 | 无破坏；旧库兼容 |

- 回滚顺序：先关 PDF → 再关调度 → 再切源/关入站 → 最后代码回滚；避免拉取到一半的残留（M3/M5 均有唯一键与补偿）。
- 回滚后必须验证：`GET /api/health?deep=1` 200；C 端分册页/PDF 入口返回预期 404 或可用；`talent_sync_logs` 不再新增 `auto`；旧报告页/旧 PDF 路由未受影响。
- 禁止：`git reset --hard`、删除 `pb_data/`、删除新集合、用 `env:setup` 覆盖存量库。

---

## 15. 未决项

| # | 未决项 | 现状 / 本文处理 | 需谁裁决 |
| --- | --- | --- | --- |
| C1 | 外部提供方接口文档、字段名、鉴权方式、错误码尚未提供 | 本文按 §3 合同冻结「我方要求」；对方差异只在适配层映射；沙箱联调前相关 AC 记「未验证」 | 客户 / 提供方 |
| C2 | 外部 `books` 编码是否就是 A–F、是否有「第 1 册」等变体 | M3 已按 A–F 冻结映射；适配层集中转换；客户如确认其他编码只改一处常量 | 客户（M3 C4 同源） |
| C3 | 水印是否必须含手机尾号（客户可能认为手机号敏感） | 默认含尾号 4 位；`TALENT_PDF_WATERMARK_MOBILE=0` 可关（姓名+报告编号+日期）；默认口径待客户确认 | 客户 / lead |
| C4 | 水印「时间」用生成日期还是每次下载时间 | 本文用**首次生成日期**以支持缓存；若客户要求下载时间，需改为每次重渲或叠加动态水印（成本另估） | 客户 |
| C5 | 建议周期内外部推送新批次是否要立即生效 | 本文按 4 个月周期 + 到期前 7 天窗口；周期内新批次不自动切版（M5 C5/C7 同口径）；如客户要求按批次即时换版需改 M5 版本规则 | 客户 / lead |
| C6 | PDF 产物与下载日志保留期/合规要求 | 默认产物每册 3 版、日志 180 天；客户/法务如要求更长/更短，改配置与清理任务 | 客户 / 法务 |
| C7 | 提供方是否支持 `Idempotency-Key` 与回执重试 | 不支持时由 M3/M5 唯一键兜底；回执重试由对方按 5 次退避；M8 不承诺对方幂等 | 提供方 |
| C8 | 告警通道（企业微信/飞书/邮件/短信） | 默认通用 webhook + `error_logs`；具体机器人地址由运维配置；不新增短信/邮件依赖 | 运维 / lead |
| C9 | 是否需要六册打包下载（PRD §9 偏差） | M7 已按分册定稿；M8 不做；客户如要求另立任务（聚合渲染 + 单文件） | 客户 / lead |
| C10 | 生产是否允许「值班期临时 Mock」演示 | 默认禁止（启动失败）；如确有演示环境，必须独立 `NODE_ENV`/数据库并显式 `TALENT_ALLOW_MOCK_SOURCES=1` | lead / 运维 |
| C11 | 多实例/分布式调度/外部队列 | 单实例硬边界内不实现；扩容前置改造见 OPERATIONS §13 | lead / 后续里程碑 |

---

## 16. 文档同步清单（M8 出口，由 lead 派发，不在本任务写范围）

- `docs/API.md`：新增 5 条路由（PDF ticket、集成状态、3 条入站）；PDF 代理标注「M8 真实文件」；旧 `/api/client/talent/reports/:id/pdf` 标注「M6 删除」。
- `docs/ARCHITECTURE.md`：新增 `talent_report_pdfs` / `talent_pdf_downloads`；数据流补「外部源 → 同步编排 → PDF 渲染 → 私有存储 → 权限代理」；明确不回填 `configs`。
- `docs/STATUS.md`：外部源切换状态、PDF 存储模式、告警通道、已知未决（C1/C3/C5）。
- `docs/OPERATIONS.md`：外部源配置/切换/密钥轮换/回滚、PDF 存储与清理、告警阈值、ticket 代理日志脱敏、`ENCRYPTION_KEY` 与 PDF 的关系。
- `docs/TALENT-LOCAL.md`：Mock/沙箱模式、`pnpm talent:pdf:warm`、C 端 PDF 烟测步骤。
- `docs/specs/README.md`：M8 索引与 ADR 0008 登记。
- `docs/specs/M8-external/acceptance.md`：verifier 回填证据；未验证项写明阻塞原因。