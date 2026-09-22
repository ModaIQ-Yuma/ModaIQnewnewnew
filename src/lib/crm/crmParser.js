// lib/crm/crmParser.js — CRM Excel/CSV 行解析（按列序号，不依赖列名）
function parseGrade(s) {
  const m = String(s || "").match(/Lv\d/);
  return m ? m[0] : null;
}

function parseDate(v) {
  if (!v && v !== 0) return "";
  const s = String(v).trim();
  if (!s) return "";
  // 已经是 YYYY-MM-DD 或 YYYY/MM/DD
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2,"0")}-${iso[3].padStart(2,"0")}`;
  // Excel 日期序列号（浮点数）
  const num = parseFloat(s);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    // Excel epoch: 1899-12-30
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const da = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
  return s;
}

const STAFF_NULL = new Set(["—", "其它渠道", "其他渠道", ""]);

// 旧版导出固定列序（0-indexed）
const IDX = {
  handle: 0, product: 1, shipDate: 3, staff: 4, status: 5,
  grade: 8, histSales: 9, convVert: 10, avgViews: 11,
  femaleRatio: 12, language: 13, bodyType: 14, ageRange: 15,
  contentVert: 16, style: 17, videoQuality: 18, voiceover: 19,
  aliases: 20, note: 22,
};

/**
 * rawRows: xlsx.utils.sheet_to_json(ws, { header: 1 }) 返回的二维数组
 * 第0行是列名，从第1行开始是数据
 */
export function parseRows(rawRows) {
  if (!rawRows || rawRows.length < 2) return [];

  // 跳过第0行（列名行）
  const dataRows = rawRows.slice(1);

  function get(row, idx) {
    const v = row[idx];
    return v != null ? String(v).trim() : "";
  }

  return dataRows.map((row) => {
    const staff = get(row, IDX.staff);
    return {
      handle:       get(row, IDX.handle),
      product:      get(row, IDX.product),
      shipDate:     parseDate(get(row, IDX.shipDate)),
      staff,
      staffNull:    STAFF_NULL.has(staff),
      status:       get(row, IDX.status) || "已寄样",
      grade:        parseGrade(get(row, IDX.grade)),
      histSales:    get(row, IDX.histSales)    || null,
      convVert:     get(row, IDX.convVert)     || null,
      avgViews:     get(row, IDX.avgViews)     || null,
      femaleRatio:  get(row, IDX.femaleRatio)  || null,
      language:     get(row, IDX.language)     || null,
      bodyType:     get(row, IDX.bodyType)     || null,
      ageRange:     get(row, IDX.ageRange)     || null,
      contentVert:  get(row, IDX.contentVert)  || null,
      style:        get(row, IDX.style)        || null,
      videoQuality: get(row, IDX.videoQuality) || null,
      voiceover:    get(row, IDX.voiceover)    || null,
      aliases:      get(row, IDX.aliases)      || null,
      note:         get(row, IDX.note)         || null,
    };
  }).filter((r) => r.handle && r.product && r.shipDate);
}
