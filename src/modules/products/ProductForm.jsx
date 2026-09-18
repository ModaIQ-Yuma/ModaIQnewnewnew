import { useState } from "react";
import { T, glassStyle } from "../../constants/tokens.js";
import { PRODUCT_STATUSES, PS_COLORS, PRODUCT_TYPES } from "../../constants/products.js";
import { Inp, Btn, Pill, TextArea } from "../../components/ui/index.jsx";
import { findDuplicate } from "./productFilters.js";

const EMPTY = { internal_name: "", product_title: "", sku_id: "", key_points: "", status: "测款", is_new: true };

/** 新增 / 编辑产品表单。onSubmit(fields) 由父组件决定调 create 还是 update */
export default function ProductForm({ initial, products, onSubmit, onCancel }) {
  const [f, setF] = useState({ ...EMPTY, ...(initial || {}) });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const dup = findDuplicate(products, f, initial?.id || null);
  const valid = f.internal_name.trim() && f.sku_id.trim() && !dup;

  async function submit() {
    setBusy(true); setErr("");
    try { await onSubmit({ ...f, internal_name: f.internal_name.trim(), sku_id: f.sku_id.trim() }); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div style={{ ...glassStyle(16, true), padding: 20, marginBottom: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{initial ? "编辑产品" : "新增产品"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="内部简称 *"><Inp value={f.internal_name} onChange={set("internal_name")} placeholder="eg. 黑色高腰瑜伽裤" /></Field>
        <Field label="TK 商品 ID *（18位）"><Inp value={f.sku_id} onChange={set("sku_id")} placeholder="eg. 1732282566931747350" /></Field>
        <Field label="TK 后台标题" span><Inp value={f.product_title} onChange={set("product_title")} placeholder="eg. High Waist Yoga Leggings" /></Field>
        <Field label="卖点（AI / 外联使用）" span>
          <TextArea value={f.key_points} onChange={set("key_points")} rows={2} placeholder="eg. 显瘦·高腰·不透·多场景" />
        </Field>
        <Field label="状态"><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PRODUCT_STATUSES.map((s) => <Pill key={s} active={f.status === s} color={PS_COLORS[s]} onClick={() => set("status")(s)}>{s}</Pill>)}
        </div></Field>
        <Field label="新品 / 老品"><div style={{ display: "flex", gap: 6 }}>
          {PRODUCT_TYPES.map((t) => <Pill key={t.label} active={f.is_new === t.value} color={t.color} onClick={() => set("is_new")(t.value)}>{t.label}</Pill>)}
        </div></Field>
      </div>
      {dup && <div style={{ fontSize: 12, color: T.danger, marginTop: 10 }}>与已有产品「{dup.internal_name}」的简称或商品ID重复</div>}
      {err && <div style={{ fontSize: 12, color: T.danger, marginTop: 10 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Btn accent onClick={submit} disabled={!valid || busy} style={{ flex: 1 }}>{busy ? "保存中…" : "保存"}</Btn>
        <Btn onClick={onCancel}>取消</Btn>
      </div>
    </div>
  );
}

function Field({ label, span, children }) {
  return (
    <div style={{ gridColumn: span ? "1 / -1" : "auto" }}>
      <div style={{ fontSize: 11.5, color: T.hint, fontWeight: 600, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}
