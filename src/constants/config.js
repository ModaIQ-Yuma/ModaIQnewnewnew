// ─── 全局业务常量（魔法数字统一在此；组件里禁止硬编码）──────────────────────

// 账期：每月 15 日 ～ 次月 14 日（含两端）
export const CYCLE_START_DAY = 15;

// 订单窗口：视频自然月 1 日 ～ 次月 5 日（08-01～08-05 被 7 月和 8 月双计，有意接受）
export const ORDER_WINDOW_TAIL_DAYS = 5;

// 爆单视频：单条视频月度出单（成交件数）≥ 此值
export const BURST_ORDER_THRESHOLD = 50;

// 待复投：该达人在该产品下累计出单 > 此值
export const REPOST_THRESHOLD_ORDERS = 3;

// 超期未发布：寄样超过此天数且无视频
export const OVERDUE_DAYS = 14;

// 激活任务：FSorder 累计出单 ≥ 此值 且 3 个月内无新视频
export const ACTIVATE_MIN_ORDERS = 30;

// 邀请码
export const INVITE_TRIAL_DAYS = 3;

// 分页 / 批处理
export const PAGE_SIZE    = 500;   // Supabase 单次拉取上限

// localStorage keys（统一前缀，避免与旧版冲突）
export const LS = {
  activeStore: "modaiq2_active_store",
};

// ─── 任务中心 / 甘特图 ────────────────────────────────────────────────────────
export const GANTT_MONTHS_PER_VIEW   = 3;
export const GANTT_COL_PRODUCT_WIDTH = 160;
export const PICKER_MAX_RESULTS      = 20;

// ─── AI token 上限 ──────────────────────────────────────────────────────────
export const AI_MAX_TOKENS_REVIEW = 1000;
export const AI_MAX_TOKENS_VIRAL  = 2000;
