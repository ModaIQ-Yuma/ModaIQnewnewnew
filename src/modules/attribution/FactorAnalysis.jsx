// modules/attribution/FactorAnalysis.jsx
import { useState, useMemo } from "react";
import { T, FONT } from "../../constants/tokens.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";
import { calcProductFactors } from "../../lib/review/attributionCalc.js";

const pct = (v) => v == null ? "—" : (v * 100).toFixed(1) + "%";
const avg = (v) => v == null ? "—" : v.toFixed(1);
const barColor = (rank, total) => {
  const t = rank / Math.max(total - 1, 1);
  if (t <= 0.33) return T.success;
  if (t <= 0.66) return T.accent;
  return T.danger;
};
const inpS = { fontSize: FONT.lg2, padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontFamily: "inherit", color: T.text, background: "rgba(255,255,255,0.6)" };

export default function FactorAnalysis({ entries, products }) {
  const [productId,  setProductId]  = useState("");
  const [threshold,  setThreshold]  = useState(BURST_ORDER_THRESHOLD);
  const [expanded,   setExpanded]   = useState(null);

  const result = useMemo(() =>
    productId ? calcProductFactors(entries, productId, threshold) : null,
    [entries, productId, threshold]
  );

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
          <span style={{ fontSize: FONT.lg2, color: T.muted }}>单/视频</span>
        </div>
        {result && <span style={{ fontSize: FONT.sm2, color: T.hint }}>{result.totalVideos} 条视频 · {result.useAvgMode ? "样本较少，使用均单模式" : `爆单阈值 ≥${threshold} 单`}</span>}
      </div>

      {!productId && <div style={{ textAlign: "center", color: T.muted, padding: "60px 0" }}>请先选择产品</div>}
      {result && result.factors.length === 0 && <div style={{ textAlign: "center", color: T.muted, padding: "60px 0" }}>该产品暂无足够数据</div>}

      {result && result.factors.map((f, fi) => {
        const isExp    = expanded === f.key;
        const top      = f.opts[0];
        const maxMetric = Math.max(...f.opts.map((o) => o.rate ?? o.avg));
        return (
          <div key={f.key} style={{ background: "rgba(255,255,255,0.55)", border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setExpanded(isExp ? null : f.key)}>
              <span style={{ fontSize: FONT.lg2, fontWeight: 800, color: T.muted, minWidth: 24 }}>#{fi + 1}</span>
              <span style={{ fontSize: FONT.xl2, fontWeight: 700, color: T.text, flex: 1 }}>{f.label}</span>
              {top && <span style={{ fontSize: FONT.sm2, color: T.success, fontWeight: 600 }}>最优：{top.label} ({result.useAvgMode ? `均 ${avg(top.avg)} 单` : pct(top.rate)})</span>}
              <span style={{ fontSize: FONT.sm2, color: T.hint }}>区分度 {(f.discrimination * 100).toFixed(1)}pp</span>
              <span style={{ color: T.muted, fontSize: FONT.lg2 }}>{isExp ? "▲" : "▼"}</span>
            </div>

            {isExp && (
              <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                {f.opts.map((o, oi) => {
                  const metric = o.rate ?? o.avg;
                  const barW   = maxMetric > 0 ? (metric / maxMetric * 100).toFixed(0) : 0;
                  const color  = barColor(oi, f.opts.length);
                  return (
                    <div key={o.value} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: FONT.lg2, minWidth: 90, color: T.text, fontWeight: oi === 0 ? 700 : 400 }}>{o.label}</span>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: T.border, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${barW}%`, background: color, borderRadius: 4, transition: "width .3s" }} />
                      </div>
                      <span style={{ fontSize: FONT.lg2, fontWeight: 600, color, minWidth: 50, textAlign: "right" }}>
                        {result.useAvgMode ? `${avg(o.avg)}单` : pct(o.rate)}
                      </span>
                      <span style={{ fontSize: FONT.sm, color: T.hint, minWidth: 50, textAlign: "right" }}>{o.total} 条</span>
                      {o.total < 5 && <span style={{ fontSize: FONT.xs, color: T.warning, fontWeight: 600 }}>样本少</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
