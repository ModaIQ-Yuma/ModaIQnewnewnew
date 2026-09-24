// ─── 保存月度快照（全站唯一入口）：统一按「截止 M+1 月 5 日」口径 ─────────────
// 等级复盘、单品月报、本月提醒、补存历史都走这里，保证快照数字口径一致。
import { useCallback, useState } from "react";
import { ORDER_WINDOW_TAIL_DAYS } from "../constants/config.js";
import { fetchImportLedger } from "../lib/supabase/videos.js";
import { fsorderEnabled, fetchFSorderOrders } from "../lib/supabase/fsorder.js";
import { cutoffOf } from "../lib/video/cutoff.js";
import { saveProductSnapshots } from "../lib/supabase/reviewWrite.js";
import { planMonthSnapshot } from "../lib/review/snapshotPlan.js";

export function useSnapshotSaver({ storeId, userId, products, collabs, videos, onSaved }) {
  const [busy, setBusy] = useState(false);

  /** 某月每个产品的整店订单：FSorder（M 月 1 日 ~ 截止日，与视频口径一致）+ 手填覆盖 */
  const monthOrders = useCallback(async (ym, list, manual = {}) => {
    const out = new Map();
    if (fsorderEnabled(storeId)) {
      const bySku = await fetchFSorderOrders(`${ym}-01`, cutoffOf(ym, ORDER_WINDOW_TAIL_DAYS), list.map((p) => p.sku_id).filter(Boolean));
      for (const p of list) if (bySku.has(String(p.sku_id))) out.set(p.id, bySku.get(String(p.sku_id)));
    }
    for (const [pid, o] of Object.entries(manual)) out.set(pid, o);
    return out;
  }, [storeId]);

  /**
   * @param yms   要保存的月份列表
   * @param opts  { productIds?: 只存这些产品, confirmIncomplete?: (plan, ym) => bool 数据没导到截止日时是否仍保存,
   *                manualOrders?: { [productId]: { totalOrders, organicOrders } } 手填的整店订单（优先于 FSorder） }
   * @returns { saved: [ym], skipped: [{ ym, dataTo, cutoff }] }
   */
  const saveMonths = useCallback(async (yms, opts = {}) => {
    setBusy(true);
    try {
      const ledger = await fetchImportLedger(storeId);
      const list = opts.productIds ? products.filter((p) => opts.productIds.includes(p.id)) : products;
      const res = { saved: [], skipped: [] };
      for (const ym of yms) {
        const orders = await monthOrders(ym, list, opts.manualOrders);
        const plan = planMonthSnapshot({ ym, products: list, collabs, videos, ledger, cutoffDay: ORDER_WINDOW_TAIL_DAYS, orders });
        if (plan.unknown.length) {
          throw new Error(`这些导入批次的文件名看不出数据区间：${plan.unknown.join("、")}。请撤销后把文件名改成「20260806到20260905所有视频」这种格式再导入`);
        }
        if (!plan.complete && !opts.confirmIncomplete?.(plan, ym)) { res.skipped.push({ ym, dataTo: plan.dataTo, cutoff: plan.cutoff }); continue; }
        await saveProductSnapshots(storeId, ym, plan.rows, userId);
        res.saved.push(ym);
      }
      if (res.saved.length) onSaved?.();
      return res;
    } finally { setBusy(false); }
  }, [storeId, userId, products, collabs, videos, onSaved, monthOrders]);

  return { busy, saveMonths };
}
