/**
 * @description M2 会员域表单共用的轻量校验：手机号 / 身份证 / 出生日期 / 证件生日一致。
 *   只做客户端预校验，服务端仍以 Zod 与领域校验为最终判定（spec §6.2 / §6.3）。
 * @file app/pages/admin/talent/member/member-form.ts
 */

export const MEMBER_MOBILE_RE = /^1[3-9]\d{9}$/;
export const MEMBER_ID_NO_RE = /^\d{17}[\dXx]$/;
export const MEMBER_PARENT_NO_RE = /^P\d{12}$/;

/** 合法且真实的 `YYYY-MM-DD` 日期。 */
export function isValidBirthdayText(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** 今天（本地时区）的 `YYYY-MM-DD`，用于「生日不得晚于今天」。 */
export function todayText(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** 身份证第 7–14 位必须与出生日期一致（不校验末位，spec §4.5）。 */
export function idNoMatchesBirthday(idNo: string, birthday: string): boolean {
  return idNo.trim().slice(6, 14) === birthday.trim().replaceAll("-", "");
}