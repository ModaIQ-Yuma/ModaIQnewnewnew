// ─── 产品库数据 hook：拉取 + 乐观更新 + 错误收集 ─────────────────────────────
import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "../lib/supabase/products.js";
import { sortProducts } from "../lib/products/productOrder.js";

export function useProducts(storeId) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const reload = useCallback(async () => {
    if (!storeId) return;
    setLoading(true); setError(null);
    try { setProducts(await api.fetchProducts(storeId)); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { reload(); }, [reload]);

  const create = useCallback(async (fields) => {
    const row = await api.createProduct(storeId, fields);
    setProducts((ps) => [row, ...ps]);
    return row;
  }, [storeId]);

  const update = useCallback(async (id, patch) => {
    const row = await api.updateProduct(id, patch);
    setProducts((ps) => ps.map((p) => (p.id === id ? row : p)));
    return row;
  }, []);

  const remove = useCallback(async (id) => {
    await api.deleteProduct(id);
    setProducts((ps) => ps.filter((p) => p.id !== id));
  }, []);

  // 对外统一给排好序的列表（爆款 → 合格款 → 可卖款 → 撤退款 → 测款），全站下拉/分组自动一致
  const sorted = useMemo(() => sortProducts(products), [products]);

  return { products: sorted, loading, error, reload, create, update, remove };
}
