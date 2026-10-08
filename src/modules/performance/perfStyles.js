// modules/performance/perfStyles.js — 绩效 / 月度提报共用样式
import { T, FONT } from "../../constants/tokens.js";

export const s = {
  row:       { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  section:   { padding: "16px 18px", marginBottom: 16 },
  h2:        { fontSize: FONT.h2, fontWeight: 700, color: T.text, marginBottom: 4 },
  h3:        { fontSize: FONT.h3, fontWeight: 700, color: T.text },
  note:      { fontSize: FONT.note, color: T.hint, lineHeight: 1.6 },
  btn:       { padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: T.grad, color: "#fff", fontWeight: 700, fontSize: FONT.body, fontFamily: "inherit" },
  btnGhost:  { padding: "6px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", background: "transparent", color: T.accent, border: `1.5px solid ${T.accent}`, fontSize: FONT.body, fontWeight: 600 },
  btnSmall:  { padding: "3px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", background: T.accent, color: "#fff", border: "none", fontSize: FONT.note, fontWeight: 600 },
  btnDanger: { padding: "3px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", background: "transparent", color: T.danger, border: `1px solid ${T.danger}`, fontSize: FONT.note },
  monthBox:  { padding: "6px 16px", fontSize: FONT.h3, fontWeight: 700, color: T.text },
  input:     { padding: "7px 12px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "rgba(255,255,255,0.6)", color: T.text, fontSize: FONT.body, outline: "none", fontFamily: "inherit" },
  table:     { width: "100%", borderCollapse: "collapse" },
  th:        { textAlign: "left", padding: "8px 12px", color: T.hint, fontSize: FONT.tiny, fontWeight: 600, borderBottom: `1.5px solid ${T.border}`, whiteSpace: "nowrap" },
  td:        { padding: "8px 12px", fontSize: FONT.body, color: T.text, borderBottom: `1px solid ${T.border}` },
  num:       { textAlign: "right", fontVariantNumeric: "tabular-nums" },
  empty:     { textAlign: "center", padding: 28, color: T.hint, fontSize: FONT.body },
  err:       { marginTop: 10, fontSize: FONT.body, color: T.danger, background: "rgba(224,69,94,0.08)", padding: "8px 12px", borderRadius: 8, borderLeft: `3px solid ${T.danger}` },
  warn:      { fontSize: FONT.body, color: T.warning, background: "rgba(232,146,59,0.08)", padding: "8px 12px", borderRadius: 8, borderLeft: `3px solid ${T.warning}`, marginBottom: 12 },
  card:      { padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.5)", border: `1px solid ${T.glassStroke}` },
  cardLabel: { fontSize: FONT.note, color: T.muted, marginBottom: 2 },
  kpi:       { fontSize: FONT.kpi, fontWeight: 700, color: T.text },
  tier:      { fontSize: FONT.tiny, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: "rgba(61,127,239,0.12)", color: T.accent },
  link:      { color: T.accent, fontSize: FONT.note, textDecoration: "none" },
  overlay:   { position: "fixed", inset: 0, zIndex: 1500, background: "rgba(10,22,40,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" },
  modal:     { width: "min(640px, 100%)", padding: "20px 24px" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, fontSize: FONT.h2, fontWeight: 700, color: T.text },
  textarea:  { width: "100%", minHeight: 160, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "rgba(255,255,255,0.6)", color: T.text, fontSize: FONT.body, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" },
  footer:    { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 },
};

export const money = (n) => `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const yuan = (n) => `¥${(Number(n) || 0).toLocaleString("en-US")}`;
export const pct = (v, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
