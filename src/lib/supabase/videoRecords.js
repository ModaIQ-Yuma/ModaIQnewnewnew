// ─── video_records 只读查询（写操作在板块⑤视频回收时补）────────────────────
import { sb, unwrap, fetchAll } from "./client.js";

export const fetchCollabVideos = async (storeId, collabId) => {
  const { data, error } = await sb.from("video_records")
    .select("id,video_id,published_at,orders,gmv,clicks,vv,url")
    .eq("store_id", storeId).eq("collaboration_id", collabId)
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
};

/**
 * 拉视频摘要：collaboration_id → { videoCount, totalOrders }
 * 走 fetchAll 翻页，确保 7000+ 条记录不被截断
 */
export async function fetchVideoSummaries(storeId) {
  const rows = await fetchAll(
    (from, to) =>
      sb.from("video_records")
        .select("collaboration_id,orders")
        .eq("store_id", storeId)
        .range(from, to),
    "video_records"
  );
  const map = {};
  for (const row of rows) {
    const id = row.collaboration_id;
    if (!id) continue;
    if (!map[id]) map[id] = { videoCount: 0, totalOrders: 0 };
    map[id].videoCount++;
    map[id].totalOrders += Number(row.orders) || 0;
  }
  return map;
}
