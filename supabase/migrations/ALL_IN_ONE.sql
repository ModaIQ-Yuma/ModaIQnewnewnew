-- ═══════════════════════════════════════════════════════════════════
-- ModaIQ 完整建表 SQL（与代码精准对应，清库后一次性执行）
-- 多租户：所有业务表带 store_id，前端按 store_id 过滤，不开 RLS
-- ═══════════════════════════════════════════════════════════════════

-- ─── 通用触发器 ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ─── 00 基础设施 ───────────────────────────────────────────────────
CREATE TABLE stores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_store_roles (
  user_id    uuid NOT NULL,
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('admin','staff','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, store_id)
);

CREATE TABLE super_admins (
  user_id uuid PRIMARY KEY
);

CREATE TABLE staff (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name         text NOT NULL,
  auth_user_id uuid,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, name)
);
CREATE TRIGGER trg_staff_updated BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE invite_codes (
  code       text PRIMARY KEY,
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('admin','staff','viewer')),
  staff_id   uuid REFERENCES staff(id) ON DELETE SET NULL,
  used_by    uuid,
  used_at    timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invite_store ON invite_codes (store_id);

CREATE TABLE import_batches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('video','creator','invite_pool')),
  file_name  text,
  row_count  int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_batch_store ON import_batches (store_id, created_at DESC);

-- ─── 01 产品库 ─────────────────────────────────────────────────────
CREATE TABLE products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sku_id        text NOT NULL,
  internal_name text NOT NULL,
  product_title text,
  status        text NOT NULL DEFAULT '测款'
                CHECK (status IN ('爆款','合格款','可卖款','撤退款','测款')),
  is_new        boolean NOT NULL DEFAULT true,
  key_points    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, sku_id),
  UNIQUE (store_id, internal_name)
);
CREATE INDEX idx_products_store_status ON products (store_id, status);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 02 CRM ────────────────────────────────────────────────────────
CREATE TABLE creators (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  handle           text NOT NULL,              -- 现名（小写）；曾用名存 creator_aliases
  note             text,                       -- 达人备注（描述这个人，跟着达人走）
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, handle)
);
CREATE TRIGGER trg_creators_updated BEFORE UPDATE ON creators FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE creator_aliases (
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  alias      text NOT NULL,
  PRIMARY KEY (store_id, alias)
);
CREATE INDEX idx_alias_creator ON creator_aliases (creator_id);

CREATE TABLE collaborations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  creator_id     uuid NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  staff_id       uuid REFERENCES staff(id) ON DELETE SET NULL,
  ship_date      date NOT NULL,
  status         text NOT NULL DEFAULT '已寄样'
                 CHECK (status IN ('待接触','已寄样','已发布','待复投','复投完成','不合作')),
  status_manual  boolean NOT NULL DEFAULT false,
  ship_score     int,
  note           text,
  product_color  text,
  creator_source text CHECK (creator_source IN ('auto_invite','manual')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 寄样时的达人属性：一条寄样一行（属性会随时间变化，每次寄样各记一份）
CREATE TABLE collab_attrs (
  collaboration_id uuid PRIMARY KEY REFERENCES collaborations(id) ON DELETE CASCADE,
  store_id         uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  official_grade   text,
  hist_sales       text,
  conv_vertical    text,
  avg_views        text,
  female_ratio     text,
  language         text,
  body_type        text,
  age_range        text,
  content_vertical text,
  style            text,                       -- 多选，逗号分隔
  video_quality    text,
  voiceover        text,
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_collab_attrs_store ON collab_attrs (store_id);
CREATE TRIGGER trg_collab_attrs_updated BEFORE UPDATE ON collab_attrs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- 新版 Supabase 不再自动给新表授权，需显式授权（不开 RLS，前端按 store_id 过滤）
GRANT SELECT, INSERT, UPDATE, DELETE ON collab_attrs TO anon, authenticated, service_role;
CREATE INDEX idx_collab_store_creator  ON collaborations (store_id, creator_id);
CREATE INDEX idx_collab_store_product  ON collaborations (store_id, product_id);
CREATE INDEX idx_collab_store_staff    ON collaborations (store_id, staff_id);
CREATE INDEX idx_collab_store_shipdate ON collaborations (store_id, ship_date);
CREATE TRIGGER trg_collab_updated BEFORE UPDATE ON collaborations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 03 未建连邀约库 ───────────────────────────────────────────────
-- added_by / owner_id 存 auth uid（uuid），无外键约束
-- 等⑪人员管理上线后通过 staff.auth_user_id 联查显示名字
CREATE TABLE unconnected_creators (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  creator_id text NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_by   uuid,
  added_at   timestamptz NOT NULL DEFAULT now(),
  owner_id   uuid,
  owned_at   timestamptz,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','converted')),
  UNIQUE (store_id, creator_id, product_id)
);
CREATE INDEX idx_uc_store_product ON unconnected_creators (store_id, product_id, status);
CREATE INDEX idx_uc_store_handle  ON unconnected_creators (store_id, creator_id);

CREATE TABLE creator_owners (
  store_id         uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  handle           text NOT NULL,
  staff_id         uuid NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  locked_at        timestamptz NOT NULL DEFAULT now(),
  locked_by_collab uuid REFERENCES collaborations(id) ON DELETE SET NULL,
  PRIMARY KEY (store_id, handle)
);

-- ─── 04 视频回收 ───────────────────────────────────────────────────
CREATE TABLE video_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  video_id         text NOT NULL,
  published_at     timestamptz,
  url              text,
  creator_handle   text NOT NULL,
  sku_id           text NOT NULL,
  product_id       uuid REFERENCES products(id) ON DELETE SET NULL,
  collaboration_id uuid REFERENCES collaborations(id) ON DELETE SET NULL,
  gmv              numeric(12,2) NOT NULL DEFAULT 0,
  orders           int NOT NULL DEFAULT 0,
  clicks           int NOT NULL DEFAULT 0,
  vv               bigint NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, video_id)
);
CREATE INDEX idx_vr_store_published ON video_records (store_id, published_at);
CREATE INDEX idx_vr_store_collab    ON video_records (store_id, collaboration_id);
CREATE INDEX idx_vr_store_product   ON video_records (store_id, product_id);
CREATE INDEX idx_vr_store_handle    ON video_records (store_id, creator_handle);
CREATE TRIGGER trg_vr_updated BEFORE UPDATE ON video_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE video_import_lines (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  video_record_id   uuid NOT NULL REFERENCES video_records(id) ON DELETE CASCADE,
  action            text NOT NULL CHECK (action IN ('新增','累加')),
  delta_gmv         numeric(12,2) NOT NULL DEFAULT 0,
  delta_orders      int NOT NULL DEFAULT 0,
  delta_clicks      int NOT NULL DEFAULT 0,
  delta_vv          bigint NOT NULL DEFAULT 0,
  prev_published_at timestamptz
);
CREATE INDEX idx_vil_batch ON video_import_lines (batch_id);

-- ─── 05 月度复盘 ───────────────────────────────────────────────────
CREATE TABLE grade_snapshots (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  month          date NOT NULL,
  status_at_time text,
  ship_count     int NOT NULL DEFAULT 0,
  video_count    int NOT NULL DEFAULT 0,
  burst_count    int NOT NULL DEFAULT 0,
  orders         int NOT NULL DEFAULT 0,
  gmv            numeric(12,2) NOT NULL DEFAULT 0,
  vv             bigint NOT NULL DEFAULT 0,
  clicks         int NOT NULL DEFAULT 0,
  cooperate_count  int NOT NULL DEFAULT 0,   -- 合作达人数（= 当月账期寄样数）
  fulfill_count    int NOT NULL DEFAULT 0,   -- 履约达人数（有视频的寄样）
  video_with_sales int NOT NULL DEFAULT 0,   -- 出单视频数
  total_orders     int,                      -- 整店总出单（FSorder 或手填，可空）
  organic_orders   int,                      -- 自然流量单（同上）
  note           text,
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, product_id, month)
);
CREATE INDEX idx_gs_store_month ON grade_snapshots (store_id, month);

CREATE TABLE store_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  month       date NOT NULL,
  ship_count  int NOT NULL DEFAULT 0,
  video_count int NOT NULL DEFAULT 0,
  burst_count int NOT NULL DEFAULT 0,
  orders      int NOT NULL DEFAULT 0,
  gmv         numeric(12,2) NOT NULL DEFAULT 0,
  vv          bigint NOT NULL DEFAULT 0,
  clicks      int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, month)
);

-- ─── 06 任务中心 ───────────────────────────────────────────────────
CREATE TABLE shipping_goals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cycle_start date NOT NULL,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_qty  int NOT NULL DEFAULT 0,
  estimated_videos int,                    -- 预估视频产出（手填）
  strategy    text CHECK (strategy IN ('扩张','精选','收缩','停寄','清仓','测款')),
  priority    text CHECK (priority IN ('测款最优','一级','二级','三级','不动')),
  tags        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, cycle_start, product_id)
);
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON shipping_goals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE goal_allocations (
  goal_id  uuid NOT NULL REFERENCES shipping_goals(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  qty      int NOT NULL DEFAULT 0,
  PRIMARY KEY (goal_id, staff_id)
);

CREATE TABLE gantt_strategies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  half_key   text NOT NULL,
  strategy   text NOT NULL CHECK (strategy IN ('扩张','精选','收缩','停寄','清仓','测款')),
  priority   text CHECK (priority IN ('测款最优','一级','二级','三级','不动')),
  note       text,
  UNIQUE (store_id, product_id, half_key)
);

CREATE TABLE weekly_menus (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  week_start   date NOT NULL,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  generated_by text NOT NULL DEFAULT 'manual' CHECK (generated_by IN ('manual','ai')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, week_start)
);

CREATE TABLE weekly_menu_slots (
  menu_id    uuid NOT NULL REFERENCES weekly_menus(id) ON DELETE CASCADE,
  weekday    smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  slot_idx   smallint NOT NULL CHECK (slot_idx BETWEEN 0 AND 3),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  note       text,
  PRIMARY KEY (menu_id, weekday, slot_idx)
);

CREATE TABLE action_tasks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('催发','复投','激活','手动')),
  title            text NOT NULL,
  collaboration_id uuid REFERENCES collaborations(id) ON DELETE CASCADE,
  product_id       uuid REFERENCES products(id) ON DELETE SET NULL,
  staff_id         uuid REFERENCES staff(id) ON DELETE SET NULL,
  due_date         date,
  status           text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','dismissed')),
  is_auto          boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_store_status ON action_tasks (store_id, status, due_date);
CREATE INDEX idx_tasks_store_staff  ON action_tasks (store_id, staff_id, status);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON action_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE strategy_change_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  half_key   text,
  old_value  text,
  new_value  text,
  reason     text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clog_store ON strategy_change_logs (store_id, created_at DESC);

-- ─── 07 BD工具箱 ───────────────────────────────────────────────────
CREATE TABLE viral_videos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id     uuid REFERENCES products(id) ON DELETE SET NULL,
  creator_handle text,
  duration       text,
  published_at   date,
  subtitle       text NOT NULL,
  sales          int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_viral_store_product ON viral_videos (store_id, product_id);
