import { useId } from "react";

/** Faint geometric lattice, a quiet nod to zellige. Used only on Majorelle panels. */
export function Lattice({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg aria-hidden className={className ?? "pointer-events-none absolute inset-0 h-full w-full text-white opacity-[0.07]"}>
      <defs>
        <pattern id={`lattice-${id}`} width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M28 0 56 28 28 56 0 28Z M28 14 42 28 28 42 14 28Z" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
        <linearGradient id={`fade-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.3" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="white" stopOpacity="1" />
        </linearGradient>
        <mask id={`mask-${id}`}>
          <rect width="100%" height="100%" fill={`url(#fade-${id})`} />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill={`url(#lattice-${id})`} mask={`url(#mask-${id})`} />
    </svg>
  );
}
