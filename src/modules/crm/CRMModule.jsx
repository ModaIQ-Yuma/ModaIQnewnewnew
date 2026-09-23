import { useState, useMemo, useEffect, Fragment } from "react";
import { T } from "../../constants/tokens.js";
import { OFFICIAL_GRADES, CREATOR_FIELDS as INFLUENCER_FIELDS, labelOf } from "../../constants/creatorOptions.js";
import { CRM_STATUSES, STATUS_COLORS } from "../../constants/crm.js";
import { cumOrders } from "../../lib/crm/cumOrders.js";
import { computeStatus } from "../../lib/crm/crmFlow.js";
import { Inp, Sel, Btn, Badge } from "../../components/ui/index.jsx";
import InfluencerEntryPanel from "./InfluencerEntryPanel.jsx";
import InfluencerDetailRow  from "./InfluencerDetailRow.jsx";
import CRMImportModal       from "./CRMImportModal.jsx";
import { useCRM } from "../../hooks/useCRM.js";
import { useProducts } from "../../hooks/useProducts.js";
import * as XLSX from "xlsx";
import { todayPST } from "../../lib/utils.js";

const COLS = ["达人ID","合作产品","寄样时间","跟进人","官方等级","合作进度","累计出单","备注",""];
const linkBtn = (c) => ({ border:"none", background:"transparent", color:c, cursor:"pointer", fontSize:13, padding:0 });
const PAGE_SIZE = 50;

export default function CRMModule({ ctx }) {
  const { storeId } = ctx;
  const { products } = useProducts(storeId);
  const crm = useCRM(storeId, products);
  const { influencers, staff, loading, error, loadVideos, save, remove, updateStatus, bulkRemove, addStaff } = crm;

  const [q,          setQ]          = useState("");
  const [fStatus,    setFStatus]    = useState("");
  const [fGrade,     setFGrade]     = useState("");
  const [fProduct,   setFProduct]   = useState("");
  const [fStaff,     setFStaff]     = useState("");
  const [fDateFrom,  setFDateFrom]  = useState("");
  const [fDateTo,    setFDateTo]    = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [editing,    setEditing]    = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [page,       setPage]       = useState(1);
  const [selected,   setSelected]   = useState(() => new Set());
  const readonly = ctx.role === "viewer";
  const staffName = (id) => staff.find((s) => String(s.id) === String(id))?.name || "—";
  const rows = useMemo(() => influencers.filter((i) => {
    if (q        && !(i.influencerId || "").toLowerCase().includes(q.toLowerCase())) return false;
    if (fStatus  && computeStatus(i) !== fStatus)                                   return false;
    if (fGrade   && i.official_grade !== fGrade)                                     return false;
    if (fProduct && i.product !== fProduct)                                          return false;
    if (fStaff   && String(i.staffId) !== String(fStaff))                           return false;
    if (fDateFrom && (i.shipDate || "") < fDateFrom)                                return false;
    if (fDateTo   && (i.shipDate || "") > fDateTo)                                  return false;
    return true;
  }).sort((a, b) => (b.shipDate || "").localeCompare(a.shipDate || "")),
  [influencers, q, fStatus, fGrade, fProduct, fStaff, fDateFrom, fDateTo]);

  useEffect(() => { setPage(1); }, [q, fStatus, fGrade, fProduct, fStaff, fDateFrom, fDateTo]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows   = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]);
  const visibleIds = useMemo(() => new Set(pageRows.map((r) => r.id)), [pageRows]);
  const effectiveSelected = useMemo(() => new Set([...selected].filter((id) => visibleIds.has(id))), [selected, visibleIds]);

  const toggleOne  = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSel     = pageRows.length > 0 && pageRows.every((r) => effectiveSelected.has(r.id));
  const toggleAll  = () => setSelected(allSel ? new Set() : new Set(pageRows.map((r) => r.id)));
  const bulkDelete = async () => {
    if (!effectiveSelected.size) return;
    if (!confirm(`确认删除选中的 ${effectiveSelected.size} 条记录？`)) return;
    await bulkRemove(effectiveSelected); setSelected(new Set());
  };

  const saveAndClose = async (inf) => { await save(inf); setEditing(null); };
  const updateInline = async (inf) => { await updateStatus(inf, inf.baseStatus); };
  const del = (id) => { if (confirm("确认删除？关联视频将变为非CRM视频。")) remove(id); };

  function exportXLSX() {
    const data = rows.map((i) => {
      const attrs = Object.fromEntries(INFLUENCER_FIELDS.map((f) => {
        const v = i[f.key];
        return [f.label, f.type === "multi" ? (v?.length ? v.map((x) => labelOf(f.key, x)).join("、") : "") : labelOf(f.key, v) || ""];
      }));
      return {
        "达人ID": i.influencerId, "合作产品": i.product, "颜色": i.productColor,
        "寄样时间": i.shipDate, "跟进人": staffName(i.staffId),
        "合作进度": computeStatus(i), "累计出单": cumOrders(i),
        "视频数": (i.videoRecords || []).length, "备注": i.note, ...attrs,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CRM");
    XLSX.writeFile(wb, `CRM_${todayPST()}.xlsx`);
  }

  const th = { fontSize:12, fontWeight:800, color:"#0A1628", textAlign:"left", padding:"10px 12px", whiteSpace:"nowrap", borderBottom:"2px solid #B8C4D8" };
  const td = { fontSize:13, color:"#0A1628", padding:"9px 12px", borderBottom:"1px solid #D8E0EC", verticalAlign:"middle" };

  return (
    <div>
      {/* 时间筛选 */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
        <span style={{ fontSize:12.5, fontWeight:700, color:T.muted, whiteSpace:"nowrap" }}>寄样时间</span>
        <input type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)} style={{ background:"rgba(255,255,255,0.45)", border:`1.5px solid ${T.border}`, borderRadius:10, fontSize:13, padding:"7px 11px", fontFamily:"inherit", outline:"none" }} />
        <span style={{ color:T.hint }}>—</span>
        <input type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)} style={{ background:"rgba(255,255,255,0.45)", border:`1.5px solid ${T.border}`, borderRadius:10, fontSize:13, padding:"7px 11px", fontFamily:"inherit", outline:"none" }} />
        <button onClick={() => { setFDateFrom(""); setFDateTo(""); }} style={{ fontSize:12, color:T.muted, background:"none", border:`1px solid ${T.border}`, borderRadius:8, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit" }}>清除</button>
      </div>
      {/* 其他筛选 */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", marginBottom:14 }}>
        <div style={{ width:180 }}><Inp value={q} onChange={setQ} placeholder="搜索达人ID" /></div>
        <Sel value={fStatus} onChange={setFStatus}><option value="">全部进度</option>{CRM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Sel>
        <Sel value={fGrade} onChange={setFGrade}><option value="">全部等级</option>{OFFICIAL_GRADES.map((g) => <option key={g.value} value={g.value}>{g.value}</option>)}</Sel>
        <Sel value={fProduct} onChange={setFProduct}><option value="">全部产品</option>{products.map((p) => <option key={p.id} value={p.internal_name}>{p.internal_name}</option>)}</Sel>
        <Sel value={fStaff} onChange={setFStaff}><option value="">全部跟进人</option>{staff.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}</Sel>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          {!readonly && effectiveSelected.size > 0 && <Btn small danger onClick={bulkDelete}>批量删除（{effectiveSelected.size}）</Btn>}
          <Btn small onClick={exportXLSX}>导出 xlsx</Btn>
          {!readonly && <Btn small accent onClick={() => setEditing("new")}>+ 新增达人</Btn>}
          {!readonly && <Btn small onClick={() => setShowImport(true)}>📥 批量导入</Btn>}
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <div style={{ fontSize:12, color:T.hint }}>共 {rows.length} 条{rows.length > 0 && ` · 第 ${page}/${totalPages} 页`}</div>
        {loading && <span style={{ fontSize:11.5, color:T.accent, background:`${T.accent}12`, border:`1px solid ${T.accent}35`, borderRadius:20, padding:"3px 11px", fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:T.accent, display:"inline-block", opacity:0.85 }} />数据同步中…
        </span>}
      </div>

      <div style={{ background:"#fff", border:`1.5px solid ${T.border}`, borderRadius:14, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:880 }}>
            <thead><tr>
              {!readonly && <th style={{ ...th, width:36 }}><input type="checkbox" checked={allSel} onChange={toggleAll} style={{ cursor:"pointer" }} /></th>}
              {COLS.map((c, i) => <th key={i} style={th}>{c}</th>)}
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={COLS.length+1} style={{ ...td, textAlign:"center", color:T.hint, padding:30 }}>加载中…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={COLS.length+1} style={{ ...td, textAlign:"center", color:T.hint, padding:30 }}>暂无数据</td></tr>}
              {pageRows.map((i) => {
                const open   = expandedId === i.id;
                const status = computeStatus(i);
                return (
                  <Fragment key={i.id}>
                    <tr onClick={() => { setExpandedId(open ? null : i.id); if (!open) loadVideos(i); }} style={{ cursor:"pointer", background:open?"rgba(255,255,255,0.45)":"transparent" }}>
                      {!readonly && <td style={td} onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={effectiveSelected.has(i.id)} onChange={() => toggleOne(i.id)} style={{ cursor:"pointer" }} /></td>}
                      <td style={{ ...td, fontWeight:700 }}>{i.influencerId}</td>
                      <td style={td}>{i.product || "—"}{i.productColor ? <span style={{ fontSize:11, color:T.hint, marginLeft:4 }}>({i.productColor})</span> : null}</td>
                      <td style={td}>{i.shipDate || "—"}</td>
                      <td style={td}>{staffName(i.staffId)}</td>
                      <td style={td}>{i.official_grade || "—"}</td>
                      <td style={td} onClick={(e) => e.stopPropagation()}>
                        {readonly ? <Badge label={status} color={STATUS_COLORS[status]||T.muted} /> :
                          <Sel value={status} onChange={(v) => updateStatus(i, v)} style={{ fontSize:12, padding:"5px 8px", color:STATUS_COLORS[status]||T.text }}>
                            {CRM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </Sel>}
                      </td>
                      <td style={{ ...td, fontWeight:700, color:T.accent }}>{cumOrders(i)}</td>
                      <td style={{ ...td, maxWidth:160, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{i.note||"—"}</td>
                      <td style={td} onClick={(e) => e.stopPropagation()}>
                        {!readonly && <span style={{ display:"flex", gap:8, whiteSpace:"nowrap" }}>
                          <button onClick={() => setEditing(i)} style={linkBtn(T.accent)}>编辑</button>
                          <button onClick={() => del(i.id)} style={linkBtn(T.hint)}>删除</button>
                        </span>}
                      </td>
                    </tr>
                    {open && <tr><td colSpan={COLS.length+(readonly?0:1)} style={{ padding:0 }}>
                      <InfluencerDetailRow inf={i} readonly={readonly} onChange={updateInline} />
                    </td></tr>}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginTop:14 }}>
          <Btn small onClick={() => setPage((p) => Math.max(1,p-1))} disabled={page===1}>‹ 上一页</Btn>
          <span style={{ fontSize:13, color:T.muted }}>第 {page} / {totalPages} 页</span>
          <Btn small onClick={() => setPage((p) => Math.min(totalPages,p+1))} disabled={page===totalPages}>下一页 ›</Btn>
        </div>
      )}

      {showImport && (
        <CRMImportModal
          storeId={storeId}
          onClose={() => setShowImport(false)}
          onDone={crm.reload}
        />
      )}
      {editing && (
        <InfluencerEntryPanel
          initial={editing === "new" ? null : editing}
          products={products} staff={staff}
          influencers={influencers} shippingGoals={[]}
          onSubmit={saveAndClose}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}