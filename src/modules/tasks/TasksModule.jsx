// modules/tasks/TasksModule.jsx
import { useState } from 'react';
import { T, FONT, tabStyle } from '../../constants/tokens.js';
import { useTasks } from '../../hooks/useTasks.js';
import { createTask, clearAutoTasks } from '../../lib/supabase/tasks.js';
import { todayLocal } from './utils.js';
import GanttStrategy     from './GanttStrategy.jsx';
import CycleGoals        from './CycleGoals.jsx';
import WeeklyMenu        from './WeeklyMenu.jsx';
import ActionList        from './ActionList.jsx';
import PerformanceModule from './PerformanceModule.jsx';

const SUBTABS = [
  { id:'gantt',  label:'📊 策略甘特图'  },
  { id:'goals',  label:'🎯 本周期目标'  },
  { id:'menu',   label:'📅 周邀约日程单' },
  { id:'action', label:'✅ 行动清单'    },
  { id:'perf',   label:'📋 绩效评估'    },
];

export default function TasksModule({ ctx }) {
  const { storeId, isAdmin, userId, products, collabs, videos, creators } = ctx;
  const { goals, gantt, menus, tasks, loading, error, reload } = useTasks(storeId);
  const [sub,    setSub]    = useState(isAdmin ? 'goals' : 'action');
  const [genMsg, setGenMsg] = useState('');

  const staff = [];

  async function generateWeeklyTasks() {
    const pst = (d) => d.toLocaleDateString('sv-SE', { timeZone:'America/Los_Angeles' });
    const now  = new Date();
    const fri  = new Date(now); fri.setDate(now.getDate() + (5 - now.getDay() + 7) % 7);
    const dueDate = pst(fri);
    const cut14 = pst(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14));
    const cut30 = pst(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30));
    const cut3m = pst(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()));
    let count = 0;

    const collabVideoIds = new Set(videos.map(v => v.collaboration_id).filter(Boolean));
    const overdue = collabs.filter(c => c.ship_date >= cut30 && c.ship_date <= cut14 && !collabVideoIds.has(c.id));
    for (const col of overdue) {
      const days = Math.floor((now - new Date(col.ship_date)) / 86400000);
      await createTask(storeId, { kind:'催发', title:`【催发】${col.creator_handle||col.id} - 已${days}天未发布`, product_id:col.product_id, staff_id:col.staff_id||null, due_date:dueDate, status:'open', is_auto:true });
      count++;
    }

    const collabOrders = {};
    for (const v of videos) {
      if (!v.collaboration_id) continue;
      collabOrders[v.collaboration_id] = (collabOrders[v.collaboration_id]||0) + (v.orders||0);
    }
    const reinvest = collabs.filter(c => c.ship_date >= cut3m && (collabOrders[c.id]||0) > 3);
    for (const col of reinvest) {
      await createTask(storeId, { kind:'复投', title:`【复投】达人累计出单 ${collabOrders[col.id]} 单`, product_id:col.product_id, staff_id:col.staff_id||null, due_date:dueDate, status:'open', is_auto:true });
      count++;
    }

    setGenMsg(count ? `✅ 已生成 ${count} 条自动任务` : '本周无新增任务');
    setTimeout(() => setGenMsg(''), 5000);
    reload();
  }

  if (loading) return <div style={{ padding:48, textAlign:'center', color:T.hint }}>加载中…</div>;
  if (error)   return <div style={{ padding:48, textAlign:'center', color:T.danger }}>错误：{error}</div>;

  return (
    <div style={{ padding:20 }}>
      <h2 style={{ fontSize:FONT.x4l, fontWeight:700, color:T.text, marginBottom:14 }}>任务中心</h2>
      <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
        {SUBTABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={tabStyle(sub===t.id)}>{t.label}</button>
        ))}
        {isAdmin && (
          <>
            <button onClick={generateWeeklyTasks} style={{ marginLeft:'auto', fontSize:FONT.sm2, padding:'6px 14px', borderRadius:18, border:`1.5px solid ${T.success}`, background:'transparent', color:T.success, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>⚡ 生成本周任务</button>
            {tasks.some(t => t.is_auto) && (
              <button onClick={async () => { if (confirm('确认删除所有自动生成的任务？')) { await clearAutoTasks(storeId); reload(); } }} style={{ fontSize:FONT.sm2, padding:'6px 14px', borderRadius:18, border:`1.5px solid ${T.danger}`, background:'transparent', color:T.danger, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>🗑 清除自动任务</button>
            )}
          </>
        )}
        {genMsg && <span style={{ fontSize:FONT.sm2, color:T.success }}>{genMsg}</span>}
      </div>

      {sub==='gantt'  && <GanttStrategy     storeId={storeId} products={products} ganttStrategies={gantt} shippingGoals={goals} changeLogs={[]} collabs={collabs} isAdmin={isAdmin} onReload={reload} />}
      {sub==='goals'  && <CycleGoals        storeId={storeId} products={products} shippingGoals={goals} ganttStrategies={gantt} collabs={collabs} staff={staff} isAdmin={isAdmin} onReload={reload} />}
      {sub==='menu'   && <WeeklyMenu        storeId={storeId} menus={menus} products={products} isAdmin={isAdmin} onReload={reload} />}
      {sub==='action' && <ActionList        storeId={storeId} tasks={tasks} products={products} staff={staff} currentStaffId={userId} isAdmin={isAdmin} onReload={reload} />}
      {sub==='perf'   && <PerformanceModule storeId={storeId} collabs={collabs} videos={videos} creators={creators} shippingGoals={goals} products={products} staff={staff} isAdmin={isAdmin} userId={userId} />}
    </div>
  );
}
