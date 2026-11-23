/**
 * @description 应用探活接口（无需鉴权）：供负载均衡 / PM2 / 监控系统检查进程是否存活。
 * 默认只做轻量存活检查；带 ?deep=1 时额外探测唯一 PocketBase 健康端点。
 * @file server/api/health.get.ts
 * @route GET /api/health
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const deep = String(query.deep || "") === "1";
  const payload: Record<string, unknown> = {
    status: "ok",
    time: new Date().toISOString(),
  };
  if (deep) {
    const pbUrl = (process.env.POCKETBASE_URL || "http://127.0.0.1:8090").replace(/\/$/, "");
    try {
      const response = await fetch(`${pbUrl}/api/health`, { signal: AbortSignal.timeout(3000) });
      payload.pocketbase = response.ok ? "up" : `down:${response.status}`;
      if (!response.ok) payload.status = "degraded";
    }
    catch {
      payload.pocketbase = "down";
      payload.status = "degraded";
    }
  }
  return success(payload);
});
