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

/** from ~ to 之间的所有月份（含两端），YYYY-MM */
export function monthRange(from, to) {
  const out = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}
