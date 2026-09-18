// ─── cumOrders：取某达人在所有视频里的累计出单（CRM 用）────────────────────
export function cumOrders(inf) {
  return (inf?.videoRecords || []).reduce((s, v) => s + (Number(v.orders) || 0), 0);
}
