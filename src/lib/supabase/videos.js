// lib/supabase/videos.js
import { sb, unwrap } from "./client.js";

/** 拉取导入批次列表 */
export async function fetchBatches(storeId) {
  return unwrap(
    await sb.from("import_batches")
      .select("id, file_name, row_count, created_at")
      .eq("store_id", storeId)
      .eq("kind", "video")
      .order("created_at", { ascending: false }),
    "import_batches"
  );
}
