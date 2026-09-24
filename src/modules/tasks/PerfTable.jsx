// modules/tasks/PerfTable.jsx
import { T, FONT } from "../../constants/tokens.js";
import { WEIGHTS, getScore, getFinalGrade } from "../../lib/perf/perfCalc.js";

const pct = (v) => v == null ? "—" : (v * 100).toFixed(1) + "%";
const LABELS = { a:"视频产出达成率", b:"老品红人转化率", c:"视频转化率", d:"新品寄样达成率", e:"Lv1达人占比" };

export default function PerfTable({ metrics }) {
  const { a, b, c, d, e } = metrics;
  const vals = { a, b, c, d, e };
  const thS = { fontSize:FONT.sm, fontWeight:700, color:T.muted, padding:"10px 14px", textAlign:"left", borderBottom:`2px solid ${T.border}`, whiteSpace:"nowrap" };
  const tdS = { fontSize:FONT.lg2, padding:"10px 14px", borderBottom:`1px solid ${T.border}`, color:T.text };

  const rows = Object.entries(LABELS).map(([key, label]) => {
    const val = vals[key]; const score = getScore(key, val);
    return { key, label, val, score, weighted: score != null ? score * WEIGHTS[key] : null };
  });
  const total = rows.every(r=>r.weighted!=null) ? rows.reduce((s,r)=>s+r.weighted,0) : null;
  const tc = total==null ? T.hint : total>=0.9 ? T.success : total>=0.6 ? T.accent : T.danger;

  return (
    <div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:520 }}>
          <thead><tr>{["考核项","实际完成","得分比例","权重","加权得分"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map(({ key, label, val, score, weighted }) => (
              <tr key={key}>
                <td style={{ ...tdS, fontWeight:600 }}>{label}</td>
                <td style={tdS}>{pct(val)}</td>
                <td style={{ ...tdS, fontWeight:700, color:score==null?T.hint:score>=0.9?T.success:score>=0.6?T.accent:T.danger }}>{score==null?"—":(score*100).toFixed(0)+"%"}</td>
                <td style={{ ...tdS, color:T.hint }}>{(WEIGHTS[key]*100).toFixed(0)}%</td>
                <td style={{ ...tdS, fontWeight:600 }}>{weighted==null?"—":(weighted*100).toFixed(1)+"%"}</td>
              </tr>
            ))}
            <tr style={{ background:"#FFFDE7" }}>
              <td colSpan={3} style={{ ...tdS, borderBottom:"none" }} />
              <td style={{ ...tdS, fontWeight:800, borderBottom:"none" }}>合计</td>
              <td style={{ ...tdS, fontWeight:800, fontSize:FONT.x4l, color:tc, borderBottom:"none" }}>{total==null?"—":(total*100).toFixed(1)+"%"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {total!=null && (
        <div style={{ marginTop:12, padding:"12px 18px", borderRadius:12, background:total>=0.9?"#F0FFF4":total>=0.6?"#EFF6FF":"#FFF5F5", border:`1px solid ${tc}44`, display:"flex", alignItems:"center", gap:14 }}>
          <div><div style={{ fontSize:FONT.xs, color:T.muted, marginBottom:2 }}>最终评分</div><div style={{ fontSize:22, fontWeight:900, color:tc }}>{(total*100).toFixed(1)}%</div></div>
          <div style={{ width:1, height:40, background:T.border }} />
          <div><div style={{ fontSize:FONT.xs, color:T.muted, marginBottom:2 }}>最终绩效</div><div style={{ fontSize:FONT.x4l, fontWeight:700, color:T.text }}>{getFinalGrade(total)}</div></div>
        </div>
      )}
      <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
        {[
          ["预估 / 实际视频数", `${metrics.estimatedVideos} / ${metrics.actualVideos}`],
          ["新品实际寄样", metrics.newActual],
          ["老品达人（出单/总）", `${metrics.oldWithSalesTotal}/${metrics.oldInfluencerTotal}`],
          ["出单视频/总视频", `${metrics.saleVids}/${metrics.totalVids}`],
          ["总寄样数", metrics.shipTotal],
        ].map(([label,value])=>(
          <div key={label} style={{ background:"rgba(255,255,255,0.5)", border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px" }}>
            <div style={{ fontSize:FONT.xs, color:T.muted, marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:FONT.xl2, fontWeight:700, color:T.text }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
