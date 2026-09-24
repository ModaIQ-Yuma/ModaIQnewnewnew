# ModaIQ v2 · Supabase 迁移

**唯一权威 SQL：`ALL_IN_ONE.sql`**（24 张表一次建完，与前端代码逐列对应）。
旧的 00~07 分文件已作废并删除，请勿再执行。

**一次性迁移脚本**（按日期命名，只执行一次，执行后 ALL_IN_ONE.sql 已是最终结构）：
- `2026-09-23_crm_rebuild.sql`：CRM 重建——清空寄样/达人/别名，新建 collab_attrs（寄样时属性），creators 只保留身份。执行后用旧版全量导出重新导入。
- `2026-09-24_snapshot_orders.sql`：月度快照加「整店总出单 / 自然流量单」两列。

不落表的板块：④日数据、⑩绩效评估（全部实时计算），⑪员工管理（用 staff / user_store_roles / invite_codes），⑫AI助手（RAG 表待 embedding 模型确认后单独加）。

## 设计原则
- 一实体一表，无 jsonb 数组嵌套；跨表一律外键，不用名称字符串关联
- 每张业务表：`store_id` 多租户隔离 + `created_at`；可编辑表加 `updated_at` 触发器
- 达人身份在 `creators`（现名 + 达人备注）+ `creator_aliases`（别名，一名一行）；寄样事实在 `collaborations`；寄样时属性在 `collab_attrs`（一条寄样一行）
- 视频一行一条，重复导入累加 gmv/orders/clicks/vv（导出为周期增量），撤销靠 video_import_lines 减回
