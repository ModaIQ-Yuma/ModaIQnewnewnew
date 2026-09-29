// ─── 邀约库手动更改（纯函数）：生成要写入的字段 ─────────────────────────────
// 这两个字段只影响邀约库自己的显示和今日邀约名单，不影响 CRM 跟进人和绩效。

/** 已转化 → 回退为未转化（归属人保留；回退后会重新出现在今日邀约名单里） */
export const revertPatch = () => ({ status: "pending" });

/** 变更归属人；传空则清空归属。CRM 以后自动写归属时只填空的，不会覆盖手动改的 */
export const ownerPatch = (staffId, nowIso) =>
  staffId ? { owner_id: staffId, owned_at: nowIso } : { owner_id: null, owned_at: null };
