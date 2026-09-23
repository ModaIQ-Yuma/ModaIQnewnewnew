// modules/bdtools/BDToolsModule.jsx
import { useState } from "react";
import SubNav from "../../components/layout/SubNav.jsx";
import RoiCalculator from "./RoiCalculator.jsx";

const SUBTABS = [
  { id: "roi",   label: "💰 付费回本计算", desc: "填入产品成本、各方抽佣比例和坑位费，算出付费合作至少要卖多少单才能回本。" },
];

export default function BDToolsModule({ ctx }) {
  const { products } = ctx;
  const [sub, setSub] = useState("roi");

  return (
    <div>
      <SubNav tabs={SUBTABS} active={sub} onChange={setSub} />
      {sub === "roi" && <RoiCalculator products={products ?? []} />}
    </div>
  );
}
