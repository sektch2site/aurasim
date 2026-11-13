import { formatRub } from "@/lib/pricing";
import type { ResolvedPrice } from "@/lib/types";

export function PriceText({ price, size = "md" }: { price: ResolvedPrice; size?: "sm" | "md" | "lg" }) {
  const big = size === "lg" ? "text-3xl" : size === "md" ? "text-lg" : "text-base";
  if (price.kind === "fixed")
    return (
      <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
        {price.old && price.old > price.price ? (
          <span className="text-mute text-sm font-semibold line-through decoration-fire/70">{formatRub(price.old)}</span>
        ) : null}
        <span className={`num text-money ${big}`}>{formatRub(price.price)}</span>
      </span>
    );
  if (price.kind === "range")
    return (
      <span className={`num whitespace-nowrap text-money ${big}`}>
        {price.from === price.to ? formatRub(price.from) : `${formatRub(price.from).replace(" ₽", "")} – ${formatRub(price.to)}`}
      </span>
    );
  return <span className="text-ink-soft text-sm font-semibold whitespace-nowrap">Цена по запросу</span>;
}
