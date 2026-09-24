import { T, glassStyle } from "../../constants/tokens.js";
import { PRODUCT_STATUSES, PS_COLORS, PRODUCT_TYPES } from "../../constants/products.js";
import { Btn, Badge, Pill } from "../../components/ui/index.jsx";

/** 单个产品卡片：折叠显示概要，展开后可快捷改状态 / 新老品，或进入编辑 */
export default function ProductCard({ p, expanded, onToggle, onUpdate, onEdit, onDelete, readonly, canDelete }) {
  return (
    <div style={{ ...glassStyle(14), padding: "12px 16px", marginBottom: 10 }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <span style={{ fontSize: 11, color: T.hint, width: 12 }}>{expanded ? "▼" : "▶"}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{p.internal_name}</span>
        <Badge label={p.status} color={PS_COLORS[p.status]} />
        <Badge label={p.is_new ? "新品" : "老品"} color={p.is_new ? T.success : T.warning} />
        <span style={{ fontSize: 12, color: T.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.product_title}</span>
        <code style={{ fontSize: 11, color: T.hint }}>{p.sku_id}</code>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.glassStroke}` }}>
          {p.key_points && <div style={{ fontSize: 13, color: T.muted, marginBottom: 12 }}>卖点：{p.key_points}</div>}
          {!readonly && (
            <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 5 }}>
                {PRODUCT_STATUSES.map((s) => <Pill key={s} small active={p.status === s} color={PS_COLORS[s]} onClick={() => onUpdate({ status: s })}>{s}</Pill>)}
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {PRODUCT_TYPES.map((t) => <Pill key={t.label} small active={p.is_new === t.value} color={t.color} onClick={() => onUpdate({ is_new: t.value })}>{t.label}</Pill>)}
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <Btn small onClick={onEdit}>编辑</Btn>
                {canDelete && <Btn small danger onClick={onDelete}>删除</Btn>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
