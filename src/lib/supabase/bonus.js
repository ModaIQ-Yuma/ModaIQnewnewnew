// ─── 月度提报：已提报爆单视频 / 手填奖金的读写 ──────────────────────────────
import { sb, unwrap, fetchAll } from "./client.js";

const SUB_COLS = "id,video_id,creator_handle,gmv,amount,period,source,created_at";
const EXTRA_COLS = "id,period,kind,staff_id,live_date,gmv,amount,note,created_at";

/** 全部已提报（含历史导入，用来判断哪些视频不再算待提报） + 全部手填奖金 */
export async function fetchBonusData(storeId) {
  const [submissions, extras] = await Promise.all([
    fetchAll((from, to) => sb.from("bonus_submissions").select(SUB_COLS).eq("store_id", storeId)
      .order("created_at").order("id").range(from, to), "bonus_submissions"),
    fetchAll((from, to) => sb.from("bonus_extras").select(EXTRA_COLS).eq("store_id", storeId)
      .order("created_at").order("id").range(from, to), "bonus_extras"),
  ]);
  return { submissions, extras };
}

/** 写入提报行（每 500 行一批）；同一条视频已提报过的由唯一约束自动跳过。返回写入的行 */
export async function insertSubmissions(storeId, rows, userId) {
  const out = [];
  for (let i = 0; i < rows.length; i += 500) {
    const part = rows.slice(i, i + 500).map((r) => ({ ...r, store_id: storeId, created_by: userId || null }));
    out.push(...(unwrap(await sb.from("bonus_submissions")
      .upsert(part, { onConflict: "store_id,video_id", ignoreDuplicates: true }).select(SUB_COLS), "bonus_submissions") || []));
  }
  return out;
}

/** 撤销提报 */
export async function deleteSubmissions(ids) {
  for (let i = 0; i < ids.length; i += 150) {
    unwrap(await sb.from("bonus_submissions").delete().in("id", ids.slice(i, i + 150)), "bonus_submissions");
  }
}

/** 新增一条手填奖金，返回写入的行 */
export async function insertExtra(storeId, row) {
  return unwrap(await sb.from("bonus_extras").insert({ ...row, store_id: storeId }).select(EXTRA_COLS).single(), "bonus_extras");
}

export async function deleteExtra(id) {
  unwrap(await sb.from("bonus_extras").delete().eq("id", id), "bonus_extras");
}
