"use client";

import React from "react";
import type { Detection } from "./CameraView";

/* ── Vehicle SVG icons for each golongan ── */
function GolI() {
  return (
    <svg viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect x="5" y="30" width="110" height="28" rx="6" fill="white"/>
      <path d="M20 30 L30 12 L90 12 L100 30" fill="white" stroke="white" strokeWidth="1"/>
      <rect x="30" y="15" width="60" height="14" rx="3" fill="#0D63A5" opacity="0.7"/>
      <circle cx="28" cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="92" cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="28" cy="58" r="4" fill="white"/>
      <circle cx="92" cy="58" r="4" fill="white"/>
    </svg>
  );
}
function GolII() {
  return (
    <svg viewBox="0 0 140 70" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect x="5" y="28" width="130" height="28" rx="4" fill="white"/>
      <rect x="70" y="14" width="60" height="16" rx="3" fill="white"/>
      <rect x="75" y="17" width="50" height="10" rx="2" fill="#0D63A5" opacity="0.6"/>
      <circle cx="30" cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="110" cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="30" cy="58" r="4" fill="white"/>
      <circle cx="110" cy="58" r="4" fill="white"/>
    </svg>
  );
}
function GolIII() {
  return (
    <svg viewBox="0 0 160 70" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect x="5" y="28" width="150" height="28" rx="4" fill="white"/>
      <rect x="80" y="12" width="72" height="18" rx="3" fill="white"/>
      <rect x="84" y="15" width="64" height="12" rx="2" fill="#0D63A5" opacity="0.6"/>
      <circle cx="28"  cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="100" cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="128" cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="28"  cy="58" r="4" fill="white"/>
      <circle cx="100" cy="58" r="4" fill="white"/>
      <circle cx="128" cy="58" r="4" fill="white"/>
    </svg>
  );
}
function GolIV() {
  return (
    <svg viewBox="0 0 180 70" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect x="5" y="28" width="170" height="28" rx="4" fill="white"/>
      <rect x="90" y="10" width="82" height="20" rx="3" fill="white"/>
      <rect x="94" y="13" width="74" height="14" rx="2" fill="#0D63A5" opacity="0.6"/>
      <circle cx="28"  cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="100" cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="124" cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="152" cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="28"  cy="58" r="4" fill="white"/>
      <circle cx="100" cy="58" r="4" fill="white"/>
      <circle cx="124" cy="58" r="4" fill="white"/>
      <circle cx="152" cy="58" r="4" fill="white"/>
    </svg>
  );
}
function GolV() {
  return (
    <svg viewBox="0 0 200 70" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect x="5" y="28" width="190" height="28" rx="4" fill="white"/>
      <rect x="100" y="8" width="92" height="22" rx="3" fill="white"/>
      <rect x="104" y="11" width="84" height="16" rx="2" fill="#0D63A5" opacity="0.6"/>
      <circle cx="28"  cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="100" cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="122" cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="150" cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="172" cy="58" r="10" fill="#0D63A5" stroke="white" strokeWidth="2"/>
      <circle cx="28"  cy="58" r="4" fill="white"/>
      <circle cx="100" cy="58" r="4" fill="white"/>
      <circle cx="122" cy="58" r="4" fill="white"/>
      <circle cx="150" cy="58" r="4" fill="white"/>
      <circle cx="172" cy="58" r="4" fill="white"/>
    </svg>
  );
}

/* ── Golongan data ── */
const GOLONGAN_LIST = [
  { id: 0, name: "Golongan I",   desc: "Sedan, Jip, Pick up/Truck kecil, Bus", icon: <GolI   />, aiName: "GOL I"   },
  { id: 1, name: "Golongan II",  desc: "Truck 2 Gandar",                        icon: <GolII  />, aiName: "GOL II"  },
  { id: 2, name: "Golongan III", desc: "Truck 3 Gandar",                        icon: <GolIII />, aiName: "GOL III" },
  { id: 3, name: "Golongan IV",  desc: "Truck 4 Gandar",                        icon: <GolIV  />, aiName: "GOL IV"  },
  { id: 4, name: "Golongan V",   desc: "Truck 5 Gandar",                        icon: <GolV   />, aiName: "GOL V"   },
];

const CONF_THRESHOLD = 0.80; // 80%

interface Props {
  detection: Detection;
  gerbangAsal: string;
  gerbangTujuan: string;
  captureImage?: string | null;   // base64 data URL foto saat deteksi
  onSubmit: (golonganId: number) => void;
  onClose: () => void;
}

export default function GolonganModal({ detection, gerbangAsal, gerbangTujuan, captureImage, onSubmit, onClose }: Props) {
  const aiGolId    = detection.class_id;
  const aiConf     = detection.confidence;
  const autoSelect = aiConf >= CONF_THRESHOLD;

  // Plate number: mulai dari detection prop, update via polling jika masih null
  const [plate, setPlate] = React.useState<string | null>(detection.plate_number ?? null);
  const plateReady = !!plate;

  // Polling: jika plate belum terbaca, coba ambil dari backend setiap 2 detik
  const pollingRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRef = React.useRef(0);
  const MAX_ATTEMPTS = 8; // max 16 detik polling

  React.useEffect(() => {
    // Jika plate sudah ada dari awal, tidak perlu polling
    if (plate) return;

    // Polling via /api/capture dengan gambar terakhir tidak praktis
    // Sebagai gantinya, pantau window.__lastPlate yang di-set oleh CameraView WS
    const checkPlate = () => {
      // Cek apakah plate sudah tersedia dari WebSocket (disimpan di window global)
      const wsPlate = (window as unknown as Record<string, string | null>)["__latestPlate"];
      if (wsPlate && wsPlate !== plate) {
        setPlate(wsPlate);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        return;
      }

      attemptRef.current++;
      if (attemptRef.current >= MAX_ATTEMPTS) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    };

    pollingRef.current = setInterval(checkPlate, 1500);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update saat detection.plate_number berubah dari luar (WebSocket update)
  React.useEffect(() => {
    if (detection.plate_number && !plate) {
      setPlate(detection.plate_number);
    }
  }, [detection.plate_number, plate]);

  const [selected, setSelected] = React.useState<number | null>(
    autoSelect ? aiGolId : null
  );

  // Auto-select saat AI sudah confident (bisa update setelah OCR selesai)
  React.useEffect(() => {
    if (autoSelect && selected === null) {
      setSelected(aiGolId);
    }
  }, [aiGolId, autoSelect, selected]);

  // ── Keyboard shortcut: 1–5 → pilih + submit, Escape → tutup ─────────────
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Abaikan saat user sedang mengetik di input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Escape → tutup modal
      if (e.key === "Escape") { onClose(); return; }

      // Angka 1–5 dari keyboard biasa maupun numpad
      const num = e.key.match(/^([1-5])$/) || e.code.match(/^Numpad([1-5])$/);
      if (num) {
        const golId = parseInt(num[1], 10) - 1; // "1"→0, "2"→1, dst.
        e.preventDefault();
        setSelected(golId);
        setTimeout(() => onSubmit(golId), 0); // submit di tick berikutnya
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onSubmit]);

  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .gol-modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 100;
          display: flex; align-items: flex-start; justify-content: center;
          padding: 24px 20px;
          overflow-y: auto;
        }
        .gol-modal-card {
          position: relative;
          background: #fff;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: min(1200px, 95vw);
          box-shadow: 0 24px 64px rgba(0,0,0,0.3);
          animation: modalIn 0.3s ease-out;
          overflow: hidden;
          flex-shrink: 0;
        }
        .modal-header {
          width: 100%;
          padding: 24px 40px 0;
          flex-shrink: 0;
        }
        .modal-body {
          width: 100%;
          padding: 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
        }
        .modal-footer {
          width: 100%;
          padding: 0 40px 32px;
          flex-shrink: 0;
        }
        .gol-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          width: 100%;
        }
        .gol-card {
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 16px;
          gap: 24px;
          background: #fff;
          border: 3px solid rgba(224,224,224,0.95);
          border-radius: 10px;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
          min-height: 90px;
        }
        .gol-card:hover {
          border-color: #0D63A5;
          box-shadow: 0 4px 16px rgba(13,99,165,0.15);
          transform: translateY(-1px);
        }
        .gol-card.selected {
          border-color: #0D63A5;
          box-shadow: 0 0 0 2px rgba(13,99,165,0.2);
        }
        .gol-card.ai-predicted {
          border-color: #0D63A5;
        }
        .gol-icon-wrap {
          width: 120px;
          height: 70px;
          background: #0D63A5;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 6px;
        }
        .gol-info { display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .gol-name { font-family: Inter, sans-serif; font-weight: 700; font-size: 20px; color: #000; }
        .gol-desc { font-family: Inter, sans-serif; font-weight: 400; font-size: 14px; color: #000; }
        .gol-conf-green { font-family: Inter, sans-serif; font-weight: 700; font-size: 18px; color: #00AC1A; }
        .gol-conf-warn  { font-family: Inter, sans-serif; font-weight: 700; font-size: 14px; color: #f59e0b; }

        /* ── Keyboard shortcut badge di tiap kartu ── */
        .kbd-badge {
          position: absolute;
          top: 8px;
          right: 10px;
          background: #0D63A5;
          color: #fff;
          font-family: Inter, sans-serif;
          font-size: 13px;
          font-weight: 800;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(13,99,165,0.35);
          letter-spacing: 0;
          pointer-events: none;
          transition: background 0.15s;
        }
        .gol-card.selected .kbd-badge {
          background: #083358;
        }
        .manual-notice {
          background: #fff8e1;
          border: 2px solid #FFD717;
          border-radius: 8px;
          padding: 12px 20px;
          font-family: Inter, sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: #7a5c00;
          text-align: center;
          width: 100%;
        }
        .submit-btn {
          width: 100%;
          height: 54px;
          background: #0D63A5;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-weight: 700;
          font-size: 25px;
          color: #fff;
          transition: background 0.2s, transform 0.15s;
        }
        .submit-btn:hover:not(:disabled) { background: #083358; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .close-btn {
          position: absolute;
          top: 16px;
          right: 20px;
          background: none;
          border: none;
          font-size: 32px;
          color: #94a3b8;
          cursor: pointer;
          transition: color 0.2s;
        }
        .close-btn:hover { color: #ef4444; }

        /* ── Header dua kolom: foto kiri | info kanan ── */
        .modal-header-2col {
          width: 100%;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 0;
          flex-shrink: 0;
          border-bottom: 1.5px solid #e2e8f0;
        }

        /* Kolom kiri — foto */
        .header-photo-col {
          flex: 0 0 42%;
          max-width: 42%;
          position: relative;
          background: #0f172a;
          border-radius: 12px 0 0 0;
          overflow: hidden;
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .header-photo-col img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .header-photo-no-img {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #475569;
          font-family: Inter, sans-serif;
          font-size: 14px;
          font-weight: 500;
          width: 100%;
          height: 100%;
          min-height: 200px;
          background: #f1f5f9;
        }
        .photo-live-badge {
          position: absolute;
          top: 10px;
          left: 12px;
          background: rgba(0,0,0,0.6);
          color: #f87171;
          font-family: Inter, sans-serif;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 5px;
          letter-spacing: 0.04em;
        }
        .photo-live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #f87171;
          animation: blink 1.2s ease-in-out infinite;
          flex-shrink: 0;
        }

        /* Kolom kanan — info */
        .header-info-col {
          flex: 1 1 0;
          padding: 24px 40px 20px 28px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 16px;
        }

        .info-section-label {
          font-family: Inter, sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        .info-plate-value {
          font-family: Inter, sans-serif;
          font-weight: 800;
          font-size: 30px;
          color: #0D63A5;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .info-ai-value {
          font-family: Inter, sans-serif;
          font-weight: 700;
          font-size: 18px;
        }
        .info-gate-row {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f1f5f9;
          border-radius: 8px;
          padding: 12px 16px;
        }
        .info-gate-col {
          flex: 1;
        }
        .info-gate-label {
          font-family: Inter, sans-serif;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
          margin-bottom: 3px;
        }
        .info-gate-value {
          font-family: Inter, sans-serif;
          font-weight: 700;
          font-size: 15px;
          color: #1e293b;
          word-break: break-word;
        }
        .info-gate-arrow {
          color: #0D63A5;
          font-size: 22px;
          font-weight: 700;
          flex-shrink: 0;
        }
      `}</style>

      <div className="gol-modal-backdrop" onClick={onClose}>
        <div className="gol-modal-card" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">&times;</button>

          {/* ── HEADER DUA KOLOM: Foto (kiri) | Info Tol (kanan) ── */}
          <div className="modal-header-2col">

            {/* Kolom Kiri — Foto Kendaraan */}
            <div className="header-photo-col">
              {captureImage ? (
                <>
                  <img src={captureImage} alt="Foto kendaraan saat deteksi" />
                  <div className="photo-live-badge">
                    <span className="photo-live-dot" />
                    FOTO DETEKSI
                  </div>
                </>
              ) : (
                <div className="header-photo-no-img">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Foto tidak tersedia</span>
                </div>
              )}
            </div>

            {/* Kolom Kanan — Info Tol */}
            <div className="header-info-col">

              {/* No. Polisi */}
              <div>
                <div className="info-section-label">No. Polisi</div>
                <div className="info-plate-value">
                  {plate ?? (
                    <span style={{ fontWeight: 500, fontSize: 20, color: "#94a3b8", display: "flex", alignItems: "center", gap: 8 }}>
                      Membaca plat...
                      <span style={{ display: "inline-block", width: 8, height: 8, background: "#0D63A5", borderRadius: "50%", animation: "blink 1s ease-in-out infinite" }} />
                    </span>
                  )}
                  {plate && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "2px 8px" }}>
                      ✓ Terbaca
                    </span>
                  )}
                </div>
              </div>

              {/* Golongan AI */}
              <div>
                <div className="info-section-label">Golongan Deteksi AI</div>
                <div className="info-ai-value" style={{ color: aiConf >= CONF_THRESHOLD ? "#16a34a" : "#f59e0b" }}>
                  {GOLONGAN_LIST[aiGolId]?.name ?? "Tidak dikenal"}
                  <span style={{ fontWeight: 500, fontSize: 15, marginLeft: 8, color: aiConf >= CONF_THRESHOLD ? "#16a34a" : "#f59e0b" }}>
                    — {Math.round(aiConf * 100)}%
                    {aiConf < CONF_THRESHOLD && " ⚠ Pilih manual"}
                  </span>
                </div>
              </div>

              {/* Gerbang Asal → Tujuan */}
              <div className="info-gate-row">
                <div className="info-gate-col">
                  <div className="info-gate-label">Gerbang Asal</div>
                  <div className="info-gate-value">{gerbangAsal}</div>
                </div>
                <div className="info-gate-arrow">→</div>
                <div className="info-gate-col" style={{ textAlign: "right" }}>
                  <div className="info-gate-label">Gerbang Tujuan</div>
                  <div className="info-gate-value">
                    {gerbangTujuan === "-" ? (
                      <span style={{ color: "#94a3b8", fontWeight: 400 }}>Tidak diketahui</span>
                    ) : gerbangTujuan}
                  </div>
                </div>
              </div>

            </div>{/* end header-info-col */}
          </div>{/* end modal-header-2col */}


          {/* ─ Body: notice + grid ─ */}
          <div className="modal-body">
            {/* Manual selection notice */}
            {!autoSelect && (
              <div className="manual-notice">
                ⚠ Confidence AI {Math.round(aiConf * 100)}% — silakan pilih golongan secara manual.
              </div>
            )}

            {/* Grid golongan */}
            <div className="gol-grid">
            {GOLONGAN_LIST.map((gol) => {
              const isAI       = gol.id === aiGolId;
              const isSelected = gol.id === selected;
              return (
                <div
                  key={gol.id}
                  id={`golongan-card-${gol.id}`}
                  className={`gol-card ${isSelected ? "selected" : ""} ${isAI && autoSelect ? "ai-predicted" : ""}`}
                  style={{ position: "relative" }}
                  onClick={() => { setSelected(gol.id); onSubmit(gol.id); }}
                  role="button"
                  aria-pressed={isSelected}
                >
                  {/* Shortcut key badge */}
                  <span className="kbd-badge">{gol.id + 1}</span>

                  <div className="gol-icon-wrap">{gol.icon}</div>
                  <div className="gol-info">
                    <div className="gol-name">{gol.name}</div>
                    <div className="gol-desc">{gol.desc}</div>
                    {isAI && (
                      <div className={aiConf >= CONF_THRESHOLD ? "gol-conf-green" : "gol-conf-warn"}>
                        Confidence: {Math.round(aiConf * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>{/* end gol-grid */}
          </div>{/* end modal-body */}

          {/* ─ Footer: Submit ─ */}
          <div className="modal-footer">
            <button
              id="golongan-submit-btn"
              className="submit-btn"
              disabled={selected === null}
              onClick={() => selected !== null && onSubmit(selected)}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
