// modules/review/SnapshotArchive.jsx — 快照记录：按月份/产品筛选、按状态分段、表头排序、分页
import { useMemo, useState } from "react";
import { glassStyle, T, FONT } from "../../constants/tokens.js";
import { PS_COLORS } from "../../constants/products.js";
import { rs } from "./reviewStyles.js";
import { deleteProductSnapshot } from "../../lib/supabase/reviewWrite.js";
import { byProductOrder } from "../../lib/products/productOrder.js";
import { usePaged } from "../../hooks/usePaged.js";
import Pager from "../../components/ui/Pager.jsx";
import SnapshotBackfill from "./SnapshotBackfill.jsx";

const NUM_COLS = [["寄样数", "ship_count"], ["视频数", "video_count"], ["爆单数", "burst_count"], ["视频出单", "orders"], ["总出单", "total_orders"], ["自然单", "organic_orders"]];
const isEmpty = (s) => !s.ship_count && !s.video_count && !s.orders;
const sel = { ...rs.monthInp, cursor: "pointer", minWidth: 120 };

export default function SnapshotArchive({ gradeSnapshots, products, onDeleted, saver }) {
  const months = useMemo(() => [...new Set(gradeSnapshots.map((s) => s.month?.slice(0, 7)))].sort().reverse(), [gradeSnapshots]);
  const [month, setMonth]         = useState("");            // "" = 最近一个月；"all" = 全部月份
  const [productId, setProductId] = useState("");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [sort, setSort]           = useState(null);          // null = 默认（月份↓ + 产品状态）；{ key, desc }
  const pm = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const curMonth = month || months[0] || "";

  const rows = useMemo(() => {
    const byProduct = byProductOrder(products);
    const list = gradeSnapshots.filter((s) => (curMonth === "all" || s.month?.slice(0, 7) === curMonth)
      && (!productId || s.product_id === productId) && (!hideEmpty || !isEmpty(s)));
    return list.sort(sort
      ? (a, b) => ((Number(a[sort.key]) || 0) - (Number(b[sort.key]) || 0)) * (sort.desc ? -1 : 1)
      : (a, b) => String(b.month).localeCompare(String(a.month)) || byProduct(a, b));
  }, [gradeSnapshots, products, curMonth, productId, hideEmpty, sort]);
  const { page, setPage, totalPages, pageRows } = usePaged(rows, 50, `${curMonth}|${productId}|${hideEmpty}|${sort?.key}|${sort?.desc}`);
  const clickSort = (key) => setSort((s) => (s?.key === key ? { key, desc: !s.desc } : { key, desc: true }));
  const statusOf = (s) => pm.get(s.product_id)?.status || "未设置";

  async function handleDelete(id) {
    if (!window.confirm("确认删除此快照？")) return;
    await deleteProductSnapshot(id);
    onDeleted?.();
  }

  return (
    <div>
      <SnapshotBackfill saver={saver} />
      <div style={{ ...rs.toolbar, marginBottom: 12 }}>
        <span style={rs.label}>月份</span>
        <select style={sel} value={curMonth} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">全部月份</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={rs.label}>产品</span>
        <select style={sel} value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">全部产品</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.internal_name}</option>)}
        </select>
        <label style={{ fontSize: FONT.body, color: T.text, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />隐藏没有数据的产品
        </label>
        {sort && <button style={rs.btnGhost} onClick={() => setSort(null)}>恢复默认排序</button>}
        <span style={{ fontSize: FONT.note, color: T.hint, marginLeft: "auto" }}>共 {rows.length} 条 · 默认按月份从新到旧、同月按产品状态分段；点表头可排序</span>
      </div>

      {!rows.length ? <div style={rs.empty}>没有符合条件的快照。</div> : (
        <div style={{ ...glassStyle(14), overflowX: "auto" }}>
          <table style={rs.table}>
            <thead><tr>
              <th style={rs.th}>月份</th><th style={rs.th}>产品</th><th style={rs.th}>状态</th>
              {NUM_COLS.map(([h, k]) => (
                <th key={k} onClick={() => clickSort(k)} style={{ ...rs.thR, cursor: "pointer", whiteSpace: "nowrap", color: sort?.key === k ? T.accent : rs.thR.color }}>
                  {h}{sort?.key === k ? (sort.desc ? " ▼" : " ▲") : " ↕"}
                </th>
              ))}
              <th style={rs.th}>保存时间</th><th style={rs.th}>操作</th>
            </tr></thead>
            <tbody>
              {pageRows.map((s, i) => {
                const prev = pageRows[i - 1], st = statusOf(s);
                const header = !sort && (!prev || prev.month !== s.month || statusOf(prev) !== st);
                const count = header ? rows.filter((r) => r.month === s.month && statusOf(r) === st).length : 0;
                return [
                  header && (
                    <tr key={`h-${s.id}`}><td colSpan={NUM_COLS.length + 5} style={{ ...rs.td, background: `${PS_COLORS[st] || T.hint}14`, fontWeight: 700, color: PS_COLORS[st] || T.muted }}>
                      {s.month?.slice(0, 7)} · {st}（{count}）
                    </td></tr>
                  ),
                  <tr key={s.id}>
                    <td style={{ ...rs.td, fontWeight: 700 }}>{s.month?.slice(0, 7)}</td>
                    <td style={rs.td}>{s.products?.internal_name || "-"}</td>
                    <td style={{ ...rs.td, color: PS_COLORS[st] || T.muted, fontWeight: 600 }}>{st}</td>
                    {NUM_COLS.map(([, k]) => (
                      <td key={k} style={{ ...rs.tdR, fontWeight: k === "orders" ? 700 : 400, color: k === "burst_count" && s[k] > 0 ? T.success : undefined }}>{s[k] ?? "—"}</td>
                    ))}
                    <td style={{ ...rs.td, color: T.muted, fontSize: FONT.note }}>{s.created_at?.slice(0, 16).replace("T", " ")}</td>
                    <td style={rs.td}><button style={rs.btnDanger} onClick={() => handleDelete(s.id)}>删除</button></td>
                  </tr>,
                ];
              })}
            </tbody>
          </table>
          <Pager page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
