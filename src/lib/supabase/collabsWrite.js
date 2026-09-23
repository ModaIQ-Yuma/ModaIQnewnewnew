// ─── 寄样记录写操作：collaborations（寄样事实）+ collab_attrs（寄样时属性）──
import { sb, unwrap } from "./client.js";
import { attrsToRow } from "../crm/attrs.js";

const ID_CHUNK = 200;

/**
 * 新增或更新一条寄样（含属性）。新增时由调用方生成 id（crypto.randomUUID），
 * 这样属性行可以直接引用，不依赖数据库返回顺序；重复执行结果相同。
 * @param c { id, creator_id, product_id, staff_id, ship_date, status, status_manual, product_color, ship_score, note, creator_source }
 */
export async function saveCollab(storeId, c, attrs) {
  unwrap(await sb.from("collaborations").upsert({ ...c, store_id: storeId }, { onConflict: "id" }), "collaborations");
  unwrap(await sb.from("collab_attrs").upsert(
    { collaboration_id: c.id, store_id: storeId, ...attrsToRow(attrs) }, { onConflict: "collaboration_id" }
  ), "collab_attrs");
}

/** 批量删除寄样（属性随外键级联删除；视频 collaboration_id 由数据库置空） */
export async function deleteInfluencers(ids) {
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    unwrap(await sb.from("collaborations").delete().in("id", ids.slice(i, i + ID_CHUNK)), "collaborations");
  }
}

/** 只改状态（表格里的状态下拉）：status = 人工基线，status_manual 标记「人工改过」 */
export const setInfluencerStatus = async (id, baseStatus) =>
  unwrap(await sb.from("collaborations").update({ status: baseStatus, status_manual: true }).eq("id", id), "collaborations");
