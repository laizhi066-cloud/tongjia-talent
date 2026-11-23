/**
 * @file scripts/lib/env-file.mjs
 * @description 可靠的 `.env` 行解析单一真源，供构建与 PocketBase 环境入口共用。
 *   规则：忽略空行与整行注释；`KEY=VALUE`；键须合法标识符；去值首尾空白；去成对引号；
 *   **未加引号的值去掉行尾 ` # 注释`**（否则路径或 URL 会把注释混进去）。
 *   另导出 env 三文件职责表与体检函数，供 `doctor` 指出「放错文件 / 跨文件重复」的变量。
 */
import fs from 'node:fs'

/**
 * 解析一行 → `[key, value]` 或 `null`（空行 / 注释 / 非法）。
 * @param {string} raw 原始行
 * @returns {[string, string] | null}
 */
export function parseEnvLine(raw) {
  const line = raw.trimStart()
  if (!line || line.startsWith('#'))
    return null
  const eq = line.indexOf('=')
  if (eq <= 0)
    return null
  const key = line.slice(0, eq).trim()
  if (!/^[A-Za-z_]\w*$/.test(key))
    return null
  let val = line.slice(eq + 1).trim()
  // 引号值：整体保留（含 # 与空格），仅去成对引号
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\'')))
    return [key, val.slice(1, -1)]
  // 未加引号：去掉行尾注释（空白 + #...）再去尾空白 —— 防注释混进路径/URL
  const hash = val.search(/\s#/)
  if (hash !== -1)
    val = val.slice(0, hash)
  return [key, val.trim()]
}

/**
 * 解析整个 env 文件 → `{ KEY: value }`（同键后者覆盖前者）；文件不存在返回 `{}`。
 * @param {string} file 绝对路径
 */
export function parseEnvFile(file) {
  /** @type {Record<string, string>} */
  const out = {}
  if (!fs.existsSync(file))
    return out
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const kv = parseEnvLine(raw)
    if (kv)
      out[kv[0]] = kv[1]
  }
  return out
}
