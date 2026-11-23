/**
 * @description M8 PDF 程序化排版：pdf-lib + fontkit 子集字体，A4 纵向、封面 / 目录 / 章节要素块 /
 *   页眉页脚 / 每页平铺水印。不引入 headless Chromium；同一输入（含固定元数据日期）生成字节级稳定
 *   PDF，便于 contentHash 缓存与恢复/补发复用（docs/specs/M8-external/spec.md §6.2–§6.5、ADR 0008-D3/D4）。
 * @file server/utils/talent-pdf-render.ts
 */
import { PDFDocument, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { TalentPdfDocumentModel } from "./talent-pdf-document";
import type { TalentPdfFontBundle } from "./talent-pdf-font";
import {
  TALENT_PDF_FOOTER_NOTICE,
  TALENT_PDF_MAX_PAGES,
  talentPdfMaxBytes,
} from "./talent-pdf-config";

/** A4 纵向（pt）。 */
export const TALENT_PDF_PAGE_WIDTH = 595.28;
export const TALENT_PDF_PAGE_HEIGHT = 841.89;
/** 页边距：上 18 / 下 20 / 左 18 / 右 18mm。 */
const MARGIN_TOP = 51.02;
const MARGIN_BOTTOM = 56.69;
const MARGIN_LEFT = 51.02;
const MARGIN_RIGHT = 51.02;
const CONTENT_WIDTH = TALENT_PDF_PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const CONTENT_TOP = TALENT_PDF_PAGE_HEIGHT - MARGIN_TOP;
const CONTENT_BOTTOM = MARGIN_BOTTOM + 36;
const FOOTER_Y = 26;
const HEADER_Y = TALENT_PDF_PAGE_HEIGHT - 26;

const FONT_SIZE_H1 = 16;
const FONT_SIZE_FACTOR = 10;
const FONT_SIZE_BODY = 9;
const BODY_LINE_HEIGHT = FONT_SIZE_BODY * 1.7;
const FONT_SIZE_HEADER = 6;
const FONT_SIZE_FOOTER = 6;
const FONT_SIZE_WATERMARK = 11;
const WATERMARK_STEP_X = 340;
const WATERMARK_STEP_Y = 198;
const GRAY = rgb(0.35, 0.35, 0.35);
const LIGHT_GRAY = rgb(0.55, 0.55, 0.55);

/** 行首禁则（避免标点独占一行，轻微超宽可接受）。 */
const NO_LINE_START = new Set([..."，。、；：！？）》」』】,.!?;:)]}%"]);
/** 超长段落优先在这些标点后断行（只在本行尾部 10 个字内回退）。 */
const BREAK_AFTER = new Set([..."，。、；：！？）》」』】 "]);

export interface TalentPdfRenderResult {
  bytes: Uint8Array;
  pageCount: number;
  /** 平铺水印绘制次数（每页 > 0）。 */
  watermarkCount: number;
  /** 实际绘制的水印文本（仅内存返回值，用于测试 / 日志断言；不写集合）。 */
  watermarkText: string;
  /** 字体未覆盖、已用 □ 替换的码点数（用于日志告警，不阻断整册）。 */
  missingGlyphs: number;
}

export class TalentPdfTooLargeError extends Error {
  readonly reason: "too_many_pages" | "too_many_bytes";
  constructor(reason: "too_many_pages" | "too_many_bytes") {
    super(reason);
    this.name = "TalentPdfTooLargeError";
    this.reason = reason;
  }
}

interface TextStyle {
  font: PDFFont;
  size: number;
  color: ReturnType<typeof rgb>;
}

/** 按字体实际宽度换行；CJK 按字符断行，英文按词断行，超长串可强制断行。 */
export function wrapTalentPdfText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const paragraphs = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const tokens = paragraph.match(/[\u2e80-\u9fff\u3000-\u303f\uff00-\uffef]|[^\s\u2e80-\u9fff\u3000-\u303f\uff00-\uffef]+|\s+/g) ?? [];
    let current = "";
    const flush = () => {
      if (current) lines.push(current.trimEnd());
      current = "";
    };
    for (const token of tokens) {
      if (token.trim() === "") {
        if (current && !current.endsWith(" ")) current += " ";
        continue;
      }
      const candidate = current + token;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || current === "") {
        if (current === "" && font.widthOfTextAtSize(token, size) > maxWidth) {
          // 超长英文 / 无空格串：按字符强拆。
          let chunk = "";
          for (const char of token) {
            if (font.widthOfTextAtSize(chunk + char, size) > maxWidth && chunk) {
              lines.push(chunk);
              chunk = char;
            } else {
              chunk += char;
            }
          }
          current = chunk;
        } else {
          current = candidate;
        }
        continue;
      }
      // 回退到最近标点断行，避免逗号 / 句号出现在下一行行首。
      let breakIndex = -1;
      for (let index = current.length - 1; index >= Math.max(0, current.length - 10); index -= 1) {
        if (BREAK_AFTER.has(current[index] ?? "")) {
          breakIndex = index + 1;
          break;
        }
      }
      if (breakIndex > 0) {
        lines.push(current.slice(0, breakIndex).trimEnd());
        current = current.slice(breakIndex) + token;
      } else {
        lines.push(current.trimEnd());
        current = token;
      }
      // 行首禁则：标点不开头，回贴到上一行。
      if (current && NO_LINE_START.has(current[0] ?? "") && lines.length) {
        lines[lines.length - 1] = `${lines[lines.length - 1]}${current[0]}`;
        current = current.slice(1);
      }
    }
    flush();
  }
  return lines.length ? lines : [""];
}

/** 字体缺字时用 □ 替换并计数（不阻断整册；>10 记日志告警）。 */
class TextSanitizer {
  missingGlyphs = 0;
  constructor(private readonly bundle: TalentPdfFontBundle) {}

  sanitize(text: string): string {
    let output = "";
    for (const char of String(text ?? "")) {
      const codePoint = char.codePointAt(0) ?? 0;
      if (this.bundle.hasGlyph(codePoint)) output += char;
      else {
        output += "□";
        this.missingGlyphs += 1;
      }
    }
    return output;
  }
}

interface LayoutContext {
  doc: PDFDocument;
  model: TalentPdfDocumentModel;
  regular: PDFFont;
  bold: PDFFont;
  sanitizer: TextSanitizer;
  watermarkCount: number;
  /** 章节标题 → 最终页码（1 起）。 */
  chapterPages: Map<string, number>;
}

function drawSanitized(
  ctx: LayoutContext,
  page: PDFPage,
  text: string,
  options: { x: number; y: number; style: TextStyle; maxWidth?: number; rotate?: number },
): void {
  const content = ctx.sanitizer.sanitize(text);
  let size = options.style.size;
  if (options.maxWidth && content) {
    const width = options.style.font.widthOfTextAtSize(content, size);
    if (width > options.maxWidth) size = Math.max(4, (size * options.maxWidth) / width);
  }
  page.drawText(content, {
    x: options.x,
    y: options.y,
    size,
    font: options.style.font,
    color: options.style.color,
    ...(options.rotate ? { rotate: degrees(options.rotate) } : {}),
  });
}

function lineHeight(size: number): number {
  return size * 1.55;
}

function ensureSpace(ctx: LayoutContext, pageRef: { page: PDFPage; y: number }, needed: number): void {
  if (pageRef.y - needed >= CONTENT_BOTTOM) return;
  pageRef.page = ctx.doc.addPage([TALENT_PDF_PAGE_WIDTH, TALENT_PDF_PAGE_HEIGHT]);
  pageRef.y = CONTENT_TOP;
}

function drawCover(ctx: LayoutContext): PDFPage {
  const page = ctx.doc.addPage([TALENT_PDF_PAGE_WIDTH, TALENT_PDF_PAGE_HEIGHT]);
  const styles = {
    title: { font: ctx.bold, size: 22, color: rgb(0.1, 0.1, 0.1) },
    volume: { font: ctx.bold, size: 30, color: rgb(0.1, 0.1, 0.1) },
    series: { font: ctx.regular, size: 12, color: GRAY },
    meta: { font: ctx.regular, size: 11, color: GRAY },
    label: { font: ctx.regular, size: 9, color: LIGHT_GRAY },
  };
  let y = TALENT_PDF_PAGE_HEIGHT - 170;
  drawSanitized(ctx, page, ctx.model.title, { x: MARGIN_LEFT, y, style: styles.title, maxWidth: CONTENT_WIDTH });
  y -= 34;
  drawSanitized(ctx, page, ctx.model.seriesLabel, { x: MARGIN_LEFT, y, style: styles.series });
  y -= 56;
  drawSanitized(ctx, page, ctx.model.volumeName, { x: MARGIN_LEFT, y, style: styles.volume, maxWidth: CONTENT_WIDTH });
  y -= 20;
  page.drawLine({ start: { x: MARGIN_LEFT, y }, end: { x: TALENT_PDF_PAGE_WIDTH - MARGIN_RIGHT, y }, thickness: 1, color: LIGHT_GRAY });
  y -= 52;
  if (ctx.model.subjectName) {
    drawSanitized(ctx, page, "报告对象", { x: MARGIN_LEFT, y, style: styles.label });
    y -= 20;
    drawSanitized(ctx, page, ctx.model.subjectName, { x: MARGIN_LEFT, y, style: styles.meta, maxWidth: CONTENT_WIDTH });
    y -= 20;
  }
  if (ctx.model.subjectMeta) {
    drawSanitized(ctx, page, ctx.model.subjectMeta, { x: MARGIN_LEFT, y, style: styles.meta, maxWidth: CONTENT_WIDTH });
    y -= 20;
  }
  y -= 24;
  if (ctx.model.reportNo) {
    drawSanitized(ctx, page, `报告编号：${ctx.model.reportNo}`, { x: MARGIN_LEFT, y, style: styles.meta, maxWidth: CONTENT_WIDTH });
    y -= 20;
  }
  if (ctx.model.publishedDate) {
    drawSanitized(ctx, page, `发布日期：${ctx.model.publishedDate}`, { x: MARGIN_LEFT, y, style: styles.meta, maxWidth: CONTENT_WIDTH });
    y -= 20;
  }
  return page;
}

function drawContent(ctx: LayoutContext): PDFPage[] {
  const pages: PDFPage[] = [];
  const first = ctx.doc.addPage([TALENT_PDF_PAGE_WIDTH, TALENT_PDF_PAGE_HEIGHT]);
  pages.push(first);
  const ref = { page: first, y: CONTENT_TOP };

  const styles = {
    h1: { font: ctx.bold, size: FONT_SIZE_H1, color: rgb(0.08, 0.08, 0.08) },
    factor: { font: ctx.bold, size: FONT_SIZE_FACTOR, color: rgb(0.1, 0.1, 0.1) },
    tag: { font: ctx.regular, size: 9, color: GRAY },
    body: { font: ctx.regular, size: FONT_SIZE_BODY, color: rgb(0.15, 0.15, 0.15) },
    continue: { font: ctx.regular, size: FONT_SIZE_BODY, color: LIGHT_GRAY },
  };

  const halfPage = (CONTENT_TOP - CONTENT_BOTTOM) / 2;

  for (const [chapterIndex, chapter] of ctx.model.chapters.entries()) {
    const headingLines = wrapTalentPdfText(`${chapterIndex + 1}. ${chapter.title}`, ctx.bold, FONT_SIZE_H1, CONTENT_WIDTH);
    ensureSpace(ctx, ref, lineHeight(FONT_SIZE_H1) * headingLines.length + 40);
    // 目录页稍后插入到第 2 页，正文页码统一 +1。
    ctx.chapterPages.set(chapter.title, ctx.doc.getPageCount() + 1);
    for (const line of headingLines) {
      drawSanitized(ctx, ref.page, line, { x: MARGIN_LEFT, y: ref.y, style: styles.h1 });
      ref.y -= lineHeight(FONT_SIZE_H1);
    }
    ref.y -= 8;

    for (const block of chapter.blocks) {
      const tagText = block.tag ? ` [${block.tag}]` : "";
      const tagWidth = tagText ? ctx.regular.widthOfTextAtSize(tagText, 9) : 0;
      const titleLines = wrapTalentPdfText(block.title, ctx.bold, FONT_SIZE_FACTOR, Math.max(80, CONTENT_WIDTH - tagWidth));
      const paragraphs = block.paragraphs.map((paragraph) => wrapTalentPdfText(paragraph, ctx.regular, FONT_SIZE_BODY, CONTENT_WIDTH));
      const blockHeight = lineHeight(FONT_SIZE_FACTOR) * titleLines.length + 6
        + paragraphs.reduce((total, lines) => total + lines.length * BODY_LINE_HEIGHT + 4, 0) + 10;

      if (blockHeight > halfPage) {
        // 块高 > 半页：允许拆分，续页标「（续）」。
        ensureSpace(ctx, ref, lineHeight(FONT_SIZE_FACTOR) * titleLines.length + BODY_LINE_HEIGHT + 6);
        titleLines.forEach((line, index) => {
          drawSanitized(ctx, ref.page, line, { x: MARGIN_LEFT, y: ref.y, style: styles.factor });
          if (index === 0 && tagText) {
            drawSanitized(ctx, ref.page, tagText, {
              x: MARGIN_LEFT + ctx.bold.widthOfTextAtSize(ctx.sanitizer.sanitize(line), FONT_SIZE_FACTOR) + 6,
              y: ref.y,
              style: styles.tag,
            });
          }
          ref.y -= lineHeight(FONT_SIZE_FACTOR);
        });
        ref.y -= 6;
        let continued = false;
        for (const [paragraphIndex, lines] of paragraphs.entries()) {
          for (const line of lines) {
            if (ref.y - BODY_LINE_HEIGHT < CONTENT_BOTTOM) {
              ref.page = ctx.doc.addPage([TALENT_PDF_PAGE_WIDTH, TALENT_PDF_PAGE_HEIGHT]);
              ref.y = CONTENT_TOP;
              if (!continued) {
                drawSanitized(ctx, ref.page, `${block.title}（续）`, { x: MARGIN_LEFT, y: ref.y, style: styles.continue, maxWidth: CONTENT_WIDTH });
                ref.y -= lineHeight(FONT_SIZE_BODY) + 4;
                continued = true;
              }
            }
            drawSanitized(ctx, ref.page, line, { x: MARGIN_LEFT, y: ref.y, style: styles.body });
            ref.y -= BODY_LINE_HEIGHT;
          }
          if (paragraphIndex < paragraphs.length - 1) ref.y -= 4;
        }
        ref.y -= 10;
        continue;
      }

      ensureSpace(ctx, ref, blockHeight);
      titleLines.forEach((line, index) => {
        drawSanitized(ctx, ref.page, line, { x: MARGIN_LEFT, y: ref.y, style: styles.factor });
        if (index === 0 && tagText) {
          drawSanitized(ctx, ref.page, tagText, {
            x: MARGIN_LEFT + ctx.bold.widthOfTextAtSize(ctx.sanitizer.sanitize(line), FONT_SIZE_FACTOR) + 6,
            y: ref.y,
            style: styles.tag,
          });
        }
        ref.y -= lineHeight(FONT_SIZE_FACTOR);
      });
      ref.y -= 6;
      for (const [paragraphIndex, lines] of paragraphs.entries()) {
        for (const line of lines) {
          drawSanitized(ctx, ref.page, line, { x: MARGIN_LEFT, y: ref.y, style: styles.body });
          ref.y -= BODY_LINE_HEIGHT;
        }
        if (paragraphIndex < paragraphs.length - 1) ref.y -= 4;
      }
      ref.y -= 10;
    }
    ref.y -= 12;
  }

  // 实际用到的页（addPage 顺序）；目录页稍后 insert 到第 2 页。
  return ctx.doc.getPages().slice(1);
}

function drawTableOfContents(ctx: LayoutContext): PDFPage {
  const page = ctx.doc.insertPage(1, [TALENT_PDF_PAGE_WIDTH, TALENT_PDF_PAGE_HEIGHT]);
  const heading = { font: ctx.bold, size: 20, color: rgb(0.08, 0.08, 0.08) };
  const entry = { font: ctx.regular, size: 10.5, color: rgb(0.15, 0.15, 0.15) };
  drawSanitized(ctx, page, "目录", { x: MARGIN_LEFT, y: CONTENT_TOP, style: heading });
  let y = CONTENT_TOP - 46;
  const maxEntries = Math.min(ctx.model.chapters.length, 24);
  for (let index = 0; index < maxEntries; index += 1) {
    const chapter = ctx.model.chapters[index];
    if (!chapter) continue;
    const pageNo = ctx.chapterPages.get(chapter.title) ?? 1;
    const label = `${index + 1}. ${chapter.title}`;
    const truncated = label.length > 44 ? `${label.slice(0, 43)}…` : label;
    const pageNoText = String(pageNo);
    const pageNoWidth = ctx.regular.widthOfTextAtSize(pageNoText, 10.5);
    drawSanitized(ctx, page, truncated, { x: MARGIN_LEFT, y, style: entry, maxWidth: CONTENT_WIDTH - pageNoWidth - 24 });
    drawSanitized(ctx, page, pageNoText, { x: TALENT_PDF_PAGE_WIDTH - MARGIN_RIGHT - pageNoWidth, y, style: entry });
    // 点线引导
    const usedWidth = ctx.regular.widthOfTextAtSize(truncated, 10.5);
    const dotsStart = MARGIN_LEFT + Math.min(usedWidth + 8, CONTENT_WIDTH - pageNoWidth - 30);
    const dotsEnd = TALENT_PDF_PAGE_WIDTH - MARGIN_RIGHT - pageNoWidth - 8;
    if (dotsEnd > dotsStart) {
      page.drawLine({
        start: { x: dotsStart, y: y + 2 },
        end: { x: dotsEnd, y: y + 2 },
        thickness: 0.4,
        color: LIGHT_GRAY,
        dashArray: [1, 2],
      });
    }
    y -= 26;
    if (y < CONTENT_BOTTOM + 20) break;
  }
  if (ctx.model.chapters.length > maxEntries)
    drawSanitized(ctx, page, "……", { x: MARGIN_LEFT, y, style: entry });
  return page;
}

function drawHeaderAndFooter(ctx: LayoutContext, page: PDFPage, pageIndex: number, totalPages: number): void {
  const isContentPage = pageIndex >= 2;
  if (isContentPage) {
    const headerStyle = { font: ctx.regular, size: FONT_SIZE_HEADER, color: LIGHT_GRAY };
    if (ctx.model.reportNo) drawSanitized(ctx, page, ctx.model.reportNo, { x: MARGIN_LEFT, y: HEADER_Y, style: headerStyle });
    const volumeWidth = ctx.regular.widthOfTextAtSize(ctx.sanitizer.sanitize(ctx.model.volumeName), FONT_SIZE_HEADER);
    drawSanitized(ctx, page, ctx.model.volumeName, {
      x: TALENT_PDF_PAGE_WIDTH - MARGIN_RIGHT - volumeWidth,
      y: HEADER_Y,
      style: headerStyle,
    });
  }

  const footerStyle = { font: ctx.regular, size: FONT_SIZE_FOOTER, color: LIGHT_GRAY };
  const pageLabel = `第 ${pageIndex + 1} / ${totalPages} 页`;
  drawSanitized(ctx, page, pageLabel, { x: MARGIN_LEFT, y: FOOTER_Y, style: footerStyle });
  const noticeWidth = ctx.regular.widthOfTextAtSize(ctx.sanitizer.sanitize(TALENT_PDF_FOOTER_NOTICE), FONT_SIZE_FOOTER);
  drawSanitized(ctx, page, TALENT_PDF_FOOTER_NOTICE, {
    x: TALENT_PDF_PAGE_WIDTH - MARGIN_RIGHT - noticeWidth,
    y: FOOTER_Y,
    style: footerStyle,
  });
  if (ctx.model.footerLine) {
    const width = ctx.regular.widthOfTextAtSize(ctx.sanitizer.sanitize(ctx.model.footerLine), 7);
    drawSanitized(ctx, page, ctx.model.footerLine, {
      x: TALENT_PDF_PAGE_WIDTH - MARGIN_RIGHT - width,
      y: FOOTER_Y + 10,
      style: { font: ctx.regular, size: 7, color: LIGHT_GRAY },
    });
  }
}

function drawWatermarks(ctx: LayoutContext): void {
  const text = ctx.model.watermarkText;
  if (!text) return;
  const sanitized = ctx.sanitizer.sanitize(text);
  for (const page of ctx.doc.getPages()) {
    let row = 0;
    for (let y = -WATERMARK_STEP_Y; y < TALENT_PDF_PAGE_HEIGHT + WATERMARK_STEP_Y; y += WATERMARK_STEP_Y, row += 1) {
      const offset = row % 2 === 0 ? 0 : WATERMARK_STEP_X / 2;
      for (let x = -WATERMARK_STEP_X; x < TALENT_PDF_PAGE_WIDTH + WATERMARK_STEP_X; x += WATERMARK_STEP_X) {
        page.drawText(sanitized, {
          x: x + offset,
          y,
          size: FONT_SIZE_WATERMARK,
          font: ctx.regular,
          color: rgb(0.45, 0.45, 0.45),
          opacity: 0.08,
          rotate: degrees(-30),
        });
        ctx.watermarkCount += 1;
      }
    }
  }
}

function fixedMetadataDate(watermarkAt: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(watermarkAt ?? ""));
  if (match) return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Date(Date.UTC(2026, 0, 1));
}

/**
 * 渲染单册 PDF。渲染过程不读取当前时间 / 随机数，元数据日期固定来自 `watermarkAt`，
 * 保证相同输入字节级稳定（§6.2 确定性）。
 */
export async function renderTalentPdf(
  model: TalentPdfDocumentModel,
  bundle: TalentPdfFontBundle,
  watermarkAt: string,
): Promise<TalentPdfRenderResult> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(bundle.regular, { subset: true });
  const bold = bundle.boldIsSynthetic ? regular : await doc.embedFont(bundle.bold, { subset: true });
  const sanitizer = new TextSanitizer(bundle);

  const metadataDate = fixedMetadataDate(watermarkAt);
  doc.setTitle(`${model.title} · ${model.volumeName}`);
  doc.setAuthor("同佳天赋");
  doc.setCreator("tongjia-talent");
  doc.setProducer("pdf-lib");
  doc.setCreationDate(metadataDate);
  doc.setModificationDate(metadataDate);

  const ctx: LayoutContext = {
    doc,
    model,
    regular,
    bold,
    sanitizer,
    watermarkCount: 0,
    chapterPages: new Map(),
  };

  drawCover(ctx);
  drawContent(ctx);
  if (doc.getPageCount() - 1 > TALENT_PDF_MAX_PAGES - 2)
    throw new TalentPdfTooLargeError("too_many_pages");
  drawTableOfContents(ctx);
  drawWatermarks(ctx);

  const totalPages = doc.getPageCount();
  doc.getPages().forEach((page, index) => drawHeaderAndFooter(ctx, page, index, totalPages));

  if (totalPages > TALENT_PDF_MAX_PAGES) throw new TalentPdfTooLargeError("too_many_pages");
  const bytes = await doc.save();
  if (bytes.byteLength > talentPdfMaxBytes()) throw new TalentPdfTooLargeError("too_many_bytes");
  return {
    bytes,
    pageCount: totalPages,
    watermarkCount: ctx.watermarkCount,
    watermarkText: model.watermarkText,
    missingGlyphs: sanitizer.missingGlyphs,
  };
}