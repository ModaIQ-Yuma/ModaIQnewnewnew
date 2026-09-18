// lib/supabase/unconnectedWrite.js
import { sb, unwrap } from "./client.js";

/** 批量录入（一达人多产品拆成多行） */
export async function addToPool(storeId, creatorHandle, productIds, addedBy) {
  const rows = productIds.map((pid) => ({
    store_id:   storeId,
    creator_id: creatorHandle,
    product_id: pid,
    added_by:   addedBy,
    status:     "pending",
  }));
  unwrap(await sb.from("unconnected_creators").insert(rows), "unconnected_creators");
}

/** 删除单条记录 */
export async function removeFromPool(id) {
  unwrap(await sb.from("unconnected_creators").delete().eq("id", id), "unconnected_creators");
}

/**
 * CRM 新增寄样且 creator_source === 'auto_invite' 时调用。
 * 把未建连库中该 handle 的所有 pending 记录标记为已转化，写入归属人。
 */
export async function markUnconnectedConverted(storeId, creatorHandle, ownerId) {
  unwrap(
    await sb
      .from("unconnected_creators")
      .update({
        status:   "converted",
        owner_id: ownerId,
        owned_at: new Date().toISOString(),
      })
      .eq("store_id", storeId)
      .eq("creator_id", creatorHandle)
      .eq("status", "pending"),
    "unconnected_creators"
  );
}
