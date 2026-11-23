/**
 * @description M5 培育建议域外部源契约与本地 Mock 源：
 *   `TalentAdviceSource` 接口 + `createMockTalentAdviceSource`（full / partial / empty / error / slow 五模式）、
 *   环境变量解析（`TALENT_ADVICE_SOURCE` / `TALENT_ADVICE_MOCK_MODE` / `TALENT_ADVICE_MOCK_DELAY_MS`）、
 *   同步日志写入（`talent_sync_logs.syncScope="advice_version"`）与同步失败摘要脱敏。
 *   M8 接入真实外部建议系统时只替换 `createTalentAdviceSource` 的实现，不改调用方（spec §9）。
 *   接收新一版的 preview / commit 编排与「同步即发布」落库在 `server/utils/talent-advice.ts`；
 *   本文件只冻结源契约、Mock 语义与同步日志写入，避免源实现反向依赖领域层。
 *   Mock 数据全部虚构；不传身份证明文、不写真实 PII。
 * @file server/utils/talent-advice-source.ts
 */
import { createError } from "h3";
import type PocketBase from "pocketbase";
import {
  TALENT_ADVICE_BOOK_NAMES,
  TALENT_ADVICE_ENTROPY_LEVELS,
  TALENT_ADVICE_SECTION_LIMITS,
  type TalentAdviceMatchResult,
  type TalentAdviceRawSection,
  type TalentAdviceSource,
  type TalentAdviceSourceKind,
  type TalentAdviceSyncLogInput,
  type TalentAdviceSyncSubject,
} from "~~/shared/types/talent-advice";
import { getAdminPB } from "./pocketbase-client";
import { createExternalTalentAdviceSource } from "./talent-external-sources";

/** Mock 源标识。 */
export const TALENT_ADVICE_MOCK_SOURCE = "mock";
/** 真实外部源标识（M8 实现；M5 配置为 external 时返回 503，不静默降级 Mock）。 */
export const TALENT_ADVICE_EXTERNAL_SOURCE = "external";

/** Mock 五种模式（spec §9）。 */
export const TALENT_ADVICE_MOCK_MODES = [
  "full",
  "partial",
  "empty",
  "error",
  "slow",
] as const;
export type TalentAdviceMockMode = (typeof TALENT_ADVICE_MOCK_MODES)[number];

/** Mock 模式中文说明（页面/文档提示用）。 */
export const TALENT_ADVICE_MOCK_MODE_LABELS: Readonly<
  Record<TalentAdviceMockMode, string>
> = {
  full: "全部匹配",
  partial: "部分匹配",
  empty: "全部暂无建议",
  error: "部分源异常",
  slow: "慢响应",
};

const MOCK_DELAY_MS = 200;

function nonNegativeNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

/** 解析建议源类型：默认 mock，只有显式 `external` 才切换（M8）。 */
export function resolveTalentAdviceSourceKind(
  env: NodeJS.ProcessEnv = process.env,
): TalentAdviceSourceKind {
  const raw = String(env.TALENT_ADVICE_SOURCE || "")
    .trim()
    .toLowerCase();
  return raw === TALENT_ADVICE_EXTERNAL_SOURCE
    ? TALENT_ADVICE_EXTERNAL_SOURCE
    : TALENT_ADVICE_MOCK_SOURCE;
}

/** 解析 Mock 模式：未知值回退 full。 */
export function resolveTalentAdviceMockMode(
  env: NodeJS.ProcessEnv = process.env,
): TalentAdviceMockMode {
  const raw = String(env.TALENT_ADVICE_MOCK_MODE || "").trim();
  return (TALENT_ADVICE_MOCK_MODES as readonly string[]).includes(raw)
    ? (raw as TalentAdviceMockMode)
    : "full";
}

/** Mock 延迟（毫秒）：仅 `slow` 模式或显式配置时生效。 */
export function resolveTalentAdviceMockDelayMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return nonNegativeNumber(env.TALENT_ADVICE_MOCK_DELAY_MS, 0);
}

function stableHash(value: string): number {
  let hash = 5381;
  for (const char of String(value ?? "")) {
    hash = ((hash << 5) + hash + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return hash;
}

function delay(ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    const handle = timer as unknown as { unref?: () => void };
    if (typeof handle.unref === "function") handle.unref();
  });
}

const MOCK_FACTORS = ["运动协调", "专注力", "语言表达", "空间想象"] as const;

/**
 * 生成确定性的虚构 section：
 * 默认只出 A 册（M3 Mock 基因报告最少含 A、B 两册，保证 `sections[].book ⊆ 基因报告 books`）；
 * 需要多册演示时由调用方传 `books`（如 `"ABCD"`）。同一要素附带 variant=2 话术变体，
 * 用于验证「后台看全部变体、C 端只取最小 variant」。
 */
export function buildMockTalentAdviceSections(
  subject: TalentAdviceSyncSubject,
  books = "A",
): TalentAdviceRawSection[] {
  const codes = [...new Set(books.toUpperCase().replace(/[^A-F]/g, ""))]
    .sort()
    .slice(0, 6);
  const resolved = codes.length ? codes : ["A"];
  const hash = stableHash(`${subject.subjectId}:${subject.birthday}`);
  const sections: TalentAdviceRawSection[] = [];
  for (const book of resolved) {
    const bookName = TALENT_ADVICE_BOOK_NAMES[book as keyof typeof TALENT_ADVICE_BOOK_NAMES];
    if (!bookName) continue;
    for (let index = 0; index < 2; index += 1) {
      const factor = MOCK_FACTORS[(hash + index) % MOCK_FACTORS.length]!;
      const entropy =
        TALENT_ADVICE_ENTROPY_LEVELS[
          (hash + index + book.charCodeAt(0)) % TALENT_ADVICE_ENTROPY_LEVELS.length
        ]!;
      const base: TalentAdviceRawSection = {
        book,
        bookName,
        chapter: `1.${index + 1} ${bookName}概述`,
        factor,
        entropy,
        content: `${subject.name}在${factor}方面${entropy === "常态" ? "处于常态水平" : "表现较为突出"}，基础条件与同龄人相当。`,
        example: "多数情境下能稳定完成对应任务，遇到更复杂的安排时经过引导可以适应。",
        direction: "在现有基础上逐步增加任务复杂度，用阶段性目标巩固当前表现。",
        suggestion: "保持规律接触与练习节奏，定期回顾变化，再决定是否提高投入强度。",
        variant: 1,
      };
      sections.push(base);
      if (index === 0) {
        sections.push({
          ...base,
          content: `${subject.name}的${factor}潜质在同类任务中呈现较稳定的优势，适合循序引导。`,
          variant: 2,
        });
      }
    }
  }
  return sections;
}

export interface TalentAdviceMockSourceOptions {
  mode?: TalentAdviceMockMode;
  delayMs?: number;
  env?: NodeJS.ProcessEnv;
  /** 外部批次号（仅留痕）；换一个值即模拟「外部推送新一版」。 */
  version?: string;
  /** Mock 覆盖分册（默认 A；多册演示传 `"ABCD"`）。 */
  books?: string;
  /** 默认 true：第一条要素附带 variant=2；false 时不生成变体。 */
  variants?: boolean;
}

/**
 * 创建本地 Mock 外部建议源（固定虚构数据）：
 * - `full` 全部找到；`partial` 每 2 人 1 人暂无建议；
 * - `empty` 全部暂无建议；`error` 第 1 个对象抛错（验单条失败不阻断）；
 * - `slow` 延迟 `delayMs`（默认 200ms）。
 * 调换 `version` 即模拟外部系统推送的新批次（接收新一版时可验证版本切换）。
 */
export function createMockTalentAdviceSource(
  options: TalentAdviceMockSourceOptions = {},
): TalentAdviceSource {
  const env = options.env ?? process.env;
  const mode = options.mode ?? resolveTalentAdviceMockMode(env);
  const delayMs =
    mode === "slow"
      ? nonNegativeNumber(options.delayMs, MOCK_DELAY_MS)
      : nonNegativeNumber(options.delayMs, resolveTalentAdviceMockDelayMs(env));
  const version = String(options.version ?? "mock-v1").trim() || "mock-v1";
  const books = String(options.books ?? "A");
  const withVariants = options.variants !== false;
  let callIndex = 0;

  return {
    name: TALENT_ADVICE_MOCK_SOURCE,
    async match(subject) {
      const index = callIndex;
      callIndex += 1;
      await delay(delayMs);
      if (mode === "error" && index === 0)
        throw new Error("Mock 外部培育建议源异常（HTTP 500）");
      if (mode === "empty")
        return { found: false, reason: "no_result" } satisfies TalentAdviceMatchResult;
      if (mode === "partial" && index % 2 === 1)
        return {
          found: false,
          reason: "info_mismatch",
        } satisfies TalentAdviceMatchResult;
      const sections = buildMockTalentAdviceSections(subject, books);
      return {
        found: true,
        sections: withVariants
          ? sections
          : sections.filter((section) => Number(section.variant ?? 1) === 1),
        version,
      } satisfies TalentAdviceMatchResult;
    },
  };
}

/**
 * M5 源工厂：`mock` 返回本地演示源；`external` 返回 M8 适配器。
 * 缺配置保持 M5 冻结的 503 `ADVICE_SOURCE_UNAVAILABLE`（不静默降级 Mock）。
 */
export function createTalentAdviceSource(
  env: NodeJS.ProcessEnv = process.env,
): TalentAdviceSource {
  if (resolveTalentAdviceSourceKind(env) === TALENT_ADVICE_EXTERNAL_SOURCE) {
    try {
      return createExternalTalentAdviceSource({ env });
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 503)
        throw createError({
          statusCode: 503,
          message: "外部培育建议服务暂不可用",
          data: { code: "ADVICE_SOURCE_UNAVAILABLE" },
        });
      throw error;
    }
  }
  return createMockTalentAdviceSource({
    env,
    mode: resolveTalentAdviceMockMode(env),
    delayMs: resolveTalentAdviceMockDelayMs(env),
  });
}

// ── 同步错误摘要：≤200 字、去堆栈、替换明文为脱敏值 ───────────────────────

/** 同步失败摘要脱敏：折叠空白、截断 200 字；命中脱敏身份证时原样保留。 */
export function sanitizeTalentAdviceSyncMessage(
  error: unknown,
  subject?: Pick<TalentAdviceSyncSubject, "geneReportId" | "maskedIdNo"> | null,
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "外部培育建议源返回异常";
  let text = raw.replace(/\s+/g, " ").trim();
  // 防御：外部错误信息若误带 18 位身份证 / 11 位手机号，摘要里替换为脱敏文本。
  text = text.replace(/(?<!\d)\d{17}[\dXx](?!\d)/g, "***");
  text = text.replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, "***");
  const masked = String(subject?.maskedIdNo ?? "").trim();
  if (masked && text.includes(masked)) text = text.split(masked).join(masked);
  return (text || "同步失败").slice(0, 200);
}

// ── 同步日志（`talent_sync_logs`，syncScope="advice_version"） ─────────────

/**
 * 写入建议接收日志；日志失败不阻断主流程，返回空串。
 * 只写份数/状态/脱敏明细，不写身份证明文、外部原始报文或堆栈。
 */
export async function recordTalentAdviceSyncLog(
  input: TalentAdviceSyncLogInput,
  pb?: PocketBase | Promise<PocketBase>,
): Promise<string> {
  try {
    const admin = pb ? await pb : await getAdminPB();
    const record = await admin.collection("talent_sync_logs").create(
      {
        trigger: input.trigger ?? "manual",
        status: input.status,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
        durationMs: input.durationMs,
        received: input.received,
        generated: input.generated,
        skipped: input.skipped,
        failedCount: input.failedCount,
        message: input.message.slice(0, 1000),
        details: {
          counts: {
            created: input.generated,
            empty: input.skipped,
            failed: input.failedCount,
          },
        },
        syncScope: "advice_version",
        mode: "commit",
        createdCount: input.generated,
        subjectDetails: input.truncated
          ? input.details.slice(0, TALENT_ADVICE_SECTION_LIMITS.maxDetails)
          : input.details,
        operatorId: input.operatorId,
      },
      { $autoCancel: false },
    );
    return String(record.id || "");
  } catch {
    // 日志失败不阻断同步主流程。
    return "";
  }
}