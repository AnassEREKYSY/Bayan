import { cn } from "@/lib/utils";

/**
 * The Bayan mark: a lowercase "b" — its round bowl is the portfolio seen as
 * a whole — with a brass point above it, the moment something becomes clear.
 * Colours follow the theme tokens so it adapts to light and dark mode.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M10.4 7.2v17.6" className="stroke-primary-fg" strokeWidth="3.2" strokeLinecap="round" />
      <path
        d="M10.4 18.4a6.4 6.4 0 1 1 12.8 0a6.4 6.4 0 1 1 -12.8 0"
        fill="none"
        className="stroke-primary-fg"
        strokeWidth="3.2"
      />
      <circle cx="24" cy="8.6" r="2.3" className="fill-accent" />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className="font-display text-[22px] leading-none font-semibold tracking-tight text-fg">bayan</span>
    </span>
  );
}
