// ─── staff 表（CRM 跟进人下拉用；完整管理在板块⑪）───────────────────────────
import { sb, unwrap } from "./client.js";

export const fetchStaff = async (storeId) =>
  unwrap(await sb.from("staff").select("id,name,is_active").eq("store_id", storeId).eq("is_active", true).order("created_at"), "staff");

export const createStaff = async (storeId, name) =>
  unwrap(await sb.from("staff").insert({ store_id: storeId, name: name.trim() }).select("id,name,is_active").single(), "staff");
