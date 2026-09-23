// ─── 视频批量导入：按导入计划（lib/video/videoImportPlan.js）落库 ───────────
// 新增 → insert；已有 → 累加（upsert on id）；每行记一条 import_line（增量）用于撤销。
import { sb, unwrap } from "./client.js";

const CHUNK = 500;
const chunks = (arr) => Array.from({ length: Math.ceil(arr.length / CHUNK) }, (_, i) => arr.slice(i * CHUNK, i * CHUNK + CHUNK));

export async function importVideos(storeId, plan, fileName, userId) {
  const { toInsert, toUpdate, stats } = plan;
  const batch = unwrap(await sb.from("import_batches").insert({
    store_id: storeId, kind: "video", file_name: fileName, row_count: toInsert.length + toUpdate.length, created_by: userId,
  }).select("id").single(), "import_batches");

  const lines = [];
  for (const part of chunks(toInsert)) {
    const rows = unwrap(await sb.from("video_records").insert(part.map((r) => ({ ...r, store_id: storeId }))).select("id, video_id"), "video_records") || [];
    const idOf = new Map(rows.map((r) => [r.video_id, r.id]));
    for (const r of part) lines.push({ batch_id: batch.id, video_record_id: idOf.get(r.video_id), action: "新增",
      delta_gmv: r.gmv, delta_orders: r.orders, delta_clicks: r.clicks, delta_vv: r.vv });
  }
  for (const part of chunks(toUpdate)) {
    unwrap(await sb.from("video_records").upsert(part.map((u) => ({ id: u.id, store_id: storeId, ...u.next })), { onConflict: "id" }), "video_records");
    for (const u of part) lines.push({ batch_id: batch.id, video_record_id: u.id, action: "累加",
      delta_gmv: u.delta.gmv, delta_orders: u.delta.orders, delta_clicks: u.delta.clicks, delta_vv: u.delta.vv });
  }
  for (const part of chunks(lines)) unwrap(await sb.from("video_import_lines").insert(part), "video_import_lines");

  return { ...stats, total: stats.inserted + stats.updated, batchId: batch.id, crmCount: stats.crm, nonCrmCount: stats.nonCrm };
}
