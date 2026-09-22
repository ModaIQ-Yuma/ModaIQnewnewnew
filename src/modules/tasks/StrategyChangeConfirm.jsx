import { useState } from 'react';
import { T, glassStyle } from '../../constants/tokens.js';
import { Btn, Inp } from '../../components/ui/index.jsx';
import { STRATEGY_COLORS, PRIORITIES, PRIORITY_COLORS } from './constants.js';

export default function StrategyChangeConfirm({
  productName, month, fromStrategy, toStrategy,
  currentGoal, doneQty,
  currentPriority,
  onConfirm,   // ({ syncGoal, newGoal, reason, priority }) => void
  onCancel,
}) {
  const [syncGoal, setSyncGoal] = useState(false);
  const [newGoal, setNewGoal]   = useState(String(currentGoal || ''));
  const [reason, setReason]     = useState('');
  const [priority, setPriority] = useState(currentPriority || '');

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.6)', zIndex: 2100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ ...glassStyle(20, true), padding: '28px 28px', width: '100%', maxWidth: 460 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 16 }}>确认策略变更</div>

        <div style={{ background: 'rgba(61,127,239,0.07)', borderRadius: 14, padding: '14px 16px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row label="产品">{productName}</Row>
          <Row label="月份">{month}</Row>
          <Row label="策略变更">
            <StratBadge s={fromStrategy} />
            <span style={{ color: T.hint, margin: '0 6px' }}>→</span>
            <StratBadge s={toStrategy} />
          </Row>
          <Row label="本期目标">{currentGoal ?? '—'} 件（已寄 {doneQty ?? 0} 件）</Row>
        </div>

        {/* 优先级 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.muted, marginBottom: 8 }}>
            产品优先级{currentPriority ? `（当前：${currentPriority}）` : '（未设置）'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRIORITIES.map(p => {
              const c = PRIORITY_COLORS[p] || T.hint;
              const active = priority === p;
              return (
                <button key={p} onClick={() => setPriority(active ? '' : p)} style={{
                  padding: '6px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 12.5, fontWeight: active ? 800 : 600,
                  border: `1.5px solid ${active ? c : c + '55'}`,
                  background: active ? `${c}22` : 'transparent',
                  color: active ? c : T.hint,
                  transition: 'all .15s',
                }}>{p}</button>
              );
            })}
          </div>
          {priority && (
            <div style={{ marginTop: 6, fontSize: 11.5, color: T.hint }}>
              ✓ 将同步更新本周期目标的优先级为「{priority}」
            </div>
          )}
        </div>

        {/* 同步目标数量 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: T.text }}>
            <input type="checkbox" checked={syncGoal} onChange={e => setSyncGoal(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }} />
            同步调整本周期目标数量
          </label>
          {syncGoal && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: T.muted, whiteSpace: 'nowrap' }}>新目标件数</span>
              <Inp value={newGoal} onChange={setNewGoal} placeholder="如 80" style={{ width: 100 }} />
            </div>
          )}
        </div>

        {/* 变更原因 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: T.muted, marginBottom: 6 }}>变更原因（可选）</div>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="如：2A24 起量明显，提升策略" rows={2}
            style={{ width: '100%', borderRadius: 10, border: `1.5px solid ${T.border}`, padding: '9px 12px', fontSize: 13, color: T.text, fontFamily: 'inherit', background: 'rgba(255,255,255,0.5)', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn onClick={onCancel}>取消</Btn>
          <Btn accent onClick={() => onConfirm({
            syncGoal,
            newGoal: syncGoal ? Number(newGoal) : undefined,
            reason,
            priority: priority || undefined,
          })}>
            确认变更
          </Btn>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
      <span style={{ color: T.hint, minWidth: 60 }}>{label}</span>
      <span style={{ color: T.text, fontWeight: 600, display: 'flex', alignItems: 'center' }}>{children}</span>
    </div>
  );
}

function StratBadge({ s }) {
  const c = STRATEGY_COLORS[s] || T.hint;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, background: `${c}1E`, color: c, border: `1px solid ${c}44`, borderRadius: 8, padding: '2px 10px' }}>{s || '—'}</span>
  );
}
