// ─── 邀约库录入查重（纯函数，读内存里的核心数据）────────────────────────────
// 层一：同一达人（现名/别名都算）+ 同一产品已在库里 → 拦截
// 层二：同一达人 + 同一产品在 CRM 已寄样 → 拦截（不同产品放行）
import { resolveName, namesOf, normName } from "../crm/identity.js";

/**
 * @returns 拦截原因文案；可以录入则返回 null
 */
export function checkPoolEntry({ handle, productId, productName, core, nameIndex, staffName }) {
  const typed = normName(handle);
  const creatorId = resolveName(nameIndex, typed)?.creatorId || null;
  const names = new Set([typed, ...(creatorId ? namesOf(creatorId, core.creators, core.aliases) : [])]);

  const inPool = core.invites.find((r) => names.has(normName(r.creator_id)) && r.product_id === productId);
  if (inPool) return `此达人已在邀约库中（${productName}）`;

  const shipped = creatorId && core.collabs.filter((c) => c.creator_id === creatorId && c.product_id === productId)
    .sort((a, b) => (b.ship_date || "").localeCompare(a.ship_date || ""))[0];
  if (shipped) return `此达人已合作 ${productName}（${shipped.ship_date}），跟进人 ${staffName(shipped.staff_id)}`;
  return null;
}
