# ModaIQ v2 · Supabase 迁移

在新 Supabase 项目 → SQL Editor 按文件名顺序逐个执行：

| 文件 | 板块 | 表 |
|---|---|---|
| 00_infra.sql | 基础设施 | stores, user_store_roles, super_admins, staff, invite_codes, import_batches |
| 01_products.sql | ① 产品库 | products |
| 02_crm.sql | ② CRM | creators, creator_aliases, collaborations |
| 03_invite_pool.sql | ③ 未建连邀约库 | invite_pool, creator_owners |
| 04_videos.sql | ⑤ 视频回收 | video_records, video_import_lines |
| 05_review.sql | ⑥⑦ 复盘/归因 | grade_snapshots, store_snapshots |
| 06_tasks.sql | ⑧ 任务中心 | shipping_goals, goal_allocations, gantt_strategies, weekly_menus, weekly_menu_slots, action_tasks, strategy_change_logs |
| 07_bdtools.sql | ⑨ BD工具箱 | viral_videos |

不落表的板块：④日数据、⑩绩效评估（全部实时计算），⑪员工管理（用 00 的表），⑫AI助手（RAG 表待 embedding 模型确认后单独加）。

## 设计原则
- 一实体一表，无 jsonb 数组嵌套；跨表一律外键，不用名称字符串关联
- 每张业务表：`store_id` 多租户隔离 + `created_at`；可编辑表加 `updated_at` 触发器
- 达人属性只在 `creators` 存一次；`collaborations` 只存寄样事实
- 视频一行一条，重复导入累加 gmv/orders/clicks/vv（导出为周期增量），撤销靠 video_import_lines 减回
