// ─── 任务中心数据（目标 / 甘特 / 周日程 / 行动任务）；任务中心与绩效共用一份 ─
import { fetchShippingGoals, fetchGanttStrategies, fetchWeeklyMenus, fetchChangeLogs } from "../lib/supabase/taskData.js";
import { fetchTasks } from "../lib/supabase/tasks.js";
import { useAsyncData } from "./useAsyncData.js";

export function useTasks(storeId) {
  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const [goals, gantt, menus, tasks, changeLogs] = await Promise.all([
        fetchShippingGoals(storeId), fetchGanttStrategies(storeId), fetchWeeklyMenus(storeId), fetchTasks(storeId), fetchChangeLogs(storeId),
      ]);
      return { goals: goals ?? [], gantt: gantt ?? [], menus: menus ?? [], tasks: tasks ?? [], changeLogs: changeLogs ?? [] };
    },
    storeId
  );
  return {
    goals: data?.goals ?? [], gantt: data?.gantt ?? [], menus: data?.menus ?? [], tasks: data?.tasks ?? [],
    changeLogs: data?.changeLogs ?? [],
    loading, error, reload,
  };
}
