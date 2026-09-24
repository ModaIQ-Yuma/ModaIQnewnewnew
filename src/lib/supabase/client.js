// ─── Supabase 客户端单例（全项目唯一 createClient 调用点）───────────────────
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, FSORDER_URL, FSORDER_ANON_KEY } from "../../constants/env.js";
import { PAGE_SIZE, PAGE_WAVE } from "../../constants/config.js";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** FSorder 订单站只读客户端（不登录、不存会话，避免与主站会话冲突） */
export const sbFS = FSORDER_URL
  ? createClient(FSORDER_URL, FSORDER_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "fsorder" } })
  : null;

/** 统一错误处理：抛出带表名的 Error，调用方用 try/catch 或 hook 层兜底 */
export function unwrap({ data, error }, ctx = "") {
  if (error) throw new Error(`[supabase${ctx ? ":" + ctx : ""}] ${error.message}`);
  return data;
}

/** 拉一页；越界（PGRST103）视为空页 */
async function fetchPage(buildQuery, page, ctx) {
  const from = page * PAGE_SIZE;
  const res = await buildQuery(from, from + PAGE_SIZE - 1);
  if (res.error?.code === "PGRST103") return [];
  return unwrap(res, ctx) || [];
}

/**
 * 自动翻页拉取，突破 Supabase 单次 1000 条限制。
 * 先拉第 1 页；满页再按波次并行拉（每波 PAGE_WAVE 页），8000 条只需 3 轮往返。
 * @param buildQuery (from, to) => PostgrestBuilder，调用方负责 select/eq/order（order 必须唯一稳定）
 */
export async function fetchAll(buildQuery, ctx = "") {
  let all = await fetchPage(buildQuery, 0, ctx);
  if (all.length < PAGE_SIZE) return all;
  for (let next = 1; ; next += PAGE_WAVE) {
    const pages = await Promise.all(
      Array.from({ length: PAGE_WAVE }, (_, i) => fetchPage(buildQuery, next + i, ctx))
    );
    for (const p of pages) all = all.concat(p);
    if (pages.some((p) => p.length < PAGE_SIZE)) return all;
  }
}

/**
 * .in() 分片查询：值很多时（如一个月几千条视频 ID / 达人名）拆成多批并行请求，
 * 避免请求地址过长被拒。buildQuery(part) 返回带 .in(列, part) 的查询。
 */
export async function selectIn(values, buildQuery, ctx = "", size = 150) {
  const uniq = [...new Set(values)];
  const parts = Array.from({ length: Math.ceil(uniq.length / size) }, (_, i) => uniq.slice(i * size, i * size + size));
  const results = await Promise.all(parts.map(async (part) => unwrap(await buildQuery(part), ctx) || []));
  return results.flat();
}
