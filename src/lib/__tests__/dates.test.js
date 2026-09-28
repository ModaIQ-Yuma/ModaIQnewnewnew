import { test, expect, afterEach } from "vitest";
import { todayPST, thisMonthPST, pstDay, addDays, daysBetween, weekdayOf, mondayOf,
  addMonths, addMonthsToDate, lastDayOfMonth, monthsBetween, videoRange, fmtMD, fmtMDShort } from "../dates.js";
import { cycleStartOf, cycleEndOf, prevCycleStart, nextCycleStart, cycleDaysLeft, cycleTimePct,
  shipRange, halfKeyOf, halfKeyToCycleStart, halfMonthColumns } from "../cycle.js";
import { calcPerfMetrics } from "../perf/perfCalc.js";
import { buildImportPlan } from "../crm/importPlan.js";

// 在不同电脑时区下各跑一遍：结果必须完全一样（这就是本次修的 bug）
const ORIGINAL_TZ = process.env.TZ;
const ZONES = ["America/Los_Angeles", "Asia/Shanghai", "UTC", "Pacific/Auckland"];
afterEach(() => { process.env.TZ = ORIGINAL_TZ; });
const eachZone = (fn) => ZONES.forEach((tz) => { process.env.TZ = tz; fn(tz); });

test("今天/本月：按洛杉矶时间，与电脑时区无关", () => {
  // 洛杉矶 9/14 晚上 8 点 = 中国 9/15 上午 11 点；账期仍应是 8/15 开始的那个
  const now = new Date("2026-09-15T03:00:00Z");
  eachZone(() => {
    expect(todayPST(now)).toBe("2026-09-14");
    expect(thisMonthPST(new Date("2026-10-01T05:00:00Z"))).toBe("2026-09");   // 洛杉矶还是 9/30
    expect(cycleStartOf(todayPST(now))).toBe("2026-08-15");
  });
  expect(pstDay("2026-09-15T03:00:00Z")).toBe("2026-09-14");
  expect(pstDay(null)).toBe("");
});

test("日期加减：跨月、跨年、闰年、夏令时切换日都正确", () => {
  eachZone(() => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");           // 美国夏令时开始日
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");           // 美国夏令时结束日
    expect(daysBetween("2026-09-01", "2026-09-15")).toBe(14);
    expect(daysBetween("2026-03-01", "2026-03-15")).toBe(14);      // 跨夏令时不差一天
    expect(weekdayOf("2026-09-28")).toBe(1);                        // 周一
    expect(weekdayOf("2026-10-04")).toBe(7);                        // 周日
    expect(mondayOf("2026-10-04")).toBe("2026-09-28");
    expect(mondayOf("2026-09-28")).toBe("2026-09-28");
  });
});

test("月份：加减、月末、连续月份（跨年不再出现 13 月）", () => {
  expect(addMonths("2026-01", -1)).toBe("2025-12");
  expect(addMonths("2025-11", 3)).toBe("2026-02");
  expect(addMonths("2026-09", -12)).toBe("2025-09");
  expect(addMonthsToDate("2026-05-31", -3)).toBe("2026-02-28");     // 日号超出取月末
  expect(lastDayOfMonth("2028-02")).toBe(29);
  expect(monthsBetween("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  expect(monthsBetween("2026-05", "2026-04")).toEqual([]);
  expect(videoRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  expect(fmtMD("2026-09-05")).toBe("09/05");
  expect(fmtMDShort("2026-09-05")).toBe("9/05");
});

test("账期：15 日 ~ 次月 14 日；半月列与账期对应", () => {
  eachZone(() => {
    expect(cycleStartOf("2026-10-14")).toBe("2026-09-15");
    expect(cycleStartOf("2026-10-15")).toBe("2026-10-15");
    expect(cycleStartOf("2026-01-03")).toBe("2025-12-15");
    expect(cycleEndOf("2026-09-15")).toBe("2026-10-14");
    expect(cycleEndOf("2025-12-15")).toBe("2026-01-14");
    expect(prevCycleStart("2026-01-15")).toBe("2025-12-15");
    expect(nextCycleStart("2025-12-15")).toBe("2026-01-15");
    expect(shipRange("2026-01")).toEqual({ from: "2025-12-15", to: "2026-01-14" });
  });
  expect(cycleDaysLeft("2026-10-14", "2026-10-01")).toBe(13);
  expect(cycleDaysLeft("2026-10-14", "2026-10-20")).toBe(0);
  expect(cycleTimePct("2026-09-15", "2026-10-14", "2026-09-15")).toBe(0);
  expect(cycleTimePct("2026-09-15", "2026-10-14", "2026-11-01")).toBe(1);
  expect(halfKeyOf("2026-09-14")).toBe("2026-09-H1");
  expect(halfKeyOf("2026-09-15")).toBe("2026-09-H2");
  expect(halfKeyToCycleStart("2026-01-H1")).toBe("2025-12-15");
  expect(halfKeyToCycleStart("2026-01-H2")).toBe("2026-01-15");
  expect(halfMonthColumns("2026-11", 3).map((c) => c.key))
    .toEqual(["2026-11-H1", "2026-11-H2", "2026-12-H1", "2026-12-H2", "2027-01-H1", "2027-01-H2"]);
});

test("绩效：中国时区电脑也算到账期最后一天（14 号）的寄样", () => {
  const collabs = [
    { id: "a", staff_id: "S", creator_id: "k1", product_id: "P", ship_date: "2026-09-15", attrs: {} },
    { id: "b", staff_id: "S", creator_id: "k2", product_id: "P", ship_date: "2026-10-14", attrs: { official_grade: "Lv1" } },
    { id: "c", staff_id: "S", creator_id: "k3", product_id: "P", ship_date: "2026-10-15", attrs: {} },   // 下个账期
  ];
  const p = { collabs, videos: [], shippingGoals: [], products: [{ id: "P", is_new: true }], cycleStart: "2026-09-15", staffId: "S" };
  eachZone(() => {
    const r = calcPerfMetrics(p);
    expect(r.cEnd).toBe("2026-10-14");
    expect([r.vFrom, r.vTo]).toEqual(["2026-10-01", "2026-10-31"]);
    expect(r.shipTotal).toBe(2);
    expect(r.lv1Count).toBe(1);
  });
});

test("CRM 导入：产品名不分大小写、忽略首尾空格", () => {
  const rows = [
    { line: 2, handle: "amy", product: "2k01", shipDate: "2025-06-11", staff: null, status: "已寄样", note: null, aliases: [], attrs: {}, unknown: [] },
    { line: 3, handle: "bella", product: " 2A15 ", shipDate: "2026-09-22", staff: null, status: "已寄样", note: null, aliases: [], attrs: {}, unknown: [] },
    { line: 4, handle: "cara", product: "卫裤", shipDate: "2024-12-09", staff: null, status: "已寄样", note: null, aliases: [], attrs: {}, unknown: [] },
  ];
  const existing = { nameIndex: new Map(), collabKeys: new Set(), handleOf: () => "" };
  const plan = buildImportPlan({ rows, decisions: {}, pairs: [], existing, productIdByName: { "2K01": "p1", "2A15": "p2" } });
  expect(plan.shipments.map((s) => s.product_id)).toEqual(["p1", "p2"]);
  expect(plan.skipped).toHaveLength(1);
  expect(plan.skipped[0].reason).toContain("不在产品库");
});
