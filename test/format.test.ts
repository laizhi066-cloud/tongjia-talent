/**
 * @description 通用日期/时间格式化测试（dayjs，按本机时区展示）。
 * @file test/format.test.ts
 */
import { describe, expect, it } from "vitest";
import { formatDate, formatTime } from "../app/utils/format";

describe("formatTime / formatDate", () => {
  it("空值返回空串", () => {
    expect(formatTime("")).toBe("");
    expect(formatTime(undefined)).toBe("");
    expect(formatTime(null)).toBe("");
    expect(formatDate("")).toBe("");
  });

  it("纯日期字段原样返回，不做时区换算", () => {
    expect(formatTime("2026-09-08")).toBe("2026-09-08");
    expect(formatDate("2026-09-08")).toBe("2026-09-08");
  });

  it("ISO 时间按固定 UTC+8 格式化为 年-月-日 时:分", () => {
    expect(formatTime("2026-09-17T02:30:00.000Z")).toBe("2026-09-17 10:30");
    expect(formatDate("2026-09-17T02:30:00.000Z")).toBe("2026-09-17");
    // 跨日：UTC 前一天晚上 → 北京时间次日凌晨
    expect(formatTime("2026-09-16T20:00:00.000Z")).toBe("2026-09-17 04:00");
    expect(formatDate("2026-09-16T20:00:00.000Z")).toBe("2026-09-17");
  });

  it("兼容 PocketBase 空格分隔格式", () => {
    expect(formatTime("2026-09-17 02:30:00.000Z")).toBe("2026-09-17 10:30");
  });

  it("无法解析的值降级返回原文本片段", () => {
    expect(formatTime("not-a-date")).toBe("not-a-date");
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});
