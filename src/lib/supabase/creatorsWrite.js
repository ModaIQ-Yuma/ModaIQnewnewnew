// ─── 达人身份写操作：新建 / 改名 / 别名 / 达人备注 / 合并档案 ─────────────
// 每个函数都可重复执行：中途失败再跑一次能补完，不会重复写或写乱。
import { sb, unwrap } from "./client.js";

const T = "creators", A = "creator_aliases";

export async function createCreator(storeId, handle, note = null) {
  return unwrap(await sb.from(T).upsert({ store_id: storeId, handle, note }, { onConflict: "store_id,handle" })
    .select("id, handle, note").single(), T);
}

export const updateCreatorNote = async (id, note) =>
  unwrap(await sb.from(T).update({ note: note || null }).eq("id", id), T);

/** 增加别名（已存在则忽略） */
export async function addAliases(storeId, creatorId, aliases) {
  if (!aliases.length) return;
  unwrap(await sb.from(A).upsert(
    aliases.map((alias) => ({ store_id: storeId, creator_id: creatorId, alias })),
    { onConflict: "store_id,alias", ignoreDuplicates: true }
  ), A);
}

export async function removeAliases(storeId, creatorId, aliases) {
  if (!aliases.length) return;
  unwrap(await sb.from(A).delete().eq("store_id", storeId).eq("creator_id", creatorId).in("alias", aliases), A);
}

/** 改名：新名若是自己的别名先移出别名表；旧名变别名；现名改成新名 */
export async function renameCreator(storeId, creatorId, oldHandle, newHandle) {
  await removeAliases(storeId, creatorId, [newHandle]);
  await addAliases(storeId, creatorId, [oldHandle]);
  unwrap(await sb.from(T).update({ handle: newHandle }).eq("id", creatorId), T);
}

/**
 * 合并档案：drop 并入 keep。寄样、别名全部转给 keep；drop 的现名变成 keep 的别名；
 * 邀约库里 drop 名下的记录改挂 keep 的现名（同产品已有则删掉重复的）；达人备注拼接。
 */
export async function mergeCreators(storeId, keep, drop) {
  unwrap(await sb.from("collaborations").update({ creator_id: keep.id }).eq("creator_id", drop.id), "collaborations");
  unwrap(await sb.from(A).update({ creator_id: keep.id }).eq("creator_id", drop.id), A);
  await addAliases(storeId, keep.id, [drop.handle]);

  const pool = "unconnected_creators";
  const rows = unwrap(await sb.from(pool).select("id, creator_id, product_id").eq("store_id", storeId)
    .in("creator_id", [keep.handle, drop.handle]), pool) || [];
  const keepProducts = new Set(rows.filter((r) => r.creator_id === keep.handle).map((r) => r.product_id));
  const dropRows = rows.filter((r) => r.creator_id === drop.handle);
  const dup = dropRows.filter((r) => keepProducts.has(r.product_id)).map((r) => r.id);
  const move = dropRows.filter((r) => !keepProducts.has(r.product_id)).map((r) => r.id);
  if (dup.length)  unwrap(await sb.from(pool).delete().in("id", dup), pool);
  if (move.length) unwrap(await sb.from(pool).update({ creator_id: keep.handle }).in("id", move), pool);

  const note = [keep.note, drop.note].filter(Boolean).join(" / ");
  if (note !== (keep.note || "")) await updateCreatorNote(keep.id, note);
  unwrap(await sb.from(T).delete().eq("id", drop.id), T);
}
