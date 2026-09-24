// modules/staff/InvitePanel.jsx — 邀请新成员：生成邀请码（角色 + 可预绑定助理），管理已建的码
import { useState } from "react";
import { T, FONT, glassStyle } from "../../constants/tokens.js";
import { ROLE_LABELS } from "../../constants/permissions.js";
import { createInviteCode, deleteInviteCode } from "../../lib/supabase/members.js";
import { smallBtn, inp, ROLE_OPTIONS } from "./staffUi.js";

const TRIAL_DAYS = 3;

export default function InvitePanel({ storeId, staff, codes, run, toast }) {
  const [code, setCode]       = useState("");
  const [role, setRole]       = useState("staff");
  const [staffId, setStaffId] = useState("");
  const [isTrial, setIsTrial] = useState(false);
  const staffName = (id) => staff.find((s) => s.id === id)?.name;
  const unbound = staff.filter((s) => !s.auth_user_id);

  async function create() {
    if (!code.trim()) { toast("请输入邀请码内容", false); return; }
    const expiresAt = isTrial ? new Date(Date.now() + TRIAL_DAYS * 864e5).toISOString() : null;
    await run(() => createInviteCode(storeId, { code: code.trim(), role, expiresAt, staffId: staffId || null }),
      `邀请码已创建。发给对方，登录后输入即可加入${staffId ? `，并自动绑定为「${staffName(staffId)}」` : ""}。`, "创建失败");
    setCode(""); setStaffId("");
  }
  async function remove(c) {
    if (!window.confirm("删除这个邀请码？已使用该码的成员不受影响。")) return;
    await run(() => deleteInviteCode(storeId, c), "邀请码已删除", "删除失败");
  }

  return (
    <div style={{ ...glassStyle(16, true), padding:"18px 20px" }}>
      <div style={{ fontSize:FONT.h2, fontWeight:800, color:T.text, marginBottom:4 }}>邀请新成员</div>
      <div style={{ fontSize:FONT.note, color:T.muted, marginBottom:14 }}>邀请码内容自定义；选了「绑定助理」的话，对方兑换后账号会自动和这个助理对上（绩效、行动清单就能看到自己的）。</div>
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12, flexWrap:"wrap" }}>
        <input style={{ ...inp, flex:1, minWidth:180 }} placeholder="如：TEAM2026" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
        <select style={{ ...inp, cursor:"pointer" }} value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>加入为：{l}</option>)}
        </select>
        <select style={{ ...inp, cursor:"pointer" }} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="">不绑定助理</option>
          {unbound.map((s) => <option key={s.id} value={s.id}>绑定助理：{s.name}</option>)}
        </select>
        <button onClick={create} style={{ padding:"9px 18px", borderRadius:10, border:"none", cursor:"pointer", background:T.grad, color:"#fff", fontWeight:700, fontSize:FONT.body, fontFamily:"inherit" }}>生成邀请码</button>
      </div>
      <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:FONT.body, color:T.muted, marginBottom:16 }}>
        <input type="checkbox" checked={isTrial} onChange={(e) => setIsTrial(e.target.checked)} />试用码（{TRIAL_DAYS} 天后过期）
      </label>

      {codes.length > 0 && <div style={{ fontSize:FONT.note, fontWeight:700, color:T.muted, marginBottom:10 }}>已创建的邀请码</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {codes.map((c) => {
          const expired = c.expires_at && new Date(c.expires_at) < new Date();
          const days = c.expires_at && !expired ? Math.ceil((new Date(c.expires_at) - new Date()) / 864e5) : null;
          const color = expired ? T.danger : days ? T.warning : T.success;
          return (
            <div key={c.code} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:12, border:`1px solid ${T.border}`, background:"rgba(255,255,255,0.5)", opacity: expired ? 0.7 : 1 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                  <span style={{ fontSize:FONT.h3, fontWeight:800, color:T.text, letterSpacing:"0.05em" }}>{c.code}</span>
                  <span style={{ fontSize:FONT.tiny, fontWeight:700, background:`${color}18`, color, borderRadius:8, padding:"2px 8px" }}>{expired ? "已过期" : days ? `${days} 天后过期` : "永久有效"}</span>
                  <span style={{ fontSize:FONT.tiny, color:T.muted }}>{ROLE_LABELS[c.role] || c.role}{c.staff_id ? ` · 绑定「${staffName(c.staff_id) || "已删除的助理"}」` : ""}</span>
                </div>
                <div style={{ fontSize:FONT.note, color:T.hint }}>{c.used_at ? `已被使用 · ${new Date(c.used_at).toLocaleDateString("zh-CN")}` : "尚未使用"}</div>
              </div>
              <button onClick={() => remove(c.code)} style={smallBtn(T.danger)}>删除</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
