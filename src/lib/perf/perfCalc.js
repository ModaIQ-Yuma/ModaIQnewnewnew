// lib/perf/perfCalc.js — 绩效评估计算纯函数
import { safeDiv } from "../utils.js";
import { videoRange } from "../dates.js";
import { cycleEndOf } from "../cycle.js";

export const WEIGHTS = { a:0.25, b:0.25, c:0.20, d:0.20, e:0.10 };
export const PERF_LABELS = { a:"视频产出达成率", b:"老品红人转化率", c:"视频转化率", d:"新品寄样达成率", e:"Lv1达人占比" };

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

/** 考核指标分档（得分从高到低）：[{ text: "85%≤a<90%", score: 0.9 }, …] */
export function tierRows(key) {
  const p = (x) => `${Math.round(x * 100)}%`;
  const rows = [...SCORE_TABLES[key]].sort((x, y) => y.min - x.min);
  return rows.map((r, i) => {
    const upper = rows[i - 1]?.min;
    const text = r.min === 0 ? `${key}<${p(upper)}` : upper == null ? `${key}≥${p(r.min)}` : `${p(r.min)}≤${key}<${p(upper)}`;
    return { text, score: r.score };
  }).sort((x, y) => y.score - x.score);
}

/** 每项得分 + 合计（任一项算不出则合计为 null） */
export function perfRows(metrics) {
  const rows = Object.entries(PERF_LABELS).map(([key, label]) => {
    const val = metrics[key], score = getScore(key, val);
    return { key, label, val, score, weight: WEIGHTS[key], weighted: score != null ? score * WEIGHTS[key] : null };
  });
  const total = rows.every((r) => r.weighted != null) ? rows.reduce((s, r) => s + r.weighted, 0) : null;
  return { rows, total };
}

/** 视频发布日（洛杉矶日期，导入时已按洛杉矶零点存） */
export const pubDay = (v) => v.published_at?.slice(0, 10) || "";

/** 非 CRM 视频（对不上任何寄样记录） */
export const isNonCrm = (v) => !v.collaboration_id;

/**
 * 计入绩效的视频
 *   全店（staffId 为空）= CRM 视频全部 + 非 CRM 视频里出过单的（0 单的非 CRM 不算）
 *   助理 = 和她合作过的达人（她名下有寄样）发的所有视频
 */
export function videosOfStaff(collabs, videos, staffId) {
  if (!staffId) return videos.filter((v) => !isNonCrm(v) || (v.orders || 0) > 0);
  const creatorOf = new Map(collabs.map((c) => [c.id, c.creator_id]));
  const mine = new Set(collabs.filter((c) => c.staff_id === staffId).map((c) => c.creator_id));
  return videos.filter((v) => mine.has(creatorOf.get(v.collaboration_id)));
}

export function getFinalGrade(x) {
  if (x == null) return "—";
  if (x >= 0.90) return "P=100%";
  if (x >= 0.60) return `P=绩效金额×${(x * 100).toFixed(0)}%`;
  return "P=绩效金额×30%";
}

/**
 * 计算绩效指标
 * @param collabs   collaborations[]（含 ship_date, staff_id, product_id, creator_id, id）
 * @param videos    video_records[]（含 published_at, orders, collaboration_id）
 * @param shippingGoals  shipping_goals[]（含 cycle_start, product_id, target_qty）
 * @param products  products[]（含 id, is_new）
 * @param cycleStart "YYYY-MM-DD"
 * @param staffId   null = 全店
 * @param creators  creators[]（id, handle）：全店老品转化率里，非 CRM 出单达人与已寄样达人去重用
 */
export function calcPerfMetrics({ collabs, videos, shippingGoals, products, cycleStart, staffId, creators = [] }) {
  const cEnd = cycleEndOf(cycleStart);                     // 账期：15 日 ~ 次月 14 日（洛杉矶日期）
  const { from: vFrom, to: vTo } = videoRange(cEnd.slice(0, 7));   // 视频：账期结束月的自然月
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
  // 实际视频（自然月发布）：口径见 videosOfStaff（全店的非 CRM 只算出过单的）
  const periodVids = videos.filter(v => inVideo(pubDay(v)));
  const staffVids = videosOfStaff(collabs, periodVids, staffId);
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
  // 全店另加：当月老品上出过单的非 CRM 达人（分子分母都加；0 单的不算；已在寄样名单里的不重复算）
  const idOfHandle = new Map(creators.map(c => [String(c.handle || "").toLowerCase(), c.id]));
  const nonCrmOldSellers = staffId ? new Set() : new Set(
    periodVids.filter(v => isNonCrm(v) && oldPids.has(v.product_id) && (v.orders || 0) > 0)
      .map(v => String(v.creator_handle || "").toLowerCase())
      .filter(h => h && !oldCreatorIds.has(idOfHandle.get(h)))
  );
  const b = safeDiv(oldWithSales.size + nonCrmOldSellers.size, oldCreatorIds.size + nonCrmOldSellers.size);

  // ── c：视频出单率 ──────────────────────────────────────────────────────────
  const saleVids = staffVids.filter(v => (v.orders || 0) > 0).length;
  const c = safeDiv(saleVids, staffVids.length);

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
    oldInfluencerTotal: oldCreatorIds.size + nonCrmOldSellers.size,
    oldWithSalesTotal:  oldWithSales.size + nonCrmOldSellers.size,
    nonCrmOldSellers:   nonCrmOldSellers.size,
    saleVids, totalVids: staffVids.length,
    shipTotal, lv1Count,
    cycleStart, cEnd, vFrom, vTo,
  };
}
