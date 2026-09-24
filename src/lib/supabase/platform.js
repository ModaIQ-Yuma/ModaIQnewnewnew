// ─── 平台管理（仅超管）：店铺 + 超管名单 ─────────────────────────────────────
import { sb, unwrap } from "./client.js";

export async function fetchAllStores() {
  const [stores, roles] = await Promise.all([
    sb.from("stores").select("id, name, created_at").order("created_at").then((r) => unwrap(r, "stores") || []),
    sb.from("user_store_roles").select("store_id, role").then((r) => unwrap(r, "user_store_roles") || []),
  ]);
  const count = (id, role) => roles.filter((r) => r.store_id === id && (!role || r.role === role)).length;
  return stores.map((s) => ({ ...s, members: count(s.id), admins: count(s.id, "admin") }));
}

export const createStore = async (name) =>
  unwrap(await sb.from("stores").insert({ name }).select("id, name").single(), "stores");

export const renameStore = async (id, name) =>
  unwrap(await sb.from("stores").update({ name }).eq("id", id), "stores");

export const fetchSuperAdmins = async () =>
  (unwrap(await sb.from("super_admins").select("user_id"), "super_admins") || []).map((r) => r.user_id);

export const addSuperAdmin = async (userId) =>
  unwrap(await sb.from("super_admins").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true }), "super_admins");

export const removeSuperAdmin = async (userId) =>
  unwrap(await sb.from("super_admins").delete().eq("user_id", userId), "super_admins");
