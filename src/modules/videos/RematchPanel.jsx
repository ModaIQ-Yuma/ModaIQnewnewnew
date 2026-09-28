// modules/videos/RematchPanel.jsx — 重新匹配视频归属（管理员）：先预览改动，确认后写入
import { useState } from "react";
import { glassStyle, T, FONT } from "../../constants/tokens.js";
import { Hint } from "../../components/layout/SubNav.jsx";
import { planRematch } from "../../lib/video/rematch.js";
import { applyRematch } from "../../lib/supabase/videosMerge.js";

export default function RematchPanel({ core, onDone }) {
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState("");
  const btn = (primary) => ({ padding: "7px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: FONT.body, fontWeight: 700,
    border: primary ? "none" : `1.5px solid ${T.accent}`, background: primary ? T.grad : "transparent", color: primary ? "#fff" : T.accent });

  async function apply() {
    setBusy(true); setMsg("");
    try { await applyRematch(plan.changes); setMsg(`✅ 已按新规则更新 ${plan.changes.length} 条视频的归属`); setPlan(null); onDone?.(); }
    catch (e) { setMsg(`❌ ${e.message}（可再点一次，已改的不会重复处理）`); }
    finally { setBusy(false); }
  }

  const s = plan?.stats;
  return (
    <div style={{ ...glassStyle(12), padding: "14px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: FONT.h3, fontWeight: 700, color: T.text }}>🔁 重新匹配视频归属</span>
        <button style={btn(false)} disabled={busy} onClick={() => { setMsg(""); setPlan(planRematch(core)); }}>预览改动</button>
        {plan && plan.changes.length > 0 && <button style={btn(true)} disabled={busy} onClick={apply}>{busy ? "更新中…" : `确认更新 ${plan.changes.length} 条`}</button>}
        {msg && <span style={{ fontSize: FONT.note, fontWeight: 600, color: msg.startsWith("❌") ? T.danger : T.success }}>{msg}</span>}
      </div>
      {s && (
        <div style={{ fontSize: FONT.body, color: T.text, marginTop: 8 }}>
          共 {s.total} 条：不变 {s.unchanged}；改挂到别的寄样 <b>{s.moved}</b>；变为非 CRM <b style={{ color: T.warning }}>{s.unlinked}</b>（多为寄样前发的视频）；新挂上寄样 <b style={{ color: T.success }}>{s.linked}</b>
          {!plan.changes.length && "——已全部符合规则，无需更新"}
        </div>
      )}
      <Hint style={{ marginTop: 6 }}>规则：同一商品、且寄样日期不晚于视频发布日期，取发布前最近的一次寄样；寄样前发的视频、商品对不上的视频算非 CRM。导入规则已同步修正，这里用于把已导入的视频按新规则重算一遍。</Hint>
    </div>
  );
}
