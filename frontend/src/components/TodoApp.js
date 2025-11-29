"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import { useRouter } from "next/navigation";
import Profile from "./Profile";
import InlineEditor from "./InlineEditor";
import {
  STORAGE_KEY,
  LISTS_KEY,
  SELECTED_LIST_KEY,
  uid,
  storageKeyFor,
  listsKeyFor,
  selectedListKeyFor,
  computeWhenFromDate as computeWhenFromDateUtil,
  formatDateDMY as formatDateDMYUtil,
} from "./todoUtils";

export default function TodoAppClient() {
  const [todos, setTodos] = useState([]);
  const [addedIds, setAddedIds] = useState([]);
  const [editedIds, setEditedIds] = useState([]);
  const [deletingIds, setDeletingIds] = useState([]);
  const [toast, setToast] = useState(null);
  const [toastHiding, setToastHiding] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const modalRef = useRef(null);
  const inputRef = useRef(null);
  const toastTimer = useRef(null);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const [lists, setLists] = useState([]);
  const [view, setView] = useState("tasks");
  const [sidebarListsOpen, setSidebarListsOpen] = useState(false);
  const [selectListOpen, setSelectListOpen] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [addToList, setAddToList] = useState(null); // list target for new tasks (independent from filter)
  const [selectListMode, setSelectListMode] = useState("filter"); // 'filter' or 'assign'

  // Keep add-to-list defaulted to the currently selected filter when not explicitly set
  useEffect(() => {
    try {
      if ((!addToList || !addToList.id) && selectedList)
        setAddToList(selectedList);
    } catch (e) {}
  }, [selectedList, addToList]);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [newListName, setNewListName] = useState("");
  const listInputRef = useRef(null);
  const [addedListIds, setAddedListIds] = useState([]);
  const [duePickerId, setDuePickerId] = useState(null);
  const [duePickerValue, setDuePickerValue] = useState("");
  const duePickerRef = useRef(null);

  // Per-user storage key helpers (fallback to global keys when unauthenticated)
  function getStorageKey() {
    return user && user.id ? storageKeyFor(user.id) : STORAGE_KEY;
  }

  function getListsKey() {
    return user && user.id ? listsKeyFor(user.id) : LISTS_KEY;
  }

  function getSelectedListKey() {
    return user && user.id ? selectedListKeyFor(user.id) : SELECTED_LIST_KEY;
  }

  // Special "all tasks" pseudo-list id
  const ALL_LIST_ID = "all";
  const ALL_LIST_DISPLAY_NAME = "Semua Tugas";

  // Hide native browser date-picker icon so only our custom SVG remains
  useEffect(() => {
    try {
      const css = `input[type="date"]::-webkit-calendar-picker-indicator { display: none; -webkit-appearance: none; } input[type="date"] { -webkit-appearance: textfield; appearance: textfield; }`;
      const style = document.createElement("style");
      style.setAttribute("data-generated", "hide-native-date");
      style.appendChild(document.createTextNode(css));
      document.head.appendChild(style);
      return () => {
        try {
          document.head.removeChild(style);
        } catch (e) {}
      };
    } catch (e) {}
  }, []);

  // Refs used for FLIP animations (animate items when they move up/down)
  const itemPositions = useRef(new Map()); // id -> top
  const itemNodes = useRef(new Map()); // id -> DOM node

  function setItemRef(id, el) {
    if (el) itemNodes.current.set(id, el);
    else itemNodes.current.delete(id);
  }

  // Refs for sidebar list items to allow smooth scroll-to-selection
  const listItemRefs = useRef({});
  function setListItemRef(id, el) {
    try {
      if (!id) return;
      const key = String(id);
      if (el) listItemRefs.current[key] = el;
      else delete listItemRefs.current[key];
    } catch (e) {}
  }

  // Smooth-scroll the selected list into view when the sidebar opens
  useEffect(() => {
    try {
      if (!sidebarListsOpen) return;
      const id =
        selectedList && selectedList.id ? String(selectedList.id) : ALL_LIST_ID;
      const el = listItemRefs.current[id];
      if (el && typeof el.scrollIntoView === "function") {
        // slight delay to allow DOM/layout to settle
        setTimeout(() => {
          try {
            el.scrollIntoView({ behavior: "smooth", block: "nearest" });
            // Add a transient highlight class so the user notices the item
            try {
              el.classList.add("scrolled");
              setTimeout(() => {
                try {
                  el.classList.remove("scrolled");
                } catch (e) {}
              }, 900);
            } catch (e) {}
          } catch (e) {}
        }, 80);
      }
    } catch (e) {}
  }, [sidebarListsOpen, selectedList, lists]);

  // FLIP: on every todos change, compute previous vs new positions and
  // animate items that moved by applying a translation and letting it
  // transition back to 0.
  useLayoutEffect(() => {
    const nodes = itemNodes.current;
    const newPositions = new Map();

    nodes.forEach((el, id) => {
      try {
        const r = el.getBoundingClientRect();
        newPositions.set(id, r.top);
      } catch (e) {}
    });

    // Apply FLIP animation for moved items
    try {
      const prev = itemPositions.current || new Map();
      newPositions.forEach((newTop, id) => {
        const prevTop = prev.get(id);
        if (typeof prevTop === "number") {
          const delta = prevTop - newTop;
          if (Math.abs(delta) > 0.5) {
            const el = itemNodes.current.get(id);
            if (el) {
              el.style.transition = "none";
              el.style.transform = `translateY(${delta}px)`;
              requestAnimationFrame(() => {
                el.style.transition =
                  "transform 360ms cubic-bezier(.2,.9,.2,1)";
                el.style.transform = "";
                setTimeout(() => {
                  try {
                    el.style.transition = "";
                  } catch (e) {}
                }, 380);
              });
            }
          }
        }
      });
      itemPositions.current = newPositions;
    } catch (e) {}
  }, [todos]);

  useEffect(() => {
    // Close the inline date picker when clicking outside of it
    if (!duePickerId) return;
    function onMouseDown(e) {
      try {
        if (duePickerRef.current && !duePickerRef.current.contains(e.target)) {
          setDuePickerId(null);
        }
      } catch (e) {}
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [duePickerId]);

  useEffect(() => {
    // Compute current user from storage first (do not rely on `user` state,
    // which is initially null). Use this `currentUser` variable when reading
    // per-user localStorage keys so we don't accidentally read the global
    // keys on refresh and get the generic 'Umum'/"general" tag.
    try {
      const rawUser =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      let currentUser = null;
      try {
        if (rawUser) currentUser = JSON.parse(rawUser);
      } catch (e) {}

      const currentUserId =
        currentUser && currentUser.id ? currentUser.id : null;
      const storageKey = storageKeyFor(currentUserId);
      const listsKey = listsKeyFor(currentUserId);
      const selectedKey = selectedListKeyFor(currentUserId);

      // Load todos from the correct key (per-user when logged in)
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          const normalized = Array.isArray(parsed)
            ? parsed.map((t) => ({
                ...(t || {}),
                when: (t && t.when) || "today",
              }))
            : parsed;
          setTimeout(() => setTodos(normalized), 0);
        }
      } catch (e) {}

      // Load theme
      try {
        const t = localStorage.getItem("theme");
        if (t) setTimeout(() => setTheme(t), 0);
      } catch (e) {}

      // Initialize user state from storage (so other effects can react)
      if (currentUser) setTimeout(() => setUser(currentUser), 0);

      // load lists from localStorage (so locally-created lists survive refresh)
      try {
        const rawLists = localStorage.getItem(listsKey);
        const rawSelectedId = localStorage.getItem(selectedKey);
        if (rawLists) {
          const parsedLists = JSON.parse(rawLists);
          if (Array.isArray(parsedLists)) {
            setTimeout(() => setLists(parsedLists), 0);
            if (rawSelectedId) {
              // support the special 'all' selection
              if (rawSelectedId === ALL_LIST_ID) {
                setTimeout(
                  () =>
                    setSelectedList({
                      id: ALL_LIST_ID,
                      name: ALL_LIST_DISPLAY_NAME,
                    }),
                  0
                );
              } else {
                const found = parsedLists.find(
                  (x) => String(x.id) === String(rawSelectedId)
                );
                if (found) setTimeout(() => setSelectedList(found), 0);
                else
                  setTimeout(
                    () =>
                      setSelectedList(
                        (prev) =>
                          prev ||
                          (parsedLists.length > 0 ? parsedLists[0] : prev)
                      ),
                    0
                  );
              }
            } else {
              setTimeout(
                () =>
                  setSelectedList(
                    (prev) =>
                      prev || (parsedLists.length > 0 ? parsedLists[0] : prev)
                  ),
                0
              );
            }
          }
        }
      } catch (e) {}

      // fetch lists from backend (only override local lists when server returns non-empty)
      try {
        const API_URL =
          typeof window !== "undefined"
            ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
            : "http://localhost:5000";

        fetch(`${API_URL}/api/lists`)
          .then((r) => r.json())
          .then((data) => {
            const serverLists =
              data && Array.isArray(data.lists)
                ? data.lists
                : Array.isArray(data)
                ? data
                : null;
            if (Array.isArray(serverLists) && serverLists.length > 0) {
              const normalized = serverLists.map((l) => ({
                ...l,
                id: String(l.id),
              }));
              setLists(normalized);

              // If the user had a stored selected list id, try to restore it
              try {
                const rawSelected = localStorage.getItem(selectedKey);
                if (rawSelected) {
                  const found = normalized.find(
                    (x) => String(x.id) === String(rawSelected)
                  );
                  if (found) setTimeout(() => setSelectedList(found), 0);
                }
              } catch (e) {}
            }
          })
          .catch(() => {});
      } catch (e) {}

      // fetch tasks from backend (if available). If that fails, keep whatever
      // we loaded from localStorage above. Normalizes server shape to local shape.
      try {
        const API_URL =
          typeof window !== "undefined"
            ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
            : "http://localhost:5000";

        // Only fetch remote tasks when we know the current user id so the
        // backend can return user-scoped tasks. If there's no authenticated
        // user, skip the network request (localStorage data was already loaded above).
        if (currentUserId) {
          const tasksUrl = `${API_URL}/api/tasks?userId=${encodeURIComponent(
            currentUserId
          )}`;

          fetch(tasksUrl)
            .then((r) => r.json())
            .then((data) => {
              const arr = data && Array.isArray(data.tasks) ? data.tasks : data;
              if (!Array.isArray(arr)) return;

              let local = [];
              try {
                const rawLocal = localStorage.getItem(storageKey);
                if (rawLocal) local = JSON.parse(rawLocal) || [];
              } catch (e) {}

              const localMap = new Map(
                (local || []).map((t) => [String(t.id), t])
              );

              const mapped = arr.map((it) => {
                const due = it.due_date || it.date || it.due || null;
                const when =
                  (it.when &&
                    (it.when === "upcoming" ? "upcoming" : "today")) ||
                  (due ? computeWhenFromDate(due) : "today");
                const id = String(it.id || it.task_id || it.taskId || uid());
                const localMatch = localMap.get(id);

                let derivedTag = null;
                try {
                  const rawLists = localStorage.getItem(listsKey);
                  if (rawLists) {
                    const parsedLists = JSON.parse(rawLists);
                    if (Array.isArray(parsedLists)) {
                      const found = parsedLists.find(
                        (l) => String(l.id) === String(it.list_id || it.listId)
                      );
                      if (found && found.name) derivedTag = found.name;
                    }
                  }
                } catch (e) {}

                return {
                  id,
                  text:
                    (localMatch && localMatch.text) ||
                    it.title ||
                    it.text ||
                    it.name ||
                    "",
                  done: localMatch ? !!localMatch.done : !!it.done,
                  tag:
                    (localMatch && localMatch.tag) ||
                    it.tag ||
                    derivedTag ||
                    "Umum",
                  when: (localMatch && localMatch.when) || when,
                  date: (localMatch && localMatch.date) || due || null,
                  listId:
                    (localMatch && localMatch.listId) ||
                    it.list_id ||
                    it.listId ||
                    null,
                };
              });

              const localOnly = (local || []).filter(
                (t) => !mapped.some((m) => String(m.id) === String(t.id))
              );
              const combined = [...localOnly, ...mapped];
              setTodos(combined);
            })
            .catch(() => {});
        }
      } catch (e) {}
    } catch (e) {}
  }, []);

  // Listen to auth changes (login from the login page) and update user
  useEffect(() => {
    function onAuthChanged(e) {
      try {
        const u = e && e.detail && e.detail.user;
        if (u && u.id) {
          // remove global anonymous keys to avoid leaking previous anonymous data
          try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LISTS_KEY);
            localStorage.removeItem(SELECTED_LIST_KEY);
          } catch (e) {}
          setUser(u);
        } else {
          setUser(null);
        }
      } catch (e) {}
    }

    window.addEventListener("auth:changed", onAuthChanged);
    return () => window.removeEventListener("auth:changed", onAuthChanged);
  }, []);

  // When a user is present, fetch lists for that user specifically and override
  // any local lists with server-provided ones (if non-empty).
  useEffect(() => {
    try {
      if (!user || !user.id) return;
      const API_URL =
        typeof window !== "undefined"
          ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
          : "http://localhost:5000";

      fetch(`${API_URL}/api/lists/${user.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setLists(data.map((l) => ({ ...l, id: String(l.id) })));
            // Don't auto-select a list for the same reason as above.
          }
        })
        .catch(() => {});
    } catch (e) {}
  }, [user]);

  // When a user logs in, fetch tasks for that user specifically and merge
  // with any local-only tasks so we don't lose local state like `done`.
  useEffect(() => {
    try {
      if (!user || !user.id) return;
      const API_URL =
        typeof window !== "undefined"
          ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
          : "http://localhost:5000";

      fetch(`${API_URL}/api/tasks/user/${user.id}`)
        .then((r) => r.json())
        .then((arr) => {
          if (!Array.isArray(arr)) return;

          let local = [];
          try {
            const rawLocal = localStorage.getItem(getStorageKey());
            if (rawLocal) local = JSON.parse(rawLocal) || [];
          } catch (e) {}

          const localMap = new Map((local || []).map((t) => [String(t.id), t]));

          const mapped = arr.map((it) => {
            const due = it.due_date || it.date || it.due || null;
            const when =
              (it.when && (it.when === "upcoming" ? "upcoming" : "today")) ||
              (due ? computeWhenFromDate(due) : "today");
            const id = String(it.id || it.task_id || it.taskId || uid());
            const localMatch = localMap.get(id);

            // derive tag from locally stored lists if server doesn't include it
            let derivedTag = null;
            try {
              const rawLists = localStorage.getItem(getListsKey());
              if (rawLists) {
                const parsedLists = JSON.parse(rawLists);
                if (Array.isArray(parsedLists)) {
                  const found = parsedLists.find(
                    (l) => String(l.id) === String(it.list_id || it.listId)
                  );
                  if (found && found.name) derivedTag = found.name;
                }
              }
            } catch (e) {}

            return {
              id,
              text:
                (localMatch && localMatch.text) ||
                it.title ||
                it.text ||
                it.name ||
                "",
              done: localMatch ? !!localMatch.done : !!it.done,
              tag:
                (localMatch && localMatch.tag) ||
                it.tag ||
                derivedTag ||
                "Umum",
              when: (localMatch && localMatch.when) || when,
              date: (localMatch && localMatch.date) || due || null,
              listId:
                (localMatch && localMatch.listId) ||
                it.list_id ||
                it.listId ||
                null,
            };
          });

          const localOnly = (local || []).filter(
            (t) => !mapped.some((m) => String(m.id) === String(t.id))
          );

          const combined = [...localOnly, ...mapped];
          setTodos(combined);
        })
        .catch(() => {});
    } catch (e) {}
  }, [user]);

  // persist lists to localStorage so they survive refresh
  useEffect(() => {
    try {
      localStorage.setItem(getListsKey(), JSON.stringify(lists));
    } catch (e) {}
  }, [lists]);

  // Ensure todos inherit the list name as `tag` when they have a listId but
  // the tag is missing or 'general'. This prevents tasks from appearing as
  // "general" after a refresh when server responses don't include tags.
  useEffect(() => {
    if (!lists || lists.length === 0) return;
    // Defer to avoid synchronous setState inside effect
    setTimeout(() => {
      try {
        const current = JSON.parse(
          localStorage.getItem(getStorageKey()) || "[]"
        );
        if (!Array.isArray(current)) return;
        let changed = false;
        const mapped = current.map((t) => {
          if (
            t &&
            (t.tag === undefined || t.tag === null || t.tag === "general") &&
            t.listId != null
          ) {
            const found = lists.find((l) => String(l.id) === String(t.listId));
            if (found && found.name) {
              changed = true;
              return { ...t, tag: found.name };
            }
          }
          return t;
        });
        if (changed) {
          try {
            localStorage.setItem(getStorageKey(), JSON.stringify(mapped));
          } catch (e) {}
          // update react state as well
          setTodos(mapped);
        }
      } catch (e) {}
    }, 0);
  }, [lists]);

  // persist selected list id
  useEffect(() => {
    try {
      if (selectedList && selectedList.id) {
        localStorage.setItem(getSelectedListKey(), String(selectedList.id));
      } else {
        localStorage.removeItem(getSelectedListKey());
      }
    } catch (e) {}
  }, [selectedList]);

  // Listen for list changes dispatched from other components (e.g., Profile)
  useEffect(() => {
    function onListsChanged(e) {
      try {
        const detailLists = e && e.detail && e.detail.lists;
        if (Array.isArray(detailLists)) {
          // Normalize ids to string to avoid type mismatches
          const normalized = detailLists.map((l) => ({
            ...l,
            id: String(l.id),
          }));
          setLists(normalized);

          const removedId = e.detail && e.detail.removedId;
          if (
            removedId &&
            selectedList &&
            String(selectedList.id) === String(removedId)
          ) {
            // If the selected list was removed, pick first available or clear
            setTimeout(() => {
              setSelectedList(normalized.length > 0 ? normalized[0] : null);
            }, 0);
          }
        } else {
          // fallback: read from localStorage
          try {
            const raw = localStorage.getItem(getListsKey());
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) setLists(parsed);
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    window.addEventListener("lists:changed", onListsChanged);
    return () => window.removeEventListener("lists:changed", onListsChanged);
  }, [selectedList]);

  // Listen for navigation requests from other components (e.g., Profile)
  // and open the tasks view showing the completed items with dark theme.
  useEffect(() => {
    function onNavigateDone() {
      try {
        setTheme("dark");
        localStorage.setItem("theme", "dark");
        setView("doneTimeline");
        // Give React a moment to render the tasks view, then scroll to done.
        setTimeout(() => {
          try {
            const el = document.getElementById("done-section");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch (e) {}
        }, 120);
      } catch (e) {}
    }

    window.addEventListener("navigate:done", onNavigateDone);
    return () => window.removeEventListener("navigate:done", onNavigateDone);
  }, []);

  // restore selected list when lists are loaded/changed
  useEffect(() => {
    try {
      const rawSelectedId = localStorage.getItem(getSelectedListKey());
      if (!rawSelectedId) {
        // no stored selection; if nothing selected yet, pick the first list (if any)
        if ((!selectedList || !selectedList.id) && lists && lists.length > 0) {
          setTimeout(() => setSelectedList((prev) => prev || lists[0]), 0);
        }
        return;
      }

      // If previously the user selected "all", restore that selection
      if (String(rawSelectedId) === String(ALL_LIST_ID)) {
        if (!selectedList || String(selectedList.id) !== String(ALL_LIST_ID)) {
          setTimeout(
            () =>
              setSelectedList({ id: ALL_LIST_ID, name: ALL_LIST_DISPLAY_NAME }),
            0
          );
        }
        return;
      }

      // If current selection already matches stored id, nothing to do
      if (selectedList && String(selectedList.id) === String(rawSelectedId))
        return;

      // Try to find the stored id among the available lists and select it
      if (lists && lists.length > 0) {
        const found = lists.find((l) => String(l.id) === String(rawSelectedId));
        if (found) setTimeout(() => setSelectedList(found), 0);
        else if (!selectedList) setTimeout(() => setSelectedList(lists[0]), 0);
      }
    } catch (e) {}
  }, [lists, selectedList]);

  useEffect(() => {
    // Before persisting, try to fill missing tags from lists so tasks
    // don't end up as the generic 'Umum' after a refresh.
    setTimeout(() => {
      try {
        // Try to get lists from state first, fallback to localStorage
        let availableLists = lists && lists.length ? lists : [];
        if (!availableLists || availableLists.length === 0) {
          try {
            const raw = localStorage.getItem(getListsKey());
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) availableLists = parsed;
            }
          } catch (e) {}
        }

        let changed = false;
        const mapped = (todos || []).map((t) => {
          if (
            t &&
            (t.tag === undefined ||
              t.tag === null ||
              t.tag === "Umum" ||
              t.tag === "general") &&
            t.listId != null
          ) {
            const found = (availableLists || []).find(
              (l) => String(l.id) === String(t.listId)
            );
            if (found && found.name) {
              changed = true;
              return { ...t, tag: found.name };
            }
          }
          return t;
        });

        try {
          localStorage.setItem(
            getStorageKey(),
            JSON.stringify(changed ? mapped : todos)
          );
        } catch (e) {}

        if (changed) {
          // update state so UI reflects persisted tags
          setTodos(mapped);
        }
      } catch (e) {}
    }, 0);
  }, [todos, lists]);

  useEffect(() => {
    try {
      if (typeof document !== "undefined") {
        if (theme === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", theme);
      }
    } catch (e) {}
  }, [theme]);

  function addTodo(text) {
    const t = (text || "").trim();
    if (!t) return;

    const API_URL =
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        : "http://localhost:5000";

    // If there's no authenticated user, create a local-only task.
    if (!user || !user.id) {
      const id = "local-" + uid();
      const target = addToList || selectedList;
      const tagName = target && target.name ? target.name : "general";
      const newTask = {
        id,
        text: t,
        tag: tagName,
        listId: target ? target.id : null,
        done: false,
        when: "today",
      };

      setTodos((s) => [newTask, ...s]);
      setAddedIds((s) => [id, ...s]);
      setTimeout(() => setAddedIds((s) => s.filter((x) => x !== id)), 800);
      showToast({
        type: "success",
        title: "Berhasil (offline)",
        message: "Tugas ditambahkan secara lokal.",
      });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Send to backend and add after DB confirms for authenticated user
    const body = {
      user_id: user.id,
      title: t,
      description: "",
    };
    const target = addToList || selectedList;
    if (target && target.id && String(target.id) !== ALL_LIST_ID)
      body.list_id = target.id;

    fetch(`${API_URL}/api/tasks`, {
      method: "POST",
      headers:
        user && user.id
          ? { "Content-Type": "application/json", "x-user-id": String(user.id) }
          : { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const text = await res.text();
        const contentType = res.headers.get("content-type") || "";
        // Try parse JSON, otherwise show returned text for debugging
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (e) {
          console.warn("Response is not JSON", { status: res.status, text });
        }

        if (!res.ok) {
          const serverMsg =
            data && data.message ? data.message : text || res.statusText;
          console.error("Server responded with error", res.status, serverMsg);
          showToast({
            type: "error",
            title: `Gagal (${res.status})`,
            message: String(serverMsg),
          });
          return null;
        }

        if (!data) {
          console.error("Unexpected response from server", {
            status: res.status,
            contentType,
            text,
          });
          showToast({
            type: "error",
            title: "Gagal",
            message: "Server tidak mengembalikan data tugas yang valid.",
          });
          return null;
        }

        // Normalize backend response: accept either { task: {...} } or { task_id: id }
        if (!data.task) {
          const id = data.task_id || data.taskId || data.id || null;
          if (id) data.task = { id };
          else {
            console.error("Unexpected response shape from server", {
              status: res.status,
              contentType,
              text,
            });
            showToast({
              type: "error",
              title: "Gagal",
              message: "Server tidak mengembalikan data tugas yang valid.",
            });
            return null;
          }
        }

        return data;
      })
      .then((data) => {
        if (!data) return;
        const dbTask = data.task;
        const id = String(dbTask.id);
        const target2 = addToList || selectedList;
        const tagName2 = target2 && target2.name ? target2.name : "general";
        setTodos((s) => [
          {
            id,
            text: t,
            tag: tagName2,
            listId: target2 ? target2.id : null,
            done: false,
            when: "today",
          },
          ...s,
        ]);
        setAddedIds((s) => [id, ...s]);
        setTimeout(() => setAddedIds((s) => s.filter((x) => x !== id)), 800);
        showToast({
          type: "success",
          title: "Berhasil!",
          message: "Tugas berhasil ditambahkan.",
        });
        if (inputRef.current) inputRef.current.value = "";
      })
      .catch((err) => {
        console.error("Add task error", err);
        showToast({
          type: "error",
          title: "Gagal",
          message: "Terjadi kesalahan jaringan: " + String(err.message || err),
        });
      });
  }

  // Create a new list/category
  async function createList(name) {
    if (!name || !name.trim()) return null;
    const trimmed = name.trim();
    const API_URL =
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        : "http://localhost:5000";

    try {
      // If user is not authenticated, skip server request and fall back to local-only list
      if (!user || !user.id) throw new Error("no-user");

      const body = { name: trimmed, user_id: user.id };
      const res = await fetch(`${API_URL}/api/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {}

      if (res.ok && data && data.list) {
        const list = data.list;
        list.id = String(list.id);
        setLists((s) => [list, ...s]);
        setSelectedList(list);
        setNewListName("");
        setAddedListIds((s) => [String(list.id), ...s]);
        setTimeout(
          () => setAddedListIds((s) => s.filter((x) => x !== String(list.id))),
          900
        );
        showToast({
          type: "success",
          title: "Berhasil",
          message: "List berhasil ditambahkan.",
        });
        return list;
      }
    } catch (e) {
      console.warn("createList POST failed, falling back to local", e);
    }

    // fallback: create list locally so UI still reflects change
    const id = "local-" + uid();
    const list = { id: String(id), name: trimmed };
    setLists((s) => [list, ...s]);
    setSelectedList(list);
    setNewListName("");
    setAddedListIds((s) => [String(list.id), ...s]);
    setTimeout(
      () => setAddedListIds((s) => s.filter((x) => x !== String(list.id))),
      900
    );
    showToast({
      type: "success",
      title: "List dibuat (offline)",
      message: "List ditambahkan secara lokal.",
    });
    return list;
  }

  function toggleDone(id) {
    setTodos((s) =>
      s.map((it) => (it.id === id ? { ...it, done: !it.done } : it))
    );
  }

  function deleteTodo(id) {
    if (deletingIds.includes(id)) return;
    setDeletingIds((s) => [id, ...s]);
    setTimeout(() => {
      setTodos((s) => s.filter((it) => it.id !== id));
      setDeletingIds((s) => s.filter((x) => x !== id));
      showToast({
        type: "success",
        title: "Terhapus",
        message: "Tugas berhasil dihapus.",
      });
    }, 480);
  }

  function requestDelete(id) {
    setConfirmDeleteId(id);
  }

  const cancelConfirm = useCallback(() => {
    if (confirmLoading) return;
    setConfirmDeleteId(null);
    setConfirmChecked(false);
  }, [confirmLoading]);

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    if (!confirmChecked) return;
    const id = confirmDeleteId;
    setConfirmLoading(true);

    const API_URL =
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        : "http://localhost:5000";

    // If id is numeric, call backend; otherwise treat as local-only and delete locally
    if (/^\d+$/.test(String(id))) {
      try {
        const res = await fetch(`${API_URL}/api/tasks/${id}`, {
          method: "DELETE",
          headers: user && user.id ? { "x-user-id": String(user.id) } : {},
        });
        const text = await res.text();
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (e) {}

        if (!res.ok) {
          const serverMsg =
            data && data.message ? data.message : text || res.statusText;
          showToast({
            type: "error",
            title: `Gagal (${res.status})`,
            message: String(serverMsg),
          });
          setConfirmLoading(false);
          return;
        }

        // success
        setConfirmDeleteId(null);
        setConfirmChecked(false);
        setConfirmLoading(false);
        deleteTodo(id);
      } catch (err) {
        console.error("Delete API error", err);
        showToast({
          type: "error",
          title: "Gagal",
          message:
            "Terjadi kesalahan saat menghapus: " + String(err.message || err),
        });
        setConfirmLoading(false);
      }
    } else {
      // local-only id
      setConfirmDeleteId(null);
      setConfirmChecked(false);
      setConfirmLoading(false);
      deleteTodo(id);
    }
  }

  // Toggle when field between 'today' and 'upcoming' (mendatang)
  function toggleWhen(id) {
    // Allow the user to pick a date. If they leave it empty, fall back to toggling
    // behavior for quick switches. Date format must be YYYY-MM-DD.
    try {
      const it = todos.find((t) => t.id === id);
      const defaultDate =
        (it && it.date) || new Date().toISOString().slice(0, 10);
      const input = prompt(
        "Masukkan tanggal (YYYY-MM-DD). Kosongkan untuk toggle today/upcoming:",
        defaultDate
      );
      if (input === null) return; // cancelled
      const trimmed = String(input).trim();
      if (trimmed === "") {
        setTodos((s) =>
          s.map((it) =>
            it.id === id
              ? { ...it, when: it.when === "upcoming" ? "today" : "upcoming" }
              : it
          )
        );
      } else {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          showToast({
            type: "error",
            title: "Format salah",
            message: "Gunakan format YYYY-MM-DD.",
          });
          return;
        }
        const when = computeWhenFromDate(trimmed);
        setTodos((s) =>
          s.map((it) => (it.id === id ? { ...it, when, date: trimmed } : it))
        );
      }

      setEditedIds((s) => [id, ...s]);
      setTimeout(() => setEditedIds((s) => s.filter((x) => x !== id)), 900);
      showToast({
        type: "success",
        title: "Tersimpan",
        message: "Status tugas diperbarui.",
      });
    } catch (e) {
      console.error("toggleWhen error", e);
    }
  }

  // Focus trap + escape + body scroll lock when modal open
  useEffect(() => {
    if (!confirmDeleteId) return;
    const prevActive = document.activeElement;
    const modal = modalRef.current;
    if (!modal) return;
    const focusable = modal.querySelectorAll(
      'a[href], area[href], input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelConfirm();
        return;
      }
      if (e.key === "Tab") {
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", onKey);
    if (first) first.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      try {
        if (prevActive) prevActive.focus();
      } catch (e) {}
      document.body.style.overflow = prevOverflow || "";
    };
  }, [confirmDeleteId, cancelConfirm]);

  async function editTodo(id, value) {
    // Optimistically update UI
    setTodos((s) =>
      s.map((it) => (it.id === id ? { ...it, text: value } : it))
    );
    setEditedIds((s) => [id, ...s]);
    setTimeout(() => setEditedIds((s) => s.filter((x) => x !== id)), 900);

    const API_URL =
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        : "http://localhost:5000";

    // If id looks numeric, persist change to backend
    if (/^\d+$/.test(String(id))) {
      try {
        // find task to include list association if available
        const task = (todos || []).find((t) => String(t.id) === String(id));
        const listId = task ? task.listId || task.list_id || null : null;

        const body = { title: value };
        if (listId != null) body.list_id = listId;

        const res = await fetch(`${API_URL}/api/tasks/${id}`, {
          method: "PUT",
          headers:
            user && user.id
              ? {
                  "Content-Type": "application/json",
                  "x-user-id": String(user.id),
                }
              : { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const txt = await res.text();
          showToast({
            type: "error",
            title: "Gagal",
            message: `Server error saat menyimpan: ${txt}`,
          });
          return;
        }

        showToast({
          type: "success",
          title: "Tersimpan",
          message: "Perubahan tugas disimpan.",
        });
      } catch (e) {
        console.error("Persist edit error", e);
        showToast({
          type: "error",
          title: "Gagal",
          message: "Tidak dapat menyimpan perubahan.",
        });
      }
    } else {
      // local-only id: already updated locally
      showToast({
        type: "success",
        title: "Tersimpan",
        message: "Perubahan tugas disimpan.",
      });
    }
  }

  function showToast({ type = "success", title = "", message = "" }) {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast({ type, title, message });
    setToastHiding(false);
    const total = 1500;
    const fade = 260;
    toastTimer.current = setTimeout(() => {
      setToastHiding(true);
      toastTimer.current = setTimeout(() => {
        setToast(null);
        setToastHiding(false);
        toastTimer.current = null;
      }, fade);
    }, total - fade);
  }

  const todayList = todos.filter(
    (t) =>
      !t.done &&
      (t.when === "today" || !t.when) &&
      (!selectedList ||
        !selectedList.id ||
        selectedList.id === ALL_LIST_ID ||
        String(t.listId) === String(selectedList.id) ||
        t.listId == null)
  );
  const upcomingList = todos.filter(
    (t) =>
      !t.done &&
      t.when === "upcoming" &&
      (!selectedList ||
        !selectedList.id ||
        selectedList.id === ALL_LIST_ID ||
        String(t.listId) === String(selectedList.id) ||
        t.listId == null)
  );
  const doneList = todos.filter(
    (t) =>
      t.done &&
      (!selectedList ||
        !selectedList.id ||
        selectedList.id === ALL_LIST_ID ||
        String(t.listId) === String(selectedList.id) ||
        t.listId == null)
  );
  // Group completed tasks by date (ISO YYYY-MM-DD). Use today if missing.
  function formatDateDMY(d) {
    return formatDateDMYUtil(d);
  }

  const doneByDate = (doneList || []).reduce((acc, t) => {
    const key = t.date || new Date().toISOString().slice(0, 10);
    acc[key] = acc[key] || [];
    acc[key].push(t);
    return acc;
  }, {});
  const doneDateKeys = Object.keys(doneByDate).sort((a, b) => (a < b ? 1 : -1));
  function onSubmitAdd(e) {
    e.preventDefault();
    const val = inputRef.current?.value ?? "";
    addTodo(val);
  }
  return (
    <div className="app-shell font-sans">
      <aside className="sidebar">
        <div className="brand">
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 100,
              background: "#0f1720",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Image src="/myavatar.svg" alt="avatar" width={40} height={50} />
          </div>
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 14,
                color: "var(--foreground)",
              }}
            >
              Tugas Saya
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Bantu kamu menata hari
            </div>
          </div>
        </div>

        <div
          className={"nav-item" + (view === "tasks" ? " active" : "")}
          role="button"
          onClick={() => setView("tasks")}
        >
          📋 Tasks
        </div>
        <div style={{ marginTop: 8 }}>
          <div
            role="button"
            className="nav-item"
            onClick={() => setSidebarListsOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 4px",
              cursor: "pointer",
            }}
            aria-expanded={sidebarListsOpen}
          >
            <span>📁</span>
            <span
              style={{
                color: "var(--foreground)",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              List
            </span>
            <span
              style={{
                marginLeft: "auto",
                color: "var(--muted)",
                transform: sidebarListsOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 160ms ease",
                fontSize: 14,
              }}
            >
              ▾
            </span>
          </div>

          {sidebarListsOpen ? (
            <div className="sidebar-lists">
              {/* All tasks item */}
              <div
                key="__all__"
                ref={(el) => setListItemRef(ALL_LIST_ID, el)}
                className={`list-entry ${
                  selectedList &&
                  String(selectedList.id) === String(ALL_LIST_ID)
                    ? "added"
                    : ""
                }`}
                onClick={() => {
                  setSelectedList({
                    id: ALL_LIST_ID,
                    name: ALL_LIST_DISPLAY_NAME,
                  });
                }}
                style={
                  selectedList &&
                  String(selectedList.id) === String(ALL_LIST_ID)
                    ? {
                        background: "linear-gradient(180deg,#1e66ff,#1b54d9)",
                        color: "white",
                        padding: "10px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 14,
                      }
                    : {
                        background: "rgba(255,255,255,0.06)",
                        color: "var(--foreground)",
                        padding: "10px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 14,
                      }
                }
              >
                {ALL_LIST_DISPLAY_NAME}
              </div>
              {lists && lists.length > 0 ? (
                lists.map((l) => {
                  const isSelected =
                    selectedList && String(selectedList.id) === String(l.id);
                  const itemStyle = isSelected
                    ? {
                        background: "linear-gradient(180deg,#1e66ff,#1b54d9)",
                        color: "white",
                        padding: "10px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 14,
                      }
                    : {
                        background: "rgba(255,255,255,0.06)",
                        color: "var(--foreground)",
                        padding: "10px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 14,
                      };

                  return (
                    <div
                      key={l.id}
                      ref={(el) => setListItemRef(l.id, el)}
                      className={`list-entry ${
                        addedListIds.includes(String(l.id)) ? "added" : ""
                      }`}
                      onClick={() => {
                        setSelectedList(l);
                      }}
                      style={itemStyle}
                    >
                      {l.name}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: "var(--muted)", padding: 10 }}>
                  Belum ada list
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div
          className={"nav-item" + (view === "profile" ? " active" : "")}
          role="button"
          onClick={() => setView("profile")}
          style={{ cursor: "pointer" }}
        >
          👤 Profile
        </div>
        <div
          className="nav-item"
          role="button"
          onClick={() => {
            try {
              localStorage.removeItem("user");
            } catch (e) {}
            // Notify app that auth changed so Page can update global user state
            try {
              window.dispatchEvent(
                new CustomEvent("auth:changed", { detail: { user: null } })
              );
            } catch (e) {}
            setUser(null);
            router.push("/login");
          }}
        >
          ↩️ Logout
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "#0f1720",
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(255,255,255,0.02)",
            }}
          >
            <Image src="/human.svg" alt="profile" width={30} height={30} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, color: "var(--foreground)" }}>
              Hallo, {user && user.username ? user.username : "User"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              Email: {user && user.email ? user.email : "student@example.com"}
            </div>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        {view === "profile" ? (
          <Profile />
        ) : view === "doneTimeline" ? (
          <main className="main-panel">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className="pill back-btn"
                onClick={() => setView("tasks")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 700,
                }}
              >
                <span style={{ fontSize: 16 }}>←</span>
                <span>Kembali</span>
              </button>
              <h2 className="page-title" style={{ margin: 0 }}>
                Waktu Selesai
              </h2>
            </div>

            <div style={{ marginTop: 18 }} className="done-timeline-wrapper">
              <div className="card done-timeline-inner" style={{ padding: 20 }}>
                <div className="done-timeline-line" aria-hidden />

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 18 }}
                >
                  {doneDateKeys.length === 0 ? (
                    <div style={{ color: "var(--muted)", padding: 12 }}>
                      Belum ada tugas selesai
                    </div>
                  ) : (
                    doneDateKeys.map((dateKey) => (
                      <div key={dateKey} className="timeline-group">
                        <div className="timeline-date">
                          {formatDateDMY(dateKey)}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}
                        >
                          {(doneByDate[dateKey] || []).map((t) => (
                            <div key={t.id} className="timeline-item">
                              <div className="timeline-node" aria-hidden>
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden
                                >
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    fill="rgba(255,255,255,0.06)"
                                  />
                                  <path
                                    d="M7.5 12.5 L10.5 15.5 L16.5 9.5"
                                    stroke="#fff"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                  />
                                </svg>
                              </div>
                              <div className="timeline-card">
                                <div
                                  className={`timeline-text ${
                                    t.done ? "done" : ""
                                  }`}
                                >
                                  {t.text}
                                </div>
                                <div className="timeline-sub">
                                  {formatDateDMY(t.date || dateKey)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </main>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <h2 className="page-title">My Tasks</h2>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginLeft: "auto",
                  alignItems: "center",
                }}
              >
                <div style={{ position: "relative" }}>
                  {/* Filter button removed per user request */}

                  {selectListOpen ? (
                    <div
                      className="select-panel"
                      style={{
                        position: "absolute",
                        right: 0,
                        marginTop: 8,
                        width: 260,
                        background: "var(--panel-2)",
                        borderRadius: 8,
                        boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                        border: "1px solid rgba(255,255,255,0.03)",
                        zIndex: 800,
                        padding: 8,
                      }}
                    >
                      <div style={{ fontWeight: 700, padding: "8px 10px" }}>
                        List
                      </div>
                      <div style={{ maxHeight: 220, overflow: "auto" }}>
                        {/* 'Semua Tugas' removed from this dropdown (handled by main view). */}

                        {lists.length === 0 ? (
                          <div style={{ padding: 10, color: "var(--muted)" }}>
                            Belum ada list
                          </div>
                        ) : (
                          lists.map((l) => (
                            <div
                              key={l.id}
                              onClick={() => {
                                if (selectListMode === "assign") {
                                  setAddToList(l);
                                } else {
                                  setSelectedList(l);
                                }
                                setSelectListOpen(false);
                              }}
                              className={`list-item ${
                                addedListIds.includes(String(l.id))
                                  ? "added"
                                  : ""
                              }`}
                              style={{
                                padding: "8px 10px",
                                cursor: "pointer",
                                borderRadius: 6,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                background:
                                  selectedList &&
                                  String(selectedList.id) === String(l.id)
                                    ? "rgba(255,255,255,0.02)"
                                    : "transparent",
                              }}
                            >
                              <span className="list-checkbox" aria-hidden>
                                <svg width="18" height="18" viewBox="0 0 20 20">
                                  <rect
                                    x="1.5"
                                    y="1.5"
                                    width="17"
                                    height="17"
                                    rx="4"
                                    ry="4"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.06)"
                                  />
                                  <path
                                    className="list-check"
                                    d="M5 10.5 L8.2 13.5 L15 6.5"
                                    fill="none"
                                    stroke="rgba(16,185,129,0)"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                              <span style={{ lineHeight: 1 }}>{l.name}</span>
                            </div>
                          ))
                        )}
                      </div>

                      <div
                        style={{
                          padding: 8,
                          borderTop: "1px solid rgba(255,255,255,0.02)",
                          marginTop: 8,
                        }}
                      >
                        <input
                          ref={listInputRef}
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              createList(newListName).then((list) => {
                                if (selectListMode === "assign" && list)
                                  setAddToList(list);
                                setSelectListOpen(false);
                              });
                            }
                          }}
                          placeholder="Tambah list baru..."
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 6,
                            border: "1px solid rgba(255,255,255,0.04)",
                            background: "transparent",
                            color: "var(--foreground)",
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginTop: 8,
                          }}
                        >
                          <button
                            className="pill"
                            onClick={() => {
                              createList(newListName).then((list) => {
                                if (selectListMode === "assign" && list)
                                  setAddToList(list);
                                setSelectListOpen(false);
                              });
                            }}
                            style={{ padding: "6px 12px" }}
                          >
                            Tambah
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <form
                  onSubmit={onSubmitAdd}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <button
                    type="button"
                    className="pill"
                    onClick={() => {
                      // toggle assign picker: close if already open in assign mode
                      if (selectListOpen && selectListMode === "assign") {
                        setSelectListOpen(false);
                        return;
                      }
                      setSelectListMode("assign");
                      setSelectListOpen(true);
                    }}
                    title="Pilih list untuk tugas baru"
                    style={{ padding: "6px 10px", cursor: "pointer" }}
                  >
                    {addToList && addToList.name
                      ? addToList.name
                      : selectedList
                      ? String(selectedList.id) === ALL_LIST_ID
                        ? "Pilih list"
                        : selectedList.name
                      : "Pilih list"}
                  </button>
                  <input
                    ref={inputRef}
                    placeholder="+ Tambah tugas"
                    className="add-input"
                    style={{ paddingLeft: "15px" }}
                  />
                </form>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div className="list-section">
                <div className="list-header">Hari Ini</div>
                {todayList.length === 0 ? (
                  <div
                    className="task-row"
                    style={{ justifyContent: "center", color: "var(--muted)" }}
                  >
                    Belum ada tugas — tambahkan tugas baru
                  </div>
                ) : (
                  todayList.map((t) => (
                    <div
                      key={t.id}
                      ref={(el) => setItemRef(t.id, el)}
                      className={`task-row ${
                        deletingIds.includes(t.id) ? "deleting" : ""
                      }`}
                      style={
                        duePickerId === t.id
                          ? { position: "relative", zIndex: 1600 }
                          : undefined
                      }
                    >
                      <div className="task-left">
                        <div
                          className={`checkbox ${t.done ? "checked" : ""} ${
                            addedIds.includes(t.id) ? "added" : ""
                          } ${editedIds.includes(t.id) ? "edited" : ""} ${
                            deletingIds.includes(t.id) ? "deleting" : ""
                          }`}
                          onClick={() => toggleDone(t.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <svg
                            className="checkbox-svg"
                            viewBox="0 0 20 20"
                            width="20"
                            height="20"
                            aria-hidden="true"
                          >
                            <rect
                              className="box-rect"
                              x="1.5"
                              y="1.5"
                              width="17"
                              height="17"
                              rx="4"
                              ry="4"
                              fill="none"
                            />
                            <path
                              className="box-check"
                              d="M5 10.5 L8.2 13.5 L15 6.5"
                              fill="none"
                            />
                          </svg>
                        </div>
                        <InlineEditor
                          key={t.id + "-" + t.text}
                          value={t.text}
                          onChange={(v) => editTodo(t.id, v)}
                          displayClassName="task-text"
                          forceEdit={editingTaskId === t.id}
                          onEditingChange={(isEditing) => {
                            if (!isEditing) setEditingTaskId(null);
                          }}
                        />
                      </div>
                      <div className="task-actions">
                        <div
                          style={{
                            position: "relative",
                            display: "inline-block",
                          }}
                        >
                          <button
                            className="pill"
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerUp={(e) => {
                              e.stopPropagation();
                              setDuePickerId(t.id);
                              setDuePickerValue(
                                t.date || new Date().toISOString().slice(0, 10)
                              );
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDuePickerId(t.id);
                              setDuePickerValue(
                                t.date || new Date().toISOString().slice(0, 10)
                              );
                            }}
                            style={{
                              cursor: "pointer",
                              position: "relative",
                              zIndex: 1500,
                            }}
                          >
                            {t.when === "upcoming" ? "Mendatang" : "Hari ini"}
                          </button>

                          {duePickerId === t.id ? (
                            <div
                              ref={duePickerRef}
                              className="due-picker"
                              style={{
                                position: "absolute",
                                right: 0,
                                marginTop: 8,
                                zIndex: 1400,
                                pointerEvents: "auto",
                                background: "var(--panel-2)",
                                padding: 8,
                                borderRadius: 8,
                                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                                border: "1px solid rgba(255,255,255,0.03)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                                minWidth: 220,
                              }}
                            >
                              <div style={{ position: "relative" }}>
                                <input
                                  type="date"
                                  value={duePickerValue || ""}
                                  onChange={(e) =>
                                    setDuePickerValue(e.target.value)
                                  }
                                  style={{
                                    padding: "8px 34px 8px 10px",
                                    borderRadius: 6,
                                    border: "1px solid rgba(255,255,255,0.04)",
                                    background: "transparent",
                                    color: "var(--foreground)",
                                    width: "100%",
                                  }}
                                />
                                {/* calendar icon removed */}
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "flex-end",
                                  gap: 8,
                                }}
                              >
                                <button
                                  className="pill"
                                  onClick={() => {
                                    // save
                                    if (!duePickerValue) {
                                      // toggle fallback
                                      setTodos((s) =>
                                        s.map((it) =>
                                          it.id === t.id
                                            ? {
                                                ...it,
                                                when:
                                                  it.when === "upcoming"
                                                    ? "today"
                                                    : "upcoming",
                                              }
                                            : it
                                        )
                                      );
                                    } else {
                                      if (
                                        !/^\d{4}-\d{2}-\d{2}$/.test(
                                          duePickerValue
                                        )
                                      ) {
                                        showToast({
                                          type: "error",
                                          title: "Format salah",
                                          message: "Gunakan format YYYY-MM-DD.",
                                        });
                                        return;
                                      }
                                      const when =
                                        computeWhenFromDate(duePickerValue);
                                      setTodos((s) =>
                                        s.map((it) =>
                                          it.id === t.id
                                            ? {
                                                ...it,
                                                when,
                                                date: duePickerValue,
                                              }
                                            : it
                                        )
                                      );
                                    }

                                    setEditedIds((s) => [t.id, ...s]);
                                    setTimeout(
                                      () =>
                                        setEditedIds((s) =>
                                          s.filter((x) => x !== t.id)
                                        ),
                                      900
                                    );
                                    showToast({
                                      type: "success",
                                      title: "Tersimpan",
                                      message: "Status tugas diperbarui.",
                                    });
                                    setDuePickerId(null);
                                  }}
                                  style={{ padding: "6px 10px" }}
                                >
                                  Simpan
                                </button>
                                <button
                                  className="pill"
                                  onClick={() => setDuePickerId(null)}
                                  style={{
                                    padding: "6px 10px",
                                    background: "white",
                                    color: "#071022",
                                  }}
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="tag">{t.tag}</div>
                        <div className="icon" title="flag">
                          🚩
                        </div>
                        <div
                          className="icon"
                          onClick={() => {
                            setEditingTaskId(t.id);
                          }}
                          style={{ cursor: "pointer" }}
                          title="Edit"
                        >
                          ✏️
                        </div>
                        <div
                          className="icon"
                          style={{ cursor: "pointer" }}
                          onClick={() => requestDelete(t.id)}
                          title="Delete"
                        >
                          🗑️
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="divider" />

              <div className="list-section">
                <div className="list-header">Mendatang</div>
                {upcomingList.length === 0 ? (
                  <div
                    className="task-row"
                    style={{ justifyContent: "center", color: "var(--muted)" }}
                  >
                    Belum ada tugas mendatang
                  </div>
                ) : (
                  upcomingList.map((t) => (
                    <div
                      key={t.id}
                      ref={(el) => setItemRef(t.id, el)}
                      className={`task-row ${
                        deletingIds.includes(t.id) ? "deleting" : ""
                      }`}
                      style={
                        duePickerId === t.id
                          ? { position: "relative", zIndex: 1600 }
                          : undefined
                      }
                    >
                      <div className="task-left">
                        <div
                          className={`checkbox ${t.done ? "checked" : ""} ${
                            editedIds.includes(t.id) ? "edited" : ""
                          } ${deletingIds.includes(t.id) ? "deleting" : ""}`}
                          onClick={() => toggleDone(t.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <svg
                            className="checkbox-svg"
                            viewBox="0 0 20 20"
                            width="20"
                            height="20"
                            aria-hidden="true"
                          >
                            <rect
                              className="box-rect"
                              x="1.5"
                              y="1.5"
                              width="17"
                              height="17"
                              rx="4"
                              ry="4"
                              fill="none"
                            />
                            <path
                              className="box-check"
                              d="M5 10.5 L8.2 13.5 L15 6.5"
                              fill="none"
                            />
                          </svg>
                        </div>
                        <InlineEditor
                          key={t.id + "-" + t.text}
                          value={t.text}
                          onChange={(v) => editTodo(t.id, v)}
                          displayClassName="task-text"
                          forceEdit={editingTaskId === t.id}
                          onEditingChange={(isEditing) => {
                            if (!isEditing) setEditingTaskId(null);
                          }}
                        />
                      </div>
                      <div className="task-actions">
                        <div
                          style={{
                            position: "relative",
                            display: "inline-block",
                          }}
                        >
                          <button
                            className="pill"
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerUp={(e) => {
                              e.stopPropagation();
                              setDuePickerId(t.id);
                              setDuePickerValue(t.date || "");
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDuePickerId(t.id);
                              setDuePickerValue(t.date || "");
                            }}
                            style={{
                              cursor: "pointer",
                              position: "relative",
                              zIndex: 1500,
                            }}
                          >
                            {t.when === "upcoming" ? "Mendatang" : "Hari ini"}
                          </button>

                          {duePickerId === t.id ? (
                            <div
                              ref={duePickerRef}
                              className="due-picker"
                              style={{
                                position: "absolute",
                                right: 0,
                                marginTop: 8,
                                zIndex: 1400,
                                pointerEvents: "auto",
                                background: "var(--panel-2)",
                                padding: 8,
                                borderRadius: 8,
                                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                                border: "1px solid rgba(255,255,255,0.03)",
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                                minWidth: 220,
                              }}
                            >
                              <div style={{ position: "relative" }}>
                                <input
                                  type="date"
                                  value={duePickerValue || ""}
                                  onChange={(e) =>
                                    setDuePickerValue(e.target.value)
                                  }
                                  style={{
                                    padding: "8px 34px 8px 10px",
                                    borderRadius: 6,
                                    border: "1px solid rgba(255,255,255,0.04)",
                                    background: "transparent",
                                    color: "var(--foreground)",
                                    width: "100%",
                                  }}
                                />
                                {/* calendar icon removed */}
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "flex-end",
                                  gap: 8,
                                }}
                              >
                                <button
                                  className="pill"
                                  onClick={() => {
                                    // save
                                    if (!duePickerValue) {
                                      // toggle fallback
                                      setTodos((s) =>
                                        s.map((it) =>
                                          it.id === t.id
                                            ? {
                                                ...it,
                                                when:
                                                  it.when === "upcoming"
                                                    ? "today"
                                                    : "upcoming",
                                              }
                                            : it
                                        )
                                      );
                                    } else {
                                      if (
                                        !/^\d{4}-\d{2}-\d{2}$/.test(
                                          duePickerValue
                                        )
                                      ) {
                                        showToast({
                                          type: "error",
                                          title: "Format salah",
                                          message: "Gunakan format YYYY-MM-DD.",
                                        });
                                        return;
                                      }
                                      const when =
                                        computeWhenFromDate(duePickerValue);
                                      setTodos((s) =>
                                        s.map((it) =>
                                          it.id === t.id
                                            ? {
                                                ...it,
                                                when,
                                                date: duePickerValue,
                                              }
                                            : it
                                        )
                                      );
                                    }

                                    setEditedIds((s) => [t.id, ...s]);
                                    setTimeout(
                                      () =>
                                        setEditedIds((s) =>
                                          s.filter((x) => x !== t.id)
                                        ),
                                      900
                                    );
                                    showToast({
                                      type: "success",
                                      title: "Tersimpan",
                                      message: "Status tugas diperbarui.",
                                    });
                                    setDuePickerId(null);
                                  }}
                                  style={{ padding: "6px 10px" }}
                                >
                                  Simpan
                                </button>
                                <button
                                  className="pill"
                                  onClick={() => setDuePickerId(null)}
                                  style={{
                                    padding: "6px 10px",
                                    background: "white",
                                    color: "#071022",
                                  }}
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="tag">{t.tag}</div>
                        <div className="icon" title="flag">
                          🚩
                        </div>
                        <div
                          className="icon"
                          onClick={() => {
                            setEditingTaskId(t.id);
                          }}
                          style={{ cursor: "pointer" }}
                          title="Edit"
                        >
                          ✏️
                        </div>
                        <div
                          className="icon"
                          style={{ cursor: "pointer" }}
                          onClick={() => requestDelete(t.id)}
                          title="Delete"
                        >
                          🗑️
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="divider" />

              <div id="done-section" className="list-section">
                <div className="list-header">Selesai</div>
                {doneList.length === 0 ? (
                  <div
                    className="task-row"
                    style={{ justifyContent: "center", color: "var(--muted)" }}
                  >
                    Belum ada tugas selesai
                  </div>
                ) : (
                  doneList.map((t) => (
                    <div
                      key={t.id}
                      ref={(el) => setItemRef(t.id, el)}
                      className={`task-row ${
                        deletingIds.includes(t.id) ? "deleting" : ""
                      }`}
                    >
                      <div className="task-left">
                        <div
                          className={`checkbox ${t.done ? "checked" : ""} ${
                            editedIds.includes(t.id) ? "edited" : ""
                          } ${deletingIds.includes(t.id) ? "deleting" : ""}`}
                          onClick={() => toggleDone(t.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <svg
                            className="checkbox-svg"
                            viewBox="0 0 20 20"
                            width="20"
                            height="20"
                            aria-hidden="true"
                          >
                            <rect
                              className="box-rect"
                              x="1.5"
                              y="1.5"
                              width="17"
                              height="17"
                              rx="4"
                              ry="4"
                              fill="none"
                            />
                            <path
                              className="box-check"
                              d="M5 10.5 L8.2 13.5 L15 6.5"
                              fill="none"
                            />
                          </svg>
                        </div>
                        <InlineEditor
                          key={t.id + "-done-" + t.text}
                          value={t.text}
                          onChange={(v) => editTodo(t.id, v)}
                          forceEdit={editingTaskId === t.id}
                          onEditingChange={(isEditing) => {
                            if (!isEditing) setEditingTaskId(null);
                          }}
                          displayClassName={"task-text done"}
                        />
                      </div>
                      <div className="task-actions">
                        <div className="pill">
                          {t.when === "upcoming" ? "Mendatang" : "Hari ini"}
                        </div>
                        <div className="tag">{t.tag}</div>
                        <div className="icon" title="flag">
                          🚩
                        </div>
                        <div
                          className="icon"
                          onClick={() => {
                            setEditingTaskId(t.id);
                          }}
                          title="Edit"
                        >
                          ✏️
                        </div>
                        <div
                          className="icon"
                          onClick={() => requestDelete(t.id)}
                          title="Delete"
                        >
                          🗑️
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Confirm delete modal (dark themed, checkbox with X icon) */}
      {confirmDeleteId ? (
        <div
          className="toast-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cancelConfirm();
          }}
          style={{
            display: "grid",
            placeItems: "center",
            zIndex: 1200,
            background: "rgba(0,0,0,0.45)",
          }}
        >
          <div
            className="toast-modal"
            role="dialog"
            aria-modal="true"
            ref={modalRef}
            style={{
              width: 520,
              maxWidth: "92%",
              padding: 22,
              textAlign: "center",
              background: "#0b1220",
              color: "#e6eef8",
              borderRadius: 8,
              boxShadow: "0 18px 50px rgba(2,6,23,0.6)",
              transform: "translateY(6px) scale(0.98)",
              animation: "modalIn 220ms cubic-bezier(.2,.9,.2,1) forwards",
            }}
          >
            <style>{`@keyframes modalIn { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  border: "6px solid rgba(249,115,22,0.08)",
                  marginBottom: 12,
                  background: "rgba(249,115,22,0.02)",
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#f97316"
                    strokeWidth="1.4"
                    fill="transparent"
                    opacity="0.12"
                  />
                  <path
                    d="M12 7v6"
                    stroke="#f97316"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="17.2" r="0.9" fill="#f97316" />
                </svg>
              </div>
            </div>

            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
              Yakin ingin menghapus?
            </div>
            <div style={{ color: "#9fb0c9", marginBottom: 16 }}>
              Tugas ini tidak bisa dikembalikan!
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setConfirmChecked((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setConfirmChecked((v) => !v);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 10,
                    background: confirmChecked
                      ? "linear-gradient(180deg,#071426,#0f1724)"
                      : "#071028",
                    border: confirmChecked
                      ? "2px solid rgba(245,69,64,0.12)"
                      : "2px solid rgba(255,255,255,0.04)",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: confirmChecked
                      ? "inset 0 0 0 3px rgba(245,69,64,0.04)"
                      : "none",
                    transition:
                      "transform 160ms ease, background 180ms ease, box-shadow 180ms ease",
                    transform: confirmChecked ? "scale(1.06)" : "scale(1)",
                  }}
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g style={{ transformOrigin: "50% 50%" }}>
                      <path
                        d="M6 6L18 18"
                        stroke="#ff6b6b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          opacity: confirmChecked ? 1 : 0,
                          transform: confirmChecked ? "scale(1)" : "scale(0.6)",
                          transition:
                            "opacity 220ms ease, transform 220ms ease",
                        }}
                      />
                      <path
                        d="M6 18L18 6"
                        stroke="#ff6b6b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          opacity: confirmChecked ? 1 : 0,
                          transform: confirmChecked ? "scale(1)" : "scale(0.6)",
                          transition:
                            "opacity 260ms ease 40ms, transform 260ms ease 40ms",
                        }}
                      />
                    </g>
                  </svg>
                </div>
                <div style={{ color: "#e6eef8", fontSize: 15 }}>
                  Centang untuk konfirmasi penghapusan
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="pill"
                onClick={cancelConfirm}
                disabled={confirmLoading}
                style={{
                  background: "white",
                  color: "#071022",
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                Batal
              </button>
              <button
                className="pill"
                onClick={confirmDelete}
                disabled={!confirmChecked || confirmLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background:
                    !confirmChecked || confirmLoading ? "#334155" : "#ef4444",
                  color: "white",
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: "none",
                }}
              >
                {confirmLoading ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 50 50"
                    style={{ animation: "spin 900ms linear infinite" }}
                  >
                    <circle
                      cx="25"
                      cy="25"
                      r="20"
                      stroke="#fff"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray="100"
                      strokeDashoffset="60"
                    />
                  </svg>
                ) : (
                  "Ya, Hapus!"
                )}
                <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? (
        <div className="toast-overlay">
          <div
            className={`toast-modal ${
              toast.type === "success" ? "success" : ""
            } ${toastHiding ? "hide" : ""}`}
          >
            <div className="toast-icon">
              <svg
                className="check-svg"
                viewBox="0 0 64 64"
                aria-hidden="true"
                style={{ color: "#10b981" }}
              >
                <circle className="check-circle" cx="32" cy="32" r="28" />
                <path className="check-mark" d="M18 34 L28 44 L46 22" />
              </svg>
            </div>
            <div className="toast-title">{toast.title}</div>
            <div className="toast-desc">{toast.message}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
