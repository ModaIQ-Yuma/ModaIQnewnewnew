// modules/staff/StaffRoster.jsx — 助理名册
import { useState } from "react";
import { T, FONT, glassStyle } from "../../constants/tokens.js";
import { createStaff, updateStaff, deleteStaff } from "../../lib/supabase/staff.js";

const lk = (c) => ({ border: "none", background: "transparent", color: c, cursor: "pointer", fontSize: FONT.sm2, padding: 0, fontFamily: "inherit" });
const inp = { padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "rgba(255,255,255,0.6)", color: T.text, fontSize: FONT.lg2, fontFamily: "inherit", outline: "none" };

/** 名册数据来自核心数据中心（ctx.core.staff），改动即时同步到 CRM / 任务 / 复盘 */
export default function StaffRoster({ storeId, core }) {
  const staff = core.staff;
  const loading = core.loading;
  const [newName,  setNewName]  = useState("");
  const [editId,   setEditId]   = useState(null);
  const [editName, setEditName] = useState("");
  const [editAuth, setEditAuth] = useState("");
  const [err,      setErr]      = useState("");

  async function add() {
    if (!newName.trim()) return;
    setErr("");
    try {
      const row = await createStaff(storeId, newName);
      core.upsertRows("staff", [row]);
      setNewName("");
    } catch (e) { setErr(e.message); }
  }

  async function saveEdit(id) {
    if (!editName.trim()) return;
    try {
      const row = await updateStaff(id, { name: editName.trim(), auth_user_id: editAuth.trim() || null });
      core.upsertRows("staff", [row]);
      setEditId(null);
    } catch (e) { setErr(e.message); }
  }

  async function remove(id) {
    if (!window.confirm("删除该助理？CRM 里已指派给她的记录不受影响（仍存 staff_id）。")) return;
    await deleteStaff(id);
    core.removeRows("staff", [id]);
  }

  return (
    <div>
      {/* 添加助理 */}
      <div style={{ ...glassStyle(14), padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input style={{ ...inp, flex: 1, minWidth: 160, maxWidth: 260 }} placeholder="助理姓名，如：小红"
            value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()} />
          <button onClick={add} style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: T.grad, color: "#fff", fontWeight: 700, fontSize: FONT.lg2, fontFamily: "inherit" }}>+ 添加</button>
        </div>
        {err && <div style={{ fontSize: FONT.sm2, color: T.danger, marginTop: 8 }}>{err}</div>}
      </div>

      {/* 名册列表 */}
      {loading ? (
        <div style={{ color: T.hint, fontSize: FONT.lg2, padding: "8px 2px" }}>加载中…</div>
      ) : staff.length === 0 ? (
        <div style={{ color: T.hint, fontSize: FONT.lg2, padding: "8px 2px" }}>暂无助理，先添加。</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {staff.map((s) => (
            <div key={s.id} style={{ ...glassStyle(14), padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              {editId === s.id ? (
                <>
                  <input style={{ ...inp, flex: 1, maxWidth: 180 }} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="姓名" />
                  <input style={{ ...inp, flex: 2, fontSize: FONT.sm2 }} value={editAuth} onChange={(e) => setEditAuth(e.target.value)} placeholder="绑定 auth User ID（可选）" />
                  <button onClick={() => saveEdit(s.id)} style={{ ...inp, background: T.grad, color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, padding: "8px 14px" }}>保存</button>
                  <button onClick={() => setEditId(null)} style={lk(T.muted)}>取消</button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: FONT.xl2, fontWeight: 700, color: T.text, flex: 1 }}>{s.name}</span>
                  <span style={{ fontSize: FONT.sm, color: T.hint }}>{s.created_at?.slice(0, 10)}</span>
                  {s.auth_user_id
                    ? <span style={{ fontSize: FONT.xs, color: T.success, background: `${T.success}15`, borderRadius: 8, padding: "2px 8px", border: `1px solid ${T.success}33` }}>已绑定账号</span>
                    : <span style={{ fontSize: FONT.xs, color: T.hint, background: `${T.hint}15`, borderRadius: 8, padding: "2px 8px" }}>未绑定</span>
                  }
                  <button onClick={() => { setEditId(s.id); setEditName(s.name); setEditAuth(s.auth_user_id || ""); }} style={lk(T.accent)}>编辑</button>
                  <button onClick={() => remove(s.id)} style={lk(T.danger)}>删除</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: FONT.xs, color: T.hint, marginTop: 14, lineHeight: 1.7 }}>
        💡 绑定 auth User ID 后，系统可以识别助理登录账号，用于绩效评估和任务分配。<br />
        User ID 在 Supabase → Authentication → Users 里对照邮箱查找。
      </div>
    </div>
  );
}
