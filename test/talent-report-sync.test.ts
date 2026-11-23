/**
 * @description M3 报告域一键同步测试：候选枚举（M2 已查到）、三类归因、preview 零写入、
 *   commit 幂等（唯一键 upsert，行数不增）、刷新同步不改已发布快照、单条失败不中断、
 *   外部源整体不可用 503、并发 commit 409、subjectDetails 不含明文、Mock 五种模式、
 *   报告编号生成与外部篇目校验。
 *   对应 docs/specs/M3-reports/spec.md §4.2/§9 与 §11 #2。数据全部虚构，使用内存假实现，不依赖 PB / 网络。
 * @file test/talent-report-sync.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  TalentGeneReportExternalData,
  TalentGeneReportRecord,
  TalentGeneReportSource,
  TalentGeneReportSyncSubject,
  TalentReportRecord,
  TalentReportSyncCandidate,
  TalentReportSyncLogInput,
} from "~~/shared/types/talent-report";
import {
  TALENT_GENE_REPORT_MOCK_SOURCE,
  bumpTalentReportNo,
  commitTalentReportSync,
  createMockTalentGeneReportSource,
  formatTalentReportNo,
  previewTalentReportSync,
  resolveTalentGeneReportMockMode,
  resolveTalentGeneReportSourceKind,
  sanitizeTalentReportSyncMessage,
  validateTalentGeneReportExternalData,
  type TalentReportSyncRecordData,
  type TalentReportSyncStore,
} from "~~/server/utils/talent-report-source";

const AT = "2026-11-16T10:00:00.000Z";
const ID_NO = "110101201609081234";
const MOBILE = "13800000001";
/** 同步会复用 M2 HMAC 生成 idNoHash；测试注入固定密钥（不写真实 .env）。 */
const TEST_ENCRYPTION_KEY = "test-encryption-key-0123456789abcdef";
let previousEncryptionKey: string | undefined;

beforeAll(() => {
  previousEncryptionKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
});

afterAll(() => {
  if (previousEncryptionKey === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = previousEncryptionKey;
});

// ── 内存同步数据层（实现 TalentReportSyncStore；记录所有写调用） ────────────

class FakeSyncStore implements TalentReportSyncStore {
  geneReports: TalentGeneReportRecord[] = [];
  reports: TalentReportRecord[] = [];
  logs: TalentReportSyncLogInput[] = [];
  geneUpdates: Array<{ id: string; data: TalentReportSyncRecordData }> = [];
  reportUpdates: Array<{ id: string; data: TalentReportSyncRecordData }> = [];
  private idSeq = 0;

  constructor(
    public candidates: TalentReportSyncCandidate[],
    seed: {
      geneReports?: TalentGeneReportRecord[];
      reports?: TalentReportRecord[];
    } = {},
  ) {
    this.geneReports = [...(seed.geneReports ?? [])];
    this.reports = [...(seed.reports ?? [])];
  }

  get createCount(): number {
    return this.geneReports.length + this.reports.length;
  }

  async listCandidates(): Promise<TalentReportSyncCandidate[]> {
    return this.candidates.map((candidate) => {
      const geneReport =
        candidate.geneReport ??
        this.geneReports.find(
          (record) => String(record.subjectId) === candidate.subjectId,
        ) ??
        null;
      const report =
        candidate.report ??
        this.reports.find(
          (record) => String(record.subjectId) === candidate.subjectId,
        ) ??
        null;
      return {
        ...candidate,
        geneReport,
        report,
        existingReportNo: candidate.existingReportNo ?? geneReport?.reportNo,
      };
    });
  }

  async nextReportNo(now: Date): Promise<string> {
    return formatTalentReportNo(now, this.geneReports.length + 1);
  }

  async createGeneReport(
    data: TalentReportSyncRecordData,
  ): Promise<TalentGeneReportRecord> {
    const record = {
      id: `gene_${++this.idSeq}`,
      created: AT,
      updated: AT,
      sections: [],
      ...data,
    } as unknown as TalentGeneReportRecord;
    this.geneReports.push(record);
    return record;
  }

  async updateGeneReport(
    id: string,
    data: TalentReportSyncRecordData,
  ): Promise<TalentGeneReportRecord> {
    this.geneUpdates.push({ id, data });
    const index = this.geneReports.findIndex((record) => record.id === id);
    if (index < 0) throw new Error("基因报告不存在");
    this.geneReports[index] = { ...this.geneReports[index]!, ...data } as TalentGeneReportRecord;
    return this.geneReports[index]!;
  }

  async createReport(
    data: TalentReportSyncRecordData,
  ): Promise<TalentReportRecord> {
    const record = {
      id: `report_${++this.idSeq}`,
      created: AT,
      updated: AT,
      ...data,
    } as unknown as TalentReportRecord;
    this.reports.push(record);
    return record;
  }

  async updateReport(
    id: string,
    data: TalentReportSyncRecordData,
  ): Promise<TalentReportRecord> {
    this.reportUpdates.push({ id, data });
    const index = this.reports.findIndex((record) => record.id === id);
    if (index < 0) throw new Error("报告不存在");
    this.reports[index] = { ...this.reports[index]!, ...data } as TalentReportRecord;
    return this.reports[index]!;
  }

  async recordSyncLog(input: TalentReportSyncLogInput): Promise<string> {
    this.logs.push(input);
    return `log_${this.logs.length}`;
  }
}

// ── 假外部源 / 假数据 ─────────────────────────────────────────────────────

function foundData(
  books: Array<"A" | "B" | "C" | "D" | "E" | "F">,
  overrides: Partial<TalentGeneReportExternalData> = {},
): TalentGeneReportExternalData {
  return {
    found: true,
    books,
    sections: books.map((bookCode, index) => ({
      bookCode,
      chapter: `${index + 1}.1 演示章节`,
      factorCode: `${bookCode}-01`,
      levelCode: "LV3",
      score: 70 + index,
      condition: "",
    })),
    issuer: "示例检测机构",
    filedAt: "2026-11-01",
    sourceVersion: "mock-v1",
    ...overrides,
  };
}

function fakeSource(
  handler: (subject: TalentGeneReportSyncSubject) => Promise<TalentGeneReportExternalData> | TalentGeneReportExternalData,
): TalentGeneReportSource {
  return {
    source: "mock",
    fetch: async (subject) => handler(subject),
  };
}

function candidate(
  overrides: Partial<TalentReportSyncCandidate> = {},
): TalentReportSyncCandidate {
  return {
    subjectType: "child",
    subjectId: "child_1",
    parentId: "parent_1",
    name: "陈小示",
    gender: "female",
    birthday: "2016-09-08",
    age: 10,
    idNo: ID_NO,
    mobile: MOBILE,
    ...overrides,
  };
}

function geneRecord(
  overrides: Partial<TalentGeneReportRecord> = {},
): TalentGeneReportRecord {
  return {
    id: "gene_existing",
    created: AT,
    updated: AT,
    subjectType: "child",
    subjectId: "child_2",
    parentId: "parent_1",
    reportNo: "R202611160009",
    name: "陈小知",
    gender: "female",
    birthday: "2016-09-08",
    age: 10,
    maskedIdNo: "1101**********9999",
    idNoHash: "b".repeat(64),
    syncedAt: AT,
    source: "mock",
    books: "AB",
    sections: [
      { bookCode: "A", chapter: "1.1 演示章节", factorCode: "A-01", levelCode: "LV3" },
    ],
    sectionCount: 1,
    status: "synced",
    ...overrides,
  };
}

function reportRecord(
  overrides: Partial<TalentReportRecord> = {},
): TalentReportRecord {
  return {
    id: "report_existing",
    created: AT,
    updated: AT,
    reportNo: "R202611160009",
    reportType: "gene_report",
    title: "陈小知·基因报告",
    status: "published",
    subjectType: "child",
    subjectId: "child_2",
    parentId: "parent_1",
    geneReportId: "gene_existing",
    factorCount: 1,
    snapshotVersion: 1,
    snapshotAt: AT,
    openVolumeIds: ["V1"],
    factorSnapshot: [
      {
        code: "A-01",
        name: "运动协调",
        category: "A",
        categoryName: "生长发育",
        volumeId: "V1",
        bookCode: "A",
        chapter: "1.1 演示章节",
        levelCode: "LV3",
        levelName: "优秀",
        levelOrder: 3,
        score: 70,
        note: "固定注解",
        condition: "",
      },
    ],
    volumeSnapshot: [],
    directionSnapshot: {
      version: 1,
      at: AT,
      operatorId: "",
      operatorName: "",
      recommendLimit: 5,
      selectionLimit: 3,
      levelOrders: { LV1: 1, LV2: 2, LV3: 3, LV4: 4 },
      tiers: [],
      directions: [],
    },
    selections: [],
    versions: [
      {
        version: 1,
        type: "publish",
        summary: "发布，开放 1 册（A）",
        books: ["A"],
        operatorId: "",
        operatorName: "",
        at: AT,
      },
    ],
    totalItems: 1,
    customerId: "",
    ...overrides,
  };
}

// ── 报告编号 / 外部篇目校验 / 脱敏摘要 ────────────────────────────────────

describe("同步源工具函数", () => {
  it("报告编号 R{YYYYMMDD}{4 位当日序号}，支持顺延", () => {
    const now = new Date(2026, 10, 16, 10, 0, 0);
    expect(formatTalentReportNo(now, 1)).toBe("R202611160001");
    expect(formatTalentReportNo(now, 23)).toBe("R202611160023");
    expect(bumpTalentReportNo("R202611160001", 2)).toBe("R202611160003");
    expect(bumpTalentReportNo("R202611160099", 1)).toBe("R202611160100");
  });

  it("环境变量解析：默认 mock / all_found，external 需显式配置", () => {
    expect(resolveTalentGeneReportSourceKind({})).toBe("mock");
    expect(
      resolveTalentGeneReportSourceKind({ TALENT_GENE_REPORT_SOURCE: "external" }),
    ).toBe("external");
    expect(resolveTalentGeneReportMockMode({})).toBe("all_found");
    expect(
      resolveTalentGeneReportMockMode({ TALENT_GENE_REPORT_MOCK_MODE: "incremental" }),
    ).toBe("incremental");
    expect(
      resolveTalentGeneReportMockMode({ TALENT_GENE_REPORT_MOCK_MODE: "bogus" }),
    ).toBe("all_found");
  });

  it("外部篇目校验：分册/章节/要素编码/分级缺失或重复 → 单条失败原因", () => {
    expect(
      validateTalentGeneReportExternalData({
        found: true,
        books: ["A"],
        sections: [],
      }),
    ).toEqual({ ok: true, books: ["A"], sections: [] });
    const duplicate = validateTalentGeneReportExternalData({
      found: true,
      books: ["A"],
      sections: [
        { bookCode: "A", chapter: "1.1", factorCode: "A-01", levelCode: "LV3" },
        { bookCode: "A", chapter: "1.1", factorCode: "A-01", levelCode: "LV4" },
      ],
    });
    expect(duplicate.ok).toBe(false);
    const notInBooks = validateTalentGeneReportExternalData({
      found: true,
      books: ["A"],
      sections: [
        { bookCode: "B", chapter: "1.1", factorCode: "B-01", levelCode: "LV3" },
      ],
    });
    expect(notInBooks.ok).toBe(false);
    const missingChapter = validateTalentGeneReportExternalData({
      found: true,
      books: ["A"],
      sections: [
        { bookCode: "A", chapter: "", factorCode: "A-01", levelCode: "LV3" },
      ],
    });
    expect(missingChapter.ok).toBe(false);
  });

  it("失败摘要脱敏：替换明文为掩码、去换行、限长 200", () => {
    const message = sanitizeTalentReportSyncMessage(
      new Error(`拉取失败 ${ID_NO} / ${MOBILE}\n第二行`),
      { idNo: ID_NO, mobile: MOBILE },
    );
    expect(message).not.toContain(ID_NO);
    expect(message).not.toContain(MOBILE);
    expect(message).toContain("1101**********1234");
    expect(message).toContain("1380****0001");
    expect(message).not.toContain("\n");
    expect(sanitizeTalentReportSyncMessage(new Error("x".repeat(500))).length).toBe(200);
  });
});

// ── 预演：零写入 + 三类归因 ──────────────────────────────────────────────

describe("previewTalentReportSync", () => {
  it("三类归因齐全且零写入（不建行、不更新、不写日志）", async () => {
    const existingGene = geneRecord({ subjectId: "child_2" });
    const existingReport = reportRecord({ subjectId: "child_2" });
    existingGene.reportNo = existingReport.reportNo;
    const store = new FakeSyncStore(
      [
        candidate({ subjectId: "child_2", name: "陈小知", gender: "female" }),
        candidate({ subjectId: "child_1", name: "陈小示" }),
        candidate({ subjectId: "child_3", name: "陈小无" }),
      ],
      { geneReports: [existingGene], reports: [existingReport] },
    );
    const source = fakeSource((subject) => {
      if (subject.subjectId === "child_3")
        return { found: false, reason: "no_result", books: [], sections: [] };
      return foundData(["A", "B"]);
    });
    const beforeGene = JSON.stringify(store.geneReports);
    const beforeReport = JSON.stringify(store.reports);
    const preview = await previewTalentReportSync({
      store,
      source,
      now: new Date(AT),
    });
    expect(preview).toMatchObject({
      mode: "preview",
      source: TALENT_GENE_REPORT_MOCK_SOURCE,
      at: AT,
      scanned: 3,
      counts: { refreshed: 1, created: 1, empty: 1, failed: 0 },
      truncated: false,
    });
    expect(preview.details.map((detail) => detail.action)).toEqual([
      "refresh",
      "created",
      "empty",
    ]);
    expect(preview.details[2]).toMatchObject({
      reason: "no_result",
      reportNo: "",
    });
    // 零写入：行数/内容/日志/更新调用全部不变。
    expect(JSON.stringify(store.geneReports)).toBe(beforeGene);
    expect(JSON.stringify(store.reports)).toBe(beforeReport);
    expect(store.logs).toHaveLength(0);
    expect(store.geneUpdates).toHaveLength(0);
    expect(store.reportUpdates).toHaveLength(0);
    // 重复预演仍零写入。
    await previewTalentReportSync({ store, source: fakeSource(() => foundData(["A"])), now: new Date(AT) });
    expect(store.geneReports).toHaveLength(1);
    expect(store.reports).toHaveLength(1);
  });

  it("subjectDetails 不含明文身份证/手机号", async () => {
    const store = new FakeSyncStore([candidate()]);
    const preview = await previewTalentReportSync({
      store,
      source: fakeSource(() => foundData(["A"])),
      now: new Date(AT),
    });
    const text = JSON.stringify(preview.details);
    expect(text).not.toContain(ID_NO);
    expect(text).not.toContain(MOBILE);
    expect(preview.details[0]!.maskedIdNo).toBe("1101**********1234");
  });

  it("候选为空：scanned=0、三类全 0、不写日志", async () => {
    const store = new FakeSyncStore([]);
    const preview = await previewTalentReportSync({
      store,
      source: fakeSource(() => foundData(["A"])),
      now: new Date(AT),
    });
    expect(preview.counts).toEqual({
      refreshed: 0,
      created: 0,
      empty: 0,
      failed: 0,
    });
    expect(preview.scanned).toBe(0);
    expect(store.logs).toHaveLength(0);
  });
});

// ── 提交：写入 / 幂等 / 不改快照 / 单条失败 ───────────────────────────────

describe("commitTalentReportSync", () => {
  it("新建：写基因报告 + 待发布报告 v0、明细与同步日志齐全", async () => {
    const store = new FakeSyncStore([candidate()]);
    const result = await commitTalentReportSync({
      store,
      source: fakeSource(() => foundData(["A", "B"])),
      now: new Date(AT),
      operatorId: "user_1",
    });
    expect(result.mode).toBe("commit");
    expect(result.counts).toEqual({
      refreshed: 0,
      created: 1,
      empty: 0,
      failed: 0,
    });
    expect(result.syncLogId).toBe("log_1");
    expect(result.scanned).toBe(1);
    expect(result.changedSincePreview).toBe(false);
    expect(store.geneReports).toHaveLength(1);
    expect(store.reports).toHaveLength(1);
    const gene = store.geneReports[0]!;
    expect(gene).toMatchObject({
      subjectType: "child",
      subjectId: "child_1",
      parentId: "parent_1",
      books: "AB",
      source: "mock",
      status: "synced",
      maskedIdNo: "1101**********1234",
    });
    expect(gene.reportNo).toMatch(/^R20261116/);
    expect(String(gene.idNoHash)).toHaveLength(64);
    const report = store.reports[0]!;
    expect(report).toMatchObject({
      status: "pending_publish",
      reportType: "gene_report",
      subjectType: "child",
      subjectId: "child_1",
      geneReportId: gene.id,
      snapshotVersion: 0,
      factorCount: 0,
      openVolumeIds: [],
      factorSnapshot: [],
      directionSnapshot: null,
      selections: [],
      versions: [],
      customerId: "",
    });
    expect(result.details[0]).toMatchObject({
      action: "created",
      subjectName: "陈小示",
      reportNo: gene.reportNo,
      booksTotal: "AB",
      booksAdded: "AB",
    });
    // 同步日志字段（syncScope / mode / 三类计数 / 逐人明细 / 操作人）。
    expect(store.logs).toHaveLength(1);
    expect(store.logs[0]).toMatchObject({
      trigger: "manual",
      status: "success",
      scanned: 1,
      counts: { refreshed: 0, created: 1, empty: 0, failed: 0 },
      truncated: false,
      operatorId: "user_1",
    });
    expect(store.logs[0]!.details).toHaveLength(1);
    expect(JSON.stringify(store.logs[0])).not.toContain(ID_NO);
    expect(JSON.stringify(result.details)).not.toContain(MOBILE);
  });

  it("重复 commit 幂等：行数不增、第二次全部 refresh、快照与版本不变", async () => {
    const store = new FakeSyncStore([candidate()]);
    const source = () => fakeSource(() => foundData(["A", "B"]));
    const first = await commitTalentReportSync({
      store,
      source: source(),
      now: new Date(AT),
    });
    expect(first.counts.created).toBe(1);
    expect(store.geneReports).toHaveLength(1);
    expect(store.reports).toHaveLength(1);
    const reportId = store.reports[0]!.id;
    const second = await commitTalentReportSync({
      store,
      source: source(),
      now: new Date("2026-11-17T10:00:00.000Z"),
    });
    expect(second.counts).toMatchObject({ refreshed: 1, created: 0 });
    expect(store.geneReports).toHaveLength(1);
    expect(store.reports).toHaveLength(1);
    expect(store.logs).toHaveLength(2);
    // 第二次只更新 queriedAt，不写 snapshotVersion/versions/快照。
    const secondReportUpdate = store.reportUpdates.find(
      (update) => update.id === reportId,
    );
    expect(secondReportUpdate).toBeTruthy();
    expect(Object.keys(secondReportUpdate!.data)).toEqual(["queriedAt"]);
    expect(store.reports[0]!.snapshotVersion).toBe(0);
    expect(store.reports[0]!.versions).toEqual([]);
  });

  it("刷新同步不改已发布快照，只追加 queriedAt；明细 booksAdded 正确", async () => {
    const existingGene = geneRecord({ subjectId: "child_2" });
    const existingReport = reportRecord({ subjectId: "child_2" });
    const snapshotBefore = JSON.stringify({
      factorSnapshot: existingReport.factorSnapshot,
      volumeSnapshot: existingReport.volumeSnapshot,
      directionSnapshot: existingReport.directionSnapshot,
      snapshotVersion: existingReport.snapshotVersion,
      versions: existingReport.versions,
    });
    const store = new FakeSyncStore(
      [candidate({ subjectId: "child_2", name: "陈小知" })],
      { geneReports: [existingGene], reports: [existingReport] },
    );
    const result = await commitTalentReportSync({
      store,
      source: fakeSource(() => foundData(["A", "B", "C", "D"])),
      now: new Date(AT),
    });
    expect(result.counts.refreshed).toBe(1);
    expect(result.details[0]).toMatchObject({
      action: "refresh",
      booksTotal: "ABCD",
      booksAdded: "BCD",
    });
    const storedReport = store.reports[0]!;
    expect(
      JSON.stringify({
        factorSnapshot: storedReport.factorSnapshot,
        volumeSnapshot: storedReport.volumeSnapshot,
        directionSnapshot: storedReport.directionSnapshot,
        snapshotVersion: storedReport.snapshotVersion,
        versions: storedReport.versions,
      }),
    ).toBe(snapshotBefore);
    expect(store.reportUpdates).toHaveLength(1);
    expect(Object.keys(store.reportUpdates[0]!.data)).toEqual(["queriedAt"]);
    // 基因报告被刷新（外部新增 C/D 册），快照不动。
    const storedGene = store.geneReports[0]!;
    expect(storedGene.books).toBe("ABCD");
    expect(storedGene.sections).toHaveLength(4);
    expect(storedGene.syncedAt).toBe(AT);
  });

  it("已有基因报告但报告缺失（防御）：补建待发布报告并计为 refresh", async () => {
    const existingGene = geneRecord({ subjectId: "child_2" });
    const store = new FakeSyncStore([candidate({ subjectId: "child_2" })], {
      geneReports: [existingGene],
    });
    const result = await commitTalentReportSync({
      store,
      source: fakeSource(() => foundData(["A"])),
      now: new Date(AT),
    });
    expect(result.counts.refreshed).toBe(1);
    expect(store.reports).toHaveLength(1);
    expect(store.reports[0]).toMatchObject({
      status: "pending_publish",
      geneReportId: existingGene.id,
      reportNo: existingGene.reportNo,
      snapshotVersion: 0,
    });
  });

  it("empty：外部暂无数据不写任何集合，日志仍记录", async () => {
    const store = new FakeSyncStore([
      candidate({ subjectId: "child_1" }),
      candidate({ subjectId: "child_2" }),
    ]);
    const result = await commitTalentReportSync({
      store,
      source: fakeSource(() => ({
        found: false,
        reason: "info_mismatch",
        books: [],
        sections: [],
      })),
      now: new Date(AT),
    });
    expect(result.counts).toEqual({
      refreshed: 0,
      created: 0,
      empty: 2,
      failed: 0,
    });
    expect(store.geneReports).toHaveLength(0);
    expect(store.reports).toHaveLength(0);
    expect(store.logs[0]).toMatchObject({ status: "success" });
    expect(result.details.every((detail) => detail.reason === "info_mismatch")).toBe(
      true,
    );
  });

  it("单条失败不中断整批：其余写入、failed=1、日志 status=partial", async () => {
    const store = new FakeSyncStore([
      candidate({ subjectId: "child_1" }),
      candidate({ subjectId: "child_2" }),
      candidate({ subjectId: "child_3" }),
    ]);
    const source = fakeSource((subject) => {
      if (subject.subjectId === "child_2") throw new Error("upstream timeout");
      return foundData(["A"]);
    });
    const result = await commitTalentReportSync({
      store,
      source,
      now: new Date(AT),
    });
    expect(result.counts).toMatchObject({ created: 2, failed: 1 });
    expect(result.details.find((detail) => detail.action === "failed")).toMatchObject({
      action: "failed",
      message: "upstream timeout",
    });
    expect(store.geneReports).toHaveLength(2);
    expect(store.logs[0]).toMatchObject({ status: "partial" });
    expect(result.syncLogId).toBe("log_1");
  });

  it("外部源整体不可用（全部候选源异常）→ 503 且不写日志", async () => {
    const store = new FakeSyncStore([
      candidate({ subjectId: "child_1" }),
      candidate({ subjectId: "child_2" }),
    ]);
    await expect(
      commitTalentReportSync({
        store,
        source: fakeSource(() => {
          throw new Error("connect ECONNREFUSED");
        }),
        now: new Date(AT),
      }),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(store.geneReports).toHaveLength(0);
    expect(store.reports).toHaveLength(0);
    expect(store.logs).toHaveLength(0);
  });

  it("无候选：返回全 0、scanned=0、不写日志", async () => {
    const store = new FakeSyncStore([]);
    const result = await commitTalentReportSync({
      store,
      source: fakeSource(() => foundData(["A"])),
      now: new Date(AT),
    });
    expect(result).toMatchObject({
      scanned: 0,
      syncLogId: "",
      counts: { refreshed: 0, created: 0, empty: 0, failed: 0 },
    });
    expect(store.logs).toHaveLength(0);
  });

  it("changedSincePreview：实际计数与预演不同 → true", async () => {
    const store = new FakeSyncStore([candidate()]);
    const different = await commitTalentReportSync({
      store,
      source: fakeSource(() => foundData(["A"])),
      now: new Date(AT),
      previewCounts: { refreshed: 0, created: 0, empty: 5, failed: 0 },
    });
    expect(different.changedSincePreview).toBe(true);

    const store2 = new FakeSyncStore([candidate()]);
    const same = await commitTalentReportSync({
      store: store2,
      source: fakeSource(() => foundData(["A"])),
      now: new Date(AT),
      previewCounts: { refreshed: 0, created: 1, empty: 0, failed: 0 },
    });
    expect(same.changedSincePreview).toBe(false);
  });

  it("并发 commit：第二个直接 409", async () => {
    const source = fakeSource(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return foundData(["A"]);
    });
    const firstStore = new FakeSyncStore([candidate()]);
    const secondStore = new FakeSyncStore([candidate()]);
    const first = commitTalentReportSync({
      store: firstStore,
      source,
      now: new Date(AT),
    });
    await expect(
      commitTalentReportSync({ store: secondStore, source, now: new Date(AT) }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await first;
    expect(firstStore.geneReports).toHaveLength(1);
    expect(secondStore.geneReports).toHaveLength(0);
  });
});

// ── Mock 五种模式 ─────────────────────────────────────────────────────────

describe("Mock 外部源五模式", () => {
  const candidates = [
    candidate({ subjectId: "child_1" }),
    candidate({ subjectId: "child_2" }),
    candidate({ subjectId: "child_3" }),
  ];

  async function previewWithMode(mode: "all_found" | "empty" | "partial" | "error" | "incremental") {
    const store = new FakeSyncStore(candidates);
    const preview = await previewTalentReportSync({
      store,
      source: createMockTalentGeneReportSource({ mode, delayMs: 0 }),
      now: new Date(AT),
    });
    return preview;
  }

  it("all_found：全部新建", async () => {
    const preview = await previewWithMode("all_found");
    expect(preview.counts).toEqual({
      refreshed: 0,
      created: 3,
      empty: 0,
      failed: 0,
    });
    expect(preview.details.every((detail) => detail.action === "created")).toBe(true);
  });

  it("empty：全部外部暂无数据", async () => {
    const preview = await previewWithMode("empty");
    expect(preview.counts).toEqual({
      refreshed: 0,
      created: 0,
      empty: 3,
      failed: 0,
    });
  });

  it("partial：前 50% found、其余 empty（三类归因）", async () => {
    const preview = await previewWithMode("partial");
    expect(preview.counts).toMatchObject({ created: 2, empty: 1, failed: 0 });
    expect(preview.details.filter((detail) => detail.action === "empty")).toHaveLength(1);
  });

  it("error：前 1 人失败、其余继续", async () => {
    const preview = await previewWithMode("error");
    expect(preview.counts).toMatchObject({ created: 2, failed: 1 });
    expect(preview.details[0]).toMatchObject({ action: "failed" });
    expect(preview.details[0]!.message).toContain("Mock");
  });

  it("incremental：已有报告候选追加 D、E 两册，新对象出 A、B", async () => {
    const existingGene = geneRecord({ subjectId: "child_2", books: "AB" });
    const existingReport = reportRecord({ subjectId: "child_2" });
    const store = new FakeSyncStore(candidates, {
      geneReports: [existingGene],
      reports: [existingReport],
    });
    const preview = await previewTalentReportSync({
      store,
      source: createMockTalentGeneReportSource({ mode: "incremental", delayMs: 0 }),
      now: new Date(AT),
    });
    const existingDetail = preview.details.find(
      (detail) => detail.subjectId === "child_2",
    )!;
    expect(existingDetail).toMatchObject({
      action: "refresh",
      booksTotal: "ABCDE",
      booksAdded: "BCDE",
    });
    const freshDetail = preview.details.find(
      (detail) => detail.subjectId === "child_1",
    )!;
    expect(freshDetail).toMatchObject({ action: "created", booksTotal: "AB" });
  });
});