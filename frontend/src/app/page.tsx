"use client";

import { useState, useCallback } from "react";
import UploadZone from "@/components/UploadZone";
import ResultCard from "@/components/ResultCard";
import StatusBadge from "@/components/StatusBadge";
import Header from "@/components/Header";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Detection {
  class_id: number;
  class_name: string;
  description: string;
  color: string;
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
}

export interface PredictResponse {
  filename: string;
  image_size: { width: number; height: number };
  inference_ms: number;
  total_detections: number;
  detections: Detection[];
}

type Status = "idle" | "loading" | "success" | "error";

export default function HomePage() {
  const [status, setStatus]       = useState<Status>("idle");
  const [preview, setPreview]     = useState<string | null>(null);
  const [result, setResult]       = useState<PredictResponse | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string>("");

  const handleFile = useCallback(async (file: File) => {
    // Preview gambar
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API_URL}/predict`, { method: "POST", body: form });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data: PredictResponse = await res.json();
      setResult(data);
      setStatus("success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan.";
      setErrorMsg(msg);
      setStatus("error");
    }
  }, []);

  const handleReset = () => {
    setStatus("idle");
    setPreview(null);
    setResult(null);
    setErrorMsg("");
  };

  return (
    <main className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Header apiUrl={API_URL} />

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-12 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)", color: "var(--accent-light)" }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            YOLOv8 · FastAPI · Next.js 15
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4"
            style={{ background: "linear-gradient(135deg,#f1f5f9,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Klasifikasi Kendaraan Tol
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
            Upload foto kendaraan dan sistem akan mendeteksi golongan kendaraan tol secara otomatis menggunakan AI.
          </p>
        </div>

        {/* Class legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
          {CLASS_LEGEND.map((cls) => (
            <div key={cls.id}
              className="rounded-xl p-3 text-center transition-transform hover:scale-105"
              style={{ background: "var(--bg-card)", border: `1px solid ${cls.color}33` }}>
              <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: cls.color, boxShadow: `0 0 8px ${cls.color}` }} />
              <div className="font-bold text-sm" style={{ color: cls.color }}>{cls.name}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{cls.desc}</div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Upload */}
          <div className="flex flex-col gap-4">
            <UploadZone onFile={handleFile} status={status} />
            {status !== "idle" && (
              <button onClick={handleReset}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ background: "var(--bg-card-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                ↩ Reset / Upload Baru
              </button>
            )}
          </div>

          {/* Result */}
          <div>
            {status === "idle" && (
              <div className="h-full rounded-2xl flex items-center justify-center"
                style={{ background: "var(--bg-card)", border: "1px dashed var(--border)", minHeight: 260 }}>
                <div className="text-center" style={{ color: "var(--text-muted)" }}>
                  <div className="text-5xl mb-3">🚗</div>
                  <p>Hasil deteksi akan muncul di sini</p>
                </div>
              </div>
            )}
            {status === "loading" && (
              <div className="h-full rounded-2xl flex items-center justify-center"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", minHeight: 260 }}>
                <div className="text-center">
                  <div className="w-12 h-12 border-4 rounded-full mx-auto mb-4 animate-spin"
                    style={{ borderColor: "var(--bg-card-2)", borderTopColor: "var(--accent)" }} />
                  <p style={{ color: "var(--text-muted)" }}>Menganalisis kendaraan…</p>
                </div>
              </div>
            )}
            {status === "error" && (
              <div className="rounded-2xl p-6"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)" }}>
                <div className="text-2xl mb-2">⚠️</div>
                <p className="font-semibold text-red-400 mb-1">Gagal melakukan prediksi</p>
                <p className="text-sm text-red-300">{errorMsg}</p>
                <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                  Pastikan Backend API berjalan di <code>{API_URL}</code>
                </p>
              </div>
            )}
            {status === "success" && result && (
              <ResultCard result={result} preview={preview} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

const CLASS_LEGEND = [
  { id: 0, name: "GOL I",   desc: "Motor/Sepeda",      color: "#22c55e" },
  { id: 1, name: "GOL II",  desc: "Sedan/Minibus",     color: "#3b82f6" },
  { id: 2, name: "GOL III", desc: "Truk 2 Gandar",     color: "#f59e0b" },
  { id: 3, name: "GOL IV",  desc: "Truk 3 Gandar",     color: "#ef4444" },
  { id: 4, name: "GOL V",   desc: "Truk 4+ Gandar",    color: "#8b5cf6" },
];
