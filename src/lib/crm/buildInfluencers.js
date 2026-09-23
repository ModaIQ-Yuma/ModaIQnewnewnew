// ─── 把核心数据（寄样 + 属性 + 达人身份 + 别名 + 视频）拼成 CRM 用的 influencer 对象 ─
// 纯函数：输入内存数组，输出新数组；不发请求。
//   属性 = 这一行寄样时记录的属性（collab_attrs），不是达人的「当前」属性
//   note = 合作备注（这次寄样）；creatorNote = 达人备注（这个人）
import { withComputedStatus } from "./crmFlow.js";

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

function toInfluencer(c, cr, names, videoRecords, productName) {
  return {
    id:            c.id,
    creatorId:     c.creator_id,
    influencerId:  cr.handle || "",
    aliases:       names,
    creatorNote:   cr.note || "",
    product:       productName || c.product_id,
    productId:     c.product_id,
    productColor:  c.product_color || "",
    staffId:       String(c.staff_id || ""),
    shipDate:      c.ship_date || "",
    baseStatus:    c.status || "已寄样",
    crmStatus:     c.status || "已寄样",
    creatorSource: c.creator_source || "",
    shipScore:     c.ship_score,
    note:          c.note || "",
    ...c.attrs,
    videoRecords,
  };
}

/**
 * @param productById { [product_id]: internal_name }
 * @returns influencer[]（已算好 crmStatus）
 */
export function buildInfluencers(collabs, creators, aliases, videos, productById) {
  const creatorMap = new Map(creators.map((c) => [c.id, c]));
  const aliasMap = new Map();
  for (const a of aliases) aliasMap.set(a.creator_id, [...(aliasMap.get(a.creator_id) || []), a.alias]);
  const vids = indexVideosByCollab(videos);
  return collabs.map((c) => withComputedStatus(toInfluencer(
    c, creatorMap.get(c.creator_id) || {}, aliasMap.get(c.creator_id) || [], vids.get(c.id) || [], productById[c.product_id]
  )));
}

/** 每位达人最近一次寄样的属性（录入新寄样时预填用）：Map<creatorId, influencer> */
export function latestByCreator(influencers) {
  const m = new Map();
  for (const i of influencers) {
    const cur = m.get(i.creatorId);
    if (!cur || (i.shipDate || "") > (cur.shipDate || "")) m.set(i.creatorId, i);
  }
  return m;
}
