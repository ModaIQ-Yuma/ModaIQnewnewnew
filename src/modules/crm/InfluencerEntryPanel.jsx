import { useState } from "react";
import { T } from "../../constants/tokens.js";
import { CREATOR_FIELDS } from "../../constants/creatorOptions.js";
import { Inp, Btn } from "../../components/ui/index.jsx";
import { withComputedStatus, computeStatus } from "../../lib/crm/crmFlow.js";
import ShipScoreModal from "./ShipScoreModal.jsx";
import { findInfluencerMatches } from "../../lib/crm/influencerLookup.js";
import { Field, SectionBar, ProductSearch, StatusPicker, AttrSection } from "./EntryPanelParts.jsx";
import { todayPST } from "../../lib/utils.js";

const OBJ_FIELDS = CREATOR_FIELDS.filter((f) => f.category === "obj");
const SUB_FIELDS = CREATOR_FIELDS.filter((f) => f.category === "sub");
const today = () => todayPST();
const blank = () => ({
  influencerId: "", product: "", productColor: "", productTitle: "",
  shipDate: today(), staffId: "",
  crmStatus: "已寄样", baseStatus: "已寄样", note: "", style: [], videoRecords: [], aliases: "",
});
const inputStyle = {
  width: "100%", background: "rgba(255,255,255,0.45)", border: `1.5px solid ${T.border}`,
  borderRadius: 10, color: T.text, fontSize: 14, padding: "9px 13px",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

function currentCycleStart() {
  const pst = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Los_Angeles" });
  const [y, mo, d] = pst.split("-").map(Number);
  const pad = (n) => String(n).padStart(2, "0");
  if (d >= 15) return `${y}-${pad(mo)}-15`;
  const pm = mo === 1 ? 12 : mo - 1, py = mo === 1 ? y - 1 : y;
  return `${py}-${pad(pm)}-15`;
}

export default function InfluencerEntryPanel({ initial, products = [], staff = [], influencers = [], shippingGoals = [], onSubmit, onClose }) {
  const [showShipScore, setShowShipScore] = useState(false);
  const [f, setF] = useState(() => ({ ...blank(), ...(initial || {}) }));
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const matches = findInfluencerMatches(f.influencerId, influencers, initial?.id ?? null);
  const basicsDone = f.influencerId.trim() && f.product && f.shipDate && f.staffId;

  function submit() {
    if (!f.influencerId.trim() || !f.product) return;
    const matched = products.find((p) => (p.internalName || p.internal_name) === f.product);
    const rec = {
      ...f,
      id: f.id || Date.now(),
      influencerId: f.influencerId.trim(),
      productTitle: matched?.productTitle || f.productTitle || "",
      date: f.date || new Date().toLocaleDateString("zh-CN"),
    };
    onSubmit(withComputedStatus(rec, f.baseStatus));
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(42,26,34,0.5)", zIndex: 1500,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "32px 16px", overflowY: "auto",
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 560,
        boxShadow: "0 20px 60px rgba(232,75,124,0.2)", border: `1.5px solid ${T.border}`,
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 20 }}>
          {initial ? "编辑达人" : "新增达人"}
        </div>

        {/* 达人策略提示（来自任务模块，只读） */}
        {(() => {
          if (!f.product) return null;
          const cs = currentCycleStart();
          const goal = shippingGoals.find(g => g.productInternalName === f.product && g.cycleStart === cs);
          if (!goal?.influencerStrategy) return null;
          return (
            <div style={{
              background: "rgba(61,127,239,0.07)", border: "1.5px solid rgba(61,127,239,0.25)",
              borderRadius: 12, padding: "10px 14px", marginBottom: 18,
              borderLeft: "4px solid #3D7FEF",
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#3D7FEF", marginBottom: 4, letterSpacing: "0.06em" }}>
                💡 本品达人策略
              </div>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{goal.influencerStrategy}</div>
              {goal.recommendedTags?.length > 0 && (
                <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                  {goal.recommendedTags.map(tag => (
                    <span key={tag} style={{ fontSize: 11, background: "rgba(61,127,239,0.12)", color: "#3D7FEF", borderRadius: 8, padding: "2px 8px" }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* 达人ID + 合作产品 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label="达人ID *">
            <Inp value={f.influencerId} onChange={(v) => set("influencerId", v)} placeholder="@username" />
            {matches.length > 0 && (
              <div style={{
                marginTop: 6, background: "rgba(255,255,255,0.6)", border: `1.5px solid ${T.accent}44`,
                borderRadius: 10, padding: "8px 10px", maxHeight: 130, overflowY: "auto",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 5 }}>
                  ⚡ 已合作过 {matches.length} 次
                </div>
                {matches.map((m) => {
                  const sName = staff.find(s => s.id === m.staffId)?.name || m.staffId || "—";
                  const cumOrders = (m.videoRecords || []).reduce((sum, v) => sum + (Number(v.orders) || 0), 0);
                  return (
                    <div key={m.id} style={{
                      fontSize: 12, color: T.muted, padding: "5px 0",
                      borderTop: `1px dashed ${T.border}`,
                    }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, color: T.text, whiteSpace: "nowrap" }}>{m.product || "—"}</span>
                        {m.productColor && <span style={{ color: T.hint }}>({m.productColor})</span>}
                        <span style={{ color: T.hint }}>跟进：{sName}</span>
                        <span style={{ color: T.hint }}>出单：{cumOrders} 单</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                        <span style={{ color: T.hint }}>{m.shipDate || "—"}</span>
                        <span style={{ color: T.hint }}>{computeStatus(m) || "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Field>

          <div>
            <Field label="合作产品 *">
              <ProductSearch value={f.product} products={products} onChange={(v) => set("product", v)} inputStyle={inputStyle} />
              <button type="button" onClick={() => setShowShipScore(true)} style={{
                marginTop: 6, fontSize: 12, color: T.accent, background: "none",
                border: `1px dashed ${T.accent}66`, borderRadius: 8, padding: "3px 9px",
                cursor: "pointer", fontFamily: "inherit",
              }}>不确定是否可寄？</button>
            </Field>
            <Field label="颜色">
              <Inp value={f.productColor || ""} onChange={(v) => set("productColor", v)} placeholder="如：黑色、米白" />
            </Field>
          </div>
        </div>

        {/* 寄样时间 + 跟进人 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label="寄样时间 *">
            <input type="date" value={f.shipDate} onChange={(e) => set("shipDate", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="跟进人 *">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {staff.length === 0
                ? <span style={{ fontSize: 12, color: T.hint }}>请先在人员管理添加成员</span>
                : staff.map((s) => {
                    const on = f.staffId === String(s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => set("staffId", String(s.id))} style={{
                        fontSize: 13, padding: "5px 12px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
                        border: `1px solid ${on ? T.accent : T.glassStroke}`,
                        background: on ? `${T.accent}22` : "rgba(255,255,255,0.4)",
                        color: on ? T.accent : T.muted, fontWeight: on ? 700 : 500, transition: "all .15s",
                      }}>{s.name}</button>
                    );
                  })}
            </div>
          </Field>
        </div>

        {/* 达人属性（基础填完后解锁） */}
        <div style={{ opacity: basicsDone ? 1 : 0.4, pointerEvents: basicsDone ? "auto" : "none", transition: "opacity .2s" }}>
          <SectionBar icon="📊" title="客观数据" sub="后台直接可查" />
          <AttrSection fields={OBJ_FIELDS} formState={f} set={set} accentColor={T.accent} />
          <SectionBar icon="👁" title="主观数据" sub="需打开主页判断" />
          <AttrSection fields={SUB_FIELDS} formState={f} set={set} accentColor="#7C3AED" />
        </div>

        {/* 合作进度 */}
        <div style={{ margin: "16px 0 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 8 }}>合作进度</div>
          <StatusPicker value={f.crmStatus} onChange={(v) => setF((p) => ({ ...p, crmStatus: v, baseStatus: v }))} />
        </div>

        {/* 备注 */}
        <Field label="备注">
          <textarea value={f.note} onChange={(e) => set("note", e.target.value)} rows={2}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
        </Field>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <Btn onClick={onClose}>取消</Btn>
          <Btn accent disabled={!f.influencerId.trim() || !f.product} onClick={submit}>保存</Btn>
        </div>
      </div>
      {showShipScore && <ShipScoreModal onClose={() => setShowShipScore(false)} />}
    </div>);
}
