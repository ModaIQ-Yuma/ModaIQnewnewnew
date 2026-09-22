// modules/tasks/TodayInviteList.jsx — 今日邀约名单
import { T, FONT } from "../../constants/tokens.js";

const WEEK_LABEL = { 1:"周一", 2:"周二", 3:"周三", 4:"周四", 5:"周五", 6:"周六", 7:"周日" };

export default function TodayInviteList({ todayWd, todayProductIds, pendingInvites }) {
  // 按产品分组
  const byProduct = {};
  pendingInvites.forEach((inv) => {
    const name = inv.products?.internal_name || inv.product_id;
    if (!byProduct[name]) byProduct[name] = [];
    byProduct[name].push(inv);
  });

  return (
    <div style={{ background:"rgba(255,255,255,0.55)", border:`1px solid ${T.border}`, borderRadius:14, padding:"16px 18px" }}>
      <div style={{ fontSize:FONT.xl2, fontWeight:700, color:T.text, marginBottom:12 }}>
        📋 今日邀约名单 · {WEEK_LABEL[todayWd]}
      </div>

      {todayProductIds.length === 0 && (
        <div style={{ fontSize:FONT.lg2, color:T.hint }}>今日日程暂无排产品</div>
      )}
      {todayProductIds.length > 0 && Object.keys(byProduct).length === 0 && (
        <div style={{ fontSize:FONT.lg2, color:T.hint }}>今日产品在邀约库中暂无未转化达人</div>
      )}
      {Object.entries(byProduct).map(([productName, invites]) => (
        <div key={productName} style={{ marginBottom:16 }}>
          <div style={{ fontSize:FONT.lg2, fontWeight:700, color:T.accent, marginBottom:8,
            borderLeft:`3px solid ${T.accent}`, paddingLeft:10 }}>
            {productName} · {invites.length} 人
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {invites.map((inv) => (
              <div key={inv.id} style={{ fontSize:FONT.lg2, padding:"6px 14px", borderRadius:10,
                background:"rgba(255,255,255,0.7)", border:`1px solid ${T.border}`, color:T.text }}>
                {inv.creator_id}
                <span style={{ fontSize:FONT.xs, color:T.hint, marginLeft:6 }}>
                  {inv.added_at?.slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
