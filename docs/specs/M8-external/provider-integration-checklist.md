# M8 外部接口接入清单（待供应商/客户提供）

> 状态：**代码骨架已完成，真实联调待资料与凭据**。本清单只列「需要对方给什么」和「拿到后我方做什么」，不包含任何真实密钥。
> 关联：[M8 规格](spec.md)、[ADR 0008](../../adr/0008-m8-integration-pdf.md)、`.env.example`。

## 1. 当前已具备

- M3 基因报告源适配器：`TALENT_GENE_REPORT_SOURCE=mock|external`，external 缺配置显式 503，不静默降级。
- M5 培育建议源适配器：`TALENT_ADVICE_SOURCE=mock|external`。
- M2 查询回执入站：`POST /api/integrations/talent/gene-query/receipts`，签名/时间窗/nonce/幂等。
- 入站触发：`POST /api/integrations/talent/gene-reports/sync`、`/advice/sync`；别名 `/api/integration/talent/*/notify`。
- 出站适配器：HMAC canonical（method/path/timestamp/nonce/bodyHash）、±skew、nonce 重放缓存、幂等键、超时/5xx 重试退避、429 Retry-After、熔断、限流、告警钩子。
- PDF：六册渲染、水印、contentHash 缓存、私有存储、120s ticket、下载留痕；字体已随仓（Noto Sans SC，OFL）。
- 集成状态：`GET /api/admin/talent/integrations/status`（按权限裁剪，不返回密钥/PII）。

## 2. 需要供应商/客户提供

### 2.1 基因报告查询/回传

| 项 | 必填 | 说明 |
| --- | --- | --- |
| 环境地址 | 是 | 测试/生产 base URL；是否要求 IP 白名单 |
| 鉴权方式 | 是 | HMAC-SHA256 的 keyId/secret、canonical 串格式；或 OAuth2 client credentials |
| 查询接口 | 是 | 按 `idNo/姓名+周岁` 查询的 method/path/参数/返回样例 |
| 回执接口 | 是 | 外部回调我方地址、签名头、重试策略、幂等键 |
| 报告字段 | 是 | reportNo、books（是否 A–F）、sections（bookCode/chapter/factorCode/levelCode/score/condition）样例 |
| 分级编码 | 是 | 外部 LV1–LV4 与内部常态/优良/优秀/卓越的映射；外部编码是否确为 A–F |
| 错误码 | 是 | 业务错误码/限流码/重复请求码语义 |
| SLA | 否 | 查询超时、出报告时长、可用性 |

### 2.2 培育建议

| 项 | 必填 | 说明 |
| --- | --- | --- |
| 推送/拉取方式 | 是 | 周期推送还是按报告拉取；周期（默认 4 个月） |
| 版本字段 | 是 | versionNo/effectiveAt/nextUpdateAt 语义 |
| 分册/章节/四段 | 是 | content/example/direction/suggestion 样例与长度 |
| 幂等键 | 是 | 重复版本如何识别 |
| 撤回/作废 | 是 | 外部是否支持撤回；与 M3 报告撤回的联动口径 |

### 2.3 OSS

| 项 | 必填 | 说明 |
| --- | --- | --- |
| Bucket/Region/Endpoint | 是 | 私有 bucket；是否开启版本/加密 |
| AccessKey/RAM | 是 | 只允许 Put/Get/Delete 指定前缀；建议 STS 临时凭据 |
| 生命周期 | 是 | PDF 缓存保留期、下载日志保留期（当前默认 180 天） |
| 跨域/直链 | 是 | 不下发直链；仅服务端代理/签名 ticket |

## 3. 拿到资料后我方执行

1. 只改 `server/utils/talent-external-sources.ts` 的字段映射与 canonical，不改 M2/M3/M5 内部语义。
2. 在隔离 PB + 测试 base URL 跑契约测试：成功/超时/5xx/签名错/重放/重复/限流/熔断。
3. 开启 `TALENT_GENE_REPORT_SOURCE=external` / `TALENT_ADVICE_SOURCE=external`，跑 M9 E2E 06–10 + M8 验收。
4. OSS 开启后跑 PDF 冷/热、缓存命中、下载留痕、密钥轮换失效重渲。
5. 生产前完成：密钥去跟踪与轮换、备份恢复演练、告警演练、客户差异签字。

## 4. 环境键（只列键名，值由部署注入）

```text
TALENT_GENE_REPORT_SOURCE=external
TALENT_GENE_REPORT_BASE_URL=
TALENT_GENE_REPORT_KEY_ID=
TALENT_GENE_REPORT_SECRET=
TALENT_ADVICE_SOURCE=external
TALENT_ADVICE_BASE_URL=
TALENT_ADVICE_KEY_ID=
TALENT_ADVICE_SECRET=
TALENT_EXTERNAL_WEBHOOK_SECRET=
TALENT_PDF_FONT_PATH=server/assets/fonts/NotoSansSC-Regular.otf
TALENT_PDF_STORAGE=pb|oss
OSS_ENABLED=false
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=
OSS_REGION=
```

> 当前未提供上述资料，因此 `external` 源保持不可用（503），不会伪造报告/建议；开发/演示继续用 Mock 源。
