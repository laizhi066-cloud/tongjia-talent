#!/usr/bin/env node
/**
 * @description M6 旧口径清理迁移脚本：默认 **dry-run（只读）**，真实删除必须显式提供
 *   `--pb-url` / `--data-dir` / `--backup` / `--confirm-m6` 并通过备份校验。
 *   删除范围严格限定在 `setup.mjs` 导出的 M6 归零清单（19 旧集合 + 旧字段 + 旧行 + 旧菜单 +
 *   22 旧权限码 + 机构角色）；**不触碰 Foundation 集合**（users / configs / oper_logs / login_logs /
 *   uploads 等）、不重置库、不支持 `--force` / `--reset` / 直接 SQLite 写入。
 * @file scripts/cleanup-m6.mjs
 * @usage
 *   # 1) 先 dry-run（只读；不写任何数据，只出报告）
 *   pnpm migration:m6 -- --dry-run --pb-url=http://127.0.0.1:8090 --data-dir=/path/to/pb_data
 *   # 2) 备份后正式执行（缺任一参数即拒绝）
 *   pnpm backup:pb --dir=backups-m6
 *   pnpm migration:m6 -- --pb-url=http://127.0.0.1:8090 --data-dir=/path/to/pb_data \
 *     --backup=backups-m6/<key>.zip --confirm-m6 [--export-csv=backups-m6/legacy] [--allow-production]
 * 依据：docs/specs/M6-cleanup/spec.md §4–§5、docs/adr/0006-m6-cleanup-and-roles.md D1/D2/D6。
 */
import {
  createHash,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import PocketBase from "pocketbase";
import { loadDotEnv } from "./_pb.mjs";
import {
  LEGACY_TALENT_COLLECTION_DELETE_ORDER,
  LEGACY_TALENT_COLLECTION_NAMES,
  LEGACY_TALENT_GROUP_NAMES,
  LEGACY_TALENT_MENU_PATHS,
  LEGACY_TALENT_PERMISSION_CODES,
  LEGACY_TALENT_ROLE_KEYS,
} from "./setup.mjs";

loadDotEnv();

/** Foundation / 新域集合：任何情况下都不允许出现在删除清单里（防线，不是配置项）。 */
const PROTECTED_COLLECTIONS = new Set([
  "users",
  "roles",
  "menus",
  "depts",
  "posts",
  "user_roles",
  "role_menus",
  "user_posts",
  "role_depts",
  "configs",
  "dict_types",
  "dict_data",
  "user_sessions",
  "login_logs",
  "oper_logs",
  "error_logs",
  "uploads",
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
]);

/** 旧字段：`talent_levels` 4 个镜像字段 + `talent_reports.customerId`（spec §2.2）。 */
const LEGACY_LEVEL_FIELDS = ["elementId", "levelCode", "levelName", "annotation"];
const LEGACY_LEVEL_INDEX = "idx_talent_levels_element_level";
const LEGACY_REPORT_FIELDS = ["customerId"];

const DEFAULT_MAX_BACKUP_AGE_HOURS = 24;

const USAGE = `M6 旧口径清理（默认 dry-run，只读）

用法：
  node scripts/cleanup-m6.mjs --dry-run [--pb-url URL --data-dir DIR] [--report-out FILE]
  node scripts/cleanup-m6.mjs --pb-url URL --data-dir DIR --backup FILE --confirm-m6 [选项]

参数：
  --dry-run                   只读盘点并生成报告（默认行为；不需要 --confirm-m6）
  --pb-url URL                目标 PocketBase 地址，必须与 POCKETBASE_URL 一致
  --data-dir DIR              目标数据目录，必须与 POCKETBASE_DATA_DIR 一致
  --backup FILE               备份 zip 路径（正式删除必填）；校验存在 / 非空 / 新鲜度 / sha256
  --confirm-m6                真实删除的文本确认；缺失即 dry-run
  --allow-production          NODE_ENV=production 时必须显式提供
  --max-backup-age-hours N    备份新鲜度阈值，默认 24
  --report-out FILE           报告输出路径，默认 backups-m6/m6-cleanup-<mode>-<ts>.json
  --schema-out DIR            schema 快照目录，默认 backups-m6
  --export-csv DIR            正式删除前导出旧集合 CSV（可选；删数据前强烈建议）
  --help                      显示本帮助

红线：
  * 不提供 --force / --reset / --clean / --drop-all，也不会清库；setup.mjs 不承担清库。
  * 只删 M6 归零清单内的旧集合 / 旧字段 / 旧行 / 旧菜单 / 旧角色；Foundation 与新域集合不删。
  * 失败即中止、不自动重试；回滚只能整库恢复备份 + 代码 tag（ADR 0006-D6）。
`;

function fail(message, code = 2) {
  console.error(`✗ ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const body = token.slice(2);
    const eq = body.indexOf("=");
    if (eq !== -1) {
      args[body.slice(0, eq)] = body.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    const booleanFlags = new Set(["dry-run", "confirm-m6", "allow-production", "help"]);
    if (booleanFlags.has(body) || next === undefined || next.startsWith("--")) {
      args[body] = true;
      continue;
    }
    args[body] = next;
    index += 1;
  }
  return args;
}

const rawArgs = parseArgs(process.argv.slice(2));
if (rawArgs.help) {
  console.log(USAGE);
  process.exit(0);
}

// ── 0. 显式拒绝「清库」类参数：M6 不提供重置能力 ─────────────────────────────
for (const forbidden of ["force", "reset", "clean", "drop-all", "dropall", "truncate"]) {
  if (rawArgs[forbidden])
    fail(
      `不支持 --${forbidden}：M6 迁移脚本只删除旧口径清单内的对象，不提供清库 / 重置能力；` +
        "需要重置请换新的 POCKETBASE_DATA_DIR 并执行 `pnpm env:setup`。",
    );
}

const dryRun = !rawArgs["confirm-m6"];
if (rawArgs["dry-run"] && rawArgs["confirm-m6"])
  fail("--dry-run 与 --confirm-m6 不能同时使用：请先 dry-run 复核报告，再正式执行。");

const envUrl = String(process.env.POCKETBASE_URL || "").trim();
const envDataDir = String(process.env.POCKETBASE_DATA_DIR || "").trim();
const argUrl = rawArgs["pb-url"] ? String(rawArgs["pb-url"]).trim() : "";
const argDataDir = rawArgs["data-dir"] ? String(rawArgs["data-dir"]).trim() : "";
const effectiveUrl = argUrl || envUrl;
const effectiveDataDir = argDataDir || envDataDir;

if (!effectiveUrl)
  fail("缺少目标 PocketBase：请显式提供 --pb-url，或设置 POCKETBASE_URL。");
if (!effectiveDataDir)
  fail("缺少目标数据目录：请显式提供 --data-dir，或设置 POCKETBASE_DATA_DIR。");
if (argUrl && envUrl && argUrl !== envUrl)
  fail(`--pb-url (${argUrl}) 与 POCKETBASE_URL (${envUrl}) 不一致，拒绝执行。`);
if (argDataDir && envDataDir) {
  const normalizedArg = resolve(argDataDir);
  const normalizedEnv = resolve(envDataDir);
  if (normalizedArg !== normalizedEnv)
    fail(`--data-dir (${normalizedArg}) 与 POCKETBASE_DATA_DIR (${normalizedEnv}) 不一致，拒绝执行。`);
}

const dataDir = resolve(effectiveDataDir);
const reportOut =
  rawArgs["report-out"] ||
  resolve(
    "backups-m6",
    `m6-cleanup-${dryRun ? "dry-run" : "apply"}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
const schemaOut = resolve(rawArgs["schema-out"] || "backups-m6");
const backupPath = rawArgs.backup ? resolve(String(rawArgs.backup)) : "";
const maxBackupAgeHours = Number(rawArgs["max-backup-age-hours"] || DEFAULT_MAX_BACKUP_AGE_HOURS);
const exportCsvDir = rawArgs["export-csv"] ? resolve(String(rawArgs["export-csv"])) : "";

if (!Number.isFinite(maxBackupAgeHours) || maxBackupAgeHours <= 0)
  fail("--max-backup-age-hours 必须是正数。");
if (process.env.NODE_ENV === "production" && !rawArgs["allow-production"])
  fail("NODE_ENV=production 时必须显式提供 --allow-production（ADR 0006-D2）。");

const adminEmail = String(process.env.POCKETBASE_ADMIN_EMAIL || "").trim();
const adminPassword = String(
  process.env.POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASS || "",
);
if (!adminEmail || !adminPassword)
  fail("缺少 POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD，无法连接目标 PocketBase。");

console.log(`M6 旧口径清理：模式=${dryRun ? "dry-run（只读）" : "APPLY（真实删除）"}`);
console.log(`  目标 PocketBase：${effectiveUrl}`);
console.log(`  目标数据目录：${dataDir}`);
if (backupPath) console.log(`  备份文件：${backupPath}`);
console.log(`  报告输出：${reportOut}`);
if (!existsSync(dataDir)) {
  if (!dryRun) fail(`目标数据目录不存在：${dataDir}，拒绝执行（ADR 0006-D2）。`);
  console.warn(`⚠ 目标数据目录不存在（dry-run 继续，仅做只读盘点）：${dataDir}`);
}

/**
 * 备份门槛（仅正式删除强制）：存在、非空、sha256 可算、新鲜度达标，
 * 若存在 `backups-m6/m6-backup-manifest.json` 则比对其中 sha256。
 */
function validateBackup() {
  if (!backupPath)
    fail("正式删除必须提供 --backup（当日一致性备份 zip），拒绝执行（ADR 0006-D2）。");
  if (!existsSync(backupPath)) fail(`备份不存在：${backupPath}`);
  const stat = statSync(backupPath);
  if (!stat.isFile() || stat.size <= 0) fail(`备份不是有效文件或为空：${backupPath}`);
  const sha256 = createHash("sha256").update(readFileSync(backupPath)).digest("hex");
  const ageHours = (Date.now() - stat.mtimeMs) / 3_600_000;
  if (ageHours > maxBackupAgeHours)
    fail(
      `备份已 ${ageHours.toFixed(1)} 小时，超过阈值 ${maxBackupAgeHours} 小时；请重新备份（ADR 0006-D2）。`,
    );
  const manifestPath = resolve(dirname(backupPath), "m6-backup-manifest.json");
  let manifest = null;
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
      fail(`备份清单不是合法 JSON：${manifestPath}`);
    }
    const expected =
      manifest?.backup?.sha256 || manifest?.sha256 || manifest?.[statSync(backupPath).size] || "";
    if (expected && String(expected).toLowerCase() !== sha256)
      fail("备份 sha256 与 m6-backup-manifest.json 不一致；拒绝执行。");
  }
  return {
    path: backupPath,
    size: stat.size,
    sha256,
    mtime: new Date(stat.mtimeMs).toISOString(),
    ageHours: Number(ageHours.toFixed(2)),
    manifestChecked: Boolean(manifest),
  };
}

const backup = dryRun ? null : validateBackup();

const pb = new PocketBase(effectiveUrl);
pb.autoCancellation(false);
let auditName = "m6-cleanup-script";
try {
  await pb.collection("_superusers").authWithPassword(adminEmail, adminPassword);
  auditName = adminEmail;
} catch (error) {
  fail(`目标 PocketBase 登录失败：${error instanceof Error ? error.message : error}`);
}

const collections = await pb.collections.getFullList();
const collectionByName = new Map(collections.map((collection) => [String(collection.name), collection]));
const collectionNames = new Set(collectionByName.keys());

function assertProtected() {
  const violations = LEGACY_TALENT_COLLECTION_DELETE_ORDER.filter((name) =>
    PROTECTED_COLLECTIONS.has(name),
  );
  if (violations.length)
    fail(`删除清单包含受保护集合（脚本缺陷）：${violations.join("、")}`);
  const unknown = LEGACY_TALENT_COLLECTION_DELETE_ORDER.filter(
    (name) => !LEGACY_TALENT_COLLECTION_NAMES.includes(name),
  );
  if (unknown.length) fail(`删除顺序包含清单外集合：${unknown.join("、")}`);
}
assertProtected();

async function readCollectionCount(name) {
  if (!collectionNames.has(name)) return { name, present: false, records: 0 };
  try {
    const page = await pb.collection(name).getList(1, 1, { fields: "id", $autoCancel: false });
    return { name, present: true, records: Number(page.totalItems || 0) };
  } catch (error) {
    return {
      name,
      present: true,
      records: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function readSchemaSnapshot() {
  return {
    generatedAt: new Date().toISOString(),
    url: effectiveUrl,
    collections: (await pb.collections.getFullList()).map((collection) => ({
      name: collection.name,
      type: collection.type,
      fields: (collection.fields || []).map((field) => field.name),
      indexes: collection.indexes || [],
    })),
  };
}

async function readMenus() {
  try {
    return await pb
      .collection("menus")
      .getFullList({ fields: "id,menuName,menuType,path,permissionCode,status", $autoCancel: false });
  } catch {
    return [];
  }
}

function classifyLegacyMenus(menus) {
  const legacyPathSet = new Set(LEGACY_TALENT_MENU_PATHS);
  const legacyGroupSet = new Set(LEGACY_TALENT_GROUP_NAMES);
  const legacyCodeSet = new Set(LEGACY_TALENT_PERMISSION_CODES);
  const pages = menus.filter((menu) => legacyPathSet.has(String(menu.path || "")));
  const pageIds = new Set(pages.map((menu) => String(menu.id)));
  const actions = menus.filter(
    (menu) =>
      menu.menuType === "F" &&
      (pageIds.has(String(menu.parentId || "")) || legacyCodeSet.has(String(menu.permissionCode || ""))),
  );
  const groups = menus.filter(
    (menu) => menu.menuType === "M" && legacyGroupSet.has(String(menu.menuName || "")),
  );
  const codesInMenus = menus
    .filter((menu) => legacyCodeSet.has(String(menu.permissionCode || "")))
    .map((menu) => `${menu.menuName}:${menu.permissionCode}`);
  return { pages, actions, groups, codesInMenus };
}

async function readLegacyRoles() {
  const roles = await pb.collection("roles").getFullList({ fields: "id,roleKey,roleName", $autoCancel: false }).catch(() => []);
  return roles.filter((role) => LEGACY_TALENT_ROLE_KEYS.includes(String(role.roleKey)));
}

async function readLegacyRows() {
  const result = { talent_levels: 0, talent_reports: 0, details: {} };
  if (collectionNames.has("talent_levels")) {
    const levelFields = new Set((collectionByName.get("talent_levels")?.fields || []).map((field) => field.name));
    if (levelFields.has("elementId")) {
      const rows = await pb
        .collection("talent_levels")
        .getFullList({ filter: 'elementId != ""', fields: "id", $autoCancel: false })
        .catch(() => []);
      result.talent_levels = rows.length;
    }
  }
  if (collectionNames.has("talent_reports")) {
    const reportFields = new Set((collectionByName.get("talent_reports")?.fields || []).map((field) => field.name));
    if (reportFields.has("subjectType")) {
      const rows = await pb
        .collection("talent_reports")
        .getFullList({ filter: 'subjectType = ""', fields: "id", $autoCancel: false })
        .catch(() => []);
      result.talent_reports = rows.length;
    }
  }
  return result;
}

function readLegacyFields() {
  const levels = collectionByName.get("talent_levels");
  const reports = collectionByName.get("talent_reports");
  const levelFieldNames = new Set((levels?.fields || []).map((field) => field.name));
  const reportFieldNames = new Set((reports?.fields || []).map((field) => field.name));
  return {
    talent_levels: LEGACY_LEVEL_FIELDS.filter((name) => levelFieldNames.has(name)),
    talent_report_customerId: LEGACY_REPORT_FIELDS.filter((name) => reportFieldNames.has(name)),
    talent_levels_index: (levels?.indexes || []).some((sql) => String(sql).includes(LEGACY_LEVEL_INDEX))
      ? [LEGACY_LEVEL_INDEX]
      : [],
  };
}

function writeJson(path, payload) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`  已写入：${path}`);
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function exportLegacyCsv(dir) {
  mkdirSync(dir, { recursive: true });
  const exported = [];
  for (const name of LEGACY_TALENT_COLLECTION_NAMES) {
    if (!collectionNames.has(name)) continue;
    let rows = [];
    try {
      rows = await pb.collection(name).getFullList({ $autoCancel: false });
    } catch (error) {
      console.warn(`  ⨯ 导出 ${name} 失败：${error instanceof Error ? error.message : error}`);
      continue;
    }
    if (!rows.length) continue;
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const csv = `\uFEFF${[headers, ...rows.map((row) => headers.map((header) => row[header]))]
      .map((cells) => cells.map(csvCell).join(","))
      .join("\r\n")}\r\n`;
    const file = resolve(dir, `${name}.csv`);
    writeFileSync(file, csv, "utf8");
    exported.push({ collection: name, records: rows.length, file });
    console.log(`  ✓ 已导出 ${name} → ${file}（${rows.length} 行）`);
  }
  return exported;
}

async function deleteMenuWithLinks(menuId) {
  const links = await pb
    .collection("role_menus")
    .getFullList({ filter: `menuId = "${menuId}"`, $autoCancel: false });
  for (const link of links)
    await pb.collection("role_menus").delete(link.id, { $autoCancel: false });
  await pb.collection("menus").delete(menuId, { $autoCancel: false });
}

/** dry-run 与 apply 共用的盘点（只读）。 */
async function inventory() {
  const collectionStatus = [];
  for (const name of LEGACY_TALENT_COLLECTION_NAMES)
    collectionStatus.push(await readCollectionCount(name));
  const presentCollections = collectionStatus.filter((item) => item.present);
  const recordsToDelete = presentCollections.reduce(
    (sum, item) => sum + Number(item.records || 0),
    0,
  );
  const menus = await readMenus();
  const legacyMenus = classifyLegacyMenus(menus);
  const legacyRoles = await readLegacyRoles();
  const legacyRows = await readLegacyRows();
  const legacyFields = readLegacyFields();
  const pending =
    presentCollections.length +
    recordsToDelete +
    legacyMenus.pages.length +
    legacyMenus.actions.length +
    legacyMenus.groups.length +
    legacyRoles.length +
    legacyRows.talent_levels +
    legacyRows.talent_reports +
    legacyFields.talent_levels.length +
    legacyFields.talent_report_customerId.length;
  return {
    collectionStatus,
    presentCollections,
    recordsToDelete,
    legacyMenus,
    legacyRoles,
    legacyRows,
    legacyFields,
    pending,
  };
}

const snapshot = await inventory();
const schemaBefore = await readSchemaSnapshot();
writeJson(resolve(schemaOut, "m6-schema-before.json"), schemaBefore);

const reportBase = {
  generatedAt: new Date().toISOString(),
  mode: dryRun ? "dry-run" : "apply",
  target: {
    url: effectiveUrl,
    dataDir,
    backup,
    production: process.env.NODE_ENV === "production",
  },
  inventory: {
    legacyCollections: LEGACY_TALENT_COLLECTION_NAMES.length,
    legacyCollectionsPresent: snapshot.presentCollections.map((item) => ({
      name: item.name,
      records: item.records,
    })),
    legacyCollectionsMissing: snapshot.collectionStatus
      .filter((item) => !item.present)
      .map((item) => item.name),
    legacyRecordsToDelete: snapshot.recordsToDelete,
    legacyFields: snapshot.legacyFields,
    legacyMenuCounts: {
      pages: snapshot.legacyMenus.pages.length,
      actions: snapshot.legacyMenus.actions.length,
      groups: snapshot.legacyMenus.groups.length,
      permissionCodesInMenus: snapshot.legacyMenus.codesInMenus.length,
    },
    legacyRoles: snapshot.legacyRoles.map((role) => role.roleKey),
    legacyRows: snapshot.legacyRows,
    pending: snapshot.pending,
  },
  protectedCollections: [...PROTECTED_COLLECTIONS].sort(),
};

console.log("\n── 盘点结果（只读） ──");
for (const item of snapshot.collectionStatus)
  console.log(
    `  ${item.present ? "存在" : "不存在"}  ${item.name}  记录=${item.records ?? "读取失败"}`,
  );
console.log(
  `  旧菜单：C=${snapshot.legacyMenus.pages.length} / F=${snapshot.legacyMenus.actions.length} / 分组=${snapshot.legacyMenus.groups.length}；旧码=${snapshot.legacyMenus.codesInMenus.length}`,
);
console.log(`  旧角色：${snapshot.legacyRoles.map((role) => role.roleKey).join("、") || "0"}`);
console.log(
  `  旧字段：talent_levels=${snapshot.legacyFields.talent_levels.join(",") || "0"}；talent_reports.customerId=${snapshot.legacyFields.talent_report_customerId.join(",") || "0"}`,
);
console.log(
  `  旧行：talent_levels=${snapshot.legacyRows.talent_levels}、talent_reports=${snapshot.legacyRows.talent_reports}`,
);
console.log(`  待处理合计 pending=${snapshot.pending}`);

if (dryRun) {
  const writeJsonReport = {
    ...reportBase,
    dryRun: true,
    note: "dry-run 只读：未删除任何集合 / 记录 / 菜单 / 角色。真实删除需 --backup + --confirm-m6。",
  };
  writeJson(reportOut, writeJsonReport);
  if (snapshot.pending === 0)
    console.log("\n✓ dry-run：pending=0（旧口径已归零，无需执行）。");
  else console.log("\n✓ dry-run 完成：请复核报告后再备份并执行正式删除。");
  process.exit(0);
}

// ── 正式删除（APPLY）────────────────────────────────────────────────────────
if (snapshot.pending === 0) {
  writeJson(resolve(schemaOut, "m6-cleanup-report.json"), {
    ...reportBase,
    applied: false,
    deleted: {},
    note: "pending=0：旧口径已归零，幂等安全退出（未删除任何对象）。",
  });
  console.log("\n✓ pending=0：旧口径已归零，正式执行幂等退出。");
  process.exit(0);
}

const deleted = {
  collections: [],
  records: { talent_levels: 0, talent_reports: 0 },
  menus: { pages: 0, actions: 0, groups: 0, roleLinks: 0 },
  roles: [],
  fields: { talent_levels: [], talent_report_customerId: [] },
  exportedCsv: [],
};
const steps = [];

async function removeLegacyFields() {
  const levels = collectionByName.get("talent_levels");
  if (levels) {
    const nextFields = (levels.fields || []).filter(
      (field) => !LEGACY_LEVEL_FIELDS.includes(field.name),
    );
    const nextIndexes = (levels.indexes || []).filter(
      (sql) => !String(sql).includes(LEGACY_LEVEL_INDEX),
    );
    if (
      nextFields.length !== (levels.fields || []).length ||
      nextIndexes.length !== (levels.indexes || []).length
    ) {
      await pb.collections.update(levels.id, { fields: nextFields, indexes: nextIndexes });
      deleted.fields.talent_levels = snapshot.legacyFields.talent_levels;
    }
  }
  const reports = collectionByName.get("talent_reports");
  if (reports && snapshot.legacyFields.talent_report_customerId.length) {
    const nextFields = (reports.fields || []).filter(
      (field) => !LEGACY_REPORT_FIELDS.includes(field.name),
    );
    await pb.collections.update(reports.id, { fields: nextFields });
    deleted.fields.talent_report_customerId = snapshot.legacyFields.talent_report_customerId;
  }
  steps.push("删除旧字段 / 旧索引");
}

async function removeLegacyRows() {
  if (snapshot.legacyRows.talent_levels && collectionNames.has("talent_levels")) {
    const rows = await pb
      .collection("talent_levels")
      .getFullList({ filter: 'elementId != ""', fields: "id", $autoCancel: false });
    for (const row of rows)
      await pb.collection("talent_levels").delete(row.id, { $autoCancel: false });
    deleted.records.talent_levels = rows.length;
  }
  if (snapshot.legacyRows.talent_reports && collectionNames.has("talent_reports")) {
    const rows = await pb
      .collection("talent_reports")
      .getFullList({ filter: 'subjectType = ""', fields: "id", $autoCancel: false });
    for (const row of rows)
      await pb.collection("talent_reports").delete(row.id, { $autoCancel: false });
    deleted.records.talent_reports = rows.length;
  }
  steps.push("删除 talent_levels / talent_reports 旧行");
}

async function removeLegacyMenusAndRoles() {
  for (const menu of snapshot.legacyMenus.actions) {
    await deleteMenuWithLinks(menu.id);
    deleted.menus.actions += 1;
  }
  for (const menu of snapshot.legacyMenus.pages) {
    await deleteMenuWithLinks(menu.id);
    deleted.menus.pages += 1;
  }
  for (const menu of snapshot.legacyMenus.groups) {
    await deleteMenuWithLinks(menu.id);
    deleted.menus.groups += 1;
  }
  for (const role of snapshot.legacyRoles) {
    const menuLinks = await pb
      .collection("role_menus")
      .getFullList({ filter: `roleId = "${role.id}"`, $autoCancel: false });
    for (const link of menuLinks)
      await pb.collection("role_menus").delete(link.id, { $autoCancel: false });
    const userLinks = await pb
      .collection("user_roles")
      .getFullList({ filter: `roleId = "${role.id}"`, $autoCancel: false });
    for (const link of userLinks)
      await pb.collection("user_roles").delete(link.id, { $autoCancel: false });
    await pb.collection("roles").delete(role.id, { $autoCancel: false });
    deleted.roles.push(role.roleKey);
  }
  steps.push("删除旧菜单 / 旧权限码 / 机构角色");
}

async function removeLegacyCollections() {
  for (const name of LEGACY_TALENT_COLLECTION_DELETE_ORDER) {
    if (PROTECTED_COLLECTIONS.has(name))
      throw new Error(`拒绝删除受保护集合：${name}`);
    if (!collectionNames.has(name)) continue;
    await pb.collections.delete(collectionByName.get(name).id);
    deleted.collections.push(name);
  }
  steps.push(`删除旧集合（${deleted.collections.length}）`);
}

try {
  if (exportCsvDir) {
    console.log("\n── 导出旧集合 CSV ──");
    deleted.exportedCsv = await exportLegacyCsv(exportCsvDir);
  }
  // 顺序：先用旧字段筛选并删除旧行（talent_levels.elementId / talent_reports.subjectType），
  // 再删旧字段与旧索引，最后删菜单 / 角色与集合（M6 规格 §4.6：先删字段 / 旧行，再删集合）。
  if (snapshot.legacyRows.talent_levels || snapshot.legacyRows.talent_reports)
    await removeLegacyRows();
  if (snapshot.legacyFields.talent_levels.length || snapshot.legacyFields.talent_report_customerId.length)
    await removeLegacyFields();
  await removeLegacyMenusAndRoles();
  await removeLegacyCollections();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  writeJson(resolve(schemaOut, "m6-cleanup-report.json"), {
    ...reportBase,
    applied: false,
    failed: true,
    error: message,
    completedSteps: steps,
    deleted,
    recovery: "已中止且不自动重试：请按 ADR 0006-D6 整库恢复备份后重新执行（禁止只补单个集合）。",
  });
  fail(`执行失败，已中止（不自动重试）：${message}`, 1);
}

// 审计：写 oper_logs（脱敏，不含身份证明文 / 手机号）。
try {
  await pb.collection("oper_logs").create(
    {
      title: "M6 旧口径清理",
      operType: "cleanup",
      method: "scripts/cleanup-m6.mjs",
      requestMethod: "CLI",
      operName: auditName,
      operUrl: effectiveUrl,
      operParam: JSON.stringify({
        backup: backup?.sha256 ? `sha256:${backup.sha256.slice(0, 16)}…` : "",
        backupKey: backupPath ? backupPath.split(/[\\/]/).pop() : "",
        deletedCollections: deleted.collections.length,
        deletedRecords: deleted.records,
        deletedMenus: deleted.menus,
        deletedRoles: deleted.roles,
      }).slice(0, 2000),
      status: 1,
      costTime: 0,
    },
    { $autoCancel: false },
  );
} catch (error) {
  console.warn(`⚠ 写 oper_logs 失败（不影响删除结果）：${error instanceof Error ? error.message : error}`);
}

const finalReport = {
  ...reportBase,
  applied: true,
  completedSteps: steps,
  deleted,
  note: "正式删除完成。回滚只能整库恢复备份 + 切回 pre-m6-cleanup tag（ADR 0006-D6）。",
};
writeJson(resolve(schemaOut, "m6-cleanup-report.json"), finalReport);
writeJson(reportOut, finalReport);
console.log(
  `\n✓ 清理完成：集合 ${deleted.collections.length} 个、旧行 ${deleted.records.talent_levels + deleted.records.talent_reports} 行、` +
    `菜单 ${deleted.menus.pages + deleted.menus.actions + deleted.menus.groups} 行、角色 ${deleted.roles.length} 个。`,
);