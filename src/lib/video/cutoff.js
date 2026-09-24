// ─── 视频数据「截止到某天」的还原（纯函数）─────────────────────────────────
// 每次导入的增量都记在 video_import_lines 里；批次的数据区间从文件名识别
// （如「20260806到20260905所有视频.xlsx」）。只累加区间结束日 ≤ 截止日的批次，
// 就能还原出「截止那天」每条视频的数据，而不受之后导入的影响。

const D = "(\\d{4})-?(\\d{2})-?(\\d{2})";
const WINDOW_RE = new RegExp(`${D}\\D{1,3}${D}`);

/** 文件名 → { from, to }（YYYY-MM-DD）；识别不了返回 null */
export function parseWindow(fileName) {
  const m = String(fileName || "").match(WINDOW_RE);
  if (!m) return null;
  const from = `${m[1]}-${m[2]}-${m[3]}`, to = `${m[4]}-${m[5]}-${m[6]}`;
  return from <= to ? { from, to } : null;
}

/** M 月快照的截止日：M+1 月 day 号 */
export function cutoffOf(ym, day) {
  const [y, m] = ym.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * @param videos  核心数据里的视频（取发布日期、归属等字段）
 * @param ledger  { batches:[{ id, file_name }], lines:[{ video_record_id, batch_id, delta_* }] }
 * @returns { videos: 截止日时的视频（只含当时已有数据的）, dataTo: 已导入的最晚数据日, unknown: 文件名识别不了的批次名 }
 */
export function videosAsOf(videos, ledger, cutoff) {
  const ok = new Set(), unknown = [];
  let dataTo = "";
  for (const b of ledger.batches) {
    const w = parseWindow(b.file_name);
    if (!w) { unknown.push(b.file_name || b.id); continue; }
    if (w.to > dataTo) dataTo = w.to;
    if (w.to <= cutoff) ok.add(b.id);
  }
  const sum = new Map();
  for (const l of ledger.lines) {
    if (!ok.has(l.batch_id)) continue;
    const s = sum.get(l.video_record_id) || { gmv: 0, orders: 0, clicks: 0, vv: 0 };
    s.gmv += Number(l.delta_gmv) || 0; s.orders += l.delta_orders || 0; s.clicks += l.delta_clicks || 0; s.vv += l.delta_vv || 0;
    sum.set(l.video_record_id, s);
  }
  return { videos: videos.filter((v) => sum.has(v.id)).map((v) => ({ ...v, ...sum.get(v.id) })), dataTo, unknown };
}
