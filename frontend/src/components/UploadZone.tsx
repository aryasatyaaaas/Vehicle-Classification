"use client";

import { useCallback, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  status: "idle" | "loading" | "success" | "error";
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/bmp"];

export default function UploadZone({ onFile, status }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && ACCEPTED.includes(file.type)) onFile(file);
    },
    [onFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  };

  const isLoading = status === "loading";

  return (
    <label htmlFor="file-upload">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="rounded-2xl p-8 text-center cursor-pointer transition-all duration-300"
        style={{
          background:  dragging ? "rgba(99,102,241,0.12)" : "var(--bg-card)",
          border:      `2px dashed ${dragging ? "#6366f1" : "rgba(255,255,255,0.12)"}`,
          minHeight:   220,
          display:     "flex",
          flexDirection:"column",
          alignItems:  "center",
          justifyContent:"center",
          gap:         "12px",
          boxShadow:   dragging ? "0 0 30px rgba(99,102,241,0.2)" : "none",
        }}
      >
        <div className="text-5xl">{isLoading ? "⏳" : dragging ? "📂" : "📸"}</div>
        <div>
          <p className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
            {isLoading ? "Memproses…" : "Drag & drop gambar di sini"}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            atau klik untuk memilih file · JPG, PNG, WebP, BMP
          </p>
        </div>

        <div className="mt-2 px-5 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80 animate-pulse-glow"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}>
          Pilih Gambar
        </div>
      </div>
      <input
        id="file-upload"
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={handleChange}
        disabled={isLoading}
      />
    </label>
  );
}
