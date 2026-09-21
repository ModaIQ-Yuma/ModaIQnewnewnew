// modules/daily/DailyModule.jsx
import { useState } from "react";
import { useProducts } from "../../hooks/useProducts.js";
import { ds } from "./dailyStyles.js";
import DailyOverview from "./DailyOverview.jsx";
import DailyTrend from "./DailyTrend.jsx";

const TABS = [
  { id: "overview", label: "当日概览" },
  { id: "trend",    label: "趋势分析" },
];

export default function DailyModule({ ctx }) {
  const { storeId } = ctx;
  const { products, loading: pLoading } = useProducts(storeId);
  const [tab, setTab] = useState("overview");

  if (pLoading) return <div style={ds.center}>加载中…</div>;

  return (
    <div style={ds.wrap}>
      <h2 style={ds.title}>每日数据</h2>
      <div style={ds.tabs}>
        {TABS.map((t) => (
          <button key={t.id} style={ds.tab(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview"
        ? <DailyOverview storeId={storeId} products={products ?? []} />
        : <DailyTrend    storeId={storeId} products={products ?? []} />
      }
    </div>
  );
}
