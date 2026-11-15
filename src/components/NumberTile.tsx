"use client";

import { formatRub } from "@/lib/pricing";
import type { CatalogItem } from "@/lib/types";
import { useBuy } from "./BuyProvider";
import { HeartButton } from "./Favorites";
import { NumberDisplay, OperatorDot } from "./NumberDisplay";

/** Компактная плитка для вида «сеткой» (по 2 на телефоне, по 3 на компьютере) */
export function NumberTile({ n }: { n: CatalogItem }) {
  const open = useBuy();
  const p = n.price;
  const top = n.beauty_score >= 55;
  const discount = p.kind === "fixed" && p.old && p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
  return (
    <div className={`row-frame ${top ? "row-frame-top" : ""} rounded-2xl p-[2px]`}>
      <div className={`flex h-full flex-col rounded-[14px] p-2.5 ${top ? "bg-gradient-to-b from-[#eaf1ff] to-white" : "bg-white"}`}>
        <div className="mb-1.5 flex items-center justify-between">
          <OperatorDot op={n.operator} size={22} />
          <div className="flex items-center gap-1">
            {discount ? <span className="rounded-full bg-fire px-1.5 py-0.5 text-[10px] font-extrabold text-white">−{discount}%</span> : null}
            <HeartButton id={n.id} className="h-7 w-7 [&>svg]:h-4 [&>svg]:w-4" />
          </div>
        </div>
        <NumberDisplay id={n.id} mask={n.beauty_mask} fmt={n.display_groups} className="text-[0.98rem] sm:text-[1.15rem]" />
        <div className="mt-1 mb-2 min-h-9 text-[12px] leading-tight font-bold">
          {p.kind === "fixed" ? (
            <>
              <div className="num text-[15px] text-money">{formatRub(p.price)}</div>
              {p.old && p.old > p.price ? <div className="text-mute line-through">{formatRub(p.old)}</div> : null}
            </>
          ) : p.kind === "range" ? (
            <div className="num text-[14px] text-money">
              {formatRub(p.from).replace(" ₽", "")}–{formatRub(p.to)}
            </div>
          ) : (
            <div className="text-ink-soft">цена по запросу</div>
          )}
        </div>
        <button
          onClick={() => open(p.kind === "request" ? { kind: "price", numbers: [n.id] } : { kind: "buy", numbers: [n.id] })}
          className="mt-auto rounded-xl bg-aura py-2 text-xs font-extrabold text-white shadow-md shadow-aura/25 transition hover:bg-aura-deep active:scale-95"
        >
          {p.kind === "request" ? "Узнать цену" : "Купить"}
        </button>
      </div>
    </div>
  );
}
