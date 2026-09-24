// modules/tasks/CycleGoals.jsx — 本周期目标（适配新版 Supabase）
import { useState, useMemo } from 'react';
import { T, glassStyle, FONT } from '../../constants/tokens.js';
import { PRIORITIES, PRIORITY_COLORS } from './constants.js';
import { currentCycleStart, cycleEnd, prevCycleStart, nextCycleStart, timePct, daysRemaining, formatDate } from './utils.js';
import { upsertShippingGoal, deleteShippingGoal, saveGoalAllocations } from '../../lib/supabase/taskData.js';
import GoalCard from './GoalCard.jsx';
import { GoalForm, AllocModal } from './GoalModals.jsx';
import { byProductOrder } from '../../lib/products/productOrder.js';

const PRIORITY_EMOJI = { 测款最优:'🟣', 一级:'🔴', 二级:'🟠', 三级:'🔵', 不动:'⛔' };
const navBtn = { fontSize:FONT.lg2, fontWeight:600, padding:'7px 14px', borderRadius:12, border:`1.5px solid ${T.border}`, background:'rgba(255,255,255,0.4)', color:T.muted, cursor:'pointer', fontFamily:'inherit' };

export default function CycleGoals({ storeId, products=[], shippingGoals=[], ganttStrategies=[], collabs=[], staff=[], canEdit, onReload }) {
  const now = new Date();
  const [cycleStart, setCycleStart] = useState(() => currentCycleStart(now));
  const [editing, setEditing] = useState(null);       // null | 'new' | goal
  const [allocating, setAllocating] = useState(null); // goal
  const cEnd = cycleEnd(cycleStart);

  const goals = useMemo(() => shippingGoals.filter(g => g.cycle_start === cycleStart), [shippingGoals, cycleStart]);

  // 实际已寄数：按 product_id + cycle 从 collaborations 计算
  const inCycle = (c, goal) => c.product_id === goal.product_id && c.ship_date >= cycleStart && c.ship_date <= cEnd;
  const doneQty = (goal) => collabs.filter(c => inCycle(c, goal)).length;
  const doneByStaff = (goal, staffId) => collabs.filter(c => inCycle(c, goal) && c.staff_id === staffId).length;

  const grouped = useMemo(() => {
    const map = {};
    PRIORITIES.forEach(p => { map[p] = []; });
    goals.forEach(g => { (map[g.priority] || (map['三级'] = [])) && map[g.priority]?.push(g); });
    const byProduct = byProductOrder(products);   // 组内按产品状态排
    return PRIORITIES.map(p => ({ priority: p, items: (map[p] || []).sort(byProduct) })).filter(g => g.items.length > 0);
  }, [goals, products]);

  // 只写 shipping_goals 自己的列（编辑时不能把 products / goal_allocations 等关联数据带进去）
  async function saveForm(fields) {
    await upsertShippingGoal(storeId, { ...fields, id: editing === 'new' ? undefined : editing.id, cycle_start: cycleStart });
    setEditing(null); onReload?.();
  }
  async function saveAlloc(alloc) { await saveGoalAllocations(allocating.id, alloc); setAllocating(null); onReload?.(); }
  async function del(id) { if (!window.confirm('删除该目标？')) return; await deleteShippingGoal(id); onReload?.(); }

  const tp = timePct(cycleStart, cEnd);
  const daysLeft = daysRemaining(cEnd);

  const summary = useMemo(() => {
    if (!goals.length) return null;
    const totalTarget = goals.reduce((s, g) => s + (Number(g.target_qty) || 0), 0);
    const totalDone = goals.reduce((s, g) => s + doneQty(g), 0);
    const totalPct = totalTarget > 0 ? totalDone / totalTarget : 0;
    const statusColor = totalPct > tp + 0.1 ? T.success : totalPct < tp - 0.1 ? T.danger : T.accent;
    return { totalTarget, totalDone, totalPct, statusColor };
  }, [goals, tp, collabs, cEnd]);


  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22, flexWrap:'wrap' }}>
        <button onClick={() => setCycleStart(prevCycleStart(cycleStart))} style={navBtn}>‹ 上周期</button>
        <div style={{ ...glassStyle(12), padding:'8px 18px', fontSize:FONT.xl2, fontWeight:700, color:T.text }}>
          {cycleStart} ~ {cEnd}
          <span style={{ fontSize:FONT.sm2, color:T.hint, marginLeft:10 }}>剩 {daysLeft} 天</span>
        </div>
        <button onClick={() => setCycleStart(nextCycleStart(cycleStart))} style={navBtn}>下周期 ›</button>
        <div style={{ flex:1 }} />
        {canEdit && <button onClick={() => setEditing('new')} style={{ ...navBtn, border:`1.5px solid ${T.accent}`, color:T.accent }}>+ 新增目标</button>}
      </div>

      {/* 时间进度条 */}
      <div style={{ marginBottom:22 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:FONT.sm2, color:T.hint, marginBottom:5 }}>
          <span>周期进度 {Math.round(tp * 100)}%</span>
          <span>{formatDate(cycleStart)} → {formatDate(cEnd)}</span>
        </div>
        <div style={{ height:6, borderRadius:6, background:`${T.accent}20`, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${Math.min(100, tp * 100)}%`, background:T.accent, borderRadius:6 }} />
        </div>
      </div>

      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:24 }}>
          {[
            { label:'总目标', value:`${summary.totalTarget} 件`, sub:`${goals.length} 款产品` },
            { label:'已完成', value:`${summary.totalDone} 件`, sub:`完成率 ${Math.round(summary.totalPct * 100)}%`, color:summary.statusColor },
            { label:'剩余', value:`${Math.max(0, summary.totalTarget - summary.totalDone)} 件`, sub:`${daysLeft} 天内完成` },
            { label:'日均需寄', value:daysLeft > 0 ? `${Math.ceil(Math.max(0, summary.totalTarget - summary.totalDone) / daysLeft)} 件/天` : '—', sub:'按剩余天数均摊' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{ background:'rgba(255,255,255,0.55)', border:`1px solid ${T.border}`, borderRadius:12, padding:'12px 16px' }}>
              <div style={{ fontSize:FONT.xs, fontWeight:600, color:T.muted, marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:color||T.text }}>{value}</div>
              <div style={{ fontSize:FONT.xs, color:T.hint, marginTop:3 }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {goals.length === 0
        ? <div style={{ ...glassStyle(16, true), padding:'48px 24px', textAlign:'center', color:T.hint }}>本周期暂无寄样目标。{canEdit && '点击「+ 新增目标」创建。'}</div>
        : grouped.map(({ priority, items }) => (
          <div key={priority} style={{ marginBottom:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <span style={{ fontSize:16 }}>{PRIORITY_EMOJI[priority]}</span>
              <span style={{ fontSize:FONT.xl2, fontWeight:800, color:PRIORITY_COLORS[priority]||T.text }}>{priority}</span>
              <span style={{ fontSize:FONT.sm2, color:T.hint }}>({items.length} 款)</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:14 }}>
              {items.map(g => (
                <GoalCard key={g.id} goal={g} product={products.find(p => p.id === g.product_id)} done={doneQty(g)} tp={tp}
                  staff={staff} doneByStaff={(sid) => doneByStaff(g, sid)} canEdit={canEdit}
                  onEdit={() => setEditing(g)} onDelete={() => del(g.id)} onAllocate={() => setAllocating(g)} />
              ))}
            </div>
          </div>
        ))
      }

      {editing && <GoalForm initial={editing === 'new' ? null : editing} products={products} onSave={saveForm} onClose={() => setEditing(null)} />}
      {allocating && <AllocModal goal={allocating} productName={products.find(p => p.id === allocating.product_id)?.internal_name}
        staff={staff} doneOf={(sid) => doneByStaff(allocating, sid)} onSave={saveAlloc} onClose={() => setAllocating(null)} />}
    </div>
  );
}
