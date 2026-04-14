interface StatusBadgeProps {
  status: "online" | "offline";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const className =
    status === "online"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : "border-rose-400/30 bg-rose-400/10 text-rose-200";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {status}
    </span>
  );
}

