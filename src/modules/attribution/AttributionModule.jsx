// modules/attribution/AttributionModule.jsx
import { useState, useMemo } from "react";
import { T } from "../../constants/tokens.js";
import SubNav from "../../components/layout/SubNav.jsx";
import { buildAttrEntries } from "../../lib/review/attributionCalc.js";
import FactorAnalysis    from "./FactorAnalysis.jsx";
import CreatorRecommend  from "./CreatorRecommend.jsx";
import ProductSimilarity from "./ProductSimilarity.jsx";

const SUBTABS = [
  { id:"factor",  label:"🎯 爆单因子分析", desc:"把达人按属性（体型、年龄、风格、等级等）分组，比较各组的爆单率；区分度越高的属性，对出单影响越大。样本少时自动改用「平均出单」比较。" },
  { id:"creator", label:"👤 达人推荐",     desc:"根据该产品的爆单因子，给 CRM 里还没寄过这个产品的达人打分排序，分数越高越值得优先寄样。" },
  { id:"similar", label:"🔗 相似品统计",   desc:"比较各产品爆单因子的重叠程度；重叠越高，说明适合的达人越相似，可以把一个产品的好达人拿去寄另一个。" },
];

export default function AttributionModule({ ctx }) {
  const { collabs, videos, creators, products, dataLoading, dataError } = ctx;
  const [sub, setSub] = useState("factor");

  const entries = useMemo(() =>
    (!dataLoading && collabs && videos && creators && products)
      ? buildAttrEntries(collabs, videos, creators, products)
      : [],
    [collabs, videos, creators, products, dataLoading]
  );

  const activeProducts = useMemo(() =>
    products.filter((p) => p.status !== "撤退款"),
    [products]
  );

  if (dataLoading) return <div style={{ textAlign:"center", padding:48, color:T.hint }}>加载中…</div>;
  if (dataError && !collabs.length) return <div style={{ textAlign:"center", padding:48, color:T.danger }}>错误：{dataError}</div>;

  return (
    <div>
      <SubNav tabs={SUBTABS} active={sub} onChange={setSub} />
      {sub==="factor"  && <FactorAnalysis    entries={entries} products={activeProducts} />}
      {sub==="creator" && <CreatorRecommend  entries={entries} products={activeProducts} />}
      {sub==="similar" && <ProductSimilarity entries={entries} products={activeProducts} />}
    </div>
  );
}
