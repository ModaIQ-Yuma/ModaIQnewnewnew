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
