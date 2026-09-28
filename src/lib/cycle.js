// ─── 账期与半月（纯函数）：寄样账期 = 每月 15 日 ~ 次月 14 日，全部按洛杉矶日期 ──
// 绩效、周期目标、甘特图、复盘寄样区间都从这里取，不各自推算。
import { addMonths, daysBetween } from "./dates.js";

/** 某天所在账期的开始日（15 号） */
export function cycleStartOf(ymd) {
  const ym = ymd.slice(0, 7);
  return Number(ymd.slice(8, 10)) >= 15 ? `${ym}-15` : `${addMonths(ym, -1)}-15`;
}

/** 账期结束日（开始日的次月 14 号） */
export const cycleEndOf = (start) => `${addMonths(start.slice(0, 7), 1)}-14`;

export const prevCycleStart = (start) => `${addMonths(start.slice(0, 7), -1)}-15`;
export const nextCycleStart = (start) => `${addMonths(start.slice(0, 7), 1)}-15`;

/** 账期剩余天数（today 到结束日，不小于 0） */
export const cycleDaysLeft = (end, today) => Math.max(0, daysBetween(today, end));

/** 账期时间进度 0~1 */
export function cycleTimePct(start, end, today) {
  const total = daysBetween(start, end);
  return total > 0 ? Math.min(1, Math.max(0, daysBetween(start, today) / total)) : 0;
}

/** 选「YYYY-MM」→ 该月结束的寄样账期（上月 15 日 ~ 本月 14 日） */
export const shipRange = (ym) => ({ from: `${addMonths(ym, -1)}-15`, to: `${ym}-14` });

// ── 半月列（甘特图）：'2026-07-H1' = 1~14 号，'2026-07-H2' = 15 号~月底 ──

/** 某天所在的半月 key */
export const halfKeyOf = (ymd) => `${ymd.slice(0, 7)}-${Number(ymd.slice(8, 10)) < 15 ? "H1" : "H2"}`;

/** 半月 key → 所属账期开始日（H2 = 本月 15 号；H1 = 上月 15 号） */
export function halfKeyToCycleStart(key) {
  const ym = key.slice(0, 7);
  return key.endsWith("H2") ? `${ym}-15` : `${addMonths(ym, -1)}-15`;
}

/** 从 viewStart（YYYY-MM）起生成 monthCount 个月 × 2 的半月列 */
export function halfMonthColumns(viewStart, monthCount = 3) {
  const cols = [];
  for (let i = 0; i < monthCount; i++) {
    const ym = addMonths(viewStart, i), month = Number(ym.slice(5, 7));
    cols.push({ key: `${ym}-H1`, ym, half: "H1", label: `${month}月上` });
    cols.push({ key: `${ym}-H2`, ym, half: "H2", label: `${month}月下` });
  }
  return cols;
}
