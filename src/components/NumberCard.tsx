"use client";

import { formatRub } from "@/lib/pricing";
import type { CatalogItem } from "@/lib/types";
import { useBuy } from "./BuyProvider";
import { HeartButton } from "./Favorites";
import { NumberDisplay, OperatorDot, operatorName } from "./NumberDisplay";

/** Карточка «Номер недели»: синий градиент, номер в белой «пилюле». Компактная — сетка 2 ряда × 3 с прокруткой. */
export function NumberCard({ n, delay = 0 }: { n: CatalogItem; delay?: number }) {
  const open = useBuy();
  const p = n.price;
  const discount = p.kind === "fixed" && p.old && p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
  return (
    <article className="rise aura-card relative flex snap-start flex-col overflow-hidden rounded-[20px] p-2.5 text-white sm:rounded-[24px] sm:p-3.5" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative mb-2 flex items-center justify-between gap-1">
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-white/15 py-0.5 pr-2 pl-0.5 text-[10px] font-bold sm:text-[11px]">
          <OperatorDot op={n.operator} size={18} />
          <span className="truncate">{operatorName(n.operator)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {discount ? <span className="rounded-full bg-fire px-1.5 py-0.5 text-[10px] font-extrabold">−{discount}%</span> : null}
          <HeartButton id={n.id} light className="h-7 w-7 sm:h-8 sm:w-8 [&>svg]:h-4 [&>svg]:w-4" />
        </span>
      </div>

      <div className="pill-number-strong relative rounded-xl px-1 py-1.5 text-center sm:rounded-2xl sm:py-2.5">
        <NumberDisplay id={n.id} mask={n.beauty_mask} className="text-[0.86rem] sm:text-[1.25rem]" dim="text-ink" />
      </div>

      <div className="relative mt-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5">
        <div className="min-w-0 leading-tight">
          {discount ? <div className="text-[10px] font-bold text-white/60 line-through sm:text-xs">{formatRub(p.kind === "fixed" ? p.old! : 0)}</div> : null}
          {p.kind === "fixed" ? (
            <div className="num text-[1.05rem] text-[#7dffa8] sm:text-[1.35rem]">{formatRub(p.price)}</div>
          ) : (
            <div className="font-display text-sm font-extrabold">по запросу</div>
          )}
        </div>
        <button
          onClick={() => open(p.kind === "request" ? { kind: "price", numbers: [n.id] } : { kind: "buy", numbers: [n.id] })}
          className="w-full rounded-lg bg-white px-3 py-1.5 text-xs font-extrabold text-aura shadow-md shadow-black/10 transition hover:bg-aura-soft active:scale-95 sm:w-auto sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
        >
          {p.kind === "request" ? "Узнать цену" : "Купить"}
        </button>
      </div>
    </article>
  );
}
