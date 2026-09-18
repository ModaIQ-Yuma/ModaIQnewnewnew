// hooks/useUnconnected.js
import { useState, useEffect, useCallback } from "react";
import { fetchUnconnected } from "../lib/supabase/unconnected.js";
import { sb, unwrap } from "../lib/supabase/client.js";

/** userId(auth) → staff.id，找不到返回 null */
async function resolveStaffId(storeId, userId) {
  if (!userId) return null;
  const row = unwrap(
    await sb.from("staff").select("id").eq("store_id", storeId).eq("auth_user_id", userId).maybeSingle(),
    "staff"
  );
  return row?.id ?? null;
}

export function useUnconnected(storeId, userId) {
  const [records, setRecords] = useState([]);
  const [staffId, setStaffId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [data, sid] = await Promise.all([
        fetchUnconnected(storeId),
        resolveStaffId(storeId, userId),
      ]);
      setRecords(data ?? []);
      setStaffId(sid);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [storeId, userId]);

  useEffect(() => { load(); }, [load]);

  return { records, staffId, loading, error, reload: load };
}
