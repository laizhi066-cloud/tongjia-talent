#!/usr/bin/env node
/**
 * @description 后台账号与 M6 三角色种子：按 M6 角色矩阵生成 / 校正 `role_menus`，并创建测试账号。可重复执行。
 *  - superAdmin：运维超管（superadmin，全部菜单，不对客户开放）。
 *  - admin：平台运营管理员（customer-admin，沿用旧客户管理员 roleKey，显示名升级；7 条业务菜单 + 全部业务 F 行）。
 *  - reviewer：报告审核员（report-reviewer，工作台 / 会员只读 / 报告 / 建议 + 发布类动作）。
 *  - rule-config：规则配置员（rule-configurator，工作台 + 天赋规则 3 页 + M1 全码 + 方向归并）。
 * 系统管理 / 运行监控只授予 superAdmin；内置 `admin`（通配）角色不得绑定交付账号。
 * 口令只从环境变量读取，未设置时使用本地 dev 默认值并显式提醒；不在输出中打印口令。
 * @file scripts/seed-accounts.mjs
 * @usage pnpm accounts:seed
 */
import PocketBase from "pocketbase";
import { loadDotEnv } from "./_pb.mjs";
import {
  SYSTEM_AND_MONITOR_GROUP_NAMES,
  SYSTEM_AND_MONITOR_MENU_PATHS,
  TALENT_BUSINESS_PERMISSION_CODES,
  TALENT_ROLE_DEFS,
  syncTalentBusinessRoles,
} from "./setup.mjs";

loadDotEnv();

const url = process.env.POCKETBASE_URL || "http://127.0.0.1:8090";
const email = process.env.POCKETBASE_ADMIN_EMAIL;
const password =
  process.env.POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASS;
if (!email || !password)
  throw new Error("缺少 POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD");

const pb = new PocketBase(url);
pb.autoCancellation(false);
await pb.collection("_superusers").authWithPassword(email, password);

async function upsert(collection, filter, create, update) {
  const existing = await pb
    .collection(collection)
    .getFirstListItem(filter)
    .catch(() => null);
  if (existing) {
    await pb.collection(collection).update(existing.id, update ?? create);
    return existing.id;
  }
  const created = await pb.collection(collection).create(create);
  return created.id;
}

/** 确保 users 有 username 字段与唯一索引（老库补齐）。 */
async function ensureUsernameField() {
  const users = await pb.collections.getOne("users");
  if (!users.fields.some((field) => field.name === "username")) {
    await pb.collections.update(users.id, {
      fields: [...users.fields, { name: "username", type: "text", max: 100 }],
    });
    console.log("• users 增加 username 字段");
  }
  const refreshed = await pb.collections.getOne("users");
  const indexName = "idx_users_username_unique";
  if (!(refreshed.indexes || []).some((index) => index.includes(indexName))) {
    await pb.collections.update(refreshed.id, {
      indexes: [
        ...(refreshed.indexes || []),
        'CREATE UNIQUE INDEX idx_users_username_unique ON users (username) WHERE username != ""',
      ],
    });
    console.log("• users 增加 username 唯一索引");
  }
}

/** 基础角色（superadmin / admin / user）保留；平台运营 / 审核 / 规则由 syncTalentBusinessRoles 收敛。 */
async function seedFoundationRoles() {
  const superRoleId = await upsert(
    "roles",
    'roleKey = "superadmin"',
    {
      roleName: "超级管理员",
      roleKey: "superadmin",
      roleSort: 1,
      dataScope: "1",
      status: "1",
      remark: "系统所有者（运维）",
    },
    { roleName: "超级管理员", status: "1", remark: "系统所有者（运维）" },
  );
  // roleKey=admin 是内置系统管理员（通配全权限），交付账号不得绑定。
  const adminRoleId = await upsert(
    "roles",
    'roleKey = "admin"',
    {
      roleName: "系统管理员",
      roleKey: "admin",
      roleSort: 2,
      dataScope: "1",
      status: "1",
      remark: "内置系统管理员",
    },
    { roleName: "系统管理员", status: "1", remark: "内置系统管理员" },
  );
  // C 端中性账户角色，不属于后台角色；后台登录判定会忽略该 roleKey。
  await upsert("roles", 'roleKey = "user"', {
    roleName: "普通用户",
    roleKey: "user",
    roleSort: 3,
    dataScope: "5",
    status: "1",
    remark: "C 端基础门户用户",
  });
  return { superRoleId, adminRoleId };
}

/** superAdmin 关联全部菜单（含停用行）；三角色由 matrix 收敛，不在这里放大权限。 */
async function seedSuperAdminMenus(superRoleId) {
  const menus = await pb.collection("menus").getFullList({ $autoCancel: false });
  if (!menus.length)
    throw new Error("菜单为空：请先运行 `pnpm env:setup` 初始化基础菜单");
  for (const menu of menus)
    await upsert(
      "role_menus",
      `roleId = "${superRoleId}" && menuId = "${menu.id}"`,
      { roleId: superRoleId, menuId: menu.id },
    );
  return menus.length;
}

/** 三角色不得关联任何系统管理 / 运行监控菜单（含分组祖先）。 */
function assertNoSystemMenus(roleKey, menus) {
  const leaked = menus.filter(
    (menu) =>
      SYSTEM_AND_MONITOR_GROUP_NAMES.includes(String(menu.menuName || "")) ||
      SYSTEM_AND_MONITOR_MENU_PATHS.includes(String(menu.path || "")),
  );
  if (leaked.length)
    throw new Error(
      `${roleKey} 不得可见系统管理 / 运行监控菜单：${leaked.map((menu) => menu.menuName).join("、")}`,
    );
}

/**
 * 创建或更新账号，并只保留其目标角色。
 * 已存在账号不重置口令（避免开发库 / 演示库被脚本改密），仅校正资料与角色绑定；
 * 新账号才写入口令。
 */
async function seedUser({
  username,
  password: userPassword,
  email: userEmail,
  displayName,
  roleId,
}) {
  const existing = await pb
    .collection("users")
    .getFirstListItem(`username = "${username}"`)
    .catch(() => null);
  const profile = {
    username,
    email: userEmail,
    displayName,
    nickname: displayName,
    status: "1",
  };
  const userId = existing
    ? (
        await pb
          .collection("users")
          .update(existing.id, profile, { $autoCancel: false })
      ).id
    : (
        await pb.collection("users").create(
          {
            ...profile,
            password: userPassword,
            passwordConfirm: userPassword,
          },
          { $autoCancel: false },
        )
      ).id;
  const assignments = await pb
    .collection("user_roles")
    .getFullList({ filter: `userId = "${userId}"`, $autoCancel: false });
  for (const row of assignments)
    if (String(row.roleId) !== roleId)
      await pb.collection("user_roles").delete(row.id);
  await upsert(
    "user_roles",
    `userId = "${userId}" && roleId = "${roleId}"`,
    { userId, roleId },
  );
  return userId;
}

/** 内置 `admin` 通配角色不得绑定任何账号，否则三角色矩阵会被绕过（ADR 0006-R10）。 */
async function assertBuiltInAdminUnbound(adminRoleId) {
  const assignments = await pb.collection("user_roles").getFullList({
    filter: `roleId = "${adminRoleId}"`,
    expand: "userId",
    $autoCancel: false,
  });
  if (!assignments.length) return;
  const names = assignments
    .map((row) => row.expand?.userId?.username || row.expand?.userId?.email)
    .filter(Boolean);
  throw new Error(
    `内置 admin 角色（通配全权限）不得绑定交付账号：${names.join("、")}`,
  );
}

await ensureUsernameField();
const { superRoleId, adminRoleId } = await seedFoundationRoles();
const superMenuCount = await seedSuperAdminMenus(superRoleId);
// ── M6 三角色矩阵：customer-admin 沿用旧行改显示名，新增 report-reviewer / rule-configurator。
const roleStats = await syncTalentBusinessRoles(pb);
const roleByKey = new Map(TALENT_ROLE_DEFS.map((role) => [role.roleKey, role]));
for (const [roleKey, stats] of Object.entries(roleStats)) {
  const roleDefinition = roleByKey.get(roleKey);
  if (!roleDefinition) throw new Error(`角色矩阵缺少 ${roleKey} 定义`);
  // 防御性断言：三角色都不得出现系统管理 / 运行监控菜单。
  const links = await pb.collection("role_menus").getFullList({
    filter: `roleId = "${stats.roleId}"`,
    expand: "menuId",
    $autoCancel: false,
  });
  assertNoSystemMenus(
    roleKey,
    links.map((link) => link.expand?.menuId).filter(Boolean),
  );
  const activePages = links.filter(
    (link) => link.expand?.menuId?.menuType === "C",
  ).length;
  if (activePages !== roleDefinition.pagePaths.length)
    throw new Error(
      `${roleKey} 业务菜单数量不符：期望 ${roleDefinition.pagePaths.length}，实际 ${activePages}`,
    );
}
await assertBuiltInAdminUnbound(adminRoleId);

// 生产可用环境变量覆盖默认口令；未覆盖时给出 dev 口令提醒（不打印口令，不写真实凭据）。
const superPassword = process.env.SUPERADMIN_PASSWORD || "laizhi066";
const platformOperatorPassword =
  process.env.PLATFORM_OPERATOR_PASSWORD ||
  process.env.CUSTOMER_ADMIN_PASSWORD ||
  "admin123";
const reportReviewerPassword =
  process.env.REPORT_REVIEWER_PASSWORD || "reviewer123";
const ruleConfiguratorPassword =
  process.env.RULE_CONFIGURATOR_PASSWORD || "ruleconfig123";
const usingDevPasswords = [
  ["SUPERADMIN_PASSWORD", process.env.SUPERADMIN_PASSWORD],
  [
    "PLATFORM_OPERATOR_PASSWORD / CUSTOMER_ADMIN_PASSWORD",
    process.env.PLATFORM_OPERATOR_PASSWORD || process.env.CUSTOMER_ADMIN_PASSWORD,
  ],
  ["REPORT_REVIEWER_PASSWORD", process.env.REPORT_REVIEWER_PASSWORD],
  ["RULE_CONFIGURATOR_PASSWORD", process.env.RULE_CONFIGURATOR_PASSWORD],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);
if (usingDevPasswords.length)
  console.warn(
    `⚠ 以下账号使用本地 dev 默认口令（新账号生效 / 已存在账号保留原口令）：${usingDevPasswords.join("、")}；生产请用相应环境变量覆盖。`,
  );

const accounts = [
  {
    username: "superAdmin",
    password: superPassword,
    email: "superadmin@tongjia.local",
    displayName: "运维超管",
    roleId: superRoleId,
    roleKey: "superadmin",
    roleName: "超级管理员",
  },
  {
    username: "admin",
    password: platformOperatorPassword,
    email: "admin@tongjia.local",
    displayName: "平台运营管理员",
    roleId: roleStats["customer-admin"].roleId,
    roleKey: "customer-admin",
    roleName: "平台运营管理员",
  },
  {
    username: "reviewer",
    password: reportReviewerPassword,
    email: "reviewer@tongjia.local",
    displayName: "报告审核员",
    roleId: roleStats["report-reviewer"].roleId,
    roleKey: "report-reviewer",
    roleName: "报告审核员",
  },
  {
    username: "rule-config",
    password: ruleConfiguratorPassword,
    email: "ruleconfig@tongjia.local",
    displayName: "规则配置员",
    roleId: roleStats["rule-configurator"].roleId,
    roleKey: "rule-configurator",
    roleName: "规则配置员",
  },
];
for (const account of accounts)
  await seedUser({
    username: account.username,
    password: account.password,
    email: account.email,
    displayName: account.displayName,
    roleId: account.roleId,
  });

console.log(
  JSON.stringify(
    {
      url,
      roles: Object.fromEntries(
        Object.entries(roleStats).map(([roleKey, stats]) => [
          roleKey,
          {
            menus: stats.menus,
            pages: stats.pages,
            actions: stats.actions,
            permissionCodes: stats.codes,
          },
        ]),
      ),
      superAdminMenus: superMenuCount,
      businessPermissionCodes: TALENT_BUSINESS_PERMISSION_CODES.length,
      systemAndMonitorOnlyForSuperAdmin: true,
      builtInAdminRoleUnbound: true,
      accounts: accounts.map((account) => ({
        username: account.username,
        email: account.email,
        displayName: account.displayName,
        role: account.roleName,
        roleKey: account.roleKey,
      })),
      hint: "后台登录支持账号名或邮箱；superAdmin 仅内部使用；口令只从环境变量 / dev 默认值读取，不在输出中打印。",
    },
    null,
    2,
  ),
);