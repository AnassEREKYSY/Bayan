import { cn } from "@/lib/utils";

/**
 * The Bayan mark: a geometric lowercase "b" — its round bowl is the whole
 * portfolio — with a small point above it: the moment things become clear.
 * Mint tile, navy letter: readable on the navy sidebar and on white.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="9" className="fill-mint" />
      <path d="M11 7.5v11.25" stroke="#04261f" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="16.75" cy="19.25" r="5.75" fill="none" stroke="#04261f" strokeWidth="3.4" />
      <circle cx="23.6" cy="8.4" r="2.1" fill="#04261f" opacity="0.45" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  onDark,
}: {
  className?: string;
  markClassName?: string;
  /** Use on navy surfaces (sidebar, hero panels). */
  onDark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className={cn("text-[20px] leading-none font-bold tracking-[-0.03em]", onDark ? "text-white" : "text-fg")}>bayan</span>
    </span>
  );
}
