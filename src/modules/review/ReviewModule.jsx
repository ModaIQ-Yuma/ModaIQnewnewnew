// modules/review/ReviewModule.jsx
import { useState } from "react";
import { rs } from "./reviewStyles.js";
import { T, FONT } from "../../constants/tokens.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";
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

export default function ReviewModule({ ctx }) {
  const {
    storeId, userId,
    products, collabs, videos, creators, invites,
    gradeSnapshots, reviewLoading, reviewError, reloadReview,
  } = ctx;

  const [tab,            setTab]            = useState("store");
  const [burstThreshold, setBurstThreshold] = useState(BURST_ORDER_THRESHOLD);

  const today = new Date().getDate();
  const showReminder = today >= 6 && today <= 10;

  if (reviewLoading) return <div style={rs.center}>加载中…</div>;
  if (reviewError)   return <div style={rs.center}>错误：{reviewError}</div>;

  const common = { collabs, videos, creators, products, storeId, userId, burstThreshold };

  return (
    <div style={rs.wrap}>
      <h2 style={rs.title}>月度复盘</h2>
      {showReminder && (
        <div style={rs.reminder}>
          <span style={{ fontSize:FONT.lg2, color:T.warning, fontWeight:700 }}>📅 本月快照提醒</span>
          <span style={{ fontSize:FONT.lg2, color:T.text, flex:1 }}>每月6-10日：请确认上月数据已更新，然后在「等级复盘」一键保存快照。</span>
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
