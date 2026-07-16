import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-10 w-full rounded-[3px] border border-[var(--border-strong)] bg-[#fbf8f0] px-3 py-1 text-sm text-[var(--ink)] shadow-[0_1px_0_rgba(255,255,255,.7)_inset] transition-colors placeholder:text-[var(--muted)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-[var(--surface-3)] disabled:opacity-60",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
