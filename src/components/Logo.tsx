export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-sky via-aura to-aura-deep shadow-md shadow-aura/30">
        <span className="h-4 w-4 rounded-full border-[3px] border-white/90" />
      </span>
      <span className="font-display text-xl font-bold tracking-tight">
        <span className="text-aura">Aura</span> <span className="font-medium text-ink">sim</span>
      </span>
    </span>
  );
}
