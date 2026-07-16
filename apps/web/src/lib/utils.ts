import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Utility prepared for shadcn/ui components (Phase 3). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
