-- ═══════════════════════════════════════════════════════════════════
-- 06 任务中心：寄样目标 / 甘特策略 / 周菜单 / 行动任务 / 变更日志
-- 账期 cycle_start = 每月 15 日（账期 15 日～次月 14 日）
-- 一律 product_id 外键；旧版按 internal_name 字符串关联的做法废除
-- ═══════════════════════════════════════════════════════════════════

-- 每账期每产品的寄样目标 + 策略 + 优先级
CREATE TABLE shipping_goals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cycle_start date NOT NULL,                 -- 账期起始（某月 15 日）
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_qty  int NOT NULL DEFAULT 0,
  strategy    text CHECK (strategy IN ('扩张','精选','收缩','停寄','清仓','测款')),
  priority    text CHECK (priority IN ('测款最优','一级','二级','三级','不动')),
  tags        text,                          -- 逗号分隔标签，纯展示
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, cycle_start, product_id)
);
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON shipping_goals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 目标按助理分配
CREATE TABLE goal_allocations (
  goal_id  uuid NOT NULL REFERENCES shipping_goals(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  qty      int NOT NULL DEFAULT 0,
  PRIMARY KEY (goal_id, staff_id)
);

-- 甘特策略：每产品每半月（H1=1~14日 / H2=15日起）一格
CREATE TABLE gantt_strategies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  half_key    text NOT NULL,                 -- '2026-08-H1' / '2026-08-H2'
  strategy    text NOT NULL CHECK (strategy IN ('扩张','精选','收缩','停寄','清仓','测款')),
  priority    text CHECK (priority IN ('测款最优','一级','二级','三级','不动')),
  note        text,
  UNIQUE (store_id, product_id, half_key)
);

-- 周菜单：每周一行；具体格子拆到 weekly_menu_slots
CREATE TABLE weekly_menus (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  week_start   date NOT NULL,                -- 周一
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  generated_by text NOT NULL DEFAULT 'manual' CHECK (generated_by IN ('manual','ai')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, week_start)
);

CREATE TABLE weekly_menu_slots (
  menu_id    uuid NOT NULL REFERENCES weekly_menus(id) ON DELETE CASCADE,
  weekday    smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),  -- 1=周一
  slot_idx   smallint NOT NULL CHECK (slot_idx BETWEEN 0 AND 3), -- 每天 4 格
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  note       text,
  PRIMARY KEY (menu_id, weekday, slot_idx)
);

-- 行动任务：催发 / 复投 / 激活 / 手动
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
  is_auto          boolean NOT NULL DEFAULT false,  -- 系统生成，可一键清除
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_store_status ON action_tasks (store_id, status, due_date);
CREATE INDEX idx_tasks_store_staff  ON action_tasks (store_id, staff_id, status);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON action_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 策略变更日志
CREATE TABLE strategy_change_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES products(id) ON DELETE SET NULL,
  half_key    text,
  old_value   text,
  new_value   text,
  reason      text,
  changed_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clog_store ON strategy_change_logs (store_id, created_at DESC);
