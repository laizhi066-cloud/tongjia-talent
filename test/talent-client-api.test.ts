/**
 * @description M7-B C 端 API 路由级测试：15 条 `/api/client/talent/**` 路由清单与守卫口径、
 *   summary 状态派生与计数、报告 / 分册 / 要素冻结快照投影、方向上限与选择投影、
 *   建议可见性投影（entropyList 别名）、家长资料与孩子 CRUD 的脱敏 / 归属 404 / 冲突 409，
 *   以及 M2 bindings / M8 PDF 路由不被破坏。不连接真实 PocketBase。
 * @file test/talent-client-api.test.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  TalentChildRecord,
  TalentParentRecord,
} from "~~/shared/types/talent-member";
import type {
  TalentReportRecord,
  TalentReportVolumeSnapshot,
} from "~~/shared/types/talent-report";
import type {
  TalentDirectionSnapshot,
  TalentSelectionItem,
} from "~~/shared/types/talent-direction";
import {
  TALENT_CLIENT_STATUS_TEXTS,
  assertTalentClientReportAccess,
  buildTalentClientAdvice,
  buildTalentClientChildItem,
  buildTalentClientDirections,
  buildTalentClientFactor,
  buildTalentClientProfile,
  buildTalentClientReportOverview,
  buildTalentClientSelectionResponse,
  buildTalentClientStatusText,
  buildTalentClientSummary,
  buildTalentClientVolume,
  buildTalentClientVolumeHeaderText,
  conflictTalentClient,
  createTalentClientChild,
  invalidTalentClient,
  loadTalentClientChildren,
  loadTalentClientReportList,
  normalizeTalentClientGuardError,
  notFoundTalentClient,
  mutateTalentClientSelection,
  notFoundTalentClientVolume,
  resolveTalentClientVolumeState,
  updateTalentClientChild,
  validateTalentClientBody,
  type TalentClientDirectionConfig,
} from "~~/server/utils/talent-client-api";
import { sanitizeTalentParentRecord } from "~~/server/utils/talent-member";
import { encryptTalentSensitive, hashTalentMemberIdNo, maskTalentIdNo } from "~~/server/utils/talent-member-crypto";
import { setTalentMemberQueryPBProvider } from "~~/server/utils/talent-member-query";

const ROOT = resolve(import.meta.dirname, "..");

// M2 加密三件套（密文 / HMAC / 脱敏）依赖 ENCRYPTION_KEY；所有用例共用。
beforeAll(() => {
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY || "test-encryption-key-32-characters-long";
});
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

// ── 内存 PocketBase：只实现本文件用到的会员 / 报告服务方法与简单 filter ─────────────────

interface MemoryRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}

/** 只支持 `field = "value"`、`field ~ "value"`、`field != ""` 与 && / 括号内 || 的简单 filter。 */
function memoryFilterMatches(row: MemoryRecord, filter: string): boolean {
  const text = filter.trim();
  if (!text) return true;
  return text.split(" && ").every((andPart) => {
    const clause = andPart.trim();
    if (clause.startsWith("(") && clause.endsWith(")")) {
      const inner = clause.slice(1, -1);
      return inner.split(" || ").some((orPart) => memoryFilterMatches(row, orPart));
    }
    const equals = /^(\w+) = "([^"]*)"$/.exec(clause);
    if (equals) return String(row[equals[1] as string] ?? "") === equals[2];
    const notEmpty = /^(\w+) != ""$/.exec(clause);
    if (notEmpty) return String(row[notEmpty[1] as string] ?? "") !== "";
    const like = /^(\w+) ~ "([^"]*)"$/.exec(clause);
    if (like) return String(row[like[1] as string] ?? "").includes(like[2] as string);
    return false;
  });
}

class MemoryPocketBase {
  private sequence = 0;
  private store = new Map<string, MemoryRecord[]>();
  writes = 0;

  rowsOf(collection: string): MemoryRecord[] {
    if (!this.store.has(collection)) this.store.set(collection, []);
    return this.store.get(collection) as MemoryRecord[];
  }

  seed(collection: string, data: object): MemoryRecord {
    const timestamp = new Date().toISOString();
    const source = data as Record<string, unknown>;
    const record: MemoryRecord = {
      id: String(source.id || `rec-${++this.sequence}`),
      created: timestamp,
      updated: timestamp,
      ...source,
    };
    this.rowsOf(collection).push(record);
    return record;
  }

  collection(name: string) {
    const rows = this.rowsOf(name);
    const notFound = () => Object.assign(new Error("Not found"), { status: 404 });
    return {
      getOne: async (id: string) => {
        const found = rows.find((row) => row.id === id);
        if (!found) throw notFound();
        return { ...found };
      },
      getFirstListItem: async (filter: string) => {
        const found = rows.find((row) => memoryFilterMatches(row, filter));
        if (!found) throw notFound();
        return { ...found };
      },
      getFullList: async (options: { filter?: string } = {}) =>
        rows
          .filter((row) => !options.filter || memoryFilterMatches(row, options.filter))
          .map((row) => ({ ...row })),
      getList: async (page: number, pageSize: number, options: { filter?: string } = {}) => {
        const filtered = rows.filter(
          (row) => !options.filter || memoryFilterMatches(row, options.filter),
        );
        return {
          items: filtered.slice((page - 1) * pageSize, page * pageSize).map((row) => ({ ...row })),
          totalItems: filtered.length,
        };
      },
      create: async (data: Record<string, unknown>) => {
        this.writes += 1;
        const timestamp = new Date().toISOString();
        const record: MemoryRecord = {
          id: `rec-${++this.sequence}`,
          created: timestamp,
          updated: timestamp,
          ...data,
        };
        rows.push(record);
        return { ...record };
      },
      update: async (id: string, data: Record<string, unknown>) => {
        this.writes += 1;
        const found = rows.find((row) => row.id === id);
        if (!found) throw notFound();
        Object.assign(found, data, { updated: new Date().toISOString() });
        return { ...found };
      },
      delete: async (id: string) => {
        this.writes += 1;
        const index = rows.findIndex((row) => row.id === id);
        if (index < 0) throw notFound();
        rows.splice(index, 1);
      },
    };
  }

  collections = {
    getOne: async () => {
      throw Object.assign(new Error("collection not found"), { status: 404 });
    },
  };
}

function asPocketBase(pb: MemoryPocketBase): never {
  return pb as unknown as never;
}

// ── 夹具：M2 家长 / 子女 + M3 报告冻结快照 ─────────────────────────────────────────

function buildParentRecord(overrides: Partial<TalentParentRecord> = {}): TalentParentRecord {
  return {
    id: "parent-1",
    created: "2026-11-16 10:00:00.000Z",
    updated: "2026-11-16 10:00:00.000Z",
    parentNo: "P202611160001",
    name: "演示家长",
    mobileCipher: encryptTalentSensitive("13800000001"),
    mobileHash: "mobile-hash-1",
    maskedMobile: "1380****0001",
    idNoCipher: encryptTalentSensitive("110101198803121234"),
    idNoHash: hashTalentMemberIdNo("110101198803121234"),
    maskedIdNo: maskTalentIdNo("110101198803121234"),
    gender: "female",
    birthday: "1988-03-12",
    source: "mock",
    status: "1",
    registeredAt: "2026-11-16 10:00:00.000Z",
    userId: "user-1",
    ...overrides,
  } as TalentParentRecord;
}

function buildChildRecord(overrides: Partial<TalentChildRecord> = {}): TalentChildRecord {
  return {
    id: "child-1",
    created: "2026-11-16 10:05:00.000Z",
    updated: "2026-11-16 10:05:00.000Z",
    parentId: "parent-1",
    name: "演示子女一",
    gender: "female",
    birthday: "2016-09-08",
    relation: "mother",
    idNoCipher: encryptTalentSensitive("110101201609081234"),
    idNoHash: hashTalentMemberIdNo("110101201609081234"),
    maskedIdNo: maskTalentIdNo("110101201609081234"),
    query: "found",
    queryReason: "",
    querySeq: 1,
    queryAttempts: 1,
    status: "1",
    ...overrides,
  } as TalentChildRecord;
}

const VOLUME_SNAPSHOT: TalentReportVolumeSnapshot[] = [
  { volumeId: "V1", bookCode: "A", name: "生长发育", sortOrder: 1, open: true, chapterCount: 1, factorCount: 2, chapters: [] },
  { volumeId: "V2", bookCode: "B", name: "智商", sortOrder: 2, open: true, chapterCount: 1, factorCount: 2, chapters: [] },
  { volumeId: "V3", bookCode: "C", name: "情商", sortOrder: 3, open: false, chapterCount: 1, factorCount: 1, chapters: [] },
  { volumeId: "V4", bookCode: "D", name: "领导商", sortOrder: 4, open: false, chapterCount: 0, factorCount: 0, chapters: [] },
  { volumeId: "V5", bookCode: "E", name: "艺术商", sortOrder: 5, open: false, chapterCount: 0, factorCount: 0, chapters: [] },
  { volumeId: "V6", bookCode: "F", name: "体育运动商", sortOrder: 6, open: false, chapterCount: 0, factorCount: 0, chapters: [] },
];

const DIRECTION_SNAPSHOT: TalentDirectionSnapshot = {
  version: 1,
  at: "2026-11-16 10:00:00.000Z",
  operatorId: "",
  operatorName: "",
  recommendLimit: 5,
  selectionLimit: 3,
  levelOrders: { LV1: 1, LV2: 2, LV3: 3, LV4: 4 },
  tiers: [
    { id: "tier-1", code: "T1", name: "启蒙", teacher: "普通老师", freq: "每周 1–2 次", headline: "轻松开始", sortOrder: 1 },
    { id: "tier-2", code: "T2", name: "精进", teacher: "卓越老师", freq: "每周 2–3 次", headline: "进阶提升", sortOrder: 2 },
  ],
  directions: [
    {
      directionId: "dir-1",
      code: "DIR-001",
      name: "舞蹈家",
      version: 1,
      tierIds: ["tier-1", "tier-2"],
      defaultTierId: "tier-1",
      total: 3,
      hitCount: 2,
      hitRate: 2 / 3,
      requirements: [
        { code: "A-01", level: "LV3", factorName: "体格生长潜质", factorLevel: "LV3", actualOrder: 3, needOrder: 3, met: true, gap: 0 },
        { code: "A-02", level: "LV4", factorName: "体形发育潜质", factorLevel: "LV4", actualOrder: 4, needOrder: 4, met: true, gap: 0 },
        { code: "B-01", level: "LV4", factorName: "逻辑推理潜质", factorLevel: "LV3", actualOrder: 3, needOrder: 4, met: false, gap: 1 },
      ],
    },
    {
      directionId: "dir-2",
      code: "DIR-003",
      name: "逻辑思维",
      version: 1,
      tierIds: ["tier-1"],
      defaultTierId: "tier-1",
      total: 1,
      hitCount: 0,
      hitRate: 0,
      requirements: [
        { code: "B-02", level: "LV4", factorName: "数理逻辑潜质", factorLevel: "LV1", actualOrder: 1, needOrder: 4, met: false, gap: 3 },
      ],
    },
  ],
};

const SELECTIONS: TalentSelectionItem[] = [
  {
    directionId: "dir-1",
    requestId: "",
    custom: false,
    tierId: "tier-2",
    directionName: "舞蹈家",
    tierName: "精进",
    teacher: "卓越老师",
    freq: "每周 2–3 次",
    manualName: "",
    selectedAt: "2026-11-16T12:00:00.000Z",
  },
];

const REPORTS: TalentReportRecord[] = [
  {
    id: "report-published",
    created: "2026-11-16 10:00:00.000Z",
    updated: "2026-11-16 10:00:00.000Z",
    reportNo: "R202611160001",
    status: "published",
    publishedAt: "2026-11-16 10:00:00.000Z",
    subjectType: "child",
    subjectId: "child-1",
    parentId: "parent-1",
    snapshotVersion: 1,
    openVolumeIds: ["V1", "V2"],
    volumeSnapshot: VOLUME_SNAPSHOT,
    directionSnapshot: DIRECTION_SNAPSHOT,
    selections: SELECTIONS,
    factorSnapshot: [
      { code: "A-01", name: "体格生长潜质", category: "A", categoryName: "生长发育", volumeId: "V1", bookCode: "A", chapter: "生长发育概述", levelCode: "LV3", levelName: "优秀", levelOrder: 3, score: 0, note: "固定注解 A-01", condition: "" },
      { code: "A-02", name: "体形发育潜质", category: "A", categoryName: "生长发育", volumeId: "V1", bookCode: "A", chapter: "生长发育概述", levelCode: "LV4", levelName: "卓越", levelOrder: 4, score: 0, note: "固定注解 A-02", condition: "3–6 岁" },
      { code: "B-01", name: "逻辑推理潜质", category: "B", categoryName: "智商", volumeId: "V2", bookCode: "B", chapter: "智商概述", levelCode: "LV3", levelName: "优秀", levelOrder: 3, score: 0, note: "固定注解 B-01", condition: "" },
      { code: "B-02", name: "数理逻辑潜质", category: "B", categoryName: "智商", volumeId: "V2", bookCode: "B", chapter: "智商概述", levelCode: "LV1", levelName: "常态", levelOrder: 1, score: 0, note: "固定注解 B-02", condition: "" },
      { code: "C-01", name: "情绪识别潜质", category: "C", categoryName: "情商", volumeId: "V3", bookCode: "C", chapter: "情商概述", levelCode: "LV1", levelName: "常态", levelOrder: 1, score: 0, note: "固定注解 C-01", condition: "" },
    ],
  } as TalentReportRecord,
  {
    id: "report-pending",
    created: "2026-11-16 10:10:00.000Z",
    updated: "2026-11-16 10:10:00.000Z",
    reportNo: "R202611160002",
    status: "pending_publish",
    subjectType: "child",
    subjectId: "child-2",
    parentId: "parent-1",
    snapshotVersion: 0,
  } as TalentReportRecord,
  {
    id: "report-other",
    created: "2026-11-16 10:20:00.000Z",
    updated: "2026-11-16 10:20:00.000Z",
    reportNo: "R202611160003",
    status: "published",
    subjectType: "child",
    subjectId: "child-other",
    parentId: "parent-other",
    snapshotVersion: 1,
    openVolumeIds: ["V1"],
    volumeSnapshot: VOLUME_SNAPSHOT,
    directionSnapshot: null,
    selections: [],
    factorSnapshot: [],
  } as TalentReportRecord,
];

const DIRECTION_CONFIG: TalentClientDirectionConfig = {
  directions: new Map([
    ["dir-1", { id: "dir-1", name: "舞蹈家", description: "以肢体协调、节奏感与表现力为核心。", icon: "舞", status: "1", tierIds: ["tier-1", "tier-2"], defaultTierId: "tier-1" }],
    ["dir-2", { id: "dir-2", name: "逻辑思维", description: "以数理推理与问题解决为核心。", icon: "逻", status: "1", tierIds: ["tier-1"], defaultTierId: "tier-1" }],
  ]),
  tiers: new Map([
    ["tier-1", { id: "tier-1", name: "启蒙", teacher: "普通老师", freq: "每周 1–2 次", headline: "轻松开始", description: "培养兴趣", isDefault: true }],
    ["tier-2", { id: "tier-2", name: "精进", teacher: "卓越老师", freq: "每周 2–3 次", headline: "进阶提升", description: "系统训练", isDefault: false }],
  ]),
  levels: new Map([
    ["LV1", "常态"],
    ["LV2", "优良"],
    ["LV3", "优秀"],
    ["LV4", "卓越"],
  ]),
  manualOptions: [
    { directionId: "dir-2", name: "逻辑思维" },
    { directionId: "dir-1", name: "舞蹈家" },
  ],
};

function findReport(id: string): TalentReportRecord {
  const report = REPORTS.find((item) => item.id === id);
  if (!report) throw new Error(`夹具缺少报告 ${id}`);
  return report;
}

function expectNoSensitiveKeys(value: unknown): void {
  const text = JSON.stringify(value);
  expect(text).not.toMatch(/Cipher/);
  expect(text).not.toMatch(/Hash/);
  expect(text).not.toMatch(/13800000001/);
  expect(text).not.toMatch(/110101198803121234/);
  expect(text).not.toMatch(/110101201609081234/);
}

// ── 1. 路由清单与契约守卫（静态） ─────────────────────────────────────────────

describe("M7-B C 端路由清单与守卫口径", () => {
  const ROUTES = [
    "summary.get.ts",
    "reports/index.get.ts",
    "reports/[id].get.ts",
    "reports/[id]/volumes/[volumeId].get.ts",
    "reports/[id]/factors/[factorCode].get.ts",
    "advice.get.ts",
    "directions.get.ts",
    "selections.post.ts",
    "selections/[selectionId].put.ts",
    "selections/[selectionId].delete.ts",
    "profile.get.ts",
    "profile.put.ts",
    "children/index.get.ts",
    "children/index.post.ts",
    "children/[id].put.ts",
  ] as const;

  it("spec §10.2 / §10.5 的 15 条路由文件齐全", () => {
    for (const file of ROUTES) {
      expect(read(`server/api/client/talent/${file}`), file).toBeTruthy();
    }
  });

  it("GET 路由统一 no-store，写路由统一 withOperLog", () => {
    for (const file of ROUTES) {
      const source = read(`server/api/client/talent/${file}`);
      const isWrite =
        file.endsWith(".post.ts") || file.endsWith(".put.ts") || file.endsWith(".delete.ts");
      if (isWrite) {
        expect(source, file).toContain("withOperLog");
        // DELETE 走 query 不读请求体；POST / PUT 必须 Zod 校验。
        if (!file.endsWith(".delete.ts"))
          expect(source, file).toContain("validateTalentClientBody");
      } else {
        expect(source, file).toContain("cache-control");
        expect(source, file).toContain("no-store");
      }
    }
  });

  it("C 端路由不接受前端 parentId / customerId（只按登录账号解析家长）", () => {
    for (const file of ROUTES) {
      const source = read(`server/api/client/talent/${file}`);
      expect(source, file).not.toContain("query.parentId");
      expect(source, file).not.toContain("body.parentId");
      expect(source, file).not.toMatch(/req.*customerId|query\.customerId/);
    }
  });

  it("审计摘要不含证件号 / 手机号字段（只含对象名与动作）", () => {
    for (const file of ROUTES) {
      const source = read(`server/api/client/talent/${file}`);
      expect(source, file).not.toMatch(/summary:.*(idNo|mobile|masked)/i);
    }
  });

  it("M2 bindings 与 M8 分册 PDF 路由保持存在（未被 M7-B 破坏）", () => {
    expect(read("server/api/client/talent/bindings.get.ts")).toContain("getTalentMemberBindings");
    expect(read("server/api/client/talent/bindings/claim.post.ts")).toContain("claimTalentMemberBinding");
    expect(
      read("server/api/client/talent/reports/[id]/volumes/[volumeId]/pdf.get.ts"),
    ).toContain("downloadTalentReportPdf");
    expect(
      read("server/api/client/talent/reports/[id]/volumes/[volumeId]/pdf-ticket.post.ts"),
    ).toBeTruthy();
  });

  it("状态文案与 §11.2 一字不差（不得改写）", () => {
    expect(TALENT_CLIENT_STATUS_TEXTS.reportPending).toBe("报告整理中");
    expect(TALENT_CLIENT_STATUS_TEXTS.reportRetracted).toBe("报告内容更新中");
    expect(TALENT_CLIENT_STATUS_TEXTS.reportSyncing).toBe("报告待同步");
    expect(TALENT_CLIENT_STATUS_TEXTS.noReport).toBe("该对象暂无基因报告");
    expect(TALENT_CLIENT_STATUS_TEXTS.querying).toBe("结果查询中");
    expect(TALENT_CLIENT_STATUS_TEXTS.notFound).toBe("信息待核对");
    expect(TALENT_CLIENT_STATUS_TEXTS.unqueried).toBe("尚未查询");
    expect(TALENT_CLIENT_STATUS_TEXTS.adviceEmpty).toBe("暂未收到培育建议");
    expect(TALENT_CLIENT_STATUS_TEXTS.reportReady(3)).toBe("3 个分册可读");
  });
});

// ── 2. summary 投影 ─────────────────────────────────────────────────────────

describe("summary：状态派生 / 计数 / 越权 404", () => {
  const now = new Date("2026-11-17T00:00:00.000Z");

  function subjectInput(overrides: Record<string, unknown> = {}) {
    return {
      subjectType: "self" as const,
      subjectId: "parent-1",
      name: "演示家长",
      gender: "female" as const,
      genderLabel: "女",
      birthday: "1988-03-12",
      relation: "",
      relationLabel: "",
      query: null,
      queryReason: "" as const,
      report: null,
      adviceCount: 0,
      now,
      ...overrides,
    };
  }

  it("无报告本人 / 查询四态 / 报告三态文案", () => {
    expect(
      buildTalentClientStatusText({
        subjectType: "self",
        reportStatus: "none",
      }),
    ).toBe("该对象暂无基因报告");
    expect(
      buildTalentClientStatusText({
        subjectType: "child",
        query: "querying",
        reportStatus: "none",
      }),
    ).toBe("结果查询中");
    expect(
      buildTalentClientStatusText({
        subjectType: "child",
        query: "not_found",
        reportStatus: "none",
      }),
    ).toBe("信息待核对");
    expect(
      buildTalentClientStatusText({
        subjectType: "child",
        query: "unqueried",
        reportStatus: "none",
      }),
    ).toBe("尚未查询");
    expect(
      buildTalentClientStatusText({
        subjectType: "child",
        query: "found",
        reportStatus: "none",
      }),
    ).toBe("报告待同步");
    expect(
      buildTalentClientStatusText({
        subjectType: "child",
        query: "found",
        reportStatus: "pending_publish",
      }),
    ).toBe("报告整理中");
    expect(
      buildTalentClientStatusText({
        subjectType: "child",
        query: "found",
        reportStatus: "retracted",
      }),
    ).toBe("报告内容更新中");
    expect(
      buildTalentClientStatusText({
        subjectType: "child",
        query: "found",
        reportStatus: "published",
        readableVolumeCount: 2,
      }),
    ).toBe("2 个分册可读");
  });

  it("未绑定 / 家长停用只返回账号状态与页脚（subjects=[]）", () => {
    const unbound = buildTalentClientSummary({
      accountState: "unbound",
      subjects: [subjectInput()],
      footer: { copyright: "© 同佳", contactPhone: "" },
    });
    expect(unbound).toMatchObject({
      accountState: "unbound",
      subjects: [],
      currentId: "",
      current: null,
      pendingCheckCount: 0,
      footer: { copyright: "© 同佳" },
    });
    const disabled = buildTalentClientSummary({
      accountState: "parent_disabled",
      footer: { copyright: "© 同佳", contactPhone: "400" },
    });
    expect(disabled.accountState).toBe("parent_disabled");
    expect(disabled.subjects).toEqual([]);
  });

  it("对象计数：已发布报告 2 册 / 建议 3 / 已选 1 / 上限 3 / 待核对按 query!=found", () => {
    const summary = buildTalentClientSummary({
      accountState: "active",
      now,
      footer: { copyright: "© 同佳", contactPhone: "" },
      currentSubjectId: "child-1",
      subjects: [
        subjectInput(),
        {
          ...subjectInput({
            subjectType: "child",
            subjectId: "child-1",
            name: "演示子女一",
            gender: "female",
            genderLabel: "女",
            birthday: "2016-09-08",
            relation: "mother",
            relationLabel: "母亲",
            query: "found",
            report: findReport("report-published"),
            adviceCount: 3,
          }),
        },
        {
          ...subjectInput({
            subjectType: "child",
            subjectId: "child-2",
            name: "演示子女二",
            birthday: "2019-05-20",
            query: "not_found",
            queryReason: "info_mismatch",
            report: findReport("report-pending"),
          }),
        },
      ],
    });
    expect(summary.currentId).toBe("child-1");
    expect(summary.current?.subjectId).toBe("child-1");
    expect(summary.pendingCheckCount).toBe(1);
    const child = summary.subjects[1]!;
    expect(child).toMatchObject({
      reportId: "report-published",
      reportStatus: "published",
      statusText: "2 个分册可读",
      readableVolumeCount: 2,
      totalVolumeCount: 6,
      adviceCount: 3,
      selectedDirectionCount: 1,
      selectionLimit: 3,
      age: 10,
      ageLabel: "10 岁",
      genderLabel: "女",
      relationLabel: "母亲",
    });
    const pending = summary.subjects[2]!;
    expect(pending.reportStatus).toBe("pending_publish");
    expect(pending.statusText).toBe("报告整理中");
    expect(pending.totalVolumeCount).toBe(6);
    // 本人无报告：reportId 空串 + total 0。
    expect(summary.subjects[0]).toMatchObject({ reportId: "", reportStatus: "none", totalVolumeCount: 0, query: null });
    const self = summary.subjects[0]!;
    expect(self.query).toBeNull();
  });

  it("非法 / 越权 currentSubjectId → 404（不泄露存在性）", () => {
    expect(() =>
      buildTalentClientSummary({
        accountState: "active",
        currentSubjectId: "not-exist",
        subjects: [subjectInput()],
      }),
    ).toThrowError(/内容不可查看/);
  });

  it("summary 响应不含 cipher / hash / 手机号 / 身份证原文", () => {
    const summary = buildTalentClientSummary({
      accountState: "active",
      now,
      subjects: [
        subjectInput({ report: findReport("report-published") }),
      ],
    });
    expectNoSensitiveKeys(summary);
  });
});

// ── 3. 报告 / 分册 / 要素投影 ────────────────────────────────────────────────

describe("报告 / 分册 / 要素：M3 冻结快照投影", () => {
  it("报告总览：固定六册 + state 派生 + 表头文案 + 不含报告编号 / 编码", () => {
    const overview = buildTalentClientReportOverview({
      report: findReport("report-published"),
      subject: {
        subjectType: "child",
        name: "演示子女一",
        gender: "female",
        birthday: "2016-09-08",
        relationLabel: "母亲",
      },
      adviceCount: 4,
      now: new Date("2026-11-17T00:00:00.000Z"),
    });
    expect(overview.report).toMatchObject({
      status: "published",
      statusLabel: "已发布",
      readableVolumeCount: 2,
      totalVolumeCount: 6,
      volumeHeaderText: "共 6 册 · 2 册可读",
      adviceCount: 4,
    });
    expect(overview.subject).toMatchObject({ name: "演示子女一", genderLabel: "女", ageLabel: "10 岁", relationLabel: "母亲" });
    expect(overview.volumes.map((volume) => volume.volumeId)).toEqual(["V1", "V2", "V3", "V4", "V5", "V6"]);
    expect(overview.volumes.map((volume) => volume.state)).toEqual([
      "readable",
      "readable",
      "not_open",
      "not_detected",
      "not_detected",
      "not_detected",
    ]);
    const text = JSON.stringify(overview);
    expect(text).not.toMatch(/R202611160001/);
    expect(text).not.toMatch(/A-0[0-9]|B-0[0-9]|bookCode/);
  });

  it("分册表头口径统一用「册」：部分可读与全开都不出现「篇」", () => {
    const report = {
      ...findReport("report-published"),
      openVolumeIds: ["V1", "V2", "V3"],
    } as TalentReportRecord;
    expect(
      buildTalentClientReportOverview({
        report,
        subject: { subjectType: "child", name: "x", gender: "female", birthday: "2016-09-08" },
      }).report.volumeHeaderText,
    ).toBe("共 6 册 · 3 册可读");
    const fullyOpen = {
      ...findReport("report-published"),
      openVolumeIds: ["V1", "V2", "V3", "V4", "V5", "V6"],
    } as TalentReportRecord;
    expect(buildTalentClientVolumeHeaderText(fullyOpen.openVolumeIds?.length ?? 0)).toBe("6 册");
  });

  it("分册投影：章节分组 / 数据熵排序 / 固定注解 / 相关方向（命中 N/M）/ 册内序号", () => {
    const volume = buildTalentClientVolume(findReport("report-published"), "V1");
    expect(volume).toBeTruthy();
    expect(volume!.volume).toMatchObject({ volumeId: "V1", name: "生长发育", sortOrder: 1, chapterCount: 1, factorCount: 2 });
    expect(volume!.chapters).toEqual([
      { chapter: "生长发育概述", factorIndexes: [0, 1] },
    ]);
    expect(volume!.entropyOptions).toEqual([
      { name: "卓越", count: 1 },
      { name: "优秀", count: 1 },
    ]);
    expect(volume!.factors[0]).toMatchObject({
      index: 0,
      name: "体格生长潜质",
      levelName: "优秀",
      note: "固定注解 A-01",
      condition: "",
    });
    expect(volume!.factors[0]!.relatedDirections).toEqual([
      { directionId: "dir-1", name: "舞蹈家", hitCount: 2, total: 3 },
    ]);
    expect(volume!.factors[1]).toMatchObject({ index: 1, condition: "3–6 岁" });
    // 未达成命中的方向不进相关方向。
    const volume2 = buildTalentClientVolume(findReport("report-published"), "V2");
    expect(volume2!.factors[0]!.relatedDirections).toEqual([]);
    const text = JSON.stringify(volume);
    expect(text).not.toMatch(/"code":/);
  });

  it("单册 state：open=true 且已检测 → readable；已检测未开放 → not_open；未检测 → not_detected", () => {
    const report = findReport("report-published");
    expect(resolveTalentClientVolumeState(report, "V1")).toBe("readable");
    expect(resolveTalentClientVolumeState(report, "V3")).toBe("not_open");
    expect(resolveTalentClientVolumeState(report, "V5")).toBe("not_detected");
  });

  it("要素解读：本册内循环上一项 / 下一项；未开放册 / 不存在返回 null", () => {
    const report = findReport("report-published");
    const first = buildTalentClientFactor(report, "A-01");
    expect(first).toMatchObject({ prevIndex: 1, nextIndex: 1 });
    expect(first!.factor.name).toBe("体格生长潜质");
    const second = buildTalentClientFactor(report, "A-02");
    expect(second).toMatchObject({ prevIndex: 0, nextIndex: 0 });
    expect(buildTalentClientFactor(report, "C-01")).toBeNull();
    expect(buildTalentClientFactor(report, "Z-99")).toBeNull();
  });

  it("报告列表：本人 + 子女各一行，开放册与可读计数不依赖 volumeSnapshot 全量", async () => {
    const pb = new MemoryPocketBase();
    pb.seed("talent_parents", buildParentRecord());
    pb.seed("talent_children", buildChildRecord());
    pb.seed("talent_children", buildChildRecord({ id: "child-2", name: "演示子女二", birthday: "2019-05-20", query: "not_found", queryReason: "info_mismatch" }));
    for (const report of REPORTS) pb.seed("talent_reports", report);
    const list = await loadTalentClientReportList(asPocketBase(pb), "user-1", {
      now: new Date("2026-11-17T00:00:00.000Z"),
    });
    expect(list.items).toHaveLength(3);
    const childRow = list.items.find((item) => item.subjectId === "child-1")!;
    expect(childRow).toMatchObject({
      reportId: "report-published",
      reportStatus: "published",
      readableVolumeCount: 2,
      totalVolumeCount: 6,
      adviceCount: 0,
    });
    expect(childRow.openVolumeIds).toEqual(["V1", "V2"]);
    expect(childRow.openVolumes.map((volume) => volume.name)).toEqual(["生长发育", "智商"]);
    const pendingRow = list.items.find((item) => item.subjectId === "child-2")!;
    expect(pendingRow.reportStatus).toBe("pending_publish");
    expect(pendingRow.readableVolumeCount).toBe(0);
    const selfRow = list.items.find((item) => item.subjectType === "self")!;
    expect(selfRow).toMatchObject({ reportId: "", reportStatus: "none", statusText: "该对象暂无基因报告" });
    expectNoSensitiveKeys(list);
  });
});

// ── 4. 方向 / 选择投影 ─────────────────────────────────────────────────────

describe("培养方向：推荐上限 / 已选 / 自填 / 选择结果投影", () => {
  it("推荐按快照命中排序（只给命中项），已选与档位装饰来自快照 + 当前配置", () => {
    const directions = buildTalentClientDirections({
      report: findReport("report-published"),
      config: DIRECTION_CONFIG,
    });
    expect(directions).toMatchObject({
      reportId: "report-published",
      snapshotVersion: 1,
      recommendLimit: 5,
      selectionLimit: 3,
      selectionCount: 1,
      fallback: false,
      emptyReason: null,
      manualLimit: 10,
    });
    expect(directions.items.map((item) => item.directionId)).toEqual(["dir-1"]);
    const item = directions.items[0]!;
    expect(item).toMatchObject({
      name: "舞蹈家",
      description: "以肢体协调、节奏感与表现力为核心。",
      icon: "舞",
      hitCount: 2,
      total: 3,
      selected: true,
      selectedTierId: "tier-2",
      defaultTierId: "tier-1",
      selectable: true,
      fallback: false,
    });
    expect(item.tiers.map((tier) => [tier.tierId, tier.name, tier.default])).toEqual([
      ["tier-1", "启蒙", true],
      ["tier-2", "精进", false],
    ]);
    expect(item.requirements).toEqual([
      { factorName: "体格生长潜质", needLevelName: "优秀", actualLevelName: "优秀", met: true, gap: 0 },
      { factorName: "体形发育潜质", needLevelName: "卓越", actualLevelName: "卓越", met: true, gap: 0 },
      { factorName: "逻辑推理潜质", needLevelName: "卓越", actualLevelName: "优秀", met: false, gap: 1 },
    ]);
    expect(directions.selections).toEqual([
      expect.objectContaining({ selectionId: "dir-1", directionId: "dir-1", custom: false, tierName: "精进" }),
    ]);
    expect(directions.manualOptions).toEqual([
      { directionId: "dir-2", name: "逻辑思维" },
      { directionId: "dir-1", name: "舞蹈家" },
    ]);
    expect(directions.emptyReason).toBeNull();
    // 不返回编码 / 要素编码（BR-12）。
    const text = JSON.stringify(directions);
    expect(text).not.toMatch(/DIR-00[0-9]|A-0[0-9]|B-0[0-9]/);
  });

  it("0 命中回退：fallback=true 且每卡标「暂无匹配」", () => {
    const report = {
      ...findReport("report-published"),
      selections: [],
      directionSnapshot: {
        ...DIRECTION_SNAPSHOT,
        directions: DIRECTION_SNAPSHOT.directions.filter((item) => item.hitCount === 0),
      },
    } as TalentReportRecord;
    const directions = buildTalentClientDirections({ report, config: DIRECTION_CONFIG });
    expect(directions.fallback).toBe(true);
    expect(directions.emptyReason).toBeNull();
    expect(directions.items).toHaveLength(1);
    expect(directions.items[0]).toMatchObject({ directionId: "dir-2", fallback: true, selectable: true });
  });

  it("空快照：items=[] + NO_DIRECTIONS，自填候选取 M1 当前启用方向", () => {
    const report = {
      ...findReport("report-published"),
      directionSnapshot: null,
      selections: [],
    } as TalentReportRecord;
    const directions = buildTalentClientDirections({ report, config: DIRECTION_CONFIG });
    expect(directions.items).toEqual([]);
    expect(directions.emptyReason).toBe("NO_DIRECTIONS");
    expect(directions.fallback).toBe(false);
    expect(directions.selectionCount).toBe(0);
    expect(directions.manualOptions).toEqual(DIRECTION_CONFIG.manualOptions);
  });

  it("方向停用后 selectable=false", () => {
    const config: TalentClientDirectionConfig = {
      ...DIRECTION_CONFIG,
      directions: new Map([
        ["dir-1", { ...DIRECTION_CONFIG.directions.get("dir-1")!, status: "0" }],
      ]),
    };
    const directions = buildTalentClientDirections({
      report: findReport("report-published"),
      config,
    });
    expect(directions.items[0]!.selectable).toBe(false);
  });

  it("选择结果投影：selectionId = 正式方向 id / 自定义 requestId", () => {
    const formal = buildTalentClientSelectionResponse({
      reportId: "report-published",
      reportNo: "R202611160001",
      selection: SELECTIONS[0],
      selections: SELECTIONS,
      selectionCount: 1,
      selectionLimit: 3,
      changed: true,
      alreadySelected: false,
      requestId: "",
    });
    expect(formal.selection).toMatchObject({ selectionId: "dir-1", directionId: "dir-1" });
    expect(formal).toMatchObject({ selectionCount: 1, selectionLimit: 3, changed: true, alreadySelected: false });
    expect(JSON.stringify(formal)).not.toMatch(/R202611160001/);
    const custom = buildTalentClientSelectionResponse({
      reportId: "report-published",
      reportNo: "R202611160001",
      selections: [{
        directionId: "",
        requestId: "request-1",
        custom: true,
        tierId: "tier-1",
        directionName: "",
        tierName: "启蒙",
        teacher: "",
        freq: "",
        manualName: "冰球",
        selectedAt: "2026-11-16T12:00:00.000Z",
      }],
      selectionCount: 1,
      selectionLimit: 3,
      changed: true,
      alreadySelected: false,
      requestId: "request-1",
    });
    expect(custom.selections[0]).toMatchObject({ selectionId: "request-1", custom: true, manualName: "冰球" });
  });
});

// ── 4.1 选择写动作：C 端档位前置校验（spec §10.4 422）与成功写入 ─────────────

describe("选择写动作：档位 422 前置校验 + 复用 M4 成功写入", () => {
  function seedSelectionBase(pb: MemoryPocketBase) {
    pb.seed("talent_parents", buildParentRecord());
    pb.seed("talent_children", buildChildRecord());
    for (const report of REPORTS) pb.seed("talent_reports", report);
    pb.seed("talent_tiers", { id: "tier-1", code: "T1", name: "启蒙", sortOrder: 1, teacher: "普通老师", freq: "每周 1–2 次", headline: "", description: "", status: "1", isDefault: true });
    pb.seed("talent_tiers", { id: "tier-2", code: "T2", name: "精进", sortOrder: 2, teacher: "卓越老师", freq: "每周 2–3 次", headline: "", description: "", status: "1", isDefault: false });
    pb.seed("talent_directions", {
      id: "dir-1",
      code: "DIR-001",
      name: "舞蹈家",
      description: "以肢体协调、节奏感与表现力为核心。",
      icon: "舞",
      status: "1",
      version: 1,
      requirements: [],
      tierIds: ["tier-1", "tier-2"],
      defaultTierId: "tier-1",
    });
    pb.seed("talent_directions", {
      id: "dir-2",
      code: "DIR-003",
      name: "逻辑思维",
      description: "以数理推理与问题解决为核心。",
      icon: "逻",
      status: "1",
      version: 1,
      requirements: [],
      tierIds: ["tier-1"],
      defaultTierId: "tier-1",
    });
  }

  it("正式方向非法档位 → 422 INVALID_TIER；自填非法档位 → 422 TIER_UNAVAILABLE", async () => {
    const pb = new MemoryPocketBase();
    seedSelectionBase(pb);
    await expect(
      mutateTalentClientSelection({
        pb: asPocketBase(pb),
        userId: "user-1",
        action: "select",
        reportId: "report-published",
        directionId: "dir-1",
        tierId: "tier-not-enabled",
      }),
    ).rejects.toMatchObject({ statusCode: 422, data: { code: "INVALID_TIER" } });
    await expect(
      mutateTalentClientSelection({
        pb: asPocketBase(pb),
        userId: "user-1",
        action: "select",
        reportId: "report-published",
        manualName: "冰球",
        tierId: "tier-not-enabled",
      }),
    ).rejects.toMatchObject({ statusCode: 422, data: { code: "TIER_UNAVAILABLE" } });
  });

  it("合法正式方向选择 → 写入 selections 并返回计数（复用 M4 + M3 版本）", async () => {
    const pb = new MemoryPocketBase();
    seedSelectionBase(pb);
    const result = await mutateTalentClientSelection({
      pb: asPocketBase(pb),
      userId: "user-1",
      userName: "演示家长",
      action: "select",
      reportId: "report-published",
      directionId: "dir-2",
      tierId: "tier-1",
    });
    expect(result.changed).toBe(true);
    expect(result.selectionCount).toBe(2);
    expect(result.selection?.tierId).toBe("tier-1");
    expect(result.selections.some((item) => item.directionId === "dir-2" && item.tierId === "tier-1")).toBe(true);
    // 换档：同档位幂等 changed=false；换到另一档位 changed=true。
    const same = await mutateTalentClientSelection({
      pb: asPocketBase(pb),
      userId: "user-1",
      action: "changeTier",
      reportId: "report-published",
      selectionId: "dir-2",
      tierId: "tier-1",
    });
    expect(same.changed).toBe(false);
    // 取消：幂等递减。
    const cancelled = await mutateTalentClientSelection({
      pb: asPocketBase(pb),
      userId: "user-1",
      action: "cancel",
      reportId: "report-published",
      selectionId: "dir-2",
    });
    expect(cancelled.changed).toBe(true);
    const again = await mutateTalentClientSelection({
      pb: asPocketBase(pb),
      userId: "user-1",
      action: "cancel",
      reportId: "report-published",
      selectionId: "dir-2",
    });
    expect(again.changed).toBe(false);
  });
});

// ── 5. 建议可见性投影 ───────────────────────────────────────────────────────

describe("培育建议：M5 可见性投影 + entropyList 展示别名", () => {
  it("available=false 原样透传空态文案（不提示撤回原因）", () => {
    const advice = buildTalentClientAdvice({ available: false, emptyText: "暂未收到培育建议" });
    expect(advice).toEqual({ available: false, emptyText: "暂未收到培育建议" });
  });

  it("available=true：分册四段 + entropyList 同时含 level/name 且无非展示字段", () => {
    const advice = buildTalentClientAdvice({
      available: true,
      version: { versionNo: "V1", cycle: "2026-11", effectiveAt: "2026-11-16", nextUpdateAt: "2027-03-16", cycleMonths: 4 },
      owner: { name: "演示子女一", gender: "female", genderLabel: "女", age: 10, ageLabel: "10 岁" },
      emptyText: "暂未收到培育建议",
      books: [
        {
          book: "A",
          bookName: "生长发育",
          state: "available",
          adviceNo: "ADV-202611160001-A",
          sectionCount: 2,
          total: 3,
          entropyList: [
            { level: "卓越", count: 1 },
            { level: "优秀", count: 1 },
          ],
          sections: [
            { chapter: "生长发育概述", factor: "体格生长潜质", entropy: "优秀", content: "分级内容", example: "分级举例", direction: "培育方向", suggestion: "培育建议" },
          ],
        },
      ],
    } as never);
    expect(advice.available).toBe(true);
    if (!advice.available) throw new Error("expected available");
    expect(advice.books).toHaveLength(1);
    expect(advice.books[0]!.state).toBe("available");
    expect(advice.books[0]!.entropyList).toEqual([
      { level: "卓越", name: "卓越", count: 1 },
      { level: "优秀", name: "优秀", count: 1 },
    ]);
    expect(advice.books[0]!.sections[0]).toMatchObject({ factor: "体格生长潜质", content: "分级内容", suggestion: "培育建议" });
    expect(advice.version.cycleMonths).toBe(4);
    expect(JSON.stringify(advice)).not.toMatch(/versionId|publishStatus|syncedAt|reportNo|matchKey/);
  });
});

// ── 6. 家长资料 / 孩子（内存 PB + M2 服务层复用） ─────────────────────────────

describe("家长资料 / 孩子：脱敏、归属 404、冲突 409", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY =
      process.env.ENCRYPTION_KEY || "test-encryption-key-32-characters-long";
    process.env.TALENT_GENE_QUERY_MOCK_MODE = "pending";
  });
  afterAll(() => {
    delete process.env.TALENT_GENE_QUERY_MOCK_MODE;
    setTalentMemberQueryPBProvider(null);
  });

  it("资料合并：手机号 / 身份证只给脱敏，无 cipher / hash", () => {
    const parent = buildParentRecord();
    const profile = buildTalentClientProfile(
      { id: "user-1", nickname: "演示昵称", avatar: "" },
      sanitizeTalentParentRecord(parent),
    );
    expect(profile).toMatchObject({
      id: "parent-1",
      userId: "user-1",
      nickname: "演示昵称",
      name: "演示家长",
      maskedMobile: "1380****0001",
      maskedIdNo: "1101**********1234",
      hasIdNo: true,
      genderLabel: "女",
    });
    expectNoSensitiveKeys(profile);
  });

  it("孩子行：周岁 / 查询归因文案 / 报告数；无 cipher / 明文证件", async () => {
    const item = buildTalentClientChildItem(
      {
        id: "child-2",
        name: "演示子女二",
        gender: "male",
        genderLabel: "男",
        birthday: "2019-05-20",
        relation: "mother",
        relationLabel: "母亲",
        maskedIdNo: "1101**********1234",
        query: "not_found",
        queryLabel: "未查到",
        queryReason: "info_mismatch",
        queryReasonLabel: "信息不一致",
        queryAt: "",
        queryAttempts: 1,
        status: "1",
        statusLabel: "正常",
        createdAt: "",
        updatedAt: "",
      },
      2,
      new Date("2026-11-17T00:00:00.000Z"),
    );
    expect(item).toMatchObject({
      age: 7,
      ageLabel: "7 岁",
      query: "not_found",
      queryReason: "info_mismatch",
      queryReasonLabel: "信息不一致",
      reportCount: 2,
    });
    expectNoSensitiveKeys(item);

    const pb = new MemoryPocketBase();
    pb.seed("talent_parents", buildParentRecord());
    pb.seed("talent_children", buildChildRecord());
    pb.seed("talent_children", buildChildRecord({ id: "child-2", status: "2", parentId: "" }));
    const children = await loadTalentClientChildren(
      asPocketBase(pb),
      buildParentRecord(),
    );
    // 解绑子女（status="2"）不返回。
    expect(children.items).toHaveLength(1);
    expect(children.items[0]).toMatchObject({ id: "child-1", query: "found", reportCount: 0 });
    expectNoSensitiveKeys(children);
  });

  it("新增孩子：复用 M2 建档 + 自动查询；重复身份证 409 CHILD_IDNO_EXISTS", async () => {
    const pb = new MemoryPocketBase();
    pb.seed("talent_parents", buildParentRecord());
    setTalentMemberQueryPBProvider(() => asPocketBase(pb));
    const child = await createTalentClientChild({
      pb: asPocketBase(pb),
      parent: buildParentRecord(),
      body: {
        name: "演示子女三",
        gender: "male",
        relation: "father",
        birthday: "2020-01-01",
        idNo: "110101202001011234",
      },
      actor: { userId: "user-1" },
    });
    expect(child).toMatchObject({ name: "演示子女三", query: "querying", reportCount: 0 });
    expectNoSensitiveKeys(child);

    // 身份证重复：编辑孩子指向另一档案的证件号 → 409 CHILD_IDNO_EXISTS（M2 服务层冲突归一）。
    pb.seed("talent_children", buildChildRecord({ id: "child-9", name: "另一孩子", idNoCipher: encryptTalentSensitive("110101201709081234"), idNoHash: hashTalentMemberIdNo("110101201709081234"), maskedIdNo: maskTalentIdNo("110101201709081234") }));
    await expect(
      updateTalentClientChild({
        pb: asPocketBase(pb),
        userId: "user-1",
        childId: "child-9",
        body: { idNo: "110101202001011234", birthday: "2020-01-01" },
      }),
    ).rejects.toMatchObject({ statusCode: 409, data: { code: "CHILD_IDNO_EXISTS" } });
  });

  it("编辑孩子：归属越权 404；仅改关系不触发重查", async () => {
    const pb = new MemoryPocketBase();
    pb.seed("talent_parents", buildParentRecord());
    pb.seed("talent_children", buildChildRecord());
    pb.seed("talent_children", buildChildRecord({ id: "child-other", parentId: "parent-other" }));
    setTalentMemberQueryPBProvider(() => asPocketBase(pb));
    const updated = await updateTalentClientChild({
      pb: asPocketBase(pb),
      userId: "user-1",
      childId: "child-1",
      body: { relation: "father" },
      actor: { userId: "user-1" },
    });
    expect(updated).toMatchObject({ id: "child-1", relation: "father", relationLabel: "父亲", query: "found" });
    await expect(
      updateTalentClientChild({
        pb: asPocketBase(pb),
        userId: "user-1",
        childId: "child-other",
        body: { relation: "father" },
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      updateTalentClientChild({
        pb: asPocketBase(pb),
        userId: "user-1",
        childId: "child-missing",
        body: { relation: "father" },
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── 7. 报告归属 / 状态门禁 ───────────────────────────────────────────────────

describe("报告访问门禁：越权 / 解绑 / 停用 404；未发布 / 撤回 409 + state", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY =
      process.env.ENCRYPTION_KEY || "test-encryption-key-32-characters-long";
  });

  function seedBase(pb: MemoryPocketBase) {
    pb.seed("talent_parents", buildParentRecord());
    pb.seed("talent_children", buildChildRecord());
    pb.seed(
      "talent_children",
      buildChildRecord({
        id: "child-2",
        name: "演示子女二",
        birthday: "2019-05-20",
        query: "not_found",
        queryReason: "info_mismatch",
      }),
    );
    for (const report of REPORTS) pb.seed("talent_reports", report);
  }

  it("已发布 + 归属正常 → 通过", async () => {
    const pb = new MemoryPocketBase();
    seedBase(pb);
    const { report } = await assertTalentClientReportAccess(
      asPocketBase(pb),
      "user-1",
      "report-published",
    );
    expect(report.id).toBe("report-published");
  });

  it("待发布 / 已撤回 → 409 + code/state；不存在 / 越权 → 404 统一文案", async () => {
    const pb = new MemoryPocketBase();
    seedBase(pb);
    await expect(
      assertTalentClientReportAccess(asPocketBase(pb), "user-1", "report-pending"),
    ).rejects.toMatchObject({ statusCode: 409, data: { code: "report_pending", state: "pending_publish" } });
    const retracted = { ...findReport("report-published"), id: "report-retracted", status: "retracted" } as TalentReportRecord;
    pb.seed("talent_reports", retracted);
    await expect(
      assertTalentClientReportAccess(asPocketBase(pb), "user-1", "report-retracted"),
    ).rejects.toMatchObject({ statusCode: 409, data: { code: "report_retracted", state: "retracted" } });
    await expect(
      assertTalentClientReportAccess(asPocketBase(pb), "user-1", "report-missing"),
    ).rejects.toMatchObject({ statusCode: 404, message: "内容不可查看" });
    await expect(
      assertTalentClientReportAccess(asPocketBase(pb), "user-1", "report-other"),
    ).rejects.toMatchObject({ statusCode: 404, message: "内容不可查看" });
  });

  it("家长停用 / 未绑定 / 子女解绑 → 404", async () => {
    const disabledPb = new MemoryPocketBase();
    disabledPb.seed("talent_parents", buildParentRecord({ status: "0" }));
    await expect(
      assertTalentClientReportAccess(asPocketBase(disabledPb), "user-1", "report-published"),
    ).rejects.toMatchObject({ statusCode: 404 });

    const unboundPb = new MemoryPocketBase();
    unboundPb.seed("talent_parents", buildParentRecord({ userId: "" }));
    await expect(
      assertTalentClientReportAccess(asPocketBase(unboundPb), "user-1", "report-published"),
    ).rejects.toMatchObject({ statusCode: 404 });

    const unboundChildPb = new MemoryPocketBase();
    unboundChildPb.seed("talent_parents", buildParentRecord());
    unboundChildPb.seed("talent_children", buildChildRecord({ status: "2", parentId: "" }));
    for (const report of REPORTS) unboundChildPb.seed("talent_reports", report);
    await expect(
      assertTalentClientReportAccess(asPocketBase(unboundChildPb), "user-1", "report-published"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("冻结守卫错误归一：404 统一文案，409 保留 code/state", () => {
    expect(() =>
      normalizeTalentClientGuardError({ statusCode: 404, message: "报告不存在", data: { code: "NOT_FOUND" } }),
    ).toThrowError(/内容不可查看/);
    try {
      normalizeTalentClientGuardError({ statusCode: 409, message: "报告正在整理中", data: { code: "report_pending", state: "pending_publish" } });
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 409, data: { code: "report_pending", state: "pending_publish" } });
    }
  });

  it("统一错误助手：404 不泄露存在性 / 409 / 422 带业务码", () => {
    expect(notFoundTalentClient()).toMatchObject({ statusCode: 404, message: "内容不可查看" });
    expect(notFoundTalentClientVolume()).toMatchObject({ statusCode: 404, data: { code: "VOLUME_NOT_FOUND" } });
    expect(conflictTalentClient("已选择", "DUPLICATE_SELECTION")).toMatchObject({ statusCode: 409, data: { code: "DUPLICATE_SELECTION" } });
    expect(invalidTalentClient("档位不合法", "INVALID_TIER")).toMatchObject({ statusCode: 422, data: { code: "INVALID_TIER" } });
  });

  it("Zod 校验失败统一 422 + VALIDATION_ERROR（不弹笼统 toast 的字段级信息）", async () => {
    const event = { body: { name: "" } };
    await expect(
      validateTalentClientBody(event, {
        safeParse: () => ({ success: false, error: { issues: [{ message: "请填写姓名" }] } }),
      } as never),
    ).rejects.toMatchObject({ statusCode: 422, data: { code: "VALIDATION_ERROR" } });
  });
});