// modules/tasks/GanttBatchBar.jsx — 批量操作浮动工具栏
import { T, FONT } from '../../constants/tokens.js';
import { STRATEGIES, STRATEGY_COLORS } from './constants.js';

export default function GanttBatchBar({ batchSelected, onApply, onExit }) {
  return (
    <div style={{ position:'sticky', top:8, zIndex:100, marginBottom:12, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', background:'rgba(20,36,64,0.82)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', border:`1.5px solid ${T.accent}55`, borderRadius:16, padding:'10px 16px' }}>
      <span style={{ fontSize:FONT.lg2, fontWeight:700, color:T.accent }}>批量模式 · 已选 {batchSelected.size} 格</span>
      <div style={{ flex:1 }} />
      {STRATEGIES.map(s => { const c = STRATEGY_COLORS[s]; return (
        <button key={s} onClick={() => onApply(s)} disabled={batchSelected.size === 0}
          style={{ padding:'6px 14px', borderRadius:10, cursor:batchSelected.size > 0 ? 'pointer' : 'not-allowed', fontFamily:'inherit', fontSize:FONT.md2, fontWeight:700, border:`1.5px solid ${c}88`, background:batchSelected.size > 0 ? `${c}22` : 'transparent', color:batchSelected.size > 0 ? c : T.hint }}>
          {s}
        </button>
      ); })}
      <button onClick={() => onApply(null)} disabled={batchSelected.size === 0}
        style={{ padding:'6px 14px', borderRadius:10, cursor:'pointer', fontFamily:'inherit', fontSize:FONT.md2, fontWeight:700, border:`1.5px dashed ${T.danger}77`, background:'transparent', color:T.danger }}>
        清空
      </button>
      <button onClick={onExit} style={{ padding:'6px 12px', borderRadius:10, cursor:'pointer', fontFamily:'inherit', fontSize:FONT.md2, fontWeight:600, border:`1px solid ${T.glassStroke}`, background:'transparent', color:T.muted }}>退出</button>
    </div>
  );
}
