// ─── CRM hook：从核心数据派生 influencer 列表；写操作乐观更新 + 局部回拉 ───
import { useCallback, useMemo } from "react";
import { buildInfluencers } from "../lib/crm/buildInfluencers.js";
import { withComputedStatus } from "../lib/crm/crmFlow.js";
import { createInfluencer, updateInfluencer, deleteInfluencers, setInfluencerStatus } from "../lib/supabase/collabsWrite.js";
import { createStaff } from "../lib/supabase/staff.js";

export function useCRM(storeId, core, products) {
  const { collabs, creators, videos, staff, loading, error } = core;
  const { refresh, refreshRows, patchRow, removeRows, upsertRows } = core;

  const productById   = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.internal_name])), [products]);
  const productByName = useMemo(() => Object.fromEntries(products.map((p) => [p.internal_name, p])), [products]);

  // 纯内存派生：切 tab / 改产品名都不再发请求
  const influencers = useMemo(
    () => buildInfluencers(collabs, creators, videos, productById),
    [collabs, creators, videos, productById]
  );

  /** 写库后只回拉这一条合作记录和它的达人 */
  const syncOne = useCallback(async (collabId) => {
    const [row] = await refreshRows("collabs", [collabId]);
    if (row?.creator_id) await refreshRows("creators", [row.creator_id]);
  }, [refreshRows]);

  const save = useCallback(async (inf) => {
    const prod = productByName[inf.product];
    if (!prod) throw new Error(`产品「${inf.product}」不存在，请先在产品库建档`);
    const isEdit = inf.id && inf.id !== inf.influencerId;
    const id = isEdit ? inf.id : await createInfluencer(storeId, inf, prod.id);
    if (isEdit) await updateInfluencer(storeId, inf, prod.id);
    await syncOne(id);
    if (!isEdit && inf.creatorSource === "auto_invite") refresh(["invites"]);
  }, [storeId, productByName, syncOne, refresh]);

  /** 行内改状态：先改界面，失败回滚 */
  const updateStatus = useCallback(async (inf, picked) => {
    const next = withComputedStatus(inf, picked).baseStatus;
    const prev = inf.baseStatus;
    patchRow("collabs", inf.id, { status: next, status_manual: true });
    try { await setInfluencerStatus(inf.id, next); }
    catch (e) { patchRow("collabs", inf.id, { status: prev }); throw e; }
  }, [patchRow]);

  /** 删除（单条/批量）：先从界面移除，失败则整表回拉恢复；成功后后台刷新视频归属 */
  const bulkRemove = useCallback(async (ids) => {
    const list = [...ids];
    removeRows("collabs", list);
    try { await deleteInfluencers(list); refresh(["videos"]); }
    catch (e) { refresh(["collabs"]); throw e; }
  }, [removeRows, refresh]);
  const remove = useCallback((id) => bulkRemove([id]), [bulkRemove]);

  const addStaff = useCallback(async (name) => {
    const s = await createStaff(storeId, name);
    upsertRows("staff", [s]);
    return s;
  }, [storeId, upsertRows]);

  return { influencers, staff, loading, error, reload: refresh, save, remove, updateStatus, bulkRemove, addStaff };
}
