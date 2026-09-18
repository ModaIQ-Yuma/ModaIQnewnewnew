import { TABS } from "../constants/nav.js";
import Placeholder from "../components/layout/Placeholder.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import ProductsModule from "./products/ProductsModule.jsx";

// ─── tab id → 模块组件。新板块在这里注册一行，App.jsx 不用改 ────────────────
const MODULES = {
  products: ProductsModule,
};

export default function ModuleRouter({ tab, ctx }) {
  const meta = TABS.find((t) => t.id === tab);
  const Mod  = MODULES[tab];
  if (!meta || !Mod || !meta.ready) return <Placeholder label={meta?.label || tab} />;
  return (
    <ErrorBoundary key={tab}>
      <Mod ctx={ctx} />
    </ErrorBoundary>
  );
}
