// lib/supabase/unconnected.js
import { sb, unwrap } from "./client.js";

/** 拉取当前店铺的未建连达人库（含产品、录入人、归属人信息） */
export async function fetchUnconnected(storeId) {
  return unwrap(
    await sb
      .from("unconnected_creators")
      .select(`
        id,
        creator_id,
        product_id,
        added_by,
        added_at,
        owner_id,
        owned_at,
        status,
        products ( id, internal_name, sku_id ),
        added_staff:staff!unconnected_creators_added_by_fkey ( id, name ),
        owner_staff:staff!unconnected_creators_owner_id_fkey ( id, name )
      `)
      .eq("store_id", storeId)
      .order("added_at", { ascending: false }),
    "unconnected_creators"
  );
}

/** 校验层一：库内去重（creator_id 是 text handle） */
export async function checkDuplicateInPool(storeId, creatorHandle, productId) {
  return unwrap(
    await sb
      .from("unconnected_creators")
      .select("id, products(internal_name)")
      .eq("store_id", storeId)
      .eq("creator_id", creatorHandle)
      .eq("product_id", productId)
      .maybeSingle(),
    "unconnected_creators"
  );
}

/** 校验层二：CRM 交叉去重（先用 handle 找 creators.id，再查 collaborations） */
export async function checkDuplicateInCRM(storeId, creatorHandle, productId) {
  const creator = unwrap(
    await sb
      .from("creators")
      .select("id")
      .eq("store_id", storeId)
      .ilike("handle", creatorHandle)
      .maybeSingle(),
    "creators"
  );
  if (!creator) return null; // 未在 CRM 出现过，放行

  return unwrap(
    await sb
      .from("collaborations")
      .select("id, staff:staff_id(name)")
      .eq("store_id", storeId)
      .eq("creator_id", creator.id)
      .eq("product_id", productId)
      .maybeSingle(),
    "collaborations"
  );
}
