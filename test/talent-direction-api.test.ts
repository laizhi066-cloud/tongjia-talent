/**
 * @description M4-B 方向选择 API 路由级测试：后台路由清单与权限映射（list 复用 M1 / merge 新增 F 码 /
 *   preview 与 selection 复用 M3 view）、方案与索引声明、空/存量库脚本只加不删断言、后台方向预览
 *   （推荐 / 0 命中回退 / 诊断 / 零写入）、选择上限 3、换档与取消幂等、自填两步写补偿、归并写 aliases
 *   且不 bump direction.version、别名冲突、转正停用 stub、审计路由源码断言。
 *   不连接真实 PocketBase（内存假实现，数据全部虚构）。口径见 docs/specs/M4-matching/spec.md
 *   §3.5/§3.6/§4.7/§5.2/§5.3/§9 UT-M4-S1~S10 与 ADR 0004-D5。
 * @file test/talent-direction-api.test.ts
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COLLECTION_DEFS,
  FOUNDATION_ACTION_MENU_DEFS,
  FOUNDATION_RBAC_PERMISSION_CODES,
  TALENT_DIRECTION_COLLECTION_NAMES,
  TALENT_DIRECTION_INDEX_DEFS,
  indexNameFromSql,
} from "../scripts/setup.mjs";
import {
  TALENT_DIRECTION_RECOMMEND_LIMIT,
  TALENT_DIRECTION_REQUEST_COLLECTION,
  TALENT_DIRECTION_REQUEST_STATUS_PENDING,
  type TalentMatchDirection,
  type TalentMatchFactor,
  type TalentMatchLevel,
  type TalentMatchTier,
  type TalentSelectionItem,
} from "~~/shared/types/talent-direction";
import {
  TALENT_DIRECTION_ADMIN_ROUTES,
  TALENT_DIRECTION_REQUIRED_PERMISSION_CODES,
  assertTalentDirectionAliasAvailable,
  buildTalentDirectionPreview,
  buildTalentDirectionStubPayload,
  listTalentDirectionRequests,
  normalizeTalentDirectionRequestListQuery,
  talentDirectionMergeSchema,
  talentDirectionPromoteSchema,
  talentDirectionSelectionSchema,
} from "~~/server/utils/talent-direction-api";
import {
  countPendingTalentDirectionRequests,
  mergeTalentDirectionRequest,
  promoteTalentDirectionRequest,
  resolveTalentReportDirectionSelection,
  upsertTalentDirectionRequest,
} from "~~/server/utils/talent-direction-selection";
import { computeTalentDirectionMatches } from "~~/server/utils/talent-direction-match";

const ROOT = resolve(import.meta.dirname, "..");
const TALENT_API_DIR = resolve(ROOT, "server/api/admin/talent");
const AT = "2026-11-16T10:00:00.000Z";

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

// ── 内存 PocketBase：只实现本域用到的读取 / 写入与简单 filter ────────────────────

interface MemoryRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}

function splitTop(text: string, separator: string): string[] {
  return text
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean);
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
    return (
      String(row[equals[1] as string] ?? "") ===
      equals[2]!.replaceAll('\\"', '"')
    );
  const notEmpty = /^(\w+) != ""$/.exec(text);
  if (notEmpty) return String(row[notEmpty[1] as string] ?? "") !== "";
  const like = /^(\w+) ~ "((?:[^"\\]|\\.)*)"$/.exec(text);
  if (like)
    return String(row[like[1] as string] ?? "").includes(
      like[2]!.replaceAll('\\"', '"'),
    );
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
  private failingUpdateCollection = "";
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
      created: String(source.created || timestamp),
      updated: timestamp,
      ...source,
    };
    this.rowsOf(collection).push(record);
    return record;
  }

  /** 模拟下一次指定集合写入失败（自填两步写补偿用例）。 */
  failNextUpdate(collection: string): void {
    this.failingUpdateCollection = collection;
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
          .filter(
            (row) => !options.filter || memoryFilterMatches(row, options.filter),
          )
          .map((row) => ({ ...row })),
      getList: async (
        page: number,
        pageSize: number,
        options: { filter?: string } = {},
      ) => {
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
        if (this.failingUpdateCollection === name) {
          this.failingUpdateCollection = "";
          throw Object.assign(new Error("write failed"), { status: 500 });
        }
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

// ── 虚构夹具：分级 LV1–LV4 启用 + LV9 停用；档位 T1–T3（T3 停用）；方向 DIR-001~005 ────

const LEVELS: TalentMatchLevel[] = [
  { code: "LV1", sortOrder: 1, status: "1", name: "常态" },
  { code: "LV2", sortOrder: 2, status: "1", name: "优良" },
  { code: "LV3", sortOrder: 3, status: "1", name: "优秀" },
  { code: "LV4", sortOrder: 4, status: "1", name: "卓越" },
  { code: "LV9", sortOrder: 9, status: "0", name: "停用分级" },
];

const TIERS: TalentMatchTier[] = [
  {
    id: "t1",
    code: "T1",
    name: "启蒙",
    sortOrder: 1,
    teacher: "普通老师",
    freq: "每周 1–2 次",
    headline: "先让孩子喜欢上",
    status: "1",
    isDefault: true,
    preset: true,
  },
  {
    id: "t2",
    code: "T2",
    name: "养成",
    sortOrder: 2,
    teacher: "资深老师",
    freq: "每周 2 次",
    headline: "把喜欢变成习惯",
    status: "1",
  },
  {
    id: "t3",
    code: "T3",
    name: "精进",
    sortOrder: 3,
    teacher: "卓越老师",
    freq: "每周 2–3 次",
    status: "0",
  },
];

const FACTORS = [
  { code: "E-16", name: "节奏感知", category: "E", categoryName: "艺术商" },
  { code: "F-10", name: "动作模仿", category: "F", categoryName: "体育运动商" },
];

interface DirectionFixture {
  id: string;
  code: string;
  name: string;
  status: string;
  version: number;
  requirements: Array<{ code: string; level: string }>;
  tierIds: string[];
  defaultTierId: string;
  aliases?: string[];
}

const DIRECTIONS: DirectionFixture[] = [
  {
    id: "dir-1",
    code: "DIR-001",
    name: "舞蹈家",
    status: "1",
    version: 1,
    requirements: [
      { code: "E-16", level: "LV3" },
      { code: "F-10", level: "LV2" },
    ],
    tierIds: ["t1", "t2"],
    defaultTierId: "t1",
    aliases: [],
  },
  {
    id: "dir-2",
    code: "DIR-002",
    name: "音乐家",
    status: "1",
    version: 2,
    requirements: [{ code: "E-16", level: "LV4" }],
    tierIds: ["t2"],
    defaultTierId: "t2",
    aliases: ["乐手"],
  },
  {
    id: "dir-3",
    code: "DIR-003",
    name: "逻辑思维",
    status: "0",
    version: 1,
    requirements: [{ code: "E-16", level: "LV2" }],
    tierIds: ["t1"],
    defaultTierId: "t1",
    aliases: [],
  },
  {
    id: "dir-4",
    code: "DIR-004",
    name: "停用分级方向",
    status: "1",
    version: 1,
    requirements: [{ code: "E-16", level: "LV9" }],
    tierIds: ["t1"],
    defaultTierId: "t1",
    aliases: [],
  },
  {
    id: "dir-5",
    code: "DIR-005",
    name: "空配置方向",
    status: "1",
    version: 1,
    requirements: [],
    tierIds: ["t1"],
    defaultTierId: "t1",
    aliases: [],
  },
];

function toMatchDirection(direction: DirectionFixture): TalentMatchDirection {
  return {
    id: direction.id,
    code: direction.code,
    name: direction.name,
    status: direction.status === "1" ? "1" : "0",
    version: direction.version,
    requirements: direction.requirements.map((item) => ({ ...item })),
    tierIds: [...direction.tierIds],
    defaultTierId: direction.defaultTierId,
  };
}

function factorsFromSnapshot(
  items: ReadonlyArray<{ code: string; levelCode: string; levelOrder?: number }>,
): TalentMatchFactor[] {
  return items.map((item) => ({
    code: item.code,
    levelCode: item.levelCode,
    levelOrder: item.levelOrder,
    name: FACTORS.find((factor) => factor.code === item.code)?.name ?? "",
  }));
}

function seedRules(pb: MemoryPocketBase): void {
  for (const factor of FACTORS)
    pb.seed("talent_factors", {
      id: `factor-${factor.code}`,
      ...factor,
    });
  for (const level of LEVELS)
    pb.seed("talent_levels", { id: `level-${level.code}`, ...level });
  pb.seed("talent_factor_notes", {
    id: "note-1",
    factorCode: "E-16",
    levelCode: "LV4",
    note: "固定注解 E-16-LV4",
    status: "1",
  });
  for (const direction of DIRECTIONS)
    pb.seed("talent_directions", {
      ...direction,
      requirements: direction.requirements.map((item) => ({ ...item })),
      tierIds: [...direction.tierIds],
      aliases: [...(direction.aliases ?? [])],
    });
  for (const tier of TIERS) pb.seed("talent_tiers", { ...tier });
}

const FACTOR_SNAPSHOT_FULL = [
  { code: "E-16", levelCode: "LV4", levelOrder: 4 },
  { code: "F-10", levelCode: "LV2", levelOrder: 2 },
] as const;

function buildSnapshot(
  factorSnapshot: ReadonlyArray<{
    code: string;
    levelCode: string;
    levelOrder?: number;
  }>,
) {
  return computeTalentDirectionMatches({
    factors: factorsFromSnapshot(factorSnapshot),
    directions: DIRECTIONS.map(toMatchDirection),
    tiers: TIERS,
    levels: LEVELS,
    version: 1,
    at: AT,
    operatorId: "user-1",
    operatorName: "管理员示例",
  });
}

const PARENT_ID = "parent-1";
const CHILD_ID = "child-1";

function seedMembers(pb: MemoryPocketBase): void {
  pb.seed("talent_parents", {
    id: PARENT_ID,
    parentNo: "P202611160001",
    name: "陈示例",
    mobileCipher: "cipher",
    mobileHash: "hash",
    maskedMobile: "1380****0001",
    maskedIdNo: "1101**********1234",
    status: "1",
    userId: "",
  });
  pb.seed("talent_children", {
    id: CHILD_ID,
    parentId: PARENT_ID,
    name: "陈小一",
    gender: "female",
    birthday: "2016-09-08",
    query: "found",
    status: "1",
  });
}

interface ReportFixtureInput {
  id: string;
  reportNo: string;
  factorSnapshot?: ReadonlyArray<{
    code: string;
    levelCode: string;
    levelOrder?: number;
  }>;
  selections?: TalentSelectionItem[];
  snapshotVersion?: number;
  emptySnapshot?: boolean;
}

function seedReport(pb: MemoryPocketBase, input: ReportFixtureInput): void {
  const factorSnapshot = input.factorSnapshot ?? FACTOR_SNAPSHOT_FULL;
  const snapshot =
    input.emptySnapshot === true
      ? null
      : buildSnapshot(factorSnapshot);
  const version = input.snapshotVersion ?? 1;
  pb.seed("talent_reports", {
    id: input.id,
    reportNo: input.reportNo,
    reportType: "gene_report",
    title: "陈小一·基因报告",
    customerId: "",
    status: "published",
    subjectType: "child",
    subjectId: CHILD_ID,
    parentId: PARENT_ID,
    geneReportId: "gene-1",
    factorCount: factorSnapshot.length,
    totalItems: factorSnapshot.length,
    snapshotVersion: version,
    snapshotAt: AT,
    publishedAt: AT,
    queriedAt: AT,
    openVolumeIds: ["V1"],
    factorSnapshot: factorSnapshot.map((item) => ({
      code: item.code,
      levelCode: item.levelCode,
      levelOrder: item.levelOrder,
      name: FACTORS.find((factor) => factor.code === item.code)?.name ?? "",
      category: "",
      categoryName: "",
      volumeId: "V1",
      bookCode: "",
      chapter: "",
      levelName: "",
      score: 0,
      note: "",
      condition: "",
    })),
    volumeSnapshot: [],
    directionSnapshot: snapshot,
    selections: input.selections ?? [],
    versions: [
      {
        version,
        type: "publish",
        summary: "发布，开放 1 册（A）",
        operatorId: "user-1",
        operatorName: "管理员示例",
        at: AT,
      },
    ],
    restoredAt: "",
  });
}

function createFixture(options: { reportId?: string } = {}): MemoryPocketBase {
  const pb = new MemoryPocketBase();
  seedRules(pb);
  seedMembers(pb);
  pb.seed("users", {
    id: "user-1",
    displayName: "管理员示例",
    username: "admin",
    email: "admin@example.com",
  });
  seedReport(pb, {
    id: options.reportId ?? "report-1",
    reportNo: "R202611160001",
  });
  return pb;
}

function directionRow(pb: MemoryPocketBase, id: string): MemoryRecord {
  return pb
    .rowsOf("talent_directions")
    .find((row) => row.id === id) as MemoryRecord;
}

function selection(
  input: Partial<TalentSelectionItem> & { directionId?: string; requestId?: string },
): TalentSelectionItem {
  return {
    directionId: input.directionId ?? "",
    requestId: input.requestId ?? "",
    custom: input.custom === true,
    tierId: input.tierId ?? "t1",
    directionName: input.directionName ?? "",
    tierName: input.tierName ?? "启蒙",
    teacher: input.teacher ?? "普通老师",
    freq: input.freq ?? "每周 1–2 次",
    manualName: input.manualName ?? "",
    selectedAt: input.selectedAt ?? AT,
  };
}

async function expectHttpError(
  run: () => Promise<unknown>,
  statusCode: number,
  code?: string,
): Promise<void> {
  try {
    await run();
    expect.fail(`应当抛出 HTTP ${statusCode}，但未抛错`);
  } catch (error) {
    const record = error as {
      statusCode?: number;
      status?: number;
      data?: { code?: string };
    };
    expect(record.statusCode ?? record.status).toBe(statusCode);
    if (code) expect(record.data?.code).toBe(code);
  }
}

// ── 1. 路由清单 / 权限映射 / 静态段 / 目录 ──────────────────────────────────────

function collectApiFiles(dir: string, prefix: string): string[] {
  const files: string[] = [];
  const walk = (absolute: string, relative: string) => {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(resolve(absolute, entry.name), nextRelative);
      else if (entry.name.endsWith(".ts")) files.push(`${prefix}/${nextRelative}`);
    }
  };
  if (existsSync(dir)) walk(dir, "");
  return files.sort();
}

describe("M4-B 路由清单与权限映射", () => {
  it("后台路由文件齐全，且只新增本域路由（方向 CRUD / 报告路由不改）", () => {
    const expectedFiles = [
      "directions/preview.get.ts",
      "directions/requests/index.get.ts",
      "directions/requests/[id]/[action].post.ts",
      "direction-requests/index.get.ts",
      "direction-requests/[id]/[action].post.ts",
      "reports/[id]/selection.post.ts",
    ];
    for (const file of expectedFiles)
      expect(existsSync(resolve(TALENT_API_DIR, file)), file).toBe(true);
    for (const route of TALENT_DIRECTION_ADMIN_ROUTES) {
      expect(existsSync(resolve(TALENT_API_DIR, route.file)), route.path).toBe(true);
      const source = read(`server/api/admin/talent/${route.file}`);
      expect(source, route.path).toContain("defineEventHandler");
      expect(source, route.path).toContain(
        `requirePermission(event, "${route.permission}")`,
      );
    }
    // 报告路由文件集合仍为 M3 的 8 个（只新增 selection 静态段，不改 M3 动作聚合文件）。
    expect(collectApiFiles(resolve(TALENT_API_DIR, "reports"), "reports")).toEqual(
      [
        "reports/sync-logs.get.ts",
        "reports/sync.post.ts",
        "reports/[id].get.ts",
        "reports/[id]/[action].get.ts",
        "reports/[id]/[action].post.ts",
        "reports/[id]/selection.post.ts",
        "reports/[id]/volumes/[volumeId].get.ts",
        "reports/index.get.ts",
      ].sort(),
    );
    // 未新增方向 CRUD（M1 已有；M4 只新增 preview / requests 静态段）。
    const directionFiles = collectApiFiles(
      resolve(TALENT_API_DIR, "directions"),
      "directions",
    );
    expect(directionFiles).toEqual(
      [
        "directions/[id].delete.ts",
        "directions/[id].get.ts",
        "directions/[id].put.ts",
        "directions/[id]/status.put.ts",
        "directions/index.get.ts",
        "directions/index.post.ts",
        "directions/preview.get.ts",
        "directions/requests/index.get.ts",
        "directions/requests/[id]/[action].post.ts",
      ].sort(),
    );
  });

  it("权限码：merge 为新增 F 码、list 复用 M1、preview/selection 复用 M3 view", () => {
    const used = [...new Set(TALENT_DIRECTION_ADMIN_ROUTES.map((route) => route.permission))].sort();
    expect(used).toEqual([
      "talent:direction:list",
      "talent:direction:merge",
      "talent:report:view",
    ]);
    for (const code of TALENT_DIRECTION_REQUIRED_PERMISSION_CODES)
      expect(FOUNDATION_RBAC_PERMISSION_CODES).toContain(code);
    // list / view 是 M1/M3 已登记码，M4 不重复登记；merge 必须是 F 按钮行。
    const mergeRows = (
      FOUNDATION_ACTION_MENU_DEFS as Array<
        [string, string, string, { matchByName?: boolean }?]
      >
    ).filter(([, , code]) => code === "talent:direction:merge");
    expect(mergeRows).toHaveLength(1);
    expect(mergeRows[0]![0]).toBe("/admin/talent/rules/direction");
    expect(mergeRows[0]![1]).toBe("待归并方向");
    const setupSource = read("scripts/setup.mjs");
    expect(setupSource).toContain('"talent:direction:merge"');
    // sync-talent 对 merge 缺 F 行做断言（spec §2.2）。
    const syncSource = read("scripts/sync-talent.mjs");
    expect(syncSource).toContain("talent:direction:merge");
    expect(syncSource).toContain("M4_DIRECTION_PERMISSION_CODES");
    // 无新增 C 菜单：方向页仍是 M1 已登记的「培养方向管理」。
    expect(setupSource).not.toContain('path: "/admin/talent/rules/direction-merge"');
  });

  it("写接口具备 validateBody / withOperLog / success，读接口只读无审计", () => {
    for (const route of TALENT_DIRECTION_ADMIN_ROUTES) {
      const source = read(`server/api/admin/talent/${route.file}`);
      expect(source, route.path).toContain("success(");
      if (route.write) {
        expect(source, route.path).toContain("withOperLog");
        expect(source, route.path).toContain("validateBody");
        expect(source, route.path).toContain("OperType.UPDATE");
      } else {
        expect(source, route.path).not.toContain("withOperLog");
        expect(source, route.path).not.toMatch(/\.create\(|\.update\(|\.delete\(/);
      }
    }
    // 归并 / 转正动作聚合文件两个动作键都在。
    for (const file of [
      "direction-requests/[id]/[action].post.ts",
      "directions/requests/[id]/[action].post.ts",
    ]) {
      const source = read(`server/api/admin/talent/${file}`);
      expect(source).toContain("merge:");
      expect(source).toContain("promote:");
      expect(source).toContain('requirePermission(event, "talent:direction:merge")');
    }
    // 选择路由三种动作的审计标题。
    const selectionSource = read("server/api/admin/talent/reports/[id]/selection.post.ts");
    expect(selectionSource).toContain("选择培养方向");
    expect(selectionSource).toContain("更换培养方向档位");
    expect(selectionSource).toContain("取消培养方向");
    expect(selectionSource).not.toMatch(/maskedMobile|mobileCipher|idNoCipher|idNoHash/);
  });

  it("集合定义 / 索引声明与 setup / sync 脚本一致（只加不删）", () => {
    expect(TALENT_DIRECTION_COLLECTION_NAMES).toEqual([
      TALENT_DIRECTION_REQUEST_COLLECTION,
    ]);
    const definition = COLLECTION_DEFS.find(
      (item) => item.name === TALENT_DIRECTION_REQUEST_COLLECTION,
    ) as
      | {
          fields: Array<{ name: string; required?: boolean }>;
          relations?: Array<{ name: string; target: string; required?: boolean }>;
        }
      | undefined;
    expect(definition).toBeTruthy();
    expect(definition!.fields.map((field) => field.name)).toEqual(
      expect.arrayContaining([
        "manualName",
        "tierId",
        "status",
        "targetDirectionId",
        "mergedAt",
        "subjectType",
        "subjectId",
      ]),
    );
    // 转正 stub 需要 requirements=[]：PocketBase 的 required JSON 会把空数组判为 blank，
    // 因此该字段在新库 / 存量库都必须放宽为「可空数组」（M1 保存校验仍要求 ≥1 条）。
    const directionDefinition = COLLECTION_DEFS.find(
      (item) => item.name === "talent_directions",
    ) as { fields: Array<{ name: string; required?: boolean }> } | undefined;
    expect(
      directionDefinition?.fields.find((field) => field.name === "requirements")
        ?.required,
    ).not.toBe(true);
    expect(read("scripts/setup.mjs")).toMatch(
      /name: "requirements", type: "json" \}/,
    );
    expect(read("scripts/sync-talent.mjs")).toContain(
      'field.name !== "requirements"',
    );
    expect(definition!.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "reportId", target: "talent_reports", required: true }),
        expect.objectContaining({ name: "parentId", target: "talent_parents", required: true }),
        expect.objectContaining({ name: "mergedBy", target: "users" }),
        expect.objectContaining({ name: "createdBy", target: "users" }),
      ]),
    );
    const indexDefs = TALENT_DIRECTION_INDEX_DEFS as Array<[string, string]>;
    expect(indexDefs).toHaveLength(4);
    const indexNames = indexDefs
      .map(([, sql]) => indexNameFromSql(sql))
      .sort();
    expect(indexNames).toEqual([
      "idx_talent_direction_requests_parent",
      "idx_talent_direction_requests_pending",
      "idx_talent_direction_requests_report",
      "idx_talent_direction_requests_status",
    ]);
    const pendingSql = indexDefs.find(
      ([, sql]) => indexNameFromSql(sql) === "idx_talent_direction_requests_pending",
    )![1];
    expect(pendingSql).toContain("UNIQUE INDEX");
    expect(pendingSql).toContain("(reportId, manualName)");
    expect(pendingSql).toContain('WHERE status = "待归并"');
    for (const script of ["scripts/setup.mjs", "scripts/sync-talent.mjs"]) {
      const source = read(script);
      if (script === "scripts/setup.mjs") {
        for (const [, sql] of indexDefs)
          expect(source, `${script} 缺少 ${indexNameFromSql(sql)}`).toContain(
            indexNameFromSql(sql) as string,
          );
      } else {
        // 存量库脚本通过共享常量创建同一批索引，避免两处 SQL 漂移。
        expect(source).toContain("TALENT_DIRECTION_INDEX_DEFS");
      }
      expect(source).toContain("talent_direction_requests");
      // 只加不删：新域脚本不得出现删除该集合的语句。
      expect(source).not.toMatch(/collections\.delete\([^)]*talent_direction_requests/);
    }
  });

  it("Zod 契约：归并 / 转正 / 选择三动作最小必填", () => {
    expect(talentDirectionMergeSchema.safeParse({ targetDirectionId: "dir-1" }).success).toBe(true);
    expect(talentDirectionMergeSchema.safeParse({}).success).toBe(false);
    expect(talentDirectionPromoteSchema.safeParse(undefined).success).toBe(true);
    expect(talentDirectionPromoteSchema.safeParse({}).success).toBe(true);
    expect(
      talentDirectionSelectionSchema.safeParse({
        action: "select",
        directionId: "dir-1",
        tierId: "t1",
      }).success,
    ).toBe(true);
    expect(
      talentDirectionSelectionSchema.safeParse({
        action: "select",
        directionId: "dir-1",
      }).success,
    ).toBe(false);
    expect(
      talentDirectionSelectionSchema.safeParse({
        action: "changeTier",
        directionId: "dir-1",
        tierId: "t2",
      }).success,
    ).toBe(true);
    expect(
      talentDirectionSelectionSchema.safeParse({
        action: "cancel",
      }).success,
    ).toBe(false);
    expect(
      talentDirectionSelectionSchema.safeParse({
        action: "select",
        manualName: "冰球",
        tierId: "t1",
      }).success,
    ).toBe(true);
    expect(
      talentDirectionSelectionSchema.safeParse({
        action: "unknown",
        directionId: "dir-1",
      }).success,
    ).toBe(false);
  });

  it("列表查询归一化：默认待归并 / 20 条 / 上限 100，非法状态回默认", () => {
    expect(normalizeTalentDirectionRequestListQuery({})).toEqual({
      keyword: "",
      status: TALENT_DIRECTION_REQUEST_STATUS_PENDING,
      page: 1,
      pageSize: 20,
    });
    expect(
      normalizeTalentDirectionRequestListQuery({
        keyword: " 冰球 ",
        status: "已归并",
        page: "2",
        pageSize: "500",
      }),
    ).toEqual({ keyword: "冰球", status: "已归并", page: 2, pageSize: 100 });
    expect(
      normalizeTalentDirectionRequestListQuery({ status: "非法" }).status,
    ).toBe(TALENT_DIRECTION_REQUEST_STATUS_PENDING);
  });
});

// ── 2. 后台预览 ────────────────────────────────────────────────────────────────

describe("M4-B 后台方向预览（report factorSnapshot）", () => {
  it("按报告冻结要素计算命中、推荐、诊断且零写入", async () => {
    const pb = createFixture();
    const before = pb.writes;
    const preview = await buildTalentDirectionPreview(
      asPocketBase(pb),
      "report-1",
    );
    expect(pb.writes).toBe(before);
    expect(preview).toMatchObject({
      reportId: "report-1",
      reportNo: "R202611160001",
      status: "published",
      snapshotVersion: 1,
      hasSnapshot: true,
      factorCount: 2,
    });
    // 停用方向 dir-3 不评估；启用方向全部返回（含 0 命中 / 空配置）。
    expect(preview.hits.map((hit) => hit.directionId).sort()).toEqual([
      "dir-1",
      "dir-2",
      "dir-4",
      "dir-5",
    ]);
    expect(preview.totalDirections).toBe(5);
    expect(preview.evaluatedDirections).toBe(4);
    const dance = preview.hits.find((hit) => hit.directionId === "dir-1")!;
    expect(dance).toMatchObject({ hitCount: 2, total: 2, hitRate: 1 });
    const music = preview.hits.find((hit) => hit.directionId === "dir-2")!;
    expect(music).toMatchObject({ hitCount: 1, total: 1, hitRate: 1 });
    const empty = preview.hits.find((hit) => hit.directionId === "dir-5")!;
    expect(empty.emptyRequirements).toBe(true);
    expect(empty.total).toBe(0);
    // 推荐按命中数排序且 fallback=false；上限 5。
    expect(preview.recommendation.fallback).toBe(false);
    expect(preview.recommendation.recommendLimit).toBe(TALENT_DIRECTION_RECOMMEND_LIMIT);
    expect(preview.recommendation.items[0]!.directionId).toBe("dir-1");
    expect(preview.recommendation.items.every((item) => item.fallback === false)).toBe(true);
    // 诊断：停用分级 warning + 空配置 warning；响应无敏感字段。
    expect(preview.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["LEVEL_DISABLED", "EMPTY_REQUIREMENTS"]),
    );
    expect(JSON.stringify(preview)).not.toContain("cipher");
    expect(JSON.stringify(preview)).not.toContain("Hash");
  });

  it("要素缺失给出 factorMissing / actualOrder=0 / gap=needOrder", async () => {
    const pb = createFixture();
    const report = pb.rowsOf("talent_reports").find((row) => row.id === "report-1")!;
    report.factorSnapshot = [
      {
        code: "E-16",
        levelCode: "LV4",
        levelOrder: 4,
        name: "节奏感知",
      },
    ];
    report.factorCount = 1;
    const preview = await buildTalentDirectionPreview(asPocketBase(pb), "report-1");
    const dance = preview.hits.find((hit) => hit.directionId === "dir-1")!;
    const missing = dance.requirements.find((item) => item.code === "F-10")!;
    expect(missing).toMatchObject({
      factorMissing: true,
      actualOrder: 0,
      needOrder: 2,
      gap: 2,
      met: false,
    });
    expect(dance.hitCount).toBe(1);
  });

  it("全 0 命中 → fallback=true 且每项标 fallback；无方向 → NO_DIRECTIONS", async () => {
    const pb = createFixture();
    const report = pb.rowsOf("talent_reports").find((row) => row.id === "report-1")!;
    report.factorSnapshot = [];
    report.factorCount = 0;
    const fallback = await buildTalentDirectionPreview(asPocketBase(pb), "report-1");
    expect(fallback.recommendation.fallback).toBe(true);
    expect(fallback.recommendation.items.length).toBeGreaterThan(0);
    expect(
      fallback.recommendation.items.every((item) => item.fallback === true),
    ).toBe(true);

    // 全部方向停用 → 无已评估方向，emptyReason=NO_DIRECTIONS。
    const disabledPb = createFixture();
    for (const row of disabledPb.rowsOf("talent_directions")) row.status = "0";
    const empty = await buildTalentDirectionPreview(
      asPocketBase(disabledPb),
      "report-1",
    );
    expect(empty.noDirections).toBe(true);
    expect(empty.recommendation.items).toEqual([]);
    expect(empty.recommendation.emptyReason).toBe("NO_DIRECTIONS");
  });
});

// ── 3. 选择 / 换档 / 取消 ───────────────────────────────────────────────────────

describe("M4-B 方向选择 / 换档 / 取消", () => {
  it("选择正式方向：冻结名称与默认档位，追加 M3 版本记录但不改 snapshotVersion", async () => {
    const pb = createFixture();
    const before = pb.rowsOf("talent_reports").find((row) => row.id === "report-1")!;
    const versionsBefore = (before.versions as unknown[]).length;
    const result = await resolveTalentReportDirectionSelection(
      asPocketBase(pb),
      "report-1",
      { action: "select", directionId: "dir-1" },
      { userId: "user-1", userName: "管理员示例" },
    );
    expect(result.changed).toBe(true);
    expect(result.selectionCount).toBe(1);
    expect(result.selectionLimit).toBe(3);
    expect(result.selections[0]).toMatchObject({
      directionId: "dir-1",
      custom: false,
      tierId: "t1",
      directionName: "舞蹈家",
      tierName: "启蒙",
      teacher: "普通老师",
      freq: "每周 1–2 次",
    });
    const row = pb.rowsOf("talent_reports").find((item) => item.id === "report-1")!;
    expect((row.versions as unknown[]).length).toBe(versionsBefore + 1);
    expect(Number(row.snapshotVersion)).toBe(1);
  });

  it("重复同档位幂等（alreadySelected，不追加版本）；异档位 409", async () => {
    const pb = createFixture();
    const actor = { userId: "user-1", userName: "管理员示例" };
    await resolveTalentReportDirectionSelection(
      asPocketBase(pb),
      "report-1",
      { action: "select", directionId: "dir-1", tierId: "t1" },
      actor,
    );
    const versionsBefore = (
      pb.rowsOf("talent_reports").find((row) => row.id === "report-1")!
        .versions as unknown[]
    ).length;
    const repeat = await resolveTalentReportDirectionSelection(
      asPocketBase(pb),
      "report-1",
      { action: "select", directionId: "dir-1", tierId: "t1" },
      actor,
    );
    expect(repeat).toMatchObject({ changed: false, alreadySelected: true });
    const versionsAfter = (
      pb.rowsOf("talent_reports").find((row) => row.id === "report-1")!
        .versions as unknown[]
    ).length;
    expect(versionsAfter).toBe(versionsBefore);
    await expectHttpError(
      () =>
        resolveTalentReportDirectionSelection(
          asPocketBase(pb),
          "report-1",
          { action: "select", directionId: "dir-1", tierId: "t2" },
          actor,
        ),
      409,
      "DUPLICATE_SELECTION",
    );
  });

  it("第 4 个选择 409 SELECTION_LIMIT_REACHED（正式 + 自定义共享名额）", async () => {
    const pb = createFixture();
    const report = pb.rowsOf("talent_reports").find((row) => row.id === "report-1")!;
    report.selections = [
      selection({ custom: true, requestId: "req-a", manualName: "甲", tierId: "t1" }),
      selection({ custom: true, requestId: "req-b", manualName: "乙", tierId: "t1" }),
      selection({ custom: true, requestId: "req-c", manualName: "丙", tierId: "t1" }),
    ];
    await expectHttpError(
      () =>
        resolveTalentReportDirectionSelection(
          asPocketBase(pb),
          "report-1",
          { action: "select", directionId: "dir-1", tierId: "t1" },
          { userId: "user-1" },
        ),
      409,
      "SELECTION_LIMIT_REACHED",
    );
  });

  it("换档：更新档位字段、保留方向名称；同档位幂等；非法档位 422", async () => {
    const pb = createFixture();
    const actor = { userId: "user-1", userName: "管理员示例" };
    await resolveTalentReportDirectionSelection(
      asPocketBase(pb),
      "report-1",
      { action: "select", directionId: "dir-1", tierId: "t1" },
      actor,
    );
    const changed = await resolveTalentReportDirectionSelection(
      asPocketBase(pb),
      "report-1",
      { action: "changeTier", directionId: "dir-1", tierId: "t2" },
      actor,
    );
    expect(changed).toMatchObject({ changed: true, selectionCount: 1 });
    expect(changed.selections[0]).toMatchObject({
      directionId: "dir-1",
      directionName: "舞蹈家",
      tierId: "t2",
      tierName: "养成",
      teacher: "资深老师",
    });
    const versionsBefore = (
      pb.rowsOf("talent_reports").find((row) => row.id === "report-1")!
        .versions as unknown[]
    ).length;
    const same = await resolveTalentReportDirectionSelection(
      asPocketBase(pb),
      "report-1",
      { action: "changeTier", directionId: "dir-1", tierId: "t2" },
      actor,
    );
    expect(same).toMatchObject({ changed: false, alreadySelected: true });
    expect(
      (
        pb.rowsOf("talent_reports").find((row) => row.id === "report-1")!
          .versions as unknown[]
      ).length,
    ).toBe(versionsBefore);
    await expectHttpError(
      () =>
        resolveTalentReportDirectionSelection(
          asPocketBase(pb),
          "report-1",
          { action: "changeTier", directionId: "dir-1", tierId: "t3" },
          actor,
        ),
      422,
      "TIER_UNAVAILABLE",
    );
    await expectHttpError(
      () =>
        resolveTalentReportDirectionSelection(
          asPocketBase(pb),
          "report-1",
          { action: "changeTier", requestId: "not-selected", tierId: "t2" },
          actor,
        ),
      404,
      "SELECTION_NOT_FOUND",
    );
  });

  it("取消：移除选择并追加版本；再次取消幂等 changed=false", async () => {
    const pb = createFixture();
    const actor = { userId: "user-1", userName: "管理员示例" };
    await resolveTalentReportDirectionSelection(
      asPocketBase(pb),
      "report-1",
      { action: "select", directionId: "dir-1" },
      actor,
    );
    const canceled = await resolveTalentReportDirectionSelection(
      asPocketBase(pb),
      "report-1",
      { action: "cancel", directionId: "dir-1" },
      actor,
    );
    expect(canceled).toMatchObject({ changed: true, selectionCount: 0 });
    const versionsBefore = (
      pb.rowsOf("talent_reports").find((row) => row.id === "report-1")!
        .versions as unknown[]
    ).length;
    const again = await resolveTalentReportDirectionSelection(
      asPocketBase(pb),
      "report-1",
      { action: "cancel", directionId: "dir-1" },
      actor,
    );
    expect(again).toMatchObject({ changed: false, selectionCount: 0 });
    expect(
      (
        pb.rowsOf("talent_reports").find((row) => row.id === "report-1")!
          .versions as unknown[]
      ).length,
    ).toBe(versionsBefore);
  });

  it("自填方向：生成待归并请求 + 选择项；同名同档位幂等；请求可复用", async () => {
    const pb = createFixture();
    const actor = { userId: "user-1", userName: "管理员示例" };
    const result = await resolveTalentReportDirectionSelection(
      asPocketBase(pb),
      "report-1",
      { action: "select", manualName: " 冰球 ", tierId: "t1" },
      actor,
    );
    expect(result.changed).toBe(true);
    expect(result.requestId).not.toBe("");
    expect(result.selections[0]).toMatchObject({
      custom: true,
      manualName: "冰球",
      requestId: result.requestId,
      tierId: "t1",
    });
    const requests = pb.rowsOf(TALENT_DIRECTION_REQUEST_COLLECTION);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      reportId: "report-1",
      parentId: PARENT_ID,
      subjectType: "child",
      subjectId: CHILD_ID,
      manualName: "冰球",
      tierId: "t1",
      status: TALENT_DIRECTION_REQUEST_STATUS_PENDING,
    });
    expect(await countPendingTalentDirectionRequests(asPocketBase(pb))).toBe(1);

    const repeat = await resolveTalentReportDirectionSelection(
      asPocketBase(pb),
      "report-1",
      { action: "select", manualName: "冰球", tierId: "t1" },
      actor,
    );
    expect(repeat).toMatchObject({ changed: false, alreadySelected: true });
    expect(repeat.requestId).toBe(result.requestId);
    expect(pb.rowsOf(TALENT_DIRECTION_REQUEST_COLLECTION)).toHaveLength(1);

    // 直接重复 upsert：复用旧请求（幂等）。
    const upserted = await upsertTalentDirectionRequest(asPocketBase(pb), {
      report: pb.rowsOf("talent_reports").find((row) => row.id === "report-1") as never,
      manualName: "冰球",
      tierId: "t1",
    });
    expect(upserted.created).toBe(false);
    expect(pb.rowsOf(TALENT_DIRECTION_REQUEST_COLLECTION)).toHaveLength(1);
  });

  it("自填名称校验 422；报告写入失败时删除新建请求（两步写补偿）", async () => {
    const pb = createFixture();
    await expectHttpError(
      () =>
        resolveTalentReportDirectionSelection(
          asPocketBase(pb),
          "report-1",
          { action: "select", manualName: "0123456789A", tierId: "t1" },
          { userId: "user-1" },
        ),
      422,
      "INVALID_MANUAL_NAME",
    );
    expect(pb.rowsOf(TALENT_DIRECTION_REQUEST_COLLECTION)).toHaveLength(0);

    pb.failNextUpdate("talent_reports");
    await expect(
      resolveTalentReportDirectionSelection(
        asPocketBase(pb),
        "report-1",
        { action: "select", manualName: "编程启蒙", tierId: "t1" },
        { userId: "user-1" },
      ),
    ).rejects.toBeTruthy();
    expect(pb.rowsOf(TALENT_DIRECTION_REQUEST_COLLECTION)).toHaveLength(0);
  });
});

// ── 4. 待归并列表 / 归并 / 转正 ─────────────────────────────────────────────────

function seedPendingRequest(
  pb: MemoryPocketBase,
  overrides: Record<string, unknown> = {},
): MemoryRecord {
  return pb.seed(TALENT_DIRECTION_REQUEST_COLLECTION, {
    reportId: "report-1",
    subjectType: "child",
    subjectId: CHILD_ID,
    parentId: PARENT_ID,
    manualName: "冰球",
    tierId: "t1",
    status: TALENT_DIRECTION_REQUEST_STATUS_PENDING,
    targetDirectionId: "",
    ...overrides,
  });
}

describe("M4-B 待归并列表 / 归并 / 转正", () => {
  it("列表默认只看待归并，行视图含报告编号 / 脱敏手机号 / 档位名，关键词可命中家长", async () => {
    const pb = createFixture();
    seedPendingRequest(pb, { id: "req-1", created: "2026-11-16T10:00:00.000Z" });
    seedPendingRequest(pb, {
      id: "req-2",
      manualName: "编程启蒙",
      status: "已归并",
      targetDirectionId: "dir-1",
      created: "2026-11-16T09:00:00.000Z",
    });
    const pendingList = await listTalentDirectionRequests(asPocketBase(pb), {});
    expect(pendingList.total).toBe(1);
    expect(pendingList.rows[0]).toMatchObject({
      id: "req-1",
      reportId: "report-1",
      reportNo: "R202611160001",
      subjectType: "child",
      subjectName: "陈小一",
      parentName: "陈示例",
      maskedMobile: "1380****0001",
      manualName: "冰球",
      tierId: "t1",
      tierName: "启蒙",
      status: "待归并",
      targetDirectionId: "",
      targetDirectionName: "",
    });
    // 不返回手机号 / 身份证原文与 cipher / hash 字段。
    const text = JSON.stringify(pendingList);
    expect(text).not.toContain("13800000001");
    expect(text).not.toContain("110101201609081234");
    expect(text).not.toMatch(/cipher|Hash/);
    // 关键词命中家长姓名 → 返回该家长名下待归并请求。
    const byParent = await listTalentDirectionRequests(asPocketBase(pb), {
      keyword: "陈示",
    });
    expect(byParent.total).toBe(1);
    expect(byParent.rows[0]!.id).toBe("req-1");
    // 关键词命中自填方向。
    const byManual = await listTalentDirectionRequests(asPocketBase(pb), {
      keyword: "冰",
    });
    expect(byManual.rows.map((row) => row.id)).toEqual(["req-1"]);
    // 状态筛选。
    const merged = await listTalentDirectionRequests(asPocketBase(pb), {
      status: "已归并",
    });
    expect(merged.rows.map((row) => row.id)).toEqual(["req-2"]);
    expect(merged.rows[0]!.targetDirectionName).toBe("舞蹈家");
  });

  it("归并写 aliases、请求置已归并、方向 version 不变；历史选择不回写", async () => {
    const pb = createFixture();
    seedPendingRequest(pb, { id: "req-1" });
    pb.seed("talent_reports", {
      ...(pb.rowsOf("talent_reports")[0] as unknown as object),
      id: "report-2",
      reportNo: "R202611160002",
      selections: [
        selection({
          custom: true,
          requestId: "req-1",
          manualName: "冰球",
        }),
      ],
    });
    const result = await mergeTalentDirectionRequest(
      asPocketBase(pb),
      "req-1",
      "dir-1",
      { userId: "user-1", userName: "管理员示例" },
    );
    expect(result.direction).toMatchObject({
      id: "dir-1",
      code: "DIR-001",
      name: "舞蹈家",
      version: 1,
    });
    expect(result.direction.aliases).toEqual(["冰球"]);
    // 方向 version 不 bump（别名不参与命中/版本对照）。
    const direction = directionRow(pb, "dir-1");
    expect(Number(direction.version)).toBe(1);
    expect(result.request).toMatchObject({
      id: "req-1",
      status: "已归并",
      targetDirectionId: "dir-1",
      targetDirectionName: "舞蹈家",
      mergedByName: "管理员示例",
    });
    expect(String(result.request.mergedAt)).not.toBe("");
    // 历史 selections 不回写（仍保留 manualName 冻结值）。
    const report2 = pb.rowsOf("talent_reports").find((row) => row.id === "report-2")!;
    expect((report2.selections as TalentSelectionItem[])[0]).toMatchObject({
      custom: true,
      requestId: "req-1",
      manualName: "冰球",
    });
    expect(await countPendingTalentDirectionRequests(asPocketBase(pb))).toBe(0);
  });

  it("归并幂等：同目标 200、异目标 409；已转正式 409；目标停用 422；目标不存在 404", async () => {
    const pb = createFixture();
    seedPendingRequest(pb, { id: "req-1" });
    const first = await mergeTalentDirectionRequest(
      asPocketBase(pb),
      "req-1",
      "dir-1",
      { userId: "user-1" },
    );
    const again = await mergeTalentDirectionRequest(
      asPocketBase(pb),
      "req-1",
      "dir-1",
      { userId: "user-1" },
    );
    expect(again.direction.id).toBe(first.direction.id);
    expect(again.direction.aliases).toEqual(["冰球"]);
    expect(directionRow(pb, "dir-1").aliases).toEqual(["冰球"]);

    seedPendingRequest(pb, { id: "req-2", manualName: "编程启蒙" });
    await mergeTalentDirectionRequest(asPocketBase(pb), "req-2", "dir-1", {
      userId: "user-1",
    });
    await expectHttpError(
      () =>
        mergeTalentDirectionRequest(asPocketBase(pb), "req-2", "dir-2", {
          userId: "user-1",
        }),
      409,
      "REQUEST_ALREADY_PROCESSED",
    );

    seedPendingRequest(pb, { id: "req-3", manualName: "街舞" });
    await expectHttpError(
      () =>
        mergeTalentDirectionRequest(asPocketBase(pb), "req-3", "dir-3", {
          userId: "user-1",
        }),
      422,
      "TARGET_DIRECTION_DISABLED",
    );
    await expectHttpError(
      () =>
        mergeTalentDirectionRequest(asPocketBase(pb), "req-3", "dir-missing", {
          userId: "user-1",
        }),
      404,
    );
  });

  it("别名唯一：其它方向别名冲突 / 与其它方向名称相同 → 409 ALIAS_CONFLICT", async () => {
    const pb = createFixture();
    // dir-2 已使用别名「乐手」。
    seedPendingRequest(pb, { id: "req-1", manualName: "乐手" });
    await expectHttpError(
      () =>
        mergeTalentDirectionRequest(asPocketBase(pb), "req-1", "dir-1", {
          userId: "user-1",
        }),
      409,
      "ALIAS_CONFLICT",
    );
    // 与其它方向名称相同（dir-2 名称「音乐家」）。
    seedPendingRequest(pb, { id: "req-2", manualName: "音乐家" });
    await expectHttpError(
      () => assertTalentDirectionAliasAvailable(asPocketBase(pb), "音乐家", "dir-1"),
      409,
      "ALIAS_CONFLICT",
    );
    // 目标自身已有同名别名 → 幂等放行。
    await expect(
      assertTalentDirectionAliasAvailable(asPocketBase(pb), "乐手", "dir-2"),
    ).resolves.toBeUndefined();
  });

  it("转正生成停用待配置方向：requirements=[]、档位启用全集、默认档位 ∈ tierIds、DIR-NNN", async () => {
    const pb = createFixture();
    seedPendingRequest(pb, {
      id: "req-1",
      manualName: "编程启蒙",
      tierId: "t2",
    });
    const result = await promoteTalentDirectionRequest(
      asPocketBase(pb),
      "req-1",
      { userId: "user-1", userName: "管理员示例" },
    );
    expect(result.direction).toMatchObject({
      code: "DIR-006",
      name: "编程启蒙",
      status: "0",
      version: 1,
      aliases: [],
    });
    const created = directionRow(pb, result.direction.id);
    expect(created.requirements).toEqual([]);
    expect(created.tierIds).toEqual(["t1", "t2"]);
    expect(created.defaultTierId).toBe("t1");
    expect(created.icon).toBe("编");
    expect(String(created.description)).toContain("编程启蒙");
    expect(result.request).toMatchObject({
      status: "已转正式",
      targetDirectionId: result.direction.id,
      targetDirectionName: "编程启蒙",
    });
    // 幂等：再次转正返回同一方向。
    const again = await promoteTalentDirectionRequest(asPocketBase(pb), "req-1", {
      userId: "user-1",
    });
    expect(again.direction.id).toBe(result.direction.id);
    expect(
      pb.rowsOf("talent_directions").filter((row) => row.name === "编程启蒙"),
    ).toHaveLength(1);
    // 已归并请求不能再转正。
    seedPendingRequest(pb, { id: "req-2", manualName: "街舞" });
    await mergeTalentDirectionRequest(asPocketBase(pb), "req-2", "dir-1", {
      userId: "user-1",
    });
    await expectHttpError(
      () => promoteTalentDirectionRequest(asPocketBase(pb), "req-2", { userId: "user-1" }),
      409,
      "REQUEST_ALREADY_PROCESSED",
    );
  });

  it("转正无启用档位 422 NO_TIER_AVAILABLE；stub 载荷绕过 M1 保存校验", async () => {
    const pb = createFixture();
    seedPendingRequest(pb, { id: "req-1" });
    for (const row of pb.rowsOf("talent_tiers")) row.status = "0";
    await expectHttpError(
      () => promoteTalentDirectionRequest(asPocketBase(pb), "req-1", { userId: "user-1" }),
      422,
      "NO_TIER_AVAILABLE",
    );
    // 纯函数 stub 载荷：停用 / 空要求 / 启用档位全集 / version=1。
    const payload = buildTalentDirectionStubPayload({
      manualName: "冰球",
      code: "DIR-006",
      tierIds: ["t1", "t2"],
      defaultTierId: "t1",
    });
    expect(payload).toMatchObject({
      code: "DIR-006",
      name: "冰球",
      icon: "冰",
      requirements: [],
      tierIds: ["t1", "t2"],
      defaultTierId: "t1",
      aliases: [],
      version: 1,
      status: "0",
    });
    expect(String(payload.description)).toContain("待配置要素与要求分级");
  });

  it("请求不存在 / 空 id 返回 404", async () => {
    const pb = createFixture();
    await expectHttpError(
      () => mergeTalentDirectionRequest(asPocketBase(pb), "missing", "dir-1", {}),
      404,
    );
    await expectHttpError(
      () => promoteTalentDirectionRequest(asPocketBase(pb), "", {}),
      404,
    );
  });

  it("待归并计数 helper 与列表 total 同源（M6 工作台消费）", async () => {
    const pb = createFixture();
    seedPendingRequest(pb, { id: "req-1" });
    seedPendingRequest(pb, { id: "req-2", manualName: "编程启蒙" });
    seedPendingRequest(pb, { id: "req-3", manualName: "街舞", status: "已归并" });
    expect(await countPendingTalentDirectionRequests(asPocketBase(pb))).toBe(2);
    const list = await listTalentDirectionRequests(asPocketBase(pb), { pageSize: "1" });
    expect(list.total).toBe(2);
    expect(list.rows).toHaveLength(1);
  });
});