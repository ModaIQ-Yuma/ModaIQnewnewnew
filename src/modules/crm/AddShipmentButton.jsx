// modules/crm/AddShipmentButton.jsx — CRM 主入口：握手大圆球「新增寄样」
// 悬停：圆球浮起歪头、星星闪一下；按下：轻轻压扁。图标来自可替换的图标库。
import { useState } from "react";
import { FONT } from "../../constants/tokens.js";
import { ENTRY_ICONS, DEFAULT_ENTRY_ICON } from "../../components/icons/EntryIcons.jsx";

export default function AddShipmentButton({ onClick, icon = DEFAULT_ENTRY_ICON }) {
  const [state, setState] = useState("idle");              // idle | hover | press
  const Icon = ENTRY_ICONS[icon] || ENTRY_ICONS[DEFAULT_ENTRY_ICON];
  const ball = state === "hover" ? "translateY(-4px) rotate(-6deg)" : state === "press" ? "scale(0.94)" : "none";
  return (
    <button type="button" onClick={onClick} aria-label="新增寄样"
      onMouseEnter={() => setState("hover")} onMouseLeave={() => setState("idle")}
      onMouseDown={() => setState("press")} onMouseUp={() => setState("hover")}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
      <span style={{
        width: 96, height: 96, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        border: "4px solid #3D7FEF", borderBottomWidth: 7, boxSizing: "border-box",
        transform: ball, transition: "transform .2s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <Icon size={78} sparkle={state === "hover"} />
      </span>
      <span style={{ fontSize: FONT.h2, fontWeight: 800, color: "#2563CC" }}>新增寄样</span>
    </button>
  );
}
