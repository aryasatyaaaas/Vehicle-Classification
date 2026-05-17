"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import tollGatesData from "@/app/toll-gates.json";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// ── Types ─────────────────────────────────────────────────────────────────────
interface TollGate { name: string; exit: string; }
interface ProvinceGroup { province: string; gates: TollGate[]; }

const TOLL_DATA: ProvinceGroup[] = tollGatesData as ProvinceGroup[];

// ── Storage key ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "jm_selected_gerbang";
const DEFAULT_GATE = "GT Kalikangkung";

interface Props {
  gerbang: string;
  onGerbangChange?: (gerbang: string) => void;
}

/* Toll / road icon SVG */
function TollIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="16" width="28" height="4" rx="2" fill="white" />
      <rect x="16" y="4" width="4" height="8" rx="2" fill="white" />
      <rect x="16" y="24" width="4" height="8" rx="2" fill="white" />
      <rect x="2" y="13" width="32" height="3" rx="1.5" fill="white" opacity="0.5" />
      <rect x="4" y="10" width="3" height="16" rx="1.5" fill="white" opacity="0.7" />
      <rect x="29" y="10" width="3" height="16" rx="1.5" fill="white" opacity="0.7" />
    </svg>
  );
}

/* Chevron down icon */
function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform 0.25s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function TollHeader({ gerbang: defaultGerbang, onGerbangChange }: Props) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState("");

  // ── Dropdown state ────────────────────────────────────────────────────────
  const [dropOpen, setDropOpen] = useState(false);
  const [selectedGerbang, setSelectedGerbang] = useState(DEFAULT_GATE);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const dropRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Clock ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    const uid = sessionStorage.getItem("jm_user") || "petugas";
    setUserId(uid);
    // Load saved gate
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) setSelectedGerbang(saved);
    return () => clearInterval(t);
  }, []);

  const day = now ? DAYS[now.getDay()] : "";
  const date = now ? `${day}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}` : "";
  const time = now
    ? now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "──:──:──";

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
        setSearch("");
        setSelectedProvince(null);
      }
    };
    if (dropOpen) {
      document.addEventListener("mousedown", handleClick);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropOpen]);

  // ── Select gate ───────────────────────────────────────────────────────────
  const selectGate = useCallback((name: string) => {
    setSelectedGerbang(name);
    sessionStorage.setItem(STORAGE_KEY, name);
    onGerbangChange?.(name);
    setDropOpen(false);
    setSearch("");
    setSelectedProvince(null);
  }, [onGerbangChange]);

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filtered: ProvinceGroup[] = search.trim()
    ? TOLL_DATA.map(pg => ({
      ...pg,
      gates: pg.gates.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        pg.province.toLowerCase().includes(search.toLowerCase())
      ),
    })).filter(pg => pg.gates.length > 0)
    : selectedProvince
      ? TOLL_DATA.filter(pg => pg.province === selectedProvince)
      : TOLL_DATA;

  const handleLogout = () => {
    sessionStorage.removeItem("jm_auth");
    sessionStorage.removeItem("jm_user");
    router.replace("/login");
  };

  return (
    <>
      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gate-item {
          padding: 8px 14px;
          cursor: pointer;
          border-radius: 6px;
          font-family: Inter, sans-serif;
          font-size: 13px;
          color: #1e293b;
          transition: background 0.15s;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .gate-item:hover, .gate-item.active {
          background: #eff6ff;
          color: #0D63A5;
          font-weight: 600;
        }
        .gate-item.active {
          background: #dbeafe;
        }
        .prov-chip {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-family: Inter, sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          border: 1.5px solid transparent;
        }
        .prov-chip:hover {
          border-color: #0D63A5;
          color: #0D63A5;
          background: #eff6ff;
        }
        .prov-chip.active-prov {
          background: #0D63A5;
          color: #fff;
          border-color: #0D63A5;
        }
      `}</style>

      <header style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 75px",
        height: 100,
        background: "#0D63A5",
        flexShrink: 0,
        gap: 10,
        position: "relative",
        zIndex: 50,
      }}>

        {/* ── LEFT: Icon + Gerbang Dropdown + ID Petugas ── */}
        <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 24 }}>
          {/* Icon box */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "flex-start",
            padding: 14, width: 64, height: 64,
            background: "#083358", borderRadius: 10, flexShrink: 0,
          }}>
            <TollIcon />
          </div>

          {/* Gerbang dropdown + ID */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: 64 }}>

            {/* ── Dropdown trigger ── */}
            <div ref={dropRef} style={{ position: "relative" }}>
              <button
                id="gerbang-selector-btn"
                onClick={() => setDropOpen(o => !o)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: 0,
                }}
              >
                <span style={{
                  fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 25,
                  lineHeight: "120%", color: "#FFFFFF", whiteSpace: "nowrap",
                }}>
                  {selectedGerbang}
                </span>
                <ChevronDown open={dropOpen} />
              </button>

              {/* ── Dropdown panel ── */}
              {dropOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", left: 0,
                  width: 440,
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
                  zIndex: 999,
                  animation: "dropIn 0.2s ease",
                  overflow: "hidden",
                }}>
                  {/* Search */}
                  <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    <input
                      ref={searchRef}
                      id="gerbang-search-input"
                      type="text"
                      value={search}
                      onChange={e => { setSearch(e.target.value); setSelectedProvince(null); }}
                      placeholder="Cari gerbang atau provinsi..."
                      style={{
                        width: "100%", padding: "8px 12px",
                        border: "1.5px solid #bfdbfe", borderRadius: 8,
                        fontFamily: "Inter, sans-serif", fontSize: 13,
                        outline: "none", boxSizing: "border-box",
                        color: "#1e293b",
                      }}
                    />
                  </div>

                  {/* Province chips */}
                  {!search.trim() && (
                    <div style={{
                      display: "flex", gap: 6, padding: "8px 12px",
                      overflowX: "auto", scrollbarWidth: "none",
                      borderBottom: "1px solid #f1f5f9",
                    }}>
                      <button
                        className={`prov-chip ${selectedProvince === null ? "active-prov" : ""}`}
                        onClick={() => setSelectedProvince(null)}
                      >
                        Semua
                      </button>
                      {TOLL_DATA.map(pg => (
                        <button
                          key={pg.province}
                          className={`prov-chip ${selectedProvince === pg.province ? "active-prov" : ""}`}
                          onClick={() => setSelectedProvince(pg.province)}
                        >
                          {pg.province}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Gate list */}
                  <div style={{ maxHeight: 340, overflowY: "auto", padding: "6px 8px 8px" }}>
                    {filtered.length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontFamily: "Inter", fontSize: 13 }}>
                        Gerbang tidak ditemukan
                      </div>
                    ) : (
                      filtered.map(pg => (
                        <div key={pg.province}>
                          {/* Province header — tampilkan jika tidak filter satu provinsi */}
                          {(!selectedProvince || search.trim()) && (
                            <div style={{
                              padding: "6px 14px 3px",
                              fontFamily: "Inter, sans-serif", fontSize: 11,
                              fontWeight: 700, color: "#94a3b8",
                              textTransform: "uppercase", letterSpacing: "0.08em",
                            }}>
                              {pg.province} ({pg.gates.length})
                            </div>
                          )}
                          {pg.gates.map(gate => (
                            <div
                              key={gate.name}
                              id={`gate-option-${gate.name.replace(/\s+/g, '-')}`}
                              className={`gate-item ${gate.name === selectedGerbang ? "active" : ""}`}
                              onClick={() => selectGate(gate.name)}
                              title={gate.exit ? `Keluar terdekat: ${gate.exit}` : gate.name}
                            >
                              <span style={{ fontWeight: gate.name === selectedGerbang ? 700 : 400 }}>
                                {gate.name === selectedGerbang ? "✓ " : ""}{gate.name}
                              </span>
                              {gate.exit && (
                                <span style={{ color: "#94a3b8", marginLeft: 6, fontSize: 11 }}>
                                  → {gate.exit.split("/")[0].trim()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer: total */}
                  <div style={{
                    padding: "6px 14px", borderTop: "1px solid #f1f5f9",
                    fontFamily: "Inter", fontSize: 11, color: "#94a3b8", textAlign: "right",
                  }}>
                    {filtered.reduce((sum, pg) => sum + pg.gates.length, 0)} gerbang tersedia
                  </div>
                </div>
              )}
            </div>

            {/* ID Petugas */}
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 16 }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 16, color: "#BFBFBF" }}>
                ID Petugas:
              </span>
              <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 16, color: "#FFD717" }}
                suppressHydrationWarning>
                #{mounted ? userId : ""}
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Date + Time + Logout ── */}
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 102 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }} suppressHydrationWarning>
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 25, lineHeight: "120%", color: "#FFFFFF", whiteSpace: "nowrap" }}
              suppressHydrationWarning>
              {mounted ? date : ""}
            </span>
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 39, lineHeight: "120%", color: "#FFD717", fontVariantNumeric: "tabular-nums" }}
              suppressHydrationWarning>
              {time}
            </span>
          </div>

          <button
            id="logout-btn"
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "8px 16px", width: 139, height: 53,
              background: "#D30B0B", borderRadius: 10, border: "none",
              cursor: "pointer", fontFamily: "Inter, sans-serif",
              fontWeight: 700, fontSize: 31, lineHeight: "120%", color: "#FFFFFF",
              transition: "opacity 0.2s, transform 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            Logout
          </button>
        </div>
      </header>
    </>
  );
}
