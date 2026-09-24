// modules/review/Dashboard.jsx
import { useState, useMemo } from "react";
import { glassStyle, T } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { calcMonthMetrics } from "../../lib/review/reviewCalc.js";
import { safeDiv } from "../../lib/utils.js";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Dashboard({ gradeSnapshots, collabs, videos, products }) {
  const [ym, setYm] = useState(thisMonth);

  // 快照数据（该月）
  const snapMap = useMemo(() => {
    const m = `${ym}-01`;
    const map = {};
    for (const s of gradeSnapshots) {
      if (s.month?.slice(0, 7) === ym) map[s.product_id] = s;
    }
    return map;
  }, [gradeSnapshots, ym]);

  // 样销比（全时段实时计算）
  const cumMap = useMemo(() => {
    const map = {};
    for (const p of products) {
      const m = calcMonthMetrics(collabs, videos, ym, p.id);
      // 全时段：不限月份
      const allOrders = videos.filter((v) => v.product_id === p.id).reduce((s, v) => s + (v.orders || 0), 0);
      const allShips  = collabs.filter((c) => c.product_id === p.id).length;
      map[p.id] = { sampleSalesRatio: safeDiv(allOrders, allShips) };
    }
    return map;
  }, [collabs, videos, products, ym]);

  const rows = useMemo(() =>
    products.map((p) => {
      const snap = snapMap[p.id];
      const cum  = cumMap[p.id];
      return { product: p, snap, cum };
    }).filter(({ snap }) => snap),
    [products, snapMap, cumMap]
  );

  if (!gradeSnapshots.length) {
    return <div style={rs.empty}>暂无快照。请先在「等级复盘」子板块点击「一键保存快照」。</div>;
  }

  return (
    <div>
      <div style={rs.toolbar}>
        <span style={rs.label}>统计月份</span>
        <input type="month" style={rs.monthInp} value={ym} onChange={(e) => setYm(e.target.value)} />
        <span style={rs.hint}>寄样/视频/出单等数值来自已保存的产品快照（在「单品月报」或「等级复盘」保存）；没有快照的月份这里为空。</span>
      </div>

      {rows.length === 0
        ? <div style={rs.empty}>该月暂无快照，请先保存</div>
        : (
          <div style={{ ...glassStyle(14), overflow: "auto" }}>
            <table style={{ ...rs.table, minWidth: 1320 }}>
              <thead><tr>
                {["品名","状态","合作达人","达人出单率","新视频","视频出单率","播放量","点击量","CTR","视频出单数","CVR","爆单数","样销比(累计)","总出单","新视频占比","自然单占比"].map((h) => (
                  <th key={h} style={rs.thR}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map(({ product, snap, cum }) => {
                  const ctr = safeDiv(snap.clicks, snap.vv);
                  const cvr = safeDiv(snap.orders, snap.clicks);
                  const videoSaleRate = safeDiv(snap.video_with_sales, snap.video_count);
                  const saleRate      = safeDiv(snap.fulfill_count ? snap.video_with_sales : null, snap.fulfill_count);
                  return (
                    <tr key={product.id}>
                      <td style={{ ...rs.td, fontWeight: 700 }}>{product.internal_name}</td>
                      <td style={rs.td}><span style={{ fontSize: 12, color: T.muted }}>{product.status}</span></td>
                      <td style={rs.tdR}>{snap.cooperate_count}</td>
                      <td style={rs.tdR}>{rs.pct(saleRate)}</td>
                      <td style={rs.tdR}>{snap.video_count}</td>
                      <td style={{ ...rs.tdR, fontWeight: 600, color: videoSaleRate >= 0.3 ? T.success : T.accent }}>{rs.pct(videoSaleRate)}</td>
                      <td style={rs.tdR}>{rs.num(snap.vv)}</td>
                      <td style={rs.tdR}>{rs.num(snap.clicks)}</td>
                      <td style={rs.tdR}>{rs.pct(ctr)}</td>
                      <td style={{ ...rs.tdR, fontWeight: 600 }}>{snap.orders}</td>
                      <td style={rs.tdR}>{rs.pct(cvr)}</td>
                      <td style={{ ...rs.tdR, fontWeight: 700, color: snap.burst_count > 0 ? T.success : T.hint }}>{snap.burst_count}</td>
                      <td style={{ ...rs.tdR, fontWeight: 700, color: T.accent }}>{rs.dec(cum?.sampleSalesRatio)}</td>
                      <td style={rs.tdR}>{snap.total_orders ?? "—"}</td>
                      <td style={rs.tdR}>{rs.pct(safeDiv(snap.total_orders ? snap.orders : null, snap.total_orders))}</td>
                      <td style={rs.tdR}>{rs.pct(safeDiv(snap.total_orders && snap.organic_orders != null ? snap.organic_orders : null, snap.total_orders))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}
