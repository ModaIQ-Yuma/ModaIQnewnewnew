// modules/review/ProductReview.jsx — 单品复盘：任意寄样/视频区间（或全量）+ 等级分层 + 整店订单
import { useMemo, useState } from "react";
import { glassStyle, T, FONT } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { ORDER_WINDOW_TAIL_DAYS } from "../../constants/config.js";
import { calcRangeMetrics, calcShipGradeMetrics, calcVideoGradeMetrics } from "../../lib/review/rangeCalc.js";
import { cutoffOf } from "../../lib/video/cutoff.js";
import { useReviewRange } from "../../hooks/useReviewRange.js";
import { useFsorderOrders } from "../../hooks/useFsorderOrders.js";
import { RangePicker } from "./ReviewFilters.jsx";
import { ShipGradeTable, VideoGradeTable } from "./GradeTables.jsx";
import { OrdersPanel } from "./OrdersPanel.jsx";
import { MCard, CardGrid, AreaTitle, pct, num, dec, wan } from "./ReviewCards.jsx";
import { confirmIncomplete, describeSave } from "./snapshotUi.js";

const thisMonth = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" }).slice(0, 7);
const spanLabel = (r) => (r.from || r.to ? `${r.from || "最早"} ~ ${r.to || "最新"}` : "全部");

export default function ProductReview({ storeId, collabs, videos, products, burstThreshold, saver, canSnapshot }) {
  const range = useReviewRange(thisMonth());
  const [productId, setProductId] = useState("");                  // "" = 全部产品
  const [manual, setManual] = useState({ total: "", organic: "" });
  const [saveMsg, setSaveMsg] = useState("");
  const product = products.find((p) => p.id === productId) || null;

  const args = useMemo(() => ({ collabs, videos, productId: productId || null, ship: range.ship, video: range.video, burst: burstThreshold }),
    [collabs, videos, productId, range.ship, range.video, burstThreshold]);
  const m          = useMemo(() => calcRangeMetrics(args), [args]);
  const shipGrades = useMemo(() => calcShipGradeMetrics(args), [args]);
  const vidGrades  = useMemo(() => calcVideoGradeMetrics(args), [args]);

  // FSorder 窗口：默认按月 = 当月 1 日 ~ 次月 5 日（与快照口径一致）；自选区间 = 视频端区间
  const fsWindow = range.isMonthDefault ? { from: `${range.ym}-01`, to: cutoffOf(range.ym, ORDER_WINDOW_TAIL_DAYS) }
    : (range.video.from && range.video.to ? range.video : null);
  const fs = useFsorderOrders(storeId, fsWindow, product?.sku_id || null);

  async function handleSave() {
    if (saver.busy) return;
    setSaveMsg("");
    const manualOrders = product && (manual.total !== "" || manual.organic !== "")
      ? { [product.id]: { totalOrders: manual.total !== "" ? Number(manual.total) : fs.data?.totalOrders ?? null,
                          organicOrders: manual.organic !== "" ? Number(manual.organic) : fs.data?.organicOrders ?? null } } : undefined;
    try { setSaveMsg(describeSave(await saver.saveMonths([range.ym], { productIds: product ? [product.id] : undefined, confirmIncomplete, manualOrders }))); }
    catch (e) { setSaveMsg(`❌ 保存失败：${e.message}`); }
    finally { setTimeout(() => setSaveMsg(""), 8000); }
  }

  return (
    <div>
      <div style={{ ...glassStyle(14), padding: "14px 18px", marginBottom: 12 }}>
        <div style={{ ...rs.toolbar, marginBottom: 6 }}>
          <span style={rs.label}>产品</span>
          <select value={productId} onChange={(e) => { setProductId(e.target.value); setManual({ total: "", organic: "" }); }} style={{ ...rs.monthInp, minWidth: 160, cursor: "pointer" }}>
            <option value="">全部产品</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.internal_name}</option>)}
          </select>
        </div>
        <RangePicker range={range} />
      </div>

      <AreaTitle chip="寄样端" label="从 CRM 寄样记录计算" note={`寄样区间 ${spanLabel(range.ship)} · 看这些寄样的全部视频，不限发布时间`} />
      <CardGrid>
        <MCard label="合作达人数"   value={num(m.shipCount)}      sub="寄样记录数" />
        <MCard label="履约达人数"   value={num(m.fulfillCount)}   sub="发过视频（不限发布时间）" />
        <MCard label="有出单达人数" value={num(m.withSalesCount)} sub="该寄样累计出单 ≥ 1" />
        <MCard label="履约率"       value={pct(m.fulfillRate)}    sub="履约 ÷ 寄样" />
        <MCard label="达人出单率"   value={pct(m.saleRate)}       sub="出单达人 ÷ 履约" accent />
        <MCard label="平均履约天数" value={m.avgFulfillDays == null ? "—" : m.avgFulfillDays + " 天"} sub="寄样 → 首条视频" />
        <MCard label="样销比"       value={dec(m.sampleSalesRatio)} sub="寄样累计出单 ÷ 寄样数" />
      </CardGrid>
      <AreaTitle chip="寄样端" label="各等级寄样（按寄样时等级）" />
      <ShipGradeTable rows={shipGrades} />

      <AreaTitle chip="视频端" label="CRM + 非CRM 视频合计" note={`视频区间 ${spanLabel(range.video)}`} />
      <CardGrid>
        <MCard label="新视频数"     value={num(m.videoCount)}    sub="区间内发布的视频" />
        <MCard label="视频出单率"   value={pct(m.videoSaleRate)} sub="有成交 ÷ 新视频" accent />
        <MCard label="总播放量 VV"  value={wan(m.totalVV)}       sub="播放量之和" />
        <MCard label="总点击"       value={wan(m.totalClicks)}   sub="商品点击之和" />
        <MCard label="CTR"          value={pct(m.ctr)}           sub="点击 ÷ 播放" />
        <MCard label="新视频出单数" value={num(m.videoOrders)}   sub="出单件数之和" />
        <MCard label="CVR"          value={pct(m.cvr)}           sub="出单 ÷ 点击" />
        <MCard label={`爆单视频（≥${burstThreshold}单）`} value={num(m.burstCount)} sub="单条视频成交 ≥ 阈值" />
      </CardGrid>
      <AreaTitle chip="视频端" label="各等级视频（按视频所属寄样的等级）" />
      <VideoGradeTable rows={vidGrades} />

      <OrdersPanel fs={fs} manual={manual} setManual={setManual} window={fsWindow} videoOrders={m.videoOrders} />

      {canSnapshot && <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
        <button onClick={handleSave} disabled={saver.busy} style={{ ...rs.btn, opacity: saver.busy ? 0.6 : 1 }}>
          {saver.busy ? "保存中…" : `💾 保存 ${range.ym} 快照（${product ? product.internal_name : "全部产品"}）`}
        </button>
        <span style={{ fontSize: FONT.note, color: T.hint }}>快照一律按统一口径计算（寄样账期、视频截止次月 5 日），不受上面手动改的区间影响；手填的总出单/自然单会一并存入。</span>
        {saveMsg && <span style={{ fontSize: FONT.body, color: saveMsg.startsWith("❌") ? T.danger : T.success, fontWeight: 600 }}>{saveMsg}</span>}
      </div>}
    </div>
  );
}
