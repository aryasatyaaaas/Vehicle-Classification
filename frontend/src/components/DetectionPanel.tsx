"use client";

import type { Detection } from "./CameraView";

interface Props {
  detections: Detection[];
  /** compact = horizontal scroll cards (mobile), default = vertical list (desktop) */
  compact?: boolean;
}

const VEHICLE_ICONS: Record<number, string> = {
  0: "🚗",
  1: "🚛",
  2: "🚚",
  3: "🚜",
  4: "🏗️",
};

const ALL_CLASSES = [
  { id: 0, name: "Golongan I",   desc: "Sedan, Jip, Pick up/Bus",   color: "#22c55e" },
  { id: 1, name: "Golongan II",  desc: "Truk 2 Gandar",             color: "#3b82f6" },
  { id: 2, name: "Golongan III", desc: "Truk 3 Gandar",             color: "#f59e0b" },
  { id: 3, name: "Golongan IV",  desc: "Truk 4 Gandar",             color: "#ef4444" },
  { id: 4, name: "Golongan V",   desc: "Truk 5 Gandar+",            color: "#8b5cf6" },
];

export default function DetectionPanel({ detections, compact = false }: Props) {
  const detectedIds = new Set(detections.map((d) => d.class_id));

  /* ── COMPACT (mobile): horizontal scroll strip ── */
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
                  width: 88,
                  background:  isDetected ? "#dbeafe" : "#f8fafc",
                  border:      isDetected ? `2px solid ${cls.color}` : "2px solid #e2e8f0",
                  boxShadow:   isDetected ? `0 0 10px ${cls.color}55` : "none",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl mb-1"
                  style={{
                    background: isDetected ? cls.color + "22" : "#f1f5f9",
                    border: `1px solid ${isDetected ? cls.color + "66" : "#e2e8f0"}`,
                  }}
                >
                  {VEHICLE_ICONS[cls.id]}
                </div>
                <p className="font-bold text-xs text-center leading-tight" style={{ color: isDetected ? cls.color : "#1e293b" }}>
                  {cls.name}
                </p>
                {isDetected && pct !== null && (
                  <p className="text-xs font-bold mt-0.5 tabular-nums" style={{ color: cls.color }}>
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

  /* ── DEFAULT (desktop): vertical list ── */
  return (
    <div className="flex flex-col gap-3 h-full">
      <p className="text-xs font-bold uppercase tracking-widest px-1" style={{ color: "#64748b" }}>
        Golongan Kendaraan
      </p>

      {ALL_CLASSES.map((cls) => {
        const isDetected = detectedIds.has(cls.id);
        const det        = detections.find((d) => d.class_id === cls.id);
        const pct        = det ? Math.round(det.confidence * 100) : null;

        return (
          <div
            key={cls.id}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300"
            style={{
              background:  isDetected ? "#dbeafe" : "#f8fafc",
              border:      isDetected ? `2px solid ${cls.color}` : "2px solid #e2e8f0",
              boxShadow:   isDetected ? `0 0 12px ${cls.color}44` : "none",
            }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
              style={{
                background: isDetected ? cls.color + "22" : "#f1f5f9",
                border: `1px solid ${isDetected ? cls.color + "66" : "#e2e8f0"}`,
              }}
            >
              {VEHICLE_ICONS[cls.id]}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight" style={{ color: isDetected ? cls.color : "#1e293b" }}>
                {cls.name}
              </p>
              <p className="text-xs mt-0.5 leading-snug" style={{ color: "#64748b" }}>{cls.desc}</p>
              {isDetected && pct !== null && (
                <div className="mt-1.5">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-semibold" style={{ color: cls.color }}>Terdeteksi</span>
                    <span className="font-bold tabular-nums" style={{ color: cls.color }}>{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#e2e8f0" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: cls.color }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
