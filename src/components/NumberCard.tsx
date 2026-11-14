"use client";

import { formatRub } from "@/lib/pricing";
import type { CatalogItem } from "@/lib/types";
import { useBuy } from "./BuyProvider";
import { HeartButton } from "./Favorites";
import { NumberDisplay, OperatorDot, operatorName } from "./NumberDisplay";

/** Яркая карточка «Номер недели» — синий градиент, номер в белой «пилюле» */
export function NumberCard({ n, delay = 0 }: { n: CatalogItem; delay?: number }) {
  const open = useBuy();
  const p = n.price;
  const discount = p.kind === "fixed" && p.old && p.old > p.price;
  return (
    <article
      className="rise aura-card relative flex w-[78vw] max-w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-[26px] p-3.5 text-white sm:w-auto sm:max-w-none"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative mb-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 py-1 pr-2.5 pl-1 text-[11px] font-bold">
          <OperatorDot op={n.operator} size={20} />
          {operatorName(n.operator)}
        </span>
        <span className="flex items-center gap-1.5">
          {discount ? <span className="rounded-full bg-fire px-2 py-0.5 text-[11px] font-extrabold">−{Math.round((1 - p.price / p.old!) * 100)}%</span> : null}
          <HeartButton id={n.id} light />
        </span>
      </div>

      <div className="pill-number-strong relative rounded-2xl px-2 py-2.5 text-center">
        <NumberDisplay id={n.id} mask={n.beauty_mask} className="text-[1.32rem] sm:text-[1.4rem]" dim="text-ink" />
      </div>

      <div className="relative mt-2.5 flex items-end justify-between gap-2">
        <div className="leading-tight">
          {discount ? <div className="text-xs font-bold text-white/60 line-through">{formatRub(p.old!)}</div> : <div className="text-[10px] font-extrabold tracking-wider text-white/70 uppercase">🔥 Стоимость</div>}
          {p.kind === "fixed" ? (
            <div className="num text-[1.45rem] text-[#7dffa8]">{formatRub(p.price)}</div>
          ) : p.kind === "range" ? (
            <div className="num text-lg text-[#7dffa8]">
              {formatRub(p.from).replace(" ₽", "")}–{formatRub(p.to)}
            </div>
          ) : (
            <div className="font-display text-base font-extrabold">по запросу</div>
          )}
        </div>
        <button
          onClick={() => open(p.kind === "request" ? { kind: "price", numbers: [n.id] } : { kind: "buy", numbers: [n.id] })}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-aura shadow-lg shadow-black/10 transition hover:bg-aura-soft active:scale-95"
        >
          {p.kind === "request" ? "Узнать цену" : "Купить"}
        </button>
      </div>
    </article>
  );
}
