// modules/tasks/TodayInviteList.jsx — 今日邀约名单：按产品分组，默认收起；可单个导出或一键导出全部
import { useState } from "react";
import * as XLSX from "xlsx";
import { T, FONT } from "../../constants/tokens.js";
import { byProductOrder } from "../../lib/products/productOrder.js";
import { pstDay, todayPST } from "../../lib/dates.js";
import { buildInviteSheets } from "../../lib/invitePool/inviteExport.js";
import InviteClock from "./InviteClock.jsx";

const WEEK_LABEL = { 1:"周一", 2:"周二", 3:"周三", 4:"周四", 5:"周五", 6:"周六", 7:"周日" };
const smallBtn = (primary) => ({ fontSize:FONT.note, padding:"4px 12px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
  border: primary ? "none" : `1px solid ${T.accent}`, background: primary ? T.grad : "transparent", color: primary ? "#fff" : T.accent, fontWeight:600 });

/** 写出 Excel：每组一个工作表 */
function downloadSheets(groups, fileLabel) {
  const wb = XLSX.utils.book_new();
  for (const { sheet, rows } of buildInviteSheets(groups)) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheet);
  XLSX.writeFile(wb, `今日邀约_${fileLabel}_${todayPST()}.xlsx`);
}

export default function TodayInviteList({ todayWd, todayProductIds, pendingInvites, products = [] }) {
  const [open, setOpen] = useState({});                        // 展开了哪些产品

  // 按产品分组；分组顺序按产品状态（爆款 → 合格款 → 可卖款 → 撤退款 → 测款）
  const byProduct = {};
  [...pendingInvites].sort(byProductOrder(products)).forEach((inv) => {
    const name = inv.products?.internal_name || inv.product_id;
    if (!byProduct[name]) byProduct[name] = [];
    byProduct[name].push(inv);
  });
  const groups = Object.entries(byProduct);
  const total = pendingInvites.length;

  return (
    <div style={{ background:"rgba(255,255,255,0.55)", border:`1px solid ${T.border}`, borderRadius:14, padding:"16px 18px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <span style={{ fontSize:FONT.xl2, fontWeight:700, color:T.text }}>📋 今日邀约名单 · {WEEK_LABEL[todayWd]}</span>
        {total > 0 && <span style={{ fontSize:FONT.note, color:T.hint }}>共 {total} 人</span>}
        <div style={{ flex:1 }} />
        {groups.length > 0 && <button style={smallBtn(true)} onClick={() => downloadSheets(byProduct, "全部")}>一键导出全部</button>}
      </div>
      <InviteClock />

      {todayProductIds.length === 0 && (
        <div style={{ fontSize:FONT.lg2, color:T.hint }}>今日日程暂无排产品</div>
      )}
      {todayProductIds.length > 0 && groups.length === 0 && (
        <div style={{ fontSize:FONT.lg2, color:T.hint }}>今日产品在邀约库中暂无未转化达人</div>
      )}
      {groups.map(([productName, invites]) => (
        <div key={productName} style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, borderLeft:`3px solid ${T.accent}`, paddingLeft:10 }}>
            <span style={{ fontSize:FONT.lg2, fontWeight:700, color:T.accent }}>{productName} · {invites.length} 人</span>
            <button style={smallBtn(false)} onClick={() => downloadSheets({ [productName]: invites }, productName)}>导出</button>
            <button style={{ ...smallBtn(false), border:"none" }} onClick={() => setOpen((o) => ({ ...o, [productName]: !o[productName] }))}>
              {open[productName] ? "收起" : "展开名单"}
            </button>
          </div>
          {open[productName] && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:8, maxHeight:320, overflowY:"auto" }}>
              {invites.map((inv) => (
                <div key={inv.id} style={{ fontSize:FONT.lg2, padding:"6px 14px", borderRadius:10,
                  background:"rgba(255,255,255,0.7)", border:`1px solid ${T.border}`, color:T.text }}>
                  {inv.creator_id}
                  <span style={{ fontSize:FONT.xs, color:T.hint, marginLeft:6 }}>{pstDay(inv.added_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
