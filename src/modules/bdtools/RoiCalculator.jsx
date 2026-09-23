import { useState } from "react";
import { T, FONT, glassStyle } from "../../constants/tokens.js";
import { Inp, Sel } from "../../components/ui/index.jsx";
const Card = ({ children, style = {} }) => <div style={{ ...glassStyle(14), padding:"16px 18px", ...style }}>{children}</div>;
const SectionLabel = ({ children }) => <div style={{ fontSize:FONT.x4l, fontWeight:700, color:T.text, marginBottom:14 }}>{children}</div>;

const chip = (color, text) => (
  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: `${color}22`, color, fontWeight: 700, marginRight: 8 }}>{text}</span>
);

export default function RoiCalculator({ products = [] }) {
  const [roiProduct, setRoiProduct] = useState("");
  const [v, setV] = useState({});
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));
  const f = (k) => parseFloat(v[k]) || 0;

  const sp = f("salePrice");
  const materialCost = f("materialCost");
  const freightIn = f("freightIn");
  const freightOut = f("freightOut");
  const fixedCost = materialCost + freightIn + freightOut;
  const platformRate = f("platformRate") / 100;
  const companyRate  = f("companyRate")  / 100;
  const adRate       = f("adRate")       / 100;
  const influencerRate = f("influencerRate") / 100;
  const rateSum = platformRate + companyRate + adRate + influencerRate;
  const rateTotal = sp * rateSum;
  const netProfit = sp - fixedCost - rateTotal;
  const pit = f("pitFee");
  const breakEven = netProfit > 0 ? Math.ceil((pit + fixedCost) / netProfit) : null;

  const dollar = (x) => x > 0 ? `$${x.toFixed(2)}` : "—";

  return (
    <div>
      <SectionLabel>付费回本计算</SectionLabel>

      <div style={{ marginBottom: 12, maxWidth: 280 }}>
        <div style={lbl}>产品（可选）</div>
        <Sel value={roiProduct} onChange={setRoiProduct} style={{ width: "100%" }}>
          <option value="">— 选择产品 —</option>
          {products.map((p) => { const n = p.internal_name; return <option key={p.id || n} value={n}>{n}</option>; })}
        </Sel>
      </div>

      {/* ── 板块一：产品售价 ── */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14, display: "flex", alignItems: "center" }}>
          {chip(T.info, "板块一")}产品售价
        </div>
        <div style={{ maxWidth: 200 }}>
          <div style={lbl}>售价 ($)</div>
          <Inp value={v["salePrice"] || ""} onChange={(val) => set("salePrice", val)} placeholder="eg. 29.99" />
        </div>
      </Card>

      {/* ── 板块二：单件固定成本 ── */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14, display: "flex", alignItems: "center" }}>
          {chip(T.warning, "板块二")}单件产品固定成本项
          <span style={{ fontSize: 11.5, color: T.hint, fontWeight: 400, marginLeft: 8 }}>每卖出一件都要承担的货物本体成本</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "start" }}>
          <div>
            <div style={lbl}>产品物料成本 ($)</div>
            <Inp value={v["materialCost"] || ""} onChange={(val) => set("materialCost", val)} placeholder="eg. 6.00" />
          </div>
          <div>
            <div style={lbl}>头程运费 ($)</div>
            <Inp value={v["freightIn"] || ""} onChange={(val) => set("freightIn", val)} placeholder="eg. 1.50" />
            <div style={hint}>发货到海外仓的费用（按件均摊）</div>
          </div>
          <div>
            <div style={lbl}>尾程运费 ($)</div>
            <Inp value={v["freightOut"] || ""} onChange={(val) => set("freightOut", val)} placeholder="eg. 3.00" />
            <div style={hint}>从海外仓到买家的费用</div>
          </div>
          <div style={{ background: `${T.info}10`, border: `1.5px solid ${T.info}33`, borderRadius: 10, padding: "12px 14px", minWidth: 120 }}>
            <div style={{ fontSize: 11, color: T.info, fontWeight: 700, marginBottom: 4 }}>固定成本小计</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.info }}>{fixedCost > 0 ? `$${fixedCost.toFixed(2)}` : "—"}</div>
            <div style={{ fontSize: 11, color: T.hint, marginTop: 2 }}>物料 + 头程 + 尾程</div>
          </div>
        </div>

        {/* 各方抽佣 */}
        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 16, paddingTop: 14 }}>
          <div style={{ fontSize: 12.5, color: T.muted, fontWeight: 700, marginBottom: 10 }}>各方抽佣比例（按售价计算）</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, alignItems: "start" }}>
            <div>
              <div style={lbl}>平台抽佣 (%)</div>
              <Inp value={v["platformRate"] || ""} onChange={(val) => set("platformRate", val)} placeholder="eg. 8" />
              <div style={hint}>TikTok Shop 平台手续费</div>
            </div>
            <div>
              <div style={lbl}>公司抽成 (%)</div>
              <Inp value={v["companyRate"] || ""} onChange={(val) => set("companyRate", val)} placeholder="eg. 10" />
            </div>
            <div>
              <div style={lbl}>广告费率 (%)</div>
              <Inp value={v["adRate"] || ""} onChange={(val) => set("adRate", val)} placeholder="eg. 15" />
              <div style={hint}>广告投放占售价的比例</div>
            </div>
            <div>
              <div style={lbl}>达人佣金率 (%)</div>
              <Inp value={v["influencerRate"] || ""} onChange={(val) => set("influencerRate", val)} placeholder="eg. 20" />
            </div>
          </div>
          {sp > 0 && rateSum > 0 && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: `${T.warning}10`, borderRadius: 8, fontSize: 12.5, color: T.muted }}>
              抽佣合计：<b style={{ color: T.warning }}>${rateTotal.toFixed(2)}</b>（{(rateSum * 100).toFixed(1)}% × ${sp}）
            </div>
          )}
        </div>
      </Card>

      {/* ── 板块三：坑位费（推广固定成本）── */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14, display: "flex", alignItems: "center" }}>
          {chip(T.danger, "板块三")}坑位费（推广固定成本）
          <span style={{ fontSize: 11.5, color: T.hint, fontWeight: 400, marginLeft: 8 }}>不随出单量变化的固定推广支出</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start", maxWidth: 420 }}>
          <div>
            <div style={lbl}>坑位费 ($)</div>
            <Inp value={v["pitFee"] || ""} onChange={(val) => set("pitFee", val)} placeholder="eg. 300" />
          </div>
          <div style={{ background: `${T.danger}10`, border: `1.5px solid ${T.danger}33`, borderRadius: 10, padding: "12px 14px", minWidth: 150 }}>
            <div style={{ fontSize: 11, color: T.danger, fontWeight: 700, marginBottom: 4 }}>坑位费总成本</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.danger }}>{(pit + fixedCost) > 0 ? `$${(pit + fixedCost).toFixed(2)}` : "—"}</div>
            <div style={{ fontSize: 11, color: T.hint, marginTop: 2 }}>坑位费 + 物料 + 头程 + 尾程</div>
          </div>
        </div>
      </Card>

      {/* ── 计算结果 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.72)", border: `1.5px solid ${netProfit > 0 ? T.success : T.danger}55`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, marginBottom: 8 }}>单件产品净利润</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: netProfit > 0 ? T.success : netProfit < 0 ? T.danger : T.muted }}>
            {sp > 0 ? `$${netProfit.toFixed(2)}` : "—"}
          </div>
          {sp > 0 && (
            <div style={{ fontSize: 11, color: T.hint, marginTop: 6, lineHeight: 1.7 }}>
              ${sp} 售价<br />
              − ${fixedCost.toFixed(2)} 固定成本<br />
              − ${rateTotal.toFixed(2)} 各方抽佣
            </div>
          )}
        </div>
        <div style={{ background: "rgba(255,255,255,0.72)", border: `1.5px solid ${breakEven ? T.accent : T.border}55`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, marginBottom: 8 }}>该达人保本单量</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: breakEven ? T.accent : T.danger }}>
            {breakEven ? `${breakEven} 单` : (netProfit <= 0 && sp > 0 ? "无法回本" : "—")}
          </div>
          {breakEven && (
            <div style={{ fontSize: 11, color: T.hint, marginTop: 6, lineHeight: 1.7 }}>
              (坑位费 ${pit} + 固定成本 ${fixedCost.toFixed(2)})<br />
              ÷ 净利润 ${netProfit.toFixed(2)} / 件
            </div>
          )}
          {netProfit <= 0 && sp > 0 && <div style={{ fontSize: 12, color: T.danger, marginTop: 6 }}>单件利润为负，无论卖多少单都无法回本</div>}
        </div>
      </div>
    </div>
  );
}

const lbl = { fontSize: 12.5, fontWeight: 600, color: T.muted, marginBottom: 5 };
const hint = { fontSize: 11, color: T.hint, marginTop: 4 };
