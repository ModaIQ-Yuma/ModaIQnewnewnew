// ─── CRM 录入时，从邀约库推断跟进人（纯函数）──────────────────────────────────
// 规则：CRM 里没有归属人的达人，如果在邀约库里 → 跟进人 = 邀约库录入人
//   · 多条记录时：优先与本次录入产品相同的那条，其中最早录入的；没有同产品的，取最早录入的
//   · 选中那条的录入人找不到名册人员（账号没绑定）→ 返回 null，不自动填
import { normName } from "../crm/identity.js";

/**
 * @param p { names[] 达人的全部名字, productId, invites[], adderMap（buildAdderMap 的结果） }
 * @returns { staffId, productId, addedAt } | null
 */
export function poolFollowerOf({ names, productId, invites, adderMap }) {
  const wanted = new Set(names.map(normName).filter(Boolean));
  const rows = invites.filter((r) => wanted.has(normName(r.creator_id)));
  if (!rows.length) return null;
  const byTime = (a, b) => String(a.added_at).localeCompare(String(b.added_at));
  const pick = rows.filter((r) => r.product_id === productId).sort(byTime)[0] || [...rows].sort(byTime)[0];
  const staffId = adderMap.get(pick.added_by) || null;
  return staffId ? { staffId, productId: pick.product_id, addedAt: pick.added_at } : null;
}
