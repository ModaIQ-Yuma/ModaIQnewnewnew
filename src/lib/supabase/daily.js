// lib/supabase/daily.js
import { sb, unwrap } from "./client.js";

/**
 * 按日期范围查询寄样数（按产品+日期分组）
 * 返回 [{ product_id, date, count }]
 */
export async function fetchDailyShipments(storeId, dateFrom, dateTo) {
  const rows = unwrap(
    await sb
      .from("collaborations")
      .select("product_id, ship_date")
      .eq("store_id", storeId)
      .gte("ship_date", dateFrom)
      .lte("ship_date", dateTo),
    "collaborations"
  );
  // 前端聚合：product_id + date → count
  const map = {};
  for (const r of rows) {
    const key = `${r.product_id}__${r.ship_date}`;
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map).map(([key, count]) => {
    const [product_id, date] = key.split("__");
    return { product_id, date, count };
  });
}

/**
 * 按日期范围查询视频发布数（按产品+日期分组）
 * 返回 [{ product_id, date, count }]
 */
export async function fetchDailyVideos(storeId, dateFrom, dateTo) {
  const rows = unwrap(
    await sb
      .from("video_records")
      .select("product_id, published_at")
      .eq("store_id", storeId)
      .gte("published_at", `${dateFrom}T00:00:00`)
      .lte("published_at", `${dateTo}T23:59:59`)
      .not("product_id", "is", null),
    "video_records"
  );
  const map = {};
  for (const r of rows) {
    const date = r.published_at?.slice(0, 10);
    if (!date) continue;
    const key = `${r.product_id}__${date}`;
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map).map(([key, count]) => {
    const [product_id, date] = key.split("__");
    return { product_id, date, count };
  });
}

/**
 * 按日期范围查询邀约库拉新数（按 added_by + 日期分组）
 * 返回 [{ added_by, date, count }]
 */
export async function fetchDailyInvites(storeId, dateFrom, dateTo) {
  const rows = unwrap(
    await sb
      .from("unconnected_creators")
      .select("added_by, added_at")
      .eq("store_id", storeId)
      .gte("added_at", `${dateFrom}T00:00:00`)
      .lte("added_at", `${dateTo}T23:59:59`),
    "unconnected_creators"
  );
  const map = {};
  for (const r of rows) {
    const date = r.added_at?.slice(0, 10);
    if (!date) continue;
    const key = `${r.added_by ?? "unknown"}__${date}`;
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map).map(([key, count]) => {
    const [added_by, date] = key.split("__");
    return { added_by, date, count };
  });
}
