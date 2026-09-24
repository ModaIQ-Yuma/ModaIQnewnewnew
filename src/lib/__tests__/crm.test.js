import { test, expect } from "vitest";
import { buildNameIndex, checkIdentity, normName } from "../crm/identity.js";
import { normalizeAttrs, attrsToRow, rowToAttrs } from "../crm/attrs.js";
import { buildShipmentPayload } from "../crm/shipmentPayload.js";
import { pickCollab, assignByProduct } from "../video/assignVideos.js";
import { checkPoolEntry } from "../invitePool/poolChecks.js";

const creators = [{ id: "A", handle: "amy" }, { id: "B", handle: "bella" }];
const aliases = [{ creator_id: "A", alias: "amy_old" }];
const idx = buildNameIndex(creators, aliases);
const H = (id) => creators.find((c) => c.id === id)?.handle;

test("normName", () => { expect(normName(" @原名Amy ")).toBe("amy"); });
test("identity: 新录入命中别名 → 记到本人", () => {
  const r = checkIdentity({ handle: "AMY_OLD", aliases: [] }, idx, H);
  expect(r.creatorId).toBe("A"); expect(r.errors).toEqual([]);
});
test("identity: 改名 / 改成自己的别名 / 撞别人现名 / 撞别人别名", () => {
  expect(checkIdentity({ creatorId: "A", oldHandle: "amy", handle: "amy2" }, idx, H).rename).toBe(true);
  expect(checkIdentity({ creatorId: "A", oldHandle: "amy", handle: "amy_old" }, idx, H).rename).toBe(true);
  expect(checkIdentity({ creatorId: "A", oldHandle: "amy", handle: "bella" }, idx, H).mergeWith).toEqual(["B"]);
  expect(checkIdentity({ creatorId: "B", oldHandle: "bella", handle: "amy_old" }, idx, H).errors.length).toBe(1);
  expect(checkIdentity({ creatorId: "B", oldHandle: "bella", handle: "bella", aliases: ["amy_old"] }, idx, H).errors.length).toBe(1);
  expect(checkIdentity({ creatorId: "B", oldHandle: "bella", handle: "bella", aliases: ["amy"] }, idx, H).mergeWith).toEqual(["A"]);
});
test("attrs: 显示文字/旧写法/等级文字 → 选项值；往返不丢", () => {
  const { attrs, unknown } = normalizeAttrs({ official_grade: "Lv3 · GMV 25–60K", body_type: "正常 Average", video_quality: "高清构图好", voiceover: "不口播", style: "feminine、__未标注__" });
  expect([attrs.official_grade, attrs.body_type, attrs.video_quality, attrs.voiceover]).toEqual(["Lv3", "正常", "高清", "无口播"]);
  expect(attrs.style).toEqual(["feminine"]); expect(unknown).toEqual([]);
  expect(rowToAttrs(attrsToRow(attrs))).toEqual(attrs);
});
test("payload: 编辑改名 + 删别名 + 改达人备注", () => {
  const chk = checkIdentity({ creatorId: "A", oldHandle: "amy", handle: "amy2", aliases: [] }, idx, H);
  const p = buildShipmentPayload({ form: { influencerId: "amy2", aliases: [], creatorNote: "新备注", shipDate: "2026-09-01", staffId: "s1", baseStatus: "已寄样" },
    initial: { id: "C1", creatorSource: "manual" }, chk, existing: { id: "A", handle: "amy", note: "" }, oldAliases: ["amy_old"], productId: "P" });
  expect(p.creator).toMatchObject({ id: "A", rename: true, handle: "amy2", oldHandle: "amy", noteChanged: true, aliasesRemove: ["amy_old"], aliasesAdd: [] });
  expect(p.names.sort()).toEqual(["amy", "amy2", "amy_old"]); expect(p.isNew).toBe(false);
});
test("视频归属：只挂同商品，复投挂发布前最近一次", () => {
  const cs = [{ collabId: "c1", productId: "P", shipDate: "2026-01-01" }, { collabId: "c2", productId: "P", shipDate: "2026-05-01" }, { collabId: "c3", productId: "Q", shipDate: "2026-06-01" }];
  expect(pickCollab(cs, "P", "2026-03-01T00:00:00Z")).toBe("c1");
  expect(pickCollab(cs, "P", "2026-07-01T00:00:00Z")).toBe("c2");
  expect(pickCollab(cs, "Z", "2026-07-01")).toBe(null);
  const r = assignByProduct([{ id: "v1", product_id: "Q" }, { id: "v2", product_id: "Z" }], cs);
  expect(r.byCollab.get("c3")).toEqual(["v1"]); expect(r.unmatched).toEqual(["v2"]);
});
test("邀约库查重：别名也算同一人；复投多条不报错", () => {
  const core = { creators, aliases, invites: [{ creator_id: "amy_old", product_id: "P" }],
    collabs: [{ creator_id: "B", product_id: "P", ship_date: "2026-01-01", staff_id: "s" }, { creator_id: "B", product_id: "P", ship_date: "2026-03-01", staff_id: "s" }] };
  const base = { productId: "P", productName: "2208", core, nameIndex: idx, staffName: () => "朱思怡" };
  expect(checkPoolEntry({ ...base, handle: "amy" })).toMatch("已在邀约库");
  expect(checkPoolEntry({ ...base, handle: "BELLA" })).toMatch("2026-03-01");
  expect(checkPoolEntry({ ...base, handle: "newone" })).toBe(null);
});

import { searchCreators } from "../crm/identity.js";
test("联想：现名/别名模糊匹配，排序 完全 > 开头 > 包含", () => {
  const cs = [{ id: "1", handle: "sophiek.stuff" }, { id: "2", handle: "mysoph" }, { id: "3", handle: "sop" }];
  const as = [{ creator_id: "1", alias: "sophiek.kelly2" }, { creator_id: "2", alias: "zz" }];
  expect(searchCreators(cs, as, "s").length).toBe(0);
  expect(searchCreators(cs, as, "SOP").map((r) => r.id)).toEqual(["3", "1", "2"]);
  expect(searchCreators(cs, as, "kelly")).toEqual([{ id: "1", handle: "sophiek.stuff", alias: "sophiek.kelly2" }]);
});

import { buildVideoImportPlan, buildVideoLookup } from "../video/videoImportPlan.js";
test("视频导入计划：别名匹配 / 只挂同商品 / 文件内重复合并 / 已有累加且记增量 / 0出单非CRM跳过", () => {
  const lookup = buildVideoLookup({
    products: [{ id: "P", sku_id: "111" }, { id: "Q", sku_id: "222" }],
    collabs: [{ id: "c1", creator_id: "A", product_id: "P", ship_date: "2026-01-01" }],
    videos: [{ id: "v-old", video_id: "900", creator_handle: "amy", sku_id: "111", gmv: 10, orders: 1, clicks: 5, vv: 100 }],
    nameIndex: buildNameIndex([{ id: "A", handle: "amy" }], [{ creator_id: "A", alias: "amy_old" }]),
  });
  const row = (videoId, handle, sku, orders) => ({ videoId, creatorHandle: handle, skuId: sku, publishedAt: "2026-02-01", url: "", gmv: orders * 10, orders, clicks: 1, vv: 10 });
  const plan = buildVideoImportPlan([
    row("1", "AMY_OLD", "111", 2), row("1", "amy_old", "111", 3),   // 别名 + 文件内重复
    row("2", "amy", "222", 1),                                      // 同达人不同商品 → 非CRM
    row("3", "stranger", "111", 0),                                 // 非CRM 0 出单 → 跳过
    row("900", "amy", "111", 4),                                    // 已有 → 累加
  ], lookup);
  expect(plan.toInsert.find((r) => r.video_id === "1")).toMatchObject({ collaboration_id: "c1", orders: 5, creator_handle: "amy_old" });
  expect(plan.toInsert.find((r) => r.video_id === "2").collaboration_id).toBe(null);
  expect(plan.toUpdate[0]).toMatchObject({ id: "v-old", delta: { orders: 4 }, next: { orders: 5, video_id: "900", sku_id: "111" } });
  expect(plan.stats).toMatchObject({ merged: 1, skipped: 1, crm: 2, nonCrm: 1, inserted: 2, updated: 1 });
});

import { parseWindow, cutoffOf, videosAsOf } from "../video/cutoff.js";
import { planMonthSnapshot, monthRange } from "../review/snapshotPlan.js";
test("截止日口径：文件名识别区间、只累加到次月 5 号", () => {
  expect(parseWindow("20260806到20260905所有视频.xlsx")).toEqual({ from: "2026-08-06", to: "2026-09-05" });
  expect(parseWindow("20260326-20260331所有视频.xlsx")).toEqual({ from: "2026-03-26", to: "2026-03-31" });
  expect(parseWindow("2026-08-06至2026-09-05")).toEqual({ from: "2026-08-06", to: "2026-09-05" });
  expect(parseWindow("所有视频.xlsx")).toBe(null);
  expect(cutoffOf("2026-12", 5)).toBe("2027-01-05");
  expect(monthRange("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);

  const ledger = {
    batches: [{ id: "A", file_name: "20260706到20260805" }, { id: "B", file_name: "20260806到20260905" }, { id: "C", file_name: "20260906到20261005" }],
    lines: [
      { video_record_id: "V", batch_id: "A", delta_orders: 2, delta_vv: 10, delta_clicks: 1, delta_gmv: 20 },
      { video_record_id: "V", batch_id: "B", delta_orders: 3, delta_vv: 10, delta_clicks: 1, delta_gmv: 30 },
      { video_record_id: "V", batch_id: "C", delta_orders: 4, delta_vv: 10, delta_clicks: 1, delta_gmv: 40 },
      { video_record_id: "W", batch_id: "C", delta_orders: 9, delta_vv: 1, delta_clicks: 0, delta_gmv: 0 },
    ],
  };
  const videos = [
    { id: "V", published_at: "2026-08-03T08:00:00+00:00", orders: 9, collaboration_id: "c1", product_id: "P" },
    { id: "W", published_at: "2026-08-30T08:00:00+00:00", orders: 9, collaboration_id: "c1", product_id: "P" },
  ];
  const r = videosAsOf(videos, ledger, "2026-09-05");
  expect(r.videos).toHaveLength(1);
  expect(r.videos[0]).toMatchObject({ id: "V", orders: 5, vv: 20, gmv: 50 });
  expect(r.dataTo).toBe("2026-10-05");

  const collabs = [{ id: "c1", product_id: "P", ship_date: "2026-07-20", creator_id: "X" }];
  const plan = planMonthSnapshot({ ym: "2026-08", products: [{ id: "P" }], collabs, videos, ledger, cutoffDay: 5 });
  expect(plan.complete).toBe(true); expect(plan.cutoff).toBe("2026-09-05");
  expect(plan.rows[0].metrics.videoOrders).toBe(5);
  expect(planMonthSnapshot({ ym: "2026-10", products: [], collabs, videos, ledger, cutoffDay: 5 }).complete).toBe(false);
});

import { calcMonthMetrics as newCalc, calcGradeMetrics } from "../review/reviewCalc.js";
import { calcRangeMetrics, calcShipGradeMetrics, GRADE_ORDER } from "../review/rangeCalc.js";
import { calcStaffOverview } from "../review/staffCalc.js";
test("区间计算：按月 = 默认区间；等级 Lv7→Lv1；寄样端分层；助理总览合计", () => {
  const rnd = (n) => Math.floor(Math.random() * n);
  const G = ["Lv1", "Lv3", "Lv7", ""];
  const C = Array.from({ length: 600 }, (_, i) => ({ id: "c" + i, product_id: "p" + rnd(4), staff_id: "s" + rnd(3), creator_id: "k" + rnd(200),
    ship_date: `2026-0${6 + rnd(3)}-${String(1 + rnd(28)).padStart(2, "0")}`, attrs: { official_grade: G[rnd(4)] } }));
  const V = Array.from({ length: 2500 }, (_, i) => ({ id: "v" + i, collaboration_id: rnd(4) ? "c" + rnd(650) : null, product_id: "p" + rnd(4),
    orders: rnd(70), vv: rnd(9999), clicks: rnd(99), published_at: `2026-0${6 + rnd(3)}-${String(1 + rnd(28)).padStart(2, "0")}T08:00:00+00:00` }));
  // 按月 = 通用区间套默认口径（改造时已与旧实现逐月逐产品比对一致）
  expect(newCalc(C, V, "2026-07", "p1")).toEqual(calcRangeMetrics({ collabs: C, videos: V, productId: "p1", ship: { from: "2026-06-15", to: "2026-07-14" }, video: { from: "2026-07-01", to: "2026-07-31" } }));

  const grades = calcGradeMetrics(C, V, "2026-07", null, 50).map((r) => r.grade);
  expect(grades).toEqual(GRADE_ORDER.filter((g) => grades.includes(g)));

  const all = { from: "", to: "" };
  const ship = calcShipGradeMetrics({ collabs: C, videos: V, ship: all, video: all });
  expect(ship.reduce((s, r) => s + r.shipCount, 0)).toBe(600);
  expect(ship[0].grade).toBe("Lv7");
  expect(calcRangeMetrics({ collabs: C, videos: V, ship: all, video: all }).shipCount).toBe(600);

  const staff = [{ id: "s1", auth_user_id: "u1" }];
  const inv = [{ added_by: "u1", added_at: "2026-07-03T10:00:00Z", product_id: "p1" }];
  const o = calcStaffOverview({ collabs: C, videos: V, invites: inv, staff, ship: all, video: all });
  expect(o.total.shipCount).toBe(600);
  expect(o.rows.find((r) => r.staffId === "s1").inviteCount).toBe(1);
  expect(o.total.videoCount).toBe(V.filter((v) => v.collaboration_id && C.some((c) => c.id === v.collaboration_id)).length);
});

test("寄样端口径：履约/出单/样销比看寄样的全部视频，不限发布时间；视频端仍按区间", () => {
  const collabs = [
    { id: "c1", product_id: "P", ship_date: "2026-08-20", staff_id: "s1", attrs: { official_grade: "Lv3" } },
    { id: "c2", product_id: "P", ship_date: "2026-08-01", staff_id: "s1", attrs: { official_grade: "Lv3" } },
    { id: "c3", product_id: "P", ship_date: "2026-08-02", staff_id: "s1", attrs: {} },
  ];
  const videos = [
    { id: "v1", collaboration_id: "c1", product_id: "P", orders: 4, published_at: "2026-09-10T08:00:00Z" },  // 月底寄、次月才发
    { id: "v2", collaboration_id: "c2", product_id: "P", orders: 0, published_at: "2026-08-05T08:00:00Z" },
  ];
  const r = { collabs, videos, productId: "P", ship: { from: "2026-07-15", to: "2026-08-14" }, video: { from: "2026-08-01", to: "2026-08-31" } };
  const shipAll = { ...r, ship: { from: "2026-08-01", to: "2026-08-31" } };
  const m = calcRangeMetrics(shipAll);
  expect(m).toMatchObject({ shipCount: 3, fulfillCount: 2, withSalesCount: 1, shipOrders: 4, videoCount: 1, videoOrders: 0 });
  expect(m.sampleSalesRatio).toBeCloseTo(4 / 3);
  expect(calcRangeMetrics(r).fulfillCount).toBe(1);                  // 8/20 那条不在寄样区间
  const g = calcShipGradeMetrics(shipAll);
  expect(g.find((x) => x.grade === "Lv3")).toMatchObject({ shipCount: 2, salesCount: 1, ordersSum: 4 });
  const s = calcStaffOverview({ ...shipAll, invites: [], staff: [] });
  expect(s.total).toMatchObject({ shipCount: 3, fulfillCount: 2, withSalesCount: 1, videoCount: 1 });
  expect(s.total.sampleSalesRatio).toBeCloseTo(4 / 3);
});

import { checkNewWindow } from "../video/cutoff.js";
test("导入区间检查：跨 5 号拦截 / 重叠拦截 / 断档提醒 / 正常通过", () => {
  const done = ["20260906到20260912所有视频.xlsx", "20260913到20260919所有视频.xlsx"];
  expect(checkNewWindow("20260920到20260926", done, 5)).toMatchObject({ errors: [], warnings: [] });
  expect(checkNewWindow("20260927到20261003", [...done, "20260920到20260926"], 5).errors).toEqual([]);
  expect(checkNewWindow("20261004到20261010", done, 5).errors[0]).toMatch("2026-10-05");
  expect(checkNewWindow("20261004到20261005", done, 5).errors).toEqual([]);                 // 截断到 5 号：可以
  expect(checkNewWindow("20261006到20261012", done, 5).errors).toEqual([]);                 // 6 号开始：可以
  expect(checkNewWindow("20260918到20260925", done, 5).errors[0]).toMatch("重叠");
  expect(checkNewWindow("20260925到20261001", done, 5).warnings[0]).toMatch("空了 5 天");
  expect(checkNewWindow("所有视频.xlsx", done, 5).errors[0]).toMatch("看不出");
  expect(checkNewWindow("20260806到20260905", [], 5).errors).toEqual([]);                   // 标准月度文件：以 5 号结尾
});

import { compressMonths, describeSave } from "../../modules/review/snapshotUi.js";
test("补存结果文案：月份压缩成区间，跳过按数据截止日分组", () => {
  expect(compressMonths(["2025-12", "2025-11", "2026-01", "2026-03"])).toBe("2025-11 ~ 2026-01、2026-03");
  const msg = describeSave({ saved: ["2025-01", "2025-02", "2025-03"], skipped: [{ ym: "2026-05", dataTo: "2026-05-05" }, { ym: "2026-06", dataTo: "2026-05-05" }] });
  expect(msg).toBe("✅ 已保存 3 个月（2025-01 ~ 2025-03），视频数据截止次月 5 日\n⏭ 跳过 2 个月（2026-05 ~ 2026-06）：视频数据只导到 2026-05-05，导完后再补存");
});

import { ownerMap, findOwnershipConflicts } from "../crm/ownership.js";
test("达人归属：最早有跟进人的寄样定归属；多跟进人列为冲突；未指定跟进人不参与", () => {
  const collabs = [
    { creator_id: "A", staff_id: null, ship_date: "2026-01-01" },
    { creator_id: "A", staff_id: "zhao", ship_date: "2026-05-31" },
    { creator_id: "A", staff_id: "fang", ship_date: "2026-07-06" },
    { creator_id: "A", staff_id: "fang", ship_date: "2026-07-29" },
    { creator_id: "B", staff_id: "zhu", ship_date: "2026-03-01" },
    { creator_id: "B", staff_id: null, ship_date: "2026-04-01" },
    { creator_id: "C", staff_id: null, ship_date: "2026-04-01" },
  ];
  const o = ownerMap(collabs);
  expect([o.get("A"), o.get("B"), o.get("C")]).toEqual(["zhao", "zhu", undefined]);
  const c = findOwnershipConflicts(collabs, [{ id: "A", handle: "5patito" }, { id: "B", handle: "b" }]);
  expect(c).toHaveLength(1);
  expect(c[0]).toMatchObject({ handle: "5patito", owner: "zhao", rows: 3 });
  expect(c[0].staff.map((s) => [s.staffId, s.count])).toEqual([["zhao", 1], ["fang", 2]]);
});

import { calcPerfMetrics } from "../perf/perfCalc.js";
test("视频产出分配：助理预估 = 预估 ÷ 目标 × 分配（每品四舍五入后相加）；实际视频按达人算", () => {
  const goals = [
    { cycle_start: "2026-08-15", product_id: "P1", target_qty: 100, estimated_videos: 40, goal_allocations: [{ staff_id: "zhu", qty: 33 }, { staff_id: "fang", qty: 67 }] },
    { cycle_start: "2026-08-15", product_id: "P2", target_qty: 100, estimated_videos: 40, goal_allocations: [{ staff_id: "zhu", qty: 33 }] },
    { cycle_start: "2026-08-15", product_id: "P3", target_qty: 100, estimated_videos: 40, goal_allocations: [{ staff_id: "zhu", qty: 33 }] },
  ];
  const collabs = [
    { id: "c1", creator_id: "A", staff_id: "zhu", product_id: "P1", ship_date: "2026-08-20" },
    { id: "c2", creator_id: "A", staff_id: "zhu", product_id: "P2", ship_date: "2026-03-01" },  // 同一达人的老寄样
    { id: "c3", creator_id: "B", staff_id: "fang", product_id: "P1", ship_date: "2026-08-20" },
  ];
  const videos = [
    { id: "v1", collaboration_id: "c1", published_at: "2026-09-03", orders: 1 },
    { id: "v2", collaboration_id: "c2", published_at: "2026-09-10", orders: 0 },   // 老寄样的视频也算（按达人）
    { id: "v3", collaboration_id: "c3", published_at: "2026-09-12", orders: 2 },
    { id: "v4", collaboration_id: null, published_at: "2026-09-12", orders: 5 },   // 非CRM：只算全店
  ];
  const products = [{ id: "P1", is_new: false }, { id: "P2", is_new: true }, { id: "P3", is_new: false }];
  const base = { collabs, videos, shippingGoals: goals, products, cycleStart: "2026-08-15" };
  const zhu = calcPerfMetrics({ ...base, staffId: "zhu" });
  expect(zhu.estimatedVideos).toBe(39);             // 13.2 → 13，× 3 个产品
  expect(zhu.actualVideos).toBe(2);
  expect(zhu.newTarget).toBe(33);
  const all = calcPerfMetrics({ ...base, staffId: null });
  expect(all.estimatedVideos).toBe(120);
  expect(all.actualVideos).toBe(4);
});

import { can } from "../../constants/permissions.js";
test("权限表：超管全开；管理员除平台管理外全开；成员能录入不能删除；只读全关", () => {
  expect(can("viewer", true, "store.manage")).toBe(true);
  expect(can("admin", false, "store.manage")).toBe(false);
  expect(["staff.manage", "crm.delete", "crm.import", "video.revert", "snapshot.write", "task.plan", "perf.viewAll"].every((a) => can("admin", false, a))).toBe(true);
  expect(["product.edit", "crm.edit", "pool.edit", "video.import", "task.do", "perf.viewSelf"].every((a) => can("staff", false, a))).toBe(true);
  expect(["product.delete", "crm.delete", "crm.import", "video.revert", "snapshot.write", "task.plan", "perf.viewAll", "staff.manage"].some((a) => can("staff", false, a))).toBe(false);
  expect(["product.edit", "crm.edit", "pool.edit", "video.import", "task.do", "perf.viewSelf"].some((a) => can("viewer", false, a))).toBe(false);
  expect(can("admin", false, "不存在的动作")).toBe(false);
});
