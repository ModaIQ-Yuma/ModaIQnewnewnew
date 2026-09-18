// ─── 认证：登录 / 注册 / 会话 / 角色解析 ─────────────────────────────────────
import { sb, unwrap } from "./client.js";

export const getSession   = async () => unwrap(await sb.auth.getSession(), "auth").session;
export const onAuthChange = (cb) => sb.auth.onAuthStateChange((_e, s) => cb(s));
export const signOut      = () => sb.auth.signOut();

export const signIn = (email, password) =>
  sb.auth.signInWithPassword({ email: email.trim(), password });

export const signUp = (email, password) =>
  sb.auth.signUp({ email: email.trim(), password });

/** 判断超管 */
export async function isSuperAdmin(userId) {
  const row = unwrap(
    await sb.from("super_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    "super_admins"
  );
  return !!row;
}

/**
 * 用户可访问的店铺列表。
 * 超管：所有店铺，role=admin；普通用户：user_store_roles 里的店铺。
 * @returns [{ store_id, store_name, role }]
 */
export async function fetchUserStores(userId) {
  if (await isSuperAdmin(userId)) {
    const stores = unwrap(await sb.from("stores").select("id, name").order("name"), "stores");
    return stores.map((s) => ({ store_id: s.id, store_name: s.name, role: "admin", superAdmin: true }));
  }
  const roles = unwrap(
    await sb.from("user_store_roles").select("store_id, role, stores(name)").eq("user_id", userId),
    "user_store_roles"
  );
  return roles.map((r) => ({ store_id: r.store_id, store_name: r.stores?.name || "", role: r.role }));
}
