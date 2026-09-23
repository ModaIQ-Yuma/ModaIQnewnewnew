// modules/review/ReviewFilters.jsx — 复盘各子页共用的筛选控件 + 口径说明
import { T } from "../../constants/tokens.js";
import { Hint } from "../../components/layout/SubNav.jsx";
import { rs } from "./reviewStyles.js";

/** 视频日期（可选）：覆盖每月默认的自然月视频区间 */
export function VideoDateRange({ from, to, onFrom, onTo }) {
  return (
    <>
      <span style={rs.label}>视频日期</span>
      <input type="date" style={rs.monthInp} value={from} onChange={(e) => onFrom(e.target.value)} />
      <span style={{ color: T.hint }}>—</span>
      <input type="date" style={rs.monthInp} value={to} onChange={(e) => onTo(e.target.value)} />
      {(from || to) && <button style={rs.btnGhost} onClick={() => { onFrom(""); onTo(""); }}>清除</button>}
    </>
  );
}

/** 统计口径说明：放在工具栏最后，自动换到下一行 */
export function ScopeHint({ video = true }) {
  return (
    <Hint style={{ flexBasis: "100%" }}>
      口径：寄样按账期（上月 15 日 ~ 本月 14 日，含两端），视频按当月自然月。
      {video && "「视频日期」可选，填写后每个月都只统计这段日期内发布的视频；留空 = 按自然月。"}
    </Hint>
  );
}
