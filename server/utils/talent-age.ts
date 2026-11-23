/**
 * @description 天赋域通用年龄计算（精确周岁）：从旧 `talent-matching.ts` 迁移出的纯函数，
 *   M3 报告快照 / M5 建议 / M7 C 端共用；不依赖 PocketBase，不做上下架判断。
 *   旧匹配工具随 M6 清理删除，年龄口径必须与新报告 / 建议保持一致（M6 规格 §2.7）。
 * @file server/utils/talent-age.ts
 */

/** 严格解析 `YYYY-MM-DD`，非法日期返回 undefined（避免 Date 自动进位）。 */
export function parseTalentDate(value: string | undefined): Date | undefined {
  const text = String(value || "").slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return undefined;
  const year = Number(match[1] || 0);
  const month = Number(match[2] || 0);
  const day = Number(match[3] || 0);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : undefined;
}

/**
 * 计算精确周岁；出生日期缺失 / 非法 / 晚于参考日期时返回 undefined。
 *
 * @param birthDate 出生日期（`YYYY-MM-DD`）
 * @param referenceDate 参考日期（默认当前时间）
 */
export function calculateTalentAge(
  birthDate: string | undefined,
  referenceDate: string | undefined,
): number | undefined {
  const birth = parseTalentDate(birthDate);
  const reference = parseTalentDate(referenceDate) || new Date();
  if (!birth || birth > reference) return undefined;
  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    reference.getUTCMonth() < birth.getUTCMonth() ||
    (reference.getUTCMonth() === birth.getUTCMonth() &&
      reference.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}