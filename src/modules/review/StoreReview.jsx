// modules/review/StoreReview.jsx
import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { glassStyle, T, FONT } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { calcMonthMetrics } from "../../lib/review/reviewCalc.js";
import { monthsBetween, videoRange } from "../../lib/utils.js";

const COLORS = { ship: "#F59E0B", video: "#3B82F6", orders: "#EC4899" };
const defFrom = () => { const d = new Date(); d.setMonth(d.getMonth()-5); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const defTo   = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const labels = { shipCount:"寄样数", videoCount:"发布视频数", videoOrders:"出单数" };
  return (
    <div style={{ background:"#fff", border:`1.5px solid ${T.border}`, borderRadius:10, padding:"10px 14px", fontSize:FONT.lg2 }}>
      <div style={{ fontWeight:700, color:T.text, marginBottom:6 }}>{label}</div>
      {payload.map((p) => <div key={p.dataKey} style={{ color:p.color, marginBottom:3 }}>{labels[p.dataKey]}：<strong>{p.value}</strong></div>)}
    </div>
  );
}

function TrendChart({ data, title }) {
  if (!data.length) return <div style={{ color:T.hint, fontSize:FONT.lg2, padding:"12px 0" }}>暂无数据</div>;
  return (
    <div>
      {title && <div style={{ fontSize:FONT.lg2, fontWeight:700, color:T.text, marginBottom:10 }}>{title}</div>}
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top:4, right:20, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="ym" tick={{ fontSize:FONT.sm, fill:T.muted }} />
          <YAxis yAxisId="left"  tick={{ fontSize:FONT.sm, fill:T.muted }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize:FONT.sm, fill:COLORS.orders }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(v) => ({ shipCount:"寄样数", videoCount:"视频数", videoOrders:"出单数" })[v]} wrapperStyle={{ fontSize:FONT.lg }} />
          <Line yAxisId="left"  type="linear" dataKey="shipCount"   stroke={COLORS.ship}   strokeWidth={2} dot={{ r:3 }} />
          <Line yAxisId="left"  type="linear" dataKey="videoCount"  stroke={COLORS.video}  strokeWidth={2} dot={{ r:3 }} />
          <Line yAxisId="right" type="linear" dataKey="videoOrders" stroke={COLORS.orders} strokeWidth={3} dot={{ r:3.5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
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

export default function StoreReview({ collabs, videos, products }) {
  const [fromYm,  setFromYm]  = useState(defFrom);
  const [toYm,    setToYm]    = useState(defTo);
  const [videoFrom, setVideoFrom] = useState("");
  const [videoTo,   setVideoTo]   = useState("");
  const months = useMemo(() => monthsBetween(fromYm, toYm), [fromYm, toYm]);

  const summary = useMemo(() => {
    const all = months.map((ym) => calcMonthMetrics(collabs, videos, ym, null, videoFrom||undefined, videoTo||undefined));
    return {
      shipCount:      all.reduce((s,m)=>s+m.shipCount,0),
      videoCount:     all.reduce((s,m)=>s+m.videoCount,0),
      fulfillCount:   all.reduce((s,m)=>s+m.fulfillCount,0),
      withSalesCount: all.reduce((s,m)=>s+m.withSalesCount,0),
      videoWithSales: all.reduce((s,m)=>s+m.videoWithSales,0),
      videoOrders:    all.reduce((s,m)=>s+m.videoOrders,0),
      avgFulfillDays: (() => { const v=all.filter(m=>m.avgFulfillDays!=null); return v.length?Math.round(v.reduce((s,m)=>s+m.avgFulfillDays,0)/v.length):null; })(),
    };
  }, [collabs, videos, months, videoFrom, videoTo]);

  const storeData = useMemo(() =>
    months.map((ym) => { const m=calcMonthMetrics(collabs,videos,ym,null,videoFrom||undefined,videoTo||undefined); return { ym, shipCount:m.shipCount, videoCount:m.videoCount, videoOrders:m.videoOrders }; }),
    [collabs,videos,months,videoFrom,videoTo]
  );

  const productData = useMemo(() =>
    products.map((p) => ({
      product:p,
      data: months.map((ym) => { const m=calcMonthMetrics(collabs,videos,ym,p.id,videoFrom||undefined,videoTo||undefined); return { ym, shipCount:m.shipCount, videoCount:m.videoCount, videoOrders:m.videoOrders }; }),
    })).filter(({data})=>data.some(d=>d.shipCount>0||d.videoCount>0)),
    [collabs,videos,products,months,videoFrom,videoTo]
  );

  const pct = rs.pct; const dec = rs.dec;
  const fulfillRate   = summary.shipCount ? summary.fulfillCount/summary.shipCount : null;
  const saleRate      = summary.fulfillCount ? summary.withSalesCount/summary.fulfillCount : null;
  const videoSaleRate = summary.videoCount ? summary.videoWithSales/summary.videoCount : null;
  const sampleRatio   = summary.shipCount ? summary.videoOrders/summary.shipCount : null;

  return (
    <div>
      <div style={rs.toolbar}>
        <span style={rs.label}>月份区间</span>
        <input type="month" style={rs.monthInp} value={fromYm} onChange={e=>setFromYm(e.target.value)} />
        <span style={{ color:T.hint }}>—</span>
        <input type="month" style={rs.monthInp} value={toYm}   onChange={e=>setToYm(e.target.value)} />
        <span style={rs.label}>视频日期</span>
        <input type="date"  style={rs.monthInp} value={videoFrom} onChange={e=>setVideoFrom(e.target.value)} placeholder="不限" />
        <span style={{ color:T.hint }}>—</span>
        <input type="date"  style={rs.monthInp} value={videoTo}   onChange={e=>setVideoTo(e.target.value)}   placeholder="不限" />
        {(videoFrom||videoTo) && <button style={rs.btnGhost} onClick={()=>{setVideoFrom("");setVideoTo("");}}>清除</button>}
      </div>
      <div style={rs.metricGrid}>
        <MetricCard label="合作达人数"   value={rs.num(summary.shipCount)}   sub="CRM寄样记录数" />
        <MetricCard label="新视频数"     value={rs.num(summary.videoCount)}  sub="CRM+非CRM" />
        <MetricCard label="履约率"       value={pct(fulfillRate)}            sub="有视频÷总寄样" accent />
        <MetricCard label="达人出单率"   value={pct(saleRate)}               sub="出单达人÷有视频" accent />
        <MetricCard label="视频出单率"   value={pct(videoSaleRate)}          sub="出单视频÷总视频" accent />
        <MetricCard label="区间样销比"   value={dec(sampleRatio)}            sub="总出单÷总寄样" accent />
        <MetricCard label="平均履约周期" value={summary.avgFulfillDays==null?"—":`${summary.avgFulfillDays}天`} sub="寄样→首条视频" />
      </div>
      <div style={{ ...glassStyle(14), padding:"16px 20px", marginBottom:12 }}>
        <TrendChart data={storeData} title="全店月度趋势" />
      </div>
      {productData.map(({product,data})=>(
        <div key={product.id} style={{ ...glassStyle(14), padding:"16px 20px", marginBottom:10 }}>
          <TrendChart data={data} title={product.internal_name} />
        </div>
      ))}
    </div>
  );
}
