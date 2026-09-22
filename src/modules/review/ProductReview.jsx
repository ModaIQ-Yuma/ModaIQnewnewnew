// modules/review/ProductReview.jsx
import { useState, useMemo } from "react";
import { glassStyle, T, FONT } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { calcMonthMetrics, calcGradeMetrics } from "../../lib/review/reviewCalc.js";
import { saveProductSnapshot } from "../../lib/supabase/reviewWrite.js";
import { monthlyShipRange, videoRange } from "../../lib/utils.js";

const GRADE_COLORS = { Lv1:"#94A3B8",Lv2:"#60A5FA",Lv3:"#34D399",Lv4:"#FBBF24",Lv5:"#F97316",Lv6:"#A78BFA",Lv7:"#EC4899","未标注":"#CBD5E1","非CRM":"#F59E0B" };
const thisMonth = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" }).slice(0, 7);
const pct = (v) => v == null ? "—" : (v * 100).toFixed(1) + "%";
const num = (v) => v == null ? "—" : Number(v).toLocaleString();
const dec = (v) => v == null ? "—" : Number(v).toFixed(2);

// ── 指标卡 ────────────────────────────────────────────────────────────────────
function MCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.72)", border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: FONT.md2, color: T.muted, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? T.accent : T.text, letterSpacing: "-0.3px" }}>{value}</div>
      {sub && <div style={{ fontSize: FONT.xs, color: T.hint, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── 分区标题（chip 标签） ─────────────────────────────────────────────────────
function AreaTitle({ chip, label, note }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 10px" }}>
      <span style={{ fontSize: FONT.sm, fontWeight: 800, color: "#fff", background: T.accent, borderRadius: 8, padding: "3px 10px", letterSpacing: "0.04em" }}>{chip}</span>
      <span style={{ fontSize: FONT.lg2, fontWeight: 700, color: T.text }}>{label}</span>
      {note && <span style={{ fontSize: FONT.md2, color: T.hint }}>{note}</span>}
    </div>
  );
}

// ── 日期输入 ──────────────────────────────────────────────────────────────────
const inpStyle = { background: "rgba(255,255,255,0.45)", border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: FONT.lg2, padding: "7px 10px", fontFamily: "inherit", outline: "none" };

export default function ProductReview({ collabs, videos, creators, products, storeId, userId, burstThreshold, reloadReview }) {
  const [ym,        setYm]        = useState(thisMonth);
  const [productId, setProductId] = useState(() => products[0]?.id || "");
  const [videoFrom, setVideoFrom] = useState("");
  const [videoTo,   setVideoTo]   = useState("");
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState("");

  const product = products.find((p) => p.id === productId);

  // 寄样区间（跟随月份自动计算，只展示不可改 — 和旧版一致）
  const shipRangeLabel = useMemo(() => {
    const r = monthlyShipRange(ym);
    return `${r.start} ~ ${r.end}`;
  }, [ym]);

  const vFrom = videoFrom || undefined;
  const vTo   = videoTo   || undefined;

  const metrics   = useMemo(() => productId ? calcMonthMetrics(collabs, videos, ym, productId, vFrom, vTo)   : null, [collabs, videos, ym, productId, vFrom, vTo]);
  const gradeRows = useMemo(() => productId ? calcGradeMetrics(collabs, videos, creators, ym, productId, burstThreshold, vFrom, vTo) : [], [collabs, videos, creators, ym, productId, burstThreshold, vFrom, vTo]);
  const crmRows   = gradeRows.filter((r) => r.grade !== "非CRM");

  // 该产品该月是否已有快照
  const existingSnap = useMemo(() => {
    // gradeSnapshots 在 ctx 里，通过 reloadReview 触发刷新
    // 这里不直接访问，保存成功后提示即可
    return null;
  }, []);

  async function handleSave() {
    if (!metrics || !productId || saving) return;
    setSaving(true); setSaveMsg("");
    try {
      await saveProductSnapshot(storeId, productId, ym, metrics, userId);
      setSaveMsg(`✅ ${product?.internal_name || ""} ${ym} 快照已保存`);
      reloadReview?.();
    } catch (e) {
      setSaveMsg(`❌ 保存失败：${e.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 5000);
    }
  }

  const m = metrics;

  return (
    <div>
      {/* ── 选择区 ── */}
      <div style={{ ...glassStyle(14), padding: "16px 20px", marginBottom: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
          <div>
            <div style={lbl}>产品</div>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} style={{ ...inpStyle, minWidth: 160, cursor: "pointer" }}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.internal_name}</option>)}
            </select>
          </div>
          <div>
            <div style={lbl}>统计月份</div>
            <input type="month" value={ym} onChange={(e) => setYm(e.target.value)} style={inpStyle} />
          </div>
          <div>
            <div style={lbl}>视频端区间（可选，默认自然月）</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="date" value={videoFrom} onChange={(e) => setVideoFrom(e.target.value)} style={inpStyle} />
              <span style={{ color: T.hint }}>~</span>
              <input type="date" value={videoTo}   onChange={(e) => setVideoTo(e.target.value)}   style={inpStyle} />
              {(videoFrom || videoTo) && <button onClick={() => { setVideoFrom(""); setVideoTo(""); }} style={rs.btnGhost}>清除</button>}
            </div>
          </div>
        </div>
      </div>

      {!m && <div style={rs.empty}>选择产品后自动显示各项指标</div>}

      {m && (
        <div>
          {/* ── 寄样端 ── */}
          <AreaTitle chip="寄样端" label="从 CRM 寄样记录自动计算" note={`寄样区间 ${shipRangeLabel}`} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px,1fr))", gap: 10 }}>
            <MCard label="合作达人数"  value={num(m.shipCount)}     sub="寄样记录数" />
            <MCard label="履约达人数"  value={num(m.fulfillCount)}   sub="发过视频" />
            <MCard label="有出单达人数" value={num(m.withSalesCount)} sub="出单视频≥1" />
            <MCard label="履约率"      value={pct(m.fulfillRate)}    sub="履约÷寄样" />
            <MCard label="达人出单率"  value={pct(m.saleRate)}       sub="出单达人÷履约" accent />
            <MCard label="平均履约天数" value={m.avgFulfillDays == null ? "—" : m.avgFulfillDays + "天"} sub="寄样→首视频" />
          </div>

          {/* ── 视频端 ── */}
          <AreaTitle chip="视频端" label="CRM + 非CRM 视频合计" note={vFrom ? `${vFrom} ~ ${vTo}` : `${videoRange(ym).from} ~ ${videoRange(ym).to}`} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px,1fr))", gap: 10 }}>
            <MCard label="新视频数"    value={num(m.videoCount)}      sub="区间内视频总条数" />
            <MCard label="视频出单率"  value={pct(m.videoSaleRate)}    sub="有成交÷新视频" accent />
            <MCard label="总播放量 VV" value={m.totalVV >= 10000 ? (m.totalVV/10000).toFixed(1)+"w" : num(m.totalVV)} sub="所有视频VV之和" />
            <MCard label="总点击"      value={m.totalClicks >= 10000 ? (m.totalClicks/10000).toFixed(1)+"w" : num(m.totalClicks)} sub="商品点击之和" />
            <MCard label="CTR"         value={pct(m.ctr)}              sub="点击÷播放" />
            <MCard label="视频出单数"  value={num(m.videoOrders)}      sub="orders之和" />
            <MCard label="CVR"         value={pct(m.cvr)}              sub="出单÷点击" />
            <MCard label={`爆单视频（≥${burstThreshold}单）`} value={num(m.burstCount)} sub="单视频成交≥阈值" />
            <MCard label="样销比"      value={dec(m.sampleSalesRatio)} sub="视频出单÷寄样数" />
          </div>

          {/* ── 等级分层 ── */}
          {crmRows.length > 0 && (
            <>
              <AreaTitle chip="等级分层" label="CRM 达人按官方等级分组" />
              <div style={{ ...glassStyle(12), overflow: "hidden" }}>
                <table style={rs.table}>
                  <thead><tr style={{ background: "rgba(255,255,255,0.5)" }}>
                    {["等级","视频数","视频出单率","总出单","均单/视频","爆单数"].map((h) => (
                      <th key={h} style={{ ...rs.th, textAlign: h === "等级" ? "left" : "right" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {crmRows.map((r) => (
                      <tr key={r.grade}>
                        <td style={rs.td}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: GRADE_COLORS[r.grade] || T.muted, flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, color: GRADE_COLORS[r.grade] || T.muted }}>{r.grade}</span>
                          </span>
                        </td>
                        <td style={rs.tdR}>{r.videoCount}</td>
                        <td style={{ ...rs.tdR, fontWeight: 600, color: r.videoSaleRate >= 0.3 ? T.success : r.videoSaleRate >= 0.15 ? T.accent : T.danger }}>{pct(r.videoSaleRate)}</td>
                        <td style={{ ...rs.tdR, fontWeight: 600 }}>{r.orders}</td>
                        <td style={{ ...rs.tdR, color: T.accent, fontWeight: 600 }}>{dec(r.avgOrder)}</td>
                        <td style={{ ...rs.tdR, color: r.burstCount > 0 ? T.success : T.hint, fontWeight: 600 }}>{r.burstCount > 0 ? r.burstCount : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── 快照操作 ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <button onClick={handleSave} disabled={saving} style={{ ...rs.btn, opacity: saving ? 0.6 : 1 }}>
              {saving ? "保存中…" : `💾 保存 ${ym} 快照`}
            </button>
            {saveMsg && <span style={{ fontSize: FONT.lg2, color: saveMsg.startsWith("✅") ? T.success : T.danger, fontWeight: 600 }}>{saveMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = { fontSize: FONT.md2, fontWeight: 600, color: T.muted, marginBottom: 5 };
