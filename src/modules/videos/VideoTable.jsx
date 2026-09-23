// modules/videos/VideoTable.jsx
import { useMemo, useState } from "react";
import { usePaged } from "../../hooks/usePaged.js";
import Pager from "../../components/ui/Pager.jsx";
import { T } from "../../constants/tokens.js";
import { vs } from "./videosStyles.js";
import MergeModal from "./MergeModal.jsx";

const fmt = (n) => Number(n || 0).toLocaleString();

export default function VideoTable({ videos, storeId, core, products, showMerge = false, onMerged }) {
  const [dateFrom, setDateFrom] = useState("");   // 发布日期筛选，默认不限
  const [dateTo,   setDateTo]   = useState("");
  const [mergeVideo, setMergeVideo] = useState(null);

  const [sort, setSort] = useState({ key: "orders", desc: true });     // 默认按出单件数从高到低

  const filtered = useMemo(() => {
    const val = (v) => sort.key === "published_at" ? (v.published_at || "") : Number(v[sort.key]) || 0;
    return videos.filter((v) => {
      const d = v.published_at?.slice(0, 10);
      return (!dateFrom || (d && d >= dateFrom)) && (!dateTo || (d && d <= dateTo));
    }).sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * (sort.desc ? -1 : 1));
  }, [videos, dateFrom, dateTo, sort]);
  const { page, setPage, totalPages, pageRows } = usePaged(filtered, 50, `${dateFrom}|${dateTo}|${sort.key}|${sort.desc}`);
  const clickSort = (key) => setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: true }));

  return (
    <div>
      {/* 时间筛选器 */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "14px 16px",
        borderBottom: `1px solid ${T.glassStroke}`, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: T.muted }}>发布日期（可选）</span>
        <input type="date" style={vs.dateInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span style={{ color: T.hint }}>—</span>
        <input type="date" style={vs.dateInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        {(dateFrom || dateTo) && <button style={vs.btnDanger} onClick={() => { setDateFrom(""); setDateTo(""); }}>清除</button>}
        <span style={{ fontSize: 12, color: T.hint }}>共 {filtered.length} 条 · 按视频<b>发布日期</b>筛选（不是导入的数据区间）；默认按出单件数排序，点表头可换排序</span>
      </div>

      {filtered.length === 0
        ? <div style={vs.empty}>该时段暂无数据</div>
        : (<>
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
                    { label: "发布日期",  align: "left",  key: "published_at" },
                    { label: "播放量",    align: "right", key: "vv" },
                    { label: "点击量",    align: "right", key: "clicks" },
                    { label: "出单件数",  align: "right", key: "orders" },
                    ...(showMerge ? [{ label: "操作", align: "center" }] : []),
                  ].map(({ label, align, key }) => (
                    <th key={label} onClick={key ? () => clickSort(key) : undefined}
                      style={{ ...vs.th, textAlign: align, cursor: key ? "pointer" : "default", color: sort.key === key ? T.accent : vs.th.color, whiteSpace: "nowrap" }}>
                      {label}{sort.key === key ? (sort.desc ? " ▼" : " ▲") : key ? " ↕" : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((v) => (
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
          <Pager page={page} totalPages={totalPages} onChange={setPage} />
        </>)
      }

      {mergeVideo && (
        <MergeModal storeId={storeId} video={mergeVideo} core={core} products={products}
          onClose={() => setMergeVideo(null)} onDone={(res) => { setMergeVideo(null); onMerged?.(res); }} />
      )}
    </div>
  );
}
