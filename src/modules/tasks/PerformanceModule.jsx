// modules/tasks/PerformanceModule.jsx
import { useState, useMemo } from 'react';
import { T, glassStyle, FONT } from '../../constants/tokens.js';
import { currentCycleStart, cycleEnd, prevCycleStart, nextCycleStart } from './utils.js';
import { calcPerfMetrics } from '../../lib/perf/perfCalc.js';
import PerfTable from './PerfTable.jsx';
import { SectionIntro } from '../../components/layout/SubNav.jsx';

const navBtn = { fontSize:FONT.lg2, fontWeight:600, padding:'7px 14px', borderRadius:12, border:`1.5px solid ${T.border}`, background:'rgba(255,255,255,0.4)', color:T.muted, cursor:'pointer', fontFamily:'inherit' };

/** 绩效评估（独立导航 + 任务中心子页共用，都传 ctx） */
export default function PerformanceModule({ ctx, showIntro = true }) {
  const { collabs, videos, products, staff, myStaffId } = ctx;
  const shippingGoals = ctx.tasksApi?.goals ?? [];
  const viewAll = ctx.can("perf.viewAll");        // 管理员：看全店 / 任意助理；成员：只看自己
  const now = new Date();
  const [cycleStart,      setCycleStart]      = useState(() => currentCycleStart(now));
  const [selectedStaffId, setSelectedStaffId] = useState(null);

  const cEnd        = cycleEnd(cycleStart);
  const viewStaffId = viewAll ? selectedStaffId : myStaffId;

  const metrics = useMemo(() =>
    calcPerfMetrics({ collabs, videos, shippingGoals, products, cycleStart, staffId: viewStaffId }),
    [collabs, videos, shippingGoals, products, cycleStart, viewStaffId]
  );

  const viewerName = viewStaffId == null
    ? '全店（Admin）'
    : (staff.find(s => s.id === viewStaffId)?.name || viewStaffId);

  if (ctx.dataLoading) return <div style={{ padding:48, textAlign:'center', color:T.hint }}>加载中…</div>;
  if (!viewAll && !myStaffId) return (
    <div style={{ ...glassStyle(16, true), padding:'40px 24px', textAlign:'center', color:T.hint, lineHeight:1.8 }}>
      你的登录账号还没有和助理名册绑定，暂时看不到个人绩效。<br />请管理员在「人员管理 → 助理名册」里绑定，或用带绑定的邀请码重新加入。
    </div>
  );

  return (
    <div>
      {showIntro && <SectionIntro style={{ marginBottom:14 }}>按账期（15 日 ~ 次月 14 日）计算绩效：寄样看账期内的寄样记录，视频和出单看账期结束月的自然月。管理员可切换查看全店或单个助理，助理只能看到自己。</SectionIntro>}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22, flexWrap:'wrap' }}>
        <button onClick={() => setCycleStart(prevCycleStart(cycleStart))} style={navBtn}>‹ 上周期</button>
        <div style={{ ...glassStyle(12), padding:'8px 18px', fontSize:FONT.xl2, fontWeight:700, color:T.text }}>
          {cycleStart} ~ {cEnd}
        </div>
        <button onClick={() => setCycleStart(nextCycleStart(cycleStart))} style={navBtn}>下周期 ›</button>
        <div style={{ flex:1 }} />
        {viewAll && (
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
