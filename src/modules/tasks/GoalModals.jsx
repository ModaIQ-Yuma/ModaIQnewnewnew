// modules/tasks/GoalModals.jsx — 周期目标：新增/编辑弹窗 + 助理分配弹窗
import { useState } from 'react';
import { T, glassStyle, FONT } from '../../constants/tokens.js';
import { PRIORITIES } from './constants.js';

const overlay = { position:'fixed', inset:0, background:'rgba(10,22,40,0.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 };
const box = { ...glassStyle(20, true), padding:'26px 28px', width:'100%', maxWidth:440 };
const inp = { width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:10, border:`1.5px solid ${T.border}`, background:'rgba(255,255,255,0.6)', color:T.text, fontSize:FONT.body, fontFamily:'inherit' };
const lbl = { fontSize:FONT.note, fontWeight:600, color:T.muted, marginBottom:6 };
const btn = (primary) => ({ padding:'9px 20px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:FONT.body, fontFamily:'inherit',
  border: primary ? 'none' : `1.5px solid ${T.border}`, background: primary ? T.grad : 'rgba(255,255,255,0.4)', color: primary ? '#fff' : T.muted });

/** 新增/编辑目标：产品、寄样目标、预估视频产出（手填）、优先级 */
export function GoalForm({ initial, products, onSave, onClose }) {
  const [f, setF] = useState(() => ({ product_id:'', target_qty:50, estimated_videos:'', priority:'二级', ...initial }));
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const rate = Number(f.target_qty) > 0 && f.estimated_videos !== '' ? (Number(f.estimated_videos) / Number(f.target_qty)) : null;
  return (
    <div style={overlay}><div style={box}>
      <div style={{ fontSize:FONT.h2, fontWeight:800, color:T.text, marginBottom:20 }}>{initial?.id ? '编辑目标' : '新增目标'}</div>
      <div style={{ marginBottom:14 }}><div style={lbl}>产品 *</div>
        <select style={{ ...inp, cursor:'pointer' }} value={f.product_id} onChange={(e) => set('product_id', e.target.value)}>
          <option value="">选择产品…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.internal_name}</option>)}
        </select>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:6 }}>
        <div><div style={lbl}>寄样目标（件）</div><input type="number" style={inp} value={f.target_qty} onChange={(e) => set('target_qty', e.target.value)} /></div>
        <div><div style={lbl}>预估视频产出（条）</div><input type="number" style={inp} value={f.estimated_videos ?? ''} placeholder="如 20" onChange={(e) => set('estimated_videos', e.target.value)} /></div>
      </div>
      <div style={{ fontSize:FONT.note, color:T.hint, marginBottom:14 }}>{rate == null ? '预估视频用于绩效「视频产出达成率」，按助理分到的件数折算' : `相当于每寄 1 件预计出 ${rate.toFixed(2)} 条视频`}</div>
      <div style={{ marginBottom:14 }}><div style={lbl}>优先级</div>
        <select style={{ ...inp, cursor:'pointer' }} value={f.priority} onChange={(e) => set('priority', e.target.value)}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
        <button onClick={onClose} style={btn(false)}>取消</button>
        <button disabled={!f.product_id} onClick={() => onSave({ product_id: f.product_id, target_qty: Number(f.target_qty) || 0,
          estimated_videos: f.estimated_videos === '' || f.estimated_videos == null ? null : Number(f.estimated_videos), priority: f.priority })} style={btn(true)}>保存</button>
      </div>
    </div></div>
  );
}

/** 助理分配：把寄样目标拆给各助理，显示折算的预估视频 */
export function AllocModal({ goal, productName, staff, doneOf, onSave, onClose }) {
  const [alloc, setAlloc] = useState(() => Object.fromEntries(staff.map((s) => [s.id, (goal.goal_allocations || []).find((a) => a.staff_id === s.id)?.qty ?? ''])));
  const total = Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0);
  const perPiece = (Number(goal.estimated_videos) || 0) / (Number(goal.target_qty) || 1);
  return (
    <div style={overlay}><div style={box}>
      <div style={{ fontSize:FONT.h2, fontWeight:800, color:T.text, marginBottom:4 }}>✏️ 分配任务</div>
      <div style={{ fontSize:FONT.note, color:T.hint, marginBottom:18 }}>{productName} · 寄样目标 <b style={{ color:T.text }}>{goal.target_qty}</b> 件 · 预估视频 <b style={{ color:T.text }}>{goal.estimated_videos ?? '未填'}</b> 条</div>
      {staff.map((s) => (
        <div key={s.id} style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:FONT.body, marginBottom:5 }}>
            <b style={{ color:T.text }}>{s.name}</b>
            <span style={{ color:T.hint, fontSize:FONT.note }}>已寄 {doneOf(s.id)} 件 · 折算预估视频 {Math.round(perPiece * (Number(alloc[s.id]) || 0))} 条</span>
          </div>
          <input type="number" min="0" placeholder="0" value={alloc[s.id]} onChange={(e) => setAlloc((a) => ({ ...a, [s.id]: e.target.value }))} style={{ ...inp, textAlign:'right' }} />
        </div>
      ))}
      <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', borderRadius:12, background:'rgba(61,127,239,0.07)', margin:'8px 0 18px' }}>
        <span style={{ fontSize:FONT.body, color:T.muted }}>合计分配</span>
        <b style={{ fontSize:FONT.h3, color: total > goal.target_qty ? T.danger : T.accent }}>{total} / {goal.target_qty} 件{total > goal.target_qty ? '（超出目标）' : ''}</b>
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button onClick={onClose} style={btn(false)}>取消</button>
        <button onClick={() => onSave(alloc)} style={btn(true)}>保存分配</button>
      </div>
    </div></div>
  );
}
