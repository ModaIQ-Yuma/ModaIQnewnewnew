// modules/daily/DailyTrend.jsx
import { useMemo } from "react";
import { T, glassStyle, FONT } from "../../constants/tokens.js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const STATUS_COLORS = { 测款: "#6C8FE8", 主推: "#0E9E70", 控量: "#E8923B", 清仓: "#E0455E", 下架: "#94A3B8" };

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `1.5px solid rgba(100,140,220,0.45)`, borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: "#0A1628", marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 3 }}>{p.dataKey}：<strong>{p.value}</strong></div>
      ))}
    </div>
  );
}

function ProductCard({ name, status, data }) {
  const totalShip  = data.reduce((s, d) => s + d.寄样数, 0);
  const totalVideo = data.reduce((s, d) => s + d.视频数, 0);
  if (totalShip === 0 && totalVideo === 0) return null;
  return (
    <div style={{ background: "rgba(235,244,255,0.90)", backdropFilter: "blur(18px) saturate(160%)", WebkitBackdropFilter: "blur(18px) saturate(160%)", border: "1px solid rgba(180,210,255,0.65)", borderRadius: 16, boxShadow: "0 12px 44px rgba(40,90,180,0.14)", padding: "16px 16px 12px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#0A1628" }}>{name}</span>
        {status && <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: STATUS_COLORS[status] || "#94A3B8", borderRadius: 6, padding: "2px 8px" }}>{status}</span>}
        <span style={{ fontSize: 12, color: "#5C7090" }}>
          寄样 <b style={{ color: "#F59E0B" }}>{totalShip}</b> 件 · 视频 <b style={{ color: "#3B82F6" }}>{totalVideo}</b> 条
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,140,220,0.45)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5C7090" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#5C7090" }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
          <Line type="linear" dataKey="寄样数" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="linear" dataKey="视频数" stroke="#3B82F6"  strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DailyTrend({ dates, shipments, videos, products }) {
  const byProduct = useMemo(() => {
    const map = {};
    for (const r of shipments) {
      if (!map[r.product_id]) map[r.product_id] = {};
      map[r.product_id][r.date] = { ...(map[r.product_id][r.date] || { 寄样数: 0, 视频数: 0 }), 寄样数: (map[r.product_id][r.date]?.寄样数 || 0) + r.count };
    }
    for (const r of videos) {
      if (!map[r.product_id]) map[r.product_id] = {};
      map[r.product_id][r.date] = { ...(map[r.product_id][r.date] || { 寄样数: 0, 视频数: 0 }), 视频数: (map[r.product_id][r.date]?.视频数 || 0) + r.count };
    }
    return Object.entries(map).map(([pid, dateMap]) => {
      const p = products.find((x) => x.id === pid);
      return {
        pid, name: p?.internal_name || pid, status: p?.status || "",
        data: dates.map((date) => ({ date: date.slice(5), 寄样数: dateMap[date]?.寄样数 || 0, 视频数: dateMap[date]?.视频数 || 0 })),
      };
    }).filter((r) => r.data.some((d) => d.寄样数 > 0 || d.视频数 > 0))
      .sort((a, b) => b.data.reduce((s, d) => s + d.寄样数, 0) - a.data.reduce((s, d) => s + d.寄样数, 0));
  }, [shipments, videos, products, dates]);

  return (
    <div>
      {byProduct.length === 0
        ? <div style={{ ...glassStyle(14), padding: "32px 20px", textAlign: "center", color: "#5C7090", fontSize: 13 }}>该时间段暂无数据</div>
        : byProduct.map((r) => <ProductCard key={r.pid} {...r} />)
      }
    </div>
  );
}
