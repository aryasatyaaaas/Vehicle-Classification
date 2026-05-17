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
  onSubmit: (golonganId: number) => void;
  onClose: () => void;
}

export default function GolonganModal({ detection, gerbangAsal, gerbangTujuan, onSubmit, onClose }: Props) {
  const aiGolId    = detection.class_id;
  const aiConf     = detection.confidence;
  const autoSelect = aiConf >= CONF_THRESHOLD;
  const plateReady = !!detection.plate_number;

  const [selected, setSelected] = React.useState<number | null>(
    autoSelect ? aiGolId : null
  );

  // Auto-select saat AI sudah confident (bisa update setelah OCR selesai)
  React.useEffect(() => {
    if (autoSelect && selected === null) {
      setSelected(aiGolId);
    }
  }, [aiGolId, autoSelect, selected]);

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
      `}</style>

      <div className="gol-modal-backdrop" onClick={onClose}>
        <div className="gol-modal-card" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">&times;</button>

          {/* ─ Header: Plate + AI result ─ */}
          <div className="modal-header">
            <div style={{
              width: "100%", background: "#f8fafc", borderRadius: 10,
              padding: "14px 20px", display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: 12,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              {/* Plate number — live update */}
              <div>
                <div style={{ fontFamily: "Inter", fontSize: 12, color: "#64748b", fontWeight: 500, marginBottom: 4 }}>
                  No. Polisi
                </div>
                <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 28, color: "#0D63A5", display: "flex", alignItems: "center", gap: 10 }}>
                  {detection.plate_number ?? (
                    <span style={{ fontWeight: 500, fontSize: 18, color: "#94a3b8", display: "flex", alignItems: "center", gap: 8 }}>
                      Membaca plat...
                      <span style={{ display: "inline-block", width: 8, height: 8, background: "#0D63A5", borderRadius: "50%", animation: "blink 1s ease-in-out infinite" }} />
                    </span>
                  )}
                  {detection.plate_number && (
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "2px 8px" }}>
                      ✓ Terbaca
                    </span>
                  )}
                </div>
              </div>
              {/* AI result */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "Inter", fontSize: 12, color: "#64748b", fontWeight: 500, marginBottom: 4 }}>Golongan Deteksi AI</div>
                <div style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 16, color: aiConf >= CONF_THRESHOLD ? "#16a34a" : "#f59e0b" }}>
                  {GOLONGAN_LIST[aiGolId]?.name ?? "Tidak dikenal"} — {Math.round(aiConf * 100)}%
                </div>
              </div>
            </div>

            {/* Gerbang Asal → Tujuan */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "#f1f5f9", borderRadius: 8, padding: "10px 16px", marginTop: 8,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Inter", fontSize: 11, color: "#94a3b8", fontWeight: 500, marginBottom: 2 }}>Gerbang Asal</div>
                <div style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{gerbangAsal}</div>
              </div>
              <div style={{ color: "#0D63A5", fontSize: 20, fontWeight: 700 }}>→</div>
              <div style={{ flex: 1, textAlign: "right" }}>
                <div style={{ fontFamily: "Inter", fontSize: 11, color: "#94a3b8", fontWeight: 500, marginBottom: 2 }}>Gerbang Tujuan</div>
                <div style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 14, color: "#1e293b", wordBreak: "break-word" }}>
                  {gerbangTujuan === "-" ? (
                    <span style={{ color: "#94a3b8", fontWeight: 400 }}>Tidak diketahui</span>
                  ) : gerbangTujuan}
                </div>
              </div>
            </div>
          </div>{/* end modal-header */}


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
                  onClick={() => setSelected(gol.id)}
                  role="button"
                  aria-pressed={isSelected}
                >
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
