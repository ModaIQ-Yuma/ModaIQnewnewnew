// modules/daily/DailyTrend.jsx
import { useMemo, useState } from "react";
import { useDaily } from "../../hooks/useDaily.js";
import { glassStyle, T } from "../../constants/tokens.js";
import { COLORS, ds } from "./dailyStyles.js";
import InviteRankBar from "./InviteRankBar.jsx";

const fmt = (d) => d?.slice(5);
const defaultFrom = () => { const d = new Date(); d.setDate(d.getDate() - 13); return d.toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" }); };
const defaultTo = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" });

export default function DailyTrend({ storeId, products }) {
  const [dateFrom, setDateFrom] = useState(defaultFrom());
  const [dateTo,   setDateTo]   = useState(defaultTo());
  const { shipments, videos, invites, loading, error } = useDaily(storeId, dateFrom, dateTo);

  const dates = useMemo(() => {
    const list = [], cur = new Date(dateFrom + "T12:00:00"), end = new Date(dateTo + "T12:00:00");
    while (cur <= end) { list.push(cur.toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" })); cur.setDate(cur.getDate() + 1); }
    return list;
  }, [dateFrom, dateTo]);

  const productData = useMemo(() => {
    const shipMap = {}, vidMap = {};
    for (const r of shipments) { if (!shipMap[r.product_id]) shipMap[r.product_id] = {}; shipMap[r.product_id][r.date] = r.count; }
    for (const r of videos)    { if (!vidMap[r.product_id])  vidMap[r.product_id]  = {}; vidMap[r.product_id][r.date]  = r.count; }
    const pids = new Set([...Object.keys(shipMap), ...Object.keys(vidMap)]);
    return Array.from(pids).map((pid) => {
      const product    = products.find((p) => p.id === pid);
      const totalShips = dates.reduce((s, d) => s + (shipMap[pid]?.[d] || 0), 0);
      const totalVids  = dates.reduce((s, d) => s + (vidMap[pid]?.[d]  || 0), 0);
      return { pid, product, totalShips, totalVids, shipMap: shipMap[pid] || {}, vidMap: vidMap[pid] || {} };
    }).sort((a, b) => (b.totalShips + b.totalVids) - (a.totalShips + a.totalVids));
  }, [shipments, videos, products, dates]);

  const totalInvites = invites.reduce((s, r) => s + r.count, 0);

  return (
    <div>
      <div style={ds.toolbar}>
        <span style={ds.label}>日期范围</span>
        <input type="date" style={ds.dateInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span style={{ color: T.hint }}>—</span>
        <input type="date" style={ds.dateInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        {!loading && (
          <span style={ds.summary}>
            {productData.length} 个产品有数据 · 拉新 <span style={ds.accent(COLORS.invite)}>{totalInvites}</span> 人次
          </span>
        )}
      </div>

      {loading && <div style={ds.center}>加载中…</div>}
      {error   && <div style={ds.center}>错误：{error}</div>}

      {!loading && !error && (
        <>
          <div style={ds.cardGrid}>
            {productData.length === 0
              ? <div style={{ ...glassStyle(14), padding: 32, textAlign: "center", color: T.hint }}>该时段暂无数据</div>
              : productData.map(({ pid, product, totalShips, totalVids, shipMap, vidMap }) => (
                <div key={pid} style={{ ...glassStyle(14), padding: "16px 20px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>
                    {product?.internal_name ?? pid}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>
                    寄样 <span style={{ color: COLORS.ship, fontWeight: 700 }}>{totalShips}</span> 件 ·
                    视频 <span style={{ color: COLORS.video, fontWeight: 700 }}>{totalVids}</span> 条
                  </div>
                  <LineChart dates={dates} shipMap={shipMap} vidMap={vidMap} />
                </div>
              ))
            }
          </div>
          {invites.length > 0 && (
            <div style={{ ...glassStyle(14), padding: "20px 24px", marginTop: 16 }}>
              <InviteRankBar invites={invites}
                title={`助理拉新排行（${fmt(dateFrom)} ~ ${fmt(dateTo)}）`} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LineChart({ dates, shipMap, vidMap }) {
  const [tooltip, setTooltip] = useState(null);
  const H = 120, PAD_T = 10, PAD_B = 24, PAD_L = 28, PAD_R = 8;
  const chartH = H - PAD_T - PAD_B;
  const N = dates.length;
  const ships = dates.map((d) => shipMap[d] || 0);
  const vids  = dates.map((d) => vidMap[d]  || 0);
  const maxVal = Math.max(...ships, ...vids, 1);
  const xPos = (i) => PAD_L + (i / Math.max(N - 1, 1)) * (400 - PAD_L - PAD_R);
  const yPos = (v) => PAD_T + chartH - (v / maxVal) * chartH;
  const pts  = (arr) => arr.map((v, i) => `${xPos(i)},${yPos(v)}`).join(" ");

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.max(0, Math.min(N - 1, Math.round(((e.clientX - rect.left - PAD_L) / (400 - PAD_L - PAD_R)) * (N - 1))));
    setTooltip({ i, x: e.clientX, y: e.clientY });
  };

  return (
    <div style={{ position: "relative" }} onMouseLeave={() => setTooltip(null)}>
      <svg width="100%" viewBox={`0 0 400 ${H}`} style={{ display: "block" }} onMouseMove={handleMouseMove}>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={PAD_L} x2={400 - PAD_R} y1={PAD_T + chartH * (1 - t)} y2={PAD_T + chartH * (1 - t)}
            stroke="rgba(100,140,220,0.15)" strokeDasharray="4 3" />
        ))}
        <polyline points={pts(ships)} fill="none" stroke={COLORS.ship} strokeWidth={2} strokeLinejoin="round" />
        <polyline points={pts(vids)}  fill="none" stroke={COLORS.video} strokeWidth={2} strokeLinejoin="round" />
        {ships.map((v, i) => <circle key={i} cx={xPos(i)} cy={yPos(v)} r={3} fill={COLORS.ship} />)}
        {vids.map((v, i)  => <circle key={i} cx={xPos(i)} cy={yPos(v)} r={3} fill={COLORS.video} />)}
        {dates.map((d, i) => (N <= 7 || i % Math.ceil(N / 7) === 0 || i === N - 1)
          ? <text key={d} x={xPos(i)} y={H - 4} textAnchor="middle" fontSize={9} fill={T.hint}>{fmt(d)}</text>
          : null)}
        {tooltip && <line x1={xPos(tooltip.i)} x2={xPos(tooltip.i)} y1={PAD_T} y2={PAD_T + chartH}
          stroke="rgba(100,140,220,0.4)" strokeWidth={1} strokeDasharray="3 2" />}
      </svg>
      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 12, top: tooltip.y - 10, zIndex: 9999,
          background: "rgba(10,22,40,0.92)", color: "#fff", borderRadius: 8,
          padding: "8px 12px", fontSize: 12, pointerEvents: "none", lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{dates[tooltip.i]}</div>
          <div><span style={{ color: COLORS.ship }}>●</span> 寄样：{ships[tooltip.i]}</div>
          <div><span style={{ color: COLORS.video }}>●</span> 视频：{vids[tooltip.i]}</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 12, fontSize: 11, color: T.muted, marginTop: 4 }}>
        <span><span style={{ color: COLORS.ship }}>—</span> 寄样数</span>
        <span><span style={{ color: COLORS.video }}>—</span> 视频数</span>
      </div>
    </div>
  );
}
