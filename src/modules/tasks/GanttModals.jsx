import { T, glassStyle, Z } from '../../constants/tokens.js';
import { STRATEGIES, STRATEGY_COLORS } from './constants.js';

const stratGrad = (c) => `linear-gradient(135deg, ${c}D9 0%, ${c}99 100%)`;

// ── 策略选择器弹窗 ────────────────────────────────────────────────────────────
export function StrategySelector({ product, label, current, onSelect, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.45)', zIndex: Z.modal,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    }}>
      <div style={{ ...glassStyle(22, true), padding: '26px 28px', minWidth: 360, boxShadow: '0 24px 70px rgba(40,90,180,0.28)' }}>
        <div style={{
          fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 2,
          background: T.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>设置策略</div>
        <div style={{ fontSize: 12.5, color: T.hint, marginBottom: 20 }}>
          <strong style={{ color: T.muted }}>{product.internalName}</strong> · {label}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {STRATEGIES.map(s => {
            const c = STRATEGY_COLORS[s];
            const isCurrent = s === current;
            return (
              <button key={s} onClick={() => onSelect(s)} style={{
                padding: '16px 8px', borderRadius: 16, cursor: 'pointer', fontFamily: 'inherit',
                border: isCurrent ? `2px solid ${c}` : `1.5px solid ${c}44`,
                background: isCurrent ? stratGrad(c) : `${c}0D`,
                color: isCurrent ? '#fff' : c,
                fontWeight: 800, fontSize: 14,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                boxShadow: isCurrent ? `0 6px 18px ${c}55` : 'none',
                transition: 'all .18s',
              }}
              onMouseEnter={e => { if (!isCurrent) { e.currentTarget.style.background = `${c}22`; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
              onMouseLeave={e => { if (!isCurrent) { e.currentTarget.style.background = `${c}0D`; e.currentTarget.style.transform = 'none'; } }}
              >
                {s}
                {isCurrent && <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>当前</span>}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {current && (
            <button onClick={() => onSelect(null)} style={{
              flex: 1, padding: '10px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              border: `1.5px dashed ${T.danger}55`, background: 'transparent',
              color: T.danger, fontWeight: 700, fontSize: 13,
            }}>清空该半月</button>
          )}
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${T.glassStroke}`, background: 'rgba(255,255,255,0.4)',
            color: T.muted, fontWeight: 600, fontSize: 13,
          }}>取消</button>
        </div>
      </div>
    </div>
  );
}

// ── 数据检查面板 ──────────────────────────────────────────────────────────────
export function DebugPanel({ ganttStrategies, changeLogs, columns, onDeleteEntry, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: Z.modalTop,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ ...glassStyle(20, true), padding: '26px 28px', width: '100%', maxWidth: 620, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>🔍 甘特图数据检查</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, color: T.muted, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: T.hint, marginBottom: 14 }}>
          共 {ganttStrategies.length} 条策略数据 · {changeLogs.length} 条变更记录。
          遇到问题请把这个窗口整个截图发给技术支持。
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {ganttStrategies.length === 0 ? (
            <div style={{ color: T.hint, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
              没有任何策略数据。<br />
              <span style={{ fontSize: 12 }}>如果你设置过但这里是空的，说明数据没保存成功（大概率云端表未建立，看页面顶部有无黄色/红色横幅）。</span>
            </div>
          ) : (
            ganttStrategies.map(g => {
              const inView = typeof g.month === 'string' && columns.some(c => g.month === c.key || g.month === c.ym || g.month.startsWith(c.ym));
              return (
                <div key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                  borderBottom: `1px solid ${T.border}`, fontSize: 12.5,
                  background: inView ? 'transparent' : 'rgba(232,146,59,0.08)',
                }}>
                  <span style={{ fontWeight: 700, color: T.text, minWidth: 60 }}>{g.productInternalName}</span>
                  <span style={{ color: T.muted, fontFamily: 'monospace' }}>month = "{String(g.month)}"</span>
                  <span style={{ fontWeight: 700, color: T.accent }}>{g.strategy}</span>
                  <span style={{ fontSize: 11, color: inView ? T.success : T.warning }}>
                    {inView ? '✓ 当前视图可见' : '⚠ 不在当前视图范围'}
                  </span>
                  <button onClick={() => onDeleteEntry(g.id)} style={{
                    marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer',
                    color: T.danger, fontSize: 12,
                  }}>删除</button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
