// modules/staff/StaffModule.jsx
import { useState, useEffect } from "react";
import { T, FONT, glassStyle, tabStyle } from "../../constants/tokens.js";
import { sb } from "../../lib/supabase/client.js";
import StaffRoster from "./StaffRoster.jsx";

const TRIAL_DAYS = 3;
const smallBtn = (color) => ({ border:`1.5px solid ${color}55`, background:"transparent", color, fontSize:FONT.sm2, fontWeight:700, borderRadius:9, padding:"5px 12px", cursor:"pointer", fontFamily:"inherit" });
const shortId  = (id) => id ? id.slice(0, 8) + "…" : "—";

export default function StaffModule({ ctx }) {
  const { storeId, userId } = ctx;
  const [tab,      setTab]      = useState("roster");
  const [members,  setMembers]  = useState([]);
  const [codes,    setCodes]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [newCode,  setNewCode]  = useState("");
  const [newRole,  setNewRole]  = useState("staff");
  const [isTrial,  setIsTrial]  = useState(false);
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
    const row = { code: newCode.trim(), store_id: storeId, role: newRole };
    if (isTrial) {
      const exp = new Date(); exp.setDate(exp.getDate() + TRIAL_DAYS);
      row.expires_at = exp.toISOString();
    }
    const { error } = await sb.from("invite_codes").insert(row);
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
    if (!window.confirm(`将该成员角色改为「${role === "admin" ? "管理员" : "成员"}」？`)) return;
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

  const TABS = [{ id:"roster", label:"📋 助理名册" }, { id:"members", label:"👥 团队账号" }];
  const inp = { padding:"9px 12px", borderRadius:10, border:`1.5px solid ${T.border}`, background:"rgba(255,255,255,0.6)", color:T.text, fontSize:FONT.lg2, fontFamily:"inherit" };

  return (
    <div style={{ padding:20 }}>
      <h2 style={{ fontSize:FONT.x4l, fontWeight:700, color:T.text, marginBottom:14 }}>员工管理</h2>
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab===t.id)}>{t.label}</button>
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
            {loading ? <div style={{ color:T.hint, fontSize:FONT.lg2 }}>加载中…</div>
            : members.length === 0 ? <div style={{ color:T.hint, fontSize:FONT.lg2 }}>暂无成员</div>
            : (
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
                          <button onClick={() => changeRole(m.user_id, m.role === "admin" ? "staff" : "admin")} style={smallBtn(T.accent)}>
                            改为{m.role === "admin" ? "成员" : "管理员"}
                          </button>
                          <button onClick={() => removeMember(m.user_id)} style={smallBtn(T.danger)}>移除</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ marginTop:12, fontSize:FONT.xs, color:T.hint }}>💡 成员 ID 显示为缩写。完整 ID 去 Supabase → Authentication → Users 对照邮箱查找。</div>
          </div>

          {/* 邀请新成员 */}
          <div style={{ ...glassStyle(16, true), padding:"18px 20px" }}>
            <div style={{ fontSize:FONT.xl2, fontWeight:800, color:T.text, marginBottom:4 }}>邀请新成员</div>
            <div style={{ fontSize:FONT.sm2, color:T.muted, marginBottom:16 }}>邀请码内容（自定义，发给新成员）</div>

            <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
              <input style={{ ...inp, flex:1, minWidth:200 }} placeholder="如：TEAM2026" value={newCode} onChange={e => setNewCode(e.target.value)} onKeyDown={e => e.key === "Enter" && createCode()} />
              <button onClick={createCode} style={{ padding:"9px 18px", borderRadius:10, border:"none", cursor:"pointer", background:T.grad, color:"#fff", fontWeight:700, fontSize:FONT.lg2, fontFamily:"inherit" }}>生成邀请码</button>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16, flexWrap:"wrap" }}>
              <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:FONT.lg2, color:T.muted }}>
                <input type="checkbox" checked={isTrial} onChange={e => setIsTrial(e.target.checked)} />
                试用码（{TRIAL_DAYS} 天过期）
              </label>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:FONT.lg2, color:T.muted }}>加入角色：</span>
                <select style={{ ...inp, cursor:"pointer", padding:"6px 10px" }} value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="staff">成员</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
            </div>

            {/* 已建的邀请码 */}
            {codes.length > 0 && (
              <>
                <div style={{ fontSize:FONT.md2, fontWeight:700, color:T.muted, marginBottom:10 }}>已创建的邀请码</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                  {codes.map(c => {
                    const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
                    const daysLeft  = c.expires_at && !isExpired ? Math.ceil((new Date(c.expires_at) - new Date()) / 86400000) : null;
                    const expiryLabel    = isExpired ? "已过期" : daysLeft ? `${daysLeft} 天后过期` : "永久有效";
                    const expiryColor    = isExpired ? T.danger : daysLeft ? T.warning : T.success;
                    const usedLabel      = c.used_at ? `已被使用 · ${new Date(c.used_at).toLocaleDateString("zh-CN")}` : "尚未使用";
                    return (
                      <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:12, border:`1px solid ${T.border}`, background:isExpired ? `${T.danger}05` : "rgba(255,255,255,0.5)", opacity:isExpired ? 0.7 : 1 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                            <span style={{ fontSize:FONT.xl2, fontWeight:800, color:T.text, letterSpacing:"0.05em" }}>{c.code}</span>
                            <span style={{ fontSize:FONT.xs, fontWeight:700, background:`${expiryColor}18`, color:expiryColor, borderRadius:8, padding:"2px 8px" }}>{expiryLabel}</span>
                          </div>
                          <div style={{ fontSize:FONT.sm2, color:T.hint }}>{usedLabel}</div>
                        </div>
                        <button onClick={() => deleteCode(c.id)} style={smallBtn(T.danger)}>删除</button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* 使用流程 */}
            <div style={{ marginTop:14, padding:"10px 14px", borderRadius:12, background:"rgba(61,127,239,0.06)", fontSize:FONT.sm2, color:T.muted, lineHeight:1.9 }}>
              <strong style={{ color:T.text }}>使用流程：</strong><br />
              1. 输入邀请码 → 点「生成邀请码」<br />
              2. 把邀请码发给新成员<br />
              3. 新成员登录后输入邀请码，自动加入本店铺<br />
              4. 新成员默认角色是「成员」，可在成员列表里升为「管理员」
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
