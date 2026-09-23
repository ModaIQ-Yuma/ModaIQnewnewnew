// ─── 复盘快照（产品快照 + 全店快照）；核心数据加载完后后台预取 ─────────────
import { fetchGradeSnapshots, fetchStoreSnapshots } from "../lib/supabase/review.js";
import { useAsyncData } from "./useAsyncData.js";

export function useSnapshots(storeId) {
  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const [grade, store] = await Promise.all([fetchGradeSnapshots(storeId), fetchStoreSnapshots(storeId)]);
      return { grade: grade ?? [], store: store ?? [] };
    },
    storeId
  );
  return { gradeSnapshots: data?.grade ?? [], storeSnapshots: data?.store ?? [], loading, error, reload };
}
