// modules/platform/PlatformModule.jsx — 平台管理（仅超管）：店铺、首个管理员邀请码、超管名单
import { useCallback, useEffect, useState } from "react";
import { T, FONT, glassStyle } from "../../constants/tokens.js";
import { SectionIntro } from "../../components/layout/SubNav.jsx";
import { fetchAllStores, createStore, renameStore, fetchSuperAdmins, addSuperAdmin, removeSuperAdmin } from "../../lib/supabase/platform.js";
import { createInviteCode } from "../../lib/supabase/members.js";
import { smallBtn, inp, shortId } from "../staff/staffUi.js";

const card = { ...glassStyle(16, true), padding: "18px 20px", marginBottom: 18 };
const h = { fontSize: FONT.h2, fontWeight: 800, color: T.text, marginBottom: 12 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const newCode = () => "ADMIN-" + Math.random().toString(36).slice(2, 8).toUpperCase();

export default function PlatformModule({ ctx }) {
  const [stores, setStores] = useState([]);
  const [supers, setSupers] = useState([]);
  const [name, setName]     = useState("");
  const [uid, setUid]       = useState("");
  const [msg, setMsg]       = useState({ text: "", ok: true });

  const load = useCallback(async () => {
    try { const [s, a] = await Promise.all([fetchAllStores(), fetchSuperAdmins()]); setStores(s); setSupers(a); }
    catch (e) { setMsg({ text: "加载失败：" + e.message, ok: false }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run(action, okText) {
    try { const extra = await action(); setMsg({ text: okText + (extra || ""), ok: true }); load(); ctx.reloadStores?.(); }
    catch (e) { setMsg({ text: "❌ " + e.message, ok: false }); }
  }
  /** 给店铺生成一个管理员邀请码（新店铺的第一个管理员用） */
  const adminInvite = (storeId) => run(async () => { const c = newCode(); await createInviteCode(storeId, { code: c, role: "admin" }); return `：${c}`; }, "✅ 已生成管理员邀请码");

  return (
    <div>
      <SectionIntro style={{ marginBottom: 14 }}>只有超管能看到这一页。新建店铺后会自动生成一个管理员邀请码，发给这家店的负责人，她登录后输入即可成为该店管理员。</SectionIntro>
      {msg.text && <div style={{ fontSize: FONT.body, fontWeight: 600, marginBottom: 14, color: msg.ok ? T.success : T.danger, userSelect: "all" }}>{msg.text}</div>}

      <div style={card}>
        <div style={h}>🏪 店铺（{stores.length}）</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <input style={{ ...inp, flex: 1, minWidth: 200 }} placeholder="新店铺名称" value={name} onChange={(e) => setName(e.target.value)} />
          <button style={smallBtn(T.accent)} disabled={!name.trim()} onClick={() => run(async () => {
            const s = await createStore(name.trim()); const c = newCode();
            await createInviteCode(s.id, { code: c, role: "admin" }); setName(""); return `，管理员邀请码：${c}`;
          }, "✅ 店铺已创建")}>+ 新建店铺</button>
        </div>
        {stores.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${T.glassStroke}`, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: FONT.body, fontWeight: 700, color: T.text }}>{s.name}{s.id === ctx.storeId && <span style={{ fontSize: FONT.tiny, color: T.accent, marginLeft: 6 }}>（当前）</span>}</div>
              <div style={{ fontSize: FONT.note, color: T.hint }}>{s.members} 个成员（管理员 {s.admins}）· 创建于 {s.created_at?.slice(0, 10)}</div>
            </div>
            <button style={smallBtn(T.muted)} onClick={() => { const n = window.prompt("新的店铺名称", s.name); if (n?.trim()) run(() => renameStore(s.id, n.trim()), "✅ 已重命名"); }}>重命名</button>
            <button style={smallBtn(T.accent)} onClick={() => adminInvite(s.id)}>生成管理员邀请码</button>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={h}>👑 超管（{supers.length}）</div>
        <div style={{ fontSize: FONT.note, color: T.hint, marginBottom: 12 }}>
          超管能进入所有店铺并在每家店都是管理员。添加时填对方的账号 ID（她登录后在这一页能看到自己的；或在 Supabase → Authentication → Users 查）。
          你的账号 ID：<b style={{ color: T.text, userSelect: "all" }}>{ctx.userId}</b>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <input style={{ ...inp, flex: 1, minWidth: 280 }} placeholder="账号 ID（uuid）" value={uid} onChange={(e) => setUid(e.target.value.trim())} />
          <button style={smallBtn(T.accent)} disabled={!UUID.test(uid)} onClick={() => run(async () => { await addSuperAdmin(uid); setUid(""); }, "✅ 已添加超管")}>+ 添加</button>
        </div>
        {supers.map((u) => (
          <div key={u} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: `1px solid ${T.glassStroke}` }}>
            <span style={{ flex: 1, fontSize: FONT.body, color: T.text }} title={u}>{shortId(u)}{u === ctx.userId && <span style={{ color: T.accent, fontSize: FONT.tiny, marginLeft: 6 }}>（我）</span>}</span>
            {u !== ctx.userId && <button style={smallBtn(T.danger)} onClick={() => { if (window.confirm("移除这个超管？")) run(() => removeSuperAdmin(u), "✅ 已移除"); }}>移除</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
