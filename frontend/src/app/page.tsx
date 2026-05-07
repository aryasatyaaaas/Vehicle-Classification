"use client";

import { useState, useCallback } from "react";
import TollHeader     from "@/components/TollHeader";
import CameraView     from "@/components/CameraView";
import DetectionPanel from "@/components/DetectionPanel";
import type { Detection } from "@/components/CameraView";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HomePage() {
  const [gerbang,    setGerbang]    = useState("Gerbang Tol Kalikangkung");
  const [detections, setDetections] = useState<Detection[]>([]);

  const handleDetections = useCallback((dets: Detection[]) => {
    setDetections(dets);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4f8" }}>
      {/* Header */}
      <TollHeader gerbang={gerbang} onGerbangChange={setGerbang} />

      {/* ── DESKTOP layout: side-by-side ── */}
      <main className="hidden md:flex flex-1 gap-4 p-4 overflow-hidden" style={{ maxHeight: "calc(100vh - 56px)" }}>
        {/* Kiri: Camera */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <CameraView apiUrl={API_URL} onDetections={handleDetections} active={true} />

          {/* Info bar */}
          <div
            className="flex items-center justify-between px-5 py-3 rounded-xl text-xs shrink-0"
            style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full inline-block animate-blink" style={{ background: "#22c55e" }} />
              <span style={{ color: "#64748b" }}>Kamera aktif — deteksi real-time</span>
            </div>
            <div className="flex items-center gap-4" style={{ color: "#64748b" }}>
              <span>
                Terdeteksi:{" "}
                <strong style={{ color: "#1e3a6e" }}>{detections.length} kendaraan</strong>
              </span>
              {detections.length > 0 && (
                <span>
                  Golongan:{" "}
                  <strong style={{ color: detections[0].color }}>{detections[0].class_name}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Kanan: Detection Panel */}
        <div
          className="w-64 lg:w-72 shrink-0 overflow-y-auto rounded-xl p-4"
          style={{ background: "#ffffff" }}
        >
          <DetectionPanel detections={detections} />
        </div>
      </main>

      {/* ── MOBILE layout: stacked ── */}
      <main className="flex md:hidden flex-col flex-1 gap-3 p-3 overflow-y-auto">
        {/* Camera */}
        <CameraView apiUrl={API_URL} onDetections={handleDetections} active={true} />

        {/* Info bar mobile */}
        <div
          className="flex items-center justify-between px-5 py-3 rounded-xl text-xs"
          style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block animate-blink" style={{ background: "#22c55e" }} />
            <span style={{ color: "#64748b" }}>Live</span>
          </div>
          <div style={{ color: "#64748b" }}>
            Terdeteksi:{" "}
            <strong style={{ color: "#1e3a6e" }}>{detections.length} kendaraan</strong>
            {detections.length > 0 && (
              <strong style={{ color: detections[0].color }}> · {detections[0].class_name}</strong>
            )}
          </div>
        </div>

        {/* Detection panel — compact horizontal scroll */}
        <div
          className="rounded-xl p-4"
          style={{ background: "#ffffff" }}
        >
          <DetectionPanel detections={detections} compact={true} />
        </div>
      </main>
    </div>
  );
}
