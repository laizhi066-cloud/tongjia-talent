#!/usr/bin/env node
/**
 * @description M5 培育建议域本地演示种子：基于 M3 种子基因报告 / 报告幂等 upsert 2 个建议版本
 *   （1 个当前生效 + 1 个已归档，跨 4 个月周期）。纯虚构数据、不接触身份证明文：
 *   `maskedIdNo` / `idNoHash` 直接复用 M3 基因报告快照（本脚本不读写 M2 密文）。
 *   前置：先跑 `pnpm talent:member:seed` 与 `pnpm talent:report:seed`；缺基因报告时跳过该人并 warn，
 *   **不反向创建 M3 集合**、不清空其它天赋数据、不触碰旧 `talent_cultivation_contents` 等旧集合。
 *   仅限本机开发库：需显式 `TALENT_ADVICE_SEED_CONFIRM=YES`，拒绝 `NODE_ENV=production`；
 *   按 `versionNo` / `adviceNo` upsert，重复执行行数不变、不切版（spec §3.7）。
 * @file scripts/seed-talent-advice.mjs
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import PocketBase from "pocketbase";
import { loadDotEnv, PB_URL_DEFAULT } from "./_pb.mjs";

/** 显式确认门槛：避免误把演示数据写进真实开发库。 */
export const TALENT_ADVICE_SEED_CONFIRM = "YES";

/** 演示数据固定时间：保证重复执行不产生时间漂移（幂等）。 */
export const TALENT_ADVICE_SEED_NOW = "2026-11-17T10:00:00.000Z";

/** 周期月数（与 shared/types/talent-advice.ts 的 TALENT_ADVICE_CYCLE_MONTHS 一致）。 */
const CYCLE_MONTHS = 4;

/** 固定六册映射（与 shared/types/talent-report.ts 一致；只用于演示文案）。 */
const BOOK_DEFINITIONS = [
  { bookCode: "A", name: "生长发育", sortOrder: 1 },
  { bookCode: "B", name: "智商", sortOrder: 2 },
  { bookCode: "C", name: "情商", sortOrder: 3 },
  { bookCode: "D", name: "领导商", sortOrder: 4 },
  { bookCode: "E", name: "艺术商", sortOrder: 5 },
  { bookCode: "F", name: "体育运动商", sortOrder: 6 },
];
const FACTORS = ["运动协调", "专注力", "语言表达", "空间想象", "艺术感知", "体能协调"];
const ENTROPIES = ["优秀", "常态", "优良", "卓越"];

/** 两个演示版本：当前生效 + 已归档（跨一个 4 个月周期）。 */
export const TALENT_ADVICE_SEED_VERSIONS = [
  {
    key: "previous",
    versionNo: "V2026.07",
    status: "archived",
    effectiveAt: "2026-07-12",
    syncedAt: "2026-07-12T09:20:00.000Z",
  },
  {
    key: "current",
    versionNo: "V2026.11",
    status: "active",
    effectiveAt: "2026-11-12",
    syncedAt: "2026-11-12T09:20:00.000Z",
  },
];

const escapeFilter = (value) =>
  String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

function pad2(value) {
  return String(value).padStart(2, "0");
}

function isValidDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || ""));
  if (!match) return false;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  );
}

/** 精确周岁（与 server/utils/talent-matching.ts 的 calculateTalentAge 同口径）。 */
function calculateSeedAge(birthday, referenceDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthday || ""));
  if (!match || !isValidDate(referenceDate)) return undefined;
  const birth = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  const reference = new Date(`${referenceDate}T00:00:00.000Z`);
  if (birth > reference) return undefined;
  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    reference.getUTCMonth() < birth.getUTCMonth() ||
    (reference.getUTCMonth() === birth.getUTCMonth() &&
      reference.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

function addMonths(dateText, months) {
  const [year, month, day] = String(dateText).split("-").map(Number);
  const targetIndex = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return `${String(targetYear).padStart(4, "0")}-${pad2(targetMonth + 1)}-${pad2(
    Math.min(day, lastDay),
  )}`;
}

function resolveCycle(effectiveAt) {
  return {
    cycle: `${effectiveAt.slice(0, 7)} ~ ${addMonths(effectiveAt, CYCLE_MONTHS - 1).slice(0, 7)}`,
    nextUpdateAt: addMonths(effectiveAt, CYCLE_MONTHS),
  };
}

function buildAdviceNo(reportNo, effectiveAt) {
  const cleaned = String(reportNo || "")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `AD-${cleaned || "REPORT"}-${effectiveAt.slice(0, 7).replace("-", "")}`;
}

function buildMatchKey(name, age) {
  return `${String(name || "").trim()}｜${age} 岁`;
}

/** 由 sections 计算派生缓存（与 server/utils/talent-advice.ts 同算法）。 */
/** 比较两个计数对象（忽略 JSON 键顺序）。 */
function sameCounts(left, right) {
  const normalize = (value) =>
    Object.fromEntries(
      Object.entries(value && typeof value === "object" ? value : {}).sort(
        ([leftKey], [rightKey]) => leftKey.localeCompare(rightKey),
      ),
    );
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function buildDerived(sections) {
  const entropyCounts = {};
  const books = new Set();
  for (const section of sections) {
    books.add(section.book);
    entropyCounts[section.entropy] = (entropyCounts[section.entropy] || 0) + 1;
  }
  return {
    sectionCount: sections.length,
    bookCount: books.size,
    entropyCounts,
    firstFactorName: sections[0]?.factor || "",
  };
}

/** 按基因报告已出分册生成演示四段文案（每册 2 项；当前版第一条要素带 variant=2）。 */
function buildSections(books, options = {}) {
  const sections = [];
  for (const book of books) {
    const definition = BOOK_DEFINITIONS.find((item) => item.bookCode === book);
    if (!definition) continue;
    for (let index = 0; index < 2; index += 1) {
      const factor = FACTORS[(definition.sortOrder + index) % FACTORS.length];
      const entropy = ENTROPIES[(definition.sortOrder + index) % ENTROPIES.length];
      const base = {
        book,
        bookName: definition.name,
        chapter: `${definition.sortOrder}.${index + 1} ${definition.name}演示章节`,
        factor,
        entropy,
        content: `该项潜质发展${entropy === "常态" ? "处于常态水平" : "表现较为突出"}，基础条件与同龄人相当。`,
        example: "多数情境下能稳定完成对应任务，遇到更复杂的安排时经过引导可以较快适应。",
        direction: "在现有基础上逐步增加任务复杂度，用阶段性目标巩固当前表现。",
        suggestion: "保持规律接触与练习节奏，定期回顾表现变化，再决定是否提高投入强度。",
        variant: 1,
      };
      sections.push(base);
      if (options.withVariants && index === 0) {
        sections.push({
          ...base,
          content: `该项潜质在同类任务中呈现较稳定的优势，适合循序引导。`,
          variant: 2,
        });
      }
    }
  }
  return sections;
}

async function firstOrNull(pb, collection, filter) {
  return pb
    .collection(collection)
    .getFirstListItem(filter, { $autoCancel: false })
    .catch(() => null);
}

async function main() {
  loadDotEnv();
  if (process.env.NODE_ENV === "production")
    throw new Error("talent:advice:seed 禁止在生产环境运行");
  if (process.env.TALENT_ADVICE_SEED_CONFIRM !== TALENT_ADVICE_SEED_CONFIRM)
    throw new Error(
      `请设置 TALENT_ADVICE_SEED_CONFIRM=${TALENT_ADVICE_SEED_CONFIRM}，确认只向本机开发库写入 M5 培育建议演示数据；` +
        "建议使用临时 POCKETBASE_DATA_DIR，不要指向真实 pb_data/。",
    );
  const url = process.env.POCKETBASE_URL || PB_URL_DEFAULT;
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url))
    throw new Error("M5 培育建议种子只允许写入本机 PocketBase");
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
    "talent_advice_versions",
    "talent_advice_docs",
  ])
    if (!collections.has(name))
      throw new Error(
        `缺少集合 ${name}；请先运行 pnpm env:setup（新库）或 pnpm talent:sync（存量库）`,
      );

  const geneReports = await pb.collection("talent_gene_reports").getFullList({
    filter: 'status = "synced"',
    sort: "created",
    $autoCancel: false,
  });
  if (geneReports.length === 0)
    throw new Error(
      "找不到 M3 基因报告；请先运行 pnpm talent:member:seed 与 pnpm talent:report:seed",
    );

  const seedVersionNos = new Set(
    TALENT_ADVICE_SEED_VERSIONS.map((version) => version.versionNo),
  );
  const existingVersions = await pb
    .collection("talent_advice_versions")
    .getFullList({ $autoCancel: false });
  const foreignActive = existingVersions.find(
    (version) =>
      String(version.status) === "active" &&
      !seedVersionNos.has(String(version.versionNo)),
  );
  if (foreignActive)
    throw new Error(
      `检测到非种子生效版本 ${foreignActive.versionNo}，拒绝切换版本；请先人工确认当前生效版本。`,
    );

  const versionRecords = new Map();
  const docResults = [];
  const skipped = [];

  for (const seedVersion of TALENT_ADVICE_SEED_VERSIONS) {
    const cycle = resolveCycle(seedVersion.effectiveAt);
    const notes = geneReports.length;
    const versionPayload = {
      versionNo: seedVersion.versionNo,
      status: seedVersion.status,
      cycle: cycle.cycle,
      effectiveAt: seedVersion.effectiveAt,
      nextUpdateAt: cycle.nextUpdateAt,
      syncedAt: seedVersion.syncedAt,
      source: "mock",
      note: `外部系统按姓名 + 具体年龄（周岁）重新匹配输出，覆盖 ${notes} 份基因报告。`,
      operatorId: "",
      operatorName: "本地演示种子",
    };
    const existingVersion = await firstOrNull(
      pb,
      "talent_advice_versions",
      `versionNo = "${escapeFilter(seedVersion.versionNo)}"`,
    );
    const versionRecord = existingVersion
      ? await pb
          .collection("talent_advice_versions")
          .update(existingVersion.id, versionPayload, { $autoCancel: false })
      : await pb
          .collection("talent_advice_versions")
          .create(versionPayload, { $autoCancel: false });
    versionRecords.set(seedVersion.key, versionRecord);

    for (const geneReport of geneReports) {
      const report = await firstOrNull(
        pb,
        "talent_reports",
        `geneReportId = "${escapeFilter(geneReport.id)}"`,
      );
      if (!report) {
        skipped.push(String(geneReport.reportNo || geneReport.id));
        continue;
      }
      const age = calculateSeedAge(geneReport.birthday, seedVersion.effectiveAt);
      if (age === undefined) {
        skipped.push(String(geneReport.reportNo || geneReport.id));
        continue;
      }
      const books = [...new Set(String(geneReport.books || "").toUpperCase().replace(/[^A-F]/g, ""))]
        .sort()
        .join("");
      if (!books) {
        skipped.push(String(geneReport.reportNo || geneReport.id));
        continue;
      }
      const isCurrent = seedVersion.key === "current";
      const sections = buildSections([...books], {
        withVariants: isCurrent && geneReports.indexOf(geneReport) === 0,
      });
      const derived = buildDerived(sections);
      const adviceNo = buildAdviceNo(geneReport.reportNo, seedVersion.effectiveAt);
      // 当前生效版：把「报告仍待发布」的那份演示为已撤回，后台可看到撤回副行；
      // 报告已发布的那份保持已发布，C 端可见（报告状态是可见性唯一真源）。
      const withdrawn =
        isCurrent && String(report.status) !== "published";
      const payload = {
        adviceNo,
        geneReportId: geneReport.id,
        reportId: report.id,
        reportNo: String(geneReport.reportNo || ""),
        subjectType: String(geneReport.subjectType || "child"),
        subjectId: String(geneReport.subjectId || ""),
        parentId: String(geneReport.parentId || report.parentId || ""),
        name: String(geneReport.name || ""),
        maskedIdNo: String(geneReport.maskedIdNo || ""),
        idNoHash: String(geneReport.idNoHash || ""),
        gender: String(geneReport.gender || "female"),
        birthday: String(geneReport.birthday || ""),
        age,
        matchKey: buildMatchKey(geneReport.name, age),
        versionId: versionRecord.id,
        versionName: seedVersion.versionNo,
        publishStatus: withdrawn ? "withdrawn" : "published",
        publishedAt: seedVersion.syncedAt,
        withdrawnAt: withdrawn ? "2026-11-15T10:00:00.000Z" : "",
        syncedAt: seedVersion.syncedAt,
        source: "mock",
        books,
        sections,
        sectionCount: derived.sectionCount,
        bookCount: derived.bookCount,
        entropyCounts: derived.entropyCounts,
        firstFactorName: derived.firstFactorName,
      };
      const existingDoc = await firstOrNull(
        pb,
        "talent_advice_docs",
        `adviceNo = "${escapeFilter(adviceNo)}"`,
      );
      const docRecord = existingDoc
        ? await pb
            .collection("talent_advice_docs")
            .update(existingDoc.id, payload, { $autoCancel: false })
        : await pb
            .collection("talent_advice_docs")
            .create(payload, { $autoCancel: false });
      docResults.push({
        versionNo: seedVersion.versionNo,
        adviceNo: docRecord.adviceNo,
        name: docRecord.name,
        reportsNo: docRecord.reportNo,
        reportStatus: String(report.status),
        publishStatus: docRecord.publishStatus,
        books: docRecord.books,
        sectionCount: Number(docRecord.sectionCount || 0),
        bookCount: Number(docRecord.bookCount || 0),
        entropyCounts: docRecord.entropyCounts || {},
        age: Number(docRecord.age || 0),
        matchKey: docRecord.matchKey,
        created: !existingDoc,
      });
    }
  }

  // ── 校验：幂等、单一生效、派生缓存可重算、无明文 PII ─────────────────────
  const failures = [];
  const allVersions = await pb
    .collection("talent_advice_versions")
    .getFullList({ $autoCancel: false });
  const seedVersions = allVersions.filter((version) =>
    seedVersionNos.has(String(version.versionNo)),
  );
  if (seedVersions.length !== TALENT_ADVICE_SEED_VERSIONS.length)
    failures.push(
      `种子版本行数期望 ${TALENT_ADVICE_SEED_VERSIONS.length}，实际 ${seedVersions.length}`,
    );
  const activeVersions = allVersions.filter(
    (version) => String(version.status) === "active",
  );
  if (activeVersions.length !== 1)
    failures.push(`生效版本必须唯一，实际 ${activeVersions.length} 个`);
  else if (String(activeVersions[0].versionNo) !== "V2026.11")
    failures.push(`生效版本应为 V2026.11，实际 ${activeVersions[0].versionNo}`);

  const seedVersionIds = new Set(seedVersions.map((version) => version.id));
  const allDocs = await pb
    .collection("talent_advice_docs")
    .getFullList({ $autoCancel: false });
  const seedDocs = allDocs.filter((doc) => seedVersionIds.has(String(doc.versionId || "")));
  const expectedDocs = TALENT_ADVICE_SEED_VERSIONS.length * geneReports.length;
  if (seedDocs.length !== expectedDocs)
    failures.push(`种子建议行数期望 ${expectedDocs}，实际 ${seedDocs.length}`);

  for (const doc of seedDocs) {
    const sections = Array.isArray(doc.sections) ? doc.sections : [];
    const derived = buildDerived(sections);
    if (derived.sectionCount !== Number(doc.sectionCount || 0))
      failures.push(`派生 sectionCount 不一致：${doc.adviceNo}`);
    if (derived.bookCount !== Number(doc.bookCount || 0))
      failures.push(`派生 bookCount 不一致：${doc.adviceNo}`);
    if (derived.firstFactorName !== String(doc.firstFactorName || ""))
      failures.push(`派生 firstFactorName 不一致：${doc.adviceNo}`);
    if (!sameCounts(derived.entropyCounts, doc.entropyCounts))
      failures.push(`派生 entropyCounts 不一致：${doc.adviceNo}`);
    if (!String(doc.maskedIdNo || "")) failures.push(`缺少 maskedIdNo：${doc.adviceNo}`);
    if (String(doc.publishStatus) === "published" && !String(doc.publishedAt || ""))
      failures.push(`已发布建议缺少 publishedAt：${doc.adviceNo}`);
  }
  const activeDocs = seedDocs.filter(
    (doc) => String(doc.versionId) === String(activeVersions[0]?.id || ""),
  );
  if (activeDocs.filter((doc) => String(doc.publishStatus) === "withdrawn").length !== 1)
    failures.push("当前生效版应恰有 1 份已撤回建议（覆盖 15 列撤回副行）");
  if (activeDocs.filter((doc) => String(doc.publishStatus) === "published").length < 1)
    failures.push("当前生效版应至少 1 份已发布建议（C 端可见）");

  const text = JSON.stringify({ seedVersions, seedDocs });
  if (/(?<!\d)\d{17}[\dX](?!\d)/.test(text))
    failures.push("种子数据包含身份证号明文");
  if (/(?<!\d)1[3-9]\d{9}(?!\d)/.test(text))
    failures.push("种子数据包含手机号明文");

  if (failures.length) {
    console.error(`✗ M5 培育建议种子校验失败：\n- ${failures.join("\n- ")}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        url,
        confirm: TALENT_ADVICE_SEED_CONFIRM,
        seedAt: TALENT_ADVICE_SEED_NOW,
        versions: seedVersions.map((version) => ({
          versionNo: version.versionNo,
          status: version.status,
          cycle: version.cycle,
          effectiveAt: version.effectiveAt,
          nextUpdateAt: version.nextUpdateAt,
          docs: seedDocs.filter(
            (doc) => String(doc.versionId) === String(version.id),
          ).length,
        })),
        docs: docResults,
        counts: {
          versions: seedVersions.length,
          activeVersions: activeVersions.length,
          docs: seedDocs.length,
          created: docResults.filter((item) => item.created).length,
          updated: docResults.filter((item) => !item.created).length,
          withdrawn: seedDocs.filter(
            (doc) => String(doc.publishStatus) === "withdrawn",
          ).length,
          skipped: skipped.length,
        },
        scenarios: {
          versionHistory: "2 个版本（1 生效 + 1 归档），版本历史弹层可回溯",
          withdrawnDoc: "当前生效版 1 份已撤回（同步时间副行显示撤回时间）",
          reportPending: "1 份对应报告待发布：后台已发布、C 端派生不可见",
          reportPublished: "1 份对应报告已发布：C 端派生可见",
          ageFrozen: "年龄按各版本 effectiveAt 精确周岁冻结，matchKey = 姓名｜N 岁",
          multiBook: `分册覆盖 ${[...new Set(seedDocs.map((doc) => doc.books))].join(" / ")}`,
          variants: "当前生效版首份建议含 variant=2（C 端只取最小变体）",
          singleActive: "talent_advice_versions.status=active 部分唯一索引保证单一生效",
        },
        demoNote:
          "纯虚构数据；仅 upsert 种子版本/建议，不清空其它天赋数据、不触碰旧 talent_cultivation_contents。",
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
      `✗ M5 培育建议种子失败：${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}