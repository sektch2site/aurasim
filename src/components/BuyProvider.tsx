"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { formatNumber } from "@/lib/beauty";
import type { Settings } from "@/lib/types";

type BuyIntent =
  | { kind: "buy"; numbers: string[]; label?: string }
  | { kind: "price"; numbers: string[] }
  | { kind: "sell" }
  | { kind: "tariff"; name: string };

const Ctx = createContext<(i: BuyIntent) => void>(() => {});

export function useBuy() {
  return useContext(Ctx);
}

function message(i: BuyIntent): string {
  const list = "numbers" in i ? i.numbers.map(formatNumber).join(", ") : "";
  switch (i.kind) {
    case "buy":
      return i.numbers.length > 1 ? `Хочу приобрести ${i.label ?? "номера"}: ${list}` : `Хочу приобрести номер ${list}`;
    case "price":
      return `Подскажите цену номера ${list}`;
    case "sell":
      return "Хочу продать свой номер";
    case "tariff":
      return `Интересует тариф «${i.name}»`;
  }
}

export function BuyProvider({ settings, children }: { settings: Settings; children: React.ReactNode }) {
  const [intent, setIntent] = useState<BuyIntent | null>(null);
  const [copied, setCopied] = useState(false);
  const open = useCallback((i: BuyIntent) => {
    setCopied(false);
    setIntent(i);
  }, []);

  useEffect(() => {
    if (!intent) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIntent(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [intent]);

  const msg = intent ? message(intent) : "";
  const enc = encodeURIComponent(msg);
  const tg = settings.telegram.replace(/^@/, "");
  const wa = settings.whatsapp.replace(/\D/g, "");
  const links = [
    tg && { label: "Написать в Telegram", href: `https://t.me/${tg}?text=${enc}`, cls: "bg-[#229ED9] text-white", icon: "✈" },
    wa && { label: "Написать в WhatsApp", href: `https://wa.me/${wa}?text=${enc}`, cls: "bg-[#25D366] text-white", icon: "◉" },
    settings.max && { label: "Написать в MAX", href: settings.max, cls: "bg-[#7a3cff] text-white", icon: "M" },
    settings.phone && { label: "Позвонить", href: `tel:${settings.phone.replace(/[^\d+]/g, "")}`, cls: "bg-ink text-white", icon: "☎" },
  ].filter(Boolean) as { label: string; href: string; cls: string; icon: string }[];

  const title =
    intent?.kind === "sell" ? "Выкуп номера" : intent?.kind === "price" ? "Узнать цену" : intent?.kind === "tariff" ? "Подключить тариф" : "Оформить номер";

  return (
    <Ctx.Provider value={open}>
      {children}
      {intent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center" onClick={() => setIntent(null)}>
          <div
            role="dialog"
            aria-modal="true"
            className="rise w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="font-display text-xl font-extrabold">{title}</h3>
              <button onClick={() => setIntent(null)} className="grid h-9 w-9 place-items-center rounded-full bg-paper text-ink-soft hover:bg-aura-soft" aria-label="Закрыть">
                ✕
              </button>
            </div>
            {"numbers" in intent && (
              <div className="mb-3 space-y-1">
                {intent.numbers.map((n) => (
                  <div key={n} className="num text-center text-2xl text-aura">
                    {formatNumber(n)}
                  </div>
                ))}
              </div>
            )}
            <p className="mb-5 text-center text-sm text-ink-soft">
              {intent.kind === "sell"
                ? "Напишите номер и оператора — оценим и предложим цену выкупа."
                : "Менеджер подтвердит наличие, расскажет условия переоформления и закрепит номер за вами."}
            </p>
            <div className="space-y-2.5">
              {links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 rounded-2xl px-5 py-4 font-bold transition hover:brightness-110 ${l.cls}`}>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-sm">{l.icon}</span>
                  {l.label}
                </a>
              ))}
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(msg);
                  setCopied(true);
                }}
                className="w-full rounded-2xl border border-line px-5 py-3 text-sm font-semibold text-ink-soft hover:bg-paper"
              >
                {copied ? "Текст скопирован ✓" : "Скопировать текст сообщения"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
