// modules/tasks/GoalCard.jsx — 单个产品的周期目标卡片：总进度 + 助理分配进度
import { T, glassStyle, FONT } from '../../constants/tokens.js';

function Bar({ pct, color, h = 8 }) {
  return <div style={{ height:h, borderRadius:h, background:`${color}20`, overflow:'hidden' }}><div style={{ height:'100%', width:`${Math.min(100, pct * 100)}%`, background:color, borderRadius:h, transition:'width .4s' }} /></div>;
}

export default function GoalCard({ goal, product, done, tp, staff, doneByStaff, canEdit, onEdit, onDelete, onAllocate }) {
  const pct = goal.target_qty > 0 ? Math.min(1, done / goal.target_qty) : 0;
  const ahead = pct > tp + 0.1, behind = pct < tp - 0.1;
  const sc = ahead ? T.success : behind ? T.danger : T.accent;
  const allocOf = (sid) => (goal.goal_allocations || []).find((a) => a.staff_id === sid)?.qty;
  const link = { border:'none', background:'none', cursor:'pointer', fontSize:FONT.note, padding:0, fontFamily:'inherit' };
  return (
    <div style={{ ...glassStyle(16, true), padding:'16px 18px' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:FONT.h3, color:T.text }}>{product?.internal_name || goal.product_id}</div>
          <div style={{ fontSize:FONT.tiny, color:T.hint, marginTop:2 }}>{product?.product_title || ''}</div>
        </div>
        {canEdit && <div style={{ display:'flex', gap:8 }}>
          <button onClick={onEdit} style={{ ...link, color:T.accent }}>编辑</button>
          <button onClick={onDelete} style={{ ...link, color:T.danger }}>删除</button>
        </div>}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:FONT.note, marginBottom:5 }}>
        <span style={{ color:sc, fontWeight:700 }}>{done} / {goal.target_qty} 件</span>
        <span style={{ color:T.hint }}>{Math.round(pct * 100)}% · 预估视频 {goal.estimated_videos ?? '未填'} 条</span>
      </div>
      <Bar pct={pct} color={sc} />
      <div style={{ marginTop:4, fontSize:FONT.tiny, color:T.hint }}>{ahead ? '✅ 进度超前' : behind ? '⚠️ 进度落后' : '📊 进度正常'} · 时间进度 {Math.round(tp * 100)}%</div>

      {staff.length > 0 && (
        <div style={{ marginTop:10, borderTop:`1px solid ${T.border}`, paddingTop:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:FONT.note, fontWeight:700, color:T.muted }}>助理任务分配</span>
            {canEdit && <button onClick={onAllocate} style={{ ...link, color:T.accent, border:`1px solid ${T.accent}`, borderRadius:8, padding:'3px 10px', fontWeight:700 }}>✏️ 分配</button>}
          </div>
          {staff.map((s) => {
            const assigned = allocOf(s.id), d = doneByStaff(s.id);
            const sp = assigned > 0 ? Math.min(1, d / assigned) : null;
            return (
              <div key={s.id} style={{ marginBottom:7 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:FONT.note, marginBottom:3 }}>
                  <span style={{ fontWeight:600, color:T.text }}>{s.name}</span>
                  <span style={{ color:T.hint }}>{d} / {assigned ?? '未分配'} 件{sp != null && <b style={{ marginLeft:6, color: sp >= 1 ? T.success : T.accent }}>{Math.round(sp * 100)}%</b>}</span>
                </div>
                {assigned > 0 && <Bar pct={sp} color={sp >= 1 ? T.success : T.accent} h={5} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
