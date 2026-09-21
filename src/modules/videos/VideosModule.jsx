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
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null); // { type: ok|err, text }
  const fileRef = useRef(null);

  const crmVideos    = videos.filter((v) => v.collaboration_id);
  const nonCrmVideos = videos.filter((v) => !v.collaboration_id);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true); setImportMsg(null);
    try {
      const parsed = await parseVideoXlsx(file);
      if (!parsed.length) { setImportMsg({ type: "err", text: "文件内没有有效数据" }); return; }
      const { inserted, updated } = await importVideos(storeId, parsed, file.name, userId);
      setImportMsg({ type: "ok", text: `导入完成：新增 ${inserted} 条，累加 ${updated} 条` });
      reload();
    } catch (err) {
      setImportMsg({ type: "err", text: err.message });
    } finally { setImporting(false); }
  }

  async function handleRevert(batchId, fileName) {
    if (!window.confirm(`确认撤销批次「${fileName}」？该批次的累加量将被反向减回。`)) return;
    try {
      await revertBatch(batchId);
      setImportMsg({ type: "ok", text: "撤销成功" });
      reload();
    } catch (err) {
      setImportMsg({ type: "err", text: err.message });
    }
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
          {/* 导入工具栏 */}
          <div style={vs.toolbar}>
            <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleFile} />
            <button style={vs.uploadBtn} disabled={importing} onClick={() => fileRef.current?.click()}>
              {importing ? "导入中…" : "📥 上传 xlsx"}
            </button>
            {importMsg && (
              <span style={{ fontSize: 13, color: importMsg.type === "ok" ? T.success : T.danger, fontWeight: 600 }}>
                {importMsg.text}
              </span>
            )}
            <span style={vs.summary}>
              共 <span style={vs.num}>{crmVideos.length}</span> 条视频
            </span>
          </div>

          {/* 批次列表 */}
          {batches.length > 0 && (
            <div style={{ ...glassStyle(12), padding: "14px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10 }}>导入批次</div>
              {batches.map((b) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: T.muted, flex: 1 }}>{b.file_name}</span>
                  <span style={{ color: T.hint }}>{b.created_at?.slice(0, 10)}</span>
                  <span style={{ color: T.muted }}>{b.row_count} 条</span>
                  <button style={vs.btnDanger} onClick={() => handleRevert(b.id, b.file_name)}>撤销</button>
                </div>
              ))}
            </div>
          )}

          <div style={glassStyle(14)}>
            <VideoTable videos={crmVideos} />
          </div>
        </>
      )}

      {tab === "noncrm" && (
        <>
          <div style={vs.toolbar}>
            <span style={vs.summary}>
              非CRM视频共 <span style={vs.num}>{nonCrmVideos.length}</span> 条
            </span>
          </div>
          <div style={glassStyle(14)}>
            <VideoTable videos={nonCrmVideos} />
          </div>
        </>
      )}
    </div>
  );
}
