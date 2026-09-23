// ─── 核心数据集：全站共享的五张表，登录后并行拉一次，各板块只读内存 ─────────
// 列清单与 ALL_IN_ONE.sql 一一对应；排序全部带 id 兜底，保证翻页稳定不漏不重。
import { sb, unwrap, fetchAll } from "./client.js";

const SPEC = {
  collabs: {
    table: "collaborations", order: ["ship_date", true],
    cols: "id,creator_id,product_id,staff_id,ship_date,status,status_manual,product_color,ship_score,note,creator_source,created_at",
  },
  creators: {
    table: "creators", order: ["created_at", true],
    cols: "id,handle,official_grade,hist_sales,conv_vertical,avg_views,female_ratio,language,body_type,age_range,content_vertical,style,video_quality,voiceover,note,aliases",
  },
  videos: {
    table: "video_records", order: ["published_at", true],
    cols: "id,video_id,published_at,url,creator_handle,sku_id,product_id,collaboration_id,gmv,orders,clicks,vv",
  },
  staff: {
    table: "staff", order: ["created_at", true],
    cols: "id,name,auth_user_id,is_active,created_at",
  },
  invites: {
    table: "unconnected_creators", order: ["added_at", false],
    cols: "id,creator_id,product_id,added_by,added_at,owner_id,owned_at,status,products(id,internal_name,sku_id)",
  },
};

export const CORE_KEYS = Object.keys(SPEC);
const ID_CHUNK = 200; // .in() 单次 id 数上限（控制 URL 长度）

/** 拉某张核心表的全部行 */
export function fetchCoreTable(key, storeId) {
  const { table, cols, order: [col, asc] } = SPEC[key];
  return fetchAll(
    (from, to) => sb.from(table).select(cols).eq("store_id", storeId)
      .order(col, { ascending: asc }).order("id", { ascending: true }).range(from, to),
    table
  );
}

/** 按 id 回拉少量行（写操作后局部同步用） */
export async function fetchCoreRows(key, ids) {
  const { table, cols } = SPEC[key];
  const out = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const part = ids.slice(i, i + ID_CHUNK);
    out.push(...(unwrap(await sb.from(table).select(cols).in("id", part), table) || []));
  }
  return out;
}
