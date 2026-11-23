/**
 * @description 验证正式天赋专项 PocketBase schema 没有多站点集合，并覆盖业务对象。
 * @file test/foundation-schema.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  COLLECTION_DEFS,
  FOUNDATION_RBAC_PERMISSION_CODES,
  LEGACY_TALENT_COLLECTION_NAMES,
  LEGACY_TALENT_PERMISSION_CODES,
  SCHEMA_VERSION,
} from "../scripts/setup.mjs";

const EXPECTED_COLLECTIONS = [
  "users",
  "roles",
  "menus",
  "depts",
  "posts",
  "dict_types",
  "dict_data",
  "configs",
  "user_roles",
  "role_menus",
  "user_posts",
  "role_depts",
  "login_logs",
  "oper_logs",
  "user_sessions",
  "error_logs",
  "uploads",
  // M1–M5 新域
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
  // M8 PDF
  "talent_report_pdfs",
  "talent_report_source_pdfs",
  "talent_pdf_downloads",
];

describe("foundation PocketBase schema", () => {
  it("仅声明基础集合且不含站点控制平面", () => {
    expect(SCHEMA_VERSION).toBe(1);
    expect(COLLECTION_DEFS.map((definition) => definition.name).sort()).toEqual(
      [...EXPECTED_COLLECTIONS].sort(),
    );
    expect(
      COLLECTION_DEFS.some((definition) => definition.name === "sites"),
    ).toBe(false);
  });

  it("使用关联表表达基础 RBAC，并将字典绑定到字典分类", () => {
    const relationCollections = COLLECTION_DEFS.filter(
      (definition) => definition.relations?.length,
    ).map((definition) => definition.name);

    expect(relationCollections).toEqual(
      expect.arrayContaining([
        "user_roles",
        "role_menus",
        "user_posts",
        "role_depts",
        "dict_data",
      ]),
    );
    const dictData = COLLECTION_DEFS.find(
      (definition) => definition.name === "dict_data",
    );
    expect(dictData?.relations?.[0]?.name).toBe("dictTypeId");
    expect(dictData?.relations?.[0]?.target).toBe("dict_types");
  });

  it("M6 后旧口径集合全部不创建（19 个）", () => {
    const names = COLLECTION_DEFS.map((definition) => definition.name);
    for (const legacy of LEGACY_TALENT_COLLECTION_NAMES)
      expect(names, `${legacy} 必须已从 COLLECTION_DEFS 移除`).not.toContain(legacy);
  });

  it("使用 talent_parents.userId + talent_children.parentId 表达家长与名下子女", () => {
    const children = COLLECTION_DEFS.find(
      (definition) => definition.name === "talent_children",
    );
    expect(children?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "parentId", target: "talent_parents" }),
      ]),
    );
    const parents = COLLECTION_DEFS.find(
      (definition) => definition.name === "talent_parents",
    );
    expect(parents?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "userId", target: "users" }),
      ]),
    );
  });

  it("talent_levels / talent_reports 旧字段与旧索引已移除（M6 规格 §2.2）", () => {
    const levels: any = COLLECTION_DEFS.find(
      (definition) => definition.name === "talent_levels",
    );
    const levelFields = (levels?.fields || []).map((field: any) => field.name);
    for (const legacy of ["elementId", "levelCode", "levelName", "annotation"])
      expect(levelFields).not.toContain(legacy);
    const report: any = COLLECTION_DEFS.find(
      (definition) => definition.name === "talent_reports",
    );
    expect((report?.relations || []).map((relation: any) => relation.name)).not.toContain(
      "customerId",
    );
  });

  it("中性账户具备微信身份与基础资料字段，不携带业务身份", () => {
    const user = COLLECTION_DEFS.find(
      (definition) => definition.name === "users",
    );
    const fieldNames = user?.fields.map((field) => field.name) || [];

    expect(fieldNames).toEqual(
      expect.arrayContaining([
        "displayName",
        "nickname",
        "avatar",
        "phone",
        "gender",
        "birthday",
        "region",
        "bio",
        "openid",
        "unionid",
        "status",
        "forceLogoutAt",
      ]),
    );
    expect(fieldNames).not.toEqual(
      expect.arrayContaining(["memberLevel", "staffId", "userType"]),
    );
    expect(user?.relations?.[0]).toMatchObject({
      name: "deptId",
      target: "depts",
    });
  });

  it("错误日志包含浏览器上报所需的去重与聚合字段", () => {
    const errorLogs = COLLECTION_DEFS.find(
      (definition) => definition.name === "error_logs",
    );
    const fieldNames = errorLogs?.fields.map((field) => field.name) || [];

    expect(fieldNames).toEqual(
      expect.arrayContaining(["fingerprint", "count", "lastSeen", "meta"]),
    );
  });

  it("为每个基础管理 API 权限预置可授予的菜单项", () => {
    expect(FOUNDATION_RBAC_PERMISSION_CODES).toEqual(
      expect.arrayContaining([
        "system:user:list",
        "system:user:query",
        "system:user:add",
        "system:user:edit",
        "system:user:delete",
        "system:user:resetPwd",
        "system:role:list",
        "system:role:query",
        "system:role:add",
        "system:role:edit",
        "system:role:delete",
        "system:menu:list",
        "system:menu:add",
        "system:menu:edit",
        "system:menu:delete",
        "system:dept:list",
        "system:dept:add",
        "system:dept:edit",
        "system:dept:delete",
        "system:post:list",
        "system:post:add",
        "system:post:edit",
        "system:post:delete",
        "system:dict:list",
        "system:dict:add",
        "system:dict:edit",
        "system:dict:delete",
        "system:config:list",
        "system:config:add",
        "system:config:edit",
        "system:config:delete",
        "monitor:error:list",
        "monitor:error:edit",
        "monitor:error:remove",
        "monitor:online:list",
        "monitor:online:forceLogout",
        "system:loginlog:list",
        "system:loginlog:add",
        "system:operlog:list",
      ]),
    );
    expect(FOUNDATION_RBAC_PERMISSION_CODES).not.toContain("talent:content:import");
    // M6：22 个旧权限码必须从在册清单归零（AC-M6-08）。
    for (const legacyCode of LEGACY_TALENT_PERMISSION_CODES)
      expect(FOUNDATION_RBAC_PERMISSION_CODES, legacyCode).not.toContain(legacyCode);
  });
});
