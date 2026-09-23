// lib/supabase/videosWrite.js — 视频批量导入（分批处理，避免超时）
import { sb, unwrap } from "./client.js";
import { pickCollab } from "../video/assignVideos.js";
import {
  fetchProductsBySkuIds,
  fetchCollabsByHandles,
  fetchExistingVideos,
} from "./videos.js";

const CHUNK = 200; // 每批最多 200 条
const chunk = (arr) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += CHUNK) chunks.push(arr.slice(i, i + CHUNK));
  return chunks;
};

export async function importVideos(storeId, parsed, fileName, userId) {
  if (!parsed.length) return { inserted: 0, updated: 0, batchId: null };

  const skuIds   = [...new Set(parsed.map((r) => r.skuId).filter(Boolean))];
  const handles  = [...new Set(parsed.map((r) => r.creatorHandle).filter(Boolean))];
  const videoIds = parsed.map((r) => r.videoId);

  const [products, collabMap, existing] = await Promise.all([
    fetchProductsBySkuIds(storeId, skuIds),
    fetchCollabsByHandles(storeId, handles),
    fetchExistingVideos(storeId, videoIds),
  ]);
  const productMap  = Object.fromEntries(products.map((p) => [p.sku_id, p]));
  const existingMap = Object.fromEntries(existing.map((v) => [v.video_id, v]));

  // 建批次记录
  const batch = unwrap(
    await sb.from("import_batches").insert({
      store_id: storeId, kind: "video", file_name: fileName,
      row_count: parsed.length, created_by: userId,
    }).select("id").single(),
    "import_batches"
  );

  const toInsert = [], toUpdate = [];
  let inserted = 0, updated = 0, crmCount = 0, nonCrmCount = 0;

  for (const r of parsed) {
    const product = productMap[r.skuId] || null;
    // 只挂同商品的寄样（复投时挂发布前最近一次）；商品对不上 → 非 CRM
    const collabId = product ? pickCollab(collabMap[r.creatorHandle?.toLowerCase()] || [], product.id, r.publishedAt) : null;
    const collab   = collabId ? { collabId } : null;
    const ex      = existingMap[r.videoId];

    // 非CRM且无出单 → 跳过
    if (!collab && r.orders === 0) continue;
    if (collab) crmCount++; else nonCrmCount++;

    if (ex) {
      // 累加：用 upsert 覆盖（新值 = 旧值 + 增量）
      toUpdate.push({
        id:     ex.id,
        gmv:    (Number(ex.gmv)    || 0) + r.gmv,
        orders: (Number(ex.orders) || 0) + r.orders,
        clicks: (Number(ex.clicks) || 0) + r.clicks,
        vv:     (Number(ex.vv)     || 0) + r.vv,
      });
      updated++;
    } else {
      toInsert.push({
        store_id: storeId, video_id: r.videoId,
        published_at: r.publishedAt ? `${r.publishedAt}T00:00:00-08:00` : null,
        url: r.url || null, creator_handle: r.creatorHandle, sku_id: r.skuId,
        product_id: product?.id || null, collaboration_id: collab?.collabId || null,
        gmv: r.gmv, orders: r.orders, clicks: r.clicks, vv: r.vv,
      });
      inserted++;
    }
  }

  // ── 分批 insert（新增）──────────────────────────────────────────────────────
  const insertedIds = {}; // video_id → db id，用于写 import_lines
  for (const batch200 of chunk(toInsert)) {
    const rows = unwrap(
      await sb.from("video_records").insert(batch200).select("id, video_id"),
      "video_records"
    );
    rows.forEach((r) => { insertedIds[r.video_id] = r.id; });
  }

  // ── 分批 update（累加）─────────────────────────────────────────────────────
  // 用 upsert on id 逐批提交，避免逐条请求
  for (const batch200 of chunk(toUpdate)) {
    unwrap(
      await sb.from("video_records").upsert(batch200, { onConflict: "id" }),
      "video_records"
    );
  }

  // ── 写 import_lines ────────────────────────────────────────────────────────
  const lines = [];
  for (const row of toInsert) {
    const dbId = insertedIds[row.video_id];
    if (dbId) lines.push({
      batch_id: batch.id, video_record_id: dbId, action: "新增",
      delta_gmv: row.gmv, delta_orders: row.orders, delta_clicks: row.clicks, delta_vv: row.vv,
    });
  }
  for (const u of toUpdate) {
    lines.push({
      batch_id: batch.id, video_record_id: u.id, action: "累加",
      delta_gmv: u.gmv, delta_orders: u.orders, delta_clicks: u.clicks, delta_vv: u.vv,
    });
  }
  for (const batch200 of chunk(lines)) {
    unwrap(await sb.from("video_import_lines").insert(batch200), "video_import_lines");
  }

  // 更新批次实际处理数
  unwrap(
    await sb.from("import_batches").update({ row_count: inserted + updated }).eq("id", batch.id),
    "import_batches"
  );

  return { inserted, updated, batchId: batch.id, crmCount, nonCrmCount };
}
