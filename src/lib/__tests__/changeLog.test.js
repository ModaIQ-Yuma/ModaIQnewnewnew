import { test, expect } from "vitest";
import { changeLogRow, changeLogView, halfLabel } from "../tasks/changeLog.js";

test("变更记录行：原因 + 同步目标写进 reason；清空记 null；空原因记 null", () => {
  expect(changeLogRow({ productId: "P1", halfKey: "2026-10-H1", from: "冲量", to: "维稳", reason: " 库存不足 ", userId: "U1", goal: 30 }))
    .toEqual({ product_id: "P1", half_key: "2026-10-H1", old_value: "冲量", new_value: "维稳", reason: "库存不足；寄样目标同步为 30", changed_by: "U1" });
  expect(changeLogRow({ productId: "P1", halfKey: "2026-10-H2", from: undefined, to: null, reason: "", userId: null }))
    .toMatchObject({ old_value: null, new_value: null, reason: null, changed_by: null });
  expect(halfLabel("2026-10-H1")).toBe("10月上");
  expect(halfLabel("2026-03-H2")).toBe("3月下");
});

test("变更记录展示：产品名、改动人名字（按登录账号对名册）、从新到旧、清空显示为「清空」", () => {
  const logs = [
    { id: "a", product_id: "P1", half_key: "2026-10-H1", old_value: null, new_value: "冲量", reason: null, changed_by: "U1", created_at: "2026-10-01T10:00:00Z" },
    { id: "b", product_id: "PX", half_key: "2026-10-H2", old_value: "冲量", new_value: null, reason: "清空", changed_by: "U9", created_at: "2026-10-02T10:00:00Z" },
  ];
  const v = changeLogView(logs, [{ id: "P1", internal_name: "2A15" }], [{ name: "赵书瑶", auth_user_id: "U1" }]);
  expect(v.map((x) => x.id)).toEqual(["b", "a"]);
  expect(v[0]).toMatchObject({ productInternalName: "（已删除的产品）", month: "10月下", toStrategy: "清空", changedBy: "管理员" });
  expect(v[1]).toMatchObject({ productInternalName: "2A15", month: "10月上", fromStrategy: null, toStrategy: "冲量", changedBy: "赵书瑶" });
});
