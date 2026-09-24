-- ═══════════════════════════════════════════════════════════════════════════
-- 周期目标加「预估视频产出」（2026-09-24）
-- 每个产品每个账期手填：寄这么多样，预计产出多少条视频。
-- 助理预估视频 = 预估视频 ÷ 寄样目标 × 分到的件数（每个产品四舍五入后相加）。
-- 助理分配用已有的 goal_allocations 表，不用改。只加列，不动已有数据。
-- ═══════════════════════════════════════════════════════════════════════════
alter table shipping_goals add column if not exists estimated_videos int;

-- 检查：应返回 1 行 estimated_videos；goal_allocations 应能查询（返回 0 或已有条数）
select column_name from information_schema.columns where table_name = 'shipping_goals' and column_name = 'estimated_videos';
select count(*) as 已有分配条数 from goal_allocations;
