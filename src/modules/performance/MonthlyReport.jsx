// modules/performance/MonthlyReport.jsx — 月度提报：选月份和助理 → 汇总卡片 / 爆单提报 / 手填奖金 → 导出 Excel
import { useMemo, useState } from "react";
import { T, glassStyle } from "../../constants/tokens.js";
import { ORDER_WINDOW_TAIL_DAYS, BONUS_EXCLUDED_STAFF } from "../../constants/config.js";
import { addMonths, thisMonthPST } from "../../lib/dates.js";
import { cutoffOf, videosAsOf } from "../../lib/video/cutoff.js";
import { buildMonthReport } from "../../lib/bonus/monthReport.js";
import { exportMonthReport } from "../../lib/bonus/reportExport.js";
import { useBonus } from "../../hooks/useBonus.js";
import ReportSummary from "./ReportSummary.jsx";
import BurstSubmit from "./BurstSubmit.jsx";
import BonusExtras from "./BonusExtras.jsx";
import { s } from "./perfStyles.js";

export default function MonthlyReport({ ctx }) {
  const { storeId, userId, collabs, videos, products, staff } = ctx;
  const bonus = useBonus(storeId, userId);
  const [ym, setYm] = useState(() => addMonths(thisMonthPST(), -1));   // 每月 6 日交上个月的
  // 助理名单：在职、不在排除名单里，且不是正在做提报的人自己（做提报的管理员就是 BD，算在「全店」那一行）
  const roster = useMemo(() => staff.filter((x) => x.is_active !== false && !BONUS_EXCLUDED_STAFF.includes(x.name) && x.id !== ctx.myStaffId),
    [staff, ctx.myStaffId]);
  const [picked, setPicked] = useState(null);                          // null = 默认全部在职助理
  const [exporting, setExporting] = useState(false);
  const people = useMemo(() => roster.filter((x) => (picked ?? roster.map((r) => r.id)).includes(x.id)), [roster, picked]);

  const cutoff = cutoffOf(ym, ORDER_WINDOW_TAIL_DAYS);
  const asOf = useMemo(() => (bonus.ledger ? videosAsOf(videos, bonus.ledger, cutoff) : null), [videos, bonus.ledger, cutoff]);
  const report = useMemo(() => (asOf ? buildMonthReport({
    ym, collabs, videos, asOf: asOf.videos, shippingGoals: ctx.tasksApi?.goals ?? [], products,
    people, submissions: bonus.submissions, extras: bonus.extras, creators: ctx.creators,
  }) : null), [ym, collabs, videos, asOf, ctx.tasksApi?.goals, products, people, bonus.submissions, bonus.extras, ctx.creators]);

  if (ctx.dataLoading || bonus.loading) return <div style={s.empty}>加载中…</div>;
  if (bonus.error) return <div style={s.err}>加载失败：{bonus.error}</div>;

  async function onExport() {
    setExporting(true);
    try { await exportMonthReport(report); } catch (e) { alert(`导出失败：${e.message}`); }
    setExporting(false);
  }
  const toggle = (id) => setPicked((prev) => {
    const cur = prev ?? roster.map((r) => r.id);
    return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  });

  return (
    <div>
      <div style={{ ...s.row, marginBottom: 14 }}>
        <button style={s.btnGhost} onClick={() => setYm(addMonths(ym, -1))}>‹ 上月</button>
        <div style={{ ...glassStyle(12), ...s.monthBox }}>{ym.replace("-", " 年 ")} 月</div>
        <button style={s.btnGhost} onClick={() => setYm(addMonths(ym, 1))}>下月 ›</button>
        <span style={s.note}>助理：</span>
        {roster.map((x) => (
          <label key={x.id} style={{ ...s.row, gap: 4, fontSize: 13, color: T.text, cursor: "pointer" }}>
            <input type="checkbox" checked={people.some((p) => p.id === x.id)} onChange={() => toggle(x.id)} />{x.name}
          </label>
        ))}
        <div style={{ flex: 1 }} />
        <button style={s.btn} disabled={exporting} onClick={onExport}>{exporting ? "生成中…" : "⬇ 导出 Excel"}</button>
      </div>

      {asOf.unknown.length > 0 && <div style={s.warn}>这些导入批次的文件名看不出数据区间，明细没算进去：{asOf.unknown.join("、")}</div>}
      {asOf.dataTo < cutoff && <div style={s.warn}>视频数据只导到 {asOf.dataTo || "（还没导入）"}，还没到截止日 {cutoff}；现在导出的明细不是最终数，导完再导出。</div>}

      <ReportSummary report={report} />
      <BurstSubmit ym={ym} videos={videos} bonus={bonus} report={report} />
      <BonusExtras ym={ym} people={people} bonus={bonus} />
    </div>
  );
}
