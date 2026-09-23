// ─── 视频导入批次列表（视频本身在核心数据里） ────────────────────────────────
import { fetchBatches } from "../lib/supabase/videos.js";
import { useAsyncData } from "./useAsyncData.js";

export function useVideoBatches(storeId) {
  const { data, error, reload } = useAsyncData(() => fetchBatches(storeId), storeId);
  return { batches: data ?? [], error, reload };
}
