// ─── 任务模块常量（纯数据，无 I/O）─────────────────────────────────────────────

export const STRATEGIES = ['扩张', '精选', '收缩', '停寄', '清仓', '测款'];
export const PRIORITIES  = ['测款最优', '一级', '二级', '三级', '不动'];

// 注意：以下两组权重当前只体现在 AI prompt 的文字规则里（prompts.js）。
// 正式版 prompt 精调时应改为从这里读取，保证一处修改全局生效（交接文档 §9.3）。
export const STRATEGY_WEIGHTS = {
  扩张: 1.5, 精选: 1.0, 收缩: 0.5, 停寄: 0, 清仓: 0, 测款: 1.0,
};
export const PRIORITY_WEIGHTS = {
  测款最优: 1.2, 一级: 1.3, 二级: 1.0, 三级: 0.7, 不动: 0,
};
export const STRATEGY_SUGGESTED_GOAL = {
  扩张: 150, 精选: 80, 收缩: 40, 停寄: 0, 清仓: 0, 测款: 30,
};

export const STRATEGY_COLORS = {
  扩张: '#3D7FEF', 精选: '#0E9E70', 收缩: '#E8923B', 停寄: '#9BA8B5',
  清仓: '#E0455E', 测款: '#9B59E8',
};
export const PRIORITY_COLORS = {
  测款最优: '#9B59E8', 一级: '#E0455E', 二级: '#E8923B', 三级: '#3D7FEF', 不动: '#9BA8B5',
};

export const SLOTS_PER_DAY  = 4;
export const WEEK_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
export const WEEK_LABELS = { monday:'周一', tuesday:'周二', wednesday:'周三', thursday:'周四', friday:'周五', saturday:'周六', sunday:'周日' };
