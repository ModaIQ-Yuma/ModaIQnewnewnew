// ─── 助理复盘（纯函数）：每个助理的寄样 / 履约 / 出单 / 视频 / 邀约，附合计行 ───
import { safeDiv } from "../utils.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";
import { within, ordersByCollab } from "./rangeCalc.js";

const blank = () => ({ shipCount: 0, fulfillCount: 0, withSalesCount: 0, shipOrders: 0, videoCount: 0, videoOrders: 0, burstCount: 0, inviteCount: 0 });
const finish = (r) => ({
  ...r,
  fulfillRate: safeDiv(r.fulfillCount, r.shipCount), saleRate: safeDiv(r.withSalesCount, r.fulfillCount),
  sampleSalesRatio: safeDiv(r.shipOrders, r.shipCount),
});

/**
 * @param p { collabs, videos, invites, staff, productId?, ship, video, burst? }
 *   寄样/履约/出单/样销比：寄样区间内的寄样，看其全部视频（不限发布时间，与单品复盘口径一致）
 *   视频数/视频出单/爆单：视频区间内发布、归属该助理寄样的视频
 *   邀约录入：视频区间内录入邀约库的条数（录入人账号 → 助理）
 * @returns { rows: [...按寄样数降序], total }
 */
export function calcStaffOverview(p) {
  const burst = p.burst ?? BURST_ORDER_THRESHOLD;
  const pick = (arr) => (p.productId ? arr.filter((x) => x.product_id === p.productId) : arr);
  const collabs = pick(p.collabs), allVideos = pick(p.videos);
  const videos = allVideos.filter((x) => within(x.published_at?.slice(0, 10), p.video));
  const cum = ordersByCollab(allVideos);
  const staffOfCollab = new Map(collabs.map((c) => [c.id, c.staff_id || "unknown"]));
  const staffOfUser = new Map((p.staff || []).flatMap((s) => [[s.id, s.id], ...(s.auth_user_id ? [[s.auth_user_id, s.id]] : [])]));
  const map = {};
  const row = (id) => (map[id] ||= { staffId: id, ...blank() });

  for (const x of videos) {
    if (!x.collaboration_id || !staffOfCollab.has(x.collaboration_id)) continue;
    const r = row(staffOfCollab.get(x.collaboration_id));
    r.videoCount++; r.videoOrders += x.orders || 0; if ((x.orders || 0) >= burst) r.burstCount++;
  }
  for (const c of collabs.filter((x) => within(x.ship_date, p.ship))) {
    const r = row(c.staff_id || "unknown");
    r.shipCount++;
    if (cum.has(c.id)) { r.fulfillCount++; r.shipOrders += cum.get(c.id); if (cum.get(c.id) >= 1) r.withSalesCount++; }
  }
  for (const inv of pick(p.invites || [])) {
    if (!within(inv.added_at?.slice(0, 10), p.video)) continue;
    row(staffOfUser.get(inv.added_by) || "unknown").inviteCount++;
  }

  const rows = Object.values(map).map(finish).sort((a, b) => b.shipCount - a.shipCount);
  const total = finish(rows.reduce((t, r) => { for (const k of Object.keys(blank())) t[k] += r[k]; return t; }, { staffId: "total", ...blank() }));
  return { rows, total };
}
