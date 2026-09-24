// lib/supabase/taskData.js
import { sb, unwrap } from "./client.js";

// ─── shipping_goals ───────────────────────────────────────────────────────────
export async function fetchShippingGoals(storeId) {
  return unwrap(
    await sb.from("shipping_goals")
      .select("id,product_id,cycle_start,target_qty,estimated_videos,priority,strategy,tags,products(internal_name,product_title),goal_allocations(staff_id,qty)")
      .eq("store_id", storeId)
      .order("cycle_start", { ascending: false }),
    "shipping_goals"
  );
}
export async function upsertShippingGoal(storeId, goal) {
  const { id, ...rest } = goal;
  if (id) {
    return unwrap(await sb.from("shipping_goals").update(rest).eq("id", id).select("id").single(), "shipping_goals");
  }
  return unwrap(await sb.from("shipping_goals").insert({ store_id: storeId, ...rest }).select("id").single(), "shipping_goals");
}
export async function deleteShippingGoal(id) {
  unwrap(await sb.from("shipping_goals").delete().eq("id", id), "shipping_goals");
}

/** 保存助理分配：alloc = { staffId: 件数 }；件数为 0/空 的不存（整组覆盖） */
export async function saveGoalAllocations(goalId, alloc) {
  unwrap(await sb.from("goal_allocations").delete().eq("goal_id", goalId), "goal_allocations");
  const rows = Object.entries(alloc).map(([staff_id, qty]) => ({ goal_id: goalId, staff_id, qty: Number(qty) || 0 })).filter((r) => r.qty > 0);
  if (rows.length) unwrap(await sb.from("goal_allocations").insert(rows), "goal_allocations");
}

// ─── gantt_strategies ────────────────────────────────────────────────────────
export async function fetchGanttStrategies(storeId) {
  return unwrap(
    await sb.from("gantt_strategies")
      .select("id,product_id,half_key,strategy,priority,note,products(internal_name)")
      .eq("store_id", storeId),
    "gantt_strategies"
  );
}
export async function upsertGanttStrategy(storeId, entry) {
  const { id, ...rest } = entry;
  if (id) return unwrap(await sb.from("gantt_strategies").update(rest).eq("id", id).select("id").single(), "gantt_strategies");
  return unwrap(
    await sb.from("gantt_strategies").upsert({ store_id: storeId, ...rest }, { onConflict: "store_id,product_id,half_key" }).select("id").single(),
    "gantt_strategies"
  );
}
export async function deleteGanttStrategy(id) {
  unwrap(await sb.from("gantt_strategies").delete().eq("id", id), "gantt_strategies");
}

// ─── weekly_menus ─────────────────────────────────────────────────────────────
export async function fetchWeeklyMenus(storeId) {
  const menus = unwrap(
    await sb.from("weekly_menus")
      .select("id,week_start,status,generated_by,created_at")
      .eq("store_id", storeId)
      .order("week_start", { ascending: false }),
    "weekly_menus"
  );
  if (!menus.length) return [];
  const slots = unwrap(
    await sb.from("weekly_menu_slots")
      .select("menu_id,weekday,slot_idx,product_id,note,products(internal_name)")
      .in("menu_id", menus.map((m) => m.id)),
    "weekly_menu_slots"
  );
  return menus.map((m) => ({ ...m, slots: slots.filter((s) => s.menu_id === m.id) }));
}
export async function upsertWeeklyMenu(storeId, weekStart, status, generatedBy) {
  return unwrap(
    await sb.from("weekly_menus")
      .upsert({ store_id: storeId, week_start: weekStart, status, generated_by: generatedBy }, { onConflict: "store_id,week_start" })
      .select("id").single(),
    "weekly_menus"
  );
}
export async function setMenuSlot(menuId, weekday, slotIdx, productId) {
  if (!productId) {
    unwrap(await sb.from("weekly_menu_slots").delete().eq("menu_id", menuId).eq("weekday", weekday).eq("slot_idx", slotIdx), "weekly_menu_slots");
    return;
  }
  unwrap(
    await sb.from("weekly_menu_slots")
      .upsert({ menu_id: menuId, weekday, slot_idx: slotIdx, product_id: productId }, { onConflict: "menu_id,weekday,slot_idx" }),
    "weekly_menu_slots"
  );
}
export async function deleteWeeklyMenu(id) {
  unwrap(await sb.from("weekly_menus").delete().eq("id", id), "weekly_menus");
}

/** 查某些产品下未转化的邀约库达人（今日邀约名单用） */
export async function fetchPendingInvites(storeId, productIds) {
  if (!productIds?.length) return [];
  return unwrap(
    await sb.from("unconnected_creators")
      .select("id,creator_id,product_id,added_at,products(internal_name)")
      .eq("store_id", storeId)
      .eq("status", "pending")
      .in("product_id", productIds)
      .order("added_at", { ascending: true }),
    "unconnected_creators"
  );
}
