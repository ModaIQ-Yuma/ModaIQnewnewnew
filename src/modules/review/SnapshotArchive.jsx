// modules/review/SnapshotArchive.jsx — 快照记录 + 补存历史快照
import { useState } from "react";
import { glassStyle, T, FONT } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { Hint } from "../../components/layout/SubNav.jsx";
import { deleteProductSnapshot } from "../../lib/supabase/reviewWrite.js";
import { byProductOrder } from "../../lib/products/productOrder.js";
import { monthRange } from "../../lib/review/snapshotPlan.js";
import { describeSave } from "./snapshotUi.js";

const prevYm = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); };

/** 补存历史快照：历史视频按「6 号到下月 5 号」全部导完后，一次按口径存多个月 */
function Backfill({ saver }) {
  const [from, setFrom] = useState(`${new Date().getFullYear() - 1}-01`);
  const [to, setTo]     = useState(prevYm());
  const [msg, setMsg]   = useState("");
  async function run() {
    const months = monthRange(from, to);
    if (!months.length) { setMsg("开始月份不能晚于结束月份"); return; }
    if (!window.confirm(`将按「当月发布的视频，数据截止次月 5 日」重新计算并保存 ${months.length} 个月的快照（已有的同月快照会被覆盖）。视频数据还没导到截止日的月份会自动跳过。继续吗？`)) return;
    setMsg("计算中…");
    try { setMsg(describeSave(await saver.saveMonths(months))); }
    catch (e) { setMsg(`❌ ${e.message}`); }
  }
  return (
    <div style={{ ...glassStyle(14), padding: "14px 18px", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: FONT.h3, fontWeight: 700, color: T.text }}>📚 补存历史快照</span>
        <input type="month" style={rs.monthInp} value={from} onChange={(e) => setFrom(e.target.value)} />
        <span style={{ color: T.hint }}>—</span>
        <input type="month" style={rs.monthInp} value={to} onChange={(e) => setTo(e.target.value)} />
        <button style={rs.btn} disabled={saver.busy} onClick={run}>{saver.busy ? "保存中…" : "按口径补存"}</button>
        {msg && <span style={{ fontSize: FONT.note, color: msg.startsWith("❌") ? T.danger : T.text }}>{msg}</span>}
      </div>
      <Hint style={{ marginTop: 6 }}>
        重建历史时用：先把历史视频按「6 号到下月 5 号」的文件全部导完（文件名写成「20250106到20250205所有视频」），再在这里选月份一次补存。
        系统按文件名识别每批数据的区间，只累加到次月 5 号为止，和每月按时保存的结果一致。
      </Hint>
    </div>
  );
}

export default function SnapshotArchive({ gradeSnapshots, products, onDeleted, saver }) {
  const byProduct = byProductOrder(products);   // 月份从新到旧；同月内按产品状态排
  const rows = [...gradeSnapshots].sort((a, b) =>
    String(b.month || "").localeCompare(String(a.month || "")) || byProduct(a, b));

  async function handleDelete(id) {
    if (!window.confirm("确认删除此快照？")) return;
    await deleteProductSnapshot(id);
    onDeleted?.();
  }

  return (
    <div>
      <Backfill saver={saver} />
      {!rows.length ? <div style={rs.empty}>暂无快照记录。</div> : (
      <div style={{ ...glassStyle(14), overflow: "hidden" }}>
      <table style={rs.table}>
        <thead><tr>
          <th style={rs.th}>月份</th>
          <th style={rs.th}>产品</th>
          <th style={rs.thR}>寄样数</th>
          <th style={rs.thR}>视频数</th>
          <th style={rs.thR}>爆单数</th>
          <th style={rs.thR}>视频出单</th>
          <th style={rs.thR}>总出单</th>
          <th style={rs.thR}>自然单</th>
          <th style={rs.th}>保存时间</th>
          <th style={rs.th}>操作</th>
        </tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td style={{ ...rs.td, fontWeight: 700 }}>{s.month?.slice(0, 7)}</td>
              <td style={rs.td}>{s.products?.internal_name || "-"}</td>
              <td style={rs.tdR}>{s.ship_count}</td>
              <td style={rs.tdR}>{s.video_count}</td>
              <td style={{ ...rs.tdR, color: s.burst_count > 0 ? T.success : T.hint, fontWeight: 600 }}>{s.burst_count}</td>
              <td style={{ ...rs.tdR, fontWeight: 600 }}>{s.orders}</td>
              <td style={rs.tdR}>{s.total_orders ?? "—"}</td>
              <td style={rs.tdR}>{s.organic_orders ?? "—"}</td>
              <td style={{ ...rs.td, color: T.muted, fontSize: 12 }}>{s.created_at?.slice(0, 16).replace("T", " ")}</td>
              <td style={rs.td}>
                <button style={rs.btnDanger} onClick={() => handleDelete(s.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      )}
    </div>
  );
}
