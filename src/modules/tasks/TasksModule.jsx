// modules/tasks/TasksModule.jsx
import { useState } from 'react';
import { T, FONT } from '../../constants/tokens.js';
import SubNav from '../../components/layout/SubNav.jsx';
import { createTask, clearAutoTasks } from '../../lib/supabase/tasks.js';
import GanttStrategy     from './GanttStrategy.jsx';
import CycleGoals        from './CycleGoals.jsx';
import WeeklyMenu        from './WeeklyMenu.jsx';
import ActionList        from './ActionList.jsx';
import PerformanceModule from './PerformanceModule.jsx';

const SUBTABS = [
  { id:'gantt',  label:'📊 策略甘特图',  desc:'按半月（1-14 日 / 15 日-月底）规划每个产品的推广策略；点格子改策略，可同步调整对应账期的寄样目标。' },
  { id:'goals',  label:'🎯 本周期目标',  desc:'本账期（15 日 ~ 次月 14 日）每个产品的寄样目标和实际进度，进度按 CRM 寄样记录实时计算。' },
  { id:'menu',   label:'📅 周邀约日程单', desc:'每周 7 天 × 4 格的邀约排期，管理员发布后助理按单邀约。' },
  { id:'action', label:'✅ 行动清单',    desc:'指派给助理的具体任务（催发视频、复投等），完成后勾选。「生成本周任务」会按寄样和出单数据自动生成。' },
  { id:'perf',   label:'📋 绩效评估',    desc:'按账期计算助理绩效得分；管理员可切换查看全店或单个助理。' },
];

export default function TasksModule({ ctx }) {
  const { storeId, products, collabs, videos, staff, tasksApi, myStaffId } = ctx;
  const { goals, gantt, menus, tasks, loading, error, reload } = tasksApi;
  const canPlan = ctx.can('task.plan');   // 甘特图 / 目标 / 分配 / 日程单 / 新建任务
  const [sub,    setSub]    = useState(canPlan ? 'goals' : 'action');
  const [genMsg, setGenMsg] = useState('');

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

  if (loading || ctx.dataLoading) return <div style={{ padding:48, textAlign:'center', color:T.hint }}>加载中…</div>;
  if (error)   return <div style={{ padding:48, textAlign:'center', color:T.danger }}>错误：{error}</div>;

  return (
    <div>
      <SubNav tabs={SUBTABS.filter(t => t.id !== 'perf' || ctx.can('perf.viewSelf'))} active={sub} onChange={setSub} right={<>
        {canPlan && (
          <>
            <button onClick={generateWeeklyTasks} style={{ fontSize:FONT.sm2, padding:'6px 14px', borderRadius:18, border:`1.5px solid ${T.success}`, background:'transparent', color:T.success, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>⚡ 生成本周任务</button>
            {tasks.some(t => t.is_auto) && (
              <button onClick={async () => { if (confirm('确认删除所有自动生成的任务？')) { await clearAutoTasks(storeId); reload(); } }} style={{ fontSize:FONT.sm2, padding:'6px 14px', borderRadius:18, border:`1.5px solid ${T.danger}`, background:'transparent', color:T.danger, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>🗑 清除自动任务</button>
            )}
          </>
        )}
        {genMsg && <span style={{ fontSize:FONT.sm2, color:T.success }}>{genMsg}</span>}
      </>} />

      {sub==='gantt'  && <GanttStrategy     storeId={storeId} products={products} ganttStrategies={gantt} shippingGoals={goals} changeLogs={[]} collabs={collabs} canEdit={canPlan} onReload={reload} />}
      {sub==='goals'  && <CycleGoals        storeId={storeId} products={products} shippingGoals={goals} ganttStrategies={gantt} collabs={collabs} staff={staff} canEdit={canPlan} onReload={reload} />}
      {sub==='menu'   && <WeeklyMenu        storeId={storeId} menus={menus} products={products} canEdit={canPlan} onReload={reload} />}
      {sub==='action' && <ActionList        storeId={storeId} tasks={tasks} products={products} staff={staff} currentStaffId={myStaffId} canEdit={canPlan} canToggle={ctx.can('task.do')} onReload={reload} />}
      {sub==='perf'   && <PerformanceModule ctx={ctx} showIntro={false} />}
    </div>
  );
}
