// ─── 通用纯工具函数（日期相关一律在 lib/dates.js、lib/cycle.js）────────────────

/** 统一字符串格式：小写 + 去空格 + 去括号，用于模糊匹配 */
export function normalize(str) {
  return (str || "").toLowerCase().replace(/\s+/g, "").replace(/[（(）)]/g, "");
}

/** 安全除法：分母为 0 时返回 null */
export const safeDiv = (a, b) => (b ? a / b : null);
