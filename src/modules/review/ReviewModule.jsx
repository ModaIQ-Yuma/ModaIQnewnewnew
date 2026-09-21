// modules/review/ReviewModule.jsx
import { useState } from "react";
import { useReview } from "../../hooks/useReview.js";
import { useProducts } from "../../hooks/useProducts.js";
import { rs } from "./reviewStyles.js";
import { T } from "../../constants/tokens.js";
import { BURST_ORDER_THRESHOLD } from "../../constants/config.js";
import StoreReview    from "./StoreReview.jsx";
import GradeReview    from "./GradeReview.jsx";
import ProductReview  from "./ProductReview.jsx";
import Dashboard      from "./Dashboard.jsx";
import SnapshotArchive from "./SnapshotArchive.jsx";
import StaffReview    from "./StaffReview.jsx";
import BurstWall      from "./BurstWall.jsx";

const SUBTABS = [
  { id: "store",    label: "全店复盘" },
  { id: "grade",    label: "等级复盘" },
  { id: "product",  label: "单品月报" },
  { id: "dashboard",label: "横向看板" },
  { id: "archive",  label: "快照记录" },
  { id: "staff",    label: "助理复盘" },
  { id: "burst",    label: "爆单视频墙" },
];

export default function ReviewModule({ ctx }) {
  const { storeId, userId } = ctx;
  const { products } = useProducts(storeId);
  const {
    collabs, videos, creators, invites,
    gradeSnapshots, storeSnapshots,
    loading, error, reload,
  } = useReview(storeId);

  const [tab,            setTab]            = useState("store");
  const [burstThreshold, setBurstThreshold] = useState(BURST_ORDER_THRESHOLD);

  const today = new Date().getDate();
  const showReminder = today >= 6 && today <= 10;

  if (loading) return <div style={rs.center}>加载中…</div>;
  if (error)   return <div style={rs.center}>错误：{error}</div>;

  const commonProps = { collabs, videos, creators, products: products ?? [], storeId, userId, burstThreshold };

  return (
    <div style={rs.wrap}>
      <h2 style={rs.title}>月度复盘</h2>

      {showReminder && (
        <div style={rs.reminder}>
          <span style={{ fontSize: 13, color: T.warning, fontWeight: 700 }}>📅 本月快照提醒</span>
          <span style={{ fontSize: 13, color: T.text, flex: 1 }}>每月6-10日：请确认上月视频和数据已全部更新，然后在「等级复盘」一键保存快照。</span>
        </div>
      )}

      <div style={rs.tabs}>
        {SUBTABS.map((t) => (
          <button key={t.id} style={rs.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === "store"     && <StoreReview    {...commonProps} />}
      {tab === "grade"     && <GradeReview    {...commonProps} invites={invites} onSnapshotSaved={reload} />}
      {tab === "product"   && <ProductReview  {...commonProps} />}
      {tab === "dashboard" && <Dashboard      gradeSnapshots={gradeSnapshots} collabs={collabs} videos={videos} products={products ?? []} />}
      {tab === "archive"   && <SnapshotArchive gradeSnapshots={gradeSnapshots} onDeleted={reload} />}
      {tab === "staff"     && <StaffReview    {...commonProps} invites={invites} staff={[]} />}
      {tab === "burst"     && <BurstWall      videos={videos} products={products ?? []} burstThreshold={burstThreshold} onThresholdChange={setBurstThreshold} />}
    </div>
  );
}
