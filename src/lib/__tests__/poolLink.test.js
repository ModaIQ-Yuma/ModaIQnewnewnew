import { test, expect } from "vitest";
import { poolFollowerOf } from "../invitePool/poolFollower.js";
import { buildPoolSearch, matchesPoolSearch } from "../invitePool/poolSearch.js";
import { buildAdderMap } from "../invitePool/adder.js";
import { buildNameIndex } from "../crm/identity.js";

const staff = [{ id: "S1", name: "朱思怡", auth_user_id: "U1" }, { id: "S2", name: "房心怡", auth_user_id: "U2" }];
const adderMap = buildAdderMap(staff);
const invites = [
  { creator_id: "amy.style", product_id: "P1", added_by: "U2", added_at: "2026-09-20T10:00:00Z" },
  { creator_id: "amy.style", product_id: "P2", added_by: "U1", added_at: "2026-09-25T10:00:00Z" },
  { creator_id: "amy.style", product_id: "P2", added_by: "U2", added_at: "2026-09-26T10:00:00Z" },
  { creator_id: "ghost", product_id: "P1", added_by: "UNBOUND", added_at: "2026-09-01T10:00:00Z" },
];
const follower = (names, productId) => poolFollowerOf({ names, productId, invites, adderMap });

test("CRM 录入跟进人：优先同产品里最早录入的；没有同产品取最早录入；名字不分大小写和 @", () => {
  expect(follower(["@AMY.style"], "P2")).toEqual({ staffId: "S1", productId: "P2", addedAt: "2026-09-25T10:00:00Z" });
  expect(follower(["amy.style"], "P1")?.staffId).toBe("S2");
  expect(follower(["amy.style"], "P9")?.staffId).toBe("S2");          // 没有同产品 → 最早录入（9/20，房心怡）
  expect(follower(["new_name", "amy.style"], null)?.staffId).toBe("S2");   // 别名命中也算
});

test("不在邀约库、或录入人没绑定名册 → 不自动填", () => {
  expect(follower(["nobody"], "P1")).toBeNull();
  expect(follower(["ghost"], "P1")).toBeNull();
  expect(follower([""], "P1")).toBeNull();
});

test("邀约库搜索：包含匹配；输入现名能搜到存成旧名的记录", () => {
  const creators = [{ id: "c1", handle: "amy.style" }], aliases = [{ creator_id: "c1", alias: "amy_old" }];
  const ctx = { nameIndex: buildNameIndex(creators, aliases), creators, aliases };
  const rows = [{ creator_id: "amy_old" }, { creator_id: "bella.fit" }, { creator_id: "amy.style" }];
  const hit = (q) => rows.filter((r) => matchesPoolSearch(r, buildPoolSearch(q, ctx))).map((r) => r.creator_id);
  expect(hit("")).toEqual(["amy_old", "bella.fit", "amy.style"]);
  expect(hit("@Amy.Style")).toEqual(["amy_old", "amy.style"]);
  expect(hit("fit")).toEqual(["bella.fit"]);
  expect(hit("zzz")).toEqual([]);
});
