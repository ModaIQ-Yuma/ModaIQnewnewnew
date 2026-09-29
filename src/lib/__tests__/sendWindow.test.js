import { test, expect, afterEach } from "vitest";
import { sendWindowStatus, hourLabel } from "../tasks/sendWindow.js";
import { SEND_WINDOW } from "../../constants/config.js";
import { wallTimeToInstant, clockIn, dateIn } from "../dates.js";

const ORIGINAL_TZ = process.env.TZ;
afterEach(() => { process.env.TZ = ORIGINAL_TZ; });
const eachZone = (fn) => ["America/Los_Angeles", "Asia/Shanghai", "UTC", "Pacific/Auckland"].forEach((tz) => { process.env.TZ = tz; fn(); });
const ET_MORNING = { tz: "America/New_York", start: 9, end: 11 };            // 逻辑测试用固定时段，不依赖配置
const at = (iso) => sendWindowStatus(new Date(iso), ET_MORNING);

test("时区换算：美东某天 9 点 → 时刻，夏令时切换当天也对", () => {
  eachZone(() => {
    expect(wallTimeToInstant("2026-09-29", 9, "America/New_York").toISOString()).toBe("2026-09-29T13:00:00.000Z");  // 夏令时 UTC-4
    expect(wallTimeToInstant("2026-11-01", 9, "America/New_York").toISOString()).toBe("2026-11-01T14:00:00.000Z");  // 当天凌晨切回 UTC-5
    expect(wallTimeToInstant("2026-03-08", 9, "America/New_York").toISOString()).toBe("2026-03-08T13:00:00.000Z");  // 当天凌晨切到 UTC-4
    expect(clockIn("Asia/Shanghai", new Date("2026-09-29T13:00:00Z"))).toBe("21:00");
    expect(dateIn("America/Los_Angeles", new Date("2026-09-29T03:00:00Z"))).toBe("2026-09-28");
  });
});

test("夏令时期间：美东 9–11 点 = 中国 21:00–23:00；三种状态", () => {
  eachZone(() => {
    expect(at("2026-09-29T14:32:00Z")).toEqual({ la: "07:32", et: "10:32", cnStart: "21:00", cnEnd: "23:00", cnDay: "今天", state: "during", minutesLeft: 28 });
    expect(at("2026-09-29T12:00:00Z")).toMatchObject({ la: "05:00", et: "08:00", cnDay: "今天", state: "before", minutesLeft: 60 });
    // 美东中午，今天的已过 → 显示下一次（中国这时已是 9/30 凌晨，所以是「今天」21:00）
    expect(at("2026-09-29T16:00:00Z")).toMatchObject({ cnStart: "21:00", cnDay: "今天", state: "next", minutesLeft: 1260 });
    // 洛杉矶晚上 8 点（中国次日上午 11 点）
    expect(at("2026-09-29T03:00:00Z")).toMatchObject({ la: "20:00", et: "23:00", cnStart: "21:00", cnDay: "今天", state: "next", minutesLeft: 600 });
  });
});

test("冬令时：美东 9–11 点 = 中国 22:00–00:00，自动推后 1 小时", () => {
  eachZone(() => {
    expect(at("2026-11-02T12:00:00Z")).toMatchObject({ et: "07:00", cnStart: "22:00", cnEnd: "00:00", cnDay: "今天", state: "before", minutesLeft: 120 });
  });
});

test("北京时间文案：整点显示「X 点」，非整点保留分钟", () => {
  expect([hourLabel("05:00"), hourLabel("06:00"), hourLabel("21:00"), hourLabel("05:30")]).toEqual(["5 点", "6 点", "21 点", "5:30"]);
});

test("默认配置：美东 17–21 点 = 北京 5–9 点（夏令时）/ 6–10 点（冬令时）", () => {
  expect(SEND_WINDOW).toEqual({ tz: "America/New_York", start: 17, end: 21 });
  eachZone(() => {
    // 北京 9/29 22:00（美东 10:00）→ 下一次是北京「明天」05:00
    expect(sendWindowStatus(new Date("2026-09-29T14:00:00Z"))).toMatchObject({ cnStart: "05:00", cnEnd: "09:00", cnDay: "明天", state: "before", minutesLeft: 420 });
    // 北京 9/30 06:00（美东 9/29 18:00）→ 正在时段内，还剩 3 小时
    expect(sendWindowStatus(new Date("2026-09-29T22:00:00Z"))).toMatchObject({ cnStart: "05:00", cnDay: "今天", state: "during", minutesLeft: 180 });
    // 美国冬令时：北京 6–10 点
    expect(sendWindowStatus(new Date("2026-11-02T14:00:00Z"))).toMatchObject({ cnStart: "06:00", cnEnd: "10:00", cnDay: "明天", state: "before" });
  });
});
