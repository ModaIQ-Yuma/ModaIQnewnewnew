// modules/videos/MergeModal.jsx — 非CRM视频归入CRM弹窗
import { useState, useEffect } from "react";
import { glassStyle, T } from "../../constants/tokens.js";
import { searchCreators, fetchCreatorCollabs } from "../../lib/supabase/videos.js";
import { mergeIntoCreator } from "../../lib/supabase/videosMerge.js";

export default function MergeModal({ storeId, video, onClose, onDone }) {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [selected, setSelected] = useState(null); // { id, handle }
  const [collabs,  setCollabs]  = useState([]);
  const [collabId, setCollabId] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");

  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    const t = setTimeout(async () => {
      const res = await searchCreators(storeId, query);
      setResults(res);
    }, 300);
    return () => clearTimeout(t);
  }, [query, storeId]);

  useEffect(() => {
    if (!selected) { setCollabs([]); setCollabId(null); return; }
    fetchCreatorCollabs(storeId, selected.id).then((rows) => {
      setCollabs(rows);
      setCollabId(rows[0]?.id || null);
    });
  }, [selected, storeId]);

  async function handleSave() {
    if (!selected || !collabId) { setErr("请选择达人和寄样记录"); return; }
    setSaving(true); setErr("");
    try {
      await mergeIntoCreator(
        storeId, video.id, selected.id,
        selected.handle, video.creator_handle, collabId
      );
      onDone();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(10,22,40,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ ...glassStyle(18, true), padding: "28px 32px", width: 420 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>归入 CRM</div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>
          达人：<span style={{ fontWeight: 600, color: T.accent }}>{video.creator_handle}</span>
        </div>

        {/* 搜索旧 handle */}
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 6 }}>输入达人旧名称</div>
        <input
          style={inp}
          placeholder="搜索旧 handle…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
        />
        {results.length > 0 && !selected && (
          <div style={{ ...glassStyle(10), marginTop: 4, overflow: "hidden" }}>
            {results.map((r) => (
              <div key={r.id} onClick={() => { setSelected(r); setQuery(r.handle); setResults([]); }}
                style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, color: T.text,
                  borderBottom: `1px solid ${T.glassStroke}` }}>
                {r.handle}
              </div>
            ))}
          </div>
        )}

        {/* 寄样记录选择 */}
        {selected && collabs.length > 0 && (
          <>
            <div style={{ fontSize: 13, color: T.muted, margin: "16px 0 6px" }}>选择寄样记录</div>
            <select style={{ ...inp, cursor: "pointer" }}
              value={collabId || ""} onChange={(e) => setCollabId(e.target.value)}>
              {collabs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.products?.internal_name} · {c.ship_date}
                </option>
              ))}
            </select>
          </>
        )}
        {selected && collabs.length === 0 && (
          <div style={{ fontSize: 13, color: T.warning, marginTop: 12 }}>该达人在 CRM 暂无寄样记录</div>
        )}

        {err && <div style={{ fontSize: 12, color: T.danger, marginTop: 10 }}>{err}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnGhost}>取消</button>
          <button onClick={handleSave} disabled={saving || !selected || !collabId} style={btnPrimary}>
            {saving ? "保存中…" : "确认归入"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = {
  width: "100%", boxSizing: "border-box", padding: "9px 13px", borderRadius: 10,
  border: `1.5px solid ${T.border}`, background: "rgba(255,255,255,0.6)",
  color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none",
};
const btnPrimary = {
  padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer",
  background: T.grad, color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "inherit",
};
const btnGhost = {
  padding: "9px 20px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
  background: "transparent", color: T.accent, border: `1.5px solid ${T.accent}`, fontSize: 13,
};
