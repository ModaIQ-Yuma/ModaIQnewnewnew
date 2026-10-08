-- ═══════════════════════════════════════════════════════════════════════════
-- 月度提报（2026-10-08）：新建两张表，不动任何已有的表和数据
--   bonus_submissions  已提报的爆单视频（一条视频只能提报一次）
--   bonus_extras       手填奖金：直播爆单 / 新开发付费达人
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 08 月度提报（奖金）──────────────────────────────────────────────
-- 已提报的爆单视频：一条视频一行，同一条视频只能提报一次（不升档补差）
CREATE TABLE IF NOT EXISTS bonus_submissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  video_id       text NOT NULL,                      -- TikTok 视频 ID（链接里 /video/ 后面那串数字）
  creator_handle text,
  gmv            numeric(12,2),                      -- 提报时的累计 GMV（历史导入可空）
  amount         int,                                -- 提报金额 ¥（历史导入可空）
  period         text NOT NULL,                      -- 算在哪个月的提报里，如 2026-08
  source         text NOT NULL DEFAULT '系统提报' CHECK (source IN ('系统提报','历史导入')),
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, video_id)
);
CREATE INDEX IF NOT EXISTS idx_bonus_sub_period ON bonus_submissions (store_id, period);
GRANT SELECT, INSERT, UPDATE, DELETE ON bonus_submissions TO anon, authenticated, service_role;

-- 手填奖金：直播爆单（按档位算钱，并入奖金池按比例分）/ 新开发付费达人（记在助理名下，单独结算）
CREATE TABLE IF NOT EXISTS bonus_extras (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  period     text NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('直播爆单','新开发付费达人')),
  staff_id   uuid REFERENCES staff(id) ON DELETE CASCADE,  -- 付费达人记在哪位助理名下；直播爆单为空
  live_date  date,
  gmv        numeric(12,2),
  amount     int NOT NULL DEFAULT 0,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bonus_extra_period ON bonus_extras (store_id, period);
GRANT SELECT, INSERT, UPDATE, DELETE ON bonus_extras TO anon, authenticated, service_role;

-- 检查：应返回 2 行（bonus_extras、bonus_submissions），两个条数都是 0
select table_name from information_schema.tables where table_name in ('bonus_submissions','bonus_extras') order by table_name;
select (select count(*) from bonus_submissions) as 已提报条数, (select count(*) from bonus_extras) as 手填条数;
