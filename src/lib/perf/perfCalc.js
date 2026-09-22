// lib/perf/perfCalc.js — 绩效评估计算纯函数
import { safeDiv } from "../utils.js";

const WEIGHTS = { a: 0.25, b: 0.25, c: 0.20, d: 0.20, e: 0.10 };
const SCORE_TABLES = {
  a: [{min:0.90,score:1.00},{min:0.85,score:0.90},{min:0.80,score:0.80},{min:0.70,score:0.60},{min:0,score:0.30}],
  b: [{min:0.30,score:1.00},{min:0.25,score:0.90},{min:0.20,score:0.80},{min:0.15,score:0.60},{min:0,score:0.30}],
  c: [{min:0.20,score:1.00},{min:0.15,score:0.90},{min:0.10,score:0.70},{min:0,score:0.30}],
  d: [{min:0.90,score:1.00},{min:0.85,score:0.90},{min:0.80,score:0.80},{min:0.70,score:0.60},{min:0,score:0.30}],
  e: [{min:0.15,score:0.30},{min:0.12,score:0.60},{min:0.10,score:0.90},{min:0,score:1.00}],
};
function getScore(key, v) {
  if (v == null) return null;
  const row = SCORE_TABLES[key].find(r => v >= r.min);
  return row?.score ?? null;
}
export function getFinalGrade(x) {
  if (x == null) return "—";
  if (x >= 0.90) return "P=100%";
  if (x >= 0.60) return `P=绩效金额×${(x*100).toFixed(0)}%`;
  return "P=绩效金额×30%";
}
export { WEIGHTS, getScore };

function naturalMonthRange(cEnd) {
  const [y,m] = cEnd.split("-").map(Number);
  const lastDay = new Date(y,m,0).getDate();
  const ym = `${y}-${String(m).padStart(2,"0")}`;
  return { vStart:`${ym}-01`, vEnd:`${ym}-${String(lastDay).padStart(2,"0")}` };
}

/**
 * 计算绩效指标
 * @param collabs    collaborations 数组
 * @param videos     video_records 数组
 * @param products   products 数组
 * @param cycleStart "YYYY-MM-DD"
 * @param staffId    null=全店
 */
export function calcPerfMetrics(collabs, videos, products, cycleStart, staffId) {
  const cEnd = (() => { const [y,m]=cycleStart.split("-").map(Number); const d=new Date(y,m,14); return d.toLocaleDateString("sv-SE",{timeZone:"America/Los_Angeles"}); })();
  const { vStart, vEnd } = naturalMonthRange(cEnd);
  const inShip  = (d) => d && d >= cycleStart && d <= cEnd;
  const inVideo = (d) => d && d >= vStart && d <= vEnd;

  const newPids = new Set(products.filter(p=>p.is_new).map(p=>p.id));
  const oldPids = new Set(products.filter(p=>!p.is_new).map(p=>p.id));

  const c = staffId ? collabs.filter(x=>x.staff_id===staffId) : collabs;
  const sampled = c.filter(x=>inShip(x.ship_date));

  // a: 视频发布达成率（暂无 estimatedVideos，显示实际视频数）
  const actualVideos = videos.filter(v => inVideo(v.published_at?.slice(0,10)) && (staffId ? sampled.some(col=>col.id===v.collaboration_id) : true)).length;
  const a = null; // shipping_goals 未实现，留 null

  // b: 老品红人转化率
  const oldSampled = sampled.filter(x=>oldPids.has(x.product_id));
  const oldWithSales = new Set(oldSampled.filter(col=>videos.some(v=>v.collaboration_id===col.id&&(v.orders||0)>0)).map(x=>x.creator_id));
  const b = safeDiv(oldWithSales.size, new Set(oldSampled.map(x=>x.creator_id)).size);

  // c: 视频转化率
  const periodV = videos.filter(v=>inVideo(v.published_at?.slice(0,10)));
  const scopedV = staffId ? periodV.filter(v=>sampled.some(col=>col.id===v.collaboration_id)) : periodV;
  const saleVids = scopedV.filter(v=>(v.orders||0)>0).length;
  const c_metric = safeDiv(saleVids, scopedV.length);

  // d: 新品寄样达成率（无目标数据，显示实际）
  const newActual = sampled.filter(x=>newPids.has(x.product_id)).length;
  const d = null; // shipping_goals 未实现

  // e: Lv1占比（需要 creators.official_grade，collabs 没有，返回 null）
  const e = null;

  return {
    a, b, c: c_metric, d, e,
    actualVideos, newActual,
    oldInfluencerTotal: new Set(oldSampled.map(x=>x.creator_id)).size,
    oldWithSalesTotal: oldWithSales.size,
    saleVids, totalVids: scopedV.length,
    shipTotal: sampled.length,
    cycleStart, cEnd, vStart, vEnd,
  };
}
