// ─── 邀约库搜索（纯函数）：输入名字片段，按包含匹配；输入的是某达人的现名或别名时，她名下所有名字的记录都算 ──
import { normName, resolveName, namesOf } from "../crm/identity.js";

/** 把搜索词整理成匹配条件；空搜索返回 null（不过滤） */
export function buildPoolSearch(query, { nameIndex, creators, aliases }) {
  const q = normName(query);
  if (!q) return null;
  const creatorId = resolveName(nameIndex, q)?.creatorId;
  return { q, names: new Set(creatorId ? namesOf(creatorId, creators, aliases) : []) };
}

/** 某条邀约库记录是否命中搜索 */
export const matchesPoolSearch = (row, search) => {
  if (!search) return true;
  const n = normName(row.creator_id);
  return n.includes(search.q) || search.names.has(n);
};
