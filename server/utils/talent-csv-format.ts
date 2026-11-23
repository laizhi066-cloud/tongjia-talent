/**
 * @description 天赋域 CSV 编码（BOM + CRLF + 引号转义）：从旧机构端导出工具 `talent-export.ts`
 *   抽出的纯函数，仅服务 M1 规则导出 / M5 建议导出；不做数据范围过滤与鉴权（由路由负责）。
 * @file server/utils/talent-csv-format.ts
 */

export type TalentCsvValue = string | number | boolean | null | undefined;

function escapeCell(value: TalentCsvValue): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** 生成带 UTF-8 BOM 的 CSV 文本，Excel 打开中文不乱码。 */
export function encodeTalentCsv(headers: string[], rows: TalentCsvValue[][]): string {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n")}\r\n`;
}