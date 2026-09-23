// lib/video/videoParser.js — xlsx 解析纯函数（无副作用，无网络请求）
import * as XLSX from "xlsx";

/** 清洗金额字符串 "$2,640.88" → 2640.88 */
const parseMoney = (v) => parseFloat(String(v ?? "").replace(/[$,]/g, "")) || 0;

/** 清洗整数 */
const parseNum = (v) => parseInt(String(v ?? "").replace(/,/g, ""), 10) || 0;

/**
 * 把 "MM/DD/YYYY HH:mm" 或 "MM/DD/YYYY" 转成 "YYYY-MM-DD"
 * 失败返回 null
 */
export function parseTKDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim().split(" ")[0]; // 取日期部分
  const parts = s.split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  if (!mm || !dd || !yyyy) return null;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/**
 * 解析 TikTok 后台导出的 xlsx（24列，第2行是说明行，数据从第3行起）
 * 返回 [{ videoId, publishedAt, url, creatorHandle, skuId, gmv, orders, clicks, vv }]
 */
export function parseVideoXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        // 跳过第1行（表头）和第2行（说明行），从index=2开始
        const result = [];
        for (let i = 2; i < rows.length; i++) {
          const r = rows[i];
          // 视频 ID 有 19 位：若被 Excel 存成数字会丢精度（末几位变 0），导入后无法去重/累加，直接拦下
          if (typeof r[1] === "number" && r[1] > Number.MAX_SAFE_INTEGER) {
            reject(new Error(`第 ${i + 1} 行的视频 ID 被存成了数字、末几位已丢失。请直接上传 TK 后台导出的原始文件，不要用 Excel 打开后另存。`));
            return;
          }
          const videoId = String(r[1] ?? "").trim();
          if (!videoId) continue;
          result.push({
            videoId,
            publishedAt:   parseTKDate(r[2]),
            url:           String(r[3] ?? "").trim(),
            creatorHandle: String(r[4] ?? "").trim().toLowerCase(),
            skuId:         String(r[5] ?? "").trim(),
            gmv:           parseMoney(r[6]),
            orders:        parseNum(r[9]),
            clicks:        parseNum(r[16]),
            vv:            parseNum(r[18]),
          });
        }
        resolve(result);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsArrayBuffer(file);
  });
}
