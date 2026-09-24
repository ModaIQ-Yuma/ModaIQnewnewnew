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
 * @param shippingGoals  shipping_goals[]（含 cycle_start, product_id, target_qty）
 * @param products  products[]（含 id, is_new）
 * @param cycleStart "YYYY-MM-DD"
 * @param staffId   null = 全店
 */
export function calcPerfMetrics({ collabs, videos, shippingGoals, products, cycleStart, staffId }) {
  const cEnd = cycleEndDate(cycleStart);
  const { vFrom, vTo } = videoMonthRange(cEnd);
  const inShip  = (d) => d && d >= cycleStart && d <= cEnd;
  const inVideo = (d) => d && d >= vFrom && d <= vTo;

  const newPids    = new Set(products.filter(p => p.is_new === true).map(p => p.id));
  const oldPids    = new Set(products.filter(p => p.is_new === false).map(p => p.id));
  const goalsInCycle = shippingGoals.filter(g => g.cycle_start === cycleStart);

  const scoped  = staffId ? collabs.filter(c => c.staff_id === staffId) : collabs;
  const sampled = scoped.filter(c => inShip(c.ship_date));

  // ── a：实际视频数 ÷ 预估视频数 ────────────────────────────────────────────
  // 助理预估 = 预估视频 ÷ 寄样目标 × 分到的件数（每个产品四舍五入后相加）
  const allocOf = (g) => (g.goal_allocations || []).find(a => a.staff_id === staffId)?.qty || 0;
  const estimatedVideos = goalsInCycle.reduce((s, g) => s + (staffId
    ? Math.round((Number(g.estimated_videos) || 0) / (Number(g.target_qty) || 1) * allocOf(g))
    : (Number(g.estimated_videos) || 0)), 0);
  // 实际视频（自然月发布）：全店 = 全部视频（含非CRM）；助理 = 按达人算，
  // 和她合作过的达人（她名下有寄样），这些达人当月发布的所有视频都算她的
  const periodVids = videos.filter(v => inVideo(v.published_at?.slice(0, 10)));
  const creatorOf = new Map(collabs.map(c => [c.id, c.creator_id]));
  const myCreators = new Set(scoped.map(c => c.creator_id));
  const staffVids = staffId ? periodVids.filter(v => myCreators.has(creatorOf.get(v.collaboration_id))) : periodVids;
  const actualVideos = staffVids.length;
  const a = estimatedVideos > 0 ? actualVideos / estimatedVideos : null;

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
  const scopedVids = staffVids;
  const saleVids   = scopedVids.filter(v => (v.orders || 0) > 0).length;
  const c = safeDiv(saleVids, scopedVids.length);

  // ── d：新品寄样达成率 ─────────────────────────────────────────────────────
  const newGoals  = goalsInCycle.filter(g => newPids.has(g.product_id));
  const newTarget = newGoals.reduce((s, g) => s + (staffId ? allocOf(g) : (Number(g.target_qty) || 0)), 0);
  const newActual = sampled.filter(c => newPids.has(c.product_id)).length;
  const d = safeDiv(newActual, newTarget);

  // ── e：Lv1 达人占比 ────────────────────────────────────────────────────────
  const shipTotal = sampled.length;
  const lv1Count  = sampled.filter(c => c.attrs?.official_grade === "Lv1").length;   // 寄样时等级
  const e = safeDiv(lv1Count, shipTotal);

  return {
    a, b, c, d, e,
    estimatedVideos,
    actualVideos,
    newTarget, newActual,
    oldInfluencerTotal: oldCreatorIds.size,
    oldWithSalesTotal:  oldWithSales.size,
    saleVids, totalVids: scopedVids.length,
    shipTotal, lv1Count,
    cycleStart, cEnd, vFrom, vTo,
  };
}
