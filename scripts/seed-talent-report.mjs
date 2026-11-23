#!/usr/bin/env node
/**
 * @description M3 报告域本地演示种子：基于 M2 会员种子（1 名家长 + 2 名子女）幂等 upsert
 *   2 份报告 —— ① 待发布（外部 2 册、未开放）；② 已发布 + 有新增册（外部 4 册、开放 2 册）。
 *   同时 upsert 对应 `talent_gene_reports`（一人一份）。纯虚构数据，不写真实 PII：
 *   脱敏身份证 / 身份证哈希直接复用 M2 子女档案（本脚本不接触身份证明文）。
 *   方向快照只写「不计算命中」的空 directions 信封（本地演示口径，spec §3.6）；正式发布由
 *   `server/utils/talent-report-snapshot.ts` 调 M4 纯函数生成。
 *   仅限本机开发库：需显式 `TALENT_REPORT_SEED_CONFIRM=report`，拒绝 `NODE_ENV=production`；
 *   按唯一键（subjectType+subjectId）upsert，不清空其他天赋数据、不触碰旧报告行/旧集合。
 * @file scripts/seed-talent-report.mjs
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import PocketBase from "pocketbase";
import { loadDotEnv, PB_URL_DEFAULT } from "./_pb.mjs";

/** 显式确认门槛：避免误把演示数据写进真实开发库。 */
export const TALENT_REPORT_SEED_CONFIRM = "report";

/** 演示数据固定时间：保证重复执行不产生时间漂移（幂等）。 */
export const TALENT_REPORT_SEED_NOW = "2026-11-16T10:00:00.000Z";
const SEED_FILED_AT = "2026-11-01";
const SEED_ISSUER = "示例检测机构（本地演示）";

/** 固定六册映射（与 shared/types/talent-report.ts、server/utils/talent-report-snapshot.ts 一致）。 */
const VOLUME_DEFINITIONS = [
  { volumeId: "V1", bookCode: "A", name: "生长发育", sortOrder: 1 },
  { volumeId: "V2", bookCode: "B", name: "智商", sortOrder: 2 },
  { volumeId: "V3", bookCode: "C", name: "情商", sortOrder: 3 },
  { volumeId: "V4", bookCode: "D", name: "领导商", sortOrder: 4 },
  { volumeId: "V5", bookCode: "E", name: "艺术商", sortOrder: 5 },
  { volumeId: "V6", bookCode: "F", name: "体育运动商", sortOrder: 6 },
];
const SEED_LEVEL_NAMES = { LV1: "常态", LV2: "优良", LV3: "优秀", LV4: "卓越" };

/** 每个外部册生成 2 个演示要素；编码/分级符合 M1 约定（A-01…/LV1–LV4）。 */
function buildSeedSections(books) {
  const sections = [];
  for (const bookCode of books) {
    const definition = VOLUME_DEFINITIONS.find(
      (item) => item.bookCode === bookCode,
    );
    for (let index = 1; index <= 2; index += 1) {
      const factorCode = `${bookCode}-${String(index).padStart(2, "0")}`;
      const levelNumber = ((definition.sortOrder + index) % 4) + 1;
      sections.push({
        bookCode,
        chapter: `${definition.sortOrder}.${index} ${definition.name}演示章节`,
        factorCode,
        levelCode: `LV${levelNumber}`,
        score: 60 + definition.sortOrder * 5 + index,
        condition: "",
      });
    }
  }
  return sections;
}

/**
 * 纯虚构报告定义：待发布 + 已发布（有新增册）。
 * 子女名用于在 M2 种子里定位对象；找不到时回退到该家长名下第 1/2 名子女。
 */
export const TALENT_REPORT_SEED_REPORTS = [
  {
    key: "pending",
    childName: "演示子女二",
    reportNo: "R202611160001",
    books: ["A", "B"],
    status: "pending_publish",
    openVolumeIds: [],
  },
  {
    key: "published",
    childName: "演示子女一",
    reportNo: "R202611160002",
    books: ["A", "B", "C", "D"],
    status: "published",
    openVolumeIds: ["V1", "V2"],
  },
];

const escapeFilter = (value) =>
  String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

function calculateSeedAge(birthday, referenceIso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthday || ""));
  if (!match) return 0;
  const reference = new Date(referenceIso);
  let age = reference.getUTCFullYear() - Number(match[1]);
  const beforeBirthday =
    reference.getUTCMonth() + 1 < Number(match[2]) ||
    (reference.getUTCMonth() + 1 === Number(match[2]) &&
      reference.getUTCDate() < Number(match[3]));
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

function indexRules(levels, factors, notes) {
  const levelByCode = new Map();
  for (const level of levels) {
    if (!String(level.code || "")) continue;
    if (!levelByCode.has(level.code)) levelByCode.set(level.code, level);
  }
  const factorByName = new Map();
  for (const factor of factors) {
    if (!String(factor.code || "")) continue;
    const existing = factorByName.get(factor.code);
    if (existing && String(existing.name || "")) continue;
    factorByName.set(factor.code, factor);
  }
  const noteByKey = new Map();
  for (const note of notes) {
    if (String(note.status || "") === "0") continue;
    const key = `${String(note.factorCode || "")}-${String(note.levelCode || "")}`;
    if (key === "-" || noteByKey.has(key)) continue;
    noteByKey.set(key, String(note.note || ""));
  }
  return { levelByCode, factorByName, noteByKey };
}

/** 构建 factorSnapshot（与领域函数同结构；种子只做本地演示）。 */
export function buildTalentReportSeedFactorSnapshot({
  sections,
  levels = [],
  factors = [],
  notes = [],
}) {
  const { levelByCode, factorByName, noteByKey } = indexRules(
    levels,
    factors,
    notes,
  );
  const chapterFirstIndex = new Map();
  const sectionIndexByCode = new Map();
  const items = [];
  sections.forEach((section, index) => {
    const chapterKey = `${section.bookCode}|${section.chapter}`;
    if (!chapterFirstIndex.has(chapterKey))
      chapterFirstIndex.set(chapterKey, index);
    sectionIndexByCode.set(section.factorCode, index);
    const definition = VOLUME_DEFINITIONS.find(
      (item) => item.bookCode === section.bookCode,
    );
    const factorRule = factorByName.get(section.factorCode);
    const levelRule = levelByCode.get(section.levelCode);
    items.push({
      code: section.factorCode,
      name:
        String(section.factorName || "") ||
        String(factorRule?.name || "") ||
        section.factorCode,
      category: section.bookCode,
      categoryName:
        String(factorRule?.categoryName || "") || definition?.name || "",
      volumeId: definition?.volumeId || "",
      bookCode: section.bookCode,
      chapter: section.chapter,
      levelCode: section.levelCode,
      levelName:
        String(levelRule?.name || "") ||
        SEED_LEVEL_NAMES[section.levelCode] ||
        "",
      levelOrder:
        Number(levelRule?.sortOrder || 0) ||
        Number(String(section.levelCode).replace("LV", "")) ||
        0,
      score: Number(section.score || 0),
      note:
        noteByKey.get(`${section.factorCode}-${section.levelCode}`) || "",
      condition: String(section.condition || ""),
    });
  });
  items.sort((left, right) => {
    const leftDefinition = VOLUME_DEFINITIONS.find(
      (item) => item.bookCode === left.bookCode,
    );
    const rightDefinition = VOLUME_DEFINITIONS.find(
      (item) => item.bookCode === right.bookCode,
    );
    const bookDiff =
      (leftDefinition?.sortOrder || 0) - (rightDefinition?.sortOrder || 0);
    if (bookDiff !== 0) return bookDiff;
    const leftChapter =
      chapterFirstIndex.get(`${left.bookCode}|${left.chapter}`) ||
      sectionIndexByCode.get(left.code) ||
      0;
    const rightChapter =
      chapterFirstIndex.get(`${right.bookCode}|${right.chapter}`) ||
      sectionIndexByCode.get(right.code) ||
      0;
    if (leftChapter !== rightChapter) return leftChapter - rightChapter;
    return (
      (sectionIndexByCode.get(left.code) || 0) -
      (sectionIndexByCode.get(right.code) || 0)
    );
  });
  return items;
}

/** 构建 volumeSnapshot（固定 6 项）。 */
export function buildTalentReportSeedVolumeSnapshot({
  factorSnapshot,
  books,
  openVolumeIds,
}) {
  const bookSet = new Set(books);
  const openSet = new Set(openVolumeIds);
  return VOLUME_DEFINITIONS.map((definition) => {
    const items = factorSnapshot.filter(
      (item) => item.bookCode === definition.bookCode,
    );
    const chapters = [];
    const chapterIndex = new Map();
    for (const item of items) {
      let index = chapterIndex.get(item.chapter);
      if (index === undefined) {
        index = chapters.length;
        chapterIndex.set(item.chapter, index);
        chapters.push({ chapter: item.chapter, factors: [] });
      }
      chapters[index].factors.push({
        code: item.code,
        name: item.name,
        levelCode: item.levelCode,
        levelName: item.levelName,
        note: item.note,
      });
    }
    return {
      volumeId: definition.volumeId,
      bookCode: definition.bookCode,
      name: definition.name,
      sortOrder: definition.sortOrder,
      open: bookSet.has(definition.bookCode) && openSet.has(definition.volumeId),
      chapterCount: chapters.length,
      factorCount: items.length,
      chapters,
    };
  });
}

/** 构建 directionSnapshot 信封：本地演示不计算命中（directions 为空数组）。 */
export function buildTalentReportSeedDirectionSnapshot({
  levels = [],
  tiers = [],
  version = 1,
  at = TALENT_REPORT_SEED_NOW,
  operatorName = "本地演示种子",
}) {
  const levelOrders = {};
  for (const level of levels) {
    if (!String(level.code || "")) continue;
    levelOrders[level.code] = Number(level.sortOrder || 0);
  }
  if (Object.keys(levelOrders).length === 0) {
    for (const [index, code] of ["LV1", "LV2", "LV3", "LV4"].entries())
      levelOrders[code] = index + 1;
  }
  return {
    version,
    at,
    operatorId: "",
    operatorName,
    recommendLimit: 5,
    selectionLimit: 3,
    levelOrders,
    tiers: tiers.map((tier) => ({
      id: tier.id,
      code: tier.code,
      name: tier.name,
      teacher: tier.teacher || "",
      freq: tier.freq || "",
      headline: tier.headline || "",
      sortOrder: Number(tier.sortOrder || 0),
    })),
    directions: [],
  };
}

async function main() {
  loadDotEnv();
  if (process.env.NODE_ENV === "production")
    throw new Error("talent:report:seed 禁止在生产环境运行");
  if (process.env.TALENT_REPORT_SEED_CONFIRM !== TALENT_REPORT_SEED_CONFIRM)
    throw new Error(
      "请设置 TALENT_REPORT_SEED_CONFIRM=report，确认只向本机开发库写入 M3 报告演示数据；" +
        "建议使用临时 POCKETBASE_DATA_DIR，不要指向真实 pb_data/。",
    );
  const url = process.env.POCKETBASE_URL || PB_URL_DEFAULT;
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url))
    throw new Error("M3 报告种子只允许写入本机 PocketBase");
  const email = process.env.POCKETBASE_ADMIN_EMAIL || "";
  const password =
    process.env.POCKETBASE_ADMIN_PASSWORD ||
    process.env.POCKETBASE_ADMIN_PASS ||
    "";
  if (!email || !password)
    throw new Error("缺少 POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD");

  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(email, password);
  const collections = new Set(
    (await pb.collections.getFullList()).map((collection) => collection.name),
  );
  for (const name of [
    "talent_parents",
    "talent_children",
    "talent_gene_reports",
    "talent_reports",
  ])
    if (!collections.has(name))
      throw new Error(
        `缺少集合 ${name}；请先运行 pnpm env:setup（新库）或 pnpm talent:sync（存量库）`,
      );

  const first = (collection, filter) =>
    pb
      .collection(collection)
      .getFirstListItem(filter, { $autoCancel: false })
      .catch(() => null);

  const parent = await first(
    "talent_parents",
    `parentNo = "P202611160001"`,
  );
  if (!parent)
    throw new Error(
      "找不到 M2 演示家长（P202611160001）；请先运行 pnpm talent:member:seed",
    );
  const children = await pb.collection("talent_children").getFullList({
    filter: `parentId = "${escapeFilter(parent.id)}"`,
    sort: "created",
    $autoCancel: false,
  });
  if (children.length === 0)
    throw new Error(
      "该家长名下没有子女档案；请先运行 pnpm talent:member:seed",
    );
  const childForSeed = (seed) =>
    children.find((child) => String(child.name) === seed.childName) ||
    children[Math.min(TALENT_REPORT_SEED_REPORTS.indexOf(seed), children.length - 1)];

  // M1 规则只读：分级 / 要素名 / 固定注解 / 档位（缺失时回退演示文案，不建规则数据）。
  const [levels, factors, notes, tiers] = await Promise.all([
    pb
      .collection("talent_levels")
      .getFullList({ filter: 'code != ""', sort: "sortOrder", $autoCancel: false })
      .catch(() => []),
    pb
      .collection("talent_factors")
      .getFullList({ sort: "sortOrder", $autoCancel: false })
      .catch(() => []),
    pb
      .collection("talent_factor_notes")
      .getFullList({ filter: 'status = "1"', $autoCancel: false })
      .catch(() => []),
    pb
      .collection("talent_tiers")
      .getFullList({ filter: 'status = "1"', sort: "sortOrder", $autoCancel: false })
      .catch(() => []),
  ]);

  const results = [];
  for (const seed of TALENT_REPORT_SEED_REPORTS) {
    const child = childForSeed(seed);
    if (!child)
      throw new Error(`找不到演示子女「${seed.childName}」，无法生成报告种子`);
    const sections = buildSeedSections(seed.books);
    const factorSnapshot = buildTalentReportSeedFactorSnapshot({
      sections,
      levels,
      factors,
      notes,
    });
    const volumeSnapshot = buildTalentReportSeedVolumeSnapshot({
      factorSnapshot,
      books: seed.books,
      openVolumeIds: seed.openVolumeIds,
    });
    const published = seed.status === "published";
    const snapshotVersion = published ? 1 : 0;
    const directionSnapshot = published
      ? buildTalentReportSeedDirectionSnapshot({
          levels,
          tiers,
          version: snapshotVersion,
        })
      : null;
    const versions = published
      ? [
          {
            version: 1,
            type: "publish",
            summary: `发布，开放 ${seed.openVolumeIds.length} 册（${seed.openVolumeIds
              .map(
                (volumeId) =>
                  VOLUME_DEFINITIONS.find((item) => item.volumeId === volumeId)
                    ?.bookCode,
              )
              .filter(Boolean)
              .join("、")}）`,
            books: seed.openVolumeIds
              .map(
                (volumeId) =>
                  VOLUME_DEFINITIONS.find((item) => item.volumeId === volumeId)
                    ?.bookCode,
              )
              .filter(Boolean),
            operatorId: "",
            operatorName: "本地演示种子",
            at: TALENT_REPORT_SEED_NOW,
          },
        ]
      : [];

    const maskedIdNo = String(child.maskedIdNo || "");
    const idNoHash = String(child.idNoHash || "");
    if (!maskedIdNo || !idNoHash)
      throw new Error(
        `演示子女「${child.name}」缺少脱敏身份证 / 身份证哈希，请重新运行 pnpm talent:member:seed`,
      );

    const genePayload = {
      subjectType: "child",
      subjectId: child.id,
      parentId: parent.id,
      reportNo: seed.reportNo,
      name: String(child.name || ""),
      gender: String(child.gender || "female"),
      birthday: String(child.birthday || ""),
      age: calculateSeedAge(child.birthday, TALENT_REPORT_SEED_NOW),
      maskedIdNo,
      idNoHash,
      issuer: SEED_ISSUER,
      filedAt: SEED_FILED_AT,
      syncedAt: TALENT_REPORT_SEED_NOW,
      source: "mock",
      version: "v1",
      books: seed.books.join(""),
      sections,
      sectionCount: sections.length,
      status: "synced",
    };
    const existingGene = await first(
      "talent_gene_reports",
      `subjectType = "child" && subjectId = "${escapeFilter(child.id)}"`,
    );
    const geneReport = existingGene
      ? await pb
          .collection("talent_gene_reports")
          .update(existingGene.id, genePayload, { $autoCancel: false })
      : await pb
          .collection("talent_gene_reports")
          .create(genePayload, { $autoCancel: false });

    const reportPayload = {
      reportNo: seed.reportNo,
      reportType: "gene_report",
      title: `${String(child.name || "对象")}·基因报告`,
      // 旧字段 customerId 只写空串；新代码不读不写（ADR 0003-D6）。
      customerId: "",
      status: seed.status,
      subjectType: "child",
      subjectId: child.id,
      parentId: parent.id,
      geneReportId: geneReport.id,
      factorCount: published ? factorSnapshot.length : 0,
      snapshotVersion,
      snapshotAt: published ? TALENT_REPORT_SEED_NOW : "",
      queriedAt: TALENT_REPORT_SEED_NOW,
      openVolumeIds: seed.openVolumeIds,
      factorSnapshot: published ? factorSnapshot : [],
      volumeSnapshot: published ? volumeSnapshot : [],
      directionSnapshot,
      selections: [],
      versions,
      totalItems: published ? factorSnapshot.length : 0,
      ...(published
        ? { publishedAt: TALENT_REPORT_SEED_NOW, withdrawnAt: "" }
        : { publishedAt: "", withdrawnAt: "" }),
      restoredAt: "",
    };
    const existingReport = await first(
      "talent_reports",
      `subjectType = "child" && subjectId = "${escapeFilter(child.id)}"`,
    );
    const report = existingReport
      ? await pb
          .collection("talent_reports")
          .update(existingReport.id, reportPayload, { $autoCancel: false })
      : await pb
          .collection("talent_reports")
          .create(reportPayload, { $autoCancel: false });

    results.push({
      key: seed.key,
      childName: child.name,
      geneReportId: geneReport.id,
      reportId: report.id,
      reportNo: report.reportNo,
      status: report.status,
      books: geneReport.books,
      openVolumeIds: report.openVolumeIds,
      newBooks:
        seed.books
          .filter(
            (bookCode) =>
              !seed.openVolumeIds.some(
                (volumeId) =>
                  VOLUME_DEFINITIONS.find((item) => item.volumeId === volumeId)
                    ?.bookCode === bookCode,
              ),
          )
          .join("") || "",
      factorCount: Number(report.factorCount || 0),
      snapshotVersion: Number(report.snapshotVersion || 0),
      created: !existingReport,
    });
  }

  // ── 校验：一人一份、幂等、无明文（只校验本种子对象的行，不打扰其他演示数据） ──
  const failures = [];
  const seededChildIds = new Set(
    TALENT_REPORT_SEED_REPORTS.map((seed) => childForSeed(seed)?.id).filter(Boolean),
  );
  const allGeneRows = await pb.collection("talent_gene_reports").getFullList({
    filter: 'subjectType = "child"',
    $autoCancel: false,
  });
  const allReportRows = await pb.collection("talent_reports").getFullList({
    filter: 'subjectType = "child"',
    $autoCancel: false,
  });
  const geneRows = allGeneRows.filter((row) =>
    seededChildIds.has(String(row.subjectId || "")),
  );
  const reportRows = allReportRows.filter((row) =>
    seededChildIds.has(String(row.subjectId || "")),
  );
  if (geneRows.length !== TALENT_REPORT_SEED_REPORTS.length)
    failures.push(
      `本种子基因报告行数期望 ${TALENT_REPORT_SEED_REPORTS.length}，实际 ${geneRows.length}`,
    );
  if (reportRows.length !== TALENT_REPORT_SEED_REPORTS.length)
    failures.push(
      `本种子报告行数期望 ${TALENT_REPORT_SEED_REPORTS.length}，实际 ${reportRows.length}`,
    );

  const subjectKeys = new Set();
  for (const row of geneRows) {
    const key = `${row.subjectType}:${row.subjectId}`;
    if (subjectKeys.has(key)) failures.push(`基因报告对象重复：${key}`);
    subjectKeys.add(key);
    if (!String(row.maskedIdNo || ""))
      failures.push(`基因报告 ${row.reportNo} 缺少 maskedIdNo`);
    if (!String(row.idNoHash || ""))
      failures.push(`基因报告 ${row.reportNo} 缺少 idNoHash`);
  }
  const text = JSON.stringify({ geneRows, reportRows });
  if (/\d{17}[\dX]/.test(text)) failures.push("种子数据包含身份证号明文");
  if (/1[3-9]\d{9}/.test(text)) failures.push("种子数据包含手机号明文");
  const publishedRow = reportRows.find((row) => row.status === "published");
  if (!publishedRow) failures.push("缺少已发布演示报告");
  else {
    if (!Array.isArray(publishedRow.factorSnapshot) || publishedRow.factorSnapshot.length === 0)
      failures.push("已发布演示报告缺少 factorSnapshot");
    if (!Array.isArray(publishedRow.volumeSnapshot) || publishedRow.volumeSnapshot.length !== 6)
      failures.push("已发布演示报告 volumeSnapshot 不是固定 6 项");
    if (!publishedRow.directionSnapshot)
      failures.push("已发布演示报告缺少 directionSnapshot 信封");
  }
  const pendingRow = reportRows.find((row) => row.status === "pending_publish");
  if (!pendingRow) failures.push("缺少待发布演示报告");
  else if (Array.isArray(pendingRow.factorSnapshot) && pendingRow.factorSnapshot.length)
    failures.push("待发布演示报告不应有 factorSnapshot");

  if (failures.length) {
    console.error(`✗ M3 报告种子校验失败：\n- ${failures.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        url,
        confirm: TALENT_REPORT_SEED_CONFIRM,
        seedAt: TALENT_REPORT_SEED_NOW,
        reports: results,
        counts: {
          geneReports: geneRows.length,
          reports: reportRows.length,
          created: results.filter((item) => item.created).length,
          updated: results.filter((item) => !item.created).length,
          pending: reportRows.filter((row) => row.status === "pending_publish")
            .length,
          published: reportRows.filter((row) => row.status === "published")
            .length,
        },
        demoNote:
          "本地演示方向快照 directions 为空数组（不计算命中）；正式发布由 M3 领域函数调 M4 纯函数生成。",
        sensitive: { plaintextStored: false },
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(
      `✗ M3 报告种子失败：${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}