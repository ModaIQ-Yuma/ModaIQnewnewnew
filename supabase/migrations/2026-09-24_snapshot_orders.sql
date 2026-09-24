-- ═══════════════════════════════════════════════════════════════════════════
-- 月度快照加「整店总出单 / 自然流量单」（2026-09-24）
-- 来源：FSorder 自动拉取（FireSwan），或单品月报手动填写；没有数据时为空。
-- 用途：快照里可算「新视频出单占比」「自然单占比」。只加列，不动已有数据。
-- ═══════════════════════════════════════════════════════════════════════════
alter table grade_snapshots
  add column if not exists total_orders   int,
  add column if not exists organic_orders int;

-- 检查：应返回两行
select column_name from information_schema.columns
 where table_name = 'grade_snapshots' and column_name in ('total_orders', 'organic_orders');
