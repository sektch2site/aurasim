"use client";

import type { CatalogItem } from "@/lib/types";
import { useBuy } from "./BuyProvider";
import { NumberDisplay, OperatorDot, operatorName } from "./NumberDisplay";
import { PriceText } from "./Price";

/** Карточка в стиле постов канала: номер в «пилюле», цена, кнопка */
export function NumberCard({ n, hot = false, delay = 0 }: { n: CatalogItem; hot?: boolean; delay?: number }) {
  const open = useBuy();
  const discount = n.price.kind === "fixed" && n.price.old && n.price.old > n.price.price;
  return (
    <article className="card-glow aura-stripes rise flex flex-col rounded-3xl p-4 sm:p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative mb-3 flex items-center justify-between text-xs font-semibold text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <OperatorDot op={n.operator} size={20} />
          {operatorName(n.operator)}
          {n.region ? <span className="text-mute">· {n.region}</span> : null}
        </span>
        {discount ? (
          <span className="rounded-full bg-fire px-2 py-0.5 text-[11px] font-bold text-white">−{Math.round((1 - (n.price as { price: number }).price / (n.price as { old: number }).old) * 100)}%</span>
        ) : hot ? (
          <span className="rounded-full bg-aura px-2 py-0.5 text-[11px] font-bold text-white">Выбор Aura</span>
        ) : null}
      </div>
      <div className="pill-number relative mb-3 rounded-full px-3 py-2.5 text-center">
        <NumberDisplay id={n.id} mask={n.beauty_mask} className="text-[clamp(1.15rem,2.1vw,1.45rem)]" />
      </div>
      <div className="price-chip relative mb-3 flex min-h-11 items-center justify-between gap-2 rounded-2xl px-3 py-2">
        <span className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">{discount ? "Стало" : "Цена"}</span>
        <PriceText price={n.price} />
      </div>
      {n.price.kind !== "fixed" && (n.tariff_name || n.tariff_note) ? (
        <p className="relative mb-3 text-xs text-ink-soft">
          Тариф: {n.tariff_note ?? `${n.tariff_name}${n.tariff_price ? ` · ${n.tariff_price} ₽/мес` : ""}`}
        </p>
      ) : null}
      <button
        onClick={() => open(n.price.kind === "request" ? { kind: "price", numbers: [n.id] } : { kind: "buy", numbers: [n.id] })}
        className="relative mt-auto rounded-2xl bg-aura px-4 py-3 text-sm font-bold text-white transition hover:bg-aura-deep active:scale-[0.98]"
      >
        {n.price.kind === "request" ? "Запросить цену" : "Приобрести"}
      </button>
    </article>
  );
}
