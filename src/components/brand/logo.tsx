import { cn } from "@/lib/utils";

/**
 * The Bayan mark: a geometric lowercase "b" — its round bowl is the whole
 * portfolio — with a small point above it: the moment things become clear.
 * Colours follow the theme tokens so it adapts to light and dark mode.
 */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="9" className={inverted ? "fill-white/15" : "fill-primary"} />
      <path d="M11 7.5v11.25" className={inverted ? "stroke-white" : "stroke-primary-fg"} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="16.75" cy="19.25" r="5.75" fill="none" className={inverted ? "stroke-white" : "stroke-primary-fg"} strokeWidth="3.4" />
      <circle cx="23.6" cy="8.4" r="2.1" className={inverted ? "fill-white" : "fill-primary-fg"} opacity="0.6" />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="text-[20px] leading-none font-semibold tracking-[-0.03em] text-fg">bayan</span>
    </span>
  );
}
