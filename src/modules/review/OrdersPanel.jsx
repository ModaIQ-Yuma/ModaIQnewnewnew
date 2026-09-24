// modules/review/OrdersPanel.jsx — 整体效率：月度总出单 / 自然流量单（FSorder 自动拉取，可手动覆盖）
import { T, FONT } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { Hint } from "../../components/layout/SubNav.jsx";
import { MCard, CardGrid, AreaTitle, pct, num } from "./ReviewCards.jsx";

/**
 * @param fs      useFsorderOrders 的结果      @param manual { total, organic } 手填（字符串，空 = 用自动值）
 * @param window  FSorder 拉取的日期窗口        @param videoOrders 区间内新视频出单
 */
export function OrdersPanel({ fs, manual, setManual, window, videoOrders }) {
  const total   = manual.total   !== "" ? Number(manual.total)   : fs.data?.totalOrders ?? null;
  const organic = manual.organic !== "" ? Number(manual.organic) : fs.data?.organicOrders ?? null;
  const status = !fs.enabled ? "本店未接入订单站，请手动填写"
    : !window ? "视频端选了「全部」时不自动拉取，可手动填写"
    : fs.loading ? "正在从 FSorder 拉取…" : fs.error ? `拉取失败：${fs.error}` : fs.data ? `✅ 已从 FSorder 拉取（${window.from} ~ ${window.to}），可手动覆盖` : "FSorder 这段时间没有数据，请手动填写";
  const input = (k, ph) => (
    <input value={manual[k]} placeholder={ph} onChange={(e) => setManual({ ...manual, [k]: e.target.value.replace(/[^\d]/g, "") })}
      style={{ ...rs.monthInp, width: 110 }} />
  );
  return (
    <>
      <AreaTitle chip="整体效率" label="整店订单 vs 新视频出单" note={status} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <span style={rs.label}>月度总出单</span>{input("total", num(fs.data?.totalOrders ?? null))}
        <span style={rs.label}>自然流量单</span>{input("organic", num(fs.data?.organicOrders ?? null))}
        {(manual.total !== "" || manual.organic !== "") && <button style={rs.btnGhost} onClick={() => setManual({ total: "", organic: "" })}>用自动值</button>}
      </div>
      <CardGrid>
        <MCard label="月度总出单" value={num(total)} sub="整店该商品全部订单" />
        <MCard label="新视频出单占比" value={pct(total ? videoOrders / total : null)} sub="新视频出单 ÷ 总出单" accent />
        <MCard label="自然单占比" value={pct(total && organic != null ? organic / total : null)} sub="自然流量单 ÷ 总出单" />
      </CardGrid>
      <Hint style={{ marginTop: 6, fontSize: FONT.note, color: T.hint }}>默认按月时，订单窗口与视频口径一致：当月 1 日 ~ 次月 5 日。</Hint>
    </>
  );
}
