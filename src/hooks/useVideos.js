// hooks/useVideos.js
import { useState, useEffect, useCallback } from "react";
import { fetchVideos, fetchBatches } from "../lib/supabase/videos.js";

export function useVideos(storeId) {
  const [videos,   setVideos]   = useState([]);
  const [batches,  setBatches]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true); setError(null);
    try {
      const [v, b] = await Promise.all([fetchVideos(storeId), fetchBatches(storeId)]);
      setVideos(v ?? []); setBatches(b ?? []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  return { videos, batches, loading, error, reload: load };
}
