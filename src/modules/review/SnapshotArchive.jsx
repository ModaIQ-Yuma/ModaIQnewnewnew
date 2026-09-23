// modules/review/SnapshotArchive.jsx
import { glassStyle, T } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { deleteProductSnapshot } from "../../lib/supabase/reviewWrite.js";
import { byProductOrder } from "../../lib/products/productOrder.js";

export default function SnapshotArchive({ gradeSnapshots, products, onDeleted }) {
  if (!gradeSnapshots.length) {
    return <div style={rs.empty}>暂无快照记录。在「等级复盘」保存快照后此处显示。</div>;
  }

  // 月份从新到旧；同月内按产品状态（爆款 → 合格款 → 可卖款 → 撤退款 → 测款）
  const byProduct = byProductOrder(products);
  const rows = [...gradeSnapshots].sort((a, b) =>
    String(b.month || "").localeCompare(String(a.month || "")) || byProduct(a, b));

  async function handleDelete(id) {
    if (!window.confirm("确认删除此快照？")) return;
    await deleteProductSnapshot(id);
    onDeleted?.();
  }

  return (
    <div style={{ ...glassStyle(14), overflow: "hidden" }}>
      <table style={rs.table}>
        <thead><tr>
          <th style={rs.th}>月份</th>
          <th style={rs.th}>产品</th>
          <th style={rs.thR}>寄样数</th>
          <th style={rs.thR}>视频数</th>
          <th style={rs.thR}>爆单数</th>
          <th style={rs.thR}>出单数</th>
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
              <td style={{ ...rs.td, color: T.muted, fontSize: 12 }}>{s.created_at?.slice(0, 16).replace("T", " ")}</td>
              <td style={rs.td}>
                <button style={rs.btnDanger} onClick={() => handleDelete(s.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
