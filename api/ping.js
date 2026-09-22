// api/ping.js — Vercel Serverless Function，每天定时 ping Supabase 保活
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.SUPABASE_URL || "https://pqrwumtocahvhecxmnse.supabase.co",
  process.env.SUPABASE_ANON_KEY || ""
);

export default async function handler(req, res) {
  try {
    // 轻量查询：只拉 1 条，唤醒数据库
    await sb.from("stores").select("id").limit(1);
    res.status(200).json({ ok: true, time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
