// modules/crm/InfluencerEntryPanel.jsx — 新增 / 编辑一条寄样
// 身份（达人ID/别名/达人备注）跟着人走；属性、合作备注只属于这一条寄样。
import { useEffect, useMemo, useState } from "react";
import { T, FONT } from "../../constants/tokens.js";
import { CREATOR_FIELDS } from "../../constants/creatorOptions.js";
import { Inp, Btn } from "../../components/ui/index.jsx";
import { emptyAttrs, ATTR_KEYS } from "../../lib/crm/attrs.js";
import { normName } from "../../lib/crm/identity.js";
import { todayPST } from "../../lib/utils.js";
import ShipScoreModal from "./ShipScoreModal.jsx";
import EntryIdentity from "./EntryIdentity.jsx";
import { Field, SectionBar, ProductSearch, StatusPicker, AttrSection } from "./EntryPanelParts.jsx";

const OBJ_FIELDS = CREATOR_FIELDS.filter((f) => f.category === "obj");
const SUB_FIELDS = CREATOR_FIELDS.filter((f) => f.category === "sub");
const blank = () => ({
  influencerId: "", aliases: [], creatorNote: "", product: "", productColor: "", shipDate: todayPST(), staffId: "",
  crmStatus: "已寄样", baseStatus: "已寄样", note: "", ...emptyAttrs(),
});
const inputStyle = { width: "100%", background: "rgba(255,255,255,0.45)", border: `1.5px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: FONT.body, padding: "9px 13px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" };

/**
 * @param crm     useCRM 的返回（resolve / search / check / save / handleOf / latest / influencers）
 * @param onSaved (res) => void   保存成功回调（res.pool 为邀约库联动结果）
 */
export default function InfluencerEntryPanel({ initial, products = [], staff = [], crm, onSaved, onClose }) {
  const [showShipScore, setShowShipScore] = useState(false);
  const [f, setF] = useState(() => ({ ...blank(), ...(initial || {}) }));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [prefilledFrom, setPrefilled] = useState(initial?.creatorId || null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const staffName = (id) => staff.find((s) => String(s.id) === String(id))?.name || "—";

  const resolvedId = initial?.creatorId || crm.resolve(f.influencerId);
  const history = useMemo(() => crm.influencers.filter((i) => i.creatorId === resolvedId && i.id !== initial?.id)
    .sort((a, b) => b.shipDate.localeCompare(a.shipDate)), [crm.influencers, resolvedId, initial?.id]);
  const repeat = history.find((h) => h.product === f.product);

  // 新录入时认出已有达人 → 带出她最近一次寄样的属性、别名、达人备注
  useEffect(() => {
    if (initial || !resolvedId || resolvedId === prefilledFrom) return;
    const last = crm.latest.get(resolvedId);
    if (last) setF((p) => ({ ...p, aliases: last.aliases, creatorNote: last.creatorNote, ...Object.fromEntries(ATTR_KEYS.map((k) => [k, last[k]])) }));
    setPrefilled(resolvedId);
  }, [initial, resolvedId, prefilledFrom, crm.latest]);

  const typed = normName(f.influencerId);
  const who = !typed ? null
    : initial && typed !== normName(initial.influencerId) ? { text: `将改名：@${initial.influencerId} → @${typed}（旧名自动记为别名）`, color: T.warning }
    : resolvedId && crm.handleOf(resolvedId) !== typed ? { text: `这是 @${crm.handleOf(resolvedId)} 的别名，会记到她名下`, color: T.accent }
    : resolvedId ? { text: "已有档案，属性已带出最近一次寄样的值，请按现在的情况核对", color: T.accent }
    : { text: "新达人，保存后建立档案", color: T.hint };
  const basicsDone = typed && f.product && f.shipDate && f.staffId;

  async function submit() {
    setErr("");
    let identity = initial ? { creatorId: initial.creatorId, oldHandle: initial.influencerId } : null;
    let chk = crm.check(f, identity);
    if (!identity && !chk.creatorId && chk.mergeWith.length === 1) {       // 别名是已有达人的现名 → 该达人改名
      const id = chk.mergeWith[0], old = crm.handleOf(id);
      if (!confirm(`@${old} 已有档案。确认她改名为 @${typed} 吗？@${old} 会记为别名。`)) return;
      identity = { creatorId: id, oldHandle: old };
      chk = crm.check(f, identity);
    }
    if (chk.errors.length) { setErr(chk.errors.join("；")); return; }
    if (!chk.creatorId && chk.mergeWith.length) { setErr("填写的别名分别属于多位已有达人，请先逐个处理"); return; }
    for (const dropId of chk.mergeWith) {
      if (!confirm(`@${crm.handleOf(dropId)} 是另一份达人档案。确认是同一个人、合并到 @${crm.handleOf(chk.creatorId)} 名下吗？\n（她的寄样记录会转过来，@${crm.handleOf(dropId)} 变成别名）`)) return;
    }
    setBusy(true);
    try { onSaved?.(await crm.save(f, initial, identity, chk.mergeWith)); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,0.5)", zIndex: 1500, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px", overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 580, boxShadow: "0 20px 60px rgba(40,90,180,0.2)", border: `1.5px solid ${T.border}` }}>
        <div style={{ fontSize: FONT.h2, fontWeight: 800, color: T.text, marginBottom: 18 }}>{initial ? "编辑寄样" : "新增寄样"}</div>

        <EntryIdentity f={f} set={set} history={history} who={who} staffName={staffName}
          suggest={initial ? null : (q) => crm.search(q).filter((s) => s.handle !== normName(q))} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label="合作产品 *">
            <ProductSearch value={f.product} products={products} onChange={(v) => set("product", v)} inputStyle={inputStyle} />
            {repeat && <div style={{ fontSize: FONT.note, color: T.warning, marginTop: 5 }}>她 {repeat.shipDate} 已寄过这个产品，保存即记为复投</div>}
            <button type="button" onClick={() => setShowShipScore(true)} style={{ marginTop: 6, fontSize: FONT.note, color: T.accent, background: "none", border: `1px dashed ${T.accent}66`, borderRadius: 8, padding: "3px 9px", cursor: "pointer", fontFamily: "inherit" }}>不确定是否可寄？</button>
          </Field>
          <Field label="颜色"><Inp value={f.productColor || ""} onChange={(v) => set("productColor", v)} placeholder="如：黑色、米白" /></Field>
          <Field label="寄样时间 *"><input type="date" value={f.shipDate} onChange={(e) => set("shipDate", e.target.value)} style={inputStyle} /></Field>
          <Field label="跟进人 *">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {staff.length === 0 ? <span style={{ fontSize: FONT.note, color: T.hint }}>请先在员工管理添加助理</span>
                : staff.map((s) => {
                  const on = f.staffId === String(s.id);
                  return <button key={s.id} type="button" onClick={() => set("staffId", String(s.id))} style={{ fontSize: FONT.body, padding: "5px 12px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${on ? T.accent : T.glassStroke}`, background: on ? `${T.accent}22` : "rgba(255,255,255,0.4)", color: on ? T.accent : T.muted, fontWeight: on ? 700 : 500 }}>{s.name}</button>;
                })}
            </div>
          </Field>
        </div>

        <div style={{ opacity: basicsDone ? 1 : 0.4, pointerEvents: basicsDone ? "auto" : "none", transition: "opacity .2s" }}>
          <SectionBar icon="📊" title="客观数据（这次寄样时）" sub="后台直接可查" />
          <AttrSection fields={OBJ_FIELDS} formState={f} set={set} accentColor={T.accent} />
          <SectionBar icon="👁" title="主观数据（这次寄样时）" sub="需打开主页判断" />
          <AttrSection fields={SUB_FIELDS} formState={f} set={set} accentColor="#7C3AED" />
        </div>

        <div style={{ margin: "16px 0 14px" }}>
          <div style={{ fontSize: FONT.note, fontWeight: 700, color: T.muted, marginBottom: 8 }}>合作进度</div>
          <StatusPicker value={f.crmStatus} onChange={(v) => setF((p) => ({ ...p, crmStatus: v, baseStatus: v }))} />
        </div>
        <Field label="合作备注（只属于这次寄样）">
          <textarea value={f.note} onChange={(e) => set("note", e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        {err && <div style={{ fontSize: FONT.note, color: T.danger, marginTop: 6 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <Btn onClick={onClose}>取消</Btn>
          <Btn accent disabled={!typed || !f.product || busy} onClick={submit}>{busy ? "保存中…" : "保存"}</Btn>
        </div>
      </div>
      {showShipScore && <ShipScoreModal onClose={() => setShowShipScore(false)} />}
    </div>
  );
}
