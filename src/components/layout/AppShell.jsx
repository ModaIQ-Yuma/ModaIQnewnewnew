import { T, Z } from "../../constants/tokens.js";
import { TABS } from "../../constants/nav.js";
import { signOut } from "../../lib/supabase/auth.js";
import WaterBackground from "./WaterBackground.jsx";

/**
 * 应用外壳：顶栏（Logo / 店铺切换 / 用户）+ 导航 + 内容区。
 * 只负责布局与导航，不持有任何业务数据。
 */
export default function AppShell({ store, stores, isAdmin, onSwitchStore, tab, onTab, userEmail, children }) {
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div style={{ minHeight: "100vh", fontFamily: "-apple-system, 'PingFang SC', sans-serif", color: T.text, position: "relative" }}>
      <WaterBackground />
      <header style={{
        position: "sticky", top: 0, zIndex: Z.sticky, background: T.navGrad,
        backdropFilter: T.blur, WebkitBackdropFilter: T.blur, borderBottom: `1px solid ${T.glassStroke}`,
        padding: "0 22px", display: "flex", alignItems: "center", gap: 18, height: 52,
      }}>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "0.08em", background: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Moda.IQ</span>

        {stores.length > 1 ? (
          <select value={store?.store_id || ""} onChange={(e) => onSwitchStore(e.target.value)}
            style={{ fontSize: 12.5, padding: "4px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.6)", fontFamily: "inherit" }}>
            {stores.map((s) => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
          </select>
        ) : (
          <span style={{ fontSize: 12.5, color: T.muted, fontWeight: 600 }}>{store?.store_name}</span>
        )}

        <nav style={{ display: "flex", gap: 4, marginLeft: 8, flex: 1, overflowX: "auto" }}>
          {visibleTabs.map((t) => (
            <button key={t.id} onClick={() => onTab(t.id)} style={{
              fontSize: 12.5, padding: "5px 12px", borderRadius: 14, whiteSpace: "nowrap",
              border: `1.5px solid ${tab === t.id ? T.accent : "transparent"}`,
              background: tab === t.id ? T.accent : "transparent",
              color: tab === t.id ? "#fff" : t.ready ? T.muted : T.hint,
              cursor: "pointer", fontFamily: "inherit", fontWeight: tab === t.id ? 700 : 600,
            }}>{t.label}</button>
          ))}
        </nav>

        <span style={{ fontSize: 11.5, color: T.hint }}>{userEmail}</span>
        <button onClick={signOut} style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer", fontFamily: "inherit" }}>退出</button>
      </header>

      <main style={{ position: "relative", zIndex: 1, padding: "22px 22px 60px", maxWidth: 1440, margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
