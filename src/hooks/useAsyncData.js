// ─── 通用异步数据 hook：首次加载显示 loading，之后刷新静默进行（旧数据照常显示）
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * @param fetcher  () => Promise<any>
 * @param key      数据归属键（如 storeId）；变化时清空旧数据重新拉；为 null 时不拉
 */
export function useAsyncData(fetcher, key) {
  const [data,  setData]  = useState(null);
  const [error, setError] = useState(null);
  const reqId = useRef(0);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const reload = useCallback(async () => {
    if (key == null) return;
    const id = ++reqId.current;
    try {
      const d = await fetchRef.current();
      if (id === reqId.current) { setData(d); setError(null); }
    } catch (e) { if (id === reqId.current) setError(e.message); }
  }, [key]);

  useEffect(() => { setData(null); setError(null); reload(); }, [reload]);

  return { data, loading: key != null && data === null && !error, error, reload };
}
