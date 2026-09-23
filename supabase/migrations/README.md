# ModaIQ v2 · Supabase 迁移

**唯一权威 SQL：`ALL_IN_ONE.sql`**（24 张表一次建完，与前端代码逐列对应）。
旧的 00~07 分文件已作废并删除，请勿再执行。

不落表的板块：④日数据、⑩绩效评估（全部实时计算），⑪员工管理（用 staff / user_store_roles / invite_codes），⑫AI助手（RAG 表待 embedding 模型确认后单独加）。

## 设计原则
- 一实体一表，无 jsonb 数组嵌套；跨表一律外键，不用名称字符串关联
- 每张业务表：`store_id` 多租户隔离 + `created_at`；可编辑表加 `updated_at` 触发器
- 达人属性只在 `creators` 存一次；`collaborations` 只存寄样事实
- 视频一行一条，重复导入累加 gmv/orders/clicks/vv（导出为周期增量），撤销靠 video_import_lines 减回
