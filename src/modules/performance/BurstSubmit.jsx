// modules/performance/BurstSubmit.jsx — 爆单视频：待提报（累计 GMV ≥ 门槛、没提报过）/ 本月已提报（可撤销）
import { useMemo, useState } from "react";
import { T, glassStyle, tabStyle } from "../../constants/tokens.js";
import { pendingBursts, submissionRows, tierLabels, videoUrl, BURST_MIN_GMV } from "../../lib/bonus/bonusCalc.js";
import { pubDay } from "../../lib/perf/perfCalc.js";
import { usePaged } from "../../hooks/usePaged.js";
import Pager from "../../components/ui/Pager.jsx";
import HistoryImport from "./HistoryImport.jsx";
import { s, money, yuan } from "./perfStyles.js";

export default function BurstSubmit({ ym, videos, bonus, report }) {
  const [view, setView] = useState("pending");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [showImport, setShowImport] = useState(false);

  const pending = useMemo(() => pendingBursts(videos, bonus.submissions), [videos, bonus.submissions]);
  const base = view === "pending" ? pending : report.bursts;
  const needle = q.trim().toLowerCase();
  const list = useMemo(() => (needle ? base.filter((v) => (v.creator_handle || "").includes(needle)) : base), [base, needle]);
  const { page, setPage, totalPages, pageRows } = usePaged(list, 30, `${view}|${needle}|${ym}`);

  async function run(fn, done) {
    setBusy(true); setMsg("");
    try { setMsg(done(await fn())); } catch (e) { setMsg(`❌ ${e.message}`); }
    setBusy(false);
  }
  const submit = (rows) => run(() => bonus.submit(submissionRows(rows, ym)), (n) => `✅ 已提报 ${n} 条到 ${ym}`);
  const undo = (row) => confirm(`撤销「${row.creator_handle}」这条提报？撤销后它会回到待提报。`)
    && run(() => bonus.undo([row.id]), () => "已撤销");
  const pendingSum = list.reduce((n, v) => n + (v.amount || 0), 0);

  return (
    <div style={{ ...glassStyle(16), ...s.section }}>
      <div style={{ ...s.row, marginBottom: 8 }}>
        <span style={s.h2}>爆单视频</span>
        <span style={s.note}>累计 GMV ≥ ${BURST_MIN_GMV} 算爆单，一条视频只提报一次 · {tierLabels().join(" · ")}</span>
      </div>
      <div style={{ ...s.row, marginBottom: 12 }}>
        <button style={tabStyle(view === "pending")} onClick={() => setView("pending")}>待提报 {pending.length}</button>
        <button style={tabStyle(view === "done")} onClick={() => setView("done")}>{ym} 已提报 {report.bursts.length}</button>
        <input style={s.input} placeholder="搜索达人名…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ flex: 1 }} />
        {view === "pending" && list.length > 0 && (
          <button style={s.btn} disabled={busy} onClick={() => confirm(`把这 ${list.length} 条（${yuan(pendingSum)}）全部提报到 ${ym}？`) && submit(list)}>
            ⚡ 全部提报到 {ym}（{yuan(pendingSum)}）
          </button>
        )}
        <button style={s.btnGhost} onClick={() => setShowImport(true)}>导入历史已提报</button>
      </div>
      {msg && <div style={{ ...s.note, color: msg.startsWith("❌") ? T.danger : T.success, marginBottom: 8 }}>{msg}</div>}

      {list.length === 0 ? <div style={s.empty}>{view === "pending" ? "没有待提报的爆单视频" : "这个月还没有提报"}</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ ...s.table, minWidth: 620 }}>
            <thead><tr>{["达人", "发布日期", "成交件数", "累计 GMV", "奖金档位", "视频", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {pageRows.map((v) => (
                <tr key={v.id}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{v.creator_handle}</td>
                  <td style={s.td}>{view === "pending" ? pubDay(v) : v.published}</td>
                  <td style={{ ...s.td, ...s.num }}>{v.orders ?? "—"}</td>
                  <td style={{ ...s.td, ...s.num }}>{money(v.gmv)}</td>
                  <td style={s.td}><span style={s.tier}>{yuan(v.amount)}</span></td>
                  <td style={s.td}>{(v.url || videoUrl(v)) && <a style={s.link} href={v.url || videoUrl(v)} target="_blank" rel="noreferrer">↗ 打开</a>}</td>
                  <td style={s.td}>{view === "pending"
                    ? <button style={s.btnSmall} disabled={busy} onClick={() => submit([v])}>提报</button>
                    : <button style={s.btnDanger} disabled={busy} onClick={() => undo(v)}>撤销</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} totalPages={totalPages} onChange={setPage} />
      {showImport && <HistoryImport bonus={bonus} onClose={() => setShowImport(false)} />}
    </div>
  );
}
