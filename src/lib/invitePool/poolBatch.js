// ─── 邀约库批量上传（纯函数）：解析名单 → 逐行查重 → 生成写入计划 ─────────────
// 名单来源：粘贴的文字，或上传表格的第一列。产品由页面勾选，每个达人 × 每个产品一行。
// 查重规则与单条录入完全相同（poolChecks.js），另加「名单内重复」「格式无效」两种跳过。
import { normName, resolveName } from "../crm/identity.js";
import { buildPoolIndex, checkPoolEntry } from "./poolChecks.js";

export const MAX_BATCH = 2000;                              // 一次最多多少个达人
const URL_RE = /tiktok\.com\/@([A-Za-z0-9._]+)/i;
const VALID_RE = /^[a-z0-9._]{2,24}$/;                      // TikTok username：字母数字 . _，最长 24

/** 一个输入 → username；识别不了返回 null */
export function cleanHandle(raw) {
  const s = String(raw ?? "").trim();
  const fromUrl = s.match(URL_RE);
  const h = normName(fromUrl ? fromUrl[1] : s);
  return VALID_RE.test(h) ? h : null;
}

/** 粘贴的文字 → 输入列表（按换行、逗号、分号、空格拆开） */
export const splitPasted = (text) => String(text ?? "").split(/[\s,，;；]+/).filter(Boolean);

/** 表格行 → 输入列表：取每行第一个非空格子；第一行识别不了当表头跳过 */
export function listFromSheet(rows) {
  const cells = rows.map((r) => (r || []).find((c) => String(c ?? "").trim() !== "")).filter((c) => c !== undefined);
  if (cells.length && !cleanHandle(cells[0])) cells.shift();
  return cells.map(String);
}

/**
 * @param p { inputs[], productIds[], products[], core, nameIndex, staffName }
 * @returns { rows:[{ creator_id, product_id }], skipped:[{ input, product, reason }], creatorCount, tooMany }
 */
export function planPoolBatch({ inputs, productIds, products, core, nameIndex, staffName }) {
  const productName = (id) => products.find((p) => p.id === id)?.internal_name ?? id;
  const index = buildPoolIndex(core);
  const seen = new Set(), rows = [], skipped = [];
  let creatorCount = 0;
  for (const input of inputs) {
    const handle = cleanHandle(input);
    if (!handle) { skipped.push({ input, product: "—", reason: "格式无效，不是 TikTok username" }); continue; }
    const who = resolveName(nameIndex, handle)?.creatorId || handle;     // 同一达人的现名和别名算同一个
    if (seen.has(who)) { skipped.push({ input, product: "—", reason: "名单内重复" }); continue; }
    seen.add(who); creatorCount++;
    for (const pid of productIds) {
      const reason = checkPoolEntry({ handle, productId: pid, productName: productName(pid), core, nameIndex, staffName, index });
      if (reason) skipped.push({ input: handle, product: productName(pid), reason });
      else rows.push({ creator_id: handle, product_id: pid });
    }
  }
  return { rows, skipped, creatorCount, tooMany: creatorCount > MAX_BATCH };
}

/** 跳过原因归类计数（预览用） */
export function skipSummary(skipped) {
  const kind = (r) => r.startsWith("此达人已在邀约库") ? "已在邀约库" : r.startsWith("此达人已合作") ? "已在 CRM 合作" : r;
  const out = {};
  for (const s of skipped) out[kind(s.reason)] = (out[kind(s.reason)] || 0) + 1;
  return out;
}
