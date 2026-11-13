"use client";

import type { CatalogItem } from "@/lib/types";
import { useBuy } from "./BuyProvider";
import { NumberDisplay, OperatorDot } from "./NumberDisplay";
import { PriceText } from "./Price";

export function NumberRow({ n, showTariff }: { n: CatalogItem; showTariff: boolean }) {
  const open = useBuy();
  return (
    <div className="group flex items-center gap-3 border-b border-line/70 px-3 py-3 last:border-0 hover:bg-aura-soft/40 sm:px-4">
      <OperatorDot op={n.operator} size={26} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <NumberDisplay id={n.id} mask={n.beauty_mask} className="text-lg sm:text-xl" />
          {n.region ? <span className="rounded-md bg-aura-soft px-1.5 py-0.5 text-[11px] font-bold text-aura-deep">{n.region}</span> : null}
        </div>
        {showTariff && (n.tariff_name || n.tariff_note) ? (
          <div className="mt-0.5 text-xs text-ink-soft">
            {n.tariff_note ?? n.tariff_name}
            {!n.tariff_note && n.tariff_price ? ` · ${n.tariff_price} ₽/мес` : ""}
          </div>
        ) : null}
        <div className="mt-0.5 sm:hidden">
          <PriceText price={n.price} size="sm" />
        </div>
      </div>
      <div className="hidden text-right sm:block">
        <PriceText price={n.price} size="sm" />
      </div>
      <button
        onClick={() => open(n.price.kind === "request" ? { kind: "price", numbers: [n.id] } : { kind: "buy", numbers: [n.id] })}
        className="shrink-0 rounded-xl bg-aura px-3 py-2 text-xs font-bold text-white transition hover:bg-aura-deep sm:px-4 sm:text-sm"
      >
        <span className="sm:hidden">{n.price.kind === "request" ? "Цена?" : "Купить"}</span>
        <span className="hidden sm:inline">{n.price.kind === "request" ? "Узнать цену" : "Купить"}</span>
      </button>
    </div>
  );
}
