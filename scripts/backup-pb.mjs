#!/usr/bin/env node
/**
 * @description PocketBase 定时备份：创建一次备份、下载到 backups/，并清理过期文件。
 *  - 只读创建 PB 内置备份（pb_data/backups），再复制一份到仓库 backups/（已 gitignore）。
 *  - 生产建议用 cron / 定时任务执行：`pnpm backup:pb`。
 * @file scripts/backup-pb.mjs
 * @usage pnpm backup:pb [--keep=14] [--dir=backups]
 */
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import PocketBase from "pocketbase";
import { loadDotEnv } from "./_pb.mjs";

loadDotEnv();

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.POCKETBASE_URL || "http://127.0.0.1:8090";
const email = process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_ADMIN_PASSWORD || process.env.POCKETBASE_ADMIN_PASS;
if (!email || !password)
  throw new Error("缺少 POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD");

const arg = (name, fallback) => {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const keep = Math.max(1, Number(arg("keep", "14")) || 14);
const outDir = resolve(ROOT, arg("dir", "backups"));
mkdirSync(outDir, { recursive: true });

const pb = new PocketBase(url);
pb.autoCancellation(false);
await pb.collection("_superusers").authWithPassword(email, password);

// 1. 让 PocketBase 生成一次一致性备份（名称由 PB 生成，避免自定义名校验失败）。
await pb.backups.create();
const backups = await pb.backups.getFullList();
const latest = [...backups].sort((a, b) => String(b.modified).localeCompare(String(a.modified)))[0];
if (!latest?.key)
  throw new Error("未找到刚创建的 PocketBase 备份");

// 2. 下载到仓库 backups/（与 pb_data 分离，便于异地保存）。
// PocketBase 备份下载需要用文件令牌（file token）作为 query 参数。
const target = resolve(outDir, latest.key.endsWith(".zip") ? latest.key : `${latest.key}.zip`);
const fileToken = await pb.files.getToken();
const response = await fetch(`${url}/api/backups/${encodeURIComponent(latest.key)}?token=${encodeURIComponent(fileToken)}`);
if (!response.ok)
  throw new Error(`下载备份失败：HTTP ${response.status}`);
writeFileSync(target, Buffer.from(await response.arrayBuffer()));

// 3. 本地只保留最近 N 份，避免磁盘被占满。
const localFiles = readdirSync(outDir)
  .filter((file) => file.endsWith(".zip"))
  .map((file) => ({ file, path: resolve(outDir, file), mtime: statSync(resolve(outDir, file)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);
const removed = [];
for (const entry of localFiles.slice(keep)) {
  rmSync(entry.path, { force: true });
  removed.push(entry.file);
}

console.log(JSON.stringify({
  url,
  created: latest.key,
  downloaded: target,
  sizeBytes: statSync(target).size,
  localKept: Math.min(localFiles.length, keep),
  removedLocal: removed,
  hint: "生产环境请用 cron 定时执行 `pnpm backup:pb`，并定期把 backups/ 复制到异地存储。",
}, null, 2));
