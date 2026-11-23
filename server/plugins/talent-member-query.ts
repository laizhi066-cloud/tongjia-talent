/**
 * @description M2 子女查询超时扫描（Nitro 插件）：启动后异步执行一次，此后每
 *   `TALENT_QUERY_SWEEP_INTERVAL_MS`（默认 10 分钟）扫描一次，把超过
 *   `TALENT_QUERY_TIMEOUT_HOURS`（默认 24h）仍处于 `querying` 的子女转 `not_found/api_error`
 *   并写 `error_logs` 告警。扫描不阻塞 Nitro 启动，`close` 钩子清理定时器。
 * @file server/plugins/talent-member-query.ts
 */
import {
  resolveTalentQuerySweepIntervalMs,
  sweepTalentQueryTimeouts,
} from "../utils/talent-member-query";

export default defineNitroPlugin((nitroApp) => {
  const runSweep = () => {
    void sweepTalentQueryTimeouts()
      .then((result) => {
        if (result.converted > 0)
          console.warn(
            `[talent-member] 查询超时扫描：扫描 ${result.scanned} 条，转失败 ${result.converted} 条`,
          );
      })
      .catch((error) => {
        // 扫描失败只提示，不影响服务；错误信息不含手机号 / 证件号。
        console.warn(
          `[talent-member] 查询超时扫描失败：${error instanceof Error ? error.message : String(error)}`,
        );
      });
  };

  // 启动扫描延后到事件循环下一轮，避免阻塞 Nitro 启动（PB 未就绪时下一轮再重试由定时器覆盖）。
  const initialTimer = setTimeout(runSweep, 0);
  const intervalMs = resolveTalentQuerySweepIntervalMs();
  const intervalTimer = setInterval(runSweep, intervalMs);
  const unref = (timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>) => {
    const handle = timer as unknown as { unref?: () => void };
    if (typeof handle.unref === "function") handle.unref();
  };
  unref(initialTimer);
  unref(intervalTimer);

  nitroApp.hooks.hook("close", () => {
    clearTimeout(initialTimer);
    clearInterval(intervalTimer);
  });
});