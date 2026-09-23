// lib/review/reviewCalc.js — 复盘指标计算纯函数
import { safeDiv, shipRange, videoRange } from "../utils.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";

export { calcBurstVideos } from "./burstCalc.js";

const inRange = (d, from, to) => d && d >= from && d <= to;

/**
 * 单月核心指标
 * @param videoFrom/videoTo 可选，覆盖视频自然月（用于独立视频日期筛选）
 */
export function calcMonthMetrics(collabs, videos, ym, productId = null, videoFrom, videoTo) {
  const sr = shipRange(ym);
  const vr = videoRange(ym);
  const vFrom = videoFrom || vr.from;
  const vTo   = videoTo   || vr.to;

  const c = productId ? collabs.filter((x) => x.product_id === productId) : collabs;
  const v = productId ? videos.filter((x) => x.product_id === productId)  : videos;

  const sampled      = c.filter((x) => inRange(x.ship_date, sr.from, sr.to));
  const shipCount    = sampled.length;
  const collabIds    = new Set(sampled.map((x) => x.id));
  const fulfilled    = v.filter((x) => collabIds.has(x.collaboration_id) && inRange(x.published_at?.slice(0,10), vFrom, vTo));
  const fulfilledIds = new Set(fulfilled.map((x) => x.collaboration_id));
  const fulfillCount = fulfilledIds.size;

  const periodVideos  = v.filter((x) => inRange(x.published_at?.slice(0,10), vFrom, vTo));
  const videoCount    = periodVideos.length;
  const withSalesVids = periodVideos.filter((x) => (x.orders||0) >= 1);
  const videoOrders   = periodVideos.reduce((s, x) => s + (x.orders||0), 0);
  const totalVV       = periodVideos.reduce((s, x) => s + (x.vv||0), 0);
  const totalClicks   = periodVideos.reduce((s, x) => s + (x.clicks||0), 0);
  const burstCount    = periodVideos.filter((x) => (x.orders||0) >= BURST_ORDER_THRESHOLD).length;

  const withSalesCollabIds = new Set(withSalesVids.map((x) => x.collaboration_id).filter(Boolean));
  const withSalesCount = [...fulfilledIds].filter((id) => withSalesCollabIds.has(id)).length;

  // 每条寄样的首条视频日期：一次遍历建索引（避免 寄样数×视频数 的嵌套循环）
  const firstVid = new Map();
  for (const x of v) {
    if (!x.published_at || !collabIds.has(x.collaboration_id)) continue;
    const cur = firstVid.get(x.collaboration_id);
    if (!cur || x.published_at < cur) firstVid.set(x.collaboration_id, x.published_at);
  }
  const gaps = [];
  for (const col of sampled) {
    const first = firstVid.get(col.id);
    if (!first) continue;
    const diff = Math.round((new Date(first.slice(0,10)) - new Date(col.ship_date)) / 86400000);
    if (diff >= 0) gaps.push(diff);
  }

  return {
    shipCount, fulfillCount, withSalesCount,
    fulfillRate:      safeDiv(fulfillCount, shipCount),
    saleRate:         safeDiv(withSalesCount, fulfillCount),
    videoCount,       videoWithSales: withSalesVids.length,
    videoSaleRate:    safeDiv(withSalesVids.length, videoCount),
    videoOrders,      totalVV, totalClicks,
    ctr:              safeDiv(totalClicks, totalVV),
    cvr:              safeDiv(videoOrders, totalClicks),
    burstCount,
    sampleSalesRatio: safeDiv(videoOrders, shipCount),
    avgFulfillDays:   gaps.length ? Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length) : null,
  };
}

/** 等级复盘：按「寄样时等级」分组（collab.attrs.official_grade） */
export function calcGradeMetrics(collabs, videos, ym, productId, burstThreshold, videoFrom, videoTo) {
  const vr     = videoRange(ym);
  const vFrom  = videoFrom || vr.from;
  const vTo    = videoTo   || vr.to;
  const thresh = burstThreshold ?? BURST_ORDER_THRESHOLD;

  const collabGradeMap = {};
  for (const col of collabs) collabGradeMap[col.id] = col.attrs?.official_grade || "未标注";

  const v = productId ? videos.filter((x) => x.product_id === productId) : videos;
  const periodVideos = v.filter((x) => inRange(x.published_at?.slice(0,10), vFrom, vTo));

  const stats = {};
  const getRow = (g) => { if (!stats[g]) stats[g] = { grade:g, videoCount:0, withSales:0, orders:0, burstCount:0 }; return stats[g]; };

  for (const vid of periodVideos) {
    const grade = vid.collaboration_id ? (collabGradeMap[vid.collaboration_id] || "未标注") : "非CRM";
    const row = getRow(grade);
    row.videoCount++;
    const o = vid.orders || 0;
    if (o >= 1) row.withSales++;
    row.orders += o;
    if (o >= thresh) row.burstCount++;
  }

  const totalVideos = periodVideos.length;
  return Object.values(stats).filter((r) => r.videoCount > 0).map((r) => ({
    ...r,
    videoPct:      safeDiv(r.videoCount, totalVideos),
    videoSaleRate: safeDiv(r.withSales, r.videoCount),
    avgOrder:      safeDiv(r.orders, r.videoCount),
  })).sort((a, b) => b.orders - a.orders);
}

/** 助理复盘：按 staff_id 分组 */
export function calcStaffMetrics(collabs, videos, ym, productId, videoFrom, videoTo) {
  const sr    = shipRange(ym);
  const vr    = videoRange(ym);
  const vFrom = videoFrom || vr.from;
  const vTo   = videoTo   || vr.to;

  const c       = productId ? collabs.filter((x) => x.product_id === productId) : collabs;
  const sampled = c.filter((x) => inRange(x.ship_date, sr.from, sr.to));

  const map = {};
  for (const col of sampled) {
    const key = col.staff_id || "unknown";
    if (!map[key]) map[key] = { staffId:key, shipCount:0, fulfillCount:0, withSalesCount:0 };
    map[key].shipCount++;
    const colVids = videos.filter((x) => x.collaboration_id === col.id && inRange(x.published_at?.slice(0,10), vFrom, vTo));
    if (colVids.length) {
      map[key].fulfillCount++;
      if (colVids.some((v) => (v.orders||0) >= 1)) map[key].withSalesCount++;
    }
  }
  return Object.values(map).map((r) => ({
    ...r,
    fulfillRate: safeDiv(r.fulfillCount, r.shipCount),
    saleRate:    safeDiv(r.withSalesCount, r.fulfillCount),
  }));
}
