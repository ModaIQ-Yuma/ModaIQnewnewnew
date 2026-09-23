// modules/videos/MergeModal.jsx — 非CRM视频归入 CRM（达人换了名）
// 搜索现名或别名 → 选达人 → 预览会挂上几条视频 → 确认：改名（旧名记为别名）+ 按商品挂视频
import { useMemo, useState } from "react";
import { glassStyle, T, FONT } from "../../constants/tokens.js";
import { Hint } from "../../components/layout/SubNav.jsx";
import { buildNameIndex, resolveName, namesOf, normName, searchCreators } from "../../lib/crm/identity.js";
import { assignByProduct } from "../../lib/video/assignVideos.js";
import { mergeVideosIntoCreator } from "../../lib/supabase/videosMerge.js";

const inp = { width: "100%", boxSizing: "border-box", padding: "9px 13px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "rgba(255,255,255,0.6)", color: T.text, fontSize: FONT.body, fontFamily: "inherit", outline: "none" };
const btn = (primary) => ({ padding: "9px 20px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: FONT.body, fontWeight: 700,
  border: primary ? "none" : `1.5px solid ${T.accent}`, background: primary ? T.grad : "transparent", color: primary ? "#fff" : T.accent });

export default function MergeModal({ storeId, video, core, products, onClose, onDone }) {
  const [query, setQuery]     = useState("");
  const [creator, setCreator] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");
  const newHandle = normName(video.creator_handle);
  const index = useMemo(() => buildNameIndex(core.creators, core.aliases), [core.creators, core.aliases]);
  const productName = (id) => products.find((p) => p.id === id)?.internal_name || "?";

  // 与 CRM 录入联想同一套搜索（现名/别名模糊匹配）
  const results = useMemo(() => (creator ? [] : searchCreators(core.creators, core.aliases, query, 10)),
    [query, creator, core.creators, core.aliases]);

  // 预览：该达人全部名字 + 视频里的新名字下，所有未归属视频按商品能挂上几条
  const preview = useMemo(() => {
    if (!creator) return null;
    const owner = resolveName(index, newHandle);
    if (owner && owner.creatorId !== creator.id) return { conflict: owner.creatorId };
    const names = new Set([...namesOf(creator.id, core.creators, core.aliases), newHandle]);
    const videos = core.videos.filter((v) => !v.collaboration_id && names.has(normName(v.creator_handle)));
    const collabs = core.collabs.filter((c) => c.creator_id === creator.id).map((c) => ({ collabId: c.id, productId: c.product_id, shipDate: c.ship_date }));
    const { byCollab, unmatched } = assignByProduct(videos, collabs);
    return { videos, collabs, attach: [...byCollab.values()].flat().length, unmatched: unmatched.length };
  }, [creator, index, newHandle, core]);

  async function handleSave() {
    setSaving(true); setErr("");
    try { onDone(await mergeVideosIntoCreator(storeId, { creator, newHandle, videos: preview.videos, collabs: preview.collabs })); }
    catch (e) { setErr(e.message); setSaving(false); }
  }

  const handleOf = (id) => core.creators.find((c) => c.id === id)?.handle;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(10,22,40,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...glassStyle(18, true), padding: "26px 30px", width: 460 }}>
        <div style={{ fontSize: FONT.h2, fontWeight: 800, color: T.text, marginBottom: 4 }}>归入 CRM</div>
        <Hint style={{ marginBottom: 16 }}>视频达人 <b style={{ color: T.accent }}>@{newHandle}</b> 不在 CRM。如果她是某位已合作达人换了名，搜她的旧名选中即可：现名改成 @{newHandle}，旧名自动记为别名，以后导入会自动匹配。</Hint>
        <input style={inp} placeholder="搜索现名或别名…" value={query} onChange={(e) => { setQuery(e.target.value); setCreator(null); }} />
        {results.length > 0 && (
          <div style={{ ...glassStyle(10), marginTop: 4, overflow: "hidden" }}>
            {results.map((c) => (
              <div key={c.id} onClick={() => { setCreator(c); setQuery(c.handle); }} style={{ padding: "9px 14px", cursor: "pointer", fontSize: FONT.body, color: T.text, borderBottom: `1px solid ${T.glassStroke}` }}>@{c.handle}{c.alias && <span style={{ fontSize: FONT.tiny, color: T.hint, marginLeft: 6 }}>别名 @{c.alias}</span>}</div>
            ))}
          </div>
        )}
        {preview?.conflict && <div style={{ fontSize: FONT.note, color: T.danger, marginTop: 12 }}>@{newHandle} 已是 @{handleOf(preview.conflict)} 的名字，请先在 CRM 里确认这两位是否同一人。</div>}
        {preview && !preview.conflict && (
          <div style={{ fontSize: FONT.body, color: T.text, marginTop: 14, lineHeight: 1.8 }}>
            她的寄样：{preview.collabs.map((c) => `${productName(c.productId)}（${c.shipDate}）`).join("、") || "无"}<br />
            将挂上 <b style={{ color: T.success }}>{preview.attach}</b> 条视频
            {preview.unmatched > 0 && <>，<b style={{ color: T.warning }}>{preview.unmatched}</b> 条商品不在她的寄样里，保持非CRM</>}
          </div>
        )}
        {err && <div style={{ fontSize: FONT.note, color: T.danger, marginTop: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btn(false)}>取消</button>
          <button onClick={handleSave} disabled={saving || !preview || preview.conflict} style={{ ...btn(true), opacity: !preview || preview.conflict ? 0.5 : 1 }}>{saving ? "保存中…" : "确认归入"}</button>
        </div>
      </div>
    </div>
  );
}
