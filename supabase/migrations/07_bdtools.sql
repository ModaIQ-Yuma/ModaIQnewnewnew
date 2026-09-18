-- ═══════════════════════════════════════════════════════════════════
-- 07 BD 工具箱：病毒分析素材库（ROI 计算器无状态，不落表）
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE viral_videos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES products(id) ON DELETE SET NULL,
  creator_handle text,
  duration    text,
  published_at date,
  subtitle    text NOT NULL,                -- 字幕/文案，AI 分析主体
  sales       int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_viral_store_product ON viral_videos (store_id, product_id);
