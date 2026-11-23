/**
 * @description M3 报告域数据层测试：集合/索引声明（新集合、增量字段、customerId 放宽、旧集合保留）、
 *   A–F ↔ V1–V6 固定映射、增量分册计算、factorSnapshot / volumeSnapshot / directionSnapshot 构建、
 *   快照不可变（深冻结 / 改 M1 规则不回溯）、发布 / 撤回 / 恢复 / 补发 / 重算 / 选择的版本链与状态机、
 *   补发只追加（旧册 JSON 不变）、versions 截断、无明文/无敏感键。
 *   对应 docs/specs/M3-reports/spec.md §3/§4 与 §11 #1。数据全部虚构，不依赖 PocketBase / 网络。
 * @file test/talent-report-domain.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  COLLECTION_DEFS,
  TALENT_REPORT_COLLECTION_NAMES,
  TALENT_REPORT_INDEX_DEFS,
  indexNameFromSql,
} from "../scripts/setup.mjs";
import {
  TALENT_GENE_REPORT_BOOK_CODES,
  TALENT_REPORT_VOLUME_DEFINITIONS,
  TALENT_REPORT_VOLUME_IDS,
  type TalentGeneReportExternalSection,
  type TalentGeneReportRecord,
  type TalentReportDirectionRule,
  type TalentReportFactorNoteRule,
  type TalentReportFactorRule,
  type TalentReportLevelRule,
  type TalentReportRecord,
  type TalentReportSnapshotRules,
  type TalentReportTierRule,
} from "~~/shared/types/talent-report";
import {
  appendTalentReportVersion,
  assertTalentReportOpenVolumeIds,
  buildTalentReportDirectionSnapshot,
  buildTalentReportFactorSnapshot,
  buildTalentReportSnapshot,
  buildTalentReportVolumeSnapshot,
  cloneTalentReportSnapshot,
  computeTalentReportNewBooks,
  computeTalentReportNewVolumeIds,
  createTalentReportVersionEntry,
  freezeTalentReportSnapshot,
  matchTalentReportDirections,
  normalizeTalentReportBookCodes,
  normalizeTalentReportVolumeIds,
  planTalentReportPublish,
  planTalentReportRegenerate,
  planTalentReportReissue,
  planTalentReportRestore,
  planTalentReportSelectionVersion,
  planTalentReportWithdraw,
  refreshTalentReportFactorSnapshot,
  resolveTalentReportBookCode,
  resolveTalentReportVolumeId,
} from "~~/server/utils/talent-report-snapshot";

const AT = "2026-11-16T10:00:00.000Z";

// ── 虚构规则数据（M1 只读视图的测试替身） ─────────────────────────────────

const LEVELS: TalentReportLevelRule[] = [
  { code: "LV1", name: "常态", sortOrder: 1, status: "1" },
  { code: "LV2", name: "优良", sortOrder: 2, status: "1" },
  { code: "LV3", name: "优秀", sortOrder: 3, status: "1" },
  { code: "LV4", name: "卓越", sortOrder: 4, status: "1" },
];

const FACTORS: TalentReportFactorRule[] = [
  { code: "A-01", name: "运动协调", category: "A", categoryName: "生长发育" },
  { code: "A-02", name: "身体平衡", category: "A", categoryName: "生长发育" },
  { code: "B-01", name: "逻辑推理", category: "B", categoryName: "智商" },
  { code: "C-01", name: "情绪表达", category: "C", categoryName: "情商" },
  { code: "D-01", name: "领导意识", category: "D", categoryName: "领导商" },
];

const NOTES: TalentReportFactorNoteRule[] = [
  { factorCode: "A-01", levelCode: "LV3", note: "A-01-LV3 固定注解", status: "1" },
  { factorCode: "A-02", levelCode: "LV2", note: "A-02-LV2 固定注解", status: "1" },
  { factorCode: "B-01", levelCode: "LV1", note: "B-01-LV1 固定注解", status: "1" },
];

const TIERS: TalentReportTierRule[] = [
  {
    id: "tier_1",
    code: "T1",
    name: "启蒙",
    sortOrder: 1,
    teacher: "普通老师",
    freq: "每周 1 次",
    headline: "轻松开始",
    status: "1",
    isDefault: true,
  },
  {
    id: "tier_2",
    code: "T2",
    name: "养成",
    sortOrder: 2,
    teacher: "资深老师",
    freq: "每周 2 次",
    status: "1",
  },
  {
    id: "tier_3",
    code: "T3",
    name: "停用档",
    sortOrder: 3,
    teacher: "卓越老师",
    freq: "每周 3 次",
    status: "0",
  },
];

const DIRECTIONS: TalentReportDirectionRule[] = [
  {
    id: "dir_1",
    code: "DIR-001",
    name: "舞蹈启蒙",
    status: "1",
    version: 3,
    requirements: [{ code: "A-01", level: "LV2" }],
    tierIds: ["tier_1", "tier_2"],
    defaultTierId: "tier_1",
  },
  {
    id: "dir_2",
    code: "DIR-002",
    name: "逻辑思维",
    status: "1",
    version: 1,
    requirements: [{ code: "B-01", level: "LV4" }],
    tierIds: ["tier_1"],
    defaultTierId: "tier_1",
  },
  {
    id: "dir_off",
    code: "DIR-003",
    name: "停用方向",
    status: "0",
    version: 1,
    requirements: [{ code: "A-02", level: "LV1" }],
    tierIds: ["tier_1"],
    defaultTierId: "tier_1",
  },
];

function buildRules(): TalentReportSnapshotRules {
  return {
    factors: FACTORS.map((factor) => ({ ...factor })),
    levels: LEVELS.map((level) => ({ ...level })),
    notes: NOTES.map((note) => ({ ...note })),
    directions: DIRECTIONS.map((direction) => ({
      ...direction,
      requirements: direction.requirements.map((requirement) => ({ ...requirement })),
      tierIds: [...direction.tierIds],
    })),
    tiers: TIERS.map((tier) => ({ ...tier })),
  };
}

function sectionsOf(
  entries: Array<[string, string, string, string]>,
): TalentGeneReportExternalSection[] {
  return entries.map(([bookCode, chapter, factorCode, levelCode], index) => ({
    bookCode: bookCode as TalentGeneReportExternalSection["bookCode"],
    chapter,
    factorCode,
    levelCode,
    score: 70 + index,
    condition: "",
  }));
}

const AB_SECTIONS = sectionsOf([
  ["A", "1.1 生长发育概述", "A-01", "LV3"],
  ["A", "1.1 生长发育概述", "A-02", "LV2"],
  ["B", "2.1 智商概述", "B-01", "LV1"],
]);

const ABCD_SECTIONS = sectionsOf([
  ["A", "1.1 生长发育概述", "A-01", "LV3"],
  ["A", "1.1 生长发育概述", "A-02", "LV2"],
  ["B", "2.1 智商概述", "B-01", "LV1"],
  ["C", "3.1 情商概述", "C-01", "LV2"],
  ["D", "4.1 领导商概述", "D-01", "LV1"],
]);

function buildReport(
  overrides: Partial<TalentReportRecord> = {},
): TalentReportRecord {
  return {
    id: "report_1",
    created: AT,
    updated: AT,
    reportNo: "R202611160001",
    reportType: "gene_report",
    title: "陈小示·基因报告",
    status: "pending_publish",
    customerId: "",
    subjectType: "child",
    subjectId: "child_1",
    parentId: "parent_1",
    geneReportId: "gene_1",
    factorCount: 0,
    snapshotVersion: 0,
    snapshotAt: "",
    queriedAt: AT,
    openVolumeIds: [],
    factorSnapshot: [],
    volumeSnapshot: [],
    directionSnapshot: null,
    selections: [],
    versions: [],
    totalItems: 0,
    ...overrides,
  };
}

function buildGeneReport(
  overrides: Partial<TalentGeneReportRecord> = {},
): TalentGeneReportRecord {
  return {
    id: "gene_1",
    created: AT,
    updated: AT,
    subjectType: "child",
    subjectId: "child_1",
    parentId: "parent_1",
    reportNo: "R202611160001",
    name: "陈小示",
    gender: "female",
    birthday: "2016-09-08",
    age: 10,
    maskedIdNo: "1101**********1234",
    idNoHash: "a".repeat(64),
    issuer: "示例检测机构",
    filedAt: "2026-11-01",
    syncedAt: AT,
    source: "mock",
    version: "v1",
    books: "AB",
    sections: AB_SECTIONS,
    sectionCount: AB_SECTIONS.length,
    status: "synced",
    ...overrides,
  };
}

function captureError(action: () => unknown): any {
  try {
    action();
  } catch (error) {
    return error;
  }
  return null;
}

// ── 1. 集合 / 字段 / 索引声明（新库 schema 契约，不需要 PB） ────────────────

describe("M3 报告域 schema 声明", () => {
  it("新增 talent_gene_reports 且字段/关系齐全，M6 旧集合已删除", () => {
    expect(TALENT_REPORT_COLLECTION_NAMES).toEqual(["talent_gene_reports"]);
    const gene: any = COLLECTION_DEFS.find(
      (definition: any) => definition.name === "talent_gene_reports",
    );
    expect(gene).toBeTruthy();
    const fieldNames = gene.fields.map((field: any) => field.name);
    expect(fieldNames).toEqual(
      expect.arrayContaining([
        "subjectType",
        "subjectId",
        "reportNo",
        "name",
        "gender",
        "birthday",
        "age",
        "maskedIdNo",
        "idNoHash",
        "issuer",
        "filedAt",
        "syncedAt",
        "source",
        "version",
        "books",
        "sections",
        "sectionCount",
        "status",
      ]),
    );
    expect(gene.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "parentId", target: "talent_parents" }),
      ]),
    );
    // M6：旧报告子表 / 模板 / 接收 / 发布集合已删除；talent_reports 与 talent_sync_logs 保留。
    const names = COLLECTION_DEFS.map((definition: any) => definition.name);
    for (const legacy of [
      "talent_report_items",
      "talent_report_publications",
      "talent_report_receipts",
      "talent_report_templates",
      "talent_report_template_items",
    ])
      expect(names, `${legacy} 必须已删除`).not.toContain(legacy);
    for (const kept of ["talent_reports", "talent_sync_logs"])
      expect(names, `${kept} 必须保留`).toContain(kept);
  });

  it("talent_reports 保留新字段并已删除旧 customerId 关系", () => {
    const report: any = COLLECTION_DEFS.find(
      (definition: any) => definition.name === "talent_reports",
    );
    const fieldNames = report.fields.map((field: any) => field.name);
    expect(fieldNames).toEqual(
      expect.arrayContaining([
        // 旧字段保留
        "reportNo",
        "reportType",
        "title",
        "status",
        "publishedAt",
        "withdrawnAt",
        "totalItems",
        "pdfUrl",
        "sourceResults",
        "matchedPlanIds",
        // M3 增量字段
        "subjectType",
        "subjectId",
        "factorCount",
        "snapshotVersion",
        "snapshotAt",
        "queriedAt",
        "openVolumeIds",
        "factorSnapshot",
        "volumeSnapshot",
        "directionSnapshot",
        "selections",
        "versions",
        "restoredAt",
      ]),
    );
    // M6：旧 customerId 关系随旧会员集合删除（M6 规格 §2.2），新代码只认 parentId。
    expect(
      report.relations.find((relation: any) => relation.name === "customerId"),
    ).toBeUndefined();
    expect(report.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "parentId", target: "talent_parents" }),
        expect.objectContaining({
          name: "geneReportId",
          target: "talent_gene_reports",
        }),
        expect.objectContaining({ name: "createdBy", target: "users" }),
        expect.objectContaining({ name: "updatedBy", target: "users" }),
      ]),
    );
  });

  it("talent_sync_logs 只增量加逐人明细字段", () => {
    const logs: any = COLLECTION_DEFS.find(
      (definition: any) => definition.name === "talent_sync_logs",
    );
    const fieldNames = logs.fields.map((field: any) => field.name);
    expect(fieldNames).toEqual(
      expect.arrayContaining([
        "trigger",
        "status",
        "startedAt",
        "durationMs",
        "received",
        "generated",
        "failedCount",
        "details",
        "syncScope",
        "mode",
        "refreshed",
        "createdCount",
        "empty",
        "subjectDetails",
        "operatorId",
      ]),
    );
  });

  it("新库索引清单与 spec §3.4 一致（4 + 5 条）", () => {
    const indexNames = TALENT_REPORT_INDEX_DEFS.map((entry: string[]) =>
      indexNameFromSql(entry[1] ?? ""),
    );
    expect(indexNames).toEqual(
      expect.arrayContaining([
        "idx_talent_gene_reports_subject",
        "idx_talent_gene_reports_no",
        "idx_talent_gene_reports_parent",
        "idx_talent_gene_reports_synced",
        "idx_talent_reports_subject",
        "idx_talent_reports_status",
        "idx_talent_reports_parent",
        "idx_talent_reports_gene",
        "idx_talent_reports_subject_id",
      ]),
    );
    expect(indexNames).toHaveLength(9);
    const subjectIndex = TALENT_REPORT_INDEX_DEFS.find(
      (entry: string[]) =>
        indexNameFromSql(entry[1] ?? "") === "idx_talent_reports_subject",
    );
    expect(subjectIndex?.[1]).toContain(
      "UNIQUE INDEX idx_talent_reports_subject",
    );
    expect(subjectIndex?.[1]).toContain('WHERE subjectType != ""');
    expect(
      TALENT_REPORT_INDEX_DEFS.find(
        (entry: string[]) =>
          indexNameFromSql(entry[1] ?? "") ===
          "idx_talent_gene_reports_subject",
      )?.[1],
    ).toContain("UNIQUE INDEX idx_talent_gene_reports_subject");
  });
});

// ── 2. 固定映射与增量分册 ────────────────────────────────────────────────

describe("A–F ↔ V1–V6 固定映射与增量分册", () => {
  it("六册固定映射与册名正确", () => {
    expect(TALENT_REPORT_VOLUME_IDS).toHaveLength(6);
    expect(TALENT_GENE_REPORT_BOOK_CODES).toHaveLength(6);
    expect(
      TALENT_REPORT_VOLUME_DEFINITIONS.map((item) => [
        item.volumeId,
        item.bookCode,
        item.name,
      ]),
    ).toEqual([
      ["V1", "A", "生长发育"],
      ["V2", "B", "智商"],
      ["V3", "C", "情商"],
      ["V4", "D", "领导商"],
      ["V5", "E", "艺术商"],
      ["V6", "F", "体育运动商"],
    ]);
    expect(resolveTalentReportVolumeId("D")).toBe("V4");
    expect(resolveTalentReportBookCode("V6")).toBe("F");
    expect(resolveTalentReportVolumeId("Z")).toBe("");
    expect(resolveTalentReportBookCode("V9")).toBe("");
  });

  it("books 规范化：大写、去重、去非法、升序", () => {
    expect(normalizeTalentReportBookCodes("dcab")).toEqual(["A", "B", "C", "D"]);
    expect(normalizeTalentReportBookCodes(["B", "B", "A", "Z", ""])).toEqual([
      "A",
      "B",
    ]);
    expect(normalizeTalentReportBookCodes(null)).toEqual([]);
    expect(normalizeTalentReportVolumeIds(["V3", "V1", "V1", "V9"])).toEqual([
      "V1",
      "V3",
    ]);
  });

  it("新增分册 = 外部已出 − 已开放，并给出 V 号", () => {
    expect(computeTalentReportNewBooks("ABCD", ["V1", "V2"])).toEqual([
      "C",
      "D",
    ]);
    expect(computeTalentReportNewBooks("AB", ["V1", "V2"])).toEqual([]);
    expect(computeTalentReportNewBooks("", [])).toEqual([]);
    expect(computeTalentReportNewVolumeIds("ABCD", ["V1"])).toEqual([
      "V2",
      "V3",
      "V4",
    ]);
  });
});

// ── 3. factorSnapshot ─────────────────────────────────────────────────────

describe("factorSnapshot 构建", () => {
  it("外部名优先、缺失回退 M1；级序/分级名/注解/分册名冻结", () => {
    const sections = sectionsOf([
      ["B", "2.1 智商概述", "B-01", "LV1"],
      ["A", "1.2 生长发育进阶", "A-02", "LV2"],
      ["A", "1.1 生长发育概述", "A-01", "LV3"],
    ]);
    sections[0] = { ...sections[0]!, factorName: "外部逻辑名" };
    const built = buildTalentReportFactorSnapshot({
      books: ["A", "B"],
      sections,
      rules: buildRules(),
    });
    expect(built.items).toHaveLength(3);
    // 排序：分册 A–F 升序 → 章节「首次出现顺序」→ sections 原顺序。
    // sections 里 A 册先出现 1.2（A-02）、再出现 1.1（A-01），故 A-02 在 A-01 前。
    expect(built.items.map((item) => item.code)).toEqual([
      "A-02",
      "A-01",
      "B-01",
    ]);
    const a01 = built.items[1]!;
    expect(a01).toMatchObject({
      name: "运动协调",
      category: "A",
      categoryName: "生长发育",
      volumeId: "V1",
      bookCode: "A",
      chapter: "1.1 生长发育概述",
      levelCode: "LV3",
      levelName: "优秀",
      levelOrder: 3,
      note: "A-01-LV3 固定注解",
      condition: "",
    });
    // 外部名优先（B-01 的章节来自外部 sections[0]，但排序后被放到最后）。
    expect(built.items[2]!.name).toBe("外部逻辑名");
    expect(built.warnings).toEqual([]);
  });

  it("未知分级 / 缺注解按原值冻结并产生 warnings", () => {
    const sections = sectionsOf([
      ["A", "1.1 概述", "A-01", "LV9"],
      ["A", "1.1 概述", "A-02", "LV3"],
    ]);
    const built = buildTalentReportFactorSnapshot({
      books: ["A"],
      sections,
      rules: buildRules(),
    });
    expect(built.items).toHaveLength(2);
    const a01 = built.items.find((item) => item.code === "A-01")!;
    expect(a01).toMatchObject({
      levelCode: "LV9",
      levelName: "",
      levelOrder: 0,
      note: "",
    });
    const a02 = built.items.find((item) => item.code === "A-02")!;
    expect(a02.note).toBe("");
    expect(built.warnings.join("\n")).toContain("LV9");
    expect(built.warnings.join("\n")).toContain("A-02");
  });

  it("重复要素编码只保留首条并告警；不在已出册的篇目被跳过", () => {
    const sections = sectionsOf([
      ["A", "1.1 概述", "A-01", "LV3"],
      ["A", "1.1 概述", "A-01", "LV1"],
      ["C", "3.1 概述", "C-01", "LV2"],
    ]);
    const built = buildTalentReportFactorSnapshot({
      books: ["A", "B"],
      sections,
      rules: buildRules(),
    });
    expect(built.items.map((item) => item.code)).toEqual(["A-01"]);
    expect(built.items[0]!.levelCode).toBe("LV3");
    expect(built.warnings.join("\n")).toContain("重复");
    expect(built.warnings.join("\n")).toContain("C");
  });
});

// ── 4. volumeSnapshot ─────────────────────────────────────────────────────

describe("volumeSnapshot 构建", () => {
  it("固定 6 项、顺序 V1→V6、open 与 openVolumeIds 一致、章节分组与计数正确", () => {
    const factorSnapshot = buildTalentReportFactorSnapshot({
      books: ["A", "B"],
      sections: AB_SECTIONS,
      rules: buildRules(),
    }).items;
    const volumes = buildTalentReportVolumeSnapshot({
      factorSnapshot,
      books: ["A", "B"],
      openVolumeIds: ["V1"],
    });
    expect(volumes).toHaveLength(6);
    expect(volumes.map((volume) => volume.volumeId)).toEqual([
      "V1",
      "V2",
      "V3",
      "V4",
      "V5",
      "V6",
    ]);
    expect(volumes[0]).toMatchObject({
      bookCode: "A",
      name: "生长发育",
      open: true,
      chapterCount: 1,
      factorCount: 2,
    });
    expect(volumes[0]!.chapters[0]!.chapter).toBe("1.1 生长发育概述");
    expect(volumes[0]!.chapters[0]!.factors.map((item) => item.code)).toEqual([
      "A-01",
      "A-02",
    ]);
    expect(volumes[1]).toMatchObject({ open: false, factorCount: 1 });
    expect(volumes[2]).toMatchObject({
      open: false,
      chapterCount: 0,
      factorCount: 0,
      chapters: [],
    });
  });

  it("volumeSnapshot 是 factorSnapshot 的展示子集（不含 score/condition 等）", () => {
    const factorSnapshot = buildTalentReportFactorSnapshot({
      books: ["A"],
      sections: AB_SECTIONS,
      rules: buildRules(),
    }).items;
    const volumes = buildTalentReportVolumeSnapshot({
      factorSnapshot,
      books: ["A"],
      openVolumeIds: ["V1"],
    });
    expect(Object.keys(volumes[0]!.chapters[0]!.factors[0]!).sort()).toEqual([
      "code",
      "levelCode",
      "levelName",
      "name",
      "note",
    ]);
  });
});

// ── 5. directionSnapshot（调用 M4 纯函数） ─────────────────────────────────

describe("directionSnapshot 构建", () => {
  it("冻结 9 个顶层键，含全部已评估方向（含 0 命中）、停用方向不进快照", () => {
    const factorSnapshot = buildTalentReportFactorSnapshot({
      books: ["A", "B"],
      sections: AB_SECTIONS,
      rules: buildRules(),
    }).items;
    const snapshot = buildTalentReportDirectionSnapshot({
      factorSnapshot,
      rules: buildRules(),
      snapshotVersion: 1,
      at: AT,
      operatorId: "user_1",
      operatorName: "管理员示例",
      recommendLimit: 5,
      selectionLimit: 3,
    });
    expect(Object.keys(snapshot).sort()).toEqual([
      "at",
      "directions",
      "levelOrders",
      "operatorId",
      "operatorName",
      "recommendLimit",
      "selectionLimit",
      "tiers",
      "version",
    ]);
    expect(snapshot).toMatchObject({
      version: 1,
      at: AT,
      operatorId: "user_1",
      operatorName: "管理员示例",
      recommendLimit: 5,
      selectionLimit: 3,
    });
    // 停用方向不进快照；DIR-001 命中（A-01 LV3 ≥ LV2），DIR-002 未命中（B-01 LV1 < LV4）。
    expect(snapshot.directions.map((item) => item.code)).toEqual(
      expect.arrayContaining(["DIR-001", "DIR-002"]),
    );
    expect(snapshot.directions.some((item) => item.code === "DIR-003")).toBe(
      false,
    );
    const dir1 = snapshot.directions.find((item) => item.code === "DIR-001")!;
    expect(dir1).toMatchObject({ hitCount: 1, total: 1, hitRate: 1 });
    expect(dir1.requirements[0]).toMatchObject({
      code: "A-01",
      level: "LV2",
      actualOrder: 3,
      needOrder: 2,
      met: true,
      gap: 0,
    });
    const dir2 = snapshot.directions.find((item) => item.code === "DIR-002")!;
    expect(dir2).toMatchObject({ hitCount: 0, total: 1, hitRate: 0 });
    expect(dir2.requirements[0]).toMatchObject({
      met: false,
      needOrder: 4,
      actualOrder: 1,
      gap: 3,
    });
    // 停用档位不进快照，tierIds 与启用档位求交。
    expect(snapshot.tiers.map((tier) => tier.code)).toEqual(["T1", "T2"]);
    expect(dir1.tierIds).toEqual(["tier_1", "tier_2"]);
    // 冻结级序快照，读取时不再反查分级表。
    expect(snapshot.levelOrders).toEqual({
      LV1: 1,
      LV2: 2,
      LV3: 3,
      LV4: 4,
    });
  });

  it("matchTalentReportDirections 直接使用 M4 matchDirections 产出全部命中与推荐", () => {
    const factorSnapshot = buildTalentReportFactorSnapshot({
      books: ["A", "B"],
      sections: AB_SECTIONS,
      rules: buildRules(),
    }).items;
    const result = matchTalentReportDirections({
      factorSnapshot,
      rules: buildRules(),
    });
    expect(result.hits.map((hit) => hit.code)).toEqual(
      expect.arrayContaining(["DIR-001", "DIR-002"]),
    );
    expect(result.recommendLimit).toBe(5);
    expect(result.hits.find((hit) => hit.code === "DIR-001")?.hitCount).toBe(1);
  });
});

// ── 6. 发布 / 撤回 / 恢复 / 补发 / 重算 / 选择 ────────────────────────────

describe("报告状态机与版本链", () => {
  it("发布：待发布 → 已发布 v1，冻结三件套并写 publish 版本", () => {
    const plan = planTalentReportPublish({
      report: buildReport(),
      geneReport: buildGeneReport(),
      openVolumeIds: ["V1", "V2"],
      rules: buildRules(),
      now: new Date(AT),
      operatorId: "user_1",
      operatorName: "管理员示例",
    });
    expect(plan.status).toBe("published");
    expect(plan.snapshotVersion).toBe(1);
    expect(plan.snapshotAt).toBe(AT);
    expect(plan.publishedAt).toBe(AT);
    expect(plan.openVolumeIds).toEqual(["V1", "V2"]);
    expect(plan.factorCount).toBe(3);
    expect(plan.totalItems).toBe(3);
    expect(plan.factorSnapshot).toHaveLength(3);
    expect(plan.volumeSnapshot).toHaveLength(6);
    expect(plan.directionSnapshot).toBeTruthy();
    expect(plan.versionEntry).toMatchObject({
      version: 1,
      type: "publish",
      books: ["A", "B"],
      operatorId: "user_1",
    });
    expect(plan.versions).toHaveLength(1);
    expect(plan.versionEntry.summary).toContain("发布");
    expect(plan.versionEntry.summary).toContain("A、B");
  });

  it("发布校验：至少 1 册、不能重复、必须外部已出且有要素，状态必须待发布", () => {
    const base = {
      report: buildReport(),
      geneReport: buildGeneReport(),
      rules: buildRules(),
      now: new Date(AT),
    };
    expect(
      captureError(() =>
        planTalentReportPublish({ ...base, openVolumeIds: [] }),
      )?.statusCode,
    ).toBe(422);
    expect(
      captureError(() =>
        planTalentReportPublish({ ...base, openVolumeIds: ["V1", "V1"] }),
      )?.statusCode,
    ).toBe(422);
    expect(
      captureError(() =>
        planTalentReportPublish({ ...base, openVolumeIds: ["V3"] }),
      )?.statusCode,
    ).toBe(422);
    expect(
      captureError(() =>
        planTalentReportPublish({
          ...base,
          report: buildReport({ status: "published" }),
          openVolumeIds: ["V1"],
        }),
      )?.statusCode,
    ).toBe(409);
    // 直接调用校验函数也一致。
    const factorSnapshot = buildTalentReportFactorSnapshot({
      books: ["A", "B"],
      sections: AB_SECTIONS,
      rules: buildRules(),
    }).items;
    expect(
      captureError(() =>
        assertTalentReportOpenVolumeIds([], ["A", "B"], factorSnapshot),
      )?.statusCode,
    ).toBe(422);
  });

  it("撤回 / 恢复：快照与 snapshotVersion 不变，只追加版本记录", () => {
    const published = buildReport({
      status: "published",
      snapshotVersion: 1,
      snapshotAt: AT,
      openVolumeIds: ["V1", "V2"],
      factorSnapshot: buildTalentReportFactorSnapshot({
        books: ["A", "B"],
        sections: AB_SECTIONS,
        rules: buildRules(),
      }).items,
      versions: [
        { version: 1, type: "publish", summary: "发布", books: ["A", "B"], operatorId: "", operatorName: "", at: AT },
      ],
    });
    const withdraw = planTalentReportWithdraw({
      report: published,
      now: new Date(AT),
      operatorId: "user_1",
      reason: "信息校对",
    });
    expect(withdraw.status).toBe("retracted");
    expect(withdraw.withdrawnAt).toBe(AT);
    expect(withdraw.snapshotVersion).toBe(1);
    expect(withdraw.versionEntry).toMatchObject({
      version: 1,
      type: "withdraw",
    });
    expect(withdraw.versionEntry.summary).toContain("信息校对");
    expect(withdraw.versions).toHaveLength(2);

    const retracted = buildReport({
      ...published,
      status: "retracted",
      withdrawnAt: AT,
      versions: withdraw.versions,
    });
    const restore = planTalentReportRestore({
      report: retracted,
      now: new Date(AT),
      operatorId: "user_1",
    });
    expect(restore.status).toBe("published");
    expect(restore.restoredAt).toBe(AT);
    expect(restore.snapshotVersion).toBe(1);
    expect(restore.versionEntry).toMatchObject({ version: 1, type: "restore" });
    expect(restore.versions).toHaveLength(3);
    // 计划只含状态 / 时间 / versions，不含任何快照字段。
    expect(Object.keys(restore).sort()).toEqual(
      ["restoredAt", "snapshotVersion", "status", "versionEntry", "versions"].sort(),
    );
  });

  it("非法状态迁移一律 409", () => {
    expect(
      captureError(() =>
        planTalentReportWithdraw({ report: buildReport({ status: "retracted" }) }),
      )?.statusCode,
    ).toBe(409);
    expect(
      captureError(() =>
        planTalentReportRestore({ report: buildReport({ status: "published" }) }),
      )?.statusCode,
    ).toBe(409);
    expect(
      captureError(() =>
        planTalentReportPublish({
          report: buildReport({ status: "retracted" }),
          geneReport: buildGeneReport(),
          openVolumeIds: ["V1"],
          rules: buildRules(),
        }),
      )?.statusCode,
    ).toBe(409);
  });

  it("补发：只追加新册，旧 factorSnapshot / volumeSnapshot 逐项不变，v+1", () => {
    const rules = buildRules();
    const published = planTalentReportPublish({
      report: buildReport(),
      geneReport: buildGeneReport(),
      openVolumeIds: ["V1", "V2"],
      rules,
      now: new Date(AT),
      operatorId: "user_1",
      operatorName: "管理员示例",
    });
    const publishedReport = buildReport({
      status: "published",
      openVolumeIds: published.openVolumeIds,
      factorSnapshot: published.factorSnapshot,
      volumeSnapshot: published.volumeSnapshot,
      directionSnapshot: published.directionSnapshot,
      snapshotVersion: published.snapshotVersion,
      snapshotAt: published.snapshotAt,
      factorCount: published.factorCount,
      versions: published.versions,
    });
    const oldVolumeJson = JSON.stringify(
      published.volumeSnapshot.slice(0, 2),
    );
    const oldFactorJson = JSON.stringify(
      published.factorSnapshot.filter(
        (item) => item.bookCode === "A" || item.bookCode === "B",
      ),
    );
    const oldDirRequirementJson = JSON.stringify(
      published.directionSnapshot.directions.find(
        (item) => item.code === "DIR-001",
      )?.requirements,
    );

    const reissue = planTalentReportReissue({
      report: publishedReport,
      geneReport: buildGeneReport({
        books: "ABCD",
        sections: ABCD_SECTIONS,
        sectionCount: ABCD_SECTIONS.length,
      }),
      rules,
      now: new Date("2026-11-20T10:00:00.000Z"),
      operatorId: "user_1",
      operatorName: "管理员示例",
    });
    expect(reissue.snapshotVersion).toBe(2);
    expect(reissue.addedBooks).toEqual(["C", "D"]);
    expect(reissue.addedVolumeIds).toEqual(["V3", "V4"]);
    expect(reissue.openVolumeIds).toEqual(["V1", "V2", "V3", "V4"]);
    expect(reissue.factorCount).toBe(5);
    expect(reissue.status).toBe("published");
    expect(reissue.versionEntry).toMatchObject({
      version: 2,
      type: "reissue",
      books: ["C", "D"],
    });
    expect(reissue.versions).toHaveLength(2);
    // 旧册 volumeSnapshot 逐项不变（JSON 序列化相等）。
    expect(
      JSON.stringify(reissue.volumeSnapshot.slice(0, 2)),
    ).toBe(oldVolumeJson);
    // 旧要素 factorSnapshot 逐项不变。
    expect(
      JSON.stringify(
        reissue.factorSnapshot.filter(
          (item) => item.bookCode === "A" || item.bookCode === "B",
        ),
      ),
    ).toBe(oldFactorJson);
    // 新增册进入快照且 open。
    expect(reissue.factorSnapshot.map((item) => item.code)).toEqual(
      expect.arrayContaining(["A-01", "A-02", "B-01", "C-01", "D-01"]),
    );
    expect(reissue.volumeSnapshot[2]).toMatchObject({
      volumeId: "V3",
      open: true,
      factorCount: 1,
    });
    expect(reissue.volumeSnapshot[3]).toMatchObject({
      volumeId: "V4",
      open: true,
      factorCount: 1,
    });
    // 未涉及新增要素的方向要求原样复制。
    expect(
      JSON.stringify(
        reissue.directionSnapshot.directions.find(
          (item) => item.code === "DIR-001",
        )?.requirements,
      ),
    ).toBe(oldDirRequirementJson);
    expect(reissue.directionSnapshot).toMatchObject({
      version: 2,
      at: "2026-11-20T10:00:00.000Z",
    });
  });

  it("补发：无新增册 / 非已发布 → 409", () => {
    const rules = buildRules();
    const published = planTalentReportPublish({
      report: buildReport(),
      geneReport: buildGeneReport(),
      openVolumeIds: ["V1", "V2"],
      rules,
    });
    const report = buildReport({
      status: "published",
      openVolumeIds: published.openVolumeIds,
      factorSnapshot: published.factorSnapshot,
      volumeSnapshot: published.volumeSnapshot,
      directionSnapshot: published.directionSnapshot,
      snapshotVersion: 1,
    });
    expect(
      captureError(() =>
        planTalentReportReissue({
          report,
          geneReport: buildGeneReport(),
          rules,
        }),
      )?.statusCode,
    ).toBe(409);
    expect(
      captureError(() =>
        planTalentReportReissue({
          report: buildReport({ status: "pending_publish" }),
          geneReport: buildGeneReport({ books: "ABCD" }),
          rules,
        }),
      )?.statusCode,
    ).toBe(409);
  });

  it("显式重算：v+1、状态不变、注解/级序刷新、开放册不变、全量重算方向", () => {
    const rules = buildRules();
    const published = planTalentReportPublish({
      report: buildReport(),
      geneReport: buildGeneReport(),
      openVolumeIds: ["V1", "V2"],
      rules,
      now: new Date(AT),
    });
    const report = buildReport({
      status: "published",
      openVolumeIds: published.openVolumeIds,
      factorSnapshot: published.factorSnapshot,
      volumeSnapshot: published.volumeSnapshot,
      directionSnapshot: published.directionSnapshot,
      snapshotVersion: published.snapshotVersion,
      versions: published.versions,
    });
    const changedRules = buildRules();
    changedRules.notes = changedRules.notes.map((note) =>
      note.factorCode === "A-01"
        ? { ...note, note: "A-01-LV3 新注解" }
        : note,
    );
    changedRules.levels = changedRules.levels.map((level) =>
      level.code === "LV3" ? { ...level, sortOrder: 4, name: "卓越+" } : level,
    );
    const regenerate = planTalentReportRegenerate({
      report,
      rules: changedRules,
      now: new Date("2026-11-21T10:00:00.000Z"),
      operatorId: "user_1",
      operatorName: "管理员示例",
    });
    expect(regenerate.snapshotVersion).toBe(2);
    expect(regenerate.versionEntry).toMatchObject({
      version: 2,
      type: "regenerate",
    });
    expect(regenerate.versions).toHaveLength(2);
    expect(regenerate.factorCount).toBe(3);
    const a01 = regenerate.factorSnapshot.find((item) => item.code === "A-01")!;
    expect(a01.note).toBe("A-01-LV3 新注解");
    expect(a01.levelName).toBe("卓越+");
    expect(a01.levelOrder).toBe(4);
    // 要素集合 / 开放册不变。
    expect(regenerate.volumeSnapshot.every((volume, index) =>
      index < 2 ? volume.open : !volume.open,
    )).toBe(true);
    expect(regenerate.directionSnapshot).toMatchObject({ version: 2 });
    // 重算后 DIR-001 仍命中（LV3→级序 4 ≥ LV2 级序 2）。
    const dir1 = regenerate.directionSnapshot.directions.find(
      (item) => item.code === "DIR-001",
    )!;
    expect(dir1.hitCount).toBe(1);
    expect(dir1.requirements[0]!.actualOrder).toBe(4);
    // 计划里状态不变：不含 status 键。
    expect("status" in regenerate).toBe(false);
  });

  it("未发布 / 无快照报告不能重算 → 409", () => {
    expect(
      captureError(() =>
        planTalentReportRegenerate({
          report: buildReport({ status: "pending_publish" }),
          rules: buildRules(),
        }),
      )?.statusCode,
    ).toBe(409);
    expect(
      captureError(() =>
        planTalentReportRegenerate({
          report: buildReport({ status: "published", factorSnapshot: [] }),
          rules: buildRules(),
        }),
      )?.statusCode,
    ).toBe(409);
  });

  it("方向选择只追加 selection 版本、不改 snapshotVersion 与快照", () => {
    const report = buildReport({ status: "published", snapshotVersion: 2 });
    const plan = planTalentReportSelectionVersion({
      report,
      summary: "家长选择「舞蹈启蒙」·目标档位 精进",
      now: new Date(AT),
    });
    expect(plan.snapshotVersion).toBe(2);
    expect(plan.versionEntry).toMatchObject({
      version: 2,
      type: "selection",
      summary: "家长选择「舞蹈启蒙」·目标档位 精进",
    });
    expect(plan.versions).toHaveLength(1);
    expect("factorSnapshot" in plan).toBe(false);
    expect(
      captureError(() =>
        planTalentReportSelectionVersion({
          report: buildReport({ status: "pending_publish" }),
          summary: "x",
        }),
      )?.statusCode,
    ).toBe(409);
  });
});

// ── 7. 版本链上限与快照不可变 ─────────────────────────────────────────────

describe("版本链与快照不可变", () => {
  it("版本历史超过 200 条保留最近 200 条并加「历史已截断」前缀", () => {
    const versions = Array.from({ length: 200 }, (_, index) => ({
      version: index + 1,
      type: "selection" as const,
      summary: `第 ${index + 1} 次`,
      operatorId: "",
      operatorName: "",
      at: AT,
    }));
    const entry = createTalentReportVersionEntry({
      version: 200,
      type: "selection",
      summary: "第 201 次",
      at: AT,
    });
    const next = appendTalentReportVersion(versions, entry);
    expect(next).toHaveLength(200);
    expect(next[next.length - 1]!.summary).toBe("第 201 次");
    expect(next[0]!.summary.startsWith("历史已截断；")).toBe(true);
    // 再次追加不重复前缀。
    const again = appendTalentReportVersion(next, entry);
    expect(again[0]!.summary.startsWith("历史已截断；历史已截断；")).toBe(false);
  });

  it("快照构建结果深冻结；克隆后可改，原对象不变", () => {
    const built = buildTalentReportSnapshot({
      books: ["A", "B"],
      sections: AB_SECTIONS,
      openVolumeIds: ["V1"],
      rules: buildRules(),
      snapshotVersion: 1,
      at: AT,
      operatorId: "user_1",
      operatorName: "管理员示例",
    });
    expect(Object.isFrozen(built.factorSnapshot)).toBe(true);
    expect(Object.isFrozen(built.factorSnapshot[0])).toBe(true);
    expect(Object.isFrozen(built.volumeSnapshot[0]!.chapters)).toBe(true);
    expect(Object.isFrozen(built.directionSnapshot.directions)).toBe(true);
    const before = JSON.stringify(built.factorSnapshot);
    expect(() => {
      (built.factorSnapshot[0] as { note: string }).note = "被篡改";
    }).toThrow();
    expect(JSON.stringify(built.factorSnapshot)).toBe(before);
    const cloned = cloneTalentReportSnapshot(built.factorSnapshot);
    cloned[0]!.note = "克隆后修改";
    expect(built.factorSnapshot[0]!.note).not.toBe("克隆后修改");
    const frozenClone = freezeTalentReportSnapshot({ note: "x" });
    expect(Object.isFrozen(frozenClone)).toBe(true);
  });

  it("发布后修改 M1 规则（名称/注解/级序）不影响已冻结快照", () => {
    const rules = buildRules();
    const built = buildTalentReportSnapshot({
      books: ["A", "B"],
      sections: AB_SECTIONS,
      openVolumeIds: ["V1", "V2"],
      rules,
      snapshotVersion: 1,
      at: AT,
    });
    const snapshotHash = JSON.stringify(built.factorSnapshot);
    const directionHash = JSON.stringify(built.directionSnapshot.directions);
    // 模拟发布后运营修改 M1：改要素名、注解、级序、方向名称。
    rules.factors[0]!.name = "改过的要素名";
    rules.notes[0]!.note = "改过的注解";
    rules.levels[2]!.sortOrder = 4;
    rules.directions[0]!.name = "改过的方向名";
    expect(JSON.stringify(built.factorSnapshot)).toBe(snapshotHash);
    expect(JSON.stringify(built.directionSnapshot.directions)).toBe(
      directionHash,
    );
  });

  it("快照 JSON 不含明文手机号/身份证、不含 Cipher/Hash 键", () => {
    const built = buildTalentReportSnapshot({
      books: ["A", "B", "C", "D"],
      sections: ABCD_SECTIONS,
      openVolumeIds: ["V1"],
      rules: buildRules(),
      snapshotVersion: 1,
      at: AT,
    });
    const text = JSON.stringify({
      factorSnapshot: built.factorSnapshot,
      volumeSnapshot: built.volumeSnapshot,
      directionSnapshot: built.directionSnapshot,
    });
    expect(text).not.toMatch(/\d{17}[\dX]/);
    expect(text).not.toMatch(/1[3-9]\d{9}/);
    expect(text).not.toMatch(/Cipher|Hash/);
  });

  it("refreshTalentReportFactorSnapshot 只刷新注解/级序，不增删要素", () => {
    const built = buildTalentReportFactorSnapshot({
      books: ["A"],
      sections: sectionsOf([["A", "1.1 概述", "A-01", "LV3"]]),
      rules: buildRules(),
    });
    const refreshed = refreshTalentReportFactorSnapshot(
      built.items,
      buildRules(),
    );
    expect(refreshed.items).toHaveLength(1);
    expect(refreshed.items[0]!.code).toBe("A-01");
    expect(refreshed.items[0]!.note).toBe("A-01-LV3 固定注解");
  });
});