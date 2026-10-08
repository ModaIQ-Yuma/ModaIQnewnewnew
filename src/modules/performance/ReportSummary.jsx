// modules/performance/ReportSummary.jsx — 月度提报汇总：奖金池 + 每人绩效 / 视频明细 / 奖金
import { glassStyle } from "../../constants/tokens.js";
import { getFinalGrade } from "../../lib/perf/perfCalc.js";
import { s, yuan, pct } from "./perfStyles.js";

function Card({ label, value, sub }) {
  return (
    <div style={s.card}>
      <div style={s.cardLabel}>{label}</div>
      <div style={s.kpi}>{value}</div>
      {sub && <div style={s.note}>{sub}</div>}
    </div>
  );
}

export default function ReportSummary({ report }) {
  const { pool, bd, store, staff, cycleStart } = report;
  const rows = [
    { key: "store", name: "全店（BD）", perf: store.perf, detail: store.detail, share: bd.share, amount: bd.total, extra: "" },
    ...staff.map((x) => ({ key: x.id, name: x.name, perf: x.perf, detail: x.detail, share: x.bonus.share, amount: x.bonus.total,
      extra: x.bonus.paidCreator ? `含付费达人 ${yuan(x.bonus.paidCreator)}` : "" })),
  ];
  return (
    <div style={{ ...glassStyle(16), ...s.section }}>
      <div style={s.h2}>本月汇总</div>
      <div style={{ ...s.note, marginBottom: 12 }}>绩效与「绩效评估」页一致（寄样账期 {cycleStart} 起）；视频明细只算当月发布的视频；全店 = CRM 视频 + 出过单的非 CRM 视频，助理 = 她合作过的达人发的视频。</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 14 }}>
        <Card label="奖金池" value={yuan(pool.total)} sub={`爆单视频 ${yuan(pool.videoSum)} + 直播 ${yuan(pool.liveSum)}`} />
        <Card label="全店视频" value={store.detail.total} sub={`出单 ${store.detail.sale} 条 · ${pct(store.detail.rate)}`} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ ...s.table, minWidth: 640 }}>
          <thead><tr>{["对象", "绩效合计", "最终绩效", "视频数", "出单视频", "出单率", "奖金份额", "奖金"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td style={{ ...s.td, fontWeight: 600 }}>{r.name}</td>
                <td style={{ ...s.td, ...s.num }}>{pct(r.perf.total)}</td>
                <td style={s.td}>{getFinalGrade(r.perf.total)}</td>
                <td style={{ ...s.td, ...s.num }}>{r.detail.total}</td>
                <td style={{ ...s.td, ...s.num }}>{r.detail.sale}</td>
                <td style={{ ...s.td, ...s.num }}>{pct(r.detail.rate)}</td>
                <td style={{ ...s.td, ...s.num }}>{pct(r.share, 0)}</td>
                <td style={{ ...s.td, ...s.num, fontWeight: 700 }}>{yuan(r.amount)}<div style={s.note}>{r.extra}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
