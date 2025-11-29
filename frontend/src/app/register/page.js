"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../register/auth.module.css";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({ visible: false, type: "", message: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi tidak cocok");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
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
        throw new Error(data.error || data.message || "Register failed");

      // success -> show success checkbox then redirect to login
      setAlert({
        visible: true,
        type: "success",
        message: "Berhasil membuat akun",
      });
      setLoading(false);
      setTimeout(() => {
        try {
          // Ensure any previously-stored user is removed so the login
          // page does not auto-redirect to the app home. Also remove any
          // global anonymous todos/lists so they don't show up after the
          // user later logs in.
          localStorage.removeItem("user");
          sessionStorage.removeItem("user");
          localStorage.removeItem("todos_v1");
          localStorage.removeItem("lists_v1");
          localStorage.removeItem("selected_list_v1");
          sessionStorage.removeItem("todos_v1");
          sessionStorage.removeItem("lists_v1");
          sessionStorage.removeItem("selected_list_v1");
        } catch (e) {}
        router.push("/login");
      }, 1400);
    } catch (err) {
      console.error("Register error:", err);
      const message = err.message || "Terjadi kesalahan saat mendaftar";
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
          <div className={styles.title}>
            <h2>Buat akun baru kamu</h2>
          </div>
          <div className={styles.subtitle}>
            Bergabung dan mulai mengelola tugas kamu dengan mudah.
          </div>
        </div>

        {/* Centered dark modal style alert (reuses .toast-overlay/.toast-modal) */}
        {alert.visible && (
          <div
            className="toast-overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && alert.type === "error") {
                setAlert({ visible: false, type: "", message: "" });
              }
            }}
          >
            <div
              className={`toast-modal ${
                alert.type === "success" ? "success" : ""
              }`}
              role="dialog"
              aria-modal="true"
              style={{ textAlign: "center" }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    border:
                      alert.type === "success"
                        ? "6px solid rgba(16,185,129,0.06)"
                        : "6px solid rgba(249,115,22,0.06)",
                    marginBottom: 12,
                    background:
                      alert.type === "success"
                        ? "rgba(16,185,129,0.02)"
                        : "rgba(249,115,22,0.02)",
                  }}
                >
                  {alert.type === "success" ? (
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M6 6L18 18"
                        stroke="#ff6b6b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6 18L18 6"
                        stroke="#ff6b6b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                {alert.type === "success"
                  ? "Berhasil membuat akun"
                  : "Terjadi kesalahan"}
              </div>
              <div style={{ color: "var(--muted)", marginBottom: 14 }}>
                {alert.message}
              </div>

              {alert.type === "error" ? (
                <div
                  style={{ display: "flex", justifyContent: "center", gap: 8 }}
                >
                  <button
                    className="pill"
                    onClick={() =>
                      setAlert({ visible: false, type: "", message: "" })
                    }
                    style={{ padding: "8px 16px" }}
                  >
                    Tutup
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <div className={styles.label}>Username</div>
            <input
              className={styles.input}
              type="text"
              placeholder="Username kamu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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

          <div style={{ position: "relative" }}>
            <div className={styles.label}>Konfirmasi Password</div>
            <input
              className={styles.input}
              type={showPassword ? "text" : "password"}
              placeholder="Ketik ulang kata sandi"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ paddingRight: 40 }}
            />
            <div
              style={{
                position: "absolute",
                right: 10,
                top: 36,
                color: "var(--muted)",
              }}
            >
              {confirmPassword.length > 0 ? (
                password === confirmPassword ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                  >
                    <path
                      d="M18.36 5.64L5.64 18.36"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.64 5.64L18.36 18.36"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )
              ) : (
                ""
              )}
            </div>
          </div>

          <button className={styles.button} type="submit">
            Buat Akun
          </button>
        </form>

        <div className={styles.smallLink}>
          Sudah punya akun ya? <Link href="/login">Masuk sini</Link>
        </div>
      </div>
    </main>
  );
}
