// ─── FSorder 订单数据（整店总出单 / 自然流量单）──────────────────────────────
// 表 daily_orders：product_id = 商品 ID（= 本系统 products.sku_id），date，total_orders，organic_orders
import { sbFS, fetchAll } from "./client.js";
import { FSORDER_STORE_ID } from "../../constants/env.js";

/** 这家店是否接入了 FSorder */
export const fsorderEnabled = (storeId) => !!sbFS && storeId === FSORDER_STORE_ID;

/**
 * 按商品汇总某段日期的订单：Map<sku_id, { totalOrders, organicOrders }>
 * skuIds 为空 = 全部商品
 */
export async function fetchFSorderOrders(from, to, skuIds = null) {
  if (!sbFS) return new Map();
  const rows = await fetchAll((a, b) => {
    let q = sbFS.from("daily_orders").select("product_id, date, total_orders, organic_orders").gte("date", from).lte("date", to);
    if (skuIds?.length) q = q.in("product_id", skuIds);
    return q.order("date").order("product_id").range(a, b);
  }, "fsorder.daily_orders");
  const out = new Map();
  for (const r of rows) {
    const k = String(r.product_id);
    const s = out.get(k) || { totalOrders: 0, organicOrders: 0 };
    s.totalOrders += r.total_orders || 0; s.organicOrders += r.organic_orders || 0;
    out.set(k, s);
  }
  return out;
}

/** 每个「达人 + 商品」在 FSorder 的累计出单（生成激活任务用）：[{ creator, sku, totalOrders }] */
export async function fetchFSorderCreatorTotals() {
  if (!sbFS) return [];
  // 翻页需要稳定排序：按 达人 + 商品 + 日期；若该表没有 date 列则退回 达人 + 商品
  const query = (withDate) => fetchAll((a, b) => {
    let q = sbFS.from("creator_daily").select("creator, product_id, orders").gt("orders", 0).order("creator").order("product_id");
    if (withDate) q = q.order("date");
    return q.range(a, b);
  }, "fsorder.creator_daily");
  let rows;
  try { rows = await query(true); } catch { rows = await query(false); }
  const sum = new Map();
  for (const r of rows) { const k = `${String(r.creator).toLowerCase()}|${r.product_id}`; sum.set(k, (sum.get(k) || 0) + (r.orders || 0)); }
  return [...sum].map(([k, totalOrders]) => { const [creator, sku] = k.split("|"); return { creator, sku, totalOrders }; });
}
