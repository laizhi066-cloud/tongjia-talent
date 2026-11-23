/**
 * @description M5 培育建议域数据层测试：集合/索引声明、年龄精确周岁与匹配键、建议编号规范化、
 *   4 个月周期/下一版时间、sections 归一化与校验（分册/白名单/长度/变体/PII/空正文）、
 *   派生缓存与展示文案、集合记录 sanitize（不含 idNoHash/sections）、派生可见性组合。
 *   对应 docs/specs/M5-advice/spec.md §3/§4.5/§5.4 与 §11 #1。数据全部虚构，不依赖 PocketBase / 网络。
 * @file test/talent-advice-domain.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  COLLECTION_DEFS,
  TALENT_ADVICE_COLLECTION_NAMES,
  TALENT_ADVICE_INDEX_DEFS,
  indexNameFromSql,
} from "../scripts/setup.mjs";
import {
  TALENT_ADVICE_BOOK_NAMES,
  TALENT_ADVICE_ENTROPY_LEVELS,
  type TalentAdviceDocRecord,
  type TalentAdviceRawSection,
  type TalentAdviceSection,
  type TalentAdviceVersionRecord,
} from "~~/shared/types/talent-advice";
import {
  addTalentAdviceMonths,
  buildTalentAdviceNo,
  formatTalentAdviceCoveredFactorText,
  buildTalentAdviceDerived,
  buildTalentAdviceMatchKey,
  buildTalentAdviceVersionNo,
  calculateTalentAdviceAge,
  formatTalentAdviceAgeLabel,
  formatTalentAdviceBookAdviceNo,
  formatTalentAdviceEntropyText,
  formatTalentAdviceDate,
  formatTalentAdviceGenderLabel,
  isTalentAdviceClientVisible,
  isValidTalentAdviceNo,
  normalizeTalentAdviceBooks,
  normalizeTalentAdviceDate,
  normalizeTalentAdviceEntropy,
  normalizeTalentAdviceSections,
  resolveTalentAdviceClientVisibility,
  resolveTalentAdviceCycle,
  resolveTalentAdviceViewingVersion,
  sanitizeTalentAdviceDocRecord,
  sanitizeTalentAdviceVersionRecord,
} from "~~/server/utils/talent-advice";

const AT = "2026-11-17T10:00:00.000Z";

function rawSection(
  overrides: Partial<TalentAdviceRawSection> = {},
): TalentAdviceRawSection {
  return {
    book: "A",
    factor: "运动协调",
    entropy: "优秀",
    content: "该项潜质发展良好，基础条件较为扎实。",
    example: "多数情境下能稳定完成对应任务。",
    direction: "在现有基础上逐步增加任务复杂度。",
    suggestion: "保持规律接触与练习节奏。",
    variant: 1,
    ...overrides,
  };
}

function makeSection(
  overrides: Partial<TalentAdviceSection> = {},
): TalentAdviceSection {
  return {
    book: "A",
    bookName: TALENT_ADVICE_BOOK_NAMES.A,
    chapter: "1.1 生长发育概述",
    factor: "运动协调",
    entropy: "优秀",
    content: "内容",
    example: "举例",
    direction: "方向",
    suggestion: "建议",
    variant: 1,
    ...overrides,
  };
}

function makeDoc(
  overrides: Partial<TalentAdviceDocRecord> = {},
): TalentAdviceDocRecord {
  return {
    id: "doc_1",
    created: AT,
    updated: AT,
    adviceNo: "AD-GR202611160001-202611",
    geneReportId: "gene_1",
    reportId: "report_1",
    reportNo: "GR202611160001",
    subjectType: "child",
    subjectId: "child_1",
    parentId: "parent_1",
    name: "陈小示",
    maskedIdNo: "1101**********1234",
    idNoHash: "a".repeat(64),
    gender: "male",
    birthday: "2018-09-08",
    age: 8,
    matchKey: "陈小示｜8 岁",
    versionId: "version_1",
    versionName: "V2026.11",
    publishStatus: "published",
    publishedAt: "2026-11-12T09:20:00.000Z",
    withdrawnAt: "",
    syncedAt: "2026-11-12T09:20:00.000Z",
    source: "mock",
    books: "AB",
    sections: [
      makeSection({ book: "A" }),
      makeSection({ book: "B", bookName: TALENT_ADVICE_BOOK_NAMES.B }),
    ],
    sectionCount: 2,
    bookCount: 2,
    entropyCounts: { 优秀: 2 },
    firstFactorName: "运动协调",
    ...overrides,
  };
}

function makeVersion(
  overrides: Partial<TalentAdviceVersionRecord> = {},
): TalentAdviceVersionRecord {
  return {
    id: "version_1",
    created: AT,
    updated: AT,
    versionNo: "V2026.11",
    status: "active",
    cycle: "2026-11 ~ 2027-02",
    effectiveAt: "2026-11-12",
    nextUpdateAt: "2027-03-12",
    syncedAt: "2026-11-12T09:20:00.000Z",
    source: "mock",
    note: "外部系统按姓名 + 具体年龄（周岁）重新匹配输出，覆盖 2 份基因报告。",
    operatorId: "",
    operatorName: "系统同步",
    ...overrides,
  };
}

// ── 集合 / 索引声明（新库 assert 与 M3 不破坏） ──────────────────────────

describe("集合与索引声明", () => {
  it("talent_advice_versions / talent_advice_docs 已登记且字段齐全", () => {
    expect(TALENT_ADVICE_COLLECTION_NAMES).toEqual([
      "talent_advice_versions",
      "talent_advice_docs",
    ]);
    for (const name of TALENT_ADVICE_COLLECTION_NAMES)
      expect(COLLECTION_DEFS.some((definition) => definition.name === name)).toBe(
        true,
      );
    const versionFields = new Set(
      COLLECTION_DEFS.find(
        (definition) => definition.name === "talent_advice_versions",
      )!.fields.map((field) => field.name),
    );
    for (const field of [
      "versionNo",
      "status",
      "cycle",
      "effectiveAt",
      "nextUpdateAt",
      "syncedAt",
      "source",
      "note",
      "operatorId",
      "operatorName",
    ])
      expect(versionFields.has(field)).toBe(true);
    const docDefinition = COLLECTION_DEFS.find(
      (definition) => definition.name === "talent_advice_docs",
    )!;
    const docFields = new Set(docDefinition.fields.map((field) => field.name));
    for (const field of [
      "adviceNo",
      "reportNo",
      "subjectType",
      "subjectId",
      "name",
      "maskedIdNo",
      "idNoHash",
      "gender",
      "birthday",
      "age",
      "matchKey",
      "versionName",
      "publishStatus",
      "publishedAt",
      "withdrawnAt",
      "syncedAt",
      "source",
      "books",
      "sections",
      "sectionCount",
      "bookCount",
      "entropyCounts",
      "firstFactorName",
    ])
      expect(docFields.has(field)).toBe(true);
    for (const field of [
      "geneReportId",
      "reportId",
      "versionId",
      "parentId",
      "createdBy",
      "updatedBy",
    ])
      expect(
        (docDefinition.relations ?? []).some((relation) => relation.name === field),
      ).toBe(true);
  });

  it("索引清单含单一生效部分唯一索引、建议编号与版本内一人一份唯一键", () => {
    const sqls = TALENT_ADVICE_INDEX_DEFS.map(([, sql]) => String(sql));
    const names = sqls.map((sql) => indexNameFromSql(sql));
    expect(names).toEqual([
      "idx_talent_advice_versions_no",
      "idx_talent_advice_versions_active",
      "idx_talent_advice_versions_effective",
      "idx_talent_advice_docs_no",
      "idx_talent_advice_docs_version_gene",
      "idx_talent_advice_docs_version_status",
      "idx_talent_advice_docs_report",
      "idx_talent_advice_docs_gene",
      "idx_talent_advice_docs_subject",
      "idx_talent_advice_docs_reportno",
      "idx_talent_advice_docs_synced",
    ]);
    expect(
      sqls.some(
        (sql) =>
          sql.includes("UNIQUE INDEX idx_talent_advice_versions_active") &&
          sql.includes('WHERE status = "active"'),
      ),
    ).toBe(true);
    expect(
      sqls.some((sql) => sql.includes("UNIQUE INDEX idx_talent_advice_docs_no")),
    ).toBe(true);
    expect(
      sqls.some(
        (sql) =>
          sql.includes("UNIQUE INDEX idx_talent_advice_docs_version_gene") &&
          sql.includes('WHERE geneReportId != ""'),
      ),
    ).toBe(true);
  });

  it("旧集合已随 M6 删除；新域集合保留", () => {
    const names = new Set(COLLECTION_DEFS.map((definition) => definition.name));
    for (const legacy of [
      "talent_cultivation_contents",
      "talent_content_libraries",
      "talent_elements",
    ])
      expect(names.has(legacy), `${legacy} 必须已删除`).toBe(false);
    for (const kept of ["talent_gene_reports", "talent_reports", "talent_sync_logs"])
      expect(names.has(kept), `${kept} 必须保留`).toBe(true);
  });
});

// ── 年龄 / 匹配键 / 建议编号 ─────────────────────────────────────────────

describe("年龄精确周岁与匹配键", () => {
  it("生日当天 / 前一天 / 后一天按 effectiveAt 精确计算", () => {
    expect(calculateTalentAdviceAge("2018-11-12", "2026-11-12")).toBe(8);
    expect(calculateTalentAdviceAge("2018-11-13", "2026-11-12")).toBe(7);
    expect(calculateTalentAdviceAge("2018-11-11", "2026-11-12")).toBe(8);
    expect(calculateTalentAdviceAge("2018-09-08", "2026-11-12")).toBe(8);
  });

  it("0 岁合法；闰年 2-29；未来生日 / 非法生日返回 undefined", () => {
    expect(calculateTalentAdviceAge("2026-11-12", "2026-11-12")).toBe(0);
    expect(calculateTalentAdviceAge("2020-02-29", "2026-02-28")).toBe(5);
    expect(calculateTalentAdviceAge("2027-01-01", "2026-11-12")).toBeUndefined();
    expect(calculateTalentAdviceAge("2018-13-01", "2026-11-12")).toBeUndefined();
    expect(calculateTalentAdviceAge("", "2026-11-12")).toBeUndefined();
    expect(calculateTalentAdviceAge("2018-09-08", "")).toBeUndefined();
  });

  it("matchKey = 姓名｜N 岁（全角竖线）与年龄展示标签", () => {
    expect(buildTalentAdviceMatchKey("陈小示", 7)).toBe("陈小示｜7 岁");
    expect(formatTalentAdviceAgeLabel(0)).toBe("0 岁");
    expect(formatTalentAdviceGenderLabel("male")).toBe("男");
    expect(formatTalentAdviceGenderLabel("female")).toBe("女");
  });
});

describe("建议编号与版本号", () => {
  it("AD-{报告编号规范化}-{YYYYMM}，非字母数字替换为 -", () => {
    expect(buildTalentAdviceNo("GR202611160001", "2026-11-12")).toBe(
      "AD-GR202611160001-202611",
    );
    expect(buildTalentAdviceNo("GR 2026/11#0001", "2026-11-12")).toBe(
      "AD-GR-2026-11-0001-202611",
    );
    expect(buildTalentAdviceNo("GR202611160001", "2026-13-01")).toBe("");
    expect(isValidTalentAdviceNo("AD-GR202611160001-202611")).toBe(true);
    expect(isValidTalentAdviceNo("AD-GR/2026")).toBe(false);
    expect(
      buildTalentAdviceNo("X".repeat(120), "2026-11-12").length,
    ).toBeLessThanOrEqual(80);
    expect(formatTalentAdviceBookAdviceNo("AD-X-202611", "b")).toBe(
      "AD-X-202611-B",
    );
  });

  it("默认版本号 V{YYYY}.{MM}；4 个月周期与下一版时间", () => {
    expect(buildTalentAdviceVersionNo("2026-11-12")).toBe("V2026.11");
    expect(resolveTalentAdviceCycle("2026-11-12")).toEqual({
      cycle: "2026-11 ~ 2027-02",
      nextUpdateAt: "2027-03-12",
    });
    expect(resolveTalentAdviceCycle("2026-07-12")).toEqual({
      cycle: "2026-07 ~ 2026-10",
      nextUpdateAt: "2026-11-12",
    });
    expect(addTalentAdviceMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(normalizeTalentAdviceDate("2026-11-12T09:20:00.000Z")).toBe(
      "2026-11-12",
    );
    expect(normalizeTalentAdviceDate("2026-02-30")).toBeUndefined();
  });

  it("分册规范化：大写、升序、去重、仅 A–F；数据熵去「级」后命中白名单", () => {
    expect(normalizeTalentAdviceBooks("dabcA")).toEqual(["A", "B", "C", "D"]);
    expect(normalizeTalentAdviceBooks("")).toEqual([]);
    expect(normalizeTalentAdviceEntropy("优秀")).toBe("优秀");
    expect(normalizeTalentAdviceEntropy("优秀级")).toBe("优秀");
    expect(normalizeTalentAdviceEntropy("未知")).toBeUndefined();
    for (const level of TALENT_ADVICE_ENTROPY_LEVELS)
      expect(normalizeTalentAdviceEntropy(level)).toBe(level);
  });
});

// ── sections 归一化与校验 ────────────────────────────────────────────────

describe("sections 归一化与校验", () => {
  it("补齐默认值并按分册稳定排序（册内保持外部顺序）", () => {
    const result = normalizeTalentAdviceSections(
      [
        rawSection({ book: "B", chapter: "", entropy: "优秀级", variant: undefined }),
        rawSection({ book: "A", factor: "专注力" }),
        rawSection({ book: "A", factor: "语言表达" }),
      ],
      { books: "AB" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sections.map((section) => section.book)).toEqual([
      "A",
      "A",
      "B",
    ]);
    expect(result.sections.map((section) => section.factor)).toEqual([
      "专注力",
      "语言表达",
      "运动协调",
    ]);
    expect(result.sections[2]!.chapter).toBe("专项潜质");
    expect(result.sections[2]!.entropy).toBe("优秀");
    expect(result.sections[2]!.variant).toBe(1);
    expect(result.sections[0]!.bookName).toBe("生长发育");
  });

  it("空数组 / 四段全空 → empty_sections", () => {
    expect(normalizeTalentAdviceSections([])).toMatchObject({
      ok: false,
      code: "empty_sections",
    });
    const emptyText = normalizeTalentAdviceSections([
      rawSection({ content: "", example: "", direction: "", suggestion: "" }),
    ]);
    expect(emptyText).toMatchObject({ ok: false, code: "empty_sections" });
  });

  it("分册不合法 / 不在基因报告已出分册 → sections_invalid", () => {
    expect(normalizeTalentAdviceSections([rawSection({ book: "Z" })])).toMatchObject(
      { ok: false, code: "sections_invalid" },
    );
    expect(
      normalizeTalentAdviceSections([rawSection({ book: "C" })], { books: "AB" }),
    ).toMatchObject({ ok: false, code: "sections_invalid" });
  });

  it("要素/章节/文案超长、变体非法 → sections_invalid", () => {
    expect(
      normalizeTalentAdviceSections([rawSection({ factor: "" })]),
    ).toMatchObject({ ok: false, code: "sections_invalid" });
    expect(
      normalizeTalentAdviceSections([rawSection({ factor: "要".repeat(51) })]),
    ).toMatchObject({ ok: false, code: "sections_invalid" });
    expect(
      normalizeTalentAdviceSections([rawSection({ chapter: "章".repeat(101) })]),
    ).toMatchObject({ ok: false, code: "sections_invalid" });
    expect(
      normalizeTalentAdviceSections([
        rawSection({ content: "文".repeat(2001) }),
      ]),
    ).toMatchObject({ ok: false, code: "sections_invalid" });
    expect(
      normalizeTalentAdviceSections([rawSection({ variant: 0 })]),
    ).toMatchObject({ ok: false, code: "sections_invalid" });
    expect(
      normalizeTalentAdviceSections([rawSection({ variant: 1.5 })]),
    ).toMatchObject({ ok: false, code: "sections_invalid" });
    expect(
      normalizeTalentAdviceSections([rawSection({ entropy: "未知级" })]),
    ).toMatchObject({ ok: false, code: "sections_invalid" });
  });

  it("文本命中 18 位身份证 / 11 位手机号 → 整份拒绝（防外部误带 PII）", () => {
    expect(
      normalizeTalentAdviceSections([
        rawSection({ content: "证件号 110101201609081234 误带" }),
      ]),
    ).toMatchObject({ ok: false, code: "sections_invalid" });
    expect(
      normalizeTalentAdviceSections([
        rawSection({ suggestion: "联系 13800000001 获取" }),
      ]),
    ).toMatchObject({ ok: false, code: "sections_invalid" });
  });

  it("超 200 条 / 整份 >256KB → sections_invalid", () => {
    const tooMany = Array.from({ length: 201 }, () => rawSection());
    expect(normalizeTalentAdviceSections(tooMany)).toMatchObject({
      ok: false,
      code: "sections_invalid",
    });
    const huge = Array.from({ length: 120 }, () =>
      rawSection({
        content: "文".repeat(2000),
        example: "例".repeat(2000),
        direction: "向".repeat(2000),
        suggestion: "议".repeat(2000),
      }),
    );
    expect(normalizeTalentAdviceSections(huge)).toMatchObject({
      ok: false,
      code: "sections_invalid",
    });
  });

  it("四段允许空串（至少一条有正文即可）", () => {
    const result = normalizeTalentAdviceSections([
      rawSection({ content: "", example: "", direction: "", suggestion: "" }),
      rawSection({ factor: "专注力", content: "有效正文" }),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.sections).toHaveLength(2);
  });
});

// ── 派生缓存与展示文案 ──────────────────────────────────────────────────

describe("派生缓存与展示文案", () => {
  const sections = [
    makeSection({ book: "A", entropy: "优秀" }),
    makeSection({ book: "A", factor: "专注力", entropy: "常态" }),
    makeSection({
      book: "B",
      bookName: TALENT_ADVICE_BOOK_NAMES.B,
      factor: "语言表达",
      entropy: "优秀",
    }),
  ];

  it("sectionCount / bookCount / entropyCounts / firstFactorName 可重算", () => {
    const derived = buildTalentAdviceDerived(sections);
    expect(derived).toEqual({
      sectionCount: 3,
      bookCount: 2,
      entropyCounts: { 优秀: 2, 常态: 1 },
      firstFactorName: "运动协调",
    });
    expect(formatTalentAdviceEntropyText(derived.entropyCounts)).toBe(
      "优秀 2·常态 1",
    );
    expect(
      formatTalentAdviceCoveredFactorText(derived.firstFactorName, 3),
    ).toBe("运动协调 等 3 项");
    expect(formatTalentAdviceCoveredFactorText("", 0)).toBe("");
    expect(formatTalentAdviceEntropyText({})).toBe("");
  });

  it("sanitize 建议行：不含 idNoHash / sections / matchKey，派生列文案正确", () => {
    const row = sanitizeTalentAdviceDocRecord(
      makeDoc({ entropyCounts: { 优秀: 2, 常态: 1 }, sectionCount: 3 }),
      { clientVisible: true, activeVersionId: "version_1" },
    );
    expect(row.geneBookCount).toBe(2);
    expect(row.geneBookCountLabel).toBe("2 篇");
    expect(row.books).toBe("AB");
    expect(row.coveredFactorText).toBe("运动协调 等 3 项");
    expect(row.entropyText).toBe("优秀 2·常态 1");
    expect(row.ageLabel).toBe("8 岁");
    expect(row.publishStatusLabel).toBe("已发布");
    expect(row.clientVisible).toBe(true);
    expect(row.versionReadonly).toBe(false);
    const text = JSON.stringify(row);
    expect(text).not.toContain("idNoHash");
    expect(text).not.toContain("sections");
    expect(text).not.toContain("matchKey");
    expect(text).not.toMatch(/\d{17}[\dX]/);
  });

  it("sanitize 版本行：标签与按版本聚合统计；历史版本 isCurrent=false", () => {
    // PocketBase date 字段可能返回带时间的 ISO 字符串，视图统一成 YYYY-MM-DD。
    const view = sanitizeTalentAdviceVersionRecord(
      makeVersion({
        note: "说明",
        effectiveAt: "2026-11-12 00:00:00.000Z",
        nextUpdateAt: "2027-03-12 00:00:00.000Z",
      }),
      { docCount: 8, publishedCount: 7, withdrawnCount: 1 },
    );
    expect(view.statusLabel).toBe("当前生效");
    expect(view.isCurrent).toBe(true);
    expect(view.effectiveAt).toBe("2026-11-12");
    expect(view.nextUpdateAt).toBe("2027-03-12");
    expect(formatTalentAdviceDate("2026-11-12 00:00:00.000Z")).toBe("2026-11-12");
    expect(view.sourceLabel).toBe("本地演示源");
    expect(view.docCount).toBe(8);
    expect(view.publishedCount).toBe(7);
    expect(view.withdrawnCount).toBe(1);
    const archived = sanitizeTalentAdviceVersionRecord(
      makeVersion({ status: "archived", versionNo: "V2026.07" }),
    );
    expect(archived.statusLabel).toBe("已归档");
    expect(archived.isCurrent).toBe(false);
  });
});

describe("查看版本解析（回到当前生效版只清空筛选、不改数据）", () => {
  const versions = [
    makeVersion({ id: "v_current", versionNo: "V2026.11", status: "active" }),
    makeVersion({
      id: "v_old",
      versionNo: "V2026.07",
      status: "archived",
      effectiveAt: "2026-07-12",
    }),
  ];

  it("默认返回当前生效版；传历史版本返回只读视图", () => {
    expect(resolveTalentAdviceViewingVersion(versions)).toEqual({
      versionId: "v_current",
      versionName: "V2026.11",
      isCurrent: true,
    });
    expect(resolveTalentAdviceViewingVersion(versions, "v_old")).toEqual({
      versionId: "v_old",
      versionName: "V2026.07",
      isCurrent: false,
    });
    expect(resolveTalentAdviceViewingVersion([])).toBeNull();
  });

  it("versionId 不存在 → 404 ADVICE_VERSION_NOT_FOUND", () => {
    let error: { statusCode?: number; data?: { code?: string } } | undefined;
    try {
      resolveTalentAdviceViewingVersion(versions, "v_missing");
    } catch (caught) {
      error = caught as { statusCode?: number; data?: { code?: string } };
    }
    expect(error?.statusCode).toBe(404);
    expect(error?.data?.code).toBe("ADVICE_VERSION_NOT_FOUND");
  });
});

// ── 派生可见性：建议两态 × 报告三态 × 归属状态 ──────────────────────────

describe("派生可见性（不双写 M3 报告状态）", () => {
  const doc = {
    publishStatus: "published" as const,
    versionId: "version_1",
    subjectType: "child" as const,
    parentId: "parent_1",
  };
  const parent = { id: "parent_1", status: "1" as const };
  const child = { status: "1" as const, parentId: "parent_1" };
  const publishedReport = { status: "published" as const };

  it("已发布建议 + 当前生效版 + 报告已发布 + 归属正常 → 可见", () => {
    const input = {
      doc,
      activeVersionId: "version_1",
      report: publishedReport,
      parent,
      child,
    };
    expect(isTalentAdviceClientVisible(input)).toBe(true);
    expect(resolveTalentAdviceClientVisibility(input).text).toBe("可见");
  });

  it("建议已撤回 / 非当前生效版 / 报告待发布 / 报告已撤回 → 不可见", () => {
    expect(
      resolveTalentAdviceClientVisibility({
        doc: { ...doc, publishStatus: "withdrawn" },
        activeVersionId: "version_1",
        report: publishedReport,
        parent,
        child,
      }),
    ).toEqual({ visible: false, text: "不可见（建议已撤回）" });
    expect(
      resolveTalentAdviceClientVisibility({
        doc: { ...doc, versionId: "version_0" },
        activeVersionId: "version_1",
        report: publishedReport,
        parent,
        child,
      }),
    ).toEqual({ visible: false, text: "不可见（非当前生效版本）" });
    expect(
      resolveTalentAdviceClientVisibility({
        doc,
        activeVersionId: "version_1",
        report: { status: "pending_publish" },
        parent,
        child,
      }),
    ).toEqual({ visible: false, text: "不可见（报告未发布）" });
    expect(
      resolveTalentAdviceClientVisibility({
        doc,
        activeVersionId: "version_1",
        report: { status: "retracted" },
        parent,
        child,
      }),
    ).toEqual({ visible: false, text: "不可见（报告已撤回）" });
  });

  it("家长停用 / 子女解绑 / 归属不一致 / 缺归属 → 不可见", () => {
    expect(
      isTalentAdviceClientVisible({
        doc,
        activeVersionId: "version_1",
        report: publishedReport,
        parent: { id: "parent_1", status: "0" },
        child,
      }),
    ).toBe(false);
    expect(
      resolveTalentAdviceClientVisibility({
        doc,
        activeVersionId: "version_1",
        report: publishedReport,
        parent,
        child: { status: "2", parentId: "parent_1" },
      }).text,
    ).toBe("不可见（子女已解绑）");
    expect(
      resolveTalentAdviceClientVisibility({
        doc,
        activeVersionId: "version_1",
        report: publishedReport,
        parent,
        child: { status: "1", parentId: "parent_2" },
      }).text,
    ).toBe("不可见（子女档案不可用）");
    expect(
      isTalentAdviceClientVisible({
        doc,
        activeVersionId: "version_1",
        report: publishedReport,
        parent: null,
        child: null,
      }),
    ).toBe(false);
  });

  it("subjectType=self 不依赖子女档案", () => {
    expect(
      isTalentAdviceClientVisible({
        doc: { ...doc, subjectType: "self" },
        activeVersionId: "version_1",
        report: publishedReport,
        parent,
        child: null,
      }),
    ).toBe(true);
  });
});