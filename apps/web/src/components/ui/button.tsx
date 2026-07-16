import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[3px] border text-sm font-semibold transition-[transform,background-color,color,box-shadow,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-[2px_2px_0_var(--ink)] hover:bg-[#465235]",
        secondary:
          "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-3)]",
        outline:
          "border-[var(--border-strong)] bg-transparent text-[var(--ink)] hover:bg-[var(--surface)]",
        ghost: "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface)]",
        danger: "border-[var(--danger)] bg-[var(--danger)] text-white hover:bg-[#77382c]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
