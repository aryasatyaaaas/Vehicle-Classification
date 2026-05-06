"use client";

import { useEffect, useState } from "react";

interface Props {
  apiUrl: string;
}

export default function Header({ apiUrl }: Props) {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3000) });
        setOnline(res.ok);
      } catch {
        setOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  return (
    <header style={{ background: "rgba(10,15,30,0.8)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}
      className="sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            🚗
          </div>
          <div>
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>VehicleClassifier</span>
            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>Tol Edition</span>
          </div>
        </div>

        {/* API Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <span className={`w-2 h-2 rounded-full ${online === null ? "bg-yellow-400 animate-pulse" : online ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          <span style={{ color: "var(--text-muted)" }}>
            API: {online === null ? "Menghubungkan…" : online ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
