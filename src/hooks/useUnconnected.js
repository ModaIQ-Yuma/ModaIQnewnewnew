// hooks/useUnconnected.js
import { useState, useEffect, useCallback } from "react";
import { fetchUnconnected } from "../lib/supabase/unconnected.js";

export function useUnconnected(storeId, userId) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = await fetchUnconnected(storeId);
      setRecords(data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  return { records, loading, error, reload: load };
}
