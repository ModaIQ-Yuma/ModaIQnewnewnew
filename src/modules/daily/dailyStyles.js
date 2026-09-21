// modules/daily/dailyStyles.js
import { T } from "../../constants/tokens.js";

export const COLORS = {
  ship:   "#F59E0B", // 橙黄
  video:  "#3D7FEF", // 蓝
  invite: "#0E9E70", // 绿
};

// 助理排行条形图颜色池（明显区分）
export const BAR_PALETTE = [
  "#3D7FEF","#F59E0B","#0E9E70","#E0455E","#8B5CF6","#06B6D4","#F97316","#84CC16",
];

export const ds = {
  wrap:       { padding: 24 },
  title:      { fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 16 },
  tabs:       { display: "flex", gap: 8, marginBottom: 20 },
  tab:        (active) => ({
    padding: "7px 20px", borderRadius: 10, cursor: "pointer", fontSize: 14,
    fontWeight: active ? 700 : 500, border: "none", fontFamily: "inherit",
    background: active ? T.grad : "rgba(61,127,239,0.08)",
    color: active ? "#fff" : T.accent,
  }),
  toolbar:    { display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" },
  label:      { fontSize: 13, color: T.muted, fontWeight: 500 },
  dateInput:  {
    padding: "7px 12px", borderRadius: 10, border: `1.5px solid ${T.border}`,
    background: "rgba(255,255,255,0.6)", color: T.text, fontSize: 13, fontFamily: "inherit",
  },
  summary:    { fontSize: 14, color: T.muted, marginLeft: 8 },
  accent:     (color) => ({ color, fontWeight: 700 }),
  center:     { textAlign: "center", padding: 48, color: T.hint },
  cardGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 },
};
