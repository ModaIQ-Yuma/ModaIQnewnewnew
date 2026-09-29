// ─── 邀约名单导出（纯函数）：整理成「每个产品一个工作表、一列达人 username」──
// 格式与邀约库「导出达人列表」一致，可直接交给第三方定邀软件。

/** Excel 工作表名：去掉不允许的字符，最长 31 个字 */
export const sheetName = (name) => String(name || "未命名").replace(/[\\/?*[\]:]/g, "_").slice(0, 31);

/**
 * @param groups { 产品名: [{ creator_id }] }
 * @returns [{ sheet, rows:[{ 达人username }] }]，同名工作表自动加序号
 */
export function buildInviteSheets(groups) {
  const used = new Set();
  return Object.entries(groups).map(([product, invites]) => {
    let sheet = sheetName(product), n = 2;
    while (used.has(sheet)) sheet = sheetName(`${product}_${n++}`);
    used.add(sheet);
    return { sheet, rows: invites.map((inv) => ({ 达人username: inv.creator_id })) };
  });
}
