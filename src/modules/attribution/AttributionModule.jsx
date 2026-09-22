// modules/attribution/AttributionModule.jsx
import { useState, useMemo } from "react";
import { T, FONT } from "../../constants/tokens.js";
import { buildAttrEntries } from "../../lib/review/attributionCalc.js";
import FactorAnalysis    from "./FactorAnalysis.jsx";
import CreatorRecommend  from "./CreatorRecommend.jsx";
import ProductSimilarity from "./ProductSimilarity.jsx";

const SUBTABS = [
  { id:"factor",  label:"🎯 爆单因子分析" },
  { id:"creator", label:"👤 达人推荐"     },
  { id:"similar", label:"🔗 相似品统计"   },
];

export default function AttributionModule({ ctx }) {
  const { collabs, videos, creators, products, reviewLoading, reviewError } = ctx;
  const [sub, setSub] = useState("factor");

  const entries = useMemo(() =>
    (!reviewLoading && collabs && videos && creators && products)
      ? buildAttrEntries(collabs, videos, creators, products)
      : [],
    [collabs, videos, creators, products, reviewLoading]
  );

  const activeProducts = useMemo(() =>
    products.filter((p) => p.status !== "撤退款"),
    [products]
  );

  if (reviewLoading) return <div style={{ textAlign:"center", padding:48, color:T.hint }}>加载中…</div>;
  if (reviewError)   return <div style={{ textAlign:"center", padding:48, color:T.danger }}>错误：{reviewError}</div>;

  return (
    <div style={{ padding:20 }}>
      <h2 style={{ fontSize:FONT.x4l, fontWeight:700, color:T.text, marginBottom:14 }}>归因分析</h2>
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {SUBTABS.map((t) => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{
            fontSize:FONT.lg2, padding:"6px 16px", borderRadius:18,
            border:`1.5px solid ${sub===t.id ? T.accent : T.border}`,
            background:sub===t.id ? T.accent : "transparent",
            color:sub===t.id ? "#fff" : T.muted,
            cursor:"pointer", fontFamily:"inherit", fontWeight:sub===t.id ? 700 : 600,
          }}>{t.label}</button>
        ))}
      </div>
      {sub==="factor"  && <FactorAnalysis    entries={entries} products={activeProducts} />}
      {sub==="creator" && <CreatorRecommend  entries={entries} products={activeProducts} />}
      {sub==="similar" && <ProductSimilarity entries={entries} products={activeProducts} />}
    </div>
  );
}
