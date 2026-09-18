-- ═══════════════════════════════════════════════════════════════════
-- 02 CRM：达人档案 + 合作记录（寄样）
-- 拆分原因：旧版每条寄样记录重复存 13 个达人属性，同一达人合作 N 品就存 N 遍。
--   creators       = 一个达人一行，属性只存一次
--   collaborations = 一次寄样一行（达人 × 产品），状态流转在这里
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE creators (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  handle          text NOT NULL,          -- TikTok handle，视频回收"达人名称"列匹配键
  -- 以下为达人属性（原 INFLUENCER_FIELDS）
  official_grade  text,                   -- 官方等级
  hist_sales      text,                   -- 历史销量
  conv_vertical   text,                   -- 转化垂直
  avg_views       text,                   -- 均播
  female_ratio    text,                   -- 女粉比例
  language        text,
  body_type       text,                   -- 身材
  age_range       text,
  content_vertical text,                  -- 内容垂直
  style           text,                   -- 风格
  video_quality   text,                   -- 画质
  voiceover       text,                   -- 口播
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, handle)
);
CREATE TRIGGER trg_creators_updated BEFORE UPDATE ON creators FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 达人别名：改名后旧 handle 仍能匹配视频
CREATE TABLE creator_aliases (
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  alias      text NOT NULL,
  PRIMARY KEY (store_id, alias)
);
CREATE INDEX idx_alias_creator ON creator_aliases (creator_id);

-- 合作记录（寄样）。status 枚举与流转规则见 constants/crm.js + lib/crmFlow.js
CREATE TABLE collaborations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  creator_id  uuid NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  staff_id    uuid REFERENCES staff(id) ON DELETE SET NULL,   -- 跟进人（归属）
  ship_date   date NOT NULL,
  status      text NOT NULL DEFAULT '已寄样'
              CHECK (status IN ('待接触','已寄样','已发布','待复投','复投完成','不合作')),
  status_manual boolean NOT NULL DEFAULT false,  -- true = 人工锁定，自动流转不改
  ship_score  int,                               -- 寄样评分
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_collab_store_creator  ON collaborations (store_id, creator_id);
CREATE INDEX idx_collab_store_product  ON collaborations (store_id, product_id);
CREATE INDEX idx_collab_store_staff    ON collaborations (store_id, staff_id);
CREATE INDEX idx_collab_store_shipdate ON collaborations (store_id, ship_date);
CREATE TRIGGER trg_collab_updated BEFORE UPDATE ON collaborations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
