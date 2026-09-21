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

/** 按 handle 批量查达人→合作记录映射（同时查 aliases） */
export async function fetchCollabsByHandles(storeId, handles) {
  if (!handles.length) return {};
  // 正向匹配
  const creators = unwrap(
    await sb.from("creators").select("id, handle").eq("store_id", storeId).in("handle", handles),
    "creators"
  );
  // 别名匹配：找 alias 在 handles 里的达人
  const aliasRows = unwrap(
    await sb.from("creator_aliases").select("creator_id, alias").in("alias", handles),
    "creator_aliases"
  );
  // 合并：alias → creator_id，再查 creators 补全 handle
  const aliasCreatorIds = [...new Set(aliasRows.map((a) => a.creator_id))];
  const aliasCreators = aliasCreatorIds.length
    ? unwrap(await sb.from("creators").select("id, handle").in("id", aliasCreatorIds), "creators")
    : [];
  // handle → creator id（正向 + 别名）
  const handleToId = {};
  for (const c of [...creators, ...aliasCreators]) handleToId[c.handle] = c.id;
  for (const a of aliasRows) {
    const c = aliasCreators.find((cr) => cr.id === a.creator_id);
    if (c) handleToId[a.alias] = c.id; // alias → same creator id
  }
  const allCreatorIds = [...new Set(Object.values(handleToId))];
  if (!allCreatorIds.length) return {};
  const collabs = unwrap(
    await sb.from("collaborations").select("id, creator_id, product_id")
      .eq("store_id", storeId).in("creator_id", allCreatorIds),
    "collaborations"
  );
  const idToHandle = Object.fromEntries(
    [...creators, ...aliasCreators].map((c) => [c.id, c.handle])
  );
  const map = {};
  for (const c of collabs) {
    // 找所有指向这个 creator_id 的 handle/alias
    const keys = Object.entries(handleToId)
      .filter(([, id]) => id === c.creator_id).map(([k]) => k);
    for (const key of keys) {
      if (!map[key]) map[key] = [];
      map[key].push({ collabId: c.id, productId: c.product_id });
    }
  }
  return map;
}

/** 联想搜索旧 handle（归入CRM用） */
export async function searchCreators(storeId, query) {
  if (!query.trim()) return [];
  return unwrap(
    await sb.from("creators").select("id, handle")
      .eq("store_id", storeId).ilike("handle", `%${query}%`).limit(10),
    "creators"
  );
}

/** 查某达人在CRM里的所有寄样记录（归入CRM用） */
export async function fetchCreatorCollabs(storeId, creatorId) {
  return unwrap(
    await sb.from("collaborations")
      .select("id, ship_date, products(internal_name)")
      .eq("store_id", storeId).eq("creator_id", creatorId)
      .order("ship_date", { ascending: false }),
    "collaborations"
  );
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
