import { useState } from "react";
import { T } from "../../constants/tokens.js";
import { SHIP_SCORE_ITEMS, computeShipScore, shipGrade } from "../../lib/crm/shipScore.js";

const ADVICE_COLOR = { success: T.success, warning: T.warning, danger: T.danger };

// 用完即焚：组件卸载（关闭弹窗）时 useState 自然销毁，不写 state、不存档、不接复盘。
export default function ShipScoreModal({ onClose }) {
  const [answers, setAnswers] = useState({});
  const setA = (key, score) => setAnswers((p) => ({ ...p, [key]: score }));

  const score = computeShipScore(answers);
  const result = shipGrade(score);
  const answeredCount = Object.keys(answers).length;

  const groups = [...new Set(SHIP_SCORE_ITEMS.map((i) => i.group))];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(10,22,40,0.45)", zIndex: 1600,
      display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto",
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, padding: "26px 28px", width: "100%", maxWidth: 600,
        boxShadow: "0 20px 60px rgba(20,50,100,0.25)", border: `1.5px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: T.text, flex: 1 }}>寄样评分助手</span>
          <button onClick={onClose} style={{ fontSize: 20, background: "none", border: "none", cursor: "pointer", color: T.hint, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: T.hint, marginBottom: 18, lineHeight: 1.6 }}>
          仅一次性辅助判断，关闭即不留痕迹——不会保存、不进 CRM、不影响任何复盘数据。
        </div>

        {groups.map((g) => (
          <div key={g} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.accent, letterSpacing: "0.04em", marginBottom: 8 }}>{g}</div>
            {SHIP_SCORE_ITEMS.filter((i) => i.group === g).map((item) => (
              <div key={item.key} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginBottom: 5 }}>{item.label}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {item.options.map((o) => {
                    const on = answers[item.key] === o.score;
                    return (
                      <button key={o.score} onClick={() => setA(item.key, o.score)} style={{
                        fontSize: 12, padding: "6px 11px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                        border: `1px solid ${on ? T.accent : T.border}`,
                        background: on ? `${T.accent}18` : "#fafcff",
                        color: on ? T.accentDim : T.muted, fontWeight: on ? 700 : 500,
                        lineHeight: 1.4, maxWidth: 260,
                      }}>{o.label}</button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div style={{
          marginTop: 8, padding: "16px 18px", borderRadius: 14, background: result ? `${ADVICE_COLOR[result.adviceColor]}12` : "#F5F7FA",
          border: `1.5px solid ${result ? `${ADVICE_COLOR[result.adviceColor]}40` : T.border}`, textAlign: "center",
        }}>
          {!result ? (
            <div style={{ fontSize: 13, color: T.hint }}>请至少填写一项评分（已填 {answeredCount} / {SHIP_SCORE_ITEMS.length} 项）</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: T.hint, marginBottom: 4 }}>已填 {answeredCount} / {SHIP_SCORE_ITEMS.length} 项 · 综合得分</div>
              <div style={{ fontSize: 34, fontWeight: 900, color: ADVICE_COLOR[result.adviceColor], lineHeight: 1.2 }}>
                {score} 分 <span style={{ fontSize: 20 }}>· {result.grade} 档</span>
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{result.range} 分 · {result.desc}</div>
              <div style={{
                display: "inline-block", marginTop: 10, fontSize: 15, fontWeight: 800, padding: "7px 20px", borderRadius: 20,
                background: ADVICE_COLOR[result.adviceColor], color: "#fff",
              }}>{result.advice}</div>
              {answeredCount < SHIP_SCORE_ITEMS.length && (
                <div style={{ fontSize: 11, color: T.hint, marginTop: 8 }}>提示：还有 {SHIP_SCORE_ITEMS.length - answeredCount} 项未填，分数仅基于已填项估算</div>
              )}
            </>
          )}
        </div>

        <button onClick={onClose} style={{
          width: "100%", marginTop: 14, background: "rgba(0,0,0,0.04)", color: T.muted, border: "none",
          borderRadius: 12, fontSize: 14, fontWeight: 600, padding: "11px", cursor: "pointer", fontFamily: "inherit",
        }}>关闭（不保存）</button>
      </div>
    </div>
  );
}
