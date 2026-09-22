import { T, glassStyle } from '../../constants/tokens.js';
import { STRATEGY_COLORS } from './constants.js';

export default function ChangeLogModal({ logs = [], onClose, onDelete }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ ...glassStyle(20, true), padding: '28px 28px', width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>📋 变更记录</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, color: T.muted, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {logs.length === 0 ? (
            <div style={{ color: T.hint, fontSize: 13, padding: '24px 0', textAlign: 'center' }}>暂无变更记录</div>
          ) : (
            logs.map(log => (
              <div key={log.id} style={{
                borderBottom: `1px solid ${T.border}`, padding: '12px 4px', display: 'flex', flexDirection: 'column', gap: 5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{log.productInternalName}</span>
                  <span style={{ fontSize: 12, color: T.hint }}>{log.month}</span>
                  <StratBadge s={log.fromStrategy} /> → <StratBadge s={log.toStrategy} />
                  {log.goalAdjusted && <span style={{ fontSize: 11, background: `${T.info}22`, color: T.info, borderRadius: 8, padding: '2px 8px' }}>目标已同步</span>}
                  {onDelete && (
                    <button onClick={() => onDelete(log.id)} style={{
                      marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer',
                      color: T.danger, fontSize: 12, padding: '0 2px',
                    }}>删除</button>
                  )}
                </div>
                {log.reason && <div style={{ fontSize: 12, color: T.muted }}>{log.reason}</div>}
                <div style={{ fontSize: 11, color: T.hint }}>{log.changedBy} · {log.changedAt?.slice(0, 16)?.replace('T', ' ')}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StratBadge({ s }) {
  const c = STRATEGY_COLORS[s] || T.hint;
  return (
    <span style={{ fontSize: 11.5, fontWeight: 700, background: `${c}1E`, color: c, border: `1px solid ${c}44`, borderRadius: 8, padding: '2px 8px' }}>{s || '—'}</span>
  );
}
