// ─── 任务中心界面用的小工具（日期、账期计算在 lib/dates.js、lib/cycle.js）────────

/** 甘特图格子的唯一键：产品 id + 半月 key（选中、查找、批量写入都用它，保证三处一致） */
export const cellKey = (productId, colKey) => `${productId}__${colKey}`;
