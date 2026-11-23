/**
 * @description M5 培育建议版本状态机与接收新版测试：版本两层 / 单一生效、preview 零写入、
 *   commit 占位→建议→归档→激活、失败补偿（旧版保持生效、无残留行）、重复版本 409、版本顺序 409、
 *   年龄按 effectiveAt 冻结、sections 单条失败不阻断、发布/撤回与历史版本只读、派生可见性、
 *   版本历史/按人历史/报告页签挂载/C 端只读快照、Mock 五模式与环境解析、并发接收。
 *   对应 docs/specs/M5-advice/spec.md §4/§5.4/§7/§9 与 §11 #2/#12。数据全部虚构，使用内存假实现，
 *   不依赖 PocketBase / 网络。
 * @file test/talent-advice-sync.test.ts
 */
import { describe, expect, it } from "vitest";
import type {
  TalentAdviceMatchResult,
  TalentAdviceRawSection,
  TalentAdviceSource,
  TalentAdviceSyncCandidate,
  TalentAdviceSyncLogInput,
} from "~~/shared/types/talent-advice";
import type {
  TalentChildRecord,
  TalentParentRecord,
} from "~~/shared/types/talent-member";
import type {
  TalentGeneReportRecord,
  TalentReportRecord,
} from "~~/shared/types/talent-report";
import {
  TALENT_ADVICE_MOCK_MODES,
  buildMockTalentAdviceSections,
  createMockTalentAdviceSource,
  createTalentAdviceSource,
  resolveTalentAdviceMockDelayMs,
  resolveTalentAdviceMockMode,
  resolveTalentAdviceSourceKind,
} from "~~/server/utils/talent-advice-source";
import {
  assertTalentAdviceReadable,
  buildTalentAdviceClientSnapshot,
  getTalentAdviceClientSnapshot,
  getTalentAdviceDocDetail,
  listTalentAdviceForSubject,
  listTalentAdvicePersonHistory,
  listTalentAdviceVersions,
  normalizeTalentAdviceSections,
  previewTalentAdviceVersion,
  publishTalentAdviceDoc,
  receiveTalentAdviceVersion,
  withdrawTalentAdviceDoc,
  type TalentAdviceRecordData,
  type TalentAdviceStore,
} from "~~/server/utils/talent-advice";

const AT = "2026-11-17T10:00:00.000Z";
const ID_NO_HASH = "b".repeat(64);
const MASKED_ID_NO = "1101**********1234";

function makeGeneReport(
  id: string,
  overrides: Partial<TalentGeneReportRecord> = {},
): TalentGeneReportRecord {
  return {
    id,
    created: AT,
    updated: AT,
    subjectType: "child",
    subjectId: "child_1",
    parentId: "parent_1",
    reportNo: `GR20261116${id.replace(/\D/g, "").padStart(4, "0") || "0001"}`,
    name: "陈小示",
    gender: "male",
    birthday: "2018-09-08",
    age: 8,
    maskedIdNo: MASKED_ID_NO,
    idNoHash: ID_NO_HASH,
    books: "AB",
    sections: [],
    sectionCount: 0,
    status: "synced",
    syncedAt: AT,
    source: "mock",
    ...overrides,
  };
}

function makeReport(
  id: string,
  geneReportId: string,
  overrides: Partial<TalentReportRecord> = {},
): TalentReportRecord {
  return {
    id,
    created: AT,
    updated: AT,
    reportNo: `R20261116${id.replace(/\D/g, "").padStart(4, "0") || "0001"}`,
    reportType: "gene_report",
    title: "陈小示·基因报告",
    status: "published",
    subjectType: "child",
    subjectId: "child_1",
    parentId: "parent_1",
    geneReportId,
    ...overrides,
  };
}

function makeCandidate(
  id: string,
  overrides: {
    geneReport?: Partial<TalentGeneReportRecord>;
    report?: Partial<TalentReportRecord> | null;
  } = {},
): TalentAdviceSyncCandidate {
  const geneReport = makeGeneReport(id, overrides.geneReport);
  const report =
    overrides.report === null
      ? null
      : makeReport(`report_${id}`, geneReport.id, overrides.report);
  return {
    geneReport,
    report,
    geneReportId: geneReport.id,
    reportNo: geneReport.reportNo,
    subjectType: geneReport.subjectType,
    subjectId: geneReport.subjectId,
    parentId: String(geneReport.parentId ?? ""),
    name: geneReport.name,
    gender: geneReport.gender,
    birthday: geneReport.birthday,
    maskedIdNo: geneReport.maskedIdNo,
    idNoHash: String(geneReport.idNoHash ?? ""),
  };
}

function makeParent(
  overrides: Partial<TalentParentRecord> = {},
): TalentParentRecord {
  return {
    id: "parent_1",
    created: AT,
    updated: AT,
    parentNo: "P202611160001",
    name: "陈示例",
    source: "mock",
    status: "1",
    registeredAt: AT,
    userId: "user_1",
    mobileCipher: "cipher-mobile",
    mobileHash: "hash-mobile",
    maskedMobile: "1380****0001",
    ...overrides,
  };
}

function makeChild(
  overrides: Partial<TalentChildRecord> = {},
): TalentChildRecord {
  return {
    id: "child_1",
    created: AT,
    updated: AT,
    parentId: "parent_1",
    name: "陈小示",
    gender: "male",
    birthday: "2018-09-08",
    relation: "father",
    query: "found",
    querySeq: 0,
    queryAttempts: 0,
    status: "1",
    idNoCipher: "cipher-idno",
    idNoHash: ID_NO_HASH,
    maskedIdNo: MASKED_ID_NO,
    ...overrides,
  };
}

function makeRawSections(
  books = "AB",
  options: { variants?: boolean } = {},
): TalentAdviceRawSection[] {
  const sections: TalentAdviceRawSection[] = [];
  for (const book of books) {
    sections.push({
      book,
      factor: book === "A" ? "运动协调" : "语言表达",
      entropy: book === "A" ? "优秀" : "常态",
      content: "该项潜质发展良好，基础条件较为扎实。",
      example: "多数情境下能稳定完成对应任务。",
      direction: "在现有基础上逐步增加任务复杂度。",
      suggestion: "保持规律接触与练习节奏。",
      variant: 1,
    });
    if (options.variants && book === "A") {
      sections.push({
        ...sections[sections.length - 1]!,
        content: "同要素的第二种话术变体。",
        variant: 2,
      });
    }
  }
  return sections;
}

function makeSource(
  resolve: (
    subject: Parameters<TalentAdviceSource["match"]>[0],
    index: number,
  ) => TalentAdviceMatchResult | Promise<TalentAdviceMatchResult>,
): TalentAdviceSource {
  let index = 0;
  return {
    name: "mock",
    async match(subject) {
      const current = index;
      index += 1;
      return resolve(subject, current);
    },
  };
}

function foundSource(
  options: { books?: string; variants?: boolean } = {},
): TalentAdviceSource {
  return makeSource(() => ({
    found: true,
    sections: makeRawSections(options.books ?? "AB", {
      variants: options.variants,
    }),
  }));
}

// ── 内存数据层（实现 TalentAdviceStore，记录所有写调用） ─────────────────

class FakeAdviceStore implements TalentAdviceStore {
  versions: TalentAdviceVersionRecordLike[] = [];
  docs: TalentAdviceDocRecordLike[] = [];
  candidates: TalentAdviceSyncCandidate[];
  reports = new Map<string, TalentReportRecord>();
  parents = new Map<string, TalentParentRecord>();
  children = new Map<string, TalentChildRecord>();
  logs: TalentAdviceSyncLogInput[] = [];
  counters = {
    createVersion: 0,
    updateVersion: 0,
    deleteVersion: 0,
    createDoc: 0,
    deleteDoc: 0,
  };
  failOnActivate = false;
  failCreateDoc = false;
  private seq = 0;

  constructor(candidates: TalentAdviceSyncCandidate[]) {
    this.candidates = candidates;
    for (const candidate of candidates)
      if (candidate.report) this.reports.set(candidate.report.id, candidate.report);
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq}`;
  }

  async listCandidates(): Promise<TalentAdviceSyncCandidate[]> {
    return this.candidates;
  }

  async listVersions() {
    return [...this.versions].sort((left, right) =>
      right.effectiveAt.localeCompare(left.effectiveAt),
    );
  }

  async getVersionById(id: string) {
    return this.versions.find((version) => version.id === id) ?? null;
  }

  async getVersionByNo(versionNo: string) {
    return this.versions.find((version) => version.versionNo === versionNo) ?? null;
  }

  async createVersion(data: TalentAdviceRecordData) {
    this.counters.createVersion += 1;
    const record = {
      id: this.nextId("version"),
      created: AT,
      updated: AT,
      ...data,
    } as unknown as TalentAdviceVersionRecordLike;
    this.versions.push(record);
    return record;
  }

  async updateVersion(id: string, data: TalentAdviceRecordData) {
    this.counters.updateVersion += 1;
    if (data.status === "active" && this.failOnActivate) {
      // 只失败一次：失败后的补偿恢复旧版必须能成功（否则无法验证补偿路径）。
      this.failOnActivate = false;
      throw new Error("模拟激活失败");
    }
    const record = this.versions.find((version) => version.id === id);
    if (!record) throw new Error("版本不存在");
    Object.assign(record, data);
    return record;
  }

  async deleteVersion(id: string) {
    this.counters.deleteVersion += 1;
    this.versions = this.versions.filter((version) => version.id !== id);
  }

  async createDoc(data: TalentAdviceRecordData) {
    if (this.failCreateDoc) throw new Error("模拟建议写入失败");
    this.counters.createDoc += 1;
    const record = {
      id: this.nextId("doc"),
      created: AT,
      updated: AT,
      sections: [],
      ...data,
    } as unknown as TalentAdviceDocRecordLike;
    this.docs.push(record);
    return record;
  }

  async updateDoc(id: string, data: TalentAdviceRecordData) {
    const record = this.docs.find((doc) => doc.id === id);
    if (!record) throw new Error("建议不存在");
    Object.assign(record, data);
    return record;
  }

  async deleteDoc(id: string) {
    this.counters.deleteDoc += 1;
    this.docs = this.docs.filter((doc) => doc.id !== id);
  }

  async getDocById(id: string) {
    return this.docs.find((doc) => doc.id === id) ?? null;
  }

  async listDocsByVersion(versionId: string) {
    return this.docs.filter((doc) => doc.versionId === versionId);
  }

  async listDocsByReportNo(reportNo: string) {
    return this.docs
      .filter((doc) => doc.reportNo === reportNo)
      .sort((left, right) => right.syncedAt.localeCompare(left.syncedAt));
  }

  async listDocsBySubject(subjectType: string, subjectId: string) {
    return this.docs.filter(
      (doc) => doc.subjectType === subjectType && doc.subjectId === subjectId,
    );
  }

  async getReportById(id: string) {
    return this.reports.get(id) ?? null;
  }

  async getParentById(id: string) {
    return this.parents.get(id) ?? null;
  }

  async getParentByUserId(userId: string) {
    return (
      [...this.parents.values()].find((parent) => parent.userId === userId) ?? null
    );
  }

  async getChildById(id: string) {
    return this.children.get(id) ?? null;
  }

  async recordSyncLog(input: TalentAdviceSyncLogInput) {
    this.logs.push(input);
    return `log_${this.logs.length}`;
  }
}

/** Fake 内部把数据当成集合记录使用；对外沿用类型别名，避免测试里重复声明全部必填字段。 */
type TalentAdviceVersionRecordLike = import("~~/shared/types/talent-advice").TalentAdviceVersionRecord;
type TalentAdviceDocRecordLike = import("~~/shared/types/talent-advice").TalentAdviceDocRecord;

async function expectReject(
  promise: Promise<unknown>,
  statusCode: number,
  code?: string,
): Promise<void> {
  let error: { statusCode?: number; data?: { code?: string } } | null = null;
  try {
    await promise;
  } catch (caught) {
    error = caught as { statusCode?: number; data?: { code?: string } };
  }
  expect(error, "期望抛出错误").toBeTruthy();
  expect(error?.statusCode).toBe(statusCode);
  if (code) expect(error?.data?.code).toBe(code);
}

// ── 预演：零写入与分类 ──────────────────────────────────────────────────

describe("previewTalentAdviceVersion", () => {
  it("全部匹配：计数正确、版本计划正确、零写入", async () => {
    const store = new FakeAdviceStore([
      makeCandidate("1"),
      makeCandidate("2", { geneReport: { name: "示例二", subjectId: "child_2" } }),
    ]);
    const preview = await previewTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
      now: new Date(AT),
    });
    expect(preview).toMatchObject({
      mode: "preview",
      source: "mock",
      effectiveAt: "2026-11-12",
      versionNo: "V2026.11",
      cycle: "2026-11 ~ 2027-02",
      nextUpdateAt: "2027-03-12",
      scanned: 2,
      createdCount: 2,
      emptyCount: 0,
      failedCount: 0,
      duplicateVersionId: "",
      duplicateVersionNo: "",
    });
    expect(preview.details.map((detail) => detail.action)).toEqual([
      "created",
      "created",
    ]);
    expect(store.counters).toEqual({
      createVersion: 0,
      updateVersion: 0,
      deleteVersion: 0,
      createDoc: 0,
      deleteDoc: 0,
    });
    expect(store.versions).toHaveLength(0);
    expect(store.logs).toHaveLength(0);
  });

  it("部分匹配：一半 empty，明细 reason=info_mismatch", async () => {
    const source = makeSource((_subject, index) =>
      index % 2 === 1
        ? { found: false, reason: "info_mismatch" }
        : { found: true, sections: makeRawSections("AB") },
    );
    const store = new FakeAdviceStore([
      makeCandidate("1"),
      makeCandidate("2"),
      makeCandidate("3"),
    ]);
    const preview = await previewTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source,
    });
    expect(preview.createdCount).toBe(2);
    expect(preview.emptyCount).toBe(1);
    expect(preview.failedCount).toBe(0);
    const empty = preview.details.find((detail) => detail.action === "empty");
    expect(empty?.reason).toBe("info_mismatch");
  });

  it("重复版本预演：返回 duplicateVersionId/No 与提示，不抛 409", async () => {
    const store = new FakeAdviceStore([makeCandidate("1")]);
    await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
    });
    const preview = await previewTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
    });
    expect(preview.duplicateVersionNo).toBe("V2026.11");
    expect(preview.duplicateVersionId).toBe(store.versions[0]!.id);
    expect(preview.warnings).toContain("该版本已同步，请勿重复接收");
  });

  it("非法日期 → 422", async () => {
    await expectReject(
      previewTalentAdviceVersion({
        effectiveAt: "2026-02-30",
        store: new FakeAdviceStore([]),
        source: foundSource(),
      }),
      422,
      "VALIDATION_ERROR",
    );
  });
});

// ── 接收第一版：占位→建议→激活，同步即发布 ──────────────────────────────

describe("receiveTalentAdviceVersion 第一版", () => {
  it("创建版本并激活；建议行同步即发布、年龄/匹配键/派生缓存正确", async () => {
    const store = new FakeAdviceStore([
      makeCandidate("1"),
      makeCandidate("2", {
        geneReport: { name: "示例二", subjectId: "child_2" },
      }),
    ]);
    const result = await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
      now: new Date(AT),
      operatorId: "user_admin",
      operatorName: "平台管理员",
    });
    expect(result).toMatchObject({
      docCount: 2,
      emptyCount: 0,
      failedCount: 0,
      archivedVersionId: "",
      syncLogId: "log_1",
    });
    expect(result.version).toMatchObject({
      versionNo: "V2026.11",
      status: "active",
      statusLabel: "当前生效",
      cycle: "2026-11 ~ 2027-02",
      effectiveAt: "2026-11-12",
      nextUpdateAt: "2027-03-12",
      isCurrent: true,
      docCount: 2,
      publishedCount: 2,
      withdrawnCount: 0,
      operatorName: "平台管理员",
    });
    expect(store.versions).toHaveLength(1);
    expect(store.versions[0]!.status).toBe("active");
    expect(store.docs).toHaveLength(2);
    for (const doc of store.docs) {
      expect(doc.publishStatus).toBe("published");
      expect(doc.publishedAt).toBe(AT);
      expect(doc.withdrawnAt).toBe("");
      expect(doc.syncedAt).toBe(AT);
      expect(doc.versionId).toBe(store.versions[0]!.id);
      expect(doc.versionName).toBe("V2026.11");
      expect(doc.matchKey).toBe(`${doc.name}｜8 岁`);
      expect(doc.age).toBe(8);
      expect(doc.books).toBe("AB");
      expect(doc.sectionCount).toBe(Array.isArray(doc.sections) ? doc.sections.length : 0);
      expect(doc.bookCount).toBe(doc.books.length);
      expect(doc.firstFactorName).toBe("运动协调");
      expect(doc.idNoHash).toBe(ID_NO_HASH);
      expect(doc.adviceNo).toBe(
        `AD-${doc.reportNo}-${doc.syncedAt.slice(0, 7).replace("-", "")}`,
      );
      expect(doc.sections.length).toBeGreaterThan(0);
    }
    expect(store.logs).toHaveLength(1);
    expect(store.logs[0]).toMatchObject({
      status: "success",
      received: 2,
      generated: 2,
      skipped: 0,
      failedCount: 0,
      operatorId: "user_admin",
    });
    expect(store.logs[0]!.message).toContain("V2026.11 生效");
    // 响应不含 idNoHash / 明文身份证 / sections 全量。
    const text = JSON.stringify(result);
    expect(text).not.toContain("idNoHash");
    expect(text).not.toMatch(/\d{17}[\dX]/);
  });

  it("自动生成同步说明（覆盖 N 份基因报告）", async () => {
    const store = new FakeAdviceStore([makeCandidate("1")]);
    await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
    });
    expect(store.versions[0]!.note).toBe(
      "外部系统按姓名 + 具体年龄（周岁）重新匹配输出，覆盖 1 份基因报告。",
    );
  });
});

// ── 接收第二版：旧版归档、单一生效、版本历史 ─────────────────────────────

describe("receiveTalentAdviceVersion 第二版与版本历史", () => {
  it("旧版归档、新版生效、单一生效；版本历史按生效日期倒序聚合份数", async () => {
    const store = new FakeAdviceStore([makeCandidate("1")]);
    const first = await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
    });
    const second = await receiveTalentAdviceVersion({
      effectiveAt: "2027-03-12",
      store,
      source: foundSource(),
      now: new Date(AT),
    });
    expect(second.archivedVersionId).toBe(first.version.id);
    expect(second.version.versionNo).toBe("V2027.03");
    expect(second.version.status).toBe("active");
    expect(
      store.versions.filter((version) => version.status === "active"),
    ).toHaveLength(1);
    expect(
      store.versions.find((version) => version.id === first.version.id)?.status,
    ).toBe("archived");
    const history = await listTalentAdviceVersions(store);
    expect(history.total).toBe(2);
    expect(history.rows[0]).toMatchObject({
      versionNo: "V2027.03",
      isCurrent: true,
      docCount: 1,
      publishedCount: 1,
    });
    expect(history.rows[1]).toMatchObject({
      versionNo: "V2026.11",
      isCurrent: false,
      docCount: 1,
    });
  });

  it("重复版本（同版本号 / 同月份 / 同日期）→ 409 且不写集合", async () => {
    const store = new FakeAdviceStore([makeCandidate("1")]);
    await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
    });
    const before = {
      versions: store.versions.length,
      docs: store.docs.length,
      counters: { ...store.counters },
    };
    await expectReject(
      receiveTalentAdviceVersion({
        effectiveAt: "2026-11-12",
        store,
        source: foundSource(),
      }),
      409,
      "ADVICE_VERSION_EXISTS",
    );
    await expectReject(
      receiveTalentAdviceVersion({
        effectiveAt: "2026-11-20",
        store,
        source: foundSource(),
      }),
      409,
      "ADVICE_VERSION_EXISTS",
    );
    await expectReject(
      receiveTalentAdviceVersion({
        effectiveAt: "2026-12-12",
        versionNo: "V2026.11",
        store,
        source: foundSource(),
      }),
      409,
      "ADVICE_VERSION_EXISTS",
    );
    expect(store.versions.length).toBe(before.versions);
    expect(store.docs.length).toBe(before.docs);
    expect(store.counters).toEqual(before.counters);
  });

  it("版本只能前进：effectiveAt 不晚于当前生效版 → 409 ORDER", async () => {
    const store = new FakeAdviceStore([makeCandidate("1")]);
    await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
    });
    await expectReject(
      receiveTalentAdviceVersion({
        effectiveAt: "2026-10-12",
        store,
        source: foundSource(),
      }),
      409,
      "ADVICE_VERSION_ORDER",
    );
  });

  it("版本号缺省 V{YYYY}.{MM}，可按同步日期跨年", async () => {
    const store = new FakeAdviceStore([makeCandidate("1")]);
    const result = await receiveTalentAdviceVersion({
      effectiveAt: "2027-01-05",
      store,
      source: foundSource(),
    });
    expect(result.version.versionNo).toBe("V2027.01");
    expect(result.version.cycle).toBe("2027-01 ~ 2027-04");
    expect(result.version.nextUpdateAt).toBe("2027-05-05");
  });
});

// ── 年龄按 effectiveAt 冻结（跨版本重算） ────────────────────────────────

describe("年龄冻结", () => {
  it("生日前后两个版本各按生效日计算，matchKey 同步冻结", async () => {
    const candidate = makeCandidate("1", {
      geneReport: { birthday: "2018-11-13" },
    });
    const store = new FakeAdviceStore([candidate]);
    await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
    });
    await receiveTalentAdviceVersion({
      effectiveAt: "2026-12-12",
      store,
      source: foundSource(),
    });
    const ages = store.docs.map((doc) => doc.age).sort((left, right) => left - right);
    expect(ages).toEqual([7, 8]);
    const matchKeys = store.docs.map((doc) => doc.matchKey).sort();
    expect(matchKeys).toEqual(["陈小示｜7 岁", "陈小示｜8 岁"]);
    // 发布/撤回不改冻结年龄与匹配键（仅当前生效版本可写）。
    const activeVersion = store.versions.find((version) => version.status === "active")!;
    const target = store.docs.find((doc) => doc.versionId === activeVersion.id)!;
    await withdrawTalentAdviceDoc(target.id, { store });
    await publishTalentAdviceDoc(target.id, { store });
    expect(target.age).toBe(8);
    expect(target.matchKey).toBe("陈小示｜8 岁");
  });
});

// ── 单条失败不阻断整批 ──────────────────────────────────────────────────

describe("接收分类：单条失败不阻断", () => {
  it("sections 分册不在基因报告 → failed(sections_invalid)，其余照常写入", async () => {
    const source = makeSource((subject) =>
      subject.reportNo === "GR202611160001"
        ? { found: true, sections: makeRawSections("C") }
        : { found: true, sections: makeRawSections("AB") },
    );
    const store = new FakeAdviceStore([makeCandidate("1"), makeCandidate("2")]);
    const result = await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source,
    });
    expect(result).toMatchObject({ docCount: 1, failedCount: 1, emptyCount: 0 });
    const failed = result.details.find((detail) => detail.action === "failed");
    expect(failed?.reason).toBe("sections_invalid");
    expect(store.docs).toHaveLength(1);
    expect(store.logs[0]!.status).toBe("partial");
  });

  it("空正文 → failed(empty_sections)；含身份证文本 → failed(sections_invalid)", async () => {
    const source = makeSource((subject) => {
      if (subject.reportNo === "GR202611160001")
        return { found: true, sections: [] };
      if (subject.reportNo === "GR202611160002")
        return {
          found: true,
          sections: [
            {
              book: "A",
              factor: "运动协调",
              entropy: "优秀",
              content: "证件 110101201609081234",
            },
          ],
        };
      return { found: true, sections: makeRawSections("AB") };
    });
    const store = new FakeAdviceStore([
      makeCandidate("1"),
      makeCandidate("2"),
      makeCandidate("3"),
    ]);
    const result = await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source,
    });
    expect(result.failedCount).toBe(2);
    expect(result.docCount).toBe(1);
    expect(result.details.map((detail) => detail.reason)).toContain(
      "empty_sections",
    );
    expect(result.details.map((detail) => detail.reason)).toContain(
      "sections_invalid",
    );
    expect(JSON.stringify(result.details)).not.toContain("110101201609081234");
  });

  it("缺报告行 → failed(report_missing)；生日非法 → failed(info_mismatch)", async () => {
    const store = new FakeAdviceStore([
      makeCandidate("1", { report: null }),
      makeCandidate("2", { geneReport: { birthday: "2018-13-01" } }),
      makeCandidate("3"),
    ]);
    const result = await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
    });
    expect(result.failedCount).toBe(2);
    expect(result.docCount).toBe(1);
    const reasons = result.details
      .map((detail) => detail.reason)
      .filter(Boolean)
      .sort();
    expect(reasons).toEqual(["info_mismatch", "report_missing"]);
  });

  it("单条源异常 → failed(source_error)，其余继续", async () => {
    const source = makeSource((subject) => {
      if (subject.reportNo === "GR202611160001")
        throw new Error("上游超时");
      return { found: true, sections: makeRawSections("AB") };
    });
    const store = new FakeAdviceStore([makeCandidate("1"), makeCandidate("2")]);
    const result = await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source,
    });
    expect(result.docCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.details.find((detail) => detail.action === "failed")?.reason).toBe(
      "source_error",
    );
  });

  it("外部已出分册与基因报告不一致：以基因报告为准并记 warning", async () => {
    const source = makeSource(() => ({
      found: true,
      books: "ABC",
      sections: makeRawSections("AB"),
    }));
    const store = new FakeAdviceStore([makeCandidate("1")]);
    const result = await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source,
    });
    expect(result.docCount).toBe(1);
    expect(store.docs[0]!.books).toBe("AB");
    expect(result.warnings.some((warning) => warning.includes("分册以基因报告为准"))).toBe(
      true,
    );
  });
});

// ── 空结果 / 源整体不可用 / 补偿 ────────────────────────────────────────

describe("空结果、源不可用与失败补偿", () => {
  it("全部暂无建议 → 500 且不写任何集合（不产生空版本）", async () => {
    const store = new FakeAdviceStore([makeCandidate("1"), makeCandidate("2")]);
    const source = createMockTalentAdviceSource({ mode: "empty" });
    const preview = await previewTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source,
    });
    expect(preview).toMatchObject({ createdCount: 0, emptyCount: 2 });
    await expectReject(
      receiveTalentAdviceVersion({
        effectiveAt: "2026-11-12",
        store,
        source,
      }),
      500,
      "ADVICE_VERSION_SYNC_FAILED",
    );
    expect(store.versions).toHaveLength(0);
    expect(store.docs).toHaveLength(0);
  });

  it("外部源整体不可用（全部源异常）→ 503 且不写任何集合", async () => {
    const store = new FakeAdviceStore([makeCandidate("1"), makeCandidate("2")]);
    const source = makeSource(() => {
      throw new Error("外部服务不可达");
    });
    await expectReject(
      receiveTalentAdviceVersion({ effectiveAt: "2026-11-12", store, source }),
      503,
      "ADVICE_SOURCE_UNAVAILABLE",
    );
    expect(store.versions).toHaveLength(0);
    expect(store.docs).toHaveLength(0);
  });

  it("激活失败 → 500 补偿：删除新版本/建议行并恢复旧版生效", async () => {
    const store = new FakeAdviceStore([makeCandidate("1")]);
    const first = await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
    });
    store.failOnActivate = true;
    await expectReject(
      receiveTalentAdviceVersion({
        effectiveAt: "2027-03-12",
        store,
        source: foundSource(),
      }),
      500,
      "ADVICE_VERSION_SYNC_FAILED",
    );
    expect(store.versions).toHaveLength(1);
    expect(store.versions[0]!.id).toBe(first.version.id);
    expect(store.versions[0]!.status).toBe("active");
    expect(store.docs).toHaveLength(1);
    expect(store.counters.deleteDoc).toBe(1);
    expect(store.counters.deleteVersion).toBe(1);
  });

  it("建议行全部写入失败 → 500 且无残留版本/建议行", async () => {
    const store = new FakeAdviceStore([makeCandidate("1"), makeCandidate("2")]);
    store.failCreateDoc = true;
    await expectReject(
      receiveTalentAdviceVersion({
        effectiveAt: "2026-11-12",
        store,
        source: foundSource(),
      }),
      500,
      "ADVICE_VERSION_SYNC_FAILED",
    );
    expect(store.versions).toHaveLength(0);
    expect(store.docs).toHaveLength(0);
    expect(store.counters.deleteVersion).toBe(1);
  });
});

// ── 幂等重放与并发 ─────────────────────────────────────────────────────

describe("幂等重放与并发", () => {
  it("同一请求重放 → 409（带已有版本 id），不重复建行", async () => {
    const store = new FakeAdviceStore([makeCandidate("1")]);
    const request = {
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
    };
    await receiveTalentAdviceVersion(request);
    const versions = store.versions.length;
    const docs = store.docs.length;
    await expectReject(
      receiveTalentAdviceVersion(request),
      409,
      "ADVICE_VERSION_EXISTS",
    );
    expect(store.versions).toHaveLength(versions);
    expect(store.docs).toHaveLength(docs);
  });

  it("并发接收同一版：一个成功、另一个 409（锁内串行）", async () => {
    const store = new FakeAdviceStore([makeCandidate("1")]);
    const results = await Promise.allSettled([
      receiveTalentAdviceVersion({
        effectiveAt: "2026-11-12",
        store,
        source: foundSource(),
      }),
      receiveTalentAdviceVersion({
        effectiveAt: "2026-11-12",
        store,
        source: foundSource(),
      }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as
      | PromiseRejectedResult
      | undefined;
    expect(rejected?.reason?.statusCode).toBe(409);
    expect(store.versions).toHaveLength(1);
    expect(store.docs).toHaveLength(1);
  });
});

// ── 发布 / 撤回状态机 ───────────────────────────────────────────────────

describe("发布 / 撤回", () => {
  it("撤回 → 已撤回、写 withdrawnAt、保留 publishedAt、C 端不可见；重新发布恢复", async () => {
    const candidate = makeCandidate("1");
    const store = new FakeAdviceStore([candidate]);
    store.parents.set("parent_1", makeParent());
    store.children.set("child_1", makeChild());
    const received = await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
    });
    const docId = store.docs[0]!.id;
    const publishedAt = store.docs[0]!.publishedAt;
    const withdrawn = await withdrawTalentAdviceDoc(docId, {
      store,
      now: new Date("2026-11-17T10:00:00.000Z"),
    });
    expect(withdrawn).toMatchObject({
      publishStatus: "withdrawn",
      publishStatusLabel: "已撤回",
      clientVisible: false,
      publishedAt,
      withdrawnAt: "2026-11-17T10:00:00.000Z",
      message: "已撤回，家长端不再展示",
    });
    expect(store.docs[0]!.publishStatus).toBe("withdrawn");
    const republished = await publishTalentAdviceDoc(docId, {
      store,
      now: new Date("2026-11-18T10:00:00.000Z"),
    });
    expect(republished).toMatchObject({
      publishStatus: "published",
      clientVisible: true,
      withdrawnAt: "",
      publishedAt: "2026-11-18T10:00:00.000Z",
      message: "已发布，家长端可见",
    });
    expect(received.version.id).toBe(store.docs[0]!.versionId);
  });

  it("重复发布 / 重复撤回 → 409；历史版本发布/撤回 → 409 只读；不存在 → 404", async () => {
    const store = new FakeAdviceStore([makeCandidate("1")]);
    await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
    });
    const docId = store.docs[0]!.id;
    await expectReject(
      publishTalentAdviceDoc(docId, { store }),
      409,
      "ADVICE_ALREADY_PUBLISHED",
    );
    await withdrawTalentAdviceDoc(docId, { store });
    await expectReject(
      withdrawTalentAdviceDoc(docId, { store }),
      409,
      "ADVICE_ALREADY_WITHDRAWN",
    );
    // 接收第二版后，第一版建议只读。
    await receiveTalentAdviceVersion({
      effectiveAt: "2027-03-12",
      store,
      source: foundSource(),
    });
    await expectReject(
      publishTalentAdviceDoc(docId, { store }),
      409,
      "ADVICE_VERSION_READONLY",
    );
    await expectReject(
      withdrawTalentAdviceDoc(docId, { store }),
      409,
      "ADVICE_VERSION_READONLY",
    );
    await expectReject(
      publishTalentAdviceDoc("doc_missing", { store }),
      404,
      "ADVICE_DOC_NOT_FOUND",
    );
  });

  it("发布后派生可见性跟随报告状态（报告待发布 → 不可见）", async () => {
    const store = new FakeAdviceStore([
      makeCandidate("1", { report: { status: "pending_publish" } }),
    ]);
    store.parents.set("parent_1", makeParent());
    store.children.set("child_1", makeChild());
    await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource(),
    });
    const docId = store.docs[0]!.id;
    await withdrawTalentAdviceDoc(docId, { store });
    const republished = await publishTalentAdviceDoc(docId, { store });
    expect(republished.clientVisible).toBe(false);
    store.reports.get(store.docs[0]!.reportId!)!.status = "published";
    const detail = await getTalentAdviceDocDetail(docId, store);
    expect(detail.clientVisible).toBe(true);
    expect(detail.clientVisibleText).toBe("可见");
  });
});

// ── 读模型：详情 / 按人历史 / 报告页签 ──────────────────────────────────

describe("详情、按人历史与报告页签", () => {
  async function seedTwoVersions() {
    const store = new FakeAdviceStore([makeCandidate("1")]);
    store.parents.set("parent_1", makeParent());
    store.children.set("child_1", makeChild());
    await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource({ variants: true }),
    });
    await receiveTalentAdviceVersion({
      effectiveAt: "2027-03-12",
      store,
      source: foundSource({ variants: true }),
    });
    return store;
  }

  it("建议书详情按分册分组、四段齐全、一份一册编号；历史版本只读", async () => {
    const store = await seedTwoVersions();
    const activeVersion = store.versions.find((version) => version.status === "active")!;
    const currentDoc = store.docs.find((doc) => doc.versionId === activeVersion.id)!;
    const detail = await getTalentAdviceDocDetail(currentDoc.id, store);
    expect(detail.versionReadonly).toBe(false);
    expect(detail.books.map((group) => group.book)).toEqual(["A", "B"]);
    expect(detail.books[0]!.bookName).toBe("生长发育");
    expect(detail.books[0]!.adviceNo).toBe(`${currentDoc.adviceNo}-A`);
    expect(detail.books[0]!.entropyText).toBe("优秀 2");
    expect(detail.books[0]!.sections[0]).toMatchObject({
      factor: "运动协调",
      entropy: "优秀",
      content: "该项潜质发展良好，基础条件较为扎实。",
      example: "多数情境下能稳定完成对应任务。",
      direction: "在现有基础上逐步增加任务复杂度。",
      suggestion: "保持规律接触与练习节奏。",
    });
    expect(detail.books[1]!.bookName).toBe("智商");
    expect(detail.clientVisibleText).toBe("可见");
    expect(JSON.stringify(detail)).not.toContain("idNoHash");
    const archivedDoc = store.docs.find(
      (doc) => doc.versionId !== activeVersion.id,
    )!;
    const archivedDetail = await getTalentAdviceDocDetail(archivedDoc.id, store);
    expect(archivedDetail.versionReadonly).toBe(true);
    expect(archivedDetail.version.status).toBe("archived");
  });

  it("按人历史：同一 reportNo 跨版本，按生效日期倒序，isCurrent 标记", async () => {
    const store = await seedTwoVersions();
    const anchor = store.docs[0]!;
    const history = await listTalentAdvicePersonHistory(anchor.id, store);
    expect(history.reportNo).toBe(anchor.reportNo);
    expect(history.maskedIdNo).toBe(MASKED_ID_NO);
    expect(history.items).toHaveLength(2);
    expect(history.items[0]).toMatchObject({
      versionNo: "V2027.03",
      isCurrent: true,
      matchKey: "陈小示｜8 岁",
      publishStatusLabel: "已发布",
    });
    expect(history.items[1]).toMatchObject({
      versionNo: "V2026.11",
      isCurrent: false,
    });
  });

  it("报告详情第 4 页签挂载数据：当前生效版覆盖册与状态", async () => {
    const store = await seedTwoVersions();
    const advice = await listTalentAdviceForSubject("child", "child_1", store);
    expect(advice.available).toBe(true);
    expect(advice.version).toMatchObject({ versionNo: "V2027.03" });
    expect(advice.reportReadable).toBe(true);
    expect(advice.clientVisible).toBe(true);
    expect(advice.docs).toHaveLength(1);
    expect(advice.docs[0]).toMatchObject({
      versionName: "V2027.03",
      publishStatus: "published",
      books: "AB",
      bookCount: 2,
      sectionCount: 3,
      clientVisible: true,
    });
    expect(advice.docs[0]!.entropyCounts).toEqual({ 优秀: 2, 常态: 1 });
    const pendingStore = new FakeAdviceStore([
      makeCandidate("1", { report: { status: "pending_publish" } }),
    ]);
    pendingStore.parents.set("parent_1", makeParent());
    pendingStore.children.set("child_1", makeChild());
    await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store: pendingStore,
      source: foundSource(),
    });
    const pending = await listTalentAdviceForSubject("child", "child_1", pendingStore);
    expect(pending.reportReadable).toBe(false);
    expect(pending.docs[0]!.clientVisible).toBe(false);
  });
});

// ── C 端只读契约：守卫 + 派生快照 ───────────────────────────────────────

describe("C 端只读快照", () => {
  async function seedClientStore(reportStatus: TalentReportRecord["status"] = "published") {
    const store = new FakeAdviceStore([
      makeCandidate("1", { report: { status: reportStatus } }),
    ]);
    store.parents.set("parent_1", makeParent());
    store.children.set("child_1", makeChild());
    await receiveTalentAdviceVersion({
      effectiveAt: "2026-11-12",
      store,
      source: foundSource({ variants: true }),
    });
    return store;
  }

  it("报告待发布 / 已撤回 → 409 固定码；非本人 / 未绑定 / 已解绑 → 404", async () => {
    const pending = await seedClientStore("pending_publish");
    await expectReject(
      assertTalentAdviceReadable("user_1", pending.candidates[0]!.report!.id, pending),
      409,
      "report_pending",
    );
    const retracted = await seedClientStore("retracted");
    await expectReject(
      assertTalentAdviceReadable(
        "user_1",
        retracted.candidates[0]!.report!.id,
        retracted,
      ),
      409,
      "report_retracted",
    );
    const store = await seedClientStore();
    const reportId = store.candidates[0]!.report!.id;
    await expectReject(
      assertTalentAdviceReadable("user_other", reportId, store),
      404,
    );
    store.parents.get("parent_1")!.status = "0";
    await expectReject(assertTalentAdviceReadable("user_1", reportId, store), 404);
    store.parents.get("parent_1")!.status = "1";
    store.children.get("child_1")!.status = "2";
    await expectReject(assertTalentAdviceReadable("user_1", reportId, store), 404);
  });

  it("报告可读 + 已发布建议 → available=true，按分册返回且只取最小 variant", async () => {
    const store = await seedClientStore();
    const reportId = store.candidates[0]!.report!.id;
    const snapshot = await getTalentAdviceClientSnapshot("user_1", reportId, store);
    expect(snapshot.available).toBe(true);
    if (!snapshot.available) return;
    expect(snapshot.version).toMatchObject({
      versionNo: "V2026.11",
      cycle: "2026-11 ~ 2027-02",
      cycleMonths: 4,
    });
    expect(snapshot.owner).toMatchObject({
      name: "陈小示",
      genderLabel: "男",
      age: 8,
      ageLabel: "8 岁",
    });
    expect(snapshot.books.map((book) => book.book)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
    ]);
    expect(snapshot.books.map((book) => book.state)).toEqual([
      "available",
      "available",
      "not_detected",
      "not_detected",
      "not_detected",
      "not_detected",
    ]);
    const bookA = snapshot.books[0]!;
    expect(bookA.adviceNo).toBe(`${store.docs[0]!.adviceNo}-A`);
    expect(bookA.total).toBe(2);
    expect(bookA.sectionCount).toBe(1);
    expect(bookA.sections[0]!.content).toBe(
      "该项潜质发展良好，基础条件较为扎实。",
    );
    expect(bookA.entropyList).toEqual([{ level: "优秀", count: 1 }]);
    expect(bookA.sections[0]).not.toHaveProperty("variant");
    const text = JSON.stringify(snapshot);
    for (const prohibited of [
      "versionId",
      "reportNo",
      "matchKey",
      "syncedAt",
      "publishStatus",
      "idNoHash",
      MASKED_ID_NO,
    ])
      expect(text).not.toContain(prohibited);
  });

  it("建议已撤回 / 无生效版本 → available=false（空态文案）", async () => {
    const store = await seedClientStore();
    const reportId = store.candidates[0]!.report!.id;
    const docId = store.docs[0]!.id;
    await withdrawTalentAdviceDoc(docId, { store });
    expect(await getTalentAdviceClientSnapshot("user_1", reportId, store)).toEqual({
      available: false,
      emptyText: "暂未收到培育建议",
    });
    const emptyStore = new FakeAdviceStore([makeCandidate("1")]);
    emptyStore.parents.set("parent_1", makeParent());
    emptyStore.children.set("child_1", makeChild());
    expect(
      await getTalentAdviceClientSnapshot(
        "user_1",
        emptyStore.candidates[0]!.report!.id,
        emptyStore,
      ),
    ).toEqual({ available: false, emptyText: "暂未收到培育建议" });
  });

  it("纯函数快照构建：不返回后台口径字段，按分册排序并过滤变体", () => {
    const doc = {
      id: "doc_1",
      created: AT,
      updated: AT,
      adviceNo: "AD-GR202611160001-202611",
      reportNo: "GR202611160001",
      subjectType: "child" as const,
      subjectId: "child_1",
      name: "陈小示",
      maskedIdNo: MASKED_ID_NO,
      idNoHash: ID_NO_HASH,
      gender: "male" as const,
      birthday: "2018-09-08",
      age: 8,
      matchKey: "陈小示｜8 岁",
      versionName: "V2026.11",
      publishStatus: "published" as const,
      syncedAt: AT,
      source: "mock" as const,
      books: "BA",
      sections: [
        {
          book: "B" as const,
          bookName: "智商",
          chapter: "2.1 智商概述",
          factor: "语言表达",
          entropy: "常态" as const,
          content: "B 册正文",
          example: "",
          direction: "",
          suggestion: "",
          variant: 1,
        },
        {
          book: "A" as const,
          bookName: "生长发育",
          chapter: "1.1 生长发育概述",
          factor: "运动协调",
          entropy: "优秀" as const,
          content: "A 册正文",
          example: "",
          direction: "",
          suggestion: "",
          variant: 2,
        },
      ],
    };
    const version = {
      id: "version_1",
      created: AT,
      updated: AT,
      versionNo: "V2026.11",
      status: "active" as const,
      cycle: "2026-11 ~ 2027-02",
      effectiveAt: "2026-11-12",
      nextUpdateAt: "2027-03-12",
      syncedAt: AT,
      source: "mock" as const,
      operatorName: "系统同步",
    };
    const snapshot = buildTalentAdviceClientSnapshot(doc, version);
    expect(snapshot.available).toBe(true);
    if (!snapshot.available) return;
    expect(snapshot.books.map((book) => book.book)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
    ]);
    expect(snapshot.books.map((book) => book.state)).toEqual([
      "available",
      "available",
      "not_detected",
      "not_detected",
      "not_detected",
      "not_detected",
    ]);
    expect(snapshot.books[0]!.adviceNo).toBe("AD-GR202611160001-202611-A");
    expect(snapshot.books[0]!.sections[0]!.content).toBe("A 册正文");
    const text = JSON.stringify(snapshot);
    for (const prohibited of [
      "reportNo",
      "matchKey",
      "syncedAt",
      "publishStatus",
      "idNoHash",
      "versionId",
    ])
      expect(text).not.toContain(prohibited);
  });

  it("报告只开放 A/D 时六册齐全，其余册按未开放置灰", () => {
    const doc = {
      id: "doc_ad",
      created: AT,
      updated: AT,
      adviceNo: "AD-GR202611160001-202611",
      reportNo: "GR202611160001",
      subjectType: "child" as const,
      subjectId: "child_1",
      name: "张杰凯",
      maskedIdNo: MASKED_ID_NO,
      idNoHash: ID_NO_HASH,
      gender: "male" as const,
      birthday: "2018-09-08",
      age: 8,
      matchKey: "张杰凯｜8 岁",
      versionName: "V2026.11",
      publishStatus: "published" as const,
      syncedAt: AT,
      source: "mock" as const,
      books: "ABCDEF",
      sections: [
        {
          book: "A" as const,
          bookName: "生长发育",
          chapter: "1.1 生长发育概述",
          factor: "运动协调",
          entropy: "优秀" as const,
          content: "A 册正文",
          example: "",
          direction: "",
          suggestion: "",
          variant: 1,
        },
        {
          book: "D" as const,
          bookName: "领导商",
          chapter: "4.1 领导商概述",
          factor: "组织协调",
          entropy: "常态" as const,
          content: "D 册正文",
          example: "",
          direction: "",
          suggestion: "",
          variant: 1,
        },
      ],
    };
    const version = {
      id: "version_1",
      created: AT,
      updated: AT,
      versionNo: "V2026.11",
      status: "active" as const,
      cycle: "2026-11 ~ 2027-02",
      effectiveAt: "2026-11-12",
      nextUpdateAt: "2027-03-12",
      syncedAt: AT,
      source: "mock" as const,
      operatorName: "系统同步",
    };
    const snapshot = buildTalentAdviceClientSnapshot(doc, version, {
      report: makeReport("report_ad", "gene_ad", {
        openVolumeIds: ["V1", "V4"],
      }),
    });
    expect(snapshot.available).toBe(true);
    if (!snapshot.available) return;
    expect(snapshot.books.map((book) => book.book)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
    ]);
    expect(snapshot.books.map((book) => book.state)).toEqual([
      "available",
      "not_published",
      "not_published",
      "available",
      "not_published",
      "not_published",
    ]);
    expect(snapshot.books.filter((book) => book.state === "available").map((book) => book.book)).toEqual(["A", "D"]);
    expect(snapshot.books[1]!.sections).toEqual([]);
  });
});

// ── Mock 源与环境解析 ───────────────────────────────────────────────────

describe("Mock 外部建议源", () => {
  const subject = {
    geneReportId: "gene_1",
    reportNo: "GR202611160001",
    subjectType: "child" as const,
    subjectId: "child_1",
    parentId: "parent_1",
    name: "陈小示",
    gender: "male" as const,
    birthday: "2018-09-08",
    age: 8,
    maskedIdNo: MASKED_ID_NO,
  };

  it("默认全匹配：sections 可归一化、含 variant=2 话术变体", async () => {
    const source = createMockTalentAdviceSource();
    const result = await source.match(subject);
    expect(result.found).toBe(true);
    const validation = normalizeTalentAdviceSections(result.sections, { books: "A" });
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(validation.sections.every((section) => section.book === "A")).toBe(true);
      expect(
        validation.sections.some((section) => section.variant === 2),
      ).toBe(true);
    }
    const noVariants = await createMockTalentAdviceSource({
      variants: false,
    }).match(subject);
    expect(
      (noVariants.sections ?? []).every((section) => Number(section.variant ?? 1) === 1),
    ).toBe(true);
  });

  it("多册覆盖：books 可指定 A–F 子集（演示按分册分组）", () => {
    const sections = buildMockTalentAdviceSections(subject, "ABCD");
    const books = [...new Set(sections.map((section) => section.book))].sort();
    expect(books).toEqual(["A", "B", "C", "D"]);
    expect(normalizeTalentAdviceSections(sections, { books: "ABCD" }).ok).toBe(true);
  });

  it("partial / empty / error / slow 四模式语义", async () => {
    const partial = createMockTalentAdviceSource({ mode: "partial" });
    expect((await partial.match(subject)).found).toBe(true);
    expect((await partial.match({ ...subject, reportNo: "GR2" })).found).toBe(false);

    const empty = createMockTalentAdviceSource({ mode: "empty" });
    expect(await empty.match(subject)).toMatchObject({
      found: false,
      reason: "no_result",
    });

    const error = createMockTalentAdviceSource({ mode: "error" });
    await expect(error.match(subject)).rejects.toThrow("Mock 外部培育建议源异常");

    const startedAt = Date.now();
    const slow = createMockTalentAdviceSource({ mode: "slow", delayMs: 10 });
    expect((await slow.match(subject)).found).toBe(true);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(5);
  });

  it("环境变量解析：默认 mock/full、external 显式切换、非法值回退", () => {
    expect(resolveTalentAdviceSourceKind({})).toBe("mock");
    expect(
      resolveTalentAdviceSourceKind({ TALENT_ADVICE_SOURCE: "external" }),
    ).toBe("external");
    expect(resolveTalentAdviceMockMode({})).toBe("full");
    expect(
      resolveTalentAdviceMockMode({ TALENT_ADVICE_MOCK_MODE: "partial" }),
    ).toBe("partial");
    expect(
      resolveTalentAdviceMockMode({ TALENT_ADVICE_MOCK_MODE: "unknown" }),
    ).toBe("full");
    expect(TALENT_ADVICE_MOCK_MODES).toEqual([
      "full",
      "partial",
      "empty",
      "error",
      "slow",
    ]);
    expect(resolveTalentAdviceMockDelayMs({})).toBe(0);
    expect(
      resolveTalentAdviceMockDelayMs({ TALENT_ADVICE_MOCK_DELAY_MS: "120" }),
    ).toBe(120);
    expect(resolveTalentAdviceMockDelayMs({ TALENT_ADVICE_MOCK_DELAY_MS: "-1" })).toBe(
      0,
    );
  });

  it("external 源未接入 → createTalentAdviceSource 503，不静默降级 Mock", () => {
    let error: { statusCode?: number } | null = null;
    try {
      createTalentAdviceSource({ TALENT_ADVICE_SOURCE: "external" });
    } catch (caught) {
      error = caught as { statusCode?: number };
    }
    expect(error?.statusCode).toBe(503);
    expect(createTalentAdviceSource({}).name).toBe("mock");
  });
});