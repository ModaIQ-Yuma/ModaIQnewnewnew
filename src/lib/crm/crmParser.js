// ─── CRM 导入行解析（按旧版导出的固定列序，不依赖列名）──────────────────────
// 输出已规范化：达人名小写、属性转成选项值、别名去掉「原名」前缀。
import { normalizeAttrs, splitMulti } from "./attrs.js";
import { normName } from "./identity.js";

// 旧版导出列序（0 起）
const IDX = {
  handle: 0, product: 1, shipDate: 3, staff: 4, status: 5,
  official_grade: 8, hist_sales: 9, conv_vertical: 10, avg_views: 11, female_ratio: 12,
  language: 13, body_type: 14, age_range: 15, content_vertical: 16, style: 17,
  video_quality: 18, voiceover: 19, aliases: 20, note: 22,
};
const ATTR_COLS = ["official_grade", "hist_sales", "conv_vertical", "avg_views", "female_ratio", "language",
  "body_type", "age_range", "content_vertical", "style", "video_quality", "voiceover"];
const STAFF_NULL = new Set(["—", "-", "其它渠道", "其他渠道", ""]);

export function parseDate(v) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const num = parseFloat(s);                               // Excel 日期序列号
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  return "";
}

/**
 * @param raw 二维数组（第 0 行表头）
 * @returns { rows:[…], skipped:[{ line, handle, reason }] }；line 为 Excel 行号（表头是第 1 行）
 */
export function parseRows(raw) {
  const rows = [], skipped = [];
  (raw || []).slice(1).forEach((r, i) => {
    const get = (k) => String(r[IDX[k]] ?? "").trim();
    const line = i + 2, handle = normName(get("handle")), product = get("product"), shipDate = parseDate(get("shipDate"));
    if (!handle && !product) return;                       // 空行
    const reason = !handle ? "缺达人ID" : !product ? "缺合作产品" : !shipDate ? "缺寄样日期" : null;
    if (reason) { skipped.push({ line, handle, product, reason }); return; }
    const { attrs, unknown } = normalizeAttrs(Object.fromEntries(ATTR_COLS.map((k) => [k, get(k)])));
    const staff = get("staff");
    rows.push({
      line, handle, product, shipDate,
      staff: STAFF_NULL.has(staff) ? null : staff,
      status: get("status") || "已寄样",
      note: get("note") || null,
      aliases: splitMulti(get("aliases")).map(normName).filter((a) => a && a !== handle),
      attrs, unknown,
    });
  });
  return { rows, skipped };
}
