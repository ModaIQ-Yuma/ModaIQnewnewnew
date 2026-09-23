// lib/supabase/crmImport.js — CRM 批量写入
import { sb } from "./client.js";
export { parseRows } from "../crm/crmParser.js";

const CHUNK = 200;
const chunk = (arr) => {
  const res = [];
  for (let i = 0; i < arr.length; i += CHUNK) res.push(arr.slice(i, i + CHUNK));
  return res;
};

// 属性字段列表（与 creators 表列名一致）
const ATTR_KEYS = ["grade", "histSales", "convVert", "avgViews", "femaleRatio", "language",
                   "bodyType", "ageRange", "contentVert", "style", "videoQuality", "voiceover", "aliases"];
const hasAttrs = (r) => ATTR_KEYS.some((k) => r[k] != null && r[k] !== "");

/**
 * 每个 handle 取最新寄样记录的属性；若最新记录属性为空，
 * 向前找最近一条属性非空的记录补填（不用空值覆盖历史数据）
 */
function dedupeCreators(rows) {
  const byHandle = {};
  for (const r of rows) {
    if (!byHandle[r.handle]) byHandle[r.handle] = [];
    byHandle[r.handle].push(r);
  }
  return Object.values(byHandle).map((rs) => {
    rs.sort((a, b) => (b.shipDate || "").localeCompare(a.shipDate || ""));
    const latest = rs[0];
    if (hasAttrs(latest)) return latest;
    const fallback = rs.find((r) => hasAttrs(r));
    if (!fallback) return latest;
    const merged = { ...latest };
    for (const k of ATTR_KEYS) {
      if ((merged[k] == null || merged[k] === "") && fallback[k]) merged[k] = fallback[k];
    }
    return merged;
  });
}

/**
 * @param {string} storeId
 * @param {object[]} rows        parseRows 的输出
 * @param {function} onProgress  (done, total, label) => void
 * @param {"full"|"attrs_only"} mode
 */
export async function importCRM(storeId, rows, onProgress, mode = "full") {
  const total = rows.length;

  // ── 1. 查询产品和跟进人 ──────────────────────────────────────────────────
  onProgress(0, total, "查询产品数据…");
  const { data: products, error: pErr } = await sb.from("products").select("id, internal_name").eq("store_id", storeId);
  if (pErr) throw new Error("查询产品失败：" + pErr.message);
  const productMap = Object.fromEntries((products || []).map((p) => [p.internal_name, p.id]));

  onProgress(0, total, "查询跟进人数据…");
  const { data: staffRows, error: sErr } = await sb.from("staff").select("id, name").eq("store_id", storeId);
  if (sErr) throw new Error("查询跟进人失败：" + sErr.message);
  const staffMap = Object.fromEntries((staffRows || []).map((s) => [s.name, s.id]));

  // 自动创建缺失的跟进人
  const missingStaff = [...new Set(rows.filter((r) => !r.staffNull && r.staff && !staffMap[r.staff]).map((r) => r.staff))];
  for (const name of missingStaff) {
    const { data } = await sb.from("staff").upsert({ store_id: storeId, name }, { onConflict: "store_id,name" }).select("id, name").single();
    if (data) staffMap[data.name] = data.id;
  }

  // ── 2. 写入达人属性 ───────────────────────────────────────────────────────
  onProgress(0, total, "写入达人信息…");
  const uniqueCreators = dedupeCreators(rows);
  for (const batch of chunk(uniqueCreators)) {
    const { error: crtErr } = await sb.from("creators").upsert(
      batch.map((r) => ({
        store_id:         storeId,
        handle:           r.handle,
        official_grade:   r.grade,
        hist_sales:       r.histSales,
        conv_vertical:    r.convVert,
        avg_views:        r.avgViews,
        female_ratio:     r.femaleRatio,
        language:         r.language,
        body_type:        r.bodyType,
        age_range:        r.ageRange,
        content_vertical: r.contentVert,
        style:            r.style,
        video_quality:    r.videoQuality,
        voiceover:        r.voiceover,
        aliases:          r.aliases,
      })),
      { onConflict: "store_id,handle" }
    );
    if (crtErr) throw new Error("写入达人信息失败：" + crtErr.message);
  }

  // ── 仅更新达人属性模式：到此结束 ─────────────────────────────────────────
  if (mode === "attrs_only") {
    return { inserted: 0, skipped: total, staffAdded: missingStaff.length, attrsUpdated: uniqueCreators.length };
  }

  // ── 3. 写入寄样记录（完整导入模式）──────────────────────────────────────
  onProgress(0, total, "查询达人 ID…");
  const handles = [...new Set(rows.map((r) => r.handle))];
  const creatorMap = {};
  for (const batch of chunk(handles)) {
    const { data } = await sb.from("creators").select("id, handle").eq("store_id", storeId).in("handle", batch);
    (data || []).forEach((c) => { creatorMap[c.handle] = c.id; });
  }

  const collabRowsRaw = rows.map((r) => ({
    store_id:       storeId,
    creator_id:     creatorMap[r.handle],
    product_id:     productMap[r.product],
    staff_id:       r.staffNull ? null : (staffMap[r.staff] || null),
    ship_date:      r.shipDate,
    status:         r.status,
    creator_source: "manual",
    note:           r.note,
    _handle:        r.handle,
    _product:       r.product,
  }));

  const collabRows = collabRowsRaw.filter((r) => r.creator_id && r.product_id).map(({ _handle, _product, ...r }) => r);
  const skipped    = rows.length - collabRows.length;
  let inserted     = 0;

  for (const batch of chunk(collabRows)) {
    const { error: cErr } = await sb.from("collaborations").insert(batch);
    if (cErr) throw new Error("写入寄样记录失败：" + cErr.message);
    inserted += batch.length;
    onProgress(inserted, total, "写入寄样记录…");
  }

  return { inserted, skipped, staffAdded: missingStaff.length, attrsUpdated: uniqueCreators.length };
}
