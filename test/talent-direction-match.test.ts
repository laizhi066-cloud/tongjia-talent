/**
 * @description M4 方向匹配纯函数测试：命中口径、四键全序排序（含平手链与打乱输入）、
 *   推荐上限与 0 命中回退、档位选择、选择/换档/取消、快照全量与补发增量、边界（停用/重复/空配置）。
 *   对应 docs/specs/M4-matching/spec.md §4 与 §9 UT-M4-01~32（按行为覆盖，不逐条编号）。
 *   数据全部虚构，断言不依赖 PocketBase / 网络。
 * @file test/talent-direction-match.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  TALENT_DIRECTION_RECOMMEND_LIMIT,
  TALENT_DIRECTION_SELECTION_LIMIT,
  type TalentDirectionHit,
  type TalentDirectionSnapshot,
  type TalentDirectionSnapshotHit,
  type TalentMatchDirection,
  type TalentMatchFactor,
  type TalentMatchLevel,
  type TalentMatchTier,
  type TalentSelectionItem,
} from "~~/shared/types/talent-direction";
import {
  assertSelectionLimit,
  buildManualDirectionOptions,
  buildTalentLevelOrders,
  compareByCodePoint,
  compareDirectionHits,
  computeTalentDirectionMatches,
  isValidManualDirectionName,
  matchDirections,
  normalizeManualDirectionName,
  pickManualTier,
  pickTier,
  rankDirectionHits,
  rankHits,
  recommendDirections,
  refreshDirectionSnapshot,
  resolveDirectionRecommendations,
  resolveDirectionSelection,
  resolveRecommendLimit,
  resolveSelection,
  resolveSelectionLimit,
  TalentSelectionLimitError,
} from "~~/server/utils/talent-direction-match";

// ── 虚构夹具：分级 LV1–LV4、档位 T1–T4、方向 DIR-001~ / 要素 E-16 / F-10 / B-34 ──

const LEVEL_ORDERS: Record<string, number> = { LV1: 1, LV2: 2, LV3: 3, LV4: 4 };

const LEVELS: TalentMatchLevel[] = [
  { code: "LV1", sortOrder: 1, status: "1", name: "常态" },
  { code: "LV2", sortOrder: 2, status: "1", name: "优良" },
  { code: "LV3", sortOrder: 3, status: "1", name: "优秀" },
  { code: "LV4", sortOrder: 4, status: "1", name: "卓越" },
];

const TIERS: TalentMatchTier[] = [
  {
    id: "t1",
    code: "T1",
    name: "启蒙",
    sortOrder: 1,
    teacher: "普通老师",
    freq: "每周 1–2 次",
    status: "1",
    isDefault: true,
  },
  {
    id: "t2",
    code: "T2",
    name: "养成",
    sortOrder: 2,
    teacher: "资深老师",
    freq: "每周 2 次",
    status: "1",
  },
  {
    id: "t3",
    code: "T3",
    name: "精进",
    sortOrder: 3,
    teacher: "卓越老师",
    freq: "每周 2–3 次",
    headline: "冲一冲",
    status: "1",
  },
  {
    id: "t4",
    code: "T4",
    name: "冲刺",
    sortOrder: 4,
    teacher: "大师级老师",
    freq: "每周 3 次以上",
    status: "1",
  },
];

function makeDirection(
  input: Pick<TalentMatchDirection, "id" | "code" | "requirements"> &
    Partial<Omit<TalentMatchDirection, "id" | "code" | "requirements">>,
): TalentMatchDirection {
  return {
    name: input.code,
    status: "1",
    version: 1,
    tierIds: ["t1", "t2", "t3"],
    defaultTierId: "t2",
    ...input,
    requirements: input.requirements.map((requirement) => ({ ...requirement })),
  };
}

function makeHit(input: {
  directionId: string;
  code: string;
  hitCount: number;
  total: number;
  hitRate?: number;
}): TalentDirectionHit {
  return {
    directionId: input.directionId,
    code: input.code,
    name: input.code,
    version: 1,
    status: "1",
    requirements: [],
    hitCount: input.hitCount,
    total: input.total,
    hitRate: input.hitRate ?? (input.total > 0 ? input.hitCount / input.total : 0),
    tierIds: [],
    defaultTierId: "",
    emptyRequirements: input.total === 0,
  };
}

function makeSelection(overrides: Partial<TalentSelectionItem> = {}): TalentSelectionItem {
  return {
    directionId: "d1",
    requestId: "",
    custom: false,
    tierId: "t2",
    directionName: "舞蹈家",
    tierName: "养成",
    teacher: "资深老师",
    freq: "每周 2 次",
    manualName: "",
    selectedAt: "2026-11-16T00:00:00.000Z",
    ...overrides,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ── 命中口径 ──────────────────────────────────────────────────────────

describe("matchDirections 命中口径", () => {
  it("按「实际级序 ≥ 要求级序」逐条计命中，未达成记 gap（UT-M4-01）", () => {
    const direction = makeDirection({
      id: "d1",
      code: "DIR-001",
      name: "舞蹈家",
      requirements: [
        { code: "E-16", level: "LV3" },
        { code: "F-10", level: "LV3" },
        { code: "B-34", level: "LV3" },
      ],
    });
    const factors: TalentMatchFactor[] = [
      { code: "E-16", levelCode: "LV4", levelOrder: 4, name: "节奏感知", levelName: "卓越" },
      { code: "F-10", levelCode: "LV3", levelOrder: 3, name: "动作模仿" },
      { code: "B-34", levelCode: "LV2", levelOrder: 2, name: "逻辑推理" },
    ];
    const result = matchDirections(factors, [direction], { levelOrders: LEVEL_ORDERS });
    const hit = result.hits[0]!;
    expect(hit.hitCount).toBe(2);
    expect(hit.total).toBe(3);
    expect(hit.hitRate).toBeCloseTo(2 / 3, 10);
    expect(hit.requirements[0]).toMatchObject({ met: true, gap: 0, actualOrder: 4, needOrder: 3 });
    expect(hit.requirements[1]).toMatchObject({ met: true, gap: 0 });
    expect(hit.requirements[2]).toMatchObject({ met: false, gap: 1, actualOrder: 2, needOrder: 3 });
    expect(hit.requirements[2]!.factorLevel).toBe("LV2");
    expect(result.warnings).toEqual([]);
  });

  it("级序相等算命中（UT-M4-02）", () => {
    const direction = makeDirection({
      id: "d1",
      code: "DIR-001",
      requirements: [{ code: "E-16", level: "LV3" }],
    });
    const result = matchDirections([{ code: "E-16", levelCode: "LV3", levelOrder: 3 }], [direction], {
      levelOrders: LEVEL_ORDERS,
    });
    expect(result.hits[0]!.requirements[0]).toMatchObject({ met: true, gap: 0, actualOrder: 3 });
  });

  it("实际级序低于要求未命中（UT-M4-03）", () => {
    const direction = makeDirection({
      id: "d1",
      code: "DIR-001",
      requirements: [{ code: "E-16", level: "LV3" }],
    });
    const result = matchDirections([{ code: "E-16", levelCode: "LV2", levelOrder: 2 }], [direction], {
      levelOrders: LEVEL_ORDERS,
    });
    expect(result.hits[0]!.requirements[0]).toMatchObject({ met: false, gap: 1, actualOrder: 2 });
  });

  it("要素缺失按未命中：actualOrder=0、gap=needOrder、factorMissing（UT-M4-04）", () => {
    const direction = makeDirection({
      id: "d1",
      code: "DIR-001",
      requirements: [{ code: "E-99", level: "LV3" }],
    });
    const result = matchDirections([], [direction], { levelOrders: LEVEL_ORDERS });
    expect(result.hits[0]!.requirements[0]).toMatchObject({
      met: false,
      actualOrder: 0,
      gap: 3,
      factorMissing: true,
      factorName: "",
      factorLevel: "",
      factorLevelName: "—",
    });
  });

  it("快照 levelOrder 优先于当前分级表（UT-M4-05）", () => {
    const direction = makeDirection({
      id: "d1",
      code: "DIR-001",
      requirements: [{ code: "E-16", level: "LV4" }],
    });
    const result = matchDirections(
      // 快照冻结级序 4，但当前分级表里 LV3 还是 3：命中必须用 4。
      [{ code: "E-16", levelCode: "LV3", levelOrder: 4 }],
      [direction],
      { levelOrders: LEVEL_ORDERS },
    );
    expect(result.hits[0]!.requirements[0]).toMatchObject({ met: true, actualOrder: 4, needOrder: 4 });
  });

  it("levelOrder 缺失时降级按当前分级表反查", () => {
    const direction = makeDirection({
      id: "d1",
      code: "DIR-001",
      requirements: [{ code: "E-16", level: "LV3" }],
    });
    const result = matchDirections([{ code: "E-16", levelCode: "LV3" }], [direction], {
      levelOrders: LEVEL_ORDERS,
    });
    expect(result.hits[0]!.requirements[0]).toMatchObject({ met: true, actualOrder: 3 });
  });

  it("实际分级未知按级序 0 处理并告警 UNKNOWN_FACTOR_LEVEL", () => {
    const direction = makeDirection({
      id: "d1",
      code: "DIR-001",
      requirements: [{ code: "E-16", level: "LV2" }],
    });
    const result = matchDirections([{ code: "E-16", levelCode: "LV9" }], [direction], {
      levelOrders: LEVEL_ORDERS,
    });
    expect(result.hits[0]!.requirements[0]).toMatchObject({ met: false, actualOrder: 0, gap: 2 });
    expect(result.warnings.map((warning) => warning.code)).toContain("UNKNOWN_FACTOR_LEVEL");
  });

  it("重复 requirement 首条生效、total 去重并告警（UT-M4-06）", () => {
    const direction = makeDirection({
      id: "d1",
      code: "DIR-001",
      requirements: [
        { code: "E-16", level: "LV2" },
        { code: "E-16", level: "LV4" },
      ],
    });
    const result = matchDirections([{ code: "E-16", levelCode: "LV4", levelOrder: 4 }], [direction], {
      levelOrders: LEVEL_ORDERS,
    });
    const hit = result.hits[0]!;
    expect(hit.total).toBe(1);
    expect(hit.hitCount).toBe(1);
    expect(hit.requirements).toHaveLength(1);
    expect(hit.requirements[0]!.level).toBe("LV2");
    expect(result.warnings.map((warning) => warning.code)).toContain("DUPLICATE_REQUIREMENT");
  });

  it("重复 factor 首条生效并告警 DUPLICATE_FACTOR（UT-M4-07）", () => {
    const direction = makeDirection({
      id: "d1",
      code: "DIR-001",
      requirements: [{ code: "E-16", level: "LV3" }],
    });
    const result = matchDirections(
      [
        { code: "E-16", levelCode: "LV1", levelOrder: 1 },
        { code: "E-16", levelCode: "LV4", levelOrder: 4 },
      ],
      [direction],
      { levelOrders: LEVEL_ORDERS },
    );
    expect(result.hits[0]!.requirements[0]).toMatchObject({ met: false, actualOrder: 1 });
    expect(result.warnings.filter((warning) => warning.code === "DUPLICATE_FACTOR")).toHaveLength(1);
  });

  it("要求分级停用视为未命中且计入分母（UT-M4-08）", () => {
    const direction = makeDirection({
      id: "d1",
      code: "DIR-001",
      requirements: [{ code: "E-16", level: "LV4" }],
    });
    const result = matchDirections([{ code: "E-16", levelCode: "LV4", levelOrder: 4 }], [direction], {
      levelOrders: LEVEL_ORDERS,
      disabledLevelCodes: ["LV4"],
    });
    const hit = result.hits[0]!;
    expect(hit.requirements[0]).toMatchObject({ met: false, levelDisabled: true });
    expect(hit.total).toBe(1);
    expect(hit.hitCount).toBe(0);
    expect(hit.hitRate).toBe(0);
    expect(result.warnings.map((warning) => warning.code)).toContain("LEVEL_DISABLED");
  });

  it("未知要求分级按未命中且不判 levelDisabled", () => {
    const direction = makeDirection({
      id: "d1",
      code: "DIR-001",
      requirements: [{ code: "E-16", level: "LV9" }],
    });
    const result = matchDirections([{ code: "E-16", levelCode: "LV4", levelOrder: 4 }], [direction], {
      levelOrders: LEVEL_ORDERS,
      disabledLevelCodes: ["LV9"],
    });
    expect(result.hits[0]!.requirements[0]).toMatchObject({
      met: false,
      needOrder: 0,
      levelDisabled: false,
      gap: 0,
    });
    expect(result.warnings.map((warning) => warning.code)).toContain("UNKNOWN_LEVEL");
    expect(result.warnings.map((warning) => warning.code)).not.toContain("LEVEL_DISABLED");
  });

  it("0 配置方向 total=0、命中率 0、标 emptyRequirements 且不进推荐（UT-M4-09）", () => {
    const emptyDirection = makeDirection({ id: "d1", code: "DIR-001", requirements: [] });
    const matchedDirection = makeDirection({
      id: "d2",
      code: "DIR-002",
      requirements: [{ code: "E-16", level: "LV2" }],
    });
    const result = matchDirections(
      [{ code: "E-16", levelCode: "LV4", levelOrder: 4 }],
      [emptyDirection, matchedDirection],
      { levelOrders: LEVEL_ORDERS },
    );
    const emptyHit = result.hits.find((hit) => hit.directionId === "d1")!;
    expect(emptyHit).toMatchObject({ total: 0, hitCount: 0, hitRate: 0, emptyRequirements: true });
    expect(result.recommended.map((hit) => hit.directionId)).toEqual(["d2"]);
    expect(result.warnings.map((warning) => warning.code)).toContain("EMPTY_REQUIREMENTS");
  });

  it("停用方向默认不评估，includeDisabledDirections 才评估（UT-M4-16）", () => {
    const direction = makeDirection({
      id: "d1",
      code: "DIR-001",
      status: "0",
      requirements: [{ code: "E-16", level: "LV2" }],
    });
    const factors: TalentMatchFactor[] = [{ code: "E-16", levelCode: "LV4", levelOrder: 4 }];
    const skipped = matchDirections(factors, [direction], { levelOrders: LEVEL_ORDERS });
    expect(skipped.hits).toEqual([]);
    expect(skipped.noDirections).toBe(true);
    expect(skipped.emptyReason).toBe("NO_DIRECTIONS");

    const included = matchDirections(factors, [direction], {
      levelOrders: LEVEL_ORDERS,
      includeDisabledDirections: true,
    });
    expect(included.hits).toHaveLength(1);
    expect(included.hits[0]!.status).toBe("0");
  });

  it("重复方向编码仅首条生效并告警 DUPLICATE_DIRECTION_CODE", () => {
    const first = makeDirection({
      id: "d1",
      code: "DIR-001",
      requirements: [{ code: "E-16", level: "LV2" }],
    });
    const duplicate = makeDirection({
      id: "d2",
      code: "DIR-001",
      requirements: [{ code: "E-16", level: "LV4" }],
    });
    const result = matchDirections([{ code: "E-16", levelCode: "LV4", levelOrder: 4 }], [first, duplicate], {
      levelOrders: LEVEL_ORDERS,
    });
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]!.directionId).toBe("d1");
    expect(result.warnings.map((warning) => warning.code)).toContain("DUPLICATE_DIRECTION_CODE");
  });

  it("不修改入参（数组与对象均保持原值）", () => {
    const directions = [
      makeDirection({
        id: "d1",
        code: "DIR-001",
        requirements: [
          { code: "E-16", level: "LV2" },
          { code: "E-16", level: "LV4" },
          { code: "F-10", level: "LV3" },
        ],
      }),
    ];
    const factors: TalentMatchFactor[] = [
      { code: "E-16", levelCode: "LV4", levelOrder: 4 },
      { code: "E-16", levelCode: "LV1", levelOrder: 1 },
    ];
    const beforeDirections = clone(directions);
    const beforeFactors = clone(factors);
    matchDirections(factors, directions, { levelOrders: LEVEL_ORDERS });
    expect(directions).toEqual(beforeDirections);
    expect(factors).toEqual(beforeFactors);
  });
});

// ── 四键全序排序 ──────────────────────────────────────────────────────

describe("rankDirectionHits 四键全序", () => {
  it("命中数降序优先于命中率（UT-M4-10）", () => {
    const four = makeHit({ directionId: "d1", code: "DIR-001", hitCount: 4, total: 6 });
    const three = makeHit({ directionId: "d2", code: "DIR-002", hitCount: 3, total: 6 });
    expect(rankDirectionHits([three, four]).map((hit) => hit.directionId)).toEqual(["d1", "d2"]);
  });

  it("命中数相同按命中率降序，命中率用整数交叉相乘（UT-M4-11 等价场景）", () => {
    const perfect = makeHit({ directionId: "d1", code: "DIR-002", hitCount: 2, total: 2 });
    const lower = makeHit({ directionId: "d2", code: "DIR-001", hitCount: 2, total: 3 });
    expect(rankDirectionHits([lower, perfect]).map((hit) => hit.directionId)).toEqual(["d1", "d2"]);
  });

  it("命中率高的在前，不被命中数以外的浮点差异影响", () => {
    const higherRate = makeHit({ directionId: "d1", code: "DIR-001", hitCount: 2, total: 2 });
    const lowerRate = makeHit({ directionId: "d2", code: "DIR-002", hitCount: 2, total: 4 });
    expect(rankDirectionHits([lowerRate, higherRate]).map((hit) => hit.directionId)).toEqual([
      "d1",
      "d2",
    ]);
  });

  it("hitRate 字段不参与排序（浮点不参与比较）", () => {
    // 真实比值 2/2 > 2/4；把 hitRate 字段写成相反值也不应影响顺序。
    const realHigher = makeHit({
      directionId: "d1",
      code: "DIR-001",
      hitCount: 2,
      total: 2,
      hitRate: 0.1,
    });
    const realLower = makeHit({
      directionId: "d2",
      code: "DIR-002",
      hitCount: 2,
      total: 4,
      hitRate: 0.99,
    });
    expect(rankDirectionHits([realLower, realHigher]).map((hit) => hit.directionId)).toEqual([
      "d1",
      "d2",
    ]);
    // compareDirectionHits 只读 hitCount/total。
    expect(compareDirectionHits(realLower, realHigher)).toBeGreaterThan(0);
  });

  it("全平手按方向编码 Unicode 码位升序（UT-M4-12）", () => {
    const second = makeHit({ directionId: "d2", code: "DIR-002", hitCount: 1, total: 2 });
    const first = makeHit({ directionId: "d1", code: "DIR-001", hitCount: 1, total: 2 });
    expect(rankDirectionHits([second, first]).map((hit) => hit.code)).toEqual([
      "DIR-001",
      "DIR-002",
    ]);
    expect(compareByCodePoint("DIR-001", "DIR-002")).toBeLessThan(0);
    expect(compareByCodePoint("DIR-002", "DIR-001")).toBeGreaterThan(0);
  });

  it("编码也相同时按 directionId 兜底，保证全序", () => {
    const b = makeHit({ directionId: "d_b", code: "DIR-001", hitCount: 1, total: 2 });
    const a = makeHit({ directionId: "d_a", code: "DIR-001", hitCount: 1, total: 2 });
    expect(rankDirectionHits([b, a]).map((hit) => hit.directionId)).toEqual(["d_a", "d_b"]);
  });

  it("打乱输入顺序结果一致", () => {
    const hits = [
      makeHit({ directionId: "d1", code: "DIR-001", hitCount: 4, total: 6 }),
      makeHit({ directionId: "d2", code: "DIR-002", hitCount: 4, total: 6 }),
      makeHit({ directionId: "d3", code: "DIR-003", hitCount: 3, total: 5 }),
      makeHit({ directionId: "d4", code: "DIR-004", hitCount: 1, total: 2 }),
      makeHit({ directionId: "d5", code: "DIR-005", hitCount: 2, total: 4 }),
      makeHit({ directionId: "d6", code: "DIR-006", hitCount: 2, total: 5 }),
      makeHit({ directionId: "d7", code: "DIR-000", hitCount: 0, total: 3 }),
    ];
    const expected = rankDirectionHits(hits).map((hit) => hit.directionId);
    const permutations = [
      [6, 4, 2, 0, 5, 3, 1],
      [3, 0, 6, 1, 5, 2, 4],
      [1, 2, 3, 4, 5, 6, 0],
    ];
    for (const order of permutations) {
      const shuffled = order.map((index) => hits[index]!);
      expect(rankDirectionHits(shuffled).map((hit) => hit.directionId)).toEqual(expected);
    }
  });

  it("排序返回新数组且不改入参（UT-M4-26）", () => {
    const hits = [
      makeHit({ directionId: "d1", code: "DIR-001", hitCount: 1, total: 2 }),
      makeHit({ directionId: "d2", code: "DIR-002", hitCount: 2, total: 2 }),
    ];
    const inputOrder = hits.map((hit) => hit.directionId);
    const ranked = rankDirectionHits(hits);
    expect(ranked).not.toBe(hits);
    expect(hits.map((hit) => hit.directionId)).toEqual(inputOrder);
    expect(rankHits).toBe(rankDirectionHits);
  });
});

// ── 推荐 / 0 命中回退 / 上限 ──────────────────────────────────────────

describe("resolveDirectionRecommendations 推荐与 0 命中回退", () => {
  it("按上限截断且 totalCandidates 为命中方向数（UT-M4-13）", () => {
    const hits = Array.from({ length: 8 }, (_, index) =>
      makeHit({
        directionId: `d${index + 1}`,
        code: `DIR-${String(index + 1).padStart(3, "0")}`,
        hitCount: 8 - index,
        total: 10,
      }),
    );
    const result = resolveDirectionRecommendations(hits, { recommendLimit: 5 });
    expect(result.items).toHaveLength(5);
    expect(result.recommendLimit).toBe(5);
    expect(result.fallback).toBe(false);
    expect(result.totalCandidates).toBe(8);
    expect(result.items.map((hit) => hit.directionId)).toEqual(["d1", "d2", "d3", "d4", "d5"]);
    expect(result.items.every((item) => item.fallback === false)).toBe(true);
  });

  it("上限非法（0 / 负数 / 非整数）回退常量 5", () => {
    const hits = Array.from({ length: 8 }, (_, index) =>
      makeHit({
        directionId: `d${index + 1}`,
        code: `DIR-${String(index + 1).padStart(3, "0")}`,
        hitCount: 8 - index,
        total: 10,
      }),
    );
    for (const invalid of [0, -1, 3.5, Number.NaN]) {
      const result = resolveDirectionRecommendations(hits, { recommendLimit: invalid });
      expect(result.recommendLimit).toBe(TALENT_DIRECTION_RECOMMEND_LIMIT);
      expect(result.items).toHaveLength(5);
    }
    expect(resolveRecommendLimit(2)).toBe(2);
    expect(resolveRecommendLimit(undefined)).toBe(5);
    expect(resolveRecommendLimit(21)).toBe(5);
  });

  it("全部 0 命中回退为全部有效方向并受上限截断，每项标 fallback（UT-M4-14）", () => {
    const hits = Array.from({ length: 6 }, (_, index) =>
      makeHit({
        directionId: `d${index + 1}`,
        code: `DIR-${String(index + 1).padStart(3, "0")}`,
        hitCount: 0,
        total: 3,
      }),
    );
    const limited = resolveDirectionRecommendations(hits);
    expect(limited.fallback).toBe(true);
    expect(limited.items).toHaveLength(5);
    expect(limited.totalCandidates).toBe(6);
    expect(limited.emptyReason).toBeNull();
    expect(limited.items.every((item) => item.fallback === true)).toBe(true);

    const twoOnly = resolveDirectionRecommendations(hits, { recommendLimit: 2 });
    expect(twoOnly.items).toHaveLength(2);
  });

  it("无方向 → NO_DIRECTIONS；有方向但全 0 配置 → NO_ENABLED_DIRECTIONS（UT-M4-15）", () => {
    const empty = resolveDirectionRecommendations([]);
    expect(empty.items).toEqual([]);
    expect(empty.fallback).toBe(false);
    expect(empty.emptyReason).toBe("NO_DIRECTIONS");
    expect(empty.totalCandidates).toBe(0);

    const zeroConfig = resolveDirectionRecommendations([
      makeHit({ directionId: "d1", code: "DIR-001", hitCount: 0, total: 0 }),
    ]);
    expect(zeroConfig.items).toEqual([]);
    expect(zeroConfig.fallback).toBe(false);
    expect(zeroConfig.emptyReason).toBe("NO_ENABLED_DIRECTIONS");
  });

  it("matchDirections 结果带推荐上限与空态字段", () => {
    const directions = [
      makeDirection({
        id: "d1",
        code: "DIR-001",
        requirements: [{ code: "E-16", level: "LV2" }],
      }),
      makeDirection({
        id: "d2",
        code: "DIR-002",
        requirements: [{ code: "E-16", level: "LV2" }],
      }),
      makeDirection({
        id: "d3",
        code: "DIR-003",
        requirements: [{ code: "E-16", level: "LV2" }],
      }),
    ];
    const result = matchDirections(
      [{ code: "E-16", levelCode: "LV4", levelOrder: 4 }],
      directions,
      { levelOrders: LEVEL_ORDERS, recommendLimit: 2 },
    );
    expect(result.recommendLimit).toBe(2);
    expect(result.recommended).toHaveLength(2);
    expect(result.recommended.map((hit) => hit.directionId)).toEqual(["d1", "d2"]);
    expect(result.noDirections).toBe(false);
    expect(result.totalDirections).toBe(3);
    expect(result.evaluatedDirections).toBe(3);

    const empty = matchDirections([], [], { levelOrders: LEVEL_ORDERS });
    expect(empty.noDirections).toBe(true);
    expect(empty.emptyReason).toBe("NO_DIRECTIONS");
    expect(empty.recommended).toEqual([]);
  });
});

// ── 快照：全量计算 ────────────────────────────────────────────────────

interface SnapshotFixture {
  factors: TalentMatchFactor[];
  directions: TalentMatchDirection[];
  levels: TalentMatchLevel[];
  tiers: TalentMatchTier[];
}

function buildSnapshotFixture(): SnapshotFixture {
  return {
    factors: [
      { code: "E-16", levelCode: "LV4", levelOrder: 4, name: "节奏感知", levelName: "卓越" },
      { code: "F-10", levelCode: "LV3", levelOrder: 3, name: "动作模仿", levelName: "优秀" },
      { code: "B-34", levelCode: "LV4", levelOrder: 4, name: "逻辑推理", levelName: "卓越" },
    ],
    directions: [
      makeDirection({
        id: "d1",
        code: "DIR-001",
        name: "舞蹈家",
        version: 3,
        requirements: [
          { code: "E-16", level: "LV3" }, // 命中
          { code: "F-10", level: "LV4" }, // 差 1 级
        ],
        tierIds: ["t1", "t3"],
        defaultTierId: "t3",
      }),
      makeDirection({
        id: "d2",
        code: "DIR-002",
        name: "音乐家",
        version: 1,
        requirements: [{ code: "B-34", level: "LV2" }], // 1/1
      }),
      makeDirection({
        id: "d3",
        code: "DIR-003",
        name: "逻辑思维",
        requirements: [],
      }),
      makeDirection({
        id: "d4",
        code: "DIR-004",
        name: "停用方向",
        status: "0",
        requirements: [{ code: "E-16", level: "LV2" }],
      }),
      makeDirection({
        id: "d5",
        code: "DIR-005",
        name: "音乐家二",
        requirements: [{ code: "B-34", level: "LV3" }], // 1/1
      }),
    ],
    levels: [
      { code: "LV1", sortOrder: 1, status: "1", name: "常态" },
      { code: "LV2", sortOrder: 2, status: "1", name: "优良" },
      { code: "LV3", sortOrder: 3, status: "1", name: "优秀" },
      { code: "LV4", sortOrder: 4, status: "1", name: "卓越" },
      { code: "LV5", sortOrder: 5, status: "0", name: "停用分级" },
      { code: "", sortOrder: 9, status: "1", name: "旧行" },
    ],
    tiers: [
      TIERS[0]!,
      TIERS[1]!,
      { ...TIERS[2]!, status: "0" },
      TIERS[3]!,
    ],
  };
}

describe("computeTalentDirectionMatches 快照生成", () => {
  it("输出 9 个顶层键，方向只含启用方向且包含 0 命中/0 配置（UT-M4-27）", () => {
    const fixture = buildSnapshotFixture();
    const snapshot = computeTalentDirectionMatches({
      ...fixture,
      version: 2,
      at: "2026-11-16T10:00:00.000Z",
      operatorId: "u_demo_1",
      operatorName: "管理员示例",
    });

    expect(Object.keys(snapshot).sort()).toEqual([
      "at",
      "directions",
      "levelOrders",
      "operatorId",
      "operatorName",
      "recommendLimit",
      "selectionLimit",
      "tiers",
      "version",
    ]);
    expect(snapshot).toMatchObject({
      version: 2,
      at: "2026-11-16T10:00:00.000Z",
      operatorId: "u_demo_1",
      operatorName: "管理员示例",
      recommendLimit: 5,
      selectionLimit: 3,
    });
    // 停用方向不进快照；0 配置方向仍然在。
    expect(snapshot.directions.map((hit) => hit.directionId)).toEqual(["d2", "d5", "d1", "d3"]);
    expect(snapshot.directions.find((hit) => hit.directionId === "d3")!.total).toBe(0);
    expect(snapshot.directions.find((hit) => hit.directionId === "d1")!.hitCount).toBe(1);
    // 停用分级保留在 levelOrders（要求侧需要判定停用）；空 code 旧行被过滤。
    expect(snapshot.levelOrders).toEqual({ LV1: 1, LV2: 2, LV3: 3, LV4: 4, LV5: 5 });
    // 档位只冻结启用项，按 sortOrder 升序。
    expect(snapshot.tiers.map((tier) => tier.id)).toEqual(["t1", "t2", "t4"]);
    expect(snapshot.tiers[0]).toMatchObject({
      id: "t1",
      code: "T1",
      name: "启蒙",
      teacher: "普通老师",
      freq: "每周 1–2 次",
      sortOrder: 1,
    });
    expect(Object.keys(snapshot.tiers[0]!).sort()).toEqual([
      "code",
      "freq",
      "headline",
      "id",
      "name",
      "sortOrder",
      "teacher",
    ]);
  });

  it("方向与 requirement 字段严格按快照契约，诊断字段不落快照", () => {
    const fixture = buildSnapshotFixture();
    const snapshot = computeTalentDirectionMatches({
      ...fixture,
      version: 1,
      at: "2026-11-16T10:00:00.000Z",
      operatorId: "u1",
      operatorName: "审核",
    });
    const direction = snapshot.directions.find((hit) => hit.directionId === "d1")!;
    expect(Object.keys(direction).sort()).toEqual([
      "code",
      "defaultTierId",
      "directionId",
      "hitCount",
      "hitRate",
      "name",
      "requirements",
      "tierIds",
      "total",
      "version",
    ]);
    expect(Object.keys(direction.requirements[0]!).sort()).toEqual([
      "actualOrder",
      "code",
      "factorLevel",
      "factorName",
      "gap",
      "level",
      "met",
      "needOrder",
    ]);
    expect(direction.requirements[0]).toEqual({
      code: "E-16",
      level: "LV3",
      factorName: "节奏感知",
      factorLevel: "LV4",
      actualOrder: 4,
      needOrder: 3,
      met: true,
      gap: 0,
    });
    expect(direction.requirements[1]).toMatchObject({ met: false, gap: 1, actualOrder: 3, needOrder: 4 });
    // 方向 tierIds 与发布时启用档位求交：t3 已停用被剔除，defaultTierId 保留冻结值。
    expect(direction.tierIds).toEqual(["t1"]);
    expect(direction.defaultTierId).toBe("t3");
  });

  it("快照上限按注入值冻结，非法值回退常量", () => {
    const fixture = buildSnapshotFixture();
    const custom = computeTalentDirectionMatches({
      ...fixture,
      recommendLimit: 2,
      selectionLimit: 2,
      version: 1,
      at: "2026-11-16T10:00:00.000Z",
      operatorId: "u1",
      operatorName: "审核",
    });
    expect(custom.recommendLimit).toBe(2);
    expect(custom.selectionLimit).toBe(2);

    const fallback = computeTalentDirectionMatches({
      ...fixture,
      recommendLimit: 0,
      selectionLimit: -3,
      version: 1,
      at: "2026-11-16T10:00:00.000Z",
      operatorId: "u1",
      operatorName: "审核",
    });
    expect(fallback.recommendLimit).toBe(TALENT_DIRECTION_RECOMMEND_LIMIT);
    expect(fallback.selectionLimit).toBe(TALENT_DIRECTION_SELECTION_LIMIT);
  });

  it("levelOrders 由分级表构建并过滤空编码/非法级序", () => {
    const levelOrders = buildTalentLevelOrders([
      { code: "LV1", sortOrder: 1, status: "1" },
      { code: "LV2", sortOrder: 2, status: "1" },
      { code: "LV2", sortOrder: 9, status: "1" },
      { code: "LV3", sortOrder: 0, status: "1" },
      { code: "", sortOrder: 4, status: "1" },
    ]);
    expect(levelOrders).toEqual({ LV1: 1, LV2: 2 });
  });
});

// ── 快照：补发增量 ────────────────────────────────────────────────────

function buildRefreshBase(): TalentDirectionSnapshot {
  const direction = makeDirection({
    id: "d1",
    code: "DIR-001",
    name: "舞蹈家",
    requirements: [
      { code: "E-16", level: "LV3" },
      { code: "F-10", level: "LV3" },
    ],
    tierIds: ["t1", "t2"],
    defaultTierId: "t1",
  });
  return computeTalentDirectionMatches({
    factors: [
      { code: "E-16", levelCode: "LV2", levelOrder: 2 },
      { code: "F-10", levelCode: "LV3", levelOrder: 3 },
    ],
    directions: [direction],
    tiers: TIERS,
    levels: LEVELS,
    version: 1,
    at: "2026-11-16T00:00:00.000Z",
    operatorId: "u1",
    operatorName: "审核",
  });
}

describe("refreshDirectionSnapshot 补发增量", () => {
  it("只重算受影响 requirement，旧命中与实际级序原样保留（UT-M4-28）", () => {
    const base = buildRefreshBase();
    const baseDirection = base.directions[0]!;
    expect(baseDirection).toMatchObject({ hitCount: 1, total: 2 });
    expect(baseDirection.requirements[0]).toMatchObject({ actualOrder: 2, met: false, gap: 1 });
    expect(baseDirection.requirements[1]).toMatchObject({ actualOrder: 3, met: true, gap: 0 });

    const refreshed = refreshDirectionSnapshot(
      base,
      [
        { code: "E-16", levelCode: "LV4", levelOrder: 4 },
        // F-10 的当前值已变化，但未列入 affected，必须保持快照原值。
        { code: "F-10", levelCode: "LV1", levelOrder: 1 },
      ],
      ["E-16"],
    );
    const direction = refreshed.directions[0]!;
    expect(direction.requirements[0]).toMatchObject({ actualOrder: 4, met: true, gap: 0 });
    expect(direction.requirements[1]).toMatchObject({ actualOrder: 3, met: true, gap: 0 });
    expect(direction.hitCount).toBe(2);
    expect(direction.hitRate).toBe(1);
    // envelope 未覆盖 → 保持 base。
    expect(refreshed.version).toBe(base.version);
    expect(refreshed.at).toBe(base.at);
  });

  it("affected 为空时与 base 完全一致（除 envelope 覆盖），且不改 base（UT-M4-29）", () => {
    const base = buildRefreshBase();
    const before = clone(base);
    const refreshed = refreshDirectionSnapshot(base, [], []);
    expect(refreshed).toEqual(base);

    const enveloped = refreshDirectionSnapshot(base, [], [], {
      version: 2,
      at: "2026-11-16T11:00:00.000Z",
      operatorId: "u2",
      operatorName: "审核二",
    });
    expect(enveloped).toMatchObject({
      version: 2,
      at: "2026-11-16T11:00:00.000Z",
      operatorId: "u2",
      operatorName: "审核二",
    });
    expect({ ...enveloped, version: base.version, at: base.at, operatorId: base.operatorId, operatorName: base.operatorName }).toEqual(base);
    expect(base).toEqual(before);
  });

  it("要素缺失时受影响 requirement 按 actualOrder=0/gap=needOrder 重算", () => {
    const base = buildRefreshBase();
    const refreshed = refreshDirectionSnapshot(base, [], ["E-16"]);
    const requirement = refreshed.directions[0]!.requirements[0]!;
    expect(requirement).toMatchObject({ actualOrder: 0, met: false, gap: 3 });
    expect(refreshed.directions[0]!.hitCount).toBe(1);
  });

  it("重算后按四键全序重排（跨方向）", () => {
    const fixture = buildSnapshotFixture();
    const base = computeTalentDirectionMatches({
      ...fixture,
      version: 1,
      at: "2026-11-16T00:00:00.000Z",
      operatorId: "u1",
      operatorName: "审核",
    });
    expect(base.directions.map((hit) => hit.directionId)).toEqual(["d2", "d5", "d1", "d3"]);
    const nextFactors = fixture.factors.map((factor) =>
      factor.code === "F-10" ? { ...factor, levelCode: "LV4", levelOrder: 4 } : factor,
    );
    const refreshed = refreshDirectionSnapshot(base, nextFactors, ["F-10"]);
    // DIR-001 由 1/2 升到 2/2，进入并列命中数 2 的最高命中率组。
    const direction = refreshed.directions.find((hit) => hit.directionId === "d1")!;
    expect(direction.hitCount).toBe(2);
    expect(refreshed.directions[0]!.hitCount).toBeLessThanOrEqual(direction.hitCount);
    expect(refreshed.directions.map((hit) => hit.directionId).indexOf("d1")).toBeLessThan(
      refreshed.directions.map((hit) => hit.directionId).indexOf("d3"),
    );
  });
});

// ── 快照读取：推荐与自填候选 ──────────────────────────────────────────

function makeSnapshotHit(input: {
  directionId: string;
  code: string;
  name?: string;
  hitCount: number;
  total: number;
}): TalentDirectionSnapshotHit {
  return {
    directionId: input.directionId,
    code: input.code,
    name: input.name ?? input.code,
    version: 1,
    tierIds: ["t1"],
    defaultTierId: "t1",
    total: input.total,
    hitCount: input.hitCount,
    hitRate: input.total > 0 ? input.hitCount / input.total : 0,
    requirements: [],
  };
}

function makeSnapshot(
  overrides: Partial<TalentDirectionSnapshot> = {},
): TalentDirectionSnapshot {
  return {
    version: 1,
    at: "2026-11-16T00:00:00.000Z",
    operatorId: "u1",
    operatorName: "审核",
    recommendLimit: 5,
    selectionLimit: 3,
    levelOrders: { ...LEVEL_ORDERS },
    tiers: [],
    directions: [],
    ...overrides,
  };
}

describe("recommendDirections 读取冻结快照", () => {
  it("按快照 recommendLimit 截断，不用常量 5（UT-M4-30）", () => {
    const snapshot = makeSnapshot({
      recommendLimit: 2,
      directions: [
        makeSnapshotHit({ directionId: "d1", code: "DIR-001", hitCount: 4, total: 5 }),
        makeSnapshotHit({ directionId: "d2", code: "DIR-002", hitCount: 3, total: 5 }),
        makeSnapshotHit({ directionId: "d3", code: "DIR-003", hitCount: 2, total: 5 }),
      ],
    });
    const result = recommendDirections(snapshot);
    expect(result.recommendLimit).toBe(2);
    expect(result.items.map((hit) => hit.directionId)).toEqual(["d1", "d2"]);
    expect(result.totalCandidates).toBe(3);
    expect(result.fallback).toBe(false);
  });

  it("显式 options 上限优先于快照，非法快照值回退常量", () => {
    const snapshot = makeSnapshot({
      recommendLimit: 3,
      directions: [
        makeSnapshotHit({ directionId: "d1", code: "DIR-001", hitCount: 4, total: 5 }),
        makeSnapshotHit({ directionId: "d2", code: "DIR-002", hitCount: 3, total: 5 }),
      ],
    });
    expect(recommendDirections(snapshot, { recommendLimit: 1 }).items).toHaveLength(1);

    const invalid = makeSnapshot({
      recommendLimit: 0,
      directions: Array.from({ length: 6 }, (_, index) =>
        makeSnapshotHit({
          directionId: `d${index + 1}`,
          code: `DIR-${String(index + 1).padStart(3, "0")}`,
          hitCount: 6 - index,
          total: 10,
        }),
      ),
    });
    const result = recommendDirections(invalid);
    expect(result.recommendLimit).toBe(TALENT_DIRECTION_RECOMMEND_LIMIT);
    expect(result.items).toHaveLength(5);
  });

  it("快照全 0 命中回退并受快照上限截断", () => {
    const snapshot = makeSnapshot({
      recommendLimit: 3,
      directions: Array.from({ length: 6 }, (_, index) =>
        makeSnapshotHit({
          directionId: `d${index + 1}`,
          code: `DIR-${String(index + 1).padStart(3, "0")}`,
          hitCount: 0,
          total: 4,
        }),
      ),
    });
    const result = recommendDirections(snapshot);
    expect(result.fallback).toBe(true);
    expect(result.items).toHaveLength(3);
    expect(result.items.every((item) => item.fallback)).toBe(true);
  });

  it("空快照 / 全 0 配置分别给出 NO_DIRECTIONS 与 NO_ENABLED_DIRECTIONS", () => {
    expect(recommendDirections(makeSnapshot()).emptyReason).toBe("NO_DIRECTIONS");
    const zeroConfig = makeSnapshot({
      directions: [makeSnapshotHit({ directionId: "d1", code: "DIR-001", hitCount: 0, total: 0 })],
    });
    expect(recommendDirections(zeroConfig).emptyReason).toBe("NO_ENABLED_DIRECTIONS");
  });
});

describe("buildManualDirectionOptions 自填候选", () => {
  it("按名称拼音（zh-Hans-CN）升序，名称相同按 id 兜底（UT-M4-31）", () => {
    const snapshot = makeSnapshot({
      directions: [
        makeSnapshotHit({ directionId: "d3", code: "DIR-003", name: "舞蹈家", hitCount: 1, total: 2 }),
        makeSnapshotHit({ directionId: "d1", code: "DIR-001", name: "冰球", hitCount: 0, total: 2 }),
        makeSnapshotHit({ directionId: "d2", code: "DIR-002", name: "编程启蒙", hitCount: 0, total: 2 }),
        makeSnapshotHit({ directionId: "d0", code: "DIR-000", name: "冰球", hitCount: 0, total: 2 }),
      ],
    });
    expect(buildManualDirectionOptions(snapshot)).toEqual([
      { directionId: "d2", name: "编程启蒙" },
      { directionId: "d0", name: "冰球" },
      { directionId: "d1", name: "冰球" },
      { directionId: "d3", name: "舞蹈家" },
    ]);
    expect(buildManualDirectionOptions(makeSnapshot())).toEqual([]);
  });
});

// ── 档位选择 ──────────────────────────────────────────────────────────

describe("pickTier / pickManualTier", () => {
  const direction = { tierIds: ["t1", "t2", "t3"], defaultTierId: "t2" };

  it("requested → current → default → 候选第一条的优先级（UT-M4-17）", () => {
    expect(pickTier(direction, TIERS, { requestedTierId: "t3" })?.id).toBe("t3");
    expect(pickTier(direction, TIERS, { currentTierId: "t1" })?.id).toBe("t1");
    expect(pickTier(direction, TIERS)?.id).toBe("t2");
    // 非法 requested 回退 current / default；current 也非法时回退 default。
    expect(pickTier(direction, TIERS, { requestedTierId: "t9", currentTierId: "t1" })?.id).toBe("t1");
    expect(pickTier(direction, TIERS, { requestedTierId: "t9", currentTierId: "t9" })?.id).toBe("t2");
    // 候选顺序只由 sortOrder 决定，不受输入数组顺序影响。
    const reversed = [...TIERS].reverse();
    expect(pickTier({ tierIds: ["t1", "t3"], defaultTierId: "t9" }, reversed)?.id).toBe("t1");
  });

  it("候选为空返回 null（方向档位全部停用 / 无交集）（UT-M4-18）", () => {
    const disabledTiers = TIERS.map((tier) => ({ ...tier, status: "0" as const }));
    expect(pickTier(direction, disabledTiers)).toBeNull();
    expect(pickTier({ tierIds: ["t9"], defaultTierId: "t9" }, TIERS)).toBeNull();
  });

  it("自填方向取全局默认档位预选，requested 优先（UT-M4-32）", () => {
    expect(pickManualTier(TIERS)?.id).toBe("t1");
    expect(pickManualTier(TIERS, { requestedTierId: "t3" })?.id).toBe("t3");
    expect(pickManualTier(TIERS, { currentTierId: "t4" })?.id).toBe("t4");
    expect(pickManualTier(TIERS.map((tier) => ({ ...tier, status: "0" as const })))).toBeNull();
    // 全局默认档位停用后回退第一个启用档位。
    const withoutDefault = TIERS.map((tier) => ({ ...tier, isDefault: false }));
    expect(pickManualTier(withoutDefault)?.id).toBe("t1");
  });
});

// ── 选择 / 换档 / 取消 ────────────────────────────────────────────────

describe("resolveDirectionSelection 选择 / 换档 / 取消", () => {
  const selectTarget = {
    directionId: "d1",
    tierId: "t2",
    directionName: "舞蹈家",
    tierName: "养成",
    teacher: "资深老师",
    freq: "每周 2 次",
    selectedAt: "2026-11-16T01:00:00.000Z",
  };

  it("新增正式方向选择，字段按目标注入冻结", () => {
    const result = resolveDirectionSelection({
      action: "select",
      selections: [],
      selectionLimit: 3,
      target: selectTarget,
      allowedTierIds: ["t2", "t3"],
    });
    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.selections).toHaveLength(1);
    expect(result.selection).toEqual({
      directionId: "d1",
      requestId: "",
      custom: false,
      tierId: "t2",
      directionName: "舞蹈家",
      tierName: "养成",
      teacher: "资深老师",
      freq: "每周 2 次",
      manualName: "",
      selectedAt: "2026-11-16T01:00:00.000Z",
    });
    expect(resolveSelection).toBe(resolveDirectionSelection);
  });

  it("重复选择同方向返回 DUPLICATE（UT-M4-20）", () => {
    const selections = [makeSelection()];
    const result = resolveDirectionSelection({
      action: "select",
      selections,
      selectionLimit: 3,
      target: selectTarget,
      allowedTierIds: ["t2"],
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("DUPLICATE");
    expect(result.changed).toBe(false);
    expect(result.selections).toEqual(selections);
  });

  it("已满 3 个再新增返回 LIMIT_REACHED 且数组不变（UT-M4-19）", () => {
    const selections = [
      makeSelection({ directionId: "d1" }),
      makeSelection({ directionId: "d2" }),
      makeSelection({ directionId: "d3" }),
    ];
    const result = resolveDirectionSelection({
      action: "select",
      selections,
      selectionLimit: 3,
      target: { ...selectTarget, directionId: "d4" },
      allowedTierIds: ["t2"],
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("LIMIT_REACHED");
    expect(result.selections).toEqual(selections);
  });

  it("正式 + 自填共享选择上限（UT-M4-25）", () => {
    const selections = [
      makeSelection({ directionId: "d1" }),
      makeSelection({ directionId: "d2" }),
      makeSelection({
        directionId: "",
        requestId: "r1",
        custom: true,
        manualName: "冰球",
        directionName: "",
      }),
    ];
    const result = resolveDirectionSelection({
      action: "select",
      selections,
      selectionLimit: 3,
      target: {
        custom: true,
        manualName: "编程启蒙",
        tierId: "t2",
        tierName: "养成",
        teacher: "资深老师",
        freq: "每周 2 次",
        selectedAt: "2026-11-16T02:00:00.000Z",
      },
      allowedTierIds: ["t2"],
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("LIMIT_REACHED");
  });

  it("自填名称校验：空 / 超 10 字 / 控制字符拒绝，trim 后合法（UT-M4-24）", () => {
    const invalidNames = ["", "   ", "0123456789A", "冰\u0001球"];
    for (const manualName of invalidNames) {
      const result = resolveDirectionSelection({
        action: "select",
        selections: [],
        selectionLimit: 3,
        target: { custom: true, manualName, tierId: "t2", selectedAt: "2026-11-16T00:00:00.000Z" },
        allowedTierIds: ["t2"],
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe("INVALID_MANUAL_NAME");
    }

    const valid = resolveDirectionSelection({
      action: "select",
      selections: [],
      selectionLimit: 3,
      target: {
        custom: true,
        manualName: " 冰 球 ",
        tierId: "t2",
        tierName: "养成",
        selectedAt: "2026-11-16T00:00:00.000Z",
      },
      allowedTierIds: ["t2"],
    });
    expect(valid.ok).toBe(true);
    expect(valid.selection?.manualName).toBe("冰 球");
    expect(isValidManualDirectionName("冰 球")).toBe(true);
    expect(isValidManualDirectionName("0123456789A")).toBe(false);
    expect(normalizeManualDirectionName(" 冰 球 ")).toBe("冰 球");
  });

  it("自填同名（trim 后）返回 DUPLICATE", () => {
    const selections = [
      makeSelection({
        directionId: "",
        requestId: "r1",
        custom: true,
        manualName: "冰球",
        directionName: "",
      }),
    ];
    const result = resolveDirectionSelection({
      action: "select",
      selections,
      selectionLimit: 3,
      target: { custom: true, manualName: " 冰球 ", tierId: "t2", selectedAt: "2026-11-16T00:00:00.000Z" },
      allowedTierIds: ["t2"],
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("DUPLICATE");
  });

  it("选择时校验档位候选，非法档位返回 INVALID_TIER", () => {
    const result = resolveDirectionSelection({
      action: "select",
      selections: [],
      selectionLimit: 3,
      target: { ...selectTarget, tierId: "t4" },
      allowedTierIds: ["t2", "t3"],
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_TIER");
  });

  it("换档更新 tier 字段并保留方向名称 / 自填原文 / 选择时间（UT-M4-21）", () => {
    const selections = [makeSelection()];
    const result = resolveDirectionSelection({
      action: "changeTier",
      selections,
      selectionLimit: 3,
      target: {
        directionId: "d1",
        tierId: "t3",
        tierName: "精进",
        teacher: "卓越老师",
        freq: "每周 2–3 次",
        selectedAt: "2026-11-17T00:00:00.000Z",
      },
      allowedTierIds: ["t2", "t3"],
    });
    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.selection).toMatchObject({
      tierId: "t3",
      tierName: "精进",
      teacher: "卓越老师",
      freq: "每周 2–3 次",
      directionName: "舞蹈家",
      selectedAt: "2026-11-16T00:00:00.000Z",
    });
  });

  it("换档同档位幂等，changed=false", () => {
    const selections = [makeSelection()];
    const result = resolveDirectionSelection({
      action: "changeTier",
      selections,
      selectionLimit: 3,
      target: { directionId: "d1", tierId: "t2", selectedAt: "2026-11-17T00:00:00.000Z" },
      allowedTierIds: ["t2", "t3"],
    });
    expect(result.ok).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.selections).toEqual(selections);
  });

  it("换档非法档位 / 未选择返回对应错误码（UT-M4-22）", () => {
    const invalidTier = resolveDirectionSelection({
      action: "changeTier",
      selections: [makeSelection()],
      selectionLimit: 3,
      target: { directionId: "d1", tierId: "t4", selectedAt: "" },
      allowedTierIds: ["t2", "t3"],
    });
    expect(invalidTier.ok).toBe(false);
    expect(invalidTier.code).toBe("INVALID_TIER");

    const notSelected = resolveDirectionSelection({
      action: "changeTier",
      selections: [],
      selectionLimit: 3,
      target: { directionId: "d9", tierId: "t2", selectedAt: "" },
      allowedTierIds: ["t2"],
    });
    expect(notSelected.ok).toBe(false);
    expect(notSelected.code).toBe("NOT_SELECTED");
  });

  it("取消已选项移除并保持剩余顺序；取消不存在幂等（UT-M4-23）", () => {
    const selections = [
      makeSelection({ directionId: "d1" }),
      makeSelection({ directionId: "d2" }),
      makeSelection({ directionId: "d3" }),
    ];
    const cancelled = resolveDirectionSelection({
      action: "cancel",
      selections,
      selectionLimit: 3,
      target: { directionId: "d2", selectedAt: "" },
    });
    expect(cancelled.ok).toBe(true);
    expect(cancelled.changed).toBe(true);
    expect(cancelled.selections.map((item) => item.directionId)).toEqual(["d1", "d3"]);
    expect(cancelled.selection?.directionId).toBe("d2");

    const missing = resolveDirectionSelection({
      action: "cancel",
      selections,
      selectionLimit: 3,
      target: { directionId: "d9", selectedAt: "" },
    });
    expect(missing.ok).toBe(true);
    expect(missing.changed).toBe(false);
    expect(missing.selections).toEqual(selections);
  });

  it("选择纯函数不修改入参", () => {
    const selections = [makeSelection()];
    const before = clone(selections);
    resolveDirectionSelection({
      action: "changeTier",
      selections,
      selectionLimit: 3,
      target: { directionId: "d1", tierId: "t3", selectedAt: "" },
      allowedTierIds: ["t2", "t3"],
    });
    resolveDirectionSelection({
      action: "cancel",
      selections,
      selectionLimit: 3,
      target: { directionId: "d1", selectedAt: "" },
    });
    expect(selections).toEqual(before);
  });

  it("缺少方向 id 且无自填名称时返回 INVALID_TARGET", () => {
    const result = resolveDirectionSelection({
      action: "select",
      selections: [],
      selectionLimit: 3,
      target: { tierId: "t2", selectedAt: "" },
      allowedTierIds: ["t2"],
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_TARGET");
  });
});

describe("assertSelectionLimit / 上限解析", () => {
  it("达到上限抛 TalentSelectionLimitError", () => {
    const selections = [
      makeSelection({ directionId: "d1" }),
      makeSelection({ directionId: "d2" }),
      makeSelection({ directionId: "d3" }),
    ];
    expect(() => assertSelectionLimit(selections)).toThrow(TalentSelectionLimitError);
    try {
      assertSelectionLimit(selections);
    } catch (error) {
      expect((error as TalentSelectionLimitError).code).toBe("LIMIT_REACHED");
    }
    expect(() => assertSelectionLimit(selections.slice(0, 2))).not.toThrow();
    expect(() => assertSelectionLimit(selections.slice(0, 2), 2)).toThrow(TalentSelectionLimitError);
    // 非法上限回退常量 3。
    expect(() => assertSelectionLimit(selections.slice(0, 2), 0)).not.toThrow();
  });

  it("上限解析：默认 5/3，合法区间内生效，非法回退", () => {
    expect(resolveRecommendLimit(1)).toBe(1);
    expect(resolveRecommendLimit(20)).toBe(20);
    expect(resolveRecommendLimit(21)).toBe(5);
    expect(resolveSelectionLimit(1)).toBe(1);
    expect(resolveSelectionLimit(10)).toBe(10);
    expect(resolveSelectionLimit(11)).toBe(3);
    expect(TALENT_DIRECTION_RECOMMEND_LIMIT).toBe(5);
    expect(TALENT_DIRECTION_SELECTION_LIMIT).toBe(3);
  });
});
