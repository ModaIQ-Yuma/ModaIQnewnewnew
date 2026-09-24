// ─── 复盘核心计算（纯函数）：按「任意寄样区间 + 任意视频区间」算指标 ───────────
// 区间 { from, to } 任一端为空 = 不限（全量）。按月统计只是套上默认区间（见 reviewCalc.js）。
import { safeDiv } from "../utils.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";

export const within = (d, r) => !!d && (!r?.from || d >= r.from) && (!r?.to || d <= r.to);
const pubDay = (v) => v.published_at?.slice(0, 10);

// 等级从高到低：Lv7 在最上面；未标注、非CRM 最后
export const GRADE_ORDER = ["Lv7", "Lv6", "Lv5", "Lv4", "Lv3", "Lv2", "Lv1", "未标注", "非CRM"];
const gradeRank = (g) => { const i = GRADE_ORDER.indexOf(g); return i < 0 ? GRADE_ORDER.length : i; };
export const byGrade = (a, b) => gradeRank(a.grade) - gradeRank(b.grade);
export const gradeOf = (collab) => collab?.attrs?.official_grade || "未标注";

/** 公共前置：按产品筛选 + 区间切片 */
function scope({ collabs, videos, productId, ship, video }) {
  const c = productId ? collabs.filter((x) => x.product_id === productId) : collabs;
  const v = productId ? videos.filter((x) => x.product_id === productId) : videos;
  return { c, v, sampled: c.filter((x) => within(x.ship_date, ship)), periodVideos: v.filter((x) => within(pubDay(x), video)) };
}

/** 各寄样的视频出单合计（只算视频区间内的视频）：Map<collabId, orders> */
function ordersByCollab(periodVideos) {
  const m = new Map();
  for (const x of periodVideos) if (x.collaboration_id) m.set(x.collaboration_id, (m.get(x.collaboration_id) || 0) + (x.orders || 0));
  return m;
}

/** 核心指标（寄样端 + 视频端） */
export function calcRangeMetrics(p) {
  const burst = p.burst ?? BURST_ORDER_THRESHOLD;
  const { v, sampled, periodVideos } = scope(p);
  const collabIds = new Set(sampled.map((x) => x.id));
  const byCollab = ordersByCollab(periodVideos);
  const fulfilledIds = new Set(periodVideos.filter((x) => collabIds.has(x.collaboration_id)).map((x) => x.collaboration_id));
  const withSalesCount = [...fulfilledIds].filter((id) => byCollab.get(id) >= 1).length;

  const withSalesVids = periodVideos.filter((x) => (x.orders || 0) >= 1);
  const sum = (k) => periodVideos.reduce((s, x) => s + (x[k] || 0), 0);
  const videoOrders = sum("orders"), totalVV = sum("vv"), totalClicks = sum("clicks");

  // 每条寄样的首条视频日期：一次遍历建索引
  const firstVid = new Map();
  for (const x of v) {
    if (!x.published_at || !collabIds.has(x.collaboration_id)) continue;
    const cur = firstVid.get(x.collaboration_id);
    if (!cur || x.published_at < cur) firstVid.set(x.collaboration_id, x.published_at);
  }
  const gaps = sampled.map((col) => firstVid.get(col.id) && Math.round((new Date(firstVid.get(col.id).slice(0, 10)) - new Date(col.ship_date)) / 86400000))
    .filter((d) => d != null && d >= 0);

  const shipCount = sampled.length, fulfillCount = fulfilledIds.size, videoCount = periodVideos.length;
  return {
    shipCount, fulfillCount, withSalesCount,
    fulfillRate:      safeDiv(fulfillCount, shipCount),
    saleRate:         safeDiv(withSalesCount, fulfillCount),
    videoCount,       videoWithSales: withSalesVids.length,
    videoSaleRate:    safeDiv(withSalesVids.length, videoCount),
    videoOrders,      totalVV, totalClicks,
    ctr:              safeDiv(totalClicks, totalVV),
    cvr:              safeDiv(videoOrders, totalClicks),
    burstCount:       periodVideos.filter((x) => (x.orders || 0) >= burst).length,
    sampleSalesRatio: safeDiv(videoOrders, shipCount),
    avgFulfillDays:   gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
  };
}

/** 寄样端等级分层：按「寄样时等级」分组看寄样的产出 */
export function calcShipGradeMetrics(p) {
  const { sampled, periodVideos } = scope(p);
  const byCollab = ordersByCollab(periodVideos);
  const stats = {};
  for (const col of sampled) {
    const g = gradeOf(col), o = byCollab.get(col.id) || 0;
    const s = (stats[g] ||= { grade: g, shipCount: 0, salesCount: 0, ordersSum: 0 });
    s.shipCount++; s.ordersSum += o; if (o >= 1) s.salesCount++;
  }
  return Object.values(stats).map((s) => ({
    ...s, shipPct: safeDiv(s.shipCount, sampled.length),
    saleRate: safeDiv(s.salesCount, s.shipCount), gradeRoi: safeDiv(s.ordersSum, s.shipCount),
  })).sort(byGrade);
}

/** 视频端等级分层：视频按其寄样的等级分组；无寄样的为「非CRM」 */
export function calcVideoGradeMetrics(p) {
  const burst = p.burst ?? BURST_ORDER_THRESHOLD;
  const { periodVideos } = scope({ ...p, ship: null });
  const gradeByCollab = new Map(p.collabs.map((c) => [c.id, gradeOf(c)]));
  const stats = {};
  for (const x of periodVideos) {
    const g = x.collaboration_id ? (gradeByCollab.get(x.collaboration_id) || "未标注") : "非CRM";
    const s = (stats[g] ||= { grade: g, videoCount: 0, withSales: 0, orders: 0, burstCount: 0 });
    const o = x.orders || 0;
    s.videoCount++; s.orders += o; if (o >= 1) s.withSales++; if (o >= burst) s.burstCount++;
  }
  return Object.values(stats).map((s) => ({
    ...s, videoPct: safeDiv(s.videoCount, periodVideos.length),
    videoSaleRate: safeDiv(s.withSales, s.videoCount), avgOrder: safeDiv(s.orders, s.videoCount),
  })).sort(byGrade);
}
