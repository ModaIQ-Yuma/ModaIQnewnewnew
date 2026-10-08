// ─── 月度提报 Excel 的格式（照旧表还原）：宋体、细边框、绿色表头、黄色合计 ──────
// 只负责「把一格写成什么样」，不含业务口径；表的内容在 reportSheets.js。

export const GREEN = "FF75BD42";     // 表头 / 分档第一行
export const LIGHT = "FFE3F1D9";     // 奖金组成浅绿
export const YELLOW = "FFFFFF00";    // 合计 / 奖金提报
const THIN = { style: "thin", color: { argb: "FF000000" } };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };

export const FMT = { pct: "0%", pct2: "0.00%", usd: "$#,##0.00", qty: "#,##0", cny: '"￥"#,##0', date: "mm-dd-yy" };

/**
 * 写一格
 * @param o { size=11, bold, fill, fmt, h="center", wrap, font="宋体", border=true }
 */
export function put(ws, addr, value, o = {}) {
  const c = ws.getCell(addr);
  c.value = value;
  c.font = { name: o.font || "宋体", size: o.size || 11, bold: !!o.bold };
  c.alignment = { horizontal: o.h === undefined ? "center" : o.h, vertical: "middle", wrapText: !!o.wrap };
  if (o.border !== false) c.border = BOX;
  if (o.fill) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: o.fill } };
  if (o.fmt) c.numFmt = o.fmt;
  return c;
}

/** 合并区域并给整块加边框、底色（合并格的边框要每格都画） */
export function merge(ws, range, value, o = {}) {
  ws.mergeCells(range);
  const [a, b] = range.split(":");
  const [c1, r1] = split(a), [c2, r2] = split(b);
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) put(ws, colName(c) + r, null, o);
  put(ws, a, value, o);
}

/** 列号 ↔ 列名（1 → A） */
export const colName = (n) => (n <= 26 ? String.fromCharCode(64 + n) : colName(Math.floor((n - 1) / 26)) + colName(((n - 1) % 26) + 1));
function split(addr) {
  const m = addr.match(/^([A-Z]+)(\d+)$/);
  const col = [...m[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  return [col, Number(m[2])];
}

/** 相对起始列取列名：at(1, 0) = 起始列本身 */
export const at = (start, i) => colName(start + i);

/** 列宽 + 打印时整张表缩到一页宽 */
export function widths(ws, list) {
  list.forEach((w, i) => { if (w) ws.getColumn(i + 1).width = w; });
  ws.pageSetup = { fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}
