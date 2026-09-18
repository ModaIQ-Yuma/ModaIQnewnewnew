-- ═══════════════════════════════════════════════════════════════════
-- 05 月度复盘 / 归因分析
-- 复盘指标全部由 collaborations + video_records 实时计算，不落表；
-- 只有"快照"落表：每月 6~10 日一键保存，用于跨月对比与等级复盘历史
-- ═══════════════════════════════════════════════════════════════════

-- 产品等级快照（每产品每月一行）
CREATE TABLE grade_snapshots (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  month          date NOT NULL,              -- 视频自然月，存该月 1 日
  grade          text NOT NULL,              -- 当月评定等级
  status_at_time text,                       -- 快照时产品状态
  ship_count     int NOT NULL DEFAULT 0,     -- 对应账期寄样数（15日～次月14日）
  video_count    int NOT NULL DEFAULT 0,
  burst_count    int NOT NULL DEFAULT 0,     -- 爆单视频数（≥阈值）
  orders         int NOT NULL DEFAULT 0,
  gmv            numeric(12,2) NOT NULL DEFAULT 0,
  vv             bigint NOT NULL DEFAULT 0,
  clicks         int NOT NULL DEFAULT 0,
  note           text,
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, product_id, month)
);
CREATE INDEX idx_gs_store_month ON grade_snapshots (store_id, month);

-- 全店月度快照（每店每月一行），横向看板历史对比用
CREATE TABLE store_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  month         date NOT NULL,
  ship_count    int NOT NULL DEFAULT 0,
  video_count   int NOT NULL DEFAULT 0,
  burst_count   int NOT NULL DEFAULT 0,
  orders        int NOT NULL DEFAULT 0,
  gmv           numeric(12,2) NOT NULL DEFAULT 0,
  vv            bigint NOT NULL DEFAULT 0,
  clicks        int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, month)
);
