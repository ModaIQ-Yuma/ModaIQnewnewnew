// ─── 录入表单 → 保存载荷（纯函数）────────────────────────────────────────────
import { ATTR_KEYS } from "./attrs.js";
import { normName } from "./identity.js";

/**
 * @param form     录入面板表单
 * @param initial  编辑时的原 influencer（新增为 null）
 * @param chk      checkIdentity 的结果（已确认无错误、无待合并）
 * @param existing 命中的达人 { id, handle, note } 或 null
 * @param oldAliases 该达人现有别名（小写）
 * @param productId 产品 id
 */
export function buildShipmentPayload({ form, initial, chk, existing, oldAliases, productId }) {
  const handle = chk.rename || !existing ? chk.handle : existing.handle;
  const keepAliases = chk.aliases.filter((a) => a !== handle);
  const names = [...new Set([handle, existing?.handle, ...keepAliases, ...oldAliases].filter(Boolean).map(normName))];
  return {
    isNew: !initial,
    collabId: initial?.id || null,
    names,
    creator: {
      id: existing?.id || null,
      oldHandle: existing?.handle || null,
      handle,
      rename: chk.rename,
      note: form.creatorNote || "",
      noteChanged: !!existing && (form.creatorNote || "") !== (existing.note || ""),
      aliasesAdd: keepAliases.filter((a) => !oldAliases.includes(a)),
      aliasesRemove: oldAliases.filter((a) => !keepAliases.includes(a) && a !== existing?.handle),
    },
    collab: {
      product_id:     productId,
      staff_id:       form.staffId || null,
      ship_date:      form.shipDate,
      status:         form.baseStatus || "已寄样",
      status_manual:  !!initial,
      product_color:  form.productColor || null,
      ship_score:     form.shipScore || null,
      note:           form.note || null,
      creator_source: initial?.creatorSource || "manual",
    },
    attrs: Object.fromEntries(ATTR_KEYS.map((k) => [k, form[k]])),
  };
}
