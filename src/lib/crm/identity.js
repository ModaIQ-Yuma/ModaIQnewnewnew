// ─── 达人身份（纯函数）：现名 + 别名 → 同一个人 ─────────────────────────────
// 规则：一个名字（不分大小写）在全店只能指向一个达人——要么是某人的现名，要么是某人的别名。
// 全站「按名字找达人」都走这里：CRM 录入、搜索、归入 CRM、导入。

/** 名字规范化：去空格、去开头 @、去「原名」前缀、转小写 */
export const normName = (s) =>
  String(s ?? "").trim().replace(/^@+/, "").replace(/^原名[:：]?/, "").trim().toLowerCase();

/**
 * @param creators [{ id, handle }]   @param aliases [{ creator_id, alias }]
 * @returns Map<名字, { creatorId, kind: "handle" | "alias" }>
 */
export function buildNameIndex(creators, aliases) {
  const idx = new Map();
  for (const c of creators) idx.set(normName(c.handle), { creatorId: c.id, kind: "handle" });
  for (const a of aliases) {
    const k = normName(a.alias);
    if (!idx.has(k)) idx.set(k, { creatorId: a.creator_id, kind: "alias" });
  }
  return idx;
}

/** 名字 → 归属（没有返回 null） */
export const resolveName = (idx, name) => idx.get(normName(name)) || null;

/** 某达人的全部名字（现名 + 别名） */
export function namesOf(creatorId, creators, aliases) {
  const c = creators.find((x) => x.id === creatorId);
  return [c?.handle, ...aliases.filter((a) => a.creator_id === creatorId).map((a) => a.alias)]
    .filter(Boolean).map(normName);
}

/**
 * 保存前检查身份是否冲突。
 * @param p { creatorId|null, oldHandle|null, handle, aliases[] }
 * @returns { creatorId|null（新录入时命中已有达人则返回其 id）, rename:bool, aliases:[], errors:[], mergeWith:[creatorId] }
 */
export function checkIdentity(p, idx, handleOf) {
  const errors = [], mergeWith = new Set();
  const handle = normName(p.handle);
  let creatorId = p.creatorId || null;
  let rename = false;

  if (!handle) errors.push("达人ID 不能为空");
  const owner = resolveName(idx, handle);
  if (!creatorId) {
    if (owner) creatorId = owner.creatorId;                      // 新录入：名字已存在 → 记到该达人名下
  } else if (handle !== normName(p.oldHandle)) {
    if (!owner || owner.creatorId === creatorId) rename = true;  // 改名（含改成自己的别名）
    else if (owner.kind === "handle") mergeWith.add(owner.creatorId);
    else errors.push(`「${handle}」已是 @${handleOf(owner.creatorId)} 的别名`);
  }

  const aliases = [];
  for (const raw of p.aliases || []) {
    const a = normName(raw);
    if (!a || a === handle || aliases.includes(a)) continue;
    const o = resolveName(idx, a);
    if (!o || o.creatorId === creatorId) { aliases.push(a); continue; }
    if (o.kind === "handle") { mergeWith.add(o.creatorId); aliases.push(a); }
    else errors.push(`别名「${a}」已是 @${handleOf(o.creatorId)} 的别名`);
  }
  return { creatorId, rename, handle, aliases, errors, mergeWith: [...mergeWith] };
}

/**
 * 模糊搜索达人（录入联想、归入 CRM 共用）：现名、别名都参与；
 * 排序：完全相同 > 开头相同 > 包含；同级时现名命中优先于别名命中。
 * @returns [{ id, handle, alias }]（alias = 命中的别名，现名命中时为 null）
 */
export function searchCreators(creators, aliases, query, limit = 8) {
  const q = normName(query);
  if (q.length < 2) return [];
  const rank = (name) => (name === q ? 0 : name.startsWith(q) ? 1 : name.includes(q) ? 2 : -1);
  const best = new Map();                                   // creatorId → { score, alias }
  const consider = (id, name, alias) => {
    const r = rank(normName(name));
    if (r < 0) return;
    const score = r * 2 + (alias ? 1 : 0);
    if (!best.has(id) || score < best.get(id).score) best.set(id, { score, alias });
  };
  for (const c of creators) consider(c.id, c.handle, null);
  for (const a of aliases) consider(a.creator_id, a.alias, a.alias);
  const handleOf = new Map(creators.map((c) => [c.id, c.handle]));
  return [...best.entries()]
    .sort((a, b) => a[1].score - b[1].score || handleOf.get(a[0]).localeCompare(handleOf.get(b[0])))
    .slice(0, limit)
    .map(([id, v]) => ({ id, handle: handleOf.get(id), alias: v.alias }));
}
