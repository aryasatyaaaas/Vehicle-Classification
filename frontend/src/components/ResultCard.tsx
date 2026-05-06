"use client";

import type { PredictResponse, Detection } from "@/app/page";

interface Props {
  result: PredictResponse;
  preview: string | null;
}

export default function ResultCard({ result, preview }: Props) {
  const top = result.detections[0];

  return (
    <div className="rounded-2xl overflow-hidden animate-fadeInUp"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>

      {/* Preview gambar */}
      {preview && (
        <div className="relative w-full" style={{ maxHeight: 240, overflow: "hidden", background: "#000" }}>
          <img src={preview} alt="preview" className="w-full object-contain" style={{ maxHeight: 240 }} />
          {/* overlay badge */}
          {top && (
            <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg text-sm font-bold"
              style={{ background: `${top.color}dd`, color: "#fff", backdropFilter: "blur(8px)" }}>
              {top.class_name} · {(top.confidence * 100).toFixed(1)}%
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x" style={{ borderBottom: "1px solid var(--border)", divideColor: "var(--border)" }}>
        <Stat label="Deteksi" value={String(result.total_detections)} />
        <Stat label="Inferensi" value={`${result.inference_ms} ms`} />
        <Stat label="Ukuran" value={`${result.image_size.width}×${result.image_size.height}`} />
      </div>

      {/* Detection list */}
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
          Hasil Deteksi
        </p>
        {result.detections.length === 0 ? (
          <div className="text-center py-6" style={{ color: "var(--text-muted)" }}>
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm">Tidak ada kendaraan terdeteksi</p>
            <p className="text-xs mt-1">Coba turunkan threshold confidence atau gunakan gambar yang lebih jelas</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {result.detections.map((det, i) => (
              <DetectionRow key={i} det={det} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 text-center">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="font-bold text-sm mt-0.5" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

function DetectionRow({ det, rank }: { det: Detection; rank: number }) {
  const pct = Math.round(det.confidence * 100);
  return (
    <div className="rounded-xl p-3 flex items-center gap-3 transition-all hover:scale-[1.01]"
      style={{ background: "var(--bg-card-2)", border: `1px solid ${det.color}33` }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: det.color, color: "#fff" }}>
        #{rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-semibold text-sm" style={{ color: det.color }}>{det.class_name}</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{pct}%</span>
        </div>
        {/* Confidence bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${det.color}99, ${det.color})` }} />
        </div>
        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>{det.description}</p>
      </div>
    </div>
  );
}
