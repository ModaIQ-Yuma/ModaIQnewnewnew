// ─── 顶层导航（顺序 = 开发优先级）────────────────────────────────────────────
// adminOnly: 仅 admin 可见。ready: false 的板块显示"建设中"占位。
export const TABS = [
  { id: "products",    label: "产品库",   ready: true  },
  { id: "crm",         label: "CRM",      ready: true  },
  { id: "invitePool",  label: "邀约库",   ready: true  },
  { id: "daily",       label: "每日数据", ready: true  },
  { id: "videos",      label: "视频回收", ready: true  },
  { id: "review",      label: "复盘",     ready: true  },
  { id: "attribution", label: "归因分析", ready: true  },
  { id: "tasks",       label: "任务",     ready: true  },
  { id: "bdtools",     label: "BD 工具",  ready: true  },
  { id: "performance", label: "绩效",     ready: false, adminOnly: true },
  { id: "staff",       label: "人员管理", ready: true,  adminOnly: true },
];

export const DEFAULT_TAB = "products";
