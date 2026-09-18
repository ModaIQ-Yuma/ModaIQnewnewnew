// ─── 环境变量读取（唯一入口；其他文件禁止直接读 import.meta.env）────────────
// anon key 是公开密钥，写在代码里不构成泄露；优先读环境变量方便多环境切换。
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://pqrwumtocahvhecxmnse.supabase.co";

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcnd1bXRvY2FodmhlY3htbnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NzU3MTksImV4cCI6MjEwNTI1MTcxOX0.iDLuTlCspp-qKgTtQ4N5aX3DJjRnJnfQ9zj8zmHu9xc";
