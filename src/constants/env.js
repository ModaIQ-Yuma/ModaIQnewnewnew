// ─── 环境变量读取（唯一入口；其他文件禁止直接读 import.meta.env）────────────
// anon key 是公开密钥，写在代码里不构成泄露；优先读环境变量方便多环境切换。
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://pqrwumtocahvhecxmnse.supabase.co";

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnd1bXRvY2FodmhlY3htbnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NzU3MTksImV4cCI6MjEwNTI1MTcxOX0.iDLuTlCspp-qKgTtQ4N5aX3DJjRnJnfQ9zj8zmHu9xc";

// ─── FSorder（FireSwan 自己的订单统计站，另一个 Supabase 项目）───────────────
// 只提供 FireSwan 店铺的整店订单数据，所以仅对 FSORDER_STORE_ID 这家店开启；
// 其他租户看不到、也不会去查。换店铺或关闭：改环境变量即可，不用改代码。
export const FSORDER_URL =
  import.meta.env.VITE_FSORDER_URL || "https://yenrqhetdirrwolekdyl.supabase.co";
export const FSORDER_ANON_KEY =
  import.meta.env.VITE_FSORDER_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllbnJxaGV0ZGlycndvbGVrZHlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzYyMDksImV4cCI6MjEwMTA1MjIwOX0.ULda3ZrNUaDWTLVBZUqdEaIjzRaYkRptabYqqZYA8l0";
export const FSORDER_STORE_ID =
  import.meta.env.VITE_FSORDER_STORE_ID || "05adab36-7b10-43cf-ad94-128c5954db60";
