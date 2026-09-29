import { test, expect } from "vitest";
import { cleanHandle, splitPasted, listFromSheet, planPoolBatch, skipSummary, MAX_BATCH } from "../invitePool/poolBatch.js";
import { checkPoolEntry } from "../invitePool/poolChecks.js";
import { buildAdderMap, adderValueOf } from "../invitePool/adder.js";
import { inviteRanking } from "../daily/dailyAgg.js";
import { buildNameIndex } from "../crm/identity.js";

// 小型核心数据：达人 c1 现名 amy.style、别名 amy_old；c1 已寄样 P1（跟进人 S1）；邀约库已有 bella + P2
const core = {
  creators: [{ id: "c1", handle: "amy.style" }, { id: "c2", handle: "bella" }],
  aliases: [{ creator_id: "c1", alias: "amy_old" }],
  collabs: [
    { id: "x1", creator_id: "c1", product_id: "P1", staff_id: "S1", ship_date: "2026-08-01" },
    { id: "x2", creator_id: "c1", product_id: "P1", staff_id: "S2", ship_date: "2026-09-01" },
  ],
  invites: [{ creator_id: "bella", product_id: "P2" }],
};
const products = [{ id: "P1", internal_name: "2A15" }, { id: "P2", internal_name: "2761" }];
const nameIndex = buildNameIndex(core.creators, core.aliases);
const staffName = (id) => ({ S1: "朱思怡", S2: "房心怡" })[id] || "未指定";

test("名单清洗：@、空格、大小写、主页链接；非法格式识别为 null", () => {
  expect(cleanHandle("  @Amy.Style ")).toBe("amy.style");
  expect(cleanHandle("https://www.tiktok.com/@Cara.Wears?lang=en")).toBe("cara.wears");
  expect(cleanHandle("达人ID")).toBeNull();
  expect(cleanHandle("has space")).toBeNull();
  expect(cleanHandle("a".repeat(25))).toBeNull();
  expect(splitPasted("a1, b2；c3\n\n d4\te5")).toEqual(["a1", "b2", "c3", "d4", "e5"]);
});

test("表格名单：取每行第一个非空格子，识别不了的表头跳过", () => {
  expect(listFromSheet([["达人username"], ["amy.style"], ["", "bella"], [], ["cara"]])).toEqual(["amy.style", "bella", "cara"]);
  expect(listFromSheet([["amy.style"], ["bella"]])).toEqual(["amy.style", "bella"]);   // 没有表头也行
});

test("批量计划：与单条录入同一套查重，另加名单内重复、格式无效；被跳过的不影响其他行", () => {
  const plan = planPoolBatch({
    inputs: ["amy_old", "AMY.STYLE", "bella", "new.girl", "坏数据"],
    productIds: ["P1", "P2"], products, core, nameIndex, staffName,
  });
  expect(plan.creatorCount).toBe(3);
  expect(plan.rows).toEqual([
    { creator_id: "amy_old", product_id: "P2" },     // amy 合作过 P1，P2 放行（跨产品不拦）
    { creator_id: "bella", product_id: "P1" },       // bella 在库里的是 P2，P1 放行
    { creator_id: "new.girl", product_id: "P1" },
    { creator_id: "new.girl", product_id: "P2" },
  ]);
  const reasons = plan.skipped.map((s) => s.reason);
  expect(reasons[0]).toBe("此达人已合作 2A15（2026-09-01），跟进人 房心怡");   // 取最近一次寄样
  expect(reasons).toContain("名单内重复");                                   // 现名和别名算同一人
  expect(reasons).toContain("此达人已在邀约库中（2761）");
  expect(reasons).toContain("格式无效，不是 TikTok username");
  expect(skipSummary(plan.skipped)).toEqual({ "已在 CRM 合作": 1, "名单内重复": 1, "已在邀约库": 1, "格式无效，不是 TikTok username": 1 });
});

test("单条录入的查重结果不变（改用索引后）", () => {
  const args = { core, nameIndex, staffName };
  expect(checkPoolEntry({ ...args, handle: "@Amy_Old", productId: "P1", productName: "2A15" })).toContain("已合作 2A15");
  expect(checkPoolEntry({ ...args, handle: "bella", productId: "P2", productName: "2761" })).toContain("已在邀约库");
  expect(checkPoolEntry({ ...args, handle: "bella", productId: "P1", productName: "2A15" })).toBeNull();
});

test("超过上限标记 tooMany", () => {
  const inputs = Array.from({ length: MAX_BATCH + 1 }, (_, i) => `user${i}`);
  expect(planPoolBatch({ inputs, productIds: ["P1"], products, core, nameIndex, staffName }).tooMany).toBe(true);
});

test("录入人：账号 id 和名册 id 都归到同一个名册人员；日拉新排行显示名字并合并", () => {
  const staff = [{ id: "S1", name: "朱思怡", auth_user_id: "U1" }, { id: "S3", name: "兼职小王", auth_user_id: null }];
  const m = buildAdderMap(staff);
  expect([m.get("U1"), m.get("S1"), m.get("S3")]).toEqual(["S1", "S1", "S3"]);
  expect(adderValueOf(staff[0])).toBe("U1");
  expect(adderValueOf(staff[1])).toBe("S3");
  const invites = [
    { added_by: "U1", date: "2026-09-28", count: 3 },
    { added_by: "S1", date: "2026-09-28", count: 2 },     // 管理员替她批量上传的
    { added_by: "S3", date: "2026-09-28", count: 4 },
    { added_by: "U1", date: "2026-09-27", count: 9 },     // 别的日期不算
  ];
  expect(inviteRanking(invites, "2026-09-28", staff)).toEqual([
    { staffId: "S1", name: "朱思怡", count: 5 },
    { staffId: "S3", name: "兼职小王", count: 4 },
  ]);
});
