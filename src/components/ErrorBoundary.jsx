import { Component } from "react";
import { T, glassStyle } from "../constants/tokens.js";

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary", error, info); }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ ...glassStyle(18), padding: 32, color: T.danger }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>板块渲染出错</div>
        <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", color: T.muted }}>{String(this.state.error?.message || this.state.error)}</pre>
        <button onClick={() => this.setState({ error: null })} style={{ marginTop: 12, fontSize: 12, padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>重试</button>
      </div>
    );
  }
}
