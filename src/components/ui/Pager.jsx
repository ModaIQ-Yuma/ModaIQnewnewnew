// ─── 分页条：上一页 / 页码 / 下一页（页数多时中间折叠）────────────────────
import { T, FONT } from "../../constants/tokens.js";

const btn = (on) => ({
  minWidth: 32, height: 32, padding: "0 10px", borderRadius: 16, cursor: "pointer", fontFamily: "inherit", fontSize: FONT.body,
  border: `1.5px solid ${on ? T.accent : T.border}`, background: on ? T.accent : "rgba(255,255,255,0.6)", color: on ? "#fff" : T.muted, fontWeight: on ? 700 : 500,
});

/** 要显示的页码：首尾 + 当前页前后各 1 页，其余用 … */
function pagesToShow(page, total) {
  const set = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const out = [];
  [...set].sort((a, b) => a - b).forEach((p, i, arr) => { if (i && p - arr[i - 1] > 1) out.push("…" + p); out.push(p); });
  return out;
}

export default function Pager({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, margin: "14px 0 4px", flexWrap: "wrap" }}>
      <button style={btn(false)} disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
      {pagesToShow(page, totalPages).map((p) => typeof p === "number"
        ? <button key={p} style={btn(p === page)} onClick={() => onChange(p)}>{p}</button>
        : <span key={p} style={{ color: T.hint, padding: "0 2px" }}>…</span>)}
      <button style={btn(false)} disabled={page === totalPages} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}
