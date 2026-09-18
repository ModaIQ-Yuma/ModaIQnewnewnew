// ─── 产品状态枚举与颜色（业务口径：constants 只放枚举，逻辑不在此）────────────
export const PRODUCT_STATUSES = ["爆款", "合格款", "可卖款", "撤退款", "测款"];

export const PS_COLORS = {
  "爆款":   "#DC2626",
  "合格款": "#0D9E6A",
  "可卖款": "#5B8DEF",
  "测款":   "#E8923B",
  "撤退款": "#A89098",
};

// 新品 / 老品筛选项
export const PRODUCT_TYPES = [
  { label: "新品", value: true,  color: "#0E9E70" },
  { label: "老品", value: false, color: "#E8923B" },
];
