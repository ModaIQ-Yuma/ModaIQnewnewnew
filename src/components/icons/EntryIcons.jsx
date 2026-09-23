// components/icons/EntryIcons.jsx — 入口吉祥物图标库（纯 SVG，可随店铺替换）
// 目前全站默认用握手（品牌 × 达人合作，对任何店铺都通用）；天鹅留作店铺自选图标备用。
const line = { strokeLinejoin: "round", strokeLinecap: "round" };

/** 蓝粉握手 + 小星星；sparkle=true 时中间的星星放大旋转 */
export function HandshakeIcon({ size = 64, sparkle = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M4 26 L16 22 L22 40 L10 44 Z" fill="#3D7FEF" stroke="#2257B8" strokeWidth="2" {...line} />
      <path d="M60 26 L48 22 L42 40 L54 44 Z" fill="#FF8FB5" stroke="#D4537E" strokeWidth="2" {...line} />
      <path d="M16 24 C22 21 28 22 33 25 L44 33 C46.5 35 44.5 38.5 42 37.2 L36 33.5" fill="#FFFFFF" stroke="#2257B8" strokeWidth="2.2" {...line} />
      <path d="M48 24 C42 21 38 21 34 23 L26 28 C23.5 29.5 25 33 28 32 L33 29.5" fill="#FFFFFF" stroke="#D4537E" strokeWidth="2.2" {...line} />
      <path d="M20 38 C22 41 25 42 27 40 C29 43 32 44 34 41.5 C36 44 39 44.5 41 42 C43 43.5 45.5 42 44.5 39.5 L42 37.2" fill="#FFFFFF" stroke="#2257B8" strokeWidth="2.2" {...line} />
      <path d="M27 40 L25 36.5 M34 41.5 L31.5 37.5 M41 42 L38.8 38.5" stroke="#2257B8" strokeWidth="1.8" {...line} />
      <path d="M32 6 L33.4 10.6 L38 12 L33.4 13.4 L32 18 L30.6 13.4 L26 12 L30.6 10.6 Z" fill="#FFC53D"
        style={{ transformOrigin: "32px 12px", transform: sparkle ? "scale(1.3) rotate(20deg)" : "none", transition: "transform .25s" }} />
      <path d="M46 10 L46.8 12.2 L49 13 L46.8 13.8 L46 16 L45.2 13.8 L43 13 L45.2 12.2 Z" fill="#9CC0FF" />
      <path d="M18 9 L18.7 11 L20.7 11.7 L18.7 12.4 L18 14.4 L17.3 12.4 L15.3 11.7 L17.3 11 Z" fill="#FF8FB5" />
    </svg>
  );
}

/** 小天鹅（头顶小火苗）——店铺自选图标备用 */
export function SwanIcon({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M8 50 Q16 46 24 50 T40 50 T56 50" fill="none" stroke="#9CC0FF" strokeWidth="2.5" {...line} />
      <path d="M25 36 C21 28 17 18 22 12" fill="none" stroke="#2F6FE0" strokeWidth="8" {...line} />
      <path d="M25 36 C21 28 17 18 22 12" fill="none" stroke="#FFFFFF" strokeWidth="3.6" {...line} />
      <path d="M10 36 C10 46 21 49 33 49 C46 49 55 44 56 33 C52 37 46 38 42 35 C36 30 29 31 26 35 C21 38 15 38 10 36 Z" fill="#FFFFFF" stroke="#2F6FE0" strokeWidth="2.2" {...line} />
      <path d="M30 37 C34 33 42 33 47 37 C42 41 35 41 30 37 Z" fill="#DCE9FF" />
      <circle cx="27" cy="11" r="6.5" fill="#FFFFFF" stroke="#2F6FE0" strokeWidth="2.2" />
      <path d="M33 9.5 L39.5 12 L33 14.5 Z" fill="#FF8A3D" stroke="#E0662A" strokeWidth="0.8" {...line} />
      <circle cx="29" cy="10" r="1.5" fill="#1B2B4A" />
      <circle cx="25.5" cy="13.2" r="1.6" fill="#FFB8D0" />
      <path d="M25.5 5.3 C24.5 2 27 0.2 28 -0.5 C28.2 2.1 30.6 2.3 29.8 4.9 C29 6.5 26.3 7 25.5 5.3 Z" fill="#FF8A3D" />
    </svg>
  );
}

/** 图标注册表：以后店铺可在设置里选 key；未设置时用 DEFAULT_ENTRY_ICON */
export const ENTRY_ICONS = { handshake: HandshakeIcon, swan: SwanIcon };
export const DEFAULT_ENTRY_ICON = "handshake";
