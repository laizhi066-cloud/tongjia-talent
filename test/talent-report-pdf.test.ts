/**
 * @description M8-A PDF 渲染与下载链路测试：文档模型 / 内容哈希 / 门禁错误码 /
 *   120s ticket / 每页水印 / 字节级确定性 / 下载留痕摘要；真实演示报告（8090）
 *   生成 PDF、二次命中缓存与清理由 `TALENT_PDF_DEMO_IT=1` 控制，默认跳过以免污染本地库。
 * @file test/talent-report-pdf.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import PocketBase from "pocketbase";
import { PDFDocument } from "pdf-lib";
import type {
  TalentGeneReportRecord,
  TalentReportFactorSnapshotItem,
  TalentReportRecord,
  TalentReportVolumeSnapshot,
} from "~~/shared/types/talent-report";
import {
  buildTalentPdfDocumentModel,
  composeTalentPdfWatermarkText,
  computeTalentPdfContentHash,
  computeTalentPdfFactorContentHash,
  computeTalentPdfVolumeContentHash,
  computeTalentPdfWatermarkIdentityHash,
  isTalentPdfDocumentRenderable,
  stableStringify,
  talentPdfFileName,
} from "~~/server/utils/talent-pdf-document";
import {
  assertTalentPdfGate,
  parseTalentPdfByteRange,
  writeTalentPdfDownloadRecord,
  generateTalentReportPdfArtifact,
  resetTalentPdfRuntimeState,
  type DownloadLogInput,
} from "~~/server/utils/talent-pdf-service";
import {
  resetTalentPdfTicketNonces,
  signTalentPdfTicket,
  verifyTalentPdfTicket,
} from "~~/server/utils/talent-pdf-ticket";
import { resolveTalentPdfFont, type TalentPdfFontBundle } from "~~/server/utils/talent-pdf-font";
import { renderTalentPdf } from "~~/server/utils/talent-pdf-render";
import type { TalentParentRecord } from "~~/shared/types/talent-member";

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "m8-pdf-test-encryption-key-0123456789";
process.env.TALENT_PDF_WATERMARK_MOBILE = "1";
process.env.TALENT_PDF_TICKET_ONE_TIME = "0";

// ── 固定 fixture：已发布报告 + 一册 2 章 2 要素（无真实 PII） ─────────────────

const VOLUME: TalentReportVolumeSnapshot = {
  volumeId: "V1",
  bookCode: "A",
  name: "生长发育",
  sortOrder: 1,
  open: true,
  chapterCount: 2,
  factorCount: 2,
  chapters: [
    {
      chapter: "1.1 生长发育概述",
      factors: [
        { code: "A-01", name: "运动协调", levelCode: "LV3", levelName: "优秀", note: "运动协调能力的固定注解示例，用于验证分页与行高。" },
      ],
    },
    {
      chapter: "1.2 生长发育进阶",
      factors: [
        { code: "A-02", name: "骨骼发育", levelCode: "LV2", levelName: "优良", note: "骨骼发育的固定注解示例。" },
      ],
    },
  ],
};

const FACTORS: TalentReportFactorSnapshotItem[] = [
  {
    code: "A-01",
    name: "运动协调",
    category: "A",
    categoryName: "生长发育",
    volumeId: "V1",
    bookCode: "A",
    chapter: "1.1 生长发育概述",
    levelCode: "LV3",
    levelName: "优秀",
    levelOrder: 3,
    score: 78,
    note: "运动协调能力的固定注解示例，用于验证分页与行高。",
    condition: "建议每周 3 次户外活动",
  },
  {
    code: "A-02",
    name: "骨骼发育",
    category: "A",
    categoryName: "生长发育",
    volumeId: "V1",
    bookCode: "A",
    chapter: "1.2 生长发育进阶",
    levelCode: "LV2",
    levelName: "优良",
    levelOrder: 2,
    score: 66,
    note: "骨骼发育的固定注解示例。",
    condition: "",
  },
];

const REPORT: TalentReportRecord = {
  id: "rec_report_fixture",
  created: "2026-11-16T10:00:00.000Z",
  updated: "2026-11-16T10:00:00.000Z",
  reportNo: "R202611160002",
  status: "published",
  publishedAt: "2026-11-16T10:00:00.000Z",
  snapshotAt: "2026-11-16T10:00:00.000Z",
  snapshotVersion: 1,
  subjectType: "child",
  subjectId: "rec_child_fixture",
  parentId: "rec_parent_fixture",
  openVolumeIds: ["V1"],
  factorSnapshot: FACTORS,
  volumeSnapshot: [VOLUME],
};

const WATERMARK = {
  parentName: "张三",
  mobileLast4: "8000",
  reportNo: "R202611160002",
  watermarkAt: "2026-11-16",
};

const POLICY = "name+mobile4+reportNo+date" as const;

let fontBundle: TalentPdfFontBundle | null = null;
try {
  fontBundle = await resolveTalentPdfFont();
} catch {
  fontBundle = null;
}

function captureError(fn: () => unknown): { statusCode?: number; data?: Record<string, unknown> } {
  try {
    fn();
  } catch (error) {
    return error as { statusCode?: number; data?: Record<string, unknown> };
  }
  throw new Error("预期抛出错误但没有抛出");
}

describe("PDF 文档模型与内容哈希", () => {
  it("冻结快照 → 封面 / 章节要素块 / 水印 / 页脚", () => {
    const model = buildTalentPdfDocumentModel({
      report: REPORT,
      volume: VOLUME,
      factorSnapshot: FACTORS,
      subject: { name: "演示子女一", genderLabel: "男", age: 7 },
      watermark: WATERMARK,
      watermarkPolicy: POLICY,
    });
    expect(model.title).toBe("个性化能力培育开发基因服务报告");
    expect(model.volumeName).toBe("生长发育");
    expect(model.seriesLabel).toContain("第 1 分册");
    expect(model.subjectName).toBe("演示子女一");
    expect(model.subjectMeta).toBe("男 · 7 岁");
    expect(model.chapters).toHaveLength(2);
    expect(model.chapters[0]?.blocks[0]).toMatchObject({ title: "运动协调", tag: "优秀" });
    expect(model.chapters[0]?.blocks[0]?.paragraphs[0]).toContain("运动协调能力的固定注解");
    expect(model.chapters[0]?.blocks[0]?.paragraphs[1]).toBe("适用条件：建议每周 3 次户外活动");
    expect(model.watermarkText).toBe("张三 · 8000 · R202611160002 · 2026-11-16");
    expect(model.footerLine).toBe("报告编号 R202611160002 · 生成于 2026-11-16");
    expect(isTalentPdfDocumentRenderable(model)).toBe(true);
  });

  it("水印策略关闭手机尾号后省略该段，身份哈希随之变化", () => {
    expect(composeTalentPdfWatermarkText(WATERMARK, "name+reportNo+date")).toBe(
      "张三 · R202611160002 · 2026-11-16",
    );
    const withMobile = computeTalentPdfWatermarkIdentityHash({ policy: POLICY, ...WATERMARK });
    const withoutMobile = computeTalentPdfWatermarkIdentityHash({
      policy: "name+reportNo+date",
      ...WATERMARK,
    });
    expect(withMobile).toHaveLength(64);
    expect(withMobile).not.toBe(withoutMobile);
  });

  it("空册不可渲染（API 返回 PDF_NOT_READY 的前置判断）", () => {
    const empty = buildTalentPdfDocumentModel({
      report: REPORT,
      volume: { ...VOLUME, chapters: [], chapterCount: 0, factorCount: 0 },
      factorSnapshot: FACTORS,
      subject: null,
      watermark: WATERMARK,
      watermarkPolicy: POLICY,
    });
    expect(isTalentPdfDocumentRenderable(empty)).toBe(false);
  });

  it("文件名只含报告编号与册名，不含对象姓名 / 证件", () => {
    expect(talentPdfFileName("R202611160002", "生长发育")).toBe("R202611160002-生长发育.pdf");
    expect(talentPdfFileName("R/2026", "生长发育")).toBe("R_2026-生长发育.pdf");
  });

  it("stableStringify 与对象键顺序无关", () => {
    expect(stableStringify({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe(
      stableStringify({ a: [2, { c: 4, d: 3 }], b: 1 }),
    );
  });

  it("contentHash 只随本册内容 / 身份 / 模板 / 字体变化；snapshotVersion 不入哈希", () => {
    const base = {
      reportId: REPORT.id,
      volumeId: "V1",
      volumeSnapshot: VOLUME,
      factorSnapshot: FACTORS,
      subjectDisplayName: "演示子女一",
      watermarkIdentityHash: computeTalentPdfWatermarkIdentityHash({ policy: POLICY, ...WATERMARK }),
      watermarkPolicy: POLICY,
      templateVersion: "m8-template-1",
      fontVersion: "f-0123456789abcdef",
    };
    const hash = computeTalentPdfContentHash(base);
    expect(hash).toHaveLength(64);
    expect(computeTalentPdfContentHash({ ...base })).toBe(hash);
    // snapshotVersion 不在入参中，天然不入哈希；注解变化 → 新哈希。
    const changedNote = structuredClone(VOLUME);
    changedNote.chapters[0]!.factors[0]!.note = "改写后的注解";
    expect(computeTalentPdfContentHash({ ...base, volumeSnapshot: changedNote })).not.toBe(hash);
    expect(computeTalentPdfContentHash({ ...base, templateVersion: "m8-template-2" })).not.toBe(hash);
    expect(computeTalentPdfContentHash({ ...base, fontVersion: "f-fedcba9876543210" })).not.toBe(hash);
    expect(computeTalentPdfContentHash({ ...base, watermarkPolicy: "name+reportNo+date" })).not.toBe(hash);
    // 本册哈希只取本册：其它册要素变化不改变本册哈希。
    const otherVolumeFactor: TalentReportFactorSnapshotItem = {
      ...FACTORS[0]!,
      code: "B-01",
      volumeId: "V2",
      bookCode: "B",
      chapter: "2.1 智商概述",
    };
    expect(computeTalentPdfFactorContentHash([...FACTORS, otherVolumeFactor], "V1")).toBe(
      computeTalentPdfFactorContentHash(FACTORS, "V1"),
    );
    expect(computeTalentPdfVolumeContentHash(VOLUME)).toHaveLength(64);
  });
});

describe("PDF 门禁（未发布 / 未开放 / 越权）", () => {
  const gate = (report: Partial<TalentReportRecord>, extra: Record<string, unknown> = {}) =>
    assertTalentPdfGate({
      report: { ...REPORT, ...report } as TalentReportRecord,
      parentId: "rec_parent_fixture",
      volumeId: "V1",
      pdfEnabled: true,
      ...extra,
    });

  it("已发布且开放册 → 通过", () => {
    expect(gate({}).volumeId).toBe("V1");
  });

  it("待发布 / 已撤回 → 409 report_pending / report_retracted（M7 口径）", () => {
    const pending = captureError(() => gate({ status: "pending_publish" }));
    expect(pending.statusCode).toBe(409);
    expect(pending.data?.code).toBe("report_pending");
    const retracted = captureError(() => gate({ status: "retracted" }));
    expect(retracted.statusCode).toBe(409);
    expect(retracted.data?.code).toBe("report_retracted");
  });

  it("非本人 / 子女已解绑（parent 不匹配）→ 404 REPORT_NOT_FOUND，不泄露存在性", () => {
    const error = captureError(() => gate({ parentId: "other_parent" }));
    expect(error.statusCode).toBe(404);
    expect(error.data?.code).toBe("REPORT_NOT_FOUND");
  });

  it("未开放册 / 非法 volumeId → 404 VOLUME_NOT_FOUND", () => {
    const closed = captureError(() => gate({ openVolumeIds: ["V2"] }));
    expect(closed.statusCode).toBe(404);
    expect(closed.data?.code).toBe("VOLUME_NOT_FOUND");
    const invalid = captureError(() => gate({}, { volumeId: "V9" }));
    expect(invalid.data?.code).toBe("VOLUME_NOT_FOUND");
    const snapshotClosed = captureError(() =>
      gate({
        volumeSnapshot: [{ ...VOLUME, open: false }],
      }),
    );
    expect(snapshotClosed.data?.code).toBe("VOLUME_NOT_FOUND");
  });

  it("渲染开关关闭 / 空册 / 快照缺失 → 404 PDF_NOT_READY", () => {
    const disabled = captureError(() => gate({}, { pdfEnabled: false }));
    expect(disabled.statusCode).toBe(404);
    expect(disabled.data?.code).toBe("PDF_NOT_READY");
    const empty = captureError(() => gate({ volumeSnapshot: [{ ...VOLUME, chapters: [] }] }));
    expect(empty.data?.code).toBe("PDF_NOT_READY");
    const missing = captureError(() => gate({ volumeSnapshot: [] }));
    expect(missing.data?.code).toBe("VOLUME_NOT_FOUND");
  });
});

describe("120s HMAC ticket", () => {
  const ttlFixture = () => {
    const signed = signTalentPdfTicket({
      reportId: REPORT.id,
      volumeId: "V1",
      userId: "user_fixture",
      parentId: "rec_parent_fixture",
    });
    return signed;
  };

  it("签发 / 校验往返，载荷只含 id 与 exp，无 PII", () => {
    const signed = ttlFixture();
    expect(signed.ttlSeconds).toBe(120);
    const payload = verifyTalentPdfTicket(signed.ticket, {
      expectedReportId: REPORT.id,
      expectedVolumeId: "V1",
    });
    expect(payload).toMatchObject({ r: REPORT.id, v: "V1", u: "user_fixture", p: "rec_parent_fixture" });
    expect(Object.keys(payload).sort()).toEqual(["e", "n", "p", "r", "u", "v"]);
    expect(JSON.stringify(payload)).not.toContain("张三");
  });

  it("过期 → 410 PDF_TICKET_EXPIRED；签名篡改 → 403 PDF_TICKET_INVALID", () => {
    const signed = signTalentPdfTicket({
      reportId: REPORT.id,
      volumeId: "V1",
      userId: "u",
      parentId: "p",
      ttlSeconds: 30,
    });
    const expired = captureError(() =>
      verifyTalentPdfTicket(signed.ticket, { now: new Date(Date.now() + 60_000) }),
    );
    expect(expired.statusCode).toBe(410);
    expect(expired.data?.code).toBe("PDF_TICKET_EXPIRED");

    // 篡改 payload（签名保持原样）→ 403；只改签名尾部可能因 base64url 填充位等价而误判。
    const separator = signed.ticket.lastIndexOf(".");
    const tamperedPayload = `${signed.ticket[0] === "e" ? "f" : "e"}${signed.ticket.slice(1, separator)}`;
    const tampered = `${tamperedPayload}${signed.ticket.slice(separator)}`;
    const invalid = captureError(() => verifyTalentPdfTicket(tampered));
    expect(invalid.statusCode).toBe(403);
    expect(invalid.data?.code).toBe("PDF_TICKET_INVALID");
    expect(captureError(() => verifyTalentPdfTicket("not-a-ticket")).data?.code).toBe("PDF_TICKET_INVALID");
  });

  it("ticket 绑定 reportId / volumeId；路径不匹配按无效处理", () => {
    const signed = ttlFixture();
    expect(
      captureError(() => verifyTalentPdfTicket(signed.ticket, { expectedVolumeId: "V2" })).statusCode,
    ).toBe(403);
    expect(
      captureError(() => verifyTalentPdfTicket(signed.ticket, { expectedReportId: "other" })).statusCode,
    ).toBe(403);
  });

  it("一次性 ticket 开启后重放 → 410", () => {
    process.env.TALENT_PDF_TICKET_ONE_TIME = "1";
    resetTalentPdfTicketNonces();
    try {
      const signed = ttlFixture();
      expect(verifyTalentPdfTicket(signed.ticket).r).toBe(REPORT.id);
      const replay = captureError(() => verifyTalentPdfTicket(signed.ticket));
      expect(replay.statusCode).toBe(410);
    } finally {
      process.env.TALENT_PDF_TICKET_ONE_TIME = "0";
      resetTalentPdfTicketNonces();
    }
  });
});

describe("PDF 渲染（字体可用时）", () => {
  const renderFixture = async (watermarkAt = WATERMARK.watermarkAt) => {
    const model = buildTalentPdfDocumentModel({
      report: REPORT,
      volume: VOLUME,
      factorSnapshot: FACTORS,
      subject: { name: "演示子女一", genderLabel: "男", age: 7 },
      watermark: { ...WATERMARK, watermarkAt },
      watermarkPolicy: POLICY,
    });
    return { model, result: await renderTalentPdf(model, fontBundle!, watermarkAt) };
  };

  it.skipIf(!fontBundle)("生成有效 PDF：%PDF 文件头、页数 > 0、每页水印文本", async () => {
    const { model, result } = await renderFixture();
    expect(result.pageCount).toBeGreaterThan(0);
    expect(Buffer.from(result.bytes.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
    expect(result.watermarkText).toBe(model.watermarkText);
    expect(result.watermarkText).toContain("张三");
    expect(result.watermarkText).toContain("8000");
    expect(result.watermarkText).toContain(REPORT.reportNo);
    expect(result.watermarkText).toContain("2026-11-16");
    // 每页平铺多次水印（旋转 -30°，间距 120mm × 70mm），总次数 ≥ 页数。
    expect(result.watermarkCount).toBeGreaterThanOrEqual(result.pageCount);
    expect(result.missingGlyphs).toBe(0);
    const loaded = await PDFDocument.load(result.bytes);
    expect(loaded.getPageCount()).toBe(result.pageCount);
    expect(String(loaded.getTitle() ?? "")).toContain("生长发育");
    expect(loaded.getCreationDate()?.toISOString()).toBe("2026-11-16T00:00:00.000Z");
  });

  it.skipIf(!fontBundle)("相同输入（含固定水印日期）字节级稳定，可复用内容哈希缓存", async () => {
    const first = await renderFixture();
    const second = await renderFixture();
    expect(Buffer.from(second.result.bytes).equals(Buffer.from(first.result.bytes))).toBe(true);
    expect(second.model.watermarkText).toBe(first.model.watermarkText);
  });
});

describe("下载留痕摘要（无 PII）", () => {
  it("写 talent_pdf_downloads：ipHash 摘要、uaFamily 枚举、无明文 IP / UA / 姓名", async () => {
    const created: Array<{ collection: string; data: Record<string, unknown> }> = [];
    const fakePb = {
      collection(name: string) {
        return {
          create: async (data: Record<string, unknown>) => {
            created.push({ collection: name, data });
            return { id: "log_1" };
          },
        };
      },
    } as unknown as PocketBase;
    const input: DownloadLogInput = {
      reportId: REPORT.id,
      volumeId: "V1",
      parentUserId: "user_fixture",
      subjectType: "child",
      subjectId: "rec_child_fixture",
      result: "ok",
      storage: "pocketbase",
      contentHash: "a".repeat(64),
      renderMs: 12,
      cacheHit: false,
      ip: "203.0.113.9",
      uaFamily: "h5",
      requestId: "req_fixture",
    };
    await writeTalentPdfDownloadRecord(fakePb, input);
    expect(created).toHaveLength(1);
    const row = created[0]!.data;
    expect(created[0]!.collection).toBe("talent_pdf_downloads");
    expect(row.result).toBe("ok");
    expect(row.cacheHit).toBe(false);
    expect(row.ipHash).toHaveLength(64);
    expect(JSON.stringify(row)).not.toContain("203.0.113.9");
    expect(JSON.stringify(row)).not.toContain("Mozilla");
    expect(row.parentUserId).toBe("user_fixture");
  });

  it("Range 解析：合法 / 后缀 / 越界 / 非法", () => {
    expect(parseTalentPdfByteRange("bytes=0-99", 1000)).toEqual({ start: 0, end: 99 });
    expect(parseTalentPdfByteRange("bytes=900-", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseTalentPdfByteRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseTalentPdfByteRange("bytes=1000-", 1000)).toBe("invalid");
    expect(parseTalentPdfByteRange("bytes=0-1,5-6", 1000)).toBe("invalid");
    expect(parseTalentPdfByteRange(null, 1000)).toBeNull();
  });
});

// ── 真实演示报告（默认跳过；`TALENT_PDF_DEMO_IT=1` + 本机 8090 演示库时运行） ──────

const DEMO_IT = process.env.TALENT_PDF_DEMO_IT === "1";

describe.skipIf(!DEMO_IT)("真实演示报告：生成 / 缓存 / 清理", () => {
  let pb: PocketBase;
  let report: TalentReportRecord;
  let volume: TalentReportVolumeSnapshot;
  let parent: TalentParentRecord;
  let geneReport: TalentGeneReportRecord | null;
  const createdPdfIds: string[] = [];
  const createdObjectKeys: Array<{ storage: string; objectKey: string }> = [];

  beforeAll(async () => {
    pb = new PocketBase(process.env.POCKETBASE_URL || "http://127.0.0.1:8090");
    pb.autoCancellation(false);
    await pb.collection("_superusers").authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || "",
      process.env.POCKETBASE_ADMIN_PASSWORD || "",
    );
    const rows = await pb.collection("talent_reports").getFullList<TalentReportRecord>({
      filter: 'status = "published"',
      $autoCancel: false,
    });
    const candidate = rows.find((row) => {
      const volumes = Array.isArray(row.volumeSnapshot) ? row.volumeSnapshot : [];
      return volumes.some((item) => item?.open === true && Array.isArray(item.chapters) && item.chapters.length > 0);
    });
    if (!candidate) throw new Error("演示库缺少已发布且开放的分册报告；请先执行 pnpm talent:report:seed");
    report = candidate;
    volume = (report.volumeSnapshot as TalentReportVolumeSnapshot[]).find((item) => item.open === true && item.chapters.length > 0)!;
    const parentRow = await pb.collection("talent_parents").getOne<TalentParentRecord>(String(report.parentId || ""), {
      $autoCancel: false,
    });
    parent = parentRow;
    const { loadTalentReportGeneReport } = await import("~~/server/utils/talent-report");
    geneReport = await loadTalentReportGeneReport(pb, report);
    // 清理该册历史产物，确保本轮真实渲染一次（测试结束再清理本轮新增）。
    const existing = await pb.collection("talent_report_pdfs").getFullList({
      filter: `reportId = "${report.id}" && volumeId = "${volume.volumeId}"`,
      $autoCancel: false,
    });
    for (const row of existing) {
      await pb.collection("uploads").delete(String(row.objectKey), { $autoCancel: false }).catch(() => {});
      await pb.collection("talent_report_pdfs").delete(String(row.id), { $autoCancel: false }).catch(() => {});
    }
  });

  afterAll(async () => {
    for (const id of createdPdfIds)
      await pb.collection("talent_report_pdfs").delete(id, { $autoCancel: false }).catch(() => {});
    for (const key of createdObjectKeys) {
      if (key.storage === "pocketbase")
        await pb.collection("uploads").delete(key.objectKey, { $autoCancel: false }).catch(() => {});
    }
    const logs = await pb
      .collection("talent_pdf_downloads")
      .getFullList({ filter: `reportId = "${report.id}"`, $autoCancel: false })
      .catch(() => []);
    for (const row of logs)
      await pb.collection("talent_pdf_downloads").delete(row.id, { $autoCancel: false }).catch(() => {});
  });

  it("真实演示报告生成 PDF（%PDF / 页数 / 水印文本），重复下载命中缓存", async () => {
    resetTalentPdfRuntimeState();
    const first = await generateTalentReportPdfArtifact(pb, { report, volume, parent, geneReport });
    createdPdfIds.push(first.record.id);
    createdObjectKeys.push({ storage: first.record.storage, objectKey: first.record.objectKey });
    expect(first.cacheHit).toBe(false);
    expect(Number(first.record.pageCount)).toBeGreaterThan(0);
    expect(Buffer.from(first.bytes.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
    expect(first.record.watermarkAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(first.record.watermarkPolicy).toBe("name+mobile4+reportNo+date");
    expect(String(first.record.fileName)).toContain(String(report.reportNo));
    const model = buildTalentPdfDocumentModel({
      report,
      volume,
      factorSnapshot: Array.isArray(report.factorSnapshot) ? report.factorSnapshot : [],
      subject: geneReport
        ? { name: geneReport.name, genderLabel: geneReport.gender === "male" ? "男" : "女", age: Number(geneReport.age ?? 0) || 0 }
        : null,
      watermark: {
        parentName: String(parent.name ?? ""),
        mobileLast4: String(parent.maskedMobile ?? "").replace(/\D/g, "").slice(-4),
        reportNo: String(report.reportNo ?? ""),
        watermarkAt: String(first.record.watermarkAt).slice(0, 10),
      },
      watermarkPolicy: "name+mobile4+reportNo+date",
    });
    expect(model.watermarkText).toContain(String(parent.name ?? ""));
    expect(model.watermarkText).toContain(String(report.reportNo));

    const second = await generateTalentReportPdfArtifact(pb, { report, volume, parent, geneReport });
    expect(second.cacheHit).toBe(true);
    expect(Buffer.from(second.bytes).equals(Buffer.from(first.bytes))).toBe(true);
    expect(second.record.contentHash).toBe(first.record.contentHash);
    expect(talentPdfFileName(String(report.reportNo), volume.name)).toBe(String(first.record.fileName));
  });
});