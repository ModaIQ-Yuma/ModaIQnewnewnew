import { test, expect } from "vitest";
import { canSeeTask } from "../tasks/taskVisibility.js";
test("行动清单：管理员看全部；成员只看指派给自己的，团队任务和别人的都看不到；未绑定名册一条都看不到", () => {
  const tasks = [{ id: 1, staff_id: "S1" }, { id: 2, staff_id: "S2" }, { id: 3, staff_id: null }];
  const ids = (opt) => tasks.filter((t) => canSeeTask(t, opt)).map((t) => t.id);
  expect(ids({ canPlan: true, myStaffId: null })).toEqual([1, 2, 3]);
  expect(ids({ canPlan: false, myStaffId: "S1" })).toEqual([1]);
  expect(ids({ canPlan: false, myStaffId: null })).toEqual([]);
});
