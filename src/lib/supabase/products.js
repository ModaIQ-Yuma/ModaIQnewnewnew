// ─── products 表 CRUD ───────────────────────────────────────────────────────
import { sb, unwrap, fetchAll } from "./client.js";

const COLS = "id, store_id, sku_id, internal_name, product_title, status, is_new, key_points, created_at, updated_at";

export const fetchProducts = (storeId) =>
  fetchAll((from, to) =>
    sb.from("products").select(COLS).eq("store_id", storeId).order("created_at", { ascending: false }).order("id").range(from, to),
    "products"
  );

export const createProduct = async (storeId, fields) =>
  unwrap(await sb.from("products").insert({ store_id: storeId, ...fields }).select(COLS).single(), "products");

export const updateProduct = async (id, patch) =>
  unwrap(await sb.from("products").update(patch).eq("id", id).select(COLS).single(), "products");

export const deleteProduct = async (id) =>
  unwrap(await sb.from("products").delete().eq("id", id), "products");
