// modules/staff/MembersPanel.jsx — 团队账号：成员列表（改角色 / 移除）+ 邀请码
import { useCallback, useEffect, useState } from "react";
import { T, FONT, glassStyle } from "../../constants/tokens.js";
import { ROLE_LABELS } from "../../constants/permissions.js";
import { fetchMembers, fetchInviteCodes, updateMemberRole, removeMember } from "../../lib/supabase/members.js";
import InvitePanel from "./InvitePanel.jsx";
import { smallBtn, inp, shortId, ROLE_OPTIONS } from "./staffUi.js";

export default function MembersPanel({ storeId, userId, staff }) {
  const [members, setMembers] = useState([]);
  const [codes, setCodes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState({ text: "", ok: true });

  const toast = useCallback((text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg({ text: "", ok: true }), 4000); }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, c] = await Promise.all([fetchMembers(storeId), fetchInviteCodes(storeId)]);
      setMembers(m); setCodes(c);
    } catch (e) { toast("加载失败：" + e.message, false); }
    finally { setLoading(false); }
  }, [storeId, toast]);
  useEffect(() => { load(); }, [load]);

  /** 统一执行写操作：成功提示 + 刷新，失败提示原因 */
  const run = useCallback(async (action, okText, errPrefix) => {
    try { await action(); toast(okText); load(); }
    catch (e) { toast(`${errPrefix}：${e.message}`, false); }
  }, [toast, load]);

  const staffOfUser = (uid) => staff.find((s) => s.auth_user_id === uid)?.name;

  async function changeRole(memberId, role) {
    if (!window.confirm(`将该成员角色改为「${ROLE_LABELS[role]}」？`)) return;
    await run(() => updateMemberRole(storeId, memberId, role), "角色已更新", "修改失败");
  }
  async function kick(memberId) {
    if (!window.confirm("将该成员从本店铺移除？")) return;
    await run(() => removeMember(storeId, memberId), "已移除", "移除失败");
  }

  return (
    <div>
      {msg.text && (
        <div style={{ padding:"10px 16px", borderRadius:12, marginBottom:16, fontSize:FONT.body, fontWeight:600, background:`${msg.ok ? T.success : T.danger}18`, color: msg.ok ? T.success : T.danger }}>{msg.text}</div>
      )}
      <div style={{ ...glassStyle(16, true), padding:"18px 20px", marginBottom:18 }}>
        <div style={{ fontSize:FONT.h2, fontWeight:800, color:T.text, marginBottom:14 }}>当前成员</div>
        {loading ? <div style={{ color:T.hint }}>加载中…</div> : members.length === 0 ? <div style={{ color:T.hint }}>暂无成员</div> : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {members.map((m) => {
              const isMe = m.user_id === userId, bound = staffOfUser(m.user_id);
              return (
                <div key={m.user_id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:12, border:`1px solid ${T.border}`, background: isMe ? "rgba(61,127,239,0.06)" : "rgba(255,255,255,0.5)" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:FONT.body, fontWeight:700, color:T.text }}>
                      {bound || shortId(m.user_id)}{isMe && <span style={{ fontSize:FONT.tiny, color:T.accent, marginLeft:6 }}>（我）</span>}
                    </div>
                    <div style={{ fontSize:FONT.note, color:T.hint, marginTop:1 }}>
                      {ROLE_LABELS[m.role] || m.role} · {bound ? `已绑定助理「${bound}」` : "未绑定助理名册"} · ID {shortId(m.user_id)}
                    </div>
                  </div>
                  {!isMe && (
                    <div style={{ display:"flex", gap:8 }}>
                      <select value={m.role} onChange={(e) => changeRole(m.user_id, e.target.value)} style={{ ...inp, padding:"5px 10px", cursor:"pointer" }}>
                        {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <button onClick={() => kick(m.user_id)} style={smallBtn(T.danger)}>移除</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ marginTop:12, fontSize:FONT.tiny, color:T.hint }}>💡 已绑定助理名册的账号显示助理名字；未绑定的显示 ID 缩写，可在「助理名册」里绑定，或下次用带绑定的邀请码加入。</div>
      </div>
      <InvitePanel storeId={storeId} staff={staff} codes={codes} run={run} toast={toast} />
    </div>
  );
}
