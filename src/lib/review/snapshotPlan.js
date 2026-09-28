// ─── 月度快照计算（纯函数）：按「截止 M+1 月 5 日」口径算每个产品的指标 ───────
import { calcMonthMetrics } from "./reviewCalc.js";
import { videosAsOf, cutoffOf } from "../video/cutoff.js";

/**
 * @param orders  可选：Map<productId, { totalOrders, organicOrders }>（FSorder 或手填的整店订单）
 * @returns { rows:[{ productId, metrics }], cutoff, dataTo, complete, unknown }
 *   complete = 已导入的视频数据是否已经覆盖到截止日
 */
export function planMonthSnapshot({ ym, products, collabs, videos, ledger, cutoffDay, orders }) {
  const cutoff = cutoffOf(ym, cutoffDay);
  const asOf = videosAsOf(videos, ledger, cutoff);
  return {
    cutoff, dataTo: asOf.dataTo, unknown: asOf.unknown,
    complete: !!asOf.dataTo && asOf.dataTo >= cutoff,
    rows: products.map((p) => ({ productId: p.id, metrics: { ...calcMonthMetrics(collabs, asOf.videos, ym, p.id), ...(orders?.get(p.id) || {}) } })),
  };
}
