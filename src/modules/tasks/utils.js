// ─── 纯函数工具（无 I/O、无副作用）──────────────────────────────────────────────

/** 本地日期格式化 YYYY-MM-DD（toISOString 会转 UTC，在中国时区会差 8 小时导致日期错位，全部用这个）*/
function fmtLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 当前周期开始日（每月15号）*/
export function currentCycleStart(now = new Date()) {
  const d = now.getDate();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (d >= 15) return fmtLocal(new Date(y, m, 15));
  const pm = m === 0 ? 11 : m - 1;
  const py = m === 0 ? y - 1 : y;
  return fmtLocal(new Date(py, pm, 15));
}
export function cycleEnd(start) {
  const [y, m, dd] = start.split('-').map(Number);
  return fmtLocal(new Date(y, m, 14)); // 下月14号（m 是 0-based+1 正好进位）
}
export function prevCycleStart(start) {
  const [y, m] = start.split('-').map(Number);
  return fmtLocal(new Date(y, m - 2, 15));
}
export function nextCycleStart(start) {
  const [y, m] = start.split('-').map(Number);
  return fmtLocal(new Date(y, m, 15));
}

/** 现算某品在某周期的已寄数 */
export function calcDoneQty(influencers, internalName, cycleStart, cycleEnd) {
  return influencers.filter(i =>
    i.product === internalName &&
    i.shipDate >= cycleStart &&
    i.shipDate <= cycleEnd
  ).length;
}

/** 按助理过滤已寄数 */
export function calcDoneByStaff(influencers, internalName, cycleStart, cycleEnd, staffId) {
  return influencers.filter(i =>
    i.product === internalName &&
    i.shipDate >= cycleStart &&
    i.shipDate <= cycleEnd &&
    String(i.staffId) === String(staffId)
  ).length;
}

/** 本周周一日期 */
export function thisWeekMonday(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return fmtLocal(d);
}
export function prevWeekMonday(monday) {
  const [y, m, dd] = monday.split('-').map(Number);
  return fmtLocal(new Date(y, m - 1, dd - 7));
}
export function nextWeekMonday(monday) {
  const [y, m, dd] = monday.split('-').map(Number);
  return fmtLocal(new Date(y, m - 1, dd + 7));
}

/** 当前YYYY-MM */
export function currentYearMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** 半月列 key：'2026-07-H1'（1-14号）| '2026-07-H2'（15号-月底）*/
export function currentHalfKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-${now.getDate() < 15 ? 'H1' : 'H2'}`;
}

/** 从 viewStart（YYYY-MM）起生成 n 个月 × 2 的半月列 */
export function halfMonthColumns(viewStart, monthCount = 3) {
  const [y, mo] = viewStart.split('-').map(Number);
  const cols = [];
  for (let i = 0; i < monthCount; i++) {
    const mm = mo + i;
    const yy = y + Math.floor((mm - 1) / 12);
    const month = ((mm - 1) % 12) + 1;
    const ym = `${yy}-${String(month).padStart(2, '0')}`;
    cols.push({ key: `${ym}-H1`, ym, half: 'H1', label: `${month}月上` });
    cols.push({ key: `${ym}-H2`, ym, half: 'H2', label: `${month}月下` });
  }
  return cols;
}

export function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const mm = m + delta;
  const yy = y + Math.floor((mm - 1) / 12);
  const month = ((mm - 1) % 12) + 1;
  return `${yy}-${String(month).padStart(2, '0')}`;
}

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}`;
}

export function daysRemaining(cycleEnd) {
  const diff = new Date(cycleEnd) - new Date();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export function timePct(cycleStart, cycleEnd) {
  const total = new Date(cycleEnd) - new Date(cycleStart);
  const elapsed = new Date() - new Date(cycleStart);
  return Math.min(1, Math.max(0, elapsed / total));
}

/** 本地今天 YYYY-MM-DD */
export function todayLocal(now = new Date()) {
  return fmtLocal(now);
}

/**
 * 根据半月 key（如 '2026-07-H2' / '2026-08-H1'）推算它属于哪个周期的 cycleStart。
 * 周期规则：每月 15 号开始，到下月 14 号结束。
 *   H2（15号起）→ 本月 15 号就是 cycleStart
 *   H1（1-14号）→ 属于上月开始的周期，cycleStart = 上月 15 号
 */
export function halfKeyToCycleStart(colKey) {
  // colKey 格式：'YYYY-MM-H1' 或 'YYYY-MM-H2'
  const [y, m, half] = colKey.split('-');
  const year = Number(y);
  const month = Number(m); // 1-based
  if (half === 'H2') {
    // 本月 15 号
    return fmtLocal(new Date(year, month - 1, 15));
  } else {
    // H1：属于上月 15 号开始的周期
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;
    return fmtLocal(new Date(prevYear, prevMonth - 1, 15));
  }
}

export function uid() {
  return Date.now() + Math.random().toString(36).slice(2, 7);
}

/**
 * 从 AI 原始返回文本中提取 JSON 对象。
 * 兜底处理：剥掉 markdown 代码块、前言文字、后缀说明，只取 { ... } 部分。
 */
export function extractJsonFromAIResponse(rawText) {
  if (!rawText) throw new Error('AI 返回为空');

  // 1. 剥掉 markdown 代码块标记
  let cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // 2. 定位第一个 { 到最后一个 }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error('AI 返回不含合法 JSON 结构');
  }

  const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);

  // 3. 尝试解析
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('AI 返回的 JSON 解析失败：' + e.message);
  }
}

/** 甘特图格子的唯一键：产品 id + 半月 key（选中、查找、批量写入都用它，保证三处一致） */
export const cellKey = (productId, colKey) => `${productId}__${colKey}`;
