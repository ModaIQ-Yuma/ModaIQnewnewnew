// ─── 视频批量导入：按导入计划（lib/video/videoImportPlan.js）落库 ───────────
// 新增 → insert；已有 → 累加（upsert on id）。
// 每写完一批立刻记该批的 import_line（增量）：中途失败时已写的部分也能在「导入批次」里撤销。
import { sb, unwrap } from "./client.js";

const CHUNK = 500;
const chunks = (arr) => Array.from({ length: Math.ceil(arr.length / CHUNK) }, (_, i) => arr.slice(i * CHUNK, i * CHUNK + CHUNK));
const line = (batchId, id, action, d) => ({ batch_id: batchId, video_record_id: id, action,
  delta_gmv: d.gmv, delta_orders: d.orders, delta_clicks: d.clicks, delta_vv: d.vv });

export async function importVideos(storeId, plan, fileName, userId) {
  const { toInsert, toUpdate, stats } = plan;
  const batch = unwrap(await sb.from("import_batches").insert({
    store_id: storeId, kind: "video", file_name: fileName, row_count: toInsert.length + toUpdate.length, created_by: userId,
  }).select("id").single(), "import_batches");

  try {
    for (const part of chunks(toInsert)) {
      const rows = unwrap(await sb.from("video_records").insert(part.map((r) => ({ ...r, store_id: storeId }))).select("id, video_id"), "video_records") || [];
      const idOf = new Map(rows.map((r) => [r.video_id, r.id]));
      unwrap(await sb.from("video_import_lines").insert(part.map((r) => line(batch.id, idOf.get(r.video_id), "新增", r))), "video_import_lines");
    }
    for (const part of chunks(toUpdate)) {
      unwrap(await sb.from("video_records").upsert(part.map((u) => ({ id: u.id, store_id: storeId, ...u.next })), { onConflict: "id" }), "video_records");
      unwrap(await sb.from("video_import_lines").insert(part.map((u) => line(batch.id, u.id, "累加", u.delta))), "video_import_lines");
    }
  } catch (e) {
    throw new Error(`${e.message}。已写入的部分记在批次「${fileName}」里，可在「导入批次」中撤销后重新导入。`);
  }
  return { ...stats, total: stats.inserted + stats.updated, batchId: batch.id, crmCount: stats.crm, nonCrmCount: stats.nonCrm };
}
