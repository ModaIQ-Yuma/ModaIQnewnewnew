// modules/staff/StaffModule.jsx
import { useState, useEffect } from "react";
import { T, FONT, glassStyle } from "../../constants/tokens.js";
import { sb, unwrap } from "../../lib/supabase/client.js";
import StaffRoster from "./StaffRoster.jsx";

const smallBtn = (color) => ({ border:`1.5px solid ${color}55`, background:"transparent", color, fontSize:FONT.sm2, fontWeight:700, borderRadius:9, padding:"5px 12px", cursor:"pointer", fontFamily:"inherit" });
const shortId = (id) => id ? id.slice(0, 8) + "…" : "—";

export default function StaffModule({ ctx }) {
  const { storeId, userId } = ctx;
  const [members,  setMembers]  = useState([]);
  const [codes,    setCodes]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [newCode,  setNewCode]  = useState("");
  const [newRole,  setNewRole]  = useState("member");
  const [msg,      setMsg]      = useState("");
  const [msgType,  setMsgType]  = useState("ok");

  useEffect(() => { load(); }, [storeId]);

  async function load() {
    if (!storeId) return;
    setLoading(true);
    const [{ data: roles }, { data: inv }] = await Promise.all([
      sb.from("user_store_roles").select("user_id, role").eq("store_id", storeId),
      sb.from("invite_codes").select("id, code, used_by, used_at, expires_at, created_at").eq("store_id", storeId).order("created_at", { ascending: false }),
    ]);
    setMembers(roles || []);
    setCodes(inv || []);
    setLoading(false);
  }

  function toast(text, type = "ok") { setMsg(text); setMsgType(type); setTimeout(() => setMsg(""), 4000); }

  async function createCode() {
    if (!newCode.trim()) { toast("请输入邀请码内容", "err"); return; }
    const { error } = await sb.from("invite_codes").insert({ code: newCode.trim(), store_id: storeId, role: newRole });
    if (error) { toast("创建失败：" + error.message, "err"); return; }
    toast("邀请码创建成功！把它发给新成员，她用这个码登录后自动加入本店铺。");
    setNewCode(""); load();
  }

  async function deleteCode(id) {
    if (!window.confirm("删除这个邀请码？已使用该码的成员不受影响。")) return;
    await sb.from("invite_codes").delete().eq("id", id);
    load();
  }

  async function changeRole(memberId, role) {
    if (memberId === userId) { toast("不能修改自己的角色", "err"); return; }
    if (!window.confirm(`将该成员角色改为「${role}」？`)) return;
    const { error } = await sb.from("user_store_roles").update({ role }).eq("user_id", memberId).eq("store_id", storeId);
    if (error) { toast("修改失败：" + error.message, "err"); return; }
    toast("角色已更新"); load();
  }

  async function removeMember(memberId) {
    if (memberId === userId) { toast("不能移除自己", "err"); return; }
    if (!window.confirm("将该成员从本店铺移除？")) return;
    const { error } = await sb.from("user_store_roles").delete().eq("user_id", memberId).eq("store_id", storeId);
    if (error) { toast("移除失败：" + error.message, "err"); return; }
    toast("已移除"); load();
  }

  const [tab, setTab] = useState("roster");
  const inp = { padding:"9px 12px", borderRadius:10, border:`1.5px solid ${T.border}`, background:"rgba(255,255,255,0.6)", color:T.text, fontSize:FONT.lg2, fontFamily:"inherit", flex:1 };

  const TABS = [{ id:"roster", label:"📋 助理名册" }, { id:"members", label:"👥 成员管理" }];

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: FONT.x4l, fontWeight: 700, color: T.text, marginBottom: 14 }}>员工管理</h2>
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ fontSize:FONT.lg2, padding:"6px 16px", borderRadius:18, border:`1.5px solid ${tab===t.id ? T.accent : T.border}`, background:tab===t.id ? T.accent : "transparent", color:tab===t.id ? "#fff" : T.muted, cursor:"pointer", fontFamily:"inherit", fontWeight:tab===t.id ? 700 : 600 }}>{t.label}</button>
        ))}
      </div>
      {tab === "roster" && <StaffRoster storeId={storeId} />}
      {tab === "members" && (

      <div>
      {msg && (
        <div style={{ padding:"10px 16px", borderRadius:12, marginBottom:16, fontSize:FONT.lg2, fontWeight:600, background:msgType==="ok" ? `${T.success}18` : `${T.danger}18`, color:msgType==="ok" ? T.success : T.danger, border:`1px solid ${msgType==="ok" ? T.success : T.danger}44` }}>
          {msg}
        </div>
      )}

      {/* 当前成员 */}
      <div style={{ ...glassStyle(16, true), padding:"18px 20px", marginBottom:18 }}>
        <div style={{ fontSize:FONT.xl2, fontWeight:800, color:T.text, marginBottom:14 }}>当前成员</div>
        {loading ? (
          <div style={{ color:T.hint, fontSize:FONT.lg2 }}>加载中…</div>
        ) : members.length === 0 ? (
          <div style={{ color:T.hint, fontSize:FONT.lg2 }}>暂无成员</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {members.map(m => {
              const isMe = m.user_id === userId;
              return (
                <div key={m.user_id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:12, border:`1px solid ${T.border}`, background:isMe ? "rgba(61,127,239,0.06)" : "rgba(255,255,255,0.5)" }}>
                  <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0, background:T.gradSoft, border:`1.5px solid ${T.accent}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:FONT.lg2, fontWeight:800, color:T.accent }}>
                    {m.role === "admin" ? "A" : "M"}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:FONT.md2, fontWeight:700, color:T.text }}>
                      {shortId(m.user_id)}{isMe && <span style={{ fontSize:FONT.sm, color:T.accent, marginLeft:6 }}>（我）</span>}
                    </div>
                    <div style={{ fontSize:FONT.sm2, color:T.hint, marginTop:1 }}>{m.role === "admin" ? "管理员" : "成员"}</div>
                  </div>
                  {!isMe && (
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => changeRole(m.user_id, m.role === "admin" ? "member" : "admin")} style={smallBtn(T.accent)}>改为{m.role === "admin" ? "成员" : "管理员"}</button>
                      <button onClick={() => removeMember(m.user_id)} style={smallBtn(T.danger)}>移除</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ marginTop:12, fontSize:FONT.xs, color:T.hint }}>💡 成员 ID 显示为缩写。如需完整 ID，去 Supabase → Authentication → Users 对照邮箱查找。</div>
      </div>

      {/* 邀请码 */}
      <div style={{ ...glassStyle(16, true), padding:"18px 20px" }}>
        <div style={{ fontSize:FONT.xl2, fontWeight:800, color:T.text, marginBottom:14 }}>邀请码管理</div>
        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
          <input style={inp} placeholder="输入邀请码（如 fireswan2026）" value={newCode} onChange={e => setNewCode(e.target.value)} />
          <select style={{ ...inp, flex:"none", width:120, cursor:"pointer" }} value={newRole} onChange={e => setNewRole(e.target.value)}>
            <option value="member">成员</option>
            <option value="admin">管理员</option>
          </select>
          <button onClick={createCode} style={{ padding:"9px 18px", borderRadius:10, border:"none", cursor:"pointer", background:T.grad, color:"#fff", fontWeight:700, fontSize:FONT.lg2, fontFamily:"inherit" }}>创建</button>
        </div>
        {codes.length === 0 ? (
          <div style={{ color:T.hint, fontSize:FONT.lg2 }}>暂无邀请码</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {codes.map(c => (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:12, border:`1px solid ${T.border}`, background:"rgba(255,255,255,0.5)", opacity:c.used_by ? 0.6 : 1 }}>
                <code style={{ flex:1, fontSize:FONT.lg2, fontWeight:700, color:T.text, letterSpacing:"0.05em" }}>{c.code}</code>
                <span style={{ fontSize:FONT.sm, color:c.used_by ? T.success : T.hint }}>{c.used_by ? "已使用" : "未使用"}</span>
                <span style={{ fontSize:FONT.xs, color:T.hint }}>{c.created_at?.slice(0, 10)}</span>
                <button onClick={() => deleteCode(c.id)} style={smallBtn(T.danger)}>删除</button>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      )}
    </div>
  );
}
