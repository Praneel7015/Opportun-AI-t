import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[96px] w-full rounded-[3px] border border-[var(--border-strong)] bg-[#fbf8f0] px-3 py-2 text-sm leading-relaxed text-[var(--ink)] shadow-[0_1px_0_rgba(255,255,255,.7)_inset] placeholder:text-[var(--muted)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-[var(--surface-3)] disabled:opacity-60",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
