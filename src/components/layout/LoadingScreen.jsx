import { T } from "../../constants/tokens.js";

export default function LoadingScreen({ text = "加载中…" }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #E0EEFF 0%, #EBF4FF 100%)",
      color: T.muted, fontFamily: "-apple-system, 'PingFang SC', sans-serif",
    }}>{text}</div>
  );
}
