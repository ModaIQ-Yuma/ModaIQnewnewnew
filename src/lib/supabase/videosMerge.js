// ─── 非CRM视频「归入 CRM」：达人换了名 → 改名 + 按商品挂视频 ────────────────
import { sb, unwrap } from "./client.js";
import { renameCreator } from "./creatorsWrite.js";
import { assignByProduct } from "../video/assignVideos.js";

/**
 * @param creator   { id, handle }                  选中的 CRM 达人
 * @param newHandle 视频里的达人名（小写）；与现名不同则改名，旧名记为别名
 * @param videos    该达人所有名字下「未归属」的视频 [{ id, product_id, published_at }]
 * @param collabs   该达人的寄样 [{ collabId, productId, shipDate }]
 * @returns { attached, unmatched }
 */
export async function mergeVideosIntoCreator(storeId, { creator, newHandle, videos, collabs }) {
  if (newHandle && newHandle !== creator.handle) await renameCreator(storeId, creator.id, creator.handle, newHandle);
  const { byCollab, unmatched } = assignByProduct(videos, collabs);
  let attached = 0;
  for (const [collabId, ids] of byCollab) {
    unwrap(await sb.from("video_records").update({ collaboration_id: collabId }).in("id", ids), "video_records");
    attached += ids.length;
  }
  return { attached, unmatched: unmatched.length };
}
