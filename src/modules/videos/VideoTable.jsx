// modules/videos/VideoTable.jsx
import { useState } from "react";
import { T } from "../../constants/tokens.js";
import { vs } from "./videosStyles.js";
import MergeModal from "./MergeModal.jsx";

const fmt = (n) => Number(n || 0).toLocaleString();
const defaultFrom = () => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10); };
const defaultTo   = () => new Date().toISOString().slice(0, 10);

export default function VideoTable({ videos, storeId, showMerge = false, onMerged }) {
  const [dateFrom, setDateFrom] = useState(defaultFrom());
  const [dateTo,   setDateTo]   = useState(defaultTo());
  const [mergeVideo, setMergeVideo] = useState(null);

  const filtered = videos.filter((v) => {
    const d = v.published_at?.slice(0, 10);
    if (!d) return true;
    return d >= dateFrom && d <= dateTo;
  });

  return (
    <div>
      {/* 时间筛选器 */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "14px 16px",
        borderBottom: `1px solid ${T.glassStroke}`, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: T.muted }}>发布日期</span>
        <input type="date" style={vs.dateInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span style={{ color: T.hint }}>—</span>
        <input type="date" style={vs.dateInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <span style={{ fontSize: 12, color: T.hint }}>共 {filtered.length} 条</span>
      </div>

      {filtered.length === 0
        ? <div style={vs.empty}>该时段暂无数据</div>
        : (
          <div style={{ overflowX: "auto" }}>
            <table style={vs.table}>
              <colgroup>
                <col style={{ width: showMerge ? "16%" : "18%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "9%"  }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "12%" }} />
                {showMerge && <col style={{ width: "10%" }} />}
              </colgroup>
              <thead>
                <tr>
                  {[
                    { label: "达人名称",  align: "left"  },
                    { label: "商品",      align: "left"  },
                    { label: "视频链接",  align: "left"  },
                    { label: "发布日期",  align: "left"  },
                    { label: "播放量",    align: "right" },
                    { label: "点击量",    align: "right" },
                    { label: "出单件数",  align: "right" },
                    ...(showMerge ? [{ label: "操作", align: "center" }] : []),
                  ].map(({ label, align }) => (
                    <th key={label} style={{ ...vs.th, textAlign: align }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td style={vs.td}><span style={{ fontWeight: 600, color: T.text }}>{v.creator_handle || "-"}</span></td>
                    <td style={vs.td}>
                      <span style={vs.badge(v.products ? T.accent : T.hint)}>
                        {v.products?.internal_name || "未知商品"}
                      </span>
                    </td>
                    <td style={vs.td}>
                      {v.url
                        ? <a href={v.url} target="_blank" rel="noreferrer" style={vs.link}>▶ 观看</a>
                        : <span style={{ color: T.hint }}>-</span>}
                    </td>
                    <td style={{ ...vs.td, color: T.muted }}>{v.published_at?.slice(0, 10) || "-"}</td>
                    <td style={{ ...vs.td, textAlign: "right" }}>{fmt(v.vv)}</td>
                    <td style={{ ...vs.td, textAlign: "right" }}>{fmt(v.clicks)}</td>
                    <td style={{ ...vs.td, textAlign: "right", fontWeight: 600 }}>{fmt(v.orders)}</td>
                    {showMerge && (
                      <td style={{ ...vs.td, textAlign: "center" }}>
                        <button style={vs.btnMerge} onClick={() => setMergeVideo(v)}>归入 CRM</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {mergeVideo && (
        <MergeModal
          storeId={storeId}
          video={mergeVideo}
          onClose={() => setMergeVideo(null)}
          onDone={() => { setMergeVideo(null); onMerged?.(); }}
        />
      )}
    </div>
  );
}
