// ─── 视频 → 寄样记录 归属规则（纯函数）──────────────────────────────────────
// 只挂到「同一商品」的寄样上；同商品寄过多次（复投）时，挂到发布日期之前最近的那次寄样，
// 找不到则挂最近一次。商品对不上 → 不归属（保持非 CRM 视频）。

/**
 * @param collabs [{ collabId, productId, shipDate }] 该达人的全部寄样
 * @returns collabId | null
 */
export function pickCollab(collabs, productId, publishedDate) {
  const same = collabs.filter((c) => c.productId === productId)
    .sort((a, b) => (b.shipDate || "").localeCompare(a.shipDate || ""));
  if (!same.length) return null;
  const d = (publishedDate || "").slice(0, 10);
  return (same.find((c) => d && c.shipDate <= d) || same[0]).collabId;
}

/**
 * @param videos  [{ id, product_id, published_at }]
 * @returns { byCollab: Map<collabId, videoId[]>, unmatched: videoId[] }
 */
export function assignByProduct(videos, collabs) {
  const byCollab = new Map(), unmatched = [];
  for (const v of videos) {
    const id = pickCollab(collabs, v.product_id, v.published_at);
    if (!id) { unmatched.push(v.id); continue; }
    byCollab.set(id, [...(byCollab.get(id) || []), v.id]);
  }
  return { byCollab, unmatched };
}
