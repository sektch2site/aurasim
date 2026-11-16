"use client";

import type { BundleView } from "@/lib/data";
import { formatRub } from "@/lib/pricing";
import { useBuy } from "./BuyProvider";
import { NumberDisplay } from "./NumberDisplay";

export function BundleCard({ b }: { b: BundleView }) {
  const open = useBuy();
  const word = b.kind === "trio" ? "тройку" : "пару";
  // у пары/тройки выделение одно на всех: одинаковые 7 цифр после кода — выделяем их целиком,
  // иначе берём выделение первого номера
  const sameBody = b.items.length > 1 && b.items.every((n) => n.id.slice(3) === b.items[0].id.slice(3));
  const groupMask = sameBody ? "0001111111" : (b.items[0]?.beauty_mask ?? "0".repeat(10));
  return (
    <article className="aura-card relative flex flex-col overflow-hidden rounded-[26px] p-4 text-white">
      <div className="relative mb-3 text-center">
        <div className="text-[10px] font-extrabold tracking-[0.2em] text-white/70 uppercase">{b.kind === "trio" ? "Тройка номеров" : "Пара номеров"}</div>
        <div className="font-display mt-0.5 text-lg font-extrabold">{b.title ?? (b.kind === "trio" ? "Интересная тройка" : "Красивая пара")}</div>
      </div>
      <div className="relative mb-3 space-y-1.5">
        {b.items.map((n) => (
          <div key={n.id} className="pill-number-strong rounded-2xl px-2 py-2 text-center">
            <NumberDisplay id={n.id} mask={groupMask} fmt={b.items[0]?.display_groups} className="text-[1.2rem]" />
          </div>
        ))}
      </div>
      <div className="relative mt-auto flex items-end justify-between gap-2">
        <div className="leading-tight">
          <div className="text-[10px] font-extrabold tracking-wider text-white/70 uppercase">🔥 Цена за {word}</div>
          {b.price_old && b.price && b.price_old > b.price ? <div className="text-xs font-bold text-white/60 line-through">{formatRub(b.price_old)}</div> : null}
          <div className="num text-[1.4rem] text-[#7dffa8]">{b.price ? formatRub(b.price) : "по запросу"}</div>
        </div>
        <button
          onClick={() => open(b.price ? { kind: "buy", numbers: b.items.map((i) => i.id), label: word } : { kind: "price", numbers: b.items.map((i) => i.id) })}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-aura shadow-lg shadow-black/10 transition hover:bg-aura-soft active:scale-95"
        >
          Купить {word}
        </button>
      </div>
    </article>
  );
}
