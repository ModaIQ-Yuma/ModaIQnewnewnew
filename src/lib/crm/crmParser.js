// lib/crm/crmParser.js — CRM Excel 行解析（纯函数）
function parseGrade(s) {
  const m = String(s || "").match(/Lv\d/);
  return m ? m[0] : null;
}

const STAFF_NULL = new Set(["—", "其它渠道", "其他渠道", ""]);

// 中文列名 → 字段映射
const NAME_MAP = {
  handle:      ["达人ID", "达人id", "达人Id"],
  product:     ["合作产品"],
  shipDate:    ["寄样时间"],
  staff:       ["跟进人"],
  status:      ["合作进度"],
  grade:       ["官方等级"],
  histSales:   ["历史销量"],
  convVert:    ["转化垂直"],
  avgViews:    ["均播（近30天）", "均播(近30天)", "均播"],
  femaleRatio: ["女粉比例"],
  language:    ["语言"],
  bodyType:    ["身材"],
  ageRange:    ["年龄"],
  contentVert: ["内容垂直"],
  style:       ["达人风格"],
  videoQuality:["画质"],
  voiceover:   ["口播"],
  aliases:     ["别名"],
  note:        ["备注"],
};

// 列序号兜底（旧版导出固定顺序）
const IDX_MAP = {
  handle: 0, product: 1, shipDate: 3, staff: 4, status: 5,
  grade: 8, histSales: 9, convVert: 10, avgViews: 11,
  femaleRatio: 12, language: 13, bodyType: 14, ageRange: 15,
  contentVert: 16, style: 17, videoQuality: 18, voiceover: 19,
  aliases: 20, note: 22,
};

export function parseRows(rawRows) {
  if (!rawRows.length) return [];

  // 建立：字段名 → 实际列 key 的映射
  const firstRow = rawRows[0];
  const allKeys  = Object.keys(firstRow);
  const allVals  = Object.values(firstRow);

  function buildKeyMap() {
    const map = {};
    for (const [field, names] of Object.entries(NAME_MAP)) {
      // 精确匹配
      const found = allKeys.find((k) => names.some((n) => k === n || k.includes(n.slice(-2))));
      if (found) { map[field] = { type: "key", key: found }; continue; }
      // 序号兜底
      const idx = IDX_MAP[field];
      if (idx != null && idx < allKeys.length) {
        map[field] = { type: "idx", idx };
      }
    }
    return map;
  }

  const keyMap = buildKeyMap();

  function get(row, field) {
    const m = keyMap[field];
    if (!m) return "";
    const v = m.type === "key" ? row[m.key] : Object.values(row)[m.idx];
    return v != null ? String(v).trim() : "";
  }

  return rawRows.map((row) => {
    const staff = get(row, "staff");
    return {
      handle:       get(row, "handle"),
      product:      get(row, "product"),
      shipDate:     get(row, "shipDate"),
      staff,
      staffNull:    STAFF_NULL.has(staff),
      status:       get(row, "status") || "已寄样",
      grade:        parseGrade(get(row, "grade")),
      histSales:    get(row, "histSales")    || null,
      convVert:     get(row, "convVert")     || null,
      avgViews:     get(row, "avgViews")     || null,
      femaleRatio:  get(row, "femaleRatio")  || null,
      language:     get(row, "language")     || null,
      bodyType:     get(row, "bodyType")     || null,
      ageRange:     get(row, "ageRange")     || null,
      contentVert:  get(row, "contentVert")  || null,
      style:        get(row, "style")        || null,
      videoQuality: get(row, "videoQuality") || null,
      voiceover:    get(row, "voiceover")    || null,
      aliases:      get(row, "aliases")      || null,
      note:         get(row, "note")         || null,
    };
  }).filter((r) => r.handle && r.product && r.shipDate);
}
