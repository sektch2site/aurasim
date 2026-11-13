const base = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function PeopleIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} {...base}>
      <circle cx="11" cy="10" r="4.5" />
      <circle cx="22" cy="10" r="4.5" />
      <path d="M3 26c0-4.4 3.6-8 8-8s8 3.6 8 8z" />
      <path d="M17.5 18.6A8 8 0 0 1 29 26h-8" />
    </svg>
  );
}

export function LaptopIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} {...base}>
      <rect x="6" y="7" width="20" height="14" rx="2" />
      <path d="M3 25h26" />
      <path d="M14 22.5h4" />
    </svg>
  );
}

export function TagIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} {...base}>
      <path d="M17 4h10v10L15 26 6 17z" />
      <circle cx="22" cy="9" r="1.6" />
      <path d="m12.5 18.5 5-5" />
      <circle cx="12.5" cy="14" r="1" />
      <circle cx="17.5" cy="18.5" r="1" />
    </svg>
  );
}

/** Строка «Личная встреча | Дистанционное оформление» как на постах */
export function Features({ compact = false }: { compact?: boolean }) {
  const t = compact ? "text-[11px] leading-tight" : "text-sm leading-tight";
  const ic = compact ? "h-6 w-6" : "h-8 w-8";
  return (
    <div className={`flex items-center justify-center ${compact ? "gap-3" : "gap-5"} font-bold text-ink`}>
      <span className="flex items-center gap-2">
        <PeopleIcon className={`${ic} text-aura`} />
        <span className={t}>
          Личная
          <br />
          встреча
        </span>
      </span>
      <span className={`feature-bar ${compact ? "h-7" : "h-10"}`} />
      <span className="flex items-center gap-2">
        <LaptopIcon className={`${ic} text-aura`} />
        <span className={t}>
          Дистанционное
          <br />
          оформление
        </span>
      </span>
    </div>
  );
}
