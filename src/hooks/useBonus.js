// ─── 月度提报数据：已提报 / 手填奖金 + 视频导入账本（还原截止日数据用）──────
// 写操作只改本地对应的行（乐观更新），不整板块重拉。
import { useCallback, useEffect, useState } from "react";
import { fetchBonusData, insertSubmissions, deleteSubmissions, insertExtra, deleteExtra } from "../lib/supabase/bonus.js";
import { fetchImportLedger } from "../lib/supabase/videos.js";

export function useBonus(storeId, userId) {
  const [data, setData] = useState({ submissions: [], extras: [], ledger: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [bonus, ledger] = await Promise.all([fetchBonusData(storeId), fetchImportLedger(storeId)]);
      setData({ ...bonus, ledger }); setError(null);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const patch = (key, fn) => setData((d) => ({ ...d, [key]: fn(d[key]) }));

  const submit = useCallback(async (rows) => {
    const added = await insertSubmissions(storeId, rows, userId);
    patch("submissions", (list) => [...list, ...added]);
    return added.length;
  }, [storeId, userId]);

  const undo = useCallback(async (ids) => {
    await deleteSubmissions(ids);
    const gone = new Set(ids);
    patch("submissions", (list) => list.filter((s) => !gone.has(s.id)));
  }, []);

  const addExtra = useCallback(async (row) => {
    const added = await insertExtra(storeId, row);
    patch("extras", (list) => [...list, added]);
  }, [storeId]);

  const removeExtra = useCallback(async (id) => {
    await deleteExtra(id);
    patch("extras", (list) => list.filter((e) => e.id !== id));
  }, []);

  return { ...data, loading, error, reload: load, submit, undo, addExtra, removeExtra };
}
