// ─── CRM hook：从核心数据派生 influencer 列表；身份检查 + 保存 + 合并 ────────
import { useCallback, useMemo } from "react";
import { buildInfluencers, latestByCreator } from "../lib/crm/buildInfluencers.js";
import { buildNameIndex, checkIdentity, normName, resolveName } from "../lib/crm/identity.js";
import { buildShipmentPayload } from "../lib/crm/shipmentPayload.js";
import { withComputedStatus } from "../lib/crm/crmFlow.js";
import { saveShipment } from "../lib/supabase/crmSave.js";
import { deleteInfluencers, setInfluencerStatus } from "../lib/supabase/collabsWrite.js";
import { mergeCreators } from "../lib/supabase/creatorsWrite.js";

export function useCRM(storeId, core, products) {
  const { collabs, creators, aliases, videos, staff, loading, error } = core;
  const { refresh, refreshRows, patchRow, removeRows } = core;

  const productById   = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.internal_name])), [products]);
  const productByName = useMemo(() => Object.fromEntries(products.map((p) => [p.internal_name, p])), [products]);
  const creatorById   = useMemo(() => new Map(creators.map((c) => [c.id, c])), [creators]);
  const nameIndex     = useMemo(() => buildNameIndex(creators, aliases), [creators, aliases]);

  // 纯内存派生：切 tab / 改产品名都不再发请求
  const influencers = useMemo(
    () => buildInfluencers(collabs, creators, aliases, videos, productById),
    [collabs, creators, aliases, videos, productById]
  );
  const latest = useMemo(() => latestByCreator(influencers), [influencers]);

  const aliasesOf = useCallback((id) => aliases.filter((a) => a.creator_id === id).map((a) => normName(a.alias)), [aliases]);
  const handleOf  = useCallback((id) => creatorById.get(id)?.handle || "?", [creatorById]);

  /** 名字 → 达人 id（现名或别名，不分大小写） */
  const resolve = useCallback((name) => resolveName(nameIndex, name)?.creatorId || null, [nameIndex]);

  /**
   * 保存前检查身份。identity = { creatorId, oldHandle }：编辑时取自原记录；
   * 新录入时为空，或在「某达人改名」确认后传入该达人。
   */
  const check = useCallback((form, identity) => checkIdentity({
    creatorId: identity?.creatorId || null, oldHandle: identity?.oldHandle || null,
    handle: form.influencerId, aliases: form.aliases,
  }, nameIndex, handleOf), [nameIndex, handleOf]);

  /** 保存一条寄样。mergeIds = 用户已确认要并入当前达人的其他档案（先合并再保存） */
  const save = useCallback(async (form, initial, identity, mergeIds = []) => {
    const prod = productByName[form.product];
    if (!prod) throw new Error(`产品「${form.product}」不存在，请先在产品库建档`);
    const chk = check(form, identity || (initial && { creatorId: initial.creatorId, oldHandle: initial.influencerId }));
    if (chk.errors.length) throw new Error(chk.errors.join("；"));
    if (chk.mergeWith.some((id) => !mergeIds.includes(id))) throw new Error("存在需要合并的达人档案，请先确认合并");
    const existing = chk.creatorId ? creatorById.get(chk.creatorId) : null;
    for (const dropId of mergeIds) await mergeCreators(storeId, existing, creatorById.get(dropId));
    const payload = buildShipmentPayload({ form, initial, chk, existing, oldAliases: existing ? aliasesOf(existing.id) : [], productId: prod.id });
    const res = await saveShipment(storeId, payload);
    if (mergeIds.length) await refresh(["collabs", "creators", "aliases", "invites"]);
    else await Promise.all([refreshRows("collabs", [res.collabId]), refreshRows("creators", [res.creatorId]), refresh(["aliases"])]);
    if (res.pool?.owned || res.pool?.converted) refresh(["invites"]);
    return res;
  }, [storeId, productByName, check, creatorById, aliasesOf, refreshRows, refresh]);

  /** 行内改状态：先改界面，失败回滚 */
  const updateStatus = useCallback(async (inf, picked) => {
    const next = withComputedStatus(inf, picked).baseStatus;
    const prev = inf.baseStatus;
    patchRow("collabs", inf.id, { status: next, status_manual: true });
    try { await setInfluencerStatus(inf.id, next); }
    catch (e) { patchRow("collabs", inf.id, { status: prev }); throw e; }
  }, [patchRow]);

  /** 删除（单条/批量）：先从界面移除，失败则回拉恢复；成功后后台刷新视频归属 */
  const bulkRemove = useCallback(async (ids) => {
    const list = [...ids];
    removeRows("collabs", list);
    try { await deleteInfluencers(list); refresh(["videos"]); }
    catch (e) { refresh(["collabs"]); throw e; }
  }, [removeRows, refresh]);
  const remove = useCallback((id) => bulkRemove([id]), [bulkRemove]);

  return { influencers, latest, staff, loading, error, reload: refresh, resolve, check, save, handleOf, updateStatus, remove, bulkRemove };
}
