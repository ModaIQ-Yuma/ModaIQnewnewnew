// modules/crm/CRMImportModal.jsx — CRM 批量导入（旧版全量导出 xlsx / csv）
import { useMemo, useRef, useState } from "react";
import { glassStyle, T, FONT } from "../../constants/tokens.js";
import { Hint } from "../../components/layout/SubNav.jsx";
import { readSheetRows } from "../../lib/crm/readSheet.js";
import { parseRows } from "../../lib/crm/crmParser.js";
import { detectPairs } from "../../lib/crm/importPairs.js";
import { buildImportPlan } from "../../lib/crm/importPlan.js";
import { buildNameIndex } from "../../lib/crm/identity.js";
import { importCRM } from "../../lib/supabase/crmImport.js";
import { StatGrid, IssueList, PairChooser } from "./ImportReview.jsx";

const overlay = { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(10,22,40,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 };
const box     = { ...glassStyle(20, true), width: "100%", maxWidth: 680, padding: "26px 30px", maxHeight: "90vh", overflowY: "auto" };
const btn     = (primary) => ({ padding: "9px 22px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: FONT.body, fontWeight: 700,
  border: primary ? "none" : `1.5px solid ${T.border}`, background: primary ? T.grad : "transparent", color: primary ? "#fff" : T.muted });
const skipLine = (s) => `第 ${s.line} 行 @${s.handle || "?"}：${s.reason}`;

export default function CRMImportModal({ storeId, core, products, onClose, onDone }) {
  const fileRef = useRef();
  const [stage, setStage]       = useState("idle");     // idle | review | importing | done | error
  const [parsed, setParsed]     = useState(null);       // { rows, skipped }
  const [decisions, setDecide]  = useState({});
  const [keepSameDay, setKeep]  = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [result, setResult]     = useState(null);
  const [err, setErr]           = useState("");

  const pairs = useMemo(() => (parsed ? detectPairs(parsed.rows) : []), [parsed]);
  const allDecided = pairs.every((p) => decisions[p.key]);
  const plan = useMemo(() => {
    if (!parsed || !allDecided) return null;
    const handleOf = (id) => core.creators.find((c) => c.id === id)?.handle || "?";
    return buildImportPlan({
      rows: parsed.rows, decisions, pairs, keepSameDay,
      productIdByName: Object.fromEntries(products.map((p) => [p.internal_name, p.id])),
      existing: {
        nameIndex: buildNameIndex(core.creators, core.aliases), handleOf,
        collabKeys: new Set(core.collabs.map((c) => `${c.creator_id}|${c.product_id}|${c.ship_date}`)),
      },
    });
  }, [parsed, allDecided, decisions, pairs, keepSameDay, products, core.creators, core.aliases, core.collabs]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    try {
      const res = parseRows(readSheetRows(await file.arrayBuffer(), file.name));
      if (!res.rows.length) { setErr("未解析到有效数据，请确认是旧版 CRM 全量导出文件"); return; }
      setParsed(res); setStage("review");
    } catch (ex) { setErr("文件解析失败：" + ex.message); }
  }

  async function start() {
    setStage("importing");
    try {
      setResult(await importCRM(storeId, plan, (done, total, label) => setProgress({ done, total, label })));
      setStage("done");
    } catch (ex) { setErr(ex.message); setStage("error"); }
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const skippedAll = plan ? [...parsed.skipped, ...plan.skipped] : parsed?.skipped || [];

  return (
    <div style={overlay}>
      <div style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: FONT.h2, fontWeight: 800, color: T.text }}>导入 CRM</div>
          {stage !== "importing" && <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: T.hint, cursor: "pointer" }}>✕</button>}
        </div>
        <Hint style={{ marginBottom: 18 }}>支持旧版「CRM 全量导出」的 xlsx / csv。每一行的达人属性会记在那一行寄样上（寄样时属性）；同一个文件重复导入不会重复写入。</Hint>

        {stage === "idle" && (
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: `2px dashed ${T.accent}`, background: `${T.accent}08`, color: T.accent, fontSize: FONT.h3, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>📂 点击选择文件</button>
            {err && <div style={{ fontSize: FONT.note, color: T.danger, marginTop: 10 }}>{err}</div>}
          </>
        )}

        {stage === "review" && (
          <>
            <PairChooser pairs={pairs} decisions={decisions} onDecide={(k, v) => setDecide((d) => ({ ...d, [k]: v }))} />
            {plan ? (
              <>
                <StatGrid items={[["将写入寄样", plan.stats.shipments], ["达人", plan.stats.creators], ["别名", plan.stats.aliases], ["跳过", skippedAll.length, T.warning]]} />
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: FONT.body, color: T.text, marginBottom: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={keepSameDay} onChange={(e) => setKeep(e.target.checked)} />
                  文件里「同达人同产品同日期」的多行也全部导入（默认只导第一行）
                </label>
                <IssueList title="跳过的行" lines={skippedAll.map(skipLine)} />
                <IssueList title="别名冲突（未写入）" lines={plan.conflicts} />
                <IssueList title="认不出的属性取值（已留空）" lines={plan.unknownAttrs} />
              </>
            ) : <Hint style={{ marginBottom: 12 }}>请先为上面每一对做出选择。</Hint>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button style={btn(false)} onClick={onClose}>取消</button>
              <button style={{ ...btn(true), opacity: plan ? 1 : 0.5 }} disabled={!plan} onClick={start}>确认导入 {plan?.stats.shipments ?? ""} 条</button>
            </div>
          </>
        )}

        {stage === "importing" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: FONT.h3, fontWeight: 700, color: T.text, marginBottom: 8 }}>{progress.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: T.accent, marginBottom: 14 }}>{pct}%</div>
            <div style={{ height: 10, borderRadius: 10, background: `${T.accent}20`, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: T.grad, transition: "width .3s" }} />
            </div>
          </div>
        )}

        {stage === "done" && result && (
          <>
            <div style={{ fontSize: FONT.h3, fontWeight: 700, color: T.success, margin: "6px 0 14px" }}>✅ 导入完成</div>
            <StatGrid items={[["寄样记录", result.inserted], ["新达人", result.creators], ["别名", result.aliases], ["跳过", skippedAll.length, T.warning]]} />
            <IssueList title="跳过的行" lines={skippedAll.map(skipLine)} />
            <div style={{ textAlign: "right" }}><button style={btn(true)} onClick={() => { onDone?.(); onClose(); }}>完成</button></div>
          </>
        )}

        {stage === "error" && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: FONT.h3, fontWeight: 700, color: T.danger, marginBottom: 8 }}>❌ 导入中断</div>
            <Hint style={{ marginBottom: 16 }}>{err}<br />已写入的部分会保留；修正问题后重新导入同一个文件，已导入的行会自动跳过。</Hint>
            <button style={btn(false)} onClick={() => { onDone?.(); onClose(); }}>关闭</button>
          </div>
        )}
      </div>
    </div>
  );
}
