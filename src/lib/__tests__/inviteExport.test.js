import { test, expect } from "vitest";
import { buildInviteSheets, sheetName } from "../invitePool/inviteExport.js";

test("今日邀约导出：每个产品一个工作表，一列达人 username；非法字符和重名处理", () => {
  const sheets = buildInviteSheets({ "2178": [{ creator_id: "paumod" }, { creator_id: "bobbimariexo" }], "2A15/新": [{ creator_id: "amy" }] });
  expect(sheets).toEqual([
    { sheet: "2178", rows: [{ 达人username: "paumod" }, { 达人username: "bobbimariexo" }] },
    { sheet: "2A15_新", rows: [{ 达人username: "amy" }] },
  ]);
  expect(sheetName("x".repeat(40))).toHaveLength(31);
  expect(buildInviteSheets({ "a/b": [], "a:b": [] }).map((s) => s.sheet)).toEqual(["a_b", "a_b_2"]);
});

import { pendingInvitesFor } from "../invitePool/todayInvites.js";
test("今日邀约名单：只取今天排的产品、未转化，按录入时间从早到晚；超过 1000 条也全部返回", () => {
  const invites = [
    { id: 1, product_id: "P1", status: "pending", added_at: "2026-09-28T10:00:00Z" },
    { id: 2, product_id: "P1", status: "converted", added_at: "2026-09-01T10:00:00Z" },
    { id: 3, product_id: "P2", status: "pending", added_at: "2026-09-01T10:00:00Z" },
    { id: 4, product_id: "P9", status: "pending", added_at: "2026-09-01T10:00:00Z" },
    ...Array.from({ length: 1200 }, (_, i) => ({ id: 100 + i, product_id: "P1", status: "pending", added_at: "2026-09-29T00:00:00Z" })),
  ];
  const out = pendingInvitesFor(invites, ["P1", "P2"]);
  expect(out.length).toBe(1202);
  expect(out.slice(0, 2).map((r) => r.id)).toEqual([3, 1]);
});
