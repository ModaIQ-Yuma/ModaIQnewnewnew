// modules/tasks/InviteClock.jsx — 今日邀约名单顶部的发送提醒卡：北京几点开始发 + 各时区窗口 + 现在时间
import { useEffect, useState } from "react";
import { T, FONT } from "../../constants/tokens.js";
import { sendWindowStatus, hourLabel, fmtDuration } from "../../lib/tasks/sendWindow.js";

const cell = { display:"flex", flexDirection:"column", gap:2, padding:"8px 14px", borderRadius:10, background:"rgba(255,255,255,0.65)", minWidth:120 };
const cap  = { fontSize:FONT.tiny, color:T.hint, fontWeight:600 };

export default function InviteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);     // 每 30 秒刷新
    return () => clearInterval(id);
  }, []);
  const w = sendWindowStatus(now);
  const during = w.state === "during";
  const zones = [
    { name: "北京时间", win: w.window.cn, now: w.now.cn, tag: "" },
    { name: "美东时间", win: w.window.et, now: w.now.et, tag: w.abbr.et },
    { name: "太平洋时间", win: w.window.pt, now: w.now.pt, tag: w.abbr.pt },
  ];

  return (
    <div style={{ borderRadius:14, overflow:"hidden", marginBottom:14, border:`1.5px solid ${during ? T.success : T.accent}` }}>
      <div style={{ padding:"12px 16px", background: during ? T.success : T.grad, color:"#fff",
        display:"flex", alignItems:"center", flexWrap:"wrap", gap:"4px 12px" }}>
        <span style={{ fontSize:FONT.x3l, fontWeight:700 }}>
          📣 请将邀约时间设置为北京时间 <span style={{ fontSize:FONT.kpi }}>{hourLabel(w.cnStart)}</span> 开始发送
        </span>
        <span style={{ fontSize:FONT.lg2, fontWeight:600, opacity:0.95 }}>
          {during ? `现在正在发送窗口内，还剩 ${fmtDuration(w.minutesLeft)}` : `距离发送窗口还有 ${fmtDuration(w.minutesLeft)}`}
        </span>
      </div>

      <div style={{ padding:"12px 16px", background:"rgba(235,242,255,0.6)", display:"flex", flexWrap:"wrap", gap:10 }}>
        {zones.map((z) => (
          <div key={z.name} style={cell}>
            <span style={cap}>{z.name}{z.tag && ` · ${z.tag}`}</span>
            <span style={{ fontSize:FONT.xl2, fontWeight:700, color:T.text }}>发送 {z.win[0]}–{z.win[1]}</span>
            <span style={{ fontSize:FONT.note, color:T.muted }}>现在 {z.now}</span>
          </div>
        ))}
      </div>

      <div style={{ padding:"8px 16px", fontSize:FONT.note, color:T.hint, background:"rgba(235,242,255,0.6)", borderTop:`1px solid ${T.glassStroke}` }}>
        发送窗口按美东时间固定。美国切换夏令时 / 冬令时后，北京开始时间会自动前后调整 1 小时，美国时间不变。
      </div>
    </div>
  );
}
