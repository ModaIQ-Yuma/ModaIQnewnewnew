// modules/tasks/PerformanceModule.jsx
import { useState, useMemo } from 'react';
import { T, glassStyle, FONT } from '../../constants/tokens.js';
import { currentCycleStart, cycleEnd, prevCycleStart, nextCycleStart } from './utils.js';
import { calcPerfMetrics } from '../../lib/perf/perfCalc.js';
import PerfTable from './PerfTable.jsx';

const navBtn = { fontSize:FONT.lg2, fontWeight:600, padding:'7px 14px', borderRadius:12, border:`1.5px solid ${T.border}`, background:'rgba(255,255,255,0.4)', color:T.muted, cursor:'pointer', fontFamily:'inherit' };

export default function PerformanceModule({ storeId, collabs=[], videos=[], creators=[], shippingGoals=[], products=[], staff=[], isAdmin, userId }) {
  const now = new Date();
  const [cycleStart,      setCycleStart]      = useState(() => currentCycleStart(now));
  const [selectedStaffId, setSelectedStaffId] = useState(null);

  const cEnd        = cycleEnd(cycleStart);
  const viewStaffId = isAdmin ? selectedStaffId : userId;

  const metrics = useMemo(() =>
    calcPerfMetrics({ collabs, videos, creators, shippingGoals, products, cycleStart, staffId: viewStaffId }),
    [collabs, videos, creators, shippingGoals, products, cycleStart, viewStaffId]
  );

  const viewerName = viewStaffId == null
    ? '全店（Admin）'
    : (staff.find(s => s.id === viewStaffId)?.name || viewStaffId);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22, flexWrap:'wrap' }}>
        <button onClick={() => setCycleStart(prevCycleStart(cycleStart))} style={navBtn}>‹ 上周期</button>
        <div style={{ ...glassStyle(12), padding:'8px 18px', fontSize:FONT.xl2, fontWeight:700, color:T.text }}>
          {cycleStart} ~ {cEnd}
        </div>
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
        <span style={{ marginLeft:12 }}>寄样账期 {cycleStart} ~ {cEnd} · 视频自然月 {metrics.vFrom} ~ {metrics.vTo}</span>
      </div>

      <PerfTable metrics={metrics} />
    </div>
  );
}
