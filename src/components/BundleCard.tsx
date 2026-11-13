"use client";

import type { BundleView } from "@/lib/data";
import { formatRub } from "@/lib/pricing";
import { useBuy } from "./BuyProvider";
import { NumberDisplay } from "./NumberDisplay";

export function BundleCard({ b }: { b: BundleView }) {
  const open = useBuy();
  const word = b.kind === "trio" ? "тройку" : "пару";
  return (
    <article className="card-glow aura-stripes flex flex-col rounded-3xl p-5">
      <div className="relative mb-4 text-center">
        <div className="text-[11px] font-bold tracking-[0.2em] text-ink-soft uppercase">{b.kind === "trio" ? "Тройка номеров" : "Пара номеров"}</div>
        <div className="font-display mt-1 inline-block rounded-full bg-gradient-to-r from-aura to-[#3d7bff] px-4 py-1.5 text-sm font-extrabold text-white shadow-md shadow-aura/30">
          {b.title ?? (b.kind === "trio" ? "Интересная тройка" : "Красивая пара")}
        </div>
      </div>
      <div className="relative mb-4 space-y-2">
        {b.items.map((n) => (
          <div key={n.id} className="pill-number rounded-full px-3 py-2 text-center">
            <NumberDisplay id={n.id} mask={n.beauty_mask} className="text-[clamp(1.05rem,1.9vw,1.3rem)]" />
          </div>
        ))}
      </div>
      <div className="price-chip relative mb-4 flex items-center justify-between rounded-2xl px-4 py-2.5">
        <span className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">🔥 Цена за {word}</span>
        <span className="flex items-baseline gap-2">
          {b.price_old && b.price && b.price_old > b.price ? <span className="text-sm font-semibold text-mute line-through">{formatRub(b.price_old)}</span> : null}
          <span className="num text-xl text-money">{b.price ? formatRub(b.price) : "по запросу"}</span>
        </span>
      </div>
      <button
        onClick={() => open(b.price ? { kind: "buy", numbers: b.items.map((i) => i.id), label: word } : { kind: "price", numbers: b.items.map((i) => i.id) })}
        className="relative mt-auto rounded-2xl bg-aura px-4 py-3 text-sm font-bold text-white transition hover:bg-aura-deep"
      >
        Приобрести {word}
      </button>
    </article>
  );
}
