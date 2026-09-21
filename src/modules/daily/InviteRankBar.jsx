// modules/daily/InviteRankBar.jsx — 助理拉新横向条形图排行（Overview 和 Trend 共用）
import { T } from "../../constants/tokens.js";
import { BAR_PALETTE } from "./dailyStyles.js";

export default function InviteRankBar({ invites, title }) {
  const map = {};
  for (const r of invites) map[r.added_by] = (map[r.added_by] || 0) + r.count;
  const rank = Object.entries(map)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...rank.map((r) => r.count), 1);

  return (
    <div>
      {title && (
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 14 }}>{title}</div>
      )}
      {rank.length === 0 ? (
        <div style={{ color: T.hint, fontSize: 13 }}>暂无拉新数据</div>
      ) : rank.map((r, i) => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 80, fontSize: 12, color: T.muted, textAlign: "right", flexShrink: 0 }}>
            {r.id === "unknown" ? "未知" : `ID:${r.id.slice(0, 8)}`}
          </div>
          <div style={{ flex: 1, background: "rgba(61,127,239,0.08)", borderRadius: 6, height: 22 }}>
            <div style={{
              width: `${(r.count / maxCount) * 100}%`, height: "100%",
              background: BAR_PALETTE[i % BAR_PALETTE.length],
              borderRadius: 6, transition: "width 0.4s",
            }} />
          </div>
          <div style={{ width: 28, fontSize: 13, fontWeight: 700, color: T.text }}>{r.count}</div>
        </div>
      ))}
    </div>
  );
}
