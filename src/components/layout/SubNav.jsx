// ─── 板块顶部：子导航 + 当前子页一句话说明（替代原来的页面大标题）────────────
// 顶部导航已经说明「在哪个板块」，这里只回答「这一页看什么」。
import { T, FONT, tabStyle } from "../../constants/tokens.js";

/** 蓝点 + 一句说明；无子导航的板块直接放在顶部 */
export function SectionIntro({ children, style }) {
  if (!children) return null;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: FONT.note, color: T.muted, lineHeight: 1.6, ...style }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, flexShrink: 0, transform: "translateY(-1px)" }} />
      <span>{children}</span>
    </div>
  );
}

/** 灰色口径说明（放在筛选控件下方） */
export function Hint({ children, style }) {
  return <div style={{ fontSize: FONT.note, color: T.hint, lineHeight: 1.6, ...style }}>{children}</div>;
}

/**
 * @param tabs   [{ id, label, desc }]  desc = 这一页看什么（一句话）
 * @param right  右侧操作区（可选）
 */
export default function SubNav({ tabs, active, onChange, right = null }) {
  const cur = tabs.find((t) => t.id === active);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => onChange(t.id)} style={tabStyle(t.id === active)}>{t.label}</button>
        ))}
        {right && <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{right}</div>}
      </div>
      <SectionIntro style={{ marginTop: 10 }}>{cur?.desc}</SectionIntro>
    </div>
  );
}
