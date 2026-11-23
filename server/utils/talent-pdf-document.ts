/**
 * @description M8 PDF 文档模型与内容哈希：报告冻结快照 → 封面 / 目录 / 章节要素块 →
 *   水印文本；contentHash 只覆盖稳定输入（不含 watermarkAt 日期、不含 snapshotVersion），
 *   保证「同输入同哈希、重复下载不重渲」，撤回恢复 / 补发旧册命中缓存
 *   （docs/specs/M8-external/spec.md §6.2/§6.4/§6.6、ADR 0008-D4/D5）。
 * @file server/utils/talent-pdf-document.ts
 */
import { createHash } from "node:crypto";
import type {
  TalentReportFactorSnapshotItem,
  TalentReportRecord,
  TalentReportVolumeSnapshot,
} from "~~/shared/types/talent-report";
import type { TalentPdfWatermarkPolicy } from "~~/shared/types/talent-pdf";
import { TALENT_PDF_REPORT_SERIES, TALENT_PDF_REPORT_TITLE } from "./talent-pdf-config";

/** 报告对象展示信息（只来自冻结快照 / 只读基因报告，不用于水印以外的持久化）。 */
export interface TalentPdfSubjectInfo {
  name: string;
  genderLabel: string;
  age: number;
}

/** 水印身份（只在内存中拼装水印文本，不写集合 / 日志 / 文件名）。 */
export interface TalentPdfWatermarkInfo {
  parentName: string;
  /** 脱敏手机号后 4 位；缺失为空串。 */
  mobileLast4: string;
  reportNo: string;
  /** 首次渲染日期 `YYYY-MM-DD`（写入 `watermarkAt`，不是每次下载时间）。 */
  watermarkAt: string;
}

export interface TalentPdfFactorBlock {
  title: string;
  /** 数据熵标签（分级展示名，不展示内部编码）。 */
  tag: string;
  /** 固定注解 / 适用条件等纯文本段落。 */
  paragraphs: string[];
}

export interface TalentPdfChapter {
  title: string;
  blocks: TalentPdfFactorBlock[];
}

/** 渲染器消费的纯文本文档模型（不含 pdf-lib 类型，便于单测与黄金测试）。 */
export interface TalentPdfDocumentModel {
  title: string;
  volumeName: string;
  seriesLabel: string;
  subjectName: string;
  subjectMeta: string;
  reportNo: string;
  publishedDate: string;
  /** 每页平铺水印文本（`{家长姓名} · {手机尾号} · {报告编号} · {生成日期}`）。 */
  watermarkText: string;
  /** 页脚第二行：报告编号 + 生成日期。 */
  footerLine: string;
  chapters: TalentPdfChapter[];
}

export interface TalentPdfDocumentInput {
  report: Pick<
    TalentReportRecord,
    "id" | "reportNo" | "publishedAt" | "snapshotAt" | "snapshotVersion" | "volumeSnapshot"
  >;
  volume: TalentReportVolumeSnapshot;
  factorSnapshot: TalentReportFactorSnapshotItem[];
  subject: TalentPdfSubjectInfo | null;
  watermark: TalentPdfWatermarkInfo;
  watermarkPolicy: TalentPdfWatermarkPolicy;
}

function datePart(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? "").trim());
  return match?.[1] ?? "";
}

/** 稳定序列化：对象键递归排序，保证同一输入哈希稳定。 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** 水印身份哈希：家长姓名 +（可选）手机尾号 + 报告编号；不含明文进集合。 */
export function computeTalentPdfWatermarkIdentityHash(input: {
  policy: TalentPdfWatermarkPolicy;
  parentName: string;
  mobileLast4: string;
  reportNo: string;
}): string {
  const identity = [
    `policy=${input.policy}`,
    `name=${input.parentName}`,
    input.policy === "name+mobile4+reportNo+date" ? `mobile4=${input.mobileLast4}` : "mobile4=",
    `reportNo=${input.reportNo}`,
  ].join("|");
  return sha256Hex(identity);
}

/** 本册快照内容哈希（只取本册，不取整个六册数组）。 */
export function computeTalentPdfVolumeContentHash(volume: TalentReportVolumeSnapshot): string {
  return sha256Hex(stableStringify(volume));
}

/** 本册要素子集哈希（按 code 过滤 + 排序后计算；condition/score 变化会失效）。 */
export function computeTalentPdfFactorContentHash(
  factorSnapshot: TalentReportFactorSnapshotItem[],
  volumeId: string,
): string {
  const subset = (Array.isArray(factorSnapshot) ? factorSnapshot : [])
    .filter((item) => String(item?.volumeId ?? "") === volumeId)
    .slice()
    .sort((left, right) => String(left.code ?? "").localeCompare(String(right.code ?? "")));
  return sha256Hex(stableStringify(subset));
}

/**
 * contentHash = sha256(reportId, volumeId, 本册快照哈希, 本册要素哈希, 对象展示名,
 * 水印身份哈希, 水印策略, templateVersion, fontVersion)。
 * 不含 `snapshotVersion` 与 `watermarkAt`（§6.6）。
 */
export function computeTalentPdfContentHash(input: {
  reportId: string;
  volumeId: string;
  volumeSnapshot: TalentReportVolumeSnapshot;
  factorSnapshot: TalentReportFactorSnapshotItem[];
  subjectDisplayName: string;
  watermarkIdentityHash: string;
  watermarkPolicy: TalentPdfWatermarkPolicy;
  templateVersion: string;
  fontVersion: string;
}): string {
  return sha256Hex(
    stableStringify({
      reportId: input.reportId,
      volumeId: input.volumeId,
      volumeContentHash: computeTalentPdfVolumeContentHash(input.volumeSnapshot),
      factorContentHash: computeTalentPdfFactorContentHash(input.factorSnapshot, input.volumeId),
      subjectDisplayName: input.subjectDisplayName,
      watermarkIdentityHash: input.watermarkIdentityHash,
      watermarkPolicy: input.watermarkPolicy,
      templateVersion: input.templateVersion,
      fontVersion: input.fontVersion,
    }),
  );
}

/** 水印文本：按策略拼接；缺失段省略，不写空占位（§6.4）。 */
export function composeTalentPdfWatermarkText(
  watermark: TalentPdfWatermarkInfo,
  policy: TalentPdfWatermarkPolicy,
): string {
  const parts = [
    String(watermark.parentName ?? "").trim(),
    policy === "name+mobile4+reportNo+date" ? String(watermark.mobileLast4 ?? "").trim() : "",
    String(watermark.reportNo ?? "").trim(),
    String(watermark.watermarkAt ?? "").trim(),
  ].filter(Boolean);
  return parts.join(" · ");
}

/** 下载文件名 `{reportNo}-{册名}.pdf`，只含编号与册名，不含对象姓名 / 证件（§6.5）。 */
export function talentPdfFileName(reportNo: string, volumeName: string): string {
  const raw = `${String(reportNo ?? "").trim() || "report"}-${String(volumeName ?? "").trim() || "分册"}.pdf`;
  const safe = [...raw]
    .map((char) => (/[\\/:*?"<>|]/.test(char) || char.charCodeAt(0) < 32 ? "_" : char))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return safe.slice(0, 120) || "report.pdf";
}

/** 冻结快照 → 文档模型（章 / 要素块 / 封面 / 水印）；不含方向与培育建议（§6.1）。 */
export function buildTalentPdfDocumentModel(input: TalentPdfDocumentInput): TalentPdfDocumentModel {
  const volume = input.volume;
  const factorByCode = new Map<string, TalentReportFactorSnapshotItem>();
  for (const factor of Array.isArray(input.factorSnapshot) ? input.factorSnapshot : []) {
    const code = String(factor?.code ?? "").trim();
    if (code) factorByCode.set(code, factor);
  }

  const chapters: TalentPdfChapter[] = (Array.isArray(volume.chapters) ? volume.chapters : []).map((chapter) => {
    const title = String(chapter?.chapter ?? "").trim() || "未命名章节";
    const blocks: TalentPdfFactorBlock[] = (Array.isArray(chapter?.factors) ? chapter.factors : []).map((factor) => {
      const detail = factorByCode.get(String(factor?.code ?? "").trim());
      const paragraphs: string[] = [];
      const note = String(factor?.note ?? "").trim();
      paragraphs.push(note || "暂无固定注解");
      const condition = String(detail?.condition ?? "").trim();
      if (condition) paragraphs.push(`适用条件：${condition}`);
      return {
        title: String(factor?.name ?? "").trim() || "未命名要素",
        tag: String(factor?.levelName ?? "").trim(),
        paragraphs,
      };
    });
    return { title, blocks };
  });

  const subject = input.subject;
  const subjectName = String(subject?.name ?? "").trim();
  const subjectMeta = [
    String(subject?.genderLabel ?? "").trim(),
    Number(subject?.age ?? 0) > 0 ? `${Number(subject?.age)} 岁` : "",
  ].filter(Boolean).join(" · ");

  const reportNo = String(input.report.reportNo ?? "").trim();
  const publishedDate = datePart(String(input.report.publishedAt ?? "")) || datePart(String(input.report.snapshotAt ?? ""));
  const sortOrder = Number(volume.sortOrder ?? 0) || 0;

  return {
    title: TALENT_PDF_REPORT_TITLE,
    volumeName: String(volume.name ?? "").trim() || "分册",
    seriesLabel: sortOrder > 0 ? `${TALENT_PDF_REPORT_SERIES} · 第 ${sortOrder} 分册` : TALENT_PDF_REPORT_SERIES,
    subjectName,
    subjectMeta,
    reportNo,
    publishedDate,
    watermarkText: composeTalentPdfWatermarkText(input.watermark, input.watermarkPolicy),
    footerLine: [reportNo ? `报告编号 ${reportNo}` : "", String(input.watermark.watermarkAt ?? "").trim() ? `生成于 ${String(input.watermark.watermarkAt).trim()}` : ""]
      .filter(Boolean)
      .join(" · "),
    chapters,
  };
}

/** 文档模型是否可渲染（空册不生成 PDF，API 返回 `PDF_NOT_READY`）。 */
export function isTalentPdfDocumentRenderable(model: TalentPdfDocumentModel): boolean {
  return model.chapters.some((chapter) => chapter.blocks.length > 0);
}