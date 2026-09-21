// modules/videos/VideoTable.jsx — 视频列表表格（导入视频和非CRM视频共用）
import { T } from "../../constants/tokens.js";
import { vs } from "./videosStyles.js";

const fmt = (n) => Number(n || 0).toLocaleString();

export default function VideoTable({ videos }) {
  if (!videos.length) return <div style={vs.empty}>暂无视频数据</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={vs.table}>
        <thead>
          <tr>
            {["达人名称", "商品", "视频链接", "发布日期", "播放量", "点击量", "出单件数"].map((h) => (
              <th key={h} style={vs.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {videos.map((v) => (
            <tr key={v.id}>
              <td style={vs.td}>
                <span style={{ fontWeight: 600, color: T.text }}>{v.creator_handle || "-"}</span>
              </td>
              <td style={vs.td}>
                <span style={vs.badge(v.products ? T.accent : T.hint)}>
                  {v.products?.internal_name || "未知商品"}
                </span>
              </td>
              <td style={vs.td}>
                {v.url
                  ? <a href={v.url} target="_blank" rel="noreferrer" style={vs.link}>▶ 观看</a>
                  : <span style={{ color: T.hint }}>-</span>
                }
              </td>
              <td style={{ ...vs.td, color: T.muted }}>{v.published_at?.slice(0, 10) || "-"}</td>
              <td style={{ ...vs.td, textAlign: "right" }}>{fmt(v.vv)}</td>
              <td style={{ ...vs.td, textAlign: "right" }}>{fmt(v.clicks)}</td>
              <td style={{ ...vs.td, textAlign: "right", fontWeight: 600 }}>{fmt(v.orders)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
