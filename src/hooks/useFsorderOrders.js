// ─── FSorder 整店订单（单品复盘自动填「月度总出单 / 自然流量单」）────────────
import { fsorderEnabled, fetchFSorderOrders } from "../lib/supabase/fsorder.js";
import { useAsyncData } from "./useAsyncData.js";

/**
 * @param window { from, to } 为空则不拉    @param skuId 单品的商品 ID；null = 全部商品合计
 * @returns { enabled, data: { totalOrders, organicOrders } | null, loading, error }
 */
export function useFsorderOrders(storeId, window, skuId) {
  const enabled = fsorderEnabled(storeId);
  const key = enabled && window?.from && window?.to ? `${window.from}|${window.to}|${skuId ?? "all"}` : null;
  const { data, loading, error } = useAsyncData(async () => {
    const bySku = await fetchFSorderOrders(window.from, window.to, skuId ? [skuId] : null);
    if (skuId) return bySku.get(String(skuId)) || null;
    let totalOrders = 0, organicOrders = 0;
    for (const v of bySku.values()) { totalOrders += v.totalOrders; organicOrders += v.organicOrders; }
    return bySku.size ? { totalOrders, organicOrders } : null;
  }, key);
  return { enabled, data, loading, error };
}
