// lib/supabase/crmImport.js — CRM 批量写入
import { sb } from "./client.js";
export { parseRows } from "../crm/crmParser.js";

const CHUNK = 200;
const chunk = (arr) => {
  const res = [];
  for (let i = 0; i < arr.length; i += CHUNK) res.push(arr.slice(i, i + CHUNK));
  return res;
};

export async function importCRM(storeId, rows, onProgress, mode = "full") {
  const total = rows.length;

  onProgress(0, total, "查询产品数据…");
  const { data: products, error: pErr } = await sb.from("products").select("id, internal_name").eq("store_id", storeId);
  if (pErr) throw new Error("查询产品失败：" + pErr.message);
  const productMap = Object.fromEntries((products || []).map((p) => [p.internal_name, p.id]));
  console.log("[CRM导入] 产品数:", products?.length, "productMap示例:", Object.entries(productMap).slice(0,3));

  onProgress(0, total, "查询跟进人数据…");
  const { data: staffRows, error: sErr } = await sb.from("staff").select("id, name").eq("store_id", storeId);
  if (sErr) throw new Error("查询跟进人失败：" + sErr.message);
  const staffMap = Object.fromEntries((staffRows || []).map((s) => [s.name, s.id]));
  console.log("[CRM导入] 跟进人数:", staffRows?.length);

  const missingStaff = [...new Set(rows.filter((r) => !r.staffNull && r.staff && !staffMap[r.staff]).map((r) => r.staff))];
  for (const name of missingStaff) {
    const { data } = await sb.from("staff").upsert({ store_id: storeId, name }, { onConflict: "store_id,name" }).select("id, name").single();
    if (data) staffMap[data.name] = data.id;
  }

  onProgress(0, total, "写入达人信息…");
  // 同一 handle 可能有多条寄样记录：
  // 1. 取 shipDate 最新的一条作为基准（属性最新）
  // 2. 如果最新一条属性为空，向前找最近一条属性非空的记录补填
  const ATTR_KEYS = ["grade","histSales","convVert","avgViews","femaleRatio","language","bodyType","ageRange","contentVert","style","videoQuality","voiceover","aliases"];
  const hasAttrs = (r) => ATTR_KEYS.some((k) => r[k] != null && r[k] !== "");
  const byHandle = {};
  for (const r of rows) {
    if (!byHandle[r.handle]) byHandle[r.handle] = [];
    byHandle[r.handle].push(r);
  }
  const uniqueCreators = Object.values(byHandle).map((rs) => {
    rs.sort((a, b) => (b.shipDate || "").localeCompare(a.shipDate || ""));
    const latest = rs[0];
    if (hasAttrs(latest)) return latest;
    // 最新记录属性为空，找最近一条有属性的记录补填
    const fallback = rs.find((r) => hasAttrs(r));
    if (!fallback) return latest;
    const merged = { ...latest };
    for (const k of ATTR_KEYS) {
      if ((merged[k] == null || merged[k] === "") && fallback[k]) merged[k] = fallback[k];
    }
    return merged;
  });
  for (const batch of chunk(uniqueCreators)) {
    const { error: crtErr } = await sb.from("creators").upsert(
      batch.map((r) => ({
        store_id: storeId, handle: r.handle,
        official_grade: r.grade, hist_sales: r.histSales,
        conv_vertical: r.convVert, avg_views: r.avgViews,
        female_ratio: r.femaleRatio, language: r.language,
        body_type: r.bodyType, age_range: r.ageRange,
        content_vertical: r.contentVert, style: r.style,
        video_quality: r.videoQuality, voiceover: r.voiceover,
        aliases: r.aliases, note: r.note,
      })),
      { onConflict: "store_id,handle" }
    );
    if (crtErr) throw new Error("写入达人信息失败：" + crtErr.message);
  }

  onProgress(0, total, "查询达人 ID…");
  const handles = [...new Set(rows.map((r) => r.handle))];
  const creatorMap = {};
  for (const batch of chunk(handles)) {
    const { data } = await sb.from("creators").select("id, handle").eq("store_id", storeId).in("handle", batch);
    (data || []).forEach((c) => { creatorMap[c.handle] = c.id; });
  }

  // 仅更新达人属性模式：跳过寄样记录写入
  if (mode === "attrs_only") {
    return { inserted: 0, skipped: rows.length, staffAdded: missingStaff.length, attrsUpdated: uniqueCreators.length };
  }

  const collabRowsRaw = rows.map((r) => ({
    store_id: storeId,
    creator_id: creatorMap[r.handle],
    product_id: productMap[r.product],
    staff_id: r.staffNull ? null : (staffMap[r.staff] || null),
    ship_date: r.shipDate,
    status: r.status,
    creator_source: "manual",
    note: r.note,
    _handle: r.handle,
    _product: r.product,
  }));
  const noCreator = collabRowsRaw.filter(r => !r.creator_id);
  const noProduct = collabRowsRaw.filter(r => !r.product_id);
  console.log("[CRM导入] 总行数:", rows.length, "无creator_id:", noCreator.length, "无product_id:", noProduct.length);
  if (noCreator.length) console.log("[CRM导入] 无creator示例:", noCreator.slice(0,3).map(r=>r._handle));
  if (noProduct.length) console.log("[CRM导入] 无product示例:", noProduct.slice(0,3).map(r=>r._product));

  const collabRows = collabRowsRaw
    .filter((r) => r.creator_id && r.product_id)
    .map(({_handle, _product, ...r}) => r);
  const skipped = rows.length - collabRows.length;
  let inserted = 0;
  for (const batch of chunk(collabRows)) {
    const { error: cErr } = await sb.from("collaborations").insert(batch);
    if (cErr) throw new Error("写入寄样记录失败：" + cErr.message);
    inserted += batch.length;
    onProgress(inserted, total, "写入寄样记录…");
  }

  return { inserted, skipped, staffAdded: missingStaff.length };
}
