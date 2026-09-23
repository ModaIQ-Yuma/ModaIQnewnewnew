// ─── CRM 导出 xlsx（每行 = 一条寄样，属性为寄样时属性）──────────────────────
import * as XLSX from "xlsx";
import { CREATOR_FIELDS, labelOf } from "../../constants/creatorOptions.js";
import { computeStatus } from "./crmFlow.js";
import { cumOrders } from "./cumOrders.js";
import { todayPST } from "../utils.js";

export function exportCRM(rows, staffName) {
  const data = rows.map((i) => ({
    "达人ID": i.influencerId, "别名": (i.aliases || []).join("、"), "合作产品": i.product, "颜色": i.productColor,
    "寄样时间": i.shipDate, "跟进人": staffName(i.staffId), "合作进度": computeStatus(i), "累计出单": cumOrders(i),
    "视频数": (i.videoRecords || []).length, "合作备注": i.note, "达人备注": i.creatorNote,
    ...Object.fromEntries(CREATOR_FIELDS.map((f) => {
      const v = i[f.key];
      return [f.label, f.type === "multi" ? (v || []).map((x) => labelOf(f.key, x)).join("、") : labelOf(f.key, v) || ""];
    })),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "CRM");
  XLSX.writeFile(wb, `CRM_${todayPST()}.xlsx`);
}
