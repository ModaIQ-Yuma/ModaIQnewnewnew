// ─── CRM 数据 hook：拉取 + 拼接成旧版 influencer 格式 ───────────────────────
import { useCallback, useEffect, useState } from "react";
import { fetchInfluencers, fetchCollabVideos } from "../lib/supabase/collabs.js";
import { fetchVideoSummaries } from "../lib/supabase/videoRecords.js";
import { createInfluencer, updateInfluencer, deleteInfluencer, setInfluencerStatus } from "../lib/supabase/collabsWrite.js";
import { fetchStaff, createStaff } from "../lib/supabase/staff.js";
import { withComputedStatus } from "../lib/crm/crmFlow.js";

export function useCRM(storeId, products) {
  const [influencers, setInfluencers] = useState([]);
  const [staff,       setStaff]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // product_id → internalName 索引（供数据层转换用）
  const productById  = Object.fromEntries((products || []).map((p) => [p.id, p.internal_name]));
  const productByName = Object.fromEntries((products || []).map((p) => [p.internal_name, p]));

  const reload = useCallback(async () => {
    if (!storeId) return;
    setLoading(true); setError(null);
    try {
      const [infs, st, videoSummaries] = await Promise.all([
        fetchInfluencers(storeId), fetchStaff(storeId), fetchVideoSummaries(storeId),
      ]);
      // product_id → internalName，注入视频摘要后用 withComputedStatus 精确重算状态
      const mapped = infs.map((inf) => {
        const summary = videoSummaries[inf.id] || { videoCount: 0, totalOrders: 0 };
        // 用摘要构造轻量 videoRecords 占位，让 computeStatus / cumOrders 精确计算
        const videoPlaceholders = summary.videoCount > 0
          ? Array.from({ length: summary.videoCount }, (_, i) =>
              i === 0 ? { videoId: `_summary`, orders: summary.totalOrders, date: "" } : { videoId: `_summary_${i}`, orders: 0, date: "" }
            )
          : [];
        return withComputedStatus({
          ...inf,
          product: productById[inf.product] || inf.product,
          videoRecords: videoPlaceholders,
          _videoSummary: summary,  // 保留原始摘要供任务中心用
        });
      });
      setInfluencers(mapped);
      setStaff(st);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [storeId, JSON.stringify(productById)]);

  useEffect(() => { reload(); }, [reload]);

  // 视频懒加载：展开行时调用，结果直接更新该 influencer 的 videoRecords
  const loadVideos = useCallback(async (inf) => {
    const videos = await fetchCollabVideos(storeId, inf.id);
    const updated = withComputedStatus({ ...inf, videoRecords: videos });
    setInfluencers((prev) => prev.map((i) => i.id === inf.id ? updated : i));
    return videos;
  }, [storeId]);

  // ── 写操作（入参是旧版 influencer 对象，内部转换为两张表）──
  const save = useCallback(async (inf) => {
    const prod = productByName[inf.product];
    if (!prod) throw new Error(`产品「${inf.product}」不存在，请先在产品库建档`);
    if (inf.id && inf.id !== inf.influencerId) {
      // 编辑
      await updateInfluencer(storeId, inf, prod.id);
      setInfluencers((prev) => prev.map((i) => i.id === inf.id ? withComputedStatus(inf) : i));
    } else {
      // 新增
      const collabId = await createInfluencer(storeId, inf, prod.id);
      setInfluencers((prev) => [withComputedStatus({ ...inf, id: collabId }), ...prev]);
    }
  }, [storeId, JSON.stringify(productByName)]);

  const remove = useCallback(async (id) => {
    await deleteInfluencer(id);
    setInfluencers((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // 行内状态变更（下拉框）
  const updateStatus = useCallback(async (inf, newBaseStatus) => {
    await setInfluencerStatus(inf.id, newBaseStatus);
    const updated = withComputedStatus(inf, newBaseStatus);
    setInfluencers((prev) => prev.map((i) => i.id === inf.id ? updated : i));
  }, []);

  // 批量删除
  const bulkRemove = useCallback(async (ids) => {
    await Promise.all([...ids].map((id) => deleteInfluencer(id)));
    setInfluencers((prev) => prev.filter((i) => !ids.has(i.id)));
  }, []);

  const addStaff = useCallback(async (name) => {
    const s = await createStaff(storeId, name);
    setStaff((prev) => [...prev, s]);
    return s;
  }, [storeId]);

  return { influencers, staff, loading, error, reload, loadVideos, save, remove, updateStatus, bulkRemove, addStaff };
}
