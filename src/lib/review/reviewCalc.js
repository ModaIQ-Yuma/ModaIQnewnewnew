// lib/review/reviewCalc.js — 复盘指标计算纯函数（无网络请求，无副作用）
import { safeDiv, shipRange, videoRange } from "../utils.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";

const inRange = (dateStr, from, to) =>
  dateStr && dateStr >= from && dateStr <= to;

// ─── 全店 / 单品：单月指标 ───────────────────────────────────────────────────

/**
 * 计算单月核心指标
 * @param collabs  collaborations 数组（含 ship_date、staff_id、product_id）
 * @param videos   video_records 数组（含 published_at、orders、vv、clicks、collaboration_id、product_id）
 * @param ym       "YYYY-MM"
 * @param productId 传 null = 全店，传 uuid = 按产品筛
 */
export function calcMonthMetrics(collabs, videos, ym, productId = null) {
  const sr = shipRange(ym);
  const vr = videoRange(ym);

  const c = productId ? collabs.filter((x) => x.product_id === productId) : collabs;
  const v = productId ? videos.filter((x) => x.product_id === productId) : videos;

  // 寄样端
  const sampled       = c.filter((x) => inRange(x.ship_date, sr.from, sr.to));
  const shipCount     = sampled.length;
  const collabIds     = new Set(sampled.map((x) => x.id));
  const fulfilled     = v.filter((x) => collabIds.has(x.collaboration_id) && inRange(x.published_at?.slice(0, 10), vr.from, vr.to));
  const fulfilledIds  = new Set(fulfilled.map((x) => x.collaboration_id));
  const fulfillCount  = fulfilledIds.size;
  const fulfillRate   = safeDiv(fulfillCount, shipCount);

  // 视频端（CRM + 非CRM）
  const periodVideos  = v.filter((x) => inRange(x.published_at?.slice(0, 10), vr.from, vr.to));
  const videoCount    = periodVideos.length;
  const withSalesVids = periodVideos.filter((x) => (x.orders || 0) >= 1);
  const videoOrders   = periodVideos.reduce((s, x) => s + (x.orders || 0), 0);
  const totalVV       = periodVideos.reduce((s, x) => s + (x.vv || 0), 0);
  const totalClicks   = periodVideos.reduce((s, x) => s + (x.clicks || 0), 0);
  const burstCount    = periodVideos.filter((x) => (x.orders || 0) >= BURST_ORDER_THRESHOLD).length;

  // 有出单的寄样达人数
  const withSalesCollabIds = new Set(withSalesVids.map((x) => x.collaboration_id).filter(Boolean));
  const withSalesCount = [...fulfilledIds].filter((id) => withSalesCollabIds.has(id)).length;

  // 平均履约周期（寄样日 → 首条视频发布日）
  const gaps = [];
  for (const col of sampled) {
    const colVids = v.filter((x) => x.collaboration_id === col.id && x.published_at)
      .sort((a, b) => a.published_at.localeCompare(b.published_at));
    if (!colVids.length) continue;
    const shipD  = new Date(col.ship_date);
    const firstV = new Date(colVids[0].published_at.slice(0, 10));
    const diff   = Math.round((firstV - shipD) / 86400000);
    if (diff >= 0) gaps.push(diff);
  }
  const avgFulfillDays = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;

  return {
    shipCount, fulfillCount, fulfillRate,
    withSalesCount,
    saleRate:       safeDiv(withSalesCount, fulfillCount),
    videoCount,
    videoWithSales: withSalesVids.length,
    videoSaleRate:  safeDiv(withSalesVids.length, videoCount),
    videoOrders,
    totalVV, totalClicks,
    ctr:            safeDiv(totalClicks, totalVV),
    cvr:            safeDiv(videoOrders, totalClicks),
    burstCount,
    sampleSalesRatio: safeDiv(videoOrders, shipCount),
    avgFulfillDays,
  };
}

// ─── 等级复盘：单月按 official_grade 分组 ───────────────────────────────────

export function calcGradeMetrics(collabs, videos, creators, ym, productId, burstThreshold) {
  const vr = videoRange(ym);
  const thresh = burstThreshold ?? BURST_ORDER_THRESHOLD;

  // creator_id → grade
  const gradeMap = Object.fromEntries(creators.map((c) => [c.id, c.official_grade || "未标注"]));
  // collaboration_id → creator grade
  const collabGradeMap = {};
  for (const col of collabs) collabGradeMap[col.id] = gradeMap[col.creator_id] || "未标注";

  const v = productId ? videos.filter((x) => x.product_id === productId) : videos;
  const periodVideos = v.filter((x) => inRange(x.published_at?.slice(0, 10), vr.from, vr.to));

  const stats = {};
  const getRow = (g) => {
    if (!stats[g]) stats[g] = { grade: g, videoCount: 0, withSales: 0, orders: 0, burstCount: 0 };
    return stats[g];
  };

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
  return Object.values(stats)
    .filter((r) => r.videoCount > 0)
    .map((r) => ({
      ...r,
      videoPct:     safeDiv(r.videoCount, totalVideos),
      videoSaleRate: safeDiv(r.withSales, r.videoCount),
      avgOrder:      safeDiv(r.orders, r.videoCount),
    }))
    .sort((a, b) => b.orders - a.orders);
}

// ─── 助理复盘：单月按 staff_id × product 分组 ───────────────────────────────

export function calcStaffMetrics(collabs, videos, ym, productId) {
  const sr = shipRange(ym);
  const vr = videoRange(ym);

  const c = productId ? collabs.filter((x) => x.product_id === productId) : collabs;
  const sampled = c.filter((x) => inRange(x.ship_date, sr.from, sr.to));

  const map = {};
  for (const col of sampled) {
    const key = col.staff_id || "unknown";
    if (!map[key]) map[key] = { staffId: key, shipCount: 0, fulfillCount: 0, withSalesCount: 0 };
    map[key].shipCount++;
    const colVids = videos.filter((x) =>
      x.collaboration_id === col.id && inRange(x.published_at?.slice(0, 10), vr.from, vr.to)
    );
    if (colVids.length) {
      map[key].fulfillCount++;
      if (colVids.some((v) => (v.orders || 0) >= 1)) map[key].withSalesCount++;
    }
  }

  return Object.values(map).map((r) => ({
    ...r,
    fulfillRate: safeDiv(r.fulfillCount, r.shipCount),
    saleRate:    safeDiv(r.withSalesCount, r.fulfillCount),
  }));
}

// calcBurstVideos 已拆到 lib/review/burstCalc.js，从那里引入
export { calcBurstVideos } from "./burstCalc.js";
