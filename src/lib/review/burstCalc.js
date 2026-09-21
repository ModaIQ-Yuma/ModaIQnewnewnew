// lib/review/burstCalc.js
import { videoRange } from "../utils.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";

export function calcBurstVideos(videos, ym, productId, burstThreshold, videoFrom, videoTo) {
  const vr    = videoRange(ym);
  const vFrom = videoFrom || vr.from;
  const vTo   = videoTo   || vr.to;
  const thresh = burstThreshold ?? BURST_ORDER_THRESHOLD;
  const v = productId ? videos.filter((x) => x.product_id === productId) : videos;
  return v
    .filter((x) => { const d = x.published_at?.slice(0,10); return d && d >= vFrom && d <= vTo && (x.orders||0) >= thresh; })
    .sort((a, b) => b.orders - a.orders);
}
