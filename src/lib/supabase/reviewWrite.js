// lib/supabase/reviewWrite.js
import { sb, unwrap } from "./client.js";
import { snapshotFields } from "../review/snapshotRates.js";

/** 批量保存产品快照：rows = [{ productId, metrics }]，一次请求写完（同月同产品覆盖） */
export async function saveProductSnapshots(storeId, ym, rows, userId) {
  if (!rows.length) return;
  unwrap(await sb.from("grade_snapshots").upsert(rows.map(({ productId, metrics }) => ({
    store_id: storeId, product_id: productId, month: `${ym}-01`, ...snapshotFields(metrics), created_by: userId,
  })), { onConflict: "store_id,product_id,month" }), "grade_snapshots");
}

/** 保存全店快照（upsert，同月覆盖） */
export async function saveStoreSnapshot(storeId, ym, metrics) {
  const month = `${ym}-01`;
  unwrap(
    await sb.from("store_snapshots").upsert({
      store_id:    storeId,
      month,
      ship_count:  metrics.shipCount   || 0,
      video_count: metrics.videoCount  || 0,
      burst_count: metrics.burstCount  || 0,
      orders:      metrics.videoOrders || 0,
      vv:          metrics.totalVV     || 0,
      clicks:      metrics.totalClicks || 0,
      gmv:         0,
    }, { onConflict: "store_id,month" }),
    "store_snapshots"
  );
}

/** 删除单产品快照 */
export async function deleteProductSnapshot(id) {
  unwrap(await sb.from("grade_snapshots").delete().eq("id", id), "grade_snapshots");
}

/** 删除全店快照 */
export async function deleteStoreSnapshot(id) {
  unwrap(await sb.from("store_snapshots").delete().eq("id", id), "store_snapshots");
}
