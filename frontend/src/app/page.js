"use client";

import { useEffect, useState } from "react";
import TodoApp from "../components/TodoApp";
import LoginPage from "./login/page";

export default function Page() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        // Defer setState to avoid synchronous setState inside effect (prevent lint warning)
        setTimeout(() => setUser(parsed), 0);
      } else {
        setTimeout(() => setUser(null), 0);
      }
    } catch (e) {
      setTimeout(() => setUser(null), 0);
    }
  }, []);

  // Listen for auth changes (e.g., login) so we can update immediately
  useEffect(() => {
    function onAuthChanged(e) {
      try {
        const u = e && e.detail && e.detail.user;
        if (u) setUser(u);
        else setUser(null);
      } catch (err) {
        setUser(null);
      }
    }

    window.addEventListener("auth:changed", onAuthChanged);
    return () => window.removeEventListener("auth:changed", onAuthChanged);
  }, []);

  // If user exists (after mount), show the todo app; otherwise show login page.
  return user ? <TodoApp /> : <LoginPage />;
}
