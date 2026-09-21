// ─── 通用纯工具函数 ───────────────────────────────────────────────────────────

/** 统一字符串格式：小写 + 去空格 + 去括号，用于模糊匹配 */
export function normalize(str) {
  return (str || "").toLowerCase().replace(/\s+/g, "").replace(/[（(）)]/g, "");
}

/** 两个产品名是否模糊匹配（任一方包含另一方即匹配） */
export function matchProduct(a, b) {
  if (!a || !b) return false;
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}


/** 今天的东八区日期 YYYY-MM-DD */
export function todayCST() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
}

/** 今天的 GMT-8（美西）日期 YYYY-MM-DD */
export function todayPST() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" });
}

/**
 * 把 dateFrom/dateTo（YYYY-MM-DD）转成 GMT-8 闭区间的 timestamptz 字符串
 * 用于 Supabase timestamptz 列的查询（published_at、added_at 等）
 */
export function pstRange(dateFrom, dateTo) {
  return {
    gte: `${dateFrom}T00:00:00-08:00`,
    lte: `${dateTo}T23:59:59-08:00`,
  };
}

/**
 * 选「YYYY-MM」→ 寄样账期（上月15日 ～ 本月14日，含两端）
 * 返回 { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
 */
export function shipRange(ym) {
  const [y, m] = ym.split("-").map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  const pad = (n) => String(n).padStart(2, "0");
  return { from: `${py}-${pad(pm)}-15`, to: `${y}-${pad(m)}-14` };
}

/**
 * 选「YYYY-MM」→ 视频自然月（本月01日 ～ 本月最后一日，含两端）
 * 返回 { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
 */
export function videoRange(ym) {
  const [y, m] = ym.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const pad = (n) => String(n).padStart(2, "0");
  return { from: `${ym}-01`, to: `${ym}-${pad(lastDay)}` };
}

/** 生成连续月份列表 ["2026-01", "2026-02", ...] */
export function monthsBetween(fromYm, toYm) {
  const list = [];
  let [y, m] = fromYm.split("-").map(Number);
  const [ey, em] = toYm.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    list.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 13) { m = 1; y++; }
  }
  return list;
}

/** 安全除法：分母为 0 时返回 null */
export const safeDiv = (a, b) => (b ? a / b : null);

/** 把各种格式日期归一化为 YYYY-MM-DD，失败返回 null */
export function parseDate(str) {
  if (!str) return null;
  const s = String(str).trim().replace(/\//g, "-").split(" ")[0]; // 去掉可能的时间部分
  const parts = s.split("-");
  if (parts.length !== 3) {
    const d0 = new Date(s);
    return isNaN(d0.getTime()) ? null : d0.toLocaleDateString("sv-SE");
  }
  if (parts[0].length === 2) parts[0] = "20" + parts[0];
  const normed = parts.map((p, i) => (i === 0 ? p : p.padStart(2, "0"))).join("-");
  const d = new Date(normed);
  return isNaN(d.getTime()) ? null : normed;
}

/**
 * 寄样端的"自然月"默认区间（闭区间）：上月15日 ~ 本月14日
 * 用作复盘寄样区间选择器的默认预设；可被用户改。
 * @param {string} monthStr "YYYY-MM"
 * @returns {{ start: string, end: string, label: string }}
 */
export function monthlyShipRange(monthStr) {
  if (!monthStr) return { start: "", end: "", label: "" };
  const [y, m] = monthStr.split("-").map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  const pad = (n) => String(n).padStart(2, "0");
  const start = `${py}-${pad(pm)}-15`;
  const end   = `${y}-${pad(m)}-14`;
  return { start, end, label: `${py}年${pm}月15日 ～ ${y}年${m}月14日` };
}
