// modules/staff/CreatorOwnership.jsx — 达人归属：冲突检查 + 管理员变更归属
// 归属人 = 达人最早一条有跟进人的寄样的跟进人；变更归属 = 把她的寄样跟进人一次性改成新的人。
import { useMemo, useState } from "react";
import { glassStyle, T, FONT } from "../../constants/tokens.js";
import { Hint } from "../../components/layout/SubNav.jsx";
import { findOwnershipConflicts, ownerMap } from "../../lib/crm/ownership.js";
import { searchCreators } from "../../lib/crm/identity.js";
import { setCreatorOwner } from "../../lib/supabase/collabsWrite.js";

const card = { ...glassStyle(14), padding: "16px 20px", marginBottom: 16 };
const title = { fontSize: FONT.h2, fontWeight: 800, color: T.text, marginBottom: 4 };
const chip = (on) => ({ fontSize: FONT.note, padding: "4px 12px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
  border: `1.5px solid ${on ? T.accent : T.border}`, background: on ? T.accent : "rgba(255,255,255,0.6)", color: on ? "#fff" : T.text, fontWeight: 600 });

export default function CreatorOwnership({ storeId, core }) {
  const { collabs, creators, aliases, staff } = core;
  const nameOf = (id) => staff.find((s) => s.id === id)?.name || "（已删除的助理）";
  const conflicts = useMemo(() => findOwnershipConflicts(collabs, creators), [collabs, creators]);
  const owners = useMemo(() => ownerMap(collabs), [collabs]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(null);
  const [target, setTarget] = useState("");
  const [withBlank, setWithBlank] = useState(false);

  async function assign(creatorId, handle, staffId, includeUnassigned) {
    const mine = collabs.filter((c) => c.creator_id === creatorId);
    const n = mine.filter((c) => (includeUnassigned || c.staff_id) && c.staff_id !== staffId).length;
    if (!n) { setMsg(`@${handle} 的寄样已全部在 ${nameOf(staffId)} 名下`); return; }
    if (!window.confirm(`把 @${handle} 的 ${n} 条寄样改到 ${nameOf(staffId)} 名下？`)) return;
    setBusy(true); setMsg("");
    try {
      await setCreatorOwner(storeId, creatorId, staffId, includeUnassigned);
      await core.refresh(["collabs"]);
      setMsg(`✅ @${handle} 已归属 ${nameOf(staffId)}，改动 ${n} 条寄样`);
    } catch (e) { setMsg(`❌ ${e.message}`); }
    finally { setBusy(false); }
  }

  const results = picked ? [] : searchCreators(creators, aliases, q, 8);
  const pickedRows = picked ? collabs.filter((c) => c.creator_id === picked.id) : [];

  return (
    <div>
      {msg && <div style={{ fontSize: FONT.body, fontWeight: 600, marginBottom: 12, color: msg.startsWith("❌") ? T.danger : T.success }}>{msg}</div>}

      <div style={card}>
        <div style={title}>🔍 归属冲突检查（{conflicts.length}）</div>
        <Hint style={{ marginBottom: 12 }}>同一个达人的寄样记在了多个助理名下。点某个助理名字，即把这个达人的寄样全部归给他（未指定跟进人的旧寄样保持不变）。</Hint>
        {!conflicts.length ? <div style={{ fontSize: FONT.body, color: T.success }}>✅ 没有冲突，每个达人都只属于一个助理。</div>
          : conflicts.map((c) => (
            <div key={c.creatorId} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 0", borderTop: `1px solid ${T.glassStroke}` }}>
              <span style={{ fontSize: FONT.body, fontWeight: 700, color: T.text, minWidth: 180 }}>@{c.handle}</span>
              {c.staff.map((s) => (
                <button key={s.staffId} disabled={busy} style={chip(s.staffId === c.owner)} onClick={() => assign(c.creatorId, c.handle, s.staffId, false)}
                  title={`${s.first} ~ ${s.last}`}>
                  {nameOf(s.staffId)} · {s.count} 条{s.staffId === c.owner ? "（首次）" : ""}
                </button>
              ))}
            </div>
          ))}
      </div>

      <div style={card}>
        <div style={title}>✏️ 变更达人归属</div>
        <Hint style={{ marginBottom: 12 }}>助理离职或交接时用：选一个达人和新的归属助理，她名下的寄样会一次性改到新助理名下，复盘、绩效、邀约库都随之更新。</Hint>
        <div style={{ position: "relative", maxWidth: 360 }}>
          <input value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} placeholder="搜索达人现名或别名"
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: FONT.body, fontFamily: "inherit", background: "rgba(255,255,255,0.6)" }} />
          {results.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10, marginTop: 4 }}>
              {results.map((r) => (
                <div key={r.id} onMouseDown={() => { setPicked(r); setQ(r.handle); setTarget(owners.get(r.id) || ""); }} style={{ padding: "8px 12px", cursor: "pointer", fontSize: FONT.body }}>
                  @{r.handle}{r.alias && <span style={{ color: T.hint, fontSize: FONT.tiny }}> 别名 @{r.alias}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        {picked && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: FONT.body, color: T.text, marginBottom: 10 }}>
              @{picked.handle}：共 {pickedRows.length} 条寄样，当前归属 <b>{owners.get(picked.id) ? nameOf(owners.get(picked.id)) : "未指定"}</b>
              ，其中 {pickedRows.filter((c) => !c.staff_id).length} 条未指定跟进人
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {staff.map((s) => <button key={s.id} style={chip(target === s.id)} onClick={() => setTarget(s.id)}>{s.name}</button>)}
              <label style={{ fontSize: FONT.body, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" checked={withBlank} onChange={(e) => setWithBlank(e.target.checked)} />未指定跟进人的寄样也一并归给他
              </label>
              <button disabled={!target || busy} onClick={() => assign(picked.id, picked.handle, target, withBlank)}
                style={{ ...chip(true), padding: "6px 18px", opacity: !target || busy ? 0.5 : 1 }}>{busy ? "处理中…" : "确认变更"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
