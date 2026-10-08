// ─── 月度提报 Excel：视频明细块、视频详情表、爆单视频表（照旧表布局）─────────
import { pubDay } from "../perf/perfCalc.js";
import { videoUrl } from "./bonusCalc.js";
import { put, merge, widths, FMT } from "./reportStyle.js";

const usDate = (ymd) => (ymd ? `${ymd.slice(5, 7)}/${ymd.slice(8, 10)}/${ymd.slice(0, 4)}` : "--");
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const ymdToDate = (ymd) => (ymd ? new Date(`${ymd}T00:00:00Z`) : "");
const link = (url) => (url ? { text: url, hyperlink: url } : "");

/**
 * 视频明细：A~B 列总览（总视频 / 出单视频个数 / 视频出单率），D~I 列逐条
 * @param head 表头所在行；headSize 表头字号（视频详情表 18，助理表 12）
 */
export function writeDetail(ws, head, detail, headSize) {
  put(ws, `A${head}`, "总览", { size: 12, bold: true, h: null });
  ["序号", "视频链接", "达人名称", "发布日期", "销售额", "销量"].forEach((h, i) =>
    put(ws, `${"DEFGHI"[i]}${head}`, h, { size: headSize, bold: true, wrap: true }));
  const side = [["总视频", detail.total], ["出单视频个数", detail.sale],
    ["视频出单率", { formula: `B${head + 2}/B${head + 1}`, result: detail.rate ?? 0 }, FMT.pct2]];
  side.forEach(([label, v, fmt], i) => {
    put(ws, `A${head + 1 + i}`, label, { h: null });
    put(ws, `B${head + 1 + i}`, v, { h: null, fmt });
  });
  const cell = { font: "Arial", size: 9, h: null };
  detail.rows.forEach((v, i) => {
    const r = head + 1 + i;
    put(ws, `D${r}`, i + 1);
    put(ws, `E${r}`, link(videoUrl(v)), cell);
    put(ws, `F${r}`, v.creator_handle, cell);
    put(ws, `G${r}`, usDate(pubDay(v)), cell);
    put(ws, `H${r}`, r2(v.gmv), { ...cell, bold: true, fmt: FMT.usd });
    put(ws, `I${r}`, v.orders || 0, { ...cell, bold: true, fmt: FMT.qty });
  });
}

export function writeVideoSheet(ws, detail) {
  widths(ws, [15, 9, 4, 8.1, 15.9, 16, 14, 28.4, 31.6]);
  ws.getRow(1).height = 38;
  writeDetail(ws, 1, detail, 18);
}

export function writeBurstSheet(ws, report) {
  widths(ws, [23.9, 14, 13.6, 15.4, 62, 12, 4, 16]);
  ws.getRow(1).height = 18.75;
  ["达人ID", "发布时间", "成交件数", "累计GMV", "视频链接", "奖金档位"].forEach((h, i) => put(ws, `${"ABCDEF"[i]}1`, h, { size: 14, bold: true, h: null }));
  put(ws, "H1", "数据来源", { h: null, border: false });
  put(ws, "H2", "ModaIQ 月度提报", { h: null, border: false });
  const rows = [
    ...report.bursts.map((x) => [x.creator_handle, ymdToDate(x.published), x.orders ?? "", r2(x.gmv), link(x.url), x.amount || 0]),
    ...report.lives.map((l) => [`直播${l.note ? "：" + l.note : ""}`, ymdToDate(l.live_date), "", r2(l.gmv), "", l.amount || 0]),
  ];
  rows.forEach((vals, i) => vals.forEach((v, j) =>
    put(ws, `${"ABCDEF"[j]}${i + 2}`, v, { h: null, fmt: j === 1 ? FMT.date : j === 5 ? FMT.cny : undefined })));
  const last = rows.length + 2;
  merge(ws, `A${last}:E${last}`, "总计", { bold: true });
  put(ws, `F${last}`, { formula: rows.length ? `SUM(F2:F${last - 1})` : "0", result: report.pool.total }, { bold: true, h: null, fmt: FMT.cny });
}
