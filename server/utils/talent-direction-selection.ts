/**
 * @description M4 方向选择域服务端 IO：待归并请求 upsert / 计数、归并（写 aliases，不 bump version）/
 *   转正（生成停用待配置方向）、后台方向选择（选择 / 换档 / 取消，复用 M4-A `resolveDirectionSelection`
 *   与 M3 `recordTalentReportVersion`）。只写 `talent_direction_requests`、`talent_reports.selections` 与
 *   版本链，不写快照、不改 `snapshotVersion`、不 bump 方向 version、不回写历史选择。
 *   口径见 docs/specs/M4-matching/spec.md §3.4/§3.5/§4.5/§4.6/§4.7/§5.3–§5.4、ADR 0004-D5。
 * @file server/utils/talent-direction-selection.ts
 */
import type PocketBase from "pocketbase";
import { createError } from "h3";
import {
  TALENT_DIRECTION_MANUAL_NAME_MAX,
  TALENT_DIRECTION_REQUEST_COLLECTION,
  TALENT_DIRECTION_REQUEST_STATUS_PENDING,
  TALENT_DIRECTION_SELECTION_LIMIT,
  type TalentDirectionMergeResult,
  type TalentDirectionPromoteResult,
  type TalentDirectionRequestRecord,
  type TalentDirectionSelectionInput,
  type TalentDirectionSelectionResult,
  type TalentMatchTier,
  type TalentSelectionItem,
  type TalentSelectionAction,
} from "~~/shared/types/talent-direction";
import type { TalentDirection } from "~~/shared/types/talent-rule";
import type { TalentReportRecord } from "~~/shared/types/talent-report";
import { escapeFilterValue } from "~~/server/utils/pocketbase-client";
import {
  isValidManualDirectionName,
  normalizeManualDirectionName,
  pickManualTier,
  pickTier,
  resolveDirectionSelection,
  resolveSelectionLimit,
} from "~~/server/utils/talent-direction-match";
import {
  assertTalentDirectionAliasAvailable,
  buildTalentDirectionBrief,
  buildTalentDirectionStubPayload,
  conflictTalentDirection,
  invalidTalentDirection,
  loadTalentDirectionRequestOrThrow,
  loadTalentDirectionRequestRow,
  normalizeTalentDirectionAliases,
  notFoundTalentDirection,
} from "~~/server/utils/talent-direction-api";
import {
  TALENT_REPORT_COLLECTION,
  assertTalentReportPublished,
  getTalentReportOrThrow,
  recordTalentReportVersion,
} from "~~/server/utils/talent-report";
import { generateTalentDirectionCode } from "~~/server/utils/talent-rule-api";

/** 写操作执行人（审计 / 版本链 / 合并人）。 */
export interface TalentDirectionActor {
  userId?: string;
  userName?: string;
}

// ── 计数（M6 工作台消费） ───────────────────────────────────────────────────

/** 待归并请求数（spec §5.5；M6 工作台指标卡用）。 */
export async function countPendingTalentDirectionRequests(
  pb: PocketBase,
): Promise<number> {
  const result = await pb
    .collection(TALENT_DIRECTION_REQUEST_COLLECTION)
    .getList(1, 1, {
      filter: `status = "${TALENT_DIRECTION_REQUEST_STATUS_PENDING}"`,
      fields: "id",
      $autoCancel: false,
    });
  return Number(result.totalItems ?? 0) || 0;
}

// ── M1 只读视图 ─────────────────────────────────────────────────────────────

async function loadEnabledTiers(pb: PocketBase): Promise<TalentMatchTier[]> {
  const rows = await pb
    .collection("talent_tiers")
    .getFullList<{
      id: string;
      code?: string;
      name?: string;
      sortOrder?: number;
      teacher?: string;
      freq?: string;
      headline?: string;
      description?: string;
      status?: string;
      isDefault?: boolean;
    }>({ sort: "sortOrder", $autoCancel: false });
  return rows
    .filter((row) => String(row.status ?? "") === "1")
    .map((row) => ({
      id: String(row.id ?? ""),
      code: String(row.code ?? ""),
      name: String(row.name ?? ""),
      sortOrder: Number(row.sortOrder ?? 0) || 0,
      teacher: String(row.teacher ?? ""),
      freq: String(row.freq ?? ""),
      headline: String(row.headline ?? ""),
      description: String(row.description ?? ""),
      status: "1" as const,
      isDefault: row.isDefault === true,
    }));
}

async function loadDirectionsById(
  pb: PocketBase,
): Promise<Map<string, TalentDirection>> {
  const rows = await pb
    .collection("talent_directions")
    .getFullList<TalentDirection>({ $autoCancel: false });
  return new Map(rows.map((row) => [String(row.id ?? ""), row]));
}

function reportSelections(report: TalentReportRecord): TalentSelectionItem[] {
  return Array.isArray(report.selections)
    ? (report.selections as TalentSelectionItem[]).map((item) => ({ ...item }))
    : [];
}

function snapshotDirectionOf(
  report: TalentReportRecord,
  directionId: string,
) {
  const directions = Array.isArray(report.directionSnapshot?.directions)
    ? report.directionSnapshot!.directions
    : [];
  return directions.find((item) => String(item.directionId) === directionId) ?? null;
}

// ── 错误映射（纯函数 code → HTTP） ──────────────────────────────────────────

function mapSelectionError(
  code: string | undefined,
  message: string | undefined,
  selectionLimit: number,
): never {
  switch (code) {
    case "LIMIT_REACHED":
      throw conflictTalentDirection(
        message || `最多可选择 ${selectionLimit} 个方向，请先取消一个`,
        "SELECTION_LIMIT_REACHED",
      );
    case "DUPLICATE":
      throw conflictTalentDirection(message || "该方向已选择，请使用换档", "DUPLICATE_SELECTION");
    case "INVALID_MANUAL_NAME":
      throw invalidTalentDirection(
        message ||
          `自填方向名称需为 1–${TALENT_DIRECTION_MANUAL_NAME_MAX} 个字且不含控制字符`,
        "INVALID_MANUAL_NAME",
      );
    case "INVALID_TIER":
      throw invalidTalentDirection(message || "目标档位不可用", "TIER_UNAVAILABLE");
    case "NOT_SELECTED":
      throw createError({
        statusCode: 404,
        message: message || "尚未选择该方向",
        data: { code: "SELECTION_NOT_FOUND" },
      });
    default:
      throw invalidTalentDirection(message || "目标方向不可用", "INVALID_TARGET");
  }
}

// ── 报告写入（selections + M3 版本链） ──────────────────────────────────────

async function writeReportSelections(
  pb: PocketBase,
  reportId: string,
  selections: readonly TalentSelectionItem[],
): Promise<void> {
  await pb.collection(TALENT_REPORT_COLLECTION).update(
    reportId,
    { selections: selections.map((item) => ({ ...item })) },
    { $autoCancel: false },
  );
}

async function appendSelectionVersion(
  pb: PocketBase,
  reportId: string,
  summary: string,
  actor: TalentDirectionActor,
): Promise<void> {
  await recordTalentReportVersion(pb, reportId, {
    summary,
    operatorId: actor.userId,
    operatorName: actor.userName,
  });
}

function selectionDisplayName(selection: TalentSelectionItem | undefined): string {
  if (!selection) return "方向";
  const name = selection.custom
    ? normalizeManualDirectionName(selection.manualName)
    : String(selection.directionName ?? "");
  return name || "方向";
}

// ── 自填方向待归并请求 upsert（两步写补偿见 spec §4.7 / §12 R4） ─────────────

export interface UpsertTalentDirectionRequestInput {
  report: TalentReportRecord;
  manualName: string;
  tierId: string;
  actor?: TalentDirectionActor;
}

/** 自填方向请求 upsert：`(reportId, manualName)` 待归并唯一，重复提交复用旧请求。 */
export async function upsertTalentDirectionRequest(
  pb: PocketBase,
  input: UpsertTalentDirectionRequestInput,
): Promise<{ request: TalentDirectionRequestRecord; created: boolean }> {
  const reportId = String(input.report.id ?? "");
  const manualName = normalizeManualDirectionName(input.manualName);
  const tierId = String(input.tierId ?? "").trim();
  const pendingFilter =
    `reportId = "${escapeFilterValue(reportId)}" && ` +
    `manualName = "${escapeFilterValue(manualName)}" && ` +
    `status = "${TALENT_DIRECTION_REQUEST_STATUS_PENDING}"`;
  const existing = await pb
    .collection(TALENT_DIRECTION_REQUEST_COLLECTION)
    .getFirstListItem<TalentDirectionRequestRecord>(pendingFilter, {
      $autoCancel: false,
    })
    .catch(() => null);
  if (existing) {
    // 同名重复提交只更新目标档位，保留原提交事实与 createdBy。
    if (String(existing.tierId ?? "") === tierId) return { request: existing, created: false };
    const updated = await pb
      .collection(TALENT_DIRECTION_REQUEST_COLLECTION)
      .update<TalentDirectionRequestRecord>(
        existing.id,
        { tierId },
        { $autoCancel: false },
      )
      .catch(() => existing);
    return { request: updated, created: false };
  }

  const payload = {
    reportId,
    subjectType: String(input.report.subjectType ?? ""),
    subjectId: String(input.report.subjectId ?? ""),
    parentId: String(input.report.parentId ?? ""),
    manualName,
    tierId,
    status: TALENT_DIRECTION_REQUEST_STATUS_PENDING,
    targetDirectionId: "",
    createdBy: String(input.actor?.userId ?? ""),
  };
  try {
    const request = await pb
      .collection(TALENT_DIRECTION_REQUEST_COLLECTION)
      .create<TalentDirectionRequestRecord>(payload, { $autoCancel: false });
    return { request, created: true };
  } catch (error) {
    // 并发下唯一索引兜底：回读同键待归并请求，仍找不到再抛 500（不泄露 PB 原始错误）。
    const raced = await pb
      .collection(TALENT_DIRECTION_REQUEST_COLLECTION)
      .getFirstListItem<TalentDirectionRequestRecord>(pendingFilter, {
        $autoCancel: false,
      })
      .catch(() => null);
    if (raced) return { request: raced, created: false };
    void error;
    throw createError({
      statusCode: 500,
      message: "自填方向提交失败，请稍后重试",
    });
  }
}

// ── 归并：写 aliases（不 bump version） ─────────────────────────────────────

/**
 * 归并待归并方向到正式方向（spec §4.7）：目标必须启用；别名全局唯一；写 `aliases` 但
 * **不 bump 方向 version**（别名不参与命中，version 只服务「发布时 vs 当前配置」对照）；
 * 历史 `selections` 不回写。
 */
export async function mergeTalentDirectionRequest(
  pb: PocketBase,
  requestId: unknown,
  targetDirectionId: unknown,
  actor: TalentDirectionActor = {},
): Promise<TalentDirectionMergeResult> {
  const id = String(requestId ?? "").trim();
  const targetId = String(targetDirectionId ?? "").trim();
  if (!id) throw notFoundTalentDirection();
  if (!targetId) throw invalidTalentDirection("请选择目标方向", "TARGET_DIRECTION_REQUIRED");

  const request = await loadTalentDirectionRequestOrThrow(pb, id);
  const target = await pb
    .collection("talent_directions")
    .getOne<TalentDirection>(targetId, { $autoCancel: false })
    .catch(() => null);
  if (!target) throw notFoundTalentDirection("目标培养方向不存在");

  const status = String(request.status ?? "");
  if (status === "已归并") {
    if (String(request.targetDirectionId ?? "") === String(target.id))
      return {
        request: await loadTalentDirectionRequestRow(pb, request.id),
        direction: buildTalentDirectionBrief(target),
      };
    throw conflictTalentDirection(
      "该待归并方向已归并到其它方向",
      "REQUEST_ALREADY_PROCESSED",
    );
  }
  if (status !== TALENT_DIRECTION_REQUEST_STATUS_PENDING)
    throw conflictTalentDirection(
      "该待归并方向已处理，不能再次归并",
      "REQUEST_ALREADY_PROCESSED",
    );
  if (String(target.status ?? "") !== "1")
    throw invalidTalentDirection(
      "目标方向已停用，请先启用后再归并",
      "TARGET_DIRECTION_DISABLED",
    );

  const alias = normalizeManualDirectionName(request.manualName);
  await assertTalentDirectionAliasAvailable(pb, alias, String(target.id));

  const currentAliases = normalizeTalentDirectionAliases(target.aliases);
  let updatedDirection = target;
  if (!currentAliases.includes(alias)) {
    updatedDirection = await pb
      .collection("talent_directions")
      .update<TalentDirection>(
        target.id,
        {
          aliases: [...currentAliases, alias],
          updatedBy: String(actor.userId ?? ""),
        },
        { $autoCancel: false },
      );
  }
  await pb.collection(TALENT_DIRECTION_REQUEST_COLLECTION).update(
    request.id,
    {
      status: "已归并",
      targetDirectionId: target.id,
      mergedAt: new Date().toISOString(),
      mergedBy: String(actor.userId ?? ""),
    },
    { $autoCancel: false },
  );
  return {
    request: await loadTalentDirectionRequestRow(pb, request.id),
    direction: buildTalentDirectionBrief(updatedDirection),
  };
}

// ── 转正：生成「停用待配置」方向（绕过 M1 保存校验） ─────────────────────────

/**
 * 转正待归并方向（spec §4.7）：生成 `status="0"`、`requirements=[]`、`tierIds=启用档位全集`、
 * `defaultTierId=全局默认档位`、`version=1` 的方向；管理员补齐配置后走 M1 PUT（version+1）。
 * 停用方向直接经超管 PB 创建，不走 M1 `POST /directions` 的「≥1 要素 / 档位」校验。
 */
export async function promoteTalentDirectionRequest(
  pb: PocketBase,
  requestId: unknown,
  actor: TalentDirectionActor = {},
): Promise<TalentDirectionPromoteResult> {
  const request = await loadTalentDirectionRequestOrThrow(pb, requestId);
  const status = String(request.status ?? "");

  if (status === "已转正式") {
    const target = await pb
      .collection("talent_directions")
      .getOne<TalentDirection>(String(request.targetDirectionId ?? ""), {
        $autoCancel: false,
      })
      .catch(() => null);
    if (!target)
      throw conflictTalentDirection(
        "该待归并方向已转正式，但目标方向不存在",
        "REQUEST_ALREADY_PROCESSED",
      );
    return {
      request: await loadTalentDirectionRequestRow(pb, request.id),
      direction: buildTalentDirectionBrief(target),
    };
  }
  if (status !== TALENT_DIRECTION_REQUEST_STATUS_PENDING)
    throw conflictTalentDirection(
      "该待归并方向已处理，不能再次转正式",
      "REQUEST_ALREADY_PROCESSED",
    );

  const tiers = await loadEnabledTiers(pb);
  if (!tiers.length)
    throw invalidTalentDirection(
      "暂无启用档位，无法生成待配置方向",
      "NO_TIER_AVAILABLE",
    );
  const tierIds = tiers.map((tier) => tier.id);
  const defaultTier =
    tiers.find((tier) => tier.isDefault === true) ?? tiers[0]!;
  const code = await generateTalentDirectionCode(pb);
  const payload = buildTalentDirectionStubPayload({
    manualName: normalizeManualDirectionName(request.manualName),
    code,
    tierIds,
    defaultTierId: defaultTier.id,
    createdBy: String(actor.userId ?? ""),
    updatedBy: String(actor.userId ?? ""),
  });
  const direction = await pb
    .collection("talent_directions")
    .create<TalentDirection>(payload, { $autoCancel: false });
  await pb.collection(TALENT_DIRECTION_REQUEST_COLLECTION).update(
    request.id,
    {
      status: "已转正式",
      targetDirectionId: direction.id,
      mergedAt: new Date().toISOString(),
      mergedBy: String(actor.userId ?? ""),
    },
    { $autoCancel: false },
  );
  return {
    request: await loadTalentDirectionRequestRow(pb, request.id),
    direction: buildTalentDirectionBrief(direction),
  };
}

// ── 后台方向选择：选择 / 换档 / 取消 ────────────────────────────────────────

function selectionByTarget(
  selections: readonly TalentSelectionItem[],
  target: { directionId: string; requestId: string },
): TalentSelectionItem | undefined {
  return selections.find(
    (item) =>
      (target.directionId !== "" && !item.custom && item.directionId === target.directionId) ||
      (target.requestId !== "" && item.custom && item.requestId === target.requestId),
  );
}

function selectionResult(
  report: Pick<TalentReportRecord, "id" | "reportNo">,
  selections: readonly TalentSelectionItem[],
  selectionLimit: number,
  extras: Partial<TalentDirectionSelectionResult> = {},
): TalentDirectionSelectionResult {
  return {
    reportId: String(report.id ?? ""),
    reportNo: String(report.reportNo ?? ""),
    selections: selections.map((item) => ({ ...item })),
    selectionCount: selections.length,
    selectionLimit,
    changed: false,
    alreadySelected: false,
    requestId: "",
    ...extras,
  };
}

/**
 * 后台方向选择（spec §4.6 / §5.3.6–§5.3.8 的领域实现）：
 * - 选择：正式方向必须在报告冻结快照内且当前启用；自填走待归并请求 upsert；
 * - 换档：目标档位必须 ∈ 候选（启用档位 ∩ 方向 tierIds）；同档位幂等 `changed:false`；
 * - 取消：未选幂等成功；均只在 `changed=true` 时写 selections 与 M3 版本记录。
 */
export async function resolveTalentReportDirectionSelection(
  pb: PocketBase,
  reportId: unknown,
  input: TalentDirectionSelectionInput,
  actor: TalentDirectionActor = {},
): Promise<TalentDirectionSelectionResult> {
  const id = String(reportId ?? "").trim();
  if (!id) throw notFoundTalentDirection("报告不存在");
  const report = await getTalentReportOrThrow(pb, id);
  assertTalentReportPublished(report);

  const selections = reportSelections(report);
  const selectionLimit = resolveSelectionLimit(
    report.directionSnapshot?.selectionLimit ??
      TALENT_DIRECTION_SELECTION_LIMIT,
  );
  const action = input.action as TalentSelectionAction;
  const directionId = String(input.directionId ?? "").trim();
  const requestId = String(input.requestId ?? "").trim();
  const manualName = normalizeManualDirectionName(input.manualName);
  const requestedTierId = String(input.tierId ?? "").trim();
  const selectedAt = new Date().toISOString();

  // 取消：幂等；未选不写库、不追加版本。
  if (action === "cancel") {
    if (!directionId && !requestId)
      throw invalidTalentDirection("缺少已选方向 id", "INVALID_TARGET");
    const resolution = resolveDirectionSelection({
      action: "cancel",
      selections,
      selectionLimit,
      target: { directionId, requestId, selectedAt },
    });
    if (!resolution.changed)
      return selectionResult(report, selections, selectionLimit);
    await writeReportSelections(pb, report.id, resolution.selections);
    await appendSelectionVersion(
      pb,
      report.id,
      `取消「${selectionDisplayName(resolution.selection)}」`,
      actor,
    );
    return selectionResult(report, resolution.selections, selectionLimit, {
      selection: resolution.selection,
      changed: true,
    });
  }

  const tiers = await loadEnabledTiers(pb);
  const directionsById = await loadDirectionsById(pb);

  // 换档：只更新档位字段，保留选择时冻结的方向名称。
  if (action === "changeTier") {
    if (!directionId && !requestId)
      throw invalidTalentDirection("缺少已选方向 id", "INVALID_TARGET");
    if (!requestedTierId)
      throw invalidTalentDirection("请选择目标档位", "TIER_UNAVAILABLE");
    const current = selectionByTarget(selections, { directionId, requestId });
    if (!current)
      throw createError({
        statusCode: 404,
        message: "尚未选择该方向",
        data: { code: "SELECTION_NOT_FOUND" },
      });

    let candidates: TalentMatchTier[] = tiers;
    if (!current.custom) {
      const snapshotDirection = snapshotDirectionOf(report, current.directionId);
      if (!snapshotDirection)
        throw notFoundTalentDirection("该方向不在报告的冻结快照内");
      const direction = directionsById.get(current.directionId);
      if (!direction || String(direction.status ?? "") !== "1")
        throw invalidTalentDirection("该方向已停用，暂不可换档", "DIRECTION_NOT_AVAILABLE");
      const snapshotTierIds = new Set(snapshotDirection.tierIds.map(String));
      candidates = tiers.filter((tier) => snapshotTierIds.has(tier.id));
    }
    if (!candidates.some((tier) => tier.id === requestedTierId))
      throw invalidTalentDirection("目标档位不在该方向候选档位内", "TIER_UNAVAILABLE");
    const tier = candidates.find((item) => item.id === requestedTierId)!;

    const resolution = resolveDirectionSelection({
      action: "changeTier",
      selections,
      selectionLimit,
      target: {
        directionId: current.directionId,
        requestId: current.requestId,
        custom: current.custom,
        tierId: tier.id,
        tierName: tier.name,
        teacher: tier.teacher,
        freq: tier.freq,
        selectedAt,
      },
      allowedTierIds: candidates.map((item) => item.id),
    });
    if (!resolution.ok)
      mapSelectionError(resolution.code, resolution.message, selectionLimit);
    if (!resolution.changed)
      return selectionResult(report, selections, selectionLimit, {
        selection: resolution.selection,
        alreadySelected: true,
      });
    await writeReportSelections(pb, report.id, resolution.selections);
    await appendSelectionVersion(
      pb,
      report.id,
      `更换「${selectionDisplayName(current)}」目标档位为 ${tier.name}`,
      actor,
    );
    return selectionResult(report, resolution.selections, selectionLimit, {
      selection: resolution.selection,
      changed: true,
    });
  }

  // 选择：正式方向 or 自填方向。
  const custom = directionId === "" && manualName !== "";
  if (!directionId && !custom)
    throw invalidTalentDirection("请选择培养方向或填写自定义方向名称", "INVALID_TARGET");

  if (!custom) {
    const snapshotDirection = snapshotDirectionOf(report, directionId);
    if (!snapshotDirection)
      throw notFoundTalentDirection("该方向不在报告的冻结快照内");
    const direction = directionsById.get(directionId);
    if (!direction || String(direction.status ?? "") !== "1")
      throw invalidTalentDirection("该方向已停用，暂不可选择", "DIRECTION_NOT_AVAILABLE");
    const snapshotTierIds = new Set(snapshotDirection.tierIds.map(String));
    const candidates = tiers.filter((tier) => snapshotTierIds.has(tier.id));
    const tier =
      pickTier(
        {
          tierIds: snapshotDirection.tierIds.map(String),
          defaultTierId: String(snapshotDirection.defaultTierId ?? ""),
        },
        candidates,
        { requestedTierId },
      ) ?? null;
    if (!tier)
      throw invalidTalentDirection("该方向暂未开放档位", "TIER_UNAVAILABLE");

    const existing = selectionByTarget(selections, { directionId, requestId: "" });
    if (existing) {
      if (String(existing.tierId ?? "") === tier.id)
        return selectionResult(report, selections, selectionLimit, {
          selection: existing,
          alreadySelected: true,
        });
      throw conflictTalentDirection(
        "该方向已选择，请使用换档更新目标档位",
        "DUPLICATE_SELECTION",
      );
    }
    const resolution = resolveDirectionSelection({
      action: "select",
      selections,
      selectionLimit,
      target: {
        directionId,
        custom: false,
        tierId: tier.id,
        directionName: String(snapshotDirection.name ?? ""),
        tierName: tier.name,
        teacher: tier.teacher,
        freq: tier.freq,
        selectedAt,
      },
      allowedTierIds: candidates.map((item) => item.id),
    });
    if (!resolution.ok)
      mapSelectionError(resolution.code, resolution.message, selectionLimit);
    await writeReportSelections(pb, report.id, resolution.selections);
    await appendSelectionVersion(
      pb,
      report.id,
      `选择「${String(snapshotDirection.name ?? "")}」·目标档位 ${tier.name}`,
      actor,
    );
    return selectionResult(report, resolution.selections, selectionLimit, {
      selection: resolution.selection,
      changed: true,
    });
  }

  // 自填方向：先校验名称 / 档位 / 上限，再 upsert 待归并请求，最后写 selections（失败补偿删除）。
  if (!isValidManualDirectionName(manualName))
    throw invalidTalentDirection(
      `自填方向名称需为 1–${TALENT_DIRECTION_MANUAL_NAME_MAX} 个字且不含控制字符`,
      "INVALID_MANUAL_NAME",
    );
  const tier = pickManualTier(tiers, { requestedTierId });
  if (!tier)
    throw invalidTalentDirection("暂无启用档位，暂不可提交自填方向", "NO_TIER_AVAILABLE");
  const existing = selections.find(
    (item) =>
      item.custom &&
      normalizeManualDirectionName(item.manualName) === manualName,
  );
  if (existing) {
    if (String(existing.tierId ?? "") === tier.id)
      return selectionResult(report, selections, selectionLimit, {
        selection: existing,
        alreadySelected: true,
        requestId: String(existing.requestId ?? ""),
      });
    throw conflictTalentDirection(
      "该自填方向已选择，请使用换档更新目标档位",
      "DUPLICATE_SELECTION",
    );
  }
  if (selections.length >= selectionLimit)
    throw conflictTalentDirection(
      `最多可选择 ${selectionLimit} 个方向，请先取消一个`,
      "SELECTION_LIMIT_REACHED",
    );

  const { request, created } = await upsertTalentDirectionRequest(pb, {
    report,
    manualName,
    tierId: tier.id,
    actor,
  });
  const resolution = resolveDirectionSelection({
    action: "select",
    selections,
    selectionLimit,
    target: {
      requestId: String(request.id ?? ""),
      custom: true,
      tierId: tier.id,
      manualName,
      tierName: tier.name,
      teacher: tier.teacher,
      freq: tier.freq,
      selectedAt,
    },
    allowedTierIds: tiers.map((item) => item.id),
  });
  if (!resolution.ok) {
    if (created)
      await pb
        .collection(TALENT_DIRECTION_REQUEST_COLLECTION)
        .delete(request.id, { $autoCancel: false })
        .catch(() => undefined);
    mapSelectionError(resolution.code, resolution.message, selectionLimit);
  }
  try {
    await writeReportSelections(pb, report.id, resolution.selections);
  } catch (error) {
    // 两步写无 PB 事务：报告写入失败时 best-effort 删除新建请求，避免脏待归并（spec §12 R4）。
    if (created)
      await pb
        .collection(TALENT_DIRECTION_REQUEST_COLLECTION)
        .delete(request.id, { $autoCancel: false })
        .catch(() => undefined);
    throw error;
  }
  await appendSelectionVersion(
    pb,
    report.id,
    `提交自填方向「${manualName}」·目标档位 ${tier.name}`,
    actor,
  );
  return selectionResult(report, resolution.selections, selectionLimit, {
    selection: resolution.selection,
    changed: true,
    requestId: String(request.id ?? ""),
  });
}
