/**
 * @description M2-B API 路由级测试：13 条路由清单与权限码映射、静态段优先于旧 `[resource]`、
 *   无导入 / 导出 / 恢复演示数据路由、9 个权限码 ↔ C/F 菜单行与「会员管理」重指向、
 *   响应不含 cipher / hash、GET bindings 只读无写入、claim 六种结果的关键分支、
 *   以及 401/403/404/409/422 的关键错误语义。不连接真实 PocketBase。
 * @file test/talent-member-api.test.ts
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  FOUNDATION_ACTION_MENU_DEFS,
  FOUNDATION_RBAC_PERMISSION_CODES,
} from "../scripts/setup.mjs";
import type {
  TalentChildRecord,
  TalentParentRecord,
} from "~~/shared/types/talent-member";
import {
  claimTalentMemberBinding,
  getTalentMemberBindings,
  listTalentMembers,
  loadTalentMemberDetail,
  normalizeTalentMemberCreateChildren,
  readTalentParentIdNo,
  talentMemberChildCreateSchema,
  talentMemberCreateSchema,
  talentMemberUpdateSchema,
  updateTalentMember,
  createTalentMember,
} from "~~/server/utils/talent-member-api";
import {
  encryptTalentSensitive,
  hashTalentMemberIdNo,
  hashTalentMemberMobile,
  maskTalentIdNo,
  maskTalentMobile,
} from "~~/server/utils/talent-member-crypto";

const ROOT = resolve(import.meta.dirname, "..");
const TALENT_API_DIR = resolve(ROOT, "server/api/admin/talent");
const CLIENT_TALENT_DIR = resolve(ROOT, "server/api/client/talent");

/** M2 会员域 9 个权限码（spec §2.2）。 */
const M2_MEMBER_PERMISSION_CODES = [
  "talent:parent:list",
  "talent:parent:view",
  "talent:parent:add",
  "talent:parent:edit",
  "talent:parent:status",
  "talent:parent:idno",
  "talent:child:edit",
  "talent:child:unbind",
  "talent:child:query",
] as const;

/** 旧会员码必须保留到 M6（ADR 0002-D8）。 */
const LEGACY_CUSTOMER_PERMISSION_CODES = [
  "talent:customer:list",
  "talent:customer:view",
  "talent:customer:add",
  "talent:customer:edit",
  "talent:customer:delete",
  "talent:customer:import",
] as const;

type RouteKind = "list" | "detail" | "json-write" | "action-write" | "id-no";

interface RouteSpec {
  file: string;
  permission: string;
  kind: RouteKind;
}

/** spec §5.2 的 11 条管理路由（文件路径相对 `server/api/admin/talent`）。 */
const M2_ADMIN_ROUTES: RouteSpec[] = [
  { file: "members/index.get.ts", permission: "talent:parent:list", kind: "list" },
  { file: "members/index.post.ts", permission: "talent:parent:add", kind: "json-write" },
  { file: "members/[id].get.ts", permission: "talent:parent:view", kind: "detail" },
  { file: "members/[id].put.ts", permission: "talent:parent:edit", kind: "json-write" },
  { file: "members/[id]/status.put.ts", permission: "talent:parent:status", kind: "json-write" },
  { file: "members/[id]/children.post.ts", permission: "talent:child:edit", kind: "json-write" },
  { file: "members/[id]/id-no.get.ts", permission: "talent:parent:idno", kind: "id-no" },
  { file: "children/[id].put.ts", permission: "talent:child:edit", kind: "json-write" },
  { file: "children/[id]/query.post.ts", permission: "talent:child:query", kind: "action-write" },
  { file: "children/[id]/unbind.post.ts", permission: "talent:child:unbind", kind: "action-write" },
  { file: "children/[id]/id-no.get.ts", permission: "talent:parent:idno", kind: "id-no" },
];

/**
 * spec §5.7 第 3 条的静态段优先探针：spec §5.2 的 13 条路由没有 `GET /children/:id`，
 * 但验收要求 `GET /children/nonexistent` 返回新路由的「子女档案不存在」，
 * 因此额外提供 1 条只读详情路由（不属于 13 条业务路由清单）。
 */
const M2_STATIC_PROBE_ROUTE: RouteSpec = {
  file: "children/[id].get.ts",
  permission: "talent:parent:view",
  kind: "detail",
};

/** spec §5.2 的 2 条 C 端路由。 */
const M2_CLIENT_ROUTES = [
  "talent/bindings.get.ts",
  "talent/bindings/claim.post.ts",
];

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function readRoute(file: string): string {
  return read(`server/api/admin/talent/${file}`);
}

/** 递归收集 members / children 两个新资源目录下的路由文件。 */
function collectMemberRouteFiles(): string[] {
  const files: string[] = [];
  const walk = (absolute: string, relative: string) => {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(resolve(absolute, entry.name), nextRelative);
      else if (entry.name.endsWith(".ts")) files.push(nextRelative);
    }
  };
  for (const dir of ["members", "children"])
    walk(resolve(TALENT_API_DIR, dir), dir);
  return files.sort();
}

/** 递归扫描响应中的键名，确认没有 cipher / hash 字段。 */
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
  for (const key of keys) {
    expect(key).not.toMatch(/Cipher|Hash/);
  }
}

describe("M2-B 路由清单与静态段优先级", () => {
  it("11 条管理路由 + 1 条静态段探针 + 2 条 C 端路由齐全，静态段目录与旧 [resource] 动态路由并存", () => {
    const expectedFiles = [
      ...M2_ADMIN_ROUTES.map((route) => route.file),
      M2_STATIC_PROBE_ROUTE.file,
    ].sort();
    expect(expectedFiles).toHaveLength(12);
    expect(collectMemberRouteFiles()).toEqual(expectedFiles);
    // 13 条业务路由清单（spec §5.2）：11 条管理 + 2 条 C 端。
    expect(M2_ADMIN_ROUTES).toHaveLength(11);
    expect(M2_CLIENT_ROUTES).toHaveLength(2);
    for (const route of M2_ADMIN_ROUTES) {
      expect(existsSync(resolve(TALENT_API_DIR, route.file))).toBe(true);
      expect(readRoute(route.file)).toContain("defineEventHandler");
    }
    for (const file of M2_CLIENT_ROUTES)
      expect(existsSync(resolve(CLIENT_TALENT_DIR, file.replace("talent/", "")))).toBe(true);
    // M6：旧动态路由 / 旧会员 / 旧导入路由已删除，M2 只保留静态段路由。
    expect(existsSync(resolve(TALENT_API_DIR, "[resource].get.ts"))).toBe(false);
    expect(existsSync(resolve(TALENT_API_DIR, "[resource].post.ts"))).toBe(false);
    expect(existsSync(resolve(TALENT_API_DIR, "customer/index.get.ts"))).toBe(false);
    expect(existsSync(resolve(TALENT_API_DIR, "customer/import.post.ts"))).toBe(false);
    // 静态段优先的前提：members 有 index.get.ts；children 不提供列表路由（避免遮蔽旧资源语义）。
    expect(existsSync(resolve(TALENT_API_DIR, "members/index.get.ts"))).toBe(true);
    expect(existsSync(resolve(TALENT_API_DIR, "children/index.get.ts"))).toBe(false);
    // spec §5.7 第 3 条的 GET 探针存在，且不存在时会命中新路由的 404 文案。
    const probeSource = readRoute(M2_STATIC_PROBE_ROUTE.file);
    expect(probeSource).toContain(
      `requirePermission(event, "${M2_STATIC_PROBE_ROUTE.permission}")`,
    );
    expect(probeSource).toContain("getTalentChildOrThrow");
  });

  it("不存在会员导入 / 导出 / 恢复演示数据路由（Q1 / BR-14）", () => {
    const files = collectMemberRouteFiles().join("\n");
    expect(files).not.toMatch(/import|export|restore|reset/i);
    for (const route of M2_ADMIN_ROUTES)
      expect(readRoute(route.file), route.file).not.toContain("readMultipartFormData");
  });

  it("每条管理路由使用 spec §5.2 的权限码，写接口具备 Zod / 审计 / success", () => {
    for (const route of M2_ADMIN_ROUTES) {
      const source = readRoute(route.file);
      expect(source, route.file).toContain(
        `requirePermission(event, "${route.permission}")`,
      );
      if (route.kind === "list") {
        expect(source, route.file).toContain("listTalentMembers");
        expect(source, route.file).not.toContain("withOperLog");
      }
      if (route.kind === "detail") {
        expect(source, route.file).toContain("success(");
        expect(source, route.file).toContain("loadTalentMemberDetail");
      }
      if (route.kind === "json-write") {
        expect(source, route.file).toContain("validateBody");
        expect(source, route.file).toContain("withOperLog");
        expect(source, route.file).toContain("success(");
      }
      if (route.kind === "action-write" || route.kind === "id-no") {
        expect(source, route.file).toContain("withOperLog");
        expect(source, route.file).toContain("success(");
      }
      // 全号接口先鉴权再写日志：requirePermission 必须出现在 withOperLog 之前。
      if (route.kind === "id-no") {
        expect(
          source.indexOf("requirePermission"),
          route.file,
        ).toBeLessThan(source.indexOf("withOperLog"));
      }
    }
  });

  it("C 端 bindings GET 只读、claim POST 显式写入", () => {
    const getSource = read("server/api/client/talent/bindings.get.ts");
    expect(getSource).toContain("getTalentMemberBindings");
    expect(getSource).toContain("getCurrentUserBasic");
    expect(getSource).not.toMatch(/\.create\(|\.update\(|\.delete\(/);
    const claimSource = read("server/api/client/talent/bindings/claim.post.ts");
    expect(claimSource).toContain("claimTalentMemberBinding");
    expect(claimSource).toContain("getCurrentUserBasic");
    expect(claimSource).toContain("claim: { status: result.status }");
  });

  it("超时扫描插件启动 + 定时执行且不阻塞 Nitro 启动", () => {
    const source = read("server/plugins/talent-member-query.ts");
    expect(source).toContain("sweepTalentQueryTimeouts");
    expect(source).toContain("setInterval");
    expect(source).toContain("setTimeout");
    expect(source).toContain("unref");
    expect(source).toContain('hooks.hook("close"');
    expect(source).not.toContain("await sweepTalentQueryTimeouts");
  });
});

describe("M2-B 权限码与菜单登记", () => {
  const memberActionDefs = (
    FOUNDATION_ACTION_MENU_DEFS as Array<[string, string, string]>
  ).filter(([, , code]) =>
    (M2_MEMBER_PERMISSION_CODES as readonly string[]).includes(code),
  );

  it("9 个权限码 = 1 个 C 页面码 + 8 个 F 按钮码，且全部在初始化权限清单内", () => {
    const menuCodes = [
      "talent:parent:list",
      ...memberActionDefs.map(([, , code]) => code),
    ].sort();
    expect(menuCodes).toEqual([...M2_MEMBER_PERMISSION_CODES].sort());
    expect(memberActionDefs).toHaveLength(8);
    for (const code of M2_MEMBER_PERMISSION_CODES)
      expect(FOUNDATION_RBAC_PERMISSION_CODES).toContain(code);
    // M6：旧 talent:customer:* 码必须从在册清单归零（AC-M6-08）。
    const legacyCodes = Array.from(
      new Set(
        (FOUNDATION_RBAC_PERMISSION_CODES as string[]).filter((code) =>
          code.startsWith("talent:customer:"),
        ),
      ),
    );
    expect(legacyCodes).toEqual([]);
    for (const code of LEGACY_CUSTOMER_PERMISSION_CODES)
      expect(FOUNDATION_RBAC_PERMISSION_CODES, code).not.toContain(code);
  });

  it("requirePermission 用到的每个码都有 C 或 F 菜单行，不存在无菜单权限码", () => {
    const menuCodes = new Set<string>([
      "talent:parent:list",
      ...memberActionDefs.map(([, , code]) => code),
    ]);
    const usedCodes = new Set(M2_ADMIN_ROUTES.map((route) => route.permission));
    expect(usedCodes.size).toBe(9);
    for (const code of usedCodes) expect(menuCodes.has(code), code).toBe(true);
    for (const [parentPath] of memberActionDefs)
      expect(parentPath).toBe("/admin/talent/member");
  });

  it("setup.mjs：会员管理 C 菜单指向 /admin/talent/member，旧 customer 行被重指向", () => {
    const source = read("scripts/setup.mjs");
    expect(source).toContain('"admin/talent/member/index.vue"');
    expect(source).toContain('"talent:parent:list"');
    expect(source).toContain('path = "/admin/talent/customer"');
    expect(source).toContain('path: "/admin/talent/member"');
    // 初始化权限清单包含 9 个新码（由上面的 FOUNDATION_RBAC_PERMISSION_CODES 断言覆盖）。
  });

  it("sync-talent.mjs 的菜单对齐与 9 码断言已切到新页", () => {
    const source = read("scripts/sync-talent.mjs");
    expect(source).toContain("M2_MEMBER_PERMISSION_CODES");
    expect(source).not.toContain("M2_LEGACY_CUSTOMER_PERMISSION_CODES");
    expect(source).toContain("LEGACY_TALENT_PERMISSION_CODES");
    // task-15 菜单结构重写：「工作台 / 会员管理」改为一级 C 菜单，第三列 null 表示无父级分组。
    expect(source).toContain('["会员管理", "/admin/talent/member", null]');
    expect(source).not.toContain('["会员管理", "/admin/talent/customer", "会员管理"]');
    expect(source).toContain("memberPageMenus.length !== 1");
    expect(source).toContain('"/admin/talent/member"');
    // M6-A：权限码清单统一由 setup.mjs 的三角色矩阵导出（避免三处漂移），
    // sync 只保留别名与「9 码缺一即失败」断言，不再重复字面量。
    expect(source).toContain(
      "M2_MEMBER_PERMISSION_CODES = TALENT_M2_MEMBER_PERMISSION_CODES",
    );
    expect(source).toContain("missingMemberCodes.length");
    const setupSource = read("scripts/setup.mjs");
    for (const code of M2_MEMBER_PERMISSION_CODES)
      expect(setupSource).toContain(`"${code}"`);
  });

  it("菜单树 TALENT_PATHS 已登记 /admin/talent/member", () => {
    const source = read("app/composables/useMenuTree.ts");
    expect(source).toContain("'/admin/talent/member'");
  });
});

// ── 内存 PocketBase：只实现会员域服务函数用到的方法与简单 filter ─────────────────────

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
      return inner.split(" || ").some((orPart) =>
        memoryFilterMatches(row, orPart),
      );
    }
    const equals = /^(\w+) = "([^"]*)"$/.exec(clause);
    if (equals) return String(row[equals[1] as string] ?? "") === equals[2];
    const notEmpty = /^(\w+) != ""$/.exec(clause);
    if (notEmpty) return String(row[notEmpty[1] as string] ?? "") !== "";
    const like = /^(\w+) ~ "([^"]*)"$/.exec(clause);
    if (like)
      return String(row[like[1] as string] ?? "").includes(like[2] as string);
    return false;
  });
}

class MemoryPocketBase {
  private sequence = 0;
  private store = new Map<string, MemoryRecord[]>();
  /** 写入次数：GET bindings 只读断言用。 */
  writes = 0;
  /** 按集合统计写入次数：区分业务写入与 error_logs 告警写入。 */
  writesByCollection = new Map<string, number>();

  rowsOf(collection: string): MemoryRecord[] {
    if (!this.store.has(collection)) this.store.set(collection, []);
    return this.store.get(collection) as MemoryRecord[];
  }

  countOf(collection: string): number {
    return this.rowsOf(collection).length;
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
      getFullList: async (options: { filter?: string; fields?: string } = {}) =>
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
        this.writesByCollection.set(
          name,
          (this.writesByCollection.get(name) || 0) + 1,
        );
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
        this.writesByCollection.set(
          name,
          (this.writesByCollection.get(name) || 0) + 1,
        );
        const found = rows.find((row) => row.id === id);
        if (!found) throw notFound();
        Object.assign(found, data, { updated: new Date().toISOString() });
        return { ...found };
      },
      delete: async (id: string) => {
        this.writes += 1;
        this.writesByCollection.set(
          name,
          (this.writesByCollection.get(name) || 0) + 1,
        );
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

function buildParentRecord(overrides: Partial<TalentParentRecord> = {}): TalentParentRecord {
  const mobile = "13800000001";
  return {
    id: "parent-1",
    created: "2026-11-16 10:00:00.000Z",
    updated: "2026-11-16 10:00:00.000Z",
    parentNo: "P202611160001",
    name: "陈示例",
    mobileCipher: encryptTalentSensitive(mobile),
    mobileHash: hashTalentMemberMobile(mobile),
    maskedMobile: maskTalentMobile(mobile),
    idNoCipher: encryptTalentSensitive("110101198803121234"),
    idNoHash: hashTalentMemberIdNo("110101198803121234"),
    maskedIdNo: maskTalentIdNo("110101198803121234"),
    gender: "female",
    birthday: "1988-03-12",
    source: "admin",
    status: "1",
    registeredAt: "2026-11-16 10:00:00.000Z",
    remark: "",
    ...overrides,
  };
}

function buildChildRecord(overrides: Partial<TalentChildRecord> = {}): TalentChildRecord {
  return {
    id: "child-1",
    created: "2026-11-16 10:05:00.000Z",
    updated: "2026-11-16 10:05:00.000Z",
    parentId: "parent-1",
    name: "陈小示",
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
  };
}

describe("M2-B 响应脱敏与 C 端 bindings / claim", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY =
      process.env.ENCRYPTION_KEY || "test-encryption-key-32-characters-long";
  });
  afterAll(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  it("列表 / 详情 / bindings 响应递归扫描均无 cipher / hash 键", async () => {
    const pb = new MemoryPocketBase();
    pb.seed("talent_parents", buildParentRecord({ userId: "user-1" }));
    pb.seed("talent_children", buildChildRecord());

    const list = await listTalentMembers(asPocketBase(pb), {});
    expect(list.rows).toHaveLength(1);
    expect(list.rows[0]).toMatchObject({
      parentNo: "P202611160001",
      childCount: 1,
      reportCount: 0,
      statusLabel: "正常",
    });
    expect(list.statusCounts).toEqual({ "1": 1, "0": 0 });
    expect(list.statusTotal).toBe(1);
    expectNoSensitiveKeys(list);

    const detail = await loadTalentMemberDetail(asPocketBase(pb), "parent-1");
    expect(detail.children).toHaveLength(1);
    expect(detail.children[0]).toMatchObject({
      query: "found",
      queryLabel: "已查到",
      reportCount: 0,
    });
    expect(detail.counts).toEqual({ children: 1, reports: 0 });
    expect(detail.account).toEqual({ bound: false });
    expectNoSensitiveKeys(detail);

    const bindings = await getTalentMemberBindings(asPocketBase(pb), "user-1");
    expect(bindings.items[0]).toMatchObject({
      objectType: "self",
      query: null,
      reportAvailable: false,
    });
    expectNoSensitiveKeys(bindings);
  });

  it("GET bindings 只读：连续调用前后行数与 updated 时间不变", async () => {
    const pb = new MemoryPocketBase();
    const parent = pb.seed(
      "talent_parents",
      buildParentRecord({ userId: "user-1" }),
    );
    pb.seed("talent_children", buildChildRecord());
    const parentRowsBefore = JSON.stringify(pb.rowsOf("talent_parents"));
    const childRowsBefore = JSON.stringify(pb.rowsOf("talent_children"));
    const writesBefore = pb.writes;
    for (let index = 0; index < 3; index += 1) {
      const result = await getTalentMemberBindings(asPocketBase(pb), "user-1");
      expect(result.items).toHaveLength(2);
      expect(result.currentId).toBe(parent.id);
      expect(result.currentRelationType).toBe("self");
    }
    expect(pb.writes).toBe(writesBefore);
    expect(JSON.stringify(pb.rowsOf("talent_parents"))).toBe(parentRowsBefore);
    expect(JSON.stringify(pb.rowsOf("talent_children"))).toBe(childRowsBefore);
  });

  it("bindings：家长停用 / 子女解绑后立即消失", async () => {
    const pb = new MemoryPocketBase();
    pb.seed("talent_parents", buildParentRecord({ userId: "user-1", status: "0" }));
    pb.seed("talent_children", buildChildRecord());
    const disabled = await getTalentMemberBindings(asPocketBase(pb), "user-1");
    expect(disabled).toEqual({
      items: [],
      currentId: "",
      current: null,
      currentRelationType: "",
    });

    const pb2 = new MemoryPocketBase();
    pb2.seed("talent_parents", buildParentRecord({ userId: "user-1" }));
    pb2.seed("talent_children", buildChildRecord({ status: "2", parentId: "" }));
    const unbound = await getTalentMemberBindings(asPocketBase(pb2), "user-1");
    expect(unbound.items).toHaveLength(1);
    expect(unbound.items[0]?.objectType).toBe("self");
  });

  it("claim：no_phone / no_match / bound / already_bound 四种无冲突结果", async () => {
    const pb = new MemoryPocketBase();
    const noPhone = await claimTalentMemberBinding(asPocketBase(pb), "user-1", "");
    expect(noPhone.status).toBe("no_phone");
    expect(noPhone.bindings.items).toEqual([]);
    const noMatch = await claimTalentMemberBinding(
      asPocketBase(pb),
      "user-1",
      "13900000000",
    );
    expect(noMatch.status).toBe("no_match");
    expect(pb.writes).toBe(0);

    pb.seed("talent_parents", buildParentRecord());
    pb.seed("talent_children", buildChildRecord());
    const bound = await claimTalentMemberBinding(
      asPocketBase(pb),
      "user-1",
      "13800000001",
    );
    expect(bound.status).toBe("bound");
    expect(bound.bindings.items).toHaveLength(2);
    expect(pb.rowsOf("talent_parents")[0]?.userId).toBe("user-1");
    expect(pb.writes).toBe(1);

    const again = await claimTalentMemberBinding(
      asPocketBase(pb),
      "user-1",
      "13800000001",
    );
    expect(again.status).toBe("already_bound");
    expect(pb.writes).toBe(1);
  });

  it("claim：同号多档 ambiguous 不写；已绑他人 409 conflict", async () => {
    const pb = new MemoryPocketBase();
    pb.seed("talent_parents", buildParentRecord({ id: "parent-1" }));
    pb.seed(
      "talent_parents",
      buildParentRecord({ id: "parent-2", parentNo: "P202611160002" }),
    );
    const ambiguous = await claimTalentMemberBinding(
      asPocketBase(pb),
      "user-1",
      "13800000001",
    );
    expect(ambiguous.status).toBe("ambiguous");
    expect(pb.writesByCollection.get("talent_parents") || 0).toBe(0);
    expect(pb.writesByCollection.get("talent_children") || 0).toBe(0);
    for (const row of pb.rowsOf("talent_parents"))
      expect(String(row.userId || "")).toBe("");

    const pb2 = new MemoryPocketBase();
    pb2.seed("talent_parents", buildParentRecord({ userId: "other-user" }));
    await expect(
      claimTalentMemberBinding(asPocketBase(pb2), "user-1", "13800000001"),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(pb2.writes).toBe(0);
  });
});

describe("M2-B 关键错误码与校验", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY =
      process.env.ENCRYPTION_KEY || "test-encryption-key-32-characters-long";
  });
  afterAll(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  it("404：会员不存在 / 家长未填身份证", async () => {
    const pb = new MemoryPocketBase();
    await expect(
      loadTalentMemberDetail(asPocketBase(pb), "missing"),
    ).rejects.toMatchObject({ statusCode: 404 });
    pb.seed(
      "talent_parents",
      buildParentRecord({ idNoCipher: "", idNoHash: "", maskedIdNo: "" }),
    );
    await expect(
      readTalentParentIdNo(asPocketBase(pb), "parent-1"),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("409：手机号已存在家长档案；422：编辑提交不同会员编号", async () => {
    const pb = new MemoryPocketBase();
    pb.seed("talent_parents", buildParentRecord());
    await expect(
      createTalentMember(
        asPocketBase(pb),
        {
          name: "重复手机号",
          mobile: "13800000001",
          children: [
            {
              name: "子女一",
              gender: "male",
              birthday: "2016-09-08",
              relation: "father",
              idNo: "110101201609081234",
            },
          ],
        },
        { userId: "operator-1" },
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    await expect(
      updateTalentMember(
        asPocketBase(pb),
        "parent-1",
        { parentNo: "P202611160099" },
        { userId: "operator-1" },
      ),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("422：同一请求子女身份证重复、子女数 0 或 >10、Zod 格式错误", () => {
    const duplicateChild = {
      name: "子女一",
      gender: "male",
      birthday: "2016-09-08",
      relation: "father",
      idNo: "110101201609081234",
    };
    expect(() =>
      normalizeTalentMemberCreateChildren([duplicateChild, duplicateChild]),
    ).toThrow(/重复/);

    const child = {
      name: "子女一",
      gender: "male",
      birthday: "2016-09-08",
      relation: "father",
      idNo: "110101201609081234",
    };
    const parent = { name: "家长", mobile: "13800000001" };
    expect(
      talentMemberCreateSchema.safeParse({ ...parent, children: [] }).success,
    ).toBe(false);
    expect(
      talentMemberCreateSchema.safeParse({
        ...parent,
        children: Array.from({ length: 11 }, () => child),
      }).success,
    ).toBe(false);
    expect(
      talentMemberCreateSchema.safeParse({ ...parent, mobile: "123", children: [child] }).success,
    ).toBe(false);
    expect(
      talentMemberChildCreateSchema.safeParse({ ...child, idNo: "123" }).success,
    ).toBe(false);
    expect(
      talentMemberChildCreateSchema.safeParse({ ...child, relation: "sister" }).success,
    ).toBe(false);
    expect(talentMemberUpdateSchema.safeParse({}).success).toBe(false);
    expect(
      talentMemberUpdateSchema.safeParse({ mobile: "" }).success,
    ).toBe(true);
  });
});