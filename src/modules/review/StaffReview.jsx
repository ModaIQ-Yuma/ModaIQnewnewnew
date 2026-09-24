// modules/review/StaffReview.jsx — 助理复盘：总览（含合计）在上，按产品明细折叠在下
import { useMemo, useState } from "react";
import { glassStyle, T } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { RangePicker } from "./ReviewFilters.jsx";
import { calcStaffOverview } from "../../lib/review/staffCalc.js";
import { useReviewRange } from "../../hooks/useReviewRange.js";
import { AreaTitle } from "./ReviewCards.jsx";

const thisMonth = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" }).slice(0, 7);
const COLS = [
  ["寄样", "shipCount"], ["履约", "fulfillCount"], ["履约率", "fulfillRate", "pct"], ["出单达人", "withSalesCount"],
  ["达人出单率", "saleRate", "pct"], ["视频数", "videoCount"], ["视频出单", "videoOrders"], ["样销比", "sampleSalesRatio", "dec"],
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
  const range = useReviewRange(thisMonth());
  const [open, setOpen] = useState(() => new Set());
  const nameOf = useMemo(() => {
    const m = Object.fromEntries((staff || []).map((s) => [s.id, s.name]));
    return (id) => (id === "unknown" ? "未指定" : m[id] || `ID:${String(id).slice(0, 8)}`);
  }, [staff]);
  const base = useMemo(() => ({ collabs, videos, invites, staff, ship: range.ship, video: range.video, burst: burstThreshold }),
    [collabs, videos, invites, staff, range.ship, range.video, burstThreshold]);
  const overview = useMemo(() => calcStaffOverview(base), [base]);
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      <RangePicker range={range} />
      <AreaTitle chip="总览" label="全部产品合计" note="寄样/履约/出单/样销比 看寄样的全部视频（不限时间）；视频数/视频出单/爆单 = 视频区间内发布的视频；邀约录入按视频区间统计" />
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
