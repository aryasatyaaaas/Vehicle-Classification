"use client";

import { useEffect, useState } from "react";

const GERBANG_LIST = [
  "Gerbang Tol Kalikangkung",
  "Gerbang Tol Cikampek",
  "Gerbang Tol Cikarang",
  "Gerbang Tol Bekasi Barat",
  "Gerbang Tol Bekasi Timur",
  "Gerbang Tol Halim",
];

const DAYS   = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

interface Props {
  gerbang: string;
  onGerbangChange: (g: string) => void;
}

export default function TollHeader({ gerbang, onGerbangChange }: Props) {
  const [now,     setNow]     = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const day  = now ? DAYS[now.getDay()]   : "";
  const date = now ? `${day}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}` : "";
  const time = now ? now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "––:––:––";

  return (
    <header
      className="flex items-center justify-between px-5 md:px-8 py-3 md:py-4"
      style={{ background: "linear-gradient(90deg, #1e3a6e 0%, #2d5aa0 100%)", minHeight: 56 }}
    >
      {/* Kiri: Logo + Dropdown Gerbang */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <div
          className="w-9 h-9 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-xl md:text-2xl shrink-0"
          style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)" }}
        >
          🛣️
        </div>
        <div className="min-w-0">
          <select
            value={gerbang}
            onChange={(e) => onGerbangChange(e.target.value)}
            className="font-bold bg-transparent border-none outline-none cursor-pointer w-full truncate"
            style={{
              color: "#ffffff",
              fontSize: "clamp(0.75rem, 2.5vw, 1rem)",
              appearance: "none",
              paddingRight: "18px",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0px center",
              maxWidth: "calc(40vw)",
            }}
          >
            {GERBANG_LIST.map((g) => (
              <option key={g} value={g} style={{ color: "#1e293b", background: "#ffffff" }}>
                {g}
              </option>
            ))}
          </select>
          {/* Sembunyikan subtitle di layar sangat kecil */}
          <p className="text-xs mt-0.5 hidden sm:block" style={{ color: "#93c5fd" }}>
            Sistem Klasifikasi Kendaraan Tol
          </p>
        </div>
      </div>

      {/* Kanan: Tanggal (hidden di mobile) + Jam */}
      <div className="text-right shrink-0" suppressHydrationWarning>
        <p className="text-xs hidden md:block" style={{ color: "#bfdbfe" }} suppressHydrationWarning>
          {mounted ? date : ""}
        </p>
        <p
          className="font-bold tabular-nums leading-tight"
          style={{ color: "#fbbf24", fontSize: "clamp(1.1rem, 4vw, 1.875rem)" }}
          suppressHydrationWarning
        >
          {time}
        </p>
      </div>
    </header>
  );
}
