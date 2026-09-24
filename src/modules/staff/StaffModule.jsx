// modules/staff/StaffModule.jsx — 人员管理（管理员）：助理名册 / 团队账号 / 达人归属
import { useState } from "react";
import StaffRoster from "./StaffRoster.jsx";
import MembersPanel from "./MembersPanel.jsx";
import CreatorOwnership from "./CreatorOwnership.jsx";
import SubNav from "../../components/layout/SubNav.jsx";

const TABS = [
  { id: "roster",  label: "📋 助理名册", desc: "维护助理名单；这里的名字就是 CRM「跟进人」、任务分配和助理复盘里的选项。" },
  { id: "members", label: "👥 团队账号", desc: "能登录本店铺的账号：生成邀请码（可预绑定助理）、调整角色（管理员 / 成员 / 只读）或移除。" },
  { id: "owner",   label: "🔗 达人归属", desc: "一个达人的寄样应只记在一个助理名下：在这里检查冲突、变更达人归属。" },
];

export default function StaffModule({ ctx }) {
  const { storeId, userId, core } = ctx;
  const [tab, setTab] = useState("roster");
  return (
    <div>
      <SubNav tabs={TABS} active={tab} onChange={setTab} />
      {tab === "roster"  && <StaffRoster storeId={storeId} core={core} />}
      {tab === "members" && <MembersPanel storeId={storeId} userId={userId} staff={core.staff} />}
      {tab === "owner"   && <CreatorOwnership storeId={storeId} core={core} />}
    </div>
  );
}
