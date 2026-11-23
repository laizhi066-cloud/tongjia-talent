/**
 * @description M8 PDF 产物与下载留痕共享类型：`talent_report_pdfs` 元数据、
 *   `talent_pdf_downloads` 下载留痕、存储模式 / 水印策略 / 结果码常量。
 *   只放无 PII 的元数据口径；水印明文、姓名、手机号、证件、存储直链一律不进集合与响应
 *   （docs/specs/M8-external/spec.md §6/§7、ADR 0008-D4/D5）。
 * @file shared/types/talent-pdf.ts
 */

import type { TalentReportVolumeId } from "./talent-report";

/** 集合名常量（避免散落字符串）。 */
export const TALENT_REPORT_PDF_COLLECTION = "talent_report_pdfs";
export const TALENT_PDF_DOWNLOAD_COLLECTION = "talent_pdf_downloads";

/** 产物存储模式：默认 PocketBase 私有 uploads，可选 OSS 私有对象。 */
export const TALENT_PDF_STORAGES = ["pocketbase", "oss"] as const;
export type TalentPdfStorage = (typeof TALENT_PDF_STORAGES)[number];

/**
 * 水印策略：`name+mobile4+reportNo+date` / `name+reportNo+date`。
 * 手机尾号开关（`TALENT_PDF_WATERMARK_MOBILE`）切换时策略与身份哈希同时变化 → 新产物。
 */
export const TALENT_PDF_WATERMARK_POLICIES = [
  "name+mobile4+reportNo+date",
  "name+reportNo+date",
] as const;
export type TalentPdfWatermarkPolicy =
  (typeof TALENT_PDF_WATERMARK_POLICIES)[number];

/** 下载留痕结果码（§6.9/§7.2；不含 PII）。 */
export const TALENT_PDF_DOWNLOAD_RESULTS = [
  "ok",
  "report_not_published",
  "not_open",
  "forbidden",
  "not_ready",
  "render_failed",
  "ticket_invalid",
  "ticket_expired",
  "rate_limited",
] as const;
export type TalentPdfDownloadResult =
  (typeof TALENT_PDF_DOWNLOAD_RESULTS)[number];

/** UA 家族（只存枚举，不存原文）。 */
export const TALENT_PDF_UA_FAMILIES = [
  "mp",
  "ios",
  "android",
  "h5",
  "unknown",
] as const;
export type TalentPdfUaFamily = (typeof TALENT_PDF_UA_FAMILIES)[number];

/** 报告 PDF 产物元数据（`talent_report_pdfs`，只存无 PII 的索引与指纹）。 */
export interface TalentReportPdfRecord {
  id: string;
  created: string;
  updated: string;
  reportId: string;
  volumeId: TalentReportVolumeId | string;
  /** 渲染输入哈希（不含 PII 原文）。 */
  contentHash: string;
  /** 渲染时的报告快照版本（只追溯，不参与 contentHash）。 */
  snapshotVersion: number;
  storage: TalentPdfStorage;
  /** PB uploads 记录 id 或 `oss1.{base64url}` 编码；不含 PII。 */
  objectKey: string;
  /** 下载文件名（报告编号 + 册名）。 */
  fileName: string;
  /** 解密后 PDF 字节数。 */
  byteSize: number;
  pageCount: number;
  templateVersion: string;
  fontVersion: string;
  watermarkPolicy: TalentPdfWatermarkPolicy;
  /** 首次渲染日期（水印时间，`YYYY-MM-DD` 或 PB date 字符串）。 */
  watermarkAt: string;
  /** 实际渲染完成时间（审计用）。 */
  renderedAt: string;
}

/** 下载留痕（`talent_pdf_downloads`，无姓名 / 手机号 / 证件 / 完整 IP / UA 原文）。 */
export interface TalentPdfDownloadRecord {
  id: string;
  created: string;
  updated: string;
  reportId: string;
  volumeId: TalentReportVolumeId | string;
  /** 中性账户 users id。 */
  parentUserId: string;
  subjectType: string;
  subjectId: string;
  result: TalentPdfDownloadResult;
  storage: TalentPdfStorage | "";
  contentHash: string;
  /** 本次渲染耗时；缓存命中为 0。 */
  renderMs: number;
  cacheHit: boolean;
  /** 下载/尝试时间（UTC ISO）。 */
  at: string;
  /** HMAC 摘要，不存 IP。 */
  ipHash: string;
  uaFamily: TalentPdfUaFamily;
  requestId: string;
}