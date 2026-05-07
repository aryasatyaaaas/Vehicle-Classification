"use client";

import { useRef, useEffect, useCallback, useState } from "react";

export interface Detection {
  class_id: number;
  class_name: string;
  description: string;
  color: string;
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
}

interface Props {
  apiUrl: string;
  onDetections: (dets: Detection[]) => void;
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

export default function CameraView({ apiUrl, onDetections, active }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef     = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [camError,      setCamError]      = useState<string | null>(null);
  const [fps,           setFps]           = useState(0);
  const [facingMode,    setFacingMode]    = useState<FacingMode>("environment");
  const [hasMultiCam,   setHasMultiCam]   = useState(false);
  const [activeFacing,  setActiveFacing]  = useState<string | null>(null); // label kamera nyata

  const fpsCountRef   = useRef(0);
  const lastFpsTime   = useRef(Date.now());

  // ── Detect if device has multiple cameras ─────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoCams = devices.filter((d) => d.kind === "videoinput");
      setHasMultiCam(videoCams.length > 1);
    }).catch(() => {/* ignore */});
  }, []);

  // ── Start / restart camera when facingMode changes ────────────────────────
  const startCamera = useCallback(async (mode: FacingMode) => {
    // Stop existing stream first
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:      { ideal: 1280 },
          height:     { ideal: 720  },
          facingMode: { ideal: mode },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Baca facingMode dari track yang benar-benar aktif
      const track    = stream.getVideoTracks()[0];
      const settings = track?.getSettings?.();
      const realFacing = settings?.facingMode; // "environment" | "user" | undefined
      setActiveFacing(realFacing ?? null);

      setCamError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCamError("Kamera tidak dapat diakses: " + msg);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [active, facingMode, startCamera]);

  // ── Toggle kamera depan / belakang ────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    const wsUrl = apiUrl.replace(/^https?/, (m) => m === "https" ? "wss" : "ws") + "/ws/predict";
    const ws    = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const dets: Detection[] = (data.detections ?? []).map((d: Detection) => ({
          ...d,
          color: COLORS[d.class_id] ?? "#888",
        }));
        onDetections(dets);
        drawBoxes(dets);

        fpsCountRef.current++;
        const now = Date.now();
        if (now - lastFpsTime.current >= 1000) {
          setFps(fpsCountRef.current);
          fpsCountRef.current = 0;
          lastFpsTime.current = now;
        }
      } catch {/* ignore */}
    };

    ws.onerror = () => setCamError("WebSocket error — pastikan backend berjalan.");

    return () => { ws.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, apiUrl]);

  // ── Send frames ───────────────────────────────────────────────────────────
  const sendFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const ws     = wsRef.current;
    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => { if (blob) blob.arrayBuffer().then((buf) => ws.send(buf)); },
      "image/jpeg",
      0.7,
    );
  }, []);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(sendFrame, 200);
    return () => clearInterval(interval);
  }, [active, sendFrame]);

  // ── Draw bounding boxes ───────────────────────────────────────────────────
  const drawBoxes = useCallback((dets: Detection[]) => {
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

      ctx.strokeStyle = color;
      ctx.lineWidth   = 3;
      ctx.strokeRect(rx1, ry1, rw, rh);

      const label = `${pct}% ${det.class_name}`;
      ctx.font    = "bold 15px Inter, sans-serif";
      const tw    = ctx.measureText(label).width;
      const lh    = 22;
      ctx.fillStyle = color + "dd";
      ctx.fillRect(rx1, ry1 - lh - 2, tw + 12, lh + 4);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, rx1 + 6, ry1 - 6);
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

      {/* Hidden canvas for sending frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Bounding box overlay */}
      <canvas
        id="bbox-overlay"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      />

      {/* Top-left: LIVE badge */}
      {active && !camError && (
        <div
          className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold"
          style={{ background: "rgba(0,0,0,0.6)", color: "#f87171", zIndex: 20 }}
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-blink inline-block" />
          LIVE
        </div>
      )}

      {/* Top-right: FPS + tombol flip kamera */}
      {active && !camError && (
        <div className="absolute top-3 right-3 flex items-center gap-2" style={{ zIndex: 20 }}>
          {/* FPS */}
          <div
            className="px-2 py-1 rounded text-xs font-bold tabular-nums"
            style={{ background: "rgba(0,0,0,0.6)", color: "#4ade80" }}
          >
            {fps} FPS
          </div>

          {/* Tombol flip — hanya tampil jika ada lebih dari 1 kamera */}
          {hasMultiCam && (
            <button
              onClick={toggleCamera}
              title={facingMode === "environment" ? "Ganti ke kamera depan" : "Ganti ke kamera belakang"}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:opacity-80 active:scale-90"
              style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              {/* Flip icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7h-9" />
                <path d="M14 17H5" />
                <polyline points="17 4 20 7 17 10" />
                <polyline points="7 14 4 17 7 20" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Label kamera aktif (depan/belakang) */}
      {active && !camError && (
        <div
          className="absolute bottom-3 left-3 px-2 py-1 rounded text-xs"
          style={{ background: "rgba(0,0,0,0.5)", color: "#e2e8f0", zIndex: 20 }}
        >
          {activeFacing === "environment"
            ? "📷 Kamera Belakang"
            : activeFacing === "user"
            ? "🤳 Kamera Depan"
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
            <button
              onClick={toggleCamera}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: "#1e3a6e", color: "#ffffff" }}
            >
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
