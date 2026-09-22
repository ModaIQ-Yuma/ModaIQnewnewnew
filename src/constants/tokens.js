// ─── DESIGN TOKENS — 冰蓝清透 · 液态玻璃 ─────────────────────────────────────
// 背景交给 WebGL 水波（WaterBackground）；各表面是浮在水上的冰蓝磨砂玻璃。
// 整体基调：清透冰蓝，玻璃质感，拒绝粉调。
export const T = {
  bg: "transparent",                         // 真背景是水波画布
  surface: "rgba(235,242,255,0.82)",
  card: "rgba(235,242,255,0.82)",
  border: "rgba(100,140,220,0.45)",
  borderHover: "rgba(100,140,220,0.65)",
  accent: "#3D7FEF",
  accentDim: "#2563CC",
  text: "#0A1628",
  muted: "#33455E",
  hint: "#5C7090",
  s: "#0E9E70", aplus: "#3D7FEF", a: "#6C8FE8", b: "#E8923B", c: "#E0455E",
  info: "#3D7FEF", success: "#0E9E70", warning: "#E8923B", danger: "#E0455E",
  grad: "linear-gradient(135deg, #3D7FEF 0%, #6CAEFF 100%)",
  gradSoft: "linear-gradient(135deg, rgba(61,127,239,0.10) 0%, rgba(108,174,255,0.08) 100%)",
  navGrad: "linear-gradient(135deg, rgba(220,234,255,0.72) 0%, rgba(210,228,255,0.56) 100%)",
  glass: "rgba(228,238,255,0.78)",
  glassStrong: "rgba(235,244,255,0.90)",
  glassStroke: "rgba(180,210,255,0.65)",
  glassShadow: "0 12px 44px rgba(40,90,180,0.14)",
  blur: "blur(18px) saturate(160%)",
  blurStrong: "blur(24px) saturate(170%)",
};

// ─── 玻璃面板通用样式（组件用 glassStyle() 复用，避免到处抄）──────────────────
export const glassStyle = (radius = 18, strong = false) => ({
  position: "relative",
  background: strong ? T.glassStrong : T.glass,
  backdropFilter: T.blur,
  WebkitBackdropFilter: T.blur,
  border: `1px solid ${T.glassStroke}`,
  borderRadius: radius,
  boxShadow: T.glassShadow,
});

// ─── z-index ─────────────────────────────────────────────────────────────────
export const Z = { dropdown: 300, sticky: 100, modal: 2000, modalTop: 2200, fixed: 4999, toast: 5000 };

// ─── 字号 ────────────────────────────────────────────────────────────────────
export const FONT = {
  xs:   9.5,
  sm:   10,
  sm2:  10.5,
  base: 11,
  md:   11.5,
  md2:  12,
  lg:   12.5,
  lg2:  13,
  xl:   13.5,
  xl2:  14,
  xxl:  14.5,
  x3l:  15,
  x4l:  16,
};

// ─── 全局通用 tab 按钮样式 ────────────────────────────────────────────────────
export const tabStyle = (active) => ({
  padding: "5px 14px", borderRadius: 18, cursor: "pointer",
  fontSize: 13, fontWeight: active ? 700 : 600, fontFamily: "inherit",
  border: `1.5px solid ${active ? "#3D7FEF" : "rgba(180,195,220,0.5)"}`,
  background: active ? "#3D7FEF" : "transparent",
  color: active ? "#fff" : "#8899BB",
});
