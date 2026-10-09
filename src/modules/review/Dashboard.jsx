// modules/review/Dashboard.jsx — 横向看板：同月所有产品并排，所有数值只读已保存的快照
import { useState, useMemo } from "react";
import { glassStyle, T } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { thisMonthPST } from "../../lib/dates.js";
import { snapshotRates } from "../../lib/review/snapshotRates.js";

const HEAD = ["品名","状态","合作达人","达人出单率","新视频","视频出单率","播放量","点击量","CTR","视频出单数","CVR","爆单数","样销比","总出单","新视频占比","自然单占比"];

export default function Dashboard({ gradeSnapshots, products }) {
  const [ym, setYm] = useState(() => thisMonthPST());

  const rows = useMemo(() => {
    const snapMap = new Map(gradeSnapshots.filter((s) => s.month?.slice(0, 7) === ym).map((s) => [s.product_id, s]));
    return products.filter((p) => snapMap.has(p.id))
      .map((p) => { const snap = snapMap.get(p.id); return { product: p, snap, r: snapshotRates(snap) }; });
  }, [gradeSnapshots, products, ym]);

  if (!gradeSnapshots.length) {
    return <div style={rs.empty}>暂无快照。请先在「等级复盘」子板块点击「一键保存快照」。</div>;
  }

  return (
    <div>
      <div style={rs.toolbar}>
        <span style={rs.label}>统计月份</span>
        <input type="month" style={rs.monthInp} value={ym} onChange={(e) => setYm(e.target.value)} />
        <span style={rs.hint}>所有数值来自已保存的产品快照（当月寄样 / 当月发布视频，数据截止次月 5 日），存下后不再变。显示「—」的旧快照请到「快照记录」补存一次。</span>
      </div>

      {rows.length === 0
        ? <div style={rs.empty}>该月暂无快照，请先保存</div>
        : (
          <div style={{ ...glassStyle(14), overflow: "auto" }}>
            <table style={{ ...rs.table, minWidth: 1320 }}>
              <thead><tr>{HEAD.map((h) => <th key={h} style={rs.thR}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map(({ product, snap, r }) => (
                  <tr key={product.id}>
                    <td style={{ ...rs.td, fontWeight: 700 }}>{product.internal_name}</td>
                    <td style={rs.td}><span style={{ fontSize: 12, color: T.muted }}>{product.status}</span></td>
                    <td style={rs.tdR}>{snap.cooperate_count}</td>
                    <td style={rs.tdR}>{rs.pct(r.saleRate)}</td>
                    <td style={rs.tdR}>{snap.video_count}</td>
                    <td style={{ ...rs.tdR, fontWeight: 600, color: r.videoSaleRate >= 0.3 ? T.success : T.accent }}>{rs.pct(r.videoSaleRate)}</td>
                    <td style={rs.tdR}>{rs.num(snap.vv)}</td>
                    <td style={rs.tdR}>{rs.num(snap.clicks)}</td>
                    <td style={rs.tdR}>{rs.pct(r.ctr)}</td>
                    <td style={{ ...rs.tdR, fontWeight: 600 }}>{snap.orders}</td>
                    <td style={rs.tdR}>{rs.pct(r.cvr)}</td>
                    <td style={{ ...rs.tdR, fontWeight: 700, color: snap.burst_count > 0 ? T.success : T.hint }}>{snap.burst_count}</td>
                    <td style={{ ...rs.tdR, fontWeight: 700, color: T.accent }}>{rs.dec(r.sampleSalesRatio)}</td>
                    <td style={rs.tdR}>{snap.total_orders ?? "—"}</td>
                    <td style={rs.tdR}>{rs.pct(r.videoOrderShare)}</td>
                    <td style={rs.tdR}>{rs.pct(r.organicShare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}
