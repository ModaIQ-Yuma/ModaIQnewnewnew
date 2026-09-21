// lib/supabase/videosWrite.js — 视频批量导入
import { sb, unwrap } from "./client.js";
import {
  fetchProductsBySkuIds,
  fetchCollabsByHandles,
  fetchExistingVideos,
} from "./videos.js";

/**
 * 批量导入视频（parseVideoXlsx 的输出 → 数据库）
 * @returns {{ inserted, updated, batchId }}
 */
export async function importVideos(storeId, parsed, fileName, userId) {
  if (!parsed.length) return { inserted: 0, updated: 0, batchId: null };

  const skuIds  = [...new Set(parsed.map((r) => r.skuId).filter(Boolean))];
  const handles = [...new Set(parsed.map((r) => r.creatorHandle).filter(Boolean))];
  const videoIds = parsed.map((r) => r.videoId);

  const [products, collabMap, existing] = await Promise.all([
    fetchProductsBySkuIds(storeId, skuIds),
    fetchCollabsByHandles(storeId, handles),
    fetchExistingVideos(storeId, videoIds),
  ]);
  const productMap  = Object.fromEntries(products.map((p) => [p.sku_id, p]));
  const existingMap = Object.fromEntries(existing.map((v) => [v.video_id, v]));

  const batch = unwrap(
    await sb.from("import_batches").insert({
      store_id: storeId, kind: "video", file_name: fileName,
      row_count: parsed.length, created_by: userId,
    }).select("id").single(),
    "import_batches"
  );

  const toInsert = [], toUpdate = [], lines = [];
  let inserted = 0, updated = 0, crmCount = 0, nonCrmCount = 0;

  for (const r of parsed) {
    const product = productMap[r.skuId] || null;
    const collabs = collabMap[r.creatorHandle] || [];
    const collab  = collabs.find((c) => c.productId === product?.id) || collabs[0] || null;
    const ex      = existingMap[r.videoId];
    // 非CRM且无出单 → 跳过
    if (!collab && r.orders === 0) continue;
    if (collab) crmCount++; else nonCrmCount++;

    if (ex) {
      toUpdate.push({
        id:     ex.id,
        gmv:    (Number(ex.gmv)    || 0) + r.gmv,
        orders: (Number(ex.orders) || 0) + r.orders,
        clicks: (Number(ex.clicks) || 0) + r.clicks,
        vv:     (Number(ex.vv)     || 0) + r.vv,
      });
      lines.push({ batch_id: batch.id, video_record_id: ex.id, action: "累加",
        delta_gmv: r.gmv, delta_orders: r.orders, delta_clicks: r.clicks, delta_vv: r.vv });
      updated++;
    } else {
      toInsert.push({
        store_id: storeId, video_id: r.videoId,
        published_at: r.publishedAt ? `${r.publishedAt}T00:00:00` : null,
        url: r.url || null, creator_handle: r.creatorHandle, sku_id: r.skuId,
        product_id: product?.id || null, collaboration_id: collab?.collabId || null,
        gmv: r.gmv, orders: r.orders, clicks: r.clicks, vv: r.vv,
      });
      inserted++;
    }
  }

  if (toInsert.length) {
    const rows = unwrap(
      await sb.from("video_records").insert(toInsert).select("id, video_id"),
      "video_records"
    );
    const idMap = Object.fromEntries(rows.map((r) => [r.video_id, r.id]));
    for (const row of toInsert) {
      lines.push({ batch_id: batch.id, video_record_id: idMap[row.video_id], action: "新增",
        delta_gmv: row.gmv, delta_orders: row.orders, delta_clicks: row.clicks, delta_vv: row.vv });
    }
  }

  for (const u of toUpdate) {
    unwrap(await sb.from("video_records")
      .update({ gmv: u.gmv, orders: u.orders, clicks: u.clicks, vv: u.vv }).eq("id", u.id),
      "video_records");
  }

  if (lines.length) unwrap(await sb.from("video_import_lines").insert(lines), "video_import_lines");
  unwrap(await sb.from("import_batches").update({ row_count: inserted + updated }).eq("id", batch.id), "import_batches");

  return { inserted, updated, batchId: batch.id, crmCount, nonCrmCount };
}
