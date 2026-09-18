import { useState } from "react";
import { redeemInvite } from "../../lib/supabase/invites.js";
import { signOut } from "../../lib/supabase/auth.js";
import WaterBackground from "../layout/WaterBackground.jsx";
import { T, glassStyle } from "../../constants/tokens.js";

/** 已登录但不属于任何店铺：输入邀请码加入 */
export default function InviteGate({ userId, onJoined }) {
  const [code, setCode] = useState("");
  const [msg, setMsg]   = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!code.trim()) return;
    setBusy(true); setMsg("");
    try { await redeemInvite(code, userId); onJoined(); }
    catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, 'PingFang SC', sans-serif", padding: 20, position: "relative" }}>
      <WaterBackground />
      <div style={{ ...glassStyle(24, true), width: "100%", maxWidth: 400, padding: "36px 32px", zIndex: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>输入邀请码</div>
        <div style={{ fontSize: 12.5, color: T.hint, marginBottom: 20 }}>你的账号尚未加入任何店铺，请向管理员索取邀请码。</div>
        <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="邀请码"
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 15, fontFamily: "inherit", outline: "none", background: "rgba(255,255,255,0.6)" }} />
        {msg && <div style={{ fontSize: 12.5, color: T.danger, marginTop: 10 }}>{msg}</div>}
        <button onClick={submit} disabled={busy} style={{ width: "100%", marginTop: 16, padding: "11px 0", borderRadius: 12, border: "none", background: T.grad, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
          {busy ? "验证中…" : "加入店铺"}
        </button>
        <div onClick={signOut} style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: T.hint, cursor: "pointer" }}>退出登录</div>
      </div>
    </div>
  );
}
