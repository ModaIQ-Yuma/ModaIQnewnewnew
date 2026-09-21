// lib/supabase/videos.js
import { sb, unwrap, fetchAll } from "./client.js";

/** 拉取全部视频记录（含产品名、达人名） */
export async function fetchVideos(storeId) {
  return fetchAll(
    (from, to) =>
      sb.from("video_records")
        .select(`
          id, video_id, published_at, url, creator_handle,
          gmv, orders, clicks, vv, collaboration_id,
          products ( id, internal_name )
        `)
        .eq("store_id", storeId)
        .order("published_at", { ascending: false })
        .range(from, to),
    "video_records"
  );
}

/** 拉取导入批次列表 */
export async function fetchBatches(storeId) {
  return unwrap(
    await sb.from("import_batches")
      .select("id, file_name, row_count, created_at")
      .eq("store_id", storeId)
      .eq("kind", "video")
      .order("created_at", { ascending: false }),
    "import_batches"
  );
}

/** 拉取某批次的导入明细（用于撤销） */
export async function fetchBatchLines(batchId) {
  return unwrap(
    await sb.from("video_import_lines")
      .select("id, video_record_id, action, delta_gmv, delta_orders, delta_clicks, delta_vv")
      .eq("batch_id", batchId),
    "video_import_lines"
  );
}

/** 按 skuId 批量查产品映射 */
export async function fetchProductsBySkuIds(storeId, skuIds) {
  if (!skuIds.length) return [];
  return unwrap(
    await sb.from("products")
      .select("id, sku_id, internal_name")
      .eq("store_id", storeId)
      .in("sku_id", skuIds),
    "products"
  );
}

/** 按 handle 批量查达人→合作记录映射 */
export async function fetchCollabsByHandles(storeId, handles) {
  if (!handles.length) return [];
  const creators = unwrap(
    await sb.from("creators")
      .select("id, handle")
      .eq("store_id", storeId)
      .in("handle", handles),
    "creators"
  );
  if (!creators.length) return [];
  const creatorIds = creators.map((c) => c.id);
  const collabs = unwrap(
    await sb.from("collaborations")
      .select("id, creator_id, product_id")
      .eq("store_id", storeId)
      .in("creator_id", creatorIds),
    "collaborations"
  );
  // 返回 handle → [{ collabId, productId }]
  const creatorMap = Object.fromEntries(creators.map((c) => [c.id, c.handle]));
  const map = {};
  for (const c of collabs) {
    const handle = creatorMap[c.creator_id];
    if (!handle) continue;
    if (!map[handle]) map[handle] = [];
    map[handle].push({ collabId: c.id, productId: c.product_id });
  }
  return map;
}

/** 按 videoId 批量查已有记录 */
export async function fetchExistingVideos(storeId, videoIds) {
  if (!videoIds.length) return [];
  return unwrap(
    await sb.from("video_records")
      .select("id, video_id, gmv, orders, clicks, vv")
      .eq("store_id", storeId)
      .in("video_id", videoIds),
    "video_records"
  );
}
