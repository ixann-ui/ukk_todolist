"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "../register/auth.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({ visible: false, type: "", message: "" });
  const [showPassword, setShowPassword] = useState(false);
  // prefill from storage if user already saved
  useEffect(() => {
    try {
      const raw =
        localStorage.getItem("user") || sessionStorage.getItem("user");
      if (raw) {
        // already logged in -> redirect to app
        router.push("/");
      }
    } catch (e) {}
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const contentType = res.headers.get("content-type") || "";
      let data;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const txt = await res.text();
        throw new Error(
          `Unexpected response from server: ${txt.slice(0, 200)}`
        );
      }
      if (!res.ok)
        throw new Error(data.error || data.message || "Login failed");

      // Store user according to "remember" checkbox
      try {
        if (remember) {
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          sessionStorage.setItem("user", JSON.stringify(data.user));
        }
        // Remove any global anonymous storage so previous local-only tasks
        // don't leak into this authenticated session.
        try {
          localStorage.removeItem("todos_v1");
          localStorage.removeItem("lists_v1");
          localStorage.removeItem("selected_list_v1");
          sessionStorage.removeItem("todos_v1");
          sessionStorage.removeItem("lists_v1");
          sessionStorage.removeItem("selected_list_v1");
        } catch (e) {}
      } catch (e) {}

      // Show success checkbox/modal then redirect to app home. Delay
      // notifying the rest of the app until after the modal has shown so
      // the login page isn't immediately unmounted and the modal stays visible.
      setAlert({ visible: true, type: "success", message: "Berhasil masuk" });
      setLoading(false);
      setTimeout(() => {
        try {
          router.push("/");
        } catch (e) {}
        try {
          window.dispatchEvent(
            new CustomEvent("auth:changed", { detail: { user: data.user } })
          );
        } catch (e) {}
      }, 1200);
    } catch (err) {
      console.error("Login error:", err);
      const raw = err.message || "Username atau password salah";
      // map common backend messages to friendly Indonesian text
      function mapLoginError(msg) {
        const m = (msg || "").toLowerCase();
        if (
          m.includes("not found") ||
          m.includes("no user") ||
          (m.includes("user") && m.includes("not"))
        )
          return "Pengguna tidak ditemukan";
        if (
          m.includes("password") &&
          (m.includes("invalid") ||
            m.includes("wrong") ||
            m.includes("incorrect"))
        )
          return "Password salah";
        if (m.includes("email") && m.includes("invalid"))
          return "Format email tidak valid";
        return msg;
      }

      const message = mapLoginError(raw);
      setError(message);
      setAlert({ visible: true, type: "error", message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.title}>Login ke To-Do List App</div>
          <div className={styles.subtitle}>
            Kelola tugas kamu dengan efisien.
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {alert.visible && (
            <div
              className="toast-overlay"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget)
                  setAlert({ visible: false, type: "", message: "" });
              }}
              style={{
                display: "grid",
                placeItems: "center",
                zIndex: 1200,
                background: "rgba(0,0,0,0.45)",
              }}
            >
              <div
                className={`toast-modal`}
                role="dialog"
                aria-modal="true"
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
                {alert.type === "error" ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <div
                        className="alert-icon"
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
                          className="error-x"
                          width="36"
                          height="36"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden
                        >
                          <path d="M6 6L18 18" />
                          <path d="M6 18L18 6" />
                        </svg>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        marginBottom: 6,
                        color: "#e6eef8",
                      }}
                    >
                      Login Gagal
                    </div>
                    <div style={{ color: "#9fb0c9", marginBottom: 14 }}>
                      {alert.message}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        justifyContent: "center",
                      }}
                    >
                      <button
                        className="pill"
                        onClick={() =>
                          setAlert({ visible: false, type: "", message: "" })
                        }
                        style={{
                          background: "#071022",
                          color: "#d1d9e6",
                          padding: "8px 18px",
                          borderRadius: 6,
                          border: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        Tutup
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    className={`toast-modal success`}
                    style={{ pointerEvents: "auto", minWidth: 280 }}
                  >
                    <div className="toast-icon">
                      <svg
                        className="check-svg"
                        viewBox="0 0 64 64"
                        aria-hidden="true"
                        style={{ color: "#10b981" }}
                      >
                        <circle
                          className="check-circle"
                          cx="32"
                          cy="32"
                          r="28"
                        />
                        <path className="check-mark" d="M18 34 L28 44 L46 22" />
                      </svg>
                    </div>
                    <div className="toast-title">Berhasil!</div>
                    <div className="toast-desc">{alert.message}</div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div>
            <div className={styles.label}>Alamat Email</div>
            <input
              className={styles.input}
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputWrapper}>
            <div className={styles.label}>Password/Kata sandi</div>
            <input
              className={styles.input}
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              className={styles.pwToggle}
              onClick={() => setShowPassword((s) => !s)}
              aria-label={
                showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
              }
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M2 2l20 20"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4.55 4.55A16.9 16.9 0 0 1 12 3c7 0 11 7 11 7a21.4 21.4 0 0 1-4.11 5.17"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className={styles.controls}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Ingat saya
            </label>
          </div>

          <button className={styles.button} type="submit">
            Masuk
          </button>
        </form>

        <div className={styles.smallLink}>
          Belum punya akun? <Link href="/register">Daftar disini yaa</Link>
        </div>
      </div>
    </main>
  );
}
