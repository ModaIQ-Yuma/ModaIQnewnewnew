import { useState } from "react";
import { T } from "../../constants/tokens.js";
import { CREATOR_FIELDS, labelOf } from "../../constants/creatorOptions.js";
import { cumOrders } from "../../lib/crm/cumOrders.js";
import { withComputedStatus } from "../../lib/crm/crmFlow.js";
import { Btn } from "../../components/ui/index.jsx";

function displayValue(field, inf) {
  const v = inf[field.key];
  if (field.type === "multi") return (v && v.length) ? v.join("、") : "—";
  return v ? labelOf(field.key, v) : "—";
}

/**
 * 行展开明细
 * props: inf, onChange(updatedInf), readonly
 */
export default function InfluencerDetailRow({ inf, onChange, readonly }) {
  const [d, setD] = useState("");        // 新视频发布日期
  const [o, setO] = useState("");        // 新视频出单
  const videos = inf.videoRecords || [];

  // 视频变动后，状态据当前数据现算（增视频可能推进，删视频也能正确回退）
  function commitVideos(nextVideos) {
    onChange(withComputedStatus({ ...inf, videoRecords: nextVideos }));
  }

  function addVideo() {
    if (!d) return;
    const rec = {
      videoId: `m-${Date.now()}`, product: inf.product, date: d,
      orders: Number(o) || 0, vv: null, clicks: null,
    };
    commitVideos([rec, ...videos]);
    setD(""); setO("");
  }
  function delVideo(videoId) {
    commitVideos(videos.filter((v) => v.videoId !== videoId));
  }

  const cell = { fontSize: 13, color: T.muted, padding: "3px 0" };
  const dInput = {
    background: "rgba(255,255,255,0.45)", border: `1.5px solid ${T.border}`, borderRadius: 8,
    fontSize: 13, padding: "6px 10px", fontFamily: "inherit", outline: "none",
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.45)", borderTop: `1px dashed ${T.border}`, padding: "16px 18px" }}>
      {inf.productTitle && (
        <div style={{ fontSize: 12, color: T.hint, marginBottom: 10 }}>
          合作产品：<span style={{ color: T.muted, fontWeight: 600 }}>{inf.product}</span>
          <span style={{ margin: "0 6px", opacity: 0.5 }}>·</span>
          商品名：{inf.productTitle}
        </div>
      )}
      {(inf.aliases?.length > 0 || inf.creatorNote) && (
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 10, display: "flex", gap: 18, flexWrap: "wrap" }}>
          {inf.aliases?.length > 0 && <span>别名：{inf.aliases.map((a) => "@" + a).join("、")}</span>}
          {inf.creatorNote && <span>达人备注：{inf.creatorNote}</span>}
        </div>
      )}
      {/* 属性 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: ".06em", marginBottom: 8 }}>寄样时达人属性（{inf.shipDate}）</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px 18px", marginBottom: 16 }}>
        {CREATOR_FIELDS.map((field) => (
          <div key={field.key} style={cell}>
            <span style={{ color: T.hint }}>{field.label}：</span>
            <span style={{ color: T.text, fontWeight: 600 }}>{displayValue(field, inf)}</span>
          </div>
        ))}
      </div>

      {/* 视频明细：只显示 发布时间 + 出单 */}
      <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: ".06em", marginBottom: 8 }}>
        视频明细（累计出单 {cumOrders(inf)}）
      </div>

      {!readonly && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <input type="date" value={d} onChange={(e) => setD(e.target.value)} style={dInput} />
          <input value={o} onChange={(e) => setO(e.target.value)} placeholder="出单数" inputMode="numeric"
            style={{ ...dInput, width: 90 }} />
          <Btn small accent onClick={addVideo}>+ 加视频</Btn>
        </div>
      )}

      {videos.length === 0 ? (
        <div style={{ fontSize: 13, color: T.hint }}>暂无视频记录（视频回收导入或手动添加）</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {videos.map((v) => (
            <div key={v.videoId} style={{
              display: "flex", alignItems: "center", gap: 14, fontSize: 13,
              background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px",
            }}>
              <span style={{ color: T.muted, minWidth: 96 }}>📅 {v.date || "—"}</span>
              <span style={{ color: T.text, fontWeight: 600 }}>出单 {Number(v.orders) || 0}</span>
              {!readonly && (
                <button onClick={() => delVideo(v.videoId)} style={{
                  marginLeft: "auto", border: "none", background: "transparent",
                  color: T.hint, cursor: "pointer", fontSize: 13,
                }}>删除</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
