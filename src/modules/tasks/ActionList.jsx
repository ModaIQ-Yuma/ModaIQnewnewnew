// modules/tasks/ActionList.jsx — 行动清单（适配新版 Supabase action_tasks 表）
import { useState, useMemo } from 'react';
import { T, glassStyle, FONT } from '../../constants/tokens.js';
import { todayPST } from '../../lib/utils.js';
import { createTask, updateTask, deleteTask } from '../../lib/supabase/tasks.js';

const FILTERS = [['all','全部'],['open','待办'],['done','已完成'],['催发','📣 催发'],['复投','🔁 复投'],['激活','⚡ 激活']];

export default function ActionList({ storeId, tasks=[], products=[], staff=[], currentStaffId, isAdmin, onReload }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [filter, setFilter] = useState('all');

  const visible = useMemo(() => tasks.filter(t => {
    if (!isAdmin && t.staff_id && t.staff_id !== currentStaffId) return false;
    if (filter === 'open' && t.status !== 'open') return false;
    if (filter === 'done' && t.status !== 'done') return false;
    if (['催发','复投','激活'].includes(filter) && t.kind !== filter) return false;
    return true;
  }).sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
    return (a.due_date||'') < (b.due_date||'') ? -1 : 1;
  }), [tasks, filter, isAdmin, currentStaffId]);

  function openNew() { setForm({ title:'', kind:'手动', product_id:'', staff_id:'', due_date:'' }); setEditing('new'); }
  function openEdit(t) { setForm({ ...t }); setEditing(t.id); }

  async function save() {
    if (editing === 'new') {
      await createTask(storeId, { ...form, status:'open', is_auto:false });
    } else {
      await updateTask(editing, { title:form.title, kind:form.kind, product_id:form.product_id||null, staff_id:form.staff_id||null, due_date:form.due_date||null });
    }
    setEditing(null); onReload?.();
  }

  async function toggleDone(t) {
    await updateTask(t.id, { status: t.status === 'done' ? 'open' : 'done' });
    onReload?.();
  }

  async function del(id) {
    if (!window.confirm('删除此任务？')) return;
    await deleteTask(id); onReload?.();
  }

  const todo = visible.filter(t => t.status === 'open');
  const done = visible.filter(t => t.status === 'done');
  const today = todayPST();
  const inp = { width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:10, border:`1.5px solid ${T.border}`, background:'rgba(255,255,255,0.6)', color:T.text, fontSize:FONT.lg2, fontFamily:'inherit' };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {FILTERS.map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)} style={{ fontSize:FONT.lg2, padding:'6px 14px', borderRadius:12, border:`1.5px solid ${filter===f ? T.accent : T.border}`, background:filter===f ? T.accent : 'transparent', color:filter===f ? '#fff' : T.muted, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>{label}</button>
        ))}
        <div style={{ flex:1 }} />
        {isAdmin && <button onClick={openNew} style={{ padding:'7px 16px', borderRadius:10, border:'none', cursor:'pointer', background:T.grad, color:'#fff', fontWeight:700, fontSize:FONT.lg2, fontFamily:'inherit' }}>+ 新建任务</button>}
      </div>

      {todo.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:FONT.sm, fontWeight:800, color:T.muted, letterSpacing:'0.08em', marginBottom:10 }}>待办 ({todo.length})</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {todo.map(t => <TaskCard key={t.id} task={t} products={products} staff={staff} today={today} isAdmin={isAdmin} onToggle={toggleDone} onEdit={openEdit} onDelete={del} />)}
          </div>
        </div>
      )}
      {done.length > 0 && (
        <div>
          <div style={{ fontSize:FONT.sm, fontWeight:800, color:T.muted, letterSpacing:'0.08em', marginBottom:10 }}>已完成 ({done.length})</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {done.map(t => <TaskCard key={t.id} task={t} products={products} staff={staff} today={today} isAdmin={isAdmin} onToggle={toggleDone} onEdit={openEdit} onDelete={del} />)}
          </div>
        </div>
      )}
      {visible.length === 0 && <div style={{ ...glassStyle(16, true), padding:'48px 24px', textAlign:'center', color:T.hint }}>暂无任务{isAdmin ? '，点击「+ 新建任务」添加' : ''}</div>}

      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(10,22,40,0.55)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ ...glassStyle(20, true), padding:'26px 28px', width:'100%', maxWidth:480 }}>
            <div style={{ fontSize:FONT.x4l, fontWeight:800, color:T.text, marginBottom:20 }}>{editing === 'new' ? '新建任务' : '编辑任务'}</div>
            {[
              { label:'任务标题 *', el:<input style={inp} value={form.title||''} onChange={e => setForm(f => ({ ...f, title:e.target.value }))} placeholder="如：联系达人跟进" /> },
              { label:'类型', el:<select style={{ ...inp, cursor:'pointer' }} value={form.kind||'手动'} onChange={e => setForm(f => ({ ...f, kind:e.target.value }))}>{['催发','复投','激活','手动'].map(k => <option key={k} value={k}>{k}</option>)}</select> },
              { label:'关联产品', el:<select style={{ ...inp, cursor:'pointer' }} value={form.product_id||''} onChange={e => setForm(f => ({ ...f, product_id:e.target.value }))}><option value="">无</option>{products.map(p => <option key={p.id} value={p.id}>{p.internal_name}</option>)}</select> },
              { label:'指派给', el:<select style={{ ...inp, cursor:'pointer' }} value={form.staff_id||''} onChange={e => setForm(f => ({ ...f, staff_id:e.target.value }))}><option value="">团队任务</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select> },
              { label:'截止日期', el:<input type="date" style={inp} value={form.due_date||''} onChange={e => setForm(f => ({ ...f, due_date:e.target.value }))} /> },
            ].map(({ label, el }) => (
              <div key={label} style={{ marginBottom:14 }}><div style={{ fontSize:FONT.md2, fontWeight:600, color:T.muted, marginBottom:6 }}>{label}</div>{el}</div>
            ))}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button onClick={() => setEditing(null)} style={{ padding:'9px 18px', borderRadius:10, cursor:'pointer', background:'transparent', color:T.accent, border:`1.5px solid ${T.accent}`, fontSize:FONT.lg2, fontFamily:'inherit' }}>取消</button>
              <button onClick={save} disabled={!form.title} style={{ padding:'9px 20px', borderRadius:10, border:'none', cursor:'pointer', background:T.grad, color:'#fff', fontWeight:700, fontSize:FONT.lg2, fontFamily:'inherit' }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, products, staff, today, isAdmin, onToggle, onEdit, onDelete }) {
  const done = task.status === 'done';
  const product = products.find(p => p.id === task.product_id);
  const assignee = staff.find(s => s.id === task.staff_id);
  const overdue = !done && task.due_date && task.due_date < today;
  return (
    <div style={{ ...glassStyle(14, true), padding:'14px 16px', opacity:done ? 0.65 : 1, borderLeft:`4px solid ${done ? T.success : overdue ? T.danger : T.accent}` }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <button onClick={() => onToggle(task)} style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, marginTop:1, cursor:'pointer', border:`2px solid ${done ? T.success : T.border}`, background:done ? T.success : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12 }}>{done ? '✓' : ''}</button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:FONT.xl2, color:T.text, textDecoration:done ? 'line-through' : 'none' }}>{task.title}</div>
          <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap', alignItems:'center' }}>
            {task.kind && task.kind !== '手动' && <Tag color={T.accent}>{task.kind}</Tag>}
            {product && <Tag>{product.internal_name}</Tag>}
            {assignee && <Tag color={T.accent}>{assignee.name}</Tag>}
            {!task.staff_id && <Tag color={T.muted}>团队</Tag>}
            {task.due_date && <span style={{ fontSize:FONT.sm2, color:overdue ? T.danger : T.hint }}>{overdue ? '⚠️ ' : '📅 '}{task.due_date}</span>}
          </div>
        </div>
        {isAdmin && (
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button onClick={() => onEdit(task)} style={{ border:'none', background:'none', color:T.accent, cursor:'pointer', fontSize:FONT.sm2, padding:0 }}>编辑</button>
            <button onClick={() => onDelete(task.id)} style={{ border:'none', background:'none', color:T.danger, cursor:'pointer', fontSize:FONT.sm2, padding:0 }}>删除</button>
          </div>
        )}
      </div>
    </div>
  );
}
function Tag({ children, color }) { const c = color || T.muted; return <span style={{ fontSize:FONT.xs, background:`${c}15`, color:c, border:`1px solid ${c}33`, borderRadius:8, padding:'2px 8px' }}>{children}</span>; }
