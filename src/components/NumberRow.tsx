"use client";

import { formatRub } from "@/lib/pricing";
import type { CatalogItem } from "@/lib/types";
import { useBuy } from "./BuyProvider";
import { HeartButton } from "./Favorites";
import { NumberDisplay, OperatorDot } from "./NumberDisplay";

/** Компактная строка номера: рамка-градиент, номер крупно, цена и кнопка */
export function NumberRow({ n }: { n: CatalogItem }) {
  const open = useBuy();
  const p = n.price;
  const top = n.beauty_score >= 55;
  return (
    <div className={`row-frame ${top ? "row-frame-top" : ""} rounded-2xl p-[2px]`}>
      <div className={`flex items-center gap-2.5 rounded-[14px] px-2.5 py-2 sm:gap-3 sm:px-3.5 ${top ? "bg-gradient-to-r from-[#eaf1ff] to-white" : "bg-white"}`}>
        <OperatorDot op={n.operator} size={26} />
        <div className="min-w-0 flex-1">
          <NumberDisplay id={n.id} mask={n.beauty_mask} className="text-[1.08rem] sm:text-[1.3rem]" />
          <div className="mt-0.5 flex items-center gap-2 text-[12px] font-bold">
            {p.kind === "fixed" ? (
              <>
                <span className="text-money">{formatRub(p.price)}</span>
                {p.old && p.old > p.price ? <span className="text-mute line-through">{formatRub(p.old)}</span> : null}
              </>
            ) : p.kind === "range" ? (
              <span className="text-money">
                {formatRub(p.from).replace(" ₽", "")}–{formatRub(p.to)}
              </span>
            ) : (
              <span className="text-ink-soft">цена по запросу</span>
            )}
            {top ? <span className="text-[11px]">🔥</span> : null}
          </div>
        </div>
        <HeartButton id={n.id} className="h-8 w-8" />
        <button
          onClick={() => open(p.kind === "request" ? { kind: "price", numbers: [n.id] } : { kind: "buy", numbers: [n.id] })}
          className="shrink-0 rounded-xl bg-aura px-3 py-2 text-xs font-extrabold text-white shadow-md shadow-aura/25 transition hover:bg-aura-deep active:scale-95 sm:px-4 sm:text-sm"
        >
          {p.kind === "request" ? "Цена?" : "Купить"}
        </button>
      </div>
    </div>
  );
}
