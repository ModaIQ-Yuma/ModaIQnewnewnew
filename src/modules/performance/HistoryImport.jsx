// modules/performance/HistoryImport.jsx — 导入以前已提报过的视频链接：导入后这些视频不再出现在待提报里
import { useState } from "react";
import { T, glassStyle } from "../../constants/tokens.js";
import { readSheetRows } from "../../lib/crm/readSheet.js";
import { planHistoryImport, linksFromSheet } from "../../lib/bonus/bonusCalc.js";
import { s } from "./perfStyles.js";

export default function HistoryImport({ bonus, onClose }) {
  const [pasted, setPasted] = useState("");
  const [file, setFile] = useState(null);           // { name, cells }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [written, setWritten] = useState(null);

  const lines = [...pasted.split(/[\s,，;；]+/), ...(file?.cells || [])];
  const plan = planHistoryImport(lines, bonus.submissions);
  const already = bonus.submissions.filter((x) => x.source === "历史导入").length;

  async function onFile(e) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    try { setFile({ name: f.name, cells: linksFromSheet(readSheetRows(await f.arrayBuffer(), f.name)) }); setError(""); }
    catch (err) { setError(`文件读取失败：${err.message}`); }
  }

  async function onConfirm() {
    setBusy(true);
    try { setWritten(await bonus.submit(plan.rows)); } catch (err) { setError(`写入失败：${err.message}`); }
    setBusy(false);
  }

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div style={{ ...glassStyle(16, true), ...s.modal }}>
        <div style={s.modalHead}><span>导入历史已提报</span><button style={s.btnGhost} onClick={onClose} disabled={busy}>关闭</button></div>
        {written != null ? (
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.8 }}>
            已导入 <b>{written}</b> 条，这些视频以后不会再出现在待提报里。
            <div style={s.footer}><button style={s.btn} onClick={onClose}>完成</button></div>
          </div>
        ) : (<>
          <div style={s.note}>以前提报过的视频链接，一行一个（也可以直接贴视频 ID）；或上传 Excel / CSV，表里任何一列的视频链接都会被认出来。已导入过 {already} 条，重复的会自动跳过。</div>
          <textarea style={{ ...s.textarea, marginTop: 10 }} value={pasted} onChange={(e) => setPasted(e.target.value)}
            placeholder={"https://www.tiktok.com/@vpriscillag/video/7672107155071175949\nhttps://www.tiktok.com/@finding.renee/video/7670783379289181471"} />
          <div style={{ ...s.row, marginTop: 8 }}>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
            {file && <span style={s.note}>{file.name}：认出 {file.cells.length} 个链接</span>}
          </div>
          <div style={{ ...s.row, marginTop: 12, fontSize: 13, color: T.text }}>
            将导入 <b>{plan.rows.length}</b> 条 · 已提报过 / 重复 {plan.dup} 条
            {plan.invalid.length > 0 && <span style={{ color: T.warning }}>· 认不出 {plan.invalid.length} 条：{plan.invalid.slice(0, 3).join("、")}{plan.invalid.length > 3 ? "…" : ""}</span>}
          </div>
          {error && <div style={s.err}>{error}</div>}
          <div style={s.footer}>
            <button style={s.btn} disabled={busy || !plan.rows.length} onClick={onConfirm}>{busy ? "导入中…" : `确认导入 ${plan.rows.length} 条`}</button>
          </div>
        </>)}
      </div>
    </div>
  );
}
