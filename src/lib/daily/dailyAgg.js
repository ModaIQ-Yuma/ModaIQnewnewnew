// ─── 日数据聚合（纯函数）：从内存里的核心数据按日期范围计数 ─────────────────
// 输出格式与原先按日期查询数据库时完全一致，换日期不再发请求。

const day = (v) => (v ? String(v).slice(0, 10) : "");
// added_at 是真实录入时刻，按美西（GMT-8）换算日期；寄样/视频日期入库时已是美西日期
const pstDay = (v) => (v ? new Date(v).toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" }) : "");
const inRange = (d, from, to) => d && d >= from && d <= to;

/** 按 keyFn 分组计数 → [{ ...fields, count }] */
function countBy(rows, keyFn, toRow) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].map(([k, count]) => ({ ...toRow(k), count }));
}

const split = (k) => k.split("__");

/**
 * @returns {{ shipments:[{product_id,date,count}], videos:[{product_id,date,count}], invites:[{added_by,date,count}] }}
 */
export function aggDaily({ collabs, videos, invites }, from, to) {
  const ships = collabs.filter((c) => inRange(day(c.ship_date), from, to));
  const vids  = videos.filter((v) => v.product_id && inRange(day(v.published_at), from, to));
  const invs  = invites.filter((i) => inRange(pstDay(i.added_at), from, to));
  return {
    shipments: countBy(ships, (c) => `${c.product_id}__${day(c.ship_date)}`,
      (k) => { const [product_id, date] = split(k); return { product_id, date }; }),
    videos: countBy(vids, (v) => `${v.product_id}__${day(v.published_at)}`,
      (k) => { const [product_id, date] = split(k); return { product_id, date }; }),
    invites: countBy(invs, (i) => `${i.added_by ?? "unknown"}__${pstDay(i.added_at)}`,
      (k) => { const [added_by, date] = split(k); return { added_by, date }; }),
  };
}
