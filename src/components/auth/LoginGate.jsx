import { useState } from "react";
import { signIn, signUp } from "../../lib/supabase/auth.js";
import WaterBackground from "../layout/WaterBackground.jsx";
import { T } from "../../constants/tokens.js";

const glass = {
  background: "rgba(228,240,255,0.72)",
  backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: "1.5px solid rgba(180,215,255,0.70)",
  boxShadow: "0 8px 48px rgba(40,100,200,0.16), inset 0 1px 0 rgba(255,255,255,0.6)",
};
const input = {
  width: "100%", boxSizing: "border-box", background: "rgba(210,230,255,0.45)",
  border: "1.5px solid rgba(150,195,255,0.55)", borderRadius: 10, fontSize: 15,
  padding: "11px 14px", fontFamily: "inherit", outline: "none", color: T.text,
};

export default function LoginGate() {
  const [mode, setMode]   = useState("login");
  const [email, setEmail] = useState("");
  const [pwd, setPwd]     = useState("");
  const [msg, setMsg]     = useState("");
  const [busy, setBusy]   = useState(false);

  async function submit() {
    if (!email.trim() || !pwd) { setMsg("请填写邮箱和密码"); return; }
    setBusy(true); setMsg("");
    const { error } = mode === "login" ? await signIn(email, pwd) : await signUp(email, pwd);
    if (error) setMsg((mode === "login" ? "登录失败：" : "注册失败：") + (error.message.includes("Invalid") ? "邮箱或密码错误" : error.message));
    else if (mode === "signup") setMsg("注册成功，请登录。若提示需邮箱验证，请先查收邮件。");
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, 'PingFang SC', sans-serif", padding: 20, position: "relative" }}>
      <WaterBackground />
      <div style={{ width: "100%", maxWidth: 400, borderRadius: 24, padding: "40px 36px", position: "relative", zIndex: 10, ...glass }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "0.08em", background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Moda.IQ</div>
          <div style={{ fontSize: 12, color: T.hint, marginTop: 4 }}>{mode === "login" ? "登录" : "注册新账号"}</div>
        </div>
        <input style={input} placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div style={{ height: 12 }} />
        <input style={input} type="password" placeholder="密码" value={pwd} onChange={(e) => setPwd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        {msg && <div style={{ fontSize: 12.5, color: msg.includes("成功") ? T.success : T.danger, marginTop: 12 }}>{msg}</div>}
        <button onClick={submit} disabled={busy} style={{ width: "100%", marginTop: 20, padding: "12px 0", borderRadius: 12, border: "none", background: T.grad, color: "#fff", fontSize: 15, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>
          {busy ? "请稍候…" : mode === "login" ? "登录" : "注册"}
        </button>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12.5, color: T.hint }}>
          {mode === "login" ? "没有账号？" : "已有账号？"}
          <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(""); }} style={{ color: T.accent, cursor: "pointer", fontWeight: 600, marginLeft: 6 }}>
            {mode === "login" ? "注册" : "登录"}
          </span>
        </div>
      </div>
    </div>
  );
}
