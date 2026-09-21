// modules/invitePool/invitePoolStyles.js
import { T } from "../../constants/tokens.js";

export const s = {
  wrap:       { padding: "24px" },
  title:      { fontSize: 20, fontWeight: 700, marginBottom: 16, color: T.text },
  row:        { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" },
  input:      { padding: "9px 14px", borderRadius: 10, minWidth: 220, border: `1.5px solid ${T.border}`, background: "rgba(255,255,255,0.6)", color: T.text, fontSize: 14, outline: "none", fontFamily: "inherit" },
  checks:     { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" },
  checkLabel: { display: "flex", gap: 5, alignItems: "center", cursor: "pointer" },
  btn:        { padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer", background: T.grad, color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "inherit" },
  btnGhost:   { padding: "7px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", background: "transparent", color: T.accent, border: `1.5px solid ${T.accent}`, fontSize: 13 },
  btnDanger:  { padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", background: "transparent", color: T.danger, border: `1px solid ${T.danger}`, fontSize: 12 },
  err:        { marginTop: 10, fontSize: 13, color: T.danger, background: "rgba(224,69,94,0.08)", padding: "8px 12px", borderRadius: 8, borderLeft: `3px solid ${T.danger}` },
  filters:    { display: "flex", gap: 10, marginBottom: 14, alignItems: "center" },
  sel:        { padding: "7px 12px", borderRadius: 10, fontSize: 13, fontFamily: "inherit", border: `1.5px solid ${T.border}`, background: "rgba(255,255,255,0.6)", color: T.text },
  table:      { width: "100%", borderCollapse: "collapse" },
  th:         { textAlign: "left", padding: "11px 16px", color: T.hint, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em" },
  td:         { padding: "12px 16px", fontSize: 13, color: T.text },
  empty:      { textAlign: "center", padding: 48, color: T.hint, fontSize: 14 },
  handle:     { fontWeight: 600, color: T.text },
  productTag: { background: T.gradSoft, color: T.accent, padding: "2px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 },
  tagPending: { background: "rgba(92,112,144,0.12)", color: T.muted, padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 },
  tagDone:    { background: "rgba(14,158,112,0.12)", color: T.s, padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 },
  center:     { textAlign: "center", padding: 48, color: T.hint },
};
