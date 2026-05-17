"use client";

import type { Detection } from "./CameraView";

interface Props {
  detections: Detection[];
  compact?: boolean;
  stabilityCount?: number;
  stabilityMax?: number;
}

// SVG ikon rambu tol (putih di background biru) per golongan
function VehicleIcon({ id }: { id: number }) {
  const svgs: Record<number, React.ReactNode> = {
    // GOL I — Sedan + Minibus + Bus (3 kendaraan kecil)
    0: (
      <svg viewBox="0 0 80 50" fill="white" xmlns="http://www.w3.org/2000/svg">
        {/* Sedan kiri */}
        <rect x="2" y="22" width="22" height="10" rx="2"/>
        <path d="M6 22 L9 15 L17 15 L20 22Z"/>
        <circle cx="7" cy="33" r="3"/>
        <circle cx="18" cy="33" r="3"/>
        {/* Minibus tengah */}
        <rect x="29" y="20" width="22" height="12" rx="2"/>
        <rect x="31" y="14" width="18" height="8" rx="1"/>
        <circle cx="34" cy="33" r="3"/>
        <circle cx="46" cy="33" r="3"/>
        {/* Bus kanan */}
        <rect x="57" y="18" width="20" height="14" rx="2"/>
        <rect x="59" y="13" width="16" height="7" rx="1"/>
        <circle cx="62" cy="33" r="3"/>
        <circle cx="73" cy="33" r="3"/>
      </svg>
    ),
    // GOL II — Truk 2 Gandar (box truck)
    1: (
      <svg viewBox="0 0 80 50" fill="white" xmlns="http://www.w3.org/2000/svg">
        {/* Kabin */}
        <rect x="52" y="18" width="22" height="18" rx="2"/>
        <rect x="54" y="20" width="8" height="8" rx="1" fill="#1e3a6e"/>
        {/* Bak */}
        <rect x="6" y="14" width="48" height="22" rx="2"/>
        {/* Roda */}
        <circle cx="18" cy="37" r="5"/>
        <circle cx="34" cy="37" r="5"/>
        <circle cx="62" cy="37" r="5"/>
        {/* Axle line */}
        <rect x="6" y="34" width="70" height="2" rx="1"/>
      </svg>
    ),
    // GOL III — Truk 3 Gandar
    2: (
      <svg viewBox="0 0 80 50" fill="white" xmlns="http://www.w3.org/2000/svg">
        {/* Kabin */}
        <rect x="56" y="17" width="20" height="19" rx="2"/>
        <rect x="58" y="19" width="7" height="8" rx="1" fill="#1e3a6e"/>
        {/* Bak panjang */}
        <rect x="4" y="13" width="54" height="23" rx="2"/>
        {/* Roda — 3 gandar */}
        <circle cx="14" cy="38" r="4.5"/>
        <circle cx="30" cy="38" r="4.5"/>
        <circle cx="44" cy="38" r="4.5"/>
        <circle cx="66" cy="38" r="4.5"/>
        <rect x="4" y="35" width="72" height="2" rx="1"/>
      </svg>
    ),
    // GOL IV — Truk 4 Gandar (truk gandeng)
    3: (
      <svg viewBox="0 0 80 50" fill="white" xmlns="http://www.w3.org/2000/svg">
        {/* Kabin */}
        <rect x="58" y="16" width="18" height="20" rx="2"/>
        <rect x="60" y="18" width="6" height="8" rx="1" fill="#1e3a6e"/>
        {/* Bak 1 */}
        <rect x="30" y="13" width="26" height="23" rx="2"/>
        {/* Bak 2 */}
        <rect x="2" y="13" width="26" height="23" rx="2"/>
        {/* Roda — 4 gandar */}
        <circle cx="10" cy="38" r="4"/>
        <circle cx="22" cy="38" r="4"/>
        <circle cx="38" cy="38" r="4"/>
        <circle cx="50" cy="38" r="4"/>
        <circle cx="67" cy="38" r="4"/>
        <rect x="2" y="35" width="74" height="2" rx="1"/>
      </svg>
    ),
    // GOL V — Truk 5 Gandar+ (truk trailer panjang)
    4: (
      <svg viewBox="0 0 80 50" fill="white" xmlns="http://www.w3.org/2000/svg">
        {/* Kabin kecil */}
        <rect x="62" y="17" width="16" height="18" rx="2"/>
        <rect x="64" y="19" width="5" height="7" rx="1" fill="#1e3a6e"/>
        {/* Trailer panjang */}
        <rect x="2" y="14" width="58" height="21" rx="2"/>
        {/* Roda — 5 gandar */}
        <circle cx="9"  cy="37" r="3.5"/>
        <circle cx="19" cy="37" r="3.5"/>
        <circle cx="30" cy="37" r="3.5"/>
        <circle cx="41" cy="37" r="3.5"/>
        <circle cx="51" cy="37" r="3.5"/>
        <circle cx="70" cy="37" r="3.5"/>
        <rect x="2" y="34" width="76" height="2" rx="1"/>
      </svg>
    ),
  };

  return (
    <div
      className="shrink-0 rounded-lg flex items-center justify-center"
      style={{
        background: "#1e3a6e",
        width: 90,
        height: 60,
        padding: "6px 8px",
      }}
    >
      {svgs[id]}
    </div>
  );
}

const ALL_CLASSES = [
  { id: 0, name: "Golongan I",   desc: "Sedan, Jip, Pick up/Truck kecil, Bus" },
  { id: 1, name: "Golongan II",  desc: "Truk 2 Gandar" },
  { id: 2, name: "Golongan III", desc: "Truk 3 Gandar" },
  { id: 3, name: "Golongan IV",  desc: "Truk 4 Gandar" },
  { id: 4, name: "Golongan V",   desc: "Truk 5 Gandar+" },
];

export default function DetectionPanel({ detections, compact = false, stabilityCount = 0, stabilityMax = 5 }: Props) {
  const detectedIds = new Set(detections.map((d) => d.class_id));

  /* ── COMPACT (mobile) ── */
  if (compact) {
    return (
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2 px-1" style={{ color: "#64748b" }}>
          Golongan Kendaraan
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {ALL_CLASSES.map((cls) => {
            const isDetected = detectedIds.has(cls.id);
            const det        = detections.find((d) => d.class_id === cls.id);
            const pct        = det ? Math.round(det.confidence * 100) : null;

            return (
              <div
                key={cls.id}
                className="flex flex-col items-center rounded-xl p-2 shrink-0 transition-all duration-300"
                style={{
                  width: 96,
                  background: isDetected ? "#dbeafe" : "#f8fafc",
                  border:     isDetected ? "2px solid #1e3a6e" : "2px solid #e2e8f0",
                  boxShadow:  isDetected ? "0 0 10px rgba(30,58,110,0.3)" : "none",
                }}
              >
                <div className="rounded-lg overflow-hidden mb-1" style={{ width: 72, height: 48 }}>
                  <VehicleIcon id={cls.id} />
                </div>
                <p className="font-bold text-xs text-center leading-tight" style={{ color: isDetected ? "#1e3a6e" : "#1e293b" }}>
                  {cls.name}
                </p>
                {isDetected && pct !== null && (
                  <p className="text-xs font-bold mt-0.5 tabular-nums" style={{ color: "#16a34a" }}>
                    {pct}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── DEFAULT (desktop) ── */
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-widest px-1 mb-1" style={{ color: "#64748b" }}>
        Golongan Kendaraan
      </p>

      {ALL_CLASSES.map((cls) => {
        const isDetected = detectedIds.has(cls.id);
        const det        = detections.find((d) => d.class_id === cls.id);
        const pct        = det ? Math.round(det.confidence * 100) : null;

        return (
          <div
            key={cls.id}
            className="flex items-center gap-3 rounded-xl transition-all duration-300"
            style={{
              padding:    "10px 14px",
              background: "#ffffff",
              border:     isDetected ? "2px solid #1e3a6e" : "2px solid #e2e8f0",
              boxShadow:  isDetected ? "0 0 12px rgba(30,58,110,0.2)" : "none",
            }}
          >
            {/* Ikon rambu tol */}
            <VehicleIcon id={cls.id} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight" style={{ color: "#1e293b" }}>
                {cls.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{cls.desc}</p>
            </div>

            {/* Confidence + stability — hanya saat terdeteksi */}
            {isDetected && pct !== null && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                <p className="font-bold text-sm tabular-nums" style={{ color: pct >= 80 ? "#16a34a" : "#f59e0b" }}>
                  {pct}%
                </p>
                {stabilityMax > 0 && (
                  <div style={{ width: 64, height: 5, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min((stabilityCount / stabilityMax) * 100, 100)}%`,
                      borderRadius: 3,
                      background: stabilityCount >= stabilityMax
                        ? "linear-gradient(90deg,#16a34a,#22c55e)"
                        : "linear-gradient(90deg,#f59e0b,#fbbf24)",
                      transition: "width 0.2s ease",
                    }} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
