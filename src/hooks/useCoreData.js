// ─── 核心数据中心：登录后并行拉一次，全站共享；写操作只做局部同步 ─────────
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CORE_KEYS, fetchCoreTable, fetchCoreRows } from "../lib/supabase/core.js";

const EMPTY = Object.fromEntries(CORE_KEYS.map((k) => [k, []]));

export function useCoreData(storeId) {
  const [data,    setData]    = useState(EMPTY);
  const [loading, setLoading] = useState(true);   // 只在首次加载为 true
  const [syncing, setSyncing] = useState(false);  // 后台刷新中（不阻塞界面）
  const [error,   setError]   = useState(null);
  const liveStore = useRef(storeId);

  /** 静默刷新指定表（默认全部）；刷新期间旧数据照常显示 */
  const refresh = useCallback(async (keys = CORE_KEYS) => {
    if (!storeId) return;
    setSyncing(true);
    try {
      const rows = await Promise.all(keys.map((k) => fetchCoreTable(k, storeId)));
      if (liveStore.current !== storeId) return;   // 期间切了店铺，丢弃
      setData((d) => ({ ...d, ...Object.fromEntries(keys.map((k, i) => [k, rows[i]])) }));
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setSyncing(false); setLoading(false); }
  }, [storeId]);

  useEffect(() => {
    liveStore.current = storeId;
    setData(EMPTY); setLoading(true);
    refresh();
  }, [refresh, storeId]);

  /** 新增或替换若干行（按 id） */
  const upsertRows = useCallback((key, rows) => setData((d) => {
    const byId = new Map(rows.map((r) => [r.id, r]));
    const kept = d[key].map((r) => byId.get(r.id) ?? r);
    const known = new Set(d[key].map((r) => r.id));
    return { ...d, [key]: [...rows.filter((r) => !known.has(r.id)), ...kept] };
  }), []);

  /** 局部改字段（乐观更新用） */
  const patchRow = useCallback((key, id, patch) => setData((d) => ({
    ...d, [key]: d[key].map((r) => (r.id === id ? { ...r, ...patch } : r)),
  })), []);

  const removeRows = useCallback((key, ids) => {
    const drop = new Set(ids);
    setData((d) => ({ ...d, [key]: d[key].filter((r) => !drop.has(r.id)) }));
  }, []);

  /** 写库后按 id 回拉这几行，替换内存 */
  const refreshRows = useCallback(async (key, ids) => {
    const rows = await fetchCoreRows(key, ids);
    upsertRows(key, rows);
    return rows;
  }, [upsertRows]);

  return useMemo(() => ({
    ...data, loading, syncing, error,
    refresh, upsertRows, patchRow, removeRows, refreshRows,
  }), [data, loading, syncing, error, refresh, upsertRows, patchRow, removeRows, refreshRows]);
}
