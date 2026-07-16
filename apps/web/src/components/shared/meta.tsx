import { Badge } from "@/components/ui/badge";

export function DataModeBadge({ mode }: { mode: "memory" | "dynamodb" }) {
  return (
    <Badge variant={mode === "memory" ? "warning" : "success"}>
      {mode === "memory" ? "Demo data (local)" : "DynamoDB"}
    </Badge>
  );
}

export function ScorePill({ score }: { score: number }) {
  const variant =
    score >= 85
      ? "success"
      : score >= 70
        ? "default"
        : score >= 50
          ? "warning"
          : "secondary";
  return (
    <Badge className="min-w-10 justify-center font-mono text-sm tabular-nums" variant={variant}>
      {score}
    </Badge>
  );
}

export function EstimateCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[3px] border-l-4 border-[var(--warning)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--muted)]">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--warning)]">
        Model estimate
      </p>
      {children}
    </div>
  );
}
