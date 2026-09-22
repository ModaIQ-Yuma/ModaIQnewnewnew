// modules/crm/CRMImportModal.jsx
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { glassStyle, T, FONT } from "../../constants/tokens.js";
import { parseRows, importCRM } from "../../lib/supabase/crmImport.js";

export default function CRMImportModal({ storeId, onClose, onDone }) {
  const fileRef  = useRef();
  const [stage,   setStage]   = useState("idle"); // idle | preview | importing | done | error
  const [rows,    setRows]    = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [result,  setResult]  = useState(null);
  const [err,     setErr]     = useState("");

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb    = XLSX.read(ev.target.result, { type: "array" });
        const ws    = wb.Sheets[wb.SheetNames[0]];
        const raw   = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const parsed = parseRows(raw);
        if (!parsed.length) { setErr("未解析到有效数据，请确认文件格式正确"); return; }
        setRows(parsed);
        setStage("preview");
      } catch (e) {
        setErr("文件解析失败：" + e.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function startImport() {
    setStage("importing");
    setProgress({ done: 0, total: rows.length, label: "准备中…" });
    try {
      const res = await importCRM(storeId, rows, (done, total, label) =>
        setProgress({ done, total, label })
      );
      setResult(res);
      setStage("done");
    } catch (e) {
      setErr(e.message);
      setStage("error");
    }
  }

  const pct = progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0;

  // 预览前5行
  const preview = rows.slice(0, 5);
  const skuSet  = [...new Set(rows.map(r => r.product))];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(10,22,40,0.55)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ ...glassStyle(20, true), width:"100%", maxWidth:600, padding:"28px 32px", maxHeight:"90vh", overflowY:"auto" }}>

        <div style={{ fontSize:FONT.x4l, fontWeight:700, color:T.text, marginBottom:6 }}>导入 CRM</div>
        <div style={{ fontSize:FONT.sm2, color:T.muted, marginBottom:20 }}>支持旧版导出的 Excel / CSV 格式，达人信息会覆盖，寄样记录追加写入</div>

        {/* 选文件 */}
        {stage === "idle" && (
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} style={{ width:"100%", padding:"14px 0", borderRadius:12, border:`2px dashed ${T.accent}`, background:`${T.accent}08`, color:T.accent, fontSize:FONT.xl2, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              📂 点击选择文件
            </button>
            {err && <div style={{ fontSize:FONT.sm2, color:T.danger, marginTop:10 }}>{err}</div>}
          </>
        )}

        {/* 预览 */}
        {stage === "preview" && (
          <>
            <div style={{ ...glassStyle(12), padding:"14px 16px", marginBottom:16 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:4 }}>
                {[["总行数", rows.length], ["唯一达人", new Set(rows.map(r=>r.handle)).size], ["涉及产品", skuSet.length]].map(([l,v])=>(
                  <div key={l} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:22, fontWeight:800, color:T.accent }}>{v}</div>
                    <div style={{ fontSize:FONT.sm, color:T.muted }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize:FONT.sm, fontWeight:700, color:T.muted, marginBottom:8 }}>前 5 行预览</div>
            <div style={{ ...glassStyle(10), overflow:"hidden", marginBottom:20, fontSize:FONT.sm }}>
              {preview.map((r, i) => (
                <div key={i} style={{ display:"flex", gap:10, padding:"8px 12px", borderBottom:`1px solid ${T.glassStroke}`, alignItems:"center" }}>
                  <span style={{ fontWeight:700, color:T.text, minWidth:120 }}>{r.handle}</span>
                  <span style={{ color:T.accent }}>{r.product}</span>
                  <span style={{ color:T.muted }}>{r.shipDate}</span>
                  <span style={{ color:T.hint }}>{r.staff || "—"}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize:FONT.sm2, color:T.warning, marginBottom:16 }}>
              ⚠️ 达人信息将被覆盖，寄样记录追加写入（不去重）
            </div>

            {err && <div style={{ fontSize:FONT.sm2, color:T.danger, marginBottom:10 }}>{err}</div>}

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={onClose} style={{ padding:"9px 20px", borderRadius:10, border:`1.5px solid ${T.border}`, background:"transparent", color:T.muted, cursor:"pointer", fontFamily:"inherit", fontSize:FONT.lg2 }}>取消</button>
              <button onClick={startImport} style={{ padding:"9px 24px", borderRadius:10, border:"none", background:T.grad, color:"#fff", fontWeight:700, fontSize:FONT.lg2, cursor:"pointer", fontFamily:"inherit" }}>
                确认导入 {rows.length} 条
              </button>
            </div>
          </>
        )}

        {/* 导入中 */}
        {stage === "importing" && (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <div style={{ fontSize:FONT.xl2, fontWeight:700, color:T.text, marginBottom:8 }}>{progress.label}</div>
            <div style={{ fontSize:32, fontWeight:800, color:T.accent, marginBottom:16 }}>{pct}%</div>
            <div style={{ height:10, borderRadius:10, background:`${T.accent}20`, overflow:"hidden", marginBottom:8 }}>
              <div style={{ height:"100%", width:`${pct}%`, background:T.grad, borderRadius:10, transition:"width .3s" }} />
            </div>
            <div style={{ fontSize:FONT.sm2, color:T.hint }}>{progress.done} / {progress.total} 条</div>
          </div>
        )}

        {/* 完成 */}
        {stage === "done" && result && (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
            <div style={{ fontSize:FONT.xl2, fontWeight:700, color:T.success, marginBottom:16 }}>导入完成</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:24 }}>
              {[["写入寄样记录", result.inserted], ["跳过（无匹配产品）", result.skipped], ["新增跟进人", result.staffAdded]].map(([l,v])=>(
                <div key={l} style={{ ...glassStyle(12), padding:"12px 0", textAlign:"center" }}>
                  <div style={{ fontSize:22, fontWeight:800, color:T.accent }}>{v}</div>
                  <div style={{ fontSize:FONT.sm, color:T.muted }}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { onDone?.(); onClose(); }} style={{ padding:"10px 28px", borderRadius:10, border:"none", background:T.grad, color:"#fff", fontWeight:700, fontSize:FONT.lg2, cursor:"pointer", fontFamily:"inherit" }}>
              完成
            </button>
          </div>
        )}

        {/* 出错 */}
        {stage === "error" && (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>❌</div>
            <div style={{ fontSize:FONT.xl2, fontWeight:700, color:T.danger, marginBottom:8 }}>导入失败</div>
            <div style={{ fontSize:FONT.lg2, color:T.muted, marginBottom:20 }}>{err}</div>
            <button onClick={onClose} style={{ padding:"9px 20px", borderRadius:10, border:`1.5px solid ${T.border}`, background:"transparent", color:T.muted, cursor:"pointer", fontFamily:"inherit", fontSize:FONT.lg2 }}>关闭</button>
          </div>
        )}
      </div>
    </div>
  );
}
