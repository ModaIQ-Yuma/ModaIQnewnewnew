import { useState } from "react";
import { T, glassStyle } from "../../constants/tokens.js";
import { PRODUCT_STATUSES, PS_COLORS, PRODUCT_TYPES } from "../../constants/products.js";
import { Inp, Btn, Pill } from "../../components/ui/index.jsx";
import { SectionIntro } from "../../components/layout/SubNav.jsx";
import { filterProducts, countByStatus } from "./productFilters.js";
import ProductForm from "./ProductForm.jsx";
import ProductCard from "./ProductCard.jsx";

export default function ProductsModule({ ctx }) {
  const { products, loading, error, create, update, remove } = ctx.productsApi;
  const [form, setForm]         = useState(null);   // null | "new" | product
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("");
  const [isNew, setIsNew]       = useState(null);
  const readonly = ctx.role === "viewer";

  const list   = filterProducts(products, { search, status, isNew });
  const counts = countByStatus(products, PRODUCT_STATUSES);

  async function submit(fields) {
    if (form === "new") await create(fields); else await update(form.id, fields);
    setForm(null);
  }
  async function del(p) {
    if (!confirm(`删除「${p.internal_name}」？关联的寄样记录会阻止删除。`)) return;
    try { await remove(p.id); } catch (e) { alert(e.message); }
  }

  return (
    <div>
      <SectionIntro style={{ marginBottom: 14 }}>
        产品库是全站的基础档案：CRM 寄样、视频匹配（按商品 ID）、复盘统计都从这里取产品。点击下方数字卡片可按推广状态筛选，再点一次取消。
      </SectionIntro>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        {PRODUCT_STATUSES.map((s) => (
          <div key={s} onClick={() => setStatus(status === s ? "" : s)} style={{
            ...glassStyle(10), padding: "8px 14px", minWidth: 72, textAlign: "center", cursor: "pointer",
            border: `1.5px solid ${status === s ? PS_COLORS[s] : PS_COLORS[s] + "44"}`,
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: PS_COLORS[s] }}>{counts[s]}</div>
            <div style={{ fontSize: 11, color: T.muted }}>{s}</div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 5, marginLeft: 6 }}>
          {PRODUCT_TYPES.map((t) => (
            <Pill key={t.label} active={isNew === t.value} color={t.color} onClick={() => setIsNew(isNew === t.value ? null : t.value)}>{t.label}</Pill>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {!readonly && <Btn accent onClick={() => setForm("new")}>+ 新增产品</Btn>}
      </div>
      <div style={{ marginBottom: 14 }}>
        <Inp value={search} onChange={setSearch} placeholder="搜索简称 / 标题 / 商品ID…" />
      </div>

      {form && <ProductForm initial={form === "new" ? null : form} products={products} onSubmit={submit} onCancel={() => setForm(null)} />}

      {error && <div style={{ color: T.danger, fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
      {loading ? <div style={{ color: T.hint, fontSize: 13 }}>加载中…</div>
        : list.length === 0 ? <div style={{ color: T.hint, fontSize: 13, textAlign: "center", padding: 40 }}>暂无产品</div>
        : list.map((p) => (
          <ProductCard key={p.id} p={p} readonly={readonly}
            expanded={expanded === p.id} onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
            onUpdate={(patch) => update(p.id, patch).catch((e) => alert(e.message))}
            onEdit={() => setForm(p)} onDelete={() => del(p)} />
        ))}
    </div>
  );
}
