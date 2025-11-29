// Small utilities and constants used by TodoApp
export const STORAGE_KEY = "todos_v1";
export const LISTS_KEY = "lists_v1";
export const SELECTED_LIST_KEY = "selected_list_v1";

// Per-user storage key helpers. Use these to namespace localStorage per authenticated user.
export function storageKeyFor(userId) {
  try {
    if (!userId) return STORAGE_KEY;
    return `todos_v1_user_${String(userId)}`;
  } catch (e) {
    return STORAGE_KEY;
  }
}

export function listsKeyFor(userId) {
  try {
    if (!userId) return LISTS_KEY;
    return `lists_v1_user_${String(userId)}`;
  } catch (e) {
    return LISTS_KEY;
  }
}

export function selectedListKeyFor(userId) {
  try {
    if (!userId) return SELECTED_LIST_KEY;
    return `selected_list_v1_user_${String(userId)}`;
  } catch (e) {
    return SELECTED_LIST_KEY;
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// compute `when` (today/upcoming) from an ISO date string YYYY-MM-DD
export function computeWhenFromDate(dateStr) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + "T00:00:00");
    target.setHours(0, 0, 0, 0);
    if (target.getTime() === today.getTime()) return "today";
    if (target.getTime() > today.getTime()) return "upcoming";
    return "today"; // past dates treated as today (overdue)
  } catch (e) {
    return "today";
  }
}

export function formatDateDMY(d) {
  try {
    const dt = new Date(String(d));
    if (isNaN(dt)) return String(d || "—");
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yy = dt.getFullYear();
    return `${dd}/${mm}/${yy}`;
  } catch (e) {
    return String(d || "—");
  }
}
