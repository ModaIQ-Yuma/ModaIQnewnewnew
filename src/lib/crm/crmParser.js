// lib/crm/crmParser.js — CRM Excel 行解析（纯函数）
function parseGrade(s) {
  const m = String(s || "").match(/Lv\d/);
  return m ? m[0] : null;
}

const STAFF_NULL = new Set(["—", "其它渠道", "其他渠道", ""]);

export function parseRows(rawRows) {
  const COL = {
    handle:      ["达人ID", "达人id", 0],
    product:     ["合作产品", 1],
    shipDate:    ["寄样时间", 3],
    staff:       ["跟进人", 4],
    status:      ["合作进度", 5],
    grade:       ["官方等级", 8],
    histSales:   ["历史销量", 9],
    convVert:    ["转化垂直", 10],
    avgViews:    ["均播（近30天）", "均播(近30天)", 11],
    femaleRatio: ["女粉比例", 12],
    language:    ["语言", 13],
    bodyType:    ["身材", 14],
    ageRange:    ["年龄", 15],
    contentVert: ["内容垂直", 16],
    style:       ["达人风格", 17],
    videoQuality:["画质", 18],
    voiceover:   ["口播", 19],
    aliases:     ["别名", 20],
    note:        ["备注", 22],
  };

  function get(row, keys) {
    const vals = Object.values(row);
    const rowKeys = Object.keys(row);
    for (const k of keys) {
      if (typeof k === "number") {
        const v = vals[k]; if (v != null && v !== "") return String(v).trim();
      } else {
        if (row[k] != null && row[k] !== "") return String(row[k]).trim();
        const fuzzy = rowKeys.find((rk) => rk.includes(k.slice(-3)));
        if (fuzzy && row[fuzzy] != null && row[fuzzy] !== "") return String(row[fuzzy]).trim();
      }
    }
    return "";
  }

  return rawRows.map((row) => ({
    handle:       get(row, COL.handle),
    product:      get(row, COL.product),
    shipDate:     get(row, COL.shipDate),
    staff:        get(row, COL.staff),
    staffNull:    STAFF_NULL.has(get(row, COL.staff)),
    status:       get(row, COL.status) || "已寄样",
    grade:        parseGrade(get(row, COL.grade)),
    histSales:    get(row, COL.histSales) || null,
    convVert:     get(row, COL.convVert) || null,
    avgViews:     get(row, COL.avgViews) || null,
    femaleRatio:  get(row, COL.femaleRatio) || null,
    language:     get(row, COL.language) || null,
    bodyType:     get(row, COL.bodyType) || null,
    ageRange:     get(row, COL.ageRange) || null,
    contentVert:  get(row, COL.contentVert) || null,
    style:        get(row, COL.style) || null,
    videoQuality: get(row, COL.videoQuality) || null,
    voiceover:    get(row, COL.voiceover) || null,
    aliases:      get(row, COL.aliases) || null,
    note:         get(row, COL.note) || null,
  })).filter((r) => r.handle && r.product && r.shipDate);
}
