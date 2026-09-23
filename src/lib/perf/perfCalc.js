// lib/perf/perfCalc.js — 绩效评估计算纯函数
import { safeDiv } from "../utils.js";

export const WEIGHTS = { a:0.25, b:0.25, c:0.20, d:0.20, e:0.10 };

const SCORE_TABLES = {
  a: [{min:0.90,score:1.00},{min:0.85,score:0.90},{min:0.80,score:0.80},{min:0.70,score:0.60},{min:0,score:0.30}],
  b: [{min:0.30,score:1.00},{min:0.25,score:0.90},{min:0.20,score:0.80},{min:0.15,score:0.60},{min:0,score:0.30}],
  c: [{min:0.20,score:1.00},{min:0.15,score:0.90},{min:0.10,score:0.70},{min:0,score:0.30}],
  d: [{min:0.90,score:1.00},{min:0.85,score:0.90},{min:0.80,score:0.80},{min:0.70,score:0.60},{min:0,score:0.30}],
  e: [{min:0.15,score:0.30},{min:0.12,score:0.60},{min:0.10,score:0.90},{min:0,score:1.00}],
};

export function getScore(key, v) {
  if (v == null) return null;
  const row = SCORE_TABLES[key].find(r => v >= r.min);
  return row?.score ?? null;
}

export function getFinalGrade(x) {
  if (x == null) return "—";
  if (x >= 0.90) return "P=100%";
  if (x >= 0.60) return `P=绩效金额×${(x * 100).toFixed(0)}%`;
  return "P=绩效金额×30%";
}

function cycleEndDate(cycleStart) {
  const [y, m] = cycleStart.split("-").map(Number);
  return new Date(y, m, 14).toLocaleDateString("sv-SE", { timeZone:"America/Los_Angeles" });
}

function videoMonthRange(cEnd) {
  const [y, m] = cEnd.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return { vFrom:`${y}-${mm}-01`, vTo:`${y}-${mm}-${String(last).padStart(2,"0")}` };
}

/**
 * 计算绩效指标
 * @param collabs   collaborations[]（含 ship_date, staff_id, product_id, creator_id, id）
 * @param videos    video_records[]（含 published_at, orders, collaboration_id）
 * @param creators  creators[]（含 id, official_grade）
 * @param shippingGoals  shipping_goals[]（含 cycle_start, product_id, target_qty）
 * @param products  products[]（含 id, is_new）
 * @param cycleStart "YYYY-MM-DD"
 * @param staffId   null = 全店
 */
export function calcPerfMetrics({ collabs, videos, creators, shippingGoals, products, cycleStart, staffId }) {
  const cEnd = cycleEndDate(cycleStart);
  const { vFrom, vTo } = videoMonthRange(cEnd);
  const inShip  = (d) => d && d >= cycleStart && d <= cEnd;
  const inVideo = (d) => d && d >= vFrom && d <= vTo;

  const newPids    = new Set(products.filter(p => p.is_new === true).map(p => p.id));
  const oldPids    = new Set(products.filter(p => p.is_new === false).map(p => p.id));
  const gradeMap   = Object.fromEntries((creators || []).map(c => [c.id, c.official_grade || ""]));
  const goalsInCycle = shippingGoals.filter(g => g.cycle_start === cycleStart);

  const scoped  = staffId ? collabs.filter(c => c.staff_id === staffId) : collabs;
  const sampled = scoped.filter(c => inShip(c.ship_date));
  const sampledIds = new Set(sampled.map(c => c.id));

  // ── a：实际视频数 ÷ 本周期寄样目标总数 ────────────────────────────────────
  const targetQty = staffId
    ? 0  // 助理级别需要 goal_allocations，暂不支持
    : goalsInCycle.reduce((s, g) => s + (Number(g.target_qty) || 0), 0);
  const periodVids = videos.filter(v => inVideo(v.published_at?.slice(0, 10)));
  const actualVideos = staffId
    ? periodVids.filter(v => sampledIds.has(v.collaboration_id)).length
    : periodVids.length;
  const a = targetQty > 0 ? actualVideos / targetQty : null;

  // ── b：老品达人转化率 ──────────────────────────────────────────────────────
  const oldSampled    = sampled.filter(c => oldPids.has(c.product_id));
  const oldCollabIds  = new Set(oldSampled.map(c => c.id));
  const oldCreatorIds = new Set(oldSampled.map(c => c.creator_id));
  const oldCreatorOf  = new Map(oldSampled.map(c => [c.id, c.creator_id]));
  const oldWithSales  = new Set(
    videos.filter(v => oldCollabIds.has(v.collaboration_id) && (v.orders || 0) > 0)
      .map(v => oldCreatorOf.get(v.collaboration_id))
      .filter(Boolean)
  );
  const b = safeDiv(oldWithSales.size, oldCreatorIds.size);

  // ── c：视频出单率 ──────────────────────────────────────────────────────────
  const scopedVids = staffId ? periodVids.filter(v => sampledIds.has(v.collaboration_id)) : periodVids;
  const saleVids   = scopedVids.filter(v => (v.orders || 0) > 0).length;
  const c = safeDiv(saleVids, scopedVids.length);

  // ── d：新品寄样达成率 ─────────────────────────────────────────────────────
  const newGoals  = goalsInCycle.filter(g => newPids.has(g.product_id));
  const newTarget = newGoals.reduce((s, g) => s + (Number(g.target_qty) || 0), 0);
  const newActual = sampled.filter(c => newPids.has(c.product_id)).length;
  const d = safeDiv(newActual, newTarget);

  // ── e：Lv1 达人占比 ────────────────────────────────────────────────────────
  const shipTotal = sampled.length;
  const lv1Count  = sampled.filter(c => gradeMap[c.creator_id] === "Lv1").length;
  const e = safeDiv(lv1Count, shipTotal);

  return {
    a, b, c, d, e,
    estimatedVideos: targetQty,
    actualVideos,
    newTarget, newActual,
    oldInfluencerTotal: oldCreatorIds.size,
    oldWithSalesTotal:  oldWithSales.size,
    saleVids, totalVids: scopedVids.length,
    shipTotal, lv1Count,
    cycleStart, cEnd, vFrom, vTo,
  };
}
