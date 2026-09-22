// modules/bdtools/BDToolsModule.jsx
import { useState } from "react";
import { T, FONT, tabStyle } from "../../constants/tokens.js";
import RoiCalculator from "./RoiCalculator.jsx";

const SUBTABS = [
  { id: "roi",   label: "💰 付费回本计算" },
];

export default function BDToolsModule({ ctx }) {
  const { storeId, products } = ctx;
  const [sub, setSub] = useState("roi");

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: FONT.x4l, fontWeight: 700, color: T.text, marginBottom: 14 }}>BD 工具箱</h2>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {SUBTABS.map((t) => (
          <button key={t.id} onClick={() => setSub(t.id)} style={tabStyle(sub===t.id)}>{t.label}</button>
        ))}
      </div>
      {sub === "roi" && <RoiCalculator products={products ?? []} />}
    </div>
  );
}
