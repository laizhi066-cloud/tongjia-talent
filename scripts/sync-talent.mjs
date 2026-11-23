#!/usr/bin/env node
/**
 * @description 将已有本地 PocketBase 的天赋菜单、权限名称和废弃字段同步到当前交付口径。
 * @file scripts/sync-talent.mjs
 */
import PocketBase from "pocketbase";
import { loadDotEnv } from "./_pb.mjs";
import {
  COLLECTION_DEFS,
  LEGACY_TALENT_COLLECTION_NAMES,
  LEGACY_TALENT_GROUP_NAMES,
  LEGACY_TALENT_MENU_PATHS,
  LEGACY_TALENT_PERMISSION_CODES,
  LEGACY_TALENT_ROLE_KEYS,
  TALENT_ADVICE_COLLECTION_NAMES,
  TALENT_ADVICE_INDEX_DEFS,
  TALENT_BUSINESS_PERMISSION_CODES,
  TALENT_DASHBOARD_PERMISSION_CODE,
  TALENT_DIRECTION_COLLECTION_NAMES,
  TALENT_DIRECTION_INDEX_DEFS,
  TALENT_M1_RULE_PERMISSION_CODES,
  TALENT_M2_MEMBER_PERMISSION_CODES,
  TALENT_M3_REPORT_PERMISSION_CODES,
  TALENT_M4_DIRECTION_PERMISSION_CODES,
  TALENT_M5_ADVICE_PERMISSION_CODES,
  TALENT_MEMBER_COLLECTION_NAMES,
  TALENT_MEMBER_INDEX_DEFS,
  TALENT_PDF_COLLECTION_NAMES,
  TALENT_PDF_INDEX_DEFS,
  TALENT_REPORT_COLLECTION_NAMES,
  TALENT_REPORT_INDEX_DEFS,
  SYSTEM_AND_MONITOR_GROUP_NAMES,
  SYSTEM_AND_MONITOR_MENU_PATHS,
  createCollection,
  ensureIndex,
  installFields,
  installRelations,
  seedMenus,
  syncTalentBusinessRoles,
} from "./setup.mjs";

loadDotEnv();

const url = process.env.POCKETBASE_URL || "http://127.0.0.1:8090";
const email = process.env.POCKETBASE_ADMIN_EMAIL || "";
const password =
  process.env.POCKETBASE_ADMIN_PASSWORD ||
  process.env.POCKETBASE_ADMIN_PASS ||
  "";

if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url))
  throw new Error("天赋同步只允许连接本机 PocketBase");
if (!email || !password)
  throw new Error("缺少 POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD");

const pb = new PocketBase(url);
pb.autoCancellation(false);
await pb.collection("_superusers").authWithPassword(email, password);

// 报告 PDF 不允许通过 PocketBase 文件直链读取，统一由 Nitro 代理重新判权。
const uploadsCollection = await pb.collections.getOne("uploads");
if (
  uploadsCollection.viewRule !== 'purpose != "talent-report-pdf"' ||
  uploadsCollection.listRule !== 'purpose != "talent-report-pdf"'
) {
  await pb.collections.update(uploadsCollection.id, {
    listRule: 'purpose != "talent-report-pdf"',
    viewRule: 'purpose != "talent-report-pdf"',
  });
}

const levelCollection = await pb.collections.getOne("talent_levels");
const fields = levelCollection.fields.filter((field) => field.name !== "style");
if (fields.length !== levelCollection.fields.length)
  await pb.collections.update(levelCollection.id, { fields });

// ── M1 规则域：新库只建集合/字段/关系/索引；talent_levels 只加新字段并把旧字段放宽为非必填。
// 任何删除字段、删除索引、改数据或收紧必填的动作都不在本脚本执行（ADR 0001-D1）。
const RULE_COLLECTION_NAMES = [
  "talent_factor_libraries",
  "talent_factors",
  "talent_factor_notes",
  "talent_directions",
  "talent_tiers",
];
for (const name of RULE_COLLECTION_NAMES) {
  const definition = COLLECTION_DEFS.find((item) => item.name === name);
  if (!definition) throw new Error(`初始化定义缺少 ${name}`);
  await createCollection(pb, definition);
  await installFields(pb, definition);
}
const levelDefinition = COLLECTION_DEFS.find(
  (definition) => definition.name === "talent_levels",
);
if (!levelDefinition) throw new Error("初始化定义缺少 talent_levels");
await createCollection(pb, levelDefinition);
await installFields(pb, levelDefinition);
const ruleCollections = new Map(
  (await pb.collections.getFullList()).map((collection) => [
    collection.name,
    collection,
  ]),
);
for (const name of ["talent_levels", ...RULE_COLLECTION_NAMES]) {
  const definition = COLLECTION_DEFS.find((item) => item.name === name);
  if (definition) await installRelations(pb, definition, ruleCollections);
}
for (const [collection, sql] of [
  [
    "talent_levels",
    'CREATE UNIQUE INDEX idx_talent_levels_code ON talent_levels (code) WHERE code != ""',
  ],
  [
    "talent_levels",
    "CREATE UNIQUE INDEX idx_talent_levels_sort ON talent_levels (sortOrder) WHERE sortOrder > 0",
  ],
  [
    "talent_factor_libraries",
    "CREATE UNIQUE INDEX idx_talent_factor_libraries_gender_age ON talent_factor_libraries (gender, age)",
  ],
  [
    "talent_factors",
    "CREATE UNIQUE INDEX idx_talent_factors_library_code ON talent_factors (libraryId, code)",
  ],
  [
    "talent_factors",
    "CREATE INDEX idx_talent_factors_category ON talent_factors (category)",
  ],
  [
    "talent_factors",
    "CREATE INDEX idx_talent_factors_sort ON talent_factors (libraryId, sortOrder)",
  ],
  [
    "talent_factor_notes",
    "CREATE UNIQUE INDEX idx_talent_factor_notes_code ON talent_factor_notes (code)",
  ],
  [
    "talent_factor_notes",
    "CREATE INDEX idx_talent_factor_notes_factor ON talent_factor_notes (factorCode)",
  ],
  [
    "talent_factor_notes",
    "CREATE INDEX idx_talent_factor_notes_level ON talent_factor_notes (levelCode)",
  ],
  [
    "talent_factor_notes",
    "CREATE INDEX idx_talent_factor_notes_status ON talent_factor_notes (status)",
  ],
  [
    "talent_directions",
    "CREATE UNIQUE INDEX idx_talent_directions_code ON talent_directions (code)",
  ],
  [
    "talent_directions",
    "CREATE INDEX idx_talent_directions_status ON talent_directions (status)",
  ],
  [
    "talent_tiers",
    "CREATE UNIQUE INDEX idx_talent_tiers_code ON talent_tiers (code)",
  ],
  [
    "talent_tiers",
    "CREATE UNIQUE INDEX idx_talent_tiers_sort ON talent_tiers (sortOrder)",
  ],
  [
    "talent_tiers",
    "CREATE UNIQUE INDEX idx_talent_tiers_default ON talent_tiers (isDefault) WHERE isDefault = 1",
  ],
]) {
  try {
    await ensureIndex(pb, collection, sql);
  } catch (error) {
    console.warn(
      `⨯ 跳过规则域索引 ${collection}：${error instanceof Error ? error.message : error}`,
    );
  }
}

// ── M2 会员域：只新增 talent_parents / talent_children 的集合、字段、关系与索引。
// 不删旧集合 / 旧字段 / 旧索引，不改 M2.0 菜单断言；9 个新权限码与「会员管理」重指向
// 由 M2 API/菜单任务在同一脚本追加（ADR 0002-D8）。
for (const name of TALENT_MEMBER_COLLECTION_NAMES) {
  const definition = COLLECTION_DEFS.find((item) => item.name === name);
  if (!definition) throw new Error(`初始化定义缺少 ${name}`);
  await createCollection(pb, definition);
  await installFields(pb, definition);
}
const memberCollections = new Map(
  (await pb.collections.getFullList()).map((collection) => [
    collection.name,
    collection,
  ]),
);
for (const name of TALENT_MEMBER_COLLECTION_NAMES) {
  const definition = COLLECTION_DEFS.find((item) => item.name === name);
  if (definition) await installRelations(pb, definition, memberCollections);
}
for (const [collection, sql] of TALENT_MEMBER_INDEX_DEFS) {
  try {
    await ensureIndex(pb, collection, sql);
  } catch (error) {
    console.warn(
      `⨯ 跳过会员域索引 ${collection}：${error instanceof Error ? error.message : error}`,
    );
  }
}

// ── M3 报告域：新增 talent_gene_reports；talent_reports 只加新字段/关系/索引；talent_sync_logs
// 只加逐人明细字段。旧字段 / 旧集合的删除由 M6 迁移脚本负责（ADR 0003-D6 / 0006-D1）。
for (const name of TALENT_REPORT_COLLECTION_NAMES) {
  const definition = COLLECTION_DEFS.find((item) => item.name === name);
  if (!definition) throw new Error(`初始化定义缺少 ${name}`);
  await createCollection(pb, definition);
  await installFields(pb, definition);
}
const reportDomainCollections = new Map(
  (await pb.collections.getFullList()).map((collection) => [
    collection.name,
    collection,
  ]),
);
for (const name of TALENT_REPORT_COLLECTION_NAMES) {
  const definition = COLLECTION_DEFS.find((item) => item.name === name);
  if (definition) await installRelations(pb, definition, reportDomainCollections);
}

/** talent_reports 的 M3 增量字段；只加不删（旧字段/旧索引保留到 M6）。 */
const M3_REPORT_NEW_FIELDS = [
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
];
const m3ReportCollection = await pb.collections.getOne("talent_reports");
const missingM3ReportFields = M3_REPORT_NEW_FIELDS.filter(
  (field) => !m3ReportCollection.fields.some((current) => current.name === field.name),
);
if (missingM3ReportFields.length)
  await pb.collections.update(m3ReportCollection.id, {
    fields: [...m3ReportCollection.fields, ...missingM3ReportFields],
  });

/** talent_reports 的 M3 增量关系：归属家长与来源基因报告（可选，旧行为空）。 */
const M3_REPORT_NEW_RELATIONS = [
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
];
const currentM3ReportCollection = await pb.collections.getOne("talent_reports");
const missingM3ReportRelations = M3_REPORT_NEW_RELATIONS.flatMap((relation) => {
  if (currentM3ReportCollection.fields.some((field) => field.name === relation.name))
    return [];
  const target = reportDomainCollections.get(relation.target);
  if (!target) throw new Error(`talent_reports 缺少关联目标 ${relation.target}`);
  const field = { ...relation };
  delete field.target;
  return [{ ...field, collectionId: target.id }];
});
if (missingM3ReportRelations.length)
  await pb.collections.update(currentM3ReportCollection.id, {
    fields: [...currentM3ReportCollection.fields, ...missingM3ReportRelations],
  });

// 放宽方向 requirements 必填：M4 转正生成「停用待配置」方向（requirements=[]，ADR 0004-D5）；
// PocketBase 的 required JSON 会把空数组判为 blank。只放宽、不删除字段，M1 保存校验仍要求 ≥1 条。
const directionForRequirements = await pb.collections.getOne("talent_directions");
let directionRequirementsRelaxed = false;
const relaxedDirectionFields = directionForRequirements.fields.map((field) => {
  if (field.name !== "requirements" || !field.required) return field;
  directionRequirementsRelaxed = true;
  return { ...field, required: false };
});
if (directionRequirementsRelaxed)
  await pb.collections.update(directionForRequirements.id, {
    fields: relaxedDirectionFields,
  });

/** talent_sync_logs 的 M3 扩展字段（旧行留空，列表按 syncScope 过滤）。 */
const M3_SYNC_LOG_NEW_FIELDS = [
  { name: "syncScope", type: "text", max: 20 },
  { name: "mode", type: "text", max: 10 },
  { name: "refreshed", type: "number" },
  { name: "createdCount", type: "number" },
  { name: "empty", type: "number" },
  { name: "subjectDetails", type: "json" },
  { name: "operatorId", type: "text", max: 64 },
];
const m3SyncLogCollection = await pb.collections.getOne("talent_sync_logs");
const missingM3SyncLogFields = M3_SYNC_LOG_NEW_FIELDS.filter(
  (field) => !m3SyncLogCollection.fields.some((current) => current.name === field.name),
);
if (missingM3SyncLogFields.length)
  await pb.collections.update(m3SyncLogCollection.id, {
    fields: [...m3SyncLogCollection.fields, ...missingM3SyncLogFields],
  });

for (const [collection, sql] of TALENT_REPORT_INDEX_DEFS) {
  try {
    await ensureIndex(pb, collection, sql);
  } catch (error) {
    console.warn(
      `⨯ 跳过报告域索引 ${collection}：${error instanceof Error ? error.message : error}`,
    );
  }
}

// ── M5 培育建议域：只新增 talent_advice_versions / talent_advice_docs 的集合、字段、关系与索引。
// 不创建 / 不修补旧集合（旧内容库等已在 M6 删除，不复用、不迁移）；
// 5 个权限码与「培育建议」菜单断言在下方 M5 段（ADR 0005-D6）。
for (const name of TALENT_ADVICE_COLLECTION_NAMES) {
  const definition = COLLECTION_DEFS.find((item) => item.name === name);
  if (!definition) throw new Error(`初始化定义缺少 ${name}`);
  await createCollection(pb, definition);
  await installFields(pb, definition);
}
const adviceDomainCollections = new Map(
  (await pb.collections.getFullList()).map((collection) => [
    collection.name,
    collection,
  ]),
);
for (const name of TALENT_ADVICE_COLLECTION_NAMES) {
  const definition = COLLECTION_DEFS.find((item) => item.name === name);
  if (definition) await installRelations(pb, definition, adviceDomainCollections);
}
for (const [collection, sql] of TALENT_ADVICE_INDEX_DEFS) {
  try {
    await ensureIndex(pb, collection, sql);
  } catch (error) {
    console.warn(
      `⨯ 跳过培育建议域索引 ${collection}：${error instanceof Error ? error.message : error}`,
    );
  }
}

// ── M4 方向匹配域：只新增 talent_direction_requests 的集合、字段、关系与索引。
// 不删 M1 方向/档位/分级集合、字段或索引，不改 M1 方向保存校验；`talent:direction:merge`
// 权限码与「待归并方向」F 行由 seedMenus 幂等写入，下方做缺码断言（ADR 0004-D5）。
for (const name of TALENT_DIRECTION_COLLECTION_NAMES) {
  const definition = COLLECTION_DEFS.find((item) => item.name === name);
  if (!definition) throw new Error(`初始化定义缺少 ${name}`);
  await createCollection(pb, definition);
  await installFields(pb, definition);
}
const directionDomainCollections = new Map(
  (await pb.collections.getFullList()).map((collection) => [
    collection.name,
    collection,
  ]),
);
for (const name of TALENT_DIRECTION_COLLECTION_NAMES) {
  const definition = COLLECTION_DEFS.find((item) => item.name === name);
  if (definition)
    await installRelations(pb, definition, directionDomainCollections);
}
for (const [collection, sql] of TALENT_DIRECTION_INDEX_DEFS) {
  try {
    await ensureIndex(pb, collection, sql);
  } catch (error) {
    console.warn(
      `⨯ 跳过方向匹配域索引 ${collection}：${error instanceof Error ? error.message : error}`,
    );
  }
}

// ── M8 PDF 域：只新增 talent_report_pdfs / talent_pdf_downloads 的集合、字段、关系与索引。
// 不删旧集合 / 旧字段 / 旧索引；旧 pdfUrl 字段与旧 talent-report-pdf.ts 保持到 M6（ADR 0008-D5）。
for (const name of TALENT_PDF_COLLECTION_NAMES) {
  const definition = COLLECTION_DEFS.find((item) => item.name === name);
  if (!definition) throw new Error(`初始化定义缺少 ${name}`);
  await createCollection(pb, definition);
  await installFields(pb, definition);
}
const pdfDomainCollections = new Map(
  (await pb.collections.getFullList()).map((collection) => [
    collection.name,
    collection,
  ]),
);
for (const name of TALENT_PDF_COLLECTION_NAMES) {
  const definition = COLLECTION_DEFS.find((item) => item.name === name);
  if (definition) await installRelations(pb, definition, pdfDomainCollections);
}
for (const [collection, sql] of TALENT_PDF_INDEX_DEFS) {
  try {
    await ensureIndex(pb, collection, sql);
  } catch (error) {
    console.warn(
      `⨯ 跳过 PDF 域索引 ${collection}：${error instanceof Error ? error.message : error}`,
    );
  }
}

const reportCollection = await pb.collections.getOne("talent_reports");
const reportFields = [
  { name: "pdfUrl", type: "text", max: 1000 },
  { name: "sourceSystem", type: "text", max: 40 },
  { name: "sourceExternalId", type: "text", max: 120 },
  { name: "externalRevision", type: "text", max: 40 },
  { name: "sourceFingerprint", type: "text", max: 128 },
  { name: "syncedAt", type: "date" },
  { name: "withdrawnAt", type: "date" },
  { name: "pdfFileName", type: "text", max: 255 },
  { name: "pdfFileKey", type: "text", max: 1000 },
  { name: "pdfUploadedAt", type: "date" },
  { name: "errorMessage", type: "text", max: 1000 },
  { name: "matchedPlanIds", type: "json" },
  { name: "planMatchPolicyVersion", type: "text", max: 40 },
  { name: "planMatchReason", type: "text", max: 1000 },
  { name: "sourceResults", type: "json" },
];
const missingReportFields = reportFields.filter(
  (field) =>
    !reportCollection.fields.some((current) => current.name === field.name),
);
if (missingReportFields.length)
  await pb.collections.update(reportCollection.id, {
    fields: [...reportCollection.fields, ...missingReportFields],
  });
// ── M6：旧报告子表 / 内容库 / 模板 / 机构 / 计划集合已删除，sync 不再创建或修补它们；
//    存量库的旧集合与旧数据由 `scripts/cleanup-m6.mjs`（默认 dry-run）在备份后处理（ADR 0006-D1/D2）。

// talent_reading_progress 保留（M7 重写访问层，ADR 0006-D5）：只补唯一索引，不删旧行。
try {
  await ensureIndex(
    pb,
    "talent_reading_progress",
    "CREATE UNIQUE INDEX idx_talent_reading_progress_pair ON talent_reading_progress (reportId, userId)",
  );
} catch (error) {
  console.warn(
    `⨯ 跳过索引 talent_reading_progress：${error instanceof Error ? error.message : error}`,
  );
}

await seedMenus(pb);

// ── M6 旧口径归零（ADR 0006-D1 / 0006-D4）：删除旧 C/F/分组菜单与旧权限码，删除机构角色及其授权。
// 只删「菜单 / 角色配置」，不删业务数据、不删集合；集合与旧行删除只由 `cleanup-m6.mjs` 在备份后执行。
async function deleteMenuWithLinks(menuId) {
  const links = await pb
    .collection("role_menus")
    .getFullList({ filter: `menuId = "${menuId}"`, $autoCancel: false });
  for (const link of links)
    await pb.collection("role_menus").delete(link.id, { $autoCancel: false });
  await pb.collection("menus").delete(menuId, { $autoCancel: false });
}
const legacyMenuPathSet = new Set(LEGACY_TALENT_MENU_PATHS);
const legacyGroupNameSet = new Set(LEGACY_TALENT_GROUP_NAMES);
const legacyCodeSet = new Set(LEGACY_TALENT_PERMISSION_CODES);
const menusBeforeCleanup = await pb
  .collection("menus")
  .getFullList({ $autoCancel: false });
const legacyPageRows = menusBeforeCleanup.filter((menu) =>
  legacyMenuPathSet.has(String(menu.path || "")),
);
const legacyPageIdSet = new Set(
  legacyPageRows.map((menu) => String(menu.id)),
);
const legacyActionRows = menusBeforeCleanup.filter(
  (menu) =>
    menu.menuType === "F" &&
    (legacyPageIdSet.has(String(menu.parentId || "")) ||
      legacyCodeSet.has(String(menu.permissionCode || ""))),
);
const legacyGroupRows = menusBeforeCleanup.filter(
  (menu) =>
    menu.menuType === "M" && legacyGroupNameSet.has(String(menu.menuName || "")),
);
// 顺序：F 行 → C 行 → 旧分组行，避免 relation 悬空。
for (const menu of legacyActionRows) await deleteMenuWithLinks(menu.id);
for (const menu of legacyPageRows) await deleteMenuWithLinks(menu.id);
for (const menu of legacyGroupRows) await deleteMenuWithLinks(menu.id);
const removedLegacyMenus =
  legacyActionRows.length + legacyPageRows.length + legacyGroupRows.length;

// 机构角色（talent_agent / talent_service_provider）：删角色行与授权；账号只停用不删除（ADR 0006-D4/Q7）。
const removedLegacyRoles = [];
for (const roleKey of LEGACY_TALENT_ROLE_KEYS) {
  const role = await pb
    .collection("roles")
    .getFirstListItem(`roleKey = "${roleKey}"`, { $autoCancel: false })
    .catch(() => null);
  if (!role) continue;
  for (const link of await pb
    .collection("role_menus")
    .getFullList({ filter: `roleId = "${role.id}"`, $autoCancel: false }))
    await pb.collection("role_menus").delete(link.id, { $autoCancel: false });
  for (const link of await pb
    .collection("user_roles")
    .getFullList({ filter: `roleId = "${role.id}"`, $autoCancel: false }))
    await pb.collection("user_roles").delete(link.id, { $autoCancel: false });
  await pb.collection("roles").delete(role.id, { $autoCancel: false });
  removedLegacyRoles.push(roleKey);
}
if (removedLegacyMenus || removedLegacyRoles.length)
  console.log(
    `• M6 旧口径清理：删除旧菜单 ${removedLegacyMenus} 行、旧角色 ${removedLegacyRoles.join("、") || "0 个"}`,
  );


// ── M1 规则域菜单 / 权限码：菜单由 seedMenus 幂等 upsert，这里只做存量库校验（ADR 0001-D5）。
// 「分级与固定注解」沿用旧菜单行重指向新页，必须仍然只有一条同名 C 菜单。
// M1 / M2 / M3 / M4 / M5 权限码统一由 setup.mjs 的三角色矩阵导出（M6-A），这里只做别名引用，
// 避免菜单种子、存量库断言与角色种子三处漂移。
const M1_RULE_PERMISSION_CODES = TALENT_M1_RULE_PERMISSION_CODES;
// ── M2 会员域 9 个权限码（ADR 0002-D8）：1 个页面 C 菜单码 + 8 个 F 按钮码。
const M2_MEMBER_PERMISSION_CODES = TALENT_M2_MEMBER_PERMISSION_CODES;
const syncedMenus = await pb
  .collection("menus")
  .getFullList({
    fields: "menuName,menuType,path,permissionCode,status",
    $autoCancel: false,
  });
const syncedMenuCodes = new Set(
  syncedMenus.map((menu) => String(menu.permissionCode || "")).filter(Boolean),
);
const missingRuleCodes = M1_RULE_PERMISSION_CODES.filter(
  (code) => !syncedMenuCodes.has(code),
);
if (missingRuleCodes.length)
  throw new Error(`M1 规则域权限码缺少 C/F 菜单行：${missingRuleCodes.join("、")}`);
// ── M4 方向匹配域：新增 1 个 F 按钮码（归并 / 转正）；待归并列表复用 M1 `talent:direction:list`。
// 缺 F 行即失败（spec §2.2「权限码不得只在接口使用而无菜单行」）。
const M4_DIRECTION_PERMISSION_CODES = TALENT_M4_DIRECTION_PERMISSION_CODES;
const missingDirectionCodes = M4_DIRECTION_PERMISSION_CODES.filter(
  (code) => !syncedMenuCodes.has(code),
);
if (missingDirectionCodes.length)
  throw new Error(
    `M4 方向匹配域权限码缺少 C/F 菜单行：${missingDirectionCodes.join("、")}`,
  );
const directionMergeActionMenus = syncedMenus.filter(
  (menu) =>
    menu.menuType === "F" &&
    menu.permissionCode === "talent:direction:merge" &&
    menu.status === "1",
);
if (!directionMergeActionMenus.length)
  throw new Error(
    "M4 方向匹配域权限码 talent:direction:merge 必须存在启用的 F 菜单行",
  );
// ── M2 会员域：9 个权限码必须都有 C/F 菜单行；「会员管理」C 菜单唯一且重指向新页。
const missingMemberCodes = M2_MEMBER_PERMISSION_CODES.filter(
  (code) => !syncedMenuCodes.has(code),
);
if (missingMemberCodes.length)
  throw new Error(
    `M2 会员域权限码缺少 C/F 菜单行：${missingMemberCodes.join("、")}`,
  );
const memberPageMenus = syncedMenus.filter(
  (menu) => menu.menuType === "C" && menu.path === "/admin/talent/member",
);
if (
  memberPageMenus.length !== 1 ||
  memberPageMenus[0]?.permissionCode !== "talent:parent:list"
)
  throw new Error(
    `「会员管理」C 菜单必须唯一且指向 /admin/talent/member（talent:parent:list），当前 ${memberPageMenus.length} 条`,
  );
// ── M3 报告域 4 个权威权限码（ADR 0003-D7）：list / view / sync / publish；
// `publish` 覆盖发布 / 撤回 / 恢复 / 补发 / 重算，因此同一码允许 3 条 F 行，断言「码存在 ≥1 条」。
const M3_REPORT_PERMISSION_CODES = TALENT_M3_REPORT_PERMISSION_CODES;
const missingReportCodes = M3_REPORT_PERMISSION_CODES.filter(
  (code) => !syncedMenuCodes.has(code),
);
if (missingReportCodes.length)
  throw new Error(
    `M3 报告域权限码缺少 C/F 菜单行：${missingReportCodes.join("、")}`,
  );
const reportPageMenus = syncedMenus.filter(
  (menu) => menu.menuType === "C" && menu.path === "/admin/talent/reports",
);
if (
  reportPageMenus.length !== 1 ||
  reportPageMenus[0]?.permissionCode !== "talent:report:list"
)
  throw new Error(
    `「基因报告」C 菜单必须唯一且指向 /admin/talent/reports（talent:report:list），当前 ${reportPageMenus.length} 条`,
  );
const oldReportPageMenus = syncedMenus.filter(
  (menu) =>
    menu.menuType === "C" &&
    menu.path === "/admin/talent/report" &&
    menu.status === "1",
);
if (oldReportPageMenus.length)
  throw new Error(
    `旧路径 /admin/talent/report 不得再有生效 C 菜单：${oldReportPageMenus.map((menu) => menu.menuName).join("、")}`,
  );
const reportPublishMenuRows = syncedMenus.filter(
  (menu) =>
    menu.menuType === "F" &&
    menu.permissionCode === "talent:report:publish" &&
    menu.status === "1",
);
if (!reportPublishMenuRows.length)
  throw new Error("talent:report:publish 必须至少 1 条生效 F 菜单行");

// ── M6-A 工作台拆码（ADR 0006-D3）：工作台 C 菜单与 F 行统一用 talent:dashboard:list，
// 「基因报告」C 菜单保持 talent:report:list；否则「能给规则配置员看工作台」会顺带授予报告列表接口。
const dashboardPageMenus = syncedMenus.filter(
  (menu) => menu.menuType === "C" && menu.path === "/admin/talent/dashboard",
);
if (
  dashboardPageMenus.length !== 1 ||
  dashboardPageMenus[0]?.permissionCode !== TALENT_DASHBOARD_PERMISSION_CODE
)
  throw new Error(
    `「工作台」C 菜单必须唯一且指向 /admin/talent/dashboard（${TALENT_DASHBOARD_PERMISSION_CODE}），当前 ${dashboardPageMenus.length} 条`,
  );
const dashboardActionMenus = syncedMenus.filter(
  (menu) =>
    menu.menuType === "F" &&
    menu.permissionCode === TALENT_DASHBOARD_PERMISSION_CODE &&
    menu.status === "1",
);
if (!dashboardActionMenus.length)
  throw new Error(
    `工作台 F 行必须使用 ${TALENT_DASHBOARD_PERMISSION_CODE}（查看天赋工作台），当前 0 条`,
  );
const staleDashboardActions = syncedMenus.filter(
  (menu) =>
    menu.menuName === "查看天赋工作台" &&
    menu.permissionCode === "talent:report:list",
);
if (staleDashboardActions.length)
  throw new Error(
    "工作台 F 行仍复用 talent:report:list；请重新执行 menu 同步或检查旧库残留",
  );
// M6 后业务域在册 35 个新码：每个码都必须有 ≥1 条 C/F 菜单行（CONVENTIONS §3）。
const missingBusinessCodes = TALENT_BUSINESS_PERMISSION_CODES.filter(
  (code) => !syncedMenuCodes.has(code),
);
if (missingBusinessCodes.length)
  throw new Error(
    `M6 业务权限码缺少 C/F 菜单行：${missingBusinessCodes.join("、")}`,
  );

// ── M5 培育建议域 5 个权限码（ADR 0005-D1/D3）：1 个 C 菜单码 + 4 个 F 动作码。
// 「培育建议」C 菜单行由 M2.0 建立（path / component 不变），M5 只补 F 行并断言 5 码都有 C/F 行；
// 同一动作码允许 ≥1 条 F 行（断言码存在即可），C 菜单仍必须唯一。
const M5_ADVICE_PERMISSION_CODES = TALENT_M5_ADVICE_PERMISSION_CODES;
const missingAdviceCodes = M5_ADVICE_PERMISSION_CODES.filter(
  (code) => !syncedMenuCodes.has(code),
);
if (missingAdviceCodes.length)
  throw new Error(
    `M5 培育建议域权限码缺少 C/F 菜单行：${missingAdviceCodes.join("、")}`,
  );
const advicePageMenus = syncedMenus.filter(
  (menu) => menu.menuType === "C" && menu.path === "/admin/talent/advice",
);
if (
  advicePageMenus.length !== 1 ||
  advicePageMenus[0]?.permissionCode !== "talent:advice:list"
)
  throw new Error(
    `「培育建议」C 菜单必须唯一且指向 /admin/talent/advice（talent:advice:list），当前 ${advicePageMenus.length} 条`,
  );
for (const code of ["talent:advice:view", "talent:advice:sync", "talent:advice:publish", "talent:advice:export"]) {
  const actionRows = syncedMenus.filter(
    (menu) =>
      menu.menuType === "F" &&
      menu.permissionCode === code &&
      menu.status === "1",
  );
  if (!actionRows.length) throw new Error(`${code} 必须至少 1 条生效 F 菜单行`);
}

const ruleLevelMenus = syncedMenus.filter(
  (menu) => menu.menuType === "C" && menu.menuName === "分级与固定注解",
);
if (
  ruleLevelMenus.length !== 1 ||
  ruleLevelMenus[0]?.path !== "/admin/talent/rules/level"
)
  throw new Error(
    `「分级与固定注解」菜单必须唯一且指向 /admin/talent/rules/level，当前 ${ruleLevelMenus.length} 条`,
  );
// ── 菜单结构（2026-11-16 用户口径）：工作台 / 会员管理为一级 C 菜单（不再建同名 M 目录）；
// 培养方向管理并入「天赋规则」（潜质要素 → 分级与固定注解 → 培养方向管理）；
// 系统管理 9 页 + 运行监控 6 页恢复为底座内置页面组，仅 superAdmin 可见。
// 菜单行由 seedMenus 幂等写入，这里对存量库做结构断言与角色菜单收敛；
// 旧天赋入口与 22 个旧码已在上方 M6 清理块删除，这里断言归零。
const MENU_ALIGNMENT_GROUPS = ["天赋规则", "报告管理", "系统管理", "运行监控"];
/** [菜单名, path, 父分组名]；父分组为 null 表示一级 C 菜单（侧栏直接显示，不建同名目录）。 */
const MENU_ALIGNMENT_PAGES = [
  // 一级 C 菜单。
  ["工作台", "/admin/talent/dashboard", null],
  ["会员管理", "/admin/talent/member", null],
  // 天赋规则（顺序：潜质要素 → 分级与固定注解 → 培养方向管理）。
  ["潜质要素", "/admin/talent/rules/factor", "天赋规则"],
  ["分级与固定注解", "/admin/talent/rules/level", "天赋规则"],
  ["培养方向管理", "/admin/talent/rules/direction", "天赋规则"],
  // 报告管理。
  ["基因报告", "/admin/talent/reports", "报告管理"],
  ["培育建议", "/admin/talent/advice", "报告管理"],
  // 系统管理（底座内置页面，仅 superAdmin 可见）。
  ["用户列表", "/admin/user", "系统管理"],
  ["菜单管理", "/admin/menu", "系统管理"],
  ["角色管理", "/admin/role", "系统管理"],
  ["部门管理", "/admin/dept", "系统管理"],
  ["岗位管理", "/admin/post", "系统管理"],
  ["字典管理", "/admin/dict", "系统管理"],
  ["参数设置", "/admin/config", "系统管理"],
  ["站点配置", "/admin/site-config", "系统管理"],
  ["微信配置", "/admin/settings/wechat", "系统管理"],
  // 运行监控（底座内置页面，仅 superAdmin 可见）。
  ["系统健康", "/admin/monitor/health", "运行监控"],
  // 没有独立「服务器信息」页：复用系统健康页（含 PB 版本 / 集合数 / 运行摘要 / 环境状态）。
  ["服务器信息", "/admin/monitor/health", "运行监控"],
  ["在线用户", "/admin/monitor/online", "运行监控"],
  ["错误监控", "/admin/monitor/error", "运行监控"],
  ["操作日志", "/admin/log/oper-log", "运行监控"],
  ["登录日志", "/admin/log/login-log", "运行监控"],
];
/** 每个分组的子菜单顺序；assertion 会按 orderNum 逐项比对。 */
const MENU_ALIGNMENT_CHILDREN = new Map([
  ["天赋规则", ["潜质要素", "分级与固定注解", "培养方向管理"]],
  ["报告管理", ["基因报告", "培育建议"]],
  [
    "系统管理",
    [
      "用户列表",
      "菜单管理",
      "角色管理",
      "部门管理",
      "岗位管理",
      "字典管理",
      "参数设置",
      "站点配置",
      "微信配置",
    ],
  ],
  [
    "运行监控",
    ["系统健康", "服务器信息", "在线用户", "错误监控", "操作日志", "登录日志"],
  ],
]);
/** 客户管理员只保留业务 7 个菜单（不含系统管理 / 运行监控）。 */
const BUSINESS_MENU_PATHS = [
  "/admin/talent/dashboard",
  "/admin/talent/member",
  "/admin/talent/rules/direction",
  "/admin/talent/rules/factor",
  "/admin/talent/rules/level",
  "/admin/talent/reports",
  "/admin/talent/advice",
];
const alignedMenus = await pb
  .collection("menus")
  .getFullList({ $autoCancel: false });
const alignedMenuById = new Map(
  alignedMenus.map((menu) => [String(menu.id), menu]),
);
const activeGroupNames = alignedMenus
  .filter((menu) => menu.menuType === "M" && menu.status === "1")
  .map((menu) => String(menu.menuName))
  .sort();
if (
  JSON.stringify(activeGroupNames) !==
  JSON.stringify([...MENU_ALIGNMENT_GROUPS].sort())
)
  throw new Error(
    `一级分组必须只有 ${MENU_ALIGNMENT_GROUPS.join(" / ")}，当前 ${activeGroupNames.join(" / ")}`,
  );
const activePlatformPages = alignedMenus.filter(
  (menu) =>
    menu.menuType === "C" &&
    menu.status === "1" &&
    // visible = "1" 是系统看板钻取用的隐藏明细路由，不占侧栏二级菜单名额。
    menu.visible !== "1",
);
const activePageKey = activePlatformPages
  .map((menu) => `${menu.menuName}|${menu.path}`)
  .sort();
const expectedPageKey = MENU_ALIGNMENT_PAGES.map(
  ([menuName, path]) => `${menuName}|${path}`,
).sort();
if (JSON.stringify(activePageKey) !== JSON.stringify(expectedPageKey))
  throw new Error(
    `侧栏页面菜单必须精确为 ${MENU_ALIGNMENT_PAGES.length} 条，当前 ${activePageKey.join("、")}`,
  );
for (const [menuName, path, parentName] of MENU_ALIGNMENT_PAGES) {
  const page = activePlatformPages.find(
    (menu) => menu.menuName === menuName && menu.path === path,
  );
  const parent = alignedMenuById.get(String(page?.parentId || ""));
  if (!page || (parent?.menuName ?? null) !== (parentName ?? null))
    throw new Error(
      `菜单「${menuName}」必须挂在「${parentName ?? "一级（无父级）"}」下，当前父级 ${parent?.menuName || "无"}`,
    );
}
// 工作台 / 会员管理是一级 C 菜单：不能挂任何目录，侧栏直接显示。
for (const menuName of ["工作台", "会员管理"]) {
  const page = activePlatformPages.find((menu) => menu.menuName === menuName);
  if (!page || page.parentId)
    throw new Error(`「${menuName}」必须是一级 C 菜单（parentId 为空）`);
}
// 分组子菜单数量与顺序：天赋规则 3 / 报告管理 2 / 系统管理 10 / 运行监控 6。
for (const [groupName, expectedChildren] of MENU_ALIGNMENT_CHILDREN) {
  const group = alignedMenus.find(
    (menu) =>
      menu.menuType === "M" && menu.menuName === groupName && menu.status === "1",
  );
  if (!group) throw new Error(`缺少一级分组「${groupName}」`);
  const children = activePlatformPages
    .filter((menu) => String(menu.parentId || "") === String(group.id))
    .sort((left, right) => Number(left.orderNum || 0) - Number(right.orderNum || 0))
    .map((menu) => String(menu.menuName));
  if (JSON.stringify(children) !== JSON.stringify(expectedChildren))
    throw new Error(
      `「${groupName}」子菜单必须为 ${expectedChildren.join(" / ")}，当前 ${children.join(" / ")}`,
    );
}
// ── M6 旧入口 / 旧码归零（AC-M6-01 / AC-M6-08）：旧 path / 旧码 / 旧分组行不允许存在（含 status = "0"）。
// 注意：新的一级 C 菜单也叫「工作台 / 会员管理」，旧分组按 menuType = "M" 判定，避免误伤新菜单。
const remainingLegacyMenus = alignedMenus.filter(
  (menu) =>
    legacyMenuPathSet.has(String(menu.path || "")) ||
    (menu.menuType === "M" && legacyGroupNameSet.has(String(menu.menuName || ""))) ||
    legacyCodeSet.has(String(menu.permissionCode || "")),
);
if (remainingLegacyMenus.length)
  throw new Error(
    `M6 旧菜单 / 旧权限码必须归零，当前仍存在：${remainingLegacyMenus
      .map((menu) => `${menu.menuName}(${menu.path || menu.permissionCode})`)
      .join("、")}`,
  );

/** 角色菜单收敛：只保留给定菜单 id，缺的补、多的删。 */
async function syncRoleMenus(role, allowedMenuIds) {
  const links = await pb.collection("role_menus").getFullList({
    filter: `roleId = "${role.id}"`,
    $autoCancel: false,
  });
  for (const link of links)
    if (!allowedMenuIds.has(String(link.menuId || "")))
      await pb
        .collection("role_menus")
        .delete(link.id, { $autoCancel: false });
  for (const menuId of allowedMenuIds) {
    if (links.some((link) => String(link.menuId || "") === menuId)) continue;
    await pb
      .collection("role_menus")
      .create({ roleId: role.id, menuId }, { $autoCancel: false });
  }
}

const superRole = await pb
  .collection("roles")
  .getFirstListItem('roleKey = "superadmin"', { $autoCancel: false })
  .catch(() => null);
if (superRole) {
  await syncRoleMenus(
    superRole,
    new Set(alignedMenus.map((menu) => String(menu.id))),
  );
  // superAdmin 是唯一可见系统管理 / 运行监控的角色：必须关联全部菜单行。
  const superLinks = await pb.collection("role_menus").getFullList({
    filter: `roleId = "${superRole.id}"`,
    $autoCancel: false,
  });
  if (superLinks.length !== alignedMenus.length)
    throw new Error(
      `superAdmin 必须关联全部 ${alignedMenus.length} 条菜单，当前 ${superLinks.length} 条`,
    );
}

// ── M6-A 三角色矩阵（M6 规格 §6.3 / §6.4 / ADR 0006-D3）：customer-admin 沿用旧 roleKey
// 升级为「平台运营管理员」（保留角色 id 与存量授权），新增 report-reviewer / rule-configurator；
// 三角色均不含系统管理 / 运行监控（仅上面的 superadmin 关联全部菜单）。
const talentRoleStats = await syncTalentBusinessRoles(pb);
const systemAndMonitorPaths = new Set(SYSTEM_AND_MONITOR_MENU_PATHS);
for (const [roleKey, stats] of Object.entries(talentRoleStats)) {
  const roleLinks = await pb.collection("role_menus").getFullList({
    filter: `roleId = "${stats.roleId}"`,
    expand: "menuId",
    $autoCancel: false,
  });
  const roleMenus = roleLinks
    .map((link) => link.expand?.menuId)
    .filter(Boolean);
  const leakedSystemMenus = roleMenus.filter(
    (menu) =>
      SYSTEM_AND_MONITOR_GROUP_NAMES.includes(String(menu.menuName || "")) ||
      systemAndMonitorPaths.has(String(menu.path || "")),
  );
  if (leakedSystemMenus.length)
    throw new Error(
      `${roleKey} 不得关联系统管理 / 运行监控菜单：${leakedSystemMenus.map((menu) => menu.menuName).join("、")}`,
    );
  const activePages = roleMenus.filter(
    (menu) => menu.menuType === "C" && menu.status === "1",
  );
  if (activePages.length !== stats.pages)
    throw new Error(
      `${roleKey} 业务 C 菜单数量不符：期望 ${stats.pages}，实际 ${activePages.length}`,
    );
  if (roleLinks.length !== stats.menus)
    throw new Error(
      `${roleKey} 菜单授权数量不符：期望 ${stats.menus}，实际 ${roleLinks.length}`,
    );
}

// M6：机构角色已在上方清理块删除；这里断言不得复活（ADR 0006-D4）。
for (const roleKey of LEGACY_TALENT_ROLE_KEYS) {
  const role = await pb
    .collection("roles")
    .getFirstListItem(`roleKey = "${roleKey}"`, { $autoCancel: false })
    .catch(() => null);
  if (role)
    throw new Error(`机构角色 ${roleKey} 必须删除（M6 机构端退出），当前仍存在`);
}

// ── M6：旧集合是否仍存在（sync 不删除存量数据，只提示；集合删除由 cleanup-m6.mjs 在备份后执行）。
const existingCollectionNames = new Set(
  (await pb.collections.getFullList({ fields: "name", $autoCancel: false })).map(
    (collection) => String(collection.name),
  ),
);
const remainingLegacyCollections = LEGACY_TALENT_COLLECTION_NAMES.filter(
  (name) => existingCollectionNames.has(name),
);
if (remainingLegacyCollections.length)
  console.warn(
    `⚠ 仍存在 ${remainingLegacyCollections.length} 个 M6 旧集合：${remainingLegacyCollections.join("、")}；` +
      "请先 dry-run 并执行 `pnpm migration:m6`（需备份 + --confirm-m6）；本脚本不删除存量数据。",
  );

const menus = await pb
  .collection("menus")
  .getFullList({ sort: "orderNum", $autoCancel: false });
const talentMenus = menus
  .filter(
    (menu) =>
      menu.path?.startsWith("/admin/talent") ||
      ["天赋规则", "报告管理", "系统管理", "运行监控"].includes(
        menu.menuName,
      ),
  )
  .map((menu) => ({
    name: menu.menuName,
    path: menu.path || "",
    parentId: menu.parentId || "",
    orderNum: menu.orderNum,
  }));
console.log(
  JSON.stringify(
    {
      url,
      removedLevelStyle: fields.every((field) => field.name !== "style"),
      childBindingCollection: true,
      sharedGuardianPhoneSupported: true,
      m1RulePermissionCodes: M1_RULE_PERMISSION_CODES.length,
      m2MemberPermissionCodes: M2_MEMBER_PERMISSION_CODES.length,
      m3ReportPermissionCodes: M3_REPORT_PERMISSION_CODES.length,
      m3ReportPublishMenuRows: reportPublishMenuRows.length,
      m2Member: {
        collections: TALENT_MEMBER_COLLECTION_NAMES,
        indexes: TALENT_MEMBER_INDEX_DEFS.length,
      },
      m3Report: {
        collections: TALENT_REPORT_COLLECTION_NAMES,
        indexes: TALENT_REPORT_INDEX_DEFS.length,
      },
      m5Advice: {
        collections: TALENT_ADVICE_COLLECTION_NAMES,
        indexes: TALENT_ADVICE_INDEX_DEFS.length,
      },
      m8Pdf: {
        collections: TALENT_PDF_COLLECTION_NAMES,
        indexes: TALENT_PDF_INDEX_DEFS.length,
      },
      m4Direction: {
        collections: TALENT_DIRECTION_COLLECTION_NAMES,
        indexes: TALENT_DIRECTION_INDEX_DEFS.length,
        mergePermissionCode: "talent:direction:merge",
        mergeActionMenuRows: directionMergeActionMenus.length,
      },
      menuAlignment: {
        groups: MENU_ALIGNMENT_GROUPS,
        topLevelMenus: MENU_ALIGNMENT_PAGES.filter(
          ([, , parent]) => parent === null,
        ).map(([name, path]) => ({ name, path })),
        menus: MENU_ALIGNMENT_PAGES.map(([name, path, parent]) => ({
          name,
          path,
          parent: parent ?? null,
        })),
        businessMenuCount: BUSINESS_MENU_PATHS.length,
        systemAndMonitorOnlyForSuperAdmin: true,
        dashboardPermissionCode: TALENT_DASHBOARD_PERMISSION_CODE,
      },
      m6Roles: talentRoleStats,
      m6BusinessPermissionCodes: TALENT_BUSINESS_PERMISSION_CODES.length,
      m6Cleanup: {
        legacyPermissionCodes: LEGACY_TALENT_PERMISSION_CODES.length,
        legacyMenuPaths: LEGACY_TALENT_MENU_PATHS.length,
        removedLegacyMenus,
        removedLegacyRoles,
        legacyMenusInDatabase: remainingLegacyMenus.length,
        legacyPermissionCodesInMenus: 0,
        legacyCollectionsRemaining: remainingLegacyCollections.length,
        legacyCollections: remainingLegacyCollections,
      },
      m1RuleMenus: talentMenus.filter((menu) =>
        menu.path.startsWith("/admin/talent/rules"),
      ),
      talentMenus,
    },
    null,
    2,
  ),
);
