// modules/tasks/GanttParts.jsx — 甘特图的纯展示部件（表头 / 分类标题 / 图例）
import { T, FONT } from '../../constants/tokens.js';
import { GANTT_COL_PRODUCT_WIDTH } from '../../constants/config.js';
import { STRATEGIES, STRATEGY_COLORS } from './constants.js';

const stratGrad = (c) => `linear-gradient(135deg, ${c}D9 0%, ${c}99 100%)`;

/** 表头：产品列 + 每个半月一列（当前半月高亮） */
export function GanttHeaderRow({ columns, nowHalf }) {
  return (
    <div style={{ display:'flex', borderBottom:`1.5px solid ${T.glassStroke}`, padding:'12px 0 10px' }}>
      <div style={{ width:GANTT_COL_PRODUCT_WIDTH, flexShrink:0, padding:'0 18px', fontSize:FONT.md, fontWeight:800, color:T.hint, letterSpacing:'0.1em', display:'flex', alignItems:'center' }}>产品 / 半月</div>
      {columns.map(col => {
        const isNow = col.key === nowHalf;
        return (
          <div key={col.key} style={{ flex:1, textAlign:'center' }}>
            <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', padding:'4px 10px', borderRadius:12, background:isNow ? T.gradSoft : 'transparent', border:isNow ? `1px solid ${T.accent}33` : '1px solid transparent' }}>
              <span style={{ fontSize:FONT.xl, fontWeight:800, color:isNow ? T.accent : T.text }}>{col.label}</span>
              <span style={{ fontSize:FONT.xs, fontWeight:600, color:isNow ? T.accent : T.hint, marginTop:1 }}>{col.half === 'H1' ? '1-14日' : '15日-月底'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 推广状态分类标题（爆款 / 合格款 …） */
export function GanttCategoryTitle({ cat, count }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 18px 8px' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:T.grad }} />
      <span style={{ fontSize:FONT.md, fontWeight:800, color:T.muted, letterSpacing:'0.12em' }}>{cat}</span>
      <span style={{ fontSize:FONT.sm, color:T.hint }}>{count} 款</span>
      <div style={{ flex:1, height:1, background:`linear-gradient(90deg, ${T.glassStroke}, transparent)` }} />
    </div>
  );
}

/** 底部策略颜色图例 */
export function GanttLegend() {
  return (
    <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginTop:16, alignItems:'center', padding:'0 4px' }}>
      <span style={{ fontSize:FONT.md, color:T.hint, fontWeight:700, letterSpacing:'0.05em' }}>策略</span>
      {STRATEGIES.map(s => (
        <span key={s} style={{ display:'flex', alignItems:'center', gap:6, fontSize:FONT.md2 }}>
          <span style={{ width:22, height:12, borderRadius:6, display:'inline-block', background:stratGrad(STRATEGY_COLORS[s]) }} />
          <span style={{ color:T.muted, fontWeight:600 }}>{s}</span>
        </span>
      ))}
    </div>
  );
}
