// ─── 寄样时达人属性（纯函数）：取值规范化 + 与数据库行互转 ─────────────────
// 属性存在 collab_attrs（一条寄样一行）；style 多选在库里是逗号分隔文本。
import { CREATOR_FIELDS } from "../../constants/creatorOptions.js";

export const ATTR_FIELDS = CREATOR_FIELDS;
export const ATTR_KEYS   = ATTR_FIELDS.map((f) => f.key);
const FIELD = Object.fromEntries(ATTR_FIELDS.map((f) => [f.key, f]));

// 旧版导出里的历史写法 → 现行选项值
const LEGACY = {
  video_quality: { "高清构图好": "高清", "普通清晰无构图": "普通", "模糊/灯光差": "差" },
  voiceover:     { "自然有场景感": "自然", "有口播但偏扁平": "偏扁平", "不口播": "无口播" },
};
const PLACEHOLDERS = new Set(["__未标注__", "未标注", "—", "-"]);

export const splitMulti = (v) =>
  Array.isArray(v) ? v : String(v || "").split(/[,，、]+/).map((s) => s.trim()).filter(Boolean);

/**
 * 单个取值 → 选项 value；认不出返回 { value:null, unknown:原文 }
 * 兼容：value 本身 / 显示文字（如「正常 Average」）/ 旧版写法 / 等级文字（「Lv2 · GMV 5–25K」）
 */
export function toOptionValue(key, raw) {
  const s = String(raw ?? "").trim();
  if (!s || PLACEHOLDERS.has(s)) return { value: null };
  const opts = FIELD[key]?.options || [];
  const hit = opts.find((o) => o.value === s) || opts.find((o) => o.label === s);
  if (hit) return { value: hit.value };
  if (LEGACY[key]?.[s]) return { value: LEGACY[key][s] };
  if (key === "official_grade") { const m = s.match(/Lv\d/); if (m) return { value: m[0] }; }
  return { value: null, unknown: s };
}

/**
 * 原始属性对象 → 规范化属性（单选为字符串，style 为数组）+ 认不出的原文列表
 */
export function normalizeAttrs(raw = {}) {
  const attrs = {}, unknown = [];
  for (const key of ATTR_KEYS) {
    if (FIELD[key].type === "multi") {
      const vals = [];
      for (const part of splitMulti(raw[key])) {
        const r = toOptionValue(key, part);
        if (r.value) vals.push(r.value); else if (r.unknown) unknown.push(`${FIELD[key].label}:${r.unknown}`);
      }
      attrs[key] = [...new Set(vals)];
    } else {
      const r = toOptionValue(key, raw[key]);
      attrs[key] = r.value || "";
      if (r.unknown) unknown.push(`${FIELD[key].label}:${r.unknown}`);
    }
  }
  return { attrs, unknown };
}

export const emptyAttrs = () => Object.fromEntries(ATTR_KEYS.map((k) => [k, FIELD[k].type === "multi" ? [] : ""]));

/** 表单/内存属性 → collab_attrs 行（不含主键） */
export function attrsToRow(attrs = {}) {
  return Object.fromEntries(ATTR_KEYS.map((k) => {
    const v = attrs[k];
    return [k, FIELD[k].type === "multi" ? (splitMulti(v).join(",") || null) : (v || null)];
  }));
}

/** collab_attrs 行（可能为 null）→ 内存属性 */
export function rowToAttrs(row) {
  const out = emptyAttrs();
  if (!row) return out;
  for (const k of ATTR_KEYS) out[k] = FIELD[k].type === "multi" ? splitMulti(row[k]) : (row[k] || "");
  return out;
}

export const hasAnyAttr = (attrs = {}) =>
  ATTR_KEYS.some((k) => (Array.isArray(attrs[k]) ? attrs[k].length : attrs[k]));
