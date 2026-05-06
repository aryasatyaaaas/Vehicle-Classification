interface Props {
  status: "idle" | "loading" | "success" | "error";
}

const config = {
  idle:    { label: "Siap",        color: "#94a3b8", dot: "#94a3b8" },
  loading: { label: "Memproses…", color: "#f59e0b", dot: "#f59e0b" },
  success: { label: "Selesai",     color: "#22c55e", dot: "#22c55e" },
  error:   { label: "Error",       color: "#ef4444", dot: "#ef4444" },
};

export default function StatusBadge({ status }: Props) {
  const { label, color, dot } = config[status];
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
      style={{ background: `${color}18`, border: `1px solid ${color}44`, color }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: dot }} />
      {label}
    </div>
  );
}
