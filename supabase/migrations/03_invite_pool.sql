-- ═══════════════════════════════════════════════════════════════════
-- 03 未建连自动邀约达人库
-- 一达人一产品一行；不存归属，只存录入人；归属在达人层面锁定（creator_owners）
-- 达人以 handle 存文本：录入时达人通常尚未进 creators 表
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE invite_pool (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  handle        text NOT NULL,
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  entered_by    uuid NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,  -- 录入人
  status        text NOT NULL DEFAULT '未转化' CHECK (status IN ('未转化','已转化')),
  converted_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, handle, product_id)        -- 层一去重：库内 达人+产品 唯一
);
CREATE INDEX idx_pool_store_product ON invite_pool (store_id, product_id, status);
CREATE INDEX idx_pool_store_handle  ON invite_pool (store_id, handle);

-- 达人归属锁：一旦该达人任意产品寄样成功，归属锁定给当初录入人；此后不可更改
CREATE TABLE creator_owners (
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  handle     text NOT NULL,
  staff_id   uuid NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  locked_at  timestamptz NOT NULL DEFAULT now(),
  locked_by_collab uuid REFERENCES collaborations(id) ON DELETE SET NULL,  -- 触发锁定的寄样
  PRIMARY KEY (store_id, handle)
);
