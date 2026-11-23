/**
 * @description M1 规则域共享类型：外部文库、潜质要素、分级、固定注解、培养方向与目标档位。
 * @file shared/types/talent-rule.ts
 */
import type { TalentStatus } from "./talent";

/** PocketBase 记录公共字段。 */
export interface TalentRuleRecord {
  id: string;
  created: string;
  updated: string;
}


/** 外部文库分库性别；与 PRD「男 / 女」一一对应。 */
export type TalentLibraryGender = "male" | "female";

/** 固定注解的性别条件；空 = 不限，默认「通用」。 */
export type TalentNoteGender = "男" | "女" | "通用";

/** 分级展示色位，映射 Naive UI tag 类型与主题令牌，不存色值。 */
export type TalentLevelTone = "default" | "info" | "success" | "warning";

/** 分级编码固定 4 档；槽位键与方向 requirements.level 均使用该编码。 */
export const TALENT_LEVEL_CODES = ["LV1", "LV2", "LV3", "LV4"] as const;
export type TalentLevelCode = (typeof TALENT_LEVEL_CODES)[number];

/** 目标档位编码固定 4 档，不提供新增 / 删除。 */
export const TALENT_TIER_CODES = ["T1", "T2", "T3", "T4"] as const;
export type TalentTierCode = (typeof TALENT_TIER_CODES)[number];

export const TALENT_LEVEL_TONES: readonly TalentLevelTone[] = [
  "default",
  "info",
  "success",
  "warning",
];

export const TALENT_LIBRARY_GENDERS: readonly TalentLibraryGender[] = [
  "male",
  "female",
];

export const TALENT_NOTE_GENDERS: readonly TalentNoteGender[] = [
  "男",
  "女",
  "通用",
];

/** 分册编码 → 分册名称固定映射（BR-04）。 */
export const TALENT_CATEGORY_NAMES: Readonly<Record<string, string>> = {
  A: "生长发育",
  B: "智商",
  C: "情商",
  D: "领导商",
  E: "艺术商",
  F: "体育运动商",
};

/** 每个要素固定 12 槽位 = 4 档 × 3 变体。 */
export const TALENT_SLOT_VARIANTS = 3;
export const TALENT_SLOT_TOTAL = TALENT_LEVEL_CODES.length * TALENT_SLOT_VARIANTS;

/** `slots` JSON 每槽四段文案的键。 */
export const TALENT_SLOT_SEGMENTS = [
  "content",
  "example",
  "direction",
  "suggestion",
] as const;
export type TalentSlotSegmentKey = (typeof TALENT_SLOT_SEGMENTS)[number];

/** 单个槽位的四段文案；空串 = 待补写。 */
export interface TalentFactorSlot {
  content: string;
  example: string;
  direction: string;
  suggestion: string;
}

/** `slots` JSON：分级编码 → 3 个变体。 */
export type TalentFactorSlots = Record<string, TalentFactorSlot[]>;

/** 分库（性别 + 具体年龄，一岁一库）。 */
export interface TalentFactorLibrary extends TalentRuleRecord {
  gender: TalentLibraryGender;
  age: number;
  source: string;
  version?: string;
  syncedAt?: string;
  syncedBy?: string;
  itemCount: number;
  slotTotal: number;
  filledCount: number;
  status: TalentStatus;
}

/** 潜质要素（外部文库只读）。 */
export interface TalentFactor extends TalentRuleRecord {
  libraryId: string;
  code: string;
  name: string;
  category: string;
  categoryName: string;
  sortOrder?: number;
  slots: TalentFactorSlots;
  slotTotal: number;
  filledSlotCount: number;
  partialSlotCount: number;
  createdBy?: string;
  updatedBy?: string;
}

/** 分级（增量改造既有集合；旧字段保留到 M6）。 */
export interface TalentLevel extends TalentRuleRecord {
  code: string;
  name: string;
  sortOrder: number;
  range?: string;
  tone?: TalentLevelTone;
  status: TalentStatus;
  createdBy?: string;
  updatedBy?: string;
  /** 以下旧字段仅为兼容旧唯一索引 / 旧数据，新业务不读取。 */
  elementId?: string;
  levelCode?: string;
  levelName?: string;
  annotation?: string;
}

/** 固定注解（全局按 factorCode 共用，不按分库隔离）。 */
export interface TalentFactorNote extends TalentRuleRecord {
  code: string;
  factorCode: string;
  category: string;
  levelCode: string;
  note?: string;
  ageRange?: string;
  gender?: TalentNoteGender;
  status: TalentStatus;
  createdBy?: string;
  updatedBy?: string;
}

/** 方向 requirements 单项：要素编码 + 要求分级编码。 */
export interface TalentDirectionRequirement {
  code: string;
  level: string;
}

/** 培养方向（requirements / tierIds 存 JSON，引用完整性由服务层校验）。 */
export interface TalentDirection extends TalentRuleRecord {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  requirements: TalentDirectionRequirement[];
  tierIds: string[];
  defaultTierId: string;
  aliases?: string[];
  version: number;
  status: TalentStatus;
  createdBy?: string;
  updatedBy?: string;
}

/** 目标档位（固定 4 档）。 */
export interface TalentTier extends TalentRuleRecord {
  code: string;
  name: string;
  sortOrder: number;
  teacher: string;
  freq: string;
  headline?: string;
  description?: string;
  preset: boolean;
  isDefault: boolean;
  status: TalentStatus;
  updatedBy?: string;
}