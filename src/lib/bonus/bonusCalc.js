// ─── 月度提报：爆单档位、待提报清单、奖金池分成（纯函数）──────────────────
// 一条视频只提报一次（不升档补差）；奖金池 = 本月提报的爆单视频 + 直播爆单，
// 每位助理固定 base、绩效达标再加 extra，BD 拿剩下的；新开发付费达人单独结算给对应助理。
import { BONUS_TIERS, BONUS_SHARE } from "../../constants/config.js";

const round = (n) => Math.round(n);

/** GMV（美元）→ 奖金档位金额（元）；不到最低档返回 0 */
export const tierAmount = (gmv) => BONUS_TIERS.find((t) => (Number(gmv) || 0) >= t.min)?.amount || 0;

/** 爆单门槛（最低档） */
export const BURST_MIN_GMV = Math.min(...BONUS_TIERS.map((t) => t.min));

/** 档位说明：$1000~$3000 → ¥100 … $10000+ → ¥300 */
export function tierLabels() {
  const asc = [...BONUS_TIERS].sort((a, b) => a.min - b.min);
  return asc.map((t, i) => `$${t.min}${asc[i + 1] ? "~$" + asc[i + 1].min : "+"} → ¥${t.amount}`);
}

/** 从视频链接 / 纯数字里取出视频 ID 和达人名；取不出返回 null */
export function parseVideoLink(text) {
  const s = String(text || "").trim();
  const m = s.match(/@([\w.\-]+)\/video\/(\d{10,})/i);
  if (m) return { videoId: m[2], handle: m[1].toLowerCase() };
  const id = s.match(/(?:\/video\/|^)(\d{15,})/);
  return id ? { videoId: id[1], handle: null } : null;
}

/** 视频链接：库里没存链接时按达人名 + 视频 ID 拼出来 */
export const videoUrl = (v) => v.url || (v.video_id && v.creator_handle ? `https://www.tiktok.com/@${v.creator_handle}/video/${v.video_id}` : "");

/** 待提报：累计 GMV 达到最低档、还没提报过的视频，按 GMV 从高到低 */
export function pendingBursts(videos, submissions) {
  const done = new Set(submissions.map((s) => s.video_id));
  return videos
    .filter((v) => (Number(v.gmv) || 0) >= BURST_MIN_GMV && !done.has(v.video_id))
    .map((v) => ({ ...v, amount: tierAmount(v.gmv) }))
    .sort((a, b) => (Number(b.gmv) || 0) - (Number(a.gmv) || 0));
}

/** 提报一批视频时要写入的行 */
export const submissionRows = (videos, period) => videos.map((v) => ({
  video_id: v.video_id, creator_handle: v.creator_handle, gmv: Number(v.gmv) || 0, amount: tierAmount(v.gmv), period, source: "系统提报",
}));

/** 某月奖金池 */
export function bonusPool(submissions, extras, period) {
  const videoSum = submissions.filter((s) => s.period === period).reduce((n, s) => n + (s.amount || 0), 0);
  const liveSum = extras.filter((e) => e.period === period && e.kind === "直播爆单").reduce((n, e) => n + (e.amount || 0), 0);
  return { videoSum, liveSum, total: videoSum + liveSum };
}

/** 助理份额：固定 base，绩效 ≥ minScore 再加 extra */
export const staffShare = (score) => BONUS_SHARE.base + (score != null && score >= BONUS_SHARE.minScore ? BONUS_SHARE.extra : 0);

/**
 * 奖金分成
 * @param pool    bonusPool() 的 total
 * @param people  [{ id, score }] 参与提报的助理（score = 绩效合计 0~1，算不出为 null）
 * @param extras  当月手填奖金（取「新开发付费达人」按 staff_id 单独结算）
 * @returns { staff: [{ id, share, extraHit, poolAmount, paidCreator, total }], bd: { share, total } }
 */
export function splitBonus(pool, people, extras, period) {
  const paidOf = (id) => extras.filter((e) => e.period === period && e.kind === "新开发付费达人" && e.staff_id === id)
    .reduce((n, e) => n + (e.amount || 0), 0);
  const staff = people.map(({ id, score }) => {
    const share = staffShare(score), poolAmount = round(pool * share), paidCreator = paidOf(id);
    return { id, share, extraHit: share > BONUS_SHARE.base, poolAmount, paidCreator, total: poolAmount + paidCreator };
  });
  const bdShare = Math.max(0, 1 - staff.reduce((n, s) => n + s.share, 0));
  return { staff, bd: { share: bdShare, total: round(pool * bdShare) } };
}

/** 表格文件里所有能认出视频的格子（不管在哪一列） */
export const linksFromSheet = (rows) => rows.flat().filter((c) => parseVideoLink(c));

/**
 * 历史已提报导入：每行一个链接（或视频 ID）
 * @returns { rows: 要写入的行, invalid: 认不出的原文, dup: 已提报过 / 重复的条数 }
 */
export function planHistoryImport(lines, submissions) {
  const seen = new Set(submissions.map((s) => s.video_id));
  const rows = [], invalid = [];
  let dup = 0;
  for (const raw of lines) {
    const t = String(raw ?? "").trim();
    if (!t) continue;
    const p = parseVideoLink(t);
    if (!p) { invalid.push(t); continue; }
    if (seen.has(p.videoId)) { dup++; continue; }
    seen.add(p.videoId);
    rows.push({ video_id: p.videoId, creator_handle: p.handle, gmv: null, amount: null, period: "历史", source: "历史导入" });
  }
  return { rows, invalid, dup };
}

/**
 * 手填奖金表单 → 要写入的行
 * @param f { kind, period, liveDate, gmv, staffId, amount, note }
 * @returns { row } 或 { error }
 */
export function extraRow(f) {
  const note = (f.note || "").trim() || null;
  if (f.kind === "直播爆单") {
    const gmv = Number(f.gmv);
    if (!f.liveDate) return { error: "请填直播日期" };
    if (!(gmv >= BURST_MIN_GMV)) return { error: `单场 GMV 要达到 $${BURST_MIN_GMV} 才有奖金` };
    return { row: { period: f.period, kind: f.kind, staff_id: null, live_date: f.liveDate, gmv, amount: tierAmount(gmv), note } };
  }
  const amount = Math.round(Number(f.amount));
  if (!f.staffId) return { error: "请选择助理" };
  if (!(amount > 0)) return { error: "请填奖金金额" };
  return { row: { period: f.period, kind: "新开发付费达人", staff_id: f.staffId, live_date: null, gmv: null, amount, note } };
}
