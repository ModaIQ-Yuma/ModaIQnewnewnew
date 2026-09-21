// modules/review/StoreReview.jsx
import { useState, useMemo } from "react";
import { glassStyle, T } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { calcMonthMetrics } from "../../lib/review/reviewCalc.js";
import { monthsBetween } from "../../lib/utils.js";
import { COLORS } from "../daily/dailyStyles.js";

const fmt = (n) => n == null ? "—" : Number(n).toLocaleString();
const pct = (v) => v == null ? "—" : (v * 100).toFixed(1) + "%";
const dec = (v) => v == null ? "—" : Number(v).toFixed(2);

function defFrom() {
  const d = new Date(); d.setMonth(d.getMonth() - 5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function defTo() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={rs.metricCard}>
      <div style={rs.metricLbl}>{label}</div>
      <div style={rs.metricVal(accent)}>{value}</div>
      {sub && <div style={rs.metricSub}>{sub}</div>}
    </div>
  );
}

function MiniLineChart({ data, keyShip, keyVideo, keyOrders }) {
  const [tip, setTip] = useState(null);
  const H = 100, PL = 32, PR = 8, PT = 8, PB = 24, W = 400;
  const chartH = H - PT - PB, chartW = W - PL - PR;
  const N = data.length;
  if (!N) return null;
  const maxVal = Math.max(...data.flatMap((d) => [d[keyShip]||0, d[keyVideo]||0, d[keyOrders]||0]), 1);
  const xPos = (i) => PL + (i / Math.max(N - 1, 1)) * chartW;
  const yPos = (v) => PT + chartH - (v / maxVal) * chartH;
  const pts  = (key, col) => {
    const p = data.map((d, i) => `${xPos(i)},${yPos(d[key]||0)}`).join(" ");
    return <polyline key={col} points={p} fill="none" stroke={col} strokeWidth={2} strokeLinejoin="round" />;
  };
  return (
    <div style={{ position: "relative" }} onMouseLeave={() => setTip(null)}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const i = Math.max(0, Math.min(N - 1, Math.round(((e.clientX - rect.left - PL) / chartW) * (N - 1))));
          setTip({ i, x: e.clientX, y: e.clientY });
        }}>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={PL} x2={W - PR} y1={PT + chartH * (1 - t)} y2={PT + chartH * (1 - t)}
            stroke="rgba(100,140,220,0.15)" strokeDasharray="4 3" />
        ))}
        {pts(keyShip, COLORS.ship)}
        {pts(keyVideo, COLORS.video)}
        {pts(keyOrders, COLORS.invite)}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xPos(i)} cy={yPos(d[keyShip]||0)}   r={3} fill={COLORS.ship} />
            <circle cx={xPos(i)} cy={yPos(d[keyVideo]||0)}  r={3} fill={COLORS.video} />
            <circle cx={xPos(i)} cy={yPos(d[keyOrders]||0)} r={3} fill={COLORS.invite} />
          </g>
        ))}
        {data.map((d, i) => (N <= 6 || i % Math.ceil(N / 6) === 0 || i === N - 1)
          ? <text key={i} x={xPos(i)} y={H - 4} textAnchor="middle" fontSize={9} fill={T.hint}>{d.ym?.slice(5)}</text>
          : null
        )}
        {tip && <line x1={xPos(tip.i)} x2={xPos(tip.i)} y1={PT} y2={PT + chartH}
          stroke="rgba(100,140,220,0.4)" strokeWidth={1} strokeDasharray="3 2" />}
      </svg>
      {tip && (
        <div style={{ position: "fixed", left: tip.x + 12, top: tip.y - 10, zIndex: 9999,
          background: "rgba(10,22,40,0.92)", color: "#fff", borderRadius: 8,
          padding: "8px 12px", fontSize: 12, pointerEvents: "none", lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{data[tip.i]?.ym}</div>
          <div><span style={{ color: COLORS.ship }}>●</span> 寄样：{fmt(data[tip.i]?.[keyShip])}</div>
          <div><span style={{ color: COLORS.video }}>●</span> 视频：{fmt(data[tip.i]?.[keyVideo])}</div>
          <div><span style={{ color: COLORS.invite }}>●</span> 出单：{fmt(data[tip.i]?.[keyOrders])}</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 14, fontSize: 11, color: T.muted, marginTop: 4 }}>
        <span><span style={{ color: COLORS.ship }}>—</span> 寄样数</span>
        <span><span style={{ color: COLORS.video }}>—</span> 视频数</span>
        <span><span style={{ color: COLORS.invite }}>—</span> 出单数</span>
      </div>
    </div>
  );
}

export default function StoreReview({ collabs, videos, products }) {
  const [fromYm, setFromYm] = useState(defFrom);
  const [toYm,   setToYm]   = useState(defTo);
  const months = useMemo(() => monthsBetween(fromYm, toYm), [fromYm, toYm]);

  // 全店汇总（跨多月）
  const summary = useMemo(() => {
    const allMetrics = months.map((ym) => calcMonthMetrics(collabs, videos, ym, null));
    return {
      shipCount:       allMetrics.reduce((s, m) => s + m.shipCount, 0),
      videoCount:      allMetrics.reduce((s, m) => s + m.videoCount, 0),
      fulfillCount:    allMetrics.reduce((s, m) => s + m.fulfillCount, 0),
      withSalesCount:  allMetrics.reduce((s, m) => s + m.withSalesCount, 0),
      videoWithSales:  allMetrics.reduce((s, m) => s + m.videoWithSales, 0),
      videoOrders:     allMetrics.reduce((s, m) => s + m.videoOrders, 0),
      avgFulfillDays:  (() => {
        const v = allMetrics.filter((m) => m.avgFulfillDays != null);
        return v.length ? Math.round(v.reduce((s, m) => s + m.avgFulfillDays, 0) / v.length) : null;
      })(),
    };
  }, [collabs, videos, months]);

  const fulfillRate    = summary.shipCount ? summary.fulfillCount / summary.shipCount : null;
  const saleRate       = summary.fulfillCount ? summary.withSalesCount / summary.fulfillCount : null;
  const videoSaleRate  = summary.videoCount ? summary.videoWithSales / summary.videoCount : null;
  const sampleSalesRatio = summary.shipCount ? summary.videoOrders / summary.shipCount : null;

  // 全店趋势数据
  const storeData = useMemo(() =>
    months.map((ym) => { const m = calcMonthMetrics(collabs, videos, ym, null); return { ym, shipCount: m.shipCount, videoCount: m.videoCount, videoOrders: m.videoOrders }; }),
    [collabs, videos, months]
  );

  // 各产品趋势数据
  const productData = useMemo(() =>
    products.map((p) => ({
      product: p,
      data: months.map((ym) => { const m = calcMonthMetrics(collabs, videos, ym, p.id); return { ym, shipCount: m.shipCount, videoCount: m.videoCount, videoOrders: m.videoOrders }; }),
    })).filter(({ data }) => data.some((d) => d.shipCount > 0 || d.videoCount > 0)),
    [collabs, videos, products, months]
  );

  return (
    <div>
      <div style={rs.toolbar}>
        <span style={rs.label}>统计区间</span>
        <input type="month" style={rs.monthInp} value={fromYm} onChange={(e) => setFromYm(e.target.value)} />
        <span style={{ color: T.hint }}>—</span>
        <input type="month" style={rs.monthInp} value={toYm} onChange={(e) => setToYm(e.target.value)} />
        <span style={{ fontSize: 12, color: T.hint }}>寄样按账期 上月15日～本月14日 · 视频按自然月</span>
      </div>

      <div style={rs.metricGrid}>
        <MetricCard label="区间合作达人数" value={fmt(summary.shipCount)} sub="CRM 寄样记录数" />
        <MetricCard label="区间新视频数"   value={fmt(summary.videoCount)} sub="CRM + 非CRM" />
        <MetricCard label="履约率"         value={pct(fulfillRate)} sub="有视频 ÷ 总寄样" accent />
        <MetricCard label="达人出单率"     value={pct(saleRate)} sub="出单达人 ÷ 有视频达人" accent />
        <MetricCard label="视频出单率"     value={pct(videoSaleRate)} sub="出单视频 ÷ 总视频" accent />
        <MetricCard label="区间样销比"     value={dec(sampleSalesRatio)} sub="总出单 ÷ 总寄样数" accent />
        <MetricCard label="平均履约周期"   value={summary.avgFulfillDays == null ? "—" : `${summary.avgFulfillDays} 天`} sub="寄样→首条视频均值" />
      </div>

      <div style={{ ...glassStyle(14), padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>全店月度趋势</div>
        <MiniLineChart data={storeData} keyShip="shipCount" keyVideo="videoCount" keyOrders="videoOrders" />
      </div>

      {productData.map(({ product, data }) => (
        <div key={product.id} style={{ ...glassStyle(14), padding: "16px 20px", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>{product.internal_name}</div>
          <MiniLineChart data={data} keyShip="shipCount" keyVideo="videoCount" keyOrders="videoOrders" />
        </div>
      ))}
    </div>
  );
}
