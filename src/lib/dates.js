// ─── 日期（纯函数）：全项目唯一的日期来源，一律按洛杉矶时间（America/Los_Angeles）──
// 规则：
//   · 「今天 / 这个月」只能从这里的 todayPST / thisMonthPST 取，不用电脑本地时间
//   · 日期都是 "YYYY-MM-DD" 字符串，月份是 "YYYY-MM"；加减天数、月份都按纯日历推算，
//     与电脑所在时区无关（中国、美国算出来完全一样）
//   · 时间戳（timestamptz）要转成日期时用 pstDay
// 其他文件不要自己 new Date() 做日期计算。

const TZ = "America/Los_Angeles";
const pad = (n) => String(n).padStart(2, "0");

// 日历推算统一用 UTC 零点，避免电脑时区和夏令时干扰
const toUTC = (ymd) => new Date(`${ymd}T00:00:00Z`);
const fromUTC = (d) => d.toISOString().slice(0, 10);

/** 洛杉矶时间的今天 YYYY-MM-DD（now 可传入，便于测试） */
export const todayPST = (now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone: TZ });

/** 洛杉矶时间的本月 YYYY-MM */
export const thisMonthPST = (now = new Date()) => todayPST(now).slice(0, 7);

/** 时间戳（ISO 字符串或 Date）→ 洛杉矶日期 YYYY-MM-DD；空值返回 "" */
export const pstDay = (v) => (v ? new Date(v).toLocaleDateString("sv-SE", { timeZone: TZ }) : "");

/** 日期加减天数 */
export function addDays(ymd, n) {
  const t = toUTC(ymd);
  t.setUTCDate(t.getUTCDate() + n);
  return fromUTC(t);
}

/** 两个日期相差几天（b − a），整数 */
export const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 86400000);

/** 星期几：1=周一 … 7=周日 */
export const weekdayOf = (ymd) => toUTC(ymd).getUTCDay() || 7;

/** 所在周的周一 */
export const mondayOf = (ymd) => addDays(ymd, 1 - weekdayOf(ymd));

/** 日期加减月份（按日历月，日号超过当月天数时取当月最后一天） */
export function addMonthsToDate(ymd, n) {
  const [y, m, d] = ymd.split("-").map(Number);
  const ym = addMonths(`${y}-${pad(m)}`, n);
  return `${ym}-${pad(Math.min(d, lastDayOfMonth(ym)))}`;
}

/** 月份加减：addMonths("2026-01", -1) → "2025-12" */
export function addMonths(ym, n) {
  const [y, m] = ym.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

/** 某月最后一天是几号 */
export function lastDayOfMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 连续月份列表（含两端）：monthsBetween("2025-11", "2026-01") → ["2025-11","2025-12","2026-01"] */
export function monthsBetween(fromYm, toYm) {
  const list = [];
  for (let ym = fromYm; ym <= toYm; ym = addMonths(ym, 1)) list.push(ym);
  return list;
}

/** 视频自然月区间 { from, to } */
export const videoRange = (ym) => ({ from: `${ym}-01`, to: `${ym}-${pad(lastDayOfMonth(ym))}` });

/** 展示用：YYYY-MM-DD → MM/DD */
export const fmtMD = (ymd) => (ymd ? `${ymd.slice(5, 7)}/${ymd.slice(8, 10)}` : "");

/** 展示用：YYYY-MM-DD → M/DD（周视图表头） */
export const fmtMDShort = (ymd) => (ymd ? `${Number(ymd.slice(5, 7))}/${ymd.slice(8, 10)}` : "");
