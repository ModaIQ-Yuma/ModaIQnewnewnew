// ─── 今日邀约名单（纯函数）：从内存里的整个邀约库筛，不单独查数据库 ─────────────
// 核心数据加载邀约库时已自动翻页，不受 Supabase 单次 1000 条的限制。

/** 今天排了的产品下、还没转化的邀约达人；最早录入的排前面 */
export function pendingInvitesFor(invites, productIds) {
  const ids = new Set(productIds);
  return invites
    .filter((r) => r.status === "pending" && ids.has(r.product_id))
    .sort((a, b) => String(a.added_at).localeCompare(String(b.added_at)));
}
