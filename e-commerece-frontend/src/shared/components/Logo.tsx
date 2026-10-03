import { brand } from "@/config/brand";

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M22 30C14 30 7 24 4 12" />
      <path d="M22 25C16 25 11 21 9 14" />
      <path d="M22 20C18 20 15 17 14 13" />
      <path d="M26 30C34 30 41 24 44 12" />
      <path d="M26 25C32 25 37 21 39 14" />
      <path d="M26 20C30 20 33 17 34 13" />
      <path d="M24 6L27 10L24 14L21 10Z" fill="currentColor" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark className="h-9 w-11 text-gold sm:h-11 sm:w-14" />
      <span className="text-center leading-none">
        <span className="block pl-[0.4em] font-serif text-2xl font-bold tracking-[0.4em] sm:text-3xl">
          {brand.logoName}
        </span>
        <span className="mt-1.5 block pl-[0.4em] text-[10px] tracking-[0.4em] sm:text-xs">
          {brand.logoTagline}
        </span>
      </span>
    </span>
  );
}
