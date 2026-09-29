// ─── 邀约库「录入人」（纯函数）──────────────────────────────────────────────
// added_by 可能存的是登录账号 id（自己录入），也可能是名册 id（管理员替没有账号的人上传）。
// 所有要把录入人换成名册人员的地方（日数据、助理复盘）都用这里，保证同一个人只算一处。

/** 录入人 → 名册 id 的对照表（账号 id、名册 id 都能查） */
export function buildAdderMap(staff = []) {
  return new Map(staff.flatMap((s) => [[s.id, s.id], ...(s.auth_user_id ? [[s.auth_user_id, s.id]] : [])]));
}

/** 选中某个名册人员作为录入人时，实际写进 added_by 的值：有账号用账号 id，没有用名册 id */
export const adderValueOf = (s) => s.auth_user_id || s.id;
