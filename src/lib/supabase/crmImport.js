// ─── CRM 批量导入：按导入计划（lib/crm/importPlan.js）落库 ──────────────────
// 顺序：跟进人 → 达人档案 → 别名 → 寄样记录 → 寄样时属性。
// 寄样 id 在前端生成，属性行直接引用，不依赖数据库返回顺序。
import { sb, unwrap } from "./client.js";
import { attrsToRow } from "../crm/attrs.js";

const CHUNK = 500;
const chunks = (arr, n = CHUNK) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function ensureStaff(storeId, names) {
  for (const part of chunks(names)) {
    if (!part.length) continue;
    unwrap(await sb.from("staff").upsert(part.map((name) => ({ store_id: storeId, name })),
      { onConflict: "store_id,name", ignoreDuplicates: true }), "staff");
  }
  const rows = unwrap(await sb.from("staff").select("id, name").eq("store_id", storeId), "staff") || [];
  return Object.fromEntries(rows.map((s) => [s.name, s.id]));
}

async function ensureCreators(storeId, handles, existingIds) {
  const ids = { ...existingIds };
  for (const part of chunks(handles)) {
    const rows = unwrap(await sb.from("creators").upsert(part.map((handle) => ({ store_id: storeId, handle })),
      { onConflict: "store_id,handle" }).select("id, handle"), "creators") || [];
    for (const r of rows) ids[r.handle] = r.id;
  }
  return ids;
}

/**
 * @param plan       buildImportPlan 的结果
 * @param onProgress (done, total, label) => void
 */
export async function importCRM(storeId, plan, onProgress = () => {}) {
  const total = plan.shipments.length;
  onProgress(0, total, "准备跟进人…");
  const staffIds = await ensureStaff(storeId, plan.staffNames);

  onProgress(0, total, "写入达人档案…");
  const creatorIds = await ensureCreators(storeId, plan.newCreators, plan.existingIds);

  onProgress(0, total, "写入别名…");
  for (const part of chunks(plan.aliases)) {
    unwrap(await sb.from("creator_aliases").upsert(
      part.map((a) => ({ store_id: storeId, creator_id: creatorIds[a.handle], alias: a.alias })),
      { onConflict: "store_id,alias", ignoreDuplicates: true }), "creator_aliases");
  }

  const items = plan.shipments.map((s) => ({ id: crypto.randomUUID(), s }));
  let done = 0;
  for (const part of chunks(items)) {
    unwrap(await sb.from("collaborations").insert(part.map(({ id, s }) => ({
      id, store_id: storeId, creator_id: creatorIds[s.handle], product_id: s.product_id,
      staff_id: s.staff ? staffIds[s.staff] || null : null, ship_date: s.ship_date,
      status: s.status, status_manual: false, note: s.note, creator_source: "manual",
    }))), "collaborations");
    unwrap(await sb.from("collab_attrs").insert(part.map(({ id, s }) => ({
      collaboration_id: id, store_id: storeId, ...attrsToRow(s.attrs),
    }))), "collab_attrs");
    done += part.length;
    onProgress(done, total, "写入寄样记录…");
  }
  return { inserted: done, creators: plan.newCreators.length, aliases: plan.aliases.length, staff: plan.staffNames.length };
}
