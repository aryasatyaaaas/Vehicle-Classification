"use client";

import { useRef, useEffect, useCallback, useState } from "react";

export interface Detection {
  class_id: number;
  class_name: string;
  description: string;
  color: string;
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  plate_number: string | null;
  sharpness?: number;
}

export interface WsPayload {
  detections: Detection[];
  stability_count: number;
  stable: boolean;
  stability_max: number;
}

interface Props {
  apiUrl: string;
  onDetections: (payload: WsPayload) => void;
  onManualCapture?: (blob: Blob) => void;
  active: boolean;
}

const COLORS: Record<number, string> = {
  0: "#22c55e",
  1: "#3b82f6",
  2: "#f59e0b",
  3: "#ef4444",
  4: "#8b5cf6",
};

type FacingMode = "environment" | "user";

export default function CameraView({ apiUrl, onDetections, onManualCapture, active }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef     = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [camError,      setCamError]      = useState<string | null>(null);
  const [fps,           setFps]           = useState(0);
  const [facingMode,    setFacingMode]    = useState<FacingMode>("environment");
  const [hasMultiCam,   setHasMultiCam]   = useState(false);
  const [activeFacing,  setActiveFacing]  = useState<string | null>(null);
  const [flashActive,   setFlashActive]   = useState(false);   // capture flash

  const fpsCountRef = useRef(0);
  const lastFpsTime = useRef(Date.now());

  // ── Detect multiple cameras ────────────────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setHasMultiCam(devices.filter((d) => d.kind === "videoinput").length > 1);
    }).catch(() => {/*ignore*/});
  }, []);

  // ── Start / restart camera ────────────────────────────────────────────────
  const startCamera = useCallback(async (mode: FacingMode) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: mode } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err: Error) => {
          if (err.name !== "AbortError") console.warn("Video play error:", err.message);
        });
      }
      const track    = stream.getVideoTracks()[0];
      const settings = track?.getSettings?.();
      setActiveFacing(settings?.facingMode ?? null);
      setCamError(null);
    } catch (err: unknown) {
      setCamError("Kamera tidak dapat diakses: " + (err instanceof Error ? err.message : String(err)));
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    startCamera(facingMode);
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  }, [active, facingMode, startCamera]);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => prev === "environment" ? "user" : "environment");
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const wsUrl = apiUrl.replace(/^https?/, (m) => m === "https" ? "wss" : "ws") + "/ws/predict";
    const ws    = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as WsPayload;
        const dets: Detection[] = (data.detections ?? []).map((d) => ({
          ...d,
          color: COLORS[d.class_id] ?? "#888",
        }));
        const payload: WsPayload = {
          detections:      dets,
          stability_count: data.stability_count ?? 0,
          stable:          data.stable ?? false,
          stability_max:   data.stability_max ?? 5,
        };
        onDetections(payload);
        drawBoxes(dets, payload.stability_count, payload.stability_max);

        fpsCountRef.current++;
        const now = Date.now();
        if (now - lastFpsTime.current >= 1000) {
          setFps(fpsCountRef.current);
          fpsCountRef.current = 0;
          lastFpsTime.current = now;
        }
      } catch {/*ignore*/}
    };

    ws.onerror = () => setCamError("WebSocket error — pastikan backend berjalan.");
    return () => { ws.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, apiUrl]);

  // ── Send frames (150ms — lebih cepat untuk tracking stabilitas) ───────────
  const sendFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const ws     = wsRef.current;
    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (video.videoWidth === 0 || video.readyState < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => { if (blob && ws.readyState === WebSocket.OPEN) blob.arrayBuffer().then((buf) => ws.send(buf)); },
      "image/jpeg",
      0.88,  // sedikit lebih rendah untuk throughput lebih baik di tracking
    );
  }, []);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(sendFrame, 150); // 150ms → ~6.7 fps tracking
    return () => clearInterval(interval);
  }, [active, sendFrame]);

  // ── Manual Capture ────────────────────────────────────────────────────────
  const triggerCapture = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    // Flash effect
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 350);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => { if (blob && onManualCapture) onManualCapture(blob); },
      "image/jpeg",
      0.98,  // kualitas maksimal untuk capture analisis
    );
  }, [onManualCapture]);

  // ── Draw bounding boxes + stability bar ───────────────────────────────────
  const drawBoxes = useCallback((dets: Detection[], stabCount: number, stabMax: number) => {
    const video   = videoRef.current;
    const overlay = document.getElementById("bbox-overlay") as HTMLCanvasElement | null;
    if (!overlay || !video) return;

    overlay.width  = video.clientWidth;
    overlay.height = video.clientHeight;

    const scaleX = video.clientWidth  / (video.videoWidth  || 640);
    const scaleY = video.clientHeight / (video.videoHeight || 480);

    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    dets.forEach((det) => {
      const { x1, y1, x2, y2 } = det.bbox;
      const rx1 = x1 * scaleX, ry1 = y1 * scaleY;
      const rw  = (x2 - x1) * scaleX, rh = (y2 - y1) * scaleY;
      const color = det.color;
      const pct   = Math.round(det.confidence * 100);
      const isStable = stabCount >= stabMax;

      // Box — lebih tebal saat stabil
      ctx.strokeStyle = isStable ? "#ffffff" : color;
      ctx.lineWidth   = isStable ? 4 : 2.5;
      ctx.setLineDash(isStable ? [] : [6, 4]);
      ctx.strokeRect(rx1, ry1, rw, rh);
      ctx.setLineDash([]);

      // Label
      const label = isStable
        ? `✓ STABIL — ${pct}% ${det.class_name}`
        : `${pct}% ${det.class_name}`;
      ctx.font    = "bold 14px Inter, sans-serif";
      const tw    = ctx.measureText(label).width;
      const lh    = 22;
      ctx.fillStyle = isStable ? "#16a34a" + "ee" : color + "dd";
      ctx.fillRect(rx1, ry1 - lh - 4, tw + 14, lh + 6);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, rx1 + 7, ry1 - 6);

      // Stability bar di bawah bbox — HANYA saat benar-benar stabil
      if (isStable && stabMax > 0) {
        const barW = rw;
        const barH = 6;
        const barY = ry1 + rh + 4;

        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(rx1, barY, barW, barH);
        const grad = ctx.createLinearGradient(rx1, barY, rx1 + barW, barY);
        grad.addColorStop(0, "#16a34a");
        grad.addColorStop(1, "#22c55e");
        ctx.fillStyle = grad;
        ctx.fillRect(rx1, barY, barW, barH); // penuh 100% saat stabil
      }
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{ border: "3px solid #f59e0b", background: "#000", aspectRatio: "16/9", minHeight: 320 }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
        style={{ display: camError ? "none" : "block" }}
      />

      {/* Hidden canvas for frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Bounding box overlay */}
      <canvas
        id="bbox-overlay"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      />

      {/* Capture flash overlay */}
      {flashActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "rgba(255,255,255,0.75)", zIndex: 30, transition: "opacity 0.35s ease" }}
        />
      )}

      {/* LIVE badge */}
      {active && !camError && (
        <div
          className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold"
          style={{ background: "rgba(0,0,0,0.6)", color: "#f87171", zIndex: 20 }}
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-blink inline-block" />
          LIVE
        </div>
      )}

      {/* FPS + flip + capture button */}
      {active && !camError && (
        <div className="absolute top-3 right-3 flex items-center gap-2" style={{ zIndex: 20 }}>
          <div
            className="px-2 py-1 rounded text-xs font-bold tabular-nums"
            style={{ background: "rgba(0,0,0,0.6)", color: "#4ade80" }}
          >
            {fps} FPS
          </div>

          {/* Manual capture button */}
          <button
            onClick={triggerCapture}
            title="Capture & Analisis Sekarang"
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:opacity-80 active:scale-90"
            style={{ background: "rgba(245,158,11,0.85)", border: "1px solid rgba(255,255,255,0.3)" }}
          >
            {/* Camera shutter icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>

          {/* Flip camera */}
          {hasMultiCam && (
            <button
              onClick={toggleCamera}
              title={facingMode === "environment" ? "Ganti ke kamera depan" : "Ganti ke kamera belakang"}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:opacity-80 active:scale-90"
              style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7h-9" /><path d="M14 17H5" />
                <polyline points="17 4 20 7 17 10" /><polyline points="7 14 4 17 7 20" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Kamera aktif label */}
      {active && !camError && (
        <div
          className="absolute bottom-3 left-3 px-2 py-1 rounded text-xs"
          style={{ background: "rgba(0,0,0,0.5)", color: "#e2e8f0", zIndex: 20 }}
        >
          {activeFacing === "environment" ? "📷 Kamera Belakang"
            : activeFacing === "user" ? "🤳 Kamera Depan"
            : "📷 Kamera"}
        </div>
      )}

      {/* Error state */}
      {camError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: "#0f172a", zIndex: 20 }}>
          <span className="text-5xl">📷</span>
          <p className="text-sm text-center px-6" style={{ color: "#f87171" }}>{camError}</p>
          {hasMultiCam && (
            <button onClick={toggleCamera}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "#1e3a6e", color: "#ffffff" }}>
              Coba kamera lain
            </button>
          )}
        </div>
      )}

      {/* Idle state */}
      {!active && !camError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: "#0f172a", zIndex: 20 }}>
          <span className="text-5xl">📷</span>
          <p className="text-sm" style={{ color: "#94a3b8" }}>Kamera belum aktif</p>
        </div>
      )}
    </div>
  );
}
