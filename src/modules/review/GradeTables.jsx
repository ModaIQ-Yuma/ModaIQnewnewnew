// modules/review/GradeTables.jsx — 等级分层表（寄样端 / 视频端），行顺序 Lv7 → Lv1 → 未标注 → 非CRM
import { glassStyle, T } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";

export const GRADE_COLORS = { Lv1:"#94A3B8", Lv2:"#60A5FA", Lv3:"#34D399", Lv4:"#FBBF24", Lv5:"#F97316", Lv6:"#A78BFA", Lv7:"#EC4899", "未标注":"#CBD5E1", "非CRM":"#F59E0B" };

export function GradeName({ grade }) {
  const c = GRADE_COLORS[grade] || T.muted;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0 }} />
      <span style={{ fontWeight: 700, color: c }}>{grade}</span>
    </span>
  );
}

function Table({ head, children }) {
  return (
    <div style={{ ...glassStyle(12), overflow: "hidden" }}>
      <table style={rs.table}>
        <thead><tr>{head.map((h, i) => <th key={h} style={i ? rs.thR : rs.th}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** 寄样端：按寄样时等级，看寄样的产出 */
export function ShipGradeTable({ rows }) {
  if (!rows.length) return null;
  return (
    <Table head={["等级", "寄样记录数", "占比", "达人出单率", "出单记录数", "出单数量", "等级 ROI"]}>
      {rows.map((r) => (
        <tr key={r.grade}>
          <td style={rs.td}><GradeName grade={r.grade} /></td>
          <td style={rs.tdR}>{r.shipCount}</td>
          <td style={rs.tdR}>{rs.pct(r.shipPct)}</td>
          <td style={{ ...rs.tdR, fontWeight: 600, color: r.saleRate >= 0.3 ? T.success : T.accent }}>{rs.pct(r.saleRate)}</td>
          <td style={rs.tdR}>{r.salesCount}</td>
          <td style={{ ...rs.tdR, fontWeight: 600 }}>{r.ordersSum}</td>
          <td style={{ ...rs.tdR, fontWeight: 600, color: T.accent }}>{rs.dec(r.gradeRoi)}</td>
        </tr>
      ))}
    </Table>
  );
}

/** 视频端：视频按其寄样的等级分组 */
export function VideoGradeTable({ rows }) {
  if (!rows.length) return null;
  return (
    <Table head={["等级", "视频数", "占比", "视频出单率", "总出单", "均单/视频", "爆单数"]}>
      {rows.map((r) => (
        <tr key={r.grade}>
          <td style={rs.td}><GradeName grade={r.grade} /></td>
          <td style={rs.tdR}>{r.videoCount}</td>
          <td style={rs.tdR}>{rs.pct(r.videoPct)}</td>
          <td style={{ ...rs.tdR, fontWeight: 600, color: r.videoSaleRate >= 0.3 ? T.success : r.videoSaleRate >= 0.15 ? T.accent : T.danger }}>{rs.pct(r.videoSaleRate)}</td>
          <td style={{ ...rs.tdR, fontWeight: 600 }}>{r.orders}</td>
          <td style={{ ...rs.tdR, fontWeight: 600, color: T.accent }}>{rs.dec(r.avgOrder)}</td>
          <td style={{ ...rs.tdR, fontWeight: 600, color: r.burstCount ? T.success : T.hint }}>{r.burstCount || "—"}</td>
        </tr>
      ))}
    </Table>
  );
}
