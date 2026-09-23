// ─── 把核心数据（合作记录 + 达人 + 视频）拼成 CRM 用的 influencer 对象 ───────
// 纯函数：输入内存数组，输出新数组；不发请求。字段口径与 ALL_IN_ONE.sql 对应：
//   collaborations.status（text）= 人工基线状态；status_manual（boolean）= 是否人工改过
//   creators.style（text）= 逗号分隔的多选值
import { withComputedStatus } from "./crmFlow.js";

/** creators.style 文本 → 数组（兼容 , ， 、 三种分隔） */
export const splitStyle = (v) =>
  Array.isArray(v) ? v : String(v || "").split(/[,，、]+/).map((s) => s.trim()).filter(Boolean);

/** video_records 行 → CRM 视频记录格式 */
const toVideoRecord = (v) => ({
  videoId: v.video_id,
  date:    v.published_at ? v.published_at.slice(0, 10) : "",
  orders:  v.orders || 0,
  gmv:     v.gmv || 0,
  clicks:  v.clicks || 0,
  vv:      v.vv || 0,
  url:     v.url || "",
});

/** 视频按合作记录分组：Map<collaboration_id, videoRecord[]> */
export function indexVideosByCollab(videos) {
  const map = new Map();
  for (const v of videos) {
    if (!v.collaboration_id) continue;
    if (!map.has(v.collaboration_id)) map.set(v.collaboration_id, []);
    map.get(v.collaboration_id).push(toVideoRecord(v));
  }
  return map;
}

function toInfluencer(c, cr, videoRecords, productName) {
  return {
    id:            c.id,
    creatorId:     c.creator_id,
    influencerId:  cr.handle || "",
    product:       productName || c.product_id,
    productColor:  c.product_color || "",
    staffId:       String(c.staff_id || ""),
    shipDate:      c.ship_date || "",
    baseStatus:    c.status || "已寄样",
    crmStatus:     c.status || "已寄样",
    creatorSource: c.creator_source || "",
    shipScore:     c.ship_score,
    note:          c.note || "",
    official_grade:   cr.official_grade || "",
    hist_sales:       cr.hist_sales || "",
    conv_vertical:    cr.conv_vertical || "",
    avg_views:        cr.avg_views || "",
    female_ratio:     cr.female_ratio || "",
    language:         cr.language || "",
    body_type:        cr.body_type || "",
    age_range:        cr.age_range || "",
    content_vertical: cr.content_vertical || "",
    style:            splitStyle(cr.style),
    video_quality:    cr.video_quality || "",
    voiceover:        cr.voiceover || "",
    aliases:          cr.aliases || "",
    videoRecords,
  };
}

/**
 * @param productById { [product_id]: internal_name }
 * @returns influencer[]（已算好 crmStatus）
 */
export function buildInfluencers(collabs, creators, videos, productById) {
  const creatorMap = new Map(creators.map((c) => [c.id, c]));
  const vids = indexVideosByCollab(videos);
  return collabs.map((c) => withComputedStatus(
    toInfluencer(c, creatorMap.get(c.creator_id) || {}, vids.get(c.id) || [], productById[c.product_id])
  ));
}
