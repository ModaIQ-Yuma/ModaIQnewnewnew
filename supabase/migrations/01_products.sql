-- ═══════════════════════════════════════════════════════════════════
-- 01 产品库
-- sku_id = TK 后台 18 位商品 ID，是视频回收 / FSorder 联动的唯一钥匙
-- 所有其他表一律用 products.id 外键关联，禁止用 internal_name 字符串匹配
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sku_id        text NOT NULL,                 -- TK 商品 ID（18位）
  internal_name text NOT NULL,                 -- 内部简称，展示用
  product_title text,                          -- TK 后台完整标题
  status        text NOT NULL DEFAULT '测款'
                CHECK (status IN ('爆款','合格款','可卖款','撤退款','测款')),
  is_new        boolean NOT NULL DEFAULT true, -- 新品/老品
  key_points    text,                          -- 卖点，供 AI/外联使用
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, sku_id),
  UNIQUE (store_id, internal_name)
);
CREATE INDEX idx_products_store_status ON products (store_id, status);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
