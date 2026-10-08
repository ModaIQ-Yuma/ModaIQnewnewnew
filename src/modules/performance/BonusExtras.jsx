// modules/performance/BonusExtras.jsx — 手填奖金：直播爆单（按档位算钱，并入奖金池）/ 新开发付费达人（单独给助理）
import { useState } from "react";
import { T, glassStyle, tabStyle } from "../../constants/tokens.js";
import { extraRow, tierAmount } from "../../lib/bonus/bonusCalc.js";
import { s, money, yuan } from "./perfStyles.js";

const EMPTY = { liveDate: "", gmv: "", staffId: "", amount: "", note: "" };

export default function BonusExtras({ ym, people, bonus }) {
  const [kind, setKind] = useState("直播爆单");
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const nameOf = (id) => people.find((p) => p.id === id)?.name || "（不在本次提报名单）";
  const list = bonus.extras.filter((e) => e.period === ym);
  const isLive = kind === "直播爆单";

  async function add() {
    const { row, error: err } = extraRow({ ...f, kind, period: ym });
    if (err) return setError(err);
    setBusy(true); setError("");
    try { await bonus.addExtra(row); setF(EMPTY); } catch (e) { setError(`保存失败：${e.message}`); }
    setBusy(false);
  }
  async function remove(x) {
    if (!confirm("删除这条？")) return;
    try { await bonus.removeExtra(x.id); } catch (e) { setError(`删除失败：${e.message}`); }
  }

  return (
    <div style={{ ...glassStyle(16), ...s.section }}>
      <div style={s.h2}>手填奖金</div>
      <div style={{ ...s.note, marginBottom: 12 }}>直播爆单按单场 GMV 套档位，和爆单视频合在一起按比例分；新开发付费达人记在助理名下，单独结算。</div>
      <div style={{ ...s.row, marginBottom: 10 }}>
        {["直播爆单", "新开发付费达人"].map((k) => <button key={k} style={tabStyle(kind === k)} onClick={() => { setKind(k); setError(""); }}>{k}</button>)}
      </div>
      <div style={s.row}>
        {isLive ? (<>
          <input type="date" style={s.input} value={f.liveDate} onChange={set("liveDate")} />
          <input style={{ ...s.input, width: 140 }} placeholder="单场 GMV（$）" inputMode="decimal" value={f.gmv} onChange={set("gmv")} />
          <span style={s.note}>奖金 {yuan(tierAmount(f.gmv))}</span>
        </>) : (<>
          <select style={s.input} value={f.staffId} onChange={set("staffId")}>
            <option value="">选择助理</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input style={{ ...s.input, width: 120 }} placeholder="金额（¥）" inputMode="numeric" value={f.amount} onChange={set("amount")} />
        </>)}
        <input style={{ ...s.input, flex: 1, minWidth: 160 }} placeholder={isLive ? "备注（主播 / 场次）" : "备注（达人名）"} value={f.note} onChange={set("note")} />
        <button style={s.btn} disabled={busy} onClick={add}>＋ 添加</button>
      </div>
      {error && <div style={s.err}>{error}</div>}

      {list.length > 0 && (
        <table style={{ ...s.table, marginTop: 12 }}>
          <thead><tr>{["类型", "日期 / 助理", "GMV", "奖金", "备注", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.id}>
                <td style={s.td}>{x.kind}</td>
                <td style={s.td}>{x.kind === "直播爆单" ? x.live_date : nameOf(x.staff_id)}</td>
                <td style={{ ...s.td, ...s.num }}>{x.gmv != null ? money(x.gmv) : "—"}</td>
                <td style={{ ...s.td, ...s.num, fontWeight: 700 }}>{yuan(x.amount)}</td>
                <td style={{ ...s.td, color: T.muted }}>{x.note}</td>
                <td style={s.td}><button style={s.btnDanger} onClick={() => remove(x)}>删除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
