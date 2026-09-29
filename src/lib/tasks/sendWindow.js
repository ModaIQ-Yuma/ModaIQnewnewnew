// ─── 邀约建议发送时段（纯函数）：美东时段 → 换算成中国时间，并判断现在处于哪个阶段 ──
import { dateIn, clockIn, wallTimeToInstant, addDays, daysBetween } from "../dates.js";
import { SEND_WINDOW } from "../../constants/config.js";

const LA = "America/Los_Angeles", ET = "America/New_York", CN = "Asia/Shanghai";
const DAY_LABEL = ["今天", "明天", "后天"];

/**
 * @param now 当前时刻（Date）
 * @returns { la, et, cnStart, cnEnd, cnDay, state: "before"|"during"|"next", minutesLeft }
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
  return {
    la: clockIn(LA, now), et: clockIn(ET, now),
    cnStart: clockIn(CN, start), cnEnd: clockIn(CN, end),
    cnDay: DAY_LABEL[offset] ?? `${offset} 天后`,
    state,
    minutesLeft: state === "during" ? Math.ceil((end - now) / 60000) : Math.ceil((start - now) / 60000),
  };
}

/** "05:00" → "5 点"；不是整点则保留分钟，如 "5:30" */
export const hourLabel = (hhmm) => (hhmm.endsWith(":00") ? `${Number(hhmm.slice(0, 2))} 点` : hhmm.replace(/^0/, ""));
