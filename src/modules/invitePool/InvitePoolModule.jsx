// modules/invitePool/InvitePoolModule.jsx
import { useState } from "react";
import * as XLSX from "xlsx";
import { useUnconnected } from "../../hooks/useUnconnected.js";
import { useProducts } from "../../hooks/useProducts.js";
import { checkDuplicateInPool, checkDuplicateInCRM } from "../../lib/supabase/unconnected.js";
import { addToPool, removeFromPool } from "../../lib/supabase/unconnectedWrite.js";
import { T, glassStyle } from "../../constants/tokens.js";
import { s } from "./invitePoolStyles.js";

export default function InvitePoolModule({ ctx }) {
  const { storeId, userId } = ctx;
  const { records, loading, error, reload } = useUnconnected(storeId, userId);
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
    if (!handle)                       { setFormError("请输入达人 username"); return; }
    if (selectedProducts.length === 0) { setFormError("请至少选择一个产品"); return; }
    setAdding(true);
    try {
      for (const pid of selectedProducts) {
        const dup = await checkDuplicateInPool(storeId, handle, pid);
        if (dup) { setFormError(`此达人已在邀约库中（${dup.products?.internal_name}）`); setAdding(false); return; }
        const crmDup = await checkDuplicateInCRM(storeId, handle, pid);
        if (crmDup) {
          const pName = (products ?? []).find((p) => p.id === pid)?.internal_name ?? pid;
          setFormError(`此达人已合作 ${pName}，跟进人 ${crmDup.staff?.name ?? "未知"}`);
          setAdding(false); return;
        }
      }
      await addToPool(storeId, handle, selectedProducts, userId);
      setCreatorHandle(""); setSelectedProducts([]); reload();
    } catch (e) { setFormError(e.message); }
    finally { setAdding(false); }
  }

  async function handleRemove(id) {
    if (!window.confirm("确认删除这条记录？")) return;
    await removeFromPool(id); reload();
  }

  function handleExport() {
    const ws = XLSX.utils.json_to_sheet(displayRecords.map((r) => ({ 达人username: r.creator_id })));
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

      <div style={{ ...glassStyle(14), padding: "16px 20px", marginBottom: 16 }}>
        <div style={s.row}>
          <input style={s.input} placeholder="达人 username（不含 @）" value={creatorHandle}
            onChange={(e) => { setCreatorHandle(e.target.value); setFormError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <div style={s.checks}>
            {(products ?? []).map((p) => (
              <label key={p.id} style={s.checkLabel}>
                <input type="checkbox" checked={selectedProducts.includes(p.id)}
                  onChange={(e) => setSelectedProducts((prev) =>
                    e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id))} />
                <span style={{ color: T.text, fontSize: 13 }}>{p.internal_name}</span>
              </label>
            ))}
          </div>
          <button style={s.btn} onClick={handleAdd} disabled={adding}>
            {adding ? "录入中…" : "+ 录入"}
          </button>
        </div>
        {formError && <div style={s.err}>{formError}</div>}
      </div>

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

      <div style={{ ...glassStyle(14), overflow: "hidden" }}>
        <table style={s.table}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.glassStroke}` }}>
              {["达人 username","产品","录入时间","归属人","归属时间","状态","操作"].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRecords.length === 0 ? (
              <tr><td colSpan={7} style={s.empty}>暂无记录</td></tr>
            ) : displayRecords.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: i < displayRecords.length - 1 ? `1px solid ${T.glassStroke}` : "none" }}>
                <td style={s.td}><span style={s.handle}>{r.creator_id}</span></td>
                <td style={s.td}><span style={s.productTag}>{r.products?.internal_name ?? "-"}</span></td>
                <td style={{ ...s.td, color: T.muted }}>{r.added_at?.slice(0, 10)}</td>
                <td style={{ ...s.td, color: T.muted }}>{r.owner_id ? "已归属" : "-"}</td>
                <td style={{ ...s.td, color: T.muted }}>{r.owned_at?.slice(0, 10) ?? "-"}</td>
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
    </div>
  );
}
