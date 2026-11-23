/**
 * @description 平台工作台汇总：注册家长 / 已出结果 / 已发布报告 / 待处理事项 + 最近操作。
 *   数据来自当前 PocketBase；报告域 M3 未落地前沿用现有 talent_reports 状态口径。
 * @file server/api/admin/talent/dashboard.get.ts
 * @route GET /api/admin/talent/dashboard
 */
import { getAdminPB } from "~~/server/utils/pocketbase-client";
import { requirePermission } from "~~/server/utils/permission";
import { success } from "~~/server/utils/response";

export default defineEventHandler(async (event) => {
  // M6-A：工作台使用独立权限码，不再复用 talent:report:list，避免「能看工作台」
  // 顺带获得 GET /api/admin/talent/reports 的报告列表权限（ADR 0006-D3）。
  await requirePermission(event, "talent:dashboard:list");
  const pb = await getAdminPB();
  const [parents, children, reports, recentLogs] = await Promise.all([
    pb.collection("talent_parents").getFullList({ fields: "id", $autoCancel: false }),
    pb.collection("talent_children").getFullList({
      fields: "id,parentId,query",
      $autoCancel: false,
    }),
    pb.collection("talent_reports").getFullList({
      fields: "id,status",
      $autoCancel: false,
    }),
    pb
      .collection("oper_logs")
      .getList(1, 30, {
        sort: "-created",
        fields: "id,created,title,operName,operType,status",
        $autoCancel: false,
      })
      .then((result) =>
        result.items.filter((row) => !String(row.title || "").includes("在线用户")),
      )
      .catch(() => []),
  ]);

  const found = children.filter((row) => String(row.query || "") === "found").length;
  const pendingChildren = children.length - found;
  const boundChildren = children.filter((row) => String(row.parentId || "").trim()).length;
  const published = reports.filter((row) => String(row.status || "") === "published").length;
  const pendingReports = reports.filter((row) =>
    ["pending", "pending_publish", "待发布"].includes(String(row.status || "")),
  ).length;
  const withdrawn = reports.filter((row) =>
    ["revoked", "withdrawn", "已撤回"].includes(String(row.status || "")),
  ).length;
  const pendingTotal = pendingReports + pendingChildren;

  return success(
    {
      parents: { total: parents.length, boundChildren },
      children: { found, pending: pendingChildren, total: children.length },
      reports: { published, pending: pendingReports, withdrawn, total: reports.length },
      pending: {
        total: pendingTotal,
        pendingReports,
        pendingChildren,
      },
      recent: recentLogs.slice(0, 6).map((row) => ({
        id: row.id,
        time: row.created,
        operator: row.operName || "系统",
        title: row.title || "—",
        status: Number(row.status || 0),
      })),
    },
    "天赋工作台汇总",
  );
});
