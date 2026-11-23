/**
 * @description M1-B API 路由级测试：31 条路由清单与权限码映射、静态段优先于旧 `[resource]`、
 *   只读资源无写路由、导入预览不落库、15 个权限码 ↔ C/F 菜单一一对应、旧分级菜单重指向，
 *   以及关键 Zod / 导出模板格式。不连接 PocketBase。
 * @file test/talent-rule-api.test.ts
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FOUNDATION_ACTION_MENU_DEFS,
  FOUNDATION_RBAC_PERMISSION_CODES,
} from "../scripts/setup.mjs";
import {
  buildTalentFactorNoteExportCsv,
  buildTalentFactorLibraryCsvTemplate,
  buildTalentFactorLibraryExportCsv,
  buildTalentLevelExportCsv,
  TALENT_FACTOR_LIBRARY_CSV_COLUMNS,
  TALENT_FACTOR_NOTE_EXPORT_COLUMNS,
  TALENT_LEVEL_EXPORT_COLUMNS,
  withTalentRulePagination,
} from "~~/server/utils/talent-rule-api";
import {
  syncTalentFactorLibrary,
  talentFactorLibrarySyncSummaryText,
} from "~~/server/utils/talent-rule-sync";
import {
  talentDirectionCreateSchema,
  talentFactorNoteCreateSchema,
  talentFactorLibrarySyncSchema,
  talentLevelCreateSchema,
  talentTierUpdateSchema,
} from "~~/server/utils/talent-rule";

const ROOT = resolve(import.meta.dirname, "..");
const TALENT_API_DIR = resolve(ROOT, "server/api/admin/talent");

/** M1 规则域 15 个权限码（spec §2.1）。 */
const M1_RULE_PERMISSION_CODES = [
  "talent:direction:list",
  "talent:direction:add",
  "talent:direction:edit",
  "talent:direction:delete",
  "talent:factor:list",
  "talent:factor:sync",
  "talent:factor:export",
  "talent:rule:list",
  "talent:rule:add",
  "talent:rule:edit",
  "talent:rule:delete",
  "talent:rule:import",
  "talent:rule:export",
  "talent:tier:list",
  "talent:tier:edit",
] as const;

type RouteKind = "list" | "detail" | "json-write" | "id-write" | "file-write" | "csv" | "preview";

interface RouteSpec {
  file: string;
  permission: string;
  kind: RouteKind;
}

/** spec §5.2 的 31 条路由（文件路径相对 `server/api/admin/talent`）。 */
const M1_RULE_ROUTES: RouteSpec[] = [
  { file: "factor-libraries/index.get.ts", permission: "talent:factor:list", kind: "list" },
  { file: "factor-libraries/sync.post.ts", permission: "talent:factor:sync", kind: "json-write" },
  { file: "factor-libraries/[id]/sync.post.ts", permission: "talent:factor:sync", kind: "id-write" },
  { file: "factors/index.get.ts", permission: "talent:factor:list", kind: "list" },
  { file: "factors/[id].get.ts", permission: "talent:factor:list", kind: "detail" },
  { file: "factors/export.get.ts", permission: "talent:factor:export", kind: "csv" },
  { file: "factors/template.get.ts", permission: "talent:factor:export", kind: "csv" },
  { file: "levels/index.get.ts", permission: "talent:rule:list", kind: "list" },
  { file: "levels/index.post.ts", permission: "talent:rule:add", kind: "json-write" },
  { file: "levels/[id].put.ts", permission: "talent:rule:edit", kind: "json-write" },
  { file: "levels/[id].delete.ts", permission: "talent:rule:delete", kind: "id-write" },
  { file: "levels/template.get.ts", permission: "talent:rule:export", kind: "csv" },
  { file: "levels/export.get.ts", permission: "talent:rule:export", kind: "csv" },
  { file: "levels/import/preview.post.ts", permission: "talent:rule:import", kind: "preview" },
  { file: "levels/import.post.ts", permission: "talent:rule:import", kind: "file-write" },
  { file: "factor-notes/index.get.ts", permission: "talent:rule:list", kind: "list" },
  { file: "factor-notes/index.post.ts", permission: "talent:rule:add", kind: "json-write" },
  { file: "factor-notes/[id].put.ts", permission: "talent:rule:edit", kind: "json-write" },
  { file: "factor-notes/[id].delete.ts", permission: "talent:rule:delete", kind: "id-write" },
  { file: "factor-notes/template.get.ts", permission: "talent:rule:export", kind: "csv" },
  { file: "factor-notes/export.get.ts", permission: "talent:rule:export", kind: "csv" },
  { file: "factor-notes/import/preview.post.ts", permission: "talent:rule:import", kind: "preview" },
  { file: "factor-notes/import.post.ts", permission: "talent:rule:import", kind: "file-write" },
  { file: "directions/index.get.ts", permission: "talent:direction:list", kind: "list" },
  { file: "directions/[id].get.ts", permission: "talent:direction:list", kind: "detail" },
  { file: "directions/index.post.ts", permission: "talent:direction:add", kind: "json-write" },
  { file: "directions/[id].put.ts", permission: "talent:direction:edit", kind: "json-write" },
  { file: "directions/[id]/status.put.ts", permission: "talent:direction:edit", kind: "json-write" },
  { file: "directions/[id].delete.ts", permission: "talent:direction:delete", kind: "id-write" },
  { file: "tiers/index.get.ts", permission: "talent:tier:list", kind: "list" },
  { file: "tiers/[id].put.ts", permission: "talent:tier:edit", kind: "json-write" },
];

const RULE_RESOURCE_DIRS = [
  "factor-libraries",
  "factors",
  "levels",
  "factor-notes",
  "directions",
  "tiers",
];

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function readRoute(file: string): string {
  return read(`server/api/admin/talent/${file}`);
}

/** 递归收集 6 个规则域资源目录下的路由文件。 */
function collectRuleRouteFiles(): string[] {
  const files: string[] = [];
  const walk = (absolute: string, relative: string) => {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(resolve(absolute, entry.name), nextRelative);
      else if (entry.name.endsWith(".ts")) files.push(nextRelative);
    }
  };
  for (const dir of RULE_RESOURCE_DIRS)
    walk(resolve(TALENT_API_DIR, dir), dir);
  return files.sort();
}

describe("M1-B 路由清单与静态段优先级", () => {
  it("31 条规则域路由齐全，静态段路由与旧 [resource] 动态路由并存", () => {
    const expectedFiles = M1_RULE_ROUTES.map((route) => route.file).sort();
    expect(expectedFiles).toHaveLength(31);
    // M4-B 在同一 `directions/` 目录追加后台预览 / 待归并列表与归并转正路由；M1 的 31 条
    // 规则域路由清单与权限语义不变（新增路由不进入 M1_RULE_ROUTES）。
    const m4DirectionRouteFiles = [
      "directions/preview.get.ts",
      "directions/requests/index.get.ts",
      "directions/requests/[id]/[action].post.ts",
    ];
    expect(collectRuleRouteFiles()).toEqual(
      [...expectedFiles, ...m4DirectionRouteFiles].sort(),
    );

    // 每条路由都是独立静态段文件，不依赖旧 `[resource]` 兜底。
    for (const route of M1_RULE_ROUTES) {
      expect(existsSync(resolve(TALENT_API_DIR, route.file))).toBe(true);
      expect(readRoute(route.file)).toContain("defineEventHandler");
    }
    // M6：旧动态路由 / 旧分级页 / 旧资源白名单已删除，规则域只走静态段路由。
    expect(existsSync(resolve(TALENT_API_DIR, "[resource].get.ts"))).toBe(false);
    expect(existsSync(resolve(ROOT, "app/pages/admin/talent/level.vue"))).toBe(false);
    expect(existsSync(resolve(ROOT, "server/utils/talent-admin.ts"))).toBe(false);
    // 6 个资源的根列表路由必须是 index.get.ts（静态段优先于 [resource].get.ts 的前提）。
    for (const dir of RULE_RESOURCE_DIRS)
      expect(existsSync(resolve(TALENT_API_DIR, dir, "index.get.ts"))).toBe(true);
  });

  it("每个路由使用 spec §5.2 的权限码，写接口具备 Zod / 导入解析 + 审计 + success", () => {
    for (const route of M1_RULE_ROUTES) {
      const source = readRoute(route.file);
      expect(source, route.file).toContain(
        `requirePermission(event, "${route.permission}")`,
      );
      if (route.kind === "list") {
        expect(source, route.file).toContain("paginatedQuery");
        expect(source, route.file).toContain("withTalentRulePagination");
        expect(source, route.file).not.toContain("withOperLog");
      }
      if (route.kind === "detail") {
        expect(source, route.file).toContain("success(");
        expect(source, route.file).toContain("statusCode: 404");
      }
      if (route.kind === "csv") {
        // 导出 / 模板要么直接返回 CSV 文本，要么包在 success 中；两者都必须有 return。
        expect(source, route.file).toContain("return");
        expect(
          source.includes("success(") ||
            source.includes("return csv") ||
            source.includes("return buildTalent"),
        ).toBe(true);
      }
      if (route.kind === "json-write") {
        expect(source, route.file).toContain("withOperLog");
        expect(source, route.file).toContain("success(");
        expect(source, route.file).toContain("validateBody");
      }
      // 有 id 的再同步没有请求体，只要求审计 + success。
      if (route.kind === "id-write") {
        expect(source, route.file).toContain("withOperLog");
        expect(source, route.file).toContain("success(");
      }
      if (route.kind === "file-write" || route.kind === "preview") {
        expect(source, route.file).toContain("readTalentRuleCsvRequest");
      }
      if (route.kind === "file-write") {
        expect(source, route.file).toContain("withOperLog");
        expect(source, route.file).toContain("success(");
      }
    }
    // 导出 / 同步 / 导入接口按 spec 记录审计摘要（oper_logs 只记计数，不记正文）。
    for (const file of [
      "factors/export.get.ts",
      "levels/export.get.ts",
      "factor-notes/export.get.ts",
      "levels/import.post.ts",
      "factor-notes/import.post.ts",
      "factor-libraries/sync.post.ts",
      "factor-libraries/[id]/sync.post.ts",
    ]) {
      const source = readRoute(file);
      expect(source, file).toContain("withOperLog");
      expect(source, file).toContain("summary");
    }
    // 模板与导出统一带 BOM 的 CSV 下载头。
    for (const file of [
      "factors/export.get.ts",
      "factors/template.get.ts",
      "levels/export.get.ts",
      "levels/template.get.ts",
      "factor-notes/export.get.ts",
      "factor-notes/template.get.ts",
    ]) {
      expect(readRoute(file), file).toContain("talentRuleDownloadHeaders");
    }
  });

  it("潜质要素只读、档位不提供新增 / 删除（AC-ADM-04-3 / spec §3.6）", () => {
    const factorFiles = collectRuleRouteFiles().filter((file) =>
      file.startsWith("factors/"),
    );
    expect(factorFiles).toEqual([
      "factors/[id].get.ts",
      "factors/export.get.ts",
      "factors/index.get.ts",
      "factors/template.get.ts",
    ]);
    const tierFiles = collectRuleRouteFiles().filter((file) =>
      file.startsWith("tiers/"),
    );
    expect(tierFiles).toEqual(["tiers/[id].put.ts", "tiers/index.get.ts"]);
  });

  it("导入预览不落库；提交导入按行收集失败明细，失败行不写入", () => {
    for (const file of [
      "levels/import/preview.post.ts",
      "factor-notes/import/preview.post.ts",
    ]) {
      const source = readRoute(file);
      expect(source, file).not.toMatch(/\.create\(|\.update\(|\.delete\(/);
      expect(source, file).toContain("return success(");
    }
    for (const file of ["levels/import.post.ts", "factor-notes/import.post.ts"]) {
      const source = readRoute(file);
      expect(source, file).toContain("failures");
      expect(source, file).toContain("rowNumber");
      expect(source, file).toContain("OperType.IMPORT");
    }
  });
});

/** 路由文件 → Nitro 路由路径（去掉方法后缀、index 与动态段括号）。 */
function routePathFromFile(file: string): string {
  const base = file.replace(/\.(get|post|put|delete)\.ts$/, "");
  const segments = base
    .split("/")
    .filter((segment) => segment && segment !== "index")
    .map((segment) => segment.replace(/^\[(.+)\]$/, ":$1"));
  return `/api/admin/talent/${segments.join("/")}`;
}

describe("M1-B Nitro 路由注册（生成清单）", () => {
  const nitroRoutesFile = resolve(ROOT, ".nuxt/types/nitro-routes.d.ts");

  it.skipIf(!existsSync(nitroRoutesFile))(
    "31 条静态段路由全部注册，旧 [resource] 动态路由保留",
    () => {
      const manifest = readFileSync(nitroRoutesFile, "utf8");
      for (const route of M1_RULE_ROUTES) {
        expect(manifest, route.file).toContain(`'${routePathFromFile(route.file)}': {`);
      }
      // M6：旧 `[resource]` 动态路由已删除，生成清单里不得再出现。
      expect(manifest).not.toContain("'/api/admin/talent/:resource': {");
    },
  );
});

describe("M1-B 权限码与菜单登记", () => {
  const pagePermissionCodes = [
    "talent:direction:list",
    "talent:factor:list",
    "talent:rule:list",
  ];
  const ruleActionDefs = (FOUNDATION_ACTION_MENU_DEFS as Array<[string, string, string]>).filter(
    ([, , code]) => (M1_RULE_PERMISSION_CODES as readonly string[]).includes(code),
  );

  it("15 个权限码 = 3 个 C 页面码 + 12 个 F 按钮码，且全部在初始化权限清单内", () => {
    const menuCodes = [
      ...pagePermissionCodes,
      ...ruleActionDefs.map(([, , code]) => code),
    ].sort();
    expect(menuCodes).toEqual([...M1_RULE_PERMISSION_CODES].sort());
    expect(ruleActionDefs).toHaveLength(12);
    for (const code of M1_RULE_PERMISSION_CODES)
      expect(FOUNDATION_RBAC_PERMISSION_CODES).toContain(code);
  });

  it("requirePermission 用到的每个码都有 C 或 F 菜单行，不存在无菜单权限码", () => {
    const menuCodes = new Set<string>([
      ...pagePermissionCodes,
      ...ruleActionDefs.map(([, , code]) => code),
    ]);
    const usedCodes = new Set(M1_RULE_ROUTES.map((route) => route.permission));
    for (const code of usedCodes) expect(menuCodes.has(code), code).toBe(true);
    // 每个 F 按钮码的父级路径必须是三条新 C 菜单之一。
    const pagePaths = new Set([
      "/admin/talent/rules/direction",
      "/admin/talent/rules/factor",
      "/admin/talent/rules/level",
    ]);
    for (const [parentPath] of ruleActionDefs)
      expect(pagePaths.has(parentPath), parentPath).toBe(true);
  });

  it("setup.mjs 登记 3 条规则页 C 菜单（component / 页面权限码 / 培养方向分组）", () => {
    const source = read("scripts/setup.mjs");
    const pageMenus: Array<[string, string, string]> = [
      [
        "/admin/talent/rules/direction",
        "admin/talent/rules/direction.vue",
        "talent:direction:list",
      ],
      ["/admin/talent/rules/factor", "admin/talent/rules/factor.vue", "talent:factor:list"],
      ["/admin/talent/rules/level", "admin/talent/rules/level.vue", "talent:rule:list"],
    ];
    for (const [path, component, code] of pageMenus) {
      expect(source).toContain(`"${path}"`);
      expect(source).toContain(`"${component}"`);
      expect(source).toContain(`"${code}"`);
    }
    // M6：旧的「培养方向」一级分组已删除，培养方向管理并入「天赋规则」。
    expect(source).toContain('menuName = "天赋规则"');
    expect(source).not.toContain('menuName = "培养方向"');
    // 「分级与固定注解」只允许在 C 菜单定义中出现一次，旧菜单行被迁移而不是新增。
    // M6-A：页面菜单定义提升为 setup.mjs 导出常量 TALENT_PAGE_MENU_DEFS（三角色矩阵 / 单测共用）。
    const talentMenusBlock = source.slice(
      source.indexOf("export const TALENT_PAGE_MENU_DEFS = ["),
      source.indexOf("export const TALENT_ROLE_DEFS"),
    );
    expect(talentMenusBlock.match(/"分级与固定注解"/g)).toHaveLength(1);
    expect(talentMenusBlock).toContain('"admin/talent/rules/level.vue"');
    expect(talentMenusBlock).not.toContain('"/admin/talent/level"');
    // 迁移逻辑：按旧菜单名定位并重指向新页（保 role_menus 关联）。
    expect(source).toContain(
      'menuType = "C" && menuName = "分级与固定注解" && path != "/admin/talent/rules/level"',
    );
    expect(source).toContain('permissionCode: "talent:rule:list"');
  });

  it("sync-talent.mjs 对存量库校验 15 个权限码与旧菜单唯一指向", () => {
    const source = read("scripts/sync-talent.mjs");
    expect(source).toContain("M1_RULE_PERMISSION_CODES");
    expect(source).toContain(
      "M1_RULE_PERMISSION_CODES = TALENT_M1_RULE_PERMISSION_CODES",
    );
    // 15 个码的字面量集中在 setup.mjs 的角色矩阵 / 菜单定义中，sync 只引用别名。
    const setupSource = read("scripts/setup.mjs");
    for (const code of M1_RULE_PERMISSION_CODES)
      expect(setupSource).toContain(`"${code}"`);
    expect(source).toContain("ruleLevelMenus.length !== 1");
    expect(source).toContain('"/admin/talent/rules/level"');
  });
});

describe("M1-B 关键 Zod", () => {
  it("分库同步只接受 male/female 与 0–18 整数年龄", () => {
    expect(talentFactorLibrarySyncSchema.safeParse({ gender: "male", age: 0 }).success).toBe(true);
    expect(talentFactorLibrarySyncSchema.safeParse({ gender: "female", age: 18 }).success).toBe(true);
    expect(talentFactorLibrarySyncSchema.safeParse({ gender: "other", age: 0 }).success).toBe(false);
    expect(talentFactorLibrarySyncSchema.safeParse({ gender: "male", age: 19 }).success).toBe(false);
    expect(talentFactorLibrarySyncSchema.safeParse({ gender: "male", age: 1.5 }).success).toBe(false);
  });

  it("分级编码 / 名称 / 级序 / 色位按 spec §5.3 校验", () => {
    expect(
      talentLevelCreateSchema.safeParse({ code: "LV1", name: "常态", sortOrder: 1 }).success,
    ).toBe(true);
    expect(talentLevelCreateSchema.safeParse({ code: "L1", name: "常态", sortOrder: 1 }).success).toBe(
      false,
    );
    expect(talentLevelCreateSchema.safeParse({ code: "LV1", name: "", sortOrder: 1 }).success).toBe(
      false,
    );
    expect(talentLevelCreateSchema.safeParse({ code: "LV1", name: "常态", sortOrder: 5 }).success).toBe(
      false,
    );
    expect(
      talentLevelCreateSchema.safeParse({
        code: "LV1",
        name: "常态",
        sortOrder: 1,
        tone: "error",
      }).success,
    ).toBe(false);
  });

  it("方向 1–50 项要素、档位 1–4、默认档位必填、编码大写", () => {
    const valid = {
      name: "舞蹈家",
      requirements: [{ code: "E-16", level: "LV3" }],
      tierIds: ["t1"],
      defaultTierId: "t1",
    };
    expect(talentDirectionCreateSchema.safeParse(valid).success).toBe(true);
    expect(
      talentDirectionCreateSchema.safeParse({ ...valid, requirements: [] }).success,
    ).toBe(false);
    expect(
      talentDirectionCreateSchema.safeParse({
        ...valid,
        requirements: Array.from({ length: 51 }, (_, index) => ({
          code: `A-${index}`,
          level: "LV1",
        })),
      }).success,
    ).toBe(false);
    expect(talentDirectionCreateSchema.safeParse({ ...valid, tierIds: [] }).success).toBe(false);
    expect(talentDirectionCreateSchema.safeParse({ ...valid, defaultTierId: "" }).success).toBe(
      false,
    );
    expect(talentDirectionCreateSchema.safeParse({ ...valid, code: "dir001" }).success).toBe(false);
  });

  it("固定注解要素 / 分级必填，正文 ≤2000，性别条件枚举", () => {
    expect(
      talentFactorNoteCreateSchema.safeParse({ factorCode: "A-01", levelCode: "LV1" }).success,
    ).toBe(true);
    expect(
      talentFactorNoteCreateSchema.safeParse({ factorCode: "", levelCode: "LV1" }).success,
    ).toBe(false);
    expect(
      talentFactorNoteCreateSchema.safeParse({ factorCode: "A-01", levelCode: "1" }).success,
    ).toBe(false);
    expect(
      talentFactorNoteCreateSchema.safeParse({
        factorCode: "A-01",
        levelCode: "LV1",
        note: "x".repeat(2001),
      }).success,
    ).toBe(false);
    expect(
      talentFactorNoteCreateSchema.safeParse({
        factorCode: "A-01",
        levelCode: "LV1",
        gender: "未知",
      }).success,
    ).toBe(false);
  });

  it("档位 PUT 至少一个字段，状态仅 0/1", () => {
    expect(talentTierUpdateSchema.safeParse({}).success).toBe(false);
    expect(talentTierUpdateSchema.safeParse({ status: "2" }).success).toBe(false);
    expect(talentTierUpdateSchema.safeParse({ name: "启蒙" }).success).toBe(true);
    expect(talentTierUpdateSchema.safeParse({ isDefault: true }).success).toBe(true);
  });
});

describe("M1-B 列表分页与导出格式", () => {
  it("列表默认每页 20 条、上限 100 条", () => {
    expect(withTalentRulePagination({}).pageSize).toBe("20");
    expect(withTalentRulePagination({ pageSize: "5" }).pageSize).toBe("5");
    expect(withTalentRulePagination({ pageSize: "999" }).pageSize).toBe("100");
    expect(withTalentRulePagination({ pageSize: "0" }).pageSize).toBe("20");
  });

  it("文库模板为 9 列 + 1 行示例，且带 BOM", () => {
    const template = buildTalentFactorLibraryCsvTemplate();
    expect(template.startsWith("\uFEFF")).toBe(true);
    const lines = template.replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]?.split(",")).toEqual([...TALENT_FACTOR_LIBRARY_CSV_COLUMNS]);
    expect(lines[0]).toContain("序号,年龄,分册,潜质要素,数据熵");
  });

  it("文库导出按 要素 × 分级 × 变体 出行，四段齐全并转义逗号", () => {
    const csv = buildTalentFactorLibraryExportCsv({
      gender: "male",
      age: 0,
      levels: [
        { code: "LV1", name: "常态", sortOrder: 1 },
        { code: "LV2", name: "优良", sortOrder: 2 },
      ],
      factors: [
        {
          code: "A-01",
          name: "测试要素,含逗号",
          category: "A",
          categoryName: "生长发育",
          sortOrder: 1,
          slots: {
            LV1: [
              { content: "内容1", example: "举例1", direction: "方向1", suggestion: "建议1" },
              { content: "", example: "", direction: "", suggestion: "" },
              { content: "", example: "", direction: "", suggestion: "" },
            ],
          },
        },
        {
          code: "A-02",
          name: "要素二",
          category: "A",
          categoryName: "生长发育",
          sortOrder: 2,
          slots: {},
        },
      ],
    });
    const lines = csv.replace(/^\uFEFF/, "").trimEnd().split("\r\n");
    // 表头 + 2 要素 × 2 分级 × 3 变体
    expect(lines).toHaveLength(1 + 2 * 2 * 3);
    expect(lines[0]).toContain("数据熵");
    expect(lines[1]).toContain('"测试要素,含逗号"');
    expect(lines[1]).toContain("A 生长发育");
    expect(lines[1]).toContain("常态");
    expect(lines[1]).toContain("内容1");
  });

  it("固定注解导出 9 列、分级导出 7 列（含固定注解数）", () => {
    expect(TALENT_FACTOR_NOTE_EXPORT_COLUMNS).toHaveLength(9);
    expect(TALENT_LEVEL_EXPORT_COLUMNS).toHaveLength(7);
    const noteCsv = buildTalentFactorNoteExportCsv([
      {
        code: "A-01-LV1",
        factorCode: "A-01",
        factorName: "生长发育能力",
        levelCode: "LV1",
        levelName: "常态",
        note: '含"引号"与,逗号',
        ageRange: "0 岁",
        gender: "通用",
        status: "1",
      },
    ]);
    expect(noteCsv.startsWith("\uFEFF")).toBe(true);
    expect(noteCsv.replace(/^\uFEFF/, "").split("\r\n")[0]).toBe(
      TALENT_FACTOR_NOTE_EXPORT_COLUMNS.join(","),
    );
    expect(noteCsv).toContain('"含""引号""与,逗号"');
    const levelCsv = buildTalentLevelExportCsv([
      {
        code: "LV1",
        name: "常态",
        sortOrder: 1,
        range: "0–59",
        tone: "default",
        status: "1",
        noteCount: 158,
      },
    ]);
    expect(levelCsv.replace(/^\uFEFF/, "").split("\r\n")[1]).toBe(
      "LV1,常态,1,0–59,default,启用,158",
    );
  });

  it("同步摘要只包含计数，不包含文库正文", () => {
    const text = talentFactorLibrarySyncSummaryText({
      libraryId: "lib-1",
      gender: "male",
      age: 0,
      itemCount: 158,
      slotTotal: 1896,
      filledCount: 27,
      partialCount: 0,
      created: 0,
      updated: 0,
      unchanged: 158,
    });
    expect(text).toContain("男 · 0 岁");
    expect(text).toContain("要素 158");
    expect(text).toContain("完整槽位 27");
    expect(text).toContain("部分回填 0");
    expect(text).not.toContain("分级内容");
  });
});
// ── 分库同步入口的内存 PocketBase 桩：验证「无 id 首同步 → upsert 分库 + 写要素」与「再同步幂等」 ──

interface MemoryRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}

/** 只实现同步入口用到的集合方法：getOne / getFirstListItem / getFullList / create / update / delete。 */
class MemoryPocketBase {
  private sequence = 0;
  private store = new Map<string, MemoryRecord[]>();

  rowsOf(collection: string): MemoryRecord[] {
    if (!this.store.has(collection)) this.store.set(collection, []);
    return this.store.get(collection) as MemoryRecord[];
  }

  countOf(collection: string): number {
    return this.rowsOf(collection).length;
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
      create: async (data: Record<string, unknown>) => {
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
        const found = rows.find((row) => row.id === id);
        if (!found) throw notFound();
        Object.assign(found, data, { updated: new Date().toISOString() });
        return { ...found };
      },
      delete: async (id: string) => {
        const index = rows.findIndex((row) => row.id === id);
        if (index < 0) throw notFound();
        rows.splice(index, 1);
      },
    };
  }
}

/** 支持同步入口使用的简单 filter：`field = "value"`、`field = 0`、`field != ""` 与 &&。 */
function memoryFilterMatches(row: MemoryRecord, filter: string): boolean {
  return filter.split(" && ").every((clause) => {
    const text = /^(\w+) = "([^"]*)"$/.exec(clause);
    if (text) return String(row[text[1] as string] ?? "") === text[2];
    const number = /^(\w+) = (-?\d+)$/.exec(clause);
    if (number) return Number(row[number[1] as string] ?? 0) === Number(number[2]);
    const notEmpty = /^(\w+) != ""$/.exec(clause);
    if (notEmpty) return String(row[notEmpty[1] as string] ?? "") !== "";
    return false;
  });
}

function createMemoryPb() {
  const pb = new MemoryPocketBase();
  return { pb, client: pb as unknown as import("pocketbase").default };
}

describe("M1-B 分库同步入口（内存 PocketBase）", () => {
  it("库不存在时首同步：按 gender+age 建库并写入 158 要素，计数 27 / 1896", async () => {
    const { pb, client } = createMemoryPb();
    const summary = await syncTalentFactorLibrary(
      client,
      { gender: "male", age: 0 },
      { syncedBy: "user-1" },
    );
    expect(summary.itemCount).toBe(158);
    expect(summary.slotTotal).toBe(1896);
    expect(summary.filledCount).toBe(27);
    expect(summary.partialCount).toBe(0);
    expect(summary.created).toBe(158);
    expect(pb.countOf("talent_factor_libraries")).toBe(1);
    expect(pb.countOf("talent_factors")).toBe(158);
    const library = pb.rowsOf("talent_factor_libraries")[0];
    expect(library?.gender).toBe("male");
    expect(Number(library?.age)).toBe(0);
    expect(Number(library?.filledCount)).toBe(27);
    expect(String(library?.syncedBy)).toBe("user-1");
    expect(String(library?.syncedAt || "")).not.toBe("");
  });

  it("同库二次同步幂等：不新增分库 / 要素，内容未变不写库", async () => {
    const { pb, client } = createMemoryPb();
    await syncTalentFactorLibrary(client, { gender: "male", age: 0 });
    const libraryId = String(pb.rowsOf("talent_factor_libraries")[0]?.id || "");
    const again = await syncTalentFactorLibrary(client, { gender: "male", age: 0 });
    expect(again.created).toBe(0);
    expect(again.updated).toBe(0);
    expect(again.unchanged).toBe(158);
    expect(pb.countOf("talent_factor_libraries")).toBe(1);
    expect(pb.countOf("talent_factors")).toBe(158);
    // 有 id 再同步入口：要求已同步过，仍幂等。
    const resync = await syncTalentFactorLibrary(
      client,
      { gender: "male", age: 0 },
      { libraryId, requireExistingSynced: true },
    );
    expect(resync.created).toBe(0);
    expect(resync.unchanged).toBe(158);
    expect(pb.countOf("talent_factors")).toBe(158);
  });

  it("未同步分库禁止再同步（409）；库不存在（404）；性别年龄不一致（422）", async () => {
    const { pb, client } = createMemoryPb();
    const library = await client
      .collection("talent_factor_libraries")
      .create({ gender: "female", age: 5, itemCount: 0, slotTotal: 0, filledCount: 0, status: "1" });
    await expect(
      syncTalentFactorLibrary(
        client,
        { gender: "female", age: 5 },
        { libraryId: library.id, requireExistingSynced: true },
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      syncTalentFactorLibrary(
        client,
        { gender: "male", age: 0 },
        { libraryId: "missing", requireExistingSynced: true },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      syncTalentFactorLibrary(
        client,
        { gender: "male", age: 1 },
        { libraryId: library.id, requireExistingSynced: true },
      ),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(pb.countOf("talent_factors")).toBe(0);
  });
});
