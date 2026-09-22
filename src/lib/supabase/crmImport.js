// lib/supabase/crmImport.js — CRM 批量写入
import { sb } from "./client.js";
export { parseRows } from "../crm/crmParser.js";

const CHUNK = 200;
const chunk = (arr) => {
  const res = [];
  for (let i = 0; i < arr.length; i += CHUNK) res.push(arr.slice(i, i + CHUNK));
  return res;
};

export async function importCRM(storeId, rows, onProgress) {
  const total = rows.length;

  onProgress(0, total, "查询产品数据…");
  const { data: products } = await sb.from("products").select("id, internal_name").eq("store_id", storeId);
  const productMap = Object.fromEntries((products || []).map((p) => [p.internal_name, p.id]));

  onProgress(0, total, "查询跟进人数据…");
  const { data: staffRows } = await sb.from("staff").select("id, name").eq("store_id", storeId);
  const staffMap = Object.fromEntries((staffRows || []).map((s) => [s.name, s.id]));

  const missingStaff = [...new Set(rows.filter((r) => !r.staffNull && r.staff && !staffMap[r.staff]).map((r) => r.staff))];
  for (const name of missingStaff) {
    const { data } = await sb.from("staff").upsert({ store_id: storeId, name }, { onConflict: "store_id,name" }).select("id, name").single();
    if (data) staffMap[data.name] = data.id;
  }

  onProgress(0, total, "写入达人信息…");
  const uniqueCreators = Object.values(Object.fromEntries(rows.map((r) => [r.handle, r])));
  for (const batch of chunk(uniqueCreators)) {
    await sb.from("creators").upsert(
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
  }

  onProgress(0, total, "查询达人 ID…");
  const handles = [...new Set(rows.map((r) => r.handle))];
  const creatorMap = {};
  for (const batch of chunk(handles)) {
    const { data } = await sb.from("creators").select("id, handle").eq("store_id", storeId).in("handle", batch);
    (data || []).forEach((c) => { creatorMap[c.handle] = c.id; });
  }

  const collabRows = rows.map((r) => ({
    store_id: storeId,
    creator_id: creatorMap[r.handle],
    product_id: productMap[r.product],
    staff_id: r.staffNull ? null : (staffMap[r.staff] || null),
    ship_date: r.shipDate,
    status: r.status,
    creator_source: "manual",
    note: r.note,
  })).filter((r) => r.creator_id && r.product_id);

  const skipped = rows.length - collabRows.length;
  let inserted = 0;
  for (const batch of chunk(collabRows)) {
    await sb.from("collaborations").insert(batch);
    inserted += batch.length;
    onProgress(inserted, total, "写入寄样记录…");
  }

  return { inserted, skipped, staffAdded: missingStaff.length };
}
