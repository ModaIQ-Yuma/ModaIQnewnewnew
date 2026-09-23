// ─── 保存一条寄样的完整流程（身份 → 寄样 → 属性 → 邀约库联动）──────────────
// 冲突检查在调用前完成（lib/crm/identity.js）；这里只按顺序落库。
// 每一步都可重复执行：中途失败时再保存一次即可补完。
import { sb, unwrap } from "./client.js";
import { createCreator, updateCreatorNote, addAliases, removeAliases, renameCreator } from "./creatorsWrite.js";
import { saveCollab } from "./collabsWrite.js";
import { linkInvitePool } from "./unconnectedWrite.js";

/**
 * @param p 由 buildShipmentPayload 生成
 * @returns { collabId, creatorId, pool: { owned, converted } | null }
 */
export async function saveShipment(storeId, p) {
  const cr = p.creator;
  const creatorId = cr.id || (await createCreator(storeId, cr.handle, cr.note || null)).id;
  if (cr.rename) await renameCreator(storeId, creatorId, cr.oldHandle, cr.handle);
  await removeAliases(storeId, creatorId, cr.aliasesRemove);
  await addAliases(storeId, creatorId, cr.aliasesAdd);
  if (cr.id && cr.noteChanged) await updateCreatorNote(creatorId, cr.note);

  const collabId = p.collabId || crypto.randomUUID();
  await saveCollab(storeId, { ...p.collab, id: collabId, creator_id: creatorId }, p.attrs);

  let pool = null;
  if (p.isNew) {
    pool = await linkInvitePool(storeId, p.names, p.collab.product_id, p.collab.staff_id);
    if (pool.owned || pool.converted) {
      unwrap(await sb.from("collaborations").update({ creator_source: "auto_invite" }).eq("id", collabId), "collaborations");
    }
  }
  return { collabId, creatorId, pool };
}
