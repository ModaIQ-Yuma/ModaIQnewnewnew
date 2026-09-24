// lib/review/reviewCalc.js — 按月统计：给通用区间计算套上默认区间
//   寄样端 = 账期（上月 15 日 ~ 本月 14 日），视频端 = 自然月
import { shipRange, videoRange } from "../utils.js";
import { calcRangeMetrics, calcVideoGradeMetrics } from "./rangeCalc.js";

export { calcBurstVideos } from "./burstCalc.js";

/** 某月的默认区间 { ship, video }；videoFrom/videoTo 可覆盖视频端 */
export function monthRanges(ym, videoFrom, videoTo) {
  const vr = videoRange(ym);
  return { ship: shipRange(ym), video: { from: videoFrom || vr.from, to: videoTo || vr.to } };
}

/** 单月核心指标 */
export function calcMonthMetrics(collabs, videos, ym, productId = null, videoFrom, videoTo) {
  return calcRangeMetrics({ collabs, videos, productId, ...monthRanges(ym, videoFrom, videoTo) });
}

/** 单月视频端等级分层（按寄样时等级，Lv7 → Lv1 → 未标注 → 非CRM） */
export function calcGradeMetrics(collabs, videos, ym, productId, burstThreshold, videoFrom, videoTo) {
  return calcVideoGradeMetrics({ collabs, videos, productId, burst: burstThreshold, ...monthRanges(ym, videoFrom, videoTo) });
}
