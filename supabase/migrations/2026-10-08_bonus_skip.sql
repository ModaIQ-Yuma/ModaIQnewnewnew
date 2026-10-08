-- ═══════════════════════════════════════════════════════════════════════════
-- 爆单「不提报」（2026-10-08）：bonus_submissions 的来源允许填「不提报」
-- 只放宽来源可填的值，已有数据不动。标为不提报的行 period = '不提报'、amount = 0，删掉即恢复到待提报。
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE bonus_submissions DROP CONSTRAINT IF EXISTS bonus_submissions_source_check;
ALTER TABLE bonus_submissions ADD CONSTRAINT bonus_submissions_source_check
  CHECK (source IN ('系统提报','历史导入','不提报'));
NOTIFY pgrst, 'reload schema';

-- 检查：应返回 1 行，内容里包含 不提报
select pg_get_constraintdef(oid) from pg_constraint where conname = 'bonus_submissions_source_check';
