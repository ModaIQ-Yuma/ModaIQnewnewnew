// modules/videos/ImportResultModal.jsx — 视频导入完成后的结果弹窗
import { glassStyle, T } from "../../constants/tokens.js";

export default function ImportModal({ modal, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(10,22,40,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ ...glassStyle(18, true), padding: "32px 36px", minWidth: 340, maxWidth: 440 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>导入完成 ✅</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>{modal.fileName}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Row label="本次处理总条数" value={modal.total} color={T.accent} />
          <Row label="新增视频" value={modal.inserted} color={T.success} />
          <Row label="累加更新" value={modal.updated} color={T.warning} />
          <div style={{ borderTop: `1px solid ${T.glassStroke}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            <Row label="CRM 达人视频" value={modal.crmCount} color={T.accent} />
            <Row label="非 CRM 达人视频" value={modal.nonCrmCount} color={T.muted} />
          </div>
          <div style={{ borderTop: `1px solid ${T.glassStroke}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <Row label="跳过（非CRM且0出单）" value={modal.skipped} color={T.hint} />
            {modal.unknownSku > 0 && <Row label="商品ID不在产品库（按非CRM处理）" value={modal.unknownSku} color={T.warning} />}
            {modal.merged > 0 && <Row label="文件内重复视频（已合并）" value={modal.merged} color={T.hint} />}
          </div>
        </div>

        <button onClick={onClose} style={{
          marginTop: 28, width: "100%", padding: "11px 0", borderRadius: 12,
          border: "none", background: T.grad, color: "#fff",
          fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
        }}>确认</button>
      </div>
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 14, color: T.muted }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
