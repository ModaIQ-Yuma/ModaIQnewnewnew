// modules/invitePool/PoolBatchPreview.jsx — 批量上传预览：可录入 / 跳过分类 / 跳过明细（可导出）
import * as XLSX from "xlsx";
import { T } from "../../constants/tokens.js";
import { skipSummary } from "../../lib/invitePool/poolBatch.js";
import { todayPST } from "../../lib/dates.js";
import { s } from "./invitePoolStyles.js";

export default function PoolBatchPreview({ plan, busy, error, onBack, onConfirm }) {
  const summary = skipSummary(plan.skipped);

  function exportSkipped() {
    const ws = XLSX.utils.json_to_sheet(plan.skipped.map((r) => ({ 达人: r.input, 产品: r.product, 跳过原因: r.reason })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "跳过明细");
    XLSX.writeFile(wb, `邀约库上传_跳过明细_${todayPST()}.xlsx`);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        <div style={{ ...s.stat, borderColor: T.success }}><span style={{ ...s.statNum, color: T.success }}>{plan.rows.length}</span>可录入（条）</div>
        <div style={s.stat}><span style={s.statNum}>{plan.creatorCount}</span>有效达人（个）</div>
        {Object.entries(summary).map(([k, n]) => (
          <div key={k} style={s.stat}><span style={s.statNum}>{n}</span>{k}</div>
        ))}
      </div>

      {plan.skipped.length > 0 && (<>
        <div style={{ ...s.row, justifyContent: "space-between", marginTop: 14 }}>
          <span style={s.note}>跳过明细（不会写入，其余照常录入）</span>
          <button style={s.btnGhost} onClick={exportSkipped}>导出跳过明细</button>
        </div>
        <div style={s.skipBox}>
          <table style={s.table}>
            <thead><tr>{["达人", "产品", "跳过原因"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {plan.skipped.slice(0, 200).map((r, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${T.glassStroke}` }}>
                  <td style={s.td}>{r.input}</td>
                  <td style={s.td}>{r.product}</td>
                  <td style={{ ...s.td, color: T.muted }}>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {plan.skipped.length > 200 && <div style={{ ...s.note, padding: 10 }}>只显示前 200 条，完整明细请导出。</div>}
        </div>
      </>)}

      {error && <div style={s.err}>{error}</div>}
      <div style={s.footer}>
        <button style={s.btnGhost} onClick={onBack} disabled={busy}>返回修改</button>
        <button style={s.btn} onClick={onConfirm} disabled={busy || plan.rows.length === 0}>
          {busy ? "写入中…" : `确认写入 ${plan.rows.length} 条`}
        </button>
      </div>
    </div>
  );
}
