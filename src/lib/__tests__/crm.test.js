import { test, expect } from "vitest";
import { buildNameIndex, checkIdentity, normName } from "../crm/identity.js";
import { normalizeAttrs, attrsToRow, rowToAttrs } from "../crm/attrs.js";
import { buildShipmentPayload } from "../crm/shipmentPayload.js";
import { pickCollab, assignByProduct } from "../video/assignVideos.js";
import { checkPoolEntry } from "../invitePool/poolChecks.js";

const creators = [{ id: "A", handle: "amy" }, { id: "B", handle: "bella" }];
const aliases = [{ creator_id: "A", alias: "amy_old" }];
const idx = buildNameIndex(creators, aliases);
const H = (id) => creators.find((c) => c.id === id)?.handle;

test("normName", () => { expect(normName(" @原名Amy ")).toBe("amy"); });
test("identity: 新录入命中别名 → 记到本人", () => {
  const r = checkIdentity({ handle: "AMY_OLD", aliases: [] }, idx, H);
  expect(r.creatorId).toBe("A"); expect(r.errors).toEqual([]);
});
test("identity: 改名 / 改成自己的别名 / 撞别人现名 / 撞别人别名", () => {
  expect(checkIdentity({ creatorId: "A", oldHandle: "amy", handle: "amy2" }, idx, H).rename).toBe(true);
  expect(checkIdentity({ creatorId: "A", oldHandle: "amy", handle: "amy_old" }, idx, H).rename).toBe(true);
  expect(checkIdentity({ creatorId: "A", oldHandle: "amy", handle: "bella" }, idx, H).mergeWith).toEqual(["B"]);
  expect(checkIdentity({ creatorId: "B", oldHandle: "bella", handle: "amy_old" }, idx, H).errors.length).toBe(1);
  expect(checkIdentity({ creatorId: "B", oldHandle: "bella", handle: "bella", aliases: ["amy_old"] }, idx, H).errors.length).toBe(1);
  expect(checkIdentity({ creatorId: "B", oldHandle: "bella", handle: "bella", aliases: ["amy"] }, idx, H).mergeWith).toEqual(["A"]);
});
test("attrs: 显示文字/旧写法/等级文字 → 选项值；往返不丢", () => {
  const { attrs, unknown } = normalizeAttrs({ official_grade: "Lv3 · GMV 25–60K", body_type: "正常 Average", video_quality: "高清构图好", voiceover: "不口播", style: "feminine、__未标注__" });
  expect([attrs.official_grade, attrs.body_type, attrs.video_quality, attrs.voiceover]).toEqual(["Lv3", "正常", "高清", "无口播"]);
  expect(attrs.style).toEqual(["feminine"]); expect(unknown).toEqual([]);
  expect(rowToAttrs(attrsToRow(attrs))).toEqual(attrs);
});
test("payload: 编辑改名 + 删别名 + 改达人备注", () => {
  const chk = checkIdentity({ creatorId: "A", oldHandle: "amy", handle: "amy2", aliases: [] }, idx, H);
  const p = buildShipmentPayload({ form: { influencerId: "amy2", aliases: [], creatorNote: "新备注", shipDate: "2026-09-01", staffId: "s1", baseStatus: "已寄样" },
    initial: { id: "C1", creatorSource: "manual" }, chk, existing: { id: "A", handle: "amy", note: "" }, oldAliases: ["amy_old"], productId: "P" });
  expect(p.creator).toMatchObject({ id: "A", rename: true, handle: "amy2", oldHandle: "amy", noteChanged: true, aliasesRemove: ["amy_old"], aliasesAdd: [] });
  expect(p.names.sort()).toEqual(["amy", "amy2", "amy_old"]); expect(p.isNew).toBe(false);
});
test("视频归属：只挂同商品，复投挂发布前最近一次", () => {
  const cs = [{ collabId: "c1", productId: "P", shipDate: "2026-01-01" }, { collabId: "c2", productId: "P", shipDate: "2026-05-01" }, { collabId: "c3", productId: "Q", shipDate: "2026-06-01" }];
  expect(pickCollab(cs, "P", "2026-03-01T00:00:00Z")).toBe("c1");
  expect(pickCollab(cs, "P", "2026-07-01T00:00:00Z")).toBe("c2");
  expect(pickCollab(cs, "Z", "2026-07-01")).toBe(null);
  const r = assignByProduct([{ id: "v1", product_id: "Q" }, { id: "v2", product_id: "Z" }], cs);
  expect(r.byCollab.get("c3")).toEqual(["v1"]); expect(r.unmatched).toEqual(["v2"]);
});
test("邀约库查重：别名也算同一人；复投多条不报错", () => {
  const core = { creators, aliases, invites: [{ creator_id: "amy_old", product_id: "P" }],
    collabs: [{ creator_id: "B", product_id: "P", ship_date: "2026-01-01", staff_id: "s" }, { creator_id: "B", product_id: "P", ship_date: "2026-03-01", staff_id: "s" }] };
  const base = { productId: "P", productName: "2208", core, nameIndex: idx, staffName: () => "朱思怡" };
  expect(checkPoolEntry({ ...base, handle: "amy" })).toMatch("已在邀约库");
  expect(checkPoolEntry({ ...base, handle: "BELLA" })).toMatch("2026-03-01");
  expect(checkPoolEntry({ ...base, handle: "newone" })).toBe(null);
});
