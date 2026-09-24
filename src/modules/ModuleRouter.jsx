// modules/ModuleRouter.jsx
// 数据策略（对齐旧版的「快」）：
//   ① 核心数据（合作/达人/视频/员工/邀约）登录后并行拉一次，全站共享，切板块不再请求
//   ② 核心数据到位后，后台预取快照、任务数据
//   ③ 板块懒挂载 + 保活：首次切到才渲染，之后只隐藏不卸载（筛选条件、滚动位置都保留）
import { useState } from "react";
import { TABS } from "../constants/nav.js";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import SyncPill from "../components/layout/SyncPill.jsx";
import { useCoreData } from "../hooks/useCoreData.js";
import { useProducts } from "../hooks/useProducts.js";
import { useSnapshots } from "../hooks/useSnapshots.js";
import { useTasks } from "../hooks/useTasks.js";
import ProductsModule    from "./products/ProductsModule.jsx";
import CRMModule         from "./crm/CRMModule.jsx";
import InvitePoolModule  from "./invitePool/InvitePoolModule.jsx";
import DailyModule       from "./daily/DailyModule.jsx";
import VideosModule      from "./videos/VideosModule.jsx";
import ReviewModule      from "./review/ReviewModule.jsx";
import AttributionModule from "./attribution/AttributionModule.jsx";
import TasksModule       from "./tasks/TasksModule.jsx";
import BDToolsModule     from "./bdtools/BDToolsModule.jsx";
import StaffModule       from "./staff/StaffModule.jsx";
import PerformanceModule from "./tasks/PerformanceModule.jsx";
import PlatformModule    from "./platform/PlatformModule.jsx";

const MODULES = {
  products:    ProductsModule,
  crm:         CRMModule,
  invitePool:  InvitePoolModule,
  daily:       DailyModule,
  videos:      VideosModule,
  review:      ReviewModule,
  attribution: AttributionModule,
  tasks:       TasksModule,
  bdtools:     BDToolsModule,
  performance: PerformanceModule,
  staff:       StaffModule,
  platform:    PlatformModule,
};

export default function ModuleRouter({ tab, ctx }) {
  const { storeId } = ctx;

  const core        = useCoreData(storeId);
  const productsApi = useProducts(storeId);
  const prefetchId  = core.loading ? null : storeId;   // 核心数据到位后再预取次要数据
  const snapshots   = useSnapshots(prefetchId);
  const tasksApi    = useTasks(prefetchId);

  const sharedCtx = {
    ...ctx,
    core, productsApi, tasksApi,
    products:        productsApi.products,
    collabs:         core.collabs,
    videos:          core.videos,
    creators:        core.creators,
    invites:         core.invites,
    staff:           core.staff,
    // 当前登录账号在助理名册里对应的助理（人员管理里绑定登录账号后才有）
    myStaffId:       core.staff.find((s) => s.auth_user_id === ctx.userId)?.id || null,
    dataLoading:     core.loading,
    dataError:       core.error,
    gradeSnapshots:  snapshots.gradeSnapshots,
    storeSnapshots:  snapshots.storeSnapshots,
    reloadSnapshots: snapshots.reload,
  };

  // 已经激活过的模块集合（懒初始化 + 保活）
  const [mounted, setMounted] = useState(() => new Set([tab]));
  if (!mounted.has(tab)) setMounted((prev) => new Set([...prev, tab]));

  return (
    <>
      {TABS.filter((t) => t.ready && MODULES[t.id]).map((t) => {
        if (!mounted.has(t.id)) return null;
        const Mod = MODULES[t.id];
        return (
          <div key={t.id} style={{ display: t.id === tab ? "block" : "none" }}>
            <ErrorBoundary><Mod ctx={sharedCtx} /></ErrorBoundary>
          </div>
        );
      })}
      <SyncPill show={core.syncing && !core.loading} error={core.error} />
    </>
  );
}
