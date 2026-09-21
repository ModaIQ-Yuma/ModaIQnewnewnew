// lib/supabase/videosMerge.js — 非CRM视频归入CRM
import { sb, unwrap } from "./client.js";

/**
 * 归入CRM：
 * 1. creators.handle 更新为新 handle
 * 2. 旧 handle 写入 creator_aliases
 * 3. 该视频 collaboration_id 更新为选中的寄样记录
 * 4. 同一达人其他视频的 collaboration_id 也一并更新
 */
export async function mergeIntoCreator(storeId, videoId, oldCreatorId, oldHandle, newHandle, collabId) {
  // 1. 更新 creator handle
  unwrap(
    await sb.from("creators").update({ handle: newHandle }).eq("id", oldCreatorId),
    "creators"
  );

  // 2. 写入旧 handle 为别名（忽略重复）
  await sb.from("creator_aliases")
    .upsert({ store_id: storeId, creator_id: oldCreatorId, alias: oldHandle }, { onConflict: "store_id,alias" });

  // 3. 把该达人所有视频（creator_handle = newHandle 或 oldHandle）的 collaboration_id 更新
  for (const handle of [newHandle, oldHandle]) {
    unwrap(
      await sb.from("video_records")
        .update({ collaboration_id: collabId })
        .eq("store_id", storeId)
        .eq("creator_handle", handle)
        .is("collaboration_id", null),
      "video_records"
    );
  }

  // 4. 确保触发视频的 collaboration_id 一定被更新（防止 handle 不完全匹配）
  unwrap(
    await sb.from("video_records").update({ collaboration_id: collabId }).eq("id", videoId),
    "video_records"
  );
}
