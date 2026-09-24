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

/** 一段日期 + 「全部」按钮；from/to 为空 = 不限 */
function DateSpan({ label, value, onChange }) {
  const all = !value.from && !value.to;
  return (
    <>
      <span style={rs.label}>{label}</span>
      <input type="date" style={rs.monthInp} value={value.from || ""} onChange={(e) => onChange({ ...value, from: e.target.value })} />
      <span style={{ color: T.hint }}>—</span>
      <input type="date" style={rs.monthInp} value={value.to || ""} onChange={(e) => onChange({ ...value, to: e.target.value })} />
      <button style={{ ...rs.btnGhost, ...(all ? { color: "#fff", background: T.accent, borderColor: T.accent } : {}) }}
        onClick={() => onChange({ from: "", to: "" })}>全部</button>
    </>
  );
}

/**
 * 统计月份 + 寄样端区间 + 视频端区间（配合 hooks/useReviewRange.js）
 * 选月份 → 自动填默认口径；两个区间都可改成任意日期或「全部」。
 */
export function RangePicker({ range }) {
  return (
    <div style={rs.toolbar}>
      <span style={rs.label}>统计月份</span>
      <input type="month" style={rs.monthInp} value={range.ym} onChange={(e) => range.setYm(e.target.value)} />
      <DateSpan label="寄样端" value={range.ship} onChange={range.setShip} />
      <DateSpan label="视频端" value={range.video} onChange={range.setVideo} />
      {!range.isMonthDefault && <button style={rs.btnGhost} onClick={() => range.setYm(range.ym)}>恢复默认</button>}
      <Hint style={{ flexBasis: "100%" }}>
        选月份会自动填入默认口径：寄样端 = 上月 15 日 ~ 本月 14 日，视频端 = 当月 1 日 ~ 月底。两个区间都可以改成任意日期，点「全部」看全量。
      </Hint>
    </div>
  );
}
