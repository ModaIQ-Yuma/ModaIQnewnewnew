// ─── 权限表（全站唯一来源）：界面上每个「能不能做」都查这里 ─────────────────────
// 角色：超管（super_admins，跨店铺）> 管理员 admin > 成员 staff > 只读 viewer
// 注意：这是界面层权限（按钮显隐 / 操作拦截），数据库未开 RLS。

export const ROLE_LABELS = { admin: "管理员", staff: "成员", viewer: "只读" };

// 动作 → 允许的店铺角色（超管永远允许）
const MATRIX = {
  "store.manage":    [],                            // 新建店铺、管理超管：仅超管
  "staff.manage":    ["admin"],                     // 人员管理、达人归属
  "perf.viewAll":    ["admin"],                     // 绩效：看全店和任意助理
  "perf.viewSelf":   ["admin", "staff"],            // 绩效：看自己
  "product.edit":    ["admin", "staff"],
  "product.delete":  ["admin"],
  "crm.edit":        ["admin", "staff"],            // 录入、编辑、改状态、归入 CRM
  "crm.delete":      ["admin"],                     // 删除、批量删除
  "crm.import":      ["admin"],                     // 批量导入
  "pool.edit":       ["admin", "staff"],            // 邀约库录入、删除
  "video.import":    ["admin", "staff"],
  "video.revert":    ["admin"],
  "snapshot.write":  ["admin"],                     // 保存 / 删除 / 补存快照
  "task.plan":       ["admin"],                     // 甘特图、周期目标、分配、周日程单、新建任务
  "task.do":         ["admin", "staff"],            // 勾选完成行动清单
};

/** @returns bool */
export function can(role, isSuperAdmin, action) {
  if (isSuperAdmin) return true;
  return (MATRIX[action] || []).includes(role);
}
