// hooks/useReview.js
import { useState, useEffect, useCallback } from "react";
import {
  fetchCollabsForReview,
  fetchVideosForReview,
  fetchCreatorsForReview,
  fetchInvitesForReview,
  fetchGradeSnapshots,
  fetchStoreSnapshots,
} from "../lib/supabase/review.js";

export function useReview(storeId) {
  const [collabs,        setCollabs]        = useState([]);
  const [videos,         setVideos]         = useState([]);
  const [creators,       setCreators]       = useState([]);
  const [invites,        setInvites]        = useState([]);
  const [gradeSnapshots, setGradeSnapshots] = useState([]);
  const [storeSnapshots, setStoreSnapshots] = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true); setError(null);
    try {
      const [c, v, cr, inv, gs, ss] = await Promise.all([
        fetchCollabsForReview(storeId),
        fetchVideosForReview(storeId),
        fetchCreatorsForReview(storeId),
        fetchInvitesForReview(storeId),
        fetchGradeSnapshots(storeId),
        fetchStoreSnapshots(storeId),
      ]);
      setCollabs(c ?? []);
      setVideos(v ?? []);
      setCreators(cr ?? []);
      setInvites(inv ?? []);
      setGradeSnapshots(gs ?? []);
      setStoreSnapshots(ss ?? []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  return {
    collabs, videos, creators, invites,
    gradeSnapshots, storeSnapshots,
    loading, error, reload: load,
  };
}
