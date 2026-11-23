/**
 * @description M6 旧口径清理静态契约测试（不连真实 PocketBase、不执行删除）：
 *   归零清单 / 新集合白名单 / 35 在册权限码 / 三角色矩阵 / 旧页面与旧路由已删除 /
 *   cleanup-m6 迁移脚本的 dry-run 与备份门槛。验收依据：M6 spec §2 / §5 / §6、ADR 0006-D1/D2。
 * @file test/m6-cleanup-plan.test.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COLLECTION_DEFS,
  FOUNDATION_ACTION_MENU_DEFS,
  FOUNDATION_RBAC_PERMISSION_CODES,
  LEGACY_TALENT_COLLECTION_DELETE_ORDER,
  LEGACY_TALENT_COLLECTION_NAMES,
  LEGACY_TALENT_GROUP_NAMES,
  LEGACY_TALENT_PERMISSION_CODES,
  LEGACY_TALENT_ROLE_KEYS,
  TALENT_BUSINESS_PERMISSION_CODES,
  TALENT_ROLE_DEFS,
} from "../scripts/setup.mjs";

const ROOT = resolve(__dirname, "..");
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const exists = (path: string) => existsSync(resolve(ROOT, path));

/** M6 保留的 `talent_*` 白名单（spec §3.2 + M4-B / M8 新增）。 */
const KEPT_TALENT_COLLECTIONS = [
  "talent_parents",
  "talent_children",
  "talent_levels",
  "talent_gene_reports",
  "talent_reports",
  "talent_sync_logs",
  "talent_reading_progress",
  "talent_factor_libraries",
  "talent_factors",
  "talent_factor_notes",
  "talent_directions",
  "talent_tiers",
  "talent_direction_requests",
  "talent_advice_versions",
  "talent_advice_docs",
  "talent_report_pdfs",
  "talent_pdf_downloads",
];

/** M6 必须为 0 的旧入口（页面 / API 文件）。 */
const LEGACY_FILES = [
  "app/pages/admin/talent/[resource].vue",
  "app/pages/admin/talent/authorization.vue",
  "app/pages/admin/talent/element.vue",
  "app/pages/admin/talent/import.vue",
  "app/pages/admin/talent/institution.vue",
  "app/pages/admin/talent/level.vue",
  "app/pages/admin/talent/library.vue",
  "app/pages/admin/talent/matching.vue",
  "app/pages/admin/talent/plan.vue",
  "app/pages/admin/talent/receive.vue",
  "app/pages/admin/talent/sync.vue",
  "app/pages/org/talent/members.vue",
  "app/pages/org/talent/reports.vue",
  "app/pages/org/talent/plans.vue",
  "app/composables/api/useTalentAdminApi.ts",
  "app/composables/api/useTalentBusinessApi.ts",
  "app/composables/useTalentOrgType.ts",
  "app/utils/talent-admin-presentation.ts",
  "server/api/admin/talent/[resource].get.ts",
  "server/api/admin/talent/[resource].post.ts",
  "server/api/admin/talent/[resource]/[id].get.ts",
  "server/api/admin/talent/report.get.ts",
  "server/api/admin/talent/customer/index.get.ts",
  "server/api/admin/talent/institution/index.get.ts",
  "server/api/admin/talent/authorization.get.ts",
  "server/api/admin/talent/plan/index.get.ts",
  "server/api/admin/talent/plan-selections.get.ts",
  "server/api/admin/talent/template.get.ts",
  "server/api/admin/talent/matching.get.ts",
  "server/api/admin/talent/sync-config.get.ts",
  "server/api/admin/talent/level-copy.post.ts",
  "server/api/admin/talent/level-status.post.ts",
  "server/api/org/talent/context.get.ts",
  "server/api/org/talent/plans.get.ts",
  "server/api/integrations/talent/reports.post.ts",
  "server/api/client/talent/binding.get.ts",
  "server/api/client/talent/plans.get.ts",
  "server/api/client/talent/plan-selections.get.ts",
  "server/api/client/talent/reports/[id]/items.get.ts",
  "server/utils/talent.ts",
  "server/utils/talent-admin.ts",
  "server/utils/talent-business.ts",
  "server/utils/talent-matching.ts",
  "server/utils/talent-report-pdf.ts",
  "server/plugins/talent-report-sync.ts",
  "shared/types/talent-business.ts",
  "shared/types/talent-import.ts",
  "shared/utils/talent-report.ts",
  "scripts/seed-talent.mjs",
];

describe("M6 归零清单（静态）", () => {
  it("19 个旧集合 / 22 个旧权限码 / 4 个旧分组 / 2 个旧角色", () => {
    expect(LEGACY_TALENT_COLLECTION_NAMES).toHaveLength(19);
    expect(LEGACY_TALENT_PERMISSION_CODES).toHaveLength(22);
    expect(LEGACY_TALENT_GROUP_NAMES).toEqual(["工作台", "会员管理", "培养方向", "机构业务"]);
    expect(LEGACY_TALENT_ROLE_KEYS).toEqual(["talent_agent", "talent_service_provider"]);
  });

  it("删除顺序覆盖全部旧集合且每个只出现一次", () => {
    expect(new Set(LEGACY_TALENT_COLLECTION_DELETE_ORDER).size).toBe(19);
    expect([...LEGACY_TALENT_COLLECTION_DELETE_ORDER].sort()).toEqual(
      [...LEGACY_TALENT_COLLECTION_NAMES].sort(),
    );
  });

  it("旧集合与新集合白名单不重叠；初始化定义只含保留集合", () => {
    const legacySet = new Set(LEGACY_TALENT_COLLECTION_NAMES);
    const declared = COLLECTION_DEFS.map((definition: { name: string }) => definition.name);
    for (const kept of KEPT_TALENT_COLLECTIONS) {
      expect(declared, `${kept} 必须保留`).toContain(kept);
      expect(legacySet.has(kept), `${kept} 不得在旧集合清单`).toBe(false);
    }
    for (const legacy of LEGACY_TALENT_COLLECTION_NAMES)
      expect(declared, `${legacy} 必须已删除`).not.toContain(legacy);
  });

  it("旧权限码与新域 35 码不重叠，且不在初始化菜单 / 权限清单", () => {
    const newCodes = new Set(TALENT_BUSINESS_PERMISSION_CODES);
    expect(newCodes.size).toBe(35);
    for (const legacy of LEGACY_TALENT_PERMISSION_CODES) {
      expect(newCodes.has(legacy), `${legacy} 不得出现在新码矩阵`).toBe(false);
      expect(FOUNDATION_RBAC_PERMISSION_CODES, legacy).not.toContain(legacy);
    }
    const menuCodes = new Set<string>(
      (FOUNDATION_ACTION_MENU_DEFS as Array<[string, string, string]>).map(
        ([, , code]) => code,
      ),
    );
    for (const legacy of LEGACY_TALENT_PERMISSION_CODES)
      expect(menuCodes.has(legacy), `${legacy} 不得再有 F 行`).toBe(false);
  });
});

describe("M6 三角色矩阵保留（不随清理回退）", () => {
  it("四类角色：superadmin + 三个业务 roleKey，禁止 platform-operator 重复角色", () => {
    const roleKeys = TALENT_ROLE_DEFS.map((role: { roleKey: string }) => role.roleKey);
    expect(roleKeys).toEqual(["customer-admin", "report-reviewer", "rule-configurator"]);
    expect(roleKeys).not.toContain("platform-operator");
  });

  it("三角色不含系统 / 监控菜单，且权限码都在 35 码内", () => {
    const newCodes = new Set(TALENT_BUSINESS_PERMISSION_CODES);
    for (const role of TALENT_ROLE_DEFS as Array<{
      roleKey: string;
      pagePaths: string[];
      permissionCodes: string[];
    }>) {
      for (const path of role.pagePaths)
        expect(path.startsWith("/admin/talent/"), `${role.roleKey} ${path}`).toBe(true);
      for (const code of role.permissionCodes) {
        expect(newCodes.has(code), `${role.roleKey} ${code}`).toBe(true);
        expect(code.startsWith("talent:"), `${role.roleKey} ${code}`).toBe(true);
      }
    }
  });
});

describe("M6 删除落地（文件不存在）", () => {
  it("旧页面 / 旧 API / 旧 util / 旧种子 / 旧 shared 全部不存在", () => {
    for (const file of LEGACY_FILES) expect(exists(file), file).toBe(false);
  });

  it("旧菜单 path 不再登记在菜单树白名单，机构端前缀整段删除", () => {
    const menuTree = read("app/composables/useMenuTree.ts");
    for (const path of [
      "/admin/talent/customer",
      "/admin/talent/category",
      "/admin/talent/element",
      "/admin/talent/level",
      "/admin/talent/library",
      "/admin/talent/matching",
      "/admin/talent/plan",
      "/admin/talent/receive",
      "/admin/talent/sync",
      "/admin/talent/authorization",
      "/admin/talent/institution",
      "/org/talent",
    ])
      expect(menuTree).not.toContain(`'${path}`);
    expect(menuTree).toContain("'/admin/talent/rules'");
    expect(menuTree).toContain("'/admin/talent/reports'");
    expect(menuTree).not.toContain("TALENT_ORG_PATHS");
  });

  it("旧 C 端 binding / plans 页面与旧路由已删除，新 C 端契约保留", () => {
    for (const file of [
      "apps/client/src/pages/talent/binding.vue",
      "apps/client/src/pages/talent/plans/index.vue",
    ])
      expect(exists(file), file).toBe(false);
    for (const kept of [
      "server/api/client/talent/bindings.get.ts",
      "server/api/client/talent/bindings/claim.post.ts",
      "server/api/client/talent/summary.get.ts",
      "server/api/client/talent/reports/index.get.ts",
      "server/api/client/talent/directions.get.ts",
      "server/api/client/talent/advice.get.ts",
    ])
      expect(exists(kept), kept).toBe(true);
  });

  it("旧 integration 路由已删除，M8 新接入骨架保留", () => {
    expect(exists("server/api/integrations/talent/reports.post.ts")).toBe(false);
    for (const kept of [
      "server/api/integrations/talent/gene-reports/sync.post.ts",
      "server/api/integrations/talent/gene-query/receipts.post.ts",
      "server/api/integrations/talent/advice/sync.post.ts",
    ])
      expect(exists(kept), kept).toBe(true);
  });
});

describe("cleanup-m6 迁移脚本契约（spec §5）", () => {
  const source = read("scripts/cleanup-m6.mjs");

  it("默认 dry-run；真实删除需要 --pb-url / --data-dir / --backup / --confirm-m6", () => {
    expect(source).toContain('const dryRun = !rawArgs["confirm-m6"]');
    expect(source).toContain("--pb-url");
    expect(source).toContain("--data-dir");
    expect(source).toContain("--backup");
    expect(source).toContain("--confirm-m6");
    expect(source).toContain("--dry-run");
    expect(source).toContain("validateBackup");
    expect(source).toContain("sha256");
  });

  it("拒绝清库 / 重置类参数，不调用 setup.mjs 初始化", () => {
    for (const forbidden of ['"force"', '"reset"', '"clean"', '"drop-all"'])
      expect(source).toContain(forbidden);
    expect(source).toContain("不支持 --");
    expect(source).not.toMatch(/setupFoundation\(/);
    expect(source).not.toMatch(/rmSync\(/);
    expect(source).not.toMatch(/unlinkSync\(/);
  });

  it("删除范围只来自归零清单，且显式保护 Foundation / 新域集合", () => {
    expect(source).toContain("LEGACY_TALENT_COLLECTION_DELETE_ORDER");
    expect(source).toContain("PROTECTED_COLLECTIONS");
    for (const protectedName of ["users", "configs", "oper_logs", "login_logs", "uploads"])
      expect(source).toContain(`"${protectedName}"`);
    expect(source).toContain("拒绝删除受保护集合");
  });

  it("产出 dry-run / schema 快照报告，并写 oper_logs 审计", () => {
    expect(source).toContain("m6-schema-before.json");
    expect(source).toContain("m6-cleanup-report.json");
    expect(source).toContain('reportOut');
    expect(source).toContain('collection("oper_logs")');
    expect(source).toContain("pending=0");
  });

  it("package.json 注册 migration:m6，且已移除 talent:seed", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["migration:m6"]).toBe("node scripts/cleanup-m6.mjs");
    expect(pkg.scripts["talent:seed"]).toBeUndefined();
  });
});