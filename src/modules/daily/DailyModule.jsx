// modules/daily/DailyModule.jsx
import { useState, useMemo } from "react";
import { ds } from "./dailyStyles.js";
import { useDaily } from "../../hooks/useDaily.js";
import { todayPST } from "../../lib/utils.js";
import DailyOverview from "./DailyOverview.jsx";
import DailyTrend    from "./DailyTrend.jsx";

const TABS = [
  { id: "overview", label: "当日概览" },
  { id: "trend",    label: "趋势分析" },
];

function daysAgo(n) {
  const d = new Date(todayPST() + "T12:00:00");
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" });
}

function dateList(from, to) {
  const list = [], cur = new Date(from + "T12:00:00"), end = new Date(to + "T12:00:00");
  while (cur <= end) { list.push(cur.toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" })); cur.setDate(cur.getDate() + 1); }
  return list;
}

export default function DailyModule({ ctx }) {
  const { storeId, products } = ctx;
  const [tab,  setTab]  = useState("overview");
  const [date, setDate] = useState(todayPST);
  const [from, setFrom] = useState(() => daysAgo(13));
  const [to,   setTo]   = useState(todayPST);

  // dateFrom/dateTo 取两个视图的并集，只拉一次
  const dateFrom = tab === "overview" ? date : from;
  const dateTo   = tab === "overview" ? date : to;

  const { shipments, videos, invites } = useDaily(storeId, dateFrom, dateTo);
  const dates = useMemo(() => dateList(from, to), [from, to]);

  const inp = { padding: "6px 12px", borderRadius: 9, border: "1.5px solid rgba(100,140,220,0.45)", fontSize: 13, background: "rgba(255,255,255,0.5)", outline: "none", fontFamily: "inherit" };

  return (
    <div style={ds.wrap}>
      <h2 style={ds.title}>每日数据</h2>
      <div style={ds.tabs}>
        {TABS.map((t) => <button key={t.id} style={ds.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {/* 日期控件 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 20 }}>
        {tab === "overview" ? (
          <>
            <span style={{ fontSize: 13, color: "rgba(51,69,94,1)", fontWeight: 600 }}>选择日期</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, color: "rgba(51,69,94,1)", fontWeight: 600 }}>日期范围</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inp} />
            <span style={{ color: "rgba(92,112,144,1)" }}>—</span>
            <input type="date" value={to}   onChange={(e) => setTo(e.target.value)}   style={inp} />
            <span style={{ fontSize: 12, color: "rgba(92,112,144,1)" }}>{dates.filter((d) => shipments.some((r) => r.date === d) || videos.some((r) => r.date === d)).length > 0 ? `${new Set([...shipments.map(r=>r.product_id),...videos.map(r=>r.product_id)]).size} 个产品有数据` : "暂无数据"}</span>
          </>
        )}
      </div>

      {tab === "overview"
        ? <DailyOverview date={date} shipments={shipments ?? []} videos={videos ?? []} invites={invites ?? []} products={products ?? []} />
        : <DailyTrend    dates={dates} shipments={shipments ?? []} videos={videos ?? []} products={products ?? []} />
      }
    </div>
  );
}
