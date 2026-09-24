// modules/invitePool/InvitePoolModule.jsx
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { SectionIntro } from "../../components/layout/SubNav.jsx";
import { checkPoolEntry } from "../../lib/invitePool/poolChecks.js";
import { buildNameIndex } from "../../lib/crm/identity.js";
import { addToPool, removeFromPool } from "../../lib/supabase/unconnectedWrite.js";
import { T, glassStyle } from "../../constants/tokens.js";
import { s } from "./invitePoolStyles.js";

export default function InvitePoolModule({ ctx }) {
  const { storeId, userId, products, core, dataLoading, dataError } = ctx;
  const records = core.invites;
  const canEdit = ctx.can("pool.edit");
  const nameIndex = useMemo(() => buildNameIndex(core.creators, core.aliases), [core.creators, core.aliases]);
  const staffName = (id) => (ctx.staff || []).find((s) => s.id === id)?.name || "未指定";

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
        const productName = (products ?? []).find((p) => p.id === pid)?.internal_name ?? pid;
        const reason = checkPoolEntry({ handle, productId: pid, productName, core, nameIndex, staffName });
        if (reason) { setFormError(reason); setAdding(false); return; }
      }
      await addToPool(storeId, handle, selectedProducts, userId);
      setCreatorHandle(""); setSelectedProducts([]);
      await core.refresh(["invites"]);
    } catch (e) { setFormError(e.message); }
    finally { setAdding(false); }
  }

  async function handleRemove(id) {
    if (!window.confirm("确认删除这条记录？")) return;
    core.removeRows("invites", [id]);
    try { await removeFromPool(id); }
    catch (e) { core.refresh(["invites"]); alert(`删除失败，已恢复：${e.message}`); }
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

  if (dataLoading) return <div style={s.center}>加载中…</div>;
  if (dataError && !records.length) return <div style={s.center}>错误：{dataError}</div>;

  return (
    <div>
      <SectionIntro style={{ marginBottom: 14 }}>
        还没合作过的精选达人名单，供助理后续邀约。录入时自动查重：同一达人 + 同一产品已在邀约库里，或已在 CRM 合作过，都会拦下并提示。
      </SectionIntro>

      {canEdit && <div style={{ ...glassStyle(14), padding: "16px 20px", marginBottom: 16 }}>
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
      </div>}

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
                <td style={{ ...s.td, color: T.muted }}>{r.owner_id ? staffName(r.owner_id) : "-"}</td>
                <td style={{ ...s.td, color: T.muted }}>{r.owned_at?.slice(0, 10) ?? "-"}</td>
                <td style={s.td}>
                  <span style={r.status === "converted" ? s.tagDone : s.tagPending}>
                    {r.status === "converted" ? "已转化" : "未转化"}
                  </span>
                </td>
                <td style={s.td}>
                  {canEdit && r.status === "pending" && (
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
