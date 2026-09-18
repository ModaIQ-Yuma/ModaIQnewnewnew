// ─── 店铺上下文：用户可访问的店铺、当前激活店铺、角色 ────────────────────────
// 输出给 App 与所有模块：{ stores, activeStore, role, isAdmin, switchStore, reload, checked }
import { useCallback, useEffect, useState } from "react";
import { fetchUserStores } from "../lib/supabase/auth.js";
import { LS } from "../constants/config.js";

export function useStoreContext(userId) {
  const [stores, setStores]   = useState([]);
  const [activeId, setActive] = useState(null);
  const [checked, setChecked] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) { setStores([]); setActive(null); setChecked(true); return; }
    setChecked(false);
    try {
      const list = await fetchUserStores(userId);
      setStores(list);
      const saved = localStorage.getItem(LS.activeStore);
      const pick = list.find((s) => s.store_id === saved) || list[0];
      setActive(pick?.store_id || null);
    } catch (e) {
      console.error(e); setStores([]); setActive(null);
    }
    setChecked(true);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  const switchStore = useCallback((id) => {
    localStorage.setItem(LS.activeStore, id);
    setActive(id);
  }, []);

  const activeStore = stores.find((s) => s.store_id === activeId) || null;
  const role = activeStore?.role || null;

  return {
    stores, activeStore, activeStoreId: activeId, role,
    isAdmin: role === "admin", isSuperAdmin: !!activeStore?.superAdmin,
    switchStore, reload, checked,
  };
}
