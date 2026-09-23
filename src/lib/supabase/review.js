// lib/supabase/review.js
import { sb, unwrap } from "./client.js";

/** 拉取产品快照列表 */
export async function fetchGradeSnapshots(storeId) {
  return unwrap(
    await sb.from("grade_snapshots")
      .select("id, product_id, month, ship_count, video_count, burst_count, orders, vv, clicks, gmv, cooperate_count, fulfill_count, video_with_sales, note, created_at, products(internal_name)")
      .eq("store_id", storeId)
      .order("month", { ascending: false }),
    "grade_snapshots"
  );
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
