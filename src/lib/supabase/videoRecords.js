// ─── video_records 只读查询（写操作在板块⑤视频回收时补）────────────────────
import { sb, unwrap } from "./client.js";

export const fetchCollabVideos = async (storeId, collabId) => {
  const { data, error } = await sb.from("video_records")
    .select("id,video_id,published_at,orders,gmv,clicks,vv,url")
    .eq("store_id", storeId).eq("collaboration_id", collabId)
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * 启动时拉视频摘要（轻量）：collaboration_id → { videoCount, totalOrders }
 * 供 computeStatus 精确计算用，不含视频详情
 */
export async function fetchVideoSummaries(storeId) {
  const { data, error } = await sb
    .from("video_records")
    .select("collaboration_id, orders")
    .eq("store_id", storeId);
  if (error) throw new Error(error.message);
  // 在前端聚合：按 collaboration_id 分组求和
  const map = {};
  for (const row of data || []) {
    const id = row.collaboration_id;
    if (!id) continue;
    if (!map[id]) map[id] = { videoCount: 0, totalOrders: 0 };
    map[id].videoCount++;
    map[id].totalOrders += Number(row.orders) || 0;
  }
  return map; // { [collaboration_id]: { videoCount, totalOrders } }
}
