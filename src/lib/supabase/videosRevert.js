// lib/supabase/videosRevert.js — 批次撤销
import { sb, unwrap } from "./client.js";
import { fetchBatchLines } from "./videos.js";

/** 撤销一个批次（反向减回增量，然后删批次记录） */
export async function revertBatch(batchId) {
  const lines = await fetchBatchLines(batchId);
  for (const line of lines) {
    const { data: rec } = await sb.from("video_records")
      .select("id, gmv, orders, clicks, vv").eq("id", line.video_record_id).single();
    if (!rec) continue;
    if (line.action === "新增") {
      unwrap(await sb.from("video_records").delete().eq("id", rec.id), "video_records");
    } else {
      unwrap(
        await sb.from("video_records").update({
          gmv:    Math.max(0, (Number(rec.gmv)    || 0) - line.delta_gmv),
          orders: Math.max(0, (Number(rec.orders) || 0) - line.delta_orders),
          clicks: Math.max(0, (Number(rec.clicks) || 0) - line.delta_clicks),
          vv:     Math.max(0, (Number(rec.vv)     || 0) - line.delta_vv),
        }).eq("id", rec.id),
        "video_records"
      );
    }
  }
  unwrap(await sb.from("video_import_lines").delete().eq("batch_id", batchId), "video_import_lines");
  unwrap(await sb.from("import_batches").delete().eq("id", batchId), "import_batches");
}
