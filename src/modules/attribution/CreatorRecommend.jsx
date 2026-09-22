// modules/attribution/CreatorRecommend.jsx
import { useState, useMemo } from "react";
import { T, FONT } from "../../constants/tokens.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";
import { calcProductFactors, scoreCreators } from "../../lib/review/attributionCalc.js";

const pct = (v) => v == null ? "—" : (v * 100).toFixed(1) + "%";
const inpS = { fontSize: FONT.lg2, padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontFamily: "inherit", color: T.text, background: "rgba(255,255,255,0.6)" };
const thS  = { fontSize: FONT.sm, fontWeight: 700, color: T.muted, padding: "8px 12px", textAlign: "left", borderBottom: `2px solid ${T.border}`, whiteSpace: "nowrap" };
const tdS  = { fontSize: FONT.lg2, padding: "9px 12px", borderBottom: `1px solid ${T.border}`, color: T.text };

export default function CreatorRecommend({ entries, products }) {
  const [productId, setProductId] = useState("");
  const [threshold, setThreshold] = useState(BURST_ORDER_THRESHOLD);
  const [limit,     setLimit]     = useState(20);

  const { factors, useAvgMode } = useMemo(() => {
    if (!productId) return { factors: [], useAvgMode: false };
    const r = calcProductFactors(entries, productId, threshold);
    return { factors: r.factors, useAvgMode: r.useAvgMode };
  }, [entries, productId, threshold]);

  const recommendations = useMemo(() => {
    if (!productId || !factors.length) return [];
    return scoreCreators(entries, productId, factors).slice(0, limit);
  }, [entries, productId, factors, limit]);

  const productName = products.find((p) => p.id === productId)?.internal_name || "";

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} style={{ ...inpS, minWidth: 180 }}>
          <option value="">选择产品…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.internal_name}</option>)}
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: FONT.lg2, color: T.muted }}>爆单阈值</span>
          <input type="number" min={1} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} style={{ ...inpS, width: 70, textAlign: "center" }} />
          <span style={{ fontSize: FONT.lg2, color: T.muted }}>单</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: FONT.lg2, color: T.muted }}>显示前</span>
          <input type="number" min={5} max={100} value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ ...inpS, width: 60, textAlign: "center" }} />
          <span style={{ fontSize: FONT.lg2, color: T.muted }}>名</span>
        </div>
      </div>

      {!productId && <div style={{ textAlign: "center", color: T.muted, padding: "60px 0" }}>请先选择产品</div>}
      {productId && factors.length === 0 && <div style={{ textAlign: "center", color: T.muted, padding: "60px 0" }}>该产品暂无足够因子数据</div>}
      {productId && factors.length > 0 && recommendations.length === 0 && <div style={{ textAlign: "center", color: T.muted, padding: "60px 0" }}>CRM 里所有达人都已寄过该产品</div>}

      {recommendations.length > 0 && (
        <>
          <div style={{ fontSize: FONT.lg2, color: T.hint, marginBottom: 12 }}>
            共 {recommendations.length} 名推荐达人 · {useAvgMode ? "均单模式" : `爆单阈值 ≥${threshold} 单`} · 未寄过「{productName}」
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={thS}>排名</th>
                <th style={thS}>达人 handle</th>
                <th style={thS}>综合评分</th>
                <th style={thS}>命中因子</th>
              </tr></thead>
              <tbody>
                {recommendations.map(({ handle, creatorId, score, hits }, i) => (
                  <tr key={creatorId + i} style={{ background: i < 3 ? `${T.success}08` : "transparent" }}>
                    <td style={{ ...tdS, fontWeight: 800, color: i < 3 ? T.success : T.muted }}>#{i + 1}</td>
                    <td style={{ ...tdS, fontWeight: 600 }}>{handle}</td>
                    <td style={{ ...tdS, fontWeight: 700, color: T.accent }}>{(score * 100).toFixed(1)}</td>
                    <td style={tdS}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {hits.slice(0, 4).map((h) => (
                          <span key={h.label} style={{ fontSize: FONT.xs, padding: "2px 8px", borderRadius: 10, background: `${T.accent}15`, color: T.accent, fontWeight: 600 }}>
                            {h.label}: {h.value} ({pct(h.metric)})
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
