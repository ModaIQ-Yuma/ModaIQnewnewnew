// modules/review/snapshotUi.js — 保存快照时的确认与结果文案（各子页共用）

/** 视频数据还没导到截止日时，问一下是否仍保存 */
export const confirmIncomplete = (plan, ym) => window.confirm(
  `${ym} 快照的口径是「${ym} 发布的视频，数据截止到 ${plan.cutoff}」。\n` +
  `目前视频数据只导到 ${plan.dataTo || "（还没有导入）"}，现在保存会缺最后几天的数据。\n\n仍要保存吗？`
);

/** 月份列表压缩成区间：2025-01 ~ 2025-04、2025-06 */
export function compressMonths(yms) {
  const idx = (ym) => { const [y, m] = ym.split("-").map(Number); return y * 12 + m; };
  const sorted = [...yms].sort(), out = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && idx(sorted[j + 1]) === idx(sorted[j]) + 1) j++;
    out.push(i === j ? sorted[i] : `${sorted[i]} ~ ${sorted[j]}`);
    i = j;
  }
  return out.join("、");
}

/** saveMonths 的结果 → 提示（每类一行） */
export function describeSave(res) {
  const lines = [];
  if (res.saved.length) lines.push(`✅ 已保存 ${res.saved.length} 个月（${compressMonths(res.saved)}），视频数据截止次月 5 日`);
  const byDataTo = {};
  for (const s of res.skipped) (byDataTo[s.dataTo || "（未导入）"] ||= []).push(s.ym);
  for (const [to, yms] of Object.entries(byDataTo)) lines.push(`⏭ 跳过 ${yms.length} 个月（${compressMonths(yms)}）：视频数据只导到 ${to}，导完后再补存`);
  return lines.join("\n") || "没有保存任何快照";
}
