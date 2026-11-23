/**
 * @description 通用日期/时间格式化（dayjs，固定 Asia/Shanghai = UTC+8）。
 * 使用固定偏移而不是 IANA 时区：中国无夏令时，且小程序 JS 引擎对 Intl/timeZone 支持有限。
 * @file app/utils/format.ts
 */
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

/** 业务固定时区：Asia/Shanghai（UTC+8）。 */
export const APP_UTC_OFFSET = 8;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** 兼容 PocketBase（空格分隔）与 ISO（T 分隔）时间。 */
function parseTime(value: string) {
  const text = value.trim();
  return dayjs(text.includes("T") ? text : text.replace(" ", "T"));
}

/**
 * 格式化为固定时区「年-月-日 时:分」（如 2026-05-18 13:13）。
 * 纯日期字段（如 testDate/effectiveDate）原样返回，不做时区换算。
 */
export function formatTime(iso: string | undefined | null): string {
  if (!iso) return "";
  const text = String(iso).trim();
  if (!text) return "";
  if (DATE_ONLY.test(text)) return text;
  const date = parseTime(text);
  return date.isValid() ? date.utcOffset(APP_UTC_OFFSET).format("YYYY-MM-DD HH:mm") : text.slice(0, 16).replace("T", " ");
}

/**
 * 格式化为固定时区「年-月-日」（如 2026-05-18）。
 * 纯日期字段原样返回；带时间的时间戳按固定时区取日期。
 */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "";
  const text = String(iso).trim();
  if (!text) return "";
  if (DATE_ONLY.test(text)) return text;
  const date = parseTime(text);
  return date.isValid() ? date.utcOffset(APP_UTC_OFFSET).format("YYYY-MM-DD") : text.slice(0, 10);
}
