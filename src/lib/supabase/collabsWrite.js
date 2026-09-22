// ─── collaborations 写操作 ─────────────────────────────────────────────────────
import { sb, unwrap } from "./client.js";
import { markUnconnectedConverted } from "./unconnectedWrite.js";

/** 新增或更新达人档案，返回 creator.id */
async function upsertCreator(storeId, inf) {
  const fields = {
    store_id:         storeId,
    handle:           inf.influencerId.trim(),
    official_grade:   inf.officialGrade   || null,
    hist_sales:       inf.histSales       || null,
    conv_vertical:    inf.convVertical    || null,
    avg_views:        inf.avgViews        || null,
    female_ratio:     inf.femaleRatio     || null,
    language:         inf.language        || null,
    body_type:        inf.bodyType        || null,
    age_range:        inf.ageStage        || null,
    content_vertical: inf.contentVertical || null,
    style:            inf.style?.length ? inf.style : null,
    video_quality:    inf.quality         || null,
    voiceover:        inf.voiceover       || null,
    aliases:          inf.aliases         || null,
    note:             inf.note            || null,
  };
  const existing = unwrap(
    await sb.from("creators").select("id").eq("store_id", storeId).ilike("handle", fields.handle).maybeSingle(),
    "creators"
  );
  if (existing) {
    unwrap(await sb.from("creators").update(fields).eq("id", existing.id), "creators");
    return existing.id;
  }
  const created = unwrap(await sb.from("creators").insert(fields).select("id").single(), "creators");
  return created.id;
}

/** 新增合作记录（influencer 对象 → 两张表） */
export async function createInfluencer(storeId, inf, productId) {
  const creatorId = await upsertCreator(storeId, inf);
  // 去重检查
  const dup = unwrap(
    await sb.from("collaborations")
      .select("id,ship_date").eq("store_id", storeId)
      .eq("creator_id", creatorId).eq("product_id", productId).maybeSingle(),
    "collaborations"
  );
  if (dup) throw new Error(`该达人已合作此产品（寄样日期：${dup.ship_date}）`);

  const collab = unwrap(
    await sb.from("collaborations").insert({
      store_id:       storeId,
      creator_id:     creatorId,
      product_id:     productId,
      staff_id:       inf.staffId       || null,
      ship_date:      inf.shipDate,
      status_manual:  inf.baseStatus    || "已寄样",
      product_color:  inf.productColor  || null,
      ship_score:     inf.shipScore     || null,
      note:           inf.note          || null,
      creator_source: inf.creatorSource || null,
    }).select("id").single(),
    "collaborations"
  );

  // 自动邀约转化：批量标记未建联库归属
  if (inf.creatorSource === "auto_invite") {
    await markUnconnectedConverted(storeId, inf.influencerId.trim(), inf.staffId || null);
  }

  return collab.id;
}

/** 更新合作记录（influencer 对象 → 两张表） */
export async function updateInfluencer(storeId, inf, productId) {
  await upsertCreator(storeId, inf);
  unwrap(
    await sb.from("collaborations").update({
      product_id:     productId,
      staff_id:       inf.staffId       || null,
      ship_date:      inf.shipDate,
      status_manual:  inf.baseStatus    || "已寄样",
      product_color:  inf.productColor  || null,
      ship_score:     inf.shipScore     || null,
      note:           inf.note          || null,
      creator_source: inf.creatorSource || null,
    }).eq("id", inf.id),
    "collaborations"
  );
}

/** 删除合作记录（视频 collaboration_id 由 DB ON DELETE SET NULL 自动置空） */
export const deleteInfluencer = async (id) =>
  unwrap(await sb.from("collaborations").delete().eq("id", id), "collaborations");

/** 只改状态（状态下拉行内编辑） */
export const setInfluencerStatus = async (id, baseStatus) =>
  unwrap(await sb.from("collaborations").update({ status_manual: baseStatus }).eq("id", id), "collaborations");
