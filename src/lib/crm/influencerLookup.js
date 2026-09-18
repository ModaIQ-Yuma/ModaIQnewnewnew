import { normalize } from "../utils.js";

// ─── 达人历史合作记录查找（纯函数）──────────────────────────────────────────
// 用途：录入面板输入达人ID时，实时找出这个达人此前在 CRM 里的所有记录
// （按达人ID本身 + 别名字段模糊匹配），帮录入者发现"这人之前合作过"。
// 不写库、不改任何数据，纯查询。

// 把"别名"自由文本（逗号/顿号分隔）拆成数组，统一 normalize 比较。
// 注意：不按空格拆分——英文别名本身常含空格（如 "Anna Style" 是一个完整别名）。
function parseAliases(aliasText) {
  if (!aliasText) return [];
  return String(aliasText).split(/[,，、]+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * @param query 用户正在输入的达人ID（可能还没打完）
 * @param influencers CRM 全量记录
 * @param excludeId 编辑模式下排除自己当前这条记录的 id
 * @returns 命中的历史记录（同一达人可能有多条，按时间倒序）
 */
export function findInfluencerMatches(query, influencers = [], excludeId = null) {
  const q = normalize(query);
  if (!q || q.length < 2) return []; // 太短（1个字符）噪音太多，不查

  const hit = influencers.filter((inf) => {
    if (inf.id === excludeId) return false;
    const idMatch = normalize(inf.influencerId).includes(q);
    const aliasMatch = parseAliases(inf.aliases).some((a) => normalize(a).includes(q));
    return idMatch || aliasMatch;
  });

  return [...hit].sort((a, b) => (b.shipDate || "").localeCompare(a.shipDate || ""));
}

// 是否为"精确同一个达人"（用于汇总文案：找到 N 条 vs 仅相似）
export function isExactMatch(query, influencerId) {
  return normalize(query) === normalize(influencerId);
}
