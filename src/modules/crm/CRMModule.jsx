import { useState, useMemo, Fragment } from "react";
import { usePaged } from "../../hooks/usePaged.js";
import Pager from "../../components/ui/Pager.jsx";
import { T } from "../../constants/tokens.js";
import { OFFICIAL_GRADES } from "../../constants/creatorOptions.js";
import { CRM_STATUSES, STATUS_COLORS } from "../../constants/crm.js";
import { cumOrders } from "../../lib/crm/cumOrders.js";
import { computeStatus } from "../../lib/crm/crmFlow.js";
import { Inp, Sel, Btn, Badge } from "../../components/ui/index.jsx";
import { SectionIntro } from "../../components/layout/SubNav.jsx";
import { REPOST_THRESHOLD_ORDERS } from "../../constants/config.js";
import InfluencerEntryPanel from "./InfluencerEntryPanel.jsx";
import InfluencerDetailRow  from "./InfluencerDetailRow.jsx";
import CRMImportModal       from "./CRMImportModal.jsx";
import AddShipmentButton    from "./AddShipmentButton.jsx";
import { useCRM } from "../../hooks/useCRM.js";
import { exportCRM } from "../../lib/crm/crmExport.js";
import { normName } from "../../lib/crm/identity.js";

const COLS = ["达人ID","合作产品","寄样时间","跟进人","寄样时等级","合作进度","累计出单","合作备注",""];
const linkBtn = (c) => ({ border:"none", background:"transparent", color:c, cursor:"pointer", fontSize:13, padding:0 });
const PAGE_SIZE = 50;

export default function CRMModule({ ctx }) {
  const { storeId, core, products } = ctx;
  const crm = useCRM(storeId, core, products);
  const { influencers, staff, loading, remove, updateStatus, bulkRemove } = crm;

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
  const [selected,   setSelected]   = useState(() => new Set());
  const [notice,     setNotice]     = useState("");
  const readonly  = !ctx.can("crm.edit");
  const canDelete = ctx.can("crm.delete");
  const staffName = (id) => staff.find((s) => String(s.id) === String(id))?.name || "—";
  const rows = useMemo(() => influencers.filter((i) => {
    if (q        && ![i.influencerId, ...i.aliases].some((n) => n.includes(normName(q)))) return false;
    if (fStatus  && computeStatus(i) !== fStatus)                                   return false;
    if (fGrade   && i.official_grade !== fGrade)                                     return false;
    if (fProduct && i.product !== fProduct)                                          return false;
    if (fStaff   && String(i.staffId) !== String(fStaff))                           return false;
    if (fDateFrom && (i.shipDate || "") < fDateFrom)                                return false;
    if (fDateTo   && (i.shipDate || "") > fDateTo)                                  return false;
    return true;
  }).sort((a, b) => (b.shipDate || "").localeCompare(a.shipDate || "")),
  [influencers, q, fStatus, fGrade, fProduct, fStaff, fDateFrom, fDateTo]);
  const { page, setPage, totalPages, pageRows } = usePaged(rows, PAGE_SIZE, [q, fStatus, fGrade, fProduct, fStaff, fDateFrom, fDateTo].join("|"));
  const visibleIds = useMemo(() => new Set(pageRows.map((r) => r.id)), [pageRows]);
  const effectiveSelected = useMemo(() => new Set([...selected].filter((id) => visibleIds.has(id))), [selected, visibleIds]);

  const toggleOne  = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSel     = pageRows.length > 0 && pageRows.every((r) => effectiveSelected.has(r.id));
  const toggleAll  = () => setSelected(allSel ? new Set() : new Set(pageRows.map((r) => r.id)));
  const bulkDelete = async () => {
    if (!effectiveSelected.size) return;
    if (!confirm(`确认删除选中的 ${effectiveSelected.size} 条记录？`)) return;
    setSelected(new Set());
    bulkRemove(effectiveSelected).catch((e) => alert(`删除失败，已恢复：${e.message}`));
  };

  const onSaved = (res) => {
    setEditing(null);
    const p = res?.pool;
    if (p && (p.owned || p.converted)) { setNotice(`📥 该达人在邀约库中：${p.owned} 条已归属给跟进人，${p.converted} 条已标记转化`); setTimeout(() => setNotice(""), 6000); }
  };
  const changeStatus = (inf, v) => updateStatus(inf, v).catch((e) => alert(`状态保存失败，已恢复：${e.message}`));
  const updateInline = (inf) => changeStatus(inf, inf.baseStatus);
  const del = (id) => { if (confirm("确认删除？关联视频将变为非CRM视频。")) remove(id).catch((e) => alert(`删除失败，已恢复：${e.message}`)); };

  const th = { fontSize:12, fontWeight:800, color:"#0A1628", textAlign:"left", padding:"10px 12px", whiteSpace:"nowrap", borderBottom:"2px solid #B8C4D8" };
  const td = { fontSize:13, color:"#0A1628", padding:"9px 12px", borderBottom:"1px solid #D8E0EC", verticalAlign:"middle" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <SectionIntro style={{ flex: "1 1 420px" }}>
          每行 = 一次寄样（达人 × 产品），同一达人寄同一产品多次即复投，各占一行。等级、体型等属性记录的是<b>寄样当时</b>的情况；别名和达人备注跟着人走，所有寄样共用。
          合作进度自动计算：有视频 → 已发布，累计出单 ≥ {REPOST_THRESHOLD_ORDERS} 单 → 待复投；「复投完成 / 不合作」需手动选择。点击行展开明细。
        </SectionIntro>
        {!readonly && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
            {ctx.can("crm.import") && <button onClick={() => setShowImport(true)} style={{ padding: "10px 18px", borderRadius: 999, border: `1.5px solid ${T.border}`, background: "rgba(255,255,255,0.7)", color: T.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📥 批量导入</button>}
            <AddShipmentButton onClick={() => setEditing("new")} />
          </div>
        )}
      </div>
      {notice && <div style={{ fontSize: 13, color: T.success, background: `${T.success}12`, border: `1px solid ${T.success}40`, borderRadius: 10, padding: "8px 14px", marginBottom: 12 }}>{notice}</div>}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
        <span style={{ fontSize: 13, fontWeight:700, color:T.muted, whiteSpace:"nowrap" }}>寄样时间</span>
        <input type="date" value={fDateFrom} onChange={(e) => setFDateFrom(e.target.value)} style={{ background:"rgba(255,255,255,0.45)", border:`1.5px solid ${T.border}`, borderRadius:10, fontSize:13, padding:"7px 11px", fontFamily:"inherit", outline:"none" }} />
        <span style={{ color:T.hint }}>—</span>
        <input type="date" value={fDateTo} onChange={(e) => setFDateTo(e.target.value)} style={{ background:"rgba(255,255,255,0.45)", border:`1.5px solid ${T.border}`, borderRadius:10, fontSize:13, padding:"7px 11px", fontFamily:"inherit", outline:"none" }} />
        <button onClick={() => { setFDateFrom(""); setFDateTo(""); }} style={{ fontSize:12, color:T.muted, background:"none", border:`1px solid ${T.border}`, borderRadius:8, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit" }}>清除</button>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", marginBottom:14 }}>
        <div style={{ width:180 }}><Inp value={q} onChange={setQ} placeholder="搜索达人ID / 别名" /></div>
        <Sel value={fStatus} onChange={setFStatus}><option value="">全部进度</option>{CRM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Sel>
        <Sel value={fGrade} onChange={setFGrade}><option value="">全部等级</option>{OFFICIAL_GRADES.map((g) => <option key={g.value} value={g.value}>{g.value}</option>)}</Sel>
        <Sel value={fProduct} onChange={setFProduct}><option value="">全部产品</option>{products.map((p) => <option key={p.id} value={p.internal_name}>{p.internal_name}</option>)}</Sel>
        <Sel value={fStaff} onChange={setFStaff}><option value="">全部跟进人</option>{staff.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}</Sel>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          {canDelete && effectiveSelected.size > 0 && <Btn small danger onClick={bulkDelete}>批量删除（{effectiveSelected.size}）</Btn>}
          <Btn small onClick={() => exportCRM(rows, staffName)}>导出 xlsx</Btn>
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <div style={{ fontSize:12, color:T.hint }}>共 {rows.length} 条{rows.length > 0 && ` · 第 ${page}/${totalPages} 页`}</div>
        {loading && <span style={{ fontSize: 12, color:T.accent, background:`${T.accent}12`, border:`1px solid ${T.accent}35`, borderRadius:20, padding:"3px 11px", fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:T.accent, display:"inline-block", opacity:0.85 }} />数据同步中…
        </span>}
      </div>

      <div style={{ background:"#fff", border:`1.5px solid ${T.border}`, borderRadius:14, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:880 }}>
            <thead><tr>
              {canDelete && <th style={{ ...th, width:36 }}><input type="checkbox" checked={allSel} onChange={toggleAll} style={{ cursor:"pointer" }} /></th>}
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
                    <tr onClick={() => setExpandedId(open ? null : i.id)} style={{ cursor:"pointer", background:open?"rgba(255,255,255,0.45)":"transparent" }}>
                      {canDelete && <td style={td} onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={effectiveSelected.has(i.id)} onChange={() => toggleOne(i.id)} style={{ cursor:"pointer" }} /></td>}
                      <td style={{ ...td, fontWeight:700 }}>{i.influencerId}{i.aliases.length > 0 && <span title={i.aliases.join("、")} style={{ fontSize:11, color:T.hint, fontWeight:400, marginLeft:5 }}>+{i.aliases.length} 别名</span>}</td>
                      <td style={td}>{i.product || "—"}{i.productColor ? <span style={{ fontSize:11, color:T.hint, marginLeft:4 }}>({i.productColor})</span> : null}</td>
                      <td style={td}>{i.shipDate || "—"}</td>
                      <td style={td}>{staffName(i.staffId)}</td>
                      <td style={td}>{i.official_grade || "—"}</td>
                      <td style={td} onClick={(e) => e.stopPropagation()}>
                        {readonly ? <Badge label={status} color={STATUS_COLORS[status]||T.muted} /> :
                          <Sel value={status} onChange={(v) => changeStatus(i, v)} style={{ fontSize:12, padding:"5px 8px", color:STATUS_COLORS[status]||T.text }}>
                            {CRM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </Sel>}
                      </td>
                      <td style={{ ...td, fontWeight:700, color:T.accent }}>{cumOrders(i)}</td>
                      <td style={{ ...td, maxWidth:160, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{i.note||"—"}</td>
                      <td style={td} onClick={(e) => e.stopPropagation()}>
                        {!readonly && <span style={{ display:"flex", gap:8, whiteSpace:"nowrap" }}>
                          <button onClick={() => setEditing(i)} style={linkBtn(T.accent)}>编辑</button>
                          {canDelete && <button onClick={() => del(i.id)} style={linkBtn(T.hint)}>删除</button>}
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

      <Pager page={page} totalPages={totalPages} onChange={setPage} />

      {showImport && (
        <CRMImportModal storeId={storeId} core={core} products={products} onClose={() => setShowImport(false)} onDone={() => crm.reload()} />
      )}
      {editing && (
        <InfluencerEntryPanel initial={editing === "new" ? null : editing} products={products} staff={staff}
          crm={crm} onSaved={onSaved} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}