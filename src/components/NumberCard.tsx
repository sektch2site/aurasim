"use client";

import { formatRub } from "@/lib/pricing";
import type { CatalogItem } from "@/lib/types";
import { useBuy } from "./BuyProvider";
import { Features } from "./Icons";
import { NumberDisplay, OperatorDot, operatorName } from "./NumberDisplay";

/** Карточка-пост как в канале Aura sim */
export function NumberCard({ n, hot = false, delay = 0 }: { n: CatalogItem; hot?: boolean; delay?: number }) {
  const open = useBuy();
  const p = n.price;
  const discount = p.kind === "fixed" && p.old && p.old > p.price;
  return (
    <article className="card-glow aura-stripes rise flex flex-col rounded-[28px] px-4 pt-4 pb-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative mb-3 flex items-center justify-between text-[11px] font-bold text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <OperatorDot op={n.operator} size={18} />
          {operatorName(n.operator)}
          {n.region ? <span className="font-semibold text-mute">· {n.region}</span> : null}
        </span>
        {discount ? (
          <span className="rounded-full bg-fire px-2 py-0.5 text-white">−{Math.round((1 - p.price / p.old!) * 100)}%</span>
        ) : hot ? (
          <span className="font-display text-[13px] font-extrabold">
            <span className="text-aura">Aura</span> sim
          </span>
        ) : null}
      </div>

      <div className="relative mb-1 flex items-center justify-center gap-2 text-[10px] font-extrabold tracking-[0.18em] text-ink uppercase">
        <span className="h-[2px] w-5 rounded bg-aura" /> Красивый номер <span className="h-[2px] w-5 rounded bg-aura" />
      </div>

      <div className="pill-number relative mx-auto my-2 w-full rounded-full px-2 py-2.5 text-center">
        <NumberDisplay id={n.id} mask={n.beauty_mask} className="text-[clamp(1.2rem,2.2vw,1.55rem)]" dim="text-ink" />
      </div>

      <div className="price-chip relative my-2 flex min-h-12 items-center rounded-full px-3 py-1.5">
        <span className="mr-1 text-lg">🔥</span>
        <span className="font-display text-[10px] leading-tight font-extrabold text-ink uppercase">
          {discount ? (
            <>
              Было:
              <br />
              <span className="text-mute line-through decoration-fire decoration-2">{formatRub(p.old!)}</span>
            </>
          ) : (
            <>
              Стоимость
              <br />
              номера:
            </>
          )}
        </span>
        <span className="mx-2.5 h-7 w-[3px] rounded bg-aura" />
        <span className="ml-auto">
          {p.kind === "fixed" ? (
            <span className="num text-[1.45rem] text-money">{formatRub(p.price)}</span>
          ) : p.kind === "range" ? (
            <span className="num text-base text-money">
              {formatRub(p.from).replace(" ₽", "")}–{formatRub(p.to)}
            </span>
          ) : (
            <span className="font-display text-sm font-extrabold text-ink-soft">по запросу</span>
          )}
        </span>
      </div>

      {p.kind !== "fixed" && (n.tariff_note || n.tariff_name) ? (
        <p className="relative mb-1 text-center text-[11px] font-semibold text-ink-soft">
          Тариф: {n.tariff_note ?? `${n.tariff_name}${n.tariff_price ? ` · ${n.tariff_price} ₽/мес` : ""}`}
        </p>
      ) : null}

      <div className="relative my-2">
        <Features compact />
      </div>

      <button
        onClick={() => open(p.kind === "request" ? { kind: "price", numbers: [n.id] } : { kind: "buy", numbers: [n.id] })}
        className="relative mt-auto rounded-2xl bg-aura px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-aura/25 transition hover:bg-aura-deep active:scale-[0.98]"
      >
        {p.kind === "request" ? "Узнать цену" : "Приобрести 📲"}
      </button>
    </article>
  );
}
