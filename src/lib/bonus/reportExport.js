// ─── 月度提报导出 xlsx（照旧表格式）：全店 / 视频详情 / 每位助理 / 爆单视频 ──────
// 用 exceljs（能写颜色、边框、合并格）；首次导出时才加载，不拖慢页面打开。
import { writeStoreSheet, writeStaffSheet } from "./reportSheets.js";
import { writeVideoSheet, writeBurstSheet } from "./reportDetail.js";

/** 生成工作簿（浏览器和测试共用） */
export async function buildReportWorkbook(report) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  writeStoreSheet(wb.addWorksheet("全店"), report);
  writeVideoSheet(wb.addWorksheet("视频详情"), report.store.detail);
  for (const x of report.staff) writeStaffSheet(wb.addWorksheet(x.name.slice(0, 31)), x);
  writeBurstSheet(wb.addWorksheet("爆单视频"), report);
  return wb;
}

export const reportFileName = (ym) => `${ym.replace("-", "年")}月 绩效与奖金提报.xlsx`;

/** 生成并下载 */
export async function exportMonthReport(report) {
  const buf = await (await buildReportWorkbook(report)).xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: reportFileName(report.ym) });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
