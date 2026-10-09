import { test, expect } from "vitest";
import { snapshotFields, snapshotRates } from "../review/snapshotRates.js";
import { calcRangeMetrics } from "../review/rangeCalc.js";

// 两个达人、三条寄样：c1 出 3 条出单视频（同一达人）、c2 有视频没出单、c3 没视频
const collabs = [
  { id: "c1", product_id: "P", ship_date: "2026-08-02" },
  { id: "c2", product_id: "P", ship_date: "2026-08-10" },
  { id: "c3", product_id: "P", ship_date: "2026-08-20" },
];
const videos = [
  { id: "v1", product_id: "P", collaboration_id: "c1", published_at: "2026-08-05T10:00:00Z", orders: 4, vv: 100, clicks: 10 },
  { id: "v2", product_id: "P", collaboration_id: "c1", published_at: "2026-08-08T10:00:00Z", orders: 2, vv: 100, clicks: 10 },
  { id: "v3", product_id: "P", collaboration_id: "c1", published_at: "2026-08-12T10:00:00Z", orders: 1, vv: 100, clicks: 10 },
  { id: "v4", product_id: "P", collaboration_id: "c2", published_at: "2026-08-15T10:00:00Z", orders: 0, vv: 100, clicks: 10 },
  { id: "v5", product_id: "P", collaboration_id: null,  published_at: "2026-08-16T10:00:00Z", orders: 9, vv: 100, clicks: 10 },
];
const month = { ship: { from: "2026-08-01", to: "2026-08-31" }, video: { from: "2026-08-01", to: "2026-08-31" } };

test("快照存下的数还原出的比率 = 单品复盘的比率", () => {
  const m = calcRangeMetrics({ collabs, videos, productId: "P", ...month });
  const r = snapshotRates(snapshotFields(m));
  expect(r.saleRate).toBe(m.saleRate);                 // 1 出单达人 ÷ 2 履约 = 0.5
  expect(r.saleRate).toBe(0.5);
  expect(r.sampleSalesRatio).toBe(m.sampleSalesRatio); // 7 ÷ 3，不含非CRM视频 v5 的 9 单
  expect(r.sampleSalesRatio).toBeCloseTo(7 / 3);
  expect(r.videoSaleRate).toBe(m.videoSaleRate);
  expect(r.ctr).toBe(m.ctr);
  expect(r.cvr).toBe(m.cvr);
});

test("旧快照缺列 → 显示空，不拿出单视频数顶替", () => {
  const old = { fulfill_count: 2, video_with_sales: 3, ship_count: 3, video_count: 4, total_orders: null, orders: 7 };
  const r = snapshotRates(old);
  expect(r.saleRate).toBe(null);
  expect(r.sampleSalesRatio).toBe(null);
  expect(r.videoOrderShare).toBe(null);
  expect(r.videoSaleRate).toBe(0.75);
  expect(snapshotRates({ sale_creator_count: 0, fulfill_count: 0 }).saleRate).toBe(null);
});

test("整店订单占比", () => {
  const r = snapshotRates({ orders: 20, total_orders: 80, organic_orders: 40 });
  expect(r.videoOrderShare).toBe(0.25);
  expect(r.organicShare).toBe(0.5);
});
