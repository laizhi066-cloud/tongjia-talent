/**
 * @description 基础版 PocketBase 初始化：只创建通用账户、RBAC、配置、审计与上传集合。
 * @file scripts/setup.mjs
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import PocketBase from "pocketbase";
import { PB_URL_DEFAULT } from "./_pb.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
loadDotEnv();
const PB_URL = process.env.POCKETBASE_URL || PB_URL_DEFAULT;
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || "";
const ADMIN_PASSWORD =
  process.env.POCKETBASE_ADMIN_PASSWORD ||
  process.env.POCKETBASE_ADMIN_PASS ||
  "";
const PB_DATA_DIR = process.env.POCKETBASE_DATA_DIR || resolve(ROOT, "pb_data");
const PB_MIGRATIONS_DIR =
  process.env.POCKETBASE_MIGRATIONS_DIR ||
  resolve(tmpdir(), "foundation-pb-migrations");
const MAX_WAIT_SECONDS = 30;

/** 基础版 schema 版本；仅适用于全新数据库。 */
export const SCHEMA_VERSION = 1;

/**
 * 所有管理写入与明细读取均以按钮菜单承载，确保自定义角色能被精确授权。
 * 页面菜单只负责进入后台；这里的 F 类型子菜单才是 Nitro `requirePermission()` 的实际授权单元。
 */
export const FOUNDATION_ACTION_MENU_DEFS = [
  ["/admin/user", "查看用户", "system:user:query"],
  ["/admin/user", "新增用户", "system:user:add"],
  ["/admin/user", "编辑用户", "system:user:edit"],
  ["/admin/user", "删除用户", "system:user:delete"],
  ["/admin/user", "重置用户密码", "system:user:resetPwd"],
  ["/admin/role", "查看角色", "system:role:query"],
  ["/admin/role", "新增角色", "system:role:add"],
  ["/admin/role", "编辑角色", "system:role:edit"],
  ["/admin/role", "删除角色", "system:role:delete"],
  ["/admin/menu", "新增菜单", "system:menu:add"],
  ["/admin/menu", "编辑菜单", "system:menu:edit"],
  ["/admin/menu", "删除菜单", "system:menu:delete"],
  ["/admin/dept", "新增部门", "system:dept:add"],
  ["/admin/dept", "编辑部门", "system:dept:edit"],
  ["/admin/dept", "删除部门", "system:dept:delete"],
  ["/admin/post", "新增岗位", "system:post:add"],
  ["/admin/post", "编辑岗位", "system:post:edit"],
  ["/admin/post", "删除岗位", "system:post:delete"],
  ["/admin/dict", "新增字典", "system:dict:add"],
  ["/admin/dict", "编辑字典", "system:dict:edit"],
  ["/admin/dict", "删除字典", "system:dict:delete"],
  ["/admin/config", "新增参数", "system:config:add"],
  ["/admin/config", "编辑参数", "system:config:edit"],
  ["/admin/config", "删除参数", "system:config:delete"],
  ["/admin/monitor/online", "强退在线用户", "monitor:online:forceLogout"],
  ["/admin/monitor/error", "处理错误记录", "monitor:error:edit"],
  ["/admin/monitor/error", "清理错误记录", "monitor:error:remove"],
  ["/admin/log/login-log", "新增登录日志", "system:loginlog:add"],
  // M1 规则域：培养方向 / 潜质要素 / 分级与固定注解（C 菜单承载 list 码，F 菜单承载动作码）。
  ["/admin/talent/rules/direction", "新增培养方向", "talent:direction:add"],
  ["/admin/talent/rules/direction", "编辑培养方向", "talent:direction:edit"],
  ["/admin/talent/rules/direction", "删除培养方向", "talent:direction:delete"],
  // M4 方向匹配域：待归并读取复用 M1 的 `talent:direction:list`（C 行），写动作单独一个 F 码。
  ["/admin/talent/rules/direction", "待归并方向", "talent:direction:merge"],
  ["/admin/talent/rules/direction", "查看目标档位", "talent:tier:list"],
  ["/admin/talent/rules/direction", "编辑目标档位", "talent:tier:edit"],
  ["/admin/talent/rules/factor", "同步潜质要素库", "talent:factor:sync"],
  ["/admin/talent/rules/factor", "导出潜质要素", "talent:factor:export"],
  ["/admin/talent/rules/level", "新增分级", "talent:rule:add"],
  ["/admin/talent/rules/level", "编辑分级", "talent:rule:edit"],
  ["/admin/talent/rules/level", "删除分级", "talent:rule:delete"],
  ["/admin/talent/rules/level", "导入固定注解", "talent:rule:import"],
  ["/admin/talent/rules/level", "导出固定注解", "talent:rule:export"],
  // M2 会员域：C 菜单承载 talent:parent:list；F 菜单承载详情 / 建档 / 编辑 / 状态 / 全号 / 子女动作。
  ["/admin/talent/member", "查看会员详情", "talent:parent:view"],
  ["/admin/talent/member", "新增会员", "talent:parent:add"],
  ["/admin/talent/member", "编辑会员", "talent:parent:edit"],
  ["/admin/talent/member", "停用启用会员", "talent:parent:status"],
  ["/admin/talent/member", "查看会员证件全号", "talent:parent:idno"],
  ["/admin/talent/member", "编辑名下子女", "talent:child:edit"],
  ["/admin/talent/member", "解绑名下子女", "talent:child:unbind"],
  ["/admin/talent/member", "重新查询子女结果", "talent:child:query"],
  // M3 报告域：权威 4 码（list/view/sync/publish）；`publish` 覆盖发布 / 撤回 / 恢复 / 补发 / 重算，
  // 因此同一权限码允许 3 条 F 行（发布 / 撤回恢复补发 / 重新生成快照），按菜单名区分（options.matchByName）。
  ["/admin/talent/reports", "发布天赋报告", "talent:report:publish", { matchByName: true }],
  ["/admin/talent/reports", "撤回恢复补发报告", "talent:report:publish", { matchByName: true }],
  ["/admin/talent/reports", "重新生成报告快照", "talent:report:publish", { matchByName: true }],
  ["/admin/talent/reports", "查看报告详情", "talent:report:view"],
  ["/admin/talent/reports", "一键同步全部报告", "talent:report:sync"],
  // M5 培育建议域：C 菜单码 `talent:advice:list` 由 M2.0 既有「培育建议」行承载，这里只新增 4 个 F 动作码
  // （详情 / 版本历史 / 报告页签、接收新一版、发布撤回、导出），同一码允许多条 F 行（不同动作名）。
  ["/admin/talent/advice", "查看培育建议书", "talent:advice:view"],
  ["/admin/talent/advice", "发布撤回培育建议", "talent:advice:publish"],
  ["/admin/talent/advice", "接收新一版建议", "talent:advice:sync"],
  ["/admin/talent/advice", "导出培育建议", "talent:advice:export"],
  // M6-A：工作台从 `talent:report:list` 拆出专用码，避免「能看工作台」顺带获得报告列表接口权限。
  ["/admin/talent/dashboard", "查看天赋工作台", "talent:dashboard:list"],
];

/** 初始化菜单必须覆盖所有管理 API 的权限码，供测试与扩展时校验。 */
export const FOUNDATION_RBAC_PERMISSION_CODES = [
  "system:user:list",
  "system:role:list",
  "system:menu:list",
  "system:dept:list",
  "system:post:list",
  "system:dict:list",
  "system:config:list",
  "monitor:health:list",
  "monitor:online:list",
  "monitor:error:list",
  "system:operlog:list",
  "system:loginlog:list",
  ...FOUNDATION_ACTION_MENU_DEFS.map(([, , permissionCode]) => permissionCode),
  // M1 规则域 15 个权限码：3 个页面 C 菜单码 + 12 个 F 按钮码（见 FOUNDATION_ACTION_MENU_DEFS）。
  "talent:direction:list",
  "talent:factor:list",
  "talent:rule:list",
  // M2 会员域 9 个权限码：1 个页面 C 菜单码 + 8 个 F 按钮码（见 FOUNDATION_ACTION_MENU_DEFS）。
  "talent:parent:list",
  "talent:parent:view",
  "talent:parent:add",
  "talent:parent:edit",
  "talent:parent:status",
  "talent:parent:idno",
  "talent:child:edit",
  "talent:child:unbind",
  "talent:child:query",
  "talent:report:list",
  "talent:report:view",
  "talent:report:sync",
  "talent:report:publish",
  // M5 培育建议域 5 个权限码：1 个 C 菜单码（复用 M2.0「培育建议」行）+ 4 个 F 动作码（见 FOUNDATION_ACTION_MENU_DEFS）。
  "talent:advice:list",
  // M6 工作台专用码（ADR 0006-D3 / M6 规格 §6.2）：C 菜单与 F 行同码，不再复用 talent:report:list。
  "talent:dashboard:list",
];

/**
 * M6-A 三角色与工作台权限码（M6 规格 §6、ADR 0006-D3）。
 * 这里是「角色 × 菜单 / 权限码」的唯一数据源：`setup.mjs`（菜单种子）、`sync-talent.mjs`
 * （存量库收敛与断言）、`seed-accounts.mjs`（角色与账号种子）都从这里取矩阵，避免三份漂移。
 * 说明：`customer-admin` 是平台运营管理员的稳定 roleKey（沿用旧客户管理员，避免丢授权）；
 * `report-reviewer` / `rule-configurator` 为 M6 新增；系统管理 / 运行监控只留给 `superadmin`。
 */
export const TALENT_DASHBOARD_PERMISSION_CODE = "talent:dashboard:list";

/** M1 规则域 15 个权限码（3 个 C 页面码 + 12 个 F 动作码）。 */
export const TALENT_M1_RULE_PERMISSION_CODES = Object.freeze([
  "talent:direction:list",
  "talent:direction:add",
  "talent:direction:edit",
  "talent:direction:delete",
  "talent:tier:list",
  "talent:tier:edit",
  "talent:factor:list",
  "talent:factor:sync",
  "talent:factor:export",
  "talent:rule:list",
  "talent:rule:add",
  "talent:rule:edit",
  "talent:rule:delete",
  "talent:rule:import",
  "talent:rule:export",
]);

/** M2 会员域 9 个权限码（1 个 C 页面码 + 8 个 F 动作码）。 */
export const TALENT_M2_MEMBER_PERMISSION_CODES = Object.freeze([
  "talent:parent:list",
  "talent:parent:view",
  "talent:parent:add",
  "talent:parent:edit",
  "talent:parent:status",
  "talent:parent:idno",
  "talent:child:edit",
  "talent:child:unbind",
  "talent:child:query",
]);

/** M3 报告域 4 个权威权限码（1 个 C 页面码 + 3 个 F 动作码）。 */
export const TALENT_M3_REPORT_PERMISSION_CODES = Object.freeze([
  "talent:report:list",
  "talent:report:view",
  "talent:report:sync",
  "talent:report:publish",
]);

/** M4 方向匹配域 1 个 F 动作码（待归并列表复用 M1 的 talent:direction:list）。 */
export const TALENT_M4_DIRECTION_PERMISSION_CODES = Object.freeze([
  "talent:direction:merge",
]);

/** M5 培育建议域 5 个权限码（1 个 C 页面码 + 4 个 F 动作码）。 */
export const TALENT_M5_ADVICE_PERMISSION_CODES = Object.freeze([
  "talent:advice:list",
  "talent:advice:view",
  "talent:advice:publish",
  "talent:advice:sync",
  "talent:advice:export",
]);

/** M6 后业务域在册的 35 个权限码（M1 15 + M2 9 + M3 4 + M4 1 + M5 5 + 工作台 1）。 */
export const TALENT_BUSINESS_PERMISSION_CODES = Object.freeze([
  TALENT_DASHBOARD_PERMISSION_CODE,
  ...TALENT_M1_RULE_PERMISSION_CODES,
  ...TALENT_M2_MEMBER_PERMISSION_CODES,
  ...TALENT_M3_REPORT_PERMISSION_CODES,
  ...TALENT_M4_DIRECTION_PERMISSION_CODES,
  ...TALENT_M5_ADVICE_PERMISSION_CODES,
]);

/** 业务页面 path（与 TALENT_PAGE_MENU_DEFS 一一对应）。 */
export const TALENT_BUSINESS_PAGE_PATHS = Object.freeze({
  dashboard: "/admin/talent/dashboard",
  member: "/admin/talent/member",
  factor: "/admin/talent/rules/factor",
  level: "/admin/talent/rules/level",
  direction: "/admin/talent/rules/direction",
  reports: "/admin/talent/reports",
  advice: "/admin/talent/advice",
});

/** 仅 superAdmin 可见的系统管理 / 运行监控页面 path（M6 规格 §6.3 / §6.5）。 */
export const SYSTEM_AND_MONITOR_MENU_PATHS = Object.freeze([
  "/admin/user",
  "/admin/menu",
  "/admin/role",
  "/admin/dept",
  "/admin/post",
  "/admin/dict",
  "/admin/config",
  "/admin/site-config",
  "/admin/settings/wechat",
  "/admin/monitor/health",
  "/admin/monitor/online",
  "/admin/monitor/error",
  "/admin/log/oper-log",
  "/admin/log/login-log",
]);

/**
 * ── M6 旧口径归零清单（2026-11-17，M6-B；ADR 0006-D1）─────────────────────────
 * 这些旧集合 / 路径 / 权限码 / 角色在 M6 完成后必须是 0。`setup.mjs` 只负责「新库不创建」，
 * `sync-talent.mjs` 负责清理存量菜单 / 码 / 角色并断言归零，真实删集合只由
 * `scripts/cleanup-m6.mjs`（默认 dry-run）执行。清单同时供单测与 dry-run 报告引用，避免多处漂移。
 */
export const LEGACY_TALENT_COLLECTION_NAMES = Object.freeze([
  "talent_customers",
  "talent_customer_bindings",
  "talent_institutions",
  "talent_user_institutions",
  "talent_customer_leads",
  "talent_customer_authorizations",
  "talent_cultivation_plans",
  "talent_member_plan_selections",
  "talent_report_receipts",
  "talent_report_publications",
  "talent_customer_import_batches",
  "talent_customer_import_rows",
  "talent_categories",
  "talent_elements",
  "talent_cultivation_contents",
  "talent_content_libraries",
  "talent_report_templates",
  "talent_report_template_items",
  "talent_report_items",
]);

/** 删除顺序：被引用者后删（先模板明细 / 报告子表，最后会员与机构主表）。 */
export const LEGACY_TALENT_COLLECTION_DELETE_ORDER = Object.freeze([
  "talent_report_template_items",
  "talent_report_templates",
  "talent_report_publications",
  "talent_report_receipts",
  "talent_report_items",
  "talent_cultivation_contents",
  "talent_content_libraries",
  "talent_elements",
  "talent_categories",
  "talent_member_plan_selections",
  "talent_cultivation_plans",
  "talent_customer_authorizations",
  "talent_customer_leads",
  "talent_user_institutions",
  "talent_institutions",
  "talent_customer_import_rows",
  "talent_customer_import_batches",
  "talent_customer_bindings",
  "talent_customers",
]);

/** 22 个旧权限码（旧会员 / 内容 / 报告 / 机构 / 计划 / 授权 / 同步），M6 后不得再出现在菜单或代码里。 */
export const LEGACY_TALENT_PERMISSION_CODES = Object.freeze([
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
]);

/**
 * 旧页面 / 旧分组 path：12 条旧 C 行 + 更早的旧页（customer / report / content / template）。
 * 其中 customer / report 会被 `seedMenus` 原位重指向新页，重指向失败或重复的旧行按本清单删除。
 */
export const LEGACY_TALENT_MENU_PATHS = Object.freeze([
  "/admin/talent/authorization",
  "/admin/talent/plan",
  "/admin/talent/element",
  "/admin/talent/matching",
  "/admin/talent/library",
  "/admin/talent/receive",
  "/admin/talent/sync",
  "/admin/talent/category",
  "/admin/talent/level",
  "/org/talent/members",
  "/org/talent/reports",
  "/org/talent/plans",
  "/admin/talent/customer",
  "/admin/talent/report",
  "/admin/talent/content",
  "/admin/talent/template",
  "/admin/talent/institution",
]);

/** 4 条旧一级分组行（工作台 / 会员管理 / 培养方向 / 机构业务），M6 后不得再存在。 */
export const LEGACY_TALENT_GROUP_NAMES = Object.freeze([
  "工作台",
  "会员管理",
  "培养方向",
  "机构业务",
]);

/** 机构角色 roleKey：随机构端退出删除角色与授权，账号只停用不删除。 */
export const LEGACY_TALENT_ROLE_KEYS = Object.freeze([
  "talent_agent",
  "talent_service_provider",
]);

/** 仅 superAdmin 可见的一级分组名。 */
export const SYSTEM_AND_MONITOR_GROUP_NAMES = Object.freeze([
  "系统管理",
  "运行监控",
]);

/**
 * 侧栏业务页面定义：[菜单名, path, component, permissionCode, 父分组名, icon, orderNum]。
 * 工作台 / 会员管理为一级 C 菜单；天赋规则 3 页、报告管理 2 页。
 */
export const TALENT_PAGE_MENU_DEFS = [
  [
    "工作台",
    TALENT_BUSINESS_PAGE_PATHS.dashboard,
    "admin/talent/dashboard.vue",
    TALENT_DASHBOARD_PERMISSION_CODE,
    null,
    "gauge",
    10,
  ],
  [
    "会员管理",
    TALENT_BUSINESS_PAGE_PATHS.member,
    "admin/talent/member/index.vue",
    "talent:parent:list",
    null,
    "users",
    20,
  ],
  [
    "潜质要素",
    TALENT_BUSINESS_PAGE_PATHS.factor,
    "admin/talent/rules/factor.vue",
    "talent:factor:list",
    "天赋规则",
    "layers",
    1,
  ],
  [
    "分级与固定注解",
    TALENT_BUSINESS_PAGE_PATHS.level,
    "admin/talent/rules/level.vue",
    "talent:rule:list",
    "天赋规则",
    "list",
    2,
  ],
  [
    "培养方向管理",
    TALENT_BUSINESS_PAGE_PATHS.direction,
    "admin/talent/rules/direction.vue",
    "talent:direction:list",
    "天赋规则",
    "compass",
    3,
  ],
  [
    "基因报告",
    TALENT_BUSINESS_PAGE_PATHS.reports,
    "admin/talent/reports/index.vue",
    "talent:report:list",
    "报告管理",
    "file-text",
    1,
  ],
  [
    "培育建议",
    TALENT_BUSINESS_PAGE_PATHS.advice,
    "admin/talent/advice.vue",
    "talent:advice:list",
    "报告管理",
    "book-open",
    2,
  ],
];

/**
 * 三角色矩阵（M6 规格 §6.3 / §6.4）。`permissionCodes` 是角色可获得的全部业务权限码；
 * 角色菜单 = 这些码对应的启用 C/F 菜单行 + 其一级业务分组祖先（不含系统管理 / 运行监控）。
 */
export const TALENT_ROLE_DEFS = [
  {
    roleKey: "customer-admin",
    roleName: "平台运营管理员",
    roleSort: 10,
    dataScope: "1",
    remark:
      "M6 由客户管理员升级：平台运营全量业务（会员 / 报告 / 建议 / 规则），不含系统管理与运行监控",
    pagePaths: Object.values(TALENT_BUSINESS_PAGE_PATHS),
    groupNames: ["天赋规则", "报告管理"],
    permissionCodes: [...TALENT_BUSINESS_PERMISSION_CODES],
  },
  {
    roleKey: "report-reviewer",
    roleName: "报告审核员",
    roleSort: 11,
    dataScope: "1",
    remark:
      "报告 / 建议发布与撤回 + 会员只读；不含规则配置、同步与会员写（M6 规格 §6.4）",
    pagePaths: [
      TALENT_BUSINESS_PAGE_PATHS.dashboard,
      TALENT_BUSINESS_PAGE_PATHS.member,
      TALENT_BUSINESS_PAGE_PATHS.reports,
      TALENT_BUSINESS_PAGE_PATHS.advice,
    ],
    groupNames: ["报告管理"],
    permissionCodes: [
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
    ],
  },
  {
    roleKey: "rule-configurator",
    roleName: "规则配置员",
    roleSort: 12,
    dataScope: "1",
    remark:
      "潜质要素 / 分级与固定注解 / 培养方向与档位 + 方向归并；不含会员 / 报告 / 建议",
    pagePaths: [
      TALENT_BUSINESS_PAGE_PATHS.dashboard,
      TALENT_BUSINESS_PAGE_PATHS.factor,
      TALENT_BUSINESS_PAGE_PATHS.level,
      TALENT_BUSINESS_PAGE_PATHS.direction,
    ],
    groupNames: ["天赋规则"],
    permissionCodes: [
      TALENT_DASHBOARD_PERMISSION_CODE,
      ...TALENT_M1_RULE_PERMISSION_CODES,
      ...TALENT_M4_DIRECTION_PERMISSION_CODES,
    ],
  },
];

/**
 * 按角色矩阵解析应授权的菜单 id。
 * 纯函数（不连 PocketBase）：测试用固定菜单 fixture 断言正反用例，sync / seed 用真实菜单。
 *
 * @param {Array<Record<string, any>>} menus `menus` 集合全量行
 * @param {(typeof TALENT_ROLE_DEFS)[number]} roleDefinition 角色定义
 * @returns {{ menuIds: Set<string>, pages: Array<Record<string, any>>, actions: Array<Record<string, any>>, groups: Array<Record<string, any>> }}
 */
export function resolveTalentRoleMenuIds(menus, roleDefinition) {
  const roleKey = String(roleDefinition?.roleKey || "");
  if (!roleKey)
    throw new Error("角色矩阵缺少 roleKey");
  if (["admin", "superadmin", "user"].includes(roleKey))
    throw new Error(
      `内置角色 ${roleKey} 不允许用业务矩阵授权；三角色必须是自定义 roleKey`,
    );
  const isEnabled = (menu) => String(menu?.status ?? "1") === "1";
  const byId = new Map(menus.map((menu) => [String(menu.id), menu]));
  const expectedPagePaths = new Set(roleDefinition.pagePaths || []);
  const systemPaths = new Set(SYSTEM_AND_MONITOR_MENU_PATHS);

  const pages = menus.filter(
    (menu) =>
      menu.menuType === "C" &&
      isEnabled(menu) &&
      expectedPagePaths.has(String(menu.path || "")),
  );
  const resolvedPagePaths = new Set(pages.map((menu) => String(menu.path)));
  for (const path of expectedPagePaths)
    if (!resolvedPagePaths.has(path))
      throw new Error(`角色 ${roleKey} 缺少启用的业务页面菜单：${path}`);
  for (const page of pages)
    if (systemPaths.has(String(page.path || "")))
      throw new Error(
        `角色 ${roleKey} 不得包含系统管理 / 运行监控页面：${page.menuName}`,
      );

  const pageIds = new Set(pages.map((menu) => String(menu.id)));
  const allowedCodes = new Set(roleDefinition.permissionCodes || []);
  const actions = menus.filter(
    (menu) =>
      menu.menuType === "F" &&
      isEnabled(menu) &&
      pageIds.has(String(menu.parentId || "")) &&
      allowedCodes.has(String(menu.permissionCode || "")),
  );

  const expectedGroupNames = new Set(roleDefinition.groupNames || []);
  const groups = menus.filter(
    (menu) =>
      menu.menuType === "M" &&
      isEnabled(menu) &&
      expectedGroupNames.has(String(menu.menuName || "")),
  );
  const resolvedGroupNames = new Set(
    groups.map((menu) => String(menu.menuName)),
  );
  for (const name of expectedGroupNames)
    if (!resolvedGroupNames.has(name))
      throw new Error(`角色 ${roleKey} 缺少启用的业务分组菜单：${name}`);
  for (const group of groups)
    if (SYSTEM_AND_MONITOR_GROUP_NAMES.includes(String(group.menuName)))
      throw new Error(
        `角色 ${roleKey} 不得包含系统管理 / 运行监控分组：${group.menuName}`,
      );

  // 每个授权码都必须至少有一条生效菜单行（CONVENTIONS §3：接口码必须有 C/F 菜单承载）。
  const linkedCodes = new Set(
    [...pages, ...actions]
      .map((menu) => String(menu.permissionCode || ""))
      .filter(Boolean),
  );
  const missingCodes = [...allowedCodes].filter(
    (code) => !linkedCodes.has(code),
  );
  if (missingCodes.length)
    throw new Error(
      `角色 ${roleKey} 的权限码缺少启用菜单行：${missingCodes.join("、")}`,
    );
  // 不得把非矩阵码带进角色（旧 C 端会员 / 内容码已随 M6 归零，不得重新挂到新页面）。
  const extraCodes = [...linkedCodes].filter(
    (code) => !allowedCodes.has(code),
  );
  if (extraCodes.length)
    throw new Error(
      `角色 ${roleKey} 出现矩阵外权限码：${extraCodes.join("、")}`,
    );

  const menuIds = new Set(
    [...pages, ...actions, ...groups].map((menu) => String(menu.id)),
  );
  for (const menuId of menuIds) {
    const menu = byId.get(menuId);
    if (!menu) throw new Error(`角色 ${roleKey} 解析到不存在的菜单：${menuId}`);
  }
  return { menuIds, pages, actions, groups };
}

/** 角色菜单收敛：保留既有 role_menus 行（不重建角色关系），缺的补、多的删。 */
async function applyTalentRoleMenuLinks(pb, roleId, allowedMenuIds) {
  const links = await pb.collection("role_menus").getFullList({
    filter: `roleId = "${roleId}"`,
    $autoCancel: false,
  });
  for (const link of links)
    if (!allowedMenuIds.has(String(link.menuId || "")))
      await pb
        .collection("role_menus")
        .delete(link.id, { $autoCancel: false });
  const existingMenuIds = new Set(
    links.map((link) => String(link.menuId || "")),
  );
  for (const menuId of allowedMenuIds) {
    if (existingMenuIds.has(menuId)) continue;
    await pb
      .collection("role_menus")
      .create({ roleId, menuId }, { $autoCancel: false });
  }
}

/**
 * 按 M6 三角色矩阵创建 / 校正角色与 `role_menus`（幂等）。
 * - `customer-admin` 按 roleKey 复用旧行（保留角色 id 与账号绑定），只改显示名 / 排序 / 备注；
 * - 新增 `report-reviewer` / `rule-configurator`；不创建 `platform-operator` 重复角色；
 * - 三角色均不含系统管理 / 运行监控菜单；越权关联会被删除；
 * - 不处理 `superadmin`（由调用方按「全部菜单」授权），也不触碰机构旧角色。
 *
 * @param {import("pocketbase").default} pb 已登录超管的 PocketBase 客户端
 * @returns {Promise<Record<string, { roleId: string, menus: number, pages: number, actions: number, groups: number, codes: number }>>}
 */
export async function syncTalentBusinessRoles(pb) {
  const menus = await pb
    .collection("menus")
    .getFullList({ $autoCancel: false });
  if (!menus.length)
    throw new Error("菜单为空：请先运行 `pnpm env:setup` 初始化基础菜单");

  const stats = {};
  for (const roleDefinition of TALENT_ROLE_DEFS) {
    const existing = await pb
      .collection("roles")
      .getFirstListItem(`roleKey = "${roleDefinition.roleKey}"`, {
        $autoCancel: false,
      })
      .catch(() => null);
    const roleData = {
      roleName: roleDefinition.roleName,
      roleKey: roleDefinition.roleKey,
      roleSort: roleDefinition.roleSort,
      dataScope: roleDefinition.dataScope,
      status: "1",
      remark: roleDefinition.remark,
    };
    const role = existing
      ? await pb
          .collection("roles")
          .update(existing.id, roleData, { $autoCancel: false })
      : await pb.collection("roles").create(roleData, { $autoCancel: false });

    const resolved = resolveTalentRoleMenuIds(menus, roleDefinition);
    await applyTalentRoleMenuLinks(pb, role.id, resolved.menuIds);

    const links = await pb.collection("role_menus").getFullList({
      filter: `roleId = "${role.id}"`,
      $autoCancel: false,
    });
    if (links.length !== resolved.menuIds.size)
      throw new Error(
        `角色 ${roleDefinition.roleKey} 菜单授权不完整：期望 ${resolved.menuIds.size}，实际 ${links.length}`,
      );
    stats[roleDefinition.roleKey] = {
      roleId: role.id,
      menus: resolved.menuIds.size,
      pages: resolved.pages.length,
      actions: resolved.actions.length,
      groups: resolved.groups.length,
      codes: new Set(
        [...resolved.pages, ...resolved.actions]
          .map((menu) => String(menu.permissionCode || ""))
          .filter(Boolean),
      ).size,
    };
  }
  return stats;
}

/** 基础版仅允许这些集合；任何旧业务集合都会让初始化显式失败。 */
export const COLLECTION_DEFS = [
  {
    name: "users",
    fields: [
      { name: "displayName", type: "text", max: 100 },
      // 后台账号名（可选）：管理员可用账号名或邮箱登录。
      { name: "username", type: "text", max: 100 },
      { name: "nickname", type: "text", max: 100 },
      // PocketBase auth 集合内置 avatar 文件字段；在 installFields 中会识别并复用。
      { name: "avatar", type: "file", maxSelect: 1, maxSize: 10485760 },
      { name: "phone", type: "text", max: 20 },
      { name: "gender", type: "text", max: 10 },
      { name: "birthday", type: "text", max: 10 },
      { name: "region", type: "text", max: 100 },
      { name: "bio", type: "text", max: 200 },
      { name: "openid", type: "text", max: 100 },
      { name: "unionid", type: "text", max: 100 },
      // 注销后只保留 HMAC 摘要，既不恢复身份原文，也能阻断同一微信身份重新建户。
      { name: "deletedOpenidHash", type: "text", max: 64 },
      { name: "deletedUnionidHash", type: "text", max: 64 },
      { name: "deletedPhoneHash", type: "text", max: 64 },
      { name: "status", type: "text", required: true, max: 10 },
      { name: "forceLogoutAt", type: "date" },
    ],
    relations: [
      {
        name: "deptId",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "depts",
      },
    ],
  },
  {
    name: "roles",
    fields: [
      { name: "roleName", type: "text", required: true, max: 100 },
      { name: "roleKey", type: "text", required: true, max: 100 },
      { name: "roleSort", type: "number" },
      { name: "dataScope", type: "text", max: 10 },
      { name: "status", type: "text", required: true, max: 10 },
      { name: "remark", type: "text", max: 500 },
    ],
  },
  {
    name: "menus",
    fields: [
      { name: "menuType", type: "text", required: true, max: 10 },
      { name: "menuName", type: "text", required: true, max: 100 },
      { name: "permissionCode", type: "text", max: 200 },
      { name: "path", type: "text", max: 200 },
      { name: "component", type: "text", max: 200 },
      { name: "icon", type: "text", max: 100 },
      { name: "orderNum", type: "number" },
      { name: "visible", type: "text", required: true, max: 10 },
      { name: "status", type: "text", required: true, max: 10 },
    ],
    relations: [
      {
        name: "parentId",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "menus",
      },
    ],
  },
  {
    name: "depts",
    fields: [
      { name: "deptName", type: "text", required: true, max: 100 },
      { name: "orderNum", type: "number" },
      { name: "leader", type: "text", max: 50 },
      { name: "phone", type: "text", max: 20 },
      { name: "email", type: "text", max: 100 },
      { name: "status", type: "text", required: true, max: 10 },
    ],
    relations: [
      {
        name: "parentId",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "depts",
      },
    ],
  },
  {
    name: "posts",
    fields: [
      { name: "postCode", type: "text", required: true, max: 100 },
      { name: "postName", type: "text", required: true, max: 100 },
      { name: "postSort", type: "number" },
      { name: "status", type: "text", required: true, max: 10 },
      { name: "remark", type: "text", max: 500 },
    ],
  },
  {
    name: "dict_types",
    fields: [
      { name: "dictName", type: "text", required: true, max: 100 },
      { name: "dictType", type: "text", required: true, max: 100 },
      { name: "status", type: "text", required: true, max: 10 },
      { name: "remark", type: "text", max: 500 },
    ],
  },
  {
    name: "dict_data",
    fields: [
      { name: "dictSort", type: "number" },
      { name: "dictLabel", type: "text", required: true, max: 100 },
      { name: "dictValue", type: "text", required: true, max: 100 },
      { name: "cssClass", type: "text", max: 100 },
      { name: "listClass", type: "text", max: 100 },
      { name: "icon", type: "text", max: 100 },
      { name: "backgroundColor", type: "text", max: 64 },
      { name: "color", type: "text", max: 64 },
      { name: "isDefault", type: "text", max: 10 },
      { name: "status", type: "text", required: true, max: 10 },
      { name: "remark", type: "text", max: 500 },
    ],
    relations: [
      {
        name: "dictTypeId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        target: "dict_types",
      },
    ],
  },
  {
    name: "configs",
    fields: [
      { name: "configName", type: "text", required: true, max: 100 },
      { name: "configKey", type: "text", required: true, max: 100 },
      { name: "configValue", type: "text", required: true, max: 0 },
      { name: "configType", type: "text", max: 10 },
      { name: "remark", type: "text", max: 500 },
    ],
  },
  {
    name: "user_roles",
    fields: [],
    relations: [
      {
        name: "userId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        target: "users",
      },
      {
        name: "roleId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        target: "roles",
      },
    ],
  },
  {
    name: "role_menus",
    fields: [],
    relations: [
      {
        name: "roleId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        target: "roles",
      },
      {
        name: "menuId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        target: "menus",
      },
    ],
  },
  {
    name: "user_posts",
    fields: [],
    relations: [
      {
        name: "userId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        target: "users",
      },
      {
        name: "postId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        target: "posts",
      },
    ],
  },
  {
    name: "role_depts",
    fields: [],
    relations: [
      {
        name: "roleId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        target: "roles",
      },
      {
        name: "deptId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        target: "depts",
      },
    ],
  },
  {
    name: "login_logs",
    fields: [
      { name: "userName", type: "text", max: 100 },
      { name: "ipaddr", type: "text", max: 50 },
      { name: "status", type: "text", required: true, max: 10 },
      { name: "msg", type: "text", max: 500 },
      { name: "loginTime", type: "date" },
      { name: "loginType", type: "text", max: 20 },
      { name: "userAgent", type: "text", max: 500 },
    ],
    relations: [
      {
        name: "userId",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  {
    name: "oper_logs",
    fields: [
      { name: "title", type: "text", max: 100 },
      { name: "operType", type: "text", max: 20 },
      { name: "method", type: "text", max: 200 },
      { name: "requestMethod", type: "text", max: 10 },
      { name: "operName", type: "text", max: 100 },
      { name: "operUrl", type: "text", max: 500 },
      { name: "operIp", type: "text", max: 50 },
      { name: "operParam", type: "text", max: 0 },
      { name: "jsonResult", type: "text", max: 0 },
      { name: "status", type: "number" },
      { name: "errorMsg", type: "text", max: 0 },
      { name: "costTime", type: "number" },
    ],
    relations: [
      {
        name: "userId",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  {
    name: "user_sessions",
    fields: [
      { name: "ipaddr", type: "text", max: 50 },
      { name: "browser", type: "text", max: 200 },
      { name: "os", type: "text", max: 100 },
      { name: "loginTime", type: "date" },
      { name: "lastActivityTime", type: "date" },
      { name: "status", type: "text", required: true, max: 10 },
    ],
    relations: [
      {
        name: "userId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        target: "users",
      },
    ],
  },
  {
    name: "error_logs",
    fields: [
      { name: "source", type: "text", max: 20 },
      { name: "level", type: "text", max: 10 },
      { name: "message", type: "text", max: 2000 },
      { name: "stack", type: "text", max: 0 },
      { name: "url", type: "text", max: 500 },
      { name: "method", type: "text", max: 10 },
      { name: "statusCode", type: "number" },
      { name: "platform", type: "text", max: 30 },
      { name: "ua", type: "text", max: 500 },
      { name: "fingerprint", type: "text", max: 64 },
      { name: "count", type: "number" },
      { name: "status", type: "text", max: 20 },
      { name: "lastSeen", type: "date" },
      { name: "meta", type: "json" },
    ],
    relations: [
      {
        name: "userId",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  {
    name: "uploads",
    // 报告 PDF 使用私有存储 key 并由 Nitro 权限代理读取；普通头像/附件仍可按原有方式使用。
    listRule: 'purpose != "talent-report-pdf"',
    viewRule: 'purpose != "talent-report-pdf"',
    fields: [
      { name: "file", type: "file", maxSelect: 1, maxSize: 10485760 },
      { name: "filename", type: "text", max: 255 },
      { name: "mimeType", type: "text", max: 100 },
      { name: "size", type: "number" },
      { name: "purpose", type: "text", max: 100 },
    ],
    relations: [
      {
        name: "userId",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  // ── M2 会员域：家长档案（一档一行）+ 子女独立档案；旧会员集合已在 M6 删除（ADR 0002-D1 / 0006-D1）。
  {
    name: "talent_parents",
    fields: [
      { name: "parentNo", type: "text", required: true, max: 64 },
      { name: "name", type: "text", required: true, max: 50 },
      { name: "mobileCipher", type: "text", required: true, max: 255 },
      { name: "mobileHash", type: "text", required: true, max: 64 },
      { name: "maskedMobile", type: "text", required: true, max: 20 },
      { name: "idNoCipher", type: "text", max: 255 },
      { name: "idNoHash", type: "text", max: 64 },
      { name: "maskedIdNo", type: "text", max: 24 },
      { name: "gender", type: "text", max: 10 },
      { name: "birthday", type: "text", max: 10 },
      { name: "source", type: "text", required: true, max: 20 },
      // 停用唯一真源；登录账号状态归 M6，不双写（ADR 0002-D4）。
      { name: "status", type: "text", required: true, max: 10 },
      { name: "registeredAt", type: "date", required: true },
      { name: "remark", type: "text", max: 500 },
    ],
    relations: [
      {
        name: "userId",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
      {
        name: "createdBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
      {
        name: "updatedBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  {
    name: "talent_children",
    fields: [
      { name: "name", type: "text", required: true, max: 50 },
      { name: "gender", type: "text", required: true, max: 10 },
      { name: "birthday", type: "text", required: true, max: 10 },
      // 语义是「该家长是这名子女的谁」（家长视角），不按子女性别反推。
      { name: "relation", type: "text", required: true, max: 20 },
      { name: "idNoCipher", type: "text", required: true, max: 255 },
      { name: "idNoHash", type: "text", required: true, max: 64 },
      { name: "maskedIdNo", type: "text", required: true, max: 24 },
      // 四态；reason 只在 not_found 有值。querySeq / queryAttempts 的必填性由服务层保证
      //（PB required number 等价于「不能为 0」，新建初值为 0 时不能标 required）。
      { name: "query", type: "text", required: true, max: 20 },
      { name: "queryReason", type: "text", max: 20 },
      { name: "querySeq", type: "number" },
      { name: "queryAttempts", type: "number" },
      { name: "queryStartedAt", type: "date" },
      { name: "queryAt", type: "date" },
      // 只有正常 / 已解绑；家长停用时由家长状态派生展示。
      { name: "status", type: "text", required: true, max: 10 },
      { name: "unbindAt", type: "date" },
    ],
    relations: [
      {
        name: "parentId",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "talent_parents",
      },
      {
        name: "unbindBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
      {
        name: "createdBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
      {
        name: "updatedBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  {
    name: "talent_levels",
    // 已废弃的技术字段，升级现有本地库时一并移除，避免继续出现在 PocketBase 管理界面。
    removeFields: ["style"],
    fields: [
      // M1 全局 4 档分级（ADR 0001-D1）；旧 elementId / levelCode / levelName / annotation
      // 与旧索引 idx_talent_levels_element_level 在 M6 删除（M6 规格 §2.2）。
      { name: "code", type: "text", required: true, max: 16 },
      { name: "name", type: "text", required: true, max: 20 },
      { name: "sortOrder", type: "number", required: true },
      { name: "range", type: "text", max: 20 },
      { name: "tone", type: "text", max: 20 },
      { name: "status", type: "text", required: true, max: 10 },
    ],
    relations: [
      {
        name: "createdBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
      {
        name: "updatedBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  // ── M3 报告域：外部基因报告（一人一份，(subjectType, subjectId) 唯一）；旧 talent_reports 只增量加字段。
  {
    name: "talent_gene_reports",
    fields: [
      { name: "subjectType", type: "text", required: true, max: 10 },
      { name: "subjectId", type: "text", required: true, max: 64 },
      { name: "reportNo", type: "text", required: true, max: 64 },
      { name: "name", type: "text", required: true, max: 50 },
      { name: "gender", type: "text", required: true, max: 10 },
      { name: "birthday", type: "text", required: true, max: 10 },
      // PocketBase 的 required number 等价于「不能为 0」；同步时周岁 0 岁合法，必填性由服务层保证。
      { name: "age", type: "number" },
      { name: "maskedIdNo", type: "text", required: true, max: 24 },
      // 只存 HMAC 与脱敏值：不存身份证明文 / 密文（M2 三件套只落在 talent_children）。
      { name: "idNoHash", type: "text", max: 64 },
      { name: "issuer", type: "text", max: 100 },
      { name: "filedAt", type: "date" },
      { name: "syncedAt", type: "date", required: true },
      { name: "source", type: "text", required: true, max: 20 },
      { name: "version", type: "text", max: 40 },
      // 外部已出分册编码，规范化大写、升序、去重（如 ABCD）。
      { name: "books", type: "text", required: true, max: 20 },
      // 外部原始篇目（可被同步刷新）；已发布报告的快照只在发布/补发/重算时写。
      { name: "sections", type: "json", required: true },
      { name: "sectionCount", type: "number" },
      { name: "status", type: "text", required: true, max: 20 },
    ],
    relations: [
      {
        name: "parentId",
        type: "relation",
        required: false,
        maxSelect: 1,
        cascadeDelete: false,
        target: "talent_parents",
      },
      {
        name: "createdBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
      {
        name: "updatedBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  {
    name: "talent_reports",
    removeFields: ["confirmedAt", "archivedAt", "version", "confirmedBy"],
    removeRelations: ["sourceBatchId", "confirmedBy"],
    fields: [
      { name: "reportNo", type: "text", required: true, max: 64 },
      { name: "reportType", type: "text", required: true, max: 100 },
      { name: "title", type: "text", required: true, max: 200 },
      { name: "coverUrl", type: "text", max: 500 },
      { name: "pdfUrl", type: "text", max: 1000 },
      { name: "pdfFileName", type: "text", max: 255 },
      { name: "pdfFileKey", type: "text", max: 1000 },
      { name: "pdfUploadedAt", type: "date" },
      { name: "testDate", type: "text", max: 20 },
      { name: "publishedAt", type: "date" },
      { name: "withdrawnAt", type: "date" },
      { name: "status", type: "text", required: true, max: 20 },
      { name: "errorMessage", type: "text", max: 1000 },
      { name: "totalItems", type: "number" },
      { name: "sourceSystem", type: "text", max: 40 },
      { name: "sourceExternalId", type: "text", max: 120 },
      // 第三方强制提供的 revision 仅作内部兼容去重，不作为业务概念。
      { name: "externalRevision", type: "text", max: 40 },
      { name: "sourceFingerprint", type: "text", max: 128 },
      { name: "syncedAt", type: "date" },
      { name: "matchedPlanIds", type: "json" },
      { name: "planMatchPolicyVersion", type: "text", max: 40 },
      { name: "planMatchReason", type: "text", max: 1000 },
      { name: "sourceResults", type: "json" },
      // ── M3 增量字段（旧字段全部保留到 M6；ADR 0003-D6） ──────────────────────
      { name: "subjectType", type: "text", max: 10 },
      { name: "subjectId", type: "text", max: 64 },
      { name: "factorCount", type: "number" },
      { name: "snapshotVersion", type: "number" },
      { name: "snapshotAt", type: "date" },
      { name: "queriedAt", type: "date" },
      { name: "openVolumeIds", type: "json" },
      { name: "factorSnapshot", type: "json" },
      { name: "volumeSnapshot", type: "json" },
      { name: "directionSnapshot", type: "json" },
      { name: "selections", type: "json" },
      { name: "versions", type: "json" },
      { name: "restoredAt", type: "date" },
    ],
    relations: [
      {
        name: "parentId",
        type: "relation",
        required: false,
        maxSelect: 1,
        cascadeDelete: false,
        target: "talent_parents",
      },
      {
        name: "geneReportId",
        type: "relation",
        required: false,
        maxSelect: 1,
        cascadeDelete: false,
        target: "talent_gene_reports",
      },
      {
        name: "createdBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
      {
        name: "updatedBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  {
    name: "talent_sync_logs",
    fields: [
      { name: "trigger", type: "text", required: true, max: 20 },
      { name: "status", type: "text", required: true, max: 20 },
      { name: "startedAt", type: "date" },
      { name: "finishedAt", type: "date" },
      { name: "durationMs", type: "number" },
      { name: "received", type: "number" },
      { name: "generated", type: "number" },
      { name: "skipped", type: "number" },
      { name: "failedCount", type: "number" },
      { name: "message", type: "text", max: 1000 },
      { name: "details", type: "json" },
      // ── M3 一键同步扩展：区分旧「第三方结果同步」日志，记录逐人明细（旧行空串）。 ──
      { name: "syncScope", type: "text", max: 20 },
      { name: "mode", type: "text", max: 10 },
      { name: "refreshed", type: "number" },
      { name: "createdCount", type: "number" },
      { name: "empty", type: "number" },
      { name: "subjectDetails", type: "json" },
      { name: "operatorId", type: "text", max: 64 },
    ],
    relations: [],
  },
  // ── M5 培育建议域：版本行（单一生效）+ 建议行（一份基因报告 × 一个版本）。
  // M5 不复用旧内容库口径；旧 talent_cultivation_contents 已在 M6 删除（ADR 0005-D6 / 0006-D1）。
  {
    name: "talent_advice_versions",
    fields: [
      { name: "versionNo", type: "text", required: true, max: 40 },
      // active 当前生效 / archived 已归档；同一时刻最多一行 active（部分唯一索引）。
      { name: "status", type: "text", required: true, max: 20 },
      // 生效周期显示值，如 `2026-11 ~ 2027-02`；创建时按 effectiveAt + 4 个月冻结。
      { name: "cycle", type: "text", required: true, max: 40 },
      { name: "effectiveAt", type: "date", required: true },
      { name: "nextUpdateAt", type: "date", required: true },
      { name: "syncedAt", type: "date", required: true },
      // mock 本地演示 / external M8 真实源。
      { name: "source", type: "text", required: true, max: 20 },
      { name: "note", type: "text", max: 500 },
      { name: "operatorId", type: "text", max: 64 },
      { name: "operatorName", type: "text", required: true, max: 50 },
    ],
    relations: [
      {
        name: "createdBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
      {
        name: "updatedBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  {
    name: "talent_advice_docs",
    fields: [
      { name: "adviceNo", type: "text", required: true, max: 80 },
      { name: "reportNo", type: "text", required: true, max: 64 },
      { name: "subjectType", type: "text", required: true, max: 10 },
      { name: "subjectId", type: "text", required: true, max: 64 },
      { name: "name", type: "text", required: true, max: 50 },
      // 只存脱敏值与 HMAC：不存身份证明文/密文，响应不返回 idNoHash。
      { name: "maskedIdNo", type: "text", required: true, max: 24 },
      { name: "idNoHash", type: "text", max: 64 },
      { name: "gender", type: "text", required: true, max: 10 },
      { name: "birthday", type: "text", required: true, max: 10 },
      // PocketBase required number 等价于「不能为 0」；0 岁合法，必填性由服务层保证。
      { name: "age", type: "number" },
      { name: "matchKey", type: "text", required: true, max: 120 },
      { name: "versionName", type: "text", required: true, max: 40 },
      // published 已发布 / withdrawn 已撤回；同步写入即 published。
      { name: "publishStatus", type: "text", required: true, max: 20 },
      { name: "publishedAt", type: "date" },
      { name: "withdrawnAt", type: "date" },
      { name: "syncedAt", type: "date", required: true },
      { name: "source", type: "text", required: true, max: 20 },
      // 同步时基因报告 books 快照，规范化大写升序去重（如 ABCD）。
      { name: "books", type: "text", required: true, max: 20 },
      // 同步原文快照（四段 + 分册/章节/要素/数据熵/变体）；写入后不可修改。
      { name: "sections", type: "json", required: true },
      // 派生缓存：写入时由 sections 计算，只读、可由 sections 重建（spec §3.4）。
      { name: "sectionCount", type: "number" },
      { name: "bookCount", type: "number" },
      { name: "entropyCounts", type: "json" },
      { name: "firstFactorName", type: "text", max: 50 },
    ],
    relations: [
      {
        name: "geneReportId",
        type: "relation",
        required: false,
        maxSelect: 1,
        cascadeDelete: false,
        target: "talent_gene_reports",
      },
      {
        name: "reportId",
        type: "relation",
        required: false,
        maxSelect: 1,
        cascadeDelete: false,
        target: "talent_reports",
      },
      {
        name: "versionId",
        type: "relation",
        required: false,
        maxSelect: 1,
        cascadeDelete: false,
        target: "talent_advice_versions",
      },
      {
        name: "parentId",
        type: "relation",
        required: false,
        maxSelect: 1,
        cascadeDelete: false,
        target: "talent_parents",
      },
      {
        name: "createdBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
      {
        name: "updatedBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  {
    name: "talent_reading_progress",
    fields: [
      { name: "readItemIds", type: "json" },
      { name: "lastReadItemId", type: "text", max: 64 },
      { name: "updatedAt", type: "date" },
    ],
    relations: [
      {
        name: "reportId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        target: "talent_reports",
      },
      {
        name: "userId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        target: "users",
      },
    ],
  },
  {
    name: "talent_factor_libraries",
    fields: [
      { name: "gender", type: "text", required: true, max: 16 },
      // PocketBase 的 required number 等价于「不能为 0」；年龄 0 与零计数都是合法值，必填性由服务层 Zod 保证。
      { name: "age", type: "number" },
      { name: "source", type: "text", required: true, max: 100 },
      { name: "version", type: "text", max: 40 },
      { name: "syncedAt", type: "date" },
      { name: "itemCount", type: "number", required: true },
      { name: "slotTotal", type: "number", required: true },
      { name: "filledCount", type: "number" },
      { name: "status", type: "text", required: true, max: 10 },
    ],
    relations: [
      {
        name: "syncedBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  {
    name: "talent_factors",
    fields: [
      { name: "code", type: "text", required: true, max: 16 },
      { name: "name", type: "text", required: true, max: 100 },
      { name: "category", type: "text", required: true, max: 2 },
      { name: "categoryName", type: "text", required: true, max: 20 },
      { name: "sortOrder", type: "number" },
      // 12 槽位 × 四段文案（content / example / direction / suggestion），结构由 Zod 校验。
      { name: "slots", type: "json", required: true },
      { name: "slotTotal", type: "number", required: true },
      { name: "filledSlotCount", type: "number" },
      { name: "partialSlotCount", type: "number" },
    ],
    relations: [
      {
        name: "libraryId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: true,
        target: "talent_factor_libraries",
      },
      {
        name: "createdBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
      {
        name: "updatedBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  {
    name: "talent_factor_notes",
    fields: [
      { name: "code", type: "text", required: true, max: 32 },
      { name: "factorCode", type: "text", required: true, max: 16 },
      { name: "category", type: "text", required: true, max: 2 },
      { name: "levelCode", type: "text", required: true, max: 16 },
      { name: "note", type: "text", max: 2000 },
      { name: "ageRange", type: "text", max: 50 },
      { name: "gender", type: "text", max: 10 },
      { name: "status", type: "text", required: true, max: 10 },
    ],
    relations: [
      {
        name: "createdBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
      {
        name: "updatedBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  {
    name: "talent_directions",
    fields: [
      { name: "code", type: "text", required: true, max: 64 },
      { name: "name", type: "text", required: true, max: 100 },
      { name: "description", type: "text", max: 500 },
      { name: "icon", type: "text", max: 100 },
      // [{ code, level }]；引用完整性由 server/utils/talent-rule.ts 校验。
      // M4 转正会生成「停用待配置」方向（requirements=[]，ADR 0004-D5）：PocketBase 的
      // required JSON 会把空数组判为 blank，因此该字段必须允许空数组；M1 保存校验仍要求 ≥1 条。
      { name: "requirements", type: "json" },
      { name: "tierIds", type: "json", required: true },
      { name: "defaultTierId", type: "text", required: true, max: 64 },
      { name: "aliases", type: "json" },
      { name: "version", type: "number", required: true },
      { name: "status", type: "text", required: true, max: 10 },
    ],
    relations: [
      {
        name: "createdBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
      {
        name: "updatedBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  {
    name: "talent_tiers",
    fields: [
      { name: "code", type: "text", required: true, max: 16 },
      { name: "name", type: "text", required: true, max: 20 },
      { name: "sortOrder", type: "number", required: true },
      { name: "teacher", type: "text", required: true, max: 50 },
      { name: "freq", type: "text", required: true, max: 50 },
      { name: "headline", type: "text", max: 100 },
      { name: "description", type: "text", max: 1000 },
      { name: "preset", type: "bool", required: true },
      // PocketBase 的 required bool 等价于「必须为 true」；默认档位需要允许 false，唯一性交给部分唯一索引。
      { name: "isDefault", type: "bool" },
      { name: "status", type: "text", required: true, max: 10 },
    ],
    relations: [
      {
        name: "updatedBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  // ── M4 方向匹配域：自定义方向待归并（只新增本集合；M1 方向/档位/分级字段与索引原样保留）。 ──
  {
    name: "talent_direction_requests",
    fields: [
      { name: "subjectType", type: "text", required: true, max: 10 },
      { name: "subjectId", type: "text", required: true, max: 64 },
      // 家长填写原文：trim 后 1–10 字（按 Unicode 码位计），由服务层校验。
      { name: "manualName", type: "text", required: true, max: 20 },
      { name: "tierId", type: "text", required: true, max: 64 },
      // `待归并` / `已归并` / `已转正式`；待归并状态由部分唯一索引防重复提交。
      { name: "status", type: "text", required: true, max: 10 },
      // `已归并`：目标正式方向 id；`已转正式`：新建方向 id（方向仍在 talent_directions）。
      { name: "targetDirectionId", type: "text", max: 64 },
      { name: "mergedAt", type: "date" },
    ],
    relations: [
      {
        name: "reportId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: false,
        target: "talent_reports",
      },
      {
        name: "parentId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: false,
        target: "talent_parents",
      },
      {
        name: "mergedBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
      {
        name: "createdBy",
        type: "relation",
        maxSelect: 1,
        cascadeDelete: false,
        target: "users",
      },
    ],
  },
  // ── M8 PDF 域：产物元数据 + 下载留痕（只新增两集合；不改 talent_reports / uploads 结构）。
  {
    name: "talent_report_pdfs",
    // 仅服务端 admin 读写：C 端只经权限代理拿文件，不开放任何直链 / 列表。
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "volumeId", type: "text", required: true, max: 2 },
      { name: "contentHash", type: "text", required: true, max: 64 },
      // PB 的 required number 等价于「不能为 0」；快照版本补发后恒 ≥1，必填性由服务层保证。
      { name: "snapshotVersion", type: "number" },
      { name: "storage", type: "text", required: true, max: 10 },
      { name: "objectKey", type: "text", required: true, max: 255 },
      { name: "fileName", type: "text", required: true, max: 120 },
      { name: "byteSize", type: "number" },
      { name: "pageCount", type: "number" },
      { name: "templateVersion", type: "text", required: true, max: 20 },
      { name: "fontVersion", type: "text", required: true, max: 20 },
      { name: "watermarkPolicy", type: "text", required: true, max: 40 },
      { name: "watermarkAt", type: "date" },
      { name: "renderedAt", type: "date" },
    ],
    relations: [
      {
        name: "reportId",
        type: "relation",
        required: true,
        maxSelect: 1,
        cascadeDelete: false,
        target: "talent_reports",
      },
    ],
  },
  {
    // 客户真实报告原版 PDF（客户同步/运营导入），C 端优先预览/下载该文件；私有，仅服务端代理。
    name: "talent_report_source_pdfs",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "volumeId", type: "text", required: true, max: 2 },
      { name: "originalName", type: "text", required: true, max: 255 },
      { name: "file", type: "file", maxSelect: 1, maxSize: 20971520 },
      { name: "byteSize", type: "number" },
      { name: "checksum", type: "text", required: true, max: 64 },
      { name: "source", type: "text", required: true, max: 20 },
      { name: "importedAt", type: "date" },
    ],
    relations: [
      { name: "reportId", type: "relation", required: true, maxSelect: 1, cascadeDelete: false, target: "talent_reports" },
      { name: "geneReportId", type: "relation", maxSelect: 1, cascadeDelete: false, target: "talent_gene_reports" },
    ],
  },
  {
    name: "talent_pdf_downloads",
    // 下载留痕只给服务端 / PB admin 按需查询，不开放任何 API 列表。
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "reportId", type: "text", required: true, max: 64 },
      { name: "volumeId", type: "text", required: true, max: 2 },
      { name: "parentUserId", type: "text", required: true, max: 64 },
      { name: "subjectType", type: "text", required: true, max: 10 },
      { name: "subjectId", type: "text", required: true, max: 64 },
      { name: "result", type: "text", required: true, max: 20 },
      { name: "storage", type: "text", max: 10 },
      { name: "contentHash", type: "text", max: 64 },
      { name: "renderMs", type: "number" },
      { name: "cacheHit", type: "bool" },
      { name: "at", type: "date", required: true },
      { name: "ipHash", type: "text", max: 64 },
      { name: "uaFamily", type: "text", max: 20 },
      { name: "requestId", type: "text", max: 40 },
    ],
  },
];

// ── M2 会员域集合与索引（新库 assert / 存量库 sync-talent 共用；只加不删） ─────────────
/** M2 会员域新增集合；旧会员集合已在 M6 删除，见 LEGACY_TALENT_COLLECTION_NAMES。 */
export const TALENT_MEMBER_COLLECTION_NAMES = [
  "talent_parents",
  "talent_children",
];

/**
 * M2 会员域索引清单：家长编号 / 手机号哈希 / 身份证哈希（部分唯一）/ 登录账号（部分唯一）
 * + 子女身份证哈希（全局唯一，解绑不删档）+ 列表与查询用普通索引。
 */
export const TALENT_MEMBER_INDEX_DEFS = [
  [
    "talent_parents",
    "CREATE UNIQUE INDEX idx_talent_parents_no ON talent_parents (parentNo)",
  ],
  [
    "talent_parents",
    "CREATE UNIQUE INDEX idx_talent_parents_mobile ON talent_parents (mobileHash)",
  ],
  [
    "talent_parents",
    'CREATE UNIQUE INDEX idx_talent_parents_idno ON talent_parents (idNoHash) WHERE idNoHash != ""',
  ],
  [
    "talent_parents",
    'CREATE UNIQUE INDEX idx_talent_parents_user ON talent_parents (userId) WHERE userId != ""',
  ],
  [
    "talent_parents",
    "CREATE INDEX idx_talent_parents_status ON talent_parents (status)",
  ],
  [
    "talent_children",
    "CREATE UNIQUE INDEX idx_talent_children_idno ON talent_children (idNoHash)",
  ],
  [
    "talent_children",
    "CREATE INDEX idx_talent_children_parent ON talent_children (parentId)",
  ],
  [
    "talent_children",
    "CREATE INDEX idx_talent_children_query ON talent_children (query)",
  ],
  [
    "talent_children",
    "CREATE INDEX idx_talent_children_parent_status ON talent_children (parentId, status)",
  ],
];

// ── M3 报告域集合与索引（新库 assert / 存量库 sync-talent 共用；只加不删） ─────────────
/** M3 新增集合：外部基因报告（一人一份）；旧 talent_reports 只增量加字段/索引。 */
export const TALENT_REPORT_COLLECTION_NAMES = ["talent_gene_reports"];

/**
 * M3 索引清单：基因报告唯一键 / 报告编号 / 家长 / 同步时间 + 报告归属唯一键（部分唯一）与
 * 列表、补发、查询用普通索引。旧 `idx_talent_reports_no` 与旧集合索引原样保留。
 */
export const TALENT_REPORT_INDEX_DEFS = [
  [
    "talent_gene_reports",
    "CREATE UNIQUE INDEX idx_talent_gene_reports_subject ON talent_gene_reports (subjectType, subjectId)",
  ],
  [
    "talent_gene_reports",
    "CREATE UNIQUE INDEX idx_talent_gene_reports_no ON talent_gene_reports (reportNo)",
  ],
  [
    "talent_gene_reports",
    "CREATE INDEX idx_talent_gene_reports_parent ON talent_gene_reports (parentId)",
  ],
  [
    "talent_gene_reports",
    "CREATE INDEX idx_talent_gene_reports_synced ON talent_gene_reports (syncedAt)",
  ],
  [
    "talent_reports",
    'CREATE UNIQUE INDEX idx_talent_reports_subject ON talent_reports (subjectType, subjectId) WHERE subjectType != ""',
  ],
  [
    "talent_reports",
    "CREATE INDEX idx_talent_reports_status ON talent_reports (status)",
  ],
  [
    "talent_reports",
    "CREATE INDEX idx_talent_reports_parent ON talent_reports (parentId)",
  ],
  [
    "talent_reports",
    "CREATE INDEX idx_talent_reports_gene ON talent_reports (geneReportId)",
  ],
  [
    "talent_reports",
    "CREATE INDEX idx_talent_reports_subject_id ON talent_reports (subjectId)",
  ],
];

// ── M5 培育建议域集合与索引（新库 assert / 存量库 sync-talent 共用；只加不删） ───────────
/** M5 新增集合：建议版本 + 建议书（一份基因报告 × 一个版本一行）。 */
export const TALENT_ADVICE_COLLECTION_NAMES = [
  "talent_advice_versions",
  "talent_advice_docs",
];

/**
 * M5 索引清单：
 * - 版本层：`versionNo` 全局唯一 + `status="active"` 部分唯一索引（单一生效版本）+ 生效日期索引；
 * - 建议层：`adviceNo` 全局唯一 + `(versionId, geneReportId)` 部分唯一（同一版本一人一份）+
 *   列表/版本视图/报告联动/检索/同步时间索引。
 * 旧集合及其索引已在 M6 删除（见 LEGACY_TALENT_COLLECTION_NAMES / cleanup-m6.mjs，ADR 0006-D1）。
 */
export const TALENT_ADVICE_INDEX_DEFS = [
  [
    "talent_advice_versions",
    "CREATE UNIQUE INDEX idx_talent_advice_versions_no ON talent_advice_versions (versionNo)",
  ],
  [
    "talent_advice_versions",
    'CREATE UNIQUE INDEX idx_talent_advice_versions_active ON talent_advice_versions (status) WHERE status = "active"',
  ],
  [
    "talent_advice_versions",
    "CREATE INDEX idx_talent_advice_versions_effective ON talent_advice_versions (effectiveAt)",
  ],
  [
    "talent_advice_docs",
    "CREATE UNIQUE INDEX idx_talent_advice_docs_no ON talent_advice_docs (adviceNo)",
  ],
  [
    "talent_advice_docs",
    'CREATE UNIQUE INDEX idx_talent_advice_docs_version_gene ON talent_advice_docs (versionId, geneReportId) WHERE geneReportId != ""',
  ],
  [
    "talent_advice_docs",
    "CREATE INDEX idx_talent_advice_docs_version_status ON talent_advice_docs (versionId, publishStatus)",
  ],
  [
    "talent_advice_docs",
    "CREATE INDEX idx_talent_advice_docs_report ON talent_advice_docs (reportId)",
  ],
  [
    "talent_advice_docs",
    "CREATE INDEX idx_talent_advice_docs_gene ON talent_advice_docs (geneReportId)",
  ],
  [
    "talent_advice_docs",
    "CREATE INDEX idx_talent_advice_docs_subject ON talent_advice_docs (subjectType, subjectId)",
  ],
  [
    "talent_advice_docs",
    "CREATE INDEX idx_talent_advice_docs_reportno ON talent_advice_docs (reportNo)",
  ],
  [
    "talent_advice_docs",
    "CREATE INDEX idx_talent_advice_docs_synced ON talent_advice_docs (syncedAt)",
  ],
];

// ── M4 方向匹配域集合与索引（新库 assert / 存量库 sync-talent 共用；只加不删） ─────────────
/** M4 新增集合：自定义方向待归并（M1 方向 / 档位 / 分级集合与索引原样保留）。 */
export const TALENT_DIRECTION_COLLECTION_NAMES = ["talent_direction_requests"];

/**
 * M4 索引清单（spec §3.6）：
 * - 待归并唯一键 `(reportId, manualName) WHERE status = "待归并"` 防重复提交；
 * - 状态 / 报告 / 家长普通索引供列表与 M6 计数使用。
 * 不新增 `talent_reports` 索引（M3 负责）。
 */
export const TALENT_DIRECTION_INDEX_DEFS = [
  [
    "talent_direction_requests",
    'CREATE UNIQUE INDEX idx_talent_direction_requests_pending ON talent_direction_requests (reportId, manualName) WHERE status = "待归并"',
  ],
  [
    "talent_direction_requests",
    "CREATE INDEX idx_talent_direction_requests_status ON talent_direction_requests (status)",
  ],
  [
    "talent_direction_requests",
    "CREATE INDEX idx_talent_direction_requests_report ON talent_direction_requests (reportId)",
  ],
  [
    "talent_direction_requests",
    "CREATE INDEX idx_talent_direction_requests_parent ON talent_direction_requests (parentId)",
  ],
];

// ── M8 PDF 域集合与索引（新库 assert / 存量库 sync-talent 共用；只加不删） ─────────────
/** M8 新增集合：PDF 产物元数据 + 下载留痕（无 PII；不改旧集合 / 旧字段）。 */
export const TALENT_PDF_COLLECTION_NAMES = [
  "talent_report_pdfs",
  "talent_report_source_pdfs",
  "talent_pdf_downloads",
];

/**
 * M8 索引清单（spec §7.1/§7.2）：
 * - 产物唯一键 `(reportId, volumeId, contentHash)` 保证同内容只渲染一次；报告 / 哈希 / 渲染时间索引供清理与审计；
 * - 下载留痕按报告时间、时间、家长时间索引供运维查询与保留期清理。
 */
export const TALENT_PDF_INDEX_DEFS = [
  [
    "talent_report_pdfs",
    "CREATE UNIQUE INDEX idx_talent_report_pdfs_content ON talent_report_pdfs (reportId, volumeId, contentHash)",
  ],
  [
    "talent_report_source_pdfs",
    "CREATE UNIQUE INDEX idx_talent_report_source_pdfs_volume ON talent_report_source_pdfs (reportId, volumeId)",
  ],
  [
    "talent_report_source_pdfs",
    "CREATE INDEX idx_talent_report_source_pdfs_report ON talent_report_source_pdfs (reportId)",
  ],
  [
    "talent_report_pdfs",
    "CREATE INDEX idx_talent_report_pdfs_report ON talent_report_pdfs (reportId)",
  ],
  [
    "talent_report_pdfs",
    "CREATE INDEX idx_talent_report_pdfs_hash ON talent_report_pdfs (contentHash)",
  ],
  [
    "talent_report_pdfs",
    "CREATE INDEX idx_talent_report_pdfs_rendered ON talent_report_pdfs (renderedAt)",
  ],
  [
    "talent_pdf_downloads",
    "CREATE INDEX idx_talent_pdf_downloads_report_at ON talent_pdf_downloads (reportId, at)",
  ],
  [
    "talent_pdf_downloads",
    "CREATE INDEX idx_talent_pdf_downloads_at ON talent_pdf_downloads (at)",
  ],
  [
    "talent_pdf_downloads",
    "CREATE INDEX idx_talent_pdf_downloads_parent_at ON talent_pdf_downloads (parentUserId, at)",
  ],
];

function loadDotEnv() {
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]\w*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function prepareMigrationsDir() {
  assertEmptyMigrationsDirectory();
}

/**
 * 确认没有待执行的 PocketBase 迁移；仓库中的 `.gitkeep` 仅用于保留空目录，不是迁移文件。
 *
 * @param {string} migrationsDir PocketBase 迁移目录。
 * @returns {void}
 */
export function assertEmptyMigrationsDirectory(
  migrationsDir = PB_MIGRATIONS_DIR,
) {
  if (!existsSync(migrationsDir)) {
    mkdirSync(migrationsDir, { recursive: true });
    return;
  }

  let entries;
  try {
    entries = readdirSync(migrationsDir);
  } catch {
    throw new Error(`PocketBase 迁移目录不可读取：${migrationsDir}`);
  }
  const migrationEntries = entries.filter((entry) => entry !== ".gitkeep");
  if (migrationEntries.length)
    throw new Error(
      `PocketBase 迁移目录必须为空：${migrationsDir}。基础初始化不会删除或重放迁移文件。`,
    );
}

/**
 * 初始化只允许使用新的空数据目录，绝不把基础 schema 叠加到已有 PocketBase 库。
 *
 * @param {string} dataDir PocketBase 数据目录。
 * @returns {void}
 */
export function assertFreshDataDirectory(dataDir = PB_DATA_DIR) {
  if (!existsSync(dataDir)) return;
  let entries;
  try {
    entries = readdirSync(dataDir);
  } catch {
    throw new Error(
      `POCKETBASE_DATA_DIR 不是可读取目录：${dataDir}。请指定新的空目录。`,
    );
  }
  if (entries.length) {
    throw new Error(
      `基础版初始化只支持新的空数据目录；${dataDir} 已包含 ${entries.join(", ")}。` +
        "请改用新的 POCKETBASE_DATA_DIR；本脚本不会迁移、覆盖或清理现有数据。",
    );
  }
}

function resolvePocketBaseBinary() {
  const configured = process.env.POCKETBASE_BINARY;
  if (configured && existsSync(configured)) return configured;
  return (
    [
      resolve(ROOT, "pocketbase", "pocketbase"),
      resolve(ROOT, "pocketbase", "pocketbase.exe"),
    ].find(existsSync) || null
  );
}

async function isPocketBaseReady() {
  try {
    return (await fetch(`${PB_URL}/api/health`)).ok;
  } catch {
    return false;
  }
}

async function waitForPocketBase() {
  for (let attempt = 0; attempt < MAX_WAIT_SECONDS; attempt++) {
    if (await isPocketBaseReady()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function startPocketBase() {
  const binary = resolvePocketBaseBinary();
  if (!binary)
    throw new Error(
      "找不到 PocketBase 二进制文件；请先运行 pnpm env:setup 或设置 POCKETBASE_BINARY。",
    );
  prepareMigrationsDir();
  return spawn(
    binary,
    [
      "serve",
      `--dir=${PB_DATA_DIR}`,
      `--migrationsDir=${PB_MIGRATIONS_DIR}`,
      "--automigrate=false",
      "--http",
      PB_URL.replace(/^https?:\/\//, ""),
    ],
    {
      cwd: ROOT,
      stdio: "inherit",
    },
  );
}

function bootstrapSuperuser() {
  const binary = resolvePocketBaseBinary();
  if (!binary)
    throw new Error("找不到 PocketBase 二进制文件，无法创建初始超级管理员。");
  prepareMigrationsDir();
  const result = spawnSync(
    binary,
    [
      "superuser",
      "upsert",
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      `--dir=${PB_DATA_DIR}`,
      `--migrationsDir=${PB_MIGRATIONS_DIR}`,
      "--automigrate=false",
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
    },
  );
  if (result.status !== 0)
    throw new Error(
      (
        result.stderr ||
        result.stdout ||
        "创建 PocketBase 超级管理员失败"
      ).trim(),
    );
}

async function loginAsSuperuser() {
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  try {
    await pb
      .collection("_superusers")
      .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  } catch {
    bootstrapSuperuser();
    await pb
      .collection("_superusers")
      .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  }
  return pb;
}

export async function createCollection(pb, definition) {
  try {
    return await pb.collections.getOne(definition.name);
  } catch {
    /* 仅新库会进入创建分支。 */
  }
  const isAuth = definition.name === "users";
  const fields = isAuth
    ? definition.fields
    : [
        ...definition.fields,
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ];
  return pb.collections.create({
    name: definition.name,
    type: isAuth ? "auth" : "base",
    fields,
    listRule: definition.listRule ?? null,
    viewRule: definition.viewRule ?? null,
    createRule: definition.createRule ?? null,
    updateRule: definition.updateRule ?? null,
    deleteRule: definition.deleteRule ?? null,
  });
}

/** 补齐集合自定义字段；PocketBase 创建 auth collection 时会先落其内置字段。 */
export async function installFields(pb, definition) {
  const collection = await pb.collections.getOne(definition.name);
  const removeFields = new Set(definition.removeFields || []);
  const fields = collection.fields.filter(
    (field) => !removeFields.has(field.name),
  );
  let changed = fields.length !== collection.fields.length;
  for (const field of definition.fields) {
    if (fields.some((current) => current.name === field.name)) continue;
    fields.push(field);
    changed = true;
  }
  if (changed) await pb.collections.update(collection.id, { fields });
}

export async function installRelations(pb, definition, collectionByName) {
  if (!definition.relations?.length) return;
  const collection = await pb.collections.getOne(definition.name);
  const removeRelations = new Set(definition.removeRelations || []);
  const fields = collection.fields.filter(
    (field) => !removeRelations.has(field.name),
  );
  for (const relation of definition.relations) {
    if (fields.some((field) => field.name === relation.name)) continue;
    const target = collectionByName.get(relation.target);
    if (!target)
      throw new Error(
        `集合 ${definition.name} 缺少关联目标 ${relation.target}`,
      );
    const field = { ...relation };
    delete field.target;
    fields.push({ ...field, collectionId: target.id });
  }
  await pb.collections.update(collection.id, { fields });
}

/**
 * 从 CREATE INDEX SQL 中读取索引名；判重不能只匹配 "INDEX" 关键字。
 *
 * @param {string} indexSql PocketBase 返回或待写入的 CREATE INDEX SQL。
 * @returns {string | null} 索引名。
 */
export function indexNameFromSql(indexSql) {
  const match = indexSql.match(
    /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:"([^"]+)"|`([^`]+)`|([A-Za-z_][A-Za-z0-9_]*))\s+/i,
  );
  return match?.[1] || match?.[2] || match?.[3] || null;
}

export async function ensureIndex(pb, collectionName, indexSql) {
  const collection = await pb.collections.getOne(collectionName);
  const indexName = indexNameFromSql(indexSql);
  if (!indexName) throw new Error(`索引 SQL 缺少有效名称：${indexSql}`);
  if (
    collection.indexes?.some((index) => indexNameFromSql(index) === indexName)
  )
    return;
  await pb.collections.update(collection.id, {
    indexes: [...(collection.indexes || []), indexSql],
  });
}

async function upsert(pb, collection, filter, data) {
  const existing = await pb
    .collection(collection)
    .getFirstListItem(filter, { $autoCancel: false })
    .catch(() => null);
  return existing
    ? pb
        .collection(collection)
        .update(existing.id, data, { $autoCancel: false })
    : pb.collection(collection).create(data, { $autoCancel: false });
}

export async function seedMenus(pb) {
  // 新项目不再保留基础概览入口；同步清理旧菜单及其角色授权，避免初始化后继续出现在权限树中。
  const obsoleteOverviewMenus = await pb.collection("menus").getFullList({
    filter:
      'path = "/admin/overview" || permissionCode = "foundation:overview"',
    $autoCancel: false,
  });
  for (const menu of obsoleteOverviewMenus) {
    const assignments = await pb.collection("role_menus").getFullList({
      filter: `menuId = "${menu.id}"`,
      $autoCancel: false,
    });
    for (const assignment of assignments)
      await pb
        .collection("role_menus")
        .delete(assignment.id, { $autoCancel: false });
    await pb.collection("menus").delete(menu.id, { $autoCancel: false });
  }
  // 后台侧栏结构（2026-11-16 用户口径）：工作台、会员管理直接一级 C 菜单，不再建同名 M 目录；
  // 培养方向管理并入「天赋规则」；系统管理 / 运行监控恢复为内置页面组（仅 superAdmin 可见）。
  // 旧菜单只停用（status = "0"）隐藏，不删除。
  /** 按菜单名查找并迁移一级分组：命中规范名或旧名即复用同一行，保留既有 role_menus 关联。 */
  async function upsertMenuGroup(definition) {
    const findByFilter = (filter) =>
      pb
        .collection("menus")
        .getFirstListItem(filter, { $autoCancel: false })
        .catch(() => null);
    const existing =
      (await findByFilter(definition.filter)) ||
      (definition.legacyFilter
        ? await findByFilter(definition.legacyFilter)
        : null);
    const data = {
      menuType: "M",
      menuName: definition.menuName,
      icon: definition.icon,
      orderNum: definition.orderNum,
      visible: "0",
      status: definition.status || "1",
      parentId: null,
    };
    const group = existing
      ? await pb
          .collection("menus")
          .update(existing.id, data, { $autoCancel: false })
      : await pb.collection("menus").create(data, { $autoCancel: false });
    // 旧名残留行（如「天赋报告」已迁移到「报告管理」）只停用，不删除。
    if (definition.legacyFilter) {
      const leftovers = await pb
        .collection("menus")
        .getFullList({ filter: definition.legacyFilter, $autoCancel: false });
      for (const leftover of leftovers)
        if (leftover.id !== group.id)
          await pb
            .collection("menus")
            .update(leftover.id, { status: "0" }, { $autoCancel: false });
    }
    return group;
  }

  const groupDefinitions = [
    {
      filter: 'menuType = "M" && menuName = "天赋规则"',
      menuName: "天赋规则",
      icon: "settings",
      orderNum: 30,
    },
    {
      filter: 'menuType = "M" && menuName = "报告管理"',
      legacyFilter: 'menuType = "M" && menuName = "天赋报告"',
      menuName: "报告管理",
      icon: "file-text",
      orderNum: 40,
    },
    {
      // 底座系统管理恢复：10 个内置页面，仅 superAdmin 可见。
      filter: 'menuType = "M" && menuName = "系统管理"',
      menuName: "系统管理",
      icon: "settings",
      orderNum: 50,
    },
    {
      // 底座运行监控恢复：6 个内置页面，仅 superAdmin 可见。
      filter: 'menuType = "M" && menuName = "运行监控"',
      menuName: "运行监控",
      icon: "activity",
      orderNum: 60,
    },
  ];
  const menuGroups = new Map();
  for (const definition of groupDefinitions)
    menuGroups.set(definition.menuName, await upsertMenuGroup(definition));
  // 旧「分级与固定注解」菜单沿用同一行（保 role_menus 关联），把 path / component / permissionCode
  // 指向新页；不新增同名菜单。旧 /admin/talent/level 页面已在 M6 删除（ADR 0001-D5 / 0006-D1）。
  const legacyRuleLevelMenu = await pb
    .collection("menus")
    .getFirstListItem(
      'menuType = "C" && menuName = "分级与固定注解" && path != "/admin/talent/rules/level"',
      { $autoCancel: false },
    )
    .catch(() => null);
  if (legacyRuleLevelMenu)
    await pb.collection("menus").update(
      legacyRuleLevelMenu.id,
      {
        path: "/admin/talent/rules/level",
        component: "admin/talent/rules/level.vue",
        permissionCode: "talent:rule:list",
      },
      { $autoCancel: false },
    );

  // 侧栏页面：工作台、会员管理是一级 C 菜单（parentId = null，侧栏直接显示）；
  // 天赋规则顺序为潜质要素 → 分级与固定注解 → 培养方向管理；报告管理为基因报告 → 培育建议。
  // 与旧菜单同 path 时直接改名称 / 父级，不再新增同名项。菜单定义统一收口到 TALENT_PAGE_MENU_DEFS，
  // 供三角色矩阵与单测共用（M6-A）。
  const talentMenus = TALENT_PAGE_MENU_DEFS;
  const created = [];

  /** 按 path 幂等写入 C 菜单；target 与旧菜单同 path 时复用旧行并改名称 / 父级。
   * `matchByName` 用于同一页面挂两个入口的情况（如「服务器信息」复用系统健康页）：
   * 按菜单名匹配，避免与同 path 的「系统健康」行互相覆盖。 */
  async function upsertMenuPage(definition) {
    if (definition.parent && !menuGroups.has(definition.parent))
      throw new Error(`菜单父级不存在：${definition.parent}`);
    const parentId = definition.parent ? menuGroups.get(definition.parent).id : null;
    const data = {
      menuType: "C",
      menuName: definition.menuName,
      path: definition.path,
      component: definition.component,
      permissionCode: definition.permissionCode,
      parentId,
      icon: definition.icon || "circle",
      orderNum: definition.orderNum,
      visible: "0",
      status: definition.status || "1",
    };
    if (definition.remark) data.remark = definition.remark;
    const filter = definition.matchByName
      ? `menuType = "C" && menuName = "${definition.menuName}"`
      : `path = "${definition.path}"`;
    return upsert(pb, "menus", filter, data);
  }

  // M3 报告域：沿用旧「基因报告」C 行（原旧报告页 path）重指向新页 /admin/talent/reports，
  // 保留行 id 与 role_menus 关联；不新增同名 C 菜单。旧页 [resource].vue 与旧
  // 旧报告 revoke/edit/receive 码与旧 F 行在 M6 删除（见 LEGACY_TALENT_PERMISSION_CODES）。
  const legacyReportPageMenu = await pb
    .collection("menus")
    .getFirstListItem(
      'menuType = "C" && path = "/admin/talent/report"',
      { $autoCancel: false },
    )
    .catch(() => null);
  if (legacyReportPageMenu)
    await pb.collection("menus").update(
      legacyReportPageMenu.id,
      {
        path: "/admin/talent/reports",
        component: "admin/talent/reports/index.vue",
        permissionCode: "talent:report:list",
      },
      { $autoCancel: false },
    );

  // M2 会员域：沿用旧「会员管理」C 行（原旧会员页 path）重指向新页，保留行 id 与
  // role_menus 关联；不新增同名菜单。旧会员码与旧页在 M6 删除（见 LEGACY_TALENT_PERMISSION_CODES）。
  const legacyCustomerPageMenu = await pb
    .collection("menus")
    .getFirstListItem(
      'menuType = "C" && path = "/admin/talent/customer"',
      { $autoCancel: false },
    )
    .catch(() => null);
  if (legacyCustomerPageMenu)
    await pb.collection("menus").update(
      legacyCustomerPageMenu.id,
      {
        path: "/admin/talent/member",
        component: "admin/talent/member/index.vue",
        permissionCode: "talent:parent:list",
      },
      { $autoCancel: false },
    );

  for (const [
    menuName,
    path,
    component,
    permissionCode,
    parent,
    icon,
    orderNum,
  ] of talentMenus)
    created.push(
      await upsertMenuPage({
        menuName,
        path,
        component,
        permissionCode,
        parent,
        icon,
        orderNum,
      }),
    );

  // 系统管理：恢复底座内置 9 个页面（仅 superAdmin 可见）；机构管理随机构端在 M6 退出。
  const systemPageMenus = [
    ["用户列表", "/admin/user", "admin/user/index.vue", "system:user:list", "users", 1],
    ["菜单管理", "/admin/menu", "admin/menu/index.vue", "system:menu:list", "list", 2],
    ["角色管理", "/admin/role", "admin/role/index.vue", "system:role:list", "shield", 3],
    ["部门管理", "/admin/dept", "admin/dept/index.vue", "system:dept:list", "briefcase", 4],
    ["岗位管理", "/admin/post", "admin/post/index.vue", "system:post:list", "user-check", 5],
    ["字典管理", "/admin/dict", "admin/dict/index.vue", "system:dict:list", "book-open", 6],
    ["参数设置", "/admin/config", "admin/config/index.vue", "system:config:list", "settings", 7],
    ["站点配置", "/admin/site-config", "admin/site-config/index.vue", "system:config:list", "palette", 8],
    ["微信配置", "/admin/settings/wechat", "admin/settings/wechat/index.vue", "system:config:list", "message-square", 9],
  ];
  for (const [menuName, path, component, permissionCode, icon, orderNum] of systemPageMenus)
    created.push(
      await upsertMenuPage({
        menuName,
        path,
        component,
        permissionCode,
        parent: "系统管理",
        icon,
        orderNum,
      }),
    );

  // 运行监控：恢复底座内置 6 个页面（仅 superAdmin 可见）；操作日志 / 登录日志归入本组。
  // 「服务器信息」没有独立页面，复用系统健康页（该页已含 PB 版本、集合数、运行摘要与环境状态），
  // 因此按菜单名匹配而不是 path，避免和「系统健康」互相覆盖。
  const monitorPageMenus = [
    [
      "系统健康",
      "/admin/monitor/health",
      "admin/monitor/health/index.vue",
      "monitor:health:list",
      "activity",
      1,
    ],
    [
      "服务器信息",
      "/admin/monitor/health",
      "admin/monitor/health/index.vue",
      "monitor:health:list",
      "server",
      2,
      {
        matchByName: true,
        remark: "无独立服务器信息页，复用系统健康页（PB 版本 / 集合数 / 运行摘要 / 环境状态）",
      },
    ],
    [
      "在线用户",
      "/admin/monitor/online",
      "admin/monitor/online/index.vue",
      "monitor:online:list",
      "users",
      3,
    ],
    [
      "错误监控",
      "/admin/monitor/error",
      "admin/monitor/error/index.vue",
      "monitor:error:list",
      "alert-triangle",
      4,
    ],
    [
      "操作日志",
      "/admin/log/oper-log",
      "admin/log/oper-log.vue",
      "system:operlog:list",
      "file-text",
      5,
    ],
    [
      "登录日志",
      "/admin/log/login-log",
      "admin/log/login-log.vue",
      "system:loginlog:list",
      "file-text",
      6,
    ],
  ];
  for (const [
    menuName,
    path,
    component,
    permissionCode,
    icon,
    orderNum,
    options = {},
  ] of monitorPageMenus)
    created.push(
      await upsertMenuPage({
        menuName,
        path,
        component,
        permissionCode,
        parent: "运行监控",
        icon,
        orderNum,
        ...options,
      }),
    );

  const pageMenus = new Map(
    created.filter((menu) => menu.path).map((menu) => [menu.path, menu]),
  );
  // M6-A：工作台 F 行改码（同一行，不新增）。旧码 talent:report:list 仍由「基因报告」C 菜单与
  // 报告 F 行承载；工作台菜单授权与 dashboard 接口统一使用 talent:dashboard:list。
  const dashboardPageMenu = pageMenus.get(
    TALENT_BUSINESS_PAGE_PATHS.dashboard,
  );
  if (dashboardPageMenu) {
    const legacyDashboardActions = await pb.collection("menus").getFullList({
      filter: `menuType = "F" && parentId = "${dashboardPageMenu.id}" && permissionCode = "talent:report:list"`,
      $autoCancel: false,
    });
    for (const legacyAction of legacyDashboardActions)
      await pb.collection("menus").update(
        legacyAction.id,
        { permissionCode: TALENT_DASHBOARD_PERMISSION_CODE },
        { $autoCancel: false },
      );
  }
  for (const [
    parentPath,
    menuName,
    permissionCode,
    options = {},
  ] of FOUNDATION_ACTION_MENU_DEFS) {
    const parent = pageMenus.get(parentPath);
    if (!parent) throw new Error(`基础按钮权限缺少父级页面：${parentPath}`);
    // 同一权限码允许多条 F 行（如 talent:report:publish 的 3 个动作）：
    // `matchByName` 时按「父级 + 权限码 + 菜单名」幂等匹配，避免互相覆盖。
    const filter = options.matchByName
      ? `parentId = "${parent.id}" && permissionCode = "${permissionCode}" && menuName = "${menuName}"`
      : `parentId = "${parent.id}" && permissionCode = "${permissionCode}"`;
    created.push(
      await upsert(pb, "menus", filter, {
        menuType: "F",
        menuName,
        permissionCode,
        parentId: parent.id,
        icon: "",
        orderNum: created.length + 1,
        visible: "1",
        status: "1",
      }),
    );
  }
  // 旧库可能已存在“报告类型”演示菜单；它不属于正式交付，精确删除记录及其按钮权限。
  const legacyTemplateMenus = await pb
    .collection("menus")
    .getFullList({
      filter: 'path = "/admin/talent/template"',
      $autoCancel: false,
    })
    .catch(() => []);
  for (const legacyTemplateMenu of legacyTemplateMenus) {
    const children = await pb
      .collection("menus")
      .getFullList({
        filter: `parentId = "${legacyTemplateMenu.id}"`,
        $autoCancel: false,
      });
    for (const child of children) {
      const links = await pb
        .collection("role_menus")
        .getFullList({ filter: `menuId = "${child.id}"`, $autoCancel: false });
      for (const link of links)
        await pb
          .collection("role_menus")
          .delete(link.id, { $autoCancel: false });
      await pb.collection("menus").delete(child.id, { $autoCancel: false });
    }
    const links = await pb
      .collection("role_menus")
      .getFullList({
        filter: `menuId = "${legacyTemplateMenu.id}"`,
        $autoCancel: false,
      });
    for (const link of links)
      await pb.collection("role_menus").delete(link.id, { $autoCancel: false });
    await pb
      .collection("menus")
      .delete(legacyTemplateMenu.id, { $autoCancel: false });
  }
  // 历史脚本可能按同一业务键写出重复菜单；保留规范记录，迁移角色关联后删除重复记录。
  const allMenuRows = await pb
    .collection("menus")
    .getFullList({ $autoCancel: false });
  const groups = new Map();
  for (const menu of allMenuRows) {
    // C 菜单按「path + 名称」去重：同一 path 允许挂多个不同入口（如「服务器信息」复用系统健康页），
    // 但同名重复行仍会被合并。M 分组按「名称 + 父级」去重；F 按钮按「父级 + 权限码 + 名称」去重
    // （M3 起同一权限码允许挂多个动作 F 行，如 talent:report:publish ×3）。
    const key = menu.path
      ? `path:${menu.path}:${menu.menuName}`
      : menu.menuType === "F"
        ? `F:${menu.parentId || ""}:${menu.permissionCode || ""}:${menu.menuName}`
        : `${menu.menuType}:${menu.menuName}:${menu.parentId || ""}`;
    const list = groups.get(key) || [];
    list.push(menu);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort(
      (a, b) =>
        Number(b.status === "1") - Number(a.status === "1") ||
        Number(b.visible === "0") - Number(a.visible === "0") ||
        String(a.created || "").localeCompare(String(b.created || "")),
    );
    const canonical = list[0];
    for (const duplicate of list.slice(1)) {
      const children = await pb
        .collection("menus")
        .getFullList({
          filter: `parentId = "${duplicate.id}"`,
          $autoCancel: false,
        });
      for (const child of children)
        await pb
          .collection("menus")
          .update(child.id, { parentId: canonical.id }, { $autoCancel: false });
      const links = await pb
        .collection("role_menus")
        .getFullList({
          filter: `menuId = "${duplicate.id}"`,
          $autoCancel: false,
        });
      for (const link of links) {
        const exists = await pb
          .collection("role_menus")
          .getFirstListItem(
            `roleId = "${link.roleId}" && menuId = "${canonical.id}"`,
            { $autoCancel: false },
          )
          .catch(() => null);
        if (!exists)
          await pb
            .collection("role_menus")
            .create(
              { roleId: link.roleId, menuId: canonical.id },
              { $autoCancel: false },
            );
        await pb
          .collection("role_menus")
          .delete(link.id, { $autoCancel: false });
      }
      await pb.collection("menus").delete(duplicate.id, { $autoCancel: false });
    }
  }
  return created.filter(Boolean);
}

async function seedFoundation(pb) {
  const superRole = await upsert(pb, "roles", 'roleKey = "superadmin"', {
    roleName: "超级管理员",
    roleKey: "superadmin",
    roleSort: 1,
    dataScope: "1",
    status: "1",
    remark: "基础版系统所有者",
  });
  await upsert(pb, "roles", 'roleKey = "admin"', {
    roleName: "系统管理员",
    roleKey: "admin",
    roleSort: 2,
    dataScope: "1",
    status: "1",
    remark: "后台管理角色",
  });
  await upsert(pb, "roles", 'roleKey = "user"', {
    roleName: "普通用户",
    roleKey: "user",
    roleSort: 3,
    dataScope: "5",
    status: "1",
    remark: "C 端基础门户用户",
  });
  const menus = await seedMenus(pb);
  for (const menu of menus)
    await upsert(
      pb,
      "role_menus",
      `roleId = "${superRole.id}" && menuId = "${menu.id}"`,
      { roleId: superRole.id, menuId: menu.id },
    );
  await upsert(pb, "configs", 'configKey = "site_config"', {
    configName: "同佳天赋站点配置",
    configKey: "site_config",
    configValue: JSON.stringify({
      appName: "同佳天赋",
      adminName: "同佳天赋管理后台",
      slogan: "看见天赋，陪伴成长",
      logo: "/brand/tongjia-talent-lockup.svg",
      primaryColor: "#2F6F5E",
      themeMode: "light",
      copyright: "© 同佳",
      contactPhone: "",
    }),
    configType: "Y",
    remark: "同佳天赋唯一站点的公开品牌配置",
  });
  await upsert(pb, "configs", 'configKey = "wechat_config"', {
    configName: "微信认证配置",
    configKey: "wechat_config",
    configValue: JSON.stringify({
      mpAppId: "",
      mpAppSecret: "",
    }),
    configType: "Y",
    remark: "仅供微信基础认证使用",
  });
  const administrator = await upsert(
    pb,
    "users",
    `email = "${ADMIN_EMAIL.replace(/"/g, '\\"')}"`,
    {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      passwordConfirm: ADMIN_PASSWORD,
      displayName: "系统管理员",
      nickname: "系统管理员",
      status: "1",
    },
  );
  await upsert(
    pb,
    "user_roles",
    `userId = "${administrator.id}" && roleId = "${superRole.id}"`,
    { userId: administrator.id, roleId: superRole.id },
  );
}

async function foundationCollectionNames(pb) {
  const response = await pb.send("/api/collections?perPage=500", {
    method: "GET",
  });
  return (response.items || [])
    .map((collection) => String(collection.name))
    .filter(Boolean);
}

async function assertFreshFoundationDatabase(pb) {
  const collectionNames = await foundationCollectionNames(pb);
  const known = new Set(COLLECTION_DEFS.map((def) => def.name));
  const unexpected = collectionNames.filter(
    (name) => !known.has(name) && !name.startsWith("_"),
  );
  if (unexpected.length)
    throw new Error(
      `基础版不迁移旧业务库；发现不受支持的集合：${unexpected.join(", ")}。请使用新的 POCKETBASE_DATA_DIR。`,
    );
}

/** 初始化后最小闭环：集合、基础角色和唯一站点配置均必须已可读取。 */
async function verifyFoundationSmoke(pb) {
  const collectionNames = new Set(await foundationCollectionNames(pb));
  const missingCollections = COLLECTION_DEFS.map(
    (definition) => definition.name,
  ).filter((name) => !collectionNames.has(name));
  if (missingCollections.length)
    throw new Error(
      `基础版初始化未完成，缺少集合：${missingCollections.join(", ")}`,
    );

  await assertFreshFoundationDatabase(pb);
  const roles = await pb
    .collection("roles")
    .getFullList({ fields: "roleKey,status", $autoCancel: false });
  const enabledRoleKeys = new Set(
    roles
      .filter((role) => role.status === "1")
      .map((role) => String(role.roleKey)),
  );
  const missingRoles = ["superadmin", "admin", "user"].filter(
    (roleKey) => !enabledRoleKeys.has(roleKey),
  );
  if (missingRoles.length)
    throw new Error(
      `基础版初始化未完成，缺少启用的基础角色：${missingRoles.join(", ")}`,
    );

  const configs = await pb
    .collection("configs")
    .getFullList({ fields: "configKey", $autoCancel: false });
  const configKeys = new Set(configs.map((config) => String(config.configKey)));
  const missingConfigs = ["site_config", "wechat_config"].filter(
    (configKey) => !configKeys.has(configKey),
  );
  if (missingConfigs.length)
    throw new Error(
      `基础版初始化未完成，缺少基础配置：${missingConfigs.join(", ")}`,
    );

  const menus = await pb
    .collection("menus")
    .getFullList({ fields: "permissionCode", $autoCancel: false });
  const menuPermissionCodes = new Set(
    menus.map((menu) => String(menu.permissionCode)).filter(Boolean),
  );
  const missingPermissions = FOUNDATION_RBAC_PERMISSION_CODES.filter(
    (permissionCode) => !menuPermissionCodes.has(permissionCode),
  );
  if (missingPermissions.length)
    throw new Error(
      `基础版初始化未完成，缺少 RBAC 权限菜单：${missingPermissions.join(", ")}`,
    );
}

export async function setupFoundation() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD)
    throw new Error(
      "请设置 POCKETBASE_ADMIN_EMAIL 与 POCKETBASE_ADMIN_PASSWORD。",
    );
  if (ADMIN_PASSWORD.length < 8)
    throw new Error("POCKETBASE_ADMIN_PASSWORD 至少需要 8 位。");
  assertFreshDataDirectory();
  if (await isPocketBaseReady())
    throw new Error(
      `PocketBase 已在 ${PB_URL} 运行。基础版初始化必须独占一个新数据目录；请停止该服务后重试。`,
    );

  const process = startPocketBase();
  if (!(await waitForPocketBase())) {
    process.kill("SIGTERM");
    throw new Error(
      "PocketBase 启动超时，请检查 POCKETBASE_URL、端口和二进制文件。",
    );
  }
  try {
    const pb = await loginAsSuperuser();
    await assertFreshFoundationDatabase(pb);
    const collectionByName = new Map();
    for (const definition of COLLECTION_DEFS)
      collectionByName.set(
        definition.name,
        await createCollection(pb, definition),
      );
    for (const definition of COLLECTION_DEFS)
      await installFields(pb, definition);
    for (const definition of COLLECTION_DEFS)
      await installRelations(pb, definition, collectionByName);
    await ensureIndex(
      pb,
      "roles",
      "CREATE UNIQUE INDEX idx_roles_key ON roles (roleKey)",
    );
    await ensureIndex(
      pb,
      "configs",
      "CREATE UNIQUE INDEX idx_configs_key ON configs (configKey)",
    );
    await ensureIndex(
      pb,
      "user_roles",
      "CREATE UNIQUE INDEX idx_user_roles_pair ON user_roles (userId, roleId)",
    );
    await ensureIndex(
      pb,
      "role_menus",
      "CREATE UNIQUE INDEX idx_role_menus_pair ON role_menus (roleId, menuId)",
    );
    // 微信与手机号是认证身份而不是可重复的展示字段；空值允许多个普通后台用户共存。
    await ensureIndex(
      pb,
      "users",
      'CREATE UNIQUE INDEX idx_users_openid_unique ON users (openid) WHERE openid != ""',
    );
    await ensureIndex(
      pb,
      "users",
      'CREATE UNIQUE INDEX idx_users_unionid_unique ON users (unionid) WHERE unionid != ""',
    );
    await ensureIndex(
      pb,
      "users",
      'CREATE UNIQUE INDEX idx_users_phone_unique ON users (phone) WHERE phone != ""',
    );
    // M2 会员域索引：家长 / 子女唯一键与列表、查询索引（ADR 0002-D2/D5/D7）。
    for (const [collectionName, indexSql] of TALENT_MEMBER_INDEX_DEFS)
      await ensureIndex(pb, collectionName, indexSql);
    // M3 报告域索引：talent_gene_reports 唯一键与 talent_reports 新索引（ADR 0003-D2/D6）。
    for (const [collectionName, indexSql] of TALENT_REPORT_INDEX_DEFS)
      await ensureIndex(pb, collectionName, indexSql);
    // M5 培育建议域索引：版本单一生效部分唯一索引 + 建议编号/版本内一人一份唯一键（ADR 0005-D1/D2）。
    for (const [collectionName, indexSql] of TALENT_ADVICE_INDEX_DEFS)
      await ensureIndex(pb, collectionName, indexSql);
    // M4 方向匹配域索引：待归并唯一键 + 列表/计数普通索引（ADR 0004-D5）。
    for (const [collectionName, indexSql] of TALENT_DIRECTION_INDEX_DEFS)
      await ensureIndex(pb, collectionName, indexSql);
    // M8 PDF 域索引：产物唯一键 (reportId, volumeId, contentHash) + 报告/哈希/时间与下载留痕索引。
    for (const [collectionName, indexSql] of TALENT_PDF_INDEX_DEFS)
      await ensureIndex(pb, collectionName, indexSql);
    await ensureIndex(
      pb,
      "talent_reports",
      "CREATE UNIQUE INDEX idx_talent_reports_no ON talent_reports (reportNo)",
    );
    // 天赋配置的业务唯一约束：同一要素下分级唯一、分类/要素编码唯一、同一报告类型只允许一个启用模板。
    // M1 规则域：分级新增字段的部分唯一索引用于容忍存量旧行（旧行 code 为空、sortOrder = 0）。
    await ensureIndex(
      pb,
      "talent_levels",
      'CREATE UNIQUE INDEX idx_talent_levels_code ON talent_levels (code) WHERE code != ""',
    );
    await ensureIndex(
      pb,
      "talent_levels",
      "CREATE UNIQUE INDEX idx_talent_levels_sort ON talent_levels (sortOrder) WHERE sortOrder > 0",
    );
    await ensureIndex(
      pb,
      "talent_factor_libraries",
      "CREATE UNIQUE INDEX idx_talent_factor_libraries_gender_age ON talent_factor_libraries (gender, age)",
    );
    await ensureIndex(
      pb,
      "talent_factors",
      "CREATE UNIQUE INDEX idx_talent_factors_library_code ON talent_factors (libraryId, code)",
    );
    await ensureIndex(
      pb,
      "talent_factors",
      "CREATE INDEX idx_talent_factors_category ON talent_factors (category)",
    );
    await ensureIndex(
      pb,
      "talent_factors",
      "CREATE INDEX idx_talent_factors_sort ON talent_factors (libraryId, sortOrder)",
    );
    await ensureIndex(
      pb,
      "talent_factor_notes",
      "CREATE UNIQUE INDEX idx_talent_factor_notes_code ON talent_factor_notes (code)",
    );
    await ensureIndex(
      pb,
      "talent_factor_notes",
      "CREATE INDEX idx_talent_factor_notes_factor ON talent_factor_notes (factorCode)",
    );
    await ensureIndex(
      pb,
      "talent_factor_notes",
      "CREATE INDEX idx_talent_factor_notes_level ON talent_factor_notes (levelCode)",
    );
    await ensureIndex(
      pb,
      "talent_factor_notes",
      "CREATE INDEX idx_talent_factor_notes_status ON talent_factor_notes (status)",
    );
    await ensureIndex(
      pb,
      "talent_directions",
      "CREATE UNIQUE INDEX idx_talent_directions_code ON talent_directions (code)",
    );
    await ensureIndex(
      pb,
      "talent_directions",
      "CREATE INDEX idx_talent_directions_status ON talent_directions (status)",
    );
    await ensureIndex(
      pb,
      "talent_tiers",
      "CREATE UNIQUE INDEX idx_talent_tiers_code ON talent_tiers (code)",
    );
    await ensureIndex(
      pb,
      "talent_tiers",
      "CREATE UNIQUE INDEX idx_talent_tiers_sort ON talent_tiers (sortOrder)",
    );
    await ensureIndex(
      pb,
      "talent_tiers",
      "CREATE UNIQUE INDEX idx_talent_tiers_default ON talent_tiers (isDefault) WHERE isDefault = 1",
    );
    await ensureIndex(
      pb,
      "talent_reading_progress",
      "CREATE UNIQUE INDEX idx_talent_reading_progress_pair ON talent_reading_progress (reportId, userId)",
    );
    await seedFoundation(pb);
    await verifyFoundationSmoke(pb);
    console.log(
      `✓ 基础版初始化完成：${COLLECTION_DEFS.length} 个集合，单实例 PocketBase ${PB_URL}`,
    );
  } finally {
    process?.kill("SIGTERM");
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  setupFoundation().catch((error) => {
    console.error(
      `✗ 基础版初始化失败：${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}
