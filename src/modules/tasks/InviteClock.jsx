// modules/tasks/InviteClock.jsx — 今日邀约名单上方的时钟：洛杉矶 / 美东时间 + 建议的中国发送时间
import { useEffect, useState } from "react";
import { T, FONT } from "../../constants/tokens.js";
import { sendWindowStatus, hourLabel } from "../../lib/tasks/sendWindow.js";

export default function InviteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);     // 每 30 秒刷新，分钟数不会慢超过半分钟
    return () => clearInterval(id);
  }, []);
  const w = sendWindowStatus(now);

  return (
    <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:"6px 14px", fontSize:FONT.lg2, color:T.muted,
      padding:"8px 12px", borderRadius:10, marginBottom:12, background:"rgba(255,255,255,0.5)", border:`1px solid ${T.glassStroke}` }}>
      <span>🕐 洛杉矶 <b style={{ color:T.text }}>{w.la}</b></span>
      <span>美东 <b style={{ color:T.text }}>{w.et}</b></span>
      <span>请将邀约时间设置为北京时间 <b style={{ color:T.accent }}>{hourLabel(w.cnStart)}</b> 开始发送</span>
    </div>
  );
}
