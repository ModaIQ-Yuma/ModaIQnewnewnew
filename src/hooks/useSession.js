// ─── 会话状态：监听 Supabase Auth，输出 { session, checked } ─────────────────
import { useEffect, useState } from "react";
import { getSession, onAuthChange } from "../lib/supabase/auth.js";

export function useSession() {
  const [session, setSession] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    getSession()
      .then((s) => { if (alive) setSession(s); })
      .catch(() => {})
      .finally(() => { if (alive) setChecked(true); });
    const { data: sub } = onAuthChange((s) => { if (alive) setSession(s); });
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  return { session, checked };
}
