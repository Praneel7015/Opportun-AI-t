import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]",
        secondary:
          "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
        outline: "border-[var(--border)] text-[var(--muted)]",
        success:
          "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]",
        warning:
          "border-[var(--warning)]/25 bg-[var(--warning-soft)] text-[var(--warning)]",
        danger:
          "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
