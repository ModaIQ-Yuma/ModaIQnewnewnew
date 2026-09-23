// ─── 批次撤销：新增的删掉，累加的减回增量，再删批次 ─────────────────────────
// 明细翻页读全（超过 1000 行也不漏），按 500 条一批处理，不再逐条请求。
import { sb, unwrap, fetchAll, selectIn } from "./client.js";

// 删除走 URL 里的 id 列表：每批 150 个 uuid，避免地址过长被拒；更新走请求体，每批 500
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const minus = (a, b) => Math.max(0, (Number(a) || 0) - (Number(b) || 0));

/** @returns { removed, restored } 删除的新增视频数 / 减回的累加视频数 */
export async function revertBatch(batchId) {
  const lines = await fetchAll((from, to) => sb.from("video_import_lines")
    .select("id, video_record_id, action, delta_gmv, delta_orders, delta_clicks, delta_vv")
    .eq("batch_id", batchId).order("id").range(from, to), "video_import_lines");

  const added = lines.filter((l) => l.action === "新增").map((l) => l.video_record_id);
  for (const part of chunks(added, 150)) unwrap(await sb.from("video_records").delete().in("id", part), "video_records");

  const acc = lines.filter((l) => l.action === "累加");
  const recs = await selectIn(acc.map((l) => l.video_record_id), (part) => sb.from("video_records")
    .select("id, store_id, video_id, creator_handle, sku_id, gmv, orders, clicks, vv").in("id", part), "video_records");
  const byId = new Map(recs.map((r) => [r.id, r]));
  const rows = acc.filter((l) => byId.has(l.video_record_id)).map((l) => {
    const r = byId.get(l.video_record_id);
    return { ...r, gmv: minus(r.gmv, l.delta_gmv), orders: minus(r.orders, l.delta_orders), clicks: minus(r.clicks, l.delta_clicks), vv: minus(r.vv, l.delta_vv) };
  });
  for (const part of chunks(rows, 500)) unwrap(await sb.from("video_records").upsert(part, { onConflict: "id" }), "video_records");

  unwrap(await sb.from("import_batches").delete().eq("id", batchId), "import_batches");   // 明细随外键级联删除
  return { removed: added.length, restored: rows.length };
}
