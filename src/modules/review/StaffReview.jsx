// modules/review/StaffReview.jsx
import { useState, useMemo } from "react";
import { glassStyle, T } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { VideoDateRange, ScopeHint } from "./ReviewFilters.jsx";
import { calcStaffMetrics } from "../../lib/review/reviewCalc.js";
import { videoRange } from "../../lib/utils.js";

const thisMonth = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };

export default function StaffReview({ collabs, videos, invites, products, staff }) {
  const [ym,        setYm]        = useState(thisMonth);
  const [videoFrom, setVideoFrom] = useState("");
  const [videoTo,   setVideoTo]   = useState("");

  const vFrom = videoFrom||undefined;
  const vTo   = videoTo||undefined;

  const inviteMap = useMemo(() => {
    const vr   = videoRange(ym);
    const from = videoFrom||vr.from;
    const to   = videoTo||vr.to;
    const map  = {};
    for (const inv of invites) {
      const d = inv.added_at?.slice(0,10);
      if (!d||d<from||d>to) continue;
      const key = `${inv.added_by}__${inv.product_id}`;
      map[key] = (map[key]||0)+1;
    }
    return map;
  }, [invites,ym,videoFrom,videoTo]);

  const staffNameMap = useMemo(()=>Object.fromEntries((staff||[]).map(s=>[s.id,s.name])),[staff]);

  return (
    <div>
      <div style={rs.toolbar}>
        <span style={rs.label}>统计月份</span>
        <input type="month" style={rs.monthInp} value={ym} onChange={e=>setYm(e.target.value)} />
        <VideoDateRange from={videoFrom} to={videoTo} onFrom={setVideoFrom} onTo={setVideoTo} />
        <ScopeHint />
      </div>
      {products.map(p=>{
        const rows = calcStaffMetrics(collabs,videos,ym,p.id,vFrom,vTo);
        if (!rows.length) return null;
        return (
          <div key={p.id} style={{ marginBottom:20 }}>
            <div style={rs.groupTitle}>{p.internal_name}</div>
            <div style={{ ...glassStyle(14),overflow:"hidden" }}>
              <table style={rs.table}>
                <thead><tr>
                  <th style={rs.th}>助理</th>
                  <th style={rs.thR}>寄样数</th><th style={rs.thR}>履约数</th><th style={rs.thR}>履约率</th>
                  <th style={rs.thR}>出单达人</th><th style={rs.thR}>达人出单率</th><th style={rs.thR}>拉新数</th>
                </tr></thead>
                <tbody>
                  {rows.map(r=>{
                    const inviteCount = inviteMap[`${r.staffId}__${p.id}`]||0;
                    const name = staffNameMap[r.staffId]||`ID:${r.staffId?.slice(0,8)||"未知"}`;
                    return (
                      <tr key={r.staffId}>
                        <td style={{ ...rs.td,fontWeight:600 }}>{name}</td>
                        <td style={rs.tdR}>{r.shipCount}</td>
                        <td style={rs.tdR}>{r.fulfillCount}</td>
                        <td style={{ ...rs.tdR,color:r.fulfillRate>=0.6?T.success:T.accent }}>{rs.pct(r.fulfillRate)}</td>
                        <td style={rs.tdR}>{r.withSalesCount}</td>
                        <td style={{ ...rs.tdR,color:r.saleRate>=0.3?T.success:T.accent }}>{rs.pct(r.saleRate)}</td>
                        <td style={{ ...rs.tdR,fontWeight:600,color:T.accent }}>{inviteCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
