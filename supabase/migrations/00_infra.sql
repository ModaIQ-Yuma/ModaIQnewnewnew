-- ═══════════════════════════════════════════════════════════════════
-- 00 基础设施：店铺 / 用户角色 / 邀请码 / 超管 / 员工 / 通用触发器
-- 多租户：所有业务表带 store_id，前端按 store_id 过滤（不开 RLS）
-- ═══════════════════════════════════════════════════════════════════

-- 通用 updated_at 自动维护
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TABLE stores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Supabase Auth 用户 ↔ 店铺 ↔ 角色（admin / staff / viewer）
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

-- 员工（助理）档案。auth_user_id 为空 = 只是一个归属标签，尚未开通登录
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

-- 邀请码：用于新用户加入店铺；可预绑定一个 staff（注册即自动关联归属）
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

-- 导入批次：视频/达人批量导入的追溯与撤销依据
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
