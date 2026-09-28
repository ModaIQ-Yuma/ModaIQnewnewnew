// ─── 「⚡ 生成本周任务」：算出要建的任务（lib/tasks/autoTasks.js）并批量写入 ──
import { useCallback, useState } from "react";
import { buildAutoTasks } from "../lib/tasks/autoTasks.js";
import { buildNameIndex } from "../lib/crm/identity.js";
import { createTasks } from "../lib/supabase/tasks.js";
import { fsorderEnabled, fetchFSorderCreatorTotals } from "../lib/supabase/fsorder.js";

const todayPST = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" });

export function useTaskGenerator({ storeId, core, products, tasks, onDone }) {
  const [busy, setBusy] = useState(false);

  /** @returns { total, 催发, 复投, 激活 } */
  const generate = useCallback(async () => {
    setBusy(true);
    try {
      const dormant = fsorderEnabled(storeId) ? await fetchFSorderCreatorTotals() : [];
      const rows = buildAutoTasks({
        today: todayPST(), collabs: core.collabs, videos: core.videos, creators: core.creators,
        nameIndex: buildNameIndex(core.creators, core.aliases), products, existing: tasks, dormant,
      });
      await createTasks(storeId, rows);
      onDone?.();
      const n = (k) => rows.filter((r) => r.kind === k).length;
      return { total: rows.length, 催发: n("催发"), 复投: n("复投"), 激活: n("激活") };
    } finally { setBusy(false); }
  }, [storeId, core, products, tasks, onDone]);

  return { busy, generate };
}
