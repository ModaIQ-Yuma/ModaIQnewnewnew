// ─── 达人属性选项（原版原样）value=入库值 type:single/multi/text category:obj/sub ─

const opt = (arr) => arr.map((v) => ({ value: v, label: v }));

export const OFFICIAL_GRADES = [
  { value: "Lv1", label: "Lv1 · GMV 0–5K" },
  { value: "Lv2", label: "Lv2 · GMV 5–25K" },
  { value: "Lv3", label: "Lv3 · GMV 25–60K" },
  { value: "Lv4", label: "Lv4 · GMV 60–150K" },
  { value: "Lv5", label: "Lv5 · GMV 150–400K" },
  { value: "Lv6", label: "Lv6 · GMV 400–1500K" },
  { value: "Lv7", label: "Lv7 · GMV 1500K+" },
];

export const LANGUAGES        = opt(["英语", "西语", "其它"]);
export const BODY_TYPES = [
  { value: "极瘦", label: "极瘦 petite" },
  { value: "瘦",   label: "瘦 Slim" },
  { value: "正常", label: "正常 Average" },
  { value: "微胖", label: "微胖 Midsize" },
  { value: "大码", label: "大码 Plus-size" },
];
export const AGE_STAGES       = opt(["少女", "青女", "中女", "中老", "老年"]);
export const HIST_SALES       = opt(["＜250单", "250–499单", "≥500单"]);
export const AVG_VIEWS        = opt(["＜500", "500–1000", "≥1000"]);
export const CONTENT_VERTICAL = opt(["女装占比＜30%", "30–70%", "≥70%"]);
export const CONV_VERTICAL    = opt(["无服装成交", "服装成交＜50%", "服装成交≥50%"]);
export const FEMALE_RATIO     = opt(["＜50%", "50–70%", "≥70%"]);
export const QUALITY          = opt(["差", "普通", "高清"]);
export const VOICEOVER        = opt(["无口播", "偏扁平", "自然"]);
export const STYLE_TYPES      = opt([
  "clean girl", "classy", "casual chic", "feminine",
  "soft girl", "hot mom style", "baddie", "luxury vibe",
]);

// 字段 schema（渲染顺序 = 数组顺序）
export const CREATOR_FIELDS = [
  { key: "official_grade",    label: "官方等级",      type: "single", options: OFFICIAL_GRADES,  category: "obj", dropdown: true },
  { key: "hist_sales",        label: "历史销量",      type: "single", options: HIST_SALES,       category: "obj" },
  { key: "conv_vertical",     label: "转化垂直",      type: "single", options: CONV_VERTICAL,    category: "obj" },
  { key: "avg_views",         label: "均播（近30天）", type: "single", options: AVG_VIEWS,       category: "obj" },
  { key: "female_ratio",      label: "女粉比例",      type: "single", options: FEMALE_RATIO,     category: "obj" },
  { key: "language",          label: "语言",          type: "single", options: LANGUAGES,        category: "sub" },
  { key: "body_type",         label: "身材",          type: "single", options: BODY_TYPES,       category: "sub" },
  { key: "age_range",         label: "年龄",          type: "single", options: AGE_STAGES,       category: "sub" },
  { key: "content_vertical",  label: "内容垂直",      type: "single", options: CONTENT_VERTICAL, category: "sub" },
  { key: "style",             label: "达人风格",      type: "multi",  options: STYLE_TYPES,      category: "sub" },
  { key: "video_quality",     label: "画质",          type: "single", options: QUALITY,          category: "sub" },
  { key: "voiceover",         label: "口播",          type: "single", options: VOICEOVER,        category: "sub" },
  { key: "note",              label: "别名/备注",     type: "text",   category: "sub", placeholder: "如有多个别名，用逗号分隔" },
];

/** 取某字段 value 对应的展示 label */
export function labelOf(fieldKey, value) {
  const f = CREATOR_FIELDS.find((x) => x.key === fieldKey);
  if (!f || !f.options) return value ?? "";
  const o = f.options.find((x) => x.value === value);
  return o ? o.label : (value ?? "");
}
export { CREATOR_FIELDS as INFLUENCER_FIELDS }; // 旧版别名
