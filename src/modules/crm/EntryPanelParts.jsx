// ─── InfluencerEntryPanel 子组件 ─────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";
import { T } from "../../constants/tokens.js";
import { Inp, Sel, TagGroup } from "../../components/ui/index.jsx";

// ── 单选标签 ──────────────────────────────────────────────────────────────────
export function TagRadio({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(on ? "" : o.value)} style={{
            fontSize: 12, padding: "5px 11px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
            border: `1px solid ${on ? T.accent : T.glassStroke}`,
            background: on ? `${T.accent}22` : "rgba(255,255,255,0.4)",
            color: on ? T.accent : T.muted, fontWeight: on ? 700 : 500, transition: "all .15s",
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

// ── 字段容器 ──────────────────────────────────────────────────────────────────
export function Field({ label, children, full }) {
  return (
    <div style={{ marginBottom: 13, gridColumn: full ? "1 / -1" : "auto" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

// ── 分区标题 ──────────────────────────────────────────────────────────────────
export function SectionBar({ icon, title, sub }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      margin: "16px 0 12px", paddingBottom: 8, borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{title}</span>
      {sub && <span style={{ fontSize: 12, color: T.hint }}>{sub}</span>}
    </div>
  );
}

// ── 产品搜索输入 ──────────────────────────────────────────────────────────────
export function ProductSearch({ value, products, onChange, inputStyle }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  const filtered = query.trim()
    ? products.filter((p) => (p.internalName || "").toLowerCase().includes(query.toLowerCase()))
    : products;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (p) => {
    const name = p.internalName || p.internal_name;
    setQuery(name); onChange(name); setOpen(false);
  };

  const isMatched = !!products.find((p) => (p.internalName || p.internal_name) === query);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input value={query} placeholder="输入产品名搜索…"
        onChange={(e) => { setQuery(e.target.value); onChange(""); setOpen(true); }}
        onFocus={() => setOpen(true)} style={inputStyle} />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          background: "#fff", border: `1.5px solid ${T.accent}44`, borderRadius: 10,
          boxShadow: "0 8px 24px rgba(232,75,124,0.15)", maxHeight: 180, overflowY: "auto",
        }}>
          {filtered.map((p) => {
            const name = p.internalName || p.internal_name;
            return (
              <div key={p.id || name} onMouseDown={() => select(p)} style={{
                padding: "9px 13px", fontSize: 14, cursor: "pointer", color: T.text,
                borderBottom: `1px solid ${T.border}`,
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = `${T.accent}11`}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >{name}</div>
            );
          })}
        </div>
      )}
      {query && !isMatched && (
        <div style={{ fontSize: 11, color: T.hint, marginTop: 4 }}>未匹配产品，请从列表中选择</div>
      )}
    </div>
  );
}

// ── 合作进度双选 ──────────────────────────────────────────────────────────────
export function StatusPicker({ value, onChange }) {
  const opts = [{ label: "待接触", color: "#8A90A0" }, { label: "已寄样", color: T.accent }];
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {opts.map(({ label, color }) => {
        const on = value === label;
        return (
          <button key={label} type="button" onClick={() => onChange(label)} style={{
            flex: 1, padding: "10px 0", borderRadius: 12, cursor: "pointer",
            fontFamily: "inherit", fontSize: 14, fontWeight: 700,
            border: `2px solid ${on ? color : T.glassStroke}`,
            background: on ? `${color}18` : "rgba(255,255,255,0.4)",
            color: on ? color : T.muted, transition: "all .15s",
          }}>{label}</button>
        );
      })}
    </div>
  );
}

// ── 属性字段分区渲染 ──────────────────────────────────────────────────────────
export function AttrSection({ fields, formState, set, accentColor }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
      {fields.map((field) => (
        <Field key={field.key} label={field.label} full={field.type === "multi"}>
          {field.dropdown
            ? <Sel value={formState[field.key] || ""} onChange={(v) => set(field.key, v)} style={{ width: "100%" }}>
                <option value="">— 未选 —</option>
                {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Sel>
            : field.type === "multi"
              ? <TagGroup
                  options={field.options.map((o) => o.value)}
                  selected={formState[field.key] || []}
                  color={accentColor}
                  onToggle={(v) => {
                    const cur = formState[field.key] || [];
                    set(field.key, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
                  }}
                />
              : field.type === "text"
                ? <Inp value={formState[field.key] || ""} onChange={(v) => set(field.key, v)} placeholder={field.placeholder || ""} />
                : <TagRadio options={field.options} value={formState[field.key] || ""} onChange={(v) => set(field.key, v)} />
          }
        </Field>
      ))}
    </div>
  );
}
