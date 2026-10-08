// ─── 月度提报汇总（纯函数）：全店 + 每位助理的绩效、视频明细、奖金 ─────────────
// 绩效直接用绩效评估的算法（calcPerfMetrics），不另算；
// 视频明细 = M 月发布的视频，数据截止 M+1 月 5 日（与快照口径一致，什么时候导出都一样）。
import { calcPerfMetrics, perfRows, pubDay, videosOfStaff } from "../perf/perfCalc.js";
import { shipRange } from "../cycle.js";
import { videoRange } from "../dates.js";
import { bonusPool, splitBonus, videoUrl } from "./bonusCalc.js";

/** 明细排序：发布日期从早到晚，同一天按销售额从高到低；没有发布日期的排最后 */
function byDateThenGmv(a, b) {
  const da = pubDay(a) || "9999", db = pubDay(b) || "9999";
  return da !== db ? da.localeCompare(db) : (Number(b.gmv) || 0) - (Number(a.gmv) || 0);
}

/** 视频明细 + 总览 */
export function videoDetail(videos) {
  const rows = [...videos].sort(byDateThenGmv);
  const sale = rows.filter((v) => (v.orders || 0) > 0).length;
  return { rows, total: rows.length, sale, rate: rows.length ? sale / rows.length : null };
}

/** M 月发布的视频 */
export function monthVideos(videos, ym) {
  const { from, to } = videoRange(ym);
  return videos.filter((v) => { const d = pubDay(v); return d >= from && d <= to; });
}

/**
 * @param ym        视频月份 YYYY-MM（寄样账期 = 上月 15 日 ~ 本月 14 日）
 * @param videos    当前视频（绩效用，与绩效评估页一致）
 * @param asOf      截止 M+1 月 5 日的视频（明细用，videosAsOf 还原）
 * @param people    参与提报的助理 [{ id, name }]
 * @returns { ym, cycleStart, store, staff: [...], pool, bd, bursts }
 */
export function buildMonthReport({ ym, collabs, videos, asOf, shippingGoals, products, people, submissions, extras }) {
  const cycleStart = shipRange(ym).from;
  const monthAsOf = monthVideos(asOf, ym);
  const person = (staffId) => {
    const metrics = calcPerfMetrics({ collabs, videos, shippingGoals, products, cycleStart, staffId });
    return { metrics, perf: perfRows(metrics), detail: videoDetail(videosOfStaff(collabs, monthAsOf, staffId)) };
  };
  const staffRows = people.map((p) => ({ ...p, ...person(p.id) }));
  const pool = bonusPool(submissions, extras, ym);
  const split = splitBonus(pool.total, staffRows.map((s) => ({ id: s.id, score: s.perf.total })), extras, ym);
  const bonusOf = new Map(split.staff.map((s) => [s.id, s]));
  return {
    ym, cycleStart,
    store: person(null),
    staff: staffRows.map((s) => ({ ...s, bonus: bonusOf.get(s.id) })),
    pool, bd: split.bd,
    bursts: burstsOfMonth(submissions, videos, ym),
    lives: extras.filter((e) => e.period === ym && e.kind === "直播爆单"),
  };
}

/** 本月提报的爆单视频，带上发布日、成交件数、链接（视频不在库里时用提报时记录的信息） */
export function burstsOfMonth(submissions, videos, ym) {
  const byVid = new Map(videos.map((v) => [v.video_id, v]));
  return submissions.filter((s) => s.period === ym).map((s) => {
    const v = byVid.get(s.video_id);
    return { ...s, published: v ? pubDay(v) : "", orders: v?.orders ?? null, url: videoUrl(v || s) };
  }).sort((a, b) => (Number(b.gmv) || 0) - (Number(a.gmv) || 0));
}
