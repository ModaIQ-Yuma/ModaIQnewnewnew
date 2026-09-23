// lib/supabase/videos.js
import { sb, unwrap } from "./client.js";

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

/**
 * 按达人名批量查寄样：名字可以是现名或别名（不分大小写）。
 * @returns { [名字小写]: [{ collabId, productId, shipDate }] }
 */
export async function fetchCollabsByHandles(storeId, handles) {
  const names = [...new Set(handles.map((h) => h.trim().toLowerCase()).filter(Boolean))];
  if (!names.length) return {};
  const [creators, aliasRows] = await Promise.all([
    sb.from("creators").select("id, handle").eq("store_id", storeId).in("handle", names).then((r) => unwrap(r, "creators") || []),
    sb.from("creator_aliases").select("creator_id, alias").eq("store_id", storeId).in("alias", names).then((r) => unwrap(r, "creator_aliases") || []),
  ]);
  const nameToId = {};
  for (const c of creators)  nameToId[c.handle] = c.id;
  for (const a of aliasRows) nameToId[a.alias] ??= a.creator_id;
  const ids = [...new Set(Object.values(nameToId))];
  if (!ids.length) return {};
  const collabs = unwrap(await sb.from("collaborations").select("id, creator_id, product_id, ship_date")
    .eq("store_id", storeId).in("creator_id", ids), "collaborations") || [];
  const byCreator = {};
  for (const c of collabs) (byCreator[c.creator_id] ||= []).push({ collabId: c.id, productId: c.product_id, shipDate: c.ship_date });
  return Object.fromEntries(Object.entries(nameToId).map(([n, id]) => [n, byCreator[id] || []]));
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
