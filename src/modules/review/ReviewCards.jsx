// modules/review/ReviewCards.jsx — 复盘指标卡片与分区标题
import { T, FONT } from "../../constants/tokens.js";

export const pct = (v) => (v == null ? "—" : (v * 100).toFixed(1) + "%");
export const num = (v) => (v == null ? "—" : Number(v).toLocaleString());
export const dec = (v) => (v == null ? "—" : Number(v).toFixed(2));
export const wan = (v) => (v >= 10000 ? (v / 10000).toFixed(1) + "w" : num(v));

export function MCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.72)", border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontSize: FONT.note, color: T.muted, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: FONT.kpi, fontWeight: 800, color: accent ? T.accent : T.text, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: FONT.tiny, color: T.hint, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function CardGrid({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px,1fr))", gap: 10 }}>{children}</div>;
}

export function AreaTitle({ chip, label, note }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 10px", flexWrap: "wrap" }}>
      <span style={{ fontSize: FONT.note, fontWeight: 800, color: "#fff", background: T.accent, borderRadius: 8, padding: "3px 10px" }}>{chip}</span>
      <span style={{ fontSize: FONT.h3, fontWeight: 700, color: T.text }}>{label}</span>
      {note && <span style={{ fontSize: FONT.note, color: T.hint }}>{note}</span>}
    </div>
  );
}
