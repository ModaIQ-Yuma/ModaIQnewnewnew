// modules/review/BurstWall.jsx
import { useState, useMemo } from "react";
import { glassStyle, T } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { calcBurstVideos } from "../../lib/review/burstCalc.js";
import { safeDiv } from "../../lib/utils.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function BurstWall({ videos, products, burstThreshold, onThresholdChange }) {
  const [ym, setYm] = useState(thisMonth);

  const byProduct = useMemo(() =>
    products.map((p) => ({
      product: p,
      bursts: calcBurstVideos(videos, ym, p.id, burstThreshold),
    })).filter(({ bursts }) => bursts.length > 0),
    [videos, products, ym, burstThreshold]
  );

  return (
    <div>
      <div style={rs.toolbar}>
        <span style={rs.label}>统计月份</span>
        <input type="month" style={rs.monthInp} value={ym} onChange={(e) => setYm(e.target.value)} />
        <span style={rs.label}>爆单阈值</span>
        <input
          type="number" min={1} style={{ ...rs.monthInp, width: 80 }}
          value={burstThreshold}
          onChange={(e) => onThresholdChange?.(Number(e.target.value) || BURST_ORDER_THRESHOLD)}
        />
        <span style={{ fontSize: 12, color: T.hint }}>单条视频月度出单 ≥ 此值视为爆单</span>
      </div>

      {byProduct.length === 0
        ? <div style={rs.empty}>该月暂无爆单视频（阈值 {burstThreshold} 单）</div>
        : byProduct.map(({ product, bursts }) => (
          <div key={product.id} style={{ marginBottom: 24 }}>
            <div style={rs.groupTitle}>{product.internal_name} · {bursts.length} 条爆单视频</div>
            <div style={{ ...glassStyle(14), overflow: "hidden" }}>
              <table style={rs.table}>
                <thead><tr>
                  <th style={rs.th}>达人</th>
                  <th style={rs.th}>视频链接</th>
                  <th style={rs.th}>发布日期</th>
                  <th style={rs.thR}>出单数</th>
                  <th style={rs.thR}>播放量</th>
                  <th style={rs.thR}>点击量</th>
                  <th style={rs.thR}>CTR</th>
                </tr></thead>
                <tbody>
                  {bursts.map((v) => (
                    <tr key={v.id}>
                      <td style={{ ...rs.td, fontWeight: 600 }}>{v.creator_handle || "-"}</td>
                      <td style={rs.td}>
                        {v.url
                          ? <a href={v.url} target="_blank" rel="noreferrer" style={{ color: T.accent, fontWeight: 600, textDecoration: "none" }}>▶ 观看</a>
                          : <span style={{ color: T.hint }}>-</span>}
                      </td>
                      <td style={{ ...rs.td, color: T.muted }}>{v.published_at?.slice(0, 10)}</td>
                      <td style={{ ...rs.tdR, fontWeight: 800, fontSize: 16, color: T.success }}>{v.orders}</td>
                      <td style={rs.tdR}>{rs.num(v.vv)}</td>
                      <td style={rs.tdR}>{rs.num(v.clicks)}</td>
                      <td style={rs.tdR}>{rs.pct(safeDiv(v.clicks, v.vv))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      }
    </div>
  );
}
