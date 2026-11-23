/**
 * @description 天赋域通用状态类型。M6 清理后本文件只保留 `TalentStatus`（M1 / M2 共用），
 *   旧会员 / 旧报告 / 旧匹配 / 旧阅读进度的类型随旧集合与旧页面在 M6 删除；
 *   报告、会员、规则、建议的类型分别见 `shared/types/talent-report.ts`、`talent-member.ts`、
 *   `talent-rule.ts`、`talent-advice.ts`（M6 规格 §2.7）。
 * @file shared/types/talent.ts
 */

/** 通用启用 / 停用状态（`"1"` 启用、`"0"` 停用）。 */
export type TalentStatus = "0" | "1";