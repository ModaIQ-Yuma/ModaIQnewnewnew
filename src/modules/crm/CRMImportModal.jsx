// modules/crm/CRMImportModal.jsx
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { glassStyle, T, FONT } from "../../constants/tokens.js";
import { parseRows, importCRM } from "../../lib/supabase/crmImport.js";

const MODES = [
  { v: "full",       label: "完整导入",       sub: "新增寄样记录 + 更新达人属性" },
  { v: "attrs_only", label: "仅更新达人属性", sub: "不新增寄样记录，适合修复历史数据" },
];

export default function CRMImportModal({ storeId, onClose, onDone }) {
  const fileRef = useRef();
  const [stage,      setStage]      = useState("idle");   // idle | preview | importing | done | error
  const [importMode, setImportMode] = useState("full");   // full | attrs_only
  const [rows,       setRows]       = useState([]);
  const [progress,   setProgress]   = useState({ done: 0, total: 0, label: "" });
  const [result,     setResult]     = useState(null);
  const [err,        setErr]        = useState("");

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb     = XLSX.read(ev.target.result, { type: "array", codepage: 936 });
        const ws     = wb.Sheets[wb.SheetNames[0]];
        const raw    = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        const parsed = parseRows(raw);
        if (!parsed.length) { setErr("未解析到有效数据，请确认文件格式正确"); return; }
        setRows(parsed);
        setStage("preview");
      } catch (ex) {
        setErr("文件解析失败：" + ex.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function startImport() {
    setStage("importing");
    setProgress({ done: 0, total: rows.length, label: "准备中…" });
    try {
      const res = await importCRM(storeId, rows, (done, total, label) => setProgress({ done, total, label }), importMode);
      setResult(res);
      setStage("done");
    } catch (ex) {
      setErr(ex.message);
      setStage("error");
    }
  }

  const pct      = progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0;
  const preview  = rows.slice(0, 5);
  const skuCount = new Set(rows.map((r) => r.product)).size;
  const hdlCount = new Set(rows.map((r) => r.handle)).size;

  const overlay = { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(10,22,40,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 };
  const box     = { ...glassStyle(20, true), width: "100%", maxWidth: 600, padding: "28px 32px", maxHeight: "90vh", overflowY: "auto" };
  const statBox = { ...glassStyle(12), padding: "12px 0", textAlign: "center" };

  return (
    <div style={overlay}>
      <div style={box}>
        <div style={{ fontSize: FONT.x4l, fontWeight: 700, color: T.text, marginBottom: 6 }}>导入 CRM</div>
        <div style={{ fontSize: FONT.sm2, color: T.muted, marginBottom: 20 }}>支持旧版导出的 Excel / CSV 格式</div>

        {/* ── 选文件 ── */}
        {stage === "idle" && (
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: `2px dashed ${T.accent}`, background: `${T.accent}08`, color: T.accent, fontSize: FONT.xl2, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              📂 点击选择文件
            </button>
            {err && <div style={{ fontSize: FONT.sm2, color: T.danger, marginTop: 10 }}>{err}</div>}
          </>
        )}

        {/* ── 预览 ── */}
        {stage === "preview" && (
          <>
            {/* 统计 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[["总行数", rows.length], ["唯一达人", hdlCount], ["涉及产品", skuCount]].map(([l, v]) => (
                <div key={l} style={statBox}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.accent }}>{v}</div>
                  <div style={{ fontSize: FONT.sm, color: T.muted }}>{l}</div>
                </div>
              ))}
            </div>

            {/* 前5行预览 */}
            <div style={{ fontSize: FONT.sm, fontWeight: 700, color: T.muted, marginBottom: 8 }}>前 5 行预览</div>
            <div style={{ ...glassStyle(10), overflow: "hidden", marginBottom: 20, fontSize: FONT.sm }}>
              {preview.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 12px", borderBottom: `1px solid ${T.glassStroke}`, alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: T.text, minWidth: 120 }}>{r.handle}</span>
                  <span style={{ color: T.accent }}>{r.product}</span>
                  <span style={{ color: T.muted }}>{r.shipDate}</span>
                  <span style={{ color: T.hint }}>{r.staff || "—"}</span>
                </div>
              ))}
            </div>

            {/* 导入模式 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: FONT.md2, fontWeight: 700, color: T.muted, marginBottom: 10 }}>导入模式</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MODES.map(({ v, label, sub }) => (
                  <label key={v} onClick={() => setImportMode(v)} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${importMode === v ? T.accent : T.border}`, background: importMode === v ? `${T.accent}0a` : "transparent", transition: "all .15s" }}>
                    <input type="radio" value={v} checked={importMode === v} onChange={() => setImportMode(v)} style={{ accentColor: T.accent, marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: FONT.lg2, fontWeight: 700, color: importMode === v ? T.accent : T.text }}>{label}</div>
                      <div style={{ fontSize: FONT.md2, color: T.hint, marginTop: 2 }}>{sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {err && <div style={{ fontSize: FONT.sm2, color: T.danger, marginBottom: 10 }}>{err}</div>}

            {/* 操作按钮 */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer", fontFamily: "inherit", fontSize: FONT.lg2 }}>取消</button>
              <button onClick={startImport} style={{ padding: "9px 24px", borderRadius: 10, border: "none", background: T.grad, color: "#fff", fontWeight: 700, fontSize: FONT.lg2, cursor: "pointer", fontFamily: "inherit" }}>
                {importMode === "attrs_only" ? `更新 ${hdlCount} 个达人属性` : `确认导入 ${rows.length} 条`}
              </button>
            </div>
          </>
        )}

        {/* ── 导入中 ── */}
        {stage === "importing" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: FONT.xl2, fontWeight: 700, color: T.text, marginBottom: 8 }}>{progress.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: T.accent, marginBottom: 16 }}>{pct}%</div>
            <div style={{ height: 10, borderRadius: 10, background: `${T.accent}20`, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: T.grad, borderRadius: 10, transition: "width .3s" }} />
            </div>
            <div style={{ fontSize: FONT.sm2, color: T.hint }}>{progress.done} / {progress.total} 条</div>
          </div>
        )}

        {/* ── 完成 ── */}
        {stage === "done" && result && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: FONT.xl2, fontWeight: 700, color: T.success, marginBottom: 20 }}>
              {importMode === "attrs_only" ? "达人属性更新完成" : "导入完成"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: importMode === "attrs_only" ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
              {importMode === "attrs_only"
                ? [["更新达人数", result.attrsUpdated ?? hdlCount]]
                : [["写入寄样记录", result.inserted], ["跳过", result.skipped], ["新增跟进人", result.staffAdded]]
              }.map(([l, v]) => (
                <div key={l} style={statBox}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.accent }}>{v ?? 0}</div>
                  <div style={{ fontSize: FONT.sm, color: T.muted }}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { onDone?.(); onClose(); }} style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: T.grad, color: "#fff", fontWeight: 700, fontSize: FONT.lg2, cursor: "pointer", fontFamily: "inherit" }}>完成</button>
          </div>
        )}

        {/* ── 出错 ── */}
        {stage === "error" && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
            <div style={{ fontSize: FONT.xl2, fontWeight: 700, color: T.danger, marginBottom: 8 }}>导入失败</div>
            <div style={{ fontSize: FONT.lg2, color: T.muted, marginBottom: 20 }}>{err}</div>
            <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer", fontFamily: "inherit", fontSize: FONT.lg2 }}>关闭</button>
          </div>
        )}
      </div>
    </div>
  );
}
