-- ═══════════════════════════════════════════════════════════════════════════
-- CRM 重建（2026-09-23）：属性跟着寄样走 + 别名统一存放
-- 执行位置：Supabase → SQL Editor；推送新代码【之前】执行。
-- 效果：
--   1) 删除 FireSwan 店铺全部寄样记录、达人档案、别名（之后用旧版全量导出重新导入）
--   2) 新建 collab_attrs（寄样时属性，一条寄样一行）
--   3) creators 只保留身份：删掉 12 个属性列 + aliases 列
-- 不受影响：产品库、员工、邀约库、任务、快照、视频（尚未导入）
-- 整段在一个事务里：任何一步出错都会整体撤销，不会改一半。
-- ═══════════════════════════════════════════════════════════════════════════
begin;

-- ① 删除 FireSwan 的 CRM 数据（视频的 collaboration_id 会被数据库自动置空）
delete from creator_aliases where store_id = '05adab36-7b10-43cf-ad94-128c5954db60';
delete from collaborations  where store_id = '05adab36-7b10-43cf-ad94-128c5954db60';
delete from creators        where store_id = '05adab36-7b10-43cf-ad94-128c5954db60';

-- ② 寄样时属性表
create table if not exists collab_attrs (
  collaboration_id uuid primary key references collaborations(id) on delete cascade,
  store_id         uuid not null references stores(id) on delete cascade,
  official_grade   text,
  hist_sales       text,
  conv_vertical    text,
  avg_views        text,
  female_ratio     text,
  language         text,
  body_type        text,
  age_range        text,
  content_vertical text,
  style            text,
  video_quality    text,
  voiceover        text,
  updated_at       timestamptz not null default now()
);
create index if not exists idx_collab_attrs_store on collab_attrs (store_id);
drop trigger if exists trg_collab_attrs_updated on collab_attrs;
create trigger trg_collab_attrs_updated before update on collab_attrs
  for each row execute function set_updated_at();

-- ③ creators 只保留身份
alter table creators
  drop column if exists official_grade,  drop column if exists hist_sales,
  drop column if exists conv_vertical,   drop column if exists avg_views,
  drop column if exists female_ratio,    drop column if exists language,
  drop column if exists body_type,       drop column if exists age_range,
  drop column if exists content_vertical,drop column if exists style,
  drop column if exists video_quality,   drop column if exists voiceover,
  drop column if exists aliases;

commit;

-- ④ 执行完检查（应分别为 0、0、0、true）
select
  (select count(*) from collaborations  where store_id = '05adab36-7b10-43cf-ad94-128c5954db60') as 寄样记录,
  (select count(*) from creators        where store_id = '05adab36-7b10-43cf-ad94-128c5954db60') as 达人档案,
  (select count(*) from creator_aliases where store_id = '05adab36-7b10-43cf-ad94-128c5954db60') as 别名,
  exists (select 1 from information_schema.tables where table_name = 'collab_attrs')              as 属性表已建;
