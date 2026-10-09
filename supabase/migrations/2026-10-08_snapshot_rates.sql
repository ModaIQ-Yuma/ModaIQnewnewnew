-- ═══════════════════════════════════════════════════════════════════════════
-- 月度快照补存「出单达人数 / 寄样累计出单」（2026-10-08）
-- 原因：快照只存了部分字段，横向看板只能自己拼「达人出单率」「样销比」，口径和单品复盘对不上。
-- 补这两列后：达人出单率 = sale_creator_count ÷ fulfill_count；样销比 = ship_orders ÷ ship_count，
-- 全部来自快照、和单品复盘同一套计算。只加列，不动已有数据；旧快照这两列为空，需「补存历史快照」重存。
-- ═══════════════════════════════════════════════════════════════════════════
alter table grade_snapshots
  add column if not exists sale_creator_count int,
  add column if not exists ship_orders        int;
NOTIFY pgrst, 'reload schema';

-- 检查：应返回两行
select column_name from information_schema.columns
 where table_name = 'grade_snapshots' and column_name in ('sale_creator_count', 'ship_orders');
