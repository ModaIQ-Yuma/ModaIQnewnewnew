// modules/review/StaffReview.jsx — 助理复盘：总览（含合计）在上，按产品明细折叠在下
import { useMemo, useState } from "react";
import { thisMonthPST } from "../../lib/dates.js";
import { glassStyle, T } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { RangePicker } from "./ReviewFilters.jsx";
import { calcStaffOverview } from "../../lib/review/staffCalc.js";
import { useReviewRange } from "../../hooks/useReviewRange.js";
import { AreaTitle } from "./ReviewCards.jsx";

const COLS = [
  ["寄样", "shipCount"], ["履约", "fulfillCount"], ["履约率", "fulfillRate", "pct"], ["出单达人", "withSalesCount"],
  ["达人出单率", "saleRate", "pct"], ["样销比", "sampleSalesRatio", "dec"],
  ["视频数", "videoCount"], ["出单视频数", "videoWithSales"], ["视频出单率", "videoSaleRate", "pct"], ["视频出单件数", "videoOrders"],
  ["爆单", "burstCount"], ["邀约录入", "inviteCount"],
];
const fmt = (v, f) => (f === "pct" ? rs.pct(v) : f === "dec" ? rs.dec(v) : v ?? "—");

function StaffTable({ data, nameOf }) {
  return (
    <div style={{ ...glassStyle(14), overflowX: "auto" }}>
      <table style={rs.table}>
        <thead><tr><th style={rs.th}>助理</th>{COLS.map(([h]) => <th key={h} style={rs.thR}>{h}</th>)}</tr></thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.staffId}>
              <td style={{ ...rs.td, fontWeight: 600 }}>{nameOf(r.staffId)}</td>
              {COLS.map(([h, k, f]) => <td key={h} style={rs.tdR}>{fmt(r[k], f)}</td>)}
            </tr>
          ))}
          <tr style={{ background: `${T.accent}0d` }}>
            <td style={{ ...rs.td, fontWeight: 800 }}>合计</td>
            {COLS.map(([h, k, f]) => <td key={h} style={{ ...rs.tdR, fontWeight: 800 }}>{fmt(data.total[k], f)}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function StaffReview({ collabs, videos, invites, products, staff, burstThreshold }) {
  const range = useReviewRange(thisMonthPST());
  const [open, setOpen] = useState(() => new Set());
  const nameOf = useMemo(() => {
    const m = Object.fromEntries((staff || []).map((s) => [s.id, s.name]));
    return (id) => (id === "unknown" ? "未指定" : m[id] || `ID:${String(id).slice(0, 8)}`);
  }, [staff]);
  const base = useMemo(() => ({ collabs, videos, invites, staff, ship: range.ship, video: range.video, burst: burstThreshold }),
    [collabs, videos, invites, staff, range.ship, range.video, burstThreshold]);
  const overview = useMemo(() => calcStaffOverview(base), [base]);
  const span = (r) => (r.from || r.to ? `${r.from || "最早"} ~ ${r.to || "最新"}` : "全部");
  const shipAllVideoNot = !range.ship.from && !range.ship.to && (range.video.from || range.video.to);
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      <RangePicker range={range} />
      {shipAllVideoNot && (
        <div style={{ fontSize: 13, color: T.warning, marginBottom: 10 }}>
          寄样端是「全部」，但视频端仍是 {span(range.video)}，视频相关的列只统计这段时间发布的视频。
          <button style={{ ...rs.btnGhost, marginLeft: 8 }} onClick={() => range.setVideo({ from: "", to: "" })}>视频端也看全部</button>
        </div>
      )}
      <AreaTitle chip="总览" label="全部产品合计" note={`寄样：${span(range.ship)}｜视频：${span(range.video)}　·　寄样类列看这些寄样的全部视频（不限时间）；视频类列 = 视频区间内发布、挂在该助理寄样上的视频（非CRM视频不计入）`} />
      <StaffTable data={overview} nameOf={nameOf} />

      <AreaTitle chip="明细" label="按产品拆分" note="点产品名展开" />
      {products.map((p) => {
        const isOpen = open.has(p.id);
        const data = isOpen ? calcStaffOverview({ ...base, productId: p.id }) : null;
        return (
          <div key={p.id} style={{ marginBottom: 8 }}>
            <div onClick={() => toggle(p.id)} style={{ ...rs.groupTitle, cursor: "pointer", marginBottom: 6 }}>{isOpen ? "▾" : "▸"} {p.internal_name}</div>
            {isOpen && (data.rows.length ? <StaffTable data={data} nameOf={nameOf} /> : <div style={rs.empty}>这个区间没有数据</div>)}
          </div>
        );
      })}
    </div>
  );
}
