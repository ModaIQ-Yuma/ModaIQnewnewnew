// modules/invitePool/PoolRowCells.jsx — 邀约库表格里可以改的两格：归属人、状态（改完立即显示，失败自动恢复）
import { T } from "../../constants/tokens.js";
import { revertPatch, ownerPatch } from "../../lib/invitePool/poolEdit.js";
import { updatePoolRow } from "../../lib/supabase/unconnectedWrite.js";
import { s } from "./invitePoolStyles.js";

async function apply(core, row, patch) {
  core.patchRow("invites", row.id, patch);
  try { await updatePoolRow(row.id, patch); }
  catch (e) { core.refresh(["invites"]); alert(`保存失败，已恢复：${e.message}`); }
}

/** 归属人：管理员可下拉更改或清空；其他人只读 */
export function OwnerCell({ row, core, staff, staffName, canSet }) {
  if (!canSet) return <td style={{ ...s.td, color: T.muted }}>{row.owner_id ? staffName(row.owner_id) : "-"}</td>;
  return (
    <td style={s.td}>
      <select style={{ ...s.sel, padding: "4px 8px", fontSize: 12 }} value={row.owner_id || ""}
        onChange={(e) => apply(core, row, ownerPatch(e.target.value || null, new Date().toISOString()))}>
        <option value="">-（无归属）</option>
        {staff.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>
    </td>
  );
}

/** 状态：已转化的可回退为未转化 */
export function StatusCell({ row, core, canEdit }) {
  const done = row.status === "converted";
  function revert() {
    if (!window.confirm(`把 @${row.creator_id} 回退为未转化？\n回退后她会重新出现在今日邀约名单里。`)) return;
    apply(core, row, revertPatch());
  }
  return (
    <td style={s.td}>
      <span style={done ? s.tagDone : s.tagPending}>{done ? "已转化" : "未转化"}</span>
      {done && canEdit && <button style={{ ...s.btnGhost, padding: "2px 10px", marginLeft: 6, fontSize: 12 }} onClick={revert}>回退</button>}
    </td>
  );
}
