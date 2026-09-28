// ─── 生成本周任务（纯函数）：催发 / 复投 / 激活，逻辑沿用旧版 ─────────────────
//   催发：寄样 14～30 天前、一条视频都没有 → 提醒跟进人催发
//   复投：寄样 3 个月内、这条寄样累计出单 ≥ 复投门槛 → 提醒是否再寄（每条寄样只提醒一次）
//   激活：FSorder 里「达人 + 产品」累计出单 ≥ 30 单，但 3 个月内没有新视频 → 提醒重新激活（只提醒一次）
//   只扫描接入日之后的寄样；截止日 = 本周五（已过周五则今天）
import { REPOST_THRESHOLD_ORDERS, TASK_SCAN_START, DORMANT_MIN_ORDERS } from "../../constants/config.js";
import { resolveName } from "../crm/identity.js";
import { addDays as shiftDays, addMonthsToDate as shiftMonths, weekdayOf, daysBetween } from "../dates.js";

/** 本周五（已过周五则今天）、本周一 */
export function weekDates(today) {
  const wd = weekdayOf(today);                    // 1=周一 … 7=周日
  const friday = shiftDays(today, (5 - wd + 7) % 7);
  return { due: wd === 6 ? today : friday, monday: shiftDays(today, -((wd + 6) % 7)) };
}

/**
 * @param p { today, collabs, videos, creators, nameIndex, products, existing(任务), dormant: [{ creator, sku, totalOrders }] }
 * @returns 要新建的任务行（不含 store_id）
 */
export function buildAutoTasks(p) {
  const { today, collabs, videos, creators, existing } = p;
  const { due, monday } = weekDates(today);
  const handleOf = new Map(creators.map((c) => [c.id, c.handle]));
  const productName = new Map(p.products.map((x) => [x.id, x.internal_name]));
  const orders = new Map(), hasVideo = new Set();
  for (const v of videos) if (v.collaboration_id) { hasVideo.add(v.collaboration_id); orders.set(v.collaboration_id, (orders.get(v.collaboration_id) || 0) + (v.orders || 0)); }
  const taskOf = (kind, collabId) => existing.filter((t) => t.kind === kind && t.collaboration_id === collabId);
  const label = (c) => `${handleOf.get(c.creator_id) || "?"} - ${productName.get(c.product_id) || ""}`;
  const base = (kind, c, title) => ({ kind, title, collaboration_id: c?.id || null, product_id: c?.product_id || null, staff_id: c?.staff_id || null, due_date: due, status: "open", is_auto: true });
  const scanned = collabs.filter((c) => c.ship_date && c.ship_date >= TASK_SCAN_START);
  const out = [];

  // 1. 催发：同一寄样已有未完成的催发、或本周已生成过 → 不重复
  const from30 = shiftDays(today, -30), to14 = shiftDays(today, -14);
  for (const c of scanned.filter((x) => x.ship_date >= from30 && x.ship_date <= to14 && !hasVideo.has(x.id))) {
    if (taskOf("催发", c.id).some((t) => t.status === "open" || (t.created_at || "").slice(0, 10) >= monday)) continue;
    const days = daysBetween(c.ship_date, today);
    out.push(base("催发", c, `【催发】${label(c)}｜${c.ship_date} 寄样，已 ${days} 天未发视频`));
  }

  // 2. 复投：每条寄样只提醒一次
  const from3m = shiftMonths(today, -3);
  for (const c of scanned.filter((x) => x.ship_date >= from3m && (orders.get(x.id) || 0) >= REPOST_THRESHOLD_ORDERS)) {
    if (taskOf("复投", c.id).length) continue;
    out.push(base("复投", c, `【复投】${label(c)}｜累计出单 ${orders.get(c.id)} 单，是否继续寄样`));
  }

  // 3. 激活（需接入 FSorder）：挂到该达人该产品最近一次寄样上；已提醒过的不再生成
  const skuToProduct = new Map(p.products.filter((x) => x.sku_id).map((x) => [String(x.sku_id), x.id]));
  const recentByCreatorProduct = new Set();
  const creatorOfCollab = new Map(collabs.map((c) => [c.id, c]));
  for (const v of videos) {
    const c = creatorOfCollab.get(v.collaboration_id);
    if (c && (v.published_at || "").slice(0, 10) >= from3m) recentByCreatorProduct.add(`${c.creator_id}|${c.product_id}`);
  }
  for (const d of (p.dormant || []).filter((x) => x.totalOrders >= DORMANT_MIN_ORDERS)) {
    const productId = skuToProduct.get(String(d.sku)), creatorId = resolveName(p.nameIndex, d.creator)?.creatorId;
    if (!productId || !creatorId || recentByCreatorProduct.has(`${creatorId}|${productId}`)) continue;
    const last = collabs.filter((c) => c.creator_id === creatorId && c.product_id === productId).sort((a, b) => b.ship_date.localeCompare(a.ship_date))[0];
    if (!last || taskOf("激活", last.id).length) continue;
    out.push(base("激活", last, `【激活】${label(last)}｜FSorder 累计出单 ${d.totalOrders} 单，3 个月无新视频`));
  }
  return out;
}
