// ─── 达人归属（纯函数）：一个达人的寄样应只记在一个助理名下 ─────────────────
// 归属人 = 该达人最早一条「有跟进人」的寄样的跟进人；没写跟进人的寄样不参与判断。

/** Map<creatorId, 归属 staffId> */
export function ownerMap(collabs) {
  const first = new Map();
  for (const c of collabs) {
    if (!c.staff_id) continue;
    const cur = first.get(c.creator_id);
    if (!cur || (c.ship_date || "") < (cur.ship_date || "")) first.set(c.creator_id, c);
  }
  return new Map([...first].map(([id, c]) => [id, c.staff_id]));
}

/**
 * 归属冲突：同一达人的寄样出现了多个跟进人
 * @returns [{ creatorId, handle, owner, staff: [{ staffId, count, first, last }], rows }]（按涉及寄样数降序）
 */
export function findOwnershipConflicts(collabs, creators) {
  const handleOf = new Map(creators.map((c) => [c.id, c.handle]));
  const byCreator = new Map();
  for (const c of collabs) if (c.staff_id) byCreator.set(c.creator_id, [...(byCreator.get(c.creator_id) || []), c]);
  const owners = ownerMap(collabs), out = [];
  for (const [creatorId, list] of byCreator) {
    const per = new Map();
    for (const c of list) {
      const s = per.get(c.staff_id) || { staffId: c.staff_id, count: 0, first: c.ship_date, last: c.ship_date };
      s.count++; if (c.ship_date < s.first) s.first = c.ship_date; if (c.ship_date > s.last) s.last = c.ship_date;
      per.set(c.staff_id, s);
    }
    if (per.size < 2) continue;
    out.push({ creatorId, handle: handleOf.get(creatorId) || "?", owner: owners.get(creatorId), rows: list.length,
      staff: [...per.values()].sort((a, b) => a.first.localeCompare(b.first)) });
  }
  return out.sort((a, b) => b.rows - a.rows);
}
