// lib/supabase/review.js
import { sb, unwrap, fetchAll } from "./client.js";

/** 拉取产品快照列表 */
export async function fetchGradeSnapshots(storeId) {
  // 每个产品每月一行，会超过 Supabase 单次 1000 条 → 自动翻页（排序加 id 保证翻页稳定）
  return fetchAll((from, to) => sb.from("grade_snapshots")
    .select("id, product_id, month, ship_count, video_count, burst_count, orders, vv, clicks, gmv, cooperate_count, fulfill_count, video_with_sales, total_orders, organic_orders, note, created_at, products(internal_name)")
    .eq("store_id", storeId)
    .order("month", { ascending: false }).order("id")
    .range(from, to), "grade_snapshots");
}

/** 拉取全店快照列表 */
export async function fetchStoreSnapshots(storeId) {
  return unwrap(
    await sb.from("store_snapshots")
      .select("id, month, ship_count, video_count, burst_count, orders, vv, clicks, gmv, created_at")
      .eq("store_id", storeId)
      .order("month", { ascending: false }),
    "store_snapshots"
  );
}
