#!/usr/bin/env node
/**
 * @description M1 规则域种子：按唯一键幂等 upsert 4 分级、4 档位、1 个分库 × 158 要素、
 *   632 固定注解与 6 个培养方向。只写规则域集合，不清空其他天赋数据；重复执行不产生重复行。
 *   默认写入「男 0 岁」库，数据来源见 docs/specs/M1-rules/spec.md §3.9。
 * @file scripts/seed-talent-rule.mjs
 */
import { isDeepStrictEqual } from "node:util";
import PocketBase from "pocketbase";
import { loadDotEnv, PB_URL_DEFAULT } from "./_pb.mjs";
import { buildTalentRuleSeedData } from "./talent-rule-seed-data.mjs";

loadDotEnv();

if (process.env.NODE_ENV === "production")
  throw new Error("talent:rule:seed 禁止在生产环境运行");
if (process.env.TALENT_RULE_SEED_CONFIRM !== "rule")
  throw new Error(
    "请设置 TALENT_RULE_SEED_CONFIRM=rule，确认只向本机开发库写入 M1 规则域种子数据；" +
      "建议先用临时 POCKETBASE_DATA_DIR 启动 PocketBase，不要指向真实 pb_data/。",
  );

const url = process.env.POCKETBASE_URL || PB_URL_DEFAULT;
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url))
  throw new Error("M1 规则域种子只允许写入本机 PocketBase");
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

const escapeFilter = (value) => String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

async function findByFilter(collection, filter) {
  return pb
    .collection(collection)
    .getFirstListItem(filter, { $autoCancel: false })
    .catch(() => null);
}

async function upsertByFilter(collection, filter, data) {
  const existing = await findByFilter(collection, filter);
  if (!existing) return pb.collection(collection).create(data, { $autoCancel: false });
  return pb.collection(collection).update(existing.id, data, { $autoCancel: false });
}

const dataset = await buildTalentRuleSeedData({ gender: "male", age: 0 });

// ── 分级：只处理新行（code != ""）；旧行不动，新行镜像旧字段以兼容旧唯一索引。 ──────────
const seededLevels = new Map();
for (const level of dataset.levels) {
  const record = await upsertByFilter(
    "talent_levels",
    `code = "${escapeFilter(level.code)}"`,
    {
      code: level.code,
      name: level.name,
      sortOrder: level.sortOrder,
      range: level.range,
      tone: level.tone,
      status: level.status,
    },
  );
  seededLevels.set(level.code, record);
}

// ── 档位：固定 4 档；先写非默认档，再写默认档，避免部分唯一索引冲突。 ────────────────────
const seededTiers = new Map();
const orderedTiers = [
  ...dataset.tiers.filter((tier) => !tier.isDefault),
  ...dataset.tiers.filter((tier) => tier.isDefault),
];
for (const tier of orderedTiers) {
  const record = await upsertByFilter(
    "talent_tiers",
    `code = "${escapeFilter(tier.code)}"`,
    {
      code: tier.code,
      name: tier.name,
      sortOrder: tier.sortOrder,
      teacher: tier.teacher,
      freq: tier.freq,
      headline: tier.headline,
      description: tier.description,
      preset: tier.preset,
      isDefault: tier.isDefault,
      status: tier.status,
    },
  );
  seededTiers.set(tier.code, record);
}

// ── 分库 + 要素：按 gender + age、libraryId + code 幂等 upsert，不清空要素。 ────────────
const library = await upsertByFilter(
  "talent_factor_libraries",
  `gender = "${escapeFilter(dataset.library.gender)}" && age = ${Number(dataset.library.age)}`,
  { ...dataset.library, syncedAt: new Date().toISOString() },
);
const existingFactors = await pb.collection("talent_factors").getFullList({
  filter: `libraryId = "${library.id}"`,
  $autoCancel: false,
});
const existingFactorByCode = new Map(
  existingFactors.map((factor) => [String(factor.code), factor]),
);
let factorCreated = 0;
let factorUpdated = 0;
for (const factor of dataset.factors) {
  const payload = {
    libraryId: library.id,
    code: factor.code,
    name: factor.name,
    category: factor.category,
    categoryName: factor.categoryName,
    sortOrder: factor.sortOrder,
    slots: factor.slots,
    slotTotal: factor.slotTotal,
    filledSlotCount: factor.filledSlotCount,
    partialSlotCount: factor.partialSlotCount,
  };
  const existing = existingFactorByCode.get(factor.code);
  if (!existing) {
    await pb.collection("talent_factors").create(payload, { $autoCancel: false });
    factorCreated += 1;
    continue;
  }
  const changed = Object.entries(payload).some(
    ([key, value]) => !isDeepStrictEqual(existing[key], value),
  );
  if (changed) {
    await pb.collection("talent_factors").update(existing.id, payload, {
      $autoCancel: false,
    });
    factorUpdated += 1;
  }
}

// ── 固定注解：632 = 158 × 4；按 code 幂等 upsert，正文取要素该分级第 1 变体的分级内容。 ──
const existingNotes = await pb.collection("talent_factor_notes").getFullList({
  $autoCancel: false,
});
const existingNoteByCode = new Map(
  existingNotes.map((note) => [String(note.code), note]),
);
let noteCreated = 0;
let noteUpdated = 0;
for (const note of dataset.notes) {
  const payload = {
    code: note.code,
    factorCode: note.factorCode,
    category: note.category,
    levelCode: note.levelCode,
    note: note.note,
    ageRange: note.ageRange,
    gender: note.gender,
    status: note.status,
  };
  const existing = existingNoteByCode.get(note.code);
  if (!existing) {
    await pb.collection("talent_factor_notes").create(payload, { $autoCancel: false });
    noteCreated += 1;
    continue;
  }
  const changed = Object.entries(payload).some(
    ([key, value]) => String(existing[key] ?? "") !== String(value ?? ""),
  );
  if (changed) {
    await pb.collection("talent_factor_notes").update(existing.id, payload, {
      $autoCancel: false,
    });
    noteUpdated += 1;
  }
}

// ── 培养方向：tierIds 使用档位记录 id；默认档位必须 ∈ tierIds。 ─────────────────────────
let directionCreated = 0;
let directionUpdated = 0;
for (const direction of dataset.directions) {
  const tierIds = direction.tierCodes.map((code) => {
    const tier = seededTiers.get(code);
    if (!tier) throw new Error(`方向 ${direction.code} 缺少档位：${code}`);
    return tier.id;
  });
  const defaultTier = seededTiers.get(direction.defaultTierCode);
  if (!defaultTier) throw new Error(`方向 ${direction.code} 缺少默认档位`);
  const existing = await findByFilter(
    "talent_directions",
    `code = "${escapeFilter(direction.code)}"`,
  );
  const payload = {
    code: direction.code,
    name: direction.name,
    description: direction.description,
    icon: direction.icon,
    requirements: direction.requirements,
    tierIds,
    defaultTierId: defaultTier.id,
    aliases: direction.aliases,
    version: direction.version,
    status: direction.status,
  };
  if (existing) {
    const changed = Object.entries(payload).some(
      ([key, value]) => !isDeepStrictEqual(existing[key], value),
    );
    if (changed) {
      await pb.collection("talent_directions").update(existing.id, payload, {
        $autoCancel: false,
      });
      directionUpdated += 1;
    }
  } else {
    await pb.collection("talent_directions").create(payload, { $autoCancel: false });
    directionCreated += 1;
  }
}

// ── 校验计数，任何一项不符即失败退出。 ────────────────────────────────────────────────
const levelRows = await pb.collection("talent_levels").getFullList({
  filter: 'code != ""',
  $autoCancel: false,
});
const tierRows = await pb.collection("talent_tiers").getFullList({
  $autoCancel: false,
});
const directionRows = await pb.collection("talent_directions").getFullList({
  $autoCancel: false,
});
const factorRows = await pb.collection("talent_factors").getFullList({
  filter: `libraryId = "${library.id}"`,
  $autoCancel: false,
});
const noteRows = await pb.collection("talent_factor_notes").getFullList({
  $autoCancel: false,
});
const seededLevelCodes = new Set(dataset.levels.map((level) => level.code));
const seededTierCodes = new Set(dataset.tiers.map((tier) => tier.code));
const seededDirectionCodes = new Set(dataset.directions.map((item) => item.code));
const seededFactorCodes = new Set(dataset.factors.map((factor) => factor.code));
const seededNoteCodes = new Set(dataset.notes.map((note) => note.code));
const failures = [];
const assertCount = (label, actual, expected) => {
  if (actual !== expected) failures.push(`${label} 期望 ${expected}，实际 ${actual}`);
};
assertCount(
  "新增分级",
  levelRows.filter((row) => seededLevelCodes.has(String(row.code))).length,
  dataset.stats.levels,
);
assertCount(
  "档位",
  tierRows.filter((row) => seededTierCodes.has(String(row.code))).length,
  dataset.stats.tiers,
);
assertCount(
  "培养方向",
  directionRows.filter((row) => seededDirectionCodes.has(String(row.code))).length,
  dataset.stats.directions,
);
assertCount(
  "潜质要素",
  factorRows.filter((row) => seededFactorCodes.has(String(row.code))).length,
  dataset.stats.factors,
);
assertCount(
  "固定注解",
  noteRows.filter((row) => seededNoteCodes.has(String(row.code))).length,
  dataset.stats.notes,
);
assertCount("分库 filledCount", Number(library.filledCount), dataset.library.filledCount);
assertCount("分库 slotTotal", Number(library.slotTotal), dataset.library.slotTotal);
assertCount("分库 itemCount", Number(library.itemCount), dataset.library.itemCount);
assertCount(
  "全局默认档位",
  tierRows.filter((tier) => tier.isDefault === true).length,
  1,
);
if (failures.length) {
  console.error(`✗ M1 规则域种子校验失败：\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        url,
        library: { gender: library.gender, age: library.age, id: library.id },
        created: {
          factors: factorCreated,
          notes: noteCreated,
          directions: directionCreated,
        },
        updated: {
          factors: factorUpdated,
          notes: noteUpdated,
          directions: directionUpdated,
        },
        counts: {
          levels: levelRows.length,
          seededLevels: dataset.stats.levels,
          tiers: tierRows.length,
          factors: factorRows.length,
          notes: noteRows.length,
          directions: directionRows.length,
          nonEmptyNotes: dataset.stats.nonEmptyNotes,
          categoryCounts: dataset.stats.categoryCounts,
          slotTotal: Number(library.slotTotal),
          filledSlotCount: Number(library.filledCount),
          partialSlotCount: dataset.stats.partialSlotCount,
        },
        defaultTier: tierRows.find((tier) => tier.isDefault === true)?.code || "",
      },
      null,
      2,
    ),
  );
}