// modules/crm/ImportReview.jsx — 导入前核对：统计 / 疑似同一人 / 跳过明细
import { useState } from "react";
import { T, FONT, glassStyle } from "../../constants/tokens.js";
import { Hint } from "../../components/layout/SubNav.jsx";

const stat = { ...glassStyle(12), padding: "12px 0", textAlign: "center" };
const pill = (on) => ({
  padding: "5px 12px", borderRadius: 16, cursor: "pointer", fontFamily: "inherit", fontSize: FONT.note, fontWeight: 700,
  border: `1.5px solid ${on ? T.accent : T.border}`, background: on ? T.accent : "transparent", color: on ? "#fff" : T.muted,
});

export function StatGrid({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 10, marginBottom: 16 }}>
      {items.map(([label, value, color]) => (
        <div key={label} style={stat}>
          <div style={{ fontSize: FONT.kpi, fontWeight: 800, color: color || T.accent }}>{value ?? 0}</div>
          <div style={{ fontSize: FONT.note, color: T.muted }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

/** 跳过 / 冲突明细（可折叠） */
export function IssueList({ title, lines }) {
  const [open, setOpen] = useState(false);
  if (!lines.length) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div onClick={() => setOpen(!open)} style={{ fontSize: FONT.body, fontWeight: 700, color: T.warning, cursor: "pointer" }}>
        {open ? "▾" : "▸"} {title}（{lines.length}）
      </div>
      {open && (
        <div style={{ ...glassStyle(10), marginTop: 6, padding: "8px 12px", maxHeight: 180, overflowY: "auto", fontSize: FONT.note, color: T.muted, lineHeight: 1.7 }}>
          {lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}

/** 疑似同一人：逐对选择 */
export function PairChooser({ pairs, decisions, onDecide }) {
  if (!pairs.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: FONT.h3, fontWeight: 700, color: T.text, marginBottom: 4 }}>疑似同一人（{pairs.length} 对）</div>
      <Hint style={{ marginBottom: 8 }}>文件里某个达人的别名正好是另一个达人的 ID。换过名的请选保留哪个现名（另一个自动变成别名、寄样合到一起）；大小号等不同账号选「不是同一人」。</Hint>
      {pairs.map((p) => (
        <div key={p.key} style={{ ...glassStyle(12), padding: "10px 14px", marginBottom: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: FONT.body, color: T.text, flex: "1 1 220px" }}>
            <b>@{p.a}</b> <span style={{ color: T.hint }}>（{p.rowsA} 条，最近 {p.latestA}）</span> ↔ <b>@{p.b}</b> <span style={{ color: T.hint }}>（{p.rowsB} 条，最近 {p.latestB}）</span>
          </span>
          <button style={pill(decisions[p.key] === "a")} onClick={() => onDecide(p.key, "a")}>保留 {p.a}</button>
          <button style={pill(decisions[p.key] === "b")} onClick={() => onDecide(p.key, "b")}>保留 {p.b}</button>
          <button style={pill(decisions[p.key] === "none")} onClick={() => onDecide(p.key, "none")}>不是同一人</button>
        </div>
      ))}
    </div>
  );
}
