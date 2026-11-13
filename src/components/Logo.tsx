import Image from "next/image";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image src="/brand.jpg" alt="" width={36} height={36} className="h-9 w-9 rounded-full ring-2 ring-white shadow-md shadow-aura/30" priority />
      <span className="font-display text-[1.45rem] leading-none font-extrabold tracking-tight">
        <span className="text-aura">Aura</span> <span className="text-ink">sim</span>
      </span>
    </span>
  );
}
