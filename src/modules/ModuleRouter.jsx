// modules/ModuleRouter.jsx
import { TABS } from "../constants/nav.js";
import Placeholder from "../components/layout/Placeholder.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
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

  // 全局共享数据：只拉一次，所有板块通过 ctx 取用
  const { products, reload: reloadProducts } = useProducts(storeId);
  const {
    collabs, videos, creators, invites,
    gradeSnapshots, storeSnapshots,
    loading: reviewLoading, error: reviewError,
    reload: reloadReview,
  } = useReview(storeId);

  const sharedCtx = {
    ...ctx,
    // 产品
    products:        products ?? [],
    reloadProducts,
    // 复盘 / 归因 / 任务共用数据
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

  const meta = TABS.find((t) => t.id === tab);
  const Mod  = MODULES[tab];
  if (!meta || !Mod || !meta.ready) return <Placeholder label={meta?.label || tab} />;
  return (
    <ErrorBoundary key={tab}>
      <Mod ctx={sharedCtx} />
    </ErrorBoundary>
  );
}
