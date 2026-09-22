// modules/tasks/PerformanceModule.jsx
import { useState, useMemo } from 'react';
import { T, glassStyle, FONT } from '../../constants/tokens.js';
import { currentCycleStart, cycleEnd, prevCycleStart, nextCycleStart } from './utils.js';
import { videoRange } from '../../lib/utils.js';
import PerfTable from './PerfTable.jsx';

const navBtn = { fontSize:FONT.lg2, fontWeight:600, padding:'7px 14px', borderRadius:12, border:`1.5px solid ${T.border}`, background:'rgba(255,255,255,0.4)', color:T.muted, cursor:'pointer', fontFamily:'inherit' };

function calcMetrics({ collabs, videos, creators, shippingGoals, products, cycleStart, cEnd, staffId }) {
  const inShip  = (d) => d && d >= cycleStart && d <= cEnd;
  const vr      = videoRange(cEnd.slice(0, 7));
  const inVideo = (d) => d && d >= vr.from && d <= vr.to;

  const goalsInCycle = shippingGoals.filter(g => g.cycle_start === cycleStart);
  const newProductIds = new Set((products || []).filter(p => p.is_new === true).map(p => p.id));
  const oldProductIds = new Set((products || []).filter(p => p.is_new === false).map(p => p.id));

  // creator_id → official_grade
  const gradeMap = Object.fromEntries((creators || []).map(c => [c.id, c.official_grade || '']));
  // collaboration_id → creator_id（从 collabs 建立）
  const collabCreatorMap = Object.fromEntries(collabs.map(c => [c.id, c.creator_id]));

  const scopedCollabs = staffId ? collabs.filter(c => c.staff_id === staffId) : collabs;
  const shipInCycle   = scopedCollabs.filter(c => inShip(c.ship_date));

  // a：实际视频数 ÷ 目标寄样数（作为预估视频基准）
  const targetQtySum = goalsInCycle.reduce((s, g) => {
    if (!staffId) return s + (Number(g.target_qty) || 0);
    // 如果有分配数就用分配数，否则忽略
    return s + 0; // goal_allocations 未在此加载，暂用全店总数
  }, 0);
  const actualVideos = (() => {
    if (!staffId) {
      return videos.filter(v => inVideo(v.published_at?.slice(0, 10))).length;
    }
    const myCollabIds = new Set(scopedCollabs.map(c => c.id));
    return videos.filter(v => inVideo(v.published_at?.slice(0, 10)) && myCollabIds.has(v.collaboration_id)).length;
  })();
  const estimatedVideos = staffId ? 0 : targetQtySum;
  const a = estimatedVideos > 0 ? actualVideos / estimatedVideos : null;

  // b：老品达人出单率
  const oldCollabs        = shipInCycle.filter(c => oldProductIds.has(c.product_id));
  const oldCollabIds      = new Set(oldCollabs.map(c => c.id));
  const oldWithSales      = new Set(videos.filter(v => oldCollabIds.has(v.collaboration_id) && (v.orders||0) > 0).map(v => v.collaboration_id));
  const b = oldCollabs.length > 0 ? oldWithSales.size / oldCollabs.length : null;

  // c：视频出单率（视频自然月）
  const myCollabIds2 = new Set(scopedCollabs.map(c => c.id));
  const scopedVids   = videos.filter(v =>
    inVideo(v.published_at?.slice(0, 10)) &&
    (staffId ? myCollabIds2.has(v.collaboration_id) : true)
  );
  const saleVids = scopedVids.filter(v => (v.orders||0) > 0);
  const c = scopedVids.length > 0 ? saleVids.length / scopedVids.length : null;

  // d：新品寄样达成率
  const newGoals  = goalsInCycle.filter(g => newProductIds.has(g.product_id));
  const newTarget = newGoals.reduce((s, g) => s + (Number(g.target_qty) || 0), 0);
  const newActual = shipInCycle.filter(c => newProductIds.has(c.product_id)).length;
  const d = newTarget > 0 ? newActual / newTarget : null;

  // e：Lv1 达人占比（寄样账期内，通过 collaboration → creator_id → official_grade）
  const shipTotal = shipInCycle.length;
  const lv1Count  = shipInCycle.filter(col => gradeMap[col.creator_id] === 'Lv1').length;
  const e = shipTotal > 0 ? lv1Count / shipTotal : null;

  return {
    a, b, c, d, e,
    estimatedVideos, actualVideos,
    newTarget, newActual,
    shipTotal, lv1Count,
    oldInfluencerTotal: oldCollabs.length,
    oldWithSalesTotal:  oldWithSales.size,
    totalVids: scopedVids.length,
    saleVids:  saleVids.length,
  };
}

export default function PerformanceModule({ storeId, collabs=[], videos=[], creators=[], shippingGoals=[], products=[], staff=[], isAdmin, userId }) {
  const now = new Date();
  const [cycleStart,      setCycleStart]      = useState(() => currentCycleStart(now));
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const cEnd       = cycleEnd(cycleStart);
  const viewStaffId = isAdmin ? selectedStaffId : userId;
  const metrics    = useMemo(() =>
    calcMetrics({ collabs, videos, creators, shippingGoals, products, cycleStart, cEnd, staffId: viewStaffId }),
    [collabs, videos, creators, shippingGoals, products, cycleStart, cEnd, viewStaffId]
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
            {staff.map(s => (
              <button key={s.id} onClick={() => setSelectedStaffId(s.id)} style={{ ...navBtn, border:`1.5px solid ${viewStaffId===s.id ? T.accent : T.border}`, color:viewStaffId===s.id ? T.accent : T.muted, fontWeight:viewStaffId===s.id ? 700 : 600 }}>{s.name}</button>
            ))}
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
