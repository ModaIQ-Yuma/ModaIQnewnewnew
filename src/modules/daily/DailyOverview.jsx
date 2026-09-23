// modules/daily/DailyOverview.jsx
import { useMemo, useState } from "react";
import { useDaily } from "../../hooks/useDaily.js";
import { glassStyle, T } from "../../constants/tokens.js";
import { COLORS, ds } from "./dailyStyles.js";
import InviteRankBar from "./InviteRankBar.jsx";

import { todayPST } from "../../lib/utils.js";
const today = todayPST;

export default function DailyOverview({ storeId, products }) {
  const [date, setDate] = useState(today());
  const { shipments, videos, invites, loading, error } = useDaily(storeId, date, date);

  const productRows = useMemo(() => {
    const shipMap  = Object.fromEntries(shipments.map((r) => [r.product_id, r.count]));
    const videoMap = Object.fromEntries(videos.map((r) => [r.product_id, r.count]));
    return products
      .map((p) => ({ ...p, ships: shipMap[p.id] || 0, vids: videoMap[p.id] || 0 }))
      .filter((p) => p.ships > 0 || p.vids > 0);
  }, [shipments, videos, products]);

  const totalShips   = shipments.reduce((s, r) => s + r.count, 0);
  const totalVideos  = videos.reduce((s, r) => s + r.count, 0);
  const totalInvites = invites.reduce((s, r) => s + r.count, 0);
  const maxShipVid   = Math.max(...productRows.map((r) => Math.max(r.ships, r.vids)), 1);

  return (
    <div>
      <div style={ds.toolbar}>
        <span style={ds.label}>选择日期</span>
        <input type="date" style={ds.dateInput} value={date} onChange={(e) => setDate(e.target.value)} />
        {!loading && (
          <span style={ds.summary}>
            寄样 <span style={ds.accent(COLORS.ship)}>{totalShips}</span> 件 ·
            视频 <span style={ds.accent(COLORS.video)}>{totalVideos}</span> 条 ·
            拉新 <span style={ds.accent(COLORS.invite)}>{totalInvites}</span> 人次
          </span>
        )}
      </div>

      {loading && <div style={ds.center}>加载中…</div>}
      {error   && <div style={ds.center}>错误：{error}</div>}

      {!loading && !error && (
        <>
          <div style={{ ...glassStyle(14), padding: "20px 24px", marginBottom: 16 }}>
            {productRows.length === 0
              ? <div style={{ textAlign: "center", color: T.hint }}>当日暂无寄样或视频数据</div>
              : <BarChart rows={productRows} maxVal={maxShipVid} />
            }
          </div>
          <div style={{ ...glassStyle(14), padding: "20px 24px" }}>
            <InviteRankBar invites={invites} title="助理拉新排行" />
          </div>
        </>
      )}
    </div>
  );
}

function BarChart({ rows, maxVal }) {
  const [tooltip, setTooltip] = useState(null);
  const H = 220, PAD_T = 20, PAD_B = 60, BAR_W = 16, GAP = 6, GROUP_GAP = 24;
  const chartH = H - PAD_T - PAD_B;
  const groupW = BAR_W * 2 + GAP + GROUP_GAP;
  const W = rows.length * groupW + GROUP_GAP;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 12, color: T.muted }}>
        <span><span style={{ color: COLORS.ship, fontWeight: 700 }}>■</span> 寄样数</span>
        <span><span style={{ color: COLORS.video, fontWeight: 700 }}>■</span> 视频数</span>
      </div>
      <svg width={W} height={H} style={{ display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={0} x2={W} y1={PAD_T + chartH * (1 - t)} y2={PAD_T + chartH * (1 - t)}
            stroke="rgba(100,140,220,0.15)" strokeDasharray="4 3" />
        ))}
        {rows.map((p, i) => {
          const x = i * groupW + GROUP_GAP / 2;
          const shipH = (p.ships / maxVal) * chartH;
          const vidH  = (p.vids  / maxVal) * chartH;
          return (
            <g key={p.id} style={{ cursor: "pointer" }}
              onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, name: p.internal_name, ships: p.ships, vids: p.vids })}
              onMouseLeave={() => setTooltip(null)}>
              <rect x={x} y={PAD_T + chartH - shipH} width={BAR_W} height={shipH} rx={3} fill={COLORS.ship} opacity={0.9} />
              <rect x={x + BAR_W + GAP} y={PAD_T + chartH - vidH} width={BAR_W} height={vidH} rx={3} fill={COLORS.video} opacity={0.9} />
              <text x={x + BAR_W} y={H - 8} textAnchor="middle" fontSize={10} fill={T.muted} transform={`rotate(-35, ${x + BAR_W}, ${H - 8})`}>{p.internal_name}</text>
            </g>
          );
        })}
      </svg>
      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 12, top: tooltip.y - 10, zIndex: 9999,
          background: "rgba(10,22,40,0.92)", color: "#fff", borderRadius: 8,
          padding: "8px 12px", fontSize: 12, pointerEvents: "none", lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{tooltip.name}</div>
          <div><span style={{ color: COLORS.ship }}>■</span> 寄样：{tooltip.ships}</div>
          <div><span style={{ color: COLORS.video }}>■</span> 视频：{tooltip.vids}</div>
        </div>
      )}
    </div>
  );
}
