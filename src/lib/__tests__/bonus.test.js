import { test, expect } from "vitest";
import { tierAmount, parseVideoLink, pendingBursts, submissionRows, bonusPool, splitBonus, planHistoryImport, videoUrl } from "../bonus/bonusCalc.js";
import { videoDetail, monthVideos, burstsOfMonth, buildMonthReport } from "../bonus/monthReport.js";
import { videosOfStaff, perfRows, tierRows } from "../perf/perfCalc.js";

const at = (d) => `${d}T08:00:00+00:00`;   // 导入时按洛杉矶零点存

test("档位：$1000 起 ¥100，$3000 ¥150，$6000 ¥200，$10000 ¥300；不到 $1000 为 0", () => {
  expect(tierAmount(999.99)).toBe(0);
  expect(tierAmount(1000)).toBe(100);
  expect(tierAmount(2999)).toBe(100);
  expect(tierAmount(3000)).toBe(150);
  expect(tierAmount(6222.3)).toBe(200);
  expect(tierAmount(10000)).toBe(300);
});

test("链接识别：视频链接、带参数链接、纯视频 ID；主页链接 / 乱填识别不了", () => {
  expect(parseVideoLink("https://www.tiktok.com/@VPriscillag/video/7672107155071175949")).toEqual({ videoId: "7672107155071175949", handle: "vpriscillag" });
  expect(parseVideoLink(" https://www.tiktok.com/@a.b_c/video/7612039518580952334?is_from_webapp=1 ").videoId).toBe("7612039518580952334");
  expect(parseVideoLink("7612039518580952334")).toEqual({ videoId: "7612039518580952334", handle: null });
  expect(parseVideoLink("https://www.tiktok.com/@someone")).toBeNull();
  expect(parseVideoLink("视频链接")).toBeNull();
});

test("待提报：3/1 及以后发布、GMV ≥ $1000、没提报过的，GMV 从高到低；一条视频只提报一次", () => {
  const p = at("2026-08-01");
  const videos = [
    { video_id: "1", creator_handle: "a", gmv: 1500, published_at: p },
    { video_id: "2", creator_handle: "b", gmv: 6500, published_at: at("2026-03-01") },
    { video_id: "3", creator_handle: "c", gmv: 999, published_at: p },
    { video_id: "4", creator_handle: "d", gmv: 12000, published_at: p },
    { video_id: "5", creator_handle: "e", gmv: 9000, published_at: at("2026-02-28") },
    { video_id: "6", creator_handle: "f", gmv: 9000, published_at: null },
  ];
  const list = pendingBursts(videos, [{ video_id: "4" }]);
  expect(list.map((v) => v.video_id)).toEqual(["2", "1"]);
  expect(list.map((v) => v.amount)).toEqual([200, 100]);
  expect(submissionRows([{ video_id: "2", creator_handle: "b", gmv: 6500 }], "2026-08")[0]).toEqual({ video_id: "2", creator_handle: "b", gmv: 6500, amount: 200, period: "2026-08", source: "系统提报" });
  expect(videoUrl({ video_id: "2", creator_handle: "b" })).toBe("https://www.tiktok.com/@b/video/2");
});

test("奖金池 + 分成：助理固定 10%，绩效 ≥90 再加 10%，BD 拿剩下的；付费达人单独加给助理", () => {
  const subs = [{ period: "2026-08", amount: 4000 }, { period: "2026-08", amount: 500 }, { period: "2026-07", amount: 100 }, { period: "历史", amount: null }];
  const extras = [
    { period: "2026-08", kind: "直播爆单", amount: 250 },
    { period: "2026-08", kind: "新开发付费达人", staff_id: "S1", amount: 80 },
    { period: "2026-07", kind: "直播爆单", amount: 300 },
  ];
  const pool = bonusPool(subs, extras, "2026-08");
  expect(pool).toEqual({ videoSum: 4500, liveSum: 250, total: 4750 });

  const both10 = splitBonus(4750, [{ id: "S1", score: 0.85 }, { id: "S2", score: 0.79 }], extras, "2026-08");
  expect(both10.staff.map((s) => s.poolAmount)).toEqual([475, 475]);
  expect(both10.staff[0].total).toBe(555);            // 475 + 付费达人 80
  expect(both10.bd).toEqual({ share: 0.8, total: 3800 });

  const bothFull = splitBonus(4750, [{ id: "S1", score: 0.9 }, { id: "S2", score: 0.95 }], [], "2026-08");
  expect(bothFull.staff.every((s) => s.extraHit)).toBe(true);
  expect(bothFull.bd.share).toBeCloseTo(0.6);

  const oneFull = splitBonus(1000, [{ id: "S1", score: 0.9 }, { id: "S2", score: null }], [], "2026-08");
  expect(oneFull.bd.share).toBeCloseTo(0.7);
  expect(oneFull.staff.map((s) => s.poolAmount)).toEqual([200, 100]);
});

test("历史导入：认链接和 ID，跳过空行、重复、已提报的，认不出的列出来", () => {
  const plan = planHistoryImport([
    "https://www.tiktok.com/@a/video/7600000000000000001", "", "https://www.tiktok.com/@a/video/7600000000000000001",
    "7600000000000000002", "7600000000000000003", "abc",
  ], [{ video_id: "7600000000000000003" }]);
  expect(plan.rows.map((r) => r.video_id)).toEqual(["7600000000000000001", "7600000000000000002"]);
  expect(plan.rows[0]).toMatchObject({ creator_handle: "a", period: "历史", source: "历史导入" });
  expect(plan.dup).toBe(2);
  expect(plan.invalid).toEqual(["abc"]);
});

test("视频明细：只取当月发布，按日期从早到晚、同天销售额从高到低；总览数对", () => {
  const vids = [
    { id: "v1", published_at: at("2026-08-02"), gmv: 10, orders: 1 },
    { id: "v2", published_at: at("2026-08-01"), gmv: 0, orders: 0 },
    { id: "v3", published_at: at("2026-08-01"), gmv: 50, orders: 3 },
    { id: "v4", published_at: at("2026-09-01"), gmv: 99, orders: 9 },
    { id: "v5", published_at: null, gmv: 5, orders: 1 },
  ];
  const d = videoDetail(monthVideos(vids, "2026-08"));
  expect(d.rows.map((v) => v.id)).toEqual(["v3", "v2", "v1"]);
  expect([d.total, d.sale]).toEqual([3, 2]);
  expect(d.rate).toBeCloseTo(2 / 3);
});

test("助理的视频 = 她合作过的达人发的所有视频（与绩效同一口径），两人都合作过的达人两边都算", () => {
  const collabs = [
    { id: "c1", creator_id: "A", staff_id: "S1" }, { id: "c2", creator_id: "B", staff_id: "S2" },
    { id: "c3", creator_id: "A", staff_id: "S2" },
  ];
  const videos = [{ id: "v1", collaboration_id: "c1" }, { id: "v2", collaboration_id: "c2", orders: 0 },
    { id: "v3", collaboration_id: null, orders: 0 }, { id: "v4", collaboration_id: null, orders: 2 }];
  expect(videosOfStaff(collabs, videos, "S1").map((v) => v.id)).toEqual(["v1"]);
  expect(videosOfStaff(collabs, videos, "S2").map((v) => v.id)).toEqual(["v1", "v2"]);
  // 全店：CRM 全算（含 0 单），非 CRM 只算出过单的
  expect(videosOfStaff(collabs, videos, null).map((v) => v.id)).toEqual(["v1", "v2", "v4"]);
});

test("绩效合计 + 考核指标文字", () => {
  const { rows, total } = perfRows({ a: 0.704, b: 0.255, c: 0.329, d: 1.7, e: 0.091 });
  expect(rows.map((r) => r.score)).toEqual([0.6, 0.9, 1, 1, 1]);
  expect(total).toBeCloseTo(0.875);
  expect(perfRows({ a: null, b: 1, c: 1, d: 1, e: 0 }).total).toBeNull();
  expect(tierRows("a").map((r) => r.text)).toEqual(["a≥90%", "85%≤a<90%", "80%≤a<85%", "70%≤a<80%", "a<70%"]);
  expect(tierRows("e")).toEqual([{ text: "e<10%", score: 1 }, { text: "10%≤e<12%", score: 0.9 }, { text: "12%≤e<15%", score: 0.6 }, { text: "e≥15%", score: 0.3 }]);
});

test("月度汇总：爆单清单带视频信息；不在库里的视频用提报记录拼链接；奖金按助理绩效分", () => {
  const videos = [{ id: "v1", video_id: "7001", creator_handle: "amy", published_at: at("2026-08-03"), gmv: 3200, orders: 90, collaboration_id: null }];
  const subs = [{ id: "s1", video_id: "7001", creator_handle: "amy", gmv: 3200, amount: 150, period: "2026-08" },
    { id: "s2", video_id: "7002", creator_handle: "bo", gmv: 1000, amount: 100, period: "2026-08" }];
  const b = burstsOfMonth(subs, videos, "2026-08");
  expect(b.map((x) => [x.published, x.orders, x.url])).toEqual([
    ["2026-08-03", 90, "https://www.tiktok.com/@amy/video/7001"], ["", null, "https://www.tiktok.com/@bo/video/7002"]]);

  const r = buildMonthReport({ ym: "2026-08", collabs: [], videos, asOf: videos, shippingGoals: [], products: [],
    people: [{ id: "S1", name: "朱思怡" }], submissions: subs, extras: [] });
  expect(r.cycleStart).toBe("2026-07-15");
  expect(r.pool.total).toBe(250);
  expect(r.staff[0].bonus.poolAmount).toBe(25);       // 绩效算不出 → 只拿固定 10%
  expect(r.bd.total).toBe(225);
  expect(r.store.detail.total).toBe(1);
});

test("手填奖金：直播按档位算钱，付费达人要选助理填金额", async () => {
  const { extraRow } = await import("../bonus/bonusCalc.js");
  expect(extraRow({ kind: "直播爆单", period: "2026-08", liveDate: "2026-08-20", gmv: "3500", note: " 场次1 " }).row)
    .toEqual({ period: "2026-08", kind: "直播爆单", staff_id: null, live_date: "2026-08-20", gmv: 3500, amount: 150, note: "场次1" });
  expect(extraRow({ kind: "直播爆单", period: "2026-08", liveDate: "2026-08-20", gmv: "800" }).error).toMatch("1000");
  expect(extraRow({ kind: "直播爆单", period: "2026-08", gmv: "5000" }).error).toMatch("日期");
  expect(extraRow({ kind: "新开发付费达人", period: "2026-08", staffId: "", amount: "50" }).error).toMatch("助理");
  expect(extraRow({ kind: "新开发付费达人", period: "2026-08", staffId: "S1", amount: "200" }).row).toMatchObject({ staff_id: "S1", amount: 200 });
});

test("全店老品转化率：加上老品出过单的非 CRM 达人（分子分母都加），0 单的不算，已寄样的达人不重复算；助理不受影响", async () => {
  const { calcPerfMetrics } = await import("../perf/perfCalc.js");
  const products = [{ id: "OLD", is_new: false }, { id: "NEW", is_new: true }];
  const collabs = [
    { id: "c1", creator_id: "A", staff_id: "S1", product_id: "OLD", ship_date: "2026-07-20" },
    { id: "c2", creator_id: "B", staff_id: "S1", product_id: "OLD", ship_date: "2026-07-20" },
  ];
  const creators = [{ id: "A", handle: "amy" }, { id: "B", handle: "bo" }];
  const v = (id, extra) => ({ id, published_at: at("2026-08-10"), orders: 0, ...extra });
  const videos = [
    v("v1", { collaboration_id: "c1", orders: 3, product_id: "OLD" }),                  // A 出单
    v("v2", { collaboration_id: null, creator_handle: "x1", product_id: "OLD", orders: 5 }), // 非CRM 老品出单 → 算
    v("v3", { collaboration_id: null, creator_handle: "x1", product_id: "OLD", orders: 1 }), // 同一人不重复
    v("v4", { collaboration_id: null, creator_handle: "x2", product_id: "OLD", orders: 0 }), // 0 单 → 不算
    v("v5", { collaboration_id: null, creator_handle: "x3", product_id: "NEW", orders: 9 }), // 新品 → 不算进 b
    v("v6", { collaboration_id: null, creator_handle: "bo", product_id: "OLD", orders: 2 }), // 已寄样的 B → 不重复
  ];
  const store = calcPerfMetrics({ collabs, videos, shippingGoals: [], products, cycleStart: "2026-07-15", staffId: null, creators });
  expect([store.oldWithSalesTotal, store.oldInfluencerTotal]).toEqual([2, 3]);
  expect(store.b).toBeCloseTo(2 / 3);
  expect(store.actualVideos).toBe(5);                    // v4（非CRM 0 单）不算
  const s1 = calcPerfMetrics({ collabs, videos, shippingGoals: [], products, cycleStart: "2026-07-15", staffId: "S1", creators });
  expect([s1.oldWithSalesTotal, s1.oldInfluencerTotal]).toEqual([1, 2]);
});

test("不提报：从待提报消失、不进任何月份的奖金池和已提报清单；删掉那行即恢复", async () => {
  const { skipRows, SKIP } = await import("../bonus/bonusCalc.js");
  const v1 = { id: "v1", video_id: "9001", creator_handle: "luna", gmv: 17582.86, orders: 1059, published_at: at("2026-03-06") };
  const rows = skipRows([v1]).map((r) => ({ ...r, id: "k1" }));
  expect(rows[0]).toMatchObject({ video_id: "9001", amount: 0, period: SKIP, source: SKIP });
  expect(pendingBursts([v1], rows)).toHaveLength(0);
  expect(bonusPool(rows, [], "2026-03").total).toBe(0);
  expect(burstsOfMonth(rows, [v1], "2026-03")).toHaveLength(0);
  expect(burstsOfMonth(rows, [v1], SKIP).map((x) => [x.creator_handle, x.orders])).toEqual([["luna", 1059]]);
  expect(pendingBursts([v1], [])).toHaveLength(1);       // 恢复 = 删掉那行
});
