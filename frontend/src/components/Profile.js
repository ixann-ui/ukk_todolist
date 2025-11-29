"use client";

import { useEffect, useState } from "react";
import { storageKeyFor, listsKeyFor } from "./todoUtils";

export default function Profile() {
  const [todos, setTodos] = useState([]);
  const [lists, setLists] = useState([]);

  const openCompleted = () => {
    try {
      // Ensure app theme becomes dark and navigate to completed tasks view.
      localStorage.setItem("theme", "dark");
      // use a short timeout to ensure theme/storage have applied before navigation
      setTimeout(() => {
        try {
          // Dispatch navigation event so the in-app TodoApp handles showing
          // the completed timeline (original behavior before route push).
          try {
            window.dispatchEvent(new CustomEvent("navigate:done"));
          } catch (e) {}
        } catch (e) {}
      }, 40);
    } catch (e) {}
  };

  useEffect(() => {
    try {
      const rawUser =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      let userId = null;
      try {
        if (rawUser) userId = JSON.parse(rawUser).id;
      } catch (e) {}

      const storageKey = storageKeyFor(userId);
      const listsKey = listsKeyFor(userId);

      const raw = localStorage.getItem(storageKey);
      if (raw) setTimeout(() => setTodos(JSON.parse(raw) || []), 0);
      else setTimeout(() => setTodos([]), 0);

      const rawLists = localStorage.getItem(listsKey);
      if (rawLists) setTimeout(() => setLists(JSON.parse(rawLists) || []), 0);
      else setTimeout(() => setLists([]), 0);
    } catch (e) {
      setTimeout(() => setTodos([]), 0);
      setTimeout(() => setLists([]), 0);
    }
  }, []);

  const completed = (todos || []).filter((t) => !!t.done).length;
  const pending = (todos || []).filter((t) => !t.done).length;

  return (
    <div className="profile-content" style={{ padding: 0 }}>
      <h1 className="page-title">Ringkasan Tugas</h1>

      <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
        <div
          role="button"
          onClick={openCompleted}
          style={{
            cursor: "pointer",
            flex: 1,
            borderRadius: 10,
            padding: 18,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(180deg,#173f2a,#0e2b1c)",
            color: "#e6f9ef",
            boxShadow: "0 8px 30px rgba(4,8,6,0.6)",
            border: "1px solid rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, fontWeight: 800 }}>{completed}</div>
            <div style={{ marginTop: 6, color: "rgba(230,249,239,0.9)" }}>
              Tugas Selesai
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            borderRadius: 10,
            padding: 18,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(180deg,#4a2020,#3a1414)",
            color: "#fdecec",
            boxShadow: "0 8px 30px rgba(12,6,6,0.6)",
            border: "1px solid rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, fontWeight: 800 }}>{pending}</div>
            <div style={{ marginTop: 6, color: "rgba(253,236,236,0.95)" }}>
              Tugas Tertunda
            </div>
          </div>
        </div>
      </div>

      <div className="content-card" style={{ padding: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
          List Saya
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lists && lists.length > 0 ? (
            lists.map((l) => (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 8,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                  border: "1px solid rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ color: "var(--foreground)", fontWeight: 600 }}>
                  {l.name}
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    title="Edit"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      display: "grid",
                      placeItems: "center",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.03)",
                      color: "var(--foreground)",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      const newName = prompt("Edit list", l.name);
                      if (newName === null) return;
                      try {
                        const rawUser =
                          localStorage.getItem("user") ||
                          sessionStorage.getItem("user");
                        let userId = null;
                        try {
                          if (rawUser) userId = JSON.parse(rawUser).id;
                        } catch (e) {}
                        const listsKey = listsKeyFor(userId);

                        const raw = localStorage.getItem(listsKey) || "[]";
                        const parsed = JSON.parse(raw) || [];
                        const mapped = parsed.map((it) =>
                          String(it.id) === String(l.id)
                            ? { ...it, name: newName }
                            : it
                        );
                        localStorage.setItem(listsKey, JSON.stringify(mapped));
                        setLists(mapped);
                        try {
                          window.dispatchEvent(
                            new CustomEvent("lists:changed", {
                              detail: { lists: mapped, updatedId: l.id },
                            })
                          );
                        } catch (e) {}
                      } catch (e) {}
                    }}
                  >
                    ✏️
                  </button>

                  <button
                    title="Delete"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      display: "grid",
                      placeItems: "center",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.03)",
                      color: "var(--foreground)",
                      cursor: "pointer",
                    }}
                    onClick={async () => {
                      if (!confirm("Hapus list ini?")) return;
                      // Prefer server-side delete for numeric IDs
                      const API_URL =
                        typeof window !== "undefined"
                          ? process.env.NEXT_PUBLIC_API_URL ||
                            "http://localhost:5000"
                          : "http://localhost:5000";

                      const isNumericId = /^\d+$/.test(String(l.id));

                      if (isNumericId) {
                        try {
                          const res = await fetch(
                            `${API_URL}/api/lists/${l.id}`,
                            {
                              method: "DELETE",
                            }
                          );
                          if (!res.ok) {
                            const txt = await res.text();
                            throw new Error(
                              txt || res.statusText || "Delete failed"
                            );
                          }
                          // Success on server: also remove from localStorage + state
                        } catch (err) {
                          console.error("Failed to delete list on server", err);
                          // Inform user and fall back to local-only removal
                          if (
                            !confirm(
                              "Gagal menghapus di server. Hapus secara lokal saja?"
                            )
                          )
                            return;
                        }
                      }

                      try {
                        const rawUser =
                          localStorage.getItem("user") ||
                          sessionStorage.getItem("user");
                        let userId = null;
                        try {
                          if (rawUser) userId = JSON.parse(rawUser).id;
                        } catch (e) {}
                        const listsKey = listsKeyFor(userId);

                        const raw = localStorage.getItem(listsKey) || "[]";
                        const parsed = JSON.parse(raw) || [];
                        const filtered = parsed.filter(
                          (it) => String(it.id) !== String(l.id)
                        );
                        localStorage.setItem(
                          listsKey,
                          JSON.stringify(filtered)
                        );
                        setLists(filtered);
                        try {
                          window.dispatchEvent(
                            new CustomEvent("lists:changed", {
                              detail: { lists: filtered, removedId: l.id },
                            })
                          );
                        } catch (e) {}
                      } catch (e) {}
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: "var(--muted)", padding: 12 }}>
              Belum ada list — tambahkan list di halaman utama
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
