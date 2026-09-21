// modules/review/GradeReview.jsx
import { useState, useMemo } from "react";
import { glassStyle, T } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { calcGradeMetrics } from "../../lib/review/reviewCalc.js";
import { monthsBetween } from "../../lib/utils.js";
import { saveProductSnapshot } from "../../lib/supabase/reviewWrite.js";
import { calcMonthMetrics } from "../../lib/review/reviewCalc.js";

const GRADE_COLORS = {
  Lv1:"#94A3B8", Lv2:"#60A5FA", Lv3:"#34D399", Lv4:"#FBBF24",
  Lv5:"#F97316", Lv6:"#A78BFA", Lv7:"#EC4899", "未标注":"#CBD5E1", "非CRM":"#F59E0B",
};

function defFrom() {
  const d = new Date(); d.setMonth(d.getMonth() - 5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function GradeReview({ collabs, videos, creators, products, storeId, userId, burstThreshold, onSnapshotSaved }) {
  const [view,   setView]   = useState("single");
  const [ym,     setYm]     = useState(thisMonth);
  const [fromYm, setFromYm] = useState(defFrom);
  const [toYm,   setToYm]   = useState(thisMonth);
  const [saving, setSaving] = useState(false);
  const [saveMsg,setSaveMsg]= useState("");

  // 单月：全店等级数据
  const singleData = useMemo(() =>
    calcGradeMetrics(collabs, videos, creators, ym, null, burstThreshold),
    [collabs, videos, creators, ym, burstThreshold]
  );

  // 全时期：每月一行
  const months = useMemo(() => monthsBetween(fromYm, toYm), [fromYm, toYm]);
  const allData = useMemo(() =>
    months.map((m) => ({ ym: m, rows: calcGradeMetrics(collabs, videos, creators, m, null, burstThreshold) })),
    [collabs, videos, creators, months, burstThreshold]
  );
  const activeGrades = useMemo(() => {
    const s = new Set();
    allData.forEach(({ rows }) => rows.forEach((r) => s.add(r.grade)));
    return [...s];
  }, [allData]);

  async function handleSaveSnapshot() {
    setSaving(true); setSaveMsg("");
    try {
      for (const p of products) {
        const m = calcMonthMetrics(collabs, videos, ym, p.id);
        await saveProductSnapshot(storeId, p.id, ym, m, userId);
      }
      setSaveMsg(`✅ 已保存 ${products.length} 个产品的 ${ym} 快照`);
      onSnapshotSaved?.();
    } catch (e) { setSaveMsg(`❌ ${e.message}`); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(""), 5000); }
  }

  return (
    <div>
      <div style={rs.tabs}>
        {[["single","单月"],["all","全时期"]].map(([id, label]) => (
          <button key={id} style={rs.tab(view === id)} onClick={() => setView(id)}>{label}</button>
        ))}
      </div>

      {view === "single" && (
        <>
          <div style={rs.toolbar}>
            <span style={rs.label}>统计月份</span>
            <input type="month" style={rs.monthInp} value={ym} onChange={(e) => setYm(e.target.value)} />
            <button style={rs.btn} onClick={handleSaveSnapshot} disabled={saving}>
              {saving ? "保存中…" : "📸 一键保存快照"}
            </button>
            {saveMsg && <span style={{ fontSize: 12, color: saveMsg.startsWith("✅") ? T.success : T.danger }}>{saveMsg}</span>}
          </div>
          <div style={{ ...glassStyle(14), overflow: "hidden" }}>
            {singleData.length === 0
              ? <div style={rs.empty}>该月暂无视频数据</div>
              : (
                <table style={rs.table}>
                  <thead><tr>
                    <th style={rs.th}>等级</th>
                    <th style={rs.thR}>视频数</th>
                    <th style={rs.thR}>占比</th>
                    <th style={rs.thR}>出单视频</th>
                    <th style={rs.thR}>视频出单率</th>
                    <th style={rs.thR}>总出单</th>
                    <th style={rs.thR}>均单/视频</th>
                    <th style={rs.thR}>爆单数</th>
                  </tr></thead>
                  <tbody>
                    {singleData.map((r) => (
                      <tr key={r.grade}>
                        <td style={rs.td}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 9, height: 9, borderRadius: "50%", background: GRADE_COLORS[r.grade] || T.muted, flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, color: GRADE_COLORS[r.grade] || T.muted }}>{r.grade}</span>
                          </span>
                        </td>
                        <td style={rs.tdR}>{r.videoCount}</td>
                        <td style={rs.tdR}>{rs.pct(r.videoPct)}</td>
                        <td style={rs.tdR}>{r.withSales}</td>
                        <td style={{ ...rs.tdR, fontWeight: 600, color: r.videoSaleRate == null ? T.hint : r.videoSaleRate >= 0.3 ? T.success : r.videoSaleRate >= 0.15 ? T.accent : T.danger }}>
                          {rs.pct(r.videoSaleRate)}
                        </td>
                        <td style={{ ...rs.tdR, fontWeight: 600 }}>{r.orders}</td>
                        <td style={{ ...rs.tdR, color: T.accent, fontWeight: 600 }}>{rs.dec(r.avgOrder)}</td>
                        <td style={{ ...rs.tdR, color: r.burstCount > 0 ? T.success : T.hint, fontWeight: 600 }}>{r.burstCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        </>
      )}

      {view === "all" && (
        <>
          <div style={rs.toolbar}>
            <input type="month" style={rs.monthInp} value={fromYm} onChange={(e) => setFromYm(e.target.value)} />
            <span style={{ color: T.hint }}>—</span>
            <input type="month" style={rs.monthInp} value={toYm} onChange={(e) => setToYm(e.target.value)} />
            <span style={{ fontSize: 12, color: T.hint }}>列：各等级均单/视频</span>
          </div>
          <div style={{ ...glassStyle(14), overflow: "auto" }}>
            <table style={rs.table}>
              <thead><tr>
                <th style={{ ...rs.th, position: "sticky", left: 0, background: "rgba(240,245,255,0.98)", zIndex: 1 }}>月份</th>
                <th style={rs.thR}>总视频</th>
                <th style={rs.thR}>出单率</th>
                <th style={rs.thR}>总出单</th>
                {activeGrades.map((g) => (
                  <th key={g} style={{ ...rs.thR, color: GRADE_COLORS[g] || T.muted }}>
                    {g}<br /><span style={{ fontSize: 10, fontWeight: 400, color: T.hint }}>均单/视频</span>
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {allData.map(({ ym: m, rows }) => {
                  const total = rows.reduce((s, r) => s + r.videoCount, 0);
                  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
                  const totalWithSales = rows.reduce((s, r) => s + r.withSales, 0);
                  return (
                    <tr key={m}>
                      <td style={{ ...rs.td, fontWeight: 700, position: "sticky", left: 0, background: "rgba(240,245,255,0.98)", zIndex: 1 }}>{m}</td>
                      <td style={rs.tdR}>{total || "—"}</td>
                      <td style={rs.tdR}>{rs.pct(total ? totalWithSales / total : null)}</td>
                      <td style={{ ...rs.tdR, fontWeight: 600 }}>{totalOrders || "—"}</td>
                      {activeGrades.map((g) => {
                        const row = rows.find((r) => r.grade === g);
                        return <td key={g} style={{ ...rs.tdR, color: GRADE_COLORS[g] || T.hint, fontWeight: row?.avgOrder ? 600 : 400 }}>
                          {row?.avgOrder ? rs.dec(row.avgOrder) : "—"}
                        </td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
