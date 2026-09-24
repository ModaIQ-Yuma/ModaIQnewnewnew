// modules/videos/VideosModule.jsx
import { useMemo, useRef, useState } from "react";
import { useVideoBatches } from "../../hooks/useVideoBatches.js";
import { glassStyle, T } from "../../constants/tokens.js";
import SubNav, { Hint } from "../../components/layout/SubNav.jsx";
import { vs } from "./videosStyles.js";
import VideoTable from "./VideoTable.jsx";
import { parseVideoXlsx } from "../../lib/video/videoParser.js";
import { importVideos } from "../../lib/supabase/videosWrite.js";
import { buildVideoImportPlan, buildVideoLookup } from "../../lib/video/videoImportPlan.js";
import { buildNameIndex } from "../../lib/crm/identity.js";
import { checkNewWindow } from "../../lib/video/cutoff.js";
import { ORDER_WINDOW_TAIL_DAYS } from "../../constants/config.js";
import { revertBatch } from "../../lib/supabase/videosRevert.js";

const TABS = [
  { id: "imported", label: "导入视频",  desc: "上传 TK 后台导出的视频 xlsx，系统按达人名称匹配 CRM 寄样记录（优先同一商品 ID），这里列出已匹配上的视频。同一视频再次导入会把数据累加上去，所以同一时段不要重复导入；导错了可在「导入批次」里撤销。" },
  { id: "noncrm",   label: "非CRM视频", desc: "达人不在 CRM 里、但有出单的视频（没出单的非 CRM 视频导入时直接跳过）。如果其实是某位已合作达人换了名字，可点「归入 CRM」归到对应寄样记录。" },
];
// 影响合作归属的写操作后需要同步的核心表
const LINKED = ["videos", "collabs", "creators", "aliases"];

export default function VideosModule({ ctx }) {
  const { storeId, userId, core, products, dataLoading, dataError } = ctx;
  const { batches, reload: reloadBatches } = useVideoBatches(storeId);
  const canImport = ctx.can("video.import"), canRevert = ctx.can("video.revert");
  const reload = () => { core.refresh(LINKED); reloadBatches(); };
  // 视频行附上产品简称（表格按 v.products.internal_name 显示）
  const videos = useMemo(() => {
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    return core.videos.map((v) => ({ ...v, products: byId[v.product_id] || null }))
      .sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""));
  }, [core.videos, products]);
  const [tab,       setTab]       = useState("imported");
  const [importing,  setImporting]  = useState(false);
  const [modal,      setModal]      = useState(null);
  const [errMsg,     setErrMsg]     = useState(null);
  const [batchOpen,  setBatchOpen]  = useState(false);
  const [mergeMsg,   setMergeMsg]   = useState("");
  const [allBatches, setAllBatches] = useState(false);
  const [reverting,  setReverting]  = useState(null);
  const fileRef = useRef(null);

  const crmVideos    = videos.filter((v) => v.collaboration_id);
  const nonCrmVideos = videos.filter((v) => !v.collaboration_id);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    // 导入前检查数据区间：跨 5 号 / 与已导入重叠 → 拦下；断档 → 提醒
    const chk = checkNewWindow(file.name, batches.map((b) => b.file_name), ORDER_WINDOW_TAIL_DAYS);
    if (chk.errors.length) { setErrMsg(`未导入：${chk.errors.join("；")}`); return; }
    if (chk.warnings.length && !window.confirm(`${chk.warnings.join("\n")}\n\n仍要导入吗？`)) return;
    setImporting(true); setErrMsg(null);
    try {
      const parsed = await parseVideoXlsx(file);
      if (!parsed.length) { setErrMsg("文件内没有有效数据"); return; }
      // 先从数据库拉一份此刻最新的数据再匹配：上一个文件刚导完、后台还没刷新完时，
      // 用旧数据会把已存在的视频误判为新增（导致重复键报错）
      const fresh = await core.refresh(LINKED, true);
      const lookup = buildVideoLookup({ products, collabs: fresh.collabs, videos: fresh.videos, nameIndex: buildNameIndex(fresh.creators, fresh.aliases) });
      const result = await importVideos(storeId, buildVideoImportPlan(parsed, lookup), file.name, userId);
      setModal({ ...result, fileName: file.name });
      reload();
    } catch (err) { setErrMsg(err.message); }
    finally { setImporting(false); }
  }

  async function handleRevert(batchId, fileName) {
    if (!window.confirm(`确认撤销批次「${fileName}」？这批新增的视频会删除，累加的数据会减回去。`)) return;
    setReverting(batchId); setErrMsg(null);
    try {
      const r = await revertBatch(batchId);
      setErrMsg(`✅ 已撤销「${fileName}」：删除 ${r.removed} 条新增视频，${r.restored} 条减回累加`);
      reload();
    } catch (err) { setErrMsg(`撤销失败：${err.message}（可再点一次，已撤销的部分不会重复处理）`); }
    finally { setReverting(null); }
  }

  if (dataLoading) return <div style={vs.center}>加载中…</div>;
  if (dataError && !core.videos.length) return <div style={vs.center}>错误：{dataError}</div>;

  return (
    <div>
      <SubNav tabs={TABS} active={tab} onChange={setTab} />

      {tab === "imported" && (
        <>
          <div style={vs.toolbar}>
            <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleFile} />
            {canImport && <div>
              <button style={vs.uploadBtn} disabled={importing} onClick={() => fileRef.current?.click()}>
                {importing ? "导入中…" : "📥 上传 xlsx"}
              </button>
              <Hint style={{ marginTop: 6 }}>
                数据获取路径：联盟重心 → 数据分析 → 所有视频<br />
                文件名必须写数据区间，如「20260906到20260912所有视频」；每月 5 号那周要在 5 号截断、6 号重新开始。系统会拦下跨 5 号或与已导入重叠的文件
              </Hint>
            </div>}
            {errMsg && <span style={{ fontSize: 13, color: errMsg.startsWith("✅") ? T.success : T.danger, fontWeight: 600 }}>{errMsg}</span>}
            <span style={vs.summary}>共 <span style={vs.num}>{crmVideos.length}</span> 条</span>
          </div>

          {batches.length > 0 && (
            <div style={{ ...glassStyle(12), padding: "14px 20px", marginBottom: 16 }}>
              <div
                style={{ fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between" }}
                onClick={() => setBatchOpen((v) => !v)}
              >
                <span>导入批次（{batches.length}）</span>
                <span style={{ fontSize: 11, color: T.hint }}>{batchOpen ? "▲ 收起" : "▼ 展开"}</span>
              </div>
              {batchOpen && batches.slice(0, allBatches ? undefined : 10).map((b) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, fontSize: 13 }}>
                  <span style={{ color: T.muted, flex: 1 }}>{b.file_name}</span>
                  <span style={{ color: T.hint }}>{b.created_at?.slice(0, 10)}</span>
                  <span style={{ color: T.muted }}>{b.row_count} 条</span>
                  {canRevert && <button style={vs.btnDanger} disabled={!!reverting} onClick={() => handleRevert(b.id, b.file_name)}>{reverting === b.id ? "撤销中…" : "撤销"}</button>}
                </div>
              ))}
              {batchOpen && batches.length > 10 && (
                <button onClick={() => setAllBatches((v) => !v)} style={{ marginTop: 10, fontSize: 12, color: T.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  {allBatches ? "只看最近 10 个" : `显示全部 ${batches.length} 个批次`}
                </button>
              )}
            </div>
          )}

          <div style={glassStyle(14)}><VideoTable videos={crmVideos} storeId={storeId} /></div>
        </>
      )}

      {tab === "noncrm" && (
        <>
          <div style={vs.toolbar}>
            <span style={vs.summary}>非CRM视频共 <span style={vs.num}>{nonCrmVideos.length}</span> 条</span>
            {mergeMsg && <span style={{ fontSize: 13, color: T.success, fontWeight: 600 }}>{mergeMsg}</span>}
          </div>
          <div style={glassStyle(14)}>
            <VideoTable videos={nonCrmVideos} storeId={storeId} core={core} products={products} showMerge={ctx.can("crm.edit")} onMerged={(res) => { reload(); setMergeMsg(`✅ 已挂上 ${res.attached} 条视频${res.unmatched ? `，${res.unmatched} 条商品对不上仍为非CRM` : ""}`); }} />
          </div>
        </>
      )}

      {/* 导入结果弹窗 */}
      {modal && <ImportModal modal={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function ImportModal({ modal, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(10,22,40,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ ...glassStyle(18, true), padding: "32px 36px", minWidth: 340, maxWidth: 440 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>导入完成 ✅</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>{modal.fileName}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Row label="本次处理总条数" value={modal.total} color={T.accent} />
          <Row label="新增视频" value={modal.inserted} color={T.success} />
          <Row label="累加更新" value={modal.updated} color={T.warning} />
          <div style={{ borderTop: `1px solid ${T.glassStroke}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            <Row label="CRM 达人视频" value={modal.crmCount} color={T.accent} />
            <Row label="非 CRM 达人视频" value={modal.nonCrmCount} color={T.muted} />
          </div>
          <div style={{ borderTop: `1px solid ${T.glassStroke}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <Row label="跳过（非CRM且0出单）" value={modal.skipped} color={T.hint} />
            {modal.unknownSku > 0 && <Row label="商品ID不在产品库（按非CRM处理）" value={modal.unknownSku} color={T.warning} />}
            {modal.merged > 0 && <Row label="文件内重复视频（已合并）" value={modal.merged} color={T.hint} />}
          </div>
        </div>

        <button onClick={onClose} style={{
          marginTop: 28, width: "100%", padding: "11px 0", borderRadius: 12,
          border: "none", background: T.grad, color: "#fff",
          fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
        }}>确认</button>
      </div>
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 14, color: T.muted }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
