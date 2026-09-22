// modules/tasks/PerformanceModule.jsx — 绩效评估（适配新版 Supabase）
import { useState, useMemo } from 'react';
import { T, glassStyle, FONT } from '../../constants/tokens.js';
import { currentCycleStart, cycleEnd, prevCycleStart, nextCycleStart } from './utils.js';
import { videoRange } from '../../lib/utils.js';
import PerfTable from './PerfTable.jsx';

const navBtn = { fontSize:FONT.lg2, fontWeight:600, padding:'7px 14px', borderRadius:12, border:`1.5px solid ${T.border}`, background:'rgba(255,255,255,0.4)', color:T.muted, cursor:'pointer', fontFamily:'inherit' };

function calcMetrics({ collabs, videos, shippingGoals, products, cycleStart, cEnd, staffId }) {
  const inShip = (d) => d && d >= cycleStart && d <= cEnd;
  const vr = videoRange(cEnd.slice(0, 7));  // 视频自然月 = cycleEnd 所在月
  const inVideo = (d) => d && d >= vr.from && d <= vr.to;

  const goalsInCycle = shippingGoals.filter(g => g.cycle_start === cycleStart);
  const newProductIds = new Set((products || []).filter(p => p.is_new === true).map(p => p.id));
  const oldProductIds = new Set((products || []).filter(p => p.is_new === false).map(p => p.id));

  const scopedCollabs = staffId ? collabs.filter(c => c.staff_id === staffId) : collabs;
  const shipInCycle = scopedCollabs.filter(c => inShip(c.ship_date));

  // a：视频达成率（预估 vs 实际，暂返回 null 直到加入 estimated_videos 字段）
  const a = null;

  // b：老品达人转化率
  const oldCollabs = shipInCycle.filter(c => oldProductIds.has(c.product_id));
  const oldCollabIds = new Set(oldCollabs.map(c => c.id));
  const oldWithSales = new Set(videos.filter(v => oldCollabIds.has(v.collaboration_id) && (v.orders||0) > 0).map(v => v.collaboration_id));
  const b = oldCollabs.length > 0 ? oldWithSales.size / oldCollabs.length : null;

  // c：视频出单率
  const scopedColabIds = new Set(scopedCollabs.map(c => c.id));
  const scopedVids = videos.filter(v => inVideo(v.published_at?.slice(0,10)) && (staffId ? scopedColabIds.has(v.collaboration_id) : true));
  const saleVids = scopedVids.filter(v => (v.orders||0) > 0);
  const c = scopedVids.length > 0 ? saleVids.length / scopedVids.length : null;

  // d：新品寄样达成率
  const newGoals = goalsInCycle.filter(g => newProductIds.has(g.product_id));
  const newTarget = staffId
    ? newGoals.reduce((s, g) => s + (Number((g.staff_alloc||{})[staffId]) || 0), 0)
    : newGoals.reduce((s, g) => s + (Number(g.target_qty) || 0), 0);
  const newActual = shipInCycle.filter(c => newProductIds.has(c.product_id)).length;
  const d = newTarget > 0 ? newActual / newTarget : null;

  // e：Lv1 达人占比（从 creators 关联）
  const e = null; // 需要 creators join，暂返回 null

  return {
    a, b, c, d, e,
    estimatedVideos: 0, actualVideos: scopedVids.length,
    newTarget, newActual,
    shipTotal: shipInCycle.length,
    lv1Count: 0,
    oldInfluencerTotal: oldCollabs.length, oldWithSalesTotal: oldWithSales.size,
    totalVids: scopedVids.length, saleVids: saleVids.length,
  };
}

export default function PerformanceModule({ storeId, collabs=[], videos=[], shippingGoals=[], products=[], staff=[], isAdmin, userId }) {
  const now = new Date();
  const [cycleStart, setCycleStart] = useState(() => currentCycleStart(now));
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const cEnd = cycleEnd(cycleStart);
  const viewStaffId = isAdmin ? selectedStaffId : userId;
  const metrics = useMemo(() =>
    calcMetrics({ collabs, videos, shippingGoals, products, cycleStart, cEnd, staffId: viewStaffId }),
    [collabs, videos, shippingGoals, products, cycleStart, cEnd, viewStaffId]
  );
  const vr = videoRange(cEnd.slice(0, 7));
  const viewerName = viewStaffId == null ? '全店（Admin）' : (staff.find(s => s.id === viewStaffId)?.name || viewStaffId);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22, flexWrap:'wrap' }}>
        <button onClick={() => setCycleStart(prevCycleStart(cycleStart))} style={navBtn}>‹ 上周期</button>
        <div style={{ ...glassStyle(12), padding:'8px 18px', fontSize:FONT.xl2, fontWeight:700, color:T.text }}>{cycleStart} ~ {cEnd}</div>
        <button onClick={() => setCycleStart(nextCycleStart(cycleStart))} style={navBtn}>下周期 ›</button>
        <div style={{ flex:1 }} />
        {isAdmin && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button onClick={() => setSelectedStaffId(null)} style={{ ...navBtn, border:`1.5px solid ${viewStaffId==null ? T.accent : T.border}`, color:viewStaffId==null ? T.accent : T.muted, fontWeight:viewStaffId==null ? 700 : 600 }}>全店</button>
            {staff.map(s => <button key={s.id} onClick={() => setSelectedStaffId(s.id)} style={{ ...navBtn, border:`1.5px solid ${viewStaffId===s.id ? T.accent : T.border}`, color:viewStaffId===s.id ? T.accent : T.muted, fontWeight:viewStaffId===s.id ? 700 : 600 }}>{s.name}</button>)}
          </div>
        )}
      </div>
      <div style={{ fontSize:FONT.lg2, color:T.hint, marginBottom:16 }}>
        查看对象：<strong style={{ color:T.text }}>{viewerName}</strong>
        <span style={{ marginLeft:12 }}>寄样账期 {cycleStart} ~ {cEnd} · 视频自然月 {vr.from} ~ {vr.to}</span>
      </div>
      <PerfTable metrics={metrics} />
    </div>
  );
}
