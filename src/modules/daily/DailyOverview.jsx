// modules/daily/DailyOverview.jsx
import { useMemo } from "react";
import { T, glassStyle, FONT } from "../../constants/tokens.js";
import { ds } from "./dailyStyles.js";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export default function DailyOverview({ date, shipments, videos, invites, products }) {
  const chartData = useMemo(() => {
    const shipMap = {}, vidMap = {};
    for (const r of shipments) {
      if (r.date === date) shipMap[r.product_id] = (shipMap[r.product_id] || 0) + r.count;
    }
    for (const r of videos) {
      if (r.date === date) vidMap[r.product_id] = (vidMap[r.product_id] || 0) + r.count;
    }
    const ids = new Set([...Object.keys(shipMap), ...Object.keys(vidMap)]);
    return [...ids].map((pid) => {
      const p = products.find((x) => x.id === pid);
      return { name: p?.internal_name || pid, 寄样数: shipMap[pid] || 0, 视频数: vidMap[pid] || 0 };
    }).filter((d) => d.寄样数 > 0 || d.视频数 > 0)
      .sort((a, b) => b.寄样数 - a.寄样数);
  }, [shipments, videos, products, date]);

  const totalShip  = chartData.reduce((s, d) => s + d.寄样数, 0);
  const totalVideo = chartData.reduce((s, d) => s + d.视频数, 0);
  const totalInvite = invites.filter((r) => r.date === date).reduce((s, r) => s + r.count, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: T.hint }}>
          寄样 <b style={{ color: "#F59E0B" }}>{totalShip}</b> 件 ·{" "}
          视频 <b style={{ color: "#3B82F6" }}>{totalVideo}</b> 条 ·{" "}
          拉新 <b style={{ color: T.success }}>{totalInvite}</b> 人次
        </span>
      </div>

      {chartData.length === 0 ? (
        <div style={{ ...glassStyle(14), padding: "32px 20px", textAlign: "center", color: T.hint, fontSize: 13 }}>
          {date} 暂无寄样或视频数据
        </div>
      ) : (
        <div style={{ ...glassStyle(16, true), padding: "20px 16px" }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }} barCategoryGap="30%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 12 }} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="寄样数" fill="#F59E0B" radius={[5, 5, 0, 0]} maxBarSize={40} />
              <Bar dataKey="视频数" fill="#3B82F6"  radius={[5, 5, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ ...glassStyle(14), padding: "16px 20px", marginTop: 16 }}>
        <div style={{ fontSize: FONT.lg2, fontWeight: 700, color: T.text, marginBottom: 10 }}>助理拉新排行</div>
        {totalInvite === 0
          ? <div style={{ fontSize: 13, color: T.hint }}>暂无拉新数据</div>
          : invites.filter((r) => r.date === date).sort((a, b) => b.count - a.count).map((r) => (
              <div key={r.staff_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: `1px solid ${T.glassStroke}` }}>
                <span style={{ color: T.text }}>{r.staff_name || r.staff_id}</span>
                <b style={{ color: T.accent }}>{r.count}</b>
              </div>
            ))
        }
      </div>
    </div>
  );
}
