// ─── 左下角「同步中」提示：后台刷新数据时出现，不打断操作 ────────────────────
import { T, FONT, Z, glassStyle } from "../../constants/tokens.js";

export default function SyncPill({ show, error }) {
  if (!show && !error) return null;
  return (
    <div style={{
      ...glassStyle(16, true), position: "fixed", left: 24, bottom: 28, zIndex: Z.toast,
      padding: "6px 14px", fontSize: FONT.note, fontWeight: 600,
      color: error ? T.danger : T.accent, pointerEvents: "none",
    }}>
      {error ? `⚠ 数据同步失败：${error}` : "☁ 同步中…"}
    </div>
  );
}
