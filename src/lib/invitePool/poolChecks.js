// ─── 邀约库录入查重（纯函数，读内存里的核心数据）────────────────────────────
// 层一：同一达人（现名/别名都算）+ 同一产品已在库里 → 拦截
// 层二：同一达人 + 同一产品在 CRM 已寄样 → 拦截（不同产品放行）
// 单条录入和批量上传共用这一套规则。
import { resolveName, namesOf, normName } from "../crm/identity.js";

/** 预先建好查重索引（批量时只建一次） */
export function buildPoolIndex(core) {
  const inPool = new Set(core.invites.map((r) => `${normName(r.creator_id)}|${r.product_id}`));
  const shipped = new Map();                               // 达人|产品 → 最近一次寄样
  for (const c of core.collabs) {
    const k = `${c.creator_id}|${c.product_id}`, prev = shipped.get(k);
    if (!prev || (c.ship_date || "") > (prev.ship_date || "")) shipped.set(k, c);
  }
  return { inPool, shipped };
}

/**
 * @returns 拦截原因文案；可以录入则返回 null
 */
export function checkPoolEntry({ handle, productId, productName, core, nameIndex, staffName, index = buildPoolIndex(core) }) {
  const typed = normName(handle);
  const creatorId = resolveName(nameIndex, typed)?.creatorId || null;
  const names = [typed, ...(creatorId ? namesOf(creatorId, core.creators, core.aliases) : [])];

  if (names.some((n) => index.inPool.has(`${normName(n)}|${productId}`))) return `此达人已在邀约库中（${productName}）`;

  const shipped = creatorId && index.shipped.get(`${creatorId}|${productId}`);
  if (shipped) return `此达人已合作 ${productName}（${shipped.ship_date}），跟进人 ${staffName(shipped.staff_id)}`;
  return null;
}
