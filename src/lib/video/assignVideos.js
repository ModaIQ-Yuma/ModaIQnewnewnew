// ─── 视频 → 寄样记录 归属规则（纯函数，与旧版一致）──────────────────────────
// 只挂到「同一商品」且「寄样日期 ≤ 视频发布日期」的寄样上；有多次（复投）取发布前最近的一次。
// 发布日期早于所有寄样（寄样前达人自己发的）/ 商品对不上 → 不归属（非 CRM 视频）。

/**
 * @param collabs [{ collabId, productId, shipDate }] 该达人的全部寄样
 * @returns collabId | null
 */
export function pickCollab(collabs, productId, publishedDate) {
  const d = (publishedDate || "").slice(0, 10);
  if (!d) return null;
  const best = collabs.filter((c) => c.productId === productId && c.shipDate && c.shipDate <= d)
    .sort((a, b) => b.shipDate.localeCompare(a.shipDate))[0];
  return best?.collabId || null;
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
