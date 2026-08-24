import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui's standard class-merging helper: lets components accept a
// `className` override without fighting their own default Tailwind classes
// (twMerge resolves conflicts like "px-4" vs a caller's "px-8" sanely).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
