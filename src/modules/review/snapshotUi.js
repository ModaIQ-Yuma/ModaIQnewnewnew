// modules/review/snapshotUi.js — 保存快照时的确认与结果文案（各子页共用）

/** 视频数据还没导到截止日时，问一下是否仍保存 */
export const confirmIncomplete = (plan, ym) => window.confirm(
  `${ym} 快照的口径是「${ym} 发布的视频，数据截止到 ${plan.cutoff}」。\n` +
  `目前视频数据只导到 ${plan.dataTo || "（还没有导入）"}，现在保存会缺最后几天的数据。\n\n仍要保存吗？`
);

/** saveMonths 的结果 → 一句提示 */
export function describeSave(res) {
  const parts = [];
  if (res.saved.length) parts.push(`✅ 已保存 ${res.saved.join("、")} 快照（视频数据截止次月 5 日）`);
  if (res.skipped.length) parts.push(`⏭ 跳过 ${res.skipped.map((s) => `${s.ym}（数据只到 ${s.dataTo || "无"}）`).join("、")}`);
  return parts.join("；") || "没有保存任何快照";
}
