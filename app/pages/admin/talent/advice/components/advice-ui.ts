/**
 * @description 培育建议页面共享的纯展示映射：发布状态 / 数据熵标签 tone、建议书四段段落顺序、
 *   错误码提取与「撤回于 …」副行文案。无请求、无副作用，便于列表页与各弹层复用。
 * @file app/pages/admin/talent/advice/components/advice-ui.ts
 */
import type { TalentAdviceDocListRow } from "~/composables/api/useTalentAdviceApi";

/** 发布状态标签：已发布 success（绿）/ 已撤回 default（灰，spec §6.1 #13）。 */
export function advicePublishStatusTagType(status: string): "success" | "default" {
  return status === "published" ? "success" : "default";
}

/**
 * 数据熵标签四档配色（spec §6.2「数据熵标签（四档配色 tone）」）：
 * 卓越 / 优秀 success、优良 info、常态 default、弱态 / 弱势 warning。
 */
export function adviceEntropyTagType(
  entropy: string,
): "success" | "info" | "default" | "warning" {
  if (entropy === "卓越" || entropy === "优秀") return "success";
  if (entropy === "优良") return "info";
  if (entropy === "弱态" || entropy === "弱势") return "warning";
  return "default";
}

export interface AdviceParagraphSource {
  content: string;
  example: string;
  direction: string;
  suggestion: string;
}

export interface AdviceParagraph {
  key: "content" | "example" | "direction" | "suggestion";
  label: string;
  /** 空段保留（页面显示「—」），保证四段版式稳定。 */
  text: string;
}

/** 把单条 section 展开为固定顺序的四段（空段保留，不隐藏行）。 */
export function adviceSectionParagraphs(
  section: AdviceParagraphSource,
): AdviceParagraph[] {
  return [
    { key: "content", label: "分级内容", text: String(section.content ?? "") },
    { key: "example", label: "分级举例", text: String(section.example ?? "") },
    {
      key: "direction",
      label: "培育方向",
      text: String(section.direction ?? ""),
    },
    {
      key: "suggestion",
      label: "培育建议",
      text: String(section.suggestion ?? ""),
    },
  ];
}

/** 列表 #14「同步时间」副行：已撤回时显示「撤回于 …」（spec §6.1）。 */
export function adviceWithdrawnNote(
  row: Pick<TalentAdviceDocListRow, "publishStatus" | "withdrawnAt">,
  format: (value: string) => string,
): string {
  if (row.publishStatus !== "withdrawn" || !row.withdrawnAt) return "";
  const at = format(row.withdrawnAt);
  return at ? `撤回于 ${at}` : "";
}

/** 从 ofetch 错误里取业务错误码（h3 `createError({ data: { code } })` → 响应体 `data.code`）。 */
export function adviceErrorCode(err: unknown): string {
  const value = err as Record<string, unknown> | null;
  const body = value?.data as Record<string, unknown> | undefined;
  const data = body?.data as Record<string, unknown> | undefined;
  return String(data?.code ?? "").trim();
}