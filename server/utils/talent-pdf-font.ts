/**
 * @description M8 PDF 字体解析：`TALENT_PDF_FONT_PATH` → `server/assets/fonts/`（字体不入 Git，
 *   用 `pnpm fonts:fetch` 下载）→ 常见系统 Noto / 兼容中文字体。字体缺失或字体不含中文时给出明确错误，不伪造、不静默降级
 *   （docs/specs/M8-external/spec.md §6.3、ADR 0008-D3）。
 *   字体版本号取字体文件 SHA-256 前 16 位并参与 contentHash：升级字体后自动重渲，旧产物保留到清理。
 * @file server/utils/talent-pdf-font.ts
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { talentPdfFontBoldPathOverride, talentPdfFontPathOverride } from "./talent-pdf-config";

/** 字体缺失 / 不可用：服务层映射为明确错误，不伪造字体、不回落空白 PDF。 */
export class TalentPdfFontUnavailableError extends Error {
  readonly reasons: string[];
  constructor(message: string, reasons: string[] = []) {
    super(message);
    this.name = "TalentPdfFontUnavailableError";
    this.reasons = reasons;
  }
}

export interface TalentPdfFontBundle {
  regular: Uint8Array;
  bold: Uint8Array;
  /** 没有独立粗体时为 true（同一字体文件，不伪造字重）。 */
  boldIsSynthetic: boolean;
  /** `f-<sha256 前 16 位>`；进 contentHash。 */
  fontVersion: string;
  /** 实际字体来源（只用于服务端日志，不下发 C 端）。 */
  source: string;
  hasGlyph(codePoint: number): boolean;
}

/** 中文覆盖自检码点：报告标题、六册册名、常用标点与数字。 */
const REQUIRED_SAMPLE = "同佳天赋报告生长发育智商情商领导商艺术商体育运动商0-·（）";

/** 本地字体目录（字体本体不入 Git，缺失时执行 `pnpm fonts:fetch`；再回落到系统字体）。 */
const REPO_FONT_CANDIDATES = [
  "server/assets/fonts/NotoSansSC-Regular.otf",
  "server/assets/fonts/NotoSansSC-Regular.ttf",
  "server/assets/fonts/NotoSansCJKsc-Regular.otf",
  "server/assets/fonts/NotoSansSC-Bold.otf",
];

/** 系统字体候选：优先 Noto Sans CJK，再退到自带中文字形的 TTF/OTF（TTC 不被 pdf-lib 支持）。 */
const SYSTEM_FONT_CANDIDATES = [
  "/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.otf",
  "/usr/share/fonts/opentype/noto/NotoSansSC-Regular.otf",
  "/usr/share/fonts/truetype/noto/NotoSansCJKsc-Regular.ttf",
  "/usr/share/fonts/truetype/noto/NotoSansSC-Regular.ttf",
  "/usr/share/fonts/truetype/arphic/ukai.ttf",
  "/usr/share/fonts/truetype/arphic/uming.ttf",
  "/Library/Fonts/Arial Unicode.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  "/System/Library/Fonts/Supplemental/Songti.ttf",
];

/** 粗体候选（缺失时用常规字体，不伪造字重）。 */
const BOLD_FONT_CANDIDATES = [
  "server/assets/fonts/NotoSansSC-Bold.otf",
  "server/assets/fonts/NotoSansCJKsc-Bold.otf",
  "/usr/share/fonts/opentype/noto/NotoSansCJKsc-Bold.otf",
  "/usr/share/fonts/opentype/noto/NotoSansSC-Bold.otf",
];

function isTrueTypeCollection(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x74 &&
    bytes[1] === 0x74 &&
    bytes[2] === 0x63 &&
    bytes[3] === 0x66
  );
}

function isSupportedFontMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  // OTTO（CFF OpenType）/ TrueType 0x00010000 / `true` / `typ1`
  const magic = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0);
  return magic === "OTTO" || magic === "true" || magic === "typ1" || (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0);
}

interface LoadedFont {
  bytes: Uint8Array;
  hasGlyph(codePoint: number): boolean;
}

function loadFontFile(path: string): LoadedFont {
  const bytes = readFileSync(path);
  if (isTrueTypeCollection(bytes))
    throw new TalentPdfFontUnavailableError(`字体 ${path} 是 TTC 字体集合，pdf-lib 不支持`, ["ttc_unsupported"]);
  if (!isSupportedFontMagic(Uint8Array.from(bytes.subarray(0, 4))))
    throw new TalentPdfFontUnavailableError(`字体 ${path} 不是受支持的 TTF/OTF 文件`, ["unsupported_format"]);
  const font = fontkit.create(bytes);
  const hasGlyph = (codePoint: number) => {
    try {
      return font.hasGlyphForCodePoint(codePoint);
    } catch {
      return false;
    }
  };
  const missing = [...REQUIRED_SAMPLE].filter((char) => !hasGlyph(char.codePointAt(0) ?? 0));
  if (missing.length)
    throw new TalentPdfFontUnavailableError(
      `字体 ${path} 缺少中文报告所需字形：${missing.slice(0, 8).join("")}`,
      ["missing_cjk_glyphs"],
    );
  return { bytes: Uint8Array.from(bytes), hasGlyph };
}

function candidatePath(path: string): string {
  return path.startsWith("/") ? path : resolve(process.cwd(), path);
}

function resolveFirst(candidates: string[], label: string, reasons: string[]): { path: string; font: LoadedFont } | null {
  for (const candidate of candidates) {
    const path = candidatePath(candidate);
    if (!existsSync(path)) continue;
    try {
      return { path, font: loadFontFile(path) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reasons.push(`${label}:${message}`);
    }
  }
  return null;
}

function fontVersionOf(regular: Uint8Array, bold: Uint8Array): string {
  const hash = createHash("sha256");
  hash.update(regular);
  if (bold !== regular) hash.update(bold);
  return `f-${hash.digest("hex").slice(0, 16)}`;
}

function loadFontBundle(): TalentPdfFontBundle {
  const reasons: string[] = [];
  const regularCandidates: string[] = [];
  const override = talentPdfFontPathOverride();
  if (override) regularCandidates.push(override);
  regularCandidates.push(...REPO_FONT_CANDIDATES, ...SYSTEM_FONT_CANDIDATES);

  const regular = resolveFirst(regularCandidates, "regular", reasons);
  if (!regular)
    throw new TalentPdfFontUnavailableError(
      "PDF 渲染字体不可用：未找到可嵌入的中文字体。请执行 pnpm fonts:fetch 下载仓库字体，或用 TALENT_PDF_FONT_PATH 指向 Noto Sans SC 等 TTF/OTF 字体。",
      reasons,
    );

  const boldCandidates: string[] = [];
  const boldOverride = talentPdfFontBoldPathOverride();
  if (boldOverride) boldCandidates.push(boldOverride);
  boldCandidates.push(...BOLD_FONT_CANDIDATES);
  const bold = resolveFirst(boldCandidates, "bold", reasons);

  return {
    regular: regular.font.bytes,
    bold: bold?.font.bytes ?? regular.font.bytes,
    boldIsSynthetic: !bold,
    fontVersion: fontVersionOf(regular.font.bytes, bold?.font.bytes ?? regular.font.bytes),
    source: regular.path,
    hasGlyph: regular.font.hasGlyph,
  };
}

let cachedBundle: Promise<TalentPdfFontBundle> | null = null;

/** 进程内缓存字体（字体版本参与 hash，无需每次读盘）。 */
export function resolveTalentPdfFont(): Promise<TalentPdfFontBundle> {
  if (!cachedBundle) {
    cachedBundle = Promise.resolve().then(loadFontBundle);
  }
  return cachedBundle;
}

/** 测试用：清空字体缓存。 */
export function resetTalentPdfFontCache(): void {
  cachedBundle = null;
}