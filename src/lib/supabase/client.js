// ─── Supabase 客户端单例（全项目唯一 createClient 调用点）───────────────────
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../constants/env.js";
import { PAGE_SIZE } from "../../constants/config.js";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** 统一错误处理：抛出带表名的 Error，调用方用 try/catch 或 hook 层兜底 */
export function unwrap({ data, error }, ctx = "") {
  if (error) throw new Error(`[supabase${ctx ? ":" + ctx : ""}] ${error.message}`);
  return data;
}

/**
 * 自动翻页拉取，突破 Supabase 单次 1000 条限制。
 * @param buildQuery (from, to) => PostgrestBuilder，调用方负责 select/eq/order
 */
export async function fetchAll(buildQuery, ctx = "") {
  let all = [], from = 0;
  for (;;) {
    const page = unwrap(await buildQuery(from, from + PAGE_SIZE - 1), ctx);
    all = all.concat(page || []);
    if (!page || page.length < PAGE_SIZE) return all;
    from += PAGE_SIZE;
  }
}
