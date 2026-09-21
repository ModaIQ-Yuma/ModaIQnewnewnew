// modules/videos/videosStyles.js
import { T } from "../../constants/tokens.js";

export const vs = {
  wrap:      { padding: 24 },
  title:     { fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 16 },
  tabs:      { display: "flex", gap: 8, marginBottom: 20 },
  tab:       (active) => ({
    padding: "7px 20px", borderRadius: 10, cursor: "pointer", fontSize: 14,
    fontWeight: active ? 700 : 500, border: "none", fontFamily: "inherit",
    background: active ? T.grad : "rgba(61,127,239,0.08)",
    color: active ? "#fff" : T.accent,
  }),
  toolbar:   { display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" },
  uploadBtn: {
    padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer",
    background: T.grad, color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "inherit",
  },
  badge:     (color) => ({
    background: color + "18", color, padding: "2px 8px",
    borderRadius: 6, fontSize: 12, fontWeight: 600,
  }),
  table:     { width: "100%", borderCollapse: "collapse" },
  th:        { textAlign: "left", padding: "10px 14px", color: T.hint, fontSize: 12, fontWeight: 600, borderBottom: `1px solid ${T.glassStroke}` },
  td:        { padding: "11px 14px", fontSize: 13, color: T.text, borderBottom: `1px solid ${T.glassStroke}` },
  link:      { color: T.accent, textDecoration: "none", fontWeight: 600 },
  center:    { textAlign: "center", padding: 48, color: T.hint },
  empty:     { textAlign: "center", padding: 40, color: T.hint, fontSize: 14 },
  btnDanger: {
    padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
    background: "transparent", color: T.danger, border: `1px solid ${T.danger}`, fontSize: 12,
  },
  summary:   { fontSize: 13, color: T.muted },
  num:       { fontWeight: 700, color: T.text },
};
