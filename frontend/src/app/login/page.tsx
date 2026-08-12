"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/* ── constants ───────────────────────────────────────── */
const DAYS   = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

/* ── Jasa Marga Logo SVG ─────────────────────────────── */
function JasaMargaLogo() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Jasa Marga Logo"
    >
      {/* Circular ring */}
      <circle cx="50" cy="50" r="46" stroke="#FFCB05" strokeWidth="8" fill="none" />
      {/* Inner road / highway symbol */}
      <path
        d="M30 72 Q50 20 70 72"
        stroke="#FFCB05"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      {/* Center divider */}
      <line x1="50" y1="30" x2="50" y2="72" stroke="#FFCB05" strokeWidth="3" strokeDasharray="5 4" strokeLinecap="round" />
    </svg>
  );
}

/* ── eye icon ────────────────────────────────────────── */
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

/* ── main component ──────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();

  const [now,      setNow]      = useState<Date | null>(null);
  const [mounted,  setMounted]  = useState(false);
  const [id,       setId]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [shake,    setShake]    = useState(false);

  /* clock */
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const day  = now ? DAYS[now.getDay()]   : "";
  const date = now ? `${day}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}` : "";
  const time = now ? now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "──:──:──";

  /* login handler */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!id.trim() || !password.trim()) {
      setError("ID Petugas dan Password harus diisi.");
      triggerShake();
      return;
    }

    setLoading(true);
    // Simulate auth — replace with real API call
    await new Promise((r) => setTimeout(r, 900));

    // Demo: accept any non-empty credentials
    if (id.trim() && password.trim()) {
      // Store a session flag
      sessionStorage.setItem("jm_auth", "true");
      sessionStorage.setItem("jm_user", id);
      router.push("/");
    } else {
      setError("ID atau Password salah. Coba lagi.");
      triggerShake();
      setLoading(false);
    }
  };

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { font-family: 'Inter', system-ui, sans-serif; }

        .login-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #F0F4F8;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* ── header ──────────────────── */
        .login-header {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          padding: 0 75px;
          height: 100px;
          background: #0D63A5;
          position: relative;
          z-index: 10;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .login-header { padding: 0 24px; height: 70px; }
        }

        /* ── footer ──────────────────── */
        .login-footer {
          height: 60px;
          background: #0D63A5;
          flex-shrink: 0;
          position: relative;
          z-index: 10;
        }
        @media (max-width: 768px) {
          .login-footer { height: 40px; }
        }

        /* ── background image ─────────── */
        .login-bg {
          position: absolute;
          inset: 100px 0 60px 0;
          background-image: url('/toll_gate_bg.png');
          background-size: cover;
          background-position: center left;
          opacity: 0.25;
          pointer-events: none;
        }
        @media (max-width: 768px) {
          .login-bg { inset: 70px 0 40px 0; }
        }

        /* ── body (between header & footer) ── */
        .login-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 5;
          padding: 40px 24px;
        }

        /* ── card ─────────────────────── */
        .login-card {
          background: rgba(244, 246, 250, 0.95);
          border-radius: 16px;
          padding: 48px 52px 40px;
          width: 100%;
          max-width: 380px;
          box-shadow:
            0 4px 24px rgba(13, 99, 165, 0.12),
            0 1px 4px rgba(0,0,0,0.06);
          border: 1px solid rgba(13, 99, 165, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .login-card:hover {
          box-shadow:
            0 8px 40px rgba(13, 99, 165, 0.18),
            0 2px 8px rgba(0,0,0,0.08);
        }
        @media (max-width: 480px) {
          .login-card { padding: 36px 28px 32px; }
        }

        /* shake animation */
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        .card-shake { animation: shake 0.55s ease; }

        /* card title */
        .card-title {
          text-align: center;
          font-size: 1.75rem;
          font-weight: 700;
          color: #0D63A5;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }
        .card-subtitle {
          text-align: center;
          font-size: 0.875rem;
          color: #64748b;
          margin-bottom: 32px;
        }

        /* ── form elements ─────────────── */
        .form-group {
          margin-bottom: 20px;
        }
        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #0D63A5;
          margin-bottom: 8px;
        }
        .form-input-wrap {
          position: relative;
        }
        .form-input {
          width: 100%;
          height: 46px;
          border: 1.5px solid #d0daea;
          border-radius: 8px;
          padding: 0 14px;
          font-size: 0.9rem;
          color: #1e3a6e;
          background: #ffffff;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .form-input::placeholder { color: #a9b8cc; }
        .form-input:focus {
          border-color: #0D63A5;
          box-shadow: 0 0 0 3px rgba(13,99,165,0.12);
        }
        .form-input.has-eye { padding-right: 46px; }

        /* eye toggle */
        .eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.2s;
        }
        .eye-btn:hover { color: #0D63A5; }

        /* ── error ─────────────────────── */
        .form-error {
          background: #fff0f0;
          border: 1px solid #fca5a5;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.8rem;
          color: #dc2626;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── login button ──────────────── */
        .login-btn {
          width: 100%;
          height: 48px;
          background: #1e3a6e;
          color: #ffffff;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          letter-spacing: 0.3px;
          margin-top: 8px;
          position: relative;
          overflow: hidden;
          font-family: inherit;
        }
        .login-btn:hover:not(:disabled) {
          background: #0D63A5;
          box-shadow: 0 4px 16px rgba(13,99,165,0.35);
          transform: translateY(-1px);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        /* loading spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 20px; height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
          vertical-align: middle;
        }

        /* ── divider ───────────────────── */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 24px;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: #d0daea;
        }
        .divider-text {
          font-size: 0.7rem;
          color: #94a3b8;
          white-space: nowrap;
        }

        /* ── header time ───────────────── */
        .header-time {
          text-align: right;
          line-height: 1.2;
        }
        .header-date {
          font-size: 0.875rem;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: 0.2px;
        }
        .header-clock {
          font-size: 1.75rem;
          font-weight: 800;
          color: #FFCB05;
          font-variant-numeric: tabular-nums;
          letter-spacing: 1px;
        }
        @media (max-width: 768px) {
          .header-date { font-size: 0.75rem; }
          .header-clock { font-size: 1.2rem; }
        }

        /* fade-in */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s ease-out forwards; }
      `}</style>

      <div className="login-root">
        {/* ── HEADER ── */}
        <header className="login-header">
          {/* Logo */}
          <div style={{ flexShrink: 0 }}>
            <JasaMargaLogo />
          </div>

          {/* Date + Time */}
          <div className="header-time" suppressHydrationWarning>
            <div className="header-date" suppressHydrationWarning>
              {mounted ? date : ""}
            </div>
            <div className="header-clock" suppressHydrationWarning>
              {time}
            </div>
          </div>
        </header>

        {/* ── BACKGROUND IMAGE ── */}
        <div className="login-bg" aria-hidden="true" />

        {/* ── BODY ── */}
        <main className="login-body">
          <div className={`login-card fade-up ${shake ? "card-shake" : ""}`}>
            {/* Title */}
            <h1 className="card-title">Login Petugas</h1>
            <p className="card-subtitle">Masukan ID dan Password anda</p>

            {/* Error message */}
            {error && (
              <div className="form-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} noValidate>
              {/* ID Petugas */}
              <div className="form-group">
                <label htmlFor="login-id" className="form-label">
                  ID Petugas
                </label>
                <div className="form-input-wrap">
                  <input
                    id="login-id"
                    type="text"
                    className="form-input"
                    placeholder="Masukan ID Petugas"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
                <div className="form-input-wrap">
                  <input
                    id="login-password"
                    type={showPwd ? "text" : "password"}
                    className="form-input has-eye"
                    placeholder="Masukan Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? "Sembunyikan password" : "Tampilkan password"}
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPwd} />
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                id="login-submit-btn"
                type="submit"
                className="login-btn"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : "Login"}
              </button>
            </form>

            {/* Divider */}
            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">Sistem Klasifikasi Kendaraan</span>
              <div className="divider-line" />
            </div>
          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer className="login-footer" />
      </div>
    </>
  );
}
