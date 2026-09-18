import { T } from "../../constants/tokens.js";

const field = {
  background: "rgba(255,255,255,0.45)",
  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
  border: `1px solid ${T.glassStroke}`, borderRadius: 12,
  color: T.text, fontSize: 14, padding: "9px 13px",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box", width: "100%",
};

export function Inp({ value, onChange, placeholder, style = {} }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...field, ...style }} />;
}

export function TextArea({ value, onChange, placeholder, rows = 2, style = {} }) {
  return <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...field, resize: "vertical", ...style }} />;
}

export function Btn({ onClick, children, accent, danger, small, disabled, style = {} }) {
  const bg = accent ? T.grad : danger ? "transparent" : "rgba(255,255,255,0.5)";
  const color = accent ? "#fff" : danger ? T.danger : T.text;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontSize: small ? 12.5 : 14, fontWeight: 700, padding: small ? "6px 12px" : "10px 18px",
      borderRadius: 14, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
      opacity: disabled ? 0.5 : 1, background: bg, color,
      border: `1.5px solid ${accent ? "transparent" : danger ? T.danger : T.glassStroke}`,
      ...style,
    }}>{children}</button>
  );
}

/** 可选中的胶囊按钮（状态 / 类型选择器统一用它）*/
export function Pill({ active, color, onClick, children, small }) {
  return (
    <button onClick={onClick} style={{
      fontSize: small ? 11 : 12, padding: small ? "3px 10px" : "5px 12px", borderRadius: 14,
      cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
      border: `1.5px solid ${active ? color : color + "55"}`,
      background: active ? color : "transparent", color: active ? "#fff" : color,
    }}>{children}</button>
  );
}

export function Badge({ label, color }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 10, background: `${color}18`, color, border: `1px solid ${color}44`, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}
