// modules/tasks/GanttStrategy.jsx — 照旧版移植，数据源改为 Supabase
import { useState, useMemo, useCallback } from 'react';
import { T, FONT, glassStyle } from '../../constants/tokens.js';
import { GANTT_MONTHS_PER_VIEW, GANTT_COL_PRODUCT_WIDTH } from '../../constants/config.js';
import { normalizeStatus } from '../../constants/crm.js';
import { PRODUCT_STATUSES } from '../../constants/products.js';
import { currentYearMonth, currentHalfKey, halfMonthColumns, shiftMonth, currentCycleStart, halfKeyToCycleStart } from './utils.js';
import StrategyChangeConfirm from './StrategyChangeConfirm.jsx';
import GanttBatchBar from './GanttBatchBar.jsx';
import ChangeLogModal from './ChangeLogModal.jsx';
import { StrategySelector } from './GanttModals.jsx';
import { GanttRowCells } from './GanttCell.jsx';
import { GanttHeaderRow, GanttCategoryTitle, GanttLegend } from './GanttParts.jsx';
import { upsertGanttStrategy, deleteGanttStrategy, upsertShippingGoal } from '../../lib/supabase/taskData.js';

const CAT_ORDER = PRODUCT_STATUSES;   // 分组顺序与全站产品排序口径同源
const toolbarBtn = (active) => ({ ...glassStyle(12), border:`1px solid ${active ? T.accent : T.glassStroke}`, padding:'8px 16px', fontSize:FONT.lg2, fontWeight:600, color:active ? T.accent : T.muted, cursor:'pointer', fontFamily:'inherit', background:active ? 'rgba(61,127,239,0.10)' : undefined });
const arrowBtn = { border:'none', background:'transparent', cursor:'pointer', fontSize:20, color:T.muted, padding:'6px 14px', fontFamily:'inherit', lineHeight:1 };

export default function GanttStrategy({ storeId, products=[], ganttStrategies=[], shippingGoals=[], changeLogs=[], influencers=[], isAdmin, onReload }) {
  const now = new Date();
  const [viewStart, setViewStart] = useState(() => currentYearMonth(now));
  const [showLogs,  setShowLogs]  = useState(false);
  const [pending,   setPending]   = useState(null);
  const [hoverKey,  setHoverKey]  = useState(null);
  const [onlySet,   setOnlySet]   = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchSelected, setBatchSelected] = useState(new Set());

  const columns = useMemo(() => halfMonthColumns(viewStart, GANTT_MONTHS_PER_VIEW), [viewStart]);
  const nowHalf = currentHalfKey(now);
  const cs = currentCycleStart(now);

  // 适配新版：product_id + half_key
  const ganttMap = useMemo(() => {
    const m = {};
    ganttStrategies.forEach(g => { if (g.strategy) m[`${g.product_id}__${g.half_key}`] = g; });
    return m;
  }, [ganttStrategies]);

  const grouped = useMemo(() => {
    const hasStrategy = new Set(ganttStrategies.filter(g => g.strategy).map(g => g.product_id));
    const list = onlySet ? products.filter(p => hasStrategy.has(p.id)) : products;
    const map = {};
    list.forEach(p => { const cat = normalizeStatus(p.status) || '未分类'; (map[cat] = map[cat] || []).push(p); });
    return CAT_ORDER.map(cat => ({ cat, items: map[cat] || [] }))
      .filter(g => g.items.length > 0)
      .concat(Object.keys(map).filter(c => !CAT_ORDER.includes(c)).map(cat => ({ cat, items: map[cat] })));
  }, [products, onlySet, ganttStrategies]);

  function getStrategy(productId, col) { return ganttMap[`${productId}__${col.key}`]?.strategy || null; }
  function getEntry(productId, col) { return ganttMap[`${productId}__${col.key}`] || null; }

  function buildSegments(productId) {
    const segs = [];
    let cur = null;
    columns.forEach((col, i) => {
      const s = getStrategy(productId, col);
      if (cur && cur.strategy === s) cur.span += 1;
      else { cur = { strategy: s, startIdx: i, span: 1 }; segs.push(cur); }
    });
    return segs;
  }

  const handleCellClick = useCallback((product, col) => {
    if (!isAdmin) return;
    if (batchMode) {
      const key = `${product.id}__${col.key}`;
      setBatchSelected(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
    } else {
      setPending({ product, col, fromStrategy: getStrategy(product.id, col), toStrategy: null, selectMode: true });
    }
  }, [isAdmin, batchMode, ganttMap, columns]);

  function handleStrategySelect(toStrategy) {
    if (!pending) return;
    if (toStrategy === pending.fromStrategy) { setPending(null); return; }
    if (toStrategy === null) {
      if (!window.confirm('清空该半月策略？')) { setPending(null); return; }
      applyChange({ toStrategy: null, syncGoal: false, reason: '清空' });
      return;
    }
    setPending(p => ({ ...p, toStrategy, selectMode: false }));
  }

  async function applyChange({ toStrategy = pending.toStrategy, syncGoal, newGoal, reason }) {
    const { product, col } = pending;
    const existing = getEntry(product.id, col);
    if (toStrategy === null) {
      if (existing?.id) await deleteGanttStrategy(existing.id);
    } else {
      await upsertGanttStrategy(storeId, { id: existing?.id, product_id: product.id, half_key: col.key, strategy: toStrategy });
    }
    if (syncGoal && newGoal !== undefined) {
      const tcs = halfKeyToCycleStart(col.key);
      const existGoal = shippingGoals.find(g => g.product_id === product.id && g.cycle_start === tcs);
      await upsertShippingGoal(storeId, { id: existGoal?.id, product_id: product.id, cycle_start: tcs, target_qty: newGoal, strategy: toStrategy });
    }
    setPending(null);
    onReload?.();
  }

  async function applyBatch(toStrategy) {
    if (batchSelected.size === 0) return;
    if (!window.confirm(`将 ${batchSelected.size} 个半月格设为「${toStrategy === null ? '清空' : toStrategy}」？`)) return;
    const entries = [...batchSelected].map(k => { const sep = k.lastIndexOf('__'); return { productId: k.slice(0, sep), colKey: k.slice(sep + 2) }; });
    await Promise.all(entries.map(({ productId, colKey }) => {
      const existing = ganttMap[`${productId}__${colKey}`];
      if (toStrategy === null) return existing?.id ? deleteGanttStrategy(existing.id) : Promise.resolve();
      return upsertGanttStrategy(storeId, { id: existing?.id, product_id: productId, half_key: colKey, strategy: toStrategy });
    }));
    setBatchSelected(new Set()); setBatchMode(false);
    onReload?.();
  }

  // 适配 GanttRowCells 的 segData 格式（使用 product.id 作为 key）
  function buildSegDataForCell(productId) {
    return { segments: buildSegments(productId), columns };
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ ...glassStyle(14), display:'flex', alignItems:'center', overflow:'hidden' }}>
          <button onClick={() => setViewStart(shiftMonth(viewStart, -1))} style={arrowBtn}>‹</button>
          <div style={{ padding:'9px 20px', fontSize:FONT.xl2, fontWeight:800, background:T.grad, WebkitBackgroundClip:'text', backgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            {viewStart.slice(0, 4)} 年 · {Number(viewStart.slice(5, 7))}—{Number(columns[columns.length - 1].ym.slice(5, 7))} 月
          </div>
          <button onClick={() => setViewStart(shiftMonth(viewStart, 1))} style={arrowBtn}>›</button>
        </div>
        <button onClick={() => setViewStart(currentYearMonth(now))} style={{ ...glassStyle(12), border:`1px solid ${T.glassStroke}`, padding:'8px 14px', fontSize:FONT.md2, fontWeight:600, color:T.muted, cursor:'pointer', fontFamily:'inherit' }}>回到本月</button>
        <div style={{ flex:1 }} />
        {isAdmin && (
          <button onClick={() => { setBatchMode(v => !v); if (batchMode) setBatchSelected(new Set()); }} style={toolbarBtn(batchMode)}>
            {batchMode ? `✓ 批量模式 (${batchSelected.size})` : '批量编辑'}
          </button>
        )}
        <button onClick={() => setOnlySet(v => !v)} style={toolbarBtn(onlySet)}>{onlySet ? '✓ 只看已设置' : '只看已设置'}</button>
        <button onClick={() => setShowLogs(true)} style={{ ...glassStyle(12), border:`1px solid ${T.glassStroke}`, padding:'8px 16px', fontSize:FONT.lg2, fontWeight:600, color:T.muted, cursor:'pointer', fontFamily:'inherit' }}>
          变更记录 {changeLogs.length > 0 && <span style={{ color:T.accent, fontWeight:800 }}>{changeLogs.length}</span>}
        </button>
      </div>

      {batchMode && <GanttBatchBar batchSelected={batchSelected} onApply={applyBatch} onExit={() => { setBatchMode(false); setBatchSelected(new Set()); }} />}

      <div style={{ ...glassStyle(20, true), padding:'4px 0 12px', overflowX:'auto' }}>
        <div style={{ minWidth: GANTT_COL_PRODUCT_WIDTH + columns.length * 96 }}>
          <GanttHeaderRow columns={columns} nowHalf={nowHalf} />

          {grouped.map(({ cat, items }) => (
            <div key={cat}>
              <GanttCategoryTitle cat={cat} count={items.length} />
              {items.map(product => (
                <div key={product.id} style={{ display:'flex', alignItems:'stretch', minHeight:52, borderBottom:`1px solid ${T.glassStroke}55` }}>
                  <div style={{ width:GANTT_COL_PRODUCT_WIDTH, flexShrink:0, padding:'8px 18px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <span style={{ fontSize:FONT.xl, fontWeight:800, color:T.text }}>{product.internal_name}</span>
                    <span style={{ fontSize:FONT.sm, color:T.hint, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:GANTT_COL_PRODUCT_WIDTH - 36 }}>{product.product_title || ''}</span>
                  </div>
                  <GanttRowCells
                    segData={buildSegDataForCell(product.id)}
                    batchCtx={{ batchMode, batchSelected }}
                    handlers={{ handleCellClick: (p, col) => handleCellClick(product, col), setHoverKey }}
                    hoverKey={hoverKey}
                    meta={{ product: { internalName: product.internal_name, ...product }, isAdmin, nowHalf }}
                  />
                </div>
              ))}
            </div>
          ))}
          {products.length === 0 && <div style={{ padding:'48px 24px', textAlign:'center', color:T.hint, fontSize:FONT.lg2 }}>暂无产品。请先在「产品库」中添加产品。</div>}
        </div>
      </div>

      <GanttLegend />

      {pending?.selectMode && <StrategySelector product={{ internalName: pending.product.internal_name, ...pending.product }} label={pending.col.label} current={pending.fromStrategy} onSelect={handleStrategySelect} onCancel={() => setPending(null)} />}
      {pending && !pending.selectMode && pending.toStrategy && (
        <StrategyChangeConfirm
          productName={pending.product.internal_name}
          month={pending.col.label} fromStrategy={pending.fromStrategy} toStrategy={pending.toStrategy}
          currentGoal={shippingGoals.find(g => g.product_id === pending.product.id && g.cycle_start === cs)?.target_qty}
          doneQty={0}
          onConfirm={applyChange} onCancel={() => setPending(null)}
        />
      )}
      {showLogs && <ChangeLogModal logs={changeLogs.map(l => ({ ...l, productInternalName:l.products?.internal_name, fromStrategy:l.from_strategy, toStrategy:l.to_strategy, goalAdjusted:l.goal_adjusted, changedBy:l.changed_by, changedAt:l.changed_at }))} onClose={() => setShowLogs(false)} onDelete={null} />}
    </div>
  );
}
