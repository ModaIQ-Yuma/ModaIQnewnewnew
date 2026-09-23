// modules/tasks/CycleGoals.jsx — 本周期目标（适配新版 Supabase）
import { useState, useMemo } from 'react';
import { T, glassStyle, FONT } from '../../constants/tokens.js';
import { PRIORITIES, PRIORITY_COLORS, STRATEGY_COLORS, STRATEGY_SUGGESTED_GOAL } from './constants.js';
import { currentCycleStart, cycleEnd, prevCycleStart, nextCycleStart, timePct, daysRemaining, formatDate, uid } from './utils.js';
import { upsertShippingGoal, deleteShippingGoal } from '../../lib/supabase/taskData.js';
import { byProductOrder } from '../../lib/products/productOrder.js';

const PRIORITY_EMOJI = { 测款最优:'🟣', 一级:'🔴', 二级:'🟠', 三级:'🔵', 不动:'⛔' };
const navBtn = { fontSize:FONT.lg2, fontWeight:600, padding:'7px 14px', borderRadius:12, border:`1.5px solid ${T.border}`, background:'rgba(255,255,255,0.4)', color:T.muted, cursor:'pointer', fontFamily:'inherit' };

export default function CycleGoals({ storeId, products=[], shippingGoals=[], ganttStrategies=[], collabs=[], staff=[], isAdmin, onReload }) {
  const now = new Date();
  const [cycleStart, setCycleStart] = useState(() => currentCycleStart(now));
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const cEnd = cycleEnd(cycleStart);

  const goals = useMemo(() => shippingGoals.filter(g => g.cycle_start === cycleStart), [shippingGoals, cycleStart]);

  // 实际已寄数：按 product_id + cycle 从 collaborations 计算
  const doneQty = (goal) => collabs.filter(c => c.product_id === goal.product_id && c.ship_date >= cycleStart && c.ship_date <= cEnd).length;

  const grouped = useMemo(() => {
    const map = {};
    PRIORITIES.forEach(p => { map[p] = []; });
    goals.forEach(g => { (map[g.priority] || (map['三级'] = [])) && map[g.priority]?.push(g); });
    const byProduct = byProductOrder(products);   // 组内按产品状态排
    return PRIORITIES.map(p => ({ priority: p, items: (map[p] || []).sort(byProduct) })).filter(g => g.items.length > 0);
  }, [goals, products]);

  function openNew() { setForm({ product_id:'', target_qty:50, priority:'二级', strategy:'精选' }); setEditing('new'); }
  function openEdit(g) { setForm({ ...g }); setEditing(g.id); }

  async function saveForm() {
    const rec = { ...form, id: editing === 'new' ? undefined : editing, cycle_start: cycleStart, target_qty: Number(form.target_qty) || 0 };
    await upsertShippingGoal(storeId, rec);
    setEditing(null); onReload?.();
  }
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

  const inp = { width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:10, border:`1.5px solid ${T.border}`, background:'rgba(255,255,255,0.6)', color:T.text, fontSize:FONT.lg2, fontFamily:'inherit' };

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
        {isAdmin && <button onClick={openNew} style={{ ...navBtn, border:`1.5px solid ${T.accent}`, color:T.accent }}>+ 新增目标</button>}
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
        ? <div style={{ ...glassStyle(16, true), padding:'48px 24px', textAlign:'center', color:T.hint }}>本周期暂无寄样目标。{isAdmin && '点击「+ 新增目标」创建。'}</div>
        : grouped.map(({ priority, items }) => (
          <div key={priority} style={{ marginBottom:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <span style={{ fontSize:16 }}>{PRIORITY_EMOJI[priority]}</span>
              <span style={{ fontSize:FONT.xl2, fontWeight:800, color:PRIORITY_COLORS[priority]||T.text }}>{priority}</span>
              <span style={{ fontSize:FONT.sm2, color:T.hint }}>({items.length} 款)</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:14 }}>
              {items.map(g => {
                const done = doneQty(g); const pct = g.target_qty > 0 ? Math.min(1, done / g.target_qty) : 0;
                const ahead = pct > tp + 0.1; const behind = pct < tp - 0.1;
                const sc = ahead ? T.success : behind ? T.danger : T.accent;
                const product = products.find(p => p.id === g.product_id);
                return (
                  <div key={g.id} style={{ ...glassStyle(16, true), padding:'16px 18px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:FONT.xl2, color:T.text }}>{product?.internal_name || g.product_id}</div>
                        <div style={{ fontSize:FONT.sm, color:T.hint, marginTop:2 }}>{product?.product_title || ''}</div>
                      </div>
                      {isAdmin && (
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={() => openEdit(g)} style={{ border:'none', background:'none', color:T.accent, cursor:'pointer', fontSize:FONT.sm2, padding:0 }}>编辑</button>
                          <button onClick={() => del(g.id)} style={{ border:'none', background:'none', color:T.danger, cursor:'pointer', fontSize:FONT.sm2, padding:0 }}>删除</button>
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:FONT.md2, marginBottom:5 }}>
                      <span style={{ color:sc, fontWeight:700 }}>{done} / {g.target_qty} 件</span>
                      <span style={{ color:T.hint }}>{Math.round(pct * 100)}%</span>
                    </div>
                    <div style={{ height:8, borderRadius:8, background:`${sc}20`, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(100, pct * 100)}%`, background:sc, borderRadius:8, transition:'width .4s' }} />
                    </div>
                    <div style={{ marginTop:4, fontSize:FONT.xs, color:T.hint }}>
                      {ahead ? '✅ 进度超前' : behind ? '⚠️ 进度落后' : '📊 进度正常'} · 时间进度 {Math.round(tp * 100)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      }

      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(10,22,40,0.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ ...glassStyle(20, true), padding:'26px 28px', width:'100%', maxWidth:440 }}>
            <div style={{ fontSize:FONT.x4l, fontWeight:800, color:T.text, marginBottom:20 }}>{editing === 'new' ? '新增目标' : '编辑目标'}</div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:FONT.md2, fontWeight:600, color:T.muted, marginBottom:6 }}>产品 *</div>
              <select style={{ ...inp, cursor:'pointer' }} value={form.product_id||''} onChange={e => setForm(f => ({ ...f, product_id:e.target.value }))}>
                <option value="">选择产品…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.internal_name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:FONT.md2, fontWeight:600, color:T.muted, marginBottom:6 }}>目标寄样数</div>
              <input type="number" style={inp} value={form.target_qty||''} onChange={e => setForm(f => ({ ...f, target_qty:e.target.value }))} />
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:FONT.md2, fontWeight:600, color:T.muted, marginBottom:6 }}>优先级</div>
              <select style={{ ...inp, cursor:'pointer' }} value={form.priority||'二级'} onChange={e => setForm(f => ({ ...f, priority:e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button onClick={() => setEditing(null)} style={{ ...navBtn }}>取消</button>
              <button onClick={saveForm} disabled={!form.product_id} style={{ padding:'9px 20px', borderRadius:10, border:'none', cursor:'pointer', background:T.grad, color:'#fff', fontWeight:700, fontSize:FONT.lg2, fontFamily:'inherit' }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
