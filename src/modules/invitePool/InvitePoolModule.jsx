// modules/invitePool/InvitePoolModule.jsx
import { useState } from "react";
import * as XLSX from "xlsx";
import { useUnconnected } from "../../hooks/useUnconnected.js";
import { useProducts } from "../../hooks/useProducts.js";
import {
  checkDuplicateInPool,
  checkDuplicateInCRM,
} from "../../lib/supabase/unconnected.js";
import {
  addToPool,
  removeFromPool,
} from "../../lib/supabase/unconnectedWrite.js";

export default function InvitePoolModule({ ctx }) {
  const { storeId, userId } = ctx;
  const { records, staffId, loading, error, reload } = useUnconnected(storeId, userId);
  const { products } = useProducts(storeId);

  const [filterProduct, setFilterProduct] = useState("all");
  const [filterStatus,  setFilterStatus]  = useState("pending");

  const [creatorHandle,    setCreatorHandle]    = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [adding,           setAdding]           = useState(false);
  const [formError,        setFormError]        = useState("");

  async function handleAdd() {
    setFormError("");
    const handle = creatorHandle.trim();
    if (!handle)                       return setFormError("请输入达人 username");
    if (selectedProducts.length === 0) return setFormError("请至少选择一个产品");
    if (!staffId)                      return setFormError("当前账号未绑定员工档案，请联系管理员");

    setAdding(true);
    try {
      for (const pid of selectedProducts) {
        const dup = await checkDuplicateInPool(storeId, handle, pid);
        if (dup) {
          setFormError(`此达人已在邀约库中（${dup.products?.internal_name}）`);
          return;
        }
        const crmDup = await checkDuplicateInCRM(storeId, handle, pid);
        if (crmDup) {
          const pName = (products ?? []).find((p) => p.id === pid)?.internal_name ?? pid;
          const sName = crmDup.staff?.name ?? "未知";
          setFormError(`此达人已合作 ${pName}，跟进人 ${sName}`);
          return;
        }
      }
      await addToPool(storeId, handle, selectedProducts, staffId);
      setCreatorHandle("");
      setSelectedProducts([]);
      reload();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id) {
    if (!window.confirm("确认删除这条记录？")) return;
    await removeFromPool(id);
    reload();
  }

  function handleExport() {
    const rows = displayRecords.map((r) => ({ 达人username: r.creator_id }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "邀约达人");
    XLSX.writeFile(wb, `邀约库_${Date.now()}.xlsx`);
  }

  const displayRecords = records.filter((r) => {
    if (filterProduct !== "all" && r.product_id !== filterProduct) return false;
    if (filterStatus  !== "all" && r.status     !== filterStatus)  return false;
    return true;
  });

  if (loading) return <div style={s.center}>加载中…</div>;
  if (error)   return <div style={s.center}>错误：{error}</div>;

  return (
    <div style={s.wrap}>
      <h2 style={s.title}>未建连邀约库</h2>

      {/* 录入区 */}
      <div style={s.card}>
        <div style={s.row}>
          <input
            style={s.input}
            placeholder="达人 username（不含 @）"
            value={creatorHandle}
            onChange={(e) => setCreatorHandle(e.target.value)}
          />
          <div style={s.checks}>
            {(products ?? []).map((p) => (
              <label key={p.id} style={s.checkLabel}>
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(p.id)}
                  onChange={(e) =>
                    setSelectedProducts((prev) =>
                      e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)
                    )
                  }
                />
                {p.internal_name}
              </label>
            ))}
          </div>
          <button style={s.btn} onClick={handleAdd} disabled={adding}>
            {adding ? "录入中…" : "+ 录入"}
          </button>
        </div>
        {formError && <div style={s.err}>{formError}</div>}
      </div>

      {/* 筛选栏 */}
      <div style={s.filters}>
        <select style={s.sel} value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
          <option value="all">全部产品</option>
          {(products ?? []).map((p) => <option key={p.id} value={p.id}>{p.internal_name}</option>)}
        </select>
        <select style={s.sel} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="pending">未转化</option>
          <option value="converted">已转化</option>
          <option value="all">全部</option>
        </select>
        <button style={s.btnGhost} onClick={handleExport}>导出达人列表</button>
      </div>

      {/* 列表 */}
      <table style={s.table}>
        <thead>
          <tr>
            {["达人 username","产品","录入人","录入时间","归属人","归属时间","状态","操作"].map((h) => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRecords.length === 0 ? (
            <tr><td colSpan={8} style={s.empty}>暂无记录</td></tr>
          ) : displayRecords.map((r) => (
            <tr key={r.id}>
              <td style={s.td}>{r.creator_id}</td>
              <td style={s.td}>{r.products?.internal_name ?? "-"}</td>
              <td style={s.td}>{r.added_staff?.name ?? "-"}</td>
              <td style={s.td}>{r.added_at?.slice(0, 10)}</td>
              <td style={s.td}>{r.owner_staff?.name ?? "-"}</td>
              <td style={s.td}>{r.owned_at?.slice(0, 10) ?? "-"}</td>
              <td style={s.td}>
                <span style={r.status === "converted" ? s.tagDone : s.tagPending}>
                  {r.status === "converted" ? "已转化" : "未转化"}
                </span>
              </td>
              <td style={s.td}>
                {r.status === "pending" && (
                  <button style={s.btnDanger} onClick={() => handleRemove(r.id)}>删除</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const s = {
  wrap:       { padding: "24px" },
  title:      { fontSize: "20px", fontWeight: 700, marginBottom: "16px" },
  card:       { background: "#1a1a2e", borderRadius: "8px", padding: "16px", marginBottom: "16px" },
  row:        { display: "flex", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" },
  input:      { padding: "8px 12px", borderRadius: "6px", border: "1px solid #333", background: "#0f0f23", color: "#fff", minWidth: "220px" },
  checks:     { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" },
  checkLabel: { display: "flex", gap: "4px", alignItems: "center", color: "#ccc", fontSize: "13px", cursor: "pointer" },
  btn:        { padding: "8px 16px", borderRadius: "6px", background: "#6c63ff", color: "#fff", border: "none", cursor: "pointer" },
  btnGhost:   { padding: "6px 14px", borderRadius: "6px", background: "transparent", color: "#6c63ff", border: "1px solid #6c63ff", cursor: "pointer" },
  btnDanger:  { padding: "4px 10px", borderRadius: "4px", background: "transparent", color: "#ff6b6b", border: "1px solid #ff6b6b", cursor: "pointer", fontSize: "12px" },
  err:        { color: "#ff6b6b", marginTop: "8px", fontSize: "13px" },
  filters:    { display: "flex", gap: "12px", marginBottom: "16px", alignItems: "center" },
  sel:        { padding: "6px 10px", borderRadius: "6px", border: "1px solid #333", background: "#0f0f23", color: "#fff" },
  table:      { width: "100%", borderCollapse: "collapse" },
  th:         { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #333", color: "#888", fontSize: "13px" },
  td:         { padding: "10px 12px", fontSize: "13px", color: "#ccc", borderBottom: "1px solid #111" },
  empty:      { textAlign: "center", padding: "40px", color: "#555" },
  tagPending: { background: "#2a2a4a", color: "#aaa", padding: "2px 8px", borderRadius: "4px", fontSize: "12px" },
  tagDone:    { background: "#1a3a2a", color: "#4caf50", padding: "2px 8px", borderRadius: "4px", fontSize: "12px" },
  center:     { textAlign: "center", padding: "40px", color: "#888" },
};
