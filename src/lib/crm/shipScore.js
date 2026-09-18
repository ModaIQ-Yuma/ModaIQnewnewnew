// ─── 寄样评分计算器（纯函数）───────────────────────────────────────────────
// 来源：用户原有的 Excel 评分模型，原样保留 9 项加权打分。
// 铁律：这是「录入时一次性辅助决策」工具，不存档、不进 state、不进复盘——
// CRM/analytics.js/crmFlow.js 永远不应 import 本文件之外的任何东西到这里来。

// 每项的选项 = { score, label }，照搬 Excel 的三/二档描述原文
export const SHIP_SCORE_ITEMS = [
  {
    key: "bodyFit", group: "匹配度", label: "身材匹配", weight: 0.2,
    options: [
      { score: 0,  label: "完全不适配" },
      { score: 30, label: "一般适配" },
      { score: 50, label: "能完美展示卖点" },
    ],
  },
  {
    key: "styleFit", group: "匹配度", label: "风格匹配", weight: 0.2,
    options: [
      { score: 0,  label: "与产品调性冲突" },
      { score: 30, label: "风格大体一致" },
      { score: 50, label: "风格完全可以驾驭产品（匹配爆款达人画像）" },
    ],
  },
  {
    key: "contentVertical", group: "垂直程度", label: "30天主页内容垂直度", weight: 0.2,
    options: [
      { score: 0,  label: "女装占比＜30%" },
      { score: 30, label: "30%≤女装占比≤70%" },
      { score: 50, label: "70%＜女装占比" },
    ],
  },
  {
    key: "convVertical", group: "垂直程度", label: "30天转化垂直度", weight: 0.2,
    options: [
      { score: 0,  label: "30天服装成交＜30%" },
      { score: 30, label: "30%≤近30天服装成交≤70%" },
      { score: 50, label: "70%＜近30天服装成交" },
    ],
  },
  {
    key: "historySales", group: "销售数据", label: "历史销量", weight: 0.3,
    options: [
      { score: 0,  label: "销量＜250" },
      { score: 10, label: "250≤销量≤499" },
      { score: 20, label: "499＜销量" },
    ],
  },
  {
    key: "femaleRatio", group: "销售数据", label: "女粉占比", weight: 0.3,
    options: [
      { score: 0,  label: "女粉占比＜50%" },
      { score: 20, label: "50%≤女粉占比≤70%" },
      { score: 40, label: "女粉占比≥70%" },
    ],
  },
  {
    key: "avgViews", group: "销售数据", label: "均播（近30天均播）", weight: 0.3,
    options: [
      { score: 0,  label: "均播＜500" },
      { score: 20, label: "500≤均播≤1000" },
      { score: 40, label: "均播≥1000" },
    ],
  },
  {
    key: "videoQuality", group: "内容表现", label: "画质", weight: 0.3,
    options: [
      { score: 0,  label: "模糊、灯光差" },
      { score: 30, label: "画质、光线一般" },
      { score: 50, label: "高清，光线好、构图好" },
    ],
  },
  {
    key: "voiceOver", group: "内容表现", label: "口播", weight: 0.3,
    options: [
      { score: 0,  label: "不口播" },
      { score: 30, label: "偶尔有口播，但是口播一般" },
      { score: 50, label: "口播自然、有场景感、有情绪感染力" },
    ],
  },
];

// 每项满分（来自 options 的最高分），用于先把每一项归一化到 0-1 再求组内均值——
// 必须先归一化：同组里"历史销量"满分20、"女粉占比/均播"满分40，量纲不同，
// 不能直接相加求均值，否则权重会被悄悄拉低（曾踩过这个坑）。
const ITEM_MAX = Object.fromEntries(
  SHIP_SCORE_ITEMS.map((item) => [item.key, Math.max(...item.options.map((o) => o.score))])
);
const ITEM_GROUP  = Object.fromEntries(SHIP_SCORE_ITEMS.map((item) => [item.key, item.group]));
const ITEM_WEIGHT = Object.fromEntries(SHIP_SCORE_ITEMS.map((item) => [item.key, item.weight]));

export function computeShipScore(answers) {
  const byGroup = {}; // group -> { sumPct, n, weight }
  for (const [key, s] of Object.entries(answers)) {
    if (s == null || !(key in ITEM_MAX)) continue;
    const pct = s / ITEM_MAX[key];               // 先归一化到 0-1（消除量纲差异）
    const group = ITEM_GROUP[key];
    (byGroup[group] ||= { sumPct: 0, n: 0, weight: ITEM_WEIGHT[key] }).sumPct += pct;
    byGroup[group].n += 1;
  }
  const groups = Object.values(byGroup);
  if (groups.length === 0) return null;           // 一项都没填
  let total = 0, fullWeight = 0;
  for (const { sumPct, n, weight } of groups) {
    total += (sumPct / n) * 100 * weight;         // 组内均值（已同量纲）× 该组权重
    fullWeight += weight;
  }
  return Math.min(100, Math.max(0, Math.round(total / fullWeight)));
}

export function shipGrade(score) {
  if (score == null) return null;
  if (score >= 90) return { grade: "S",  range: "90–100", desc: "全维度优秀，爆单概率极高，ROI 稳定", advice: "建议寄样", adviceColor: "success" };
  if (score >= 80) return { grade: "A+", range: "80–89",  desc: "高匹配、高垂直，有明显潜力",          advice: "建议寄样", adviceColor: "success" };
  if (score >= 70) return { grade: "A",  range: "70–79",  desc: "主力输出，视频量稳定",                advice: "建议寄样", adviceColor: "success" };
  if (score >= 55) return { grade: "B",  range: "55–69",  desc: "用来保持覆盖、测款",                  advice: "可酌情寄样（测款）", adviceColor: "warning" };
  if (score >= 50) return { grade: "C",  range: "50–55",  desc: "靠运气出单",                          advice: "不建议寄样", adviceColor: "danger" };
  return                 { grade: "D",  range: "<50",     desc: "匹配度低，转化预期差",                advice: "不建议寄样", adviceColor: "danger" };
}
