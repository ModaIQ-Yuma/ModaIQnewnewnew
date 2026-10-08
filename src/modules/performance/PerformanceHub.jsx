// modules/performance/PerformanceHub.jsx — 顶部「绩效」：绩效评估 + 月度提报（管理员）
import { useState } from "react";
import SubNav from "../../components/layout/SubNav.jsx";
import PerformanceModule from "../tasks/PerformanceModule.jsx";
import MonthlyReport from "./MonthlyReport.jsx";

const SUBTABS = [
  { id: "perf",   label: "📋 绩效评估", desc: "按账期（15 日 ~ 次月 14 日）计算绩效：寄样看账期内的寄样记录，视频和出单看账期结束月的自然月。管理员可切换查看全店或单个助理，助理只能看到自己。" },
  { id: "report", label: "📤 月度提报", desc: "每月交的视频明细（全店 + 每位助理）和奖金提报：提报爆单视频、填直播爆单和付费达人，一键导出 Excel。视频明细按「当月发布，数据截止次月 5 日」。" },
];

export default function PerformanceHub({ ctx }) {
  const [sub, setSub] = useState("perf");
  const tabs = SUBTABS.filter((t) => t.id !== "report" || ctx.can("bonus.manage"));
  return (
    <div>
      {tabs.length > 1 && <SubNav tabs={tabs} active={sub} onChange={setSub} />}
      {sub === "perf" && <PerformanceModule ctx={ctx} showIntro={tabs.length === 1} />}
      {sub === "report" && <MonthlyReport ctx={ctx} />}
    </div>
  );
}
