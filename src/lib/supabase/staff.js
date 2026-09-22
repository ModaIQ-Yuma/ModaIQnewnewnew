// lib/supabase/staff.js
import { sb, unwrap } from "./client.js";

export const fetchStaff = async (storeId) =>
  unwrap(await sb.from("staff").select("id,name,auth_user_id,is_active,created_at").eq("store_id", storeId).order("created_at"), "staff");

export const createStaff = async (storeId, name) =>
  unwrap(await sb.from("staff").insert({ store_id: storeId, name: name.trim() }).select("id,name,auth_user_id,is_active,created_at").single(), "staff");

export const updateStaff = async (id, patch) =>
  unwrap(await sb.from("staff").update(patch).eq("id", id).select("id,name,auth_user_id,is_active,created_at").single(), "staff");

export const deleteStaff = async (id) =>
  unwrap(await sb.from("staff").delete().eq("id", id), "staff");
