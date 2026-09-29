// modules/tasks/WeeklyMenu.jsx
import { useState, useMemo } from "react";
import { T, FONT, glassStyle } from "../../constants/tokens.js";
import { upsertWeeklyMenu, setMenuSlot, deleteWeeklyMenu } from "../../lib/supabase/taskData.js";
import { pendingInvitesFor } from "../../lib/invitePool/todayInvites.js";
import TodayInviteList from "./TodayInviteList.jsx";
import { todayPST, addDays, mondayOf, weekdayOf, fmtMDShort } from "../../lib/dates.js";

const WEEKDAYS   = [1, 2, 3, 4, 5, 6, 7];
const WEEK_LABEL = { 1:"周一", 2:"周二", 3:"周三", 4:"周四", 5:"周五", 6:"周六", 7:"周日" };
const SLOT_IDXS  = [0, 1, 2, 3];

const shiftWeek = (monday, delta) => addDays(monday, delta * 7);
const weekDates = (monday) => WEEKDAYS.map((_, i) => fmtMDShort(addDays(monday, i)));

const navBtn = { fontSize:FONT.lg2, fontWeight:600, padding:"7px 14px", borderRadius:12, border:`1.5px solid ${T.border}`, background:"rgba(255,255,255,0.4)", color:T.muted, cursor:"pointer", fontFamily:"inherit" };
const thCell = { padding:"10px 8px", textAlign:"center", fontSize:FONT.sm2, fontWeight:700, color:T.muted, background:"rgba(235,242,255,0.7)" };

export default function WeeklyMenu({ storeId, menus=[], products=[], invites=[], canEdit, onReload }) {
  const [weekStart,      setWeekStart]      = useState(() => mondayOf(todayPST()));
  const [saving,         setSaving]         = useState(false);
  // 已改但还没等到刷新的格子：{ "周一日期|星期|格": productId|null }，改完立刻显示，保存在后台进行
  const [local, setLocal] = useState({});
  const todayWd = weekdayOf(todayPST());

  const menu = useMemo(() => menus.find((m) => m.week_start === weekStart), [menus, weekStart]);

  const slotMap = useMemo(() => {
    const map = {};
    (menu?.slots || []).forEach((s) => {
      if (!map[s.weekday]) map[s.weekday] = {};
      map[s.weekday][s.slot_idx] = s.product_id;
    });
    for (const [k, pid] of Object.entries(local)) {
      const [wk, wd, idx] = k.split("|");
      if (wk === weekStart) (map[wd] ||= {})[idx] = pid;
    }
    return map;
  }, [menu, local, weekStart]);

  const todayProductIds = useMemo(() => {
    const ids = new Set();
    Object.values(slotMap[todayWd] || {}).forEach((pid) => { if (pid) ids.add(pid); });
    return [...ids];
  }, [slotMap, todayWd]);

  // 今日名单直接从内存里的整个邀约库筛（已翻页加载，不受 1000 条限制；批量上传后自动更新）
  const pendingInvites = useMemo(() => pendingInvitesFor(invites, todayProductIds), [invites, todayProductIds]);

  /** 改一格：先在界面上改好，再后台保存；失败则恢复并提示。只有这周第一次建日程单时才刷新 */
  async function handleSlotChange(weekday, slotIdx, productId) {
    const key = `${weekStart}|${weekday}|${slotIdx}`;
    const prev = slotMap[weekday]?.[slotIdx] ?? null;
    setLocal((l) => ({ ...l, [key]: productId || null }));
    try {
      let menuId = menu?.id;
      if (!menuId) menuId = (await upsertWeeklyMenu(storeId, weekStart, "draft", "manual")).id;
      await setMenuSlot(menuId, weekday, slotIdx, productId || null);
      if (!menu?.id) onReload?.();
    } catch (e) {
      setLocal((l) => ({ ...l, [key]: prev }));
      window.alert(`保存失败，已恢复：${e.message}`);
    }
  }

  async function togglePublish() {
    if (!menu) return;
    setSaving(true);
    await upsertWeeklyMenu(storeId, weekStart, menu.status === "published" ? "draft" : "published", menu.generated_by || "manual");
    onReload?.(); setSaving(false);
  }

  async function handleDelete() {
    if (!menu || !window.confirm(`删除 ${weekStart.slice(5)} 这整周的日程单？`)) return;
    await deleteWeeklyMenu(menu.id);
    onReload?.();
  }

  const dates = weekDates(weekStart);
  const statusColor = menu?.status === "published" ? T.success : T.warning;
  const statusLabel = menu?.status === "published" ? "已发布" : menu ? "草稿" : "未创建";

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <button onClick={() => setWeekStart((w) => shiftWeek(w, -1))} style={navBtn}>‹ 上周</button>
        <div style={{ ...glassStyle(12), padding:"8px 16px", fontSize:FONT.xl2, fontWeight:700, color:T.text }}>
          {weekStart.slice(5)} ~ {dates[6]}
        </div>
        <button onClick={() => setWeekStart((w) => shiftWeek(w, 1))} style={navBtn}>下周 ›</button>
        <span style={{ fontSize:FONT.sm2, fontWeight:700, background:`${statusColor}18`, color:statusColor, border:`1px solid ${statusColor}44`, borderRadius:10, padding:"4px 12px" }}>{statusLabel}</span>
        <div style={{ flex:1 }} />
        {canEdit && (
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={togglePublish} disabled={saving || !menu} style={{ ...navBtn, border:`1.5px solid ${menu?.status === "published" ? T.warning : T.success}`, color:menu?.status === "published" ? T.warning : T.success }}>
              {menu?.status === "published" ? "↩️ 撤回" : "📢 发布"}
            </button>
            <button onClick={handleDelete} disabled={saving || !menu} style={{ ...navBtn, border:`1.5px solid ${T.danger}`, color:T.danger }}>🗑 删除本周</button>
          </div>
        )}
      </div>

      {/* 日程表格 */}
      <div style={{ ...glassStyle(16, true), overflow:"auto", marginBottom:20 }}>
        <div style={{ minWidth:700 }}>
          <div style={{ display:"grid", gridTemplateColumns:"48px repeat(7, 1fr)", borderBottom:`1.5px solid ${T.border}` }}>
            <div style={thCell} />
            {WEEKDAYS.map((wd, i) => (
              <div key={wd} style={{ ...thCell, background:wd===todayWd ? `${T.accent}12` : undefined, color:wd===todayWd ? T.accent : T.muted }}>
                <div style={{ fontWeight:800 }}>{WEEK_LABEL[wd]}</div>
                <div style={{ fontSize:FONT.xs, fontWeight:400, color:T.hint }}>{dates[i]}</div>
              </div>
            ))}
          </div>
          {SLOT_IDXS.map((si) => (
            <div key={si} style={{ display:"grid", gridTemplateColumns:"48px repeat(7, 1fr)", borderBottom:`1px solid ${T.glassStroke}` }}>
              <div style={{ ...thCell, fontSize:FONT.sm, color:T.hint, fontWeight:700 }}>{si + 1}</div>
              {WEEKDAYS.map((wd) => {
                const pid = slotMap[wd]?.[si] || "";
                return (
                  <div key={wd} style={{ padding:"6px 8px", borderLeft:`1px solid ${T.glassStroke}`, background:wd===todayWd ? `${T.accent}05` : undefined }}>
                    {canEdit ? (
                      <select value={pid} onChange={(e) => handleSlotChange(wd, si, e.target.value)} disabled={saving}
                        style={{ width:"100%", fontSize:FONT.sm2, padding:"5px 6px", borderRadius:8, border:`1.5px solid ${pid ? T.accent : T.border}`, background:pid ? `${T.accent}08` : "rgba(255,255,255,0.5)", color:pid ? T.accent : T.hint, fontFamily:"inherit", cursor:"pointer" }}>
                        <option value="">— 空 —</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.internal_name}</option>)}
                      </select>
                    ) : (
                      <div style={{ fontSize:FONT.sm2, color:pid ? T.accent : T.hint, fontWeight:pid ? 600 : 400, padding:"4px 2px" }}>
                        {pid ? products.find((p) => p.id === pid)?.internal_name || "—" : "—"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <TodayInviteList todayWd={todayWd} todayProductIds={todayProductIds} pendingInvites={pendingInvites} products={products} />
    </div>
  );
}
