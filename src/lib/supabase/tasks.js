// lib/supabase/tasks.js
import { sb, unwrap } from "./client.js";

export async function fetchTasks(storeId) {
  return unwrap(
    await sb.from("action_tasks")
      .select("id,kind,title,collaboration_id,product_id,staff_id,due_date,status,is_auto,created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false }),
    "action_tasks"
  );
}
export async function createTask(storeId, task) {
  return unwrap(
    await sb.from("action_tasks").insert({ store_id: storeId, ...task }).select("id").single(),
    "action_tasks"
  );
}
export async function updateTask(id, patch) {
  unwrap(await sb.from("action_tasks").update(patch).eq("id", id), "action_tasks");
}
export async function deleteTask(id) {
  unwrap(await sb.from("action_tasks").delete().eq("id", id), "action_tasks");
}
export async function clearAutoTasks(storeId) {
  unwrap(await sb.from("action_tasks").delete().eq("store_id", storeId).eq("is_auto", true), "action_tasks");
}
