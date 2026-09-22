// hooks/useTasks.js
import { useState, useEffect, useCallback } from "react";
import { fetchShippingGoals, fetchGanttStrategies, fetchWeeklyMenus } from "../lib/supabase/taskData.js";
import { fetchTasks } from "../lib/supabase/tasks.js";

export function useTasks(storeId) {
  const [goals,   setGoals]   = useState([]);
  const [gantt,   setGantt]   = useState([]);
  const [menus,   setMenus]   = useState([]);
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true); setError(null);
    try {
      const [g, gs, m, t] = await Promise.all([
        fetchShippingGoals(storeId),
        fetchGanttStrategies(storeId),
        fetchWeeklyMenus(storeId),
        fetchTasks(storeId),
      ]);
      setGoals(g ?? []);
      setGantt(gs ?? []);
      setMenus(m ?? []);
      setTasks(t ?? []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  return { goals, gantt, menus, tasks, loading, error, reload: load };
}
