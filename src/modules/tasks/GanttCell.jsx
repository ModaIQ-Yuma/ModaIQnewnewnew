import { T } from '../../constants/tokens.js';
import { STRATEGY_COLORS } from './constants.js';

const stratGrad = (c) => `linear-gradient(135deg, ${c}D9 0%, ${c}99 100%)`;

// ── props 分组説明 ─────────────────────────────────────────────────────────────
// segData:   { segments, columns }  — 已计算好的色带段和列定义
// batchCtx:  { batchMode, batchSelected }
// handlers:  { handleCellClick, setHoverKey }  — 用 useCallback 稳定，不含 hoverKey
// hoverKey:  string | null  — 单独传，避免 hover 变化时重建 handlers 对象
// meta:      { product, isAdmin, nowHalf }

// ── 单行所有半月格 ─────────────────────────────────────────────────────────────
export function GanttRowCells({ segData, batchCtx, handlers, hoverKey, meta }) {
  const { segments, columns } = segData;
  const { batchMode, batchSelected } = batchCtx;
  const { handleCellClick, setHoverKey } = handlers;
  const { product, isAdmin, nowHalf } = meta;

  return (
    <div style={{ flex: 1, display: 'flex', position: 'relative', padding: '8px 4px' }}>
      {columns.map((col, i) => (
        <div key={col.key} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${(i / columns.length) * 100}%`, width: `${100 / columns.length}%`,
          background: col.key === nowHalf ? 'rgba(61,127,239,0.055)' : 'transparent',
          pointerEvents: 'none',
        }} />
      ))}

      {segments.map((seg, si) => {
        if (!seg.strategy) {
          return (
            <EmptyCells key={si} seg={seg} columns={columns} product={product}
              batchMode={batchMode} batchSelected={batchSelected}
              isAdmin={isAdmin} hoverKey={hoverKey}
              onCellClick={handleCellClick} onHover={setHoverKey} />
          );
        }
        return (
          <StrategyBandCell key={si} seg={seg} si={si} columns={columns} product={product}
            batchMode={batchMode} batchSelected={batchSelected}
            isAdmin={isAdmin} hoverKey={hoverKey}
            onCellClick={handleCellClick} onHover={setHoverKey} />
        );
      })}
    </div>
  );
}

// ── 空白格组（无策略段）────────────────────────────────────────────────────────
function EmptyCells({ seg, columns, product, batchMode, batchSelected, isAdmin, hoverKey, onCellClick, onHover }) {
  const width = `${(seg.span / columns.length) * 100}%`;
  return (
    <div style={{ width, display: 'flex', gap: 4, padding: '0 3px' }}>
      {Array.from({ length: seg.span }).map((_, j) => {
        const col = columns[seg.startIdx + j];
        const hk = `${product.internalName}__${col.key}`;
        const hovered = hoverKey === hk;
        const isChecked = batchSelected.has(hk);
        return (
          <div key={j}
            onClick={() => onCellClick(product, col)}
            onMouseEnter={() => onHover(hk)}
            onMouseLeave={() => onHover(null)}
            style={{
              flex: 1, borderRadius: 10,
              border: `1.5px dashed ${isChecked ? T.accent : (hovered && isAdmin ? T.accent + '88' : T.glassStroke)}`,
              background: isChecked ? 'rgba(61,127,239,0.14)' : (hovered && isAdmin ? 'rgba(61,127,239,0.08)' : 'transparent'),
              cursor: isAdmin ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: batchMode ? 14 : 16, transition: 'all .18s ease',
              color: isChecked ? T.accent : (hovered && isAdmin ? T.accent : 'transparent'),
            }}
          >{batchMode ? (isChecked ? '☑' : '☐') : '＋'}</div>
        );
      })}
    </div>
  );
}

// ── 策略色带格 ────────────────────────────────────────────────────────────────
function StrategyBandCell({ seg, si, columns, product, batchMode, batchSelected, isAdmin, hoverKey, onCellClick, onHover }) {
  const width = `${(seg.span / columns.length) * 100}%`;
  const c = STRATEGY_COLORS[seg.strategy] || T.hint;
  const hk = `${product.internalName}__seg${si}`;
  const hovered = hoverKey === hk;
  const segColKeys = Array.from({ length: seg.span }, (_, j) => `${product.internalName}__${columns[seg.startIdx + j].key}`);
  const segCheckedCount = batchMode ? segColKeys.filter(k => batchSelected.has(k)).length : 0;
  const segAllChecked = batchMode && segCheckedCount === seg.span;

  function handleClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = Math.min(seg.span - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * seg.span)));
    onCellClick(product, columns[seg.startIdx + offset]);
  }

  return (
    <div style={{ width, padding: '0 3px', display: 'flex' }}>
      <div
        onClick={handleClick}
        onMouseEnter={() => onHover(hk)}
        onMouseLeave={() => onHover(null)}
        title={batchMode
          ? `${seg.strategy} · 点击选中对应半月格`
          : `${seg.strategy} · ${columns[seg.startIdx].label} 起 ${seg.span} 个半月${isAdmin ? '（点击色带对应位置修改）' : ''}`}
        style={{
          flex: 1, borderRadius: 12,
          background: stratGrad(c),
          border: segAllChecked ? `2.5px solid #fff` : segCheckedCount > 0 ? `2px dashed rgba(255,255,255,0.8)` : `1px solid ${c}66`,
          boxShadow: hovered ? `0 6px 20px ${c}55, inset 0 1px 0 rgba(255,255,255,0.55)` : `0 3px 12px ${c}33, inset 0 1px 0 rgba(255,255,255,0.4)`,
          cursor: isAdmin ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transform: hovered && isAdmin ? 'translateY(-1.5px)' : 'none',
          transition: 'all .2s cubic-bezier(.2,.8,.2,1)', minHeight: 34, position: 'relative',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '0.02em', textShadow: '0 1px 3px rgba(0,0,0,0.18)' }}>
          {seg.strategy}
        </span>
        {seg.span > 1 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>×{seg.span}</span>
        )}
        {batchMode && segCheckedCount > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 12, color: '#fff', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
            {segAllChecked ? '☑' : `☑${segCheckedCount}`}
          </span>
        )}
        {batchMode && segCheckedCount === 0 && (
          <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>☐</span>
        )}
      </div>
    </div>
  );
}
