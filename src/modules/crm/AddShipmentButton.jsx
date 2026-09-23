// modules/crm/AddShipmentButton.jsx — CRM 主入口：大大的圆胖「新增寄样」按钮
// 配色取自 Logo 的粉→蓝渐变；悬停轻轻浮起，按下回弹。
import { useState } from "react";
import { FONT } from "../../constants/tokens.js";

const GRAD = "linear-gradient(135deg, #FF8FD0 0%, #B79CFF 50%, #6CAEFF 100%)";

export default function AddShipmentButton({ onClick }) {
  const [state, setState] = useState("idle");              // idle | hover | press
  const lift = state === "hover" ? "translateY(-3px) scale(1.03)" : state === "press" ? "translateY(1px) scale(0.97)" : "none";
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setState("hover")} onMouseLeave={() => setState("idle")}
      onMouseDown={() => setState("press")} onMouseUp={() => setState("hover")}
      style={{
        display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 30px 12px 12px",
        borderRadius: 999, border: "3px solid rgba(255,255,255,0.9)", background: GRAD, color: "#fff",
        fontSize: FONT.h2, fontWeight: 900, letterSpacing: "0.06em", fontFamily: "inherit", cursor: "pointer",
        boxShadow: state === "hover" ? "0 12px 28px rgba(183,156,255,0.55)" : "0 6px 18px rgba(183,156,255,0.40)",
        transform: lift, transition: "transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s",
      }}>
      <span style={{
        width: 44, height: 44, borderRadius: "50%", background: "#fff", color: "#B79CFF",
        display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, lineHeight: 1,
        boxShadow: "inset 0 -3px 0 rgba(183,156,255,0.25)",
      }}>+</span>
      新增寄样 <span style={{ fontSize: FONT.h2 }}>📦</span>
    </button>
  );
}
