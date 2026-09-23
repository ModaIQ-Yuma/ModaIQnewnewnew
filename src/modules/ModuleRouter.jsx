// modules/ModuleRouter.jsx
import { TABS } from "../constants/nav.js";
import Placeholder from "../components/layout/Placeholder.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import { useState } from "react";
import { useReview } from "../hooks/useReview.js";
import { useProducts } from "../hooks/useProducts.js";
import ProductsModule    from "./products/ProductsModule.jsx";
import CRMModule         from "./crm/CRMModule.jsx";
import InvitePoolModule  from "./invitePool/InvitePoolModule.jsx";
import DailyModule       from "./daily/DailyModule.jsx";
import VideosModule      from "./videos/VideosModule.jsx";
import ReviewModule      from "./review/ReviewModule.jsx";
import AttributionModule from "./attribution/AttributionModule.jsx";
import TasksModule        from "./tasks/TasksModule.jsx";
import BDToolsModule      from "./bdtools/BDToolsModule.jsx";
import StaffModule        from "./staff/StaffModule.jsx";
import PerformanceModule  from "./tasks/PerformanceModule.jsx";

// 需要复盘数据（useReview）的板块
const REVIEW_TABS = new Set(["review", "attribution", "tasks", "performance"]);

const MODULES = {
  products:    ProductsModule,
  crm:         CRMModule,
  invitePool:  InvitePoolModule,
  daily:       DailyModule,
  videos:      VideosModule,
  review:      ReviewModule,
  attribution: AttributionModule,
  tasks:        TasksModule,
  bdtools:      BDToolsModule,
  performance:  PerformanceModule,
  staff:        StaffModule,
};

export default function ModuleRouter({ tab, ctx }) {
  const { storeId } = ctx;

  // 产品库：所有板块都需要，始终拉
  const { products, reload: reloadProducts } = useProducts(storeId);

  // 复盘数据：只在需要的板块才激活（懒加载）
  const reviewEnabled = REVIEW_TABS.has(tab);
  const {
    collabs, videos, creators, invites,
    gradeSnapshots, storeSnapshots,
    loading: reviewLoading, error: reviewError,
    reload: reloadReview,
  } = useReview(reviewEnabled ? storeId : null);

  const sharedCtx = {
    ...ctx,
    products:        products ?? [],
    reloadProducts,
    collabs:         collabs  ?? [],
    videos:          videos   ?? [],
    creators:        creators ?? [],
    invites:         invites  ?? [],
    gradeSnapshots:  gradeSnapshots ?? [],
    storeSnapshots:  storeSnapshots ?? [],
    reviewLoading,
    reviewError,
    reloadReview,
  };

  // 已经激活过的模块集合（懒初始化 + 保活：首次切到才 mount，之后只隐藏不卸载）
  const [mounted, setMounted] = useState(new Set([tab]));
  if (!mounted.has(tab)) setMounted((prev) => new Set([...prev, tab]));

  return (
    <>
      {TABS.filter((t) => t.ready && MODULES[t.id]).map((t) => {
        const Mod = MODULES[t.id];
        const isActive = t.id === tab;
        if (!mounted.has(t.id)) return null;
        return (
          <div key={t.id} style={{ display: isActive ? "block" : "none" }}>
            <ErrorBoundary>
              <Mod ctx={sharedCtx} />
            </ErrorBoundary>
          </div>
        );
      })}
    </>
  );
}
