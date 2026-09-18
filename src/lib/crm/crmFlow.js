// ─── CRM 状态自动流转（纯函数，状态永远由当前数据派生）──────────────────────
// 设计（2026-07 重构）：
//   之前的方案是"只前进不回退"——crmStatus 是唯一字段，既存人工判断（待接触/已寄样/
//   复投完成/不合作），又存数据驱动的结果（已发布/待复投）。这导致撤销视频导入时，
//   必须靠批次历史里记的 _statusBefore 才能把状态"退"回去，一旦历史丢失/批次覆盖，
//   状态就卡住退不回去。
//
//   现在改成两个字段：
//     - baseStatus: 人工判断的基线状态（待接触 / 已寄样 / 复投完成 / 不合作），
//       只由人在 CRM 表格 / 达人录入面板里手动选择时写入，不受视频数据影响。
//     - crmStatus: 展示用的"当前实际状态"，任何时候都可以现算，不依赖历史：
//         · baseStatus 是终态（复投完成/不合作）→ 人工判断优先，直接就是终态
//         · 否则看当前 videoRecords：出单达标 → 待复投；有视频 → 已发布；
//           都没有 → 回落到 baseStatus
//
//   好处：撤销视频导入 / 手动删视频，只要把 videoRecords 改对，crmStatus 用
//   computeStatus 重新算一遍就自动是对的，不需要额外记"撤销前是什么状态"。

import { REPOST_THRESHOLD_ORDERS } from "../../constants/config.js";
import { TERMINAL_STATUSES } from "../../constants/crm.js";
import { cumOrders } from "./cumOrders.js";

// 这两个状态永远只能由数据算出来，不能被当成"人工基线"存下来——
// 哪怕是从下拉框手动选的、或者历史脏数据里就长这样，读到这两个值一律不采信。
// 这样即使之前已经把 baseStatus 污染成了"已发布"（比如手动点过一次下拉框），
// 也能在下次现算时自动纠正回来，不需要额外跑数据修复。
const AUTO_DERIVED_STATUSES = ["已发布", "待复投"];

/**
 * 老数据没有 baseStatus 字段、或 baseStatus 被污染成"已发布/待复投"时的兜底推断：
 *   - baseStatus 干净（不是自动态）→ 直接采信
 *   - baseStatus 缺失或被污染 → 退而看 crmStatus，crmStatus 干净就用它
 *   - 两边都不可信（都是自动态或都没有）→ 按业务惯例兜底为"已寄样"
 *     （能进到这一步说明这个达人历史上一定是有视频/出单驱动过状态的，不可能是"待接触"）
 */
function inferBaseStatus(inf) {
  const stored = inf?.baseStatus;
  if (stored && !AUTO_DERIVED_STATUSES.includes(stored)) return stored;
  const cur = inf?.crmStatus;
  if (cur && !AUTO_DERIVED_STATUSES.includes(cur)) return cur;
  return "已寄样";
}

/**
 * 纯计算：给定 baseStatus + 当前视频数据，算出"现在应该是什么状态"。
 * 不看历史、不看之前的 crmStatus，随时重算结果都一样。
 * @param inf influencer 对象（需要 baseStatus 或能兜底推断出、videoRecords 为当前最新数据）
 * @returns {string}
 */
export function computeStatus(inf) {
  const base = inferBaseStatus(inf);
  if (TERMINAL_STATUSES.includes(base)) return base; // 人工终态优先，视频数据不覆盖

  const hasVideo = (inf?.videoRecords || []).length > 0;
  const orders = cumOrders(inf);

  if (orders >= REPOST_THRESHOLD_ORDERS) return "待复投";
  if (hasVideo) return "已发布";
  return base;
}

/**
 * 便捷封装：补上 baseStatus（含老数据兜底）+ 算出最新 crmStatus，一起回传。
 * 所有会改变 videoRecords 或手动设置状态的地方都应该调用这个，而不是直接改 crmStatus。
 * @param inf influencer 对象
 * @param overrideBase 可选：人工在下拉框里选择的新基线状态（不传则沿用/兜底推断现有的）
 */
export function withComputedStatus(inf, overrideBase) {
  const cleanOverride = overrideBase && !AUTO_DERIVED_STATUSES.includes(overrideBase) ? overrideBase : null;
  const baseStatus = cleanOverride || inferBaseStatus(inf);
  const next = { ...inf, baseStatus };
  return { ...next, crmStatus: computeStatus(next) };
}
