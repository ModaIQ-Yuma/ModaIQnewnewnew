import { T, glassStyle } from "../../constants/tokens.js";

/** 未完成板块的占位 */
export default function Placeholder({ label }) {
  return (
    <div style={{ ...glassStyle(18), padding: 48, textAlign: "center", color: T.hint }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🚧</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{label} · 建设中</div>
    </div>
  );
}
