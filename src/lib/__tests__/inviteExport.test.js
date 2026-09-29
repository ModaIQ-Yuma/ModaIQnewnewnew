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
