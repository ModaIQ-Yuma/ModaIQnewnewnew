// ─── 月度提报 Excel：全店表、助理表（照旧表布局：绩效分档表 + 奖金 + 视频明细）──────
import { tierRows } from "../perf/perfCalc.js";
import { BONUS_TIERS, BONUS_SHARE } from "../../constants/config.js";
import { todayPST } from "../dates.js";
import { put, merge, at, widths, GREEN, LIGHT, YELLOW, FMT } from "./reportStyle.js";
import { writeDetail } from "./reportDetail.js";

const LABELS = { a: "目标发布数量\n达成率a", b: "老品\n红人转化率b", c: "视频转化率c", d: "新品\n寄样达成率d", e: "Lv1达人占比e" };
const p1 = (v) => `${(v * 100).toFixed(1)}%`;
const r1 = (v) => Math.round(v * 1000) / 10;                  // 0.875 → 87.5
const fillDate = () => { const [y, m, d] = todayPST().split("-"); return `${y}/${Number(m)}/${Number(d)}`; };

/** 绩效分档表（第 1~32 行），s = 起始列号（全店 1，助理 2） */
function writePerf(ws, s, { name, role, group, perf }) {
  merge(ws, `${at(s, 0)}1:${at(s, 6)}1`, "TK BD团队绩效与奖励方案", { size: 18, bold: true });
  merge(ws, `${at(s, 0)}2:${at(s, 6)}2`, `姓名：${name} 岗位：${role} 填表日期：${fillDate()}`, { size: 12, bold: true, h: "left" });
  ws.getRow(1).height = 22.5;
  ["考核内容", "考核项", "考核指标", "对应比例", "实际完成", "权重分", "得分X"].forEach((h, i) => put(ws, `${at(s, i)}4`, h, { bold: true }));
  let row = 5;
  for (const r of perf.rows) {
    const tiers = tierRows(r.key), end = row + tiers.length - 1;
    tiers.forEach((t, i) => {
      put(ws, `${at(s, 2)}${row + i}`, t.text, i === 0 ? { fill: GREEN } : {});
      put(ws, `${at(s, 3)}${row + i}`, t.score, { fmt: FMT.pct });
    });
    merge(ws, `${at(s, 1)}${row}:${at(s, 1)}${end}`, LABELS[r.key], { wrap: true });
    merge(ws, `${at(s, 4)}${row}:${at(s, 4)}${end}`, r.score == null ? "—" : `${r1(r.score)}\n（实际${p1(r.val)}）`, { size: 12, wrap: true });
    merge(ws, `${at(s, 5)}${row}:${at(s, 5)}${end}`, r.weight, { fmt: FMT.pct });
    merge(ws, `${at(s, 6)}${row}:${at(s, 6)}${end}`, r.weighted == null ? "—" : r1(r.weighted));
    row = end + 1;
  }
  merge(ws, `${at(s, 0)}5:${at(s, 0)}${row - 1}`, group);
  put(ws, `${at(s, 5)}${row}`, "合计", { fill: YELLOW });
  put(ws, `${at(s, 6)}${row}`, perf.total == null ? "—" : r1(perf.total), { fill: YELLOW });
  const grade = [["最终评分X", "最终绩效", GREEN], ["90%≤X＜100%", "P=100%"], ["60%≤X＜90%", "P=绩效金额*X"], ["X＜60%", "P=绩效金额*30%"]];
  grade.forEach(([x, p, fill], i) => {
    merge(ws, `${at(s, 0)}${row + 1 + i}:${at(s, 1)}${row + 1 + i}`, x, fill ? { fill } : {});
    merge(ws, `${at(s, 2)}${row + 1 + i}:${at(s, 3)}${row + 1 + i}`, p, fill ? { fill } : {});
  });
  return row + grade.length + 2;                                 // 下一块从这里开始
}

/** 爆单奖金档位表（单视频 f / 单场直播 g） */
function writeTiers(ws, row, letter, title) {
  merge(ws, `A${row}:B${row}`, title, { fill: GREEN });
  merge(ws, `C${row}:D${row}`, "爆单额外奖金", { fill: GREEN });
  const asc = [...BONUS_TIERS].sort((a, b) => a.min - b.min);
  asc.forEach((t, i) => {
    const next = asc[i + 1];
    merge(ws, `A${row + 1 + i}:B${row + 1 + i}`, next ? `$${t.min}≤${letter}＜$${next.min}` : `$${t.min}≤${letter}`);
    merge(ws, `C${row + 1 + i}:D${row + 1 + i}`, `${t.amount}/个`);
  });
  return row + asc.length + 2;
}

export function writeStoreSheet(ws, report) {
  widths(ws, [9.3, 24.5, 25.2, 23, 33.2, 19.8, 23.2]);
  const top = writePerf(ws, 1, { name: "全店", role: "BD", group: "BD", perf: report.store.perf });
  const mid = writeTiers(ws, top, "f", "单视频GMV f");
  merge(ws, `E${top}:G${mid - 2}`, "注意：\n1、TK BD助理不享有提成\n2、BD团队奖金根据每个月表现提交奖金\n3、转正后才享有奖金，表现突出可提前转正", { wrap: true, h: "left" });
  let row = writeTiers(ws, mid, "g", "单场直播GMV g") + 2;

  const { pool, bd } = report;
  merge(ws, `A${row}:E${row}`, "奖金提报", { size: 18, bold: true, fill: YELLOW });
  row++;
  const head = { bold: true, fill: YELLOW };
  merge(ws, `A${row}:B${row}`, "项目", { ...head, size: 18 });
  put(ws, `C${row}`, "计算金额", { ...head, size: 18 });
  put(ws, `D${row}`, "比例", { ...head, size: 12 });
  put(ws, `E${row}`, "总计", { ...head, size: 12 });
  const items = [["爆单视频", pool.videoSum], ...(pool.liveSum ? [["直播爆单", pool.liveSum]] : [])];
  const first = row + 1;
  for (const [label, sum] of items) {
    row++;
    merge(ws, `A${row}:B${row}`, label, { size: 14, bold: true, fill: YELLOW });
    put(ws, `C${row}`, sum, { size: 12, bold: true, fill: YELLOW });
    put(ws, `D${row}`, bd.share, { size: 12, fill: YELLOW, fmt: FMT.pct });
    put(ws, `E${row}`, { formula: `C${row}*D${row}`, result: Math.round(sum * bd.share) }, { size: 12, fill: YELLOW });
  }
  if (items.length > 1) {
    row++;
    merge(ws, `A${row}:D${row}`, "合计", { size: 14, bold: true, fill: YELLOW });
    put(ws, `E${row}`, { formula: `SUM(E${first}:E${row - 1})`, result: bd.total }, { size: 12, bold: true, fill: YELLOW });
  }
}

export function writeStaffSheet(ws, x) {
  widths(ws, [12.9, 12.6, 14, 13.5, 14, 20.8, 11.9, 24.5, 21.1]);
  let row = writePerf(ws, 2, { name: x.name, role: "BD助理", group: "BD助理", perf: x.perf }) + 1;
  const b = x.bonus, pct = (v) => ({ v, fmt: FMT.pct });
  const lines = [
    [["奖金组成部分", "份额", "要求", "达成情况", "奖金提报"], GREEN],
    [["固定", `起始奖金${Math.round(BONUS_SHARE.base * 100)}%`, "无", "达成", pct(BONUS_SHARE.base)], LIGHT],
    [["额外", pct(BONUS_SHARE.extra), `绩效≥${Math.round(BONUS_SHARE.minScore * 100)}分`, b.extraHit ? "达成" : "未达成", pct(b.extraHit ? BONUS_SHARE.extra : 0)], LIGHT],
    [["单独提报", "新开发未合作过的付费达人", "单独结算", b.paidCreator ? "有" : "无", b.paidCreator], LIGHT],
  ];
  for (const [cells, fill] of lines) {
    cells.forEach((v, i) => put(ws, `${at(2, i)}${row}`, v?.fmt ? v.v : v, { fill, fmt: v?.fmt }));
    row++;
  }
  merge(ws, `B${row}:E${row}`, "奖金总计", { size: 16, bold: true, fill: YELLOW });
  put(ws, `F${row}`, b.total, { size: 16, bold: true, fill: YELLOW });
  row += 4;
  merge(ws, `A${row}:I${row}`, "以下为视频详情", { size: 22, h: "left", border: false });
  writeDetail(ws, row + 3, x.detail, 12);
}
