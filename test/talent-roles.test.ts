/**
 * @description M6-A 三角色与工作台拆码（纯单测，不连接 PocketBase）：
 *   - 工作台 `talent:dashboard:list` 拆分（C 菜单 / F 行 / dashboard 接口三处同码，基因报告保持 report:list）；
 *   - 平台运营（customer-admin 存量角色升级）/ 报告审核员 / 规则配置员 × 菜单 / 权限码矩阵；
 *   - 系统管理与运行监控仅 superAdmin；旧码 / 旧角色不丢（M6-A 只加权限，不删旧资产）。
 *   依据：docs/specs/M6-cleanup/spec.md §6、docs/adr/0006-m6-cleanup-and-roles.md D3。
 * @file test/talent-roles.test.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FOUNDATION_ACTION_MENU_DEFS,
  FOUNDATION_RBAC_PERMISSION_CODES,
  SYSTEM_AND_MONITOR_GROUP_NAMES,
  SYSTEM_AND_MONITOR_MENU_PATHS,
  TALENT_BUSINESS_PAGE_PATHS,
  TALENT_BUSINESS_PERMISSION_CODES,
  TALENT_DASHBOARD_PERMISSION_CODE,
  TALENT_M1_RULE_PERMISSION_CODES,
  TALENT_M2_MEMBER_PERMISSION_CODES,
  TALENT_M3_REPORT_PERMISSION_CODES,
  TALENT_M4_DIRECTION_PERMISSION_CODES,
  TALENT_M5_ADVICE_PERMISSION_CODES,
  TALENT_PAGE_MENU_DEFS,
  TALENT_ROLE_DEFS,
  resolveTalentRoleMenuIds,
} from "../scripts/setup.mjs";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

/** 与当前库结构一致的固定菜单 fixture（包含旧码 F 行、机构端页面、系统 / 监控分组）。 */
function buildMenuFixture(): Array<Record<string, any>> {
  let sequence = 0;
  const menu = (
    menuType: string,
    menuName: string,
    extra: Record<string, any> = {},
  ) => ({
    id: `${menuType}-${++sequence}`,
    menuType,
    menuName,
    path: "",
    permissionCode: "",
    parentId: null,
    status: "1",
    visible: menuType === "F" ? "1" : "0",
    ...extra,
  });
  const menus: Array<Record<string, any>> = [];
  const groups: Record<string, string> = {};
  for (const name of [
    "工作台",
    "会员管理",
    "培养方向",
    "天赋规则",
    "报告管理",
    "系统管理",
    "运行监控",
  ]) {
    const group = menu("M", name, {
      status: ["工作台", "会员管理", "培养方向"].includes(name) ? "0" : "1",
    });
    groups[name] = group.id;
    menus.push(group);
  }
  const pages: Record<string, string> = {};
  const page = (key: string, name: string, path: string, code: string, parent: string | null = null, status = "1") => {
    const row = menu("C", name, { path, permissionCode: code, parentId: parent ? groups[parent] : null, status });
    pages[key] = row.id;
    menus.push(row);
  };
  page("dashboard", "工作台", TALENT_BUSINESS_PAGE_PATHS.dashboard, TALENT_DASHBOARD_PERMISSION_CODE);
  page("member", "会员管理", TALENT_BUSINESS_PAGE_PATHS.member, "talent:parent:list");
  page("factor", "潜质要素", TALENT_BUSINESS_PAGE_PATHS.factor, "talent:factor:list", "天赋规则");
  page("level", "分级与固定注解", TALENT_BUSINESS_PAGE_PATHS.level, "talent:rule:list", "天赋规则");
  page("direction", "培养方向管理", TALENT_BUSINESS_PAGE_PATHS.direction, "talent:direction:list", "天赋规则");
  page("reports", "基因报告", TALENT_BUSINESS_PAGE_PATHS.reports, "talent:report:list", "报告管理");
  page("advice", "培育建议", TALENT_BUSINESS_PAGE_PATHS.advice, "talent:advice:list", "报告管理");
  page("user", "用户列表", "/admin/user", "system:user:list", "系统管理");
  page("role", "角色管理", "/admin/role", "system:role:list", "系统管理");
  page("health", "系统健康", "/admin/monitor/health", "monitor:health:list", "运行监控");
  page("operlog", "操作日志", "/admin/log/oper-log", "system:operlog:list", "运行监控");
  // 旧路径 / 机构端页面：旧码仍在，但不得被三角色授权。
  page("orgMembers", "会员列表", "/org/talent/members", "talent:customer:list");
  page("orgReports", "报告列表", "/org/talent/reports", "talent:report:list");
  page("oldReport", "旧报告页", "/admin/talent/report", "talent:report:list", null, "0");
  page("oldElement", "分类与要素", "/admin/talent/element", "talent:content:list", "天赋规则", "0");

  const action = (parentKey: string, name: string, code: string) => {
    menus.push(menu("F", name, { permissionCode: code, parentId: pages[parentKey] }));
  };
  action("dashboard", "查看天赋工作台", TALENT_DASHBOARD_PERMISSION_CODE);
  for (const code of TALENT_M2_MEMBER_PERMISSION_CODES.filter((item) => item !== "talent:parent:list"))
    action("member", `会员动作 ${code}`, code);
  // 旧会员 F 行仍挂在新「会员管理」页下（M6-B 才删除），必须被角色矩阵过滤。
  for (const code of [
    "talent:customer:view",
    "talent:customer:add",
    "talent:customer:edit",
    "talent:customer:delete",
    "talent:customer:import",
  ])
    action("member", `旧会员动作 ${code}`, code);
  for (const code of TALENT_M1_RULE_PERMISSION_CODES) {
    if (code === "talent:factor:list") {
      action("factor", "动作 talent:factor:sync", "talent:factor:sync");
      action("factor", "动作 talent:factor:export", "talent:factor:export");
    } else if (code === "talent:rule:list") {
      for (const item of ["add", "edit", "delete", "import", "export"])
        action("level", `分级 ${item}`, `talent:rule:${item}`);
    } else if (code === "talent:direction:list") {
      for (const item of ["add", "edit", "delete"])
        action("direction", `方向 ${item}`, `talent:direction:${item}`);
    } else if (code === "talent:tier:list" || code === "talent:tier:edit") {
      action("direction", `档位 ${code}`, code);
    }
  }
  action("direction", "待归并方向", "talent:direction:merge");
  for (const code of TALENT_M3_REPORT_PERMISSION_CODES.filter((item) => item !== "talent:report:list")) {
    // publish 覆盖 3 个动作（发布 / 撤回恢复补发 / 重新生成快照）。
    const times = code === "talent:report:publish" ? 3 : 1;
    for (let index = 0; index < times; index += 1)
      action("reports", `${code} #${index + 1}`, code);
  }
  for (const code of TALENT_M5_ADVICE_PERMISSION_CODES.filter((item) => item !== "talent:advice:list"))
    action("advice", `建议 ${code}`, code);
  // 旧报告码 F 行保留在册（M6-B 才删），不得被三角色授权。
  action("reports", "撤回天赋报告", "talent:report:revoke");
  action("reports", "上传报告 PDF", "talent:report:edit");
  action("orgReports", "查看机构报告", "talent:report:list");
  // 系统 / 监控按钮行。
  action("user", "查看用户", "system:user:query");
  action("role", "查看角色", "system:role:query");
  action("health", "查看健康", "monitor:health:list");
  return menus;
}

const MENUS = buildMenuFixture();
const MENU_BY_ID = new Map(MENUS.map((menu) => [String(menu.id), menu]));
const roleDefinition = (roleKey: string) => {
  const definition = TALENT_ROLE_DEFS.find((role) => role.roleKey === roleKey);
  if (!definition) throw new Error(`缺少角色定义 ${roleKey}`);
  return definition;
};
const resolvedFor = (roleKey: string) =>
  resolveTalentRoleMenuIds(MENUS, roleDefinition(roleKey));
const codesOf = (roleKey: string) => {
  const resolved = resolvedFor(roleKey);
  return new Set(
    [...resolved.pages, ...resolved.actions]
      .map((menu) => String(menu.permissionCode || ""))
      .filter(Boolean),
  );
};
const menuOf = (menuIds: Set<string>): Array<Record<string, any>> =>
  [...menuIds]
    .map((id) => MENU_BY_ID.get(id))
    .filter((menu): menu is Record<string, any> => Boolean(menu));

describe("M6-A 工作台拆码 talent:dashboard:list", () => {
  it("工作台 C 菜单 / F 行 / 在册权限码都使用新码，基因报告保持 talent:report:list", () => {
    const dashboardPage = TALENT_PAGE_MENU_DEFS.find(
      ([, path]) => path === TALENT_BUSINESS_PAGE_PATHS.dashboard,
    );
    expect(dashboardPage?.[3]).toBe(TALENT_DASHBOARD_PERMISSION_CODE);
    const reportPage = TALENT_PAGE_MENU_DEFS.find(
      ([, path]) => path === TALENT_BUSINESS_PAGE_PATHS.reports,
    );
    expect(reportPage?.[3]).toBe("talent:report:list");
    expect(FOUNDATION_RBAC_PERMISSION_CODES).toContain(
      TALENT_DASHBOARD_PERMISSION_CODE,
    );
    expect(FOUNDATION_RBAC_PERMISSION_CODES).toContain("talent:report:list");
    const actionDefs = FOUNDATION_ACTION_MENU_DEFS as Array<
      [string, string, string]
    >;
    expect(
      actionDefs.filter(
        ([path, , code]) =>
          path === TALENT_BUSINESS_PAGE_PATHS.dashboard &&
          code === TALENT_DASHBOARD_PERMISSION_CODE,
      ),
    ).toHaveLength(1);
    expect(
      actionDefs.filter(
        ([path, , code]) =>
          path === TALENT_BUSINESS_PAGE_PATHS.dashboard &&
          code === "talent:report:list",
      ),
    ).toHaveLength(0);
  });

  it("dashboard 接口改为 requirePermission(talent:dashboard:list)，不再依赖天赋机构数据权限", () => {
    const source = read("server/api/admin/talent/dashboard.get.ts");
    expect(source).toContain('requirePermission(event, "talent:dashboard:list")');
    expect(source).not.toContain("requireTalentPermission");
    expect(source).not.toContain("isPlatformAdmin");
    expect(source).not.toContain('"talent:report:list"');
  });
});

describe("M6-A 三角色定义", () => {
  it("三个业务角色 + 存量 customer-admin 升级，不新建 platform-operator 重复角色", () => {
    expect(TALENT_ROLE_DEFS.map((role) => role.roleKey)).toEqual([
      "customer-admin",
      "report-reviewer",
      "rule-configurator",
    ]);
    expect(
      TALENT_ROLE_DEFS.some((role) => role.roleKey === "platform-operator"),
    ).toBe(false);
    expect(
      TALENT_ROLE_DEFS.some((role) => role.roleKey === "admin"),
    ).toBe(false);
    expect(roleDefinition("customer-admin").roleName).toBe("平台运营管理员");
    expect(roleDefinition("report-reviewer").roleName).toBe("报告审核员");
    expect(roleDefinition("rule-configurator").roleName).toBe("规则配置员");
  });

  it("35 个业务权限码 = M1 15 + M2 9 + M3 4 + M4 1 + M5 5 + 工作台 1", () => {
    expect(TALENT_M1_RULE_PERMISSION_CODES).toHaveLength(15);
    expect(TALENT_M2_MEMBER_PERMISSION_CODES).toHaveLength(9);
    expect(TALENT_M3_REPORT_PERMISSION_CODES).toHaveLength(4);
    expect(TALENT_M4_DIRECTION_PERMISSION_CODES).toEqual([
      "talent:direction:merge",
    ]);
    expect(TALENT_M5_ADVICE_PERMISSION_CODES).toHaveLength(5);
    expect(TALENT_BUSINESS_PERMISSION_CODES).toHaveLength(35);
    expect(new Set(TALENT_BUSINESS_PERMISSION_CODES).size).toBe(35);
  });

  it("矩阵内的权限码都有 setup 的 C/F 菜单行；旧码已归零且不在矩阵内", () => {
    const menuCodes = new Set(
      [
        ...TALENT_PAGE_MENU_DEFS.map(([, , , code]) => code),
        ...(FOUNDATION_ACTION_MENU_DEFS as Array<[string, string, string]>).map(
          ([, , code]) => code,
        ),
      ].filter(Boolean),
    );
    for (const code of TALENT_BUSINESS_PERMISSION_CODES)
      expect(menuCodes, code).toContain(code);
    const legacyCodes = [
      "talent:customer:list",
      "talent:customer:view",
      "talent:customer:add",
      "talent:customer:edit",
      "talent:customer:delete",
      "talent:customer:import",
      "talent:content:list",
      "talent:content:add",
      "talent:content:edit",
      "talent:content:delete",
      "talent:report:revoke",
      "talent:report:edit",
      "talent:report:receive",
      "talent:institution:list",
      "talent:institution:edit",
      "talent:plan:list",
      "talent:plan:add",
      "talent:plan:edit",
      "talent:plan:submit",
      "talent:plan:review",
      "talent:service:member",
      "talent:sync:manage",
    ];
    // M6-B：22 个旧码已归零，且不属于任何新角色矩阵。
    for (const code of legacyCodes) {
      expect(FOUNDATION_RBAC_PERMISSION_CODES, code).not.toContain(code);
      expect(TALENT_BUSINESS_PERMISSION_CODES, code).not.toContain(code);
    }
  });
});

describe("M6-A 角色 × 菜单矩阵", () => {
  it("平台运营：7 条业务 C 菜单 + 全部 35 个业务码，无系统 / 监控", () => {
    const resolved = resolvedFor("customer-admin");
    expect(resolved.pages.map((menu) => menu.path).sort()).toEqual(
      Object.values(TALENT_BUSINESS_PAGE_PATHS).sort(),
    );
    expect(resolved.groups.map((menu) => menu.menuName).sort()).toEqual(
      ["报告管理", "天赋规则"].sort(),
    );
    expect(codesOf("customer-admin").size).toBe(35);
    for (const code of TALENT_BUSINESS_PERMISSION_CODES)
      expect(codesOf("customer-admin"), code).toContain(code);
    const leaked = menuOf(resolved.menuIds).filter(
      (menu) =>
        SYSTEM_AND_MONITOR_GROUP_NAMES.includes(String(menu.menuName)) ||
        SYSTEM_AND_MONITOR_MENU_PATHS.includes(String(menu.path || "")),
    );
    expect(leaked).toEqual([]);
  });

  it("报告审核员：工作台 / 会员管理（只读）/ 基因报告 / 培育建议，有发布无同步", () => {
    const resolved = resolvedFor("report-reviewer");
    expect(resolved.pages.map((menu) => menu.path).sort()).toEqual(
      [
        TALENT_BUSINESS_PAGE_PATHS.dashboard,
        TALENT_BUSINESS_PAGE_PATHS.member,
        TALENT_BUSINESS_PAGE_PATHS.reports,
        TALENT_BUSINESS_PAGE_PATHS.advice,
      ].sort(),
    );
    expect(resolved.groups.map((menu) => menu.menuName)).toEqual(["报告管理"]);
    const codes = codesOf("report-reviewer");
    expect(codes).toEqual(
      new Set([
        TALENT_DASHBOARD_PERMISSION_CODE,
        "talent:parent:list",
        "talent:parent:view",
        "talent:report:list",
        "talent:report:view",
        "talent:report:publish",
        "talent:advice:list",
        "talent:advice:view",
        "talent:advice:publish",
        "talent:advice:export",
      ]),
    );
    // 越权反例：会员写 / 证件全号 / 报告同步 / 建议同步 / 规则配置。
    for (const code of [
      "talent:parent:add",
      "talent:parent:edit",
      "talent:parent:status",
      "talent:parent:idno",
      "talent:child:edit",
      "talent:child:unbind",
      "talent:child:query",
      "talent:report:sync",
      "talent:advice:sync",
      "talent:direction:add",
      "talent:rule:add",
    ])
      expect(codes, code).not.toContain(code);
    // 旧会员码即便 F 行仍挂在会员管理页下，也不得被授权。
    for (const code of [
      "talent:customer:view",
      "talent:customer:add",
      "talent:customer:edit",
      "talent:customer:delete",
      "talent:customer:import",
    ])
      expect(codes, code).not.toContain(code);
  });

  it("规则配置员：工作台 + 天赋规则 3 页 + M1 全码 + 方向归并，无会员 / 报告 / 建议", () => {
    const resolved = resolvedFor("rule-configurator");
    expect(resolved.pages.map((menu) => menu.path).sort()).toEqual(
      [
        TALENT_BUSINESS_PAGE_PATHS.dashboard,
        TALENT_BUSINESS_PAGE_PATHS.factor,
        TALENT_BUSINESS_PAGE_PATHS.level,
        TALENT_BUSINESS_PAGE_PATHS.direction,
      ].sort(),
    );
    expect(resolved.groups.map((menu) => menu.menuName)).toEqual(["天赋规则"]);
    const codes = codesOf("rule-configurator");
    for (const code of TALENT_M1_RULE_PERMISSION_CODES)
      expect(codes, code).toContain(code);
    expect(codes).toContain("talent:direction:merge");
    expect(codes).toContain(TALENT_DASHBOARD_PERMISSION_CODE);
    // 工作台拆码生效：能看工作台不等于能读报告列表。
    for (const code of [
      "talent:report:list",
      "talent:report:view",
      "talent:report:sync",
      "talent:report:publish",
      "talent:advice:list",
      "talent:advice:publish",
      "talent:parent:list",
      "talent:parent:view",
    ])
      expect(codes, code).not.toContain(code);
  });

  it("三角色菜单均不含系统管理 / 运行监控（含分组祖先）", () => {
    for (const definition of TALENT_ROLE_DEFS) {
      const resolved = resolveTalentRoleMenuIds(MENUS, definition);
      for (const menu of menuOf(resolved.menuIds)) {
        expect(
          SYSTEM_AND_MONITOR_GROUP_NAMES.includes(String(menu.menuName)),
          `${definition.roleKey}:${menu.menuName}`,
        ).toBe(false);
        expect(
          SYSTEM_AND_MONITOR_MENU_PATHS.includes(String(menu.path || "")),
          `${definition.roleKey}:${menu.path}`,
        ).toBe(false);
      }
    }
  });

  it("矩阵缺码 / 内置 roleKey 会显式失败（防静默越权）", () => {
    expect(() =>
      resolveTalentRoleMenuIds(MENUS, {
        ...roleDefinition("rule-configurator"),
        permissionCodes: ["talent:report:list"],
      } as any),
    ).toThrow(/缺少启用菜单行|矩阵外权限码|不得包含/);
    expect(() =>
      resolveTalentRoleMenuIds(MENUS, {
        ...roleDefinition("customer-admin"),
        permissionCodes: [...TALENT_BUSINESS_PERMISSION_CODES, "talent:report:sync"],
      } as any),
    ).not.toThrow(); // report:sync 本身是矩阵内合法码，但页面必须存在
    expect(() =>
      resolveTalentRoleMenuIds(MENUS, {
        roleKey: "admin",
        pagePaths: [],
        groupNames: [],
        permissionCodes: [],
      } as any),
    ).toThrow(/内置角色/);
    expect(() =>
      resolveTalentRoleMenuIds(MENUS, {
        ...roleDefinition("customer-admin"),
        pagePaths: [...roleDefinition("customer-admin").pagePaths, "/admin/user"],
      } as any),
    ).toThrow(/不得包含系统管理/);
  });
});

describe("M6-A 幂等与旧资产保留（静态契约）", () => {
  it("setup.mjs 提供唯一矩阵，sync / seed 复用；customer-admin 按 roleKey 复用旧行", () => {
    const setupSource = read("scripts/setup.mjs");
    expect(setupSource).toContain("export const TALENT_ROLE_DEFS");
    expect(setupSource).toContain("export async function syncTalentBusinessRoles");
    expect(setupSource).toContain('getFirstListItem(`roleKey = "');
    expect(setupSource).toContain("collection(\"roles\")");
    expect(setupSource).toContain("update(existing.id");
    expect(setupSource).toContain('roleKey: "customer-admin"');
    expect(setupSource).not.toContain('roleKey: "platform-operator"');
    const syncSource = read("scripts/sync-talent.mjs");
    expect(syncSource).toContain("syncTalentBusinessRoles");
    expect(syncSource).toContain("TALENT_DASHBOARD_PERMISSION_CODE");
    expect(syncSource).not.toContain("客户管理员必须只可见业务");
    const seedSource = read("scripts/seed-accounts.mjs");
    expect(seedSource).toContain("syncTalentBusinessRoles");
    expect(seedSource).toContain('username: "reviewer"');
    expect(seedSource).toContain('username: "rule-config"');
    expect(seedSource).toContain("PLATFORM_OPERATOR_PASSWORD");
    expect(seedSource).toContain("assertBuiltInAdminUnbound");
  });

  it("M6-B 已删除旧菜单 / 旧集合 / 旧角色，并保留归零清单与基础角色", () => {
    const setupSource = read("scripts/setup.mjs");
    // 旧集合定义 / 旧菜单种子 / 旧分组不再出现在初始化代码里。
    expect(setupSource).not.toContain('name: "talent_customers"');
    expect(setupSource).not.toContain('name: "talent_elements"');
    expect(setupSource).not.toContain("archivedTalentMenus");
    expect(setupSource).not.toContain('menuName = "培养方向"');
    expect(setupSource).toContain("LEGACY_TALENT_COLLECTION_NAMES");
    expect(setupSource).toContain("LEGACY_TALENT_PERMISSION_CODES");
    expect(setupSource).toContain("LEGACY_TALENT_ROLE_KEYS");
    expect(setupSource).toContain('roleKey = "superadmin"');
    expect(setupSource).toContain('roleKey = "user"');
    const syncSource = read("scripts/sync-talent.mjs");
    expect(syncSource).not.toContain("LEGACY_HIDDEN_MENU_PATHS");
    expect(syncSource).toContain("LEGACY_TALENT_MENU_PATHS");
    expect(syncSource).toContain("deleteMenuWithLinks");
    expect(syncSource).toContain('roleKey = "superadmin"');
  });
});