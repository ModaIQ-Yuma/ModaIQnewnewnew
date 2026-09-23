// lib/supabase/unconnectedWrite.js
import { sb, unwrap } from "./client.js";
import { normName } from "../crm/identity.js";

/** 批量录入（一达人多产品拆成多行） */
export async function addToPool(storeId, creatorHandle, productIds, addedBy) {
  const rows = productIds.map((pid) => ({
    store_id:   storeId,
    creator_id: normName(creatorHandle),   // 统一小写，和 CRM 名字比对一致
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
 * CRM 新增寄样时的邀约库联动（按原设计）：
 *   ① 该达人（现名 + 全部别名）在库里的所有记录 → 写入归属人（已有归属的不改）
 *   ② 只有本次寄样的产品那条 → 标记已转化
 * @returns { owned, converted } 本次实际改动的条数
 */
export async function linkInvitePool(storeId, names, productId, staffId) {
  const T = "unconnected_creators";
  const now = new Date().toISOString();
  let owned = [];
  if (staffId) {
    owned = unwrap(await sb.from(T).update({ owner_id: staffId, owned_at: now })
      .eq("store_id", storeId).in("creator_id", names).is("owner_id", null).select("id"), T) || [];
  }
  const converted = unwrap(await sb.from(T).update({ status: "converted" })
    .eq("store_id", storeId).in("creator_id", names).eq("product_id", productId).eq("status", "pending").select("id"), T) || [];
  return { owned: owned.length, converted: converted.length };
}
