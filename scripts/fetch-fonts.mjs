#!/usr/bin/env node
/**
 * @description 下载 PDF 渲染所需的中文字体（Noto Sans CJK SC Regular），字体本体不入 Git 仓库。
 *   - 落盘：`server/assets/fonts/NotoSansSC-Regular.otf`（OFL 授权，`OFL.txt` 仍随仓库保留）。
 *   - 已存在且 SHA-256 匹配时直接跳过；不匹配则重新下载覆盖，避免嵌入被替换/损坏的字体。
 *   - 缺失时 PDF 服务会抛出明确错误并回落到系统字体候选，不会伪造或输出空白 PDF。
 * @file scripts/fetch-fonts.mjs
 * @usage pnpm fonts:fetch [--force]
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = resolve(ROOT, "server/assets/fonts/NotoSansSC-Regular.otf");
const TEMP = `${TARGET}.part`;
const FONT_URL =
  "https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf";
const FONT_SHA256 = "2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b";

const force = process.argv.includes("--force");

/**
 * 计算文件 SHA-256。
 * @param {Buffer | Uint8Array} bytes 文件内容。
 * @returns {string} 十六进制摘要。
 */
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * 校验已有字体文件是否与上游一致。
 * @returns {Promise<boolean>} 命中时返回 true。
 */
async function hasValidFont() {
  if (!existsSync(TARGET)) return false;
  try {
    const digest = sha256(await readFile(TARGET));
    return digest === FONT_SHA256;
  } catch {
    return false;
  }
}

console.log("[fonts:fetch] 目标：server/assets/fonts/NotoSansSC-Regular.otf");

if (!force && (await hasValidFont())) {
  console.log("[fonts:fetch] 已存在且校验通过，跳过下载。");
  process.exit(0);
}

if (!existsSync(dirname(TARGET))) await mkdir(dirname(TARGET), { recursive: true });

console.log(`[fonts:fetch] 下载 ${FONT_URL}`);
const response = await fetch(FONT_URL, { redirect: "follow" });
if (!response.ok) throw new Error(`[fonts:fetch] 下载失败：HTTP ${response.status}`);

const bytes = Buffer.from(await response.arrayBuffer());
const digest = sha256(bytes);
if (digest !== FONT_SHA256) {
  await rm(TEMP, { force: true });
  throw new Error(`[fonts:fetch] 校验失败：期望 ${FONT_SHA256}，实际 ${digest}`);
}

await writeFile(TEMP, bytes);
await rename(TEMP, TARGET);
console.log(`[fonts:fetch] 完成：${(bytes.length / 1024 / 1024).toFixed(1)} MB，sha256 ${digest.slice(0, 16)}…`);