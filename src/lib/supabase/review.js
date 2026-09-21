// lib/supabase/review.js
import { sb, unwrap, fetchAll } from "./client.js";

/** 拉取全量寄样记录（复盘用，含 ship_date、staff_id、product_id、collaboration_id） */
export async function fetchCollabsForReview(storeId) {
  return fetchAll(
    (from, to) =>
      sb.from("collaborations")
        .select("id, ship_date, staff_id, product_id, creator_id")
        .eq("store_id", storeId)
        .order("ship_date", { ascending: true })
        .range(from, to),
    "collaborations"
  );
}

/** 拉取全量视频记录（复盘用） */
export async function fetchVideosForReview(storeId) {
  return fetchAll(
    (from, to) =>
      sb.from("video_records")
        .select("id, published_at, orders, vv, clicks, collaboration_id, product_id, creator_handle, url")
        .eq("store_id", storeId)
        .order("published_at", { ascending: true })
        .range(from, to),
    "video_records"
  );
}

/** 拉取全量达人（等级复盘用，只需 id 和 official_grade） */
export async function fetchCreatorsForReview(storeId) {
  return fetchAll(
    (from, to) =>
      sb.from("creators")
        .select("id, handle, official_grade")
        .eq("store_id", storeId)
        .range(from, to),
    "creators"
  );
}

/** 拉取全量邀约库记录（助理复盘用） */
export async function fetchInvitesForReview(storeId) {
  return unwrap(
    await sb.from("unconnected_creators")
      .select("id, added_by, added_at, product_id")
      .eq("store_id", storeId),
    "unconnected_creators"
  );
}

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
