/**
 * @description M8 PDF 渲染配置与统一错误口径（env 只读；不含业务数据）。
 *   配置项见 docs/specs/M8-external/spec.md §9.3；错误码见 §6.11/§8.5。
 *   关闭 PDF（`TALENT_PDF_ENABLED=0`）时保持 M7 行为：C 端得到 404 `PDF_NOT_READY`。
 * @file server/utils/talent-pdf-config.ts
 */
import { createError } from "h3";
import { createHmac, createHash } from "node:crypto";
import { isOssEnabled } from "./oss-config";
import type { TalentPdfStorage, TalentPdfUaFamily, TalentPdfWatermarkPolicy } from "~~/shared/types/talent-pdf";

/** 版面模板版本：布局变更必须递增，否则旧缓存不会失效（ADR 0008-D3）。 */
export const TALENT_PDF_TEMPLATE_VERSION = "m8-template-1";

/** 封面主标题与系列口径（PRD §7.4；不含对象姓名 / 证件 / 手机号）。 */
export const TALENT_PDF_REPORT_TITLE = "个性化能力培育开发基因服务报告";
export const TALENT_PDF_REPORT_SERIES = "天赋基因分册";
export const TALENT_PDF_FOOTER_NOTICE = "本文件仅供报告对象家庭查阅";

/** 默认单册上限（§6.2/§6.5；超过即失败，不截断内容）。 */
export const TALENT_PDF_DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
export const TALENT_PDF_MAX_PAGES = 200;

/** 渲染超时（§6.6 15s 口径）。 */
export const TALENT_PDF_DEFAULT_RENDER_TIMEOUT_MS = 15_000;

/** PDF 错误码（`data.code`；HTTP 状态按 §6.11）。 */
export type TalentPdfErrorCode =
  | "PDF_NOT_READY"
  | "PDF_RENDER_FAILED"
  | "PDF_RENDER_TIMEOUT"
  | "PDF_RENDER_BUSY"
  | "PDF_TICKET_INVALID"
  | "PDF_TICKET_EXPIRED"
  | "PDF_DOWNLOAD_LIMIT"
  | "VOLUME_NOT_FOUND";

function envFlag(name: string, defaultValue: boolean): boolean {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return defaultValue;
  if (["0", "false", "no", "off"].includes(value)) return false;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  return defaultValue;
}

function envInt(name: string, defaultValue: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(process.env[name] ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.min(max, Math.max(min, parsed));
}

/** 渲染总开关；关闭时 C 端按 M7 口径返回 404 `PDF_NOT_READY`。 */
export function isTalentPdfEnabled(): boolean {
  return envFlag("TALENT_PDF_ENABLED", true);
}

/** `TALENT_PDF_STORAGE=auto` 跟随 `OSS_ENABLED`（§6.7）。 */
export function resolveTalentPdfStorage(): TalentPdfStorage {
  const configured = String(process.env.TALENT_PDF_STORAGE ?? "auto").trim().toLowerCase();
  if (configured === "oss") {
    if (!isOssEnabled())
      throw new Error("TALENT_PDF_STORAGE=oss 但 OSS 未开启；请配置 OSS 或改用 pocketbase");
    return "oss";
  }
  if (configured === "pocketbase") return "pocketbase";
  return isOssEnabled() ? "oss" : "pocketbase";
}

/** 字体文件覆盖路径（可选；未设置时按仓库 / 系统候选解析）。 */
export function talentPdfFontPathOverride(): string {
  return String(process.env.TALENT_PDF_FONT_PATH ?? "").trim();
}

export function talentPdfFontBoldPathOverride(): string {
  return String(process.env.TALENT_PDF_FONT_BOLD_PATH ?? "").trim();
}

/** 120s HMAC ticket；上限 300s（§6.8）。 */
export function talentPdfTicketTtlSeconds(): number {
  return envInt("TALENT_PDF_TICKET_TTL_SECONDS", 120, 30, 300);
}

export function isTalentPdfTicketOneTime(): boolean {
  return envFlag("TALENT_PDF_TICKET_ONE_TIME", false);
}

/** 水印是否含手机尾号 4 位（默认 1；关闭后策略与身份哈希变化 → 新产物）。 */
export function talentPdfWatermarkMobileEnabled(): boolean {
  return envFlag("TALENT_PDF_WATERMARK_MOBILE", true);
}

export function talentPdfWatermarkPolicy(): TalentPdfWatermarkPolicy {
  return talentPdfWatermarkMobileEnabled()
    ? "name+mobile4+reportNo+date"
    : "name+reportNo+date";
}

export function talentPdfMaxConcurrency(): number {
  return envInt("TALENT_PDF_MAX_CONCURRENCY", 2, 1, 8);
}

export function talentPdfQueueLimit(): number {
  return envInt("TALENT_PDF_QUEUE_LIMIT", 8, 1, 32);
}

export function talentPdfMaxBytes(): number {
  return envInt("TALENT_PDF_MAX_BYTES", TALENT_PDF_DEFAULT_MAX_BYTES, 1024, TALENT_PDF_DEFAULT_MAX_BYTES);
}

export function talentPdfRenderTimeoutMs(): number {
  return envInt("TALENT_PDF_RENDER_TIMEOUT_MS", TALENT_PDF_DEFAULT_RENDER_TIMEOUT_MS, 1_000, 120_000);
}

/** 下载留痕保留天数（清理任务不在 M8-A 范围，只作为配置口径暴露）。 */
export function talentPdfDownloadRetentionDays(): number {
  return envInt("TALENT_PDF_DOWNLOAD_LOG_RETENTION_DAYS", 180, 1, 3650);
}

/** 生产 H5 与 API 不同域时用于拼 ticket 绝对地址；禁止信任请求 Host/Origin（§6.8）。 */
export function talentPublicApiBaseUrl(): string {
  return String(process.env.TALENT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
}

/** 统一 PDF 错误：`data.code` 供 C 端区分文案，消息不含堆栈 / 存储地址 / 密钥。 */
export function talentPdfError(
  code: TalentPdfErrorCode,
  statusCode: number,
  message: string,
  extra: Record<string, unknown> = {},
) {
  return createError({ statusCode, message, data: { code, ...extra } });
}

/** 未发布 / 未开放 / 渲染关闭统一下发 404 `PDF_NOT_READY`（M7 兼容文案）。 */
export function talentPdfNotReady(): ReturnType<typeof talentPdfError> {
  return talentPdfError("PDF_NOT_READY", 404, "本册 PDF 暂不可下载");
}

export function talentPdfRenderFailed(reason: string): ReturnType<typeof talentPdfError> {
  return talentPdfError("PDF_RENDER_FAILED", 503, "文件下载失败，请重试", { reason });
}

/** 字体缺失是部署配置问题：给出明确可操作错误，不伪造字体、不静默生成空白 PDF。 */
export function talentPdfFontUnavailable(): ReturnType<typeof talentPdfError> {
  return talentPdfError(
    "PDF_RENDER_FAILED",
    503,
    "PDF 渲染字体不可用，请联系管理员配置 TALENT_PDF_FONT_PATH 中文字体",
    { reason: "font_missing" },
  );
}

export function talentPdfRenderTimeout(): ReturnType<typeof talentPdfError> {
  return talentPdfError("PDF_RENDER_TIMEOUT", 503, "文件下载失败，请重试");
}

export function talentPdfRenderBusy(): ReturnType<typeof talentPdfError> {
  return talentPdfError("PDF_RENDER_BUSY", 503, "文件下载失败，请稍后重试", { retryAfter: 5 });
}

export function talentPdfTicketInvalid(): ReturnType<typeof talentPdfError> {
  return talentPdfError("PDF_TICKET_INVALID", 403, "下载链接无效，请重新点击下载");
}

export function talentPdfTicketExpired(): ReturnType<typeof talentPdfError> {
  return talentPdfError("PDF_TICKET_EXPIRED", 410, "下载链接已过期，请重新点击下载");
}

export function talentPdfDownloadLimit(): ReturnType<typeof talentPdfError> {
  return talentPdfError("PDF_DOWNLOAD_LIMIT", 429, "下载过于频繁，请稍后重试", { retryAfter: 60 });
}

export function talentPdfVolumeNotFound(): ReturnType<typeof talentPdfError> {
  return talentPdfError("VOLUME_NOT_FOUND", 404, "分册不存在或未开放");
}

/** 下载留痕用的 HMAC 摘要（不存 IP / UA 原文）。 */
export function hashTalentPdfPrivacyValue(scope: string, value: string): string {
  const key = String(process.env.ENCRYPTION_KEY ?? "").trim();
  if (!key) throw new Error("缺少 ENCRYPTION_KEY，无法写入 PDF 下载留痕");
  return createHmac("sha256", key).update(`${scope}:${value}`).digest("hex");
}

/** 截图 / 留痕去重用匿名指纹（不含明文）。 */
export function hashTalentPdfValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** 只记录 UA 家族枚举，不存原文。 */
export function detectTalentPdfUaFamily(userAgent: string | null | undefined): TalentPdfUaFamily {
  const ua = String(userAgent ?? "").toLowerCase();
  if (!ua) return "unknown";
  if (/miniprogram|micromessenger|wechat/.test(ua)) return "mp";
  if (/iphone|ipad|ipod|ios/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/mozilla|chrome|safari|firefox/.test(ua)) return "h5";
  return "unknown";
}