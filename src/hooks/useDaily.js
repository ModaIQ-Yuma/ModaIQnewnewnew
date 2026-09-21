// hooks/useDaily.js
import { useState, useEffect, useCallback } from "react";
import { fetchDailyShipments, fetchDailyVideos, fetchDailyInvites } from "../lib/supabase/daily.js";

export function useDaily(storeId, dateFrom, dateTo) {
  const [shipments, setShipments] = useState([]);
  const [videos,    setVideos]    = useState([]);
  const [invites,   setInvites]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const load = useCallback(async () => {
    if (!storeId || !dateFrom || !dateTo) return;
    setLoading(true); setError(null);
    try {
      const [s, v, i] = await Promise.all([
        fetchDailyShipments(storeId, dateFrom, dateTo),
        fetchDailyVideos(storeId, dateFrom, dateTo),
        fetchDailyInvites(storeId, dateFrom, dateTo),
      ]);
      setShipments(s); setVideos(v); setInvites(i);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [storeId, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  return { shipments, videos, invites, loading, error, reload: load };
}
