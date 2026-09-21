// modules/videos/VideosModule.jsx
import { useRef, useState } from "react";
import { useVideos } from "../../hooks/useVideos.js";
import { glassStyle, T } from "../../constants/tokens.js";
import { vs } from "./videosStyles.js";
import VideoTable from "./VideoTable.jsx";
import { parseVideoXlsx } from "../../lib/video/videoParser.js";
import { importVideos } from "../../lib/supabase/videosWrite.js";
import { revertBatch } from "../../lib/supabase/videosRevert.js";

const TABS = [
  { id: "imported", label: "导入视频" },
  { id: "noncrm",   label: "非CRM视频" },
];

export default function VideosModule({ ctx }) {
  const { storeId, userId } = ctx;
  const { videos, batches, loading, error, reload } = useVideos(storeId);
  const [tab,       setTab]       = useState("imported");
  const [importing,  setImporting]  = useState(false);
  const [modal,      setModal]      = useState(null);
  const [errMsg,     setErrMsg]     = useState(null);
  const [batchOpen,  setBatchOpen]  = useState(false);
  const fileRef = useRef(null);

  const crmVideos    = videos.filter((v) => v.collaboration_id);
  const nonCrmVideos = videos.filter((v) => !v.collaboration_id);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true); setErrMsg(null);
    try {
      const parsed = await parseVideoXlsx(file);
      if (!parsed.length) { setErrMsg("文件内没有有效数据"); return; }
      const result = await importVideos(storeId, parsed, file.name, userId);
      setModal({ ...result, total: result.inserted + result.updated, fileName: file.name });
      reload();
    } catch (err) { setErrMsg(err.message); }
    finally { setImporting(false); }
  }

  async function handleRevert(batchId, fileName) {
    if (!window.confirm(`确认撤销批次「${fileName}」？`)) return;
    try { await revertBatch(batchId); reload(); }
    catch (err) { setErrMsg(err.message); }
  }

  if (loading) return <div style={vs.center}>加载中…</div>;
  if (error)   return <div style={vs.center}>错误：{error}</div>;

  return (
    <div style={vs.wrap}>
      <h2 style={vs.title}>视频采集</h2>

      <div style={vs.tabs}>
        {TABS.map((t) => (
          <button key={t.id} style={vs.tab(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "imported" && (
        <>
          <div style={vs.toolbar}>
            <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleFile} />
            <div>
              <button style={vs.uploadBtn} disabled={importing} onClick={() => fileRef.current?.click()}>
                {importing ? "导入中…" : "📥 上传 xlsx"}
              </button>
              <div style={{ fontSize: 11, color: T.hint, marginTop: 6, lineHeight: 1.7 }}>
                数据获取路径：联盟重心 → 数据分析 → 所有视频<br />
                建议文件命名为右上角框选视频日期，示例：20260101到20260201所有视频
              </div>
            </div>
            {errMsg && <span style={{ fontSize: 13, color: T.danger, fontWeight: 600 }}>{errMsg}</span>}
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
              {batchOpen && batches.map((b) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, fontSize: 13 }}>
                  <span style={{ color: T.muted, flex: 1 }}>{b.file_name}</span>
                  <span style={{ color: T.hint }}>{b.created_at?.slice(0, 10)}</span>
                  <span style={{ color: T.muted }}>{b.row_count} 条</span>
                  <button style={vs.btnDanger} onClick={() => handleRevert(b.id, b.file_name)}>撤销</button>
                </div>
              ))}
            </div>
          )}

          <div style={glassStyle(14)}><VideoTable videos={crmVideos} storeId={storeId} /></div>
        </>
      )}

      {tab === "noncrm" && (
        <>
          <div style={vs.toolbar}>
            <span style={vs.summary}>非CRM视频共 <span style={vs.num}>{nonCrmVideos.length}</span> 条</span>
          </div>
          <div style={glassStyle(14)}>
            <VideoTable videos={nonCrmVideos} storeId={storeId} showMerge onMerged={reload} />
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
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>导入完成 ✅</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>{modal.fileName}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Row label="本次处理总条数" value={modal.total} color={T.accent} />
          <Row label="新增视频" value={modal.inserted} color={T.success} />
          <Row label="累加更新" value={modal.updated} color={T.warning} />
          <div style={{ borderTop: `1px solid ${T.glassStroke}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            <Row label="CRM 达人视频" value={modal.crmCount} color={T.accent} />
            <Row label="非 CRM 达人视频" value={modal.nonCrmCount} color={T.muted} />
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
      <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
