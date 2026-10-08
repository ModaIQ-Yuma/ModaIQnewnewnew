// ─── 甘特图策略变更记录（纯函数）：写入的行 / 展示用的行 ───────────────────────
// 表 strategy_change_logs：product_id, half_key, old_value, new_value, reason, changed_by(登录账号), created_at

/**
 * 一次改动 → 一行记录
 * @param o { productId, halfKey, from, to, reason, userId, goal }  to 为 null = 清空；goal = 同步改的寄样目标（可选）
 */
export function changeLogRow({ productId, halfKey, from, to, reason, userId, goal }) {
  const parts = [String(reason || "").trim(), goal != null ? `寄样目标同步为 ${goal}` : ""].filter(Boolean);
  return {
    product_id: productId, half_key: halfKey, old_value: from || null, new_value: to ?? null,
    reason: parts.join("；") || null, changed_by: userId || null,
  };
}

/** 半月 key → 「10月上 / 10月下」 */
export const halfLabel = (key) => (key ? `${Number(key.slice(5, 7))}月${key.endsWith("H1") ? "上" : "下"}` : "");

/** 展示用：带上产品名、改动人名字，按时间从新到旧 */
export function changeLogView(logs, products, staff) {
  const productName = new Map(products.map((p) => [p.id, p.internal_name]));
  const nameOfUser = new Map(staff.filter((s) => s.auth_user_id).map((s) => [s.auth_user_id, s.name]));
  return [...logs]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((l) => ({
      id: l.id, productInternalName: productName.get(l.product_id) || "（已删除的产品）",
      month: halfLabel(l.half_key), fromStrategy: l.old_value, toStrategy: l.new_value || "清空",
      reason: l.reason, changedBy: nameOfUser.get(l.changed_by) || "管理员", changedAt: l.created_at,
    }));
}
