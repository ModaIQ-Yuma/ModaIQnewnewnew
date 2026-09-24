// lib/supabase/videos.js
import { sb, unwrap, fetchAll } from "./client.js";

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

/** 导入账本：全部视频批次 + 每批的增量明细（按截止日还原视频数据用） */
export async function fetchImportLedger(storeId) {
  const batches = unwrap(await sb.from("import_batches").select("id, file_name")
    .eq("store_id", storeId).eq("kind", "video"), "import_batches") || [];
  const perBatch = await Promise.all(batches.map((b) => fetchAll((from, to) => sb.from("video_import_lines")
    .select("video_record_id, batch_id, delta_gmv, delta_orders, delta_clicks, delta_vv")
    .eq("batch_id", b.id).order("id").range(from, to), "video_import_lines")));
  return { batches, lines: perBatch.flat() };
}
