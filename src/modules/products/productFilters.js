// ─── 产品筛选纯函数（无 React）───────────────────────────────────────────────

export function filterProducts(products, { search = "", status = "", isNew = null }) {
  const q = search.trim().toLowerCase();
  return products.filter((p) => {
    if (status && p.status !== status) return false;
    if (isNew !== null && p.is_new !== isNew) return false;
    if (!q) return true;
    return [p.internal_name, p.product_title, p.sku_id].some((v) => String(v || "").toLowerCase().includes(q));
  });
}

export function countByStatus(products, statuses) {
  return Object.fromEntries(statuses.map((s) => [s, products.filter((p) => p.status === s).length]));
}

/** 校验：内部名 / sku_id 在店内唯一（编辑时排除自身） */
export function findDuplicate(products, { internal_name, sku_id }, excludeId = null) {
  const name = internal_name.trim().toLowerCase();
  const sku  = sku_id.trim();
  return products.find((p) =>
    p.id !== excludeId &&
    (p.internal_name.toLowerCase() === name || (sku && p.sku_id === sku))
  ) || null;
}
