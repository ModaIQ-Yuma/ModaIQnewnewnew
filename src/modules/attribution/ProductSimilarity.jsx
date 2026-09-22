// modules/attribution/ProductSimilarity.jsx
import { useState, useMemo } from "react";
import { T, FONT } from "../../constants/tokens.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";
import { calcProductFactors } from "../../lib/review/attributionCalc.js";
import { calcProductSimilarity } from "../../lib/review/similarityCalc.js";

const pct = (v) => (v * 100).toFixed(1) + "%";
const simColor = (s) => s >= 0.8 ? T.success : s >= 0.6 ? T.accent : T.warning;
const inpS = { fontSize: FONT.lg2, padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontFamily: "inherit", color: T.text, background: "rgba(255,255,255,0.6)" };

export default function ProductSimilarity({ entries, products }) {
  const [threshold,  setThreshold]  = useState(BURST_ORDER_THRESHOLD);
  const [focusId,    setFocusId]    = useState(null);

  const pairs = useMemo(() =>
    calcProductSimilarity(entries, products, threshold),
    [entries, products, threshold]
  );

  const focusPairs = useMemo(() =>
    focusId ? pairs.filter((p) => p.aId === focusId || p.bId === focusId) : pairs,
    [pairs, focusId]
  );

  const focusName   = products.find((p) => p.id === focusId)?.internal_name;
  const focusDetail = useMemo(() => {
    if (!focusId) return null;
    const { factors } = calcProductFactors(entries, focusId, threshold);
    return factors.slice(0, 5).map((f) => ({ label: f.label, top: f.opts[0] }));
  }, [focusId, entries, threshold]);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: FONT.lg2, color: T.muted }}>爆单阈值</span>
          <input type="number" min={1} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} style={{ ...inpS, width: 70, textAlign: "center" }} />
          <span style={{ fontSize: FONT.lg2, color: T.muted }}>单</span>
        </div>
        <select value={focusId || ""} onChange={(e) => setFocusId(e.target.value || null)} style={{ ...inpS, minWidth: 180 }}>
          <option value="">全部产品</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.internal_name}</option>)}
        </select>
        {focusId && <button onClick={() => setFocusId(null)} style={{ fontSize: FONT.sm2, color: T.muted, background: "none", border: "none", cursor: "pointer" }}>✕ 清除筛选</button>}
      </div>

      {focusId && focusDetail && (
        <div style={{ background: `${T.accent}0D`, border: `1.5px solid ${T.accent}33`, borderRadius: 12, padding: "14px 18px", marginBottom: 18 }}>
          <div style={{ fontSize: FONT.lg2, fontWeight: 700, color: T.accent, marginBottom: 10 }}>「{focusName}」的爆单因子（前5）</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {focusDetail.map(({ label, top }) => top && (
              <span key={label} style={{ fontSize: FONT.sm2, padding: "4px 12px", borderRadius: 20, background: `${T.accent}15`, color: T.accent, fontWeight: 600, border: `1px solid ${T.accent}33` }}>
                {label}: {top.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {focusPairs.length === 0 && (
        <div style={{ textAlign: "center", color: T.muted, padding: "60px 0" }}>
          {pairs.length === 0 ? "暂无足够数据计算产品相似度" : "该产品暂无相似品"}
        </div>
      )}

      {focusPairs.map((p) => (
        <div key={p.aId + "__" + p.bId} style={{ background: "rgba(255,255,255,0.55)", border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: FONT.xl2, fontWeight: 700, color: T.text, cursor: "pointer" }} onClick={() => setFocusId(p.aId)}>{p.a}</span>
              <span style={{ fontSize: FONT.sm2, color: T.hint }}>⟷</span>
              <span style={{ fontSize: FONT.xl2, fontWeight: 700, color: T.text, cursor: "pointer" }} onClick={() => setFocusId(p.bId)}>{p.b}</span>
            </div>
            <div style={{ fontSize: FONT.sm, color: T.hint }}>点击产品名可查看其爆单因子详情</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: FONT.x4l, fontWeight: 800, color: simColor(p.sim) }}>{pct(p.sim)}</div>
            <div style={{ fontSize: FONT.xs, color: T.hint }}>最优因子重叠率</div>
          </div>
          <div style={{ width: 6, height: 40, borderRadius: 3, background: simColor(p.sim) }} />
        </div>
      ))}
    </div>
  );
}
