-- ═══════════════════════════════════════════════════════════════════
-- 04 视频回收
-- 来源：TK 后台 Video_Analysis_Video_List_<start>-<end>.xlsx
-- 口径：曝光=播放量 vv；CTR=clicks/vv；出单=成交件数（不扣退款）；CVR=orders/clicks
-- 一视频一行；同一视频重复导入时 gmv/orders/clicks/vv 累加（导出是周期增量），
--   published_at 取最新一次；月度归属按 published_at 所在自然月
-- collaboration_id 为空 = 非 CRM 视频（未匹配到寄样记录）
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE video_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  video_id         text NOT NULL,             -- TK 视频 ID
  published_at     timestamptz,               -- 发布日期（月度归属依据）
  url              text,
  creator_handle   text NOT NULL,             -- 原始达人名称，匹配前后都保留
  sku_id           text NOT NULL,             -- 原始商品 ID
  product_id       uuid REFERENCES products(id) ON DELETE SET NULL,
  collaboration_id uuid REFERENCES collaborations(id) ON DELETE SET NULL,
  gmv              numeric(12,2) NOT NULL DEFAULT 0,   -- 累加
  orders           int NOT NULL DEFAULT 0,             -- 累加：视频归因成交件数
  clicks           int NOT NULL DEFAULT 0,             -- 累加：视频商品点击量
  vv               bigint NOT NULL DEFAULT 0,          -- 累加：视频播放量（= 曝光）
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, video_id)
);
CREATE INDEX idx_vr_store_published ON video_records (store_id, published_at);
CREATE INDEX idx_vr_store_collab    ON video_records (store_id, collaboration_id);
CREATE INDEX idx_vr_store_product   ON video_records (store_id, product_id);
CREATE INDEX idx_vr_store_handle    ON video_records (store_id, creator_handle);
CREATE INDEX idx_vr_unmatched       ON video_records (store_id) WHERE collaboration_id IS NULL;
CREATE TRIGGER trg_vr_updated BEFORE UPDATE ON video_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 导入明细：每批每视频记一行"这次加了多少"，撤销 = 减回去（新增的直接删）
CREATE TABLE video_import_lines (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  video_record_id  uuid NOT NULL REFERENCES video_records(id) ON DELETE CASCADE,
  action           text NOT NULL CHECK (action IN ('新增','累加')),
  delta_gmv        numeric(12,2) NOT NULL DEFAULT 0,
  delta_orders     int NOT NULL DEFAULT 0,
  delta_clicks     int NOT NULL DEFAULT 0,
  delta_vv         bigint NOT NULL DEFAULT 0,
  prev_published_at timestamptz                     -- 撤销时恢复发布日期
);
CREATE INDEX idx_vil_batch ON video_import_lines (batch_id);
