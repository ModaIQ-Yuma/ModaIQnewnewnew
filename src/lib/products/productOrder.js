// ─── 产品排序口径（纯函数）：全站凡是列产品的地方都按推广状态排 ─────────────
// 顺序：爆款 → 合格款 → 可卖款 → 撤退款 → 测款 → 未设置；同状态内按创建时间从新到旧。
import { PRODUCT_STATUSES } from "../../constants/products.js";

const RANK = Object.fromEntries(PRODUCT_STATUSES.map((s, i) => [s, i]));

/** 状态 → 序号（未知状态排最后） */
export const statusRank = (status) => RANK[status] ?? PRODUCT_STATUSES.length;

/** 返回排好序的新数组，不改原数组 */
export function sortProducts(products) {
  return [...products].sort((a, b) =>
    statusRank(a.status) - statusRank(b.status) ||
    String(b.created_at || "").localeCompare(String(a.created_at || ""))
  );
}

/**
 * 给「带 product_id 的记录」用的排序器（快照、目标、邀约等）。
 * @param sortedProducts 已按 sortProducts 排好的产品列表
 * @returns (a, b) => number；不在列表里的产品排最后
 */
export function byProductOrder(sortedProducts) {
  const pos = new Map(sortedProducts.map((p, i) => [p.id, i]));
  const at = (id) => pos.get(id) ?? sortedProducts.length;
  return (a, b) => at(a.product_id) - at(b.product_id);
}
