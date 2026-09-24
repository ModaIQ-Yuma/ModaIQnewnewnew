// modules/staff/staffUi.js — 人员管理共用样式与小工具
import { T, FONT } from "../../constants/tokens.js";

export const smallBtn = (color) => ({ border:`1.5px solid ${color}55`, background:"transparent", color, fontSize:FONT.note, fontWeight:700, borderRadius:9, padding:"5px 12px", cursor:"pointer", fontFamily:"inherit" });
export const inp = { padding:"9px 12px", borderRadius:10, border:`1.5px solid ${T.border}`, background:"rgba(255,255,255,0.6)", color:T.text, fontSize:FONT.body, fontFamily:"inherit" };
export const shortId = (id) => (id ? id.slice(0, 8) + "…" : "—");
export const ROLE_OPTIONS = [["admin", "管理员"], ["staff", "成员"], ["viewer", "只读"]];
