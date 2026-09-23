// ─── 视频导入计划（纯函数）：解析结果 + 内存里的产品/达人/寄样/已有视频 → 要写什么 ─
// 不发请求，不拼超长查询；达人匹配走 identity（现名/别名，不分大小写）。
import { resolveName, normName } from "../crm/identity.js";
import { pickCollab } from "./assignVideos.js";

/** 同一文件里重复出现的视频 ID：数据相加合成一行（保留第一次出现的商品/链接） */
export function mergeDuplicateRows(parsed) {
  const map = new Map();
  for (const r of parsed) {
    const cur = map.get(r.videoId);
    if (!cur) { map.set(r.videoId, { ...r }); continue; }
    cur.gmv += r.gmv; cur.orders += r.orders; cur.clicks += r.clicks; cur.vv += r.vv;
  }
  return { rows: [...map.values()], merged: parsed.length - map.size };
}

/**
 * @param lookup { productBySku: Map, nameIndex, collabsByCreator: Map<creatorId,[{collabId,productId,shipDate}]>, existingByVideoId: Map }
 * @returns { toInsert, toUpdate:[{ id, next, delta }], stats }
 */
export function buildVideoImportPlan(parsed, lookup) {
  const { rows, merged } = mergeDuplicateRows(parsed);
  const toInsert = [], toUpdate = [];
  const stats = { crm: 0, nonCrm: 0, skipped: 0, merged, unknownSku: 0 };

  for (const r of rows) {
    const product = lookup.productBySku.get(r.skuId) || null;
    if (!product) stats.unknownSku++;
    const creatorId = resolveName(lookup.nameIndex, r.creatorHandle)?.creatorId;
    const collabId = product && creatorId ? pickCollab(lookup.collabsByCreator.get(creatorId) || [], product.id, r.publishedAt) : null;
    const ex = lookup.existingByVideoId.get(r.videoId);

    if (!collabId && !ex && r.orders === 0) { stats.skipped++; continue; }   // 非CRM且0出单的新视频不收
    if (collabId) stats.crm++; else stats.nonCrm++;

    const delta = { gmv: r.gmv, orders: r.orders, clicks: r.clicks, vv: r.vv };
    if (ex) {
      // 必填列一并带上：upsert 走 INSERT…ON CONFLICT，缺必填列会在冲突判断前被拒
      toUpdate.push({ id: ex.id, delta, next: {
        video_id: ex.video_id, creator_handle: ex.creator_handle, sku_id: ex.sku_id,
        gmv: (Number(ex.gmv) || 0) + r.gmv, orders: (Number(ex.orders) || 0) + r.orders,
        clicks: (Number(ex.clicks) || 0) + r.clicks, vv: (Number(ex.vv) || 0) + r.vv,
      } });
    } else {
      toInsert.push({
        video_id: r.videoId, published_at: r.publishedAt ? `${r.publishedAt}T00:00:00-08:00` : null,
        url: r.url || null, creator_handle: normName(r.creatorHandle), sku_id: r.skuId,
        product_id: product?.id || null, collaboration_id: collabId, ...delta,
      });
    }
  }
  return { toInsert, toUpdate, stats: { ...stats, inserted: toInsert.length, updated: toUpdate.length } };
}

/** 从内存核心数据构建查找表（VideosModule 调用） */
export function buildVideoLookup({ products, collabs, videos, nameIndex }) {
  const collabsByCreator = new Map();
  for (const c of collabs) {
    collabsByCreator.set(c.creator_id, [...(collabsByCreator.get(c.creator_id) || []), { collabId: c.id, productId: c.product_id, shipDate: c.ship_date }]);
  }
  return {
    productBySku: new Map(products.filter((p) => p.sku_id).map((p) => [String(p.sku_id).trim(), p])),
    nameIndex, collabsByCreator,
    existingByVideoId: new Map(videos.map((v) => [v.video_id, v])),
  };
}
