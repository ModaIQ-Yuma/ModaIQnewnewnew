// modules/review/ProductReview.jsx
import { useState, useMemo } from "react";
import { glassStyle, T, FONT } from "../../constants/tokens.js";
import { rs } from "./reviewStyles.js";
import { calcMonthMetrics, calcGradeMetrics } from "../../lib/review/reviewCalc.js";

const GRADE_COLORS = { Lv1:"#94A3B8",Lv2:"#60A5FA",Lv3:"#34D399",Lv4:"#FBBF24",Lv5:"#F97316",Lv6:"#A78BFA",Lv7:"#EC4899","未标注":"#CBD5E1","非CRM":"#F59E0B" };
const thisMonth = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:FONT.lg2,fontWeight:700,color:T.accent,marginBottom:8,borderLeft:`3px solid ${T.accent}`,paddingLeft:10 }}>{title}</div>
      {children}
    </div>
  );
}

export default function ProductReview({ collabs, videos, creators, products, burstThreshold }) {
  const [ym,        setYm]        = useState(thisMonth);
  const [productId, setProductId] = useState(()=>products[0]?.id||"");
  const [videoFrom, setVideoFrom] = useState("");
  const [videoTo,   setVideoTo]   = useState("");

  const vFrom = videoFrom||undefined;
  const vTo   = videoTo||undefined;

  const metrics   = useMemo(()=> productId?calcMonthMetrics(collabs,videos,ym,productId,vFrom,vTo):null,[collabs,videos,ym,productId,vFrom,vTo]);
  const gradeRows = useMemo(()=> productId?calcGradeMetrics(collabs,videos,creators,ym,productId,burstThreshold,vFrom,vTo):[]  ,[collabs,videos,creators,ym,productId,burstThreshold,vFrom,vTo]);
  const crmRows   = gradeRows.filter(r=>r.grade!=="非CRM");

  return (
    <div>
      <div style={rs.toolbar}>
        <span style={rs.label}>月份</span>
        <input type="month" style={rs.monthInp} value={ym} onChange={e=>setYm(e.target.value)} />
        <span style={rs.label}>产品</span>
        <select style={{ ...rs.monthInp,cursor:"pointer" }} value={productId} onChange={e=>setProductId(e.target.value)}>
          {products.map(p=><option key={p.id} value={p.id}>{p.internal_name}</option>)}
        </select>
        <span style={rs.label}>视频日期</span>
        <input type="date" style={rs.monthInp} value={videoFrom} onChange={e=>setVideoFrom(e.target.value)} />
        <span style={{ color:T.hint }}>—</span>
        <input type="date" style={rs.monthInp} value={videoTo}   onChange={e=>setVideoTo(e.target.value)} />
        {(videoFrom||videoTo)&&<button style={rs.btnGhost} onClick={()=>{setVideoFrom("");setVideoTo("");}}>清除</button>}
      </div>

      {!metrics?<div style={rs.empty}>请选择产品</div>:(
        <>
          <Section title="寄样端（寄样账期内）">
            <div style={rs.metricGrid}>
              {[["合作达人数",rs.num(metrics.shipCount),"寄样记录数"],["履约达人数",rs.num(metrics.fulfillCount),"有视频记录"],["有出单达人数",rs.num(metrics.withSalesCount),"有出单视频"],["履约率",rs.pct(metrics.fulfillRate),"履约÷寄样"],["达人出单率",rs.pct(metrics.saleRate),"出单达人÷履约"]].map(([l,v,s])=>(
                <div key={l} style={rs.metricCard}>
                  <div style={rs.metricLbl}>{l}</div>
                  <div style={rs.metricVal(false)}>{v}</div>
                  <div style={rs.metricSub}>{s}</div>
                </div>
              ))}
            </div>
          </Section>
          <Section title="视频端（CRM + 非CRM）">
            <div style={rs.metricGrid}>
              {[["新视频数",rs.num(metrics.videoCount),"CRM+非CRM"],["出单视频数",rs.num(metrics.videoWithSales),"orders≥1"],["视频出单率",rs.pct(metrics.videoSaleRate),"出单÷总视频"],["总播放量",rs.num(metrics.totalVV),"vv之和"],["总点击量",rs.num(metrics.totalClicks),"clicks之和"],["CTR",rs.pct(metrics.ctr),"点击÷播放"],["视频出单数",rs.num(metrics.videoOrders),"orders之和"],["CVR",rs.pct(metrics.cvr),"出单÷点击"],["样销比",rs.dec(metrics.sampleSalesRatio),"出单÷寄样数"]].map(([l,v,s])=>(
                <div key={l} style={rs.metricCard}>
                  <div style={rs.metricLbl}>{l}</div>
                  <div style={rs.metricVal(true)}>{v}</div>
                  <div style={rs.metricSub}>{s}</div>
                </div>
              ))}
            </div>
          </Section>
          {crmRows.length>0&&(
            <Section title="等级分层（CRM达人）">
              <div style={{ ...glassStyle(14),overflow:"hidden" }}>
                <table style={rs.table}>
                  <thead><tr>
                    <th style={rs.th}>等级</th>
                    <th style={rs.thR}>视频数</th><th style={rs.thR}>视频出单率</th>
                    <th style={rs.thR}>总出单</th><th style={rs.thR}>均单/视频</th><th style={rs.thR}>爆单数</th>
                  </tr></thead>
                  <tbody>
                    {crmRows.map(r=>(
                      <tr key={r.grade}>
                        <td style={rs.td}><span style={{ display:"flex",alignItems:"center",gap:6 }}><span style={{ width:8,height:8,borderRadius:"50%",background:GRADE_COLORS[r.grade]||T.muted }} /><span style={{ fontWeight:700,color:GRADE_COLORS[r.grade]||T.muted }}>{r.grade}</span></span></td>
                        <td style={rs.tdR}>{r.videoCount}</td>
                        <td style={{ ...rs.tdR,fontWeight:600,color:r.videoSaleRate>=0.3?T.success:r.videoSaleRate>=0.15?T.accent:T.danger }}>{rs.pct(r.videoSaleRate)}</td>
                        <td style={{ ...rs.tdR,fontWeight:600 }}>{r.orders}</td>
                        <td style={{ ...rs.tdR,color:T.accent,fontWeight:600 }}>{rs.dec(r.avgOrder)}</td>
                        <td style={{ ...rs.tdR,color:r.burstCount>0?T.success:T.hint,fontWeight:600 }}>{r.burstCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}
