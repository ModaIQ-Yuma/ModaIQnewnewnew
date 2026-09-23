// ─── 读表格文件 → 二维数组（xlsx / xls / csv）───────────────────────────────
// CSV 自动识别编码：合法 UTF-8（含 BOM）按 UTF-8 读，否则按 GB18030（Excel 另存的中文 CSV）。
import * as XLSX from "xlsx";

function decodeCsv(buf) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^\uFEFF/, ""); }
  catch { return new TextDecoder("gb18030").decode(buf); }
}

/** @returns 二维数组，第 0 行为表头 */
export function readSheetRows(arrayBuffer, fileName = "") {
  const wb = /\.csv$/i.test(fileName)
    ? XLSX.read(decodeCsv(arrayBuffer), { type: "string", raw: true })
    : XLSX.read(arrayBuffer, { type: "array" });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "", raw: false });
}
