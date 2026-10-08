// modules/tasks/TasksModule.jsx
import { useState } from 'react';
import { T, FONT } from '../../constants/tokens.js';
import SubNav from '../../components/layout/SubNav.jsx';
import { clearAutoTasks } from '../../lib/supabase/tasks.js';
import { useTaskGenerator } from '../../hooks/useTaskGenerator.js';
import GanttStrategy     from './GanttStrategy.jsx';
import CycleGoals        from './CycleGoals.jsx';
import WeeklyMenu        from './WeeklyMenu.jsx';
import ActionList        from './ActionList.jsx';
import PerformanceModule from './PerformanceModule.jsx';

const SUBTABS = [
  { id:'gantt',  label:'📊 策略甘特图',  desc:'按半月（1-14 日 / 15 日-月底）规划每个产品的推广策略；点格子改策略，可同步调整对应账期的寄样目标。' },
  { id:'goals',  label:'🎯 本周期目标',  desc:'本账期（15 日 ~ 次月 14 日）每个产品的寄样目标和实际进度，进度按 CRM 寄样记录实时计算。' },
  { id:'menu',   label:'📅 周邀约日程单', desc:'每周 7 天 × 4 格的邀约排期，管理员发布后助理按单邀约。' },
  { id:'action', label:'✅ 行动清单',    desc:'指派给助理的具体任务，完成后勾选。「⚡ 生成本周任务」自动生成三类：催发（寄样 14～30 天没发视频）、复投（这条寄样累计出单 ≥ 3）、激活（FSorder 累计 ≥ 30 单但 3 个月无新视频）；只看 7/1 以后的寄样，已提醒过的不重复生成。' },
  { id:'perf',   label:'📋 绩效评估',    desc:'按账期计算助理绩效得分；管理员可切换查看全店或单个助理。' },
];

export default function TasksModule({ ctx }) {
  const { storeId, products, collabs, staff, tasksApi, myStaffId } = ctx;
  const { goals, gantt, menus, tasks, changeLogs, loading, error, reload } = tasksApi;
  const canPlan = ctx.can('task.plan');   // 甘特图 / 目标 / 分配 / 日程单 / 新建任务
  const [sub,    setSub]    = useState(canPlan ? 'goals' : 'action');
  const [genMsg, setGenMsg] = useState('');

  const gen = useTaskGenerator({ storeId, core: ctx.core, products, tasks, onDone: reload });
  async function generateWeeklyTasks() {
    try {
      const r = await gen.generate();
      setGenMsg(r.total ? `✅ 已生成 ${r.total} 条（催发 ${r.催发}、复投 ${r.复投}、激活 ${r.激活}）` : '本周没有需要新增的任务');
    } catch (e) { setGenMsg(`❌ 生成失败：${e.message}`); }
    setTimeout(() => setGenMsg(''), 6000);
  }

  if (loading || ctx.dataLoading) return <div style={{ padding:48, textAlign:'center', color:T.hint }}>加载中…</div>;
  if (error)   return <div style={{ padding:48, textAlign:'center', color:T.danger }}>错误：{error}</div>;

  return (
    <div>
      <SubNav tabs={SUBTABS.filter(t => t.id !== 'perf' || ctx.can('perf.viewSelf'))} active={sub} onChange={setSub} right={<>
        {canPlan && (
          <>
            <button onClick={generateWeeklyTasks} disabled={gen.busy} style={{ fontSize:FONT.sm2, padding:'6px 14px', borderRadius:18, border:`1.5px solid ${T.success}`, background:'transparent', color:T.success, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>{gen.busy ? '⏳ 生成中…' : '⚡ 生成本周任务'}</button>
            {tasks.some(t => t.is_auto) && (
              <button onClick={async () => { if (confirm('确认删除所有自动生成的任务？')) { await clearAutoTasks(storeId); reload(); } }} style={{ fontSize:FONT.sm2, padding:'6px 14px', borderRadius:18, border:`1.5px solid ${T.danger}`, background:'transparent', color:T.danger, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>🗑 清除自动任务</button>
            )}
          </>
        )}
        {genMsg && <span style={{ fontSize:FONT.sm2, color: genMsg.startsWith('❌') ? T.danger : T.success }}>{genMsg}</span>}
      </>} />

      {sub==='gantt'  && <GanttStrategy     storeId={storeId} products={products} ganttStrategies={gantt} shippingGoals={goals} changeLogs={changeLogs} staff={staff} userId={ctx.userId} canEdit={canPlan} onReload={reload} />}
      {sub==='goals'  && <CycleGoals        storeId={storeId} products={products} shippingGoals={goals} collabs={collabs} staff={staff} canEdit={canPlan} onReload={reload} />}
      {sub==='menu'   && <WeeklyMenu        storeId={storeId} menus={menus} products={products} invites={ctx.invites ?? []} canEdit={canPlan} onReload={reload} />}
      {sub==='action' && <ActionList        storeId={storeId} tasks={tasks} products={products} staff={staff} currentStaffId={myStaffId} canEdit={canPlan} canToggle={ctx.can('task.do')} onReload={reload} />}
      {sub==='perf'   && <PerformanceModule ctx={ctx} showIntro={false} />}
    </div>
  );
}
