// lib/review/burstCalc.js
import { videoRange } from "../utils.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";

/** 爆单视频墙：单月按产品筛选，按出单数倒序 */
export function calcBurstVideos(videos, ym, productId, burstThreshold) {
  const vr = videoRange(ym);
  const thresh = burstThreshold ?? BURST_ORDER_THRESHOLD;
  const v = productId ? videos.filter((x) => x.product_id === productId) : videos;
  return v
    .filter((x) => {
      const d = x.published_at?.slice(0, 10);
      return d && d >= vr.from && d <= vr.to && (x.orders || 0) >= thresh;
    })
    .sort((a, b) => b.orders - a.orders);
}
