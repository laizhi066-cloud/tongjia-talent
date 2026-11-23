/**
 * @description M5-B 培育建议域 API 路由级测试：spec §5.2 的 9 条后台路由清单与权限码映射、
 *   静态段优先（`versions` / `subject` / `export` 不被 `[id]` 吞掉）、无编辑 / 删除 / 版本回切 /
 *   C 端路由、5 个权限码 ↔ C/F 菜单行与「培育建议」C 菜单、
 *   列表 15 列 / 5 项检索 AND / `versionId` 版本只读视图 / 分页、建议书详情按分册四段、
 *   版本历史聚合统计、按人历史、M3 报告详情第 4 页签挂载数据、CSV 导出（表头 / BOM / 上限 / 版本视图）、
 *   接收新一版 preview 零写入 + commit 状态机、发布 / 撤回状态迁移与重复动作 409、历史版本只读 409、
 *   「回到当前生效版」纯读（无写接口、无数据变化）、响应无 `idNoHash` / 明文 / `sections` 到列表、审计摘要无正文。
 *   不连接真实 PocketBase（内存假实现，数据全部虚构）；对应 spec §5 / §11 #3。
 * @file test/talent-advice-api.test.ts
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  FOUNDATION_ACTION_MENU_DEFS,
  FOUNDATION_RBAC_PERMISSION_CODES,
} from "../scripts/setup.mjs";
import type {
  TalentAdviceDocRecord,
  TalentAdviceMatchResult,
  TalentAdviceRawSection,
  TalentAdviceSource,
  TalentAdviceSyncCandidate,
  TalentAdviceSyncLogInput,
  TalentAdviceVersionRecord,
} from "~~/shared/types/talent-advice";
import type { TalentChildRecord, TalentParentRecord } from "~~/shared/types/talent-member";
import type { TalentGeneReportRecord, TalentReportRecord } from "~~/shared/types/talent-report";
import { hashTalentMemberIdNo } from "~~/server/utils/talent-member-crypto";
import {
  TALENT_ADVICE_ADMIN_ROUTES,
  TALENT_ADVICE_DEFAULT_PAGE_SIZE,
  TALENT_ADVICE_EXPORT_HEADERS,
  TALENT_ADVICE_EXPORT_MAX_ROWS,
  TALENT_ADVICE_PERMISSION_CODES,
  TALENT_ADVICE_STATIC_SEGMENTS,
  assertTalentAdviceDetailSegment,
  assertTalentAdviceExportSize,
  buildTalentAdviceExportCsv,
  exportTalentAdviceCsv,
  listTalentAdviceDocs,
  loadTalentAdviceSubjectAdvice,
  loadTalentAdviceVersionHistory,
  parseTalentAdviceListQuery,
  resolveTalentAdviceRouteAction,
  resolveTalentAdviceRouteId,
  resolveTalentAdviceSubjectQuery,
  talentAdviceDocAuditSummary,
  talentAdviceExportFileName,
  talentAdviceReceiveAuditSummary,
  talentAdviceReceiveSchema,
  talentAdviceRouteSegments,
  talentAdviceWithdrawSchema,
} from "~~/server/utils/talent-advice-api";
import {
  getTalentAdviceDocDetail,
  listTalentAdvicePersonHistory,
  previewTalentAdviceVersion,
  publishTalentAdviceDoc,
  receiveTalentAdviceVersion,
  withdrawTalentAdviceDoc,
  type TalentAdviceRecordData,
  type TalentAdviceStore,
} from "~~/server/utils/talent-advice";

const ROOT = resolve(import.meta.dirname, "..");
const TALENT_API_DIR = resolve(ROOT, "server/api/admin/talent");
const ADVICE_DIR = resolve(TALENT_API_DIR, "advice");
const AT = "2026-11-17T10:00:00.000Z";
const TEST_ENCRYPTION_KEY = "test-encryption-key-0123456789abcdef";
const ID_NO_PLAIN = "110101201809081234";
const MASKED_ID_NO = "1101**********1234";
let previousEncryptionKey: string | undefined;

beforeAll(() => {
  previousEncryptionKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
});
afterAll(() => {
  if (previousEncryptionKey === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = previousEncryptionKey;
});

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function readRoute(file: string): string {
  return read(`server/api/admin/talent/${file}`);
}

/** 递归收集 advice 域路由文件。 */
function collectAdviceRouteFiles(): string[] {
  const files: string[] = [];
  const walk = (absolute: string, relative: string) => {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const nextRelative = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(resolve(absolute, entry.name), nextRelative);
      else if (entry.name.endsWith(".ts")) files.push(nextRelative);
    }
  };
  walk(ADVICE_DIR, "advice");
  return files.sort();
}

/** 递归扫描响应键名，确认没有 cipher / hash / sections 字段。 */
function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

function expectNoSensitiveKeys(value: unknown): void {
  const keys = collectKeys(value);
  for (const key of keys) expect(key).not.toMatch(/Cipher|Hash/i);
  const text = JSON.stringify(value);
  expect(text).not.toContain(ID_NO_PLAIN);
}

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

// ── 虚构夹具：版本 / 建议 / 报告 / 会员 / 候选 ─────────────────────────────

function makeVersion(
  id: string,
  versionNo: string,
  status: "active" | "archived",
  effectiveAt: string,
): TalentAdviceVersionRecord {
  const [year = "2026", month = "11", day = "12"] = effectiveAt.split("-");
  const nextMonth = (Number(month) + 4 - 1) % 12 + 1;
  const nextYear = Number(month) + 4 > 12 ? Number(year) + 1 : Number(year);
  return {
    id,
    created: AT,
    updated: AT,
    versionNo,
    status,
    cycle: `${year}-${month} ~ ${nextYear}-${String(nextMonth).padStart(2, "0")}`,
    effectiveAt: `${year}-${month}-${day}`,
    nextUpdateAt: `${nextYear}-${String(nextMonth).padStart(2, "0")}-${day}`,
    syncedAt: `${effectiveAt}T09:20:00.000Z`,
    source: "mock",
    note: `版本 ${versionNo}`,
    operatorId: "user_admin",
    operatorName: "系统同步",
  };
}

function makeSections(books = "AB"): TalentAdviceRawSection[] {
  return [...books].flatMap((book) => [
    {
      book,
      factor: book === "A" ? "运动协调" : "语言表达",
      entropy: book === "A" ? "优秀" : "常态",
      chapter: "1.1 生长发育概述",
      content: "该项潜质发展良好，基础条件较为扎实。",
      example: "多数情境下能稳定完成对应任务。",
      direction: "在现有基础上逐步增加任务复杂度。",
      suggestion: "保持规律接触与练习节奏。",
      variant: 1,
    },
    {
      book,
      factor: book === "A" ? "专注力" : "空间想象",
      entropy: "优良",
      chapter: "1.2 专项说明",
      content: "第二项正文。",
      example: "第二项举例。",
      direction: "第二项方向。",
      suggestion: "第二项建议。",
      variant: 1,
    },
  ]);
}

function makeDoc(
  overrides: Partial<TalentAdviceDocRecord> & Pick<TalentAdviceDocRecord, "id" | "adviceNo">,
): TalentAdviceDocRecord {
  const age = overrides.age ?? 8;
  const birthday = overrides.birthday ?? "2018-09-08";
  const sections = overrides.sections ?? (makeSections("AB") as never);
  return {
    id: overrides.id,
    created: AT,
    updated: AT,
    adviceNo: overrides.adviceNo,
    geneReportId: overrides.geneReportId ?? "gene_1",
    reportId: overrides.reportId ?? "report_1",
    reportNo: overrides.reportNo ?? "GR202611160001",
    subjectType: overrides.subjectType ?? "child",
    subjectId: overrides.subjectId ?? "child_1",
    parentId: overrides.parentId ?? "parent_1",
    name: overrides.name ?? "陈小示",
    maskedIdNo: overrides.maskedIdNo ?? MASKED_ID_NO,
    idNoHash: overrides.idNoHash ?? hashTalentMemberIdNo(ID_NO_PLAIN),
    gender: overrides.gender ?? "male",
    birthday,
    age,
    matchKey: overrides.matchKey ?? `陈小示｜${age} 岁`,
    versionId: overrides.versionId ?? "version_active",
    versionName: overrides.versionName ?? "V2026.11",
    publishStatus: overrides.publishStatus ?? "published",
    publishedAt: overrides.publishedAt ?? "2026-11-12T09:20:00.000Z",
    withdrawnAt: overrides.withdrawnAt ?? "",
    syncedAt: overrides.syncedAt ?? "2026-11-12T09:20:00.000Z",
    source: overrides.source ?? "mock",
    books: overrides.books ?? "AB",
    sections,
    sectionCount: overrides.sectionCount ?? sections.length,
    bookCount: overrides.bookCount ?? 2,
    entropyCounts: overrides.entropyCounts ?? { 优秀: 2, 优良: 2 },
    firstFactorName: overrides.firstFactorName ?? "运动协调",
  } as TalentAdviceDocRecord;
}

function makeParent(overrides: Partial<TalentParentRecord> = {}): TalentParentRecord {
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
    maskedMobile: "1380****0001",
    ...overrides,
  } as TalentParentRecord;
}

function makeChild(overrides: Partial<TalentChildRecord> = {}): TalentChildRecord {
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
    maskedIdNo: MASKED_ID_NO,
    ...overrides,
  } as TalentChildRecord;
}

function makeReport(
  id: string,
  overrides: Partial<TalentReportRecord> = {},
): TalentReportRecord {
  return {
    id,
    created: AT,
    updated: AT,
    reportNo: "GR202611160001",
    reportType: "gene_report",
    title: "陈小示·基因报告",
    status: "published",
    subjectType: "child",
    subjectId: "child_1",
    parentId: "parent_1",
    geneReportId: "gene_1",
    ...overrides,
  } as TalentReportRecord;
}

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
    reportNo: "GR202611160001",
    name: "陈小示",
    gender: "male",
    birthday: "2018-09-08",
    maskedIdNo: MASKED_ID_NO,
    idNoHash: hashTalentMemberIdNo(ID_NO_PLAIN),
    books: "AB",
    sections: [],
    sectionCount: 0,
    status: "synced",
    syncedAt: AT,
    source: "mock",
    ...overrides,
  } as TalentGeneReportRecord;
}

function makeCandidate(
  id: string,
  overrides: { geneReport?: Partial<TalentGeneReportRecord>; report?: Partial<TalentReportRecord> | null } = {},
): TalentAdviceSyncCandidate {
  const geneReport = makeGeneReport(id, overrides.geneReport);
  const report =
    overrides.report === null
      ? null
      : makeReport(`report_${id}`, { geneReportId: geneReport.id, ...overrides.report });
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
    idNoHash: geneReport.idNoHash,
  } as TalentAdviceSyncCandidate;
}

function foundSource(sections: TalentAdviceRawSection[] = makeSections("AB")): TalentAdviceSource {
  return { name: "mock", async match(): Promise<TalentAdviceMatchResult> {
    return { found: true, sections };
  } };
}

// ── 内存数据层（实现 TalentAdviceStore；可记录写调用与列表读模型调用） ──────

class FakeAdviceStore implements TalentAdviceStore {
  versions: TalentAdviceVersionRecord[];
  docs: TalentAdviceDocRecord[];
  candidates: TalentAdviceSyncCandidate[] = [];
  reports = new Map<string, TalentReportRecord>();
  parents = new Map<string, TalentParentRecord>();
  children = new Map<string, TalentChildRecord>();
  logs: TalentAdviceSyncLogInput[] = [];
  writes = 0;
  listModelCalls = 0;
  private seq = 0;

  constructor(options: {
    versions?: TalentAdviceVersionRecord[];
    docs?: TalentAdviceDocRecord[];
    candidates?: TalentAdviceSyncCandidate[];
    reports?: TalentReportRecord[];
    parents?: TalentParentRecord[];
    children?: TalentChildRecord[];
  } = {}) {
    this.versions = options.versions ?? [];
    this.docs = options.docs ?? [];
    this.candidates = options.candidates ?? [];
    for (const report of options.reports ?? []) this.reports.set(report.id, report);
    for (const parent of options.parents ?? []) this.parents.set(parent.id, parent);
    for (const child of options.children ?? []) this.children.set(child.id, child);
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq}`;
  }

  async listCandidates() {
    return this.candidates;
  }
  async listVersions() {
    return [...this.versions].sort((left, right) =>
      String(right.effectiveAt).localeCompare(String(left.effectiveAt)),
    );
  }
  async getVersionById(id: string) {
    return this.versions.find((version) => version.id === id) ?? null;
  }
  async getVersionByNo(versionNo: string) {
    return this.versions.find((version) => version.versionNo === versionNo) ?? null;
  }
  async createVersion(data: TalentAdviceRecordData) {
    this.writes += 1;
    const record = { id: this.nextId("version"), created: AT, updated: AT, ...data } as unknown as TalentAdviceVersionRecord;
    this.versions.push(record);
    return record;
  }
  async updateVersion(id: string, data: TalentAdviceRecordData) {
    this.writes += 1;
    const record = this.versions.find((version) => version.id === id);
    if (!record) throw new Error("版本不存在");
    Object.assign(record, data);
    return record;
  }
  async deleteVersion(id: string) {
    this.writes += 1;
    this.versions = this.versions.filter((version) => version.id !== id);
  }
  async createDoc(data: TalentAdviceRecordData) {
    this.writes += 1;
    const record = { id: this.nextId("doc"), created: AT, updated: AT, sections: [], ...data } as unknown as TalentAdviceDocRecord;
    this.docs.push(record);
    return record;
  }
  async updateDoc(id: string, data: TalentAdviceRecordData) {
    this.writes += 1;
    const record = this.docs.find((doc) => doc.id === id);
    if (!record) throw new Error("建议不存在");
    Object.assign(record, data);
    return record;
  }
  async deleteDoc(id: string) {
    this.writes += 1;
    this.docs = this.docs.filter((doc) => doc.id !== id);
  }
  async getDocById(id: string) {
    return this.docs.find((doc) => doc.id === id) ?? null;
  }
  async listDocsByVersion(versionId: string) {
    return this.docs.filter((doc) => doc.versionId === versionId);
  }
  /** 列表读模型：模拟 PB `fields`（不返回 sections），并记录调用次数。 */
  async listDocRowsByVersion(versionId: string) {
    this.listModelCalls += 1;
    return this.docs
      .filter((doc) => doc.versionId === versionId)
      .map((doc) => {
        const { sections: _sections, ...rest } = doc;
        return rest as TalentAdviceDocRecord;
      });
  }
  async listDocsByReportNo(reportNo: string) {
    return this.docs
      .filter((doc) => doc.reportNo === reportNo)
      .sort((left, right) => String(right.syncedAt).localeCompare(String(left.syncedAt)));
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
    return [...this.parents.values()].find((parent) => parent.userId === userId) ?? null;
  }
  async getChildById(id: string) {
    return this.children.get(id) ?? null;
  }
  async recordSyncLog(input: TalentAdviceSyncLogInput) {
    this.logs.push(input);
    return `log_${this.logs.length}`;
  }
}

const ACTIVE_VERSION = makeVersion("version_active", "V2026.11", "active", "2026-11-12");
const ARCHIVED_VERSION = makeVersion("version_archived", "V2026.07", "archived", "2026-07-12");

/** 列表夹具：当前版 3 行（8 岁 / 7 岁 / 已撤回）+ 历史版 1 行。 */
function listFixture(): FakeAdviceStore {
  return new FakeAdviceStore({
    versions: [structuredClone(ACTIVE_VERSION), structuredClone(ARCHIVED_VERSION)],
    docs: [
      makeDoc({ id: "doc_1", adviceNo: "AD-GR202611160001-202611", syncedAt: "2026-11-12T09:20:00.000Z" }),
      makeDoc({
        id: "doc_2",
        adviceNo: "AD-GR202611160002-202611",
        name: "示例二",
        reportNo: "GR202611160002",
        geneReportId: "gene_2",
        reportId: "report_2",
        subjectId: "child_2",
        age: 7,
        birthday: "2019-09-08",
        syncedAt: "2026-11-13T09:20:00.000Z",
      } as Partial<TalentAdviceDocRecord> & Pick<TalentAdviceDocRecord, "id" | "adviceNo">),
      makeDoc({
        id: "doc_3",
        adviceNo: "AD-GR202611160003-202611",
        name: "示例三",
        reportNo: "GR202611160003",
        geneReportId: "gene_3",
        reportId: "report_3",
        subjectId: "child_3",
        publishStatus: "withdrawn",
        withdrawnAt: "2026-11-17T10:00:00.000Z",
        syncedAt: "2026-11-11T09:20:00.000Z",
      }),
      makeDoc({
        id: "doc_old",
        adviceNo: "AD-GR202611160001-202607",
        versionId: "version_archived",
        versionName: "V2026.07",
        age: 7,
        birthday: "2019-09-08",
        syncedAt: "2026-07-12T09:20:00.000Z",
      }),
    ],
    reports: [
      makeReport("report_1"),
      makeReport("report_2", { reportNo: "GR202611160002", geneReportId: "gene_2", subjectId: "child_2" }),
      makeReport("report_3", { reportNo: "GR202611160003", geneReportId: "gene_3", subjectId: "child_3", status: "retracted" }),
    ],
    parents: [makeParent()],
    children: [makeChild(), makeChild({ id: "child_2", name: "示例二" }), makeChild({ id: "child_3", name: "示例三" })],
  });
}

// ── 1. 路由清单与权限映射 ─────────────────────────────────────────────────

describe("M5-B 路由清单与权限映射", () => {
  it("9 条 HTTP 端点齐全，advice 静态目录与旧 [resource] 动态路由并存", () => {
    expect(TALENT_ADVICE_ADMIN_ROUTES).toHaveLength(9);
    const endpoints = TALENT_ADVICE_ADMIN_ROUTES.map((route) => `${route.method} ${route.path}`).sort();
    expect(endpoints).toEqual(
      [
        "GET /api/admin/talent/advice",
        "GET /api/admin/talent/advice/:id",
        "GET /api/admin/talent/advice/:id/history",
        "GET /api/admin/talent/advice/export",
        "GET /api/admin/talent/advice/subject",
        "GET /api/admin/talent/advice/versions",
        "POST /api/admin/talent/advice/:id/publish",
        "POST /api/admin/talent/advice/:id/withdraw",
        "POST /api/admin/talent/advice/versions",
      ].sort(),
    );
    // `[id]/` 下的动作按文件聚合（Nitro 路由类型递归上限，与 M3 同一处置）；HTTP 路径不变。
    const expectedFiles = [
      "advice/[id].get.ts",
      "advice/[id]/[action].get.ts",
      "advice/[id]/[action].post.ts",
      "advice/export.get.ts",
      "advice/index.get.ts",
      "advice/subject.get.ts",
      "advice/versions/index.get.ts",
      "advice/versions/index.post.ts",
    ].sort();
    expect(collectAdviceRouteFiles()).toEqual(expectedFiles);
    for (const file of expectedFiles)
      expect(existsSync(resolve(TALENT_API_DIR, file)), file).toBe(true);
    for (const route of TALENT_ADVICE_ADMIN_ROUTES) {
      expect(readRoute(route.file), route.file).toContain("defineEventHandler");
      // 聚合文件必须登记动作键，避免路径存在但动作缺失。
      if (route.action)
        expect(readRoute(route.file), route.file).toContain(`${route.action}:`);
    }
    // M6：旧 `[resource]` 动态路由与旧 `talent-admin.ts` 白名单已删除，advice 只走静态路由。
    expect(existsSync(resolve(TALENT_API_DIR, "[resource].get.ts"))).toBe(false);
    expect(existsSync(resolve(TALENT_API_DIR, "[resource].post.ts"))).toBe(false);
    expect(existsSync(resolve(ROOT, "server/utils/talent-admin.ts"))).toBe(false);
  });

  it("无编辑 / 新建 / 删除 / 版本回切 / C 端建议路由", () => {
    const files = collectAdviceRouteFiles().join("\n");
    expect(files).not.toMatch(/delete|remove|edit|upload|activate|switch|restore-active/i);
    // C 端 `GET /api/client/talent/advice` 归 M7 路由（M7-B 已实现），M5 仍不写 C 端路由文件；
    // 这里只断言「M5 的 admin 路由清单不包含 C 端路径」，C 端文件存在性由 M7-B 测试覆盖。
    expect(files).not.toMatch(/client/);
    expect(existsSync(resolve(ROOT, "server/api/client/talent/advice.get.ts"))).toBe(true);
    expect(existsSync(resolve(ROOT, "server/api/client/talent/advice"))).toBe(false);
    const paths = TALENT_ADVICE_ADMIN_ROUTES.map((route) => route.path).join("\n");
    expect(paths).not.toMatch(/delete|edit|activate|switch|receive/i);
    // 「回到当前生效版」是纯前端清空 versionId，服务端没有切换生效版本的写接口。
    const syncRoutes = TALENT_ADVICE_ADMIN_ROUTES.filter((route) =>
      /active|activate|current/i.test(route.path),
    );
    expect(syncRoutes).toHaveLength(0);
  });

  it("每条端点使用 spec §5.2 权限码；写动作具备 withOperLog / success，preview 不存在", () => {
    const expected: Record<string, string> = {
      "GET /api/admin/talent/advice": "talent:advice:list",
      "GET /api/admin/talent/advice/:id": "talent:advice:view",
      "GET /api/admin/talent/advice/versions": "talent:advice:view",
      "GET /api/admin/talent/advice/:id/history": "talent:advice:view",
      "GET /api/admin/talent/advice/subject": "talent:advice:view",
      "GET /api/admin/talent/advice/export": "talent:advice:export",
      "POST /api/admin/talent/advice/versions": "talent:advice:sync",
      "POST /api/admin/talent/advice/:id/publish": "talent:advice:publish",
      "POST /api/admin/talent/advice/:id/withdraw": "talent:advice:publish",
    };
    for (const route of TALENT_ADVICE_ADMIN_ROUTES) {
      expect(route.permission, route.path).toBe(expected[`${route.method} ${route.path}`]);
      const source = readRoute(route.file);
      expect(source, route.path).toContain(
        `requirePermission(event, "${route.permission}")`,
      );
      if (route.method === "POST") expect(source, route.path).toContain("withOperLog");
      // 导出直接返回 CSV（附件下载），其余端点统一 success() 包装。
      if (route.path.endsWith("/export"))
        expect(source, route.path).toContain("talentAdviceDownloadHeaders");
      else expect(source, route.path).toContain("success(");
      if (route.audit) expect(source, route.path).toContain("withOperLog");
    }
    // GET 只读：只有导出写 1 条 oper_logs。
    for (const route of TALENT_ADVICE_ADMIN_ROUTES.filter((item) => item.method === "GET")) {
      if (route.path.endsWith("/export")) continue;
      expect(readRoute(route.file), route.path).not.toContain("withOperLog");
      expect(readRoute(route.file), route.path).not.toMatch(/\.create\(|\.update\(|\.delete\(/);
    }
    // 接收新一版：preview 不在 spec §5.2 路由表（9 条），commit 走 /versions。
    const versionPost = readRoute("advice/versions/index.post.ts");
    expect(versionPost).toContain("talentAdviceReceiveSchema");
    expect(versionPost).toContain("receiveTalentAdviceVersion");
    expect(versionPost).not.toContain("previewTalentAdviceVersion");
    // 发布无请求体（spec §5.1 跳过 validateBody）；撤回校验 reason。
    const actionPost = readRoute("advice/[id]/[action].post.ts");
    expect(actionPost).toContain("publishTalentAdviceDoc");
    expect(actionPost).toContain("withdrawTalentAdviceDoc");
    expect(actionPost).toContain("talentAdviceWithdrawSchema");
    expect(actionPost).toContain("validateBody");
    expect(readRoute("advice/index.get.ts")).toContain("listTalentAdviceDocs");
    expect(readRoute("advice/[id].get.ts")).toContain("getTalentAdviceDocDetail");
    expect(readRoute("advice/versions/index.get.ts")).toContain("loadTalentAdviceVersionHistory");
    expect(readRoute("advice/subject.get.ts")).toContain("loadTalentAdviceSubjectAdvice");
    expect(readRoute("advice/export.get.ts")).toContain("exportTalentAdviceCsv");
  });

  it("静态段优先：versions / subject / export 不被 :id 吞掉", () => {
    for (const segment of TALENT_ADVICE_STATIC_SEGMENTS) {
      expect(TALENT_ADVICE_STATIC_SEGMENTS).toContain(segment);
      expect(() => assertTalentAdviceDetailSegment(segment)).toThrow(/请求方法不支持/);
    }
    expect(assertTalentAdviceDetailSegment("rec_advice_1")).toBe("rec_advice_1");
    // 静态路由文件存在（Nitro 静态段优先于 `:id`）。
    expect(existsSync(resolve(ADVICE_DIR, "versions/index.get.ts"))).toBe(true);
    expect(existsSync(resolve(ADVICE_DIR, "subject.get.ts"))).toBe(true);
    expect(existsSync(resolve(ADVICE_DIR, "export.get.ts"))).toBe(true);
    // 详情路由显式调用守卫。
    expect(readRoute("advice/[id].get.ts")).toContain("assertTalentAdviceDetailSegment");
  });

  it("路由参数兜底：静态路径无匹配方法回落到 [action] 时用 path 解析 id / action", () => {
    const fallback = {
      path: "/api/admin/talent/advice/rec_advice_1/history?x=1",
      context: { params: {} as Record<string, string> },
    };
    expect(talentAdviceRouteSegments(fallback)).toEqual([
      "api",
      "admin",
      "talent",
      "advice",
      "rec_advice_1",
      "history",
    ]);
    expect(resolveTalentAdviceRouteId(fallback)).toBe("rec_advice_1");
    expect(resolveTalentAdviceRouteAction(fallback)).toBe("history");
    const postEvent = {
      path: "/api/admin/talent/advice/rec_advice_1/withdraw",
      context: { params: {} as Record<string, string> },
    };
    expect(resolveTalentAdviceRouteId(postEvent)).toBe("rec_advice_1");
    expect(resolveTalentAdviceRouteAction(postEvent)).toBe("withdraw");
    // params 存在时优先。
    expect(
      resolveTalentAdviceRouteId({
        path: "/api/admin/talent/advice/whatever/history",
        context: { params: { id: "rec_real" } },
      }),
    ).toBe("rec_real");
  });

  it("权限码：5 码 = 1 个 C 菜单码 + 4 个 F 码，均有菜单行", () => {
    expect([...TALENT_ADVICE_PERMISSION_CODES]).toEqual([
      "talent:advice:list",
      "talent:advice:view",
      "talent:advice:sync",
      "talent:advice:publish",
      "talent:advice:export",
    ]);
    const actionDefs = (
      FOUNDATION_ACTION_MENU_DEFS as Array<[string, string, string, { matchByName?: boolean }?]>
    ).filter(([parentPath]) => parentPath === "/admin/talent/advice");
    expect(actionDefs).toHaveLength(4);
    expect(actionDefs.map(([, , code]) => code).sort()).toEqual([
      "talent:advice:export",
      "talent:advice:publish",
      "talent:advice:sync",
      "talent:advice:view",
    ]);
    for (const code of TALENT_ADVICE_PERMISSION_CODES)
      expect(FOUNDATION_RBAC_PERMISSION_CODES).toContain(code);
    // requirePermission 只用这 5 个码。
    const used = new Set(TALENT_ADVICE_ADMIN_ROUTES.map((route) => route.permission));
    expect([...used].sort()).toEqual([...TALENT_ADVICE_PERMISSION_CODES].sort());
  });

  it("菜单：培育建议 C 行不变，setup / sync 断言新增 4 F 行与 5 码", () => {
    const setupSource = read("scripts/setup.mjs");
    expect(setupSource).toContain('"admin/talent/advice.vue"');
    expect(setupSource).toContain('"/admin/talent/advice"');
    expect(setupSource).toContain('"talent:advice:view"');
    expect(setupSource).toContain('"talent:advice:sync"');
    expect(setupSource).toContain('"talent:advice:publish"');
    expect(setupSource).toContain('"talent:advice:export"');
    expect(setupSource).toContain('"talent:advice:list"');
    const syncSource = read("scripts/sync-talent.mjs");
    expect(syncSource).toContain('["培育建议", "/admin/talent/advice", "报告管理"]');
    expect(syncSource).toContain("M5_ADVICE_PERMISSION_CODES");
    expect(syncSource).toContain("advicePageMenus.length !== 1");
    expect(read("app/composables/useMenuTree.ts")).toContain("'/admin/talent/advice'");
    // 旧占位页保留到 M5-C，不在本任务替换。
    expect(existsSync(resolve(ROOT, "app/pages/admin/talent/advice.vue"))).toBe(true);
  });

  it("Zod：接收新版日期 / 版本号 / 说明，撤回原因，列表 idNo 与年龄格式", () => {
    expect(talentAdviceReceiveSchema.safeParse({ effectiveAt: "2026-11-12" }).success).toBe(true);
    expect(
      talentAdviceReceiveSchema.safeParse({ effectiveAt: "2026-11-12", versionNo: "V2026.11", note: "说明" })
        .success,
    ).toBe(true);
    expect(talentAdviceReceiveSchema.safeParse({ effectiveAt: "2026/11/12" }).success).toBe(false);
    expect(talentAdviceReceiveSchema.safeParse({ effectiveAt: "2026-11-12", versionNo: "" }).success).toBe(false);
    expect(talentAdviceReceiveSchema.safeParse({ effectiveAt: "2026-11-12", versionNo: "x".repeat(41) }).success).toBe(false);
    expect(talentAdviceWithdrawSchema.safeParse({}).success).toBe(true);
    expect(talentAdviceWithdrawSchema.safeParse({ reason: "x".repeat(201) }).success).toBe(false);

    expect(parseTalentAdviceListQuery({ age: "7" }).age).toBe(7);
    expect(() => parseTalentAdviceListQuery({ age: "7-8" })).toThrow();
    expect(() => parseTalentAdviceListQuery({ age: "7岁" })).toThrow();
    expect(() => parseTalentAdviceListQuery({ age: "101" })).toThrow();
    expect(() => parseTalentAdviceListQuery({ idNo: "123" })).toThrow(/身份证/);
    expect(() => parseTalentAdviceListQuery({ idNo: "1234567" })).toThrow(/身份证/);
    try {
      parseTalentAdviceListQuery({ idNo: "1234567" });
    } catch (error) {
      expect((error as { data?: { code?: string } }).data?.code).toBe("INVALID_ID_NO_LENGTH");
    }
    expect(parseTalentAdviceListQuery({ page: "2", pageSize: "999" })).toMatchObject({
      page: 2,
      pageSize: 100,
    });
    expect(parseTalentAdviceListQuery({})).toMatchObject({
      page: 1,
      pageSize: TALENT_ADVICE_DEFAULT_PAGE_SIZE,
    });
  });
});

// ── 2. 列表读模型 ─────────────────────────────────────────────────────────

describe("M5-B 列表（15 列 / 5 项检索 / 版本视图 / 分页）", () => {
  it("默认当前生效版本：排序 -syncedAt、15 列字段齐全、不含 sections / idNoHash / matchKey", async () => {
    const store = listFixture();
    const before = store.writes;
    const result = await listTalentAdviceDocs({}, store);
    expect(store.writes).toBe(before);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.viewing).toEqual({
      versionId: "version_active",
      versionName: "V2026.11",
      isCurrent: true,
    });
    expect(result.rows.map((row) => row.id)).toEqual(["doc_2", "doc_1", "doc_3"]);
    const row = result.rows[0]!;
    for (const key of [
      "adviceNo",
      "versionName",
      "name",
      "maskedIdNo",
      "genderLabel",
      "birthday",
      "ageLabel",
      "reportNo",
      "geneBookCountLabel",
      "books",
      "coveredFactorText",
      "entropyText",
      "publishStatusLabel",
      "syncedAt",
      "versionReadonly",
      "clientVisible",
    ])
      expect(row, key).toHaveProperty(key);
    const keys = collectKeys(result);
    expect(keys.has("sections")).toBe(false);
    expect(keys.has("matchKey")).toBe(false);
    expectNoSensitiveKeys(result);
    // 列表读模型不读 sections（假实现只返回字段子集）。
    expect(store.listModelCalls).toBe(1);
  });

  it("5 项检索单独命中与 AND 交集；年龄精确相等", async () => {
    const store = listFixture();
    expect((await listTalentAdviceDocs({ adviceNo: "GR202611160002" }, store)).rows).toHaveLength(1);
    expect((await listTalentAdviceDocs({ name: "示例二" }, store)).rows).toHaveLength(1);
    expect((await listTalentAdviceDocs({ reportNo: "GR202611160003" }, store)).rows).toHaveLength(1);
    const age7 = await listTalentAdviceDocs({ age: "7" }, store);
    expect(age7.total).toBe(1);
    expect(age7.rows[0]?.ageLabel).toBe("7 岁");
    expect((await listTalentAdviceDocs({ age: "8" }, store)).total).toBe(2);
    // 身份证前 4 / 后 4 位走脱敏包含；18 位走 idNoHash 精确。
    expect((await listTalentAdviceDocs({ idNo: "1101" }, store)).total).toBe(3);
    expect((await listTalentAdviceDocs({ idNo: "1234" }, store)).total).toBe(3);
    expect((await listTalentAdviceDocs({ idNo: ID_NO_PLAIN }, store)).total).toBe(3);
    expect((await listTalentAdviceDocs({ idNo: "110101201809081235" }, store)).total).toBe(0);
    // AND：姓名 + 年龄同时满足才命中（交集）。
    expect((await listTalentAdviceDocs({ name: "示例二", age: "7" }, store)).total).toBe(1);
    expect((await listTalentAdviceDocs({ name: "示例二", age: "8" }, store)).total).toBe(0);
    await expectReject(listTalentAdviceDocs({ age: "7-8" }, store), 422, "VALIDATION_ERROR");
    await expectReject(listTalentAdviceDocs({ idNo: "1234567" }, store), 422, "INVALID_ID_NO_LENGTH");
  });

  it("分页与页大小上限；页码越界返回空页但 total 不变", async () => {
    const store = listFixture();
    const page2 = await listTalentAdviceDocs({ page: "2", pageSize: "2" }, store);
    expect(page2.total).toBe(3);
    expect(page2.rows).toHaveLength(1);
    expect(page2.rows[0]?.id).toBe("doc_3");
    const beyond = await listTalentAdviceDocs({ page: "9", pageSize: "2" }, store);
    expect(beyond.rows).toHaveLength(0);
    expect(beyond.total).toBe(3);
    expect((await listTalentAdviceDocs({ pageSize: "1000" }, store)).pageSize).toBe(100);
  });

  it("历史版本视图只读：viewing.isCurrent=false、versionReadonly=true、clientVisible=false", async () => {
    const store = listFixture();
    const result = await listTalentAdviceDocs({ versionId: "version_archived" }, store);
    expect(result.viewing).toEqual({
      versionId: "version_archived",
      versionName: "V2026.07",
      isCurrent: false,
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.versionReadonly).toBe(true);
    expect(result.rows[0]?.clientVisible).toBe(false);
    await expectReject(
      listTalentAdviceDocs({ versionId: "version_missing" }, store),
      404,
      "ADVICE_VERSION_NOT_FOUND",
    );
  });

  it("派生可见性：报告撤回 / 建议撤回 → false；报告恢复 → true（不写库）", async () => {
    const store = listFixture();
    const byId = async (id: string) =>
      (await listTalentAdviceDocs({}, store)).rows.find((row) => row.id === id);
    expect((await byId("doc_1"))?.clientVisible).toBe(true);
    expect((await byId("doc_3"))?.clientVisible).toBe(false); // 建议已撤回
    expect((await byId("doc_2"))?.clientVisible).toBe(true);
    // 报告撤回：建议状态不变，派生可见性立即 false（ADR 0005-D4，不双写）。
    const report = store.reports.get("report_2")!;
    report.status = "retracted";
    expect((await byId("doc_2"))?.clientVisible).toBe(false);
    report.status = "published";
    expect((await byId("doc_2"))?.clientVisible).toBe(true);
  });

  it("无版本 / 空版本：viewing=null 或空行，不报错", async () => {
    const empty = new FakeAdviceStore();
    expect(await listTalentAdviceDocs({}, empty)).toMatchObject({
      rows: [],
      total: 0,
      viewing: null,
    });
    const noDocs = new FakeAdviceStore({ versions: [structuredClone(ACTIVE_VERSION)] });
    expect(await listTalentAdviceDocs({}, noDocs)).toMatchObject({
      rows: [],
      total: 0,
      viewing: { versionId: "version_active", isCurrent: true },
    });
  });
});

// ── 3. 详情 / 版本历史 / 按人历史 / 报告页签 ──────────────────────────────

describe("M5-B 详情 / 版本历史 / 按人历史 / 报告页签", () => {
  it("建议书详情按分册分组四段，无 idNoHash / 明文", async () => {
    const store = listFixture();
    const detail = await getTalentAdviceDocDetail("doc_1", store);
    expect(detail.books.map((group) => group.book)).toEqual(["A", "B"]);
    expect(detail.books[0]?.adviceNo).toBe("AD-GR202611160001-202611-A");
    expect(detail.books[0]?.sections[0]).toMatchObject({
      chapter: "1.1 生长发育概述",
      factor: "运动协调",
      entropy: "优秀",
      variant: 1,
      content: "该项潜质发展良好，基础条件较为扎实。",
      example: "多数情境下能稳定完成对应任务。",
      direction: "在现有基础上逐步增加任务复杂度。",
      suggestion: "保持规律接触与练习节奏。",
    });
    expect(detail.owner.matchKey).toBe("陈小示｜8 岁");
    expect(detail.versionReadonly).toBe(false);
    expect(detail.clientVisible).toBe(true);
    expect(detail.clientVisibleText).toBe("可见");
    expectNoSensitiveKeys(detail);
    await expectReject(getTalentAdviceDocDetail("doc_missing", store), 404, "ADVICE_DOC_NOT_FOUND");
  });

  it("版本历史：份数 / 发布 / 撤回统计 + 唯一 isCurrent", async () => {
    const store = listFixture();
    const history = await loadTalentAdviceVersionHistory(store);
    expect(history.total).toBe(2);
    expect(history.rows.map((row) => row.versionNo)).toEqual(["V2026.11", "V2026.07"]);
    const current = history.rows[0]!;
    expect(current).toMatchObject({
      status: "active",
      statusLabel: "当前生效",
      isCurrent: true,
      docCount: 3,
      publishedCount: 2,
      withdrawnCount: 1,
    });
    expect(history.rows.filter((row) => row.isCurrent)).toHaveLength(1);
    expect(history.rows[1]).toMatchObject({ docCount: 1, publishedCount: 1, withdrawnCount: 0 });
    expectNoSensitiveKeys(history);
  });

  it("按人历史：同一 reportNo 跨版本快照按 effectiveAt 倒序，只读", async () => {
    const store = listFixture();
    // 历史版本 doc_old 与当前版 doc_1 同 reportNo → 2 条快照。
    store.docs.find((doc) => doc.id === "doc_old")!.reportNo = "GR202611160001";
    const history = await listTalentAdvicePersonHistory("doc_1", store);
    expect(history.reportNo).toBe("GR202611160001");
    expect(history.items).toHaveLength(2);
    expect(history.items.map((item) => item.versionNo)).toEqual(["V2026.11", "V2026.07"]);
    expect(history.items[0]?.isCurrent).toBe(true);
    expect(history.items[1]?.isCurrent).toBe(false);
    expect(history.items[0]?.matchKey).toBe("陈小示｜8 岁");
    expect(history.items[1]?.matchKey).toBe("陈小示｜7 岁");
    expectNoSensitiveKeys(history);
  });

  it("报告第 4 页签挂载数据：subjectType+subjectId 与 reportId 两种参数", async () => {
    const store = listFixture();
    const bySubject = await loadTalentAdviceSubjectAdvice(
      { subjectType: "child", subjectId: "child_1" },
      store,
    );
    expect(bySubject.available).toBe(true);
    expect(bySubject.version).toMatchObject({ versionNo: "V2026.11", cycle: expect.any(String) });
    expect(bySubject.docs).toHaveLength(1);
    expect(bySubject.docs[0]).toMatchObject({
      adviceNo: "AD-GR202611160001-202611",
      publishStatusLabel: "已发布",
      bookCount: 2,
      sectionCount: 4,
      clientVisible: true,
    });
    expect(collectKeys(bySubject).has("sections")).toBe(false);
    const byReport = await loadTalentAdviceSubjectAdvice({ reportId: "report_1" }, store);
    expect(byReport.docs.map((doc) => doc.id)).toEqual(bySubject.docs.map((doc) => doc.id));
    // 参数校验与未知报告。
    await expectReject(resolveTalentAdviceSubjectQuery({ subjectType: "self" }, store), 422, "VALIDATION_ERROR");
    await expectReject(resolveTalentAdviceSubjectQuery({ subjectType: "child" }, store), 422, "VALIDATION_ERROR");
    await expectReject(resolveTalentAdviceSubjectQuery({ reportId: "report_missing" }, store), 404, "NOT_FOUND");
    // 无任何版本 → available=false。
    const empty = new FakeAdviceStore();
    expect(await loadTalentAdviceSubjectAdvice({ subjectType: "child", subjectId: "child_1" }, empty)).toMatchObject({
      available: false,
      version: null,
      docs: [],
    });
  });
});

// ── 4. 导出 ───────────────────────────────────────────────────────────────

describe("M5-B 导出（CSV / 表头 / 上限 / 版本视图）", () => {
  it("CSV 带 BOM、15 列表头、行数跟随筛选", async () => {
    const store = listFixture();
    expect(TALENT_ADVICE_EXPORT_HEADERS).toHaveLength(15);
    const result = await exportTalentAdviceCsv({}, { store, now: new Date("2026-11-17T10:00:00Z") });
    expect(result.rows).toBe(3);
    expect(result.csv.startsWith("\uFEFF")).toBe(true);
    const lines = result.csv.replace(/^\uFEFF/, "").trim().split("\r\n");
    expect(lines[0]).toBe(TALENT_ADVICE_EXPORT_HEADERS.join(","));
    expect(lines).toHaveLength(4);
    expect(result.fileName).toBe("培育建议-V2026.11-202611171000.csv");
    // 身份证列脱敏，不含明文。
    expect(result.csv).toContain("1101**********1234");
    expect(result.csv).not.toContain(ID_NO_PLAIN);
    // 跟随筛选。
    const filtered = await exportTalentAdviceCsv({ name: "示例二" }, { store });
    expect(filtered.rows).toBe(1);
    // 历史版本视图导出历史快照。
    const archived = await exportTalentAdviceCsv({ versionId: "version_archived" }, { store });
    expect(archived.rows).toBe(1);
    expect(archived.fileName).toContain("V2026.07");
  });

  it("导出上限 10000 行：超出 422 ADVICE_EXPORT_TOO_LARGE", () => {
    expect(TALENT_ADVICE_EXPORT_MAX_ROWS).toBe(10000);
    expect(() => assertTalentAdviceExportSize(10000)).not.toThrow();
    try {
      assertTalentAdviceExportSize(10001);
    } catch (error) {
      expect((error as { statusCode?: number }).statusCode).toBe(422);
      expect((error as { data?: { code?: string } }).data?.code).toBe("ADVICE_EXPORT_TOO_LARGE");
    }
  });

  it("空结果也导出表头（不报错）", async () => {
    const store = listFixture();
    const result = await exportTalentAdviceCsv({ name: "不存在" }, { store });
    expect(result.rows).toBe(0);
    expect(result.csv.replace(/^\uFEFF/, "").trim().split("\r\n")).toHaveLength(1);
    expect(buildTalentAdviceExportCsv([]).startsWith("\uFEFF")).toBe(true);
    expect(talentAdviceExportFileName("", new Date("2026-01-02T03:04:00Z"))).toBe(
      "培育建议-全部版本-202601020304.csv",
    );
  });
});

// ── 5. 接收新版 / 发布撤回 / 回切 ─────────────────────────────────────────

describe("M5-B 接收新版 / 发布撤回 / 回到当前生效版", () => {
  function syncStore(): FakeAdviceStore {
    return new FakeAdviceStore({
      versions: [structuredClone(ACTIVE_VERSION), structuredClone(ARCHIVED_VERSION)],
      candidates: [makeCandidate("gene_1"), makeCandidate("gene_2")],
      parents: [makeParent()],
      children: [makeChild()],
    });
  }

  it("接收新一版 preview 零写入（不建版本 / 不建建议 / 不写日志）", async () => {
    const store = syncStore();
    const before = { writes: store.writes, logs: store.logs.length, versions: store.versions.length };
    const preview = await previewTalentAdviceVersion(
      { effectiveAt: "2027-03-12", store, source: foundSource() },
    );
    expect(preview.mode).toBe("preview");
    expect(preview.createdCount).toBe(2);
    expect(store.writes).toBe(before.writes);
    expect(store.logs).toHaveLength(before.logs);
    expect(store.versions).toHaveLength(before.versions);
    expect(store.docs).toHaveLength(0);
    // 预演发现重复版本：commit 必然 409（提示而非静默成功）。
    const duplicate = await previewTalentAdviceVersion(
      { effectiveAt: "2026-11-12", store, source: foundSource() },
    );
    expect(duplicate.duplicateVersionNo).toBe("V2026.11");
    expect(duplicate.warnings).toContain("该版本已同步，请勿重复接收");
  });

  it("接收新一版 commit：新版 active、旧版 archived、建议同步即已发布、写同步日志", async () => {
    const store = syncStore();
    const result = await receiveTalentAdviceVersion({
      effectiveAt: "2027-03-12",
      store,
      source: foundSource(),
      operatorId: "user_admin",
      operatorName: "运营管理员",
      now: new Date("2027-03-12T09:20:00.000Z"),
    });
    expect(result.docCount).toBe(2);
    expect(result.emptyCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.archivedVersionId).toBe("version_active");
    expect(result.version).toMatchObject({ status: "active", versionNo: "V2027.03" });
    expect(store.versions.filter((version) => version.status === "active")).toHaveLength(1);
    expect(store.versions.find((version) => version.id === "version_active")?.status).toBe("archived");
    for (const doc of store.docs) {
      expect(doc.publishStatus).toBe("published");
      expect(doc.publishedAt).toBe(doc.syncedAt);
      expect(doc.withdrawnAt).toBe("");
      expect(doc.age).toBeGreaterThanOrEqual(0);
    }
    expect(store.logs).toHaveLength(1);
    expect(store.logs[0]).toMatchObject({ status: "success", received: 2, generated: 2 });
    // 响应不含 idNoHash / 明文（版本视图 + 脱敏明细）。
    expectNoSensitiveKeys(result);
    // 重复接收同一版本 → 409，不写集合、不切版。
    const versionsAfter = store.versions.length;
    await expectReject(
      receiveTalentAdviceVersion({ effectiveAt: "2027-03-12", store, source: foundSource() }),
      409,
      "ADVICE_VERSION_EXISTS",
    );
    expect(store.versions).toHaveLength(versionsAfter);
    // 版本只能前进：早于当前生效版的日期 409。
    await expectReject(
      receiveTalentAdviceVersion({ effectiveAt: "2026-12-01", store, source: foundSource() }),
      409,
      "ADVICE_VERSION_ORDER",
    );
    // 审计摘要只含版本 / 份数，不含姓名 / 证件号。
    const summary = talentAdviceReceiveAuditSummary(result);
    expect(summary).toBe("V2027.03 生效，新建 2 份，暂无 0 人，失败 0 人");
    expect(summary).not.toContain("陈小示");
    expect(summary).not.toContain(ID_NO_PLAIN);
  });

  it("发布 / 撤回：状态迁移、重复动作 409、历史版本只读 409", async () => {
    const store = listFixture();
    const withdrawn = await withdrawTalentAdviceDoc("doc_1", {
      store,
      now: new Date("2026-11-17T10:00:00.000Z"),
    });
    expect(withdrawn.publishStatus).toBe("withdrawn");
    expect(withdrawn.message).toBe("已撤回，家长端不再展示");
    expect(withdrawn.clientVisible).toBe(false);
    expect(withdrawn.withdrawnAt).toBe("2026-11-17T10:00:00.000Z");
    expect(withdrawn.publishedAt).toBe("2026-11-12T09:20:00.000Z");
    await expectReject(withdrawTalentAdviceDoc("doc_1", { store }), 409, "ADVICE_ALREADY_WITHDRAWN");
    const published = await publishTalentAdviceDoc("doc_1", {
      store,
      now: new Date("2026-11-18T10:00:00.000Z"),
    });
    expect(published.publishStatus).toBe("published");
    expect(published.message).toBe("已发布，家长端可见");
    expect(published.withdrawnAt).toBe("");
    expect(published.clientVisible).toBe(true);
    await expectReject(publishTalentAdviceDoc("doc_1", { store }), 409, "ADVICE_ALREADY_PUBLISHED");
    // 历史版本建议只读（AC-ADM-07-4 服务端双保险）→ 409 ADVICE_VERSION_READONLY。
    await expectReject(publishTalentAdviceDoc("doc_old", { store }), 409, "ADVICE_VERSION_READONLY");
    await expectReject(withdrawTalentAdviceDoc("doc_old", { store }), 409, "ADVICE_VERSION_READONLY");
    await expectReject(publishTalentAdviceDoc("doc_missing", { store }), 404, "ADVICE_DOC_NOT_FOUND");
  });

  it("回到当前生效版：清空 versionId 即恢复当前版视图，不写任何集合", async () => {
    const store = listFixture();
    const archived = await listTalentAdviceDocs({ versionId: "version_archived" }, store);
    expect(archived.viewing?.isCurrent).toBe(false);
    const writesBefore = store.writes;
    const active = await listTalentAdviceDocs({}, store);
    expect(store.writes).toBe(writesBefore);
    expect(active.viewing).toEqual({
      versionId: "version_active",
      versionName: "V2026.11",
      isCurrent: true,
    });
    // 服务端没有「切换生效版本」写接口：active/archived 翻转只发生在接收新一版。
    expect(TALENT_ADVICE_ADMIN_ROUTES.some((route) => /activate|switch/i.test(route.path))).toBe(false);
  });
});

// ── 6. 审计摘要与响应脱敏 ────────────────────────────────────────────────

describe("M5-B 审计摘要与响应脱敏", () => {
  it("审计摘要只含建议编号 / 版本号 / 姓名，不含证件号与正文", () => {
    const summary = talentAdviceDocAuditSummary(
      { adviceNo: "AD-GR202611160001-202611", name: "陈小示" },
      "V2026.11",
    );
    expect(summary).toBe("AD-GR202611160001-202611 · V2026.11 · 陈小示");
    expect(summary).not.toContain(ID_NO_PLAIN);
    expect(summary).not.toContain("潜质");
    expect(talentAdviceDocAuditSummary(null, "")).toBe("");
  });

  it("列表 / 详情 / 导出 / 报告页签响应均无 idNoHash / 明文 / cipher", async () => {
    const store = listFixture();
    const list = await listTalentAdviceDocs({}, store);
    const detail = await getTalentAdviceDocDetail("doc_1", store);
    const subject = await loadTalentAdviceSubjectAdvice({ subjectType: "child", subjectId: "child_1" }, store);
    const exported = await exportTalentAdviceCsv({}, { store });
    const history = await loadTalentAdviceVersionHistory(store);
    for (const payload of [list, detail, subject, history, exported.csv])
      expectNoSensitiveKeys(payload);
  });
});