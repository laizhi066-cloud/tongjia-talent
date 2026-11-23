/**
 * @description M3-B 报告域 API 路由级测试：14 条 spec §5.2 路由清单与权限码映射、静态段优先
 *   （`reports` 目录优先于旧 `[resource]`，`sync` / `sync-logs` 不被 `:id` 吞掉）、4 个权威权限码
 *   ↔ C/F 菜单行与「基因报告」重指向、无删除 / 新建报告 / PDF 路由、旧路由与旧码保留、
 *   列表四项筛选与状态计数、详情 4 页签与册摘要、单册叠加层、发布 / 撤回 / 恢复 / 补发 / 显式重算
 *   的状态机与版本链、方向预览 diff、同步预演零写入、同步日志、`recordTalentReportVersion`
 *   落库、响应无 cipher/hash/明文。不连接真实 PocketBase（内存假实现，数据全部虚构）。
 *   口径见 docs/specs/M3-reports/spec.md §5/§11、ADR 0003-D3/D4/D5/D7。
 * @file test/talent-report-api.test.ts
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  FOUNDATION_ACTION_MENU_DEFS,
  FOUNDATION_RBAC_PERMISSION_CODES,
} from "../scripts/setup.mjs";
import type {
  TalentGeneReportSource,
  TalentReportRecord,
  TalentReportSnapshotRules,
  TalentReportSyncCandidate,
  TalentReportSyncLogInput,
} from "~~/shared/types/talent-report";
import { hashTalentMemberIdNo, hashTalentMemberMobile } from "~~/server/utils/talent-member-crypto";
import {
  TALENT_REPORT_ADMIN_ROUTES,
  TALENT_REPORT_PERMISSION_CODES,
  assertTalentReportDetailSegment,
  buildTalentReportDirectionPreview,
  buildTalentReportPublishPreview,
  buildTalentReportReissuePreview,
  listTalentReportSyncLogs,
  listTalentReports,
  resolveTalentReportRouteAction,
  resolveTalentReportRouteId,
  resolveTalentReportRouteVolumeId,
  talentReportRouteSegments,
  loadTalentReportDetail,
  loadTalentReportVolume,
  previewTalentReportsSync,
  publishTalentReport,
  regenerateTalentReportSnapshot,
  reissueTalentReport,
  restoreTalentReport,
  talentReportPublishSchema,
  talentReportSyncSchema,
  withdrawTalentReport,
} from "~~/server/utils/talent-report-api";
import { recordTalentReportVersion } from "~~/server/utils/talent-report";
import { buildTalentReportSnapshot } from "~~/server/utils/talent-report-snapshot";
import type { TalentReportSyncStore } from "~~/server/utils/talent-report-source";

const ROOT = resolve(import.meta.dirname, "..");
const TALENT_API_DIR = resolve(ROOT, "server/api/admin/talent");
const AT = "2026-11-16T10:00:00.000Z";
const NOW = new Date("2026-11-17T12:00:00.000Z");
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

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function readRoute(file: string): string {
  return read(`server/api/admin/talent/${file}`);
}

/** 递归收集报告域新路由文件（reports / gene-reports）。 */
function collectReportRouteFiles(): string[] {
  const files: string[] = [];
  const walk = (absolute: string, relative: string) => {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(resolve(absolute, entry.name), nextRelative);
      else if (entry.name.endsWith(".ts")) files.push(nextRelative);
    }
  };
  for (const dir of ["reports", "gene-reports"])
    walk(resolve(TALENT_API_DIR, dir), dir);
  return files.sort();
}

/** 递归扫描响应键名，确认没有 cipher / hash 字段。 */
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
  for (const key of keys) expect(key).not.toMatch(/Cipher|Hash/);
  const text = JSON.stringify(value);
  expect(text).not.toContain("110101201609081234");
  expect(text).not.toContain("13800000001");
}

// ── 内存 PocketBase：只实现报告域服务函数用到的方法与简单 filter ─────────────────────

interface MemoryRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}

function splitTop(text: string, separator: string): string[] {
  return text.split(separator).map((part) => part.trim()).filter(Boolean);
}

function matchesClause(row: MemoryRecord, clause: string): boolean {
  const text = clause.trim();
  if (!text) return true;
  if (text.startsWith("(") && text.endsWith(")"))
    return splitTop(text.slice(1, -1), " || ").some((part) => matchesClause(row, part));
  const orParts = splitTop(text, " || ");
  if (orParts.length > 1) return orParts.some((part) => matchesClause(row, part));
  const equals = /^(\w+) = "((?:[^"\\]|\\.)*)"$/.exec(text);
  if (equals)
    return String(row[equals[1] as string] ?? "") === equals[2]!.replaceAll('\\"', '"');
  const notEmpty = /^(\w+) != ""$/.exec(text);
  if (notEmpty) return String(row[notEmpty[1] as string] ?? "") !== "";
  const like = /^(\w+) ~ "((?:[^"\\]|\\.)*)"$/.exec(text);
  if (like)
    return String(row[like[1] as string] ?? "").includes(like[2]!.replaceAll('\\"', '"'));
  return false;
}

function memoryFilterMatches(row: MemoryRecord, filter: string): boolean {
  const text = filter.trim();
  if (!text) return true;
  return splitTop(text, " && ").every((part) => matchesClause(row, part));
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
          items: filtered
            .slice((page - 1) * pageSize, page * pageSize)
            .map((row) => ({ ...row })),
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
}

function asPocketBase(pb: MemoryPocketBase): never {
  return pb as unknown as never;
}

// ── 测试夹具：M1 规则 + M2 家长/子女 + 基因报告 + 三态报告 ──────────────────────────

const RULES: TalentReportSnapshotRules = {
  factors: [
    { code: "A-01", name: "运动协调", category: "A", categoryName: "生长发育" },
    { code: "B-01", name: "逻辑推理", category: "B", categoryName: "智商" },
    { code: "C-01", name: "情绪识别", category: "C", categoryName: "情商" },
    { code: "D-01", name: "组织协调", category: "D", categoryName: "领导商" },
    { code: "E-01", name: "音律感知", category: "E", categoryName: "艺术商" },
  ],
  levels: [
    { code: "LV1", name: "常态", sortOrder: 1, status: "1" },
    { code: "LV2", name: "优良", sortOrder: 2, status: "1" },
    { code: "LV3", name: "优秀", sortOrder: 3, status: "1" },
    { code: "LV4", name: "卓越", sortOrder: 4, status: "1" },
  ],
  notes: [{ factorCode: "A-01", levelCode: "LV3", note: "固定注解 A-01-LV3", status: "1" }],
  directions: [
    {
      id: "dir-1",
      code: "DIR-001",
      name: "舞蹈启蒙",
      status: "1",
      version: 1,
      requirements: [{ code: "A-01", level: "LV3" }],
      tierIds: ["tier-1", "tier-2"],
      defaultTierId: "tier-1",
    },
  ],
  tiers: [
    {
      id: "tier-1",
      code: "T1",
      name: "启蒙",
      sortOrder: 1,
      teacher: "示例师资",
      freq: "每周 2 次",
      status: "1",
      isDefault: true,
      preset: true,
    },
    {
      id: "tier-2",
      code: "T2",
      name: "精进",
      sortOrder: 2,
      teacher: "示例师资",
      freq: "每周 3 次",
      status: "1",
    },
  ],
};

const SECTIONS = [
  { bookCode: "A", chapter: "1.1 生长发育概述", factorCode: "A-01", levelCode: "LV3", score: 78 },
  { bookCode: "B", chapter: "2.1 智商概述", factorCode: "B-01", levelCode: "LV2", score: 66 },
  { bookCode: "C", chapter: "3.1 情商概述", factorCode: "C-01", levelCode: "LV1", score: 55 },
  { bookCode: "D", chapter: "4.1 领导商概述", factorCode: "D-01", levelCode: "LV4", score: 91 },
  { bookCode: "E", chapter: "5.1 艺术商概述", factorCode: "E-01", levelCode: "LV2", score: 64 },
] as const;

function seedRules(pb: MemoryPocketBase): void {
  for (const factor of RULES.factors)
    pb.seed("talent_factors", {
      id: `factor-${factor.code}`,
      code: factor.code,
      name: factor.name,
      category: factor.category,
      categoryName: factor.categoryName,
    });
  for (const level of RULES.levels)
    pb.seed("talent_levels", { id: `level-${level.code}`, ...level });
  for (const note of RULES.notes)
    pb.seed("talent_factor_notes", {
      id: `note-${note.factorCode}-${note.levelCode}`,
      ...note,
    });
  for (const direction of RULES.directions)
    pb.seed("talent_directions", { ...direction });
  for (const tier of RULES.tiers) pb.seed("talent_tiers", { ...tier });
}

const PARENT_ID = "parent-1";
const CHILDREN = [
  {
    id: "child-1",
    name: "陈小一",
    birthday: "2016-09-08",
    gender: "female",
    idNo: "110101201609081234",
    maskedIdNo: "1101**********1234",
    idNoHash: "",
  },
  {
    id: "child-2",
    name: "陈小二",
    birthday: "2015-03-02",
    gender: "male",
    idNo: "110101201503021235",
    maskedIdNo: "1101**********1235",
    idNoHash: "",
  },
  {
    id: "child-3",
    name: "陈小三",
    birthday: "2017-07-19",
    gender: "female",
    idNo: "110101201707191236",
    maskedIdNo: "1101**********1236",
    idNoHash: "",
  },
] as const;

function seedMembers(pb: MemoryPocketBase): void {
  pb.seed("talent_parents", {
    id: PARENT_ID,
    parentNo: "P202611160001",
    name: "陈示例",
    mobileCipher: "cipher",
    mobileHash: hashTalentMemberMobile("13800000001"),
    maskedMobile: "1380****0001",
    idNoCipher: "cipher",
    idNoHash: hashTalentMemberIdNo("110101198803121234"),
    maskedIdNo: "1101**********1234",
    gender: "female",
    birthday: "1988-03-12",
    source: "admin",
    status: "1",
    userId: "",
    queriedAt: AT,
  });
  for (const child of CHILDREN)
    pb.seed("talent_children", {
      id: child.id,
      parentId: PARENT_ID,
      name: child.name,
      gender: child.gender,
      birthday: child.birthday,
      relation: "mother",
      idNoCipher: "cipher",
      idNoHash: hashTalentMemberIdNo(child.idNo),
      maskedIdNo: child.maskedIdNo,
      query: "found",
      queryReason: "",
      querySeq: 1,
      queryAttempts: 1,
      status: "1",
    });
}

function seedGeneReport(
  pb: MemoryPocketBase,
  input: { id: string; subjectId: string; books: string; maskedIdNo: string; idNo: string },
): void {
  const sections = SECTIONS.filter((section) => input.books.includes(section.bookCode));
  pb.seed("talent_gene_reports", {
    id: input.id,
    subjectType: "child",
    subjectId: input.subjectId,
    parentId: PARENT_ID,
    reportNo: `R20261116000${input.id.slice(-1)}`,
    name: CHILDREN.find((child) => child.id === input.subjectId)?.name ?? "",
    gender: CHILDREN.find((child) => child.id === input.subjectId)?.gender ?? "female",
    birthday: CHILDREN.find((child) => child.id === input.subjectId)?.birthday ?? "",
    age: 10,
    maskedIdNo: input.maskedIdNo,
    idNoHash: hashTalentMemberIdNo(input.idNo),
    issuer: "示例检测机构（本地演示）",
    filedAt: "2026-11-01",
    syncedAt: AT,
    source: "mock",
    version: "mock-v1",
    books: input.books,
    sections,
    sectionCount: sections.length,
    status: "synced",
  });
}

function buildSnapshot(books: readonly string[], openVolumeIds: readonly string[]) {
  return buildTalentReportSnapshot({
    books,
    sections: SECTIONS.filter((section) => books.includes(section.bookCode)),
    rules: RULES,
    openVolumeIds,
    snapshotVersion: 1,
    at: AT,
    operatorId: "user-1",
    operatorName: "管理员示例",
  });
}

function seedReports(pb: MemoryPocketBase): void {
  const published = buildSnapshot(["A", "B", "C", "D"], ["V1", "V2"]);
  pb.seed("talent_reports", {
    id: "report-published",
    reportNo: "R202611160001",
    reportType: "gene_report",
    title: "陈小一·基因报告",
    customerId: "",
    status: "published",
    subjectType: "child",
    subjectId: "child-1",
    parentId: PARENT_ID,
    geneReportId: "gene-1",
    factorCount: published.factorCount,
    totalItems: published.factorCount,
    snapshotVersion: 1,
    snapshotAt: AT,
    publishedAt: AT,
    queriedAt: AT,
    openVolumeIds: ["V1", "V2"],
    factorSnapshot: published.factorSnapshot,
    volumeSnapshot: published.volumeSnapshot,
    directionSnapshot: published.directionSnapshot,
    selections: [],
    versions: [
      {
        version: 1,
        type: "publish",
        summary: "发布，开放 2 册（A、B）",
        books: ["A", "B"],
        operatorId: "user-1",
        operatorName: "管理员示例",
        at: AT,
      },
    ],
  });
  pb.seed("talent_reports", {
    id: "report-pending",
    reportNo: "R202611160002",
    reportType: "gene_report",
    title: "陈小二·基因报告",
    customerId: "",
    status: "pending_publish",
    subjectType: "child",
    subjectId: "child-2",
    parentId: PARENT_ID,
    geneReportId: "gene-2",
    factorCount: 0,
    totalItems: 0,
    snapshotVersion: 0,
    queriedAt: AT,
    openVolumeIds: [],
    factorSnapshot: [],
    volumeSnapshot: [],
    directionSnapshot: null,
    selections: [],
    versions: [],
  });
  const retracted = buildSnapshot(["A", "B"], ["V1"]);
  pb.seed("talent_reports", {
    id: "report-retracted",
    reportNo: "R202611160003",
    reportType: "gene_report",
    title: "陈小三·基因报告",
    customerId: "",
    status: "retracted",
    subjectType: "child",
    subjectId: "child-3",
    parentId: PARENT_ID,
    geneReportId: "gene-3",
    factorCount: retracted.factorCount,
    totalItems: retracted.factorCount,
    snapshotVersion: 1,
    snapshotAt: AT,
    publishedAt: AT,
    withdrawnAt: AT,
    queriedAt: AT,
    openVolumeIds: ["V1"],
    factorSnapshot: retracted.factorSnapshot,
    volumeSnapshot: retracted.volumeSnapshot,
    directionSnapshot: retracted.directionSnapshot,
    selections: [],
    versions: [
      {
        version: 1,
        type: "publish",
        summary: "发布，开放 1 册（A）",
        books: ["A"],
        operatorId: "user-1",
        operatorName: "管理员示例",
        at: AT,
      },
      {
        version: 1,
        type: "withdraw",
        summary: "撤回报告，C 端立即不可见",
        operatorId: "user-1",
        operatorName: "管理员示例",
        at: AT,
      },
    ],
  });
  // 旧报告域行（subjectType=""）用于验证新接口 404 / 列表排除。
  pb.seed("talent_reports", {
    id: "report-legacy",
    reportNo: "R-Legacy-1",
    reportType: "gene_report",
    title: "旧行",
    customerId: "customer-1",
    status: "published",
    subjectType: "",
    subjectId: "",
    parentId: "",
    geneReportId: "",
    versions: [],
  });
}

function createFixture(): MemoryPocketBase {
  const pb = new MemoryPocketBase();
  seedRules(pb);
  seedMembers(pb);
  seedGeneReport(pb, {
    id: "gene-1",
    subjectId: "child-1",
    books: "ABCD",
    maskedIdNo: "1101**********1234",
    idNo: "110101201609081234",
  });
  seedGeneReport(pb, {
    id: "gene-2",
    subjectId: "child-2",
    books: "AB",
    maskedIdNo: "1101**********1235",
    idNo: "110101201503021235",
  });
  seedGeneReport(pb, {
    id: "gene-3",
    subjectId: "child-3",
    books: "AB",
    maskedIdNo: "1101**********1236",
    idNo: "110101201707191236",
  });
  seedReports(pb);
  return pb;
}

function reportRow(pb: MemoryPocketBase, id: string): TalentReportRecord {
  return pb.rowsOf("talent_reports").find((row) => row.id === id) as unknown as TalentReportRecord;
}

// ── 1. 路由清单 / 权限映射 / 静态段优先 ───────────────────────────────────────────

describe("M3-B 路由清单与权限映射", () => {
  it("14 条 HTTP 端点齐全，reports 静态目录与旧 [resource] 动态路由并存", () => {
    expect(TALENT_REPORT_ADMIN_ROUTES).toHaveLength(14);
    const expectedFiles = [
      "reports/index.get.ts",
      "reports/[id].get.ts",
      "reports/[id]/volumes/[volumeId].get.ts",
      "reports/[id]/[action].get.ts",
      "reports/[id]/[action].post.ts",
      // M4-B 后台方向选择联调入口（静态段优先于 [action]），不影响 M3 的 14 条动作路由。
      "reports/[id]/selection.post.ts",
      "reports/sync.post.ts",
      "reports/sync-logs.get.ts",
      "gene-reports/[id].get.ts",
    ].sort();
    expect(collectReportRouteFiles()).toEqual(expectedFiles);
    for (const file of expectedFiles)
      expect(existsSync(resolve(TALENT_API_DIR, file)), file).toBe(true);
    // M6：旧动态路由 / 旧报告路由 / 旧机构 / 客户 / 模板等文件已删除，静态路由不受影响。
    for (const legacyFile of [
      "[resource].get.ts",
      "[resource].post.ts",
      "report.get.ts",
      "report/[id].get.ts",
      "report/sync.post.ts",
      "customer/index.get.ts",
      "institution/index.get.ts",
      "template.get.ts",
      "matching.get.ts",
      "sync-config.get.ts",
      "plan/index.get.ts",
      "plan-selections.get.ts",
      "level-copy.post.ts",
      "level-status.post.ts",
    ])
      expect(existsSync(resolve(TALENT_API_DIR, legacyFile)), legacyFile).toBe(false);
    // 无删除 / 新建报告 / PDF 路由。
    const files = collectReportRouteFiles().join("\n");
    expect(files).not.toMatch(/delete|remove|pdf|upload|reset/i);
    for (const route of TALENT_REPORT_ADMIN_ROUTES)
      expect(readRoute(route.file), route.file).toContain("defineEventHandler");
  });

  it("每条端点使用 spec §5.2 权限码；写动作具备 validateBody / withOperLog / success", () => {
    for (const route of TALENT_REPORT_ADMIN_ROUTES) {
      const source = readRoute(route.file);
      expect(source, route.path).toContain(
        `requirePermission(event, "${route.permission}")`,
      );
      // 动作聚合文件里权限码是分支内统一值，逐个动作键必须存在（键可带引号）。
      if (route.action)
        expect(
          source.includes(`"${route.action}":`) || source.includes(`${route.action}:`),
          `${route.path} 缺少动作键 ${route.action}`,
        ).toBe(true);
      if (route.method === "POST") {
        expect(source, route.path).toContain("withOperLog");
        expect(source, route.path).toContain("success(");
        if (route.file === "reports/[id]/[action].post.ts") {
          // 有请求体的动作（发布 / 撤回 / 重算）走 validateBody；restore / publish-new 按 spec 跳过。
          expect(source).toContain("validateBody");
          expect(source).toContain("talentReportPublishSchema");
          expect(source).toContain("talentReportWithdrawSchema");
          expect(source).toContain("talentReportRegenerateSchema");
        }
      } else {
        // GET 只读不得写库 / 写日志。
        if (route.file !== "reports/[id]/[action].get.ts")
          expect(source, route.path).not.toContain("withOperLog");
        expect(source, route.path).not.toMatch(/\.create\(|\.update\(|\.delete\(/);
        expect(source, route.path).toContain("success(");
      }
    }
    // 一键同步 commit 才审计，preview 分支不写日志。
    const syncSource = readRoute("reports/sync.post.ts");
    expect(syncSource).toContain("previewTalentReportsSync");
    expect(syncSource).toContain("commitTalentReportsSync");
    expect(syncSource.indexOf("previewTalentReportsSync")).toBeLessThan(
      syncSource.indexOf("withOperLog"),
    );
    // 列表 / 详情 / 单册 / 同步日志 / 基因报告走各自服务函数。
    expect(readRoute("reports/index.get.ts")).toContain("listTalentReports");
    expect(readRoute("reports/[id].get.ts")).toContain("loadTalentReportDetail");
    expect(readRoute("reports/[id]/volumes/[volumeId].get.ts")).toContain(
      "loadTalentReportVolume",
    );
    expect(readRoute("reports/sync-logs.get.ts")).toContain("listTalentReportSyncLogs");
    expect(readRoute("gene-reports/[id].get.ts")).toContain("loadTalentGeneReportDetail");
  });

  it("静态段优先：sync / sync-logs 不被 :id 吞掉，reports 不被旧 [resource] 拦截", () => {
    // `[id].get.ts` 显式守卫保留段（GET /reports/sync 返回 405 而不是报告详情）。
    const detailSource = readRoute("reports/[id].get.ts");
    expect(detailSource).toContain("assertTalentReportDetailSegment");
    expect(() => assertTalentReportDetailSegment("sync")).toThrow(/请求方法不支持/);
    expect(() => assertTalentReportDetailSegment("sync-logs")).toThrow(/请求方法不支持/);
    expect(assertTalentReportDetailSegment("report-published")).toBe("report-published");
    // 静态路由文件存在（Nitro 静态段优先于 `:id`）。
    expect(existsSync(resolve(TALENT_API_DIR, "reports/sync.post.ts"))).toBe(true);
    expect(existsSync(resolve(TALENT_API_DIR, "reports/sync-logs.get.ts"))).toBe(true);
    // 动作聚合文件不会捕获 2 段以下的静态路径。
    expect(collectReportRouteFiles().filter((file) => file.includes("[action]"))).toHaveLength(2);
  });

  it("路由参数兜底：静态路径无匹配方法回落到 [id].get 时用 path 解析 id / action", () => {
    const fallbackEvent = {
      path: "/api/admin/talent/reports/sync?x=1",
      context: { params: {} as Record<string, string> },
    };
    expect(talentReportRouteSegments(fallbackEvent)).toEqual([
      "api",
      "admin",
      "talent",
      "reports",
      "sync",
    ]);
    expect(resolveTalentReportRouteId(fallbackEvent)).toBe("sync");
    // 参数缺失时 `[action].get` / `[action].post` 用末段解析，避免静默 404 或串味。
    const actionEvent = {
      path: "/api/admin/talent/reports/report-1/publish-preview",
      context: { params: {} as Record<string, string> },
    };
    expect(resolveTalentReportRouteId(actionEvent)).toBe("publish-preview");
    expect(resolveTalentReportRouteAction(actionEvent)).toBe("publish-preview");
    const postEvent = {
      path: "/api/admin/talent/reports/report-1/regenerate-snapshot",
      context: { params: {} as Record<string, string> },
    };
    expect(resolveTalentReportRouteAction(postEvent)).toBe("regenerate-snapshot");
    const volumeEvent = {
      path: "/api/admin/talent/reports/report-1/volumes/V1",
      context: { params: {} as Record<string, string> },
    };
    expect(resolveTalentReportRouteVolumeId(volumeEvent)).toBe("V1");
    // params 存在时优先使用 router param。
    expect(
      resolveTalentReportRouteId({
        path: "/api/admin/talent/reports/whatever",
        context: { params: { id: "report-1" } },
      }),
    ).toBe("report-1");
  });

  it("权限码：4 个权威码 + 旧 3 码保留；每个码都有 C/F 菜单行", () => {
    expect([...TALENT_REPORT_PERMISSION_CODES]).toEqual([
      "talent:report:list",
      "talent:report:view",
      "talent:report:sync",
      "talent:report:publish",
    ]);
    const actionDefs = (
      FOUNDATION_ACTION_MENU_DEFS as Array<[string, string, string, { matchByName?: boolean }?]>
    ).filter(
      ([parentPath, , code]) =>
        parentPath === "/admin/talent/reports" &&
        (TALENT_REPORT_PERMISSION_CODES as readonly string[]).includes(code),
    );
    // 4 个权威码 = 1 个 C 页面码 + 5 条 F 行（publish 覆盖 3 个动作）。
    expect(actionDefs.filter(([, , code]) => code === "talent:report:publish")).toHaveLength(3);
    expect(actionDefs.filter(([, , code]) => code === "talent:report:view")).toHaveLength(1);
    expect(actionDefs.filter(([, , code]) => code === "talent:report:sync")).toHaveLength(1);
    expect(actionDefs.filter(([, , code]) => code === "talent:report:list")).toHaveLength(0);
    expect(actionDefs).toHaveLength(5);
    for (const [parentPath] of actionDefs) expect(parentPath).toBe("/admin/talent/reports");
    for (const code of TALENT_REPORT_PERMISSION_CODES)
      expect(FOUNDATION_RBAC_PERMISSION_CODES).toContain(code);
    // M6：旧报告 revoke / edit / receive 三码必须从在册清单与菜单定义中归零（AC-M6-08）。
    for (const code of [
      "talent:report:revoke",
      "talent:report:edit",
      "talent:report:receive",
    ]) {
      expect(FOUNDATION_RBAC_PERMISSION_CODES, code).not.toContain(code);
      expect(
        (FOUNDATION_ACTION_MENU_DEFS as Array<[string, string, string]>).some(
          ([, , actionCode]) => actionCode === code,
        ),
        code,
      ).toBe(false);
    }
    // requirePermission 只使用 4 个权威码。
    const usedCodes = new Set(TALENT_REPORT_ADMIN_ROUTES.map((route) => route.permission));
    expect([...usedCodes].sort()).toEqual([...TALENT_REPORT_PERMISSION_CODES].sort());
  });

  it("菜单：基因报告 C 行重指向 /admin/talent/reports，setup / sync 断言与 TALENT_PATHS 同步", () => {
    const setupSource = read("scripts/setup.mjs");
    expect(setupSource).toContain('"admin/talent/reports/index.vue"');
    expect(setupSource).toContain('path: "/admin/talent/reports"');
    // 按旧 path 找行重指向，保留行 id 与 role_menus。
    expect(setupSource).toContain('menuType = "C" && path = "/admin/talent/report"');
    // 同一权限码多 F 行：按菜单名幂等匹配。
    expect(setupSource).toContain("matchByName: true");
    expect(setupSource).toContain('"talent:report:sync"');
    // M6：旧报告页 F 行（撤回 / 上传 PDF）已删除，旧码只保留在归零清单常量里。
    expect(setupSource).not.toContain('["/admin/talent/report", "撤回天赋报告"');
    expect(setupSource).not.toContain('["/admin/talent/report", "上传报告 PDF"');
    expect(setupSource).toContain("LEGACY_TALENT_PERMISSION_CODES");

    const syncSource = read("scripts/sync-talent.mjs");
    expect(syncSource).toContain('["基因报告", "/admin/talent/reports", "报告管理"]');
    expect(syncSource).toContain('"/admin/talent/reports"');
    expect(syncSource).toContain("M3_REPORT_PERMISSION_CODES");
    expect(syncSource).toContain("LEGACY_TALENT_PERMISSION_CODES");
    expect(syncSource).not.toContain("M3_LEGACY_REPORT_PERMISSION_CODES");
    expect(syncSource).toContain("reportPageMenus.length !== 1");
    expect(syncSource).not.toContain('"/admin/talent/report",\n  "/admin/talent/advice"');

    expect(read("app/composables/useMenuTree.ts")).toContain("'/admin/talent/reports'");
  });

  it("Zod：发布册 1–6 / 同步 mode 只允许 preview|commit", () => {
    expect(talentReportPublishSchema.safeParse({ openVolumeIds: [] }).success).toBe(false);
    expect(talentReportPublishSchema.safeParse({ openVolumeIds: ["V1", "V2"] }).success).toBe(
      true,
    );
    expect(
      talentReportPublishSchema.safeParse({ openVolumeIds: ["V9"] }).success,
    ).toBe(false);
    expect(talentReportSyncSchema.safeParse({ mode: "preview" }).success).toBe(true);
    expect(talentReportSyncSchema.safeParse({ mode: "all" }).success).toBe(false);
    expect(
      talentReportSyncSchema.safeParse({ mode: "commit", previewCounts: { refreshed: 1 } })
        .success,
    ).toBe(true);
  });
});

// ── 2. 列表 / 详情 / 单册叠加层 ─────────────────────────────────────────────────

describe("M3-B 列表与详情", () => {
  it("列表返回 10 列数据 + 状态计数，默认排除旧行（subjectType=\"\"）", async () => {
    const pb = createFixture();
    const result = await listTalentReports(asPocketBase(pb), {});
    expect(result.total).toBe(3);
    expect(result.statusTotal).toBe(3);
    expect(result.statusCounts).toEqual({
      pending_publish: 1,
      published: 1,
      retracted: 1,
    });
    const published = result.rows.find((row) => row.id === "report-published")!;
    expect(published).toMatchObject({
      reportNo: "R202611160001",
      parentName: "陈示例",
      childName: "陈小一",
      maskedMobile: "1380****0001",
      maskedIdNo: "1101**********1234",
      geneBookCount: 4,
      booksText: "ABCD",
      newBookCount: 2,
      newBooksText: "CD",
      status: "published",
      statusLabel: "已发布",
      snapshotVersion: 1,
      geneReportId: "gene-1",
    });
    const pending = result.rows.find((row) => row.id === "report-pending")!;
    expect(pending).toMatchObject({ status: "pending_publish", statusLabel: "待发布" });
    // 列表响应不含 cipher / hash / 明文。
    expectNoSensitiveKeys(result);
  });

  it("四项筛选 AND + 状态筛选；手机号 / 身份证格式错误 → 422", async () => {
    const pb = createFixture();
    expect((await listTalentReports(asPocketBase(pb), { status: "published" })).total).toBe(1);
    expect((await listTalentReports(asPocketBase(pb), { childName: "陈小二" })).total).toBe(1);
    const byMobile = await listTalentReports(asPocketBase(pb), {
      parentMobile: "13800000001",
    });
    expect(byMobile.total).toBe(3);
    expect(
      (await listTalentReports(asPocketBase(pb), { parentMobile: "0001" })).total,
    ).toBe(3);
    const byIdNo = await listTalentReports(asPocketBase(pb), {
      idNo: "110101201609081234",
    });
    expect(byIdNo.total).toBe(1);
    expect(byIdNo.rows[0]?.subjectId).toBe("child-1");
    expect((await listTalentReports(asPocketBase(pb), { idNo: "1234" })).total).toBe(1);
    expect((await listTalentReports(asPocketBase(pb), { reportNo: "0002" })).total).toBe(1);
    await expect(
      listTalentReports(asPocketBase(pb), { parentMobile: "123" }),
    ).rejects.toMatchObject({ statusCode: 422 });
    await expect(
      listTalentReports(asPocketBase(pb), { idNo: "12345" }),
    ).rejects.toMatchObject({ statusCode: 422 });
    await expect(
      listTalentReports(asPocketBase(pb), { status: "error" }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("详情 4 页签：已发布返回冻结摘要 + 当前命中 + 册摘要，待发布 matching 为空", async () => {
    const pb = createFixture();
    const detail = await loadTalentReportDetail(asPocketBase(pb), "report-published", {
      now: NOW,
    });
    expect(detail.report).toMatchObject({
      reportNo: "R202611160001",
      status: "published",
      statusLabel: "已发布",
      snapshotVersion: 1,
      factorCount: 4,
      openVolumeIds: ["V1", "V2"],
      openBooksText: "AB",
      geneBookCount: 4,
      booksText: "ABCD",
      newBookCount: 2,
      newBooksText: "CD",
    });
    expect(detail.subject).toMatchObject({
      type: "child",
      id: "child-1",
      name: "陈小一",
      genderLabel: "女",
      birthday: "2016-09-08",
      age: 10,
      maskedIdNo: "1101**********1234",
    });
    expect(detail.parent).toMatchObject({ name: "陈示例", maskedMobile: "1380****0001" });
    expect(detail.geneReport).toMatchObject({
      booksText: "ABCD",
      sectionCount: 4,
      sourceLabel: "模拟数据",
    });
    expect(detail.tabs.selections).toEqual([]);
    expect(detail.tabs.matching.frozen).toHaveLength(1);
    expect(detail.tabs.matching.frozen?.[0]).toMatchObject({
      directionId: "dir-1",
      code: "DIR-001",
      name: "舞蹈启蒙",
      hitCount: 1,
      total: 1,
    });
    expect(detail.tabs.matching.current?.[0]?.hitCount).toBe(1);
    expect(detail.tabs.matching.diff).toEqual([]);
    expect(detail.tabs.matching.configChanged).toBe(false);
    expect(detail.tabs.geneReport.volumes).toHaveLength(6);
    expect(detail.tabs.geneReport.volumes[0]).toMatchObject({
      volumeId: "V1",
      bookCode: "A",
      open: true,
      chapterCount: 1,
      factorCount: 1,
    });
    expect(detail.tabs.geneReport.volumes[3]).toMatchObject({ volumeId: "V4", open: false });
    expect(detail.tabs.advice).toMatchObject({ available: false, items: [] });
    expectNoSensitiveKeys(detail);

    const pending = await loadTalentReportDetail(asPocketBase(pb), "report-pending", {
      now: NOW,
    });
    expect(pending.report.status).toBe("pending_publish");
    expect(pending.tabs.matching).toEqual({
      frozen: null,
      current: null,
      diff: [],
      configChanged: false,
    });
    // 旧行 / 不存在 → 404。
    await expect(
      loadTalentReportDetail(asPocketBase(pb), "report-legacy"),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      loadTalentReportDetail(asPocketBase(pb), "missing"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("单册叠加层：已发布读冻结快照，待发布实时读基因篇目，非法册 404", async () => {
    const pb = createFixture();
    const v1 = await loadTalentReportVolume(asPocketBase(pb), "report-published", "V1");
    expect(v1).toMatchObject({
      volumeId: "V1",
      bookCode: "A",
      open: true,
      published: true,
      source: "snapshot",
      chapterCount: 1,
      factorCount: 1,
    });
    expect(v1.chapters[0]?.factors[0]).toMatchObject({
      code: "A-01",
      levelCode: "LV3",
      levelName: "优秀",
      note: "固定注解 A-01-LV3",
    });
    // 未开放册后台仍可查看（open=false 标注）。
    const v4 = await loadTalentReportVolume(asPocketBase(pb), "report-published", "V4");
    expect(v4).toMatchObject({ open: false, source: "snapshot", factorCount: 1 });
    // 待发布：按基因报告篇目 + M1 当前值实时展示，零写入。
    const writesBefore = pb.writes;
    const pending = await loadTalentReportVolume(asPocketBase(pb), "report-pending", "V2");
    expect(pending).toMatchObject({ source: "live", published: false, factorCount: 1 });
    expect(pb.writes).toBe(writesBefore);
    await expect(
      loadTalentReportVolume(asPocketBase(pb), "report-published", "V9"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── 3. 发布预览 / 发布 / 撤回 / 恢复 / 补发 / 重算 ───────────────────────────────

describe("M3-B 发布/撤回/恢复/补发/重算状态机与版本链", () => {
  it("发布预览只读零写入；非待发布 409", async () => {
    const pb = createFixture();
    const preview = await buildTalentReportPublishPreview(
      asPocketBase(pb),
      "report-pending",
    );
    expect(preview.factorCount).toBe(2);
    expect(preview.directionCount).toBe(1);
    expect(preview.tierCount).toBe(2);
    expect(preview.volumes).toHaveLength(6);
    expect(preview.volumes[0]).toMatchObject({
      volumeId: "V1",
      selectable: true,
      factorCount: 1,
      reason: "",
    });
    expect(preview.volumes[2]).toMatchObject({
      volumeId: "V3",
      selectable: false,
      reason: "外部暂无此册",
    });
    expect(preview.directionHits[0]).toMatchObject({
      code: "DIR-001",
      hitCount: 1,
      total: 1,
      defaultTierName: "启蒙",
    });
    expect(preview.rules).toContain("发布即冻结");
    expect(pb.writes).toBe(0);
    await expect(
      buildTalentReportPublishPreview(asPocketBase(pb), "report-published"),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("发布：pending → published，v0→v1，冻结快照并写 publish 版本；重复发布 409", async () => {
    const pb = createFixture();
    const result = await publishTalentReport(
      asPocketBase(pb),
      "report-pending",
      ["V1"],
      { userId: "user-1", userName: "管理员示例", now: NOW },
    );
    expect(result.snapshotVersion).toBe(1);
    expect(result.report).toMatchObject({
      status: "published",
      statusLabel: "已发布",
      openVolumeIds: ["V1"],
      openBooksText: "A",
      factorCount: 2,
    });
    expect(result.report.publishedAt).toBe(NOW.toISOString());
    const stored = reportRow(pb, "report-pending");
    expect(stored.status).toBe("published");
    expect(stored.snapshotVersion).toBe(1);
    expect(stored.versions).toHaveLength(1);
    expect(stored.versions?.[0]).toMatchObject({ version: 1, type: "publish", operatorName: "管理员示例" });
    expect(stored.directionSnapshot?.directions[0]?.hitCount).toBe(1);
    expect(stored.factorSnapshot).toHaveLength(2);
    // 未开放册的要素仍在 factorSnapshot（全部外部要素冻结），但 volume open=false。
    expect(stored.volumeSnapshot?.find((volume) => volume.volumeId === "V2")?.open).toBe(false);
    expectNoSensitiveKeys(result);
    // 重复发布 → 409（状态机拒绝，不做静默成功）。
    await expect(
      publishTalentReport(asPocketBase(pb), "report-pending", ["V1"]),
    ).rejects.toMatchObject({ statusCode: 409 });
    // 空册 / 外部未出册 / 重复册 → 422（业务校验先于状态机之外的分支，用新的待发布夹具验证）。
    const pb2 = createFixture();
    await expect(
      publishTalentReport(asPocketBase(pb2), "report-pending", []),
    ).rejects.toMatchObject({ statusCode: 422 });
    await expect(
      publishTalentReport(asPocketBase(pb2), "report-pending", ["V6"]),
    ).rejects.toMatchObject({ statusCode: 422 });
    await expect(
      publishTalentReport(asPocketBase(pb2), "report-pending", ["V1", "V1"]),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("撤回 / 恢复：快照与版本号不变，只追加 withdraw / restore 版本", async () => {
    const pb = createFixture();
    const withdrawn = await withdrawTalentReport(
      asPocketBase(pb),
      "report-published",
      { reason: "外部修订" },
      { userId: "user-1", userName: "管理员示例", now: NOW },
    );
    expect(withdrawn.report.status).toBe("retracted");
    expect(withdrawn.snapshotVersion).toBe(1);
    expect(withdrawn.report.withdrawnAt).toBe(NOW.toISOString());
    const afterWithdraw = reportRow(pb, "report-published");
    expect(afterWithdraw.versions?.at(-1)).toMatchObject({ type: "withdraw", version: 1 });
    expect(String(afterWithdraw.versions?.at(-1)?.summary)).toContain("外部修订");
    // 已撤回不可再次撤回；待发布不可撤回。
    await expect(
      withdrawTalentReport(asPocketBase(pb), "report-published", {}),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      withdrawTalentReport(asPocketBase(pb), "report-pending", {}),
    ).rejects.toMatchObject({ statusCode: 409 });

    const restored = await restoreTalentReport(asPocketBase(pb), "report-published", {
      userId: "user-1",
      userName: "管理员示例",
      now: NOW,
    });
    expect(restored.report.status).toBe("published");
    expect(restored.snapshotVersion).toBe(1);
    expect(restored.report.restoredAt).toBe(NOW.toISOString());
    const afterRestore = reportRow(pb, "report-published");
    expect(afterRestore.versions?.at(-1)).toMatchObject({ type: "restore", version: 1 });
    // 恢复沿用原快照：factorSnapshot 逐字节不变。
    expect(JSON.stringify(afterRestore.factorSnapshot)).toBe(
      JSON.stringify(
        reportRow(createFixture(), "report-published").factorSnapshot,
      ),
    );
    await expect(
      restoreTalentReport(asPocketBase(pb), "report-published"),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("补发预览与补发：只追加新增册，v+1，旧册快照逐项不变", async () => {
    const pb = createFixture();
    const before = reportRow(pb, "report-published");
    const oldFactors = JSON.stringify(before.factorSnapshot?.slice(0, 4));
    const oldVolume = JSON.stringify(before.volumeSnapshot?.[0]);
    // 外部刷新新增 E 册（模拟外部新出分册）。
    const gene = pb.rowsOf("talent_gene_reports").find((row) => row.id === "gene-1")!;
    gene.books = "ABCDE";
    gene.sections = [...SECTIONS];
    gene.sectionCount = 5;

    const preview = await buildTalentReportReissuePreview(
      asPocketBase(pb),
      "report-published",
    );
    expect(preview).toMatchObject({
      externalBooksText: "ABCDE",
      publishedBooksText: "AB",
      newBooksText: "CDE",
      snapshotVersion: 1,
    });
    expect(preview.newVolumes.map((volume) => volume.volumeId)).toEqual([
      "V3",
      "V4",
      "V5",
    ]);

    const result = await reissueTalentReport(asPocketBase(pb), "report-published", {
      userId: "user-1",
      userName: "管理员示例",
      now: NOW,
    });
    expect(result.snapshotVersion).toBe(2);
    expect(result.addedBooks).toEqual(["C", "D", "E"]);
    expect(result.addedVolumeIds).toEqual(["V3", "V4", "V5"]);
    expect(result.report.openVolumeIds).toEqual(["V1", "V2", "V3", "V4", "V5"]);
    const after = reportRow(pb, "report-published");
    expect(after.snapshotVersion).toBe(2);
    expect(JSON.stringify(after.factorSnapshot?.slice(0, 4))).toBe(oldFactors);
    expect(JSON.stringify(after.volumeSnapshot?.[0])).toBe(oldVolume);
    expect(after.versions?.at(-1)).toMatchObject({ type: "reissue", version: 2 });
    // 二次补发无新增 → 409；撤回态补发 → 409。
    await expect(
      reissueTalentReport(asPocketBase(pb), "report-published"),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      reissueTalentReport(asPocketBase(pb), "report-retracted"),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      buildTalentReportReissuePreview(asPocketBase(pb), "report-retracted"),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("显式重算：按当前注解刷新，v+1；regenerateFactorNotes=false 只重算方向；未发布 409", async () => {
    const pb = createFixture();
    const note = pb
      .rowsOf("talent_factor_notes")
      .find((row) => String(row.factorCode) === "A-01")!;
    note.note = "更新后的固定注解";
    const result = await regenerateTalentReportSnapshot(
      asPocketBase(pb),
      "report-published",
      {},
      { userId: "user-1", userName: "管理员示例", now: NOW },
    );
    expect(result.snapshotVersion).toBe(2);
    expect(result.regeneratedAt).toBe(NOW.toISOString());
    const after = reportRow(pb, "report-published");
    expect(after.status).toBe("published");
    expect(after.factorSnapshot?.[0]?.note).toBe("更新后的固定注解");
    expect(after.versions?.at(-1)).toMatchObject({ type: "regenerate", version: 2 });

    note.note = "再次更新";
    const skipNotes = await regenerateTalentReportSnapshot(
      asPocketBase(pb),
      "report-published",
      { regenerateFactorNotes: false },
      { now: NOW },
    );
    expect(skipNotes.snapshotVersion).toBe(3);
    expect(reportRow(pb, "report-published").factorSnapshot?.[0]?.note).toBe(
      "更新后的固定注解",
    );
    await expect(
      regenerateTalentReportSnapshot(asPocketBase(pb), "report-pending"),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("方向预览：冻结 vs 当前 diff 与 configChanged；不写库", async () => {
    const pb = createFixture();
    const before = await buildTalentReportDirectionPreview(
      asPocketBase(pb),
      "report-published",
    );
    expect(before.configChanged).toBe(false);
    expect(before.frozen[0]?.hitCount).toBe(1);
    // 未变化的报告 diff 为空（冻结命中与当前命中一致）。
    expect(before.diff).toEqual([]);
    // 方向配置升级到 v2：要求从 LV3 提高到 LV4 → 当前命中变为 0。
    const direction = pb
      .rowsOf("talent_directions")
      .find((row) => row.id === "dir-1")!;
    direction.version = 2;
    direction.requirements = [{ code: "A-01", level: "LV4" }];
    const writesBefore = pb.writes;
    const after = await buildTalentReportDirectionPreview(
      asPocketBase(pb),
      "report-published",
    );
    expect(after.configChanged).toBe(true);
    expect(after.diff[0]).toMatchObject({
      directionId: "dir-1",
      frozenHitCount: 1,
      currentHitCount: 0,
      removedHits: ["A-01"],
      requirementChanged: true,
    });
    expect(pb.writes).toBe(writesBefore);
  });

  it("recordTalentReportVersion：只追加 selection 版本，不改 snapshotVersion；待发布 409", async () => {
    const pb = createFixture();
    const updated = await recordTalentReportVersion(
      asPocketBase(pb),
      "report-published",
      { summary: "家长选择「舞蹈启蒙」·目标档位 精进", now: NOW },
    );
    expect(updated.snapshotVersion).toBe(1);
    expect(updated.versions?.at(-1)).toMatchObject({
      type: "selection",
      version: 1,
      summary: "家长选择「舞蹈启蒙」·目标档位 精进",
    });
    await expect(
      recordTalentReportVersion(asPocketBase(pb), "report-pending", {
        summary: "选择",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// ── 4. 同步（预演零写入 / 提交日志）与同步日志 ─────────────────────────────────

class CountingSyncStore implements TalentReportSyncStore {
  writes: string[] = [];
  logged: TalentReportSyncLogInput[] = [];

  constructor(public candidates: TalentReportSyncCandidate[]) {}

  async listCandidates(): Promise<TalentReportSyncCandidate[]> {
    return this.candidates;
  }

  async nextReportNo(): Promise<string> {
    return "R202611160009";
  }

  async createGeneReport(): Promise<never> {
    this.writes.push("createGeneReport");
    throw new Error("preview 不应写入");
  }

  async updateGeneReport(): Promise<never> {
    this.writes.push("updateGeneReport");
    throw new Error("preview 不应写入");
  }

  async createReport(): Promise<never> {
    this.writes.push("createReport");
    throw new Error("preview 不应写入");
  }

  async updateReport(): Promise<never> {
    this.writes.push("updateReport");
    throw new Error("preview 不应写入");
  }

  async recordSyncLog(input: TalentReportSyncLogInput): Promise<string> {
    this.writes.push("recordSyncLog");
    this.logged.push(input);
    return "log-1";
  }
}

function fakeSource(): TalentGeneReportSource {
  return {
    source: "mock",
    async fetch() {
      return {
        found: true,
        books: ["A", "B"],
        sections: SECTIONS.filter((section) => ["A", "B"].includes(section.bookCode)),
        issuer: "示例机构",
        filedAt: "2026-11-01",
        sourceVersion: "mock-v1",
      };
    },
  };
}

const SYNC_CANDIDATE: TalentReportSyncCandidate = {
  subjectType: "child",
  subjectId: "child-9",
  parentId: PARENT_ID,
  name: "陈小九",
  gender: "female",
  birthday: "2016-09-08",
  age: 10,
  idNo: "110101201609089999",
  mobile: "13800000009",
  geneReport: null,
  report: null,
};

describe("M3-B 一键同步与同步日志", () => {
  it("同步预演零写入（不建行 / 不改行 / 不写日志）", async () => {
    const store = new CountingSyncStore([SYNC_CANDIDATE]);
    const preview = await previewTalentReportsSync({
      source: fakeSource(),
      store,
      now: NOW,
      operatorId: "user-1",
    });
    expect(preview.mode).toBe("preview");
    expect(preview.counts).toMatchObject({ refreshed: 0, created: 1, empty: 0, failed: 0 });
    expect(preview.details[0]).toMatchObject({
      subjectId: "child-9",
      action: "created",
      booksTotal: "AB",
    });
    expect(store.writes).toEqual([]);
    expect(store.logged).toHaveLength(0);
    // 预演明细不含身份证明文。
    expect(JSON.stringify(preview)).not.toContain("110101201609089999");
  });

  it("同步日志：只读 gene_report 域，映射状态 / 三类计数 / 操作人", async () => {
    const pb = createFixture();
    pb.seed("users", { id: "user-1", displayName: "管理员示例", username: "admin" });
    pb.seed("talent_sync_logs", {
      id: "log-1",
      syncScope: "gene_report",
      mode: "commit",
      status: "partial",
      durationMs: 1234,
      refreshed: 2,
      empty: 1,
      failedCount: 1,
      created: 3,
      operatorId: "user-1",
      finishedAt: AT,
      details: { counts: { refreshed: 2, created: 3, empty: 1, failed: 1 } },
    });
    pb.seed("talent_sync_logs", {
      id: "log-legacy",
      syncScope: "",
      status: "success",
      refreshed: 9,
    });
    const result = await listTalentReportSyncLogs(asPocketBase(pb));
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: "log-1",
      status: "partial",
      statusLabel: "部分成功",
      refreshed: 2,
      created: 3,
      empty: 1,
      failedCount: 1,
      durationMs: 1234,
      operatorName: "管理员示例",
    });
  });
});