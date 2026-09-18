// ─── 展示状态计算（纯函数，无副作用）────────────────────────────────────────
// 规则：终态人工优先；否则按视频 + 出单 实时算
import { TERMINAL_STATUSES } from "../../constants/crm.js";
import { REPOST_THRESHOLD_ORDERS } from "../../constants/config.js";

/**
 * @param collab  collaborations 行
 * @param videos  该合作下的 video_records（可为空数组）
 * @returns 展示状态字符串
 */
export function calcDisplayStatus(collab, videos = []) {
  if (TERMINAL_STATUSES.includes(collab.status_manual)) return collab.status_manual;
  const cumOrders = videos.reduce((s, v) => s + (v.orders || 0), 0);
  if (cumOrders > REPOST_THRESHOLD_ORDERS) return "待复投";
  if (videos.length > 0) return "已发布";
  return collab.status_manual || "已寄样";
}

/** 判断是否超期未发布（寄样超14天且无视频）*/
export function isOverdue(collab, videos = []) {
  if (videos.length > 0) return false;
  const days = (Date.now() - new Date(collab.ship_date).getTime()) / 864e5;
  return days > 14;
}
