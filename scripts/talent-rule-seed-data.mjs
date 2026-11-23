#!/usr/bin/env node
/**
 * @description M1 规则域种子数据构建：从客户交付的外部文库原型（男 0 岁）生成 4 分级、4 档位、
 *   1 个分库 × 158 要素、632 固定注解与 6 个培养方向。这里只做纯数据构建，不连接 PocketBase；
 *   写入由 scripts/seed-talent-rule.mjs 完成，服务端 Mock 源也复用本模块。
 * @file scripts/talent-rule-seed-data.mjs
 */
import {
  ELEMENT_ITEMS,
  ELEMENT_TEXTS,
  ELEMENT_VARIANTS,
} from "../docs/天赋正式开发交接包/talent-prototype-v2/assets/js/element-lib.js";

/** 分级编码固定 4 档；与 shared/types/talent-rule.ts 的 TALENT_LEVEL_CODES 保持一致。 */
export const TALENT_LEVEL_CODES = ["LV1", "LV2", "LV3", "LV4"];

/** 分级名称 → 编码：方向 requirements 在原型里写名称，落库前统一转编码。 */
export const TALENT_LEVEL_NAME_TO_CODE = {
  常态: "LV1",
  优良: "LV2",
  优秀: "LV3",
  卓越: "LV4",
};

/**
 * 外部文库数据熵 → 内部分级编码（U2 口径，待客户确认）：按级序从高到低一一对应。
 * 卓越级 → LV4 / 优良级 → LV3 / 常态级 → LV2 / 弱势级 → LV1（弱势级映射到常态档）。
 */
export const TALENT_EXTERNAL_ENTROPY_TO_LEVEL = {
  卓越级: "LV4",
  优良级: "LV3",
  常态级: "LV2",
  弱势级: "LV1",
};

/** 种子分级：级序用于方向命中比较，range 为得分范围文案，tone 为展示色位（不存色值）。 */
export const TALENT_SEED_LEVELS = [
  { code: "LV1", name: "常态", sortOrder: 1, range: "0–59", tone: "default" },
  { code: "LV2", name: "优良", sortOrder: 2, range: "60–74", tone: "info" },
  { code: "LV3", name: "优秀", sortOrder: 3, range: "75–89", tone: "success" },
  { code: "LV4", name: "卓越", sortOrder: 4, range: "90–100", tone: "warning" },
];

/** 种子档位：固定 4 档，T1 为全局默认。 */
export const TALENT_SEED_TIERS = [
  {
    code: "T1",
    name: "启蒙",
    sortOrder: 1,
    teacher: "普通老师",
    freq: "每周 1–2 次",
    headline: "先让孩子喜欢上",
    description:
      "以兴趣体验和基础感知为主，通过游戏化练习建立稳定接触，不设定考核目标。适合零基础、先试一试的家庭。",
    preset: true,
    isDefault: true,
  },
  {
    code: "T2",
    name: "养成",
    sortOrder: 2,
    teacher: "资深老师",
    freq: "每周 2 次",
    headline: "把喜欢变成习惯",
    description:
      "按固定频次系统练习，建立基本功与练习节奏，阶段性展示学习成果。适合已接触过、希望坚持下来的孩子。",
    preset: true,
    isDefault: false,
  },
  {
    code: "T3",
    name: "精进",
    sortOrder: 3,
    teacher: "卓越老师",
    freq: "每周 2–3 次",
    headline: "从会一点到拿得出手",
    description:
      "以薄弱环节突破为主，系统训练，参加展演、比赛或等级考核。适合已有基础、希望在同龄人中突出的孩子。",
    preset: true,
    isDefault: false,
  },
  {
    code: "T4",
    name: "冲刺",
    sortOrder: 4,
    teacher: "大师级老师",
    freq: "每周 3 次以上",
    headline: "走专业路线",
    description:
      "一对一定制训练方案，对准比赛名次、专业考级或专业院校方向。适合目标明确、家庭可长期投入的孩子。",
    preset: true,
    isDefault: false,
  },
];

/**
 * 种子培养方向：requirements 暂存分级名称，构建时转为分级编码；
 * tierCodes 由种子脚本解析为 talent_tiers 记录 id。
 */
export const TALENT_SEED_DIRECTIONS = [
  {
    code: "DIR-001",
    name: "舞蹈家",
    icon: "舞",
    description:
      "以肢体协调、节奏感与表现力为核心，适合在律动与身体表达上表现突出的孩子。",
    tierCodes: ["T1", "T2", "T3", "T4"],
    defaultTierCode: "T1",
    requirements: [
      ["E-16", "优秀"],
      ["E-15", "优良"],
      ["F-11", "优秀"],
      ["F-10", "优良"],
      ["E-03", "优良"],
      ["F-03", "优良"],
    ],
  },
  {
    code: "DIR-002",
    name: "音乐家",
    icon: "音",
    description:
      "以音高辨别、旋律记忆与节拍稳定为核心，适合听觉敏感、对声音有持续兴趣的孩子。",
    tierCodes: ["T1", "T2", "T3", "T4"],
    defaultTierCode: "T1",
    requirements: [
      ["E-09", "卓越"],
      ["E-10", "优秀"],
      ["E-12", "优秀"],
      ["E-11", "优良"],
      ["E-01", "优良"],
    ],
  },
  {
    code: "DIR-003",
    name: "逻辑思维",
    icon: "思",
    description:
      "以推理、问题拆解与模式识别为核心，适合喜欢追问原因、擅长找规律的孩子。",
    tierCodes: ["T1", "T2", "T3"],
    defaultTierCode: "T1",
    requirements: [
      ["B-34", "优秀"],
      ["B-39", "优秀"],
      ["B-38", "优良"],
      ["B-18", "优良"],
      ["B-28", "优良"],
    ],
  },
  {
    code: "DIR-004",
    name: "语言表达",
    icon: "言",
    description:
      "以叙事组织、口头表达与倾听理解为核心，适合爱说、爱讲、能带动现场气氛的孩子。",
    tierCodes: ["T1", "T2", "T3"],
    defaultTierCode: "T1",
    requirements: [
      ["B-36", "优秀"],
      ["B-35", "优秀"],
      ["B-37", "优良"],
      ["B-20", "优良"],
      ["C-24", "优良"],
    ],
  },
  {
    code: "DIR-005",
    name: "绘画创作",
    icon: "画",
    description:
      "以空间想象、色彩敏感与细节观察为核心，适合喜欢涂画、对图像细节敏感的孩子。",
    tierCodes: ["T1", "T2", "T3", "T4"],
    defaultTierCode: "T1",
    requirements: [
      ["E-14", "优秀"],
      ["E-13", "优秀"],
      ["E-03", "优良"],
      ["E-04", "优良"],
      ["E-06", "优良"],
    ],
  },
  {
    code: "DIR-006",
    name: "运动竞技",
    icon: "动",
    description:
      "以反应速度、爆发力量与姿态稳定为核心，适合在对抗性运动中表现积极的孩子。",
    tierCodes: ["T2", "T3", "T4"],
    defaultTierCode: "T2",
    requirements: [
      ["F-05", "优秀"],
      ["F-04", "优秀"],
      ["F-10", "优良"],
      ["F-15", "优良"],
      ["F-07", "优良"],
    ],
  },
];

/** 单个空槽位：四段全空 = 待补写。 */
export function createEmptyTalentSlot() {
  return { content: "", example: "", direction: "", suggestion: "" };
}

/** 创建 4 档 × 3 变体的标准空 slots 结构。 */
export function createEmptyTalentSlots(levelCodes = TALENT_LEVEL_CODES) {
  return Object.fromEntries(
    levelCodes.map((code) => [
      code,
      Array.from({ length: ELEMENT_VARIANTS }, createEmptyTalentSlot),
    ]),
  );
}

/** 判断槽位是否四段完整；有任一段非空但未填满 = 部分回填。 */
export function summarizeTalentSlots(
  slots,
  levelCodes = TALENT_LEVEL_CODES,
) {
  let slotTotal = 0;
  let filledSlotCount = 0;
  let partialSlotCount = 0;
  for (const code of levelCodes) {
    const variants = Array.isArray(slots?.[code]) ? slots[code] : [];
    slotTotal += ELEMENT_VARIANTS;
    for (const variant of variants) {
      const segments = [
        variant?.content,
        variant?.example,
        variant?.direction,
        variant?.suggestion,
      ].map((value) => (typeof value === "string" ? value.trim() : ""));
      const filled = segments.filter(Boolean).length;
      if (filled === 0) continue;
      if (filled === segments.length) filledSlotCount += 1;
      else partialSlotCount += 1;
    }
  }
  return { slotTotal, filledSlotCount, partialSlotCount };
}

/**
 * 把外部文库「数据熵 → 3 变体 → 四段」转换为内部 slots。
 * 未映射的数据熵与超出 3 个的变体忽略；缺失的槽位保持空串。
 */
export function buildTalentFactorSlots(elementName, elementTexts, levelCodes = TALENT_LEVEL_CODES) {
  const slots = createEmptyTalentSlots(levelCodes);
  const textsByEntropy = (elementTexts && elementTexts[elementName]) || {};
  for (const [entropy, variants] of Object.entries(textsByEntropy)) {
    const levelCode = TALENT_EXTERNAL_ENTROPY_TO_LEVEL[entropy];
    if (!levelCode || !levelCodes.includes(levelCode)) continue;
    if (!Array.isArray(variants)) continue;
    slots[levelCode] = slots[levelCode].map((emptySlot, index) => {
      const variant = variants[index];
      if (!Array.isArray(variant)) return emptySlot;
      return {
        content: String(variant[0] || ""),
        example: String(variant[1] || ""),
        direction: String(variant[2] || ""),
        suggestion: String(variant[3] || ""),
      };
    });
  }
  return slots;
}

/** 根据外部文库条目构建潜质要素记录（不含 PocketBase 关联 id）。 */
export function buildTalentFactorRecords({
  gender = "male",
  age = 0,
  levelCodes = TALENT_LEVEL_CODES,
} = {}) {
  // 只有「男 0 岁」库回填了正文，其它库同步后文案仍待外部系统回填，不跨库借用。
  const elementTexts = gender === "male" && age === 0 ? ELEMENT_TEXTS : {};
  return ELEMENT_ITEMS.map((item) => {
    const slots = buildTalentFactorSlots(item.name, elementTexts, levelCodes);
    const { slotTotal, filledSlotCount, partialSlotCount } = summarizeTalentSlots(
      slots,
      levelCodes,
    );
    return {
      code: item.code,
      name: item.name,
      category: item.book,
      categoryName: item.bookName,
      sortOrder: item.no,
      slots,
      slotTotal,
      filledSlotCount,
      partialSlotCount,
    };
  });
}

/** 根据要素汇总分库计数（filledCount = 各要素完整槽位之和）。 */
export function buildTalentFactorLibraryRecord(factors, { gender = "male", age = 0 } = {}) {
  const itemCount = factors.length;
  const slotTotal = factors.reduce((sum, factor) => sum + Number(factor.slotTotal || 0), 0);
  const filledCount = factors.reduce(
    (sum, factor) => sum + Number(factor.filledSlotCount || 0),
    0,
  );
  return {
    gender,
    age,
    source: "mock-file",
    version: "v1",
    itemCount,
    slotTotal,
    filledCount,
    status: "1",
  };
}

/** 632 条固定注解：编号 = 要素编码-分级编码，正文取该要素该分级第 1 变体的「分级内容」。 */
export function buildTalentNoteRecords(factors, levelCodes = TALENT_LEVEL_CODES) {
  return factors.flatMap((factor) =>
    levelCodes.map((levelCode) => ({
      code: `${factor.code}-${levelCode}`,
      factorCode: factor.code,
      category: factor.category,
      levelCode,
      note: String(factor.slots?.[levelCode]?.[0]?.content || ""),
      ageRange: "",
      gender: "通用",
      status: "1",
    })),
  );
}

/**
 * 构建完整种子数据集；默认男 0 岁库（客户当前唯一交付的分库）。
 *
 * @param {{ gender?: string, age?: number }} query 分库查询。
 * @returns {Promise<{levels: object[], tiers: object[], directions: object[], library: object, factors: object[], notes: object[], stats: object}>}
 */
export async function buildTalentRuleSeedData({ gender = "male", age = 0 } = {}) {
  const factors = buildTalentFactorRecords({ gender, age });
  const library = buildTalentFactorLibraryRecord(factors, { gender, age });
  const notes = buildTalentNoteRecords(factors);
  const directions = TALENT_SEED_DIRECTIONS.map((direction) => ({
    code: direction.code,
    name: direction.name,
    description: direction.description,
    icon: direction.icon,
    requirements: direction.requirements.map(([code, levelName]) => {
      const level = TALENT_LEVEL_NAME_TO_CODE[levelName];
      if (!level)
        throw new Error(
          `种子方向 ${direction.code} 的要求分级无法映射：${levelName}`,
        );
      return { code, level };
    }),
    tierCodes: [...direction.tierCodes],
    defaultTierCode: direction.defaultTierCode,
    aliases: [],
    version: 1,
    status: "1",
  }));
  const categoryCounts = factors.reduce((counts, factor) => {
    counts[factor.category] = (counts[factor.category] || 0) + 1;
    return counts;
  }, {});
  return {
    levels: TALENT_SEED_LEVELS.map((level) => ({
      ...level,
      status: "1",
      // 兼容旧唯一索引 (elementId, levelCode)：新行镜像 levelCode / levelName，elementId / annotation 留空。
      levelCode: level.code,
      levelName: level.name,
      elementId: "",
      annotation: "",
    })),
    tiers: TALENT_SEED_TIERS.map((tier) => ({ ...tier, status: "1" })),
    directions,
    library,
    factors,
    notes,
    stats: {
      levels: TALENT_SEED_LEVELS.length,
      tiers: TALENT_SEED_TIERS.length,
      library: 1,
      factors: factors.length,
      notes: notes.length,
      directions: directions.length,
      categoryCounts,
      slotTotal: library.slotTotal,
      filledSlotCount: library.filledCount,
      partialSlotCount: factors.reduce(
        (sum, factor) => sum + factor.partialSlotCount,
        0,
      ),
      nonEmptyNotes: notes.filter((note) => note.note).length,
    },
  };
}