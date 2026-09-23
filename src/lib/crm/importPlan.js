// ─── CRM 导入计划（纯函数）：解析结果 + 用户决定 + 库里现状 → 要写入的内容 ──
// 不发请求；执行交给 lib/supabase/crmImport.js。
import { pairKey } from "./importPairs.js";
import { resolveName } from "./identity.js";

const AUTO_STATUS = new Set(["已发布", "待复投"]);          // 由视频数据自动算出，不作为人工基线导入

/**
 * @param rows       parseRows().rows
 * @param decisions  { [pairKey]: "a" | "b" | "none" }（保留哪个现名；none = 不是同一人）
 * @param pairs      detectPairs(rows)
 * @param existing   { nameIndex, collabKeys:Set("creatorId|productId|date"), handleOf(id) }
 * @param productIdByName { internal_name: id }
 * @param keepSameDay 文件里「同达人同产品同日期」的多行是否都导入（默认只导第一行）；库里已有的一律跳过
 */
export function buildImportPlan({ rows, decisions, pairs, existing, productIdByName, keepSameDay = false }) {
  const canon = {}, notSame = new Set();
  for (const p of pairs) {
    const d = decisions[p.key];
    if (d === "a") canon[p.b] = p.a; else if (d === "b") canon[p.a] = p.b; else notSame.add(p.key);
  }
  const C = (h) => canon[h] || h;

  const creators = new Map();                               // 现名 → { existingId, aliases:Set }
  const aliasOwner = new Map();                             // 别名 → 现名（文件内）
  const conflicts = [], skipped = [], shipments = [], staffNames = new Set();
  const seen = new Set();

  const ensure = (h) => {
    if (!creators.has(h)) creators.set(h, { existingId: resolveName(existing.nameIndex, h)?.creatorId || null, aliases: new Set() });
    return creators.get(h);
  };
  const addAlias = (h, al) => {
    if (al === h || creators.has(al)) return;
    const owner = resolveName(existing.nameIndex, al);
    const self = creators.get(h).existingId;
    if (owner && owner.creatorId !== self) { conflicts.push(`@${h} 的别名「${al}」已属于 @${existing.handleOf(owner.creatorId)}，未写入`); return; }
    if (aliasOwner.has(al) && aliasOwner.get(al) !== h) { conflicts.push(`别名「${al}」同时出现在 @${aliasOwner.get(al)} 和 @${h}，只保留给前者`); return; }
    aliasOwner.set(al, h); creators.get(h).aliases.add(al);
  };

  for (const r of rows) ensure(C(r.handle));
  for (const [from, to] of Object.entries(canon)) addAlias(to, from);        // 被合并的 ID 变成别名
  for (const r of rows) {
    const h = C(r.handle);
    for (const al of r.aliases) {
      if (notSame.has(pairKey(r.handle, al))) continue;                       // 大小号：不互记别名
      addAlias(h, C(al));
    }
  }

  for (const r of rows) {
    const h = C(r.handle), productId = productIdByName[r.product];
    if (!productId) { skipped.push({ line: r.line, handle: r.handle, reason: `产品「${r.product}」不在产品库` }); continue; }
    const key = `${creators.get(h).existingId || h}|${productId}|${r.shipDate}`;
    if (existing.collabKeys.has(key) || (!keepSameDay && seen.has(key))) {
      skipped.push({ line: r.line, handle: r.handle, reason: existing.collabKeys.has(key) ? "库里已有（同达人同产品同日期）" : "文件内重复（同达人同产品同日期）" });
      continue;
    }
    seen.add(key);
    if (r.staff) staffNames.add(r.staff);
    shipments.push({
      handle: h, product_id: productId, ship_date: r.shipDate, staff: r.staff,
      status: AUTO_STATUS.has(r.status) ? "已寄样" : r.status, note: r.note, attrs: r.attrs,
    });
  }

  const newCreators = [...creators.entries()].filter(([, v]) => !v.existingId).map(([h]) => h);
  const existingIds = Object.fromEntries([...creators.entries()].filter(([, v]) => v.existingId).map(([h, v]) => [h, v.existingId]));
  const aliases = [...creators.entries()].flatMap(([h, v]) => [...v.aliases].map((alias) => ({ handle: h, alias })));
  const unknownAttrs = [...new Set(rows.flatMap((r) => r.unknown))];
  return { newCreators, existingIds, aliases, shipments, staffNames: [...staffNames], skipped, conflicts, unknownAttrs,
    stats: { rows: rows.length, creators: creators.size, newCreators: newCreators.length, aliases: aliases.length, shipments: shipments.length } };
}
