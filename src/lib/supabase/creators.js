// ─── creators + creator_aliases 表 CRUD ────────────────────────────────────
import { sb, unwrap, fetchAll } from "./client.js";

const COLS = "id,store_id,handle,official_grade,hist_sales,conv_vertical,avg_views,female_ratio,language,body_type,age_range,content_vertical,style,video_quality,voiceover,note,created_at,updated_at";

export const fetchCreators = (storeId) =>
  fetchAll((from, to) =>
    sb.from("creators").select(COLS).eq("store_id", storeId).order("created_at", { ascending: false }).order("id").range(from, to),
    "creators"
  );

export const upsertCreator = async (storeId, fields) => {
  const { handle, ...rest } = fields;
  const existing = unwrap(
    await sb.from("creators").select("id").eq("store_id", storeId).ilike("handle", handle.trim()).maybeSingle(),
    "creators"
  );
  if (existing) {
    return unwrap(await sb.from("creators").update({ ...rest, handle: handle.trim() }).eq("id", existing.id).select(COLS).single(), "creators");
  }
  return unwrap(await sb.from("creators").insert({ store_id: storeId, handle: handle.trim(), ...rest }).select(COLS).single(), "creators");
};

export const fetchAliases = async (storeId) => {
  const rows = unwrap(await sb.from("creator_aliases").select("creator_id,alias").eq("store_id", storeId), "creator_aliases");
  // alias → creator_id 反查表
  return Object.fromEntries(rows.map((r) => [r.alias.toLowerCase(), r.creator_id]));
};

export const addAlias = async (storeId, creatorId, alias) =>
  unwrap(
    await sb.from("creator_aliases").upsert({ store_id: storeId, creator_id: creatorId, alias: alias.trim().toLowerCase() }, { onConflict: "store_id,alias" }),
    "creator_aliases"
  );

/** handle 改名：旧 handle 存入 aliases，creator 更新新 handle */
export const renameHandle = async (storeId, creatorId, oldHandle, newHandle) => {
  await addAlias(storeId, creatorId, oldHandle);
  return unwrap(
    await sb.from("creators").update({ handle: newHandle.trim() }).eq("id", creatorId).select(COLS).single(),
    "creators"
  );
};
