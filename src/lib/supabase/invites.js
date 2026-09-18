// ─── invite_codes：兑换（管理端 CRUD 在板块⑪人员管理时补）────────────────────
import { sb, unwrap } from "./client.js";
import { INVITE_TRIAL_DAYS } from "../../constants/config.js";

/**
 * 兑换邀请码：写入 user_store_roles，标记已用；若预绑 staff 则把 auth_user_id 挂上。
 * @returns { store_id, role } | throws
 */
export async function redeemInvite(code, userId) {
  const inv = unwrap(
    await sb.from("invite_codes").select("*").ilike("code", code.trim()).maybeSingle(),
    "invite_codes"
  );
  if (!inv) throw new Error("邀请码不存在");
  if (inv.used_by && inv.used_by !== userId) throw new Error("邀请码已被使用");
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) throw new Error("邀请码已过期");

  unwrap(
    await sb.from("user_store_roles").upsert(
      { user_id: userId, store_id: inv.store_id, role: inv.role },
      { onConflict: "user_id,store_id" }
    ),
    "user_store_roles"
  );
  if (inv.staff_id) {
    unwrap(await sb.from("staff").update({ auth_user_id: userId }).eq("id", inv.staff_id), "staff");
  }
  const expires = new Date(Date.now() + INVITE_TRIAL_DAYS * 864e5).toISOString();
  unwrap(
    await sb.from("invite_codes")
      .update({ used_by: userId, used_at: new Date().toISOString(), expires_at: expires })
      .eq("code", inv.code),
    "invite_codes"
  );
  return { store_id: inv.store_id, role: inv.role };
}
