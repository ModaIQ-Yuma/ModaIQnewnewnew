// ─── 重新匹配视频归属（纯函数）：按当前规则把所有视频重算一遍 ────────────────
// 规则见 assignVideos.js（同商品 + 寄样日期 ≤ 发布日期 + 取最近）。达人按视频上的达人名（现名/别名）识别。
import { buildNameIndex, resolveName } from "../crm/identity.js";
import { pickCollab } from "./assignVideos.js";

/**
 * @returns { changes: [{ id, from, to }], stats: { total, unchanged, moved, unlinked, linked } }
 *   moved = 从一条寄样改挂到另一条；unlinked = 由 CRM 变非 CRM；linked = 由非 CRM 挂上寄样
 */
export function planRematch({ videos, collabs, creators, aliases }) {
  const idx = buildNameIndex(creators, aliases);
  const byCreator = new Map();
  for (const c of collabs) byCreator.set(c.creator_id, [...(byCreator.get(c.creator_id) || []), { collabId: c.id, productId: c.product_id, shipDate: c.ship_date }]);
  const changes = [], stats = { total: videos.length, unchanged: 0, moved: 0, unlinked: 0, linked: 0 };
  for (const v of videos) {
    const creatorId = resolveName(idx, v.creator_handle)?.creatorId;
    const to = creatorId && v.product_id ? pickCollab(byCreator.get(creatorId) || [], v.product_id, v.published_at) : null;
    const from = v.collaboration_id || null;
    if (to === from) { stats.unchanged++; continue; }
    changes.push({ id: v.id, from, to });
    if (from && to) stats.moved++; else if (from) stats.unlinked++; else stats.linked++;
  }
  return { changes, stats };
}
