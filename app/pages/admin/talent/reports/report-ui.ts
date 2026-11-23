/**
 * @description 报告域页面共享的纯展示映射：状态标签类型、页签归一化（含旧页签回落）、
 *   匹配天赋行合并、命中率与版本类型文案。无请求、无副作用，便于页面与弹层复用。
 * @file app/pages/admin/talent/reports/report-ui.ts
 */
import type { SelectOption } from "naive-ui";
import type {
  TalentReportDirectionSummary,
  TalentReportMatchingTab,
} from "~/composables/api/useTalentReportApi";
import type { TalentReportVersionType } from "~~/shared/types/talent-report";

/** 详情 4 页签（`?tab=` 取值；spec §6.2）。 */
export type ReportDetailTab = "selected" | "matching" | "gene" | "advice";

const REPORT_TAB_ALIASES: Readonly<Record<string, ReportDetailTab>> = {
  selected: "selected",
  selections: "selected",
  selection: "selected",
  matching: "matching",
  match: "matching",
  gene: "gene",
  geneReport: "gene",
  advice: "advice",
};

/**
 * `?tab=` 归一化：只认 4 个新页签；`snapshot` / `versions` / 未知值一律回落首签（AC-ADM-06-5）。
 */
export function normalizeReportTab(value: unknown): ReportDetailTab {
  const key = String(value ?? "").trim();
  return REPORT_TAB_ALIASES[key] ?? "selected";
}

/** 状态标签：待发布 default / 已发布 success / 已撤回 warning（spec §6.1）。 */
export function reportStatusTagType(
  status: string,
): "default" | "success" | "warning" | "error" {
  if (status === "published") return "success";
  if (status === "retracted") return "warning";
  if (status === "pending_publish") return "default";
  return "error";
}

/** 命中率：0 显示 0%，其余保留 1 位小数。 */
export function formatHitRate(rate: number): string {
  const value = Number(rate || 0);
  if (!Number.isFinite(value) || value <= 0) return "0%";
  return `${(value * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

/** 版本历史类型文案（spec §3.2.5）。 */
export const REPORT_VERSION_TYPE_LABELS: Readonly<
  Record<TalentReportVersionType, string>
> = {
  publish: "发布",
  withdraw: "撤回",
  restore: "恢复",
  reissue: "补发",
  regenerate: "重新生成快照",
  selection: "方向选择",
};

export function reportVersionTypeLabel(type: string): string {
  return (
    REPORT_VERSION_TYPE_LABELS[type as TalentReportVersionType] ??
    String(type || "—")
  );
}

/**
 * 方向行键：正常数据用 `directionId`，历史 / 演示数据 directionId 可能为空串，
 * 只按 id 合并会把多个方向挤成一行，因此空 id 回退到 `code`。
 */
function directionKey(direction: TalentReportDirectionSummary): string {
  return String(direction.directionId || direction.code || direction.name);
}

/** 匹配天赋表格行：冻结与当前配置两侧按方向合并。 */
export interface ReportMatchingRow {
  key: string;
  name: string;
  code: string;
  frozenHitCount: number;
  currentHitCount: number;
  frozenHitRate: number;
  currentHitRate: number;
  version: number;
  addedHits: string[];
  removedHits: string[];
  requirementChanged: boolean;
}

/** 合并 `matching.frozen` / `matching.current` / `diff` 为逐方向行。 */
export function mergeMatchingRows(
  matching: TalentReportMatchingTab,
): ReportMatchingRow[] {
  const frozen = matching.frozen ?? [];
  const current = matching.current ?? [];
  const diffByKey = new Map(
    (matching.diff ?? []).map((item) => [
      String(item.directionId || item.code || item.name),
      item,
    ]),
  );
  const rows: ReportMatchingRow[] = [];
  const index = new Map<string, ReportMatchingRow>();
  for (const direction of frozen) {
    const key = directionKey(direction);
    const row: ReportMatchingRow = {
      key,
      name: direction.name,
      code: direction.code,
      frozenHitCount: Number(direction.hitCount || 0),
      currentHitCount: 0,
      frozenHitRate: Number(direction.hitRate || 0),
      currentHitRate: 0,
      version: Number(direction.version || 0),
      addedHits: [],
      removedHits: [],
      requirementChanged: false,
    };
    index.set(key, row);
    rows.push(row);
  }
  for (const direction of current) {
    const key = directionKey(direction);
    const existing = index.get(key);
    if (existing) {
      existing.currentHitCount = Number(direction.hitCount || 0);
      existing.currentHitRate = Number(direction.hitRate || 0);
      existing.version = Number(direction.version || existing.version);
      continue;
    }
    const row: ReportMatchingRow = {
      key,
      name: direction.name,
      code: direction.code,
      frozenHitCount: 0,
      currentHitCount: Number(direction.hitCount || 0),
      frozenHitRate: 0,
      currentHitRate: Number(direction.hitRate || 0),
      version: Number(direction.version || 0),
      addedHits: [],
      removedHits: [],
      requirementChanged: false,
    };
    index.set(key, row);
    rows.push(row);
  }
  for (const row of rows) {
    const diff = diffByKey.get(row.key);
    if (!diff) continue;
    row.addedHits = [...diff.addedHits];
    row.removedHits = [...diff.removedHits];
    row.requirementChanged = diff.requirementChanged === true;
  }
  return rows;
}

/** 匹配天赋「变化」列文案：要求变更 / 新增命中 / 移除命中，无变化显示「—」。 */
export function reportMatchingChangeText(row: ReportMatchingRow): string {
  const parts: string[] = [];
  if (row.requirementChanged) parts.push("要求变更");
  if (row.addedHits.length) parts.push(`+${row.addedHits.join("、")}`);
  if (row.removedHits.length) parts.push(`−${row.removedHits.join("、")}`);
  return parts.length ? parts.join("；") : "—";
}

/** 报告状态下拉选项（带计数；spec §6.1）。 */
export function buildStatusOptions(
  counts: Record<string, number>,
  total: number,
): SelectOption[] {
  return [
    { label: `全部（${total}）`, value: "" },
    { label: `待发布（${Number(counts.pending_publish || 0)}）`, value: "pending_publish" },
    { label: `已发布（${Number(counts.published || 0)}）`, value: "published" },
    { label: `已撤回（${Number(counts.retracted || 0)}）`, value: "retracted" },
  ];
}

/** 「新增分册」列文案：`N 篇 ABC`；无新增「—」（AC-ADM-06-1）。 */
export function newBooksText(count: number, books: string): string {
  const value = Number(count || 0);
  if (value <= 0) return "—";
  return books ? `${value} 篇 ${books}` : `${value} 篇`;
}