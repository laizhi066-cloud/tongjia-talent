/**
 * @description M1 规则域数据层测试：集合定义、种子计数、分级 / 方向 / 注解 / 档位校验、
 *   引用保护、名称解析、分库源幂等合并与脚本安全约定。
 * @file test/talent-rule-domain.test.ts
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  TalentDirectionRequirement,
  TalentFactorSlots,
} from "~~/shared/types/talent-rule";
import { TALENT_LEVEL_CODES } from "~~/shared/types/talent-rule";
import { COLLECTION_DEFS } from "../scripts/setup.mjs";
import { buildTalentRuleSeedData } from "../scripts/talent-rule-seed-data.mjs";
import {
  assertSingleTalentTierDefault,
  assertTalentDirectionCodeImmutable,
  assertTalentDirectionDeletable,
  assertTalentFactorNoteIdentityImmutable,
  assertTalentFactorSlots,
  assertTalentLevelCodeImmutable,
  assertTalentLevelDeletable,
  assertTalentLevelUniqueness,
  talentDirectionRequirements,
  buildTalentFactorNoteCode,
  buildTalentLevelNameLookup,
  buildTalentTierDefaultUpdates,
  collectTalentLevelReferences,
  createTalentFactorSlots,
  filterNewTalentLevels,
  nextTalentDirectionVersion,
  pickLatestSyncedTalentLibrary,
  resolveTalentCategoryName,
  resolveTalentFactorNames,
  resolveTalentLevelName,
  resolveTalentNoteCategory,
  summarizeTalentSlots,
  talentDirectionReferencedIn,
  talentLevelCreateSchema,
  talentTierUpdateSchema,
  validateTalentDirectionConfig,
} from "~~/server/utils/talent-rule";
import {
  assertTalentFactorLibrarySynced,
  createMockTalentFactorLibrarySource,
  planTalentFactorMerge,
  summarizeTalentFactorSource,
} from "~~/server/utils/talent-rule-source";

interface SeedDataset {
  levels: Array<{
    code: string;
    name: string;
    sortOrder: number;
    status: string;
    levelCode: string;
    levelName: string;
    elementId: string;
  }>;
  tiers: Array<{ code: string; isDefault: boolean; preset: boolean }>;
  factors: Array<{
    code: string;
    name: string;
    category: string;
    slots: TalentFactorSlots;
    filledSlotCount: number;
    partialSlotCount: number;
  }>;
  notes: Array<{ code: string; factorCode: string; levelCode: string; note: string }>;
  directions: Array<{
    code: string;
    requirements: TalentDirectionRequirement[];
    tierCodes: string[];
    defaultTierCode: string;
    version: number;
  }>;
  library: {
    gender: string;
    age: number;
    source: string;
    itemCount: number;
    slotTotal: number;
    filledCount: number;
  };
  stats: {
    levels: number;
    tiers: number;
    library: number;
    factors: number;
    notes: number;
    directions: number;
    categoryCounts: Record<string, number>;
    slotTotal: number;
    filledSlotCount: number;
    partialSlotCount: number;
    nonEmptyNotes: number;
  };
}

const seed = (await buildTalentRuleSeedData()) as unknown as SeedDataset;

function catchTalentError(run: () => unknown): { statusCode?: number; message?: string } | null {
  try {
    run();
    return null;
  } catch (error) {
    return error as { statusCode?: number; message?: string };
  }
}

function expectTalentError(run: () => unknown, statusCode: number, message: string): void {
  const error = catchTalentError(run);
  expect(error, "应该抛出规则域错误").not.toBeNull();
  expect(error?.statusCode).toBe(statusCode);
  expect(error?.message).toContain(message);
}

function seedContext() {
  return {
    factorCategories: new Map(seed.factors.map((factor) => [factor.code, factor.category])),
    enabledLevelCodes: new Set(seed.levels.map((level) => level.code)),
    enabledTierIds: new Set(seed.tiers.map((tier) => `tier-${tier.code}`)),
  };
}

describe("M1 规则域集合定义", () => {
  const expectedCollections = [
    "talent_factor_libraries",
    "talent_factors",
    "talent_factor_notes",
    "talent_directions",
    "talent_tiers",
    "talent_levels",
  ];

  it("声明 6 个规则域集合，且不新增非 talent_* 业务集合", () => {
    const names = COLLECTION_DEFS.map((definition) => definition.name);
    for (const name of expectedCollections) expect(names).toContain(name);
  });

  it("talent_levels 只保留 M1 新字段，M6 旧字段已删除", () => {
    interface FieldDef {
      name: string;
      required?: boolean;
    }
    interface RelationDef {
      name: string;
      required?: boolean;
    }
    interface CollectionDef {
      name: string;
      fields: FieldDef[];
      relations?: RelationDef[];
    }
    const collections = COLLECTION_DEFS as unknown as CollectionDef[];
    const level = collections.find((definition) => definition.name === "talent_levels");
    const fields = level?.fields || [];
    const fieldByName = new Map(fields.map((field) => [field.name, field]));
    for (const name of ["code", "name", "sortOrder"]) {
      expect(fieldByName.get(name)?.required, `${name} 应为必填`).toBe(true);
    }
    expect(fieldByName.get("range")).toBeTruthy();
    expect(fieldByName.get("tone")).toBeTruthy();
    // M6：旧镜像字段 elementId / levelCode / levelName / annotation 已删除（M6 规格 §2.2）。
    for (const name of ["elementId", "levelCode", "levelName", "annotation"]) {
      expect(fieldByName.get(name), `旧字段 ${name} 必须已删除`).toBeFalsy();
      expect(
        level?.relations?.some((relation) => relation.name === name),
        `旧关系 ${name} 必须已删除`,
      ).toBeFalsy();
    }
  });

  it("新库与存量库脚本都登记了 §3.7 全部索引，旧索引已随 M6 删除", () => {
    const setupSource = readFileSync(new URL("../scripts/setup.mjs", import.meta.url), "utf8");
    const syncSource = readFileSync(new URL("../scripts/sync-talent.mjs", import.meta.url), "utf8");
    const expectedIndexes = [
      "idx_talent_factor_libraries_gender_age",
      "idx_talent_factors_library_code",
      "idx_talent_factors_category",
      "idx_talent_factors_sort",
      "idx_talent_levels_code",
      "idx_talent_levels_sort",
      "idx_talent_factor_notes_code",
      "idx_talent_factor_notes_factor",
      "idx_talent_factor_notes_level",
      "idx_talent_factor_notes_status",
      "idx_talent_directions_code",
      "idx_talent_directions_status",
      "idx_talent_tiers_code",
      "idx_talent_tiers_sort",
      "idx_talent_tiers_default",
    ];
    for (const index of expectedIndexes) {
      expect(setupSource, `setup.mjs 缺少 ${index}`).toContain(index);
      expect(syncSource, `sync-talent.mjs 缺少 ${index}`).toContain(index);
    }
    // M6：旧复合唯一索引随旧字段删除，setup / sync 都不得再创建。
    expect(setupSource).not.toContain("CREATE UNIQUE INDEX idx_talent_levels_element_level");
    expect(syncSource).not.toContain("CREATE UNIQUE INDEX idx_talent_levels_element_level");
  });
});

describe("M1 种子数据（可复现计数）", () => {
  it("4 分级 / 4 档位 / 158 要素 / 632 注解 / 6 方向 / 27 完整槽位", () => {
    expect(seed.stats).toMatchObject({
      levels: 4,
      tiers: 4,
      library: 1,
      factors: 158,
      notes: 632,
      directions: 6,
      slotTotal: 1896,
      filledSlotCount: 27,
      partialSlotCount: 0,
    });
    expect(seed.stats.categoryCounts).toEqual({ A: 26, B: 39, C: 27, D: 25, E: 18, F: 23 });
    expect(seed.library).toMatchObject({
      gender: "male",
      age: 0,
      source: "mock-file",
      itemCount: 158,
      slotTotal: 1896,
      filledCount: 27,
    });
  });

  it("分级为 LV1–LV4、级序 1–4、名称符合验收口径", () => {
    expect(seed.levels.map((level) => level.code)).toEqual([...TALENT_LEVEL_CODES]);
    expect(seed.levels.map((level) => level.sortOrder)).toEqual([1, 2, 3, 4]);
    expect(seed.levels.map((level) => level.name)).toEqual(["常态", "优良", "优秀", "卓越"]);
    for (const level of seed.levels) {
      expect(level.status).toBe("1");
      // 新行镜像旧字段，避免旧唯一索引 (elementId, levelCode) 阻塞写入。
      expect(level.levelCode).toBe(level.code);
      expect(level.levelName).toBe(level.name);
      expect(level.elementId).toBe("");
    }
  });

  it("档位固定 4 档且仅 T1 为全局默认", () => {
    expect(seed.tiers.map((tier) => tier.code)).toEqual(["T1", "T2", "T3", "T4"]);
    expect(seed.tiers.filter((tier) => tier.isDefault).map((tier) => tier.code)).toEqual(["T1"]);
    expect(seed.tiers.every((tier) => tier.preset)).toBe(true);
  });

  it("每个要素 4 档 × 3 变体 × 四段齐全，完整槽位 27", () => {
    let filled = 0;
    for (const factor of seed.factors) {
      expect(() => assertTalentFactorSlots(factor.slots, TALENT_LEVEL_CODES)).not.toThrow();
      const summary = summarizeTalentSlots(factor.slots, TALENT_LEVEL_CODES);
      expect(summary.slotTotal).toBe(12);
      expect(summary.filledSlotCount).toBe(factor.filledSlotCount);
      expect(summary.partialSlotCount).toBe(factor.partialSlotCount);
      filled += factor.filledSlotCount;
    }
    expect(filled).toBe(27);
    const filledFactors = seed.factors.filter((factor) => factor.filledSlotCount > 0);
    expect(filledFactors.map((factor) => [factor.code, factor.filledSlotCount])).toEqual([
      ["A-01", 12],
      ["A-02", 3],
      ["D-15", 12],
    ]);
  });

  it("632 条固定注解 = 158 × 4，编号唯一且正文取第 1 变体的分级内容", () => {
    const factorCodeSet = new Set(seed.factors.map((factor) => factor.code));
    const noteCodes = new Set(seed.notes.map((note) => note.code));
    expect(noteCodes.size).toBe(632);
    for (const note of seed.notes) {
      expect(noteCodes.has(`${note.factorCode}-${note.levelCode}`)).toBe(true);
      expect(factorCodeSet.has(note.factorCode)).toBe(true);
      expect(TALENT_LEVEL_CODES).toContain(note.levelCode);
      expect(note.note.length).toBeLessThanOrEqual(2000);
    }
    for (const factor of seed.factors.slice(0, 5)) {
      for (const levelCode of TALENT_LEVEL_CODES) {
        const note = seed.notes.find(
          (row) => row.factorCode === factor.code && row.levelCode === levelCode,
        );
        expect(note?.note).toBe(factor.slots[levelCode]?.[0]?.content);
      }
    }
  });

  it("6 个方向的 requirements 引用启用编码，defaultTier ∈ tierIds", () => {
    const factorCodes = new Set(seed.factors.map((factor) => factor.code));
    const levelCodes = new Set(seed.levels.map((level) => level.code));
    for (const direction of seed.directions) {
      expect(direction.requirements.length).toBeGreaterThanOrEqual(1);
      expect(direction.requirements.length).toBeLessThanOrEqual(50);
      expect(new Set(direction.requirements.map((item) => item.code)).size).toBe(
        direction.requirements.length,
      );
      for (const requirement of direction.requirements) {
        expect(factorCodes.has(requirement.code)).toBe(true);
        expect(levelCodes.has(requirement.level)).toBe(true);
      }
      expect(direction.tierCodes.length).toBeGreaterThanOrEqual(1);
      expect(direction.tierCodes).toContain(direction.defaultTierCode);
      expect(direction.version).toBe(1);
    }
    expect(seed.directions.map((direction) => direction.code)).toEqual([
      "DIR-001",
      "DIR-002",
      "DIR-003",
      "DIR-004",
      "DIR-005",
      "DIR-006",
    ]);
  });
});

describe("分级校验", () => {
  it("Zod 校验编码格式、名称长度与级序范围", () => {
    expect(
      talentLevelCreateSchema.parse({ code: "LV1", name: "常态", sortOrder: 1, tone: "default" }),
    ).toMatchObject({ code: "LV1", name: "常态", sortOrder: 1 });
    expect(talentLevelCreateSchema.safeParse({ code: "L1", name: "常态", sortOrder: 1 }).success).toBe(false);
    expect(talentLevelCreateSchema.safeParse({ code: "LV1", name: "", sortOrder: 1 }).success).toBe(false);
    expect(talentLevelCreateSchema.safeParse({ code: "LV1", name: "常态", sortOrder: 5 }).success).toBe(false);
    expect(talentLevelCreateSchema.safeParse({ code: "LV1", name: "常态", sortOrder: 1, tone: "red" }).success).toBe(false);
  });

  it("新页面 / 新接口只处理 code != \"\" 的行", () => {
    const rows = [
      { id: "old", code: "", levelCode: "L3" },
      { id: "new", code: "LV1" },
    ];
    expect(filterNewTalentLevels(rows).map((row) => row.id)).toEqual(["new"]);
  });

  it("唯一编码与唯一级序冲突返回 409，编辑自身不冲突", () => {
    const existing = [
      { id: "lv1", code: "LV1", sortOrder: 1 },
      { id: "lv2", code: "LV2", sortOrder: 2 },
    ];
    expectTalentError(
      () => assertTalentLevelUniqueness({ code: "LV1", sortOrder: 3 }, existing),
      409,
      "分级编码已存在",
    );
    expectTalentError(
      () => assertTalentLevelUniqueness({ code: "LV3", sortOrder: 2 }, existing),
      409,
      "级序已存在",
    );
    expect(() =>
      assertTalentLevelUniqueness({ code: "LV1", sortOrder: 1 }, existing, "lv1"),
    ).not.toThrow();
  });

  it("编码不可修改", () => {
    expect(() => assertTalentLevelCodeImmutable("LV1", "LV1")).not.toThrow();
    expect(() => assertTalentLevelCodeImmutable("LV1", undefined)).not.toThrow();
    expectTalentError(() => assertTalentLevelCodeImmutable("LV1", "LV2"), 422, "分级编码不可修改");
  });
});

describe("槽位结构", () => {
  it("标准空槽位为 4 档 × 3 变体 × 四段", () => {
    const slots = createTalentFactorSlots();
    expect(Object.keys(slots)).toEqual([...TALENT_LEVEL_CODES]);
    for (const levelCode of TALENT_LEVEL_CODES) {
      expect(slots[levelCode]).toHaveLength(3);
      expect(Object.keys(slots[levelCode]?.[0] || {})).toEqual([
        "content",
        "example",
        "direction",
        "suggestion",
      ]);
    }
    expect(summarizeTalentSlots(slots)).toEqual({
      slotTotal: 12,
      filledSlotCount: 0,
      partialSlotCount: 0,
    });
  });

  it("完整槽位计入 filled，部分回填计入 partial", () => {
    const slots = createTalentFactorSlots();
    slots.LV1![0] = { content: "内容", example: "举例", direction: "方向", suggestion: "建议" };
    slots.LV2![0] = { ...slots.LV2![0]!, content: "仅一段" };
    expect(summarizeTalentSlots(slots)).toEqual({
      slotTotal: 12,
      filledSlotCount: 1,
      partialSlotCount: 1,
    });
  });

  it("缺档位、缺变体、缺文案段均拒绝", () => {
    const slots = createTalentFactorSlots();
    delete slots.LV4;
    expectTalentError(() => assertTalentFactorSlots(slots), 422, "缺少分级 LV4");
    const wrongVariants = createTalentFactorSlots();
    wrongVariants.LV3 = wrongVariants.LV3!.slice(0, 2);
    expectTalentError(() => assertTalentFactorSlots(wrongVariants), 422, "必须包含 3 个变体");
    const missingSegment = createTalentFactorSlots() as unknown as Record<string, unknown>;
    (missingSegment.LV2 as Array<Record<string, unknown>>)[0]!.example = 1;
    expectTalentError(() => assertTalentFactorSlots(missingSegment), 422, "缺少文案段 example");
  });
});

describe("培养方向契约（requirements / tierIds / 版本）", () => {
  it("合法配置通过并归一化", () => {
    const context = seedContext();
    const direction = seed.directions[0]!;
    const normalized = validateTalentDirectionConfig(
      {
        requirements: direction.requirements,
        tierIds: ["tier-T1", "tier-T2"],
        defaultTierId: "tier-T1",
      },
      context,
    );
    expect(normalized.requirements).toEqual(direction.requirements);
    expect(normalized.tierIds).toEqual(["tier-T1", "tier-T2"]);
    expect(normalized.defaultTierId).toBe("tier-T1");
  });

  it("空 / 超 50 / 重复要素 / 不存在要素 / 停用分级均 422", () => {
    const context = seedContext();
    const base = { tierIds: ["tier-T1"], defaultTierId: "tier-T1" };
    expectTalentError(
      () => validateTalentDirectionConfig({ ...base, requirements: [] }, context),
      422,
      "至少配置 1 项要素",
    );
    const many = Array.from({ length: 51 }, (_, index) => ({
      code: `A-${String(index + 1).padStart(2, "0")}`,
      level: "LV1",
    }));
    expectTalentError(
      () => validateTalentDirectionConfig({ ...base, requirements: many }, context),
      422,
      "不能超过 50",
    );
    expectTalentError(
      () =>
        validateTalentDirectionConfig(
          {
            ...base,
            requirements: [
              { code: "A-01", level: "LV1" },
              { code: "A-01", level: "LV2" },
            ],
          },
          context,
        ),
      422,
      "不能重复配置",
    );
    expectTalentError(
      () =>
        validateTalentDirectionConfig(
          { ...base, requirements: [{ code: "Z-99", level: "LV1" }] },
          context,
        ),
      422,
      "要素编码不存在",
    );
    const disabledLevelContext = {
      ...context,
      enabledLevelCodes: new Set(["LV1"]),
    };
    expectTalentError(
      () =>
        validateTalentDirectionConfig(
          { ...base, requirements: [{ code: "A-01", level: "LV2" }] },
          disabledLevelContext,
        ),
      422,
      "要求分级不存在或已停用",
    );
  });

  it("档位 1–4、去重、启用、默认档位 ∈ 子集", () => {
    const context = seedContext();
    const requirements = [{ code: "A-01", level: "LV1" }];
    expectTalentError(
      () =>
        validateTalentDirectionConfig(
          { requirements, tierIds: [], defaultTierId: "tier-T1" },
          context,
        ),
      422,
      "至少启用 1 个档位",
    );
    expectTalentError(
      () =>
        validateTalentDirectionConfig(
          {
            requirements,
            tierIds: ["tier-T1", "tier-T2", "tier-T3", "tier-T4", "tier-T5"],
            defaultTierId: "tier-T1",
          },
          context,
        ),
      422,
      "不能超过 4",
    );
    expectTalentError(
      () =>
        validateTalentDirectionConfig(
          { requirements, tierIds: ["tier-T1"], defaultTierId: "tier-T2" },
          context,
        ),
      422,
      "默认档位必须在启用档位中",
    );
    const disabledTierContext = { ...context, enabledTierIds: new Set(["tier-T1"]) };
    expectTalentError(
      () =>
        validateTalentDirectionConfig(
          {
            requirements,
            tierIds: ["tier-T1", "tier-T2"],
            defaultTierId: "tier-T2",
          },
          disabledTierContext,
        ),
      422,
      "档位不存在或已停用",
    );
    expect(
      validateTalentDirectionConfig(
        {
          requirements,
          tierIds: ["tier-T1", "tier-T1", "tier-T2"],
          defaultTierId: "tier-T2",
        },
        context,
      ).tierIds,
    ).toEqual(["tier-T1", "tier-T2"]);
  });

  it("方向编码不可改；保存配置版本 +1", () => {
    expectTalentError(
      () => assertTalentDirectionCodeImmutable("DIR-001", "DIR-002"),
      422,
      "方向编码不可修改",
    );
    expect(() => assertTalentDirectionCodeImmutable("DIR-001", undefined)).not.toThrow();
    expect(nextTalentDirectionVersion(1)).toBe(2);
    expect(nextTalentDirectionVersion(7)).toBe(8);
    expect(nextTalentDirectionVersion(undefined)).toBe(2);
  });

  it("方向被报告快照引用时只允许停用", () => {
    expect(talentDirectionReferencedIn([{ directionId: "DIR-001" }], "DIR-001")).toBe(true);
    expect(talentDirectionReferencedIn({ nested: { ids: ["x", "DIR-002"] } }, "DIR-002")).toBe(true);
    expect(talentDirectionReferencedIn({ directionId: "DIR-003" }, "DIR-001")).toBe(false);
    expectTalentError(
      () => assertTalentDirectionDeletable("DIR-001", [{ selections: [{ directionId: "DIR-001" }] }]),
      409,
      "该方向已被报告引用",
    );
    expect(() => assertTalentDirectionDeletable("DIR-009", [{ selections: [] }])).not.toThrow();
    // talent_reports 集合不存在时调用方传空数组，按无引用处理。
    expect(() => assertTalentDirectionDeletable("DIR-001", [])).not.toThrow();
  });

  it("方向 requirements 结构忽略脏 JSON", () => {
    expect(
      talentDirectionRequirements({
        requirements: [{ code: "A-01", level: "LV1" }, { code: 1 }, null, "x"],
      }),
    ).toEqual([{ code: "A-01", level: "LV1" }]);
    expect(talentDirectionRequirements({})).toEqual([]);
  });
});

describe("固定注解校验", () => {
  it("编号 = 要素编码-分级编码，编辑不可改身份", () => {
    expect(buildTalentFactorNoteCode("A-01", "LV1")).toBe("A-01-LV1");
    expect(() =>
      assertTalentFactorNoteIdentityImmutable(
        { factorCode: "A-01", levelCode: "LV1" },
        { factorCode: "A-01", levelCode: "LV1" },
      ),
    ).not.toThrow();
    expectTalentError(
      () =>
        assertTalentFactorNoteIdentityImmutable(
          { factorCode: "A-01", levelCode: "LV1" },
          { factorCode: "A-02" },
        ),
      422,
      "注解的要素与分级不可修改",
    );
    expectTalentError(
      () =>
        assertTalentFactorNoteIdentityImmutable(
          { factorCode: "A-01", levelCode: "LV1" },
          { levelCode: "LV2" },
        ),
      422,
      "注解的要素与分级不可修改",
    );
  });

  it("要素必须存在、分级必须启用，分册由要素当前值派生", () => {
    const context = seedContext();
    expect(
      resolveTalentNoteCategory({ factorCode: "A-01", levelCode: "LV1" }, context),
    ).toBe("A");
    expectTalentError(
      () => resolveTalentNoteCategory({ factorCode: "Z-99", levelCode: "LV1" }, context),
      422,
      "要素编码不存在",
    );
    expectTalentError(
      () => resolveTalentNoteCategory({ factorCode: "A-01", levelCode: "LV9" }, seedContext()),
      422,
      "分级不存在或已停用",
    );
  });
});

describe("引用保护", () => {
  const notes = [{ levelCode: "LV1" }, { levelCode: "LV2" }];
  const directions = [{ requirements: [{ code: "A-01", level: "LV3" }] }];

  it("统计注解与方向引用次数", () => {
    expect(collectTalentLevelReferences("LV1", { notes, directions })).toEqual({
      notes: 1,
      directions: 0,
    });
    expect(collectTalentLevelReferences("LV3", { notes, directions })).toEqual({
      notes: 0,
      directions: 1,
    });
    expect(collectTalentLevelReferences("LV4", { notes, directions })).toEqual({
      notes: 0,
      directions: 0,
    });
  });

  it("被引用分级删除返回 409「只允许停用」，未引用可删", () => {
    expectTalentError(
      () => assertTalentLevelDeletable("LV1", { notes, directions }),
      409,
      "只允许停用",
    );
    expectTalentError(
      () => assertTalentLevelDeletable("LV3", { notes, directions }),
      409,
      "只允许停用",
    );
    expect(() => assertTalentLevelDeletable("LV4", { notes, directions })).not.toThrow();
  });
});

describe("档位全局默认唯一", () => {
  const tiers = [
    { id: "t1", isDefault: true, status: "1" as const },
    { id: "t2", isDefault: false, status: "1" as const },
    { id: "t3", isDefault: false, status: "0" as const },
  ];

  it("设置默认档位时其余档位一并置 false", () => {
    const updates = buildTalentTierDefaultUpdates(tiers, "t2");
    expect(updates).toEqual([
      { id: "t1", isDefault: false },
      { id: "t2", isDefault: true },
      { id: "t3", isDefault: false },
    ]);
    expect(updates.filter((update) => update.isDefault)).toHaveLength(1);
  });

  it("停用档位不能设为默认；全局默认必须且只能 1 个", () => {
    expectTalentError(() => buildTalentTierDefaultUpdates(tiers, "t3"), 422, "停用的档位不能设为全局默认");
    expect(() => assertSingleTalentTierDefault([{ isDefault: true }, { isDefault: false }])).not.toThrow();
    expectTalentError(
      () => assertSingleTalentTierDefault([{ isDefault: true }, { isDefault: true }]),
      409,
      "必须且只能有 1 个",
    );
    expectTalentError(() => assertSingleTalentTierDefault([{ isDefault: false }]), 409, "必须且只能有 1 个");
    expect(talentTierUpdateSchema.safeParse({ isDefault: true }).success).toBe(true);
    expect(talentTierUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe("名称解析（不落快照）", () => {
  const libraries = [
    { id: "lib-old", status: "1" as const, syncedAt: "2026-01-01T00:00:00.000Z" },
    { id: "lib-new", status: "1" as const, syncedAt: "2026-02-01T00:00:00.000Z" },
    { id: "lib-off", status: "0" as const, syncedAt: "2026-03-01T00:00:00.000Z" },
  ];
  const factors = [
    { libraryId: "lib-old", code: "A-01", name: "旧名称" },
    { libraryId: "lib-new", code: "A-01", name: "体格生长潜质" },
    { libraryId: "lib-new", code: "A-02", name: "体形发育潜质" },
    { libraryId: "lib-off", code: "A-03", name: "停用库名称" },
  ];

  it("取启用库中 syncedAt 最近的库", () => {
    expect(pickLatestSyncedTalentLibrary(libraries)?.id).toBe("lib-new");
    expect(
      pickLatestSyncedTalentLibrary([{ id: "off", status: "0", syncedAt: "2026-03-01T00:00:00.000Z" }]),
    ).toBeNull();
    expect(pickLatestSyncedTalentLibrary([])).toBeNull();
  });

  it("按最近库解析要素名称，缺失编码回退编码并标记异常", () => {
    const lookup = new Map(
      factors
        .filter((factor) => factor.libraryId === "lib-new")
        .map((factor) => [factor.code, factor.name]),
    );
    const resolved = resolveTalentFactorNames(["A-01", "A-03", "Z-99"], lookup);
    expect(resolved.rows).toEqual([
      { code: "A-01", name: "体格生长潜质", resolved: true },
      { code: "A-03", name: "A-03", resolved: false },
      { code: "Z-99", name: "Z-99", resolved: false },
    ]);
    expect(resolved.anomalies).toEqual(["A-03", "Z-99"]);
  });

  it("分级名称解析找不到时回退编码", () => {
    const lookup = buildTalentLevelNameLookup(seed.levels);
    expect(resolveTalentLevelName(lookup, "LV1")).toBe("常态");
    expect(resolveTalentLevelName(lookup, "LV9")).toBe("LV9");
    expect(resolveTalentCategoryName("A")).toBe("生长发育");
    expect(resolveTalentCategoryName("Z")).toBe("Z");
  });
});

describe("外部文库 Mock 源与幂等合并", () => {
  const source = createMockTalentFactorLibrarySource();

  it("男 0 岁库返回 158 要素 / 1896 槽位 / 27 完整槽位", async () => {
    const payload = await source.fetchLibrary({ gender: "male", age: 0 });
    expect(payload.source).toBe("mock-file");
    expect(payload.factors).toHaveLength(158);
    expect(summarizeTalentFactorSource(payload.factors)).toEqual({
      itemCount: 158,
      slotTotal: 1896,
      filledCount: 27,
      partialCount: 0,
    });
  });

  it("其它性别 / 年龄库仍返回 158 要素，但正文待回填", async () => {
    const payload = await source.fetchLibrary({ gender: "female", age: 1 });
    expect(payload.factors).toHaveLength(158);
    expect(summarizeTalentFactorSource(payload.factors)).toMatchObject({
      itemCount: 158,
      slotTotal: 1896,
      filledCount: 0,
    });
  });

  it("非法分库查询返回 422", async () => {
    await expect(source.fetchLibrary({ gender: "male", age: 19 })).rejects.toMatchObject({
      statusCode: 422,
    });
    await expect(
      source.fetchLibrary({ gender: "unknown" as "male", age: 0 }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it("同源连续合并两次不重复写入，内容变化才更新", async () => {
    const payload = await source.fetchLibrary({ gender: "male", age: 0 });
    const first = planTalentFactorMerge([], payload.factors);
    expect(first.creates).toHaveLength(158);
    expect(first.updates).toHaveLength(0);
    const existing = payload.factors.map((factor, index) => ({ id: `factor-${index}`, ...factor }));
    const second = planTalentFactorMerge(existing, payload.factors);
    expect(second.creates).toHaveLength(0);
    expect(second.updates).toHaveLength(0);
    expect(second.unchanged).toHaveLength(158);
    const changed = payload.factors.map((factor, index) =>
      index === 0 ? { ...factor, name: "更新后的名称" } : factor,
    );
    const third = planTalentFactorMerge(existing, changed);
    expect(third.creates).toHaveLength(0);
    expect(third.updates).toHaveLength(1);
    expect(third.updates[0]?.existingId).toBe("factor-0");
  });

  it("已落库 JSON 键序变化不算内容变化（同步幂等）", async () => {
    const payload = await source.fetchLibrary({ gender: "male", age: 0 });
    const sortKeys = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(sortKeys);
      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.keys(value as Record<string, unknown>)
            .sort()
            .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
        );
      }
      return value;
    };
    // PocketBase 落库后对象键为字母序；这里模拟同一份 slots 的键序变化。
    const existing = payload.factors.map((factor, index) => ({
      id: `factor-${index}`,
      ...factor,
      slots: sortKeys(factor.slots),
    }));
    const plan = planTalentFactorMerge(existing, payload.factors);
    expect(plan.creates).toHaveLength(0);
    expect(plan.updates).toHaveLength(0);
    expect(plan.unchanged).toHaveLength(158);
  });

  it("未同步分库禁止导出 / 再同步", () => {
    expectTalentError(() => assertTalentFactorLibrarySynced(null), 409, "该库尚未同步");
    expectTalentError(
      () => assertTalentFactorLibrarySynced({ syncedAt: "", itemCount: 0 }),
      409,
      "该库尚未同步",
    );
    expect(() =>
      assertTalentFactorLibrarySynced({ syncedAt: "2026-11-16T00:00:00.000Z", itemCount: 158 }),
    ).not.toThrow();
  });
});

describe("种子脚本安全约定", () => {
  it("package.json 登记 talent:rule:seed，种子脚本具备确认门槛且不清库", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(packageJson.scripts?.["talent:rule:seed"]).toBe("node scripts/seed-talent-rule.mjs");
    const seedSource = readFileSync(new URL("../scripts/seed-talent-rule.mjs", import.meta.url), "utf8");
    expect(seedSource).toContain('TALENT_RULE_SEED_CONFIRM !== "rule"');
    expect(seedSource).toContain("禁止在生产环境运行");
    expect(seedSource).not.toContain("clearCollection");
    expect(seedSource).not.toContain(".delete(");
  });
});