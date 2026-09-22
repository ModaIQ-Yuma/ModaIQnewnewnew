// modules/review/ReviewModule.jsx
import { useState } from "react";
import { rs } from "./reviewStyles.js";
import { T, FONT } from "../../constants/tokens.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";
import { calcMonthMetrics } from "../../lib/review/reviewCalc.js";
import { saveProductSnapshot } from "../../lib/supabase/reviewWrite.js";
import StoreReview     from "./StoreReview.jsx";
import GradeReview     from "./GradeReview.jsx";
import ProductReview   from "./ProductReview.jsx";
import Dashboard       from "./Dashboard.jsx";
import SnapshotArchive from "./SnapshotArchive.jsx";
import StaffReview     from "./StaffReview.jsx";
import BurstWall       from "./BurstWall.jsx";

const SUBTABS = [
  { id:"store",     label:"全店复盘"   },
  { id:"grade",     label:"等级复盘"   },
  { id:"product",   label:"单品月报"   },
  { id:"dashboard", label:"横向看板"   },
  { id:"archive",   label:"快照记录"   },
  { id:"staff",     label:"助理复盘"   },
  { id:"burst",     label:"爆单视频墙" },
];

function prevMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReviewModule({ ctx }) {
  const {
    storeId, userId,
    products, collabs, videos, creators, invites,
    gradeSnapshots, reviewLoading, reviewError, reloadReview,
  } = ctx;

  const [tab,            setTab]            = useState("store");
  const [burstThreshold, setBurstThreshold] = useState(BURST_ORDER_THRESHOLD);
  const [saving,         setSaving]         = useState(false);
  const [saveMsg,        setSaveMsg]        = useState("");

  const today = new Date().getDate();
  const showReminder = today >= 6 && today <= 10;
  const ym = prevMonth();

  async function saveAllSnapshots() {
    if (!products.length || saving) return;
    setSaving(true); setSaveMsg("");
    try {
      let count = 0;
      for (const p of products) {
        const m = calcMonthMetrics(collabs, videos, ym, p.id);
        await saveProductSnapshot(storeId, p.id, ym, m, userId);
        count++;
        setSaveMsg(`保存中… ${count}/${products.length}`);
      }
      setSaveMsg(`✅ 已保存 ${count} 个产品的 ${ym} 快照`);
      reloadReview?.();
    } catch (e) {
      setSaveMsg(`❌ 保存失败：${e.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 6000);
    }
  }

  if (reviewLoading) return <div style={rs.center}>加载中…</div>;
  if (reviewError)   return <div style={rs.center}>错误：{reviewError}</div>;

  const common = { collabs, videos, creators, products, storeId, userId, burstThreshold, reloadReview };

  return (
    <div style={rs.wrap}>
      <h2 style={rs.title}>月度复盘</h2>
      {showReminder && (
        <div style={rs.reminder}>
          <span style={{ fontSize:FONT.lg2, color:T.warning, fontWeight:700 }}>📅 本月快照提醒</span>
          <span style={{ fontSize:FONT.lg2, color:T.text, flex:1 }}>
            请确认上月数据已全部更新（视频回收、CRM），然后一键保存 {ym} 快照。
          </span>
          <button
            onClick={saveAllSnapshots}
            disabled={saving}
            style={{ fontSize:FONT.lg2, padding:"7px 18px", borderRadius:10, border:"none", background:T.warning, color:"#fff", cursor:"pointer", fontFamily:"inherit", fontWeight:700, opacity:saving?0.6:1, whiteSpace:"nowrap" }}
          >
            {saving ? "保存中…" : `一键保存 ${ym} 快照`}
          </button>
          {saveMsg && (
            <span style={{ fontSize:FONT.md2, color:saveMsg.startsWith("✅")?T.success:saveMsg.startsWith("❌")?T.danger:T.muted, fontWeight:600, whiteSpace:"nowrap" }}>
              {saveMsg}
            </span>
          )}
        </div>
      )}
      <div style={rs.tabs}>
        {SUBTABS.map((t) => (
          <button key={t.id} style={rs.tab(tab===t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab==="store"     && <StoreReview    {...common} />}
      {tab==="grade"     && <GradeReview    {...common} onSnapshotSaved={reloadReview} />}
      {tab==="product"   && <ProductReview  {...common} />}
      {tab==="dashboard" && <Dashboard      gradeSnapshots={gradeSnapshots} collabs={collabs} videos={videos} products={products} />}
      {tab==="archive"   && <SnapshotArchive gradeSnapshots={gradeSnapshots} onDeleted={reloadReview} />}
      {tab==="staff"     && <StaffReview    {...common} invites={invites} staff={[]} />}
      {tab==="burst"     && <BurstWall      videos={videos} products={products} burstThreshold={burstThreshold} onThresholdChange={setBurstThreshold} />}
    </div>
  );
}
