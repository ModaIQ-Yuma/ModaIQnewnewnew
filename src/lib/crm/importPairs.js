// ─── 导入前「疑似同一人」检查（纯函数）──────────────────────────────────────
// 文件里某行的别名，恰好是文件里另一位达人的 ID → 两个 ID 可能是同一个人（换过名），
// 也可能只是大小号互相备注。由用户逐对决定：保留 A / 保留 B / 不是同一人。

export const pairKey = (a, b) => [a, b].sort().join("|");

/** @returns [{ key, a, b, rowsA, rowsB, latestA, latestB }]（a/b 按字母序） */
export function detectPairs(rows) {
  const stat = new Map();                                   // handle → { rows, latest }
  for (const r of rows) {
    const s = stat.get(r.handle) || { rows: 0, latest: "" };
    s.rows++; if (r.shipDate > s.latest) s.latest = r.shipDate;
    stat.set(r.handle, s);
  }
  const pairs = new Map();
  for (const r of rows) {
    for (const al of r.aliases) {
      if (!stat.has(al) || al === r.handle) continue;
      const key = pairKey(r.handle, al);
      if (pairs.has(key)) continue;
      const [a, b] = key.split("|");
      pairs.set(key, { key, a, b, rowsA: stat.get(a).rows, rowsB: stat.get(b).rows, latestA: stat.get(a).latest, latestB: stat.get(b).latest });
    }
  }
  return [...pairs.values()];
}
