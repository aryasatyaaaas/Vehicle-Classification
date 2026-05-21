"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import TollHeader    from "@/components/TollHeader";
import CameraView    from "@/components/CameraView";
import GolonganModal from "@/components/GolonganModal";
import type { Detection, WsPayload } from "@/components/CameraView";
import tollGatesData from "@/app/toll-gates.json";

// Selalu gunakan path relatif — nginx (production) dan next.config rewrites (dev)
// akan meneruskan /api/* ke backend. Tidak bergantung pada env variable.
const REST_URL = "/api";
const DEFAULT_GERBANG = "GT Kalikangkung";

// Cari pintu keluar terdekat berdasarkan nama pintu masuk
const ALL_GATES = (tollGatesData as {province:string; gates:{name:string; exit:string}[]}[])
  .flatMap(pg => pg.gates);
function findExit(gateName: string): string {
  return ALL_GATES.find(g => g.name === gateName)?.exit || "-";
}

/* ── Types ── */
type AppState = "idle" | "detected" | "stabilizing" | "selection" | "paying" | "success" | "cooldown";

const GOLONGAN_NAMES: Record<number, string> = {
  0: "Golongan I",
  1: "Golongan II",
  2: "Golongan III",
  3: "Golongan IV",
  4: "Golongan V",
};

/* ── Check icon ── */
function CheckIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="36" fill="#00AC1A" opacity="0.15"/>
      <circle cx="36" cy="36" r="28" fill="#00AC1A"/>
      <path d="M22 36l10 10 18-18" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Spinner ── */
function Spinner() {
  return (
    <div style={{
      width: 60, height: 60,
      border: "5px solid rgba(13,99,165,0.15)",
      borderTopColor: "#0D63A5",
      borderRadius: "50%",
      animation: "dashSpin 0.8s linear infinite",
    }} />
  );
}

/* ── Stability progress bar ── */
function StabilityBar({ count, max }: { count: number; max: number }) {
  const pct      = Math.min((count / max) * 100, 100);
  const isStable = count >= max;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
      }}>
        <span style={{ color: isStable ? "#16a34a" : "#f59e0b" }}>
          {isStable ? "✓ Kendaraan Stabil — Menganalisis..." : "Menunggu kendaraan berhenti..."}
        </span>
        <span style={{ color: "#64748b" }}>{count}/{max}</span>
      </div>
      <div style={{
        height: 8, borderRadius: 4, background: "#e2e8f0", overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 4,
          background: isStable
            ? "linear-gradient(90deg, #16a34a, #22c55e)"
            : "linear-gradient(90deg, #f59e0b, #fbbf24)",
          transition: "width 0.2s ease, background 0.3s ease",
        }} />
      </div>
    </div>
  );
}

/* ── Scan animation lines (saat stabilizing) ── */
function ScanLines() {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 15, pointerEvents: "none", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", left: 0, right: 0, height: 3,
        background: "linear-gradient(90deg, transparent, #22c55e, transparent)",
        animation: "scanLine 1.8s ease-in-out infinite",
        boxShadow: "0 0 8px #22c55e",
      }} />
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();

  /* ── Auth Guard ── */
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const auth = sessionStorage.getItem("jm_auth");
    if (!auth) { router.replace("/login"); }
    else        { setAuthChecked(true); }
  }, [router]);

  /* ── State Machine ── */
  const [appState,      setAppState]      = useState<AppState>("idle");
  const [detections,    setDetections]    = useState<Detection[]>([]);
  const [lockedDet,     setLockedDet]     = useState<Detection | null>(null);
  const [golonganId,    setGolonganId]    = useState<number | null>(null);
  const [stabilityCount, setStabilityCount] = useState(0);
  const [stabilityMax,   setStabilityMax]   = useState(5);
  const [isCapturing,    setIsCapturing]    = useState(false);
  const [selectedGerbang, setSelectedGerbang] = useState(DEFAULT_GERBANG);

  const stateRef      = useRef<AppState>("idle");
  const detTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { stateRef.current = appState; }, [appState]);

  /* ── Handle WS detections ── */
  const handleDetections = useCallback((payload: WsPayload) => {
    const { detections: dets, stability_count, stable, stability_max } = payload;

    setDetections(dets);
    setStabilityCount(stability_count);
    setStabilityMax(stability_max);

    if (stateRef.current === "cooldown") {
      if (dets.length === 0) setAppState("idle");
      return;
    }

    // Hanya proses saat idle, detected, atau stabilizing
    if (
      stateRef.current !== "idle" &&
      stateRef.current !== "detected" &&
      stateRef.current !== "stabilizing"
    ) return;

    if (dets.length > 0) {
      const top = dets[0];

      if (stateRef.current === "idle") {
        setAppState("detected");
      }

      // Update lockedDet agar info terbaru tampil
      // Saat selection (modal terbuka): hanya update plate_number jika baru datang
      const curState = stateRef.current as AppState;
      if (curState !== "paying" && curState !== "success") {
        if (curState === "selection") {
          // Modal sudah terbuka — hanya update plate_number agar muncul di modal
          if (top.plate_number) {
            setLockedDet((prev) => prev ? { ...prev, plate_number: top.plate_number } : top);
          }
        } else {
          setLockedDet(top);
        }
      }

      // Saat kendaraan stabil → masuk state stabilizing
      if (stable && stateRef.current === "detected") {
        setAppState("stabilizing");
      }

      // Saat kendaraan stabil → buka modal (TIDAK tunggu plate OCR selesai)
      // Plate number akan update otomatis di modal saat OCR selesai
      if (stable && stateRef.current === "stabilizing") {
        if (!detTimerRef.current) {
          detTimerRef.current = setTimeout(() => {
            detTimerRef.current = null;
            if (stateRef.current === "stabilizing") {
              setAppState("selection");
            }
          }, 600);
        }
      }
    } else {
      // Frame kosong — reset
      if (detTimerRef.current) { clearTimeout(detTimerRef.current); detTimerRef.current = null; }
      const s = stateRef.current as AppState;
      if (
        s === "detected" ||
        s === "stabilizing" ||
        s === "cooldown"
      ) {
        setAppState("idle");
        setLockedDet(null);
        setStabilityCount(0);
      }
    }
  }, []);

  /* ── Manual capture ── */
  const handleManualCapture = useCallback(async (blob: Blob) => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      const form = new FormData();
      form.append("file", blob, "capture.jpg");
      const res  = await fetch(`${REST_URL}/capture`, { method: "POST", body: form });
      const data = await res.json();

      if (data.detections?.length > 0) {
        const top = data.detections[0];
        const det: Detection = {
          class_id:     top.class_id,
          class_name:   top.class_name,
          description:  top.description,
          color:        top.color,
          confidence:   top.confidence,
          bbox:         top.bbox,
          plate_number: top.plate_number,
          sharpness:    top.sharpness,
        };
        setLockedDet(det);
        setDetections([det]);
        // Langsung buka modal pilih golongan
        setAppState("selection");
      }
    } catch (err) {
      console.error("[Capture] Error:", err);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  /* ── Submit golongan ── */
  const handleSubmit = useCallback((gId: number) => {
    setGolonganId(gId);
    setAppState("paying");   // spinner pembayaran
    setTimeout(() => {
      setAppState("success");
      setTimeout(() => {
        setAppState("cooldown");
        setLockedDet(null);
        setGolonganId(null);
        setDetections([]);
        setStabilityCount(0);
      }, 2500);
    }, 2500);
  }, []);

  /* ── Close modal ── */
  const handleCloseModal = useCallback(() => {
    setAppState("cooldown");
    setLockedDet(null);
    setGolonganId(null);
    setDetections([]);
    setStabilityCount(0);
    if (detTimerRef.current) { clearTimeout(detTimerRef.current); detTimerRef.current = null; }
  }, []);


  /* ── Derived values ── */
  const topDet        = lockedDet ?? detections[0] ?? null;
  const confPct       = topDet ? Math.round(topDet.confidence * 100) : 0;
  const isDark        = appState === "paying" || appState === "success";
  const isPaying      = appState === "paying";
  const isSuccess     = appState === "success";
  const isModalOpen   = appState === "selection";
  const isStabilizing = appState === "stabilizing";

  /* ── Loading screen ── */
  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4f8" }}>
        <div style={{ color: "#0D63A5", fontFamily: "Inter, sans-serif" }}>Memuat…</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; background: #fff; }
        @keyframes dashSpin   { to { transform: rotate(360deg); } }
        @keyframes fadeIn     { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn      { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes blink      { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes scanLine   {
          0%   { top: 0%; }
          50%  { top: calc(100% - 3px); }
          100% { top: 0%; }
        }
        @keyframes pulseGlow  {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
          50%     { box-shadow: 0 0 0 6px rgba(34,197,94,0.2); }
        }
        .animate-blink { animation: blink 1.2s ease-in-out infinite; }

        .main-content {
          position: relative;
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          flex: 1;
          padding: 30px 75px;
          gap: 40px;
          background: #fff;
          overflow: hidden;
        }

        .camera-panel {
          flex: 1 1 0;
          min-width: 0;
          position: relative;
          border: 10px solid #FFD717;
          border-radius: 21px;
          overflow: hidden;
          aspect-ratio: 16/9;
          background: #000;
          transition: border-color 0.4s ease;
        }
        /* Kendaraan terdeteksi tapi belum stabil — border putih */
        .camera-panel.is-detected {
          border-color: #ffffff;
        }
        /* Kendaraan stabil — border hijau + pulse */
        .camera-panel.is-stable {
          border-color: #22c55e;
          animation: pulseGlow 1.5s ease-in-out infinite;
        }

        .conf-label {
          position: absolute;
          left: 16px; bottom: 16px;
          font-family: Inter, sans-serif;
          font-weight: 700;
          font-size: clamp(14px, 2vw, 22px);
          color: #FFFFFF;
          background: rgba(0,0,0,0.55);
          padding: 4px 10px;
          border-radius: 6px;
          z-index: 20;
          pointer-events: none;
        }

        .info-panel {
          flex: 0 0 340px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding-top: 40px;
        }
        .info-nopol {
          font-family: Inter, sans-serif;
          font-weight: 700;
          font-size: clamp(22px, 3vw, 39px);
          color: #000000;
          line-height: 120%;
        }
        .info-row {
          font-family: Inter, sans-serif;
          font-weight: 700;
          font-size: clamp(14px, 1.5vw, 20px);
          color: #000000;
          line-height: 120%;
        }

        .dark-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 50;
          animation: fadeIn 0.3s ease;
        }

        .float-card {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: #fff;
          border: 3px solid #0D63A5;
          border-radius: 12px;
          padding: 40px 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          z-index: 60;
          min-width: 340px;
          max-width: 90%;
          text-align: center;
          animation: popIn 0.35s ease;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
        }
        .float-title  { font-family: Inter, sans-serif; font-weight: 700; font-size: clamp(18px, 2.5vw, 28px); color: #0D63A5; }
        .float-sub    { font-family: Inter, sans-serif; font-weight: 500; font-size: 16px; color: #64748b; }
        .float-success-title { font-family: Inter, sans-serif; font-weight: 700; font-size: clamp(18px, 2.5vw, 28px); color: #00AC1A; }
        .float-gol    { font-family: Inter, sans-serif; font-weight: 700; font-size: 20px; color: #0D63A5; }

        /* Manual capture button loading state */
        .capture-loading {
          animation: dashSpin 0.8s linear infinite;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
        }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
        {/* ── HEADER ── */}
        <TollHeader gerbang={selectedGerbang} onGerbangChange={setSelectedGerbang} />

        {/* ── MAIN ── */}
        <main className="main-content">
          {/* ─ Camera Panel ─ */}
          <div className={`camera-panel ${
            appState === "detected" || appState === "stabilizing" ? "is-detected" : ""
          } ${
            appState === "stabilizing" ? "is-stable" : ""
          }`}>
            <CameraView
              apiUrl={API_URL}
              onDetections={handleDetections}
              onManualCapture={handleManualCapture}
              active={true}
            />

            {/* Scan lines saat stabilizing */}
            {isStabilizing && <ScanLines />}

            {/* Confidence label */}
            {topDet && (
              <div className="conf-label">
                {confPct}% {topDet.class_name}
              </div>
            )}

            {/* Stability bar saat detected / stabilizing */}
            {(appState === "detected" || appState === "stabilizing") && stabilityMax > 0 && (
              <div style={{
                position: "absolute", bottom: 56, left: 16, right: 16,
                zIndex: 25, pointerEvents: "none",
              }}>
                <StabilityBar count={stabilityCount} max={stabilityMax} />
              </div>
            )}

            {/* Manual capture loading indicator */}
            {isCapturing && (
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                background: "rgba(0,0,0,0.7)",
                borderRadius: 12, padding: "16px 24px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                zIndex: 35, color: "white",
                fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
              }}>
                <div className="capture-loading" />
                Menganalisis frame...
              </div>
            )}

          </div>

          {/* ─ Info Panel ─ */}
          <div className="info-panel">
            {topDet ? (
              <>
                {/* Plate number */}
                <div>
                  <div style={{ fontFamily: "Inter", fontWeight: 400, fontSize: 14, color: "#64748b", marginBottom: 4 }}>
                    No. Polisi
                  </div>
                  <div className="info-nopol" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {topDet.plate_number ?? (
                      <span style={{ color: "#94a3b8", fontWeight: 500, fontSize: "clamp(16px, 2vw, 24px)" }}>
                        Membaca plat…
                        <span style={{
                          display: "inline-block", width: 8, height: 8,
                          background: "#0D63A5", borderRadius: "50%",
                          marginLeft: 8, animation: "blink 1s ease-in-out infinite", verticalAlign: "middle",
                        }} />
                      </span>
                    )}
                    {topDet.plate_number && (
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: "#00AC1A",
                        background: "#f0fdf4", border: "1px solid #bbf7d0",
                        borderRadius: 4, padding: "2px 6px", verticalAlign: "middle",
                      }}>
                        ✓ Terbaca
                      </span>
                    )}
                  </div>
                </div>

                {/* Stability info */}
                {(appState === "detected" || appState === "stabilizing") && (
                  <StabilityBar count={stabilityCount} max={stabilityMax} />
                )}

                {/* Sharpness badge */}
                {topDet.sharpness !== undefined && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: topDet.sharpness > 50 ? "#f0fdf4" : "#fef3c7",
                    border: `1px solid ${topDet.sharpness > 50 ? "#bbf7d0" : "#fde68a"}`,
                    borderRadius: 6, padding: "4px 10px", alignSelf: "flex-start",
                    fontSize: 12, fontWeight: 600,
                    color: topDet.sharpness > 50 ? "#16a34a" : "#b45309",
                  }}>
                    {topDet.sharpness > 50 ? "📸 Frame Tajam" : "⚠️ Frame Kurang Tajam"}
                    <span style={{ color: "#94a3b8" }}>({topDet.sharpness.toFixed(0)})</span>
                  </div>
                )}

                {/* Gerbang info */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="info-row">Gerbang Asal: {selectedGerbang}</div>
                  <div className="info-row">Gerbang Tujuan: {findExit(selectedGerbang)}</div>
                </div>

                {/* Golongan chip */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "#eff6ff", border: "1.5px solid #bfdbfe",
                  borderRadius: 8, padding: "8px 14px", alignSelf: "flex-start",
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: topDet.color, display: "inline-block", flexShrink: 0,
                  }} />
                  <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 15, color: "#1e3a6e" }}>
                    {topDet.class_name} — {topDet.description}
                  </span>
                  <span style={{
                    fontFamily: "Inter", fontWeight: 600, fontSize: 13,
                    color: topDet.confidence >= 0.8 ? "#00AC1A" : "#f59e0b",
                  }}>
                    {Math.round(topDet.confidence * 100)}%
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontFamily: "Inter", fontSize: 16, color: "#94a3b8", paddingTop: 20 }}>
                Menunggu kendaraan terdeteksi…
              </div>
            )}
          </div>
        </main>

        {/* ── GOLONGAN MODAL ── */}
        {isModalOpen && topDet && (
          <GolonganModal
            detection={topDet}
            gerbangAsal={selectedGerbang}
            gerbangTujuan={findExit(selectedGerbang)}
            onSubmit={handleSubmit}
            onClose={handleCloseModal}
          />
        )}

        {/* ── PAYMENT PROCESSING — fullscreen center ── */}
        {isPaying && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.25s ease",
          }}>
            <div className="float-card">
              <Spinner />
              <div className="float-title">Memproses Pembayaran…</div>
              {topDet?.plate_number && (
                <div className="float-gol" style={{ color: "#1e3a6e" }}>{topDet.plate_number}</div>
              )}
              {golonganId !== null && (
                <div className="float-sub">{GOLONGAN_NAMES[golonganId]}</div>
              )}
            </div>
          </div>
        )}

        {/* ── PAYMENT SUCCESS — fullscreen center ── */}
        {isSuccess && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.25s ease",
          }}>
            <div className="float-card" style={{ border: "3px solid #00AC1A" }}>
              <CheckIcon />
              <div className="float-success-title">Pembayaran Berhasil!</div>
              {topDet?.plate_number && (
                <div className="float-gol">{topDet.plate_number}</div>
              )}
              {golonganId !== null && (
                <div className="float-gol" style={{ fontSize: 16, color: "#0D63A5" }}>
                  {GOLONGAN_NAMES[golonganId] ?? `Golongan ${golonganId + 1}`}
                </div>
              )}
              <div className="float-sub">Terima kasih. Selamat berkendara.</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
