// modules/review/reviewStyles.js
import { T, FONT, tabStyle } from "../../constants/tokens.js";

export const rs = {
  tabs:       { display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" },
  tab:        tabStyle,
  toolbar:    { display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" },
  label:      { fontSize: FONT.body, color: T.muted, fontWeight: 600 },
  monthInp:   {
    padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${T.border}`,
    background: "rgba(255,255,255,0.6)", color: T.text, fontSize: FONT.lg2, fontFamily: "inherit",
  },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 12, marginBottom: 18 },
  metricCard: { background: "rgba(255,255,255,0.72)", border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px" },
  metricLbl:  { fontSize: FONT.note, fontWeight: 700, color: T.muted, marginBottom: 6 },
  metricVal:  (accent) => ({ fontSize: FONT.kpi, fontWeight: 800, lineHeight: 1.2, color: accent ? T.accent : T.text }),
  metricSub:  { fontSize: FONT.tiny, color: T.hint, marginTop: 4 },
  table:      { width: "100%", borderCollapse: "collapse" },
  th:         { textAlign: "left",  padding: "9px 11px", borderBottom: `2px solid ${T.border}`, color: T.muted, fontSize: FONT.note, fontWeight: 700 },
  thR:        { textAlign: "right", padding: "9px 11px", borderBottom: `2px solid ${T.border}`, color: T.muted, fontSize: FONT.note, fontWeight: 700 },
  td:         { padding: "9px 11px", fontSize: FONT.lg2, color: T.text,  borderBottom: `1px solid ${T.glassStroke}` },
  tdR:        { padding: "9px 11px", fontSize: FONT.lg2, color: T.text,  borderBottom: `1px solid ${T.glassStroke}`, textAlign: "right" },
  center:     { textAlign: "center", padding: 48, color: T.hint },
  empty:      { textAlign: "center", padding: 28, color: T.hint, fontSize: FONT.lg2 },
  groupTitle: { fontSize: FONT.h3, fontWeight: 700, color: T.text, margin: "18px 0 8px" },
  btn:        { padding: "7px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: T.grad, color: "#fff", fontWeight: 700, fontSize: FONT.lg2, fontFamily: "inherit" },
  btnGhost:   { padding: "6px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", background: "transparent", color: T.accent, border: `1.5px solid ${T.accent}`, fontSize: FONT.lg2 },
  btnDanger:  { padding: "3px 9px",  borderRadius: 6,  cursor: "pointer", fontFamily: "inherit", background: "transparent", color: T.danger, border: `1px solid ${T.danger}`, fontSize: FONT.sm2 },
  reminder:   { background: `${T.warning}15`, border: `1.5px solid ${T.warning}55`, borderRadius: 12, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  pct:        (v) => v == null ? "—" : (v * 100).toFixed(1) + "%",
  num:        (v) => v == null ? "—" : Number(v).toLocaleString(),
  dec:        (v) => v == null ? "—" : Number(v).toFixed(2),
  hint:       { fontSize: FONT.note, color: T.hint },
};
