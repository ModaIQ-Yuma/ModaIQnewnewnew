// modules/crm/EntryIdentity.jsx — 录入面板的「达人身份」区：达人ID / 别名 / 达人备注 / 历史合作
import { useState } from "react";
import { T, FONT } from "../../constants/tokens.js";
import { Inp } from "../../components/ui/index.jsx";
import { computeStatus } from "../../lib/crm/crmFlow.js";
import { cumOrders } from "../../lib/crm/cumOrders.js";
import { Field } from "./EntryPanelParts.jsx";

const hintStyle = (color) => ({ fontSize: FONT.note, color, marginTop: 5 });

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
 */
export default function EntryIdentity({ f, set, history, who, staffName }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <Field label="达人ID *">
          <Inp value={f.influencerId} onChange={(v) => set("influencerId", v)} placeholder="username（不含 @）" />
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
