// ─── 团队账号：店铺成员（user_store_roles）+ 邀请码（invite_codes）─────────
// invite_codes 的主键是 code（没有 id 列），增删都按 code。
import { sb, unwrap } from "./client.js";

/** 本店成员列表 [{ user_id, role }] */
export async function fetchMembers(storeId) {
  return unwrap(
    await sb.from("user_store_roles").select("user_id, role").eq("store_id", storeId),
    "user_store_roles"
  ) || [];
}

/** 改成员角色（admin / staff / viewer） */
export async function updateMemberRole(storeId, userId, role) {
  unwrap(await sb.from("user_store_roles").update({ role }).eq("user_id", userId).eq("store_id", storeId), "user_store_roles");
}

/** 把成员移出本店 */
export async function removeMember(storeId, userId) {
  unwrap(await sb.from("user_store_roles").delete().eq("user_id", userId).eq("store_id", storeId), "user_store_roles");
}

/** 本店邀请码，新的在前 */
export async function fetchInviteCodes(storeId) {
  return unwrap(
    await sb.from("invite_codes")
      .select("code, role, staff_id, used_by, used_at, expires_at, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false }),
    "invite_codes"
  ) || [];
}

/** 新建邀请码；expiresAt 可选（试用码）；staffId 可选：兑换时自动把账号绑定到这个助理 */
export async function createInviteCode(storeId, { code, role, expiresAt = null, staffId = null }) {
  const row = { code, store_id: storeId, role, staff_id: staffId };
  if (expiresAt) row.expires_at = expiresAt;
  unwrap(await sb.from("invite_codes").insert(row), "invite_codes");
}

/** 删除邀请码（已用该码加入的成员不受影响） */
export async function deleteInviteCode(storeId, code) {
  unwrap(await sb.from("invite_codes").delete().eq("store_id", storeId).eq("code", code), "invite_codes");
}
