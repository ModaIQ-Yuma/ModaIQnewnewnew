// modules/crm/EntryIdentity.jsx — 录入面板的「达人身份」区：达人ID / 别名 / 达人备注 / 历史合作
import { useState } from "react";
import { T, FONT } from "../../constants/tokens.js";
import { Inp } from "../../components/ui/index.jsx";
import { computeStatus } from "../../lib/crm/crmFlow.js";
import { cumOrders } from "../../lib/crm/cumOrders.js";
import { Field } from "./EntryPanelParts.jsx";

const hintStyle = (color) => ({ fontSize: FONT.note, color, marginTop: 5 });

/** 联想下拉：输入 2 个字符起，现名/别名模糊匹配，点选即填入现名 */
function Suggestions({ items, onPick }) {
  if (!items.length) return null;
  return (
    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, marginTop: 4, background: "#fff", border: `1.5px solid ${T.accent}44`, borderRadius: 12, boxShadow: "0 10px 30px rgba(40,90,180,0.16)", overflow: "hidden" }}>
      {items.map((s) => (
        <div key={s.id} onMouseDown={(e) => { e.preventDefault(); onPick(s.handle); }}
          style={{ padding: "8px 12px", cursor: "pointer", borderBottom: `1px solid ${T.glassStroke}`, display: "flex", justifyContent: "space-between", gap: 8 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${T.accent}0d`; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          <span style={{ fontSize: FONT.body, fontWeight: 700, color: T.text }}>
            @{s.handle}{s.alias && <span style={{ fontSize: FONT.tiny, fontWeight: 400, color: T.hint, marginLeft: 6 }}>别名 @{s.alias}</span>}
          </span>
          <span style={{ fontSize: FONT.tiny, color: T.hint, whiteSpace: "nowrap" }}>合作 {s.count} 次 · 最近 {s.latestDate || "—"}</span>
        </div>
      ))}
    </div>
  );
}

/** 别名：输入后回车或点「添加」生成标签 */
function AliasInput({ value = [], onChange }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim().replace(/^@+/, "").toLowerCase();
    if (v && !value.includes(v)) onChange([...value, v]);
    setText("");
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 6 }}>
        <Inp value={text} onChange={setText} placeholder="曾用名，回车添加" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
        <button type="button" onClick={add} style={{ fontSize: FONT.note, padding: "0 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.accent, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>添加</button>
      </div>
      {value.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {value.map((a) => (
            <span key={a} style={{ fontSize: FONT.note, background: `${T.accent}14`, color: T.accent, borderRadius: 12, padding: "3px 10px" }}>
              @{a} <span onClick={() => onChange(value.filter((x) => x !== a))} style={{ cursor: "pointer", marginLeft: 4 }}>×</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * @param f/set    表单与 setter      @param history 该达人的历史寄样（已按日期倒序）
 * @param who      身份识别结果文案：{ text, color }
 * @param suggest  (输入) => 联想列表；编辑已有寄样时不传（不做联想）
 */
export default function EntryIdentity({ f, set, history, who, staffName, suggest }) {
  const [focused, setFocused] = useState(false);
  const items = focused && suggest ? suggest(f.influencerId) : [];
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="达人ID *">
          <div style={{ position: "relative" }}>
            <Inp value={f.influencerId} onChange={(v) => set("influencerId", v)} placeholder="输入 2 个字符起自动联想"
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
            <Suggestions items={items} onPick={(h) => { set("influencerId", h); setFocused(false); }} />
          </div>
          {who && <div style={hintStyle(who.color)}>{who.text}</div>}
        </Field>
        <Field label="别名（曾用名）">
          <AliasInput value={f.aliases} onChange={(v) => set("aliases", v)} />
        </Field>
      </div>
      {history.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.6)", border: `1.5px solid ${T.accent}44`, borderRadius: 10, padding: "8px 10px", marginBottom: 13, maxHeight: 120, overflowY: "auto" }}>
          <div style={{ fontSize: FONT.tiny, fontWeight: 700, color: T.accent, marginBottom: 4 }}>⚡ 已合作过 {history.length} 次</div>
          {history.map((m) => (
            <div key={m.id} style={{ fontSize: FONT.note, color: T.hint, padding: "3px 0", borderTop: `1px dashed ${T.border}`, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <b style={{ color: T.text }}>{m.product}</b><span>{m.shipDate}</span><span>跟进：{staffName(m.staffId)}</span>
              <span>{computeStatus(m)}</span><span>出单 {cumOrders(m)}</span>
            </div>
          ))}
        </div>
      )}
      <Field label="达人备注（描述这个人，所有寄样共用）">
        <Inp value={f.creatorNote || ""} onChange={(v) => set("creatorNote", v)} placeholder="如：只接付费、回复慢" />
      </Field>
    </>
  );
}
