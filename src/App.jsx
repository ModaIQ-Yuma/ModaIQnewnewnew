import { useState } from "react";
import { useSession } from "./hooks/useSession.js";
import { useStoreContext } from "./hooks/useStoreContext.js";
import { DEFAULT_TAB } from "./constants/nav.js";
import LoadingScreen from "./components/layout/LoadingScreen.jsx";
import LoginGate from "./components/auth/LoginGate.jsx";
import InviteGate from "./components/auth/InviteGate.jsx";
import AppShell from "./components/layout/AppShell.jsx";
import ModuleRouter from "./modules/ModuleRouter.jsx";

/**
 * 根组件只做三件事：认证门禁 → 店铺上下文 → 把 ctx 交给路由。
 * 不持有任何业务数据；各模块通过自己的 hook 按需拉取。
 */
export default function App() {
  const { session, checked: authChecked } = useSession();
  const userId = session?.user?.id || null;
  const store  = useStoreContext(userId);
  const [tab, setTab] = useState(DEFAULT_TAB);

  if (!authChecked) return <LoadingScreen text="检查登录状态…" />;
  if (!session)     return <LoginGate />;
  if (!store.checked) return <LoadingScreen text="加载店铺…" />;
  if (!store.activeStore) return <InviteGate userId={userId} onJoined={store.reload} />;

  // ctx：每个模块拿到的统一上下文（店铺 / 角色 / 用户）
  const ctx = {
    storeId: store.activeStoreId,
    storeName: store.activeStore.store_name,
    role: store.role,
    isAdmin: store.isAdmin,
    isSuperAdmin: store.isSuperAdmin,
    userId,
    userEmail: session.user.email,
  };

  return (
    <AppShell
      store={store.activeStore} stores={store.stores} isAdmin={store.isAdmin}
      onSwitchStore={store.switchStore} tab={tab} onTab={setTab} userEmail={ctx.userEmail}
    >
      <ModuleRouter tab={tab} ctx={ctx} />
    </AppShell>
  );
}
