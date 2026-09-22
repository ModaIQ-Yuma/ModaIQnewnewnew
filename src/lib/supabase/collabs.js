// ─── collaborations + creators 联合读写，对外暴露旧版 influencer 对象格式 ───
// 这里的"influencer"对象 = { ...collaborations行, ...creators属性, videoRecords[] }
// 让旧版 UI/lib 函数无需改动。
import { sb, unwrap, fetchAll } from "./client.js";

// ── 读取 ──────────────────────────────────────────────────────────────────────

/** 拉取全部合作记录，拼成旧版 influencer 对象数组 */
export async function fetchInfluencers(storeId) {
  const [collabs, creators] = await Promise.all([
    fetchAll((f, t) =>
      sb.from("collaborations")
        .select("id,creator_id,product_id,staff_id,ship_date,status_manual,product_color,ship_score,note,created_at")
        .eq("store_id", storeId).order("ship_date", { ascending: false }).range(f, t),
      "collaborations"
    ),
    fetchAll((f, t) =>
      sb.from("creators")
        .select("id,handle,official_grade,hist_sales,conv_vertical,avg_views,female_ratio,language,body_type,age_range,content_vertical,style,video_quality,voiceover,note,aliases")
        .eq("store_id", storeId).range(f, t),
      "creators"
    ),
  ]);

  const creatorMap = Object.fromEntries(creators.map((c) => [c.id, c]));

  return collabs.map((c) => {
    const cr = creatorMap[c.creator_id] || {};
    return {
      id:           c.id,             // collaboration id（写操作用）
      creatorId:    c.creator_id,
      influencerId: cr.handle || "",
      product:      c.product_id,     // 暂存 product_id，CRM hook 里再换成 internalName
      productColor: c.product_color || "",
      staffId:      String(c.staff_id || ""),
      shipDate:     c.ship_date || "",
      baseStatus:   c.status_manual || "已寄样",
      crmStatus:    c.status_manual || "已寄样",  // useCRM 里会用 withComputedStatus 重算
      shipScore:    c.ship_score,
      note:         c.note || "",
      // 达人属性（key 与 CREATOR_FIELDS 的 field.key 一致）
      official_grade:   cr.official_grade || "",
      hist_sales:       cr.hist_sales || "",
      conv_vertical:    cr.conv_vertical || "",
      avg_views:        cr.avg_views || "",
      female_ratio:     cr.female_ratio || "",
      language:         cr.language || "",
      body_type:        cr.body_type || "",
      age_range:        cr.age_range || "",
      content_vertical: cr.content_vertical || "",
      style:            Array.isArray(cr.style) ? cr.style : (cr.style ? [cr.style] : []),
      video_quality:    cr.video_quality || "",
      voiceover:        cr.voiceover || "",
      aliases:          cr.aliases || "",
      videoRecords:    [],   // 懒加载，展开行时按需拉
    };
  });
}

/** 按 collaboration_id 拉视频（展开行懒加载） */
export async function fetchCollabVideos(storeId, collabId) {
  const rows = unwrap(
    await sb.from("video_records")
      .select("id,video_id,published_at,orders,gmv,clicks,vv,url,product_id")
      .eq("store_id", storeId).eq("collaboration_id", collabId)
      .order("published_at", { ascending: false }),
    "video_records"
  );
  // 转成旧版 videoRecord 格式
  return (rows || []).map((v) => ({
    videoId:  v.video_id,
    date:     v.published_at ? v.published_at.slice(0, 10) : "",
    orders:   v.orders || 0,
    gmv:      v.gmv || 0,
    clicks:   v.clicks || 0,
    vv:       v.vv || 0,
    url:      v.url || "",
  }));
}
