// ─── 邀约建议发送时段（纯函数）：美东时段 → 换算成中国时间，并判断现在处于哪个阶段 ──
import { dateIn, clockIn, tzAbbr, wallTimeToInstant, addDays, daysBetween } from "../dates.js";
import { SEND_WINDOW } from "../../constants/config.js";

const LA = "America/Los_Angeles", ET = "America/New_York", CN = "Asia/Shanghai";
const DAY_LABEL = ["今天", "明天", "后天"];

/**
 * @param now 当前时刻（Date）
 * @returns {
 *   now:    { pt, et, cn }                 各时区现在几点
 *   window: { pt:[起,止], et:[起,止], cn:[起,止] }  发送窗口在各时区的时间
 *   abbr:   { pt, et }                      PDT/PST、EDT/EST
 *   cnStart, cnDay, state: "before"|"during"|"next", minutesLeft
 * }
 *   before = 今天的时段还没到；during = 正在时段内；next = 今天的已过，显示下一次
 */
export function sendWindowStatus(now, win = SEND_WINDOW) {
  const etToday = dateIn(win.tz, now);
  let start = wallTimeToInstant(etToday, win.start, win.tz), end = wallTimeToInstant(etToday, win.end, win.tz);
  let state = now < start ? "before" : now < end ? "during" : "next";
  if (state === "next") {
    const d = addDays(etToday, 1);
    start = wallTimeToInstant(d, win.start, win.tz); end = wallTimeToInstant(d, win.end, win.tz);
  }
  const offset = daysBetween(dateIn(CN, now), dateIn(CN, start));
  const span = (tz) => [clockIn(tz, start), clockIn(tz, end)];
  return {
    now: { pt: clockIn(LA, now), et: clockIn(ET, now), cn: clockIn(CN, now) },
    window: { pt: span(LA), et: span(ET), cn: span(CN) },
    abbr: { pt: tzAbbr(LA, now), et: tzAbbr(ET, now) },
    cnStart: clockIn(CN, start),
    cnDay: DAY_LABEL[offset] ?? `${offset} 天后`,
    state,
    minutesLeft: state === "during" ? Math.ceil((end - now) / 60000) : Math.ceil((start - now) / 60000),
  };
}

/** "05:00" → "5 点"；不是整点则保留分钟，如 "5:30" */
export const hourLabel = (hhmm) => (hhmm.endsWith(":00") ? `${Number(hhmm.slice(0, 2))} 点` : hhmm.replace(/^0/, ""));

/** 剩余分钟 → 「X 小时 Y 分」 */
export function fmtDuration(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} 小时${m ? ` ${m} 分` : ""}` : `${m} 分钟`;
}
