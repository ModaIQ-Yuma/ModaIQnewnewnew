import { T, Z, FONT } from "../../constants/tokens.js";
import { TABS } from "../../constants/nav.js";
import { signOut } from "../../lib/supabase/auth.js";
import WaterBackground from "./WaterBackground.jsx";

/**
 * 应用外壳：顶栏（Logo / 店铺切换 / 用户）+ 导航 + 内容区。
 * 只负责布局与导航，不持有任何业务数据。
 */
export default function AppShell({ store, stores, isAdmin, onSwitchStore, tab, onTab, userEmail, children }) {
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);
  const pill = { fontSize: FONT.note, fontWeight: 600, color: T.text, fontFamily: "inherit", background: "rgba(255,255,255,0.45)", border: `1.5px solid ${T.border}`, borderRadius: 20, padding: "5px 12px", whiteSpace: "nowrap" };

  return (
    <div style={{ minHeight: "100vh", fontFamily: "-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif", fontSize: FONT.h3, color: T.text, position: "relative" }}>
      <WaterBackground />
      <header style={{
        position: "sticky", top: 0, zIndex: Z.sticky, background: T.navGrad,
        backdropFilter: T.blur, WebkitBackdropFilter: T.blur, borderBottom: `1px solid ${T.glassStroke}`,
        boxShadow: "0 2px 16px rgba(61,127,239,0.07)",
        padding: "0 22px", display: "flex", alignItems: "center", gap: 18, height: 60,
      }}>
        <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.04em", whiteSpace: "nowrap", background: "linear-gradient(135deg, #FF8FD0 0%, #6CAEFF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Moda.IQ</span>

        <nav style={{ display: "flex", gap: 5, flex: 1, overflowX: "auto" }}>
          {visibleTabs.map((t) => (
            <button key={t.id} onClick={() => onTab(t.id)} style={{
              fontSize: FONT.body, padding: "7px 15px", borderRadius: 20, whiteSpace: "nowrap", border: "none",
              background: tab === t.id ? T.grad : "transparent",
              color: tab === t.id ? "#fff" : t.ready ? T.muted : T.hint,
              cursor: "pointer", fontFamily: "inherit", fontWeight: tab === t.id ? 700 : 600,
              boxShadow: tab === t.id ? "0 2px 10px rgba(61,127,239,0.30)" : "none",
              transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {stores.length > 1 ? (
            <select value={store?.store_id || ""} onChange={(e) => onSwitchStore(e.target.value)} style={{ ...pill, cursor: "pointer", outline: "none" }}>
              {stores.map((s) => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
            </select>
          ) : (
            <span style={pill}>🏪 {store?.store_name}</span>
          )}
          <span title={userEmail} style={{ fontSize: FONT.note, color: T.hint, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</span>
          <button onClick={signOut} style={{ fontSize: FONT.note, padding: "5px 12px", borderRadius: 16, border: `1.5px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>退出</button>
        </div>
      </header>

      {/* 右下角水印 */}
      <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, pointerEvents: "none", userSelect: "none", background: "rgba(255,255,255,0.25)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.55)", borderRadius: 14, padding: "8px 18px", boxShadow: "0 4px 24px rgba(61,127,239,0.12)" }}>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.12em", background: "linear-gradient(135deg, rgba(108,123,240,0.6) 0%, rgba(155,107,227,0.5) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Moda.IQ</span>
      </div>

      <main style={{ position: "relative", zIndex: 1, padding: "24px 22px 80px", maxWidth: 1440, margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
